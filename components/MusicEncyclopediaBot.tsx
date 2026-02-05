import React, { useState, useRef, useEffect } from 'react';
import { askMusicEncyclopedia } from '../services/geminiService';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const MusicEncyclopediaBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Namaste! This is your Music Encyclopedia. Ask me anything about Indian Classical Music.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
        // Prepare history for API
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const responseText = await askMusicEncyclopedia(userMsg, history);
        
        if (responseText) {
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        }
    } catch (e) {
        console.error("Bot Error", e);
        setMessages(prev => [...prev, { role: 'model', text: "Apologies, I encountered a temporary swara bhang (error). Please try again." }]);
    } finally {
        setIsLoading(false);
    }
  };

  // Helper to clean and format Markdown-style bolding from Gemini
  const renderFormattedText = (text: string) => {
    // 1. Convert bullet points '* ' to '• '
    let cleaned = text.replace(/^\* /gm, '• ');
    
    // 2. Split by **bold** markers
    const parts = cleaned.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-bold text-stone-900">{part.slice(2, -2)}</strong>;
        }
        // Handle single asterisks if any remain (remove them)
        return <span key={index}>{part.replace(/\*/g, '')}</span>;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <i className="fas fa-book-open"></i>
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Music Encyclopedia</h3>
                        <p className="text-[10px] text-purple-200 uppercase tracking-wider">AI Scholar</p>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
                    <i className="fas fa-times"></i>
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-stone-50 custom-scrollbar">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-sm' : 'bg-white border border-stone-200 text-stone-800 rounded-tl-sm shadow-sm'}`}>
                            {msg.role === 'user' ? msg.text : renderFormattedText(msg.text)}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm p-3 shadow-sm flex gap-1">
                             <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"></span>
                             <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                             <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-stone-100 flex gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about Raag, Taal, etc..."
                    className="flex-grow bg-stone-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="w-9 h-9 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                    <i className="fas fa-paper-plane text-xs"></i>
                </button>
            </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 border-4 border-white ${isOpen ? 'bg-stone-800 text-white rotate-180' : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'}`}
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-book'} text-2xl`}></i>
      </button>
    </div>
  );
};

export default MusicEncyclopediaBot;