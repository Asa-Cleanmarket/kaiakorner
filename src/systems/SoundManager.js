// Procedural sound effects + music using Web Audio API — no audio files needed
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicPlaying = false;
    this.initialized = false;
    this._musicNodes = [];
    this._musicLoopId = 0; // Unique ID to prevent duplicate loops
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
      this.musicGain.gain.value = 0.18;
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
    this._playNoise(0.08, 0.1);
  }

  playDeath() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
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
    const notes = [523, 659, 784, 1047];
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
    const notes = [784, 988, 1175, 1568];
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

  // === MUSIC SYSTEM ===
  // Pre-schedules all notes for a full loop using AudioContext timing (no setTimeout)
  // Then uses a single setTimeout to queue the next batch before the current one ends

  startMusic(isNight) {
    if (!this.initialized) return;
    this.stopMusic();
    this.musicPlaying = true;
    this._musicLoopId++;
    this._scheduleMusic(isNight, this._musicLoopId);
  }

  stopMusic() {
    this.musicPlaying = false;
    this._musicLoopId++;
    // Stop and disconnect all active music nodes
    for (const node of this._musicNodes) {
      try { node.stop(); } catch (e) { /* already stopped */ }
      try { node.disconnect(); } catch (e) { /* already disconnected */ }
    }
    this._musicNodes = [];
  }

  _scheduleMusic(isNight, loopId) {
    if (!this.musicPlaying || loopId !== this._musicLoopId) return;

    const t = this.ctx.currentTime + 0.05; // small buffer
    const bpm = isNight ? 110 : 140;
    const beat = 60 / bpm;
    const bar = beat * 4;

    if (isNight) {
      this._scheduleNightSong(t, beat, bar, loopId);
    } else {
      this._scheduleDaySong(t, beat, bar, loopId);
    }
  }

  _scheduleDaySong(t, beat, bar, loopId) {
    // Fun preppy candy pop song! 8 bars = 1 loop
    // Key of C major, upbeat and bouncy
    const totalBars = 8;
    const loopDuration = bar * totalBars;

    // === CHORD PROGRESSION (pad) ===
    // C - G - Am - F | C - G - F - G (classic pop progression)
    const chords = [
      { notes: [261.6, 329.6, 392.0], dur: bar },  // C major
      { notes: [196.0, 246.9, 293.7], dur: bar },  // G major (low)
      { notes: [220.0, 261.6, 329.6], dur: bar },  // Am
      { notes: [174.6, 220.0, 261.6], dur: bar },  // F major
      { notes: [261.6, 329.6, 392.0], dur: bar },  // C major
      { notes: [196.0, 246.9, 293.7], dur: bar },  // G major
      { notes: [174.6, 220.0, 261.6], dur: bar },  // F major
      { notes: [196.0, 246.9, 293.7], dur: bar },  // G major
    ];

    let chordTime = t;
    for (const chord of chords) {
      for (const freq of chord.notes) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, chordTime);
        gain.gain.setValueAtTime(0.04, chordTime);
        gain.gain.setValueAtTime(0.04, chordTime + chord.dur * 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, chordTime + chord.dur * 0.95);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(chordTime);
        osc.stop(chordTime + chord.dur);
        this._musicNodes.push(osc);
      }
      chordTime += chord.dur;
    }

    // === MELODY (bouncy candy melody) ===
    // E G A G E C D E | E G A C6 B A G A
    // G A B C6 A G E G | A G E D C D E G
    // E G A G E C D E | G B C6 D6 C6 B A G
    // A C6 D6 C6 A G E G | G A B C6 D6 C6 B A
    const melodyBars = [
      [659, 784, 880, 784, 659, 523, 587, 659],
      [659, 784, 880, 1047, 988, 880, 784, 880],
      [784, 880, 988, 1047, 880, 784, 659, 784],
      [880, 784, 659, 587, 523, 587, 659, 784],
      [659, 784, 880, 784, 659, 523, 587, 659],
      [784, 988, 1047, 1175, 1047, 988, 880, 784],
      [880, 1047, 1175, 1047, 880, 784, 659, 784],
      [784, 880, 988, 1047, 1175, 1047, 988, 880],
    ];

    const noteLen = beat * 0.85; // slightly staccato
    let melTime = t;
    for (const barNotes of melodyBars) {
      let noteTime = melTime;
      for (const freq of barNotes) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        // Soften the square wave
        osc.frequency.setValueAtTime(freq, noteTime);
        gain.gain.setValueAtTime(0.035, noteTime);
        gain.gain.setValueAtTime(0.035, noteTime + noteLen * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + noteLen);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(noteTime);
        osc.stop(noteTime + noteLen);
        this._musicNodes.push(osc);
        noteTime += beat / 2; // eighth notes
      }
      melTime += bar;
    }

    // === BASS LINE (bouncy octave bass) ===
    const bassNotes = [
      [131, 131, 196, 131], // C
      [98, 98, 147, 98],    // G
      [110, 110, 165, 110], // Am
      [87, 87, 131, 87],    // F
      [131, 131, 196, 131], // C
      [98, 98, 147, 98],    // G
      [87, 87, 131, 87],    // F
      [98, 98, 147, 98],    // G
    ];

    let bassTime = t;
    for (const barBass of bassNotes) {
      let bNoteTime = bassTime;
      for (const freq of barBass) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, bNoteTime);
        gain.gain.setValueAtTime(0.06, bNoteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, bNoteTime + beat * 0.8);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(bNoteTime);
        osc.stop(bNoteTime + beat);
        this._musicNodes.push(osc);
        bNoteTime += beat;
      }
      bassTime += bar;
    }

    // === HI-HAT / PERCUSSION (using noise bursts) ===
    let percTime = t;
    for (let b = 0; b < totalBars; b++) {
      for (let i = 0; i < 8; i++) { // eighth note hi-hats
        const accent = (i % 2 === 0) ? 0.07 : 0.03;
        this._schedulePercHit(percTime + i * beat / 2, 0.03, accent);
      }
      // Kick on beats 1 and 3
      this._scheduleKick(percTime, 0.08);
      this._scheduleKick(percTime + beat * 2, 0.08);
      // Snare on beats 2 and 4
      this._scheduleSnare(percTime + beat, 0.06);
      this._scheduleSnare(percTime + beat * 3, 0.06);
      percTime += bar;
    }

    // Schedule next loop before this one ends
    const nextTime = (loopDuration - 0.1) * 1000;
    setTimeout(() => {
      // Clean up old nodes
      this._musicNodes = this._musicNodes.filter(n => {
        try { n.disconnect(); } catch (e) {}
        return false;
      });
      this._scheduleMusic(false, loopId);
    }, Math.max(nextTime, 100));
  }

  _scheduleNightSong(t, beat, bar, loopId) {
    // Mysterious, slightly spooky but still candy-themed
    // Key of A minor, slower and more atmospheric
    const totalBars = 8;
    const loopDuration = bar * totalBars;

    // === PADS (sustained, dreamy) ===
    const chords = [
      { notes: [220, 261.6, 329.6], dur: bar * 2 },  // Am
      { notes: [196, 246.9, 329.6], dur: bar * 2 },  // Em/G
      { notes: [174.6, 220, 261.6], dur: bar * 2 },  // F
      { notes: [196, 246.9, 293.7], dur: bar * 2 },  // G
    ];

    let chordTime = t;
    for (const chord of chords) {
      for (const freq of chord.notes) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, chordTime);
        // Slow swell in and out
        gain.gain.setValueAtTime(0.001, chordTime);
        gain.gain.linearRampToValueAtTime(0.04, chordTime + chord.dur * 0.3);
        gain.gain.setValueAtTime(0.04, chordTime + chord.dur * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, chordTime + chord.dur * 0.95);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(chordTime);
        osc.stop(chordTime + chord.dur);
        this._musicNodes.push(osc);
      }
      chordTime += chord.dur;
    }

    // === MELODY (haunting, sparse) ===
    // Uses quarter and half notes with rests
    const melodySequence = [
      // [freq, startBeat, durationBeats]
      [659, 0, 2], [587, 2, 1], [523, 3, 1],
      [440, 5, 2], [392, 7, 1],
      [523, 8, 2], [494, 10, 1], [440, 11, 1],
      [392, 13, 2], [440, 15, 1],
      [659, 16, 2], [587, 18, 1], [523, 19, 1],
      [494, 20, 2], [440, 22, 1], [392, 23, 1],
      [440, 24, 2], [523, 26, 1], [494, 27, 1],
      [440, 28, 3], [392, 31, 1],
    ];

    for (const [freq, startBeat, durBeats] of melodySequence) {
      const noteStart = t + startBeat * beat;
      const noteDur = durBeats * beat;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);
      gain.gain.setValueAtTime(0.04, noteStart);
      gain.gain.setValueAtTime(0.04, noteStart + noteDur * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDur * 0.95);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(noteStart);
      osc.stop(noteStart + noteDur);
      this._musicNodes.push(osc);
    }

    // === BASS (deep, slow pulse) ===
    const bassPattern = [
      [110, 0], [110, 2], // Am
      [82.4, 4], [82.4, 6], // Em
      [87.3, 8], [87.3, 10], // F
      [98, 12], [98, 14], // G
      [110, 16], [110, 18],
      [82.4, 20], [82.4, 22],
      [87.3, 24], [87.3, 26],
      [98, 28], [98, 30],
    ];

    for (const [freq, startBeat] of bassPattern) {
      const noteStart = t + startBeat * beat;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);
      gain.gain.setValueAtTime(0.05, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + beat * 1.8);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(noteStart);
      osc.stop(noteStart + beat * 2);
      this._musicNodes.push(osc);
    }

    // === SPARSE PERCUSSION (soft ticks) ===
    let percTime = t;
    for (let b = 0; b < totalBars; b++) {
      // Soft tick on every other beat
      this._schedulePercHit(percTime, 0.04, 0.03);
      this._schedulePercHit(percTime + beat * 2, 0.04, 0.03);
      percTime += bar;
    }

    const nextTime = (loopDuration - 0.1) * 1000;
    setTimeout(() => {
      this._musicNodes = this._musicNodes.filter(n => {
        try { n.disconnect(); } catch (e) {}
        return false;
      });
      this._scheduleMusic(true, loopId);
    }, Math.max(nextTime, 100));
  }

  _schedulePercHit(time, duration, volume) {
    if (!this.initialized) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    // High-pass for hi-hat sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(time);
    noise.stop(time + duration);
    this._musicNodes.push(noise);
  }

  _scheduleKick(time, volume) {
    if (!this.initialized) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.15);
    this._musicNodes.push(osc);
  }

  _scheduleSnare(time, volume) {
    if (!this.initialized) return;
    // Tone component
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);
    oscGain.gain.setValueAtTime(volume, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.connect(oscGain);
    oscGain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.08);
    this._musicNodes.push(osc);
    // Noise component
    const bufSize = Math.floor(this.ctx.sampleRate * 0.08);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(volume * 0.7, time);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    noise.connect(nGain);
    nGain.connect(this.musicGain);
    noise.start(time);
    noise.stop(time + 0.08);
    this._musicNodes.push(noise);
  }

  // === HELPERS ===

  _playNoise(duration, volume) {
    if (!this.initialized) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
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
