import { GoogleGenAI, Modality } from "@google/genai";
import { decodeAudioData, createPcmBlob } from "./geminiService";

const API_KEY = process.env.API_KEY || "";

export interface RiyaazConfig {
    type: 'tabla' | 'harmonium';
    bpm?: number;
}

export class RiyaazService {
  private client: GoogleGenAI;
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private currentConfig: RiyaazConfig | null = null;
  public onAudioData: (() => void) | null = null; 

  constructor() {
    this.client = new GoogleGenAI({ apiKey: API_KEY });
  }

  public setVolume(val: number) {
      if (this.gainNode) {
          this.gainNode.gain.value = val;
      }
  }

  private initAudio() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ latencyHint: 'interactive' });
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 1.0; 
    }
  }

  async startSession(
    config: RiyaazConfig,
    onStatusChange: (status: 'connecting' | 'connected' | 'error', msg?: string) => void
  ) {
    this.currentConfig = config;
    this.initAudio();
    this.nextStartTime = 0;
    
    try {
        if (this.audioContext?.state === 'suspended') {
            await this.audioContext.resume();
        }
    } catch (e) {
        console.warn("Could not resume audio context:", e);
    }

    onStatusChange('connecting');

    let systemInstruction = "";
    if (config.type === 'tabla') {
        systemInstruction = `You are a Tabla virtuoso.
        User will provide a Tala and BPM.
        Play the Tabla rhythm continuously and with high energy.
        DO NOT SPEAK. ONLY GENERATE AUDIO.
        Start playing 'Teental' (16 beats) at ${config.bpm || 140} BPM immediately.
        Use clear, resonant Tabla bol sounds (Dha, Dhin, Na, Tirakit).`;
    } else {
        systemInstruction = `You are a Harmonium master.
        User will provide Swaras (notes) or Raag names.
        Play the harmonium melody immediately.
        DO NOT SPEAK. ONLY GENERATE AUDIO.
        Sustain notes for natural duration.`;
    }

    try {
        this.session = await this.client.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, 
                },
                systemInstruction: { parts: [{ text: systemInstruction }] }
            },
            callbacks: {
                onopen: async () => {
                    console.log(`[${config.type}] Connected`);
                    onStatusChange('connected');
                    this.sendSilence();
                    setTimeout(() => {
                        const initPrompt = config.type === 'tabla' 
                            ? `Start playing Teental at ${config.bpm || 140} BPM now.` 
                            : `Play Sa Re Ga Ma Pa Dha Ni Sa on Harmonium.`;
                        this.sendText(initPrompt);
                    }, 500);
                },
                onclose: () => {
                    console.log(`[${config.type}] Closed`);
                },
                onmessage: async (msg) => {
                    const parts = msg.serverContent?.modelTurn?.parts;
                    if (parts && parts.length > 0) {
                        for (const part of parts) {
                            if (part.inlineData && part.inlineData.data) {
                                this.processAudioData(part.inlineData.data);
                            }
                        }
                    }
                },
                onerror: (err: any) => {
                    const msg = err instanceof Error ? err.message : String(err);
                    console.error("Session Error:", msg);
                    onStatusChange('error', msg);
                }
            }
        });

    } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        onStatusChange('error', msg);
    }
  }

  async triggerNote(note: string) {
      await this.sendText(`Play note ${note}`);
  }

  public async sendUserPrompt(text: string) {
      await this.sendText(text);
  }

  async updateConfig(config: any) {
      if (config.bpm && this.currentConfig?.type === 'tabla') {
          await this.sendText(`Change tempo to ${config.bpm} BPM`);
      }
  }

  private async sendText(text: string) {
      if (this.session) {
          try {
              // Using correct method signature for @google/genai session
              // Usually it's send({ parts: [...] }, endTurn?)
              // Check exact SDK if method name varies (e.g. send vs sendInput)
              // Assuming 'send' is available on the LiveSession interface
              if (typeof this.session.send === 'function') {
                   await this.session.send([{ text: text }], true);
              }
          } catch (e) {
              console.error("Failed to send text input", e);
          }
      }
  }

  private sendSilence() {
      if (!this.session) return;
      const sampleRate = 16000;
      const silentBuffer = new Float32Array(sampleRate * 0.1); // 0.1s silence
      const pcmBlob = createPcmBlob(silentBuffer);
      this.session.sendRealtimeInput({ media: pcmBlob });
  }

  async stopSession() {
    if (this.session) {
        try {
             // @ts-ignore
             if(typeof this.session.close === 'function') this.session.close();
        } catch (e) {
            console.error("Error stopping session", e);
        }
    }
    this.session = null;
    this.nextStartTime = 0;
  }

  private async processAudioData(base64: string) {
      if (!this.audioContext) this.initAudio();
      if (!this.audioContext || !this.gainNode) return;

      if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
      }

      if (this.onAudioData) this.onAudioData();

      try {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const audioBuffer = await decodeAudioData(bytes, this.audioContext, 24000, 1);
        
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.gainNode);
        
        const now = this.audioContext.currentTime;
        if (this.nextStartTime < now) {
            this.nextStartTime = now;
        }
        
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;

      } catch (e) {
          console.error("Error processing audio chunk", e);
      }
  }
}

// Explicit instances export
export const tablaGuru = new RiyaazService();
export const harmoniumGuru = new RiyaazService();