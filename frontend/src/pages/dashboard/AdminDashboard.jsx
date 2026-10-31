import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Repeat,
  Receipt,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Package,
  Calendar,
  Play,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { dashboardService, invoiceService } from '../../services/apiServices';
import { useToast } from '../../context/ToastContext';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningBilling, setRunningBilling] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getStats();
      setStats(res.data);
    } catch (err) {
      showToast('error', 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const handleRefresh = () => fetchStats();
    window.addEventListener('billing-cycle-completed', handleRefresh);
    return () => window.removeEventListener('billing-cycle-completed', handleRefresh);
  }, []);

  const handleRunBilling = async () => {
    try {
      setRunningBilling(true);
      const res = await invoiceService.runBillingCycle();
      showToast('success', res.data.message || 'Billing cycle executed.');
      fetchStats();
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Billing run failed.');
    } finally {
      setRunningBilling(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const PIE_COLORS = ['#16a34a', '#f59e0b', '#64748b'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Control Center</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Brightloop Executive Dashboard
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Real-time enterprise overview of subscription plans, recurring revenue collection, customer health, and billing operations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunBilling}
              disabled={runningBilling}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{runningBilling ? 'Executing Billing...' : 'Trigger Billing Cycle'}</span>
            </button>
            <button
              onClick={() => navigate('/finance')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-colors"
            >
              <span>Finance Reports</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Recurring Revenue"
          value={`₹${stats?.total_revenue ? Number(stats.total_revenue).toLocaleString('en-IN') : '0'}`}
          subtitle="Collected cash across all periods"
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Active Subscriptions"
          value={stats?.active_subscriptions || 0}
          subtitle={`Out of ${stats?.total_subscriptions || 0} total subscriptions`}
          icon={Repeat}
          color="blue"
        />
        <StatCard
          title="Outstanding Receivables"
          value={`₹${stats?.total_outstanding_amount ? Number(stats.total_outstanding_amount).toLocaleString('en-IN') : '0'}`}
          subtitle={`${stats?.outstanding_invoices || 0} unpaid invoices`}
          icon={Receipt}
          color="amber"
        />
        <StatCard
          title="Overdue Invoices"
          value={stats?.overdue_invoices || 0}
          subtitle="Invoices requiring collection chase"
          icon={AlertCircle}
          color="rose"
        />
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
          <div className="text-xs text-slate-500 font-medium">Total Customers</div>
          <div className="text-xl font-bold text-slate-800 mt-1">{stats?.total_customers || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
          <div className="text-xs text-slate-500 font-medium">Catalog Products</div>
          <div className="text-xl font-bold text-slate-800 mt-1">{stats?.total_products || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
          <div className="text-xs text-slate-500 font-medium">Subscription Plans</div>
          <div className="text-xl font-bold text-slate-800 mt-1">{stats?.total_plans || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
          <div className="text-xs text-slate-500 font-medium">Paid Invoices Ratio</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">
            {stats?.total_invoices ? `${Math.round((stats.paid_invoices / stats.total_invoices) * 100)}%` : '0%'}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 card-shadow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Revenue Collections Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Monthly cash collected from payments</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              Live MySQL Data
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.monthly_revenue || []}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Status Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 card-shadow flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Subscription Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">Active, paused and closed breakdown</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.status_distribution || []}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(stats?.status_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 text-center">
            <div>
              <div className="text-xs text-slate-500">Active</div>
              <div className="text-sm font-bold text-emerald-600 mt-0.5">{stats?.active_subscriptions || 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Paused</div>
              <div className="text-sm font-bold text-amber-600 mt-0.5">{stats?.paused_subscriptions || 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Closed</div>
              <div className="text-sm font-bold text-slate-600 mt-0.5">{stats?.closed_subscriptions || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Payment Transactions</h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest receipts settled into Brightloop accounts</p>
          </div>
          <button
            onClick={() => navigate('/payments')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            View All Payments →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Payment ID</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Method</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.recent_transactions && stats.recent_transactions.length > 0 ? (
                stats.recent_transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">{tx.payment_number}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{tx.customer_name}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-600">₹{Number(tx.amount).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 uppercase text-xs font-medium text-slate-600">{tx.payment_method}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{tx.date}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tx.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No transactions recorded yet.
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

export default AdminDashboard;
