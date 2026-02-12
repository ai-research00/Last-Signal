
type MusicState = 'MENU' | 'EXPLORE' | 'HUNT' | 'GAMEOVER';

class AudioService {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sequencerTimer: number | null = null;
  private currentBPM: number = 90;
  private step: number = 0;
  private state: MusicState = 'MENU';
  private intensity: number = 0; // 0 to 1

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.musicGain.connect(this.ctx.destination);
    }
    // Resume context if suspended (browser security policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMusicState(state: MusicState) {
    this.init();
    if (this.state === state && this.sequencerTimer) return;
    
    this.state = state;
    switch (state) {
      case 'MENU':
        this.currentBPM = 60;
        this.intensity = 0.2;
        break;
      case 'EXPLORE':
        this.currentBPM = 90;
        this.intensity = 0.4;
        break;
      case 'HUNT':
        this.currentBPM = 140;
        this.intensity = 0.8;
        break;
      case 'GAMEOVER':
        this.currentBPM = 40;
        this.intensity = 0.1;
        break;
    }
    
    if (this.musicGain && this.ctx) {
        const targetGain = state === 'GAMEOVER' ? 0.03 : 0.06;
        this.musicGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 1.5);
    }

    if (!this.sequencerTimer) {
      this.startSequencer();
    }
  }

  private startSequencer() {
    if (!this.ctx) return;
    
    const playTick = () => {
      if (!this.ctx) return;
      const secondsPerBeat = 60.0 / this.currentBPM;
      const noteTime = 0.25 * secondsPerBeat; // 16th notes

      this.playSequencerNote(this.step);
      
      this.step = (this.step + 1) % 16;
      this.sequencerTimer = window.setTimeout(playTick, noteTime * 1000);
    };

    playTick();
  }

  private playSequencerNote(step: number) {
    if (!this.ctx || !this.musicGain) return;

    if (step % 4 === 0) {
      const freq = this.state === 'GAMEOVER' ? 30 : 40 + (this.state === 'HUNT' ? 10 : 0);
      this.playSynthNote(freq, 'sine', 0.5, 0.1, true);
    }

    let shouldPlayLead = false;
    let freq = 200;
    let type: OscillatorType = 'triangle';

    if (this.state === 'MENU') {
      shouldPlayLead = step % 8 === 0;
      freq = 220 * Math.pow(2, (step / 12));
    } else if (this.state === 'EXPLORE') {
      shouldPlayLead = step % 4 === 2;
      freq = 440;
    } else if (this.state === 'HUNT') {
      shouldPlayLead = step % 2 === 0;
      freq = 110 * (step % 3 === 0 ? 1.5 : 1.2);
      type = 'sawtooth';
    } else if (this.state === 'GAMEOVER') {
        shouldPlayLead = step === 0;
        freq = 110;
        type = 'sine';
    }

    if (shouldPlayLead) {
      this.playSynthNote(freq, type, 0.15, 0.05 * this.intensity, false);
    }
  }

  private playSynthNote(freq: number, type: OscillatorType, duration: number, volume: number, isBass: boolean) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    g.gain.setValueAtTime(volume, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    
    osc.connect(g);
    g.connect(this.musicGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1, pan: number = 0) {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Spatialized Ambient Sounds
  playAmbientHum(pan: number = 0, volume: number = 0.015) {
    // Machine hum with slight frequency variation
    const baseFreq = 50 + Math.random() * 10;
    this.playTone(baseFreq, 'sine', 3.0, volume, pan);
    this.playTone(baseFreq * 2, 'sine', 2.5, volume * 0.4, pan);
    this.playTone(baseFreq * 4, 'sine', 2.0, volume * 0.2, pan);
  }

  playSpatialDroneWhir(pan: number = 0, volume: number = 0.02) {
    // Distant drone engine sound
    const freq = 120 + Math.random() * 180;
    const duration = 1.0 + Math.random() * 1.5;
    this.playTone(freq, 'sawtooth', duration, volume, pan);
  }

  playStaticBurst(pan: number = 0, volume: number = 0.008) {
    this.init();
    if (!this.ctx) return;
    const duration = 0.05 + Math.random() * 0.15;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    panner.pan.setValueAtTime(pan, this.ctx.currentTime);

    noise.connect(gain);
    gain.connect(panner);
    panner.connect(this.ctx.destination);
    noise.start();
  }

  playMove() { this.playTone(120, 'sine', 0.08, 0.04); }
  playScan() { this.playTone(300, 'square', 0.4, 0.02); }
  playEMP() { this.playTone(80, 'sawtooth', 0.8, 0.2); }
  playDamage() { this.playTone(40, 'sawtooth', 0.5, 0.15); }
  playCollect() { this.playTone(900, 'sine', 0.2, 0.08); }
  playHack() { this.playTone(1000, 'square', 0.05, 0.05); }
  playExplosion() {
    this.playTone(50, 'sawtooth', 0.8, 0.3);
    this.playTone(30, 'sine', 1.2, 0.4);
  }

  startAmbient(d: number) { this.setMusicState('MENU'); }
  updateAmbient(d: number) { /* handled by dynamic logic */ }
}

export const audio = new AudioService();
