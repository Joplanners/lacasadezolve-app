// Procedural Web Audio API synthesizer for "Los Perdidos: Suiatsu"
// Produces an anime-opening synth-rock underwater pulse (132 BPM) + cel-shaded action SFX.

type MusicMode = 'OFF' | 'TITLE' | 'EXPLORE' | 'BOSS' | 'VICTORY';

const BPM = 132;
const BEAT_DURATION = 60 / BPM; // ~0.4545s
const STEP_DURATION = BEAT_DURATION / 4; // 16th note

class SuiatsuAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private muted = false;
  private mode: MusicMode = 'OFF';
  private schedulerId: number | null = null;
  private nextStepTime = 0;
  private currentStep = 0;
  private lastBeatTime = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.masterGain.gain.value = this.muted ? 0 : 0.7;
      this.musicGain.gain.value = 0.28;
      this.sfxGain.gain.value = 0.55;

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.02);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMusicMode(mode: MusicMode): void {
    if (this.mode === mode) return;
    this.mode = mode;

    if (mode === 'OFF') {
      this.stopScheduler();
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    if (this.schedulerId === null) {
      this.nextStepTime = ctx.currentTime + 0.05;
      this.lastBeatTime = ctx.currentTime;
      this.currentStep = 0;
      this.schedulerId = window.setInterval(() => this.schedule(), 40);
    }
  }

  private stopScheduler(): void {
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  public destroy(): void {
    this.stopScheduler();
    this.mode = 'OFF';
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
      this.musicGain = null;
      this.sfxGain = null;
    }
  }

  /** Returns 0..1 where values near 0 or 1 mean right on the musical beat */
  public getBeatPhase(): number {
    if (!this.ctx || this.mode === 'OFF') {
      // Fallback clock synced to BPM so rhythm gameplay still works even before audio unlocks
      const now = performance.now() / 1000;
      return (now % BEAT_DURATION) / BEAT_DURATION;
    }
    const elapsed = Math.max(0, this.ctx.currentTime - this.lastBeatTime);
    return (elapsed % BEAT_DURATION) / BEAT_DURATION;
  }

  /** Generous rhythmic window for anime-OP combo feel */
  public isOnBeat(): boolean {
    const p = this.getBeatPhase();
    return p < 0.24 || p > 0.76;
  }

  private schedule(): void {
    if (!this.ctx || !this.musicGain || this.mode === 'OFF') return;
    const lookAhead = 0.14;

    while (this.nextStepTime < this.ctx.currentTime + lookAhead) {
      const step = this.currentStep % 32;
      if (step % 4 === 0) {
        this.lastBeatTime = this.nextStepTime;
      }
      this.playMusicStep(step, this.nextStepTime);
      this.nextStepTime += STEP_DURATION;
      this.currentStep = (this.currentStep + 1) % 32;
    }
  }

  private playMusicStep(step: number, time: number): void {
    if (!this.ctx || !this.musicGain || this.muted) return;

    if (this.mode === 'TITLE') {
      // Atmospheric aquatic arpeggio in D minor
      const notes = [293.66, 349.23, 440.0, 523.25, 440.0, 349.23, 329.63, 261.63];
      if (step % 4 === 0) {
        const freq = notes[(step / 4) % notes.length];
        this.tone(freq, time, 0.35, 'triangle', 0.14, this.musicGain);
      }
      if (step === 0 || step === 16) {
        this.tone(73.42, time, 0.9, 'sine', 0.22, this.musicGain);
      }
      return;
    }

    if (this.mode === 'VICTORY') {
      // Triumphant anime opening ending chords
      const arp = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 587.33, 880.0];
      if (step % 2 === 0) {
        const freq = arp[(step / 2) % arp.length];
        this.tone(freq, time, 0.24, 'triangle', 0.14, this.musicGain);
      }
      if (step % 8 === 0) {
        const root = step < 16 ? 130.81 : 146.83;
        this.tone(root, time, 0.55, 'sawtooth', 0.08, this.musicGain, 500);
      }
      return;
    }

    const isBoss = this.mode === 'BOSS';

    // Driving anime OP kick on 0, 4, 8, 12...
    if (step % 4 === 0 || (isBoss && step % 8 === 6)) {
      this.kick(time, isBoss ? 0.36 : 0.28);
    }

    // Crisp snare on 4, 12, 20, 28
    if (step % 8 === 4) {
      this.snare(time, isBoss ? 0.22 : 0.16);
    }

    // Hi-hat 8th notes
    if (step % 2 === 0) {
      this.hat(time, step % 4 === 2 ? 0.08 : 0.04);
    }

    // Driving synth-rock bassline (F# minor / E minor urgent vibe)
    const exploreBass = [
      92.5, 92.5, 110.0, 92.5, 82.41, 82.41, 92.5, 110.0,
      73.42, 73.42, 82.41, 92.5, 110.0, 98.0, 82.41, 73.42,
    ];
    const bossBass = [
      73.42, 73.42, 146.83, 73.42, 69.3, 69.3, 138.59, 82.41,
      65.41, 65.41, 130.81, 73.42, 82.41, 92.5, 110.0, 82.41,
    ];
    if (step % 2 === 0) {
      const seq = isBoss ? bossBass : exploreBass;
      const freq = seq[(step / 2) % seq.length];
      this.tone(freq, time, 0.16, 'sawtooth', isBoss ? 0.18 : 0.14, this.musicGain, isBoss ? 900 : 650);
    }

    // Anime lead hook accent
    const exploreLead = [
      369.99, 0, 440.0, 493.88, 0, 554.37, 493.88, 440.0,
      329.63, 0, 369.99, 440.0, 0, 493.88, 440.0, 369.99,
    ];
    const bossLead = [
      587.33, 0, 554.37, 587.33, 659.25, 0, 587.33, 554.37,
      493.88, 0, 554.37, 587.33, 739.99, 659.25, 587.33, 440.0,
    ];
    if (step % 2 === 0) {
      const lead = isBoss ? bossLead : exploreLead;
      const freq = lead[(step / 2) % lead.length];
      if (freq > 0) {
        this.tone(freq, time, 0.13, 'square', isBoss ? 0.08 : 0.06, this.musicGain, 1600);
      }
    }
  }

  private tone(
    freq: number,
    time: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    dest: AudioNode,
    lowpassFreq?: number
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    if (lowpassFreq) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(lowpassFreq, time);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private kick(time: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.11);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  private snare(time: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const bufSize = Math.floor(this.ctx.sampleRate * 0.09);
    const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1100;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(time);
  }

  private hat(time: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const bufSize = Math.floor(this.ctx.sampleRate * 0.03);
    const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(time);
  }

  // ---- SFX ----

  public playAttack(onBeat: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = onBeat ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(onBeat ? 620 : 440, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.11);
    gain.gain.setValueAtTime(onBeat ? 0.28 : 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.13);
    if (onBeat) {
      this.tone(880, t, 0.09, 'sine', 0.16, this.sfxGain);
    }
  }

  public playHit(heavy = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(heavy ? 180 : 280, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + (heavy ? 0.18 : 0.1));
    gain.gain.setValueAtTime(heavy ? 0.34 : 0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (heavy ? 0.2 : 0.11));
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playBubble(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(920, t + 0.11);
    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  public playPearl(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const t = ctx.currentTime;
    this.tone(783.99, t, 0.12, 'sine', 0.2, this.sfxGain);
    this.tone(1174.66, t + 0.055, 0.16, 'triangle', 0.2, this.sfxGain);
  }

  public playSpecial(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const t = ctx.currentTime;
    const notes = [293.66, 440.0, 587.33, 880.0];
    notes.forEach((n, idx) => {
      this.tone(n, t + idx * 0.04, 0.26, 'sawtooth', 0.16, this.sfxGain!, 2200);
    });
  }

  public playRescue(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, t + idx * 0.075, 0.3, 'triangle', 0.24, this.sfxGain!);
    });
  }

  public playQuake(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(64, t);
    osc.frequency.linearRampToValueAtTime(34, t + 0.7);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.78);
  }

  public playDamage(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const t = ctx.currentTime;
    this.tone(160, t, 0.18, 'sawtooth', 0.3, this.sfxGain, 450);
    this.tone(110, t + 0.06, 0.2, 'square', 0.22, this.sfxGain, 400);
  }

  public playBossWarning(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      this.tone(220, t + i * 0.28, 0.16, 'sawtooth', 0.24, this.sfxGain, 900);
      this.tone(164.81, t + i * 0.28 + 0.12, 0.14, 'sawtooth', 0.2, this.sfxGain, 700);
    }
  }

  public playVictoryFlash(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const t = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    chord.forEach((n, idx) => {
      this.tone(n, t + idx * 0.05, 0.85, 'triangle', 0.18, this.sfxGain!);
    });
  }
}

export const audioEngine = new SuiatsuAudioEngine();
