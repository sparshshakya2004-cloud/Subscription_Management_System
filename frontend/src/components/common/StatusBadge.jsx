import React from 'react';

const statusConfig = {
  // Subscription statuses
  active: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  paused: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  closed: { bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  draft: { bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  quotation: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  confirmed: { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },

  // Invoice statuses
  paid: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  overdue: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  cancelled: { bg: 'bg-zinc-100 text-zinc-600 border-zinc-200', dot: 'bg-zinc-400' },

  // Common statuses
  inactive: { bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  archived: { bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  completed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  failed: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
};

export const StatusBadge = ({ status = 'draft', label }) => {
  const norm = (status || '').toLowerCase();
  const config = statusConfig[norm] || {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  };

  const display = label || norm.charAt(0).toUpperCase() + norm.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {display}
    </span>
  );
};

export default StatusBadge;
