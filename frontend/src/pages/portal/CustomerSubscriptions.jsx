import React, { useState, useEffect } from 'react';
import { Repeat, Calendar, CheckCircle2, Clock, Eye } from 'lucide-react';
import { portalService } from '../../services/apiServices';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';

export const CustomerSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState(null);

  const { showToast } = useToast();

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await portalService.getSubscriptions();
      setSubscriptions(res.data || []);
    } catch (err) {
      showToast('error', 'Failed to load your subscriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Active Subscriptions & Plans
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your enrolled recurring plans, licensed seats, start dates, and contract expirations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
            Loading subscriptions...
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            You do not currently have any subscriptions enrolled.
          </div>
        ) : (
          subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 card-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                    {sub.subscription_number}
                  </span>
                  <StatusBadge status={sub.status} />
                </div>

                <h3 className="text-lg font-bold text-slate-900">{sub.plan_name}</h3>

                <div className="mt-3 mb-4 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900">
                    ₹{Number(sub.total_amount).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500">/ billing cycle</span>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 mb-4">
                  <div className="flex justify-between">
                    <span>Contract Started:</span>
                    <span className="font-medium text-slate-800">{sub.start_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expiry Date:</span>
                    <span className="font-medium text-slate-800">{sub.expiry_date || 'Ongoing'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Billing Due:</span>
                    <span className="font-bold text-blue-600">{sub.next_billing_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Terms:</span>
                    <span className="font-medium text-slate-800">{sub.payment_terms}</span>
                  </div>
                </div>

                {/* Lines summary */}
                <div className="text-xs space-y-1">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Licensed Line Items ({sub.lines?.length || 0}):
                  </div>
                  {sub.lines?.map((line) => (
                    <div key={line.id} className="flex justify-between text-slate-600">
                      <span>• {line.product_name} (x{line.quantity})</span>
                      <span className="font-semibold">₹{Number(line.line_amount).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedSub(sub)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Subscription Detail Modal */}
      <Modal
        isOpen={!!selectedSub}
        onClose={() => setSelectedSub(null)}
        title={`Subscription Details: ${selectedSub?.subscription_number}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="font-bold text-slate-800 text-sm mb-1">{selectedSub?.plan_name}</div>
            <div className="text-slate-500">
              Contract active from {selectedSub?.start_date} until {selectedSub?.expiry_date || 'renewal'}.
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">Quantity</th>
                  <th className="px-4 py-2">Unit Price</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedSub?.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-2.5 font-medium">{line.product_name}</td>
                    <td className="px-4 py-2.5">{line.quantity}</td>
                    <td className="px-4 py-2.5">₹{Number(line.unit_price).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2.5 text-right font-bold">₹{Number(line.line_amount).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-right text-xs space-y-1">
            <div>Subtotal: ₹{Number(selectedSub?.subtotal || 0).toLocaleString('en-IN')}</div>
            <div>Taxes: +₹{Number(selectedSub?.tax_amount || 0).toLocaleString('en-IN')}</div>
            <div className="text-sm font-bold text-slate-900 pt-1 border-t">
              Total Amount: ₹{Number(selectedSub?.total_amount || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerSubscriptions;
