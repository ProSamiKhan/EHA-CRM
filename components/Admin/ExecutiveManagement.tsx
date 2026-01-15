
import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { StorageService } from '../../services/storageService';
import { AuthService } from '../../services/authService';

export const ExecutiveManagement: React.FC = () => {
  // Added fix: Fetch users asynchronously on mount
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: UserRole.EXECUTIVE });

  useEffect(() => {
    StorageService.getUsers().then(setUsers);
  }, []);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username) return;

    if (editingUser) {
      const updatedUser: User = {
        ...editingUser,
        name: formData.name,
        username: formData.username,
        role: formData.role
      };
      // Added fix: Await asynchronous saveUser operation
      await StorageService.saveUser(updatedUser, formData.password || undefined);
      setEditingUser(null);
    } else {
      if (!formData.password) {
        alert("Password is required for new accounts");
        return;
      }
      const id = `user-${Date.now()}`;
      const newUser: User = {
        id,
        name: formData.name,
        username: formData.username,
        role: formData.role,
        isActive: true
      };
      // Added fix: Await asynchronous saveUser operation
      await StorageService.saveUser(newUser, formData.password);
    }

    // Added fix: Refresh users state after operation
    const updated = await StorageService.getUsers();
    setUsers(updated);
    setFormData({ name: '', username: '', password: '', role: UserRole.EXECUTIVE });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: '',
      role: user.role
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Permanently delete this account? This action cannot be undone.")) {
      // Added fix: Use the implemented deleteUser method and refresh state
      await StorageService.deleteUser(id);
      const updated = await StorageService.getUsers();
      setUsers(updated);
    }
  };

  const toggleStatus = async (user: User) => {
    const updatedUser = { ...user, isActive: !user.isActive };
    // Added fix: Await saveUser and refresh state
    await StorageService.saveUser(updatedUser);
    const updated = await StorageService.getUsers();
    setUsers(updated);
  };

  const filteredUsers = useMemo(() => {
    // Filter out current logged in user to prevent self-deletion/lockout if needed
    // But for now show all
    return [...users].sort((a, b) => a.role.localeCompare(b.role));
  }, [users]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-12 transition-colors duration-300">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-500">Manage all staff members, roles, and system access.</p>
      </header>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
          <i className={`fa-solid ${editingUser ? 'fa-user-pen text-amber-500' : 'fa-user-plus text-indigo-600'}`}></i>
          {editingUser ? `Edit Account: ${editingUser.name}` : 'Create New Staff Account'}
        </h3>
        <form onSubmit={handleCreateOrUpdate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Display Name</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Username / Login ID</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Role</label>
            <select 
              className="w-full px-4 py-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
            >
              <option value={UserRole.EXECUTIVE}>Executive</option>
              <option value={UserRole.VIEW_ONLY}>View Only</option>
              <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              {editingUser ? 'New Password (Optional)' : 'Password *'}
            </label>
            <input 
              type="password" 
              className="w-full px-4 py-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            />
          </div>
          <div className="md:col-span-4 flex justify-end gap-3 mt-2">
            {editingUser && (
              <button 
                type="button"
                onClick={() => {
                   setEditingUser(null);
                   setFormData({ name: '', username: '', password: '', role: UserRole.EXECUTIVE });
                }}
                className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm"
              >
                Cancel
              </button>
            )}
            <button 
              type="submit"
              className={`px-8 py-2.5 text-white font-bold rounded-xl transition-all shadow-lg text-sm ${
                editingUser ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
              }`}
            >
              {editingUser ? 'Update Account' : 'Provision Account'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4 font-bold">User Information</th>
              <th className="px-6 py-4 font-bold">Username</th>
              <th className="px-6 py-4 font-bold">Role</th>
              <th className="px-6 py-4 font-bold">Status</th>
              <th className="px-6 py-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                       u.role === UserRole.SUPER_ADMIN ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {u.name.charAt(0)}
                    </div>
                    <div>
                       <span className="font-bold text-slate-900 block">{u.name}</span>
                       <span className="text-[10px] text-slate-400 font-mono">ID: {u.id}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500 font-mono text-sm">{u.username}</td>
                <td className="px-6 py-4">
                   <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tight border ${
                      u.role === UserRole.SUPER_ADMIN ? 'border-indigo-200 text-indigo-600 bg-indigo-50' : 
                      u.role === UserRole.VIEW_ONLY ? 'border-amber-200 text-amber-600 bg-amber-50' :
                      'border-slate-200 text-slate-500 bg-slate-50'
                   }`}>
                      {u.role.replace('_', ' ')}
                   </span>
                </td>
                <td className="px-6 py-4">
                   <button 
                     onClick={() => toggleStatus(u)}
                     className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tight transition-all ${
                       u.isActive !== false 
                         ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100' 
                         : 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100'
                     }`}
                   >
                     {u.isActive !== false ? 'Active' : 'Inactive'}
                   </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(u)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit User"
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button 
                      onClick={() => handleDelete(u.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Permanently"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
