
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
  
  // Added fix: Handle batches as state and fetch asynchronously on mount
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Student Profile</h1>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Candidate ID: {candidate.id}</p>
          </div>
        </div>
        {!isViewOnly && (
          <div className="flex gap-3">
            <button 
              onClick={onEdit}
              className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-user-pen"></i>
              Edit Profile
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Summary Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden text-center p-8">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-3xl font-black mx-auto mb-6">
              {candidate.personalDetails.fullName.charAt(0)}
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">{candidate.personalDetails.fullName}</h2>
            <p className="text-sm text-slate-500 mb-4">{batchName}</p>
            
            <div className="flex flex-col gap-2 mb-6">
               <StatusLabel status={candidate.status} />
               <PaymentLabel status={candidate.paymentStatus} />
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4 text-left">
               <div className="flex items-center gap-3 text-slate-600 text-sm">
                  <i className="fa-solid fa-phone w-4"></i>
                  <span>{candidate.contactDetails.callingNumber}</span>
               </div>
               <div className="flex items-center gap-3 text-emerald-600 text-sm font-semibold">
                  <i className="fa-brands fa-whatsapp w-4"></i>
                  <span>{candidate.contactDetails.whatsappNumber}</span>
               </div>
               <div className="flex items-center gap-3 text-slate-600 text-sm truncate">
                  <i className="fa-solid fa-envelope w-4"></i>
                  <span>{candidate.personalDetails.email || 'No email provided'}</span>
               </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-3xl border border-amber-200 p-6">
            <h3 className="text-sm font-bold text-amber-800 uppercase tracking-widest mb-4 flex items-center gap-2">
               <i className="fa-solid fa-note-sticky text-amber-500"></i>
               Internal Remarks
            </h3>
            {candidate.notes ? (
              <p className="text-sm text-amber-900/80 leading-relaxed whitespace-pre-wrap italic">
                "{candidate.notes}"
              </p>
            ) : (
              <p className="text-xs text-amber-700 opacity-60 italic">No notes recorded.</p>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Grid */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Candidate Bio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InfoRow label="Gender" value={candidate.personalDetails.gender} />
              <InfoRow label="Medium" value={candidate.personalDetails.medium} />
              <InfoRow label="Qualification" value={candidate.personalDetails.qualification || 'Not Specified'} />
              <InfoRow label="Emergency Contact" value={candidate.contactDetails.emergencyContact || 'N/A'} />
              <div className="md:col-span-2">
                 <InfoRow label="Permanent Address" value={`${candidate.addressDetails.address}, ${candidate.addressDetails.city}, ${candidate.addressDetails.state} - ${candidate.addressDetails.pincode}`} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Logistics</h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Travel Mode</span>
                      <span className="text-sm font-bold text-slate-900">{candidate.travelDetails.mode}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Arrival Date</span>
                      <span className="text-sm font-bold text-slate-900">{candidate.travelDetails.arrivalDate || 'TBD'}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Pickup Status</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${candidate.travelDetails.pickupRequired ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                         {candidate.travelDetails.pickupRequired ? 'REQUIRED' : 'NO'}
                      </span>
                   </div>
                </div>
             </div>

             <div className="bg-slate-900 rounded-3xl shadow-lg p-6 text-white">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Ledger Balance</h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Total Fees</span>
                      <span className="text-lg font-bold">₹{TOTAL_FEES.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Total Paid</span>
                      <span className="text-lg font-bold text-emerald-400">₹{totalPaid.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center pt-4 border-t border-white/10">
                      <span className="text-sm font-bold">Outstanding</span>
                      <span className="text-xl font-black text-rose-400">₹{balance.toLocaleString()}</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Payment History & Screenshots</h3>
            <div className="space-y-4">
               {candidate.paymentHistory.length > 0 ? candidate.paymentHistory.map((p, i) => (
                 <div key={p.id} className="group flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-all hover:bg-slate-100/80">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm shrink-0">
                       {p.screenshot ? (
                         <img src={p.screenshot} alt="Payment" className="w-full h-full object-cover cursor-pointer hover:opacity-80" onClick={() => window.open(p.screenshot, '_blank')} title="View Full Screenshot" />
                       ) : (
                         <i className="fa-solid fa-file-invoice-dollar text-slate-300"></i>
                       )}
                    </div>
                    <div className="flex-1">
                       <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-bold text-slate-900">₹{p.amount.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{new Date(p.date).toLocaleDateString()}</span>
                       </div>
                       <p className="text-[10px] text-slate-500 uppercase tracking-tighter font-medium flex items-center gap-2">
                         <span>UTR: <span className="text-slate-900 font-bold">{p.utr}</span></span>
                         <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                         <span>Handled by {p.executiveName}</span>
                       </p>
                    </div>
                 </div>
               )) : (
                 <p className="text-sm text-slate-400 italic text-center py-4">No payments recorded in timeline.</p>
               )}
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
    <p className="text-sm font-semibold text-slate-800">{value}</p>
  </div>
);

const StatusLabel: React.FC<{ status: AdmissionStatus }> = ({ status }) => {
  const styles = {
    [AdmissionStatus.CONFIRMED]: 'bg-emerald-500 text-white shadow-emerald-200',
    [AdmissionStatus.DEFERRED]: 'bg-amber-500 text-white shadow-amber-200',
    [AdmissionStatus.CANCELLED]: 'bg-rose-500 text-white shadow-rose-200'
  };
  return (
    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg inline-block w-fit mx-auto ${styles[status]}`}>
      {status}
    </span>
  );
};

const PaymentLabel: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const styles = {
    [PaymentStatus.FULLY_PAID]: 'border-emerald-500 text-emerald-600',
    [PaymentStatus.ADVANCE_PAID]: 'border-blue-500 text-blue-600',
    [PaymentStatus.CANCELLED]: 'border-rose-500 text-rose-600',
    [PaymentStatus.DEFERRED]: 'border-amber-500 text-amber-600'
  };
  return (
    <span className={`text-[9px] font-black px-3 py-1 rounded-full border-2 uppercase tracking-tight inline-block w-fit mx-auto bg-white ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};
