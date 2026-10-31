import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  DollarSign,
  Download,
} from 'lucide-react';
import { paymentService } from '../../services/apiServices';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/common/StatusBadge';

export const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('');

  const { showToast } = useToast();

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await paymentService.getAll({
        payment_method: methodFilter || undefined,
      });
      setPayments(res.data || []);
    } catch (err) {
      showToast('error', 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [methodFilter]);

  const totalCollected = payments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payment Records & Collections
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete audit trail of all manual and electronic collections with transaction reference numbers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-800">
            Total Collections: ₹{totalCollected.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['', 'bank_transfer', 'upi', 'card', 'cash', 'other'].map((m) => (
          <button
            key={m}
            onClick={() => setMethodFilter(m)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
              methodFilter === m
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {m === '' ? 'All Methods' : m.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Payment #</th>
                <th className="px-6 py-4">Applied to Invoice</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Transaction Reference</th>
                <th className="px-6 py-4">Payment Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">{p.payment_number}</td>
                    <td className="px-6 py-4 font-mono text-blue-600 text-xs font-semibold">{p.invoice_number}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{p.customer_name}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 uppercase text-xs font-medium text-slate-600">
                      {p.payment_method?.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {p.transaction_reference || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{p.payment_date}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={p.status} />
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

export default PaymentsPage;
