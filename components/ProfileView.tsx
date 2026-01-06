
import React, { useState } from 'react';
import { User } from '../types.ts';
import { Button } from './Button.tsx';

interface ProfileViewProps {
  currentUser: User;
  onUpdateProfile: (username: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onUpdateProfile }) => {
  const [username, setUsername] = useState(currentUser.username);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdateProfile(username);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 flex justify-center">
      <div className="max-w-2xl w-full">
        <header className="mb-10 text-center">
          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Admin Profile</h2>
          <p className="text-slate-500">Manage your identity across the FamLink network.</p>
        </header>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-purple-50">
          <div className="h-32 bg-gradient-to-r from-purple-600 to-indigo-600"></div>
          <div className="px-10 pb-10">
            <div className="relative -mt-16 mb-8 flex flex-col items-center">
              <img 
                src={currentUser.avatar} 
                className="w-32 h-32 rounded-3xl border-4 border-white shadow-2xl bg-white object-cover"
                alt="Profile"
              />
              <div className="mt-4 text-center">
                <h3 className="text-2xl font-bold text-slate-800">{currentUser.username}</h3>
                <p className="text-purple-500 font-semibold text-sm">FamLink Administrator</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Display Username</label>
                <input 
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Account ID</label>
                <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 font-mono text-xs text-slate-400 overflow-hidden truncate">
                  {currentUser.id}
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <Button fullWidth onClick={handleSave} disabled={!username.trim() || username === currentUser.username}>
                  {saved ? 'Settings Saved!' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 p-6 bg-purple-50 rounded-3xl border border-purple-100">
          <h4 className="font-bold text-purple-900 mb-2">Security Notice</h4>
          <p className="text-purple-700/70 text-sm leading-relaxed">
            As a FamLink Admin, you hold the keys to all groups you create. Invite codes are your primary way of granting access. Keep them private until you're ready for new members.
          </p>
        </div>
      </div>
    </div>
  );
};
