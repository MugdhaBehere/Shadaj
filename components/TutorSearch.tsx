import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface NetworkProps {
  userRole: UserRole;
  onViewProfile?: (userId: string) => void;
}

const Network: React.FC<NetworkProps> = ({ userRole, onViewProfile }) => {
  const [activeTab, setActiveTab] = useState<'network' | 'discover' | 'role'>('discover'); // Default to discover so new users see content
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [filterInstrument, setFilterInstrument] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      const loadData = async () => {
          setIsLoading(true);
          try {
              // Get current user from storage
              const storedUser = localStorage.getItem('sangeet_user_session');
              if (storedUser) {
                  const me = JSON.parse(storedUser);
                  // Refresh current user data from API to get latest connections
                  const allUsers = await api.user.getAll();
                  const freshMe = allUsers.find((u: User) => u.id === me.id);
                  setCurrentUser(freshMe || me);
                  setUsers(allUsers);
              }
          } catch (e) {
              console.error("Failed to load network", e);
          } finally {
              setIsLoading(false);
          }
      };
      loadData();
  }, []);

  const handleConnect = async (targetId: string) => {
      if (!currentUser) return;
      
      const currentConnections = currentUser.connections || [];

      // Optimistic Update
      const isConnected = currentConnections.includes(targetId);
      const updatedConnections = isConnected 
        ? currentConnections.filter(id => id !== targetId)
        : [...currentConnections, targetId];
      
      const updatedUser = { ...currentUser, connections: updatedConnections };
      setCurrentUser(updatedUser);
      localStorage.setItem('sangeet_user_session', JSON.stringify(updatedUser)); // Update local storage

      try {
          await api.user.toggleConnection(targetId, currentUser.id);
      } catch (e) {
          console.error("Connection failed", e);
          // Revert would go here
      }
  };

  // Filter Logic
  const filteredList = users.filter(user => {
      if (!currentUser || user.id === currentUser.id) return false; // Don't show self

      const searchTerm = search.toLowerCase();
      // Search Filter - Enhanced to map 'singing' to 'vocal'
      const matchesSearch = 
        user.name.toLowerCase().includes(searchTerm) || 
        user.instrument?.toLowerCase().includes(searchTerm) ||
        (searchTerm.includes('sing') && user.instrument?.toLowerCase().includes('vocal'));
      
      // Instrument Filter
      const matchesInstrument = filterInstrument === 'All' || user.instrument === filterInstrument;

      if (!matchesSearch || !matchesInstrument) return false;

      const userConnections = currentUser.connections || [];

      // Tab Logic
      if (activeTab === 'network') {
          return userConnections.includes(user.id);
      } else if (activeTab === 'discover') {
          return !userConnections.includes(user.id); // Show people NOT connected
      } else if (activeTab === 'role') {
          // If Student -> Show Gurus
          // If Guru -> Show Students
          const targetRole = userRole === 'student' ? 'guru' : 'student';
          return user.role === targetRole;
      }
      return true;
  });

  if (isLoading) return <div className="p-10 text-center text-stone-400 font-bold">Loading Community...</div>;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header & Tabs */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-stone-200 p-6 md:p-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif font-black text-stone-900 tracking-tight">
              Network & Community
            </h2>
          </div>
          
          <div className="flex flex-col md:flex-row bg-stone-100 p-1.5 rounded-2xl border border-stone-200 w-full xl:w-auto gap-2 md:gap-0 overflow-hidden">
             <button 
                onClick={() => setActiveTab('network')}
                className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center whitespace-nowrap ${activeTab === 'network' ? 'bg-white text-purple-600 shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
             >
                My Network
             </button>
             <button 
                onClick={() => setActiveTab('discover')}
                className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center whitespace-nowrap ${activeTab === 'discover' ? 'bg-white text-purple-600 shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
             >
                Discover
             </button>
             <button 
                onClick={() => setActiveTab('role')}
                className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center whitespace-nowrap ${activeTab === 'role' ? 'bg-white text-purple-600 shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
             >
                {userRole === 'student' ? 'Find Gurus' : 'My Students'}
             </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-grow min-w-0">
            <input 
              type="text" 
              placeholder="Search by name, instrument, or singing style..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl py-4 px-12 font-medium focus:ring-4 focus:ring-purple-100 focus:border-purple-400 transition-all outline-none text-sm"
            />
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-stone-300"></i>
          </div>
          <div className="shrink-0">
             <select 
                value={filterInstrument}
                onChange={(e) => setFilterInstrument(e.target.value)}
                className="bg-stone-50 border-2 border-stone-100 rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-purple-100 outline-none w-full md:w-auto"
            >
                <option value="All">All Disciplines</option>
                <option value="Vocal">Vocal / Singing</option>
                <option value="Sitar">Sitar</option>
                <option value="Tabla">Tabla</option>
                <option value="Violin">Violin</option>
                <option value="Bansuri">Bansuri</option>
                <option value="Sarod">Sarod</option>
            </select>
          </div>
        </div>

        {/* User Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredList.length === 0 ? (
              <div className="col-span-full py-10 text-center text-stone-400 italic">
                  {activeTab === 'network' ? "You haven't connected with anyone yet. Try the Discover tab!" : "No musicians found matching your criteria."}
              </div>
          ) : (
            filteredList.map(item => {
                const userConnections = currentUser?.connections || [];
                const isConnected = userConnections.includes(item.id);
                return (
                    <div key={item.id} className="p-6 border-2 border-stone-50 rounded-[2rem] hover:border-purple-200 hover:bg-purple-50/20 transition-all duration-300 group shadow-sm hover:shadow-xl bg-white">
                    <div className="flex items-center gap-5 mb-5">
                        <div className="relative shrink-0">
                        <img src={item.avatar} className="w-16 h-16 md:w-20 md:h-20 rounded-3xl border-4 border-white shadow-xl object-cover" alt={item.name} />
                        {item.role === 'guru' && <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-4 border-white flex items-center justify-center text-white text-[10px]"><i className="fas fa-check"></i></div>}
                        </div>
                        <div className="overflow-hidden">
                        <h4 className="font-serif font-black text-lg md:text-xl text-stone-900 group-hover:text-purple-600 transition-colors truncate">{item.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-purple-600 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-purple-50 rounded-lg">{item.instrument}</span>
                            <span className="text-stone-300 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-stone-50 rounded-lg">{item.role}</span>
                        </div>
                        </div>
                    </div>
                    <p className="text-stone-500 text-xs font-medium leading-relaxed line-clamp-2 mb-6 h-10">{item.bio || 'No bio available.'}</p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => onViewProfile && onViewProfile(item.id)}
                            className="flex-grow bg-white border-2 border-stone-100 text-stone-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:border-stone-300 transition-all"
                        >
                            View Profile
                        </button>
                        <button 
                            onClick={() => handleConnect(item.id)}
                            className={`flex-grow py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isConnected ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600' : 'bg-stone-900 text-white hover:bg-purple-600'}`}
                        >
                            {isConnected ? (
                                <span className="group-hover:hidden"><i className="fas fa-check mr-1"></i> Connected</span>
                            ) : (
                                <span><i className="fas fa-user-plus mr-1"></i> Connect</span>
                            )}
                            {isConnected && <span className="hidden group-hover:inline"><i className="fas fa-times mr-1"></i> Disconnect</span>}
                        </button>
                    </div>
                    </div>
                );
            })
          )}
        </div>
      </div>
      
      {/* Banner */}
      <div className={`rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl overflow-hidden relative ${userRole === 'guru' ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950' : 'bg-gradient-to-br from-purple-900 via-pink-800 to-purple-900'}`}>
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <div className="bg-white/10 w-20 h-20 md:w-24 md:h-24 rounded-[2rem] flex items-center justify-center text-3xl md:text-4xl backdrop-blur-md border border-white/20 shrink-0">
               <i className={`fas ${userRole === 'guru' ? 'fa-globe-asia' : 'fa-users'}`}></i>
            </div>
            <div className="flex-grow">
              <span className="bg-pink-500 text-[9px] font-black uppercase px-4 py-1.5 rounded-full mb-4 inline-block tracking-[0.2em] shadow-lg">Community</span>
              <h3 className="text-2xl md:text-3xl font-serif font-black mb-3">
                Grow Your Musical Circle
              </h3>
              <p className="text-purple-200 text-sm max-w-lg font-medium leading-relaxed mx-auto md:mx-0">
                 Networking is key in Indian Classical Music. Find accompanists for your next concert or peers to practice with.
              </p>
            </div>
            <button className="bg-white text-stone-900 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-purple-50 transition-all shadow-xl active:scale-95 whitespace-nowrap">
               Explore
            </button>
         </div>
      </div>
    </div>
  );
};

export default Network;