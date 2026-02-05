import React, { useState, useEffect, useRef } from 'react';
import { AppSection, UserRole, User, AppNotification } from '../types';
import { api } from '../services/api';

interface NavbarProps {
  activeSection: AppSection;
  setActiveSection: (section: AppSection) => void;
  userRole: UserRole;
  user: User;
  onLogout: () => void;
  installPrompt?: any;
  onInstallClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeSection, setActiveSection, userRole, user, onLogout, installPrompt, onInstallClick }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Reset error state if user avatar URL changes
  useEffect(() => {
      setImgError(false);
  }, [user?.avatar]);

  // Fetch Notifications
  useEffect(() => {
    const fetchNotifs = async () => {
        try {
            const data = await api.notifications.get(user.id);
            setNotifications(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to fetch notifications");
        }
    };
    
    if (user) {
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 30000);
        return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside to close dropdowns
  useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
          if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
              setIsNotifOpen(false);
          }
          if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
              setIsDropdownOpen(false);
          }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (n: AppNotification) => {
      if (!n.isRead) {
          try {
              await api.notifications.markRead(n.id);
              setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
          } catch(e) { console.error("Error marking read", e); }
      }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const safeName = user.name || 'User';
  const initial = safeName.charAt(0).toUpperCase();

  return (
    <nav className="w-full min-w-full bg-white/90 backdrop-blur-xl border-b border-stone-200 sticky top-0 z-50 shadow-sm">
      <div className="w-full px-4 lg:px-6 h-20 flex items-center justify-between">
        
        {/* Left Side: Logo & Nav */}
        <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer group shrink-0" onClick={() => setActiveSection(AppSection.FEED)}>
              <div className="bg-purple-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200 group-hover:rotate-12 transition-transform">
                <i className="fas fa-music text-white text-xl"></i>
              </div>
              <span className="font-serif text-3xl font-black tracking-tighter text-stone-900 hidden sm:block">Shadaj</span>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-6">
              <NavItem icon="fas fa-house" label="Feed" active={activeSection === AppSection.FEED} onClick={() => setActiveSection(AppSection.FEED)} />
              <NavItem icon="fas fa-drum" label="Practice" active={activeSection === AppSection.PRACTICE} onClick={() => setActiveSection(AppSection.PRACTICE)} />
              <NavItem icon="fas fa-comment-dots" label="Chat" active={activeSection === AppSection.CHAT} onClick={() => setActiveSection(AppSection.CHAT)} />
              <NavItem icon="fas fa-video" label="Class" active={activeSection === AppSection.VIDEO_ROOM} onClick={() => setActiveSection(AppSection.VIDEO_ROOM)} />
              <NavItem icon="fas fa-robot" label="AI Guru" active={activeSection === AppSection.LIVE_GURU} onClick={() => setActiveSection(AppSection.LIVE_GURU)} />
              <NavItem icon="fas fa-users" label="Network" active={activeSection === AppSection.GURUS} onClick={() => setActiveSection(AppSection.GURUS)} />
              <NavItem icon="fas fa-wallet" label="Money" active={activeSection === AppSection.PAYMENTS} onClick={() => setActiveSection(AppSection.PAYMENTS)} />
            </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-3 md:gap-5">
          {installPrompt && (
            <button 
              onClick={onInstallClick}
              className="hidden md:flex items-center gap-2 bg-stone-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg animate-bounce"
            >
              <i className="fas fa-download"></i> App
            </button>
          )}

          <div className="relative hidden xl:block">
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-stone-100 border-none rounded-full py-2 px-4 pl-10 text-xs focus:ring-2 focus:ring-purple-400 w-48 transition-all font-medium"
            />
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
          </div>
          
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative text-stone-400 hover:text-purple-600 transition-colors p-2"
              >
                 <i className="fas fa-bell text-xl"></i>
                 {unreadCount > 0 && (
                     <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-pink-500 rounded-full border-2 border-white"></span>
                 )}
              </button>

              {isNotifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-stone-100 py-2 animate-in fade-in slide-in-from-top-2 z-50 overflow-hidden ring-1 ring-black/5">
                      <div className="px-5 py-3 border-b border-stone-50 bg-stone-50/50 flex justify-between items-center">
                          <span className="text-xs font-black uppercase tracking-widest text-stone-500">Notifications</span>
                          {unreadCount > 0 && <span className="text-[10px] text-purple-600 font-bold">{unreadCount} New</span>}
                      </div>
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                          {notifications.length === 0 ? (
                              <div className="p-6 text-center text-stone-400 italic text-xs">No notifications yet</div>
                          ) : (
                              notifications.map(n => (
                                  <div 
                                    key={n.id} 
                                    onClick={() => handleMarkRead(n)}
                                    className={`px-5 py-3 border-b border-stone-50 hover:bg-stone-50 transition-colors cursor-pointer ${!n.isRead ? 'bg-purple-50/30' : ''}`}
                                  >
                                      <div className="flex gap-3">
                                          <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${!n.isRead ? 'bg-pink-500' : 'bg-stone-300'}`}></div>
                                          <div>
                                              <p className={`text-sm ${!n.isRead ? 'font-bold text-stone-900' : 'font-medium text-stone-600'}`}>{n.title}</p>
                                              <p className="text-xs text-stone-500 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                                          </div>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                className="flex items-center gap-2 focus:outline-none group pl-1 pr-0.5 py-0.5 rounded-full hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-100"
            >
                <div className="w-9 h-9 rounded-full overflow-hidden border border-stone-200 shadow-sm group-hover:border-purple-300 transition-all bg-stone-200">
                    {(!imgError && user.avatar) ? (
                        <img 
                            src={user.avatar}
                            onError={() => setImgError(true)}
                            referrerPolicy="no-referrer"
                            alt="Profile" 
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <div className="w-full h-full bg-purple-100 flex items-center justify-center text-purple-600 font-black text-xs">
                            {initial}
                        </div>
                    )}
                </div>
                <i className={`fas fa-chevron-down text-stone-300 text-[10px] transition-transform duration-300 mr-1 ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isDropdownOpen && (
                 <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-stone-100 py-2 animate-in fade-in slide-in-from-top-2 z-50 overflow-hidden ring-1 ring-black/5">
                    <div className="px-5 py-4 border-b border-stone-50 mb-1 bg-stone-50/50">
                        <p className="text-sm font-black text-stone-900 truncate">{safeName}</p>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">{user.role}</p>
                    </div>
                    <button 
                        onClick={() => { setActiveSection(AppSection.PROFILE); setIsDropdownOpen(false); }} 
                        className="w-full text-left px-5 py-3 hover:bg-purple-50 text-xs font-bold text-stone-700 flex items-center gap-3 transition-colors uppercase tracking-widest group"
                    >
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                            <i className="fas fa-user"></i>
                        </div>
                        My Profile
                    </button>
                    <button 
                        onClick={() => { onLogout(); setIsDropdownOpen(false); }} 
                        className="w-full text-left px-5 py-3 hover:bg-red-50 text-xs font-bold text-red-600 flex items-center gap-3 transition-colors uppercase tracking-widest group"
                    >
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                            <i className="fas fa-sign-out-alt"></i>
                        </div>
                        Logout
                    </button>
                 </div>
             )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const NavItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-0.5 group ${active ? 'text-purple-600' : 'text-stone-400 hover:text-stone-900'}`}
  >
    <i className={`${icon} text-lg mb-0.5 transition-transform group-hover:scale-110 ${active ? 'scale-110' : ''}`}></i>
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    {active && <div className="w-1 h-1 rounded-full bg-purple-600 mt-0.5"></div>}
  </button>
);

export default Navbar;