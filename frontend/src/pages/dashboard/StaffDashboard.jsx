import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Repeat,
  FileSpreadsheet,
  Receipt,
  Users,
  CreditCard,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { subscriptionService, quotationService, invoiceService } from '../../services/apiServices';
import { useToast } from '../../context/ToastContext';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';

export const StaffDashboard = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [subsRes, quotesRes, invsRes] = await Promise.all([
        subscriptionService.getAll({ limit: 5 }),
        quotationService.getAll({ limit: 5 }),
        invoiceService.getAll({ limit: 5 }),
      ]);
      setSubscriptions(subsRes.data || []);
      setQuotations(quotesRes.data || []);
      setInvoices(invsRes.data || []);
    } catch (err) {
      showToast('error', 'Failed to load staff operational metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeSubs = subscriptions.filter((s) => s.status === 'active').length;
  const pendingInvoices = invoices.filter((i) => i.status === 'confirmed' || i.status === 'overdue').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Operations & Sales Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage customer accounts, prepare quotations, track active subscriptions, and record payments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/quotations')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quotation</span>
          </button>
          <button
            onClick={() => navigate('/payments')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm border border-slate-200 transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active Subscriptions"
          value={activeSubs}
          subtitle="Currently active customer accounts"
          icon={Repeat}
          color="blue"
        />
        <StatCard
          title="Open Quotations"
          value={quotations.length}
          subtitle="Proposals pending customer sign-off"
          icon={FileSpreadsheet}
          color="indigo"
        />
        <StatCard
          title="Pending Invoices"
          value={pendingInvoices}
          subtitle="Awaiting customer remittance"
          icon={Receipt}
          color="amber"
        />
        <StatCard
          title="Day-to-Day Operations"
          value="Normal"
          subtitle="All recurring jobs running"
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Dual Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Subscriptions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Active Subscriptions</h3>
            <button
              onClick={() => navigate('/subscriptions')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View All →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Sub #</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-mono font-medium text-slate-900">{s.subscription_number}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{s.customer_name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{s.plan_name}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quotations awaiting confirmation */}
        <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent Quotations</h3>
            <button
              onClick={() => navigate('/quotations')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View All →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Quote #</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Total (₹)</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-mono font-medium text-slate-900">{q.quotation_number}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{q.customer_name}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">₹{Number(q.total_amount).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={q.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
