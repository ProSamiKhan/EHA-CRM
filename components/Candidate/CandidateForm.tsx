
import React, { useState, useEffect } from 'react';
import { User, UserRole, Candidate, AdmissionStatus, PaymentStatus, PaymentEntry } from '../../types';
import { StorageService } from '../../services/storageService';
import { INDIAN_STATE_DISTRICT_MAP, TOTAL_FEES, INSTITUTE_DETAILS } from '../../constants';

interface CandidateFormProps {
  user: User;
  candidate: Candidate | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export const CandidateForm: React.FC<CandidateFormProps> = ({ user, candidate, onCancel, onSuccess }) => {
  const isEditing = !!candidate;
  // Added fix: Manage batches state to handle async loading from service
  const [batches, setBatches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'personal' | 'payment' | 'travel'>('personal');

  const [formData, setFormData] = useState<Partial<Candidate>>(
    candidate || {
      id: `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      batchId: '',
      executiveId: user.id,
      status: AdmissionStatus.CONFIRMED,
      paymentStatus: PaymentStatus.ADVANCE_PAID,
      notes: '',
      personalDetails: { fullName: '', email: '', gender: 'Male', dob: { day: '01', month: '01', year: '2000' }, qualification: '', medium: 'English' },
      contactDetails: { callingNumber: '', whatsappNumber: '', emergencyContact: '' },
      addressDetails: { country: 'India', address: '', state: '', city: '', pincode: '' },
      travelDetails: { mode: 'None', arrivalDate: '', arrivalTime: '', pickupRequired: false },
      documents: { aadharCard: '' },
      paymentHistory: []
    }
  );

  // Added fix: Fetch batches asynchronously on component mount
  useEffect(() => {
    StorageService.getBatches().then(list => {
      setBatches(list);
      if (!isEditing && list.length > 0 && !formData.batchId) {
        setFormData(prev => ({ ...prev, batchId: list[0].id }));
      }
    });
  }, [isEditing, formData.batchId]);

  const [newPayment, setNewPayment] = useState({ amount: '', utr: '', screenshot: '' });

  const handlePersonalChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      personalDetails: { ...prev.personalDetails!, [field]: value }
    }));
  };

  const handleContactChange = (field: string, value: string) => {
    if (value && !/^\d*$/.test(value)) return;
    if (value.length > 10) return;
    setFormData(prev => ({
      ...prev,
      contactDetails: { ...prev.contactDetails!, [field]: value }
    }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => {
      const updatedAddress = { ...prev.addressDetails!, [field]: value };
      if (field === 'state') updatedAddress.city = '';
      return { ...prev, addressDetails: updatedAddress };
    });
  };

  const handleTravelChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      travelDetails: { ...prev.travelDetails!, [field]: value }
    }));
  };

  const handleFileChange = (field: 'aadharCard' | 'screenshot', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'aadharCard') {
          setFormData(prev => ({ ...prev, documents: { ...prev.documents!, aadharCard: reader.result as string } }));
        } else {
          setNewPayment(prev => ({ ...prev, screenshot: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addPayment = () => {
    if (!newPayment.amount || !newPayment.utr) {
      alert('Please fill Payment Amount and UTR Number');
      return;
    }
    const entry: PaymentEntry = {
      id: Math.random().toString(36).substr(2, 9),
      amount: Number(newPayment.amount),
      utr: newPayment.utr,
      screenshot: newPayment.screenshot,
      date: Date.now(),
      executiveId: user.id,
      executiveName: user.name
    };
    const newHistory = [...(formData.paymentHistory || []), entry];
    const totalPaid = newHistory.reduce((sum, p) => sum + p.amount, 0);
    setFormData(prev => ({
      ...prev,
      paymentHistory: newHistory,
      paymentStatus: totalPaid >= TOTAL_FEES ? PaymentStatus.FULLY_PAID : PaymentStatus.ADVANCE_PAID
    }));
    setNewPayment({ amount: '', utr: '', screenshot: '' });
  };

  const saveCandidate = async () => {
    if (!formData.personalDetails?.fullName || !formData.batchId) {
      alert('Full Name and Batch Selection are required');
      return;
    }
    if (!formData.addressDetails?.state || !formData.addressDetails?.city) {
      alert('State and District selection are mandatory');
      setActiveTab('personal');
      return;
    }
    // Added fix: Await the asynchronous save operation
    await StorageService.saveCandidate(formData as Candidate);
    onSuccess();
  };

  const statusStyles = {
    [AdmissionStatus.CONFIRMED]: {
      active: 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/30 scale-105',
      inactive: 'bg-transparent text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-600 hover:text-white',
      icon: 'fa-circle-check'
    },
    [AdmissionStatus.DEFERRED]: {
      active: 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/30 scale-105',
      inactive: 'bg-transparent text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500 hover:text-white',
      icon: 'fa-circle-pause'
    },
    [AdmissionStatus.CANCELLED]: {
      active: 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-500/30 scale-105',
      inactive: 'bg-transparent text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-600 hover:text-white',
      icon: 'fa-circle-xmark'
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn pb-12 transition-colors duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{isEditing ? 'Edit Candidate' : 'Add New Candidate'}</h1>
          <p className="text-slate-500 dark:text-slate-400">Form ID: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{formData.id}</span></p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="px-6 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl transition-all text-sm">Cancel</button>
          <button onClick={saveCandidate} className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all text-sm">Save Record</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-800 overflow-hidden">
        <div className="flex border-b border-stone-100 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-800/50">
          <TabButton active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} icon="fa-user" label="Basic Info" />
          <TabButton active={activeTab === 'payment'} onClick={() => setActiveTab('payment')} icon="fa-credit-card" label="Fees & Payments" />
          <TabButton active={activeTab === 'travel'} onClick={() => setActiveTab('travel')} icon="fa-plane-arrival" label="Travel Details" />
        </div>

        <div className="p-8">
          {activeTab === 'personal' && (
            <div className="space-y-8">
              <section className="bg-stone-50/50 dark:bg-slate-800/30 p-6 rounded-2xl border border-dashed border-stone-200 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-layer-group text-indigo-500"></i> Admission Target
                </h3>
                <div className="max-w-md">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Select Admission Batch *</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-stone-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold"
                    value={formData.batchId}
                    onChange={(e) => setFormData(prev => ({ ...prev, batchId: e.target.value }))}
                  >
                    <option value="">Select Target Batch</option>
                    {/* Added fix: Map over batches state array */}
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} Intake</option>
                    ))}
                  </select>
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput label="Full Name *" value={formData.personalDetails?.fullName!} onChange={(v) => handlePersonalChange('fullName', v)} />
                <FormInput label="Email Address" type="email" value={formData.personalDetails?.email!} onChange={(v) => handlePersonalChange('email', v)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormSelect label="Gender" value={formData.personalDetails?.gender!} onChange={(v) => handlePersonalChange('gender', v)} options={['Male', 'Female']} />
                  <FormSelect label="Medium" value={formData.personalDetails?.medium!} onChange={(v) => handlePersonalChange('medium', v)} options={['English', 'Hindi', 'Urdu']} />
                </div>
                <FormInput label="Qualification" placeholder="e.g. Graduate" value={formData.personalDetails?.qualification!} onChange={(v) => handlePersonalChange('qualification', v)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ContactInput label="Calling Number" value={formData.contactDetails?.callingNumber!} onChange={(v) => handleContactChange('callingNumber', v)} />
                <ContactInput label="WhatsApp Number" value={formData.contactDetails?.whatsappNumber!} onChange={(v) => handleContactChange('whatsappNumber', v)} icon="fa-brands fa-whatsapp text-emerald-500" />
                <ContactInput label="Emergency Contact" value={formData.contactDetails?.emergencyContact!} onChange={(v) => handleContactChange('emergencyContact', v)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Permanent Address</label>
                  <textarea 
                    rows={2}
                    className="w-full px-4 py-2 bg-stone-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-stone-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={formData.addressDetails?.address}
                    onChange={(e) => handleAddressChange('address', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">State / UT *</label>
                    <select 
                      className="w-full px-4 py-2 bg-stone-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-stone-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={formData.addressDetails?.state}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                    >
                      <option value="">Select State</option>
                      {Object.keys(INDIAN_STATE_DISTRICT_MAP).sort().map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">District *</label>
                    <select 
                      className="w-full px-4 py-2 bg-stone-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-stone-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={formData.addressDetails?.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                    >
                      <option value="">Select District</option>
                      {formData.addressDetails?.state && INDIAN_STATE_DISTRICT_MAP[formData.addressDetails.state]?.sort().map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <FormInput label="Pincode" maxLength={6} value={formData.addressDetails?.pincode!} onChange={(v) => handleAddressChange('pincode', v.replace(/\D/g, ''))} />
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-8">
              <div className="bg-indigo-900 dark:bg-indigo-950 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl">
                <div>
                  <p className="text-indigo-200 text-sm font-medium uppercase tracking-widest mb-1">Total Fee Structure</p>
                  <h2 className="text-3xl font-bold">₹{TOTAL_FEES.toLocaleString()}</h2>
                </div>
                <div className="flex gap-4">
                  <div className="text-center px-4 py-2 bg-white/10 rounded-xl">
                    <p className="text-xs text-indigo-200">Total Paid</p>
                    <p className="text-xl font-bold">₹{formData.paymentHistory?.reduce((s, p) => s + p.amount, 0).toLocaleString()}</p>
                  </div>
                  <div className="text-center px-4 py-2 bg-white/10 rounded-xl">
                    <p className="text-xs text-indigo-200">Balance</p>
                    <p className="text-xl font-bold text-rose-300">₹{(TOTAL_FEES - formData.paymentHistory?.reduce((s, p) => s + p.amount, 0)!).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Payment Timeline</h3>
                  <div className="space-y-4">
                    {formData.paymentHistory?.map((p, idx) => (
                      <div key={p.id} className="flex gap-4 relative">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 z-10 border border-indigo-100 dark:border-slate-700">
                          <i className="fa-solid fa-check text-xs"></i>
                        </div>
                        <div className="bg-stone-50 dark:bg-slate-800/50 p-4 rounded-xl flex-1 border border-stone-100 dark:border-slate-800">
                          <span className="font-bold text-slate-900 dark:text-slate-100">₹{p.amount.toLocaleString()}</span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">UTR: {p.utr} • {new Date(p.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-stone-50 dark:bg-slate-800 p-6 rounded-2xl border border-stone-200 dark:border-slate-700">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Add Payment Record</h3>
                  <div className="space-y-4">
                    <FormInput label="Amount Paid (₹)" type="number" value={newPayment.amount} onChange={(v) => setNewPayment(p => ({...p, amount: v}))} />
                    <FormInput label="UTR / Transaction ID" value={newPayment.utr} onChange={(v) => setNewPayment(p => ({...p, utr: v}))} />
                    <button onClick={addPayment} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors mt-2">
                      Update Ledger
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'travel' && (
            <div className="space-y-8">
              <section className="bg-stone-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-stone-200 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Travel & Arrival</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormSelect label="Travel Mode" value={formData.travelDetails?.mode!} onChange={(v) => handleTravelChange('mode', v)} options={['None', 'Train', 'Flight', 'Bus']} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Arrival Date" type="date" value={formData.travelDetails?.arrivalDate!} onChange={(v) => handleTravelChange('arrivalDate', v)} />
                    <FormInput label="Arrival Time" type="time" value={formData.travelDetails?.arrivalTime!} onChange={(v) => handleTravelChange('arrivalTime', v)} />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 p-8 bg-slate-900 dark:bg-slate-900 text-white rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 border border-white/10 shadow-2xl transition-colors duration-300">
        <div className="max-w-md text-center md:text-left">
          <h3 className="text-xl font-black mb-1">Enrollment Status</h3>
          <p className="text-slate-400 text-xs italic">Set the current stage of this candidate.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {Object.values(AdmissionStatus).map(s => (
            <button
              key={s}
              onClick={() => setFormData(prev => ({ ...prev, status: s }))}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black tracking-widest transition-all border-2 uppercase
                ${formData.status === s ? statusStyles[s].active : statusStyles[s].inactive}
              `}
            >
              <i className={`fa-solid ${statusStyles[s].icon}`}></i>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: string, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-3 py-4 text-sm font-bold transition-all border-b-2 ${
      active ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400' : 'text-slate-500 border-transparent hover:text-slate-700'
    }`}>
    <i className={`fa-solid ${icon}`}></i>
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const FormInput: React.FC<{ label: string, value: string, onChange: (v: string) => void, type?: string, placeholder?: string, maxLength?: number }> = ({ label, value, onChange, type = 'text', placeholder, maxLength }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
    <input type={type} placeholder={placeholder} maxLength={maxLength} className="w-full px-4 py-2 bg-stone-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-stone-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const FormSelect: React.FC<{ label: string, value: string, onChange: (v: any) => void, options: string[] }> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
    <select className="w-full px-4 py-2 bg-stone-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-stone-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const ContactInput: React.FC<{ label: string, value: string, onChange: (v: string) => void, icon?: string }> = ({ label, value, onChange, icon = 'fa-solid fa-phone' }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
    <div className="relative">
      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium text-xs">+91</span>
      <input type="text" className="w-full pl-12 pr-4 py-2 bg-stone-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-stone-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="10 digit" value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />
    </div>
  </div>
);
