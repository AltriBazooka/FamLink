
import React, { useState } from 'react';
import { Button } from './Button.tsx';

interface AuthPageProps {
  onAuth: (username: string, password: string, isSignup: boolean) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuth }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    setError('');
    onAuth(username.trim(), password.trim(), isSignup);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-900 overflow-hidden relative">
      {/* Animated blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      <div className="max-w-md w-full mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-white/20">
        <div className="p-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl shadow-xl shadow-purple-200 mb-4 transform -rotate-6">
              <span className="text-white font-black text-3xl">FL</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">FamLink</h1>
            <p className="text-slate-500 mt-2">Private group chats for you and yours.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                placeholder="e.g. alex_stone"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <Button type="submit" fullWidth size="lg">
              {isSignup ? 'Create Admin Account' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <button 
              onClick={() => setIsSignup(!isSignup)}
              className="text-purple-600 font-semibold hover:text-purple-700 transition-colors"
            >
              {isSignup ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
