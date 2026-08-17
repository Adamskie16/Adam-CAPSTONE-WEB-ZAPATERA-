// Admin/src/features/reports/ReportsView.jsx
import React from 'react';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import MonthlyAnalytics from '../../components/MonthlyAnalytics';
import { BarChart2, Printer, CheckSquare, Clock, FileCheck } from 'lucide-react';
import { formatDate } from '../../core/security';

export default function ReportsView({ requests }) {
  const pending = requests.filter((r) => r.status === 'pending').length;
  const underReview = requests.filter((r) => r.status === 'under_review').length;
  const approved = requests.filter((r) => r.status === 'approved').length;
  const issued = requests.filter((r) => r.status === 'issued').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Admin Operations & Monthly Analytics Reports</h2>
          <p className="text-xs text-slate-500 mt-1">
            Summary of verification throughput, monthly request volume quantities, and daily clearance issuance totals.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold"
        >
          <Printer className="w-4 h-4" />
          <span>Print Summary</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Received" value={requests.length} icon={BarChart2} color="blue" />
        <StatCard title="Under Verification" value={underReview} icon={Clock} color="amber" />
        <StatCard title="Approved & Ready" value={approved} icon={CheckSquare} color="emerald" />
        <StatCard title="Claimed / Issued" value={issued} icon={FileCheck} color="purple" />
      </div>

      {/* Monthly Processing Quantities Component */}
      <MonthlyAnalytics requests={requests} />

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-4">Latest Application Pipeline Log</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Tracking</th>
                <th className="p-3">Applicant</th>
                <th className="p-3">Document</th>
                <th className="p-3">Status</th>
                <th className="p-3">Updated Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-slate-900">{r.tracking_number}</td>
                  <td className="p-3 font-semibold text-slate-800">{r.resident_name}</td>
                  <td className="p-3 text-slate-700">{r.document_title}</td>
                  <td className="p-3"><Badge variant={r.status}>{r.status}</Badge></td>
                  <td className="p-3 text-slate-500">{formatDate(r.updated_at || r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
