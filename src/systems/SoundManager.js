// Procedural sound effects using Web Audio API — no audio files needed
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicPlaying = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.15;
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      // Audio not supported — silently degrade
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // === SOUND EFFECTS ===

  playSwing() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playHit() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    // Impact thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
    // Noise burst
    this._playNoise(0.08, 0.15);
  }

  playBlockPlace() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.06);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  playBlockBreak() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    // Crunch sound
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(200 + Math.random() * 200, t + i * 0.03);
      osc.frequency.exponentialRampToValueAtTime(50, t + i * 0.03 + 0.06);
      gain.gain.setValueAtTime(0.08, t + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.03 + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.03);
      osc.stop(t + i * 0.03 + 0.08);
    }
  }

  playShoot() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    // Pop!
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playEat() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    // Chomp
    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t + i * 0.12);
      osc.frequency.exponentialRampToValueAtTime(200, t + i * 0.12 + 0.06);
      gain.gain.setValueAtTime(0.15, t + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.08);
    }
  }

  playJump() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, t);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.1);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playDamage() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.25);
    this._playNoise(0.12, 0.1);
  }

  playDeath() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    // Descending tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.8);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.0);
  }

  playLevelUp() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[i], t + i * 0.12);
      gain.gain.setValueAtTime(0.15, t + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.3);
    }
  }

  playBadge() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const notes = [784, 988, 1175, 1568]; // G5 B5 D6 G6
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[i], t + i * 0.1);
      gain.gain.setValueAtTime(0.12, t + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.4);
    }
  }

  playMonsterGrowl() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.setValueAtTime(90, t + 0.05);
    osc.frequency.setValueAtTime(70, t + 0.1);
    osc.frequency.setValueAtTime(85, t + 0.15);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playMonsterDeath() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  playChopTree() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    // Wood chop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.08);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
    this._playNoise(0.06, 0.12);
  }

  playCraft() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    // Sparkly craft sound
    const notes = [600, 800, 1000];
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[i], t + i * 0.06);
      gain.gain.setValueAtTime(0.1, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.15);
    }
  }

  playNightfall() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    // Ominous descending chord
    const notes = [330, 262, 220];
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[i], t + i * 0.3);
      gain.gain.setValueAtTime(0.12, t + i * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.3 + 0.8);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.3);
      osc.stop(t + i * 0.3 + 0.8);
    }
  }

  playDawn() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    // Happy ascending chord
    const notes = [262, 330, 392, 523];
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[i], t + i * 0.15);
      gain.gain.setValueAtTime(0.1, t + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.5);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.15);
      osc.stop(t + i * 0.15 + 0.5);
    }
  }

  playBossSpawn() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    // Dramatic low rumble + ascending scream
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(50, t);
    osc1.frequency.exponentialRampToValueAtTime(200, t + 1.5);
    gain1.gain.setValueAtTime(0.15, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 2);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(t);
    osc1.stop(t + 2);
  }

  // === AMBIENT MUSIC ===

  startMusic(isNight) {
    if (!this.initialized || this.musicPlaying) return;
    this.musicPlaying = true;
    this._playMusicLoop(isNight);
  }

  stopMusic() {
    this.musicPlaying = false;
  }

  _playMusicLoop(isNight) {
    if (!this.musicPlaying || !this.initialized) return;

    const t = this.ctx.currentTime;
    // Simple pentatonic melody that loops
    const dayNotes = [523, 587, 659, 784, 880, 784, 659, 587]; // C D E G A G E D
    const nightNotes = [220, 262, 247, 220, 196, 220, 247, 262]; // A C B A G A B C (minor feel)
    const notes = isNight ? nightNotes : dayNotes;
    const beatLen = 0.4;

    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isNight ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(notes[i], t + i * beatLen);
      gain.gain.setValueAtTime(0.06, t + i * beatLen);
      gain.gain.setValueAtTime(0.06, t + i * beatLen + beatLen * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * beatLen + beatLen * 0.95);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(t + i * beatLen);
      osc.stop(t + i * beatLen + beatLen);
    }

    // Schedule next loop
    const loopLen = notes.length * beatLen;
    setTimeout(() => this._playMusicLoop(isNight), loopLen * 1000);
  }

  // === HELPERS ===

  _playNoise(duration, volume) {
    if (!this.initialized) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * volume;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    noise.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
  }
}
