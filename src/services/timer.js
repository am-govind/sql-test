/**
 * Precision countdown timer for the SQL test.
 */

class TimerService {
  constructor() {
    this.intervalId = null;
    this.remainingSec = 0;
    this.initialSec = 0;
    this.onTick = null;
    this.onExpire = null;
    this.isRunning = false;
  }

  start(seconds, onTick, onExpire) {
    this.stop();
    this.initialSec = seconds;
    this.remainingSec = seconds;
    this.onTick = onTick;
    this.onExpire = onExpire;

    if (seconds <= 0) {
      // Untimed mode
      this.isRunning = true;
      if (this.onTick) this.onTick(0, 0);
      return;
    }

    this.isRunning = true;
    if (this.onTick) this.onTick(this.remainingSec, this.initialSec);

    this.intervalId = setInterval(() => {
      if (this.remainingSec > 0) {
        this.remainingSec--;
        if (this.onTick) {
          this.onTick(this.remainingSec, this.initialSec);
        }

        if (this.remainingSec <= 0) {
          this.stop();
          if (this.onExpire) {
            this.onExpire();
          }
        }
      }
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  getFormattedTime(seconds = this.remainingSec) {
    if (seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (n) => String(n).padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }
}

export const timer = new TimerService();
