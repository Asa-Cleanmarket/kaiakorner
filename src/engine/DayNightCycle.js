// Day: 10 minutes (600s), Night: 5 minutes (300s)
// Total cycle: 15 minutes (900s)

const DAY_DURATION = 600;   // seconds
const NIGHT_DURATION = 300; // seconds
const CYCLE_DURATION = DAY_DURATION + NIGHT_DURATION;
const SUNSET_WARNING = 30;  // seconds before night

export class DayNightCycle {
  constructor() {
    this.elapsed = 0;         // seconds into current cycle
    this.isDay = true;
    this.isSunsetWarning = false;
    this.cycleCount = 0;      // how many full cycles completed
  }

  update(delta) {
    this.elapsed += delta;

    if (this.elapsed >= CYCLE_DURATION) {
      this.elapsed -= CYCLE_DURATION;
      this.cycleCount++;
    }

    this.isDay = this.elapsed < DAY_DURATION;
    this.isSunsetWarning = this.isDay && (DAY_DURATION - this.elapsed) < SUNSET_WARNING;
  }

  // 0 to 1, how far through the day portion
  getDayProgress() {
    if (!this.isDay) return 1;
    return this.elapsed / DAY_DURATION;
  }

  // 0 to 1, how far through the night portion
  getNightProgress() {
    if (this.isDay) return 0;
    return (this.elapsed - DAY_DURATION) / NIGHT_DURATION;
  }

  // 0 = start of day, 0.667 = start of night, 1 = end of cycle
  getTimeOfDay() {
    return this.elapsed / CYCLE_DURATION;
  }

  // Sun angle for lighting (0 to PI during day)
  getSunAngle() {
    if (this.isDay) {
      return this.getDayProgress() * Math.PI;
    }
    return Math.PI + this.getNightProgress() * Math.PI;
  }

  // Time remaining in current phase (seconds)
  getTimeRemaining() {
    if (this.isDay) {
      return DAY_DURATION - this.elapsed;
    }
    return CYCLE_DURATION - this.elapsed;
  }

  getPhaseLabel() {
    if (this.isSunsetWarning) return 'SUNSET';
    return this.isDay ? 'DAY' : 'NIGHT';
  }

  formatTimeRemaining() {
    const secs = Math.ceil(this.getTimeRemaining());
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
