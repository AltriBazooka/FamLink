
import React from 'react';
import { Group, User, ViewType } from '../types.ts';
import { Button } from './Button.tsx';

interface SidebarProps {
  groups: Group[];
  activeGroupId: string | null;
  currentUser: User;
  currentView: ViewType;
  onSelectGroup: (id: string) => void;
  onNavigate: (view: ViewType) => void;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  groups,
  activeGroupId,
  currentUser,
  currentView,
  onSelectGroup,
  onNavigate,
  onCreateGroup,
  onJoinGroup,
  onLogout
}) => {
  const isDev = currentUser.role === 'dev';

  return (
    <div className="w-80 h-screen bg-white border-r border-purple-100 flex flex-col shadow-sm z-20">
      <div className="p-6 border-b border-purple-50">
        <button 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 group transition-transform active:scale-95 text-left w-full"
        >
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200 group-hover:bg-purple-700 transition-colors">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">
              FamLink
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-purple-400 font-bold">Admin Console</p>
          </div>
        </button>
      </div>

      <div className="px-4 py-4 space-y-1">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium ${
            currentView === 'dashboard' ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          Dashboard
        </button>
        <button
          onClick={() => onNavigate('profile')}
          className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium ${
            currentView === 'profile' ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'text-slate-600 hover:bg-purple-50'
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          Admin Profile
        </button>
        {isDev && (
          <button
            onClick={() => onNavigate('admin-panel')}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium border-2 ${
              currentView === 'admin-panel' 
              ? 'bg-red-600 border-red-700 text-white shadow-md shadow-red-200' 
              : 'text-red-600 border-dashed border-red-100 hover:bg-red-50'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Dev Panel
          </button>
        )}
      </div>

      <div className="p-4 mt-2">
        <div className="flex flex-col gap-2">
          <Button onClick={onCreateGroup} fullWidth size="sm" className="shadow-sm">
            <span className="mr-2 text-lg">+</span> Create Group
          </Button>
          <Button onClick={onJoinGroup} fullWidth variant="secondary" size="sm">
            <span className="mr-2 text-lg">#</span> Join Group
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 mt-2">
        <div className="px-4 mb-3 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Groups</span>
          <span className="bg-purple-100 text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{groups.length}</span>
        </div>
        
        {groups.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <p className="text-xs text-slate-400">No active chats.</p>
          </div>
        ) : (
          groups.map(group => (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              className={`w-full flex items-center p-3 mb-1 rounded-xl transition-all group ${
                activeGroupId === group.id && currentView === 'chat'
                ? 'bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-100' 
                : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 font-bold transition-colors ${
                activeGroupId === group.id && currentView === 'chat' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-600 group-hover:bg-purple-200'
              }`}>
                {group.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <div className="font-bold text-sm truncate">{group.name}</div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                  {group.members.length} members
                </div>
              </div>
              {group.adminId === currentUser.id && (
                <div className="w-2 h-2 rounded-full bg-purple-400" title="You are Admin"></div>
              )}
            </button>
          ))
        )}
      </div>

      <div className="p-4 border-t border-purple-50 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-white border border-purple-100 shadow-sm">
          <img 
            src={currentUser.avatar} 
            alt={currentUser.username} 
            className="w-10 h-10 rounded-lg object-cover shadow-sm ring-2 ring-purple-100"
          />
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-black text-slate-800 truncate">@{currentUser.username}</div>
            <div className="text-[10px] text-purple-500 font-bold uppercase tracking-tighter">{isDev ? 'Master Dev' : 'Super Admin'}</div>
          </div>
        </div>
        <Button onClick={onLogout} variant="outline" fullWidth size="sm" className="bg-white hover:text-red-600 hover:border-red-200 transition-all text-slate-400 border-slate-200">
          Sign Out
        </Button>
      </div>
    </div>
  );
};
