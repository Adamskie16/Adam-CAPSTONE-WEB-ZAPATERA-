// SuperAdmin/src/components/Badge.jsx
import React from 'react';

export default function Badge({ children, variant = 'info' }) {
  const variants = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    under_review: 'bg-blue-50 text-blue-700 border-blue-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    declined: 'bg-rose-50 text-rose-700 border-rose-200',
    issued: 'bg-purple-50 text-purple-700 border-purple-200',
    super_admin: 'bg-slate-900 text-emerald-400 border-slate-700 font-bold',
    admin: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold',
    resident: 'bg-slate-100 text-slate-700 border-slate-200',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-slate-100 text-slate-500 border-slate-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    security: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${variants[variant] || variants.info}`}>
      {children}
    </span>
  );
}
