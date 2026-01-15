
import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole, Candidate, Batch, AdmissionStatus, PaymentStatus } from '../../types';
import { StorageService } from '../../services/storageService';

interface CandidateListProps {
  user: User;
  onEdit: (candidate: Candidate) => void;
  onView: (candidate: Candidate) => void;
  onAddNew: () => void;
}

export const CandidateList: React.FC<CandidateListProps> = ({ user, onEdit, onView, onAddNew }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Added fix: Manage candidate and batch lists as state to handle async loading
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [allBatches, setAllBatches] = useState<Batch[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [candidates, batches] = await Promise.all([
        StorageService.getCandidates(),
        StorageService.getBatches()
      ]);
      setAllCandidates(candidates);
      setAllBatches(batches);
    };
    loadData();
  }, []);

  const candidates = useMemo(() => {
    // Added fix: Ensure list is an array by using the state loaded from Promise
    let list = [...allCandidates];
    if (user.role === UserRole.EXECUTIVE) {
      list = list.filter(c => c.executiveId === user.id);
    }
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return list.filter(c => {
      const matchSearch = c.personalDetails.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.id.includes(searchTerm);
      const matchBatch = batchFilter ? c.batchId === batchFilter : true;
      const matchStatus = statusFilter ? c.status === statusFilter : true;
      return matchSearch && matchBatch && matchStatus;
    });
  }, [user, allCandidates, searchTerm, batchFilter, statusFilter]);

  const isViewOnly = user.role === UserRole.VIEW_ONLY;

  const formatDate = (timestamp: number) => {
    if (!timestamp) return { date: 'N/A', time: '' };
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
  };

  return (
    <div className="space-y-6 animate-fadeIn transition-colors duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admissions</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage and track candidate enrollments.</p>
        </div>
        {!isViewOnly && (
          <button 
            onClick={onAddNew}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 w-fit"
          >
            <i className="fa-solid fa-plus"></i>
            Add New Candidate
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-slate-800 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <i className="fa-solid fa-magnifying-glass"></i>
          </span>
          <input 
            type="text" 
            placeholder="Search by ID or Name..." 
            className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="px-4 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600 dark:text-slate-400"
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
        >
          <option value="">All Batches</option>
          {/* Added fix: Map over allBatches state array */}
          {allBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <select 
          className="px-4 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600 dark:text-slate-400"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.values(AdmissionStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-stone-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold">Candidate</th>
                <th className="px-6 py-4 font-bold">Batch</th>
                <th className="px-6 py-4 font-bold">Contact</th>
                <th className="px-6 py-4 font-bold">Payment</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
              {candidates.length > 0 ? candidates.map(c => {
                const { date, time } = formatDate(c.createdAt);
                return (
                  <tr key={c.id} className="hover:bg-stone-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-stone-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold">
                          {c.personalDetails.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{c.personalDetails.fullName}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold tracking-tight">{c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {/* Added fix: Use allBatches state array for searching */}
                      {allBatches.find(b => b.id === c.batchId)?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        <div><i className="fa-solid fa-phone text-[10px] mr-2 text-slate-300"></i>{c.contactDetails.callingNumber}</div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <i className="fa-brands fa-whatsapp mr-2"></i>{c.contactDetails.whatsappNumber}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={c.status} />
                        <PaymentBadge status={c.paymentStatus} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => onView(c)}
                          className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-stone-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="View Profile"
                        >
                          <i className="fa-solid fa-eye"></i>
                        </button>
                        {!isViewOnly && (
                          <button 
                            onClick={() => onEdit(c)}
                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-stone-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Edit Details"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <i className="fa-solid fa-folder-open text-3xl"></i>
                      <p>No candidates found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: AdmissionStatus }> = ({ status }) => {
  const styles = {
    [AdmissionStatus.CONFIRMED]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
    [AdmissionStatus.DEFERRED]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
    [AdmissionStatus.CANCELLED]: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/50'
  };
  return (
    <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-widest leading-none ${styles[status]}`}>
      {status}
    </span>
  );
};

const PaymentBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const styles = {
    [PaymentStatus.FULLY_PAID]: 'text-teal-600 dark:text-teal-400',
    [PaymentStatus.ADVANCE_PAID]: 'text-amber-600 dark:text-amber-400',
    [PaymentStatus.CANCELLED]: 'text-rose-400 dark:text-rose-500',
    [PaymentStatus.DEFERRED]: 'text-slate-400 dark:text-slate-500'
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-tight italic ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};
