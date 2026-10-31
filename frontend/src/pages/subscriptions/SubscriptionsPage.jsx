import React, { useState, useEffect } from 'react';
import {
  Repeat,
  Search,
  Filter,
  Plus,
  Play,
  Pause,
  XCircle,
  RotateCw,
  Eye,
  Calendar,
  CreditCard,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { subscriptionService, customerService, planService, productService } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';

export const SubscriptionsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSubDetail, setSelectedSubDetail] = useState(null);
  const [actionConfirm, setActionConfirm] = useState(null); // { sub, action: 'pause' | 'resume' | 'close' | 'renew' }
  const [pauseReason, setPauseReason] = useState('');

  // Create Subscription Form
  const [createForm, setCreateForm] = useState({
    customer_id: '',
    plan_id: '',
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    payment_terms: 'Net 30',
    auto_close: false,
    notes: '',
    lines: [{ product_id: '', quantity: 1, unit_price: '', tax_rate: 18.0, discount_amount: 0 }],
  });

  const { isStaff, isAdmin } = useAuth();
  const { showToast } = useToast();

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const [subsRes, custsRes, plansRes, prodsRes] = await Promise.all([
        subscriptionService.getAll({
          search: search || undefined,
          status: statusFilter || undefined,
        }),
        customerService.getAll({ status: 'active' }),
        planService.getAll({ status: 'active' }),
        productService.getAll({ status: 'active' }),
      ]);
      setSubscriptions(subsRes.data || []);
      setCustomers(custsRes.data || []);
      setPlans(plansRes.data || []);
      setProducts(prodsRes.data || []);
    } catch (err) {
      showToast('error', 'Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [search, statusFilter]);

  const handlePlanChange = (planId) => {
    const selectedPlan = plans.find((p) => p.id === parseInt(planId));
    if (selectedPlan) {
      const prod = products.find((pr) => pr.id === selectedPlan.product_id);
      setCreateForm({
        ...createForm,
        plan_id: planId,
        auto_close: selectedPlan.auto_close,
        lines: [
          {
            product_id: selectedPlan.product_id,
            quantity: selectedPlan.minimum_quantity || 1,
            unit_price: selectedPlan.plan_price,
            tax_rate: 18.0,
            discount_amount: 0,
          },
        ],
      });
    } else {
      setCreateForm({ ...createForm, plan_id: planId });
    }
  };

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        customer_id: parseInt(createForm.customer_id),
        plan_id: parseInt(createForm.plan_id),
        start_date: createForm.start_date,
        expiry_date: createForm.expiry_date || null,
        payment_terms: createForm.payment_terms,
        auto_close: createForm.auto_close,
        notes: createForm.notes,
        lines: createForm.lines.map((l) => ({
          product_id: parseInt(l.product_id),
          quantity: parseInt(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
          tax_rate: parseFloat(l.tax_rate) || 0,
          discount_amount: parseFloat(l.discount_amount) || 0,
        })),
      };
      await subscriptionService.create(payload);
      showToast('success', 'Subscription activated successfully!');
      setIsCreateModalOpen(false);
      loadSubscriptions();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Failed to activate subscription.');
    }
  };

  const handleExecuteAction = async () => {
    if (!actionConfirm) return;
    const { sub, action } = actionConfirm;
    try {
      const res = await subscriptionService.lifecycleAction(sub.id, {
        action,
        reason: action === 'pause' ? pauseReason : undefined,
      });
      showToast('success', res.data.message || `Subscription ${action}d successfully.`);
      setActionConfirm(null);
      setPauseReason('');
      loadSubscriptions();
    } catch (err) {
      showToast('error', err.response?.data?.detail || `Failed to ${action} subscription.`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Subscription Lifecycle Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor active contracts, manage automated recurrence, and execute lifecycle operations (Pause, Resume, Close, Renew).
          </p>
        </div>

        {(isAdmin || isStaff) && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Subscription</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 card-shadow flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subscription # or customer..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Subscription #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Plan Name</th>
                <th className="px-6 py-4">Start / Expiry</th>
                <th className="px-6 py-4">Next Billing Date</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Loading subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">{sub.subscription_number}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{sub.customer_name}</td>
                    <td className="px-6 py-4 text-slate-600">{sub.plan_name}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <div>{sub.start_date}</div>
                      <div className="text-[11px] text-slate-400">Exp: {sub.expiry_date || 'Ongoing'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-medium text-blue-600">
                      {sub.next_billing_date}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₹{Number(sub.total_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details */}
                        <button
                          onClick={() => setSelectedSubDetail(sub)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Lines"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {(isAdmin || isStaff) && (
                          <>
                            {/* Pause / Resume */}
                            {sub.status === 'active' && sub.pause_allowed && (
                              <button
                                onClick={() => setActionConfirm({ sub, action: 'pause' })}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Pause Subscription"
                              >
                                <Pause className="w-4 h-4" />
                              </button>
                            )}

                            {sub.status === 'paused' && (
                              <button
                                onClick={() => setActionConfirm({ sub, action: 'resume' })}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Resume Subscription"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}

                            {/* Renew */}
                            {sub.renewal_allowed && (
                              <button
                                onClick={() => setActionConfirm({ sub, action: 'renew' })}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Renew Contract (+1 Year)"
                              >
                                <RotateCw className="w-4 h-4" />
                              </button>
                            )}

                            {/* Early Close */}
                            {sub.status !== 'closed' && (
                              <button
                                onClick={() => setActionConfirm({ sub, action: 'close' })}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Close Subscription"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Subscription Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Activate New Subscription"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubscription} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Customer *</label>
              <select
                value={createForm.customer_id}
                onChange={(e) => setCreateForm({ ...createForm, customer_id: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.contact_name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Subscription Plan *</label>
              <select
                value={createForm.plan_id}
                onChange={(e) => handlePlanChange(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select plan...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.plan_name} (₹{p.plan_price} / {p.billing_frequency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Start Date *</label>
              <input
                type="date"
                value={createForm.start_date}
                onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Expiry Date</label>
              <input
                type="date"
                value={createForm.expiry_date}
                onChange={(e) => setCreateForm({ ...createForm, expiry_date: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payment Terms</label>
              <select
                value={createForm.payment_terms}
                onChange={(e) => setCreateForm({ ...createForm, payment_terms: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="Net 30">Net 30</option>
                <option value="Net 15">Net 15</option>
                <option value="Immediate">Immediate</option>
              </select>
            </div>
          </div>

          {/* Lines breakdown */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase">Subscription Line Product</div>
            {createForm.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500">Unit Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={l.unit_price}
                    onChange={(e) => {
                      const updated = [...createForm.lines];
                      updated[i].unit_price = e.target.value;
                      setCreateForm({ ...createForm, lines: updated });
                    }}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Seats / Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={l.quantity}
                    onChange={(e) => {
                      const updated = [...createForm.lines];
                      updated[i].quantity = e.target.value;
                      setCreateForm({ ...createForm, lines: updated });
                    }}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">GST Rate (%)</label>
                  <input
                    type="number"
                    value={l.tax_rate}
                    onChange={(e) => {
                      const updated = [...createForm.lines];
                      updated[i].tax_rate = e.target.value;
                      setCreateForm({ ...createForm, lines: updated });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={createForm.auto_close}
              onChange={(e) => setCreateForm({ ...createForm, auto_close: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Auto-close this subscription upon reaching expiration date.</span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20"
            >
              Activate Subscription
            </button>
          </div>
        </form>
      </Modal>

      {/* Subscription Detail Modal */}
      <Modal
        isOpen={!!selectedSubDetail}
        onClose={() => setSelectedSubDetail(null)}
        title={`Subscription: ${selectedSubDetail?.subscription_number}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <div className="text-slate-500">Customer Organization:</div>
              <div className="font-bold text-slate-800 text-sm mt-0.5">{selectedSubDetail?.customer_name}</div>
            </div>
            <div>
              <div className="text-slate-500">Status:</div>
              <div className="mt-1"><StatusBadge status={selectedSubDetail?.status} /></div>
            </div>
            <div>
              <div className="text-slate-500">Contract Term:</div>
              <div className="font-medium text-slate-800 mt-0.5">
                {selectedSubDetail?.start_date} → {selectedSubDetail?.expiry_date || 'No Expiration'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Next Scheduled Billing Date:</div>
              <div className="font-bold text-blue-600 mt-0.5">{selectedSubDetail?.next_billing_date}</div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2">Product / Variant Line</th>
                  <th className="px-4 py-2">Qty</th>
                  <th className="px-4 py-2">Unit Price</th>
                  <th className="px-4 py-2">Tax</th>
                  <th className="px-4 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedSubDetail?.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-2.5 font-medium">
                      {line.product_name}
                      {line.variant_option_name && (
                        <span className="block text-[11px] text-blue-600">Option: {line.variant_option_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">{line.quantity}</td>
                    <td className="px-4 py-2.5">₹{Number(line.unit_price).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2.5">{line.tax_rate}% (₹{Number(line.tax_amount).toLocaleString('en-IN')})</td>
                    <td className="px-4 py-2.5 font-bold">₹{Number(line.line_amount).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-right text-xs space-y-1">
            <div>Subtotal: ₹{Number(selectedSubDetail?.subtotal || 0).toLocaleString('en-IN')}</div>
            <div>Tax: +₹{Number(selectedSubDetail?.tax_amount || 0).toLocaleString('en-IN')}</div>
            {Number(selectedSubDetail?.discount_amount || 0) > 0 && (
              <div className="text-emerald-600">Discount: -₹{Number(selectedSubDetail.discount_amount).toLocaleString('en-IN')}</div>
            )}
            <div className="text-base font-bold text-slate-900 pt-1 border-t">
              Total Amount: ₹{Number(selectedSubDetail?.total_amount || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </Modal>

      {/* Lifecycle Action Modal */}
      {actionConfirm && (
        <ConfirmModal
          isOpen={!!actionConfirm}
          onClose={() => {
            setActionConfirm(null);
            setPauseReason('');
          }}
          onConfirm={handleExecuteAction}
          title={`Confirm Subscription ${actionConfirm.action.toUpperCase()}`}
          message={
            actionConfirm.action === 'pause'
              ? `Are you sure you want to pause subscription ${actionConfirm.sub.subscription_number}? Recurring billing will be temporarily halted.`
              : actionConfirm.action === 'resume'
              ? `Resume subscription ${actionConfirm.sub.subscription_number} and re-enable recurring billing cycles?`
              : actionConfirm.action === 'renew'
              ? `Extend subscription contract for ${actionConfirm.sub.subscription_number} for an additional year?`
              : `Terminate subscription ${actionConfirm.sub.subscription_number}? Once closed, recurring invoices will cease.`
          }
          confirmText={`Yes, ${actionConfirm.action.charAt(0).toUpperCase() + actionConfirm.action.slice(1)}`}
          danger={actionConfirm.action === 'close'}
        />
      )}
    </div>
  );
};

export default SubscriptionsPage;
