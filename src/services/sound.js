/**
 * Web Audio API synthesizer for proctor sound cues and alerts.
 * Operates offline without external audio files.
 */

class SoundService {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playBeep(freq = 440, type = 'sine', duration = 0.15, gainVal = 0.1) {
    if (this.muted) return;
    try {
      this.init();
      this.resume();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback not permitted or unavailable:', e);
    }
  }

  playWarningAlert() {
    if (this.muted) return;
    this.playBeep(880, 'triangle', 0.1, 0.2);
    setTimeout(() => this.playBeep(660, 'sawtooth', 0.2, 0.25), 120);
  }

  playAutoSubmitAlarm() {
    if (this.muted) return;
    this.playBeep(400, 'sawtooth', 0.2, 0.3);
    setTimeout(() => this.playBeep(300, 'sawtooth', 0.25, 0.35), 180);
    setTimeout(() => this.playBeep(220, 'square', 0.4, 0.4), 380);
  }

  playSuccessChime() {
    if (this.muted) return;
    this.playBeep(523.25, 'sine', 0.15, 0.15); // C5
    setTimeout(() => this.playBeep(659.25, 'sine', 0.15, 0.18), 120); // E5
    setTimeout(() => this.playBeep(783.99, 'sine', 0.18, 0.2), 240); // G5
    setTimeout(() => this.playBeep(1046.50, 'sine', 0.3, 0.25), 360); // C6
  }

  playClick() {
    this.playBeep(1200, 'sine', 0.04, 0.05);
  }

  playToggle() {
    this.playBeep(700, 'triangle', 0.08, 0.08);
  }
}

export const sound = new SoundService();
