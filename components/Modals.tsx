
import React, { useState } from 'react';
import { Button } from './Button';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Create a Group</h2>
        <p className="text-slate-500 mb-6 text-sm">Start a private space for your people.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Group Name</label>
            <input 
              autoFocus
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="The Secret Society"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Topic (Optional)</label>
            <input 
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Weekly hangouts and memes"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button fullWidth disabled={!name} onClick={() => onCreate(name, desc)}>Create Group</Button>
        </div>
      </div>
    </div>
  );
};

interface JoinGroupModalProps {
  onClose: () => void;
  onJoin: (code: string) => void;
  error?: string;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({ onClose, onJoin, error: serverError }) => {
  const [code, setCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleJoin = async () => {
    setIsSearching(true);
    await onJoin(code);
    setIsSearching(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Join a Group</h2>
        <p className="text-slate-500 mb-6 text-sm">Searching the global FamLink network...</p>
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Invite Code</label>
          <input 
            autoFocus
            disabled={isSearching}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none uppercase font-mono tracking-widest text-center text-xl disabled:opacity-50"
            value={code}
            maxLength={6}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
          />
        </div>
        {serverError && <p className="text-red-500 text-sm mt-2">{serverError}</p>}
        {isSearching && <p className="text-purple-600 text-xs font-bold mt-2 animate-pulse">Checking global registry...</p>}

        <div className="flex gap-3 mt-8">
          <Button variant="outline" fullWidth onClick={onClose} disabled={isSearching}>Cancel</Button>
          <Button fullWidth disabled={code.length < 3 || isSearching} onClick={handleJoin}>
            {isSearching ? 'Joining...' : 'Join Group'}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface InviteModalProps {
  group: { name: string; inviteCode: string };
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ group, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Invite to {group.name}</h2>
        <p className="text-slate-500 mb-6 text-sm">Share this code with the people you want to join.</p>
        
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6 flex flex-col items-center">
          <span className="text-3xl font-mono font-bold tracking-widest text-purple-600 mb-4">{group.inviteCode}</span>
          <Button variant="secondary" onClick={copy} size="sm">
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
        </div>

        <Button variant="outline" fullWidth onClick={onClose}>Done</Button>
      </div>
    </div>
  );
};
