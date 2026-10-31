import React, { useState, useEffect } from 'react';
import { Receipt, Download, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { portalService } from '../../services/apiServices';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/common/StatusBadge';

export const CustomerInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await portalService.getInvoices();
      setInvoices(res.data || []);
    } catch (err) {
      showToast('error', 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleDownloadPdf = async (id, num) => {
    try {
      showToast('info', 'Downloading PDF invoice...');
      const res = await portalService.downloadInvoicePdf(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${num}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('success', 'PDF downloaded successfully!');
    } catch (err) {
      showToast('error', 'Failed to download PDF.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Invoices & Billing History
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review tax invoices, outstanding amounts, and download printable PDFs.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Billing Date</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Paid Amount</th>
                <th className="px-6 py-4">Outstanding</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Tax Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{inv.invoice_date}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{inv.due_date}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">₹{Number(inv.total_amount).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-emerald-700 font-medium">₹{Number(inv.paid_amount).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 font-bold text-rose-600">
                      ₹{Number(inv.outstanding_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerInvoices;
