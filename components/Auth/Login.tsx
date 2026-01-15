
import React, { useState } from 'react';
import { User } from '../../types';
import { AuthService } from '../../services/authService';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setTimeout(() => {
      const user = AuthService.login(username, password);
      if (user) onLogin(user);
      else setError('Invalid username or password');
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-stone-100 dark:border-slate-800">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-3xl text-white mb-6 shadow-xl shadow-indigo-200 dark:shadow-none">
            <i className="fa-solid fa-building-columns text-3xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Institute CRM Login</h1>
          <p className="text-slate-500 dark:text-slate-400">English House Academy Pvt Ltd</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <i className="fa-solid fa-user"></i>
              </span>
              <input
                type="text"
                required
                className="block w-full pl-10 pr-3 py-3 bg-stone-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-stone-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Enter ID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <i className="fa-solid fa-lock"></i>
              </span>
              <input
                type="password"
                required
                className="block w-full pl-10 pr-3 py-3 bg-stone-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-stone-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl border border-red-100 dark:border-red-900/50 flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-stone-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Secure Access Portal</p>
        </div>
      </div>
    </div>
  );
};
