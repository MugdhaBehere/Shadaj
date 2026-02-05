import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface ProfileProps {
  currentUser: User;
  viewUserId?: string; // If present, viewing another user
  onUpdateUser: (updatedUser: User) => void;
  onBack?: () => void;
}

const EXAMS = [
    'Prarambhik', 
    'Praveshika Pratham', 
    'Praveshika Purna', 
    'Madhyama Pratham', 
    'Madhyama Purna', 
    'Visharad Pratham', 
    'Visharad Purna', 
    'Alankar', 
    'Sangit Acharya'
];

const INTERESTS_LIST = [
    'Vocal', 'Instrumental', 'Light Music', 'Ghazal', 'Thumri', 'Tabla', 'Sitar', 'Flute', 'Raag Theory', 'Taal Shastra', 'Fusion', 'Devotional'
];

const Profile: React.FC<ProfileProps> = ({ currentUser, viewUserId, onUpdateUser, onBack }) => {
  const isOwnProfile = !viewUserId || viewUserId === currentUser.id;
  
  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit States
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
        setLoading(true);
        try {
            if (isOwnProfile) {
                setProfileUser(currentUser);
                setEditForm(currentUser);
                setAvatarPreview(currentUser.avatar);
            } else if (viewUserId) {
                const allUsers = await api.user.getAll();
                const found = allUsers.find((u: User) => u.id === viewUserId);
                setProfileUser(found || null);
            }
        } catch (e) {
            console.error("Failed to load profile", e);
        } finally {
            setLoading(false);
        }
    };
    fetchProfile();
  }, [viewUserId, currentUser, isOwnProfile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setAvatarPreview(reader.result as string);
              setEditForm(prev => ({ ...prev, avatar: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleInterestToggle = (interest: string) => {
      const currentInterests = editForm.interests || [];
      if (currentInterests.includes(interest)) {
          setEditForm(prev => ({ ...prev, interests: currentInterests.filter(i => i !== interest) }));
      } else {
          setEditForm(prev => ({ ...prev, interests: [...currentInterests, interest] }));
      }
  };

  const handleSave = async () => {
      if (!profileUser) return;
      try {
          // Add default fields if missing
          const updates = {
              ...editForm,
              connections: profileUser.connections // Ensure we don't overwrite connections
          };
          
          const updated = await api.user.updateProfile(profileUser.id, updates);
          setProfileUser(updated);
          onUpdateUser(updated); // Update App state
          setIsEditing(false);
          alert("Profile Updated Successfully!");
      } catch (e) {
          console.error("Failed to update profile", e);
          alert("Failed to update profile.");
      }
  };

  if (loading) return <div className="p-10 text-center text-stone-400">Loading Profile...</div>;
  if (!profileUser) return <div className="p-10 text-center text-red-400">User not found.</div>;

  return (
    <div className="animate-in fade-in duration-500 pb-20 max-w-4xl mx-auto">
        {onBack && !isEditing && (
            <button onClick={onBack} className="mb-4 text-stone-400 hover:text-stone-800 flex items-center gap-2 font-bold uppercase text-xs tracking-widest">
                <i className="fas fa-arrow-left"></i> Back
            </button>
        )}

        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-stone-200 relative">
            {/* Header Banner */}
            <div className="h-48 bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 relative">
                {isOwnProfile && !isEditing && (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="absolute top-6 right-6 bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white hover:text-purple-600 transition-all border border-white/30"
                    >
                        <i className="fas fa-pen mr-2"></i> Edit Profile
                    </button>
                )}
                 {isEditing && (
                    <div className="absolute top-6 right-6 flex gap-3">
                         <button 
                            onClick={() => setIsEditing(false)}
                            className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white hover:text-red-600 transition-all border border-white/30"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave}
                            className="bg-white text-green-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-50 transition-all shadow-lg"
                        >
                            <i className="fas fa-save mr-2"></i> Save Changes
                        </button>
                    </div>
                )}
            </div>

            {/* Profile Info */}
            <div className="px-8 md:px-12 pb-12 relative">
                {/* Avatar */}
                <div className="relative -mt-20 mb-6 inline-block group">
                    <img 
                        src={isEditing ? avatarPreview : profileUser.avatar} 
                        className="w-40 h-40 rounded-[2.5rem] border-8 border-white shadow-2xl bg-white object-cover" 
                        alt="Profile" 
                    />
                    {isEditing && (
                        <label className="absolute inset-0 bg-black/40 rounded-[2.5rem] flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity border-8 border-transparent">
                            <i className="fas fa-camera text-2xl mb-1"></i>
                            <span className="text-[10px] font-bold uppercase tracking-widest">Change</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                        </label>
                    )}
                </div>

                {isEditing ? (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black uppercase text-stone-400 mb-2">Full Name</label>
                                <input 
                                    type="text" 
                                    value={editForm.name} 
                                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl px-4 py-3 font-bold text-stone-900 focus:outline-none focus:border-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-stone-400 mb-2">Email (ID)</label>
                                <input 
                                    type="text" 
                                    value={editForm.email} 
                                    disabled
                                    className="w-full bg-stone-100 border-2 border-stone-100 rounded-xl px-4 py-3 font-bold text-stone-500 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-stone-400 mb-2">Role</label>
                                <select 
                                    value={editForm.role}
                                    onChange={e => setEditForm({...editForm, role: e.target.value as UserRole})}
                                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl px-4 py-3 font-bold text-stone-900 focus:outline-none focus:border-purple-500"
                                >
                                    <option value="student">Student</option>
                                    <option value="guru">Guru</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-xs font-black uppercase text-stone-400 mb-2">Main Instrument</label>
                                <input 
                                    type="text" 
                                    value={editForm.instrument} 
                                    onChange={e => setEditForm({...editForm, instrument: e.target.value})}
                                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl px-4 py-3 font-bold text-stone-900 focus:outline-none focus:border-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-stone-400 mb-2">Date of Birth</label>
                                <input 
                                    type="date" 
                                    value={editForm.dob || ''} 
                                    onChange={e => setEditForm({...editForm, dob: e.target.value})}
                                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl px-4 py-3 font-bold text-stone-900 focus:outline-none focus:border-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-stone-400 mb-2">Examination Level</label>
                                <select 
                                    value={editForm.examinationLevel || ''}
                                    onChange={e => setEditForm({...editForm, examinationLevel: e.target.value})}
                                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl px-4 py-3 font-bold text-stone-900 focus:outline-none focus:border-purple-500"
                                >
                                    <option value="">Select Level</option>
                                    {EXAMS.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                                </select>
                            </div>
                         </div>
                         
                         <div>
                            <label className="block text-xs font-black uppercase text-stone-400 mb-2">Bio</label>
                            <textarea 
                                value={editForm.bio}
                                onChange={e => setEditForm({...editForm, bio: e.target.value})}
                                rows={4}
                                className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl px-4 py-3 font-medium text-stone-900 focus:outline-none focus:border-purple-500 resize-none"
                            ></textarea>
                         </div>

                         <div>
                             <label className="block text-xs font-black uppercase text-stone-400 mb-3">Musical Interests</label>
                             <div className="flex flex-wrap gap-2">
                                 {INTERESTS_LIST.map(interest => (
                                     <button
                                        key={interest}
                                        onClick={() => handleInterestToggle(interest)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${editForm.interests?.includes(interest) ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-stone-200 text-stone-500 hover:border-purple-300'}`}
                                     >
                                        {interest}
                                     </button>
                                 ))}
                             </div>
                         </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-serif font-black text-stone-900 mb-2">{profileUser.name}</h1>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white ${profileUser.role === 'guru' ? 'bg-blue-600' : 'bg-pink-500'}`}>
                                        {profileUser.role}
                                    </span>
                                    <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-stone-100 text-stone-500">
                                        {profileUser.instrument || 'N/A'}
                                    </span>
                                    {profileUser.examinationLevel && (
                                        <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-purple-100 text-purple-700">
                                            {profileUser.examinationLevel}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <div>
                                    <h3 className="font-bold text-lg text-stone-900 mb-3 flex items-center gap-2">
                                        <i className="fas fa-quote-left text-purple-300"></i> About
                                    </h3>
                                    <p className="text-stone-600 leading-relaxed font-medium">
                                        {profileUser.bio || "No bio available."}
                                    </p>
                                </div>

                                {profileUser.interests && profileUser.interests.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-lg text-stone-900 mb-3">Interests</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {profileUser.interests.map(int => (
                                                <span key={int} className="bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-lg text-xs font-bold text-stone-600">
                                                    {int}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-stone-50 rounded-3xl p-6 h-fit border border-stone-100 space-y-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest mb-1">Email</p>
                                    <p className="text-sm font-bold text-stone-800 break-all">{profileUser.email}</p>
                                </div>
                                {profileUser.dob && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest mb-1">Born</p>
                                        <p className="text-sm font-bold text-stone-800">{new Date(profileUser.dob).toLocaleDateString()}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest mb-1">Joined</p>
                                    <p className="text-sm font-bold text-stone-800">October 2023</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest mb-1">Network</p>
                                    <p className="text-sm font-bold text-stone-800">{profileUser.connections?.length || 0} Connections</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Profile;