/**
 * Lightweight Web Audio API Music & SFX Synthesizer
 * Zero external MP3 dependencies; includes an original, copyright-free
 * K-Pop Stadium Synth-Pop Anthem for the Phase 5 Finale.
 */

export type MusicTrack = 'none' | 'title' | 'alert' | 'mission' | 'stadium';

class ChiptuneSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private stadiumDelay: DelayNode | null = null;
  private stadiumDelayWet: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private muted = false;
  private currentTrack: MusicTrack = 'none';
  private stepIndex = 0;
  private loopTimer: number | null = null;
  private unlocked = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.72;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.28;
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.45;
      this.sfxGain.connect(this.masterGain);

      // Subtle stadium echo bus (gives Phase 5 spacious live-concert ambience)
      this.stadiumDelay = this.ctx.createDelay(1.0);
      this.stadiumDelay.delayTime.value = 0.255; // dotted-eighth/eighth bounce at ~118 BPM
      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 1800;
      const delayFeedback = this.ctx.createGain();
      delayFeedback.gain.value = 0.28;

      this.stadiumDelayWet = this.ctx.createGain();
      this.stadiumDelayWet.gain.value = 0.32;

      this.stadiumDelay.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(this.stadiumDelay);
      delayFilter.connect(this.stadiumDelayWet);
      this.stadiumDelayWet.connect(this.bgmGain);

      // Pre-generate short white-noise buffer for soft stadium crowd claps & hi-hats
      const bufSize = Math.floor(this.ctx.sampleRate * 0.25);
      this.noiseBuffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.unlocked = true;
    return this.ctx;
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && this.currentTrack !== 'none' && this.loopTimer === null) {
      this.startLoop();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(nextMuted: boolean): void {
    this.muted = nextMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(nextMuted ? 0 : 0.72, this.ctx.currentTime, 0.03);
    }
  }

  public toggleMute(): boolean {
    this.unlock();
    this.setMuted(!this.muted);
    return this.muted;
  }

  public setTrack(track: MusicTrack): void {
    if (this.currentTrack === track) return;
    this.currentTrack = track;
    this.stepIndex = 0;
    this.stopLoop();
    if (track !== 'none' && this.unlocked) {
      this.startLoop();
    }
  }

  private stopLoop(): void {
    if (this.loopTimer !== null) {
      window.clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
  }

  private startLoop(): void {
    this.stopLoop();
    const tempoMs =
      this.currentTrack === 'stadium'
        ? 250 // ~120 BPM eighth-note grid for soaring K-pop synth-pop groove
        : this.currentTrack === 'mission'
          ? 210
          : this.currentTrack === 'alert'
            ? 320
            : 270;

    // Trigger first step immediately so there is no awkward silence on transition
    if (!this.muted && this.ctx && this.bgmGain && this.ctx.state === 'running') {
      this.playTrackStep();
    }

    this.loopTimer = window.setInterval(() => {
      if (this.muted || !this.ctx || !this.bgmGain || this.ctx.state !== 'running') return;
      this.playTrackStep();
    }, tempoMs);
  }

  private playNote(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    target: GainNode,
    delay = 0
  ): void {
    if (!this.ctx || freq <= 0) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // Low-pass filter softens harsh chiptune harmonics so it stays cozy and warm
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);

    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(target);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // --- Rich Stadium Synth-Pop Voices (100% Original K-Pop Anthem) ---

  private playStadiumLead(freq: number, duration: number, volume = 0.24): void {
    if (!this.ctx || !this.bgmGain || freq <= 0) return;
    const now = this.ctx.currentTime;

    // Dual slightly detuned oscillators for lush pop-vocal synth shimmer
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 1.0035, now); // warm chorus detune

    // Gentle expressive vibrato
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 5.4;
    lfoGain.gain.value = freq * 0.005;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3400, now);
    filter.frequency.exponentialRampToValueAtTime(1750, now + duration);

    const osc2Mix = this.ctx.createGain();
    osc2Mix.gain.value = 0.28;

    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(volume, now + 0.022);
    env.gain.setValueAtTime(volume * 0.82, now + Math.max(0.04, duration * 0.65));
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(filter);
    osc2.connect(osc2Mix);
    osc2Mix.connect(filter);
    filter.connect(env);

    // Send both dry and to stadium echo bus
    env.connect(this.bgmGain);
    if (this.stadiumDelay) {
      env.connect(this.stadiumDelay);
    }

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);
    osc1.stop(now + duration + 0.04);
    osc2.stop(now + duration + 0.04);
    lfo.stop(now + duration + 0.04);
  }

  private playStadiumPadChord(freqs: number[], duration: number, volume = 0.11): void {
    if (!this.ctx || !this.bgmGain) return;
    const now = this.ctx.currentTime;
    const chordGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1150, now);

    chordGain.gain.setValueAtTime(0.0001, now);
    chordGain.gain.exponentialRampToValueAtTime(volume, now + 0.12);
    chordGain.gain.setValueAtTime(volume * 0.85, now + duration * 0.72);
    chordGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    filter.connect(chordGain);
    chordGain.connect(this.bgmGain);
    if (this.stadiumDelay) {
      chordGain.connect(this.stadiumDelay);
    }

    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    }
  }

  private playStadiumSparkle(freq: number): void {
    if (!this.ctx || !this.bgmGain || freq <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(0.11, now + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

    osc.connect(env);
    env.connect(this.bgmGain);
    if (this.stadiumDelay) {
      env.connect(this.stadiumDelay);
    }

    osc.start(now);
    osc.stop(now + 0.36);
  }

  private playStadiumBass(freq: number, duration: number): void {
    if (!this.ctx || !this.bgmGain || freq <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);

    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(0.32, now + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.bgmGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playStadiumKick(): void {
    if (!this.ctx || !this.bgmGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(44, now + 0.11);

    env.gain.setValueAtTime(0.36, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(env);
    env.connect(this.bgmGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  private playStadiumClap(): void {
    if (!this.ctx || !this.bgmGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    // 3 tiny staggered bursts simulate a stadium crowd clapping together
    [0, 0.012, 0.024].forEach((offset, idx) => {
      if (!this.ctx || !this.bgmGain || !this.noiseBuffer) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1550, now + offset);
      bp.Q.value = 1.4;

      const env = this.ctx.createGain();
      const peak = idx === 2 ? 0.16 : 0.09;
      env.gain.setValueAtTime(0.0001, now + offset);
      env.gain.exponentialRampToValueAtTime(peak, now + offset + 0.006);
      env.gain.exponentialRampToValueAtTime(0.0001, now + offset + (idx === 2 ? 0.13 : 0.04));

      src.connect(bp);
      bp.connect(env);
      env.connect(this.bgmGain);
      if (this.stadiumDelay && idx === 2) {
        env.connect(this.stadiumDelay);
      }

      src.start(now + offset);
      src.stop(now + offset + 0.15);
    });
  }

  private playStadiumHiHat(): void {
    if (!this.ctx || !this.bgmGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(6800, now);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.045, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    src.connect(hp);
    hp.connect(env);
    env.connect(this.bgmGain);
    src.start(now);
    src.stop(now + 0.045);
  }

  /**
   * 64-step (8-bar) 100% original uplifting K-Pop Stadium Anthem in F Major:
   * Bars 1-4: Dreamy bright pre-chorus shimmer (Fmaj7 -> C/E -> Dm7 -> Bbmaj7)
   * Bars 5-8: Soaring emotional stadium chorus (Bbmaj7 -> C -> Am7 -> Dm7 -> Bbmaj7 -> C -> F)
   */
  private playStadiumAnthemStep(): void {
    // F Major note table (Hz)
    const F2 = 87.31, G2 = 98.0, A2 = 110.0, Bb2 = 116.54, C3 = 130.81, D3 = 146.83, E3 = 164.81;
    const F3 = 174.61, G3 = 196.0, A3 = 220.0, Bb3 = 233.08, C4 = 261.63, D4 = 293.66, E4 = 329.63;
    const F4 = 349.23, G4 = 392.0, A4 = 440.0, Bb4 = 466.16, C5 = 523.25, D5 = 587.33, E5 = 659.25;
    const F5 = 698.46, G5 = 783.99, A5 = 880.0;

    const step = this.stepIndex % 64;
    const bar = Math.floor(step / 8);
    const beatInBar = step % 8; // 8 eighth-notes per bar
    const isChorus = bar >= 4;

    // 1. Lush Stadium Synth Pad Chords (triggered on bar downbeat)
    if (beatInBar === 0) {
      const chords: number[][] = [
        [F3, A3, C4, E4], // Bar 0: Fmaj7
        [E3, G3, C4, E4], // Bar 1: C/E
        [D3, F3, A3, C4], // Bar 2: Dm7
        [Bb2, D3, F3, A3], // Bar 3: Bbmaj7
        [Bb2, D3, F3, A3], // Bar 4: Bbmaj7 (Chorus lift!)
        [C3, E3, G3, C4], // Bar 5: C
        [A2, E3, A3, C4], // Bar 6: Am7 -> Dm7 feel
        [F3, A3, C4, F4], // Bar 7: F triumphant resolution
      ];
      this.playStadiumPadChord(chords[bar], 2.05, isChorus ? 0.13 : 0.1);
    }

    // 2. Bouncy Synth-Pop Bassline
    const barRoots = [F2, C3, D3, Bb2, Bb2, C3, A2, F2];
    const barOctaves = [F3, C4, D4, Bb3, Bb3, C4, D3, F3];
    if (beatInBar === 0 || beatInBar === 3 || beatInBar === 6) {
      const freq = beatInBar === 6 ? barOctaves[bar] : barRoots[bar];
      this.playStadiumBass(freq, 0.34);
    } else if (isChorus && beatInBar === 4) {
      this.playStadiumBass(barRoots[bar], 0.3);
    }

    // 3. Stadium Concert Percussion (Four-on-the-floor kick + crowd handclaps!)
    if (beatInBar % 2 === 0) {
      // Beats 1, 2, 3, 4
      if (isChorus || beatInBar === 0 || beatInBar === 4) {
        this.playStadiumKick();
      }
    }
    if (beatInBar === 2 || beatInBar === 6) {
      // Beats 2 & 4 stadium crowd clap!
      this.playStadiumClap();
    }
    if (isChorus && beatInBar % 2 === 1) {
      this.playStadiumHiHat();
    }

    // 4. Sparkling Purple-Ocean Lightstick Arpeggio Plucks
    const arpNotes: number[][] = [
      [C5, A4, F5, C5],
      [C5, G4, E5, C5],
      [A4, F4, D5, A4],
      [F4, D4, Bb4, F4],
      [D5, F5, A5, F5],
      [E5, G5, C5, G5],
      [E5, A5, D5, A5],
      [C5, F5, A5, F5],
    ];
    if (beatInBar % 2 === 1) {
      const arpNote = arpNotes[bar][Math.floor(beatInBar / 2) % 4];
      this.playStadiumSparkle(arpNote);
    }

    // 5. Original Soaring K-Pop Synth Lead Melody (64 eighth-note steps)
    // Pairs of [frequency, durationInSeconds]; 0 = rest/sustain
    const melody: Array<[number, number]> = [
      // Bar 0 (Fmaj7): Warm inviting pop hook
      [A4, 0.44], [0, 0], [C5, 0.24], [D5, 0.44], [0, 0], [C5, 0.24], [A4, 0.46], [0, 0],
      // Bar 1 (C/E): Floating ascending answer
      [G4, 0.44], [0, 0], [C5, 0.24], [E5, 0.44], [0, 0], [D5, 0.24], [C5, 0.46], [0, 0],
      // Bar 2 (Dm7): Nostalgic emotional touch
      [A4, 0.24], [C5, 0.24], [D5, 0.44], [0, 0], [F5, 0.44], [0, 0], [E5, 0.24], [D5, 0.24],
      // Bar 3 (Bbmaj7): Lift into the stadium chorus!
      [C5, 0.44], [0, 0], [A4, 0.24], [Bb4, 0.44], [0, 0], [C5, 0.24], [D5, 0.46], [0, 0],

      // Bar 4 (Bbmaj7 - CHORUS!): Big soaring stadium sing-along!
      [F5, 0.48], [0, 0], [F5, 0.24], [G5, 0.46], [0, 0], [F5, 0.24], [D5, 0.48], [0, 0],
      // Bar 5 (C): Radiant peak
      [E5, 0.48], [0, 0], [G5, 0.24], [A5, 0.56], [0, 0], [G5, 0.24], [E5, 0.46], [0, 0],
      // Bar 6 (Am7 -> Dm7): Emotional K-pop bridge melody
      [C5, 0.24], [E5, 0.24], [G5, 0.46], [0, 0], [F5, 0.46], [0, 0], [E5, 0.24], [D5, 0.24],
      // Bar 7 (F): Joyful purple-ocean finale resolution
      [C5, 0.46], [0, 0], [D5, 0.24], [F5, 0.95], [0, 0], [0, 0], [0, 0], [0, 0],
    ];

    const [noteFreq, noteDur] = melody[step];
    if (noteFreq > 0) {
      this.playStadiumLead(noteFreq, noteDur, isChorus ? 0.27 : 0.21);
    }
  }

  private playTrackStep(): void {
    if (!this.bgmGain) return;

    if (this.currentTrack === 'stadium') {
      this.playStadiumAnthemStep();
      this.stepIndex += 1;
      return;
    }

    // Frequencies in Hz for chiptune tracks
    const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.0, A4 = 440.0;
    const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.0;
    const C3 = 130.81, F3 = 174.61, G3 = 196.0, A3 = 220.0, Eb4 = 311.13;

    if (this.currentTrack === 'title') {
      // Warm cozy holiday-pop music box melody
      const melody = [C5, 0, E5, G5, A5, 0, G5, E5, F5, 0, D5, E5, C5, 0, G4, 0];
      const bass = [C3, 0, 0, 0, A3, 0, 0, 0, F3, 0, 0, 0, G3, 0, 0, 0];
      const i = this.stepIndex % melody.length;
      if (melody[i]) this.playNote(melody[i], 0.24, 'triangle', 0.34, this.bgmGain);
      if (bass[i]) this.playNote(bass[i], 0.45, 'sine', 0.28, this.bgmGain);
    } else if (this.currentTrack === 'alert') {
      // Soft suspense pulse
      const pulse = [D4, 0, Eb4, 0, D4, 0, C4, 0];
      const i = this.stepIndex % pulse.length;
      if (pulse[i]) this.playNote(pulse[i], 0.22, 'triangle', 0.24, this.bgmGain);
    } else if (this.currentTrack === 'mission') {
      // Cheerful TinyTAN-style upbeat cute RPG groove
      const melody = [
        G4, C5, E5, G5, E5, C5, D5, 0,
        A4, D5, F5, A5, G5, E5, D5, 0,
        G4, C5, E5, G5, A5, G5, E5, C5,
        D5, E5, F5, D5, C5, 0, 0, 0,
      ];
      const bass = [
        C3, 0, G3, 0, C3, 0, G3, 0,
        F3, 0, C4, 0, G3, 0, D4, 0,
        A3, 0, E4, 0, F3, 0, C4, 0,
        G3, 0, G3, 0, C3, 0, 0, 0,
      ];
      const i = this.stepIndex % melody.length;
      if (melody[i]) this.playNote(melody[i], 0.17, 'square', 0.16, this.bgmGain);
      if (bass[i]) this.playNote(bass[i], 0.22, 'triangle', 0.26, this.bgmGain);
    }

    this.stepIndex += 1;
  }

  // --- Sound Effects ---

  public playClick(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.sfxGain) return;
    this.playNote(587.33, 0.08, 'triangle', 0.32, this.sfxGain);
    this.playNote(880, 0.09, 'sine', 0.22, this.sfxGain, 0.04);
  }

  public playSocialTap(stepCount: number): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.sfxGain) return;
    const scale = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 987.77, 1046.5, 1174.66];
    const freq = scale[Math.min(Math.max(stepCount - 1, 0), scale.length - 1)];
    this.playNote(freq, 0.14, 'triangle', 0.36, this.sfxGain);
    this.playNote(freq * 1.5, 0.12, 'sine', 0.18, this.sfxGain, 0.045);
  }

  public playRecruit(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.sfxGain) return;
    this.playNote(523.25, 0.1, 'triangle', 0.3, this.sfxGain, 0);
    this.playNote(659.25, 0.1, 'triangle', 0.3, this.sfxGain, 0.06);
    this.playNote(783.99, 0.16, 'sine', 0.32, this.sfxGain, 0.12);
  }

  public playBump(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.sfxGain) return;
    this.playNote(220, 0.12, 'triangle', 0.32, this.sfxGain, 0);
    this.playNote(175, 0.15, 'sine', 0.25, this.sfxGain, 0.07);
  }

  public playPickup(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.sfxGain) return;
    this.playNote(587.33, 0.1, 'square', 0.16, this.sfxGain, 0);
    this.playNote(783.99, 0.12, 'square', 0.18, this.sfxGain, 0.07);
    this.playNote(1046.5, 0.22, 'triangle', 0.34, this.sfxGain, 0.14);
  }

  public playGoldenTicket(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.sfxGain) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => {
      this.playNote(n, 0.28, 'triangle', 0.3, this.sfxGain!, idx * 0.075);
    });
  }

  public playCountdown(num: number): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.sfxGain) return;
    if (num > 0) {
      this.playNote(523.25 + (3 - num) * 90, 0.18, 'triangle', 0.35, this.sfxGain);
    } else {
      this.playNote(783.99, 0.14, 'triangle', 0.35, this.sfxGain, 0);
      this.playNote(1046.5, 0.28, 'sine', 0.35, this.sfxGain, 0.08);
    }
  }

  public playAlert(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.sfxGain) return;
    this.playNote(311.13, 0.18, 'sawtooth', 0.14, this.sfxGain, 0);
    this.playNote(233.08, 0.28, 'sawtooth', 0.14, this.sfxGain, 0.18);
  }

  public playVictory(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.sfxGain) return;
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const times = [0, 0.1, 0.2, 0.32, 0.48, 0.6];
    fanfare.forEach((f, idx) => {
      this.playNote(f, idx === 5 ? 0.45 : 0.18, 'triangle', 0.32, this.sfxGain!, times[idx]);
    });
  }

  public playMissionFail(): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.sfxGain) return;
    // Playful descending "ohhh no" trombone-like chiptune cadence (cute, not harsh)
    const notes = [392.0, 349.23, 329.63, 261.63];
    const times = [0, 0.15, 0.3, 0.46];
    notes.forEach((f, idx) => {
      this.playNote(f, idx === 3 ? 0.42 : 0.16, 'triangle', 0.3, this.sfxGain!, times[idx]);
    });
  }
}

export const soundEngine = new ChiptuneSoundEngine();
