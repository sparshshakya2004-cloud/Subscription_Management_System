import React, { useState } from 'react';
import { LogOut, Play, RefreshCw, Bell, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { invoiceService } from '../../services/apiServices';

export const Navbar = () => {
  const { user, role, isAdmin, isStaff, logout } = useAuth();
  const { showToast } = useToast();
  const [runningBilling, setRunningBilling] = useState(false);

  const handleRunBilling = async () => {
    try {
      setRunningBilling(true);
      const res = await invoiceService.runBillingCycle();
      showToast('success', res.data.message || 'Recurring billing cycle completed!');
      // Dispatch custom event to notify tables to refresh
      window.dispatchEvent(new Event('billing-cycle-completed'));
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Failed to execute billing cycle.');
    } finally {
      setRunningBilling(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h2 className="text-base font-semibold text-slate-800">
          Brightloop Enterprise Portal
        </h2>
        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          Production Ready
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Recurring Billing Trigger for Admin/Staff */}
        {(isAdmin || isStaff) && (
          <button
            onClick={handleRunBilling}
            disabled={runningBilling}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
            title="Triggers recurring invoice generation for all active subscriptions due today"
          >
            {runningBilling ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{runningBilling ? 'Billing in progress...' : 'Run Billing Cycle'}</span>
          </button>
        )}

        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* User profile capsule */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-none">
              {user?.full_name}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              {role}
            </div>
          </div>
        </div>

        {/* Logout action */}
        <button
          onClick={logout}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
          title="Sign out of account"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
