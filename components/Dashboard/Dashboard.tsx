
import React, { useMemo, useState, useEffect } from 'react';
import { User, UserRole, Candidate, PaymentStatus, AdmissionStatus, Batch } from '../../types';
import { StorageService } from '../../services/storageService';
import { TOTAL_FEES } from '../../constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, Cell as RechartsCell 
} from 'recharts';

interface DashboardProps {
  user: User;
  onAddNew: () => void;
}

type TimeRange = 'today' | 'week' | 'month' | 'custom';

export const Dashboard: React.FC<DashboardProps> = ({ user, onAddNew }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [data, setData] = useState<{ candidates: Candidate[], users: User[], batches: Batch[] }>({
    candidates: [], users: [], batches: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [candidates, users, batches] = await Promise.all([
          StorageService.getCandidates(),
          StorageService.getUsers(),
          StorageService.getBatches()
        ]);
        setData({ candidates, users, batches });
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredCandidates = useMemo(() => {
    let list = (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.VIEW_ONLY)
      ? data.candidates 
      : data.candidates.filter(c => c.executiveId === user.id);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    const startOfMonth = now.getTime() - (30 * 24 * 60 * 60 * 1000);

    return list.filter(c => {
      if (timeRange === 'today') return c.createdAt >= startOfToday;
      if (timeRange === 'week') return c.createdAt >= startOfWeek;
      if (timeRange === 'month') return c.createdAt >= startOfMonth;
      if (timeRange === 'custom' && customRange.start && customRange.end) {
        const start = new Date(customRange.start).getTime();
        const end = new Date(customRange.end).setHours(23, 59, 59, 999);
        return c.createdAt >= start && c.createdAt <= end;
      }
      return true;
    });
  }, [user, data.candidates, timeRange, customRange]);

  const stats = useMemo(() => {
    const totalAdmissions = filteredCandidates.filter(c => c.status === AdmissionStatus.CONFIRMED).length;
    const advancePaid = filteredCandidates.filter(c => c.paymentStatus === PaymentStatus.ADVANCE_PAID).length;
    const fullyPaid = filteredCandidates.filter(c => c.paymentStatus === PaymentStatus.FULLY_PAID).length;
    
    let totalRevenue = 0;
    filteredCandidates.forEach(c => {
      c.paymentHistory.forEach(p => totalRevenue += p.amount);
    });

    const expectedTotal = filteredCandidates.filter(c => c.status !== AdmissionStatus.CANCELLED).length * TOTAL_FEES;
    const pendingBalance = expectedTotal - totalRevenue;

    return { totalAdmissions, totalRevenue, pendingBalance, advancePaid, fullyPaid };
  }, [filteredCandidates]);

  const batchChartData = data.batches.map(b => ({
    name: b.name,
    count: filteredCandidates.filter(c => c.batchId === b.id).length
  }));

  const statusData = [
    { name: 'Confirmed', value: filteredCandidates.filter(c => c.status === AdmissionStatus.CONFIRMED).length, color: '#10b981' },
    { name: 'Deferred', value: filteredCandidates.filter(c => c.status === AdmissionStatus.DEFERRED).length, color: '#f59e0b' },
    { name: 'Cancelled', value: filteredCandidates.filter(c => c.status === AdmissionStatus.CANCELLED).length, color: '#ef4444' }
  ];

  const executivePerformance = useMemo(() => {
    const executives = data.users.filter(u => u.role === UserRole.EXECUTIVE);
    return executives.map(exec => {
      const count = filteredCandidates.filter(c => c.executiveId === exec.id).length;
      return { name: exec.name, admissions: count, id: exec.id };
    }).sort((a, b) => b.admissions - a.admissions);
  }, [data.users, filteredCandidates]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <i className="fa-solid fa-circle-notch animate-spin text-4xl text-indigo-600"></i>
          <p className="text-slate-500 font-bold animate-pulse">Syncing with Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-12 transition-colors duration-300">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admission Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Database connected. Performance report for {user.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-stone-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['today', 'week', 'month', 'custom'] as TimeRange[]).map(range => (
              <button key={range} onClick={() => setTimeRange(range)} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${timeRange === range ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                {range}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Total Admissions" value={stats.totalAdmissions} icon="fa-user-check" color="bg-indigo-600" />
        <StatCard title="Advance Paid" value={stats.advancePaid} icon="fa-ticket" color="bg-amber-500" />
        <StatCard title="Fully Paid" value={stats.fullyPaid} icon="fa-circle-check" color="bg-teal-600" />
        <StatCard title="Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon="fa-indian-rupee-sign" color="bg-blue-600" />
        <StatCard title="Balance" value={`₹${stats.pendingBalance.toLocaleString()}`} icon="fa-receipt" color="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Batch distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={batchChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip cursor={false} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff', borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">Status Mix</h3>
          <div className="h-64 flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value">
                  {statusData.map((entry, index) => <RechartsCell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string | number, icon: string, color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-slate-800 flex items-center gap-5 hover:scale-[1.02] transition-all group">
    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg group-hover:rotate-6 transition-transform shrink-0`}>
      <i className={`fa-solid ${icon} text-2xl`}></i>
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 truncate">{title}</p>
      <h4 className="text-lg xl:text-xl font-black text-slate-900 dark:text-slate-100 truncate">{value}</h4>
    </div>
  </div>
);
