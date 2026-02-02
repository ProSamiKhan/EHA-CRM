import React, { useState, useEffect } from 'react';
import { Candidate, AdmissionStatus, PaymentStatus, UserRole, Batch } from '../../types';
import { StorageService } from '../../services/storageService';
import { AuthService } from '../../services/authService';
import { TOTAL_FEES } from '../../constants';

interface CandidateViewProps {
  candidate: Candidate;
  onBack: () => void;
  onEdit: () => void;
}

export const CandidateView: React.FC<CandidateViewProps> = ({ candidate, onBack, onEdit }) => {
  const user = AuthService.getCurrentUser();
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    StorageService.getBatches().then(setBatches);
  }, []);

  const batchName = batches.find(b => b.id === candidate.batchId)?.name || 'N/A';
  const totalPaid = candidate.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
  const balance = TOTAL_FEES - totalPaid;
  const isViewOnly = user?.role === UserRole.VIEW_ONLY;

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn pb-12 transition-colors duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shadow-sm">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Student Profile</h1>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">ID: {candidate.id}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {!isViewOnly && (
            <button onClick={onEdit} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
              <i className="fa-solid fa-user-pen"></i>
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden text-center p-8">
            <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-3xl font-black mx-auto mb-6">
              {candidate.personalDetails.fullName.charAt(0)}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">{candidate.personalDetails.fullName}</h2>
            <p className="text-sm text-slate-500 mb-4">{batchName}</p>
            <div className="flex flex-col gap-2 mb-6">
               <StatusLabel status={candidate.status} />
               <PaymentLabel status={candidate.paymentStatus} />
            </div>
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4 text-left">
               <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 text-sm">
                  <i className="fa-solid fa-phone w-4"></i>
                  <span>{candidate.contactDetails.callingNumber}</span>
               </div>
               <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                  <i className="fa-brands fa-whatsapp w-4"></i>
                  <span>{candidate.contactDetails.whatsappNumber}</span>
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Bio & Logistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InfoRow label="Address" value={`${candidate.addressDetails.city}, ${candidate.addressDetails.state}`} />
              <InfoRow label="Arrival" value={`${candidate.travelDetails.mode} (${candidate.travelDetails.arrivalDate || 'N/A'})`} />
              <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-6 text-white md:col-span-2 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Fees Balance</p>
                  <p className="text-2xl font-black text-rose-400">₹{balance.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Total Paid</p>
                  <p className="text-2xl font-black text-emerald-400">₹{totalPaid.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-1">{label}</p>
    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</p>
  </div>
);

const StatusLabel: React.FC<{ status: AdmissionStatus }> = ({ status }) => {
  const styles = {
    [AdmissionStatus.CONFIRMED]: 'bg-emerald-500 text-white',
    [AdmissionStatus.DEFERRED]: 'bg-amber-500 text-white',
    [AdmissionStatus.CANCELLED]: 'bg-rose-500 text-white'
  };
  return <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest inline-block w-fit mx-auto ${styles[status]}`}>{status}</span>;
};

const PaymentLabel: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const styles = {
    [PaymentStatus.FULLY_PAID]: 'border-emerald-500 text-emerald-600',
    [PaymentStatus.ADVANCE_PAID]: 'border-blue-500 text-blue-600',
    [PaymentStatus.CANCELLED]: 'border-rose-500 text-rose-600',
    [PaymentStatus.DEFERRED]: 'border-amber-500 text-amber-600'
  };
  return <span className={`text-[9px] font-black px-3 py-1 rounded-full border-2 uppercase tracking-tight inline-block w-fit mx-auto bg-white dark:bg-slate-800 ${styles[status]}`}>{status.replace('_', ' ')}</span>;
};