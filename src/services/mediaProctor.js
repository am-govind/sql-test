/**
 * Media Proctor Engine
 * Handles Webcam video stream, frame/motion detection,
 * Audio analyzer for microphone decibel spikes,
 * Screen share stream enforcement, and DevTools/Clipboard guards.
 */

export class MediaProctorService {
  constructor() {
    this.videoStream = null;
    this.audioStream = null;
    this.screenStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.audioInterval = null;
    this.motionInterval = null;
    this.devtoolsInterval = null;

    this.onViolation = null;
    this.config = {
      webcam: false,
      mic: false,
      screenshare: false,
      blockCopyPaste: false,
      blockDevtools: false,
    };

    this.prevFrameData = null;
    this.consecutiveLowMotion = 0;
    this.consecutiveNoFace = 0;
    this.consecutiveLoudNoise = 0;
    this.lookAwaySeconds = 0;
    this.lookAwayWarningSent = false;
    this.faceDetector = null;
    this.isCalibrating = false;

    this.handlePaste = this.handlePaste.bind(this);
    this.handleCopy = this.handleCopy.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);

    // Pre-acquired streams passed in from the permission-tile flow
    this._preAcquired = {};
  }

  /**
   * Called by StudentEntryPage to hand over streams already acquired via the
   * individual permission tiles (avoids double browser prompts).
   */
  setAcquiredStreams(streams = {}) {
    this._preAcquired = streams;
  }

  async setupStreams(config = {}) {
    this.config = { ...this.config, ...config };
    const results = {
      webcamOk: false,
      micOk: false,
      screenshareOk: false,
    };

    // 1. Setup Camera
    if (this.config.webcam) {
      try {
        if (this._preAcquired.webcam) {
          this.videoStream = this._preAcquired.webcam;
        } else {
          this.videoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { max: 15 } },
          });
        }
        results.webcamOk = true;
      } catch (err) {
        console.warn('[MediaProctor] Webcam permission error:', err);
        throw new Error('Camera access is required for this proctored exam. Please allow camera permissions.');
      }
    }

    // 2. Setup Mic
    if (this.config.mic) {
      try {
        if (this._preAcquired.mic) {
          this.audioStream = this._preAcquired.mic;
        } else {
          this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        results.micOk = true;
        this.initAudioAnalyser();
      } catch (err) {
        console.warn('[MediaProctor] Mic permission error:', err);
        throw new Error('Microphone access is required for this proctored exam. Please allow microphone permissions.');
      }
    }

    // 3. Setup Screen Share
    if (this.config.screenshare) {
      try {
        if (!navigator.mediaDevices.getDisplayMedia) {
          throw new Error('Screen sharing API is not supported on this browser.');
        }
        if (this._preAcquired.screen) {
          this.screenStream = this._preAcquired.screen;
        } else {
          this.screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: 'always' },
            audio: false,
          });
        }

        // Listen for student manually stopping screen share
        const track = this.screenStream.getVideoTracks()[0];
        if (track) {
          track.onended = () => {
            this.reportViolation('screen_share_stopped', 'Screen sharing was stopped by student');
          };
        }
        results.screenshareOk = true;
      } catch (err) {
        console.warn('[MediaProctor] Screen share permission error:', err);
        throw new Error('Full screen sharing is required for this proctored exam. Please select and share your screen.');
      }
    }

    return results;
  }

  initAudioAnalyser() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx || !this.audioStream) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;
      source.connect(this.analyser);
    } catch (e) {
      console.warn('[MediaProctor] Audio analyzer init failed:', e);
    }
  }

  start({ onViolation }) {
    this.onViolation = onViolation;

    // 1. Guard Copy/Paste & Context Menu
    if (this.config.blockCopyPaste) {
      document.addEventListener('copy', this.handleCopy, true);
      document.addEventListener('paste', this.handlePaste, true);
      document.addEventListener('contextmenu', this.handleContextMenu, true);
    }

    // 2. Start Audio Level Monitor (sample every 800ms)
    if (this.config.mic && this.analyser) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.audioInterval = setInterval(() => {
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;

        // Decibel / volume threshold: normal quiet room is ~10-25. Sustained talking is > 55.
        if (avg > 58) {
          this.consecutiveLoudNoise += 1;
          if (this.consecutiveLoudNoise >= 2) {
            this.reportViolation('noise_detected', `Loud audio or background conversation detected (level: ${Math.round(avg)})`);
            this.consecutiveLoudNoise = 0;
          }
        } else {
          this.consecutiveLoudNoise = Math.max(0, this.consecutiveLoudNoise - 1);
        }
      }, 800);
    }

    // 3. Start Video / Presence / Motion Monitor (every 2.5 seconds)
    if (this.config.webcam && this.videoStream) {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const video = document.createElement('video');
      video.srcObject = this.videoStream;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(() => {});

      if ('FaceDetector' in window) {
        try {
          this.faceDetector = new window.FaceDetector({ maxDetectedFaces: 2, fastMode: true });
        } catch {
          this.faceDetector = null;
        }
      }

      this.motionInterval = setInterval(async () => {
        if (!video.videoWidth) return;
        try {
          ctx.drawImage(video, 0, 0, 160, 120);
          const currentFrame = ctx.getImageData(0, 0, 160, 120);

          // Check if camera is covered / pitch black
          let totalBrightness = 0;
          const data = currentFrame.data;
          for (let i = 0; i < data.length; i += 16) {
            totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
          }
          const avgBrightness = totalBrightness / (data.length / 16);
          if (avgBrightness < 12) {
            this.reportViolation('camera_covered', 'Camera appears covered, blocked, or in extreme darkness');
            return;
          }

          if (this.faceDetector) {
            const faces = await this.faceDetector.detect(video);
            if (faces.length === 0) {
              this.lookAwaySeconds += 2.5;
              if (this.lookAwaySeconds >= 45 && !this.lookAwayWarningSent) {
                this.lookAwayWarningSent = true;
                this.reportViolation(
                  'face_not_visible',
                  'Face not visible for 45 seconds; possible phone use or looking away from the screen'
                );
              }
            } else {
              this.lookAwaySeconds = 0;
              this.lookAwayWarningSent = false;
            }
          }

          // Check motion difference compared to previous frame
          if (this.prevFrameData) {
            let diffPixels = 0;
            const prev = this.prevFrameData.data;
            for (let i = 0; i < data.length; i += 16) {
              const d = Math.abs(data[i] - prev[i]) + Math.abs(data[i + 1] - prev[i + 1]) + Math.abs(data[i + 2] - prev[i + 2]);
              if (d > 60) diffPixels++;
            }
            const diffRatio = diffPixels / (data.length / 16);

            // If completely still for prolonged period (potential static photo placed in front of camera)
            if (diffRatio < 0.005) {
              this.consecutiveLowMotion++;
              if (this.consecutiveLowMotion >= 10) { // ~25 seconds of zero motion
                this.reportViolation('static_feed', 'No natural movement detected in front of camera for extended period');
                this.consecutiveLowMotion = 0;
              }
            } else {
              this.consecutiveLowMotion = 0;
            }

            // Sudden massive motion (multiple people or jumping out of frame)
            if (diffRatio > 0.65) {
              this.reportViolation('rapid_movement', 'Significant movement or disturbance in camera frame');
            }
          }

          this.prevFrameData = currentFrame;
        } catch (e) {
          console.warn('[MediaProctor] Motion analysis error:', e);
        }
      }, 2500);
    }

    // 4. DevTools Guard
    if (this.config.blockDevtools) {
      let devtoolsOpen = false;
      this.devtoolsInterval = setInterval(() => {
        const threshold = 160;
        const widthDiff = window.outerWidth - window.innerWidth > threshold;
        const heightDiff = window.outerHeight - window.innerHeight > threshold;
        if ((widthDiff || heightDiff) && !devtoolsOpen) {
          devtoolsOpen = true;
          this.reportViolation('devtools_opened', 'Browser Developer Tools / Inspection Panel detected');
        } else if (!widthDiff && !heightDiff) {
          devtoolsOpen = false;
        }
      }, 1500);
    }
  }

  handleCopy(e) {
    if (this.config.blockCopyPaste) {
      e.preventDefault();
      this.reportViolation('clipboard_copy', 'Copy action attempted during proctored exam');
    }
  }

  handlePaste(e) {
    if (this.config.blockCopyPaste) {
      e.preventDefault();
      this.reportViolation('clipboard_paste', 'Pasting content into exam workspace is prohibited');
    }
  }

  handleContextMenu(e) {
    if (this.config.blockCopyPaste) {
      e.preventDefault();
    }
  }

  reportViolation(type, label) {
    if (this.onViolation) {
      this.onViolation(type, label);
    }
  }

  stop() {
    this.lookAwaySeconds = 0;
    this.lookAwayWarningSent = false;
    this.faceDetector = null;
    if (this.audioInterval) {
      clearInterval(this.audioInterval);
      this.audioInterval = null;
    }
    if (this.motionInterval) {
      clearInterval(this.motionInterval);
      this.motionInterval = null;
    }
    if (this.devtoolsInterval) {
      clearInterval(this.devtoolsInterval);
      this.devtoolsInterval = null;
    }

    document.removeEventListener('copy', this.handleCopy, true);
    document.removeEventListener('paste', this.handlePaste, true);
    document.removeEventListener('contextmenu', this.handleContextMenu, true);

    if (this.videoStream) {
      this.videoStream.getTracks().forEach((t) => t.stop());
      this.videoStream = null;
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((t) => t.stop());
      this.audioStream = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}

export const mediaProctor = new MediaProctorService();
