import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  PauseCircle,
  RotateCw,
  Power,
  XCircle,
} from 'lucide-react';
import { planService, productService } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';

export const PlansPage = () => {
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [freqFilter, setFreqFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    plan_code: '',
    plan_name: '',
    product_id: '',
    plan_price: '',
    billing_frequency: 'monthly',
    minimum_quantity: 1,
    start_availability_date: new Date().toISOString().split('T')[0],
    end_availability_date: '',
    auto_close: false,
    early_closure_allowed: true,
    pause_allowed: true,
    renewal_allowed: true,
    status: 'active',
  });

  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, prodsRes] = await Promise.all([
        planService.getAll({ frequency: freqFilter || undefined }),
        productService.getAll({ status: 'active' }),
      ]);
      setPlans(plansRes.data || []);
      setProducts(prodsRes.data || []);
    } catch (err) {
      showToast('error', 'Failed to load subscription plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [freqFilter]);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      await planService.create({
        ...formData,
        product_id: parseInt(formData.product_id),
        plan_price: parseFloat(formData.plan_price) || 0,
        minimum_quantity: parseInt(formData.minimum_quantity) || 1,
        end_availability_date: formData.end_availability_date || null,
      });
      showToast('success', `Subscription plan ${formData.plan_name} created!`);
      setIsAddModalOpen(false);
      setFormData({
        plan_code: '',
        plan_name: '',
        product_id: '',
        plan_price: '',
        billing_frequency: 'monthly',
        minimum_quantity: 1,
        start_availability_date: new Date().toISOString().split('T')[0],
        end_availability_date: '',
        auto_close: false,
        early_closure_allowed: true,
        pause_allowed: true,
        renewal_allowed: true,
        status: 'active',
      });
      loadData();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Failed to create plan.');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await planService.toggleStatus(id);
      showToast('success', res.data.message);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to toggle status.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Subscription Plan Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure recurring billing cadences (Daily, Weekly, Monthly, Yearly), lifecycle flags, and availability dates.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
          </button>
        )}
      </div>

      {/* Frequency Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['', 'daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
          <button
            key={freq}
            onClick={() => setFreqFilter(freq)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors capitalize ${
              freqFilter === freq
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {freq === '' ? 'All Frequencies' : freq}
          </button>
        ))}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
            Loading plans...
          </div>
        ) : plans.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            No plans found for this frequency.
          </div>
        ) : (
          plans.map((p) => (
            <div
              key={p.id}
              className={`bg-white rounded-2xl p-6 border transition-all card-shadow card-shadow-hover flex flex-col justify-between ${
                p.status === 'active' ? 'border-slate-200/80' : 'border-slate-200/50 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {p.plan_code}
                  </span>
                  <StatusBadge status={p.status} />
                </div>

                <h3 className="text-lg font-bold text-slate-900 leading-snug">{p.plan_name}</h3>
                <div className="text-xs text-blue-600 font-medium mt-0.5">Product: {p.product_name}</div>

                <div className="mt-4 mb-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">
                    ₹{Number(p.plan_price).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500 font-medium capitalize">/ {p.billing_frequency}</span>
                </div>

                {/* Properties & Permissions checklist */}
                <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Min Quantity:</span>
                    <span className="font-semibold">{p.minimum_quantity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Availability:</span>
                    <span className="font-medium text-[11px]">
                      {p.start_availability_date} → {p.end_availability_date || 'Ongoing'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 pt-2 border-t border-slate-100/80 text-[11px]">
                    <span className={p.pause_allowed ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                      {p.pause_allowed ? '✓ Pause permitted' : '✗ No pause'}
                    </span>
                    <span className={p.renewal_allowed ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                      {p.renewal_allowed ? '✓ Renewal enabled' : '✗ No renewal'}
                    </span>
                    <span className={p.early_closure_allowed ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                      {p.early_closure_allowed ? '✓ Early close ok' : '✗ Locked term'}
                    </span>
                    <span className={p.auto_close ? 'text-amber-700 font-medium' : 'text-slate-400'}>
                      {p.auto_close ? '⚡ Auto-close at end' : 'Manual close'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Toggle Button (Admin) */}
              {isAdmin && (
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => handleToggleStatus(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      p.status === 'active'
                        ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
                        : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{p.status === 'active' ? 'Deactivate' : 'Activate'}</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Plan Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Subscription Plan">
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Plan Code *</label>
              <input
                type="text"
                value={formData.plan_code}
                onChange={(e) => setFormData({ ...formData, plan_code: e.target.value.toUpperCase() })}
                placeholder="PLAN-PRO-MO"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Plan Name *</label>
              <input
                type="text"
                value={formData.plan_name}
                onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                placeholder="Enterprise Cloud Monthly"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Associated Product *</label>
              <select
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select product...</option>
                {products.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Plan Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.plan_price}
                onChange={(e) => setFormData({ ...formData, plan_price: e.target.value })}
                placeholder="1200.00"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Frequency *</label>
              <select
                value={formData.billing_frequency}
                onChange={(e) => setFormData({ ...formData, billing_frequency: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 capitalize"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Min Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.minimum_quantity}
                onChange={(e) => setFormData({ ...formData, minimum_quantity: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.start_availability_date}
                onChange={(e) => setFormData({ ...formData, start_availability_date: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">End Date (Optional)</label>
              <input
                type="date"
                value={formData.end_availability_date}
                onChange={(e) => setFormData({ ...formData, end_availability_date: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Permissions / Checkbox toggles */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Subscription Lifecycle Rules & Flags
            </div>
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.auto_close}
                onChange={(e) => setFormData({ ...formData, auto_close: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span><b>Auto-close:</b> Automatically terminate subscription when configured expiry date arrives.</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.early_closure_allowed}
                onChange={(e) => setFormData({ ...formData, early_closure_allowed: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span><b>Early closure:</b> Customers / staff can close the subscription before expiration.</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.pause_allowed}
                onChange={(e) => setFormData({ ...formData, pause_allowed: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span><b>Pause permission:</b> Subscriptions under this plan can be paused and resumed.</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.renewal_allowed}
                onChange={(e) => setFormData({ ...formData, renewal_allowed: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span><b>Renewal permission:</b> Can be extended for subsequent billing terms.</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20"
            >
              Save Plan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PlansPage;
