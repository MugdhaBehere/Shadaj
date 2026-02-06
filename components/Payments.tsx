import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { parsePaymentIntent, generateInvoiceNote } from '../services/geminiService';
import { api } from '../services/api';

interface PaymentsProps {
  userRole: UserRole;
  onUpdateUser?: (user: User) => void;
}

const Payments: React.FC<PaymentsProps> = ({ userRole, onUpdateUser }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Verification Simulation States
  const [verifyStep, setVerifyStep] = useState(0); // 0: Idle, 1: Security, 2: Intent, 3: Fraud Check
  
  // Standard Form State
  const [amount, setAmount] = useState(150);
  const [payType, setPayType] = useState<'hourly' | 'daily' | 'monthly'>('monthly');
  const [paymentNote, setPaymentNote] = useState('');

  // AI Assistant State
  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{amount: number, reason: string, recipientName?: string} | null>(null);

  // --- AI HANDLERS ---

  const handleAiParse = async () => {
    if (!aiInput.trim()) return;
    setIsAiThinking(true);
    try {
      const result = await parsePaymentIntent(aiInput);
      if (result.amount > 0) {
        setAmount(result.amount);
        setPaymentNote(result.reason || "AI Assisted Dakshina");
        setAiAnalysis(result);
        // Auto-generate a polite note immediately after parsing
        const politeNote = await generateInvoiceNote(result.amount, result.reason || payType, userRole);
        if (politeNote) setPaymentNote(politeNote);
      }
    } catch (e) {
      console.error("AI Parse failed", e);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setIsAiThinking(true);
    try {
      const note = await generateInvoiceNote(amount, payType, userRole);
      if (note) setPaymentNote(note);
    } catch (e) {
      console.error("Invoice gen failed", e);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleAction = async () => {
    // 1. Balance Check
    const storedUserStr = localStorage.getItem('sangeet_user_session');
    if (!storedUserStr) return;
    
    const currentUserCheck = JSON.parse(storedUserStr);
    
    if (userRole === 'student') {
        const currentBalance = currentUserCheck.points || 0;
        if (amount > currentBalance) {
            alert(`Insufficient Balance. You have ${currentBalance} points, but are trying to send ${amount}.`);
            return;
        }
    }

    // 2. Start Processing
    setIsProcessing(true);
    setVerifyStep(1);

    // Simulation Sequence
    setTimeout(() => setVerifyStep(2), 800);  // Context Check
    setTimeout(() => setVerifyStep(3), 1600); // Fraud Check
    
    setTimeout(async () => {
        // ACTUAL LOGIC
        try {
            if (userRole === 'student') {
                const user = JSON.parse(localStorage.getItem('sangeet_user_session') || '{}');
                // Update balance: T - N
                const newPoints = (user.points || 0) - amount;
                
                const updatedUser = await api.user.updateProfile(user.id, { points: newPoints });
                if (onUpdateUser) onUpdateUser(updatedUser);
            }
        } catch (e) { console.error(e); }

        setIsProcessing(false);
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            setVerifyStep(0);
            setAiInput('');
            setAiAnalysis(null);
            setPaymentNote('');
        }, 4000);
    }, 2800);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Dynamic Header Dashboard */}
      <div className={`rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden ${userRole === 'guru' ? 'bg-gradient-to-br from-stone-900 via-indigo-950 to-stone-900' : 'bg-gradient-to-br from-stone-900 via-amber-700 to-stone-900'}`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h2 className="text-stone-400 text-xs font-black uppercase tracking-[0.3em] mb-3">
              {userRole === 'guru' ? 'Dakshina Received' : 'Points Balance'}
            </h2>
            <div className="flex flex-col">
              <p className="text-5xl font-black tracking-tighter flex items-center gap-3">
                <i className="fas fa-star text-amber-400 text-3xl"></i>
                {userRole === 'guru' ? '12,450' : (JSON.parse(localStorage.getItem('sangeet_user_session') || '{}').points || 0).toLocaleString()}
              </p>
              <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mt-3 flex items-center gap-2">
                <i className={`fas ${userRole === 'guru' ? 'fa-arrow-up text-green-500' : 'fa-history text-amber-500'}`}></i>
                {userRole === 'guru' ? 'Total Appreciation' : 'Earn more by practicing'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
             {userRole === 'guru' ? (
               <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                   <p className="text-[10px] font-black uppercase text-stone-400">Monthly Goal</p>
                   <div className="w-32 h-2 bg-stone-800 rounded-full mt-2 overflow-hidden">
                       <div className="h-full bg-green-500 w-[75%]"></div>
                   </div>
               </div>
             ) : (
               <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10">
                 <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Last Dakshina</p>
                 <p className="text-sm font-bold flex items-center gap-1"><i className="fas fa-star text-amber-500 text-xs"></i> 250 Pts</p>
               </div>
             )}
          </div>
        </div>
        
        {/* Abstract Background Element */}
        <div className={`absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-[100px] opacity-20 ${userRole === 'guru' ? 'bg-blue-600' : 'bg-amber-600'}`}></div>
      </div>

      {/* Main Content Area - Centered */}
      <div className="max-w-3xl mx-auto space-y-8">
          
          {/* AI PAYMENT ASSISTANT (STUDENT) */}
          {userRole === 'student' && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-[2rem] border border-amber-100 p-8 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><i className="fas fa-robot text-6xl text-amber-600"></i></div>
               <h3 className="font-serif font-black text-xl text-amber-900 mb-4 flex items-center gap-2">
                   <i className="fas fa-magic"></i> AI Dakshina Assistant
               </h3>
               <p className="text-xs text-amber-800 font-bold uppercase tracking-widest mb-4">
                  Type naturally (e.g., "Send 2000 to Guruji")
               </p>
               
               <div className="relative">
                   <input 
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiParse()}
                      placeholder="e.g. 'Offer 500 to Guruji for Riyaaz'"
                      className="w-full bg-white border-none rounded-2xl py-4 pl-6 pr-14 text-stone-900 font-medium shadow-md focus:ring-4 focus:ring-amber-200 outline-none"
                   />
                   <button 
                      onClick={handleAiParse}
                      disabled={isAiThinking}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-amber-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-amber-700 transition-all"
                   >
                       {isAiThinking ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-arrow-right"></i>}
                   </button>
               </div>

               {aiAnalysis && (
                   <div className="mt-4 bg-white/60 rounded-xl p-3 flex gap-3 items-center animate-in fade-in slide-in-from-top-2">
                       <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                           <i className="fas fa-check"></i>
                       </div>
                       <div className="text-xs text-stone-600">
                           <p><strong>Intent Detected:</strong> Offering <strong>{aiAnalysis.amount} Pts</strong></p>
                           <p><strong>Note:</strong> {aiAnalysis.reason}</p>
                       </div>
                   </div>
               )}
            </div>
          )}

          <div className="bg-white rounded-[2rem] border border-stone-100 p-8 shadow-sm">
            <h3 className="font-serif font-black text-2xl mb-8 flex items-center gap-4 text-stone-900">
              <span className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${userRole === 'guru' ? 'bg-blue-600' : 'bg-amber-500'}`}>
                <i className={`fas ${userRole === 'guru' ? 'fa-scroll' : 'fa-hand-holding-heart'}`}></i>
              </span>
              {userRole === 'guru' ? 'Request Dakshina' : 'Offer Dakshina'}
            </h3>
            
            <div className="space-y-6">
              {userRole === 'student' && !aiAnalysis && (
                <div>
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-3 pl-1">Select Your Guru</label>
                  <select className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all outline-none appearance-none">
                    <option> Teacher A (Sitar)</option>
                    <option> Teacher B (Vocal)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-3 pl-1">
                  Context
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['hourly', 'daily', 'monthly'] as const).map(type => (
                    <button 
                      key={type}
                      onClick={() => {
                        setPayType(type);
                        // Reset manual override if type changes, unless AI set it
                        if (!aiAnalysis) {
                            if (userRole === 'student') {
                                setAmount(type === 'hourly' ? 50 : type === 'daily' ? 250 : 1000);
                            }
                        }
                      }}
                      className={`py-4 rounded-2xl text-[10px] font-black transition-all border-2 flex flex-col items-center gap-1 ${payType === type ? 'bg-stone-900 border-stone-900 text-white shadow-xl scale-105' : 'bg-white border-stone-100 text-stone-400 hover:border-stone-200'}`}
                    >
                      <span>{type === 'hourly' ? 'CLASS' : type === 'daily' ? 'WORKSHOP' : 'MONTHLY'}</span>
                      <span className="opacity-60 font-bold">{type === 'hourly' ? 'Single' : type === 'daily' ? 'Intensive' : 'Sadhana'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                   <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-3 pl-1">Points</label>
                   <div className="relative">
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl px-6 py-4 text-xl font-black focus:ring-4 focus:ring-amber-100 focus:border-amber-500 transition-all outline-none"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-stone-400 font-bold flex items-center gap-1">
                          <i className="fas fa-star text-amber-500"></i> PTS
                      </span>
                   </div>
              </div>

              <div>
                  <div className="flex justify-between items-end mb-3 pl-1">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
                          {userRole === 'guru' ? 'Dakshina Patra (AI Generated)' : 'Dedication Note (AI Generated)'}
                      </label>
                      <button 
                        onClick={handleGenerateInvoice}
                        disabled={isAiThinking}
                        className="text-[10px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                      >
                            {isAiThinking ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-magic"></i> Regenerate Note</>}
                      </button>
                  </div>
                  <textarea 
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder={userRole === 'guru' ? "AI will generate a polite request..." : "AI will generate a respectful offering note..."}
                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-purple-100 outline-none resize-none h-24 italic"
                  />
              </div>

              <button 
                onClick={handleAction}
                disabled={isProcessing}
                className={`w-full py-5 rounded-2xl font-black text-lg shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3 ${isProcessing ? 'bg-stone-200 text-stone-400 cursor-not-allowed' : (userRole === 'guru' ? 'bg-stone-900 hover:bg-black text-white' : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200')}`}
              >
                {isProcessing ? (
                  <><i className="fas fa-shield-alt fa-spin"></i> SECURE VERIFY...</>
                ) : (
                  userRole === 'guru' ? <><i className="fas fa-paper-plane"></i> SEND DAKSHINA PATRA</> : <><i className="fas fa-gift"></i> OFFER POINTS</>
                )}
              </button>
            </div>
          </div>

      </div>

      {/* Processing / Success Modal - ENHANCED AI SECURITY CHECK */}
      {(isProcessing || showSuccess) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-500">
          <div className={`bg-white rounded-[3rem] p-10 flex flex-col items-center text-center shadow-[0_50px_100px_rgba(0,0,0,0.5)] border-b-8 w-full max-w-md transition-all ${showSuccess ? 'border-green-500 scale-100' : 'border-amber-500 scale-95'}`}>
            
            {isProcessing ? (
                <>
                    <div className="w-24 h-24 relative mb-8">
                        <div className="absolute inset-0 border-4 border-stone-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-amber-500 rounded-full border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <i className="fas fa-shield-alt text-3xl text-amber-500 animate-pulse"></i>
                        </div>
                    </div>
                    <h3 className="text-2xl font-serif font-black mb-2 text-stone-900">AI Fraud Check</h3>
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-6">Analyzing Transaction Pattern...</p>
                    
                    <div className="space-y-3 w-full bg-stone-50 p-4 rounded-xl border border-stone-100">
                        <div className="flex justify-between text-xs font-bold items-center">
                            <span className="text-stone-500">Device Security</span>
                            {verifyStep >= 1 ? <span className="text-green-500 flex items-center gap-1"><i className="fas fa-check-circle"></i> Verified</span> : <span className="text-stone-300"><i className="fas fa-circle-notch fa-spin"></i> Checking</span>}
                        </div>
                        <div className="flex justify-between text-xs font-bold items-center">
                            <span className="text-stone-500">Context & Intent</span>
                            {verifyStep >= 2 ? <span className="text-green-500 flex items-center gap-1"><i className="fas fa-check-circle"></i> Valid</span> : <span className="text-stone-300">{verifyStep >= 2 ? <i className="fas fa-circle-notch fa-spin"></i> : 'Pending'}</span>}
                        </div>
                         <div className="flex justify-between text-xs font-bold items-center">
                            <span className="text-stone-500">Anomaly Detection</span>
                            {verifyStep >= 3 ? <span className="text-green-500 flex items-center gap-1"><i className="fas fa-check-circle"></i> Passed</span> : <span className="text-stone-300">{verifyStep >= 2 ? <i className="fas fa-circle-notch fa-spin"></i> : 'Pending'}</span>}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center text-4xl mb-8 shadow-2xl shadow-green-200 animate-bounce">
                        <i className="fas fa-check"></i>
                    </div>
                    <h3 className="text-3xl font-serif font-black mb-4 text-stone-900">
                        {userRole === 'guru' ? 'Sent!' : 'Offered!'}
                    </h3>
                    <p className="text-stone-500 mb-8 leading-relaxed font-medium">
                        {userRole === 'guru' 
                            ? 'The Dakshina Patra has been sent.' 
                            : `${amount} Points have been offered successfully.`}
                    </p>
                    <div className="w-full bg-stone-50 rounded-2xl p-4 border border-stone-200 mb-4 italic">
                        <p className="text-xs text-stone-500 font-medium">"{paymentNote}"</p>
                    </div>
                    <div className="text-[10px] font-black text-stone-300 uppercase tracking-[0.4em]">
                        TXN_{Math.floor(Math.random() * 900000 + 100000)}
                    </div>
                </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;