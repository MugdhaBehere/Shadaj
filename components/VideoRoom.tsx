import React, { useEffect, useRef, useState } from 'react';
import { UserRole, User } from '../types';
import { api } from '../services/api';

interface VideoRoomProps {
  userRole: UserRole;
  onUpdateUser?: (user: User) => void;
}

const VideoRoom: React.FC<VideoRoomProps> = ({ userRole, onUpdateUser }) => {
  // Session States
  const [isJoined, setIsJoined] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPointsToast, setShowPointsToast] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  // Timer States
  const [durationMinutes, setDurationMinutes] = useState(45); // Default duration
  const [timeLeft, setTimeLeft] = useState(0); // Countdown in seconds

  // Media States
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);

  // Captions State
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [spokenLanguage, setSpokenLanguage] = useState('hi-IN'); 
  const spokenLanguageRef = useRef('hi-IN'); 
  const [currentCaption, setCurrentCaption] = useState<string>('');
  const [captionError, setCaptionError] = useState<string | null>(null);

  // Data States
  const [participants, setParticipants] = useState([
    { id: '1', name: 'Teacher A (Guru)', role: 'guru', isMe: false, isMuted: false, isHandRaised: false },
    { id: '2', name: 'Student B', role: 'student', isMe: false, isMuted: true, isHandRaised: true },
    { id: '3', name: 'Student C', role: 'student', isMe: false, isMuted: false, isHandRaised: false },
  ]);
  
  // Connection Data
  const [myConnections, setMyConnections] = useState<User[]>([]);

  // Schedule Form State
  const [scheduleForm, setScheduleForm] = useState({
    topic: '',
    date: '',
    time: '',
    duration: 45
  });
  
  // Invitation State
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [isSendingInvites, setIsSendingInvites] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const metronomeInterval = useRef<number | null>(null);
  
  // Speech Recognition Ref
  const recognitionRef = useRef<any>(null);
  const shouldCaptionsRunRef = useRef(false);
  
  // Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef<string>(''); 

  // --- ACTIONS ---

  // Update ref when state changes
  useEffect(() => {
      spokenLanguageRef.current = spokenLanguage;

      // If recognition is active, restart it to apply language change
      // calling stop() triggers onend(), which checks shouldCaptionsRunRef and restarts
      if (recognitionRef.current && isJoined && isCaptionsOn) {
          recognitionRef.current.stop();
      }
  }, [spokenLanguage]);

  // Sync the ref with state to prevent stale closures in onend
  useEffect(() => {
    shouldCaptionsRunRef.current = isCaptionsOn && isJoined;
  }, [isCaptionsOn, isJoined]);

  // Load Connections
  useEffect(() => {
    const fetchConnections = async () => {
        try {
            const storedUser = localStorage.getItem('sangeet_user_session');
            if (storedUser) {
                const me = JSON.parse(storedUser);
                const allUsers = await api.user.getAll();
                const connectedUsers = allUsers.filter((u: User) => me.connections && me.connections.includes(u.id));
                setMyConnections(connectedUsers);
            }
        } catch (e) {
            console.error("Failed to load connections for room", e);
        }
    };
    if (showScheduleModal) {
        fetchConnections();
    }
  }, [showScheduleModal]);

  // --- REAL-TIME CAPTIONS IMPLEMENTATION ---
  useEffect(() => {
      if (isCaptionsOn && isJoined) {
          setCaptionError(null);
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          
          if (SpeechRecognition) {
              const recognition = new SpeechRecognition();
              recognition.continuous = true;
              recognition.interimResults = true;
              recognition.lang = spokenLanguageRef.current;

              recognition.onresult = (event: any) => {
                const results = event.results;
                const latestResult = results[results.length - 1];
                const transcript = latestResult[0].transcript;
                
                // Show raw transcript in the spoken language script (e.g., Devanagari for Hindi)
                setCurrentCaption(transcript);
                setCaptionError(null);
              };

              recognition.onerror = (event: any) => {
                  if (event.error === 'no-speech') return; 
                  console.warn("Speech recognition error", event.error);
                  
                  // Stop future attempts until user manually toggles again
                  shouldCaptionsRunRef.current = false;
                  setIsCaptionsOn(false);

                  // Granular Error Handling
                  if (event.error === 'not-allowed') {
                      setCaptionError("Microphone blocked. Check browser address bar settings.");
                  } else if (event.error === 'service-not-allowed') {
                      setCaptionError("Speech service unavailable. Check internet connection.");
                  } else if (event.error === 'audio-capture') {
                      setCaptionError("No audio captured. Check microphone volume/connection.");
                  } else if (event.error === 'network') {
                       setCaptionError("Network error prevented captions.");
                  } else {
                      setCaptionError(`Captions error: ${event.error}`);
                  }
              };
              
              recognition.onend = () => {
                  // Only restart if we still want them running
                  if (shouldCaptionsRunRef.current) {
                      recognition.lang = spokenLanguageRef.current;
                      try { recognition.start(); } catch(e) { console.log("Recog restart failed", e); }
                  }
              };

              try {
                  recognition.start();
                  recognitionRef.current = recognition;
              } catch(e) { 
                  console.error(e); 
                  setIsCaptionsOn(false);
                  setCaptionError("Failed to start speech recognition.");
              }
          } else {
              setCaptionError("Browser does not support Speech Recognition.");
              setIsCaptionsOn(false);
          }
      } else {
          // Cleanup
          if (recognitionRef.current) {
              // Remove onend handler to prevent Zombie restarts
              recognitionRef.current.onend = null;
              recognitionRef.current.stop();
              recognitionRef.current = null;
          }
          setCurrentCaption('');
      }

      return () => {
          if (recognitionRef.current) {
              recognitionRef.current.onend = null;
              recognitionRef.current.stop();
          }
      };
  }, [isCaptionsOn, isJoined]);

  // Helper: Join as Spectator
  const joinAsSpectator = () => {
       streamRef.current = null;
       setIsCamOff(true);
       setIsMuted(true);
       setTimeLeft(durationMinutes * 60);
       setIsJoined(true);
       setIsJoining(false);
       
       // Award Points for joining (spectator bonus)
       try {
          const storedUser = localStorage.getItem('sangeet_user_session');
          if (storedUser) {
              const user = JSON.parse(storedUser);
              api.user.updateProfile(user.id, { points: (user.points || 0) + 50 }).then(updatedUser => {
                   if (onUpdateUser) onUpdateUser(updatedUser);
              });
          }
       } catch (e) { console.error("Failed to award points", e); }
  };

  const joinSession = async () => {
    setIsJoining(true);
    
    // Safety check for browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Your browser does not support media devices. Joining as Spectator.");
        joinAsSpectator();
        return;
    }

    try {
      // 1. Detect Available Devices
      let hasVideo = false;
      let hasAudio = false;

      try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          hasVideo = devices.some(d => d.kind === 'videoinput');
          hasAudio = devices.some(d => d.kind === 'audioinput');
      } catch (e) {
          console.warn("Could not enumerate devices", e);
          // Fallback: Assume devices might exist and try getUserMedia blindly
          hasVideo = true;
          hasAudio = true;
      }

      if (!hasVideo && !hasAudio) {
           const confirmSpectator = window.confirm("No camera or microphone found on your device. Join as Spectator (Listen Only)?");
           if (confirmSpectator) {
               joinAsSpectator();
           } else {
               setIsJoining(false);
           }
           return;
      }

      // 2. Build Constraints
      const constraints: MediaStreamConstraints = {
          audio: hasAudio ? { echoCancellation: true, noiseSuppression: true } : false,
          video: hasVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false
      };

      let stream: MediaStream | null = null;
      let errorName = '';

      // 3. Request Stream
      try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e: any) {
          console.warn("Primary getUserMedia failed:", e.name);
          errorName = e.name;

          // Retry with loose constraints if strict ones failed
          try {
             stream = await navigator.mediaDevices.getUserMedia({ audio: hasAudio, video: hasVideo });
          } catch(err: any) {
              errorName = err.name;
              console.warn("Loose getUserMedia failed:", err.name);
          }
      }

      // 4. Handle Success or Failure
      if (stream) {
          streamRef.current = stream;
          setTimeLeft(durationMinutes * 60);
          setIsJoined(true);
          
          // Determine initial toggle states based on tracks
          setIsCamOff(stream.getVideoTracks().length === 0);
          setIsMuted(stream.getAudioTracks().length === 0);

          // Award 100 Points for joining with media
          try {
              const storedUser = localStorage.getItem('sangeet_user_session');
              if (storedUser) {
                  const user = JSON.parse(storedUser);
                  const updatedUser = await api.user.updateProfile(user.id, { points: (user.points || 0) + 100 });
                  if (onUpdateUser) onUpdateUser(updatedUser);
                  
                  setShowPointsToast(true);
                  setTimeout(() => setShowPointsToast(false), 4000);
              }
          } catch (e) { console.error("Failed to award points", e); }
          
          setIsJoining(false);
      } else {
          // Specific Error Handling
          let userMessage = "Could not access media devices.";
          
          if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
              userMessage = "Permission denied. Please allow camera/microphone access in your browser settings.";
          } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
              userMessage = "Requested device not found. Please ensure your camera/mic are connected.";
          } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
              userMessage = "Camera/Mic is in use by another application (like Zoom/Teams). Please close it.";
          }

          const joinSpectator = window.confirm(`${userMessage}\n\nWould you like to join as a spectator instead?`);
          if (joinSpectator) {
               joinAsSpectator();
          } else {
              setIsJoining(false);
          }
      }

    } catch (err: any) {
      console.error("Unexpected error joining session", err);
      alert("Unexpected error: " + err.message);
      setIsJoining(false);
    }
  };

  const leaveSession = () => {
    if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }

    setTimeout(() => {
        if (recordedChunksRef.current.length > 0) {
            const shouldDownload = window.confirm("This session was recorded, do you wish to download the recording?");
            if (shouldDownload) {
                const mimeType = recordingMimeTypeRef.current || 'video/webm';
                const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
                
                const blob = new Blob(recordedChunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `shadaj-session-${new Date().toISOString().slice(0,10)}.${extension}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        if (metronomeInterval.current) {
            clearInterval(metronomeInterval.current);
            metronomeInterval.current = null;
        }

        if (recognitionRef.current) {
            recognitionRef.current.onend = null; // Important: Clear onend
            recognitionRef.current.stop();
        }

        setIsJoined(false);
        setIsScreenSharing(false);
        setIsRecording(false);
        setIsMetronomeOn(false);
        setIsCaptionsOn(false);
        setCaptionError(null);
        setTimeLeft(0);
        recordedChunksRef.current = [];
        mediaRecorderRef.current = null;
        streamRef.current = null;
    }, 100);
  };

  const toggleMute = () => {
      if (streamRef.current) {
          streamRef.current.getAudioTracks().forEach(track => track.enabled = !track.enabled);
          setIsMuted(prev => !prev);
      }
  };

  const toggleCam = () => {
      if (streamRef.current) {
          streamRef.current.getVideoTracks().forEach(track => track.enabled = !track.enabled);
          setIsCamOff(prev => !prev);
      }
  };

  const toggleRecording = () => {
      if (!streamRef.current) {
          alert("Cannot record in spectator mode.");
          return;
      }

      if (isRecording) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
          }
          setIsRecording(false);
      } else {
          try {
              const mimeTypes = [
                  'video/mp4',
                  'video/webm;codecs=h264',
                  'video/webm'
              ];
              const selectedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
              
              if (!selectedType) {
                  alert("Recording is not supported in this browser.");
                  return;
              }

              recordingMimeTypeRef.current = selectedType;
              const recorder = new MediaRecorder(streamRef.current, { mimeType: selectedType });
              recordedChunksRef.current = []; 
              
              recorder.ondataavailable = (event) => {
                  if (event.data.size > 0) {
                      recordedChunksRef.current.push(event.data);
                  }
              };

              recorder.start();
              mediaRecorderRef.current = recorder;
              setIsRecording(true);
          } catch (e) {
              console.error("Failed to start recording", e);
              alert("Could not start recording.");
          }
      }
  };

  const toggleScreenShare = async () => {
      if (isScreenSharing) {
          if (streamRef.current && videoRef.current) {
              videoRef.current.srcObject = streamRef.current; 
          }
          setIsScreenSharing(false);
      } else {
          try {
              const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
              if (videoRef.current) {
                  videoRef.current.srcObject = screenStream;
              }
              screenStream.getVideoTracks()[0].onended = () => {
                  setIsScreenSharing(false);
                  if (videoRef.current && streamRef.current) {
                      videoRef.current.srcObject = streamRef.current;
                  }
              };
              setIsScreenSharing(true);
          } catch (e) {
              console.warn("Screen share cancelled");
          }
      }
  };

  const toggleMetronome = () => {
      if (isMetronomeOn) {
          if (metronomeInterval.current) {
              clearInterval(metronomeInterval.current);
              metronomeInterval.current = null;
          }
      } else {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          metronomeInterval.current = window.setInterval(() => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 1000;
              gain.gain.setValueAtTime(0.1, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
              osc.start();
              osc.stop(ctx.currentTime + 0.1);
          }, 500); 
      }
      setIsMetronomeOn(!isMetronomeOn);
  };
  
  const handleScheduleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSendingInvites(true);
      
      const recipientIds = selectedInvitees;

      if (recipientIds.length === 0) {
          alert("Please select at least one connection to invite.");
          setIsSendingInvites(false);
          return;
      }

      try {
          await api.notifications.sendInvite({
              recipients: recipientIds,
              title: `Invitation: ${scheduleForm.topic}`,
              message: `You are invited to join a session on ${scheduleForm.date} at ${scheduleForm.time}. Duration: ${scheduleForm.duration} mins.`,
              link: '/video-room' 
          });

          if ("Notification" in window && Notification.permission === "granted") {
               new Notification(`Session Scheduled`, {
                   body: `Invites sent for ${scheduleForm.topic}`,
                   icon: 'https://ui-avatars.com/api/?name=Shadaj&background=9333ea&color=fff'
               });
          }

          alert(`Session Scheduled Successfully!`);
          setShowScheduleModal(false);
          setScheduleForm({ topic: '', date: '', time: '', duration: 45 });
          setSelectedInvitees([]);
      } catch (e) {
          console.error("Failed to send invites", e);
          alert("Failed to send invitations. Please try again.");
      } finally {
          setIsSendingInvites(false);
      }
  };
  
  const toggleInvitee = (id: string) => {
      if (selectedInvitees.includes(id)) {
          setSelectedInvitees(selectedInvitees.filter(i => i !== id));
      } else {
          setSelectedInvitees([...selectedInvitees, id]);
      }
  };

  const handleToggleCaptions = () => {
      if (!streamRef.current && !isCaptionsOn) {
          setCaptionError("Mic required (Spectator Mode active)");
          setTimeout(() => setCaptionError(null), 3000);
          return;
      }
      setIsCaptionsOn(!isCaptionsOn);
      setCaptionError(null);
  };

  // --- EFFECTS ---
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (metronomeInterval.current) {
          clearInterval(metronomeInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    let interval: number;
    if (isJoined && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 1) {
                clearInterval(interval);
                return 0;
            }
            return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isJoined, timeLeft]);

  useEffect(() => {
    if (isJoined && videoRef.current && streamRef.current && !isScreenSharing) {
        videoRef.current.srcObject = streamRef.current;
    }
  }, [isJoined, isScreenSharing]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to determine caption label
  const getCaptionLabel = () => {
    const langMap: Record<string, string> = {
        'hi-IN': 'Hindi (Devanagari)',
        'mr-IN': 'Marathi (Devanagari)',
        'en-IN': 'English (India)',
        'en-US': 'English (US)'
    };
    return `Live Captions (${langMap[spokenLanguage] || 'English'})`;
  };
  

  const renderLobby = () => (
    <div className="bg-stone-900 rounded-[2.5rem] overflow-hidden shadow-2xl h-[750px] flex flex-col border-4 border-stone-800 relative">
      <div className="flex-grow flex flex-col items-center justify-center text-center p-12 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
        <div className="w-28 h-28 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-[2rem] flex items-center justify-center text-white text-4xl mb-8 shadow-2xl rotate-3">
          <i className="fas fa-video"></i>
        </div>
        <h2 className="text-4xl font-serif font-black text-white mb-4">
          {userRole === 'guru' ? 'Start Your Classroom' : 'Join the Jam Session'}
        </h2>
        <p className="text-stone-400 mb-8 max-w-md font-medium leading-relaxed">
          Experience ultra-low latency audio/video tailored for Indian Classical Music. 
        </p>
        
        <div className="mb-10 bg-stone-800 p-2 rounded-xl border border-stone-700 inline-flex items-center gap-3">
            <span className="text-stone-400 text-xs font-bold uppercase tracking-widest ml-2">Class Duration:</span>
            <select 
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="bg-stone-700 text-white text-sm font-bold px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 border border-stone-600"
            >
                <option value={30}>30 Mins</option>
                <option value={45}>45 Mins</option>
                <option value={60}>60 Mins</option>
                <option value={90}>90 Mins</option>
            </select>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={joinSession}
            disabled={isJoining}
            className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-5 rounded-2xl font-black text-lg shadow-xl shadow-purple-900/40 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {isJoining ? (
                <><i className="fas fa-circle-notch fa-spin mr-2"></i> Connecting...</>
            ) : (
                userRole === 'guru' ? 'Go Live Now' : 'Join Class'
            )}
          </button>
          <button 
            onClick={() => setShowScheduleModal(true)}
            className="bg-stone-800 hover:bg-stone-700 text-white px-12 py-5 rounded-2xl font-black text-lg transition-all border border-stone-700"
          >
            Schedule Session
          </button>
        </div>
      </div>
    </div>
  );

  const renderActiveRoom = () => (
    <div className="fixed inset-0 z-[100] bg-stone-950 flex flex-col animate-in fade-in duration-300">
        <div className="h-16 bg-stone-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-10">
            {/* POINTS TOAST IN ROOM */}
            {showPointsToast && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-amber-400 text-stone-900 px-6 py-2 rounded-full font-black shadow-xl animate-in zoom-in z-[120] flex items-center gap-2">
                    <div className="bg-white rounded-full p-1"><i className="fas fa-star text-amber-500 text-xs"></i></div>
                    <span>+100 Points Earned!</span>
                </div>
            )}

            <div className="flex items-center gap-4">
                <span className="text-white font-bold text-lg tracking-tight">Raag Yaman Masterclass</span>
                <span className={`text-xs px-3 py-1.5 rounded-md font-mono min-w-[80px] text-center font-bold border transition-colors ${timeLeft < 300 ? 'bg-red-500/20 text-red-500 border-red-500/30 animate-pulse' : 'bg-stone-800 text-stone-400 border-stone-700'}`}>
                    <i className="far fa-clock mr-2"></i>
                    {formatTime(timeLeft)}
                </span>
            </div>
            <div className="flex items-center gap-4">
                 {isRecording && (
                     <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
                         <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                         <span className="text-red-500 text-xs font-black uppercase tracking-widest">REC</span>
                     </div>
                 )}
                 <div className="flex -space-x-2">
                     {participants.map(p => (
                         <img key={p.id} src={`https://picsum.photos/seed/${p.name}/100/100`} className="w-8 h-8 rounded-full border-2 border-stone-900" alt={p.name}/>
                     ))}
                     <div className="w-8 h-8 rounded-full bg-stone-800 border-2 border-stone-900 flex items-center justify-center text-xs text-white font-bold">+2</div>
                 </div>
            </div>
        </div>

        <div className="flex-grow p-6 overflow-y-auto custom-scrollbar relative">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full content-center">
                <div className={`relative bg-stone-900 rounded-3xl overflow-hidden shadow-2xl aspect-video group ${isScreenSharing ? 'col-span-2 row-span-2' : ''} ${isHandRaised ? 'ring-4 ring-yellow-400' : 'border border-stone-800'}`}>
                    {isCamOff || !streamRef.current ? (
                        <div className="w-full h-full flex items-center justify-center bg-stone-800 relative">
                             <div className="w-24 h-24 bg-stone-700 rounded-full flex items-center justify-center text-4xl text-stone-500">
                                <i className="fas fa-user-slash"></i>
                             </div>
                             {!streamRef.current && (
                                <div className="absolute bottom-4 bg-stone-900/80 px-4 py-1 rounded-full text-xs font-bold text-stone-400">
                                    Spectator Mode
                                </div>
                             )}
                        </div>
                    ) : (
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted={true} 
                            className={`w-full h-full object-cover ${isScreenSharing ? '' : 'scale-x-[-1]'}`}
                        />
                    )}
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                        {isMuted && <div className="bg-red-600 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shadow-lg"><i className="fas fa-microphone-slash"></i></div>}
                        {isHandRaised && <div className="bg-yellow-400 w-8 h-8 rounded-full flex items-center justify-center text-black text-sm shadow-lg animate-bounce"><i className="fas fa-hand-paper"></i></div>}
                    </div>
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                        <span className="text-white text-sm font-bold">You {isScreenSharing ? '(Presenting)' : ''}</span>
                    </div>
                </div>

                {participants.map(p => (
                    <div key={p.id} className={`relative bg-stone-900 rounded-3xl overflow-hidden shadow-xl aspect-video border border-stone-800 group`}>
                        <img src={`https://picsum.photos/seed/${p.name}/800/600`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={p.name} />
                        <div className="absolute top-4 right-4 flex flex-col gap-2">
                             {p.role === 'guru' && <span className="bg-purple-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md shadow-lg">Guru</span>}
                             {p.isMuted && <div className="bg-red-500/80 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"><i className="fas fa-microphone-slash"></i></div>}
                             {p.isHandRaised && <div className="bg-yellow-400 w-8 h-8 rounded-full flex items-center justify-center text-black text-sm animate-bounce"><i className="fas fa-hand-paper"></i></div>}
                        </div>
                        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                            <span className="text-white text-sm font-bold">{p.name}</span>
                        </div>
                        {!p.isMuted && (
                             <div className="absolute bottom-4 right-4 flex gap-1 items-end h-4">
                                {[...Array(3)].map((_,i) => (
                                    <div key={i} className="w-1 bg-green-500 rounded-full animate-bounce" style={{height: '100%', animationDuration: `${0.5 + i*0.2}s`}}></div>
                                ))}
                             </div>
                        )}
                    </div>
                ))}
             </div>
             
             {/* REAL TIME CAPTIONS OVERLAY */}
             {isCaptionsOn && (
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 max-w-2xl bg-black/70 backdrop-blur-lg p-6 rounded-2xl border border-white/10 text-center animate-in slide-in-from-bottom-4 transition-all z-40">
                     <div className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 flex items-center justify-center gap-2">
                        <i className="fas fa-language"></i> {getCaptionLabel()}
                     </div>
                     <div className="relative min-h-[3rem] flex items-center justify-center">
                        <p className="text-white font-medium text-lg leading-relaxed">
                            {currentCaption || <span className="text-white/30 italic">Listening...</span>}
                        </p>
                     </div>
                 </div>
             )}
             
             {/* ERROR NOTIFICATION FOR CAPTIONS */}
             {captionError && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl animate-in fade-in slide-in-from-bottom-2 z-50 flex items-center gap-2 backdrop-blur-sm border border-red-500/50">
                    <i className="fas fa-exclamation-triangle"></i> {captionError}
                </div>
             )}
        </div>

        <div className="h-24 bg-stone-900 border-t border-stone-800 flex items-center justify-center px-4 relative z-20">
             <div className="absolute left-8 hidden lg:flex items-center gap-4 text-white">
                 <div className="text-xs text-stone-400">
                     <p className="font-bold">Bandwidth</p>
                     <p className="text-green-500">Strong (4.2 MBps)</p>
                 </div>
             </div>

             {/* Spoken Language Select (Visible only when captions on) */}
             {isCaptionsOn && (
                 <div className="absolute right-8 bottom-24 bg-stone-800 p-2 rounded-xl border border-stone-700 animate-in slide-in-from-bottom-2">
                     <div className="text-[10px] text-stone-400 font-bold uppercase mb-1 px-1">Speaking Language</div>
                     <select 
                        value={spokenLanguage}
                        onChange={(e) => setSpokenLanguage(e.target.value)}
                        className="bg-stone-900 text-white text-xs font-bold px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-purple-500"
                     >
                         <option value="hi-IN">Hindi (हिंदी)</option>
                         <option value="mr-IN">Marathi (मराठी)</option>
                         <option value="en-IN">English (India)</option>
                         <option value="en-US">English (US)</option>
                     </select>
                 </div>
             )}

             <div className="flex items-center gap-4">
                <ControlBtn 
                    icon={isMuted ? "fas fa-microphone-slash" : "fas fa-microphone"} 
                    active={isMuted} 
                    onClick={toggleMute}
                    offColor="bg-red-600 hover:bg-red-700 text-white" 
                    onColor="bg-stone-800 hover:bg-stone-700 text-white"
                />
                <ControlBtn 
                    icon={isCamOff ? "fas fa-video-slash" : "fas fa-video"} 
                    active={isCamOff} 
                    onClick={toggleCam} 
                    offColor="bg-red-600 hover:bg-red-700 text-white" 
                    onColor="bg-stone-800 hover:bg-stone-700 text-white"
                />
                <div className="w-px h-10 bg-stone-700 mx-2"></div>
                <ControlBtn 
                    icon="fas fa-closed-captioning" 
                    active={isCaptionsOn} 
                    onClick={handleToggleCaptions}
                    onColor="bg-blue-600 hover:bg-blue-700 text-white"
                    offColor="bg-stone-800 hover:bg-stone-700 text-stone-300"
                    inverted={true} 
                    label="AI Captions"
                />
                <ControlBtn 
                    icon="fas fa-desktop" 
                    active={isScreenSharing} 
                    onClick={toggleScreenShare}
                    onColor="bg-blue-600 hover:bg-blue-700 text-white"
                    offColor="bg-stone-800 hover:bg-stone-700 text-stone-300"
                    inverted={true} 
                />
                <ControlBtn 
                    icon="fas fa-hand-paper" 
                    active={isHandRaised} 
                    onClick={() => setIsHandRaised(!isHandRaised)}
                    onColor="bg-yellow-500 hover:bg-yellow-600 text-black"
                    offColor="bg-stone-800 hover:bg-stone-700 text-stone-300"
                    inverted={true}
                />
                <ControlBtn 
                    icon="fas fa-music" 
                    active={isMetronomeOn} 
                    onClick={toggleMetronome}
                    onColor="bg-pink-600 hover:bg-pink-700 text-white"
                    offColor="bg-stone-800 hover:bg-stone-700 text-stone-300"
                    inverted={true}
                    label="120"
                />
                 <ControlBtn 
                    icon="fas fa-record-vinyl" 
                    active={isRecording} 
                    onClick={toggleRecording}
                    onColor="bg-red-600 hover:bg-red-700 text-white animate-pulse"
                    offColor="bg-stone-800 hover:bg-stone-700 text-stone-300"
                    inverted={true}
                />
                <div className="w-px h-10 bg-stone-700 mx-2"></div>
                <button 
                    onClick={leaveSession}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:shadow-red-900/40 transition-all active:scale-95 flex items-center gap-2"
                >
                    <i className="fas fa-phone-slash"></i>
                    <span className="hidden sm:inline">LEAVE</span>
                </button>
             </div>
        </div>
    </div>
  );

  return (
    <>
      {isJoined ? renderActiveRoom() : renderLobby()}

      {/* SCHEDULE SESSION MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[150] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
             <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                 {/* Header */}
                 <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                     <div>
                         <h2 className="text-2xl font-serif font-black text-stone-900">Schedule Session</h2>
                         <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mt-1">Plan a class or jam</p>
                     </div>
                     <button onClick={() => setShowScheduleModal(false)} className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-400 hover:text-red-500 hover:border-red-200 transition-all">
                         <i className="fas fa-times"></i>
                     </button>
                 </div>
                 
                 {/* Form */}
                 <form onSubmit={handleScheduleSubmit} className="p-8 space-y-6">
                     {/* Topic */}
                     <div>
                         <label className="block text-xs font-black uppercase text-stone-400 mb-2">Topic / Raag</label>
                         <input 
                            type="text" 
                            required
                            value={scheduleForm.topic}
                            onChange={e => setScheduleForm({...scheduleForm, topic: e.target.value})}
                            placeholder="e.g. Raag Yaman Workshop"
                            className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl px-4 py-3 font-bold text-stone-900 focus:outline-none focus:border-purple-500"
                         />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs font-black uppercase text-stone-400 mb-2">Date</label>
                             <input 
                                type="date" 
                                required
                                value={scheduleForm.date}
                                onChange={e => setScheduleForm({...scheduleForm, date: e.target.value})}
                                className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl px-4 py-3 font-bold text-stone-900 focus:outline-none focus:border-purple-500"
                             />
                         </div>
                         <div>
                             <label className="block text-xs font-black uppercase text-stone-400 mb-2">Time</label>
                             <input 
                                type="time" 
                                required
                                value={scheduleForm.time}
                                onChange={e => setScheduleForm({...scheduleForm, time: e.target.value})}
                                className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl px-4 py-3 font-bold text-stone-900 focus:outline-none focus:border-purple-500"
                             />
                         </div>
                     </div>

                     {/* Invitees Selection */}
                     <div>
                         <label className="block text-xs font-black uppercase text-stone-400 mb-2">Invite Connections</label>
                         <div className="border-2 border-stone-100 rounded-xl p-2 max-h-40 overflow-y-auto custom-scrollbar bg-stone-50">
                             {myConnections.length === 0 ? (
                                 <p className="text-center text-xs text-stone-400 py-4">No connections found. Go to Network to connect.</p>
                             ) : (
                                 <div className="space-y-1">
                                     {myConnections.map(user => (
                                         <div 
                                            key={user.id} 
                                            onClick={() => toggleInvitee(user.id)}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedInvitees.includes(user.id) ? 'bg-purple-100 border border-purple-200' : 'hover:bg-white border border-transparent'}`}
                                         >
                                             <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedInvitees.includes(user.id) ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-stone-300'}`}>
                                                 {selectedInvitees.includes(user.id) && <i className="fas fa-check text-[10px]"></i>}
                                             </div>
                                             <img src={user.avatar} className="w-8 h-8 rounded-full" alt={user.name} />
                                             <span className="text-sm font-bold text-stone-700">{user.name}</span>
                                             <span className="text-[10px] text-stone-400 uppercase ml-auto">{user.role}</span>
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                         <div className="flex justify-end mt-2">
                             <button type="button" onClick={() => setSelectedInvitees(myConnections.map(u => u.id))} className="text-[10px] font-bold text-purple-600 hover:underline uppercase tracking-wide">Select All</button>
                             <span className="mx-2 text-stone-300">|</span>
                             <button type="button" onClick={() => setSelectedInvitees([])} className="text-[10px] font-bold text-stone-400 hover:text-stone-600 uppercase tracking-wide">Clear</button>
                         </div>
                     </div>

                     <button 
                        type="submit"
                        disabled={isSendingInvites}
                        className="w-full bg-stone-900 text-white py-4 rounded-xl font-black shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                     >
                        {isSendingInvites ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-calendar-check"></i>}
                        Send Invites
                     </button>
                 </form>
             </div>
        </div>
      )}
    </>
  );
};

interface ControlBtnProps {
    icon: string;
    active: boolean;
    onClick: () => void;
    onColor: string;
    offColor: string;
    inverted?: boolean;
    label?: string;
}

const ControlBtn: React.FC<ControlBtnProps> = ({ icon, active, onClick, onColor, offColor, inverted, label }) => {
    const colorClass = inverted 
        ? (active ? onColor : offColor)
        : (active ? offColor : onColor);

    return (
        <button 
            onClick={onClick}
            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all shadow-lg active:scale-90 ${colorClass}`}
        >
            <i className={`${icon} text-xl`}></i>
            {label && active && <span className="text-[8px] font-black mt-0.5">{label}</span>}
        </button>
    );
}

export default VideoRoom;