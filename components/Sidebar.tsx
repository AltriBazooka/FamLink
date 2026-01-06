
import React from 'react';
import { Group, User } from '../types';
import { Button } from './Button';

interface SidebarProps {
  groups: Group[];
  activeGroupId: string | null;
  currentUser: User;
  onSelectGroup: (id: string) => void;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  groups,
  activeGroupId,
  currentUser,
  onSelectGroup,
  onCreateGroup,
  onJoinGroup,
  onLogout
}) => {
  return (
    <div className="w-80 h-screen bg-white border-r border-purple-100 flex flex-col">
      <div className="p-6 border-b border-purple-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">
            FamLink
          </h1>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2 border-b border-purple-50">
        <Button onClick={onCreateGroup} fullWidth size="sm">
          <span className="mr-2">+</span> New Group
        </Button>
        <Button onClick={onJoinGroup} fullWidth variant="secondary" size="sm">
          <span className="mr-2">#</span> Join with Code
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <div className="px-3 mb-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
          Your Conversations
        </div>
        {groups.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-400 italic">
            No groups yet. Create or join one!
          </div>
        ) : (
          groups.map(group => (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              className={`w-full flex items-center p-3 mb-1 rounded-xl transition-all ${
                activeGroupId === group.id 
                ? 'bg-purple-50 text-purple-700 shadow-sm' 
                : 'text-slate-600 hover:bg-gray-50'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center mr-3 font-bold text-purple-700">
                {group.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <div className="font-semibold truncate">{group.name}</div>
                <div className="text-xs text-slate-400 truncate">{group.members.length} members</div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="p-4 bg-purple-50 border-t border-purple-100 mt-auto">
        <div className="flex items-center gap-3 mb-4">
          <img 
            src={currentUser.avatar} 
            alt={currentUser.username} 
            className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
          />
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-bold text-purple-900 truncate">@{currentUser.username}</div>
            <div className="text-xs text-purple-400">Admin Account</div>
          </div>
        </div>
        <Button onClick={onLogout} variant="outline" fullWidth size="sm" className="bg-white border-purple-200 text-purple-400 hover:text-red-500 hover:border-red-200">
          Sign Out
        </Button>
      </div>
    </div>
  );
};
