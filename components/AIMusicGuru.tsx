
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData, createPcmBlob } from '../services/geminiService';
import { api } from '../services/api';
import { User } from '../types';

interface LiveGuruProps {
    onUpdateUser?: (user: User) => void;
}

export const LiveGuru: React.FC<LiveGuruProps> = ({ onUpdateUser }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Connect with your AI Sangeet Guru");
  const [showPointsToast, setShowPointsToast] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const hasErrorRef = useRef(false);

  useEffect(() => {
    return () => {
        stopSession(false);
    };
  }, []);

  const startSession = async () => {
    try {
      const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_API_KEY || (import.meta as any).env?.API_KEY;
      
      if (!apiKey) {
          setStatus("Error: API Key is missing. Check .env file.");
          return;
      }

      setStatus("Initializing session...");
      hasErrorRef.current = false;
      const ai = new GoogleGenAI({ apiKey });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: { parts: [{ text: 'You are an expert Indian Music Guru. Listen to the student sing or play and provide gentle feedback or theory knowledge. You can hum along or keep rhythm.' }] },
        },
        callbacks: {
          onopen: () => {
            setStatus("Guru is listening...");
            setIsActive(true);
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: any) => {
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              const decoded = decode(audioData);
              const buffer = await decodeAudioData(decoded, outputCtx, 24000, 1);
              
              const now = outputCtx.currentTime;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
              
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live session error", e);
            hasErrorRef.current = true;
            setStatus("Connection error. Please check console or try again.");
          },
          onclose: () => {
            setIsActive(false);
            if (!hasErrorRef.current) {
                setStatus("Guru session ended.");
            }
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error(err);
      setStatus(`Failed to start session: ${err.message || 'Check connection/key'}`);
    }
  };

  const stopSession = async (awardPoints = true) => {
    if (sessionRef.current) {
        // @ts-ignore
       if(typeof sessionRef.current.close === 'function') sessionRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setIsActive(false);
    setStatus("Session closed.");

    if (awardPoints && !hasErrorRef.current) {
        // Award 30 Points
        try {
            const storedUser = localStorage.getItem('sangeet_user_session');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                const updatedUser = await api.user.updateProfile(user.id, { points: (user.points || 0) + 30 });
                if (onUpdateUser) onUpdateUser(updatedUser);
                setShowPointsToast(true);
                setTimeout(() => setShowPointsToast(false), 3000);
            }
        } catch (e) { console.error("Failed to award points", e); }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 flex flex-col items-center text-center relative">
      {/* POINTS TOAST */}
      {showPointsToast && (
          <div className="absolute top-4 bg-amber-400 text-stone-900 px-6 py-2 rounded-full font-black shadow-xl animate-in fade-in slide-in-from-top-4 z-[60] flex items-center gap-2 text-sm">
              <div className="bg-white rounded-full p-1"><i className="fas fa-star text-amber-500 text-xs"></i></div>
              <span>+30 Points Earned!</span>
          </div>
      )}

      <div className="mb-8 relative">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center text-white text-5xl transition-all duration-700 ${isActive ? 'bg-purple-600 scale-110 shadow-2xl shadow-purple-300' : 'bg-stone-200'}`}>
           <i className={`fas ${isActive ? 'fa-microphone' : 'fa-robot'}`}></i>
        </div>
        {isActive && (
          <div className="absolute inset-0 border-4 border-purple-500 rounded-full animate-ping opacity-20"></div>
        )}
      </div>

      <h2 className="text-2xl font-serif font-bold mb-2">Live AI Guru Session</h2>
      <p className="text-stone-500 mb-8 max-w-md">{status}</p>

      {isActive ? (
        <button 
          onClick={() => stopSession(true)}
          className="bg-red-500 text-white px-10 py-4 rounded-full font-bold shadow-xl hover:bg-red-600 transition"
        >
          End Session
        </button>
      ) : (
        <button 
          onClick={startSession}
          className="bg-purple-600 text-white px-10 py-4 rounded-full font-bold shadow-xl shadow-purple-200 hover:bg-purple-700 transition transform hover:scale-105"
        >
          Start Conversation
        </button>
      )}

      <div className="mt-12 w-full max-w-lg bg-stone-50 rounded-2xl p-6 border border-stone-100">
        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Guru's Voice Features</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 text-sm font-medium text-stone-600">
            <i className="fas fa-check-circle text-purple-500"></i>
            Real-time Feedback
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-stone-600">
            <i className="fas fa-check-circle text-purple-500"></i>
            Raag Theory
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-stone-600">
            <i className="fas fa-check-circle text-purple-500"></i>
            Rhythm Support
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-stone-600">
            <i className="fas fa-check-circle text-purple-500"></i>
            Gentle Corrections
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-stone-400 italic">"Guruh Sakshat Parabrahma Tasmai Shri Gurave Namah"</p>
    </div>
  );
};
