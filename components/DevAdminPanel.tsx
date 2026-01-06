
import React, { useState, useEffect } from 'react';
import { User } from '../types.ts';
import { CloudService } from '../lib/cloud.ts';
import { Button } from './Button.tsx';

interface DevAdminPanelProps {
  onLogout: () => void;
}

export const DevAdminPanel: React.FC<DevAdminPanelProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    const globalUsers = await CloudService.getAllUsers();
    setUsers(globalUsers);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    if (userId === 'dev-master') {
      alert("Cannot delete the master dev account.");
      return;
    }
    if (!confirm('Are you absolutely sure you want to delete this user? This cannot be undone.')) return;
    
    const updated = users.filter(u => u.id !== userId);
    await CloudService.updateUsers(updated);
    setUsers(updated);
  };

  const handleUpdatePassword = async (userId: string) => {
    if (!newPassword.trim()) return;
    
    const updated = users.map(u => {
      if (u.id === userId) {
        return { ...u, password: newPassword };
      }
      return u;
    });
    
    await CloudService.updateUsers(updated);
    setUsers(updated);
    setEditingUserId(null);
    setNewPassword('');
    alert('Password updated successfully.');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-red-50/30 p-8 flex flex-col items-center">
      <div className="max-w-6xl w-full">
        <header className="mb-10 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-red-600 rounded-3xl flex items-center justify-center text-white mb-4 shadow-xl shadow-red-200">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">FamLink Dev Panel</h2>
          <p className="text-red-600 font-bold uppercase tracking-widest text-xs">God Mode Active</p>
          <Button onClick={fetchUsers} size="sm" variant="outline" className="mt-4">
            {isLoading ? 'Syncing...' : 'Force Global Refresh'}
          </Button>
        </header>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-red-100">
          <div className="p-8 border-b border-red-50 bg-red-50/20 flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              All Registered Accounts
              <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">{users.length}</span>
            </h3>
            {isLoading && <span className="text-xs text-red-500 animate-pulse font-bold">CONTACTING GLOBAL RELAY...</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-8 py-4">User</th>
                  <th className="px-8 py-4">Password</th>
                  <th className="px-8 py-4">ID / Created</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <img src={user.avatar} className="w-10 h-10 rounded-xl bg-slate-100 object-cover" alt="" />
                        <div>
                          <div className="font-bold text-slate-800">@{user.username}</div>
                          <div className={`text-[10px] font-black uppercase ${user.role === 'dev' ? 'text-red-500' : 'text-purple-500'}`}>
                            {user.role}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {editingUserId === user.id ? (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            className="px-3 py-1 border rounded-lg text-sm w-32 focus:ring-1 focus:ring-red-400 outline-none"
                            placeholder="New password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                          />
                          <button 
                            onClick={() => handleUpdatePassword(user.id)}
                            className="bg-green-500 text-white p-1 rounded hover:bg-green-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                        </div>
                      ) : (
                        <code className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-600 font-mono">
                          {user.password || '********'}
                        </code>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-[10px] font-mono text-slate-400">{user.id}</div>
                      <div className="text-[10px] text-slate-300">{new Date(user.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingUserId(user.id)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Change Password"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={user.role === 'dev'}
                          title="Delete Account"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
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
