
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

const Installer: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dbStatus, setDbStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  const [config, setConfig] = useState({
    dbHost: 'localhost',
    dbUser: '',
    dbPass: '',
    dbName: '',
    adminUser: 'admin',
    adminPass: ''
  });

  // Use absolute path to ensure it reaches the backend
  const API_URL = window.location.origin + '/admission-api';

  const testConnection = async () => {
    setDbStatus('testing');
    setError('');
    console.log("Attempting to connect to:", API_URL);
    
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'test_db_connection', 
            host: config.dbHost, 
            user: config.dbUser, 
            pass: config.dbPass, 
            name: config.dbName 
        })
      });
      
      if (!res.ok) {
        throw new Error(`Server Response: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      if (data.status === 'success') {
        setDbStatus('success');
      } else {
        setDbStatus('failed');
        setError(data.error || 'Connection failed. Check DB details.');
      }
    } catch (e: any) {
      setDbStatus('failed');
      setError(`Setup API Error: ${e.message}. If this is 404, check if your Node.js app is running and pointed to the correct directory.`);
    }
  };

  const handleInstall = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'perform_install', ...config })
      });
      
      if (!res.ok) throw new Error(`Status ${res.status}`);

      const data = await res.json();
      if (data.status === 'success') {
        setStep(4);
      } else {
        setError(data.error || 'Installation failed.');
      }
    } catch (e: any) {
      setError(`Installation Failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden setup-card">
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
              <i className="fa-solid fa-screwdriver-wrench text-2xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold">CRM Setup Wizard</h1>
              <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">English House Academy</p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-6">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
            ))}
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm flex gap-3 items-center">
              <i className="fa-solid fa-circle-exclamation text-lg"></i>
              <div className="flex-1">
                <p className="font-bold">Error Detected</p>
                <p className="opacity-80">{error}</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <i className="fa-solid fa-database text-5xl text-slate-200 mb-4"></i>
                <h3 className="text-lg font-bold text-slate-800">Database Configuration</h3>
                <p className="text-slate-500 text-sm">Enter your MySQL credentials from Hostinger.</p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <Input label="DB Host (usually localhost)" value={config.dbHost} onChange={v => setConfig({...config, dbHost: v})} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="DB Username" value={config.dbUser} onChange={v => setConfig({...config, dbUser: v})} />
                  <Input label="DB Password" type="password" value={config.dbPass} onChange={v => setConfig({...config, dbPass: v})} />
                </div>
                <Input label="Database Name" value={config.dbName} onChange={v => setConfig({...config, dbName: v})} />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button 
                  onClick={testConnection}
                  disabled={dbStatus === 'testing' || !config.dbName}
                  className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl transition-all ${
                    dbStatus === 'success' ? 'text-emerald-600 bg-emerald-50' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                  }`}
                >
                  {dbStatus === 'testing' ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className={`fa-solid ${dbStatus === 'success' ? 'fa-circle-check' : 'fa-vial'}`}></i>}
                  {dbStatus === 'success' ? 'Connection Working' : 'Test Connection'}
                </button>
                <button 
                  onClick={() => setStep(2)}
                  disabled={dbStatus !== 'success'}
                  className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-30 transition-all"
                >
                  Next Step
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <i className="fa-solid fa-user-shield text-5xl text-slate-200 mb-4"></i>
                <h3 className="text-lg font-bold text-slate-800">Admin Account</h3>
                <p className="text-slate-500 text-sm">Create the login for your first Super Admin.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Input label="Admin Username" value={config.adminUser} onChange={v => setConfig({...config, adminUser: v})} />
                <Input label="Admin Password" type="password" value={config.adminPass} onChange={v => setConfig({...config, adminPass: v})} />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button onClick={() => setStep(1)} className="text-slate-500 font-bold hover:text-slate-800">Back</button>
                <button 
                  onClick={handleInstall}
                  disabled={!config.adminPass || loading}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-lg shadow-indigo-200"
                >
                  {loading ? 'Installing...' : 'Complete Installation'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
                <i className="fa-solid fa-check-double"></i>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Setup Complete!</h2>
              <p className="text-slate-500 mb-8 px-4">The database has been initialized. You can now log in to the system.</p>
              <a 
                href="/" 
                className="inline-block bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl"
              >
                Go to Dashboard
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Input: React.FC<{ label: string, value: string, onChange: (v: string) => void, type?: string }> = ({ label, value, onChange, type = 'text' }) => (
  <div>
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{label}</label>
    <input 
      type={type}
      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

const rootElement = document.getElementById('setup-root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(<Installer />);
}
