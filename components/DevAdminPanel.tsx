
import React, { useState, useEffect } from 'react';
import { User } from '../types.ts';
import { CloudService } from '../lib/cloud.ts';
import { Button } from './Button.tsx';

interface DevAdminPanelProps {
  onLogout: () => void;
}

export const DevAdminPanel: React.FC<DevAdminPanelProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const loadUsers = async () => {
    setIsRefreshing(true);
    const allUsers = await CloudService.getAllUsers();
    setUsers(allUsers);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    if (userId === 'dev-master') {
      alert("Cannot delete the master dev account.");
      return;
    }
    if (!confirm('Are you absolutely sure you want to delete this user?')) return;
    
    const updated = users.filter(u => u.id !== userId);
    await CloudService.updateUsers(updated);
    setUsers(updated);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 flex flex-col items-center">
      <div className="max-w-6xl w-full">
        <header className="mb-10 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-purple-600 rounded-3xl flex items-center justify-center text-white mb-4 shadow-xl">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-2">Global Dev Panel</h2>
          <div className="flex gap-4 mt-4">
             <Button onClick={loadUsers} disabled={isRefreshing} size="sm" variant="outline">
               {isRefreshing ? 'Syncing Ledger...' : 'Force Global Refresh'}
             </Button>
          </div>
        </header>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xl font-bold">Accounts Registered Across All Devices</h3>
            <span className="bg-purple-600 text-white text-xs px-3 py-1 rounded-full font-bold">
              {users.length} Users Found
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-8 py-4">User</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 flex items-center gap-3">
                        <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                          <div className="font-bold">@{user.username}</div>
                          <div className="text-[10px] text-slate-400">{user.id}</div>
                        </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${user.role === 'dev' ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600'}`}>
                         {user.role}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button 
                         onClick={() => handleDeleteUser(user.id)}
                         className="text-slate-300 hover:text-red-500 transition-colors"
                         disabled={user.role === 'dev'}
                       >
                         Delete
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
