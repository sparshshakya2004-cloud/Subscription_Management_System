import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Repeat,
  Receipt,
  AlertCircle,
  Download,
  Calendar,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { reportService, subscriptionService } from '../../services/apiServices';
import { useToast } from '../../context/ToastContext';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';

export const FinanceDashboard = () => {
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedSubForRenewal, setSelectedSubForRenewal] = useState(null);

  const { showToast } = useToast();

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const res = await reportService.getFinanceSummary();
      setFinance(res.data);
    } catch (err) {
      showToast('error', 'Failed to load finance report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  const handleExport = async (type) => {
    try {
      setExporting(true);
      const res = await reportService.exportCsv(type);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('success', `${type.toUpperCase()} CSV report exported successfully.`);
    } catch (err) {
      showToast('error', 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleRenewSubscription = async () => {
    if (!selectedSubForRenewal) return;
    try {
      await subscriptionService.lifecycleAction(selectedSubForRenewal.id, {
        action: 'renew',
      });
      showToast('success', `Subscription ${selectedSubForRenewal.subscription_number} renewed!`);
      setSelectedSubForRenewal(null);
      loadFinanceData();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Renewal failed.');
    }
  };

  if (loading && !finance) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Finance Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 card-shadow">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 mb-2">
            Finance & Executive Audit Dashboard
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Financial Health & Audit Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Answering the 6 core recurring revenue questions for Brightloop Software's Finance Lead.
          </p>
        </div>

        {/* CSV Export Button Group */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport('invoices')}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Invoices</span>
          </button>
          <button
            onClick={() => handleExport('subscriptions')}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Subscriptions</span>
          </button>
          <button
            onClick={() => handleExport('payments')}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Payments</span>
          </button>
        </div>
      </div>

      {/* 6 Questions Answer Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Q1: Active Subscriptions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 card-shadow relative overflow-hidden">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">
            Question 1
          </div>
          <div className="text-sm font-semibold text-slate-700">How many subscriptions are active?</div>
          <div className="text-3xl font-bold text-slate-900 mt-3">
            {finance?.active_subscriptions_count || 0}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Generating recurring monthly income</span>
          </div>
        </div>

        {/* Q2: Revenue Received */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 card-shadow relative overflow-hidden">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Question 2
          </div>
          <div className="text-sm font-semibold text-slate-700">How much revenue has been received?</div>
          <div className="text-3xl font-bold text-emerald-600 mt-3">
            ₹{finance?.total_revenue_received ? Number(finance.total_revenue_received).toLocaleString('en-IN') : '0'}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fully settled & reconciled bank receipts</span>
          </div>
        </div>

        {/* Q3: Money Outstanding */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 card-shadow relative overflow-hidden">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1">
            Question 3
          </div>
          <div className="text-sm font-semibold text-slate-700">How much money is still outstanding?</div>
          <div className="text-3xl font-bold text-amber-600 mt-3">
            ₹{finance?.total_outstanding_amount ? Number(finance.total_outstanding_amount).toLocaleString('en-IN') : '0'}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Unpaid balance on confirmed invoices</span>
          </div>
        </div>

        {/* Q4: Overdue Invoices Count */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 card-shadow relative overflow-hidden">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1">
            Question 4
          </div>
          <div className="text-sm font-semibold text-slate-700">Which invoices are overdue?</div>
          <div className="text-3xl font-bold text-rose-600 mt-3">
            {finance?.overdue_invoices_count || 0}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Due date breached, requiring chase</span>
          </div>
        </div>
      </div>

      {/* Q5 Section: Monthly Revenue Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">
              Question 5
            </div>
            <h3 className="text-base font-bold text-slate-900">
              How much revenue was generated monthly?
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical cash receipts grouped by calendar month
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finance?.monthly_revenue_breakdown || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 max-h-72 overflow-y-auto">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Monthly Audit Table
            </h4>
            <div className="space-y-2">
              {(finance?.monthly_revenue_breakdown || []).map((m) => (
                <div key={m.month} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs">
                  <span className="font-medium text-slate-700">{m.month}</span>
                  <span className="font-bold text-emerald-600">₹{Number(m.revenue).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Q4 & Q6 Drilldown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Q4 Drilldown: Overdue Invoices List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                Action Required (Q4)
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">Overdue Invoices to Chase</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {finance?.overdue_invoices_list?.length || 0} Overdue
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Balance Due</th>
                  <th className="px-5 py-3">Days Late</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {finance?.overdue_invoices_list && finance.overdue_invoices_list.length > 0 ? (
                  finance.overdue_invoices_list.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-mono font-medium text-slate-900">{inv.invoice_number}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{inv.customer_name}</td>
                      <td className="px-5 py-3.5 font-bold text-rose-600">
                        ₹{Number(inv.outstanding_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                          {inv.days_overdue} days overdue
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                      No overdue invoices currently. Outstanding payments are on schedule!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Q6 Drilldown: Subscriptions Due for Renewal */}
        <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Question 6
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Subscriptions Due for Renewal (Next 30 Days)
              </h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {finance?.subscriptions_due_for_renewal?.length || 0} Upcoming
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Subscription #</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Expiry Date</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {finance?.subscriptions_due_for_renewal && finance.subscriptions_due_for_renewal.length > 0 ? (
                  finance.subscriptions_due_for_renewal.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-mono font-medium text-slate-900">{sub.subscription_number}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{sub.customer_name}</td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {sub.expiry_date} ({sub.days_until_expiry}d left)
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {sub.renewal_allowed ? (
                          <button
                            onClick={() => setSelectedSubForRenewal(sub)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            Renew Now
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Non-renewable</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                      No subscriptions expiring within the next 30 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Renewal Confirmation Modal */}
      <ConfirmModal
        isOpen={!!selectedSubForRenewal}
        onClose={() => setSelectedSubForRenewal(null)}
        onConfirm={handleRenewSubscription}
        title="Renew Subscription"
        message={`Confirm 1-year contract extension for subscription ${selectedSubForRenewal?.subscription_number} (${selectedSubForRenewal?.customer_name})?`}
        confirmText="Confirm Renewal"
      />
    </div>
  );
};

export default FinanceDashboard;
