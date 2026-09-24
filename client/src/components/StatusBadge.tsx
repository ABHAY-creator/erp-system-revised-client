import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = (status || '').toLowerCase().trim();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';

  if (normalized === 'confirmed') {
    styles = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (normalized === 'pending') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (normalized === 'processing') {
    styles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  } else if (normalized === 'shipment sent' || normalized === 'in transit') {
    styles = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (normalized === 'delivered' || normalized === 'active') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (normalized === 'rejected' || normalized === 'cancelled' || normalized === 'inactive') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75"></span>
      {status}
    </span>
  );
};
