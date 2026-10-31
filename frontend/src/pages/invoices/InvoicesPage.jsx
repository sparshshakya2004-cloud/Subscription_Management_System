import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  Play,
  CreditCard,
  Eye,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { invoiceService, paymentService, customerService } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';

export const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [runningBilling, setRunningBilling] = useState(false);

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);
  const [confirmCancelInvoice, setConfirmCancelInvoice] = useState(null);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    transaction_reference: '',
    notes: '',
  });

  const { isStaff, isAdmin } = useAuth();
  const { showToast } = useToast();

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await invoiceService.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        is_overdue: onlyOverdue ? true : undefined,
      });
      setInvoices(res.data || []);
    } catch (err) {
      showToast('error', 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [search, statusFilter, onlyOverdue]);

  const handleDownloadPdf = async (invoiceId, invoiceNumber) => {
    try {
      showToast('info', 'Generating PDF invoice...');
      const res = await invoiceService.downloadPdf(invoiceId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('success', 'PDF downloaded successfully!');
    } catch (err) {
      showToast('error', 'Failed to generate PDF document.');
    }
  };

  const handleRunBilling = async () => {
    try {
      setRunningBilling(true);
      const res = await invoiceService.runBillingCycle();
      showToast('success', res.data.message || 'Billing cycle executed.');
      loadInvoices();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Billing cycle failed.');
    } finally {
      setRunningBilling(false);
    }
  };

  const handleConfirmInvoice = async (id) => {
    try {
      await invoiceService.updateStatus(id, 'confirmed');
      showToast('success', 'Invoice confirmed!');
      loadInvoices();
    } catch (err) {
      showToast('error', 'Failed to confirm invoice.');
    }
  };

  const handleCancelInvoice = async () => {
    if (!confirmCancelInvoice) return;
    try {
      await invoiceService.updateStatus(confirmCancelInvoice.id, 'cancelled');
      showToast('success', `Invoice ${confirmCancelInvoice.invoice_number} cancelled.`);
      setConfirmCancelInvoice(null);
      loadInvoices();
    } catch (err) {
      showToast('error', 'Failed to cancel invoice.');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;
    const amt = parseFloat(paymentForm.amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('error', 'Please enter a valid payment amount.');
      return;
    }
    if (amt > parseFloat(paymentModalInvoice.outstanding_amount)) {
      showToast('error', `Payment cannot exceed remaining balance of ₹${paymentModalInvoice.outstanding_amount}`);
      return;
    }

    try {
      await paymentService.create({
        invoice_id: paymentModalInvoice.id,
        amount: amt,
        payment_method: paymentForm.payment_method,
        transaction_reference: paymentForm.transaction_reference,
        notes: paymentForm.notes,
      });
      showToast('success', `Payment of ₹${amt} successfully recorded!`);
      setPaymentModalInvoice(null);
      setPaymentForm({
        amount: '',
        payment_method: 'bank_transfer',
        transaction_reference: '',
        notes: '',
      });
      loadInvoices();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Failed to record payment.');
    }
  };

  const openPaymentModal = (inv) => {
    setPaymentModalInvoice(inv);
    setPaymentForm({
      amount: inv.outstanding_amount,
      payment_method: 'bank_transfer',
      transaction_reference: '',
      notes: `Payment for ${inv.invoice_number}`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Invoice Management & Automatic Billing
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated recurring invoice generation, PDF tax invoice downloads, and receivables tracking.
          </p>
        </div>

        {(isAdmin || isStaff) && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunBilling}
              disabled={runningBilling}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              {runningBilling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{runningBilling ? 'Executing Billing Cycle...' : 'Run Recurring Billing'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 card-shadow flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice # or customer..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            onClick={() => setOnlyOverdue(!onlyOverdue)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              onlyOverdue
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⚠️ Only Overdue
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Invoice / Due Date</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Paid / Balance</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">{inv.invoice_number}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{inv.customer_name}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <div>Date: {inv.invoice_date}</div>
                      <div className="text-[11px] text-slate-400 font-medium">Due: {inv.due_date}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₹{Number(inv.total_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="text-emerald-700 font-medium">
                        Paid: ₹{Number(inv.paid_amount).toLocaleString('en-IN')}
                      </div>
                      <div className={`font-bold ${Number(inv.outstanding_amount) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        Bal: ₹{Number(inv.outstanding_amount).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Modal */}
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Download PDF */}
                        <button
                          onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download Tax Invoice PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Record Payment if outstanding > 0 */}
                        {(isAdmin || isStaff) && Number(inv.outstanding_amount) > 0 && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => openPaymentModal(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Record Payment"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay</span>
                          </button>
                        )}

                        {/* Confirm if Draft */}
                        {(isAdmin || isStaff) && inv.status === 'draft' && (
                          <button
                            onClick={() => handleConfirmInvoice(inv.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            Confirm
                          </button>
                        )}

                        {/* Cancel invoice */}
                        {(isAdmin || isStaff) && inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => setConfirmCancelInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Cancel Invoice"
                          >
                            <XCircle className="w-4 h-4" />
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

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={`Tax Invoice: ${selectedInvoice?.invoice_number}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
          <div className="flex justify-between items-start pb-4 border-b border-slate-100">
            <div>
              <div className="text-xl font-black text-blue-900 tracking-tight">BRIGHTLOOP SOFTWARE</div>
              <div className="text-xs text-slate-400 mt-0.5">Enterprise Cloud Billing System</div>
            </div>
            <div className="text-right">
              <StatusBadge status={selectedInvoice?.status} />
              <div className="text-xs text-slate-500 mt-1">Invoice Date: {selectedInvoice?.invoice_date}</div>
              <div className="text-xs text-slate-500">Due Date: {selectedInvoice?.due_date}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-bold text-slate-700 uppercase tracking-wider mb-1">Billed To:</div>
              <div className="font-semibold text-slate-900 text-sm">{selectedInvoice?.customer_name}</div>
              <div className="text-slate-500 mt-0.5">{selectedInvoice?.customer_email}</div>
              <div className="text-slate-500">{selectedInvoice?.customer_phone}</div>
              <div className="text-slate-500 mt-1">{selectedInvoice?.customer_address}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-bold text-slate-700 uppercase tracking-wider mb-1">Subscription Ref:</div>
              <div className="font-semibold text-blue-600 text-sm font-mono">
                {selectedInvoice?.subscription_number || 'Direct Invoice'}
              </div>
              <div className="text-slate-500 mt-2">Notes / Commercial Terms:</div>
              <div className="text-slate-700 italic">{selectedInvoice?.notes || 'Standard Net 30 billing'}</div>
            </div>
          </div>

          {/* Lines Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Item Description</th>
                  <th className="px-4 py-2.5">Qty</th>
                  <th className="px-4 py-2.5">Unit Price</th>
                  <th className="px-4 py-2.5">Tax (%)</th>
                  <th className="px-4 py-2.5 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedInvoice?.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-2.5 font-medium">{line.description}</td>
                    <td className="px-4 py-2.5">{line.quantity}</td>
                    <td className="px-4 py-2.5">₹{Number(line.unit_price).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2.5">{line.tax_rate}%</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                      ₹{Number(line.line_total).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{Number(selectedInvoice?.subtotal || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxes:</span>
                <span>+₹{Number(selectedInvoice?.tax_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              {Number(selectedInvoice?.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discounts Applied:</span>
                  <span>-₹{Number(selectedInvoice.discount_amount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span>₹{Number(selectedInvoice?.total_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Paid Amount:</span>
                <span>₹{Number(selectedInvoice?.paid_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-600 text-sm pt-1 border-t border-slate-200">
                <span>Outstanding Balance:</span>
                <span>₹{Number(selectedInvoice?.outstanding_amount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => handleDownloadPdf(selectedInvoice.id, selectedInvoice.invoice_number)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Invoice</span>
            </button>
            <button
              onClick={() => setSelectedInvoice(null)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={!!paymentModalInvoice}
        onClose={() => setPaymentModalInvoice(null)}
        title={`Record Payment: ${paymentModalInvoice?.invoice_number}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between">
            <div>
              <span className="text-slate-500">Customer:</span>{' '}
              <span className="font-bold text-slate-800">{paymentModalInvoice?.customer_name}</span>
            </div>
            <div>
              <span className="text-slate-500">Remaining Balance:</span>{' '}
              <span className="font-bold text-rose-600">
                ₹{Number(paymentModalInvoice?.outstanding_amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Payment Amount (₹) * (Max: ₹{paymentModalInvoice?.outstanding_amount})
            </label>
            <input
              type="number"
              step="0.01"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              max={paymentModalInvoice?.outstanding_amount}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-bold text-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payment Method *</label>
            <select
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 capitalize"
            >
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
              <option value="card">Credit / Debit Card</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Transaction Reference / UTR
            </label>
            <input
              type="text"
              value={paymentForm.transaction_reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
              placeholder="e.g. HDFC-NEFT-984321"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Notes</label>
            <textarea
              rows="2"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              placeholder="Bank reconciliation notes..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPaymentModalInvoice(null)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-md shadow-emerald-600/20"
            >
              Confirm Payment Receipt
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={!!confirmCancelInvoice}
        onClose={() => setConfirmCancelInvoice(null)}
        onConfirm={handleCancelInvoice}
        title="Cancel Invoice"
        message={`Are you sure you want to cancel invoice ${confirmCancelInvoice?.invoice_number}? Outstanding receivables will be set to zero.`}
        confirmText="Cancel Invoice"
        danger
      />
    </div>
  );
};

export default InvoicesPage;
