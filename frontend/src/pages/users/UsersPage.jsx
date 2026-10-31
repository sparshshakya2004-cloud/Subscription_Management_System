import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Shield,
  Lock,
  Mail,
  User,
  Phone,
  Power,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { userService } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';

export const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);

  const [staffForm, setStaffForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
  });

  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getAll();
      setUsers(res.data || []);
    } catch (err) {
      showToast('error', 'Failed to load user list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Password validation check
  const pwd = staffForm.password;
  const isLen = pwd.length > 8;
  const isUpper = /[A-Z]/.test(pwd);
  const isLower = /[a-z]/.test(pwd);
  const isSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
  const isPasswordValid = isLen && isUpper && isLower && isSpecial;

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      showToast('error', 'Password must satisfy all security rules.');
      return;
    }

    try {
      await userService.createStaff(staffForm);
      showToast('success', `Staff account for ${staffForm.full_name} created!`);
      setIsAddStaffModalOpen(false);
      setStaffForm({ full_name: '', email: '', password: '', phone: '' });
      loadUsers();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Failed to create staff account.');
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await userService.toggleStatus(user.id, nextStatus);
      showToast('success', res.data.message);
      loadUsers();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Failed to update user status.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            User Account & Staff Administration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administer system logins, onboard internal staff, and manage role-based permissions.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddStaffModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Internal Staff</span>
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">User ID</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">USR-{u.id.toString().padStart(4, '0')}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{u.full_name}</td>
                  <td className="px-6 py-4 text-slate-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        u.role_name === 'Admin'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : u.role_name === 'Internal Staff'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {u.role_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{u.phone || '—'}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.role_name !== 'Admin' && (
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                          u.status === 'active'
                            ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {u.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard Staff Modal */}
      <Modal
        isOpen={isAddStaffModalOpen}
        onClose={() => setIsAddStaffModalOpen(false)}
        title="Onboard Internal Staff Member"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={staffForm.full_name}
                onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                placeholder="Sarah Connor"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                placeholder="sarah@brightloop.com"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={staffForm.phone}
                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                placeholder="+91 98765 43212"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={staffForm.password}
                onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                placeholder="Set secure password"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className={`flex items-center gap-2 ${isLen ? 'text-emerald-700' : 'text-slate-400'}`}>
                {isLen ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>More than 8 characters</span>
              </div>
              <div className={`flex items-center gap-2 ${isUpper ? 'text-emerald-700' : 'text-slate-400'}`}>
                {isUpper ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>At least one uppercase letter (A-Z)</span>
              </div>
              <div className={`flex items-center gap-2 ${isLower ? 'text-emerald-700' : 'text-slate-400'}`}>
                {isLower ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>At least one lowercase letter (a-z)</span>
              </div>
              <div className={`flex items-center gap-2 ${isSpecial ? 'text-emerald-700' : 'text-slate-400'}`}>
                {isSpecial ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>At least one special character</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddStaffModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isPasswordValid}
              className={`px-5 py-2 rounded-xl font-medium text-sm transition-all ${
                isPasswordValid
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              Create Staff Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UsersPage;
