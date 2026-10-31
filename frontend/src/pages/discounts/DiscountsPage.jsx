import React, { useState, useEffect } from 'react';
import {
  Percent,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Tag,
  ShieldCheck,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { discountService, productService } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';

export const DiscountsPage = () => {
  const [discounts, setDiscounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTesterOpen, setIsTesterOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    discount_code: '',
    name: '',
    discount_type: 'percentage',
    discount_value: '',
    min_purchase_amount: '0.00',
    min_quantity: 1,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    max_usage_limit: 100,
    applicable_product_ids: [],
  });

  // Tester Form
  const [testCode, setTestCode] = useState('');
  const [testSubtotal, setTestSubtotal] = useState('5000');
  const [testResult, setTestResult] = useState(null);

  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [discRes, prodsRes] = await Promise.all([
        discountService.getAll(),
        productService.getAll({ status: 'active' }),
      ]);
      setDiscounts(discRes.data || []);
      setProducts(prodsRes.data || []);
    } catch (err) {
      showToast('error', 'Failed to load discount rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDiscount = async (e) => {
    e.preventDefault();
    try {
      await discountService.create({
        ...formData,
        discount_code: formData.discount_code.toUpperCase().trim(),
        discount_value: parseFloat(formData.discount_value) || 0,
        min_purchase_amount: parseFloat(formData.min_purchase_amount) || 0,
        min_quantity: parseInt(formData.min_quantity) || 1,
        max_usage_limit: parseInt(formData.max_usage_limit) || 100,
      });
      showToast('success', `Discount ${formData.name} created!`);
      setIsAddModalOpen(false);
      setFormData({
        discount_code: '',
        name: '',
        discount_type: 'percentage',
        discount_value: '',
        min_purchase_amount: '0.00',
        min_quantity: 1,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        max_usage_limit: 100,
        applicable_product_ids: [],
      });
      loadData();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Failed to create discount.');
    }
  };

  const handleTestDiscount = async (e) => {
    e.preventDefault();
    try {
      const res = await discountService.validate(testCode, parseFloat(testSubtotal) || 0);
      setTestResult(res.data);
      showToast('success', 'Discount is eligible!');
    } catch (err) {
      setTestResult({
        valid: false,
        message: err.response?.data?.detail || 'Ineligible discount.',
      });
      showToast('warning', err.response?.data?.detail || 'Ineligible discount.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Discount & Promotional Rules
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administer volume discounts, seat-based coupons, and fixed/percentage billing reductions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTesterOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Eligibility Validator</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Discount Rule</span>
            </button>
          )}
        </div>
      </div>

      {/* Discounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {discounts.map((disc) => (
          <div
            key={disc.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 card-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {disc.discount_code}
                </span>
                <StatusBadge status={disc.is_active ? 'active' : 'inactive'} />
              </div>

              <h3 className="text-base font-bold text-slate-900 leading-snug">{disc.name}</h3>

              <div className="text-2xl font-extrabold text-emerald-600 mt-2 mb-3">
                {disc.discount_type === 'percentage' ? `${disc.discount_value}% Off` : `₹${disc.discount_value} Flat Off`}
              </div>

              <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Minimum Purchase:</span>
                  <span className="font-semibold">₹{Number(disc.min_purchase_amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Minimum Seats/Qty:</span>
                  <span className="font-semibold">{disc.min_quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Usage Count:</span>
                  <span className="font-semibold">
                    {disc.current_usage_count} / {disc.max_usage_limit} used
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                  <span>Active Term:</span>
                  <span>{disc.start_date} → {disc.end_date}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Discount Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create Discount Rule"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateDiscount} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Coupon Code *</label>
              <input
                type="text"
                value={formData.discount_code}
                onChange={(e) => setFormData({ ...formData, discount_code: e.target.value.toUpperCase() })}
                placeholder="BRIGHT20"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Discount Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enterprise Partner 20% Off"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Discount Type</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Discount Value * ({formData.discount_type === 'percentage' ? '%' : '₹'})
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                placeholder={formData.discount_type === 'percentage' ? '15.00' : '500.00'}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Min Purchase Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.min_purchase_amount}
                onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Min Quantity / Seats</label>
              <input
                type="number"
                min="1"
                value={formData.min_quantity}
                onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">End Date *</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Max Usages</label>
              <input
                type="number"
                min="1"
                value={formData.max_usage_limit}
                onChange={(e) => setFormData({ ...formData, max_usage_limit: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all"
            >
              Save Discount Rule
            </button>
          </div>
        </form>
      </Modal>

      {/* Discount Tester Modal */}
      <Modal isOpen={isTesterOpen} onClose={() => setIsTesterOpen(false)} title="Test Discount Eligibility Engine">
        <form onSubmit={handleTestDiscount} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Coupon Code</label>
            <input
              type="text"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value.toUpperCase())}
              placeholder="e.g. BRIGHT10"
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Simulated Order Subtotal (₹)</label>
            <input
              type="number"
              step="0.01"
              value={testSubtotal}
              onChange={(e) => setTestSubtotal(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all cursor-pointer"
          >
            Check Code Validity
          </button>

          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-1 ${
                testResult.valid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="font-bold">{testResult.valid ? '✓ Eligible for Discount' : '✗ Ineligible'}</div>
              <div>{testResult.message}</div>
              {testResult.valid && (
                <div className="font-semibold pt-1 border-t border-emerald-200">
                  Computed Deduction: ₹{testResult.discount_amount}
                </div>
              )}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default DiscountsPage;
