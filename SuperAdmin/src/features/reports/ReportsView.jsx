// SuperAdmin/src/features/reports/ReportsView.jsx
import React from 'react';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import MonthlyAnalytics from '../../components/MonthlyAnalytics';
import { BarChart3, Download, Printer, PieChart, TrendingUp, Users, DollarSign, FileCheck } from 'lucide-react';
import { formatCurrency, formatDate } from '../../core/security';

export default function ReportsView({ requests, docTypes, users }) {
  const statusCounts = {
    pending: requests.filter((r) => r.status === 'pending').length,
    under_review: requests.filter((r) => r.status === 'under_review').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    issued: requests.filter((r) => r.status === 'issued').length,
    declined: requests.filter((r) => r.status === 'declined').length,
  };

  const docTypeCounts = docTypes.map((dt) => {
    const count = requests.filter((r) => r.document_type_id === dt.id || r.document_title === dt.title).length;
    const revenue = requests
      .filter((r) => (r.document_type_id === dt.id || r.document_title === dt.title) && (r.status === 'approved' || r.status === 'issued'))
      .reduce((sum, r) => sum + (Number(r.fee) || 0), 0);
    return { ...dt, request_count: count, total_revenue: revenue };
  });

  const totalRevenue = requests
    .filter((r) => r.status === 'approved' || r.status === 'issued')
    .reduce((sum, r) => sum + (Number(r.fee) || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Barangay System Reports & Analytics</h2>
          <p className="text-xs text-slate-500 mt-1">
            Issuance metrics breakdown, document demand statistics, monthly quantities, revenue audit report, and resident engagement.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report Summary</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Applications Received" value={requests.length} icon={BarChart3} color="purple" />
        <StatCard title="Completed Issuances" value={statusCounts.approved + statusCounts.issued} icon={FileCheck} color="emerald" />
        <StatCard title="Total Revenue Generated" value={formatCurrency(totalRevenue)} icon={DollarSign} color="blue" />
        <StatCard title="Registered Residents" value={users.filter((u) => u.role === 'resident').length} icon={Users} color="amber" />
      </div>

      {/* Dedicated Monthly Quantity Analytics Component */}
      <MonthlyAnalytics requests={requests} />

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Issuance Volume by Document Type</h3>
            <span className="text-xs text-slate-400 font-mono">2026 YTD</span>
          </div>

          <div className="space-y-4">
            {docTypeCounts.map((dt) => {
              const percentage = requests.length ? Math.round((dt.request_count / requests.length) * 100) : 0;
              return (
                <div key={dt.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{dt.title} ({dt.code})</span>
                    <div className="space-x-2">
                      <span className="font-mono text-slate-600 font-semibold">{dt.request_count} requests</span>
                      <span className="font-bold text-blue-600">{formatCurrency(dt.total_revenue)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Processing Status Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Request Status Pipeline</h3>
            <PieChart className="w-4 h-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
              <p className="text-2xl font-extrabold text-amber-700">{statusCounts.pending}</p>
              <p className="text-[11px] font-semibold uppercase text-amber-800 mt-1">Pending Queue</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-center">
              <p className="text-2xl font-extrabold text-blue-700">{statusCounts.under_review}</p>
              <p className="text-[11px] font-semibold uppercase text-blue-800 mt-1">Under Verification</p>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <p className="text-2xl font-extrabold text-emerald-700">{statusCounts.approved}</p>
              <p className="text-[11px] font-semibold uppercase text-emerald-800 mt-1">Approved & Ready</p>
            </div>

            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-center">
              <p className="text-2xl font-extrabold text-purple-700">{statusCounts.issued}</p>
              <p className="text-[11px] font-semibold uppercase text-purple-800 mt-1">Officially Issued</p>
            </div>

            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-center">
              <p className="text-2xl font-extrabold text-rose-700">{statusCounts.declined}</p>
              <p className="text-[11px] font-semibold uppercase text-rose-800 mt-1">Declined</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
