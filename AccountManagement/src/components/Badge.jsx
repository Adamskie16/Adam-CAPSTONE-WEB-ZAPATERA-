import React from 'react';

export default function Badge({ children, variant = 'default' }) {
  const styles = {
    super_admin: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
    admin: 'bg-blue-950/80 text-blue-300 border-blue-800/80',
    resident: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    active: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    inactive: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
    default: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const selectedStyle = styles[variant] || styles.default;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${selectedStyle}`}>
      {children}
    </span>
  );
}
