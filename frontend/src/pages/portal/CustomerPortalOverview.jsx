import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Repeat,
  Receipt,
  CreditCard,
  Download,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { portalService } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';

export const CustomerPortalOverview = () => {
  const [overview, setOverview] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [ovRes, invsRes, subsRes] = await Promise.all([
        portalService.getOverview(),
        portalService.getInvoices(),
        portalService.getSubscriptions(),
      ]);
      setOverview(ovRes.data);
      setInvoices(invsRes.data || []);
      setSubscriptions(subsRes.data || []);
    } catch (err) {
      showToast('error', 'Failed to load customer portal overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownloadPdf = async (id, num) => {
    try {
      showToast('info', 'Downloading PDF...');
      const res = await portalService.downloadInvoicePdf(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${num}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('success', 'PDF downloaded!');
    } catch (err) {
      showToast('error', 'PDF download failed.');
    }
  };

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-3">
              <Building className="w-3.5 h-3.5" />
              <span>Customer Portal | {overview?.customer_code}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {overview?.company_name}
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Welcome, {overview?.contact_name}. Manage your cloud subscriptions, billing schedules and tax invoice downloads.
            </p>
          </div>

          <button
            onClick={() => navigate('/portal/invoices')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/30 cursor-pointer self-start md:self-auto"
          >
            <span>View All Invoices</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active Subscriptions"
          value={overview?.active_subscriptions_count || 0}
          subtitle="Enterprise SaaS subscriptions"
          icon={Repeat}
          color="blue"
        />
        <StatCard
          title="Outstanding Balance"
          value={`₹${overview?.total_outstanding_amount ? Number(overview.total_outstanding_amount).toLocaleString('en-IN') : '0'}`}
          subtitle="Pending invoice dues"
          icon={Receipt}
          color="amber"
        />
        <StatCard
          title="Total Paid to Date"
          value={`₹${overview?.total_paid_amount ? Number(overview.total_paid_amount).toLocaleString('en-IN') : '0'}`}
          subtitle="Cleared remittances"
          icon={CreditCard}
          color="emerald"
        />
        <StatCard
          title="Invoices Issued"
          value={overview?.total_invoices_count || 0}
          subtitle="Historical billing statements"
          icon={Clock}
          color="indigo"
        />
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Billing Invoices</h3>
            <p className="text-xs text-slate-500 mt-0.5">Download official GST tax invoices in PDF format</p>
          </div>
          <button
            onClick={() => navigate('/portal/invoices')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            View All →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Billing Date</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Outstanding</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">PDF Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length > 0 ? (
                invoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{inv.invoice_date}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{inv.due_date}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">₹{Number(inv.total_amount).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 font-semibold text-rose-600">
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
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No invoices generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortalOverview;
