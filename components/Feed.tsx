import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { generateCreativePost, generateSmartAudio } from '../services/geminiService';

// We map the DB entity format to UI structure within the component
interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  timestamp: string;
}

interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: string;
  authorInstrument: string;
  content: string;
  image?: string;
  video?: string;
  audio?: string;
  isAI?: boolean;
  likedBy: string[]; // List of user IDs
  comments: Comment[];
  timestamp: number;
  tags: string[];
}

interface FeedProps {
    user: User | null;
    onUpdateUser?: (user: User) => void;
}

const Feed: React.FC<FeedProps> = ({ user, onUpdateUser }) => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Post Creation States
  const [newPostContent, setNewPostContent] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showPointsToast, setShowPointsToast] = useState(false);
  
  // File Refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // UI States for comments
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
      try {
          const data = await api.feed.getPosts();
          setPosts(data);
      } catch (e) {
          console.error("Failed to load feed", e);
      } finally {
          setLoading(false);
      }
  };

  // --- FILE HANDLING ---

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setMediaPreview(reader.result as string);
              setMediaType(type);
          };
          reader.readAsDataURL(file);
      }
  };

  const clearMedia = () => {
      setMediaPreview(null);
      setMediaType(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (audioInputRef.current) audioInputRef.current.value = '';
  };

  // --- AI GENERATION ---

  const handleGenerateAIText = async () => {
      if (!newPostContent.trim()) {
          alert("Please type a topic or keyword first (e.g. 'Morning Riyaaz')");
          return;
      }
      setIsGeneratingAI(true);
      try {
          const generatedText = await generateCreativePost(newPostContent);
          if (generatedText) {
              setNewPostContent(generatedText.trim());
          }
      } catch (e) {
          console.error("AI Text Gen failed", e);
          alert("AI Generation failed. Check API Key.");
      } finally {
          setIsGeneratingAI(false);
      }
  };

  const handleGenerateAIAudio = async () => {
       if (!newPostContent.trim()) {
          alert("Please type the topic you want the AI to speak/sing about");
          return;
      }
      setIsGeneratingAI(true);
      try {
          // Use smart audio to generate semantic content first
          const audioUrl = await generateSmartAudio(newPostContent);
          if (audioUrl) {
              setMediaPreview(audioUrl);
              setMediaType('audio');
          } else {
              alert("Audio generation failed.");
          }
      } catch(e) { console.error(e); }
      finally { setIsGeneratingAI(false); }
  };

  // --- CRUD OPERATIONS ---

  const handleCreatePost = async () => {
      if (!newPostContent.trim() && !mediaPreview || !user) return;
      
      try {
          const postData: any = {
              authorId: user.id,
              authorName: user.name,
              authorAvatar: user.avatar,
              authorRole: user.role,
              authorInstrument: user.instrument || '',
              content: newPostContent,
              isAI: isGeneratingAI, // Crude way to track if AI was used recently
              tags: [],
          };
          
          if (mediaType === 'image') postData.image = mediaPreview;
          if (mediaType === 'video') postData.video = mediaPreview;
          if (mediaType === 'audio') postData.audio = mediaPreview;

          await api.feed.createPost(postData);
          
          // GAMIFICATION: Award 50 points
          const currentPoints = user.points || 0;
          const updatedUser = await api.user.updateProfile(user.id, { points: currentPoints + 50 });
          if (onUpdateUser) onUpdateUser(updatedUser);
          
          setShowPointsToast(true);
          setTimeout(() => setShowPointsToast(false), 3000);

          setNewPostContent('');
          clearMedia();
          fetchPosts(); // Reload feed
      } catch (e) {
          console.error("Error creating post", e);
      }
  };

  const handleDeletePost = async (postId: string) => {
      if (!window.confirm("Are you sure you want to delete this post?")) return;
      try {
          await api.feed.deletePost(postId);
          setPosts(prev => prev.filter(p => p.id !== postId));
      } catch (e) {
          console.error("Error deleting post", e);
          alert("Failed to delete post");
      }
  };

  const handleLike = async (post: FeedPost) => {
      if (!user) return;

      // Optimistic Update
      const isLiked = post.likedBy.includes(user.id);
      const updatedPosts = posts.map(p => {
          if (p.id === post.id) {
              return {
                  ...p,
                  likedBy: isLiked 
                    ? p.likedBy.filter(id => id !== user.id)
                    : [...p.likedBy, user.id]
              };
          }
          return p;
      });
      setPosts(updatedPosts);

      try {
          await api.feed.toggleLike(post.id, user.id);
      } catch (e) {
          console.error("Like failed", e);
          fetchPosts(); // Revert on error
      }
  };

  const toggleComments = (postId: string) => {
      const newSet = new Set(expandedComments);
      if (newSet.has(postId)) {
          newSet.delete(postId);
      } else {
          newSet.add(postId);
      }
      setExpandedComments(newSet);
  };

  const handleCommentSubmit = async (postId: string) => {
      if (!user || !commentInputs[postId]?.trim()) return;

      setSubmittingComment(postId);
      try {
          const newComment = {
              id: Date.now().toString(),
              authorId: user.id,
              authorName: user.name,
              authorAvatar: user.avatar,
              text: commentInputs[postId],
              timestamp: new Date().toISOString()
          };
          
          await api.feed.addComment(postId, newComment);
          
          // Clear input
          setCommentInputs(prev => ({ ...prev, [postId]: '' }));
          // Ensure comments are visible
          const newSet = new Set(expandedComments);
          newSet.add(postId);
          setExpandedComments(newSet);
          
          fetchPosts();
      } catch (e) {
          console.error("Comment failed", e);
      } finally {
          setSubmittingComment(null);
      }
  };

  // Helper to format time (e.g. "2h ago")
  const formatTime = (timestamp: number) => {
      const diff = Date.now() - timestamp;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 1) return 'Just now';
      if (hours < 24) return `${hours}h ago`;
      return new Date(timestamp).toLocaleDateString();
  };

  if (loading) return <div className="p-8 text-center text-stone-400">Loading your feed...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      {/* POINTS TOAST */}
      {showPointsToast && (
          <div className="fixed top-24 right-4 bg-amber-400 text-stone-900 px-6 py-3 rounded-full font-black shadow-xl animate-in fade-in slide-in-from-top-4 z-[60] flex items-center gap-3">
              <div className="bg-white rounded-full p-1"><i className="fas fa-star text-amber-500"></i></div>
              <span>+50 Points Earned!</span>
          </div>
      )}

      {/* --- CREATE POST SECTION --- */}
      <div className="bg-white rounded-[2rem] shadow-sm p-6 border border-stone-200">
        <div className="flex gap-4">
          <img src={user?.avatar || 'https://via.placeholder.com/40'} className="w-12 h-12 rounded-[1rem] border border-stone-100" alt="Avatar" />
          <div className="flex-grow">
              <textarea 
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder={`Share your practice, ${user?.name.split(' ')[0]}...`} 
                className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-purple-400 min-h-[100px] resize-none placeholder-stone-400 transition-all"
              ></textarea>
              
              {/* Media Preview */}
              {mediaPreview && (
                  <div className="mt-4 relative inline-block">
                      {mediaType === 'image' && <img src={mediaPreview} className="h-32 rounded-xl object-cover border border-stone-200" alt="Preview" />}
                      {mediaType === 'video' && <video src={mediaPreview} className="h-32 rounded-xl border border-stone-200 bg-black" controls />}
                      {mediaType === 'audio' && <audio src={mediaPreview} className="w-64" controls />}
                      <button 
                        onClick={clearMedia}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md"
                      >
                          <i className="fas fa-times"></i>
                      </button>
                  </div>
              )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-3 border-t border-stone-50 gap-4">
          <div className="flex gap-3 flex-wrap">
            {/* Hidden Inputs */}
            <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')} />
            <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(e) => handleFileSelect(e, 'video')} />
            <input type="file" ref={audioInputRef} accept="audio/*" className="hidden" onChange={(e) => handleFileSelect(e, 'audio')} />

            <button onClick={() => imageInputRef.current?.click()} className="text-stone-400 hover:text-purple-600 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors">
              <i className="fas fa-image text-lg"></i> <span className="hidden sm:inline">Photo</span>
            </button>
            <button onClick={() => videoInputRef.current?.click()} className="text-stone-400 hover:text-purple-600 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors">
              <i className="fas fa-video text-lg"></i> <span className="hidden sm:inline">Video</span>
            </button>
            <button onClick={() => audioInputRef.current?.click()} className="text-stone-400 hover:text-purple-600 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors">
              <i className="fas fa-microphone text-lg"></i> <span className="hidden sm:inline">Audio</span>
            </button>
            
            <div className="h-6 w-px bg-stone-200 mx-2 hidden sm:block"></div>
            
            <button 
                onClick={handleGenerateAIText}
                disabled={isGeneratingAI}
                title="Generate Post Text"
                className="text-purple-500 hover:text-purple-700 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all"
            >
              {isGeneratingAI ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-pen-nib"></i>} 
            </button>
            <button 
                onClick={handleGenerateAIAudio}
                disabled={isGeneratingAI}
                title="Generate Smart Audio"
                className="text-orange-500 hover:text-orange-700 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all"
            >
              {isGeneratingAI ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-music"></i>} 
            </button>
          </div>
          <button 
            onClick={handleCreatePost}
            disabled={(!newPostContent.trim() && !mediaPreview) || isGeneratingAI}
            className="bg-purple-600 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md shadow-purple-200 hover:bg-purple-700 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider w-full sm:w-auto"
          >
            Post
          </button>
        </div>
      </div>

      {/* --- POSTS LIST --- */}
      {posts.map(post => {
        const isLiked = user && post.likedBy.includes(user.id);
        const commentsVisible = expandedComments.has(post.id);
        const isMyPost = user && post.authorId === user.id;

        return (
            <div key={post.id} className="bg-white rounded-[2.5rem] shadow-sm border border-stone-200 overflow-hidden relative">
            <div className="p-6 flex justify-between items-start">
                <div className="flex gap-4">
                <div className="relative">
                    <img src={post.authorAvatar} className="w-14 h-14 rounded-[1.2rem] border-2 border-white shadow-md object-cover" alt="Avatar" />
                    {post.authorRole === 'guru' && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[8px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white"><i className="fas fa-check"></i></div>}
                </div>
                <div>
                    <h4 className="font-serif font-black text-lg text-stone-900 leading-tight">
                        {post.authorName} 
                    </h4>
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mt-1">
                        {post.authorInstrument} • {formatTime(post.timestamp)}
                    </p>
                </div>
                </div>
                {isMyPost && (
                    <button 
                        onClick={() => handleDeletePost(post.id)}
                        className="text-stone-300 hover:text-red-500 transition-colors p-2"
                        title="Delete Post"
                    >
                        <i className="fas fa-trash-alt text-lg"></i>
                    </button>
                )}
            </div>

            <div className="px-6 pb-4">
                {post.isAI && (
                    <div className="inline-block mb-2 bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1 rounded-full border border-white shadow-sm">
                        <span className="text-[9px] font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                            <i className="fas fa-sparkles mr-1"></i> AI Generated
                        </span>
                    </div>
                )}
                <p className="text-stone-800 text-sm whitespace-pre-wrap leading-relaxed font-medium">{post.content}</p>
                {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                    {post.tags.map(tag => (
                        <span key={tag} className="text-pink-600 text-[10px] font-black uppercase tracking-widest bg-pink-50 px-2 py-1 rounded-lg hover:bg-pink-100 cursor-pointer transition-colors">{tag}</span>
                    ))}
                    </div>
                )}
            </div>

            {/* --- MEDIA RENDERING --- */}
            
            {post.image && (
                <div className="w-full bg-stone-100 border-y border-stone-100">
                   <img src={post.image} className="w-full h-auto object-cover max-h-[500px]" alt="Post" />
                </div>
            )}
            
            {post.video && (
                <div className="w-full bg-black">
                   <video src={post.video} controls className="w-full h-auto max-h-[500px]" />
                </div>
            )}

            {post.audio && (
                <div className="px-6 pb-4">
                   <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center gap-4">
                       <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                           <i className="fas fa-music text-xl"></i>
                       </div>
                       <audio src={post.audio} controls className="w-full" />
                   </div>
                </div>
            )}

            <div className="p-4 border-t border-stone-50 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => handleLike(post)}
                        className={`flex items-center gap-2 transition-all ${isLiked ? 'text-pink-600' : 'text-stone-400 hover:text-pink-500'}`}
                    >
                        <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-xl ${isLiked ? 'animate-bounce' : ''}`}></i>
                        <span className="text-xs font-black uppercase tracking-widest">{post.likedBy.length || 0}</span>
                    </button>
                    <button 
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-2 text-stone-400 hover:text-purple-600 transition-all"
                    >
                        <i className="far fa-comment text-xl"></i>
                        <span className="text-xs font-black uppercase tracking-widest">{post.comments.length || 0}</span>
                    </button>
                    <button className="flex items-center gap-2 text-stone-400 hover:text-blue-600 transition-all">
                        <i className="far fa-paper-plane text-xl"></i>
                    </button>
                </div>
            </div>

            {/* Comments Section */}
            {commentsVisible && (
                <div className="bg-stone-50/50 p-6 border-t border-stone-100 animate-in slide-in-from-top-2">
                    {/* Input */}
                    <div className="flex gap-3 mb-6">
                        <img src={user?.avatar} className="w-8 h-8 rounded-lg" alt="Me" />
                        <div className="flex-grow relative">
                            <input 
                                type="text"
                                value={commentInputs[post.id] || ''}
                                onChange={(e) => setCommentInputs(prev => ({...prev, [post.id]: e.target.value}))}
                                onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                                placeholder="Add a comment..."
                                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none pr-10"
                            />
                            <button 
                                onClick={() => handleCommentSubmit(post.id)}
                                disabled={submittingComment === post.id}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-800 disabled:opacity-50"
                            >
                                <i className="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-4">
                        {post.comments.map((comment, idx) => (
                            <div key={idx} className="flex gap-3">
                                <img src={comment.authorAvatar} className="w-8 h-8 rounded-lg object-cover" alt="Author" />
                                <div className="bg-white p-3 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border border-stone-100 shadow-sm flex-grow">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h5 className="font-bold text-xs text-stone-900">{comment.authorName}</h5>
                                        <span className="text-[9px] text-stone-400 font-bold uppercase">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <p className="text-xs text-stone-600 font-medium leading-relaxed">{comment.text}</p>
                                </div>
                            </div>
                        ))}
                        {post.comments.length === 0 && (
                            <p className="text-center text-xs text-stone-400 italic py-2">No comments yet. Be the first!</p>
                        )}
                    </div>
                </div>
            )}
            </div>
        );
      })}
    </div>
  );
};

export default Feed;