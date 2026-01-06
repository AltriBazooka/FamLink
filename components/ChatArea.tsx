
import React, { useState, useEffect, useRef } from 'react';
import { Group, Message, User } from '../types.ts';
import { Button } from './Button.tsx';
import { summarizeChat, getConversationStarter } from '../services/geminiService.ts';

interface ChatAreaProps {
  group: Group | null;
  messages: Message[];
  currentUser: User;
  onSendMessage: (text: string) => void;
  onInvite: () => void;
  onDeleteGroup?: (groupId: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  group,
  messages,
  currentUser,
  onSendMessage,
  onInvite,
  onDeleteGroup
}) => {
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [icebreaker, setIcebreaker] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sort messages to ensure real-time order
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sortedMessages]);

  useEffect(() => {
    if (group) {
      setSummary(null);
      setIcebreaker(null);
      setShowSettings(false);
    }
  }, [group]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    const result = await summarizeChat(sortedMessages);
    setSummary(result);
    setIsSummarizing(false);
  };

  const handleGetIcebreaker = async () => {
    if (!group) return;
    const result = await getConversationStarter(group.name);
    setIcebreaker(result);
  };

  if (!group) {
    return (
      <div className="flex-1 bg-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mb-6 animate-bounce duration-1000">
          <svg className="w-12 h-12 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Connect with your Fam</h2>
        <p className="text-slate-500 max-w-md text-lg">Pick a conversation from the sidebar to join in, or start a new legacy by creating a group.</p>
      </div>
    );
  }

  const isAdmin = group.adminId === currentUser.id;

  return (
    <div className="flex-1 bg-white flex flex-col relative overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="h-20 border-b border-purple-50 px-8 flex items-center justify-between bg-white/90 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-black shadow-lg shadow-purple-200">
            {group.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-800 text-lg leading-tight">{group.name}</h3>
              {isAdmin && <span className="bg-purple-100 text-purple-600 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-tighter">Admin</span>}
            </div>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              {group.members.length} members present
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="secondary" size="sm" className="hidden sm:flex" onClick={handleSummarize} disabled={isSummarizing || sortedMessages.length === 0}>
            {isSummarizing ? "Thinking..." : "✨ AI Recap"}
          </Button>
          <Button variant="primary" size="sm" onClick={onInvite}>Invite</Button>
          {isAdmin && (
             <button 
               onClick={() => setShowSettings(!showSettings)}
               className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-purple-100 text-purple-600' : 'text-slate-400 hover:bg-slate-100'}`}
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
             </button>
          )}
        </div>
      </div>

      {/* Admin Settings Overlay */}
      {showSettings && isAdmin && (
        <div className="absolute top-20 right-8 w-64 bg-white border border-purple-100 shadow-2xl rounded-2xl z-30 p-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <h4 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Admin Controls</h4>
          <div className="space-y-2">
            <button 
              onClick={() => onDeleteGroup && onDeleteGroup(group.id)}
              className="w-full text-left p-3 hover:bg-red-50 rounded-xl text-sm font-semibold text-red-600 flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Dissolve Group
            </button>
          </div>
        </div>
      )}

      {/* Summary Banner */}
      {summary && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 border-b border-purple-100 animate-slideDown shadow-inner">
          <div className="max-w-4xl mx-auto flex gap-4">
             <div className="text-xl">✨</div>
             <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-black text-purple-600 uppercase tracking-[0.2em]">FamLink Intelligence Recap</span>
                  <button onClick={() => setSummary(null)} className="bg-white/50 hover:bg-white p-1 rounded-full text-purple-300 hover:text-purple-600 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <p className="text-sm text-purple-900 leading-relaxed font-medium italic">"{summary}"</p>
             </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 bg-slate-50/30"
      >
        {sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="max-w-sm text-center p-10 bg-white rounded-[2.5rem] border border-purple-50 shadow-xl shadow-purple-100/20">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </div>
              <p className="text-slate-500 font-semibold mb-6">Stranger or friend, be the first to speak!</p>
              {icebreaker ? (
                <div className="bg-purple-600 p-4 rounded-2xl text-white text-sm shadow-lg shadow-purple-200 italic font-medium mb-4 relative">
                  <div className="absolute -top-2 left-4 bg-purple-900 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Gemini Suggests</div>
                  "{icebreaker}"
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={handleGetIcebreaker} className="hover:scale-105 transition-transform">
                  Ask AI for an Icebreaker
                </Button>
              )}
            </div>
          </div>
        ) : (
          sortedMessages.map((msg, i) => {
            const isMe = msg.senderId === currentUser.id;
            const nextMsg = sortedMessages[i + 1];
            const isLastOfBlock = !nextMsg || nextMsg.senderId !== msg.senderId;

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[80%] lg:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && isLastOfBlock && (
                    <div className="flex items-center gap-2 mb-1.5 ml-2">
                       <span className="text-[11px] font-black text-slate-800 uppercase tracking-tighter">{msg.senderName}</span>
                    </div>
                  )}
                  <div className={`group relative px-5 py-3 rounded-[1.5rem] text-[15px] shadow-sm transition-all hover:shadow-md ${
                    isMe 
                    ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                  }`}>
                    {msg.text}
                    <div className={`absolute bottom-0 ${isMe ? '-left-12' : '-right-12'} opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-full whitespace-nowrap z-20`}>
                       {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {isLastOfBlock && (
                     <div className={`text-[10px] text-slate-400 mt-1 font-bold ${isMe ? 'mr-2' : 'ml-2'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-purple-50 bg-white shadow-2xl z-10">
        <div className="max-w-5xl mx-auto">
          <div className="relative flex items-center gap-3">
            <div className="flex-1 relative group">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`Send a message to ${group.name}...`}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-300 focus:bg-white transition-all font-medium"
              />
            </div>
            <button 
               onClick={handleSend} 
               disabled={!inputText.trim()}
               className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${
                 inputText.trim() 
                 ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 hover:bg-purple-700 hover:scale-105 active:scale-95' 
                 : 'bg-slate-100 text-slate-300'
               }`}
            >
              <svg className="w-6 h-6 transform rotate-90" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
            </button>
          </div>
          <div className="mt-2 text-center">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">End-to-end encrypted by FamLink</p>
          </div>
        </div>
      </div>
    </div>
  );
};
