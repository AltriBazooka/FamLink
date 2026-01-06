
import React, { useState, useEffect, useRef } from 'react';
import { Group, Message, User } from '../types';
import { Button } from './Button';
import { summarizeChat, getConversationStarter } from '../services/geminiService';

interface ChatAreaProps {
  group: Group | null;
  messages: Message[];
  currentUser: User;
  onSendMessage: (text: string) => void;
  onInvite: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  group,
  messages,
  currentUser,
  onSendMessage,
  onInvite
}) => {
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [icebreaker, setIcebreaker] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (group) {
      setSummary(null);
      setIcebreaker(null);
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
    const result = await summarizeChat(messages);
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
        <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome to FamLink</h2>
        <p className="text-slate-500 max-w-md">Select a group from the sidebar to start chatting, or create a new one to invite your circle.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-purple-50 px-6 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
            #
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{group.name}</h3>
            <p className="text-xs text-slate-400">{group.members.length} members</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleSummarize} disabled={isSummarizing || messages.length === 0}>
            {isSummarizing ? "Summarizing..." : "AI Summary"}
          </Button>
          <Button variant="outline" size="sm" onClick={onInvite}>Invite</Button>
        </div>
      </div>

      {/* Summary Banner */}
      {summary && (
        <div className="bg-purple-50 p-4 border-b border-purple-100 animate-slideDown">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">AI Recap</span>
            <button onClick={() => setSummary(null)} className="text-purple-300 hover:text-purple-500">×</button>
          </div>
          <p className="text-sm text-purple-900 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="mb-4 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-sm mb-4">The floor is yours. No one has spoken yet.</p>
              {icebreaker ? (
                <div className="bg-white p-3 rounded-lg border border-purple-100 text-purple-700 text-sm shadow-sm italic">
                  "{icebreaker}"
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={handleGetIcebreaker}>
                  Get AI Icebreaker
                </Button>
              )}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${isMe ? 'order-1' : 'order-2'}`}>
                  {!isMe && <div className="text-xs font-bold text-slate-400 mb-1 ml-1">{msg.senderName}</div>}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                    isMe 
                    ? 'bg-purple-600 text-white rounded-tr-none' 
                    : 'bg-gray-100 text-slate-800 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  <div className={`text-[10px] text-slate-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-purple-50 bg-gray-50/50">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Message #${group.name}...`}
            className="flex-1 bg-white border border-purple-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all shadow-inner"
          />
          <Button onClick={handleSend} disabled={!inputText.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};
