
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

const Installer: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dbStatus, setDbStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [serverError, setServerError] = useState('');

  const [config, setConfig] = useState({
    dbHost: 'localhost',
    dbUser: '',
    dbPass: '',
    dbName: '',
    adminUser: 'admin',
    adminPass: ''
  });

  const API_URL = '/_api_';

  useEffect(() => {
    checkServer();
  }, []);

  const checkServer = async () => {
    setServerStatus('checking');
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        setServerStatus('online');
        setServerError('');
      } else {
        setServerStatus('offline');
        setServerError(`HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (e: any) {
      setServerStatus('offline');
      setServerError(e.message || 'Connection Refused. Is the Node.js app started?');
    }
  };

  const testConnection = async () => {
    setDbStatus('testing');
    setError('');
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
      
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setDbStatus('success');
      } else {
        setDbStatus('failed');
        setError(data.error || 'Connection failed.');
      }
    } catch (e: any) {
      setDbStatus('failed');
      setError(`Network Error: ${e.message}`);
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
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setStep(4);
      } else {
        setError(data.error || 'Install failed.');
      }
    } catch (e: any) {
      setError(`Installation Failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-screwdriver-wrench text-2xl"></i>
                </div>
                <div>
                <h1 className="text-2xl font-bold">CRM Setup Wizard</h1>
                <p className="text-slate-400 text-xs font-bold">English House Academy</p>
                </div>
            </div>
            <button 
                onClick={checkServer}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                    serverStatus === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 
                    serverStatus === 'checking' ? 'bg-slate-500/20 text-slate-400' : 
                    'bg-rose-500/20 text-rose-400 animate-pulse'
                }`}
            >
                {serverStatus === 'online' ? '● Online' : serverStatus === 'checking' ? 'Checking...' : '● Offline'}
            </button>
          </div>
        </div>

        <div className="p-8">
          {serverStatus === 'offline' && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <span>SERVER CONNECTION FAILED</span>
              </div>
              <p className="opacity-80">Reason: {serverError}</p>
              <p className="mt-2 font-bold text-[10px] uppercase">Solution:</p>
              <ul className="list-disc list-inside opacity-70">
                <li>Check if Node.js app is "Started" in Hostinger dashboard.</li>
                <li>Ensure "Application Entry Point" is set to "server.js".</li>
                <li>Wait 30 seconds after starting for it to warm up.</li>
              </ul>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm flex gap-3">
              <i className="fa-solid fa-circle-exclamation text-lg"></i>
              <p>{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <h3 className="text-lg font-bold text-slate-800">Database Config</h3>
                <p className="text-slate-500 text-sm">Enter MySQL details from Hostinger.</p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <Input label="Host" value={config.dbHost} onChange={v => setConfig({...config, dbHost: v})} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="DB User" value={config.dbUser} onChange={v => setConfig({...config, dbUser: v})} />
                  <Input label="DB Pass" type="password" value={config.dbPass} onChange={v => setConfig({...config, dbPass: v})} />
                </div>
                <Input label="Database Name" value={config.dbName} onChange={v => setConfig({...config, dbName: v})} />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button onClick={testConnection} className="text-indigo-600 font-bold px-4 py-2 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all">
                  Test Connection
                </button>
                <button onClick={() => setStep(2)} disabled={dbStatus !== 'success' || serverStatus !== 'online'} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold disabled:opacity-30">
                  Next Step
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-center">Admin Account</h3>
              <div className="grid grid-cols-1 gap-4">
                <Input label="Admin User" value={config.adminUser} onChange={v => setConfig({...config, adminUser: v})} />
                <Input label="Admin Pass" type="password" value={config.adminPass} onChange={v => setConfig({...config, adminPass: v})} />
              </div>
              <div className="pt-4 flex items-center justify-between">
                <button onClick={() => setStep(1)} className="text-slate-500 font-bold">Back</button>
                <button onClick={handleInstall} disabled={loading} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">
                  {loading ? 'Installing...' : 'Complete Install'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-10">
              <i className="fa-solid fa-circle-check text-5xl text-emerald-500 mb-4"></i>
              <h2 className="text-2xl font-bold mb-2">Success!</h2>
              <p className="text-slate-500 mb-8">Setup finished. You can now log in.</p>
              <a href="/" className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold">Go to Dashboard</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = 'text' }: any) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</label>
    <input type={type} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

const rootElement = document.getElementById('setup-root');
if (rootElement) ReactDOM.createRoot(rootElement).render(<Installer />);
