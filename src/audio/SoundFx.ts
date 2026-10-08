// Procedural Web Audio Synthesizer for GTA V Chess (Zero external audio dependencies)

class SoundFXSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;

  // Engine Audio
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineRunning: boolean = false;

  // Siren Audio
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenTimer: number | null = null;
  private isSirenActive: boolean = false;

  // Radio Audio
  private radioStation: number = 0;
  private radioInterval: number | null = null;
  private isRadioPlaying: boolean = false;

  constructor() {}

  private initContext() {
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.value = 0.5;
          this.masterGain.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // AudioContext init suppressed
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.5, this.ctx.currentTime);
      }
    } catch {}
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public playClick() {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain || this.isMuted) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {}
  }

  public playCashSound() {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain || this.isMuted) return;

      const t = this.ctx.currentTime;
      [987.77, 1318.51].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + i * 0.08);

        gain.gain.setValueAtTime(0.2, t + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.25);
      });
    } catch {}
  }

  public playPunch() {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain || this.isMuted) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch {}
  }

  public playEnPassant() {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain || this.isMuted) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(1400, t + 0.18);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch {}
  }

  public playBishopBeam() {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain || this.isMuted) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.28);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.3);
    } catch {}
  }

  public playKnightLeap() {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain || this.isMuted) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.4);

      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.45);
    } catch {}
  }

  public playRookRam() {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain || this.isMuted) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(250, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.25);
    } catch {}
  }

  public playQueenGambit() {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain || this.isMuted) return;

      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = this.ctx!.currentTime + idx * 0.05;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    } catch {}
  }

  public startEngine() {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain || this.engineRunning) return;

      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, this.ctx.currentTime);

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc.start();
      this.engineRunning = true;
    } catch {}
  }

  public updateEngineRPM(speedNormalized: number, isAccelerating: boolean) {
    try {
      if (!this.ctx || !this.engineOsc || !this.engineGain || !this.engineRunning) return;

      const safeSpeed = isNaN(speedNormalized) ? 0 : Math.max(0, Math.min(1.5, speedNormalized));
      const baseFreq = 45;
      const maxFreq = 180;
      const targetFreq = Math.max(20, baseFreq + safeSpeed * (maxFreq - baseFreq) + (isAccelerating ? 25 : 0));
      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);

      const targetGain = Math.max(0.01, 0.08 + safeSpeed * 0.12 + (isAccelerating ? 0.05 : 0));
      this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
    } catch {}
  }

  public stopEngine() {
    try {
      if (this.engineOsc && this.engineRunning) {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      }
      if (this.engineGain) {
        this.engineGain.disconnect();
      }
    } catch {}
    this.engineOsc = null;
    this.engineGain = null;
    this.engineRunning = false;
  }

  public playCarHorn() {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain || this.isMuted) return;

      const t = this.ctx.currentTime;
      [415.3, 493.88].forEach(freq => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    } catch {}
  }

  public playTireSkid() {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain || this.isMuted) return;

      const t = this.ctx.currentTime;
      const bufferSize = Math.max(256, Math.floor(this.ctx.sampleRate * 0.2));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, t);
      filter.Q.setValueAtTime(3.0, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(t);
      noise.stop(t + 0.2);
    } catch {}
  }

  public setSirenState(active: boolean) {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      if (active && !this.isSirenActive) {
        this.isSirenActive = true;
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenGain = this.ctx.createGain();

        this.sirenOsc.type = 'sawtooth';
        this.sirenOsc.frequency.setValueAtTime(650, this.ctx.currentTime);
        this.sirenGain.gain.setValueAtTime(0.1, this.ctx.currentTime);

        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.masterGain);
        this.sirenOsc.start();

        let toggle = false;
        this.sirenTimer = window.setInterval(() => {
          if (!this.ctx || !this.sirenOsc) return;
          try {
            toggle = !toggle;
            const freq = toggle ? 920 : 650;
            this.sirenOsc.frequency.exponentialRampToValueAtTime(freq, this.ctx.currentTime + 0.25);
          } catch {}
        }, 400);
      } else if (!active && this.isSirenActive) {
        this.isSirenActive = false;
        if (this.sirenTimer) {
          clearInterval(this.sirenTimer);
          this.sirenTimer = null;
        }
        if (this.sirenOsc) {
          try {
            this.sirenOsc.stop();
            this.sirenOsc.disconnect();
          } catch {}
          this.sirenOsc = null;
        }
      }
    } catch {}
  }

  public playCheckmatedSound() {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 1.2);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(240, t);

      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 1.5);
    } catch {}
  }

  public playMissionPassed() {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const chord = [261.63, 392.00, 523.25, 659.25, 783.99];
      const t = this.ctx.currentTime;

      chord.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const startTime = t + idx * 0.12;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(startTime);
        osc.stop(startTime + 1.2);
      });
    } catch {}
  }

  public switchRadioStation(stationIndex: number) {
    this.initContext();
    this.radioStation = stationIndex;
    this.playRadioCrackle();

    if (this.radioInterval) {
      clearInterval(this.radioInterval);
      this.radioInterval = null;
    }

    if (stationIndex === 0) {
      this.isRadioPlaying = false;
      return;
    }

    this.isRadioPlaying = true;
    this.startRadioLoop();
  }

  private playRadioCrackle() {
    try {
      if (!this.ctx || !this.masterGain || this.isMuted) return;
      const t = this.ctx.currentTime;
      const bufferSize = Math.max(128, Math.floor(this.ctx.sampleRate * 0.08));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.4;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      noise.connect(gain);
      gain.connect(this.masterGain);
      noise.start(t);
    } catch {}
  }

  private startRadioLoop() {
    if (!this.ctx) return;
    let step = 0;

    this.radioInterval = window.setInterval(() => {
      try {
        if (!this.ctx || !this.masterGain || this.isMuted || !this.isRadioPlaying) return;
        const t = this.ctx.currentTime;

        if (this.radioStation === 1) {
          const bassNotes = [55, 55, 65.41, 73.42, 82.41, 73.42, 65.41, 55];
          const freq = bassNotes[step % bassNotes.length];
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.12, t);
          g.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
          osc.connect(g);
          g.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 0.3);

          if (step % 2 === 1) {
            this.triggerRadioSnare(t);
          }
        } else if (this.radioStation === 2) {
          const arpeggio = [220, 261.63, 329.63, 440, 523.25, 659.25, 440, 329.63];
          const freq = arpeggio[step % arpeggio.length];
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.1, t);
          g.gain.exponentialRampToValueAtTime(0.005, t + 0.35);
          osc.connect(g);
          g.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 0.35);
        } else if (this.radioStation === 3) {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(130, t);
          kickOsc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
          kickGain.gain.setValueAtTime(0.2, t);
          kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          kickOsc.connect(kickGain);
          kickGain.connect(this.masterGain);
          kickOsc.start(t);
          kickOsc.stop(t + 0.15);

          if (step % 2 === 1) {
            const synth = this.ctx.createOscillator();
            const sg = this.ctx.createGain();
            synth.type = 'sawtooth';
            synth.frequency.setValueAtTime(440, t);
            sg.gain.setValueAtTime(0.08, t);
            sg.gain.exponentialRampToValueAtTime(0.005, t + 0.15);
            synth.connect(sg);
            sg.connect(this.masterGain);
            synth.start(t);
            synth.stop(t + 0.15);
          }
        } else if (this.radioStation === 4) {
          const chords = [
            [261.63, 311.13, 392.00, 466.16],
            [220.00, 261.63, 329.63, 392.00],
            [174.61, 220.00, 261.63, 329.63],
            [196.00, 246.94, 293.66, 349.23],
          ];
          const chord = chords[Math.floor((step / 4) % chords.length)];
          chord.forEach(f => {
            const osc = this.ctx!.createOscillator();
            const g = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, t);
            g.gain.setValueAtTime(0.04, t);
            g.gain.exponentialRampToValueAtTime(0.005, t + 0.35);
            osc.connect(g);
            g.connect(this.masterGain!);
            osc.start(t);
            osc.stop(t + 0.38);
          });
        }
        step++;
      } catch {}
    }, 280);
  }

  private triggerRadioSnare(time: number) {
    try {
      if (!this.ctx || !this.masterGain) return;
      const bufferSize = Math.max(128, Math.floor(this.ctx.sampleRate * 0.1));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.2;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(time);
    } catch {}
  }

  public stopAll() {
    this.stopEngine();
    this.setSirenState(false);
    if (this.radioInterval) {
      clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
    this.isRadioPlaying = false;
  }
}

export const soundFX = new SoundFXSystem();
