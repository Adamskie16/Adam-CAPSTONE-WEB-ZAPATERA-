// Admin/src/components/Badge.jsx
import React from 'react';

export default function Badge({ children, variant = 'info' }) {
  const variants = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    under_review: 'bg-blue-50 text-blue-700 border-blue-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
    declined: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
    issued: 'bg-purple-50 text-purple-700 border-purple-200 font-extrabold',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-slate-100 text-slate-500 border-slate-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${variants[variant] || variants.info}`}>
      {children}
    </span>
  );
}
