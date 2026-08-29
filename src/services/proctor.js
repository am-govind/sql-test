/**
 * Proctoring & Anti-Cheat Engine
 * Detects browser tab switching, window minimization, and off-screen focus loss.
 */

import { state } from './state.js';
import { sound } from './sound.js';

class ProctorService {
  constructor() {
    this.isActive = false;
    this.onViolationCallback = null;
    this.onAutoSubmitCallback = null;
    this.ignoreBlurForIframe = false;
    this.blurDebounceTimer = null;
    this.lastHiddenTime = 0;

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleWindowBlur = this.handleWindowBlur.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
  }

  start({ onViolation, onAutoSubmit }) {
    if (this.isActive) this.stop();

    this.isActive = true;
    this.onViolationCallback = onViolation;
    this.onAutoSubmitCallback = onAutoSubmit;

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
  }

  stop() {
    this.isActive = false;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);

    if (this.blurDebounceTimer) {
      clearTimeout(this.blurDebounceTimer);
      this.blurDebounceTimer = null;
    }
  }

  handleVisibilityChange() {
    if (!this.isActive) return;

    if (document.visibilityState === 'hidden') {
      this.lastHiddenTime = Date.now();
      this.triggerViolation('tab_switch', 'Browser Tab Switch / Window Minimized Detected');
    }
  }

  handleWindowBlur() {
    if (!this.isActive) return;

    // Check if the blur was caused by focusing inside the SQLBolt iframe
    // When a user clicks inside the embedded iframe, window blurs and document.activeElement becomes the IFRAME tag.
    // This is legitimate student behavior and must NOT trigger a violation.
    setTimeout(() => {
      const activeEl = document.activeElement;
      const isIframeFocus = activeEl && (activeEl.tagName === 'IFRAME' || activeEl.closest('iframe'));

      if (isIframeFocus) {
        // Legitimate interaction inside SQLBolt exercise
        return;
      }

      // If document is also hidden, visibilitychange already handled it
      if (document.visibilityState === 'hidden') {
        return;
      }

      // If the window genuinely lost focus to another app
      this.triggerViolation('window_blur', 'Window Focus Lost to External Application');
    }, 150);
  }

  handleFullscreenChange() {
    if (!this.isActive) return;
    const session = state.session;
    if (session.fullscreenEnforced && !document.fullscreenElement) {
      this.triggerViolation('fullscreen_exit', 'Exited Fullscreen Mode');
    }
  }

  handleBeforeUnload(e) {
    if (!this.isActive) return;
    e.preventDefault();
    e.returnValue = 'You have an active proctored exam in progress. Leaving will cancel or auto-submit your test!';
    return e.returnValue;
  }

  triggerViolation(type, label) {
    if (!this.isActive) return;

    const result = state.recordViolation(type, label);
    if (!result) return;

    if (result.willSubmit) {
      sound.playAutoSubmitAlarm();
      if (this.onAutoSubmitCallback) {
        this.onAutoSubmitCallback(result);
      }
    } else {
      sound.playWarningAlert();
      if (this.onViolationCallback) {
        this.onViolationCallback(result);
      }
    }
  }

  async enterFullscreen() {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        return true;
      }
    } catch (e) {
      console.warn('Fullscreen request denied or not supported:', e);
    }
    return false;
  }

  async exitFullscreen() {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Exit fullscreen error:', e);
    }
  }
}

export const proctor = new ProctorService();
