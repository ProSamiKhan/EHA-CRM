
import React, { useState, useEffect } from 'react';
import { User, UserRole, Candidate, Batch, AuditLog } from './types';
import { AuthService } from './services/authService';
import { StorageService } from './services/storageService';
import { Login } from './components/Auth/Login';
import { Sidebar } from './components/Layout/Sidebar';
import { Navbar } from './components/Layout/Navbar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { CandidateList } from './components/Candidate/CandidateList';
import { CandidateForm } from './components/Candidate/CandidateForm';
import { CandidateView } from './components/Candidate/CandidateView';
import { BatchManagement } from './components/Batch/BatchManagement';
import { AuditLogView } from './components/Admin/AuditLogView';
import { ExecutiveManagement } from './components/Admin/ExecutiveManagement';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('crm_theme');
    return saved === 'dark';
  });

  useEffect(() => {
    StorageService.init();
    const loggedInUser = AuthService.getCurrentUser();
    if (loggedInUser) {
      setUser(loggedInUser);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('crm_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('crm_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleLogin = (u: User) => setUser(u);
  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
    setCurrentView('dashboard');
    setIsMobileMenuOpen(false);
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false); 
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            user={user} 
            onAddNew={() => {
              setSelectedCandidate(null);
              setCurrentView('candidate-form');
            }} 
          />
        );
      case 'candidates':
        return (
          <CandidateList 
            user={user} 
            onEdit={(c) => {
              setSelectedCandidate(c);
              setCurrentView('candidate-form');
            }} 
            onView={(c) => {
              setSelectedCandidate(c);
              setCurrentView('candidate-view');
            }}
            onAddNew={() => {
              setSelectedCandidate(null);
              setCurrentView('candidate-form');
            }}
          />
        );
      case 'candidate-form':
        return (
          <CandidateForm 
            user={user} 
            candidate={selectedCandidate} 
            onCancel={() => setCurrentView('candidates')}
            onSuccess={() => setCurrentView('candidates')}
          />
        );
      case 'candidate-view':
        return (
          <CandidateView 
            candidate={selectedCandidate!} 
            onBack={() => setCurrentView('candidates')}
            onEdit={() => setCurrentView('candidate-form')}
          />
        );
      case 'batches':
        return user.role === UserRole.SUPER_ADMIN ? <BatchManagement /> : null;
      case 'audit-logs':
        return user.role === UserRole.SUPER_ADMIN ? <AuditLogView /> : null;
      case 'executives':
        return user.role === UserRole.SUPER_ADMIN ? <ExecutiveManagement /> : null;
      default:
        return (
          <Dashboard 
            user={user} 
            onAddNew={() => {
              setSelectedCandidate(null);
              setCurrentView('candidate-form');
            }} 
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#fdfbf7] dark:bg-slate-950 overflow-hidden relative transition-colors duration-300">
      {/* Desktop Sidebar */}
      <Sidebar 
        role={user.role} 
        activeView={currentView} 
        onViewChange={handleViewChange} 
      />

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div className={`
        fixed inset-y-0 left-0 w-72 bg-slate-900 z-50 transform transition-transform duration-300 ease-in-out md:hidden
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-house-chimney-user text-xl text-white"></i>
              </div>
              <span className="font-bold text-lg tracking-tight text-white">EHA CRM</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>
          
          <div className="p-6">
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">{user.role.replace('_', ' ')}</p>
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
            </div>

            <nav className="space-y-1">
              <NavButton 
                active={currentView === 'dashboard'} 
                onClick={() => handleViewChange('dashboard')} 
                icon="fa-chart-pie" 
                label="Dashboard" 
              />
              <NavButton 
                active={currentView === 'candidates' || currentView === 'candidate-form' || currentView === 'candidate-view'} 
                onClick={() => handleViewChange('candidates')} 
                icon="fa-user-graduate" 
                label="Admissions" 
              />
              
              {user.role === UserRole.SUPER_ADMIN && (
                <div className="pt-4 mt-4 border-t border-slate-800 space-y-1">
                  <p className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Admin Control</p>
                  <NavButton 
                    active={currentView === 'batches'} 
                    onClick={() => handleViewChange('batches')} 
                    icon="fa-layer-group" 
                    label="Batches" 
                  />
                  <NavButton 
                    active={currentView === 'executives'} 
                    onClick={() => handleViewChange('executives')} 
                    icon="fa-users-gear" 
                    label="Executives" 
                  />
                  <NavButton 
                    active={currentView === 'audit-logs'} 
                    onClick={() => handleViewChange('audit-logs')} 
                    icon="fa-clipboard-list" 
                    label="Audit Logs" 
                  />
                </div>
              )}
            </nav>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar 
          user={user} 
          onLogout={handleLogout} 
          onMenuToggle={() => setIsMobileMenuOpen(true)} 
          isDarkMode={isDarkMode}
          onThemeToggle={toggleDarkMode}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: string, label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`}
  >
    <i className={`fa-solid ${icon} w-5`}></i>
    <span className="font-bold text-sm">{label}</span>
  </button>
);

export default App;
