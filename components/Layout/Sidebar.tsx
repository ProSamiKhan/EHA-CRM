
import React from 'react';
import { UserRole } from '../../types';

interface SidebarProps {
  role: UserRole;
  activeView: string;
  onViewChange: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, activeView, onViewChange }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    { id: 'candidates', label: 'Admissions', icon: 'fa-user-graduate' },
  ];

  if (role === UserRole.SUPER_ADMIN) {
    menuItems.push(
      { id: 'batches', label: 'Batches', icon: 'fa-layer-group' },
      { id: 'executives', label: 'Executives', icon: 'fa-users-gear' },
      { id: 'audit-logs', label: 'Audit Logs', icon: 'fa-clipboard-list' }
    );
  }

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-house-chimney-user text-xl"></i>
          </div>
          <span className="font-bold text-lg tracking-tight">EHA CRM</span>
        </div>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeView === item.id || (activeView === 'candidate-form' && item.id === 'candidates')
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <i className={`fa-solid ${item.icon} w-5`}></i>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-6 border-t border-slate-800 text-xs text-slate-500 text-center">
        v1.2.0 • Production Ready
      </div>
    </aside>
  );
};
