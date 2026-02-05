
export class AudioService {
  private ctx: AudioContext | null = null;
  // Removed tanpuraTimer, replaced with source node
  private tanpuraSource: AudioBufferSourceNode | null = null; 
  private tanpuraGain: GainNode | null = null;

  private tablaTimer: number | null = null;
  private masterVolume: number = 0.7;
  private jivariCurve: Float32Array | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Sample Storage
  private saBuffer: AudioBuffer | null = null;
  private paBuffer: AudioBuffer | null = null;
  private sampleBaseFreq: number = 207.65; // G#3

  // Tabla Loops Storage (136 BPM Base)
  private tablaLoopBuffers: Record<string, AudioBuffer | null> = {};
  private tablaSource: AudioBufferSourceNode | null = null;
  private readonly tablaBaseBpm = 136;

  // Harmonium Storage - Now a map for individual keys
  private harmoniumBuffers: Record<string, AudioBuffer | null> = {};
  private harmoniumBaseFreq = 261.63; // C4

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 44100,
      });
      this.createJivariCurve();
      this.createNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- LOADER METHODS ---

  private async fetchAndDecode(url: string): Promise<AudioBuffer | null> {
    this.init();
    if (!this.ctx) return null;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      return await this.ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.warn(`AudioService: Failed to load ${url}`, e);
      return null;
    }
  }

  public async loadTanpuraSamples(saUrl: string, paUrl: string) {
    const [sa, pa] = await Promise.all([
      this.fetchAndDecode(saUrl),
      this.fetchAndDecode(paUrl)
    ]);
    this.saBuffer = sa;
    this.paBuffer = pa;
  }

  public async loadTablaLoops(urls: Record<string, string>) {
    const promises = Object.entries(urls).map(async ([key, url]) => {
      if (url) {
        this.tablaLoopBuffers[key.toLowerCase()] = await this.fetchAndDecode(url);
      }
    });
    await Promise.all(promises);
  }

  public async loadHarmoniumSamples(urls: Record<string, string>) {
    const promises = Object.entries(urls).map(async ([key, url]) => {
      if (url) {
        this.harmoniumBuffers[key] = await this.fetchAndDecode(url);
      }
    });
    await Promise.all(promises);
  }

  // --- UTILS ---

  private createJivariCurve() {
    const n = 65536;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh(x * 3.0) * (1 - 0.2 * Math.sin(x * Math.PI)); 
    }
    this.jivariCurve = curve;
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 1.0;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  public setVolume(vol: number) {
    this.masterVolume = vol;
    // Update active Tanpura volume in real-time
    if (this.tanpuraGain && this.ctx) {
      this.tanpuraGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.1);
    }
  }

  public async playFile(url: string) {
    this.init();
    if (!this.ctx) return;
    try {
        const buffer = await this.fetchAndDecode(url);
        if (buffer) {
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            const gain = this.ctx.createGain();
            gain.gain.value = this.masterVolume;
            source.connect(gain).connect(this.ctx.destination);
            source.start();
        }
    } catch (e) {
        console.error("Failed to play file", e);
    }
  }

  // --- TANPURA (LOOPING ENGINE) ---

  public startTanpura(baseFreq: number, stringType: 'Sa' | 'Pa') {
    this.init();
    this.stopInstrument('tanpura'); // Ensure previous loop is stopped

    if (!this.ctx) return;

    // Determine which buffer to play
    const buffer = stringType === 'Pa' ? this.paBuffer : this.saBuffer;
    
    if (buffer) {
        // --- SAMPLE MODE ---
        this.tanpuraSource = this.ctx.createBufferSource();
        this.tanpuraSource.buffer = buffer;
        this.tanpuraSource.loop = true;

        // Calculate Playback Rate
        this.tanpuraSource.playbackRate.value = baseFreq / this.sampleBaseFreq;

        // Gain Chain
        this.tanpuraGain = this.ctx.createGain();
        this.tanpuraGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.tanpuraGain.gain.linearRampToValueAtTime(this.masterVolume, this.ctx.currentTime + 1); // Fade in

        this.tanpuraSource.connect(this.tanpuraGain).connect(this.ctx.destination);
        this.tanpuraSource.start();
    } else {
        // --- SYNTH FALLBACK ---
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        const freq = stringType === 'Pa' ? baseFreq * 1.5 : baseFreq;
        osc.frequency.value = freq;
        
        this.tanpuraSource = osc as unknown as AudioBufferSourceNode; 
        this.tanpuraGain = this.ctx.createGain();
        this.tanpuraGain.gain.value = this.masterVolume * 0.1; 
        
        osc.connect(this.tanpuraGain).connect(this.ctx.destination);
        osc.start();
    }
  }

  // --- TABLA ---

  public playBol(bol: string, startTime: number = 0) {
    this.init();
    if (!this.ctx) return;
    const now = startTime || this.ctx.currentTime;
    const b = bol.toLowerCase();

    switch(b) {
      case 'dha': // Na + Ge
        this.playDayanSynth(now, 'na');
        this.playBayanSynth(now, 'slide_down');
        break;
      case 'dhin': // Tin + Ge
        this.playDayanSynth(now, 'tin');
        this.playBayanSynth(now, 'gumki');
        break;
      case 'na':
        this.playDayanSynth(now, 'na');
        break;
      case 'tin':
      case 'tun':
        this.playDayanSynth(now, 'tin');
        break;
      case 'ta':
        this.playDayanSynth(now, 'ta');
        break;
      case 'ge':
      case 'ghe':
        this.playBayanSynth(now, 'slide_down');
        break;
      case 'ka':
      case 'ke':
        this.playBayanSynth(now, 'flat'); 
        break;
    }
  }

  private playDayanSynth(startTime: number, bol: 'na' | 'tin' | 'ta') {
    if (!this.ctx || !this.noiseBuffer) return;
    const now = startTime;
    const fund = 277.18; 

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = this.noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(2000, now);
    const noiseGain = this.ctx.createGain();
    
    noiseGain.gain.setValueAtTime(0.3 * this.masterVolume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    noiseSrc.connect(noiseFilter).connect(noiseGain).connect(this.ctx.destination);
    noiseSrc.start(now);

    const modes = [
      { ratio: 1.0, decay: bol === 'na' ? 0.5 : 1.2, gain: 1.0 }, 
      { ratio: 2.9, decay: 0.4, gain: 0.3 }, 
      { ratio: 4.8, decay: 0.2, gain: 0.1 }  
    ];

    modes.forEach(mode => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.frequency.setValueAtTime(fund * mode.ratio, now);
      osc.frequency.exponentialRampToValueAtTime(fund * mode.ratio * 0.99, now + 0.1); 
      const vol = mode.gain * this.masterVolume * (bol === 'ta' ? 0.4 : 1.0);
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + mode.decay);
      osc.connect(g).connect(this.ctx!.destination);
      osc.start(now);
      osc.stop(now + mode.decay + 0.1);
    });
  }

  private playBayanSynth(startTime: number, profile: 'flat' | 'gumki' | 'slide_down') {
    if (!this.ctx) return;
    const now = startTime;
    const baseFreq = 85;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle'; 
    osc.frequency.setValueAtTime(baseFreq, now);
    
    if (profile === 'gumki') {
      osc.frequency.setValueAtTime(baseFreq + 10, now);
      osc.frequency.linearRampToValueAtTime(baseFreq - 5, now + 0.1);
      osc.frequency.linearRampToValueAtTime(baseFreq + 15, now + 0.3);
    } else if (profile === 'slide_down') {
      osc.frequency.setValueAtTime(baseFreq + 20, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.4);
    }

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(1.0 * this.masterVolume, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(filter).connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.0);
  }

  public startTabla(taalName: string, taalPattern: string[], tempoBpm: number, useSamples: boolean, onBeat: (i: number) => void) {
    this.init();
    this.stopInstrument('tabla');
    
    const loopBuffer = this.tablaLoopBuffers[taalName.toLowerCase()];
    const shouldUseLoop = useSamples && !!loopBuffer;

    if (shouldUseLoop && loopBuffer) {
        this.tablaSource = this.ctx!.createBufferSource();
        this.tablaSource.buffer = loopBuffer;
        this.tablaSource.loop = true;
        this.tablaSource.playbackRate.value = tempoBpm / this.tablaBaseBpm;
        
        const gain = this.ctx!.createGain();
        gain.gain.value = this.masterVolume;
        this.tablaSource.connect(gain).connect(this.ctx!.destination);
        this.tablaSource.start(this.ctx!.currentTime);
    }

    let beat = 0;
    const interval = (60 / tempoBpm) * 1000;
    
    const tick = () => {
      if (!this.ctx) return;
      if (!shouldUseLoop) {
          const bol = taalPattern[beat % taalPattern.length];
          if (bol !== 'none') this.playBol(bol, this.ctx.currentTime);
      }
      onBeat(beat % taalPattern.length);
      beat++;
      this.tablaTimer = window.setTimeout(tick, interval);
    };
    tick();
  }

  // --- HARMONIUM ---

  public playHarmoniumKey(note: string, freq: number, useSamples: boolean = true) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    const buffer = this.harmoniumBuffers[note];

    // Sample Playback
    if (useSamples && buffer) {
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = 1.0; 
        
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.6 * this.masterVolume, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 4.0); // Natural decay

        source.connect(g).connect(this.ctx.destination);
        source.start(now);
        return;
    }

    // Synthesis Fallback
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq, now);
    osc2.detune.setValueAtTime(8, now); 

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, now); 
    
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.2 * this.masterVolume, now + 0.1); 
    g.gain.setValueAtTime(0.2 * this.masterVolume, now + 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(g).connect(this.ctx.destination);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 3.1);
    osc2.stop(now + 3.1);
  }

  public stopInstrument(name: string) {
    if (name === 'tanpura') {
      if (this.tanpuraSource) {
        try {
            this.tanpuraSource.stop();
            this.tanpuraSource.disconnect();
        } catch (e) { /* ignore already stopped */ }
        this.tanpuraSource = null;
      }
      this.tanpuraGain = null;
    }
    if (name === 'tabla') {
      if (this.tablaTimer) {
        clearTimeout(this.tablaTimer);
        this.tablaTimer = null;
      }
      if (this.tablaSource) {
        try {
            this.tablaSource.stop();
        } catch(e) { /* ignore */ }
        this.tablaSource = null;
      }
    }
  }
}

export const audioService = new AudioService();
