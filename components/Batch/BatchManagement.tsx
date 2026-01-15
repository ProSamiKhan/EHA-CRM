
import React, { useState, useMemo, useEffect } from 'react';
import { Batch, Candidate, AdmissionStatus } from '../../types';
import { StorageService } from '../../services/storageService';

export const BatchManagement: React.FC = () => {
  // Added fix: Use useEffect to fetch batches and candidates asynchronously
  const [batches, setBatches] = useState<Batch[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  
  // Create Form State
  const [newBatch, setNewBatch] = useState({ name: '', maxSeats: '60' });

  useEffect(() => {
    const loadData = async () => {
      const [b, c] = await Promise.all([
        StorageService.getBatches(),
        StorageService.getCandidates()
      ]);
      setBatches(b);
      setCandidates(c);
    };
    loadData();
  }, []);

  const getFilledSeats = (batchId: string) => {
    return candidates.filter(c => c.batchId === batchId && c.status !== AdmissionStatus.CANCELLED).length;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatch.name.trim()) return;

    const batch: Batch = {
      id: `batch-${Date.now()}`,
      name: newBatch.name,
      maxSeats: Number(newBatch.maxSeats) || 60,
      createdAt: Date.now()
    };

    // Added fix: Await saveBatch and refresh batches list
    await StorageService.saveBatch(batch);
    const updated = await StorageService.getBatches();
    setBatches(updated);
    setNewBatch({ name: '', maxSeats: '60' });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch || !editingBatch.name.trim()) return;

    // Added fix: Await saveBatch and refresh batches list
    await StorageService.saveBatch(editingBatch);
    const updated = await StorageService.getBatches();
    setBatches(updated);
    setEditingBatch(null);
  };

  const handleDelete = async (id: string) => {
    const filled = getFilledSeats(id);
    if (filled > 0) {
      alert("Cannot delete a batch that has active admissions. Please move or cancel candidates first.");
      return;
    }
    if (confirm("Are you sure you want to delete this batch permanently?")) {
      // Added fix: Use the implemented deleteBatch method and refresh state
      await StorageService.deleteBatch(id);
      const updated = await StorageService.getBatches();
      setBatches(updated);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn transition-colors duration-300">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Batch Management</h1>
        <p className="text-slate-500">Create, monitor, and manage intake capacity.</p>
      </header>

      {/* Forms Section */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
          <i className="fa-solid fa-plus-circle text-indigo-600"></i>
          {editingBatch ? 'Edit Batch Details' : 'Initialize New Batch'}
        </h3>
        
        <form onSubmit={editingBatch ? handleUpdate : handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Batch Name / Intake *</label>
            <input 
              type="text" 
              placeholder="e.g. July 2026 Regular"
              className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={editingBatch ? editingBatch.name : newBatch.name}
              onChange={(e) => editingBatch 
                ? setEditingBatch({ ...editingBatch, name: e.target.value }) 
                : setNewBatch({ ...newBatch, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Total Capacity (Seats) *</label>
            <input 
              type="number" 
              className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={editingBatch ? editingBatch.maxSeats : newBatch.maxSeats}
              onChange={(e) => editingBatch 
                ? setEditingBatch({ ...editingBatch, maxSeats: Number(e.target.value) }) 
                : setNewBatch({ ...newBatch, maxSeats: e.target.value })}
            />
          </div>
          <div className="flex gap-2 self-end">
            <button 
              type="submit"
              className={`flex-1 px-8 py-2 font-bold rounded-lg transition-all shadow-lg shadow-indigo-100 ${
                editingBatch ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {editingBatch ? 'Save Changes' : 'Create Batch'}
            </button>
            {editingBatch && (
              <button 
                type="button"
                onClick={() => setEditingBatch(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4 font-bold">Batch Name</th>
              <th className="px-6 py-4 font-bold text-center">Filled Seats</th>
              <th className="px-6 py-4 font-bold">Occupancy Progress</th>
              <th className="px-6 py-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batches.map(b => {
              const filled = getFilledSeats(b.id);
              const percent = Math.min(100, Math.round((filled / b.maxSeats) * 100));
              const isFull = filled >= b.maxSeats;

              return (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{b.name}</div>
                    <div className="text-[10px] text-slate-400">Created: {new Date(b.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                      isFull ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {filled} / {b.maxSeats}
                    </span>
                  </td>
                  <td className="px-6 py-4 min-w-[200px]">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            percent > 90 ? 'bg-rose-500' : percent > 50 ? 'bg-indigo-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{percent}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingBatch(b)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Batch"
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button 
                        onClick={() => handleDelete(b.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Batch"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {batches.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                  No batches configured yet. Please create one to start admissions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
