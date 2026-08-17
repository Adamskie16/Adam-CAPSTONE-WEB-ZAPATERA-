// Admin/src/components/StatCard.jsx
import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = 'blue', subtitle }) {
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-600 border-blue-200',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-200',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-200',
    rose: 'bg-rose-500/10 text-rose-600 border-rose-200',
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl border ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
