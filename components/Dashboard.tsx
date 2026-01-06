
import React from 'react';
import { User, Group, ViewType } from '../types.ts';
import { Button } from './Button.tsx';

interface DashboardProps {
  currentUser: User;
  groups: Group[];
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  onSelectGroup: (id: string) => void;
  onNavigate: (view: ViewType) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  groups,
  onCreateGroup,
  onJoinGroup,
  onSelectGroup,
  onNavigate
}) => {
  const ownedGroups = groups.filter(g => g.adminId === currentUser.id);
  const memberGroups = groups.filter(g => g.adminId !== currentUser.id);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">
            Welcome back, <span className="text-purple-600">{currentUser.username}</span>
          </h2>
          <p className="text-slate-500 mt-2 text-lg">Your private network hub and admin controls.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-purple-100">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div className="text-3xl font-black text-slate-900">{groups.length}</div>
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Circles</div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-purple-100">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div className="text-3xl font-black text-slate-900">{ownedGroups.length}</div>
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Groups Administered</div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <h3 className="text-xl font-bold mb-4 relative z-10">Quick Action</h3>
            <div className="flex flex-col gap-2 relative z-10">
               <Button onClick={onCreateGroup} variant="secondary" fullWidth className="bg-white/20 border-white/30 text-white hover:bg-white/30">Start New Group</Button>
               <Button onClick={onJoinGroup} variant="secondary" fullWidth className="bg-white/20 border-white/30 text-white hover:bg-white/30">Join with Code</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Your Administered Groups</h3>
              <span className="text-xs font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">{ownedGroups.length} Active</span>
            </div>
            <div className="space-y-4">
              {ownedGroups.length === 0 ? (
                <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
                  <p className="text-slate-400">You haven't created any groups yet.</p>
                </div>
              ) : (
                ownedGroups.map(group => (
                  <div key={group.id} className="bg-white p-5 rounded-2xl border border-purple-50 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg">
                        {group.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{group.name}</h4>
                        <p className="text-xs text-slate-400">Invite Code: <code className="bg-slate-50 px-1 rounded font-bold text-purple-600">{group.inviteCode}</code></p>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => {
                        onSelectGroup(group.id);
                        onNavigate('chat');
                    }}>Manage</Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-6">Member Access</h3>
            <div className="space-y-4">
              {memberGroups.length === 0 ? (
                <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
                  <p className="text-slate-400">You are not a member of other groups.</p>
                </div>
              ) : (
                memberGroups.map(group => (
                  <div key={group.id} className="bg-white p-5 rounded-2xl border border-slate-50 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg">
                        {group.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{group.name}</h4>
                        <p className="text-xs text-slate-400">{group.members.length} members online</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                        onSelectGroup(group.id);
                        onNavigate('chat');
                    }}>Enter Chat</Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
