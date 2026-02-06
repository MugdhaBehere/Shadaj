import React, { useState, useEffect } from 'react';
import { AppSection, User } from './types';
import Navbar from './components/Navbar';
import Feed from './components/Feed';
import PracticeRoom from './components/PracticeRoom';
import TutorSearch from './components/TutorSearch';
import Chat from './components/Chat';
import { AIMusicGuru } from './components/AIMusicGuru';
import VideoRoom from './components/VideoRoom';
import Payments from './components/Payments';
import Auth from './components/Auth';
import Profile from './components/Profile';
import MusicEncyclopediaBot from './components/MusicEncyclopediaBot';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.FEED);
  const [isLoading, setIsLoading] = useState(true);
  const [viewProfileId, setViewProfileId] = useState<string | undefined>(undefined);
  
  // Sidebar Image Error State
  const [sidebarImgError, setSidebarImgError] = useState(false);
  
  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('sangeet_user_session');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        
        // Data Migration Check: If the old demo user exists, force logout to show new seed data
        if (parsedUser.id === 'demo@shadaj.com' || parsedUser.name === 'Aarav Patel') {
            localStorage.removeItem('sangeet_user_session');
            setUser(null);
        } else {
            setUser(parsedUser);
        }
      } catch (e) {
        console.error("Failed to parse user session", e);
      }
    }
    setIsLoading(false);

    // Listen for PWA install prompt
    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  // Reset image error when avatar changes
  useEffect(() => {
      setSidebarImgError(false);
  }, [user?.avatar]);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setInstallPrompt(null);
    });
  };

  const handleLogin = (user: User) => {
    setUser(user);
    localStorage.setItem('sangeet_user_session', JSON.stringify(user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sangeet_user_session');
    setActiveSection(AppSection.FEED);
  };

  // Helper to open a profile
  const handleViewProfile = (userId: string) => {
      setViewProfileId(userId);
      setActiveSection(AppSection.PROFILE);
  };
  
  const handleViewMyProfile = () => {
      setViewProfileId(user?.id);
      setActiveSection(AppSection.PROFILE);
  };

  const handleUpdateUser = (updatedUser: User) => {
      setUser(updatedUser);
      localStorage.setItem('sangeet_user_session', JSON.stringify(updatedUser));
  };

  const renderSection = () => {
    if (!user) return <Auth onLogin={handleLogin} />;

    switch (activeSection) {
      case AppSection.FEED:
        return <Feed user={user} onUpdateUser={handleUpdateUser} />;
      case AppSection.PRACTICE:
        return <PracticeRoom />;
      case AppSection.GURUS:
        return <TutorSearch userRole={user.role} onViewProfile={handleViewProfile} />;
      case AppSection.CHAT:
        return <Chat onVideoCall={() => setActiveSection(AppSection.VIDEO_ROOM)} />;
      case AppSection.LIVE_GURU:
        return <AIMusicGuru onUpdateUser={handleUpdateUser} />;
      case AppSection.VIDEO_ROOM:
        return <VideoRoom userRole={user.role} onUpdateUser={handleUpdateUser} />;
      case AppSection.PAYMENTS:
        return <Payments userRole={user.role} onUpdateUser={handleUpdateUser} />;
      case AppSection.PROFILE:
        return <Profile 
            currentUser={user} 
            viewUserId={viewProfileId} 
            onUpdateUser={handleUpdateUser} 
            onBack={() => setActiveSection(AppSection.GURUS)}
        />;
      default:
        return <Feed user={user} onUpdateUser={handleUpdateUser} />;
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-purple-50"><i className="fas fa-circle-notch fa-spin text-purple-600 text-4xl"></i></div>;

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  // Safe Name Logic
  const safeName = user.name || 'Musician';
  const initial = safeName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF9] relative">
      <Navbar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        userRole={user.role}
        user={user}
        onLogout={logout}
        installPrompt={installPrompt}
        onInstallClick={handleInstallClick}
      />
      
      <main className="flex-grow container mx-auto px-4 py-6 md:py-10 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar / Profile Summary */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="bg-white rounded-[2.5rem] shadow-sm p-8 border border-stone-200 sticky top-24 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-pink-600"></div>
              <div className="flex flex-col items-center mb-8 pt-4">
                <div 
                    className="relative group cursor-pointer"
                    onClick={handleViewMyProfile}
                >
                  <div className="w-28 h-28 rounded-[2rem] bg-purple-50 flex items-center justify-center text-purple-600 text-4xl font-bold border-4 border-white shadow-2xl mb-4 overflow-hidden ring-1 ring-stone-100 transition-transform group-hover:scale-105">
                     {(!sidebarImgError && user.avatar) ? (
                       <img 
                          src={user.avatar} 
                          onError={() => setSidebarImgError(true)}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                          alt={safeName} 
                       />
                     ) : (
                       <div className="w-full h-full bg-purple-100 flex items-center justify-center text-purple-600 text-5xl font-black">
                          {initial}
                       </div>
                     )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full flex items-center justify-center text-white text-[10px]">
                    <i className="fas fa-check"></i>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-[10px] font-bold uppercase tracking-widest">Edit</span>
                  </div>
                </div>
                <h3 className="text-2xl font-serif font-black text-stone-900 tracking-tight text-center">{safeName}</h3>
                <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                  {user.role === 'guru' ? 'Acharya' : 'Student'} • {user.instrument || 'Music'}
                </p>
              </div>
              
              <div className="space-y-5 px-1">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400 font-black uppercase tracking-widest">
                    {user.role === 'guru' ? 'Seniority' : 'Nitya Practice'}
                  </span>
                  <span className="font-black text-purple-600">
                    {user.role === 'guru' ? '25+ Years' : '12 Days 🔥'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400 font-black uppercase tracking-widest">
                    {user.role === 'guru' ? 'Dakshina' : 'Balance'}
                  </span>
                  <button onClick={() => setActiveSection(AppSection.PAYMENTS)} className="font-black text-amber-500 hover:text-amber-600 flex items-center gap-1">
                    <i className="fas fa-star text-[10px]"></i> {user.points?.toLocaleString() || 0} Pts
                  </button>
                </div>
              </div>

              <hr className="my-8 border-stone-50" />

              <div className="space-y-4">
                <button 
                  onClick={() => setActiveSection(AppSection.VIDEO_ROOM)}
                  className="w-full bg-stone-900 text-white rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 transform active:scale-95"
                >
                  <i className="fas fa-video text-pink-500"></i>
                  {user.role === 'guru' ? 'Start Session' : "Join Class"}
                </button>

                <button 
                  onClick={() => setActiveSection(AppSection.LIVE_GURU)}
                  className="w-full bg-white text-stone-900 border-2 border-stone-100 rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-lg hover:border-purple-200 transition-all flex items-center justify-center gap-3 transform active:scale-95 group"
                >
                  <i className="fas fa-robot text-purple-600 group-hover:animate-bounce"></i>
                  AI Riyaaz Guru
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-6">
            {renderSection()}
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block lg:col-span-3">
             <div className="bg-white rounded-[2.5rem] shadow-sm p-8 border border-stone-200 sticky top-24">
                <h3 className="font-black text-[11px] uppercase tracking-[0.3em] mb-8 flex items-center gap-4 text-stone-400 border-l-2 border-purple-600 pl-4">
                  {user.role === 'guru' ? 'Guru Dashboard' : 'Trending Riyaz'}
                </h3>
                
                {user.role === 'student' ? (
                  <ul className="space-y-6">
                    <li className="group cursor-pointer">
                      <p className="text-sm font-black text-stone-800 group-hover:text-purple-600 transition-colors tracking-tight">#RaagBhairaviChallenge</p>
                      <p className="text-[10px] text-stone-400 font-bold uppercase mt-1">1.2k practitioners</p>
                    </li>
                    <li className="group cursor-pointer">
                      <p className="text-sm font-black text-stone-800 group-hover:text-purple-600 transition-colors tracking-tight">#IndieFusionIndia</p>
                      <p className="text-sm text-stone-400 font-bold uppercase mt-1">856 videos shared</p>
                    </li>
                  </ul>
                ) : (
                  <ul className="space-y-6">
                    <li className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-stone-500 uppercase tracking-widest">Students</span>
                      <span className="font-black text-purple-600 text-xl">24</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-stone-500 uppercase tracking-widest">Active Raags</span>
                      <span className="font-black text-purple-600 text-xl">4</span>
                    </li>
                  </ul>
                )}

                <h3 className="font-black text-[11px] uppercase tracking-[0.3em] mt-14 mb-8 flex items-center gap-4 text-stone-400 border-l-2 border-pink-600 pl-4">
                   {user.role === 'guru' ? 'My Schedule' : 'Calendar'}
                </h3>
                <div className="space-y-5">
                  <div className="p-5 bg-purple-50/40 rounded-[2rem] border-2 border-purple-100 cursor-pointer hover:bg-purple-50 transition-all hover:scale-[1.02] shadow-sm" onClick={() => setActiveSection(AppSection.VIDEO_ROOM)}>
                    <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-2">Today • 6:00 PM</p>
                    <p className="text-sm font-black text-stone-800 leading-tight">
                      {user.role === 'guru' ? 'Advanced Sitar Class' : 'Khayal Basics with Pt. Ravinder'}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-pink-500 uppercase tracking-widest">
                      <i className="fas fa-play-circle animate-pulse text-lg"></i> GO TO ROOM
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </main>
      
      {/* GLOBAL CHATBOT */}
      <MusicEncyclopediaBot />

      {/* Mobile Navigation Dock */}
      <div className="lg:hidden fixed bottom-6 left-6 right-6 bg-stone-900/90 backdrop-blur-xl border border-white/10 px-8 py-5 flex justify-between items-center z-50 rounded-[2.5rem] shadow-2xl">
        <button onClick={() => setActiveSection(AppSection.FEED)} className={`flex flex-col items-center transition-all ${activeSection === AppSection.FEED ? 'text-purple-400 scale-110' : 'text-stone-500'}`}>
          <i className="fas fa-home text-xl"></i>
        </button>
        <button onClick={() => setActiveSection(AppSection.PRACTICE)} className={`flex flex-col items-center transition-all ${activeSection === AppSection.PRACTICE ? 'text-purple-400 scale-110' : 'text-stone-500'}`}>
          <i className="fas fa-drum text-xl"></i>
        </button>
        <button onClick={() => setActiveSection(AppSection.VIDEO_ROOM)} className="flex items-center justify-center -mt-14 bg-gradient-to-br from-purple-600 to-pink-600 text-white w-16 h-16 rounded-[1.5rem] shadow-2xl border-4 border-[#FDFBF9] transform hover:rotate-12 transition-all">
          <i className="fas fa-video text-2xl"></i>
        </button>
        <button onClick={() => setActiveSection(AppSection.LIVE_GURU)} className={`flex flex-col items-center transition-all ${activeSection === AppSection.LIVE_GURU ? 'text-purple-400 scale-110' : 'text-stone-500'}`}>
          <i className="fas fa-robot text-xl"></i>
        </button>
        <button onClick={handleViewMyProfile} className={`flex flex-col items-center transition-all ${activeSection === AppSection.PROFILE ? 'text-purple-400 scale-110' : 'text-stone-500'}`}>
          <i className="fas fa-user text-xl"></i>
        </button>
      </div>
    </div>
  );
};

export default App;