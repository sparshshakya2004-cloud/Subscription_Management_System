import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Plus,
  Power,
  CheckCircle2,
  Percent,
} from 'lucide-react';
import { taxService } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';

export const TaxesPage = () => {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    tax_name: '',
    tax_rate: '',
    tax_type: 'gst',
    description: '',
    is_active: true,
  });

  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const loadTaxes = async () => {
    try {
      setLoading(true);
      const res = await taxService.getAll();
      setTaxes(res.data || []);
    } catch (err) {
      showToast('error', 'Failed to load tax rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxes();
  }, []);

  const handleCreateTax = async (e) => {
    e.preventDefault();
    try {
      await taxService.create({
        ...formData,
        tax_rate: parseFloat(formData.tax_rate) || 0,
      });
      showToast('success', `Tax rule ${formData.tax_name} created!`);
      setIsAddModalOpen(false);
      setFormData({
        tax_name: '',
        tax_rate: '',
        tax_type: 'gst',
        description: '',
        is_active: true,
      });
      loadTaxes();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Failed to create tax rule.');
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await taxService.toggleStatus(id);
      showToast('success', res.data.message);
      loadTaxes();
    } catch (err) {
      showToast('error', 'Failed to toggle tax status.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tax Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure statutory tax rules (GST, VAT, Sales Tax) automatically computed on recurring invoices.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Tax Rule</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {taxes.map((tax) => (
          <div
            key={tax.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 card-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {tax.tax_type?.toUpperCase()}
                </span>
                <StatusBadge status={tax.is_active ? 'active' : 'inactive'} />
              </div>

              <h3 className="text-lg font-bold text-slate-900">{tax.tax_name}</h3>
              <div className="text-3xl font-extrabold text-blue-600 mt-2 mb-2">
                {tax.tax_rate}%
              </div>
              <p className="text-xs text-slate-500">{tax.description || 'Applicable to subscription invoices.'}</p>
            </div>

            {isAdmin && (
              <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleToggle(tax.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    tax.is_active
                      ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
                      : 'text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{tax.is_active ? 'Deactivate' : 'Activate'}</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Tax Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Tax Rule">
        <form onSubmit={handleCreateTax} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tax Name *</label>
            <input
              type="text"
              value={formData.tax_name}
              onChange={(e) => setFormData({ ...formData, tax_name: e.target.value })}
              placeholder="e.g. GST 18%"
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tax Rate (%) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                placeholder="18.00"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tax Type</label>
              <select
                value={formData.tax_type}
                onChange={(e) => setFormData({ ...formData, tax_type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 uppercase"
              >
                <option value="gst">GST</option>
                <option value="vat">VAT</option>
                <option value="sales_tax">Sales Tax</option>
                <option value="service_tax">Service Tax</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Description</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Statutory regulation details..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
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
              Save Tax Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TaxesPage;
