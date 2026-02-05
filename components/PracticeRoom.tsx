import React, { useState, useEffect, useCallback } from 'react';
import { audioService } from '../services/audioService';

type Notation = 'Indian' | 'Western';

// --- CONFIGURATION CONSTANTS ---
const ASSETS_PATH = '/assets/';
const SAMPLES = {
  tanpuraSa: ASSETS_PATH + 'Sa Tanpura.m4a',
  tanpuraPa: ASSETS_PATH + 'Pa Tanpura.m4a',
  
  // Tabla Loops
  tabla_teental: ASSETS_PATH + 'Teentaal.m4a',
  tabla_dadra: ASSETS_PATH + 'Dadra.m4a',
  tabla_keherwa: ASSETS_PATH + 'Keherwa.m4a',
  tabla_rupak: ASSETS_PATH + 'Roopak.m4a',
  tabla_jhaptal: ASSETS_PATH + 'Jhaptaal.m4a',
  tabla_chautaal: ASSETS_PATH + 'Chautaal.m4a',
  tabla_dhamaar: ASSETS_PATH + 'Dhamaar.m4a',
  tabla_tilwada: ASSETS_PATH + 'Tilwada.m4a',
  tabla_garba: ASSETS_PATH + 'Garba .m4a',
  tabla_ada_chautaal: ASSETS_PATH + 'Ada Chautaal.m4a',
  tabla_ektaal: ASSETS_PATH + 'Ektaal.m4a',
  tabla_punjabi: ASSETS_PATH + 'Punjabi.m4a',
  tabla_addha: ASSETS_PATH + 'Addha.m4a',
  tabla_jhoomra: ASSETS_PATH + 'Jhoomra.m4a',
  tabla_bhajan: ASSETS_PATH + 'Bhajan.m4a',
  tabla_deep_chandi: ASSETS_PATH + 'Deep Chandi.m4a',
};

const SWARA_MAP = [
  { indian: 'Sa', western: 'C', ratio: 1.0 },
  { indian: 're Komal', western: 'Db', ratio: 1.059 },
  { indian: 're', western: 'D', ratio: 1.122 },
  { indian: 'ga Komal', western: 'Eb', ratio: 1.189 },
  { indian: 'ga', western: 'E', ratio: 1.259 },
  { indian: 'ma', western: 'F', ratio: 1.334 },
  { indian: 'ma Tivra', western: 'F#', ratio: 1.414 },
  { indian: 'Pa', western: 'G', ratio: 1.498 },
  { indian: 'dha Komal', western: 'Ab', ratio: 1.587 },
  { indian: 'dha', western: 'A', ratio: 1.681 },
  { indian: 'ni Komal', western: 'Bb', ratio: 1.781 },
  { indian: 'ni', western: 'B', ratio: 1.887 },
  { indian: 'Sa (Hi)', western: 'C5', ratio: 2.0 }
];

const PITCH_PRESETS = [
  { name: 'Black 5 (A#)', freq: 233.08 },
  { name: 'White 7 (B)', freq: 246.94 },
  { name: 'White 1 (C)', freq: 130.81 },
  { name: 'Black 1 (C#)', freq: 138.59 },
  { name: 'White 2 (D)', freq: 146.83 },
  { name: 'Black 2 (D#)', freq: 155.56 },
  { name: 'White 3 (E)', freq: 164.81 },
  { name: 'White 4 (F)', freq: 174.61 },
  { name: 'Black 3 (F#)', freq: 185.00 },
  { name: 'White 5 (G)', freq: 196.00 },
  { name: 'Black 4 (G#)', freq: 207.65 },
  { name: 'White 6 (A)', freq: 220.00 },
];

const TAALS = [
  { name: 'Teental', beats: 16, pattern: ['Dha', 'Dhin', 'Dhin', 'Dha', 'Dha', 'Dhin', 'Dhin', 'Dha', 'Dha', 'Tin', 'Tin', 'Ta', 'Ta', 'Dhin', 'Dhin', 'Dha'] },
  { name: 'Dadra', beats: 6, pattern: ['Dha', 'Dhin', 'Na', 'Dha', 'Tin', 'Na'] },
  { name: 'Keherwa', beats: 8, pattern: ['Dha', 'Ge', 'Na', 'Ti', 'Na', 'Ka', 'Dhin', 'Na'] },
  { name: 'Rupak', beats: 7, pattern: ['Tin', 'Tin', 'Na', 'Dhin', 'Na', 'Dhin', 'Na'] },
  { name: 'Jhaptal', beats: 10, pattern: ['Dhi', 'Na', 'Dhi', 'Dhi', 'Na', 'Ti', 'Na', 'Dhi', 'Dhi', 'Na'] },
  { name: 'Ektaal', beats: 12, pattern: ['Dhin', 'Dhin', 'Dha', 'Ge', 'Tu', 'Na', 'Kat', 'Ta', 'Dha', 'Ge', 'Dhi', 'Na'] },
  { name: 'Chautaal', beats: 12, pattern: ['Dha', 'Dha', 'Dhin', 'Ta', 'Kit', 'Dha', 'Dhin', 'Ta', 'Tit', 'Kat', 'Gadi', 'Gan'] },
  { name: 'Deep Chandi', beats: 14, pattern: ['Dha', 'Dhin', '-', 'Dha', 'Dha', 'Tin', '-', 'Ta', 'Tin', '-', 'Dha', 'Dha', 'Dhin', '-'] },
  { name: 'Jhoomra', beats: 14, pattern: ['Dhin', '-', 'Dha', 'Tir', 'Kit', 'Dhin', 'Dhin', 'Dha', 'Ge', 'Tir', 'Kit', 'Tin', 'Na', 'Ta'] },
  { name: 'Tilwada', beats: 16, pattern: ['Dha', 'Tir', 'Kit', 'Dhin', 'Dhin', 'Dha', 'Dha', 'Tin', 'Tin', 'Ta', 'Tir', 'Kit', 'Dhin', 'Dhin', 'Dha', 'Dha', 'Dhin', 'Dhin'] },
  { name: 'Dhamaar', beats: 14, pattern: ['Ka', 'Dhi', 'T', 'Dhi', 'T', 'Dha', '-', 'Ga', 'Ti', 'T', 'Ti', 'T', 'Ta', '-'] },
  { name: 'Ada Chautaal', beats: 14, pattern: ['Dhin', 'Tir', 'Kit', 'Dhi', 'Na', 'Tu', 'Na', 'Kat', 'Ta', 'Tir', 'Kit', 'Dhi', 'Na', 'Dhi', 'Dhi', 'Na'] },
  { name: 'Addha', beats: 16, pattern: ['Dha', 'Dhin', '-', 'Dha', 'Dha', 'Dhin', '-', 'Dha', 'Dha', 'Tin', '-', 'Ta', 'Ta', 'Dhin', '-', 'Dha'] },
  { name: 'Punjabi', beats: 8, pattern: ['Dha', '-', 'Dhin', 'Na', 'Dha', '-', 'Tin', 'Na'] },
  { name: 'Garba', beats: 8, pattern: ['Dha', 'Dhin', 'Ta', 'Ta', 'Dhin', 'Dha', 'Ta', 'Ta'] },
  { name: 'Bhajan', beats: 8, pattern: ['Dha', 'Dhin', 'Na', 'Dha', 'Tin', 'Na', 'Dha', 'Dhin'] },
];

const RAAGAS = ['Bageshree', 'Bhimpalas', 'Bhup', 'Des', 'Kaafi', 'Khamaj'];

const PracticeRoom: React.FC = () => {
  const [volume, setVolume] = useState(70);

  // --- INSTRUMENT STATE ---
  const [tanpuraActive, setTanpuraActive] = useState(false);
  const [tanpuraString, setTanpuraString] = useState<'Sa' | 'Pa'>('Sa');
  const [pitchPreset, setPitchPreset] = useState(PITCH_PRESETS[10]); 
  const [fineTune, setFineTune] = useState(0); 
  const [tanpuraSampleStatus, setTanpuraSampleStatus] = useState<'checking' | 'found' | 'missing'>('checking');
  
  const [tablaActive, setTablaActive] = useState(false);
  const [selectedTaal, setSelectedTaal] = useState(TAALS[0]);
  const [tempo, setTempo] = useState(140);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [tablaSampleStatus, setTablaSampleStatus] = useState<'checking' | 'found' | 'missing'>('checking');
  
  // Raaga State
  const [selectedRaag, setSelectedRaag] = useState<string>('');
  const [playingRaagFile, setPlayingRaagFile] = useState<string | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const loadSamples = async () => {
      // 1. Tanpura
      try {
        await audioService.loadTanpuraSamples(SAMPLES.tanpuraSa, SAMPLES.tanpuraPa);
        const check = await fetch(SAMPLES.tanpuraSa);
        setTanpuraSampleStatus(check.ok ? 'found' : 'missing');
      } catch { setTanpuraSampleStatus('missing'); }

      // 2. Tabla (Loops)
      try {
        await audioService.loadTablaLoops({
          'teental': SAMPLES.tabla_teental,
          'dadra': SAMPLES.tabla_dadra,
          'keherwa': SAMPLES.tabla_keherwa,
          'rupak': SAMPLES.tabla_rupak,
          'jhaptal': SAMPLES.tabla_jhaptal,
          'chautaal': SAMPLES.tabla_chautaal,
          'dhamaar': SAMPLES.tabla_dhamaar,
          'tilwada': SAMPLES.tabla_tilwada,
          'garba': SAMPLES.tabla_garba,
          'ada chautaal': SAMPLES.tabla_ada_chautaal,
          'ektaal': SAMPLES.tabla_ektaal,
          'punjabi': SAMPLES.tabla_punjabi,
          'addha': SAMPLES.tabla_addha,
          'jhoomra': SAMPLES.tabla_jhoomra,
          'bhajan': SAMPLES.tabla_bhajan,
          'deep chandi': SAMPLES.tabla_deep_chandi
        });
        const check = await fetch(SAMPLES.tabla_teental);
        setTablaSampleStatus(check.ok ? 'found' : 'missing');
      } catch { setTablaSampleStatus('missing'); }
    };

    loadSamples();

    return () => {
       audioService.stopInstrument('tanpura');
       audioService.stopInstrument('tabla');
    };
  }, []);

  // --- HANDLERS ---
  const toggleTanpura = useCallback(() => {
    if (tanpuraActive) {
      audioService.stopInstrument('tanpura');
    } else {
      const tunedFreq = pitchPreset.freq * Math.pow(2, fineTune / 1200);
      audioService.startTanpura(tunedFreq, tanpuraString);
    }
    setTanpuraActive(!tanpuraActive);
  }, [tanpuraActive, pitchPreset, fineTune, tanpuraString]);

  const toggleTabla = useCallback(async () => {
    if (tablaActive) {
      // STOP
      audioService.stopInstrument('tabla');
      setCurrentBeat(-1);
      setTablaActive(false);
    } else {
      // START
      audioService.startTabla(selectedTaal.name, selectedTaal.pattern, tempo, true, setCurrentBeat);
      setTablaActive(true);
    }
  }, [tablaActive, selectedTaal, tempo]);

  const playHarmoniumNote = (swara: typeof SWARA_MAP[0]) => {
      const baseFreq = 261.63; // C4
      // Use Synth
      audioService.playHarmoniumKey(swara.western, baseFreq * swara.ratio, false);
  };

  const playRaagPart = async (type: 'Aaroh' | 'Avroh' | 'Pakad') => {
      if (!selectedRaag) return;
      const fileName = `${selectedRaag} ${type}.m4a`;
      const url = ASSETS_PATH + fileName;
      setPlayingRaagFile(type);
      await audioService.playFile(url);
      setTimeout(() => setPlayingRaagFile(null), 1000); // Visual reset
  };

  // Re-sync effects
  useEffect(() => {
    if (tanpuraActive) {
      const tunedFreq = pitchPreset.freq * Math.pow(2, fineTune / 1200);
      audioService.startTanpura(tunedFreq, tanpuraString);
    }
  }, [tanpuraString, pitchPreset, fineTune]);

  useEffect(() => {
    if (tablaActive) {
      audioService.stopInstrument('tabla');
      audioService.startTabla(selectedTaal.name, selectedTaal.pattern, tempo, true, setCurrentBeat);
    }
  }, [selectedTaal, tempo, tablaActive]);

  useEffect(() => {
    const vol = volume / 100;
    audioService.setVolume(vol);
  }, [volume]);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-700 pb-32">
      
      {/* DASHBOARD HEADER */}
      <div className="bg-white/90 backdrop-blur-3xl rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-stone-100 flex flex-col md:flex-row items-center justify-between gap-8 relative">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl flex items-center justify-center text-white shadow-2xl rotate-6">
            <i className="fas fa-wave-square text-2xl"></i>
          </div>
          <div>
            <h2 className="text-3xl font-serif font-black text-stone-900 tracking-tight">Practice Room</h2>
            <div className="flex items-center gap-2 mt-2">
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5 bg-stone-100 px-6 py-3 rounded-2xl shadow-inner border border-stone-200 group">
             <i className="fas fa-volume-down text-stone-300 group-hover:text-purple-500 transition-colors"></i>
             <input type="range" min="0" max="100" value={volume} onChange={e => setVolume(parseInt(e.target.value))} className="w-20 md:w-24 h-1.5 bg-stone-300 rounded-lg appearance-none accent-purple-600 cursor-pointer" />
        </div>
      </div>

      {/* INSTRUMENT STACK */}
      <div className="flex flex-col gap-6 w-full">
        
        {/* TANPURA CARD */}
        <div className="w-full bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-stone-100 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-100 rounded-bl-[10rem] -mr-16 -mt-16 opacity-50 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-serif font-black text-stone-900 flex items-center gap-3">Tanpura</h3>
                <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mt-1">Pitch & Drone</p>
                {tanpuraSampleStatus === 'missing' && (
                  <p className="text-red-400 text-[9px] font-bold mt-1">Using Synth (Samples missing)</p>
                )}
              </div>
              <button onClick={toggleTanpura} className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-2xl ${tanpuraActive ? 'bg-purple-600 text-white scale-105 shadow-purple-300' : 'bg-white border-2 border-stone-100 text-stone-300 hover:border-purple-200 hover:text-purple-500'}`}>
                <i className="fas fa-power-off text-2xl"></i>
              </button>
            </div>

            {/* Pitch Selection */}
            <div className="mb-6">
               <div className="flex justify-between items-center mb-2">
                 <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Base Pitch (Sa)</label>
                 <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">{pitchPreset.name}</span>
               </div>
               <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                 {PITCH_PRESETS.map((p) => (
                   <button key={p.name} onClick={() => setPitchPreset(p)} className={`h-10 rounded-xl text-[9px] font-black border transition-all ${pitchPreset.name === p.name ? 'bg-stone-900 text-white border-stone-900 shadow-lg' : 'bg-white border-stone-100 text-stone-400 hover:border-stone-300'}`}>
                     {p.name.split(' ')[0]}
                   </button>
                 ))}
               </div>
            </div>

            {/* String Selection */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
               <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-3">Drone String Selection</label>
               <div className="flex gap-2">
                 <button 
                    onClick={() => setTanpuraString('Sa')}
                    className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${tanpuraString === 'Sa' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-stone-500 border border-stone-200'}`}
                 >
                    SA (Root)
                 </button>
                 <button 
                    onClick={() => setTanpuraString('Pa')}
                    className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${tanpuraString === 'Pa' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-stone-500 border border-stone-200'}`}
                 >
                    PA (5th)
                 </button>
               </div>
            </div>
            
            {/* Visualizer Bar */}
            <div className={`mt-6 h-1.5 w-full rounded-full transition-all duration-500 ${tanpuraActive ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.6)]' : 'bg-stone-200'}`}></div>
          </div>
        </div>

        {/* TABLA CARD */}
        <div className="w-full bg-stone-900 rounded-[3rem] p-8 md:p-12 shadow-2xl text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-serif font-black flex items-center gap-3">
                    Tabla
                </h3>
                <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mt-1">Rhythm & Time</p>
              </div>
              
              <button onClick={toggleTabla} className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-2xl ${tablaActive ? 'bg-white text-stone-900 scale-105' : 'bg-stone-800 border-2 border-stone-700 text-stone-500 hover:text-white'}`}>
                <i className="fas fa-drum text-2xl"></i>
              </button>
            </div>

            {/* CONTROLS */}
            <div className="mb-8">
               <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block mb-4">Select Taal</label>
               <div className="flex flex-wrap gap-2">
                 {TAALS.map(t => (
                   <button key={t.name} onClick={() => setSelectedTaal(t)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all ${selectedTaal.name === t.name ? 'bg-purple-600 border-purple-600 text-white' : 'bg-stone-800 border-stone-800 text-stone-400 hover:bg-stone-700'}`}>
                     {t.name}
                   </button>
                 ))}
               </div>
            </div>

            <div className="mb-4">
               <div className="flex justify-between items-end mb-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block">Drut Laya (BPM)</label>
                  <span className="text-2xl font-black text-white tracking-tighter">{tempo}</span>
               </div>
               <input type="range" min="60" max="300" value={tempo} onChange={(e) => setTempo(parseInt(e.target.value))} className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none accent-purple-500 cursor-pointer" />
            </div>
            
          </div>
          
          {/* VISUALIZER */}
          <div className="relative z-10 flex flex-wrap gap-1">
            {selectedTaal.pattern.map((bol, i) => (
              <div key={i} className={`h-6 w-6 md:w-8 rounded flex items-center justify-center text-[8px] font-bold uppercase transition-all duration-75 ${currentBeat === i ? 'bg-white text-black scale-110 shadow-lg' : 'bg-stone-800 text-stone-600'}`}>
                {bol.substring(0,2)}
              </div>
            ))}
          </div>
        </div>

        {/* HARMONIUM CARD */}
        <div className="w-full bg-stone-800 rounded-[3rem] p-8 md:p-12 shadow-sm border border-stone-700 flex flex-col justify-between gap-8 relative overflow-hidden">
          <div className="relative z-10 w-full flex flex-col gap-6">
             <div className="flex justify-between items-start">
                 <div>
                    <h3 className="text-2xl font-serif font-black text-white flex items-center gap-3">
                        Harmonium
                    </h3>
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mt-1">Swara & Melody</p>
                 </div>
             </div>

             {/* RAAG CONTROLS */}
             <div className="bg-stone-900/50 p-6 rounded-2xl border border-stone-700 flex flex-col md:flex-row items-center gap-6">
                 <div className="w-full md:w-auto flex-grow">
                     <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block mb-2">Select Raag</label>
                     <select 
                        value={selectedRaag}
                        onChange={(e) => setSelectedRaag(e.target.value)}
                        className="w-full bg-stone-800 text-white border border-stone-600 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-purple-500"
                     >
                         <option value="" className="font-normal text-xs">Choose Raag</option>
                         {RAAGAS.map(r => <option key={r} value={r}>{r}</option>)}
                     </select>
                 </div>
                 <div className="flex gap-2 w-full md:w-auto">
                     {(['Aaroh', 'Avroh', 'Pakad'] as const).map(type => (
                         <button
                            key={type}
                            disabled={!selectedRaag}
                            onClick={() => playRaagPart(type)}
                            className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!selectedRaag ? 'bg-stone-800 text-stone-600 cursor-not-allowed' : playingRaagFile === type ? 'bg-purple-600 text-white scale-105' : 'bg-stone-700 text-white hover:bg-stone-600'}`}
                         >
                            {playingRaagFile === type && <i className="fas fa-play mr-1 text-[8px]"></i>}
                            {type}
                         </button>
                     ))}
                 </div>
             </div>
          </div>

          {/* Keyboard UI - Responsive */}
          <div className="relative z-10 w-full h-40 md:h-48 bg-stone-900/10 rounded-xl p-1 select-none">
             <div className="relative w-full h-full flex shadow-inner bg-stone-800/5 rounded-lg overflow-hidden">
                {/* Render White Keys */}
                {SWARA_MAP.filter(s => !s.western.includes('b') && !s.western.includes('#')).map((swara, i) => (
                    <button
                        key={`white-${i}`}
                        onMouseDown={() => playHarmoniumNote(swara)}
                        onTouchStart={() => playHarmoniumNote(swara)}
                        className="flex-1 bg-white border-l border-b-4 border-r border-stone-300 rounded-b-lg active:bg-stone-100 active:border-b-0 active:mt-1 flex items-end justify-center pb-3 z-0 relative group shadow-sm transition-all"
                    >
                         <span className="text-[10px] font-bold text-stone-400 group-hover:text-purple-600">{swara.indian}</span>
                    </button>
                ))}

                {/* Render Black Keys */}
                {SWARA_MAP.filter(s => s.western.includes('b') || s.western.includes('#')).map((swara, i) => {
                     // Positions for Db, Eb, F#, Ab, Bb (approx percentages relative to 8 white keys)
                     const leftPositions = ['8.5%', '21%', '46%', '58.5%', '71%'];
                     return (
                        <button
                            key={`black-${i}`}
                            onMouseDown={() => playHarmoniumNote(swara)}
                            onTouchStart={() => playHarmoniumNote(swara)}
                            className="absolute h-[65%] w-[8%] bg-stone-900 border-x border-b-[6px] border-stone-950 rounded-b-md z-10 active:border-b-2 active:scale-[0.98] shadow-xl flex items-end justify-center pb-2 transition-all hover:bg-black"
                            style={{ left: leftPositions[i] }}
                        >
                            <span className="text-[8px] font-bold text-stone-500">{swara.indian}</span>
                        </button>
                     );
                })}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeRoom;