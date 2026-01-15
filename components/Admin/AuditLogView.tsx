
import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types';
import { StorageService } from '../../services/storageService';

export const AuditLogView: React.FC = () => {
  // Added fix: Handle logs as a state and fetch asynchronously on mount
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    StorageService.getAuditLogs().then(setLogs);
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn transition-colors duration-300">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">System Audit Logs</h1>
        <p className="text-slate-500">Trace every action performed within the CRM.</p>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => (
                <tr key={log.id} className="text-sm hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-900">{log.userName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                      log.action.includes('CREATE') ? 'bg-emerald-100 text-emerald-700' :
                      log.action.includes('DELETE') ? 'bg-rose-100 text-rose-700' :
                      log.action.includes('LOGIN') ? 'bg-indigo-100 text-indigo-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 italic">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
