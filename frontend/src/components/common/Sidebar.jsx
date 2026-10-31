import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Calendar,
  FileSpreadsheet,
  Repeat,
  Receipt,
  CreditCard,
  Percent,
  Calculator,
  Users,
  BarChart3,
  UserCheck,
  ShieldCheck,
  UserCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = () => {
  const { user, role, isAdmin, isStaff, isCustomer } = useAuth();

  const adminNav = [
    { name: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Finance & Reports', path: '/finance', icon: BarChart3 },
    { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
    { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet },
    { name: 'Invoices', path: '/invoices', icon: Receipt },
    { name: 'Payments', path: '/payments', icon: CreditCard },
    { name: 'Products & Variants', path: '/products', icon: Package },
    { name: 'Subscription Plans', path: '/plans', icon: Calendar },
    { name: 'Discounts', path: '/discounts', icon: Percent },
    { name: 'Taxes', path: '/taxes', icon: Calculator },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'User Management', path: '/users', icon: UserCheck },
  ];

  const staffNav = [
    { name: 'Staff Dashboard', path: '/staff', icon: LayoutDashboard },
    { name: 'Finance & Reports', path: '/finance', icon: BarChart3 },
    { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
    { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet },
    { name: 'Invoices', path: '/invoices', icon: Receipt },
    { name: 'Payments', path: '/payments', icon: CreditCard },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Plans', path: '/plans', icon: Calendar },
    { name: 'Customers', path: '/customers', icon: Users },
  ];

  const customerNav = [
    { name: 'Portal Overview', path: '/portal', icon: LayoutDashboard },
    { name: 'My Subscriptions', path: '/portal/subscriptions', icon: Repeat },
    { name: 'My Invoices', path: '/portal/invoices', icon: Receipt },
    { name: 'Payment History', path: '/portal/payments', icon: CreditCard },
    { name: 'Organization Profile', path: '/portal/profile', icon: UserCircle },
  ];

  let items = adminNav;
  if (isStaff) items = staffNav;
  if (isCustomer) items = customerNav;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen shrink-0 text-slate-300">
      {/* Brand Logo Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold text-lg">
          B
        </div>
        <div>
          <div className="text-white font-bold tracking-tight text-base leading-none">
            Brightloop
          </div>
          <div className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold mt-1">
            Subscription Cloud
          </div>
        </div>
      </div>

      {/* Role Pill Banner */}
      <div className="px-6 py-3 border-b border-slate-800/60 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-slate-200">{role || 'User'}</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-blue-950 text-blue-300 border border-blue-800/60">
          v1.0
        </span>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin' || item.path === '/staff' || item.path === '/portal'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Bottom User Card */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {user?.full_name || 'Logged In'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
