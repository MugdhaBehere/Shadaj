import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthProps {
  onLogin: (user: User) => void;
}

type AuthMode = 'signin' | 'signup';

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [googleInitFailed, setGoogleInitFailed] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');

  // --- INITIALIZATION & LISTENERS ---
  useEffect(() => {
    // 1. Google GSI Init
    const env = (import.meta as any).env;
    const googleClientId = env?.VITE_GOOGLE_CLIENT_ID;
    
    // Check if Google Client ID is valid (not placeholder)
    const isGoogleConfigured = googleClientId && !googleClientId.includes('your_google_client_id');

    if ((window as any).google && isGoogleConfigured) {
        try {
            (window as any).google.accounts.id.initialize({
                client_id: googleClientId,
                callback: handleGoogleCredentialResponse
            });
            const btnContainer = document.getElementById("googleBtn");
            if (btnContainer) {
                (window as any).google.accounts.id.renderButton(
                    btnContainer,
                    { theme: "outline", size: "large", type: "standard", width: "100%" }
                );
            }
        } catch (e) {
            console.error("Google Auth Init Failed", e);
            setGoogleInitFailed(true);
        }
    } else {
        setGoogleInitFailed(true);
    }
  }, []);

  // --- OAUTH HANDLERS ---

  const handleGoogleCredentialResponse = async (response: any) => {
      setLoading(true);
      try {
          const payload = JSON.parse(atob(response.credential.split('.')[1]));
          const { result, token } = await api.auth.googleLogin({
              email: payload.email,
              name: payload.name,
              avatar: payload.picture,
              googleId: payload.sub
          });
          loginUser(result);
      } catch (e: any) {
          setError("Google Login Failed: " + e.message);
      } finally {
          setLoading(false);
      }
  };

  // Specific fallback for Dev/Preview environments where Google GSI might not load
  const handleGoogleDevFallback = async () => {
      setLoading(true);
      try {
           // Calls the API with mock data logic handled inside the api service fallback
           const response = await api.auth.googleLogin({
               email: 'dev_user@google.com',
               name: 'Dev Google User',
               avatar: 'https://ui-avatars.com/api/?name=Dev+User&background=random',
               googleId: 'dev_google_id'
           });
          
          if (response) loginUser(response.result);
      } catch (e: any) {
          setError(`Google Login Failed: ` + e.message);
      } finally {
          setLoading(false);
      }
  };

  // --- GUEST LOGIN ---

  const handleGuestLogin = (guestRole: UserRole) => {
      const guestUser: User = {
          id: `guest_${guestRole}_${Date.now()}`,
          name: guestRole === 'student' ? 'Guest Student' : 'Guest Guru',
          role: guestRole,
          email: 'guest@shadaj.com',
          avatar: `https://ui-avatars.com/api/?name=Guest+${guestRole}&background=${guestRole === 'guru' ? '0d9488' : 'db2777'}&color=fff`,
          instrument: guestRole === 'guru' ? 'Sitar' : 'Vocal',
          bio: 'Just visiting the world of music.',
          connections: [],
          points: 100,
          examinationLevel: 'Guest',
          interests: ['Classical Music']
      };
      onLogin(guestUser);
  };

  // --- TRADITIONAL AUTH ---

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        let response;
        if (mode === 'signup') {
             response = await api.auth.register({
                 email,
                 password,
                 name,
                 role,
                 instrument: role === 'guru' ? 'Instrument Expert' : 'Student',
                 bio: role === 'guru' ? 'Honored Guru at Shadaj' : 'Dedicated Student'
             });
        } else {
             response = await api.auth.login({ email, password });
        }
        loginUser(response.result);
    } catch (err: any) {
        setError(err.message || "Authentication failed");
    } finally {
        setLoading(false);
    }
  };

  const loginUser = (userData: any) => {
        const appUser: User = {
            id: userData._id || userData.id,
            name: userData.name,
            role: userData.role,
            avatar: userData.avatar,
            instrument: userData.instrument,
            bio: userData.bio,
            connections: userData.connections || [],
            points: userData.points || 0
        };
        onLogin(appUser);
  };

  return (
    <div className="min-h-screen bg-fuchsia-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="max-w-4xl w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 border border-purple-100">
        
        {/* Left Side - Visuals */}
        <div className="md:w-1/2 bg-gradient-to-br from-purple-700 via-purple-600 to-pink-600 p-12 text-white flex flex-col justify-between relative overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
           <div>
              <div className="inline-flex bg-white/20 backdrop-blur-md w-16 h-16 rounded-2xl items-center justify-center mb-6 shadow-inner border border-white/30">
                <i className="fas fa-music text-3xl"></i>
              </div>
              <h1 className="text-5xl font-serif font-black tracking-tight mb-4">Shadaj</h1>
              <p className="text-purple-100 text-lg font-medium leading-relaxed">
                Connect, collaborate, and resonate with the global Indian Classical Music community.
              </p>
           </div>
           <div className="mt-12 space-y-4">
              <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                 <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center font-bold">
                    <i className="fas fa-video"></i>
                 </div>
                 <div>
                    <p className="font-bold text-sm">HD Virtual Classrooms</p>
                    <p className="text-xs text-purple-200">Low latency for rhythm precision</p>
                 </div>
              </div>
              <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                 <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
                    <i className="fas fa-robot"></i>
                 </div>
                 <div>
                    <p className="font-bold text-sm">AI Riyaz Companion</p>
                    <p className="text-xs text-purple-200">Smart Tanpura & Tabla accompaniment</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Right Side - Form */}
        <div className="md:w-1/2 p-10 md:p-12 bg-white flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-stone-900">
                {mode === 'signin' ? 'Welcome Back' : 'Join the Community'}
            </h2>
            <p className="text-stone-400 text-sm mt-2">
                {mode === 'signin' 
                    ? 'Enter your credentials to access your musical journey.' 
                    : 'Create your account to start your practice.'}
            </p>
          </div>

          <div className="mb-6 h-12">
            {/* GOOGLE */}
            <div className="w-full h-full relative">
                <div id="googleBtn" className="w-full h-full"></div>
                {googleInitFailed && (
                   <button 
                      type="button" 
                      onClick={handleGoogleDevFallback}
                      className="absolute inset-0 w-full h-full flex items-center justify-center gap-2 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-sm font-bold text-stone-600 bg-white"
                   >
                      <i className="fab fa-google text-red-500 text-lg"></i>
                      <span>Google (Dev)</span>
                   </button>
                )}
            </div>
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-3 text-stone-400 font-bold tracking-widest">Or</span>
            </div>
          </div>

          {/* GUEST LOGIN BUTTONS */}
          <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                  type="button"
                  onClick={() => handleGuestLogin('student')}
                  className="py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-pink-200 bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors"
              >
                  <i className="fas fa-user-graduate mr-1"></i> Guest Student
              </button>
              <button 
                  type="button"
                  onClick={() => handleGuestLogin('guru')}
                  className="py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-teal-200 bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors"
              >
                  <i className="fas fa-chalkboard-teacher mr-1"></i> Guest Guru
              </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-stone-400 font-bold tracking-widest">Or with email</span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
                <>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1.5">Full Name</label>
                    <div className="relative">
                        <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-stone-300"></i>
                        <input 
                            type="text" 
                            required 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="e.g. Pt. Ravi Shankar"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1.5">I am a</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setRole('student')}
                            className={`py-3 rounded-xl text-xs font-bold border transition-all ${role === 'student' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-stone-50 border-stone-200 text-stone-500'}`}
                        >
                            Student
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('guru')}
                            className={`py-3 rounded-xl text-xs font-bold border transition-all ${role === 'guru' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-stone-50 border-stone-200 text-stone-500'}`}
                        >
                            Guru / Teacher
                        </button>
                    </div>
                </div>
                </>
            )}

            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1.5">Email Address</label>
                <div className="relative">
                    <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-stone-300"></i>
                    <input 
                        type="email" 
                        required 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="you@example.com"
                    />
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1.5">Password</label>
                <div className="relative">
                    <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-stone-300"></i>
                    <input 
                        type="password" 
                        required 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            {error && <p className="text-xs text-red-500 font-bold text-center">{error}</p>}

            <button 
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-sm shadow-xl shadow-purple-200 hover:bg-purple-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                {loading ? <i className="fas fa-circle-notch fa-spin"></i> : (mode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs font-medium text-stone-500">
                {mode === 'signin' ? "New to Shadaj? " : "Already have an account? "}
                <button 
                    onClick={() => {
                        setMode(mode === 'signin' ? 'signup' : 'signin');
                        setError('');
                    }}
                    className="text-purple-600 font-bold hover:underline"
                >
                    {mode === 'signin' ? "Create an account" : "Sign in"}
                </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;