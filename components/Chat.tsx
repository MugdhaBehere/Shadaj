import React, { useState, useRef, useEffect } from 'react';
import { Message, User } from '../types';
import { generateMusicEmoticon, generateSmartAudio } from '../services/geminiService';

const MOCK_FRIENDS: User[] = [
  { id: 'teacherA', name: 'Teacher A', avatar: 'https://ui-avatars.com/api/?name=Teacher+A&background=0d9488&color=fff', role: 'guru', instrument: 'Sitar', connections: [], points: 12000 },
  { id: 'studentB', name: 'Student B', avatar: 'https://ui-avatars.com/api/?name=Student+B&background=random', role: 'student', instrument: 'Sitar', connections: [], points: 350 },
  { id: 'studentC', name: 'Student C', avatar: 'https://ui-avatars.com/api/?name=Student+C&background=random', role: 'student', instrument: 'Vocal', connections: [], points: 150 },
];

interface ChatProps {
    onVideoCall?: () => void;
}

const Chat: React.FC<ChatProps> = ({ onVideoCall }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(MOCK_FRIENDS[0]);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', senderId: 'teacherA', text: 'Beta, did you practice the new composition in Yaman?', timestamp: '10:30 AM' },
    { id: '2', senderId: 'me', text: 'Yes Guruji, working on the fast taans now.', timestamp: '10:31 AM' },
    { id: '3', senderId: 'teacherA', text: 'Excellent. Keep the laya steady. We can review in class.', timestamp: '10:31 AM' },
  ]);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (customMessage?: Partial<Message>) => {
    if (!input.trim() && !customMessage) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...customMessage
    };
    setMessages([...messages, newMessage]);
    setInput('');
  };

  const handleAiAction = async (type: 'audio' | 'emoticon') => {
      if (!input.trim()) {
          alert(`Please type a prompt first! e.g. "Riyaaz at sunrise"`);
          return;
      }
      setIsProcessingAI(true);
      setIsAiMenuOpen(false);

      try {
          if (type === 'audio') {
              const audioData = await generateSmartAudio(input);
              if (audioData) sendMessage({ audio: audioData, text: `AI Audio: "${input}"`, isAI: true });
          } else if (type === 'emoticon') {
              const emoji = await generateMusicEmoticon(input);
              if (emoji) sendMessage({ text: emoji, isAI: true });
          }
      } catch(e) {
          console.error(e);
      } finally {
          setIsProcessingAI(false);
      }
  };

  const sendQuickPranaam = async () => {
      setIsProcessingAI(true);
      const emoji = await generateMusicEmoticon("Offering Pranaam to Guru");
      if (emoji) sendMessage({ text: emoji, isAI: true });
      setIsProcessingAI(false);
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-stone-200 h-[650px] flex overflow-hidden">
      {/* Contact List */}
      <div className="w-20 md:w-1/3 border-r border-stone-100 flex flex-col bg-stone-50/50">
        <div className="p-4 border-b border-stone-50 hidden md:block">
          <h3 className="font-serif font-black text-xl text-stone-900">Messages</h3>
        </div>
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {MOCK_FRIENDS.map(friend => (
            <button 
              key={friend.id}
              onClick={() => setSelectedUser(friend)}
              className={`w-full p-3 md:p-4 flex items-center justify-center md:justify-start gap-3 transition-all ${selectedUser?.id === friend.id ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
            >
              <div className="relative">
                <img src={friend.avatar} className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-stone-200 object-cover" alt={friend.name} />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="text-left hidden md:block">
                <h4 className={`font-bold text-sm ${selectedUser?.id === friend.id ? 'text-purple-700' : 'text-stone-700'}`}>{friend.name}</h4>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wide truncate w-32">{friend.instrument}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-grow flex flex-col bg-stone-50/30 relative">
        {selectedUser ? (
          <>
            <div className="p-4 bg-white border-b border-stone-100 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <img src={selectedUser.avatar} className="w-10 h-10 rounded-full object-cover" alt={selectedUser.name} />
                <div>
                  <h4 className="font-bold text-sm text-stone-900">{selectedUser.name}</h4>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
                  </p>
                </div>
              </div>
              <div className="flex gap-2 text-stone-400">
                <button 
                    onClick={sendQuickPranaam}
                    title="Send Pranaam"
                    className="w-8 h-8 rounded-full hover:bg-orange-50 hover:text-orange-500 transition-colors flex items-center justify-center"
                >
                    <i className="fas fa-hands-praying"></i>
                </button>
                <button 
                    onClick={onVideoCall}
                    title="Start Video Call"
                    className="w-8 h-8 rounded-full hover:bg-purple-50 hover:text-purple-600 transition-colors flex items-center justify-center"
                >
                    <i className="fas fa-video"></i>
                </button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar bg-[#FDFBF9]">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[70%] space-y-1`}>
                    <div className={`p-4 shadow-sm text-sm leading-relaxed ${msg.senderId === 'me' ? 'bg-stone-900 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-stone-800 rounded-2xl rounded-tl-sm border border-stone-100'}`}>
                        {msg.audio && (
                            <div className="mb-2 bg-white/10 p-2 rounded-lg flex items-center gap-2">
                                <i className="fas fa-music text-pink-400"></i>
                                <audio src={msg.audio} controls className="h-6 w-48" />
                            </div>
                        )}
                        <p>{msg.text}</p>
                        {msg.isAI && (
                            <div className="mt-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest opacity-70">
                                <i className="fas fa-sparkles"></i> AI Generated
                            </div>
                        )}
                    </div>
                    <p className={`text-[10px] font-bold ${msg.senderId === 'me' ? 'text-right text-stone-400' : 'text-stone-400'}`}>{msg.timestamp}</p>
                  </div>
                </div>
              ))}
              {isProcessingAI && (
                  <div className="flex justify-end">
                      <div className="bg-stone-100 text-stone-500 text-xs px-4 py-2 rounded-2xl rounded-tr-sm flex items-center gap-2">
                          <i className="fas fa-circle-notch fa-spin text-purple-500"></i> AI is composing...
                      </div>
                  </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-stone-100 relative">
              {isAiMenuOpen && (
                  <div className="absolute bottom-20 left-4 bg-white rounded-2xl shadow-xl border border-stone-100 p-2 animate-in slide-in-from-bottom-2 z-20 flex flex-col gap-1 min-w-[180px]">
                      <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-stone-400 border-b border-stone-50 mb-1">AI Tools</div>
                      <button onClick={() => handleAiAction('audio')} className="flex items-center gap-3 px-3 py-2 hover:bg-pink-50 rounded-xl text-xs font-bold text-stone-700 transition-colors text-left">
                          <i className="fas fa-microphone text-pink-500"></i> Gen Speech/Audio
                      </button>
                      <button onClick={() => handleAiAction('emoticon')} className="flex items-center gap-3 px-3 py-2 hover:bg-orange-50 rounded-xl text-xs font-bold text-stone-700 transition-colors text-left">
                          <i className="fas fa-smile text-orange-500"></i> Gen Music Emoji
                      </button>
                  </div>
              )}

              <div className="flex gap-2 items-end">
                <button 
                    onClick={() => setIsAiMenuOpen(!isAiMenuOpen)}
                    className={`p-3 rounded-full transition-all ${isAiMenuOpen ? 'bg-purple-100 text-purple-600 rotate-45' : 'text-stone-400 hover:text-purple-600 hover:bg-stone-50'}`}
                >
                  <i className="fas fa-magic"></i>
                </button>
                <div className="flex-grow relative">
                    <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type message or AI prompt..." 
                    className="w-full bg-stone-50 border-none rounded-2xl pl-5 pr-4 py-3 text-sm focus:ring-2 focus:ring-purple-400 font-medium transition-all"
                    />
                </div>
                <button 
                  onClick={() => sendMessage()}
                  disabled={!input.trim()}
                  className="bg-stone-900 text-white w-11 h-11 rounded-full flex items-center justify-center shadow-lg hover:bg-black transition disabled:opacity-50 active:scale-95"
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-stone-300 space-y-4">
            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-3xl">
                <i className="far fa-comments"></i>
            </div>
            <p className="font-bold text-sm uppercase tracking-widest">Select a musician to chat</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;