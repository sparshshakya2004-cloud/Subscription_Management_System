import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Repeat,
  Layers,
  ArrowRight,
  Clock,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  quotationService,
  customerService,
  productService,
  planService,
} from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';

export const QuotationsPage = () => {
  const [activeTab, setActiveTab] = useState('quotations'); // 'quotations' | 'templates'
  const [quotations, setQuotations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateQuoteModalOpen, setIsCreateQuoteModalOpen] = useState(false);
  const [isTemplateQuoteModalOpen, setIsTemplateQuoteModalOpen] = useState(false);
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
  const [selectedQuoteForConvert, setSelectedQuoteForConvert] = useState(null);
  const [selectedQuoteDetail, setSelectedQuoteDetail] = useState(null);

  // Manual Quote Form
  const [quoteForm, setQuoteForm] = useState({
    customer_id: '',
    validity_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    notes: '',
    lines: [{ product_id: '', quantity: 1, unit_price: '', tax_rate: 18.0 }],
  });

  // Template Quote Form
  const [fromTemplateForm, setFromTemplateForm] = useState({
    template_id: '',
    customer_id: '',
  });

  // New Template Form
  const [templateForm, setTemplateForm] = useState({
    template_name: '',
    description: '',
    validity_days: 30,
    lines: [{ product_id: '', plan_id: '', default_quantity: 1, default_price: '' }],
  });

  const { isStaff, isAdmin } = useAuth();
  const { showToast } = useToast();

  const loadAll = async () => {
    try {
      setLoading(true);
      const [qRes, tRes, cRes, pRes, plRes] = await Promise.all([
        quotationService.getAll(),
        quotationService.getTemplates(),
        customerService.getAll({ status: 'active' }),
        productService.getAll({ status: 'active' }),
        planService.getAll({ status: 'active' }),
      ]);
      setQuotations(qRes.data || []);
      setTemplates(tRes.data || []);
      setCustomers(cRes.data || []);
      setProducts(pRes.data || []);
      setPlans(plRes.data || []);
    } catch (err) {
      showToast('error', 'Failed to load quotation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Add line to manual quotation form
  const addQuoteLine = () => {
    setQuoteForm({
      ...quoteForm,
      lines: [...quoteForm.lines, { product_id: '', quantity: 1, unit_price: '', tax_rate: 18.0 }],
    });
  };

  const updateQuoteLine = (idx, field, val) => {
    const updated = [...quoteForm.lines];
    updated[idx][field] = val;
    if (field === 'product_id') {
      const prod = products.find((p) => p.id === parseInt(val));
      if (prod) {
        updated[idx].unit_price = prod.sales_price;
      }
    }
    setQuoteForm({ ...quoteForm, lines: updated });
  };

  const removeQuoteLine = (idx) => {
    if (quoteForm.lines.length <= 1) return;
    setQuoteForm({ ...quoteForm, lines: quoteForm.lines.filter((_, i) => i !== idx) });
  };

  const handleCreateManualQuote = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        customer_id: parseInt(quoteForm.customer_id),
        validity_date: quoteForm.validity_date,
        notes: quoteForm.notes,
        lines: quoteForm.lines.map((l) => ({
          product_id: parseInt(l.product_id),
          quantity: parseInt(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
          tax_rate: parseFloat(l.tax_rate) || 0,
        })),
      };
      await quotationService.create(payload);
      showToast('success', 'Quotation created successfully!');
      setIsCreateQuoteModalOpen(false);
      loadAll();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Failed to create quotation.');
    }
  };

  const handleCreateFromTemplate = async (e) => {
    e.preventDefault();
    try {
      await quotationService.createFromTemplate(
        fromTemplateForm.template_id,
        fromTemplateForm.customer_id
      );
      showToast('success', 'Quotation generated instantly from template!');
      setIsTemplateQuoteModalOpen(false);
      loadAll();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Failed to generate quote from template.');
    }
  };

  const handleConvertToSubscription = async () => {
    if (!selectedQuoteForConvert) return;
    try {
      const res = await quotationService.convertToSubscription(selectedQuoteForConvert.id);
      showToast('success', res.data.message || 'Quotation converted to subscription!');
      setSelectedQuoteForConvert(null);
      loadAll();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Conversion failed.');
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        template_name: templateForm.template_name,
        description: templateForm.description,
        validity_days: parseInt(templateForm.validity_days) || 30,
        lines: templateForm.lines.map((l) => ({
          product_id: parseInt(l.product_id),
          plan_id: l.plan_id ? parseInt(l.plan_id) : null,
          default_quantity: parseInt(l.default_quantity) || 1,
          default_price: parseFloat(l.default_price) || 0,
        })),
      };
      await quotationService.createTemplate(payload);
      showToast('success', 'Quotation template saved!');
      setIsCreateTemplateModalOpen(false);
      loadAll();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Failed to create template.');
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await quotationService.deleteTemplate(id);
      showToast('success', 'Template removed.');
      loadAll();
    } catch (err) {
      showToast('error', 'Failed to remove template.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Quotation Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Build proposals from predefined templates, manage the Draft → Quotation → Confirmed lifecycle, and convert to active subscriptions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsTemplateQuoteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-sm border border-indigo-200 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Generate From Template</span>
          </button>
          <button
            onClick={() => setIsCreateQuoteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quotation</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('quotations')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'quotations'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Quotations List ({quotations.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Quotation Templates ({templates.length})
        </button>
      </div>

      {/* TAB 1: Quotations List */}
      {activeTab === 'quotations' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Quote Number</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Subtotal</th>
                  <th className="px-6 py-4">Taxes</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Validity Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      Loading quotations...
                    </td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      No quotations found.
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-slate-900">{q.quotation_number}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{q.customer_name}</td>
                      <td className="px-6 py-4 text-slate-600">₹{Number(q.subtotal).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-slate-500">₹{Number(q.tax_amount).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        ₹{Number(q.total_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{q.validity_date}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedQuoteDetail(q)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            Details
                          </button>

                          {/* Convert to Subscription if Confirmed or Quotation */}
                          {(q.status === 'quotation' || q.status === 'confirmed') && (
                            <button
                              onClick={() => setSelectedQuoteForConvert(q)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                            >
                              <Repeat className="w-3.5 h-3.5" />
                              <span>Convert to Sub</span>
                            </button>
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
      )}

      {/* TAB 2: Quotation Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsCreateTemplateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 card-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      Standard Template
                    </span>
                    <span className="text-xs text-slate-400">Valid: {tmpl.validity_days} days</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{tmpl.template_name}</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4">{tmpl.description || 'No description provided.'}</p>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 mb-4">
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Included Package Lines ({tmpl.lines?.length || 0}):
                    </div>
                    {tmpl.lines?.map((line) => (
                      <div key={line.id} className="flex items-center justify-between text-xs text-slate-700">
                        <span>• {line.product_name} (x{line.default_quantity})</span>
                        <span className="font-semibold">₹{Number(line.default_price).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setFromTemplateForm({ ...fromTemplateForm, template_id: tmpl.id });
                      setIsTemplateQuoteModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <span>Use Template</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteTemplate(tmpl.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Quote Modal */}
      <Modal
        isOpen={isCreateQuoteModalOpen}
        onClose={() => setIsCreateQuoteModalOpen(false)}
        title="Create New Quotation"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateManualQuote} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Customer *</label>
              <select
                value={quoteForm.customer_id}
                onChange={(e) => setQuoteForm({ ...quoteForm, customer_id: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Customer Organization...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.customer_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Validity Date *</label>
              <input
                type="date"
                value={quoteForm.validity_date}
                onChange={(e) => setQuoteForm({ ...quoteForm, validity_date: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Lines builder */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Quotation Line Items
              </label>
              <button
                type="button"
                onClick={addQuoteLine}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                + Add Another Product
              </button>
            </div>

            {quoteForm.lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="col-span-5">
                  <select
                    value={line.product_id}
                    onChange={(e) => updateQuoteLine(idx, 'product_id', e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Base ₹{p.sales_price})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => updateQuoteLine(idx, 'quantity', e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-center"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={line.unit_price}
                    onChange={(e) => updateQuoteLine(idx, 'unit_price', e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                  />
                </div>
                <div className="col-span-2 text-xs font-medium text-slate-500 text-center">
                  +18% GST
                </div>
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeQuoteLine(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Notes / Terms</label>
            <textarea
              rows="2"
              value={quoteForm.notes}
              onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
              placeholder="Commercial terms, SLA, payment milestones..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateQuoteModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20"
            >
              Generate Quotation
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Quote from Template Modal */}
      <Modal
        isOpen={isTemplateQuoteModalOpen}
        onClose={() => setIsTemplateQuoteModalOpen(false)}
        title="Generate Quotation from Template"
      >
        <form onSubmit={handleCreateFromTemplate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Quotation Template *</label>
            <select
              value={fromTemplateForm.template_id}
              onChange={(e) => setFromTemplateForm({ ...fromTemplateForm, template_id: e.target.value })}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Package Template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.template_name} ({t.validity_days} days validity)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Target Customer *</label>
            <select
              value={fromTemplateForm.customer_id}
              onChange={(e) => setFromTemplateForm({ ...fromTemplateForm, customer_id: e.target.value })}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} ({c.contact_name})
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-slate-500 bg-indigo-50 p-3 rounded-lg border border-indigo-200 text-indigo-900">
            ✨ Product lines, bundle pricing, and validity duration will be automatically populated from the selected template.
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTemplateQuoteModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all"
            >
              Build Quotation
            </button>
          </div>
        </form>
      </Modal>

      {/* Create New Template Modal */}
      <Modal
        isOpen={isCreateTemplateModalOpen}
        onClose={() => setIsCreateTemplateModalOpen(false)}
        title="Create Reusable Quotation Template"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateTemplate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Template Name *</label>
              <input
                type="text"
                value={templateForm.template_name}
                onChange={(e) => setTemplateForm({ ...templateForm, template_name: e.target.value })}
                placeholder="Enterprise Standard Pack"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Validity (Days)</label>
              <input
                type="number"
                value={templateForm.validity_days}
                onChange={(e) => setTemplateForm({ ...templateForm, validity_days: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Description</label>
            <input
              type="text"
              value={templateForm.description}
              onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
              placeholder="Package description for sales team..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Template lines */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase">Default Products in Bundle</div>
            {templateForm.lines.map((l, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                <div className="col-span-6">
                  <select
                    value={l.product_id}
                    onChange={(e) => {
                      const updated = [...templateForm.lines];
                      updated[idx].product_id = e.target.value;
                      const p = products.find((pr) => pr.id === parseInt(e.target.value));
                      if (p) updated[idx].default_price = p.sales_price;
                      setTemplateForm({ ...templateForm, lines: updated });
                    }}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs"
                  >
                    <option value="">Select Product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={l.default_quantity}
                    onChange={(e) => {
                      const updated = [...templateForm.lines];
                      updated[idx].default_quantity = e.target.value;
                      setTemplateForm({ ...templateForm, lines: updated });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-center"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price (₹)"
                    value={l.default_price}
                    onChange={(e) => {
                      const updated = [...templateForm.lines];
                      updated[idx].default_price = e.target.value;
                      setTemplateForm({ ...templateForm, lines: updated });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateTemplateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all"
            >
              Save Template
            </button>
          </div>
        </form>
      </Modal>

      {/* Quotation Detail Modal */}
      <Modal
        isOpen={!!selectedQuoteDetail}
        onClose={() => setSelectedQuoteDetail(null)}
        title={`Quotation: ${selectedQuoteDetail?.quotation_number}`}
      >
        <div className="space-y-4">
          <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500">Customer:</span>{' '}
              <span className="font-bold text-slate-800">{selectedQuoteDetail?.customer_name}</span>
            </div>
            <div>
              <span className="text-slate-500">Status:</span>{' '}
              <StatusBadge status={selectedQuoteDetail?.status} />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">Qty</th>
                  <th className="px-4 py-2">Unit Price</th>
                  <th className="px-4 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedQuoteDetail?.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-2.5 font-medium">{line.product_name}</td>
                    <td className="px-4 py-2.5">{line.quantity}</td>
                    <td className="px-4 py-2.5">₹{Number(line.unit_price).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2.5 font-bold">₹{Number(line.line_amount).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-right space-y-1 text-xs">
            <div>Subtotal: ₹{Number(selectedQuoteDetail?.subtotal || 0).toLocaleString('en-IN')}</div>
            <div>Taxes: +₹{Number(selectedQuoteDetail?.tax_amount || 0).toLocaleString('en-IN')}</div>
            <div className="text-base font-bold text-slate-900 pt-1 border-t">
              Grand Total: ₹{Number(selectedQuoteDetail?.total_amount || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </Modal>

      {/* Convert to Subscription Confirmation Modal */}
      <ConfirmModal
        isOpen={!!selectedQuoteForConvert}
        onClose={() => setSelectedQuoteForConvert(null)}
        onConfirm={handleConvertToSubscription}
        title="Convert Quotation to Subscription"
        message={`Convert quotation ${selectedQuoteForConvert?.quotation_number} into an active subscription for ${selectedQuoteForConvert?.customer_name}? A new subscription record will be initiated immediately.`}
        confirmText="Confirm & Activate"
      />
    </div>
  );
};

export default QuotationsPage;
