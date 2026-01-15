
import React from 'react';
import { User } from '../../types';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onMenuToggle: () => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onMenuToggle, isDarkMode, onThemeToggle }) => {
  return (
    <nav className="h-16 bg-white dark:bg-slate-900 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0 transition-colors duration-300">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuToggle}
          className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg md:hidden transition-colors"
          aria-label="Toggle Menu"
        >
          <i className="fa-solid fa-bars text-lg"></i>
        </button>
        
        <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100">English House Academy</h2>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={onThemeToggle}
          className="p-2 text-slate-500 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <i className="fa-solid fa-sun text-lg text-amber-400"></i>
          ) : (
            <i className="fa-solid fa-moon text-lg text-indigo-500"></i>
          )}
        </button>

        <div className="h-6 w-px bg-stone-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">{user.role.replace('_', ' ')}</p>
        </div>
        
        <div className="h-8 w-px bg-stone-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

        <button 
          onClick={onLogout}
          className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-2 group"
          title="Logout"
        >
          <span className="text-xs font-bold hidden md:inline group-hover:text-rose-600 dark:group-hover:text-rose-400">Sign Out</span>
          <i className="fa-solid fa-right-from-bracket text-lg"></i>
        </button>
      </div>
    </nav>
  );
};
