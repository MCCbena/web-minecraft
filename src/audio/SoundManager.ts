/**
 * Procedural sound manager using WebAudio.
 * All sounds are generated programmatically (no audio files).
 * AudioContext is created lazily on first user gesture.
 */

export type SoundName = 'break' | 'place' | 'note' | 'explosion';

/**
 * SoundManager: procedural WebAudio sounds.
 */
export class SoundManager {
  private audioContext: AudioContext | null = null;
  private initialized: boolean = false;

  /**
   * Initialize the AudioContext. Must be called from a user gesture handler
   * to satisfy autoplay policy.
   */
  initialize(): void {
    if (this.initialized) return;
    if (typeof window === 'undefined') return;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.initialized = true;
  }

  /**
   * Play a named sound.
   * @param name - The sound to play.
   */
  play(name: SoundName): void {
    if (!this.initialized || !this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    switch (name) {
      case 'break':
        this.playBreak();
        break;
      case 'place':
        this.playPlace();
        break;
      case 'note':
        this.playNote();
        break;
      case 'explosion':
        this.playExplosion();
        break;
    }
  }

  /** Short noise burst / low thud for block breaking. */
  private playBreak(): void {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;

    // Low thud: short noise burst
    const bufferSize = this.audioContext.sampleRate * 0.1; // 0.1s
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      // Exponential decay noise
      data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.4;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    // Low-pass filter for thud quality
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.1);

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);
    source.start(now);
    source.stop(now + 0.1);
  }

  /** Softer click for block placement. */
  private playPlace(): void {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;

    // Short click: sine burst with quick decay
    const osc = this.audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /** Placeholder for note block sound (Phase C). */
  private playNote(): void {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /** Placeholder for explosion sound (Phase C). */
  private playExplosion(): void {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;

    const bufferSize = this.audioContext.sampleRate * 0.5; // 0.5s
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.8;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + 0.5);

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);
    source.start(now);
    source.stop(now + 0.5);
  }

  /** Check if the sound manager has been initialized. */
  isInitialized(): boolean {
    return this.initialized;
  }
}
