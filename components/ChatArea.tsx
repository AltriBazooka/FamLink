
import React, { useState, useEffect, useRef } from 'react';
import { Group, Message, User } from '../types.ts';
import { Button } from './Button.tsx';
import { CloudService } from '../lib/cloud.ts';
import { summarizeChat, getConversationStarter } from '../services/geminiService.ts';

interface ChatAreaProps {
  group: Group | null;
  messages: Message[];
  currentUser: User;
  onSendMessage: (text: string, fileData?: { url: string; type: string }) => void;
  onInvite: () => void;
  onDeleteGroup?: (groupId: string) => void;
}

const LinkifiedText: React.FC<{ text: string }> = ({ text }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, i) => 
        urlRegex.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-purple-200 break-all">
            {part}
          </a>
        ) : part
      )}
    </>
  );
};

export const ChatArea: React.FC<ChatAreaProps> = ({
  group,
  messages,
  currentUser,
  onSendMessage,
  onInvite,
  onDeleteGroup
}) => {
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [icebreaker, setIcebreaker] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sortedMessages]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileData = await CloudService.uploadFile(file);
      onSendMessage(`Sent a ${fileData.type}`, fileData);
    } catch (err) {
      alert("Failed to upload file. Make sure storage bucket exists.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    const result = await summarizeChat(sortedMessages);
    setSummary(result);
    setIsSummarizing(false);
  };

  if (!group) {
    return (
      <div className="flex-1 bg-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <svg className="w-12 h-12 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">Connect with your Fam</h2>
        <p className="text-slate-500 max-w-md">Pick a chat or start a new group legacy.</p>
      </div>
    );
  }

  const isAdmin = group.adminId === currentUser.id;

  return (
    <div className="flex-1 bg-white flex flex-col relative overflow-hidden shadow-2xl">
      <div className="h-20 border-b border-purple-50 px-8 flex items-center justify-between bg-white/90 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-black shadow-lg">
            {group.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-lg leading-tight">{group.name}</h3>
            <p className="text-xs text-slate-400 font-medium">{group.members.length} members present</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="secondary" size="sm" onClick={handleSummarize} disabled={isSummarizing || sortedMessages.length === 0}>Recap</Button>
          <Button variant="primary" size="sm" onClick={onInvite}>Invite</Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6 bg-slate-50/30">
        {sortedMessages.map((msg, i) => {
          const isMe = msg.senderId === currentUser.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && <span className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">{msg.senderName}</span>}
                <div className={`px-5 py-3 rounded-[1.5rem] text-[15px] shadow-sm ${
                  isMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                }`}>
                  <LinkifiedText text={msg.text} />
                  
                  {msg.fileUrl && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-white/20">
                      {msg.fileType === 'image' && (
                        <img src={msg.fileUrl} alt="attachment" className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.fileUrl)} />
                      )}
                      {msg.fileType === 'video' && (
                        <video src={msg.fileUrl} controls className="max-w-full rounded-lg" />
                      )}
                      {msg.fileType === 'file' && (
                        <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-black/10 rounded-lg hover:bg-black/20">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          <span className="text-xs font-bold truncate">Download Attachment</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-6 border-t border-purple-50 bg-white">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,video/*,application/pdf" />
          <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-purple-50 hover:text-purple-600 transition-all">
            {isUploading ? <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent animate-spin rounded-full"></div> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message or paste a link..."
            className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-4 focus:ring-purple-500/10 transition-all"
          />
          <button onClick={handleSend} disabled={!inputText.trim()} className="h-14 w-14 bg-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-purple-700 disabled:bg-slate-200">
            <svg className="w-6 h-6 rotate-90" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};
