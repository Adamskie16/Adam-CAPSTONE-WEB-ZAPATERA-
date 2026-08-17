// SuperAdmin/src/features/dashboard/DashboardView.jsx
import React, { useState } from 'react';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import { Users, FileCheck, AlertCircle, Calendar, Shield, Activity, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '../../core/security';
import MonthlyAnalytics from '../../components/MonthlyAnalytics';

export default function DashboardView({ users, docTypes, requests, events, logs, config }) {
  const totalUsers = users.length;
  const totalResidents = users.filter((u) => u.role === 'resident').length;
  const totalAdmins = users.filter((u) => u.role === 'admin' || u.role === 'super_admin').length;

  const pendingRequests = requests.filter((r) => r.status === 'pending' || r.status === 'under_review').length;
  const approvedRequests = requests.filter((r) => r.status === 'approved' || r.status === 'issued').length;

  const totalFeesCollected = requests
    .filter((r) => r.status === 'approved' || r.status === 'issued')
    .reduce((sum, r) => sum + (Number(r.fee) || 0), 0);

  const [statusFilter, setStatusFilter] = useState('all');

  const filteredRequests = requests.filter((request) => {
    if (statusFilter === 'all') return true;
    return request.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-3">
            <Shield className="w-3.5 h-3.5 mr-1" /> Super Admin Control Console
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">{config?.barangay_name || 'Barangay Zapatera'} System Overview</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Real-time monitoring of document issuance performance, security audit logs, user provisioning, and barangay governance operations.
          </p>
        </div>
        <div className="hidden lg:block text-right border-l border-slate-700/60 pl-8">
          <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">System Reference</p>
          <p className="text-lg font-mono font-bold text-blue-400 mt-0.5">{config?.doc_prefix || 'BZ-2026'}</p>
          <p className="text-xs text-slate-400 mt-1">{config?.office_hours || 'Mon-Fri 8AM-5PM'}</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Registered Accounts"
          value={totalUsers}
          icon={Users}
          color="blue"
          subtitle={`${totalResidents} Residents | ${totalAdmins} Admins`}
        />
        <StatCard
          title="Pending / Under Review"
          value={pendingRequests}
          icon={AlertCircle}
          color="amber"
          subtitle="Requests awaiting action"
        />
        <StatCard
          title="Documents Issued / Approved"
          value={approvedRequests}
          icon={FileCheck}
          color="purple"
          subtitle="Successfully processed"
        />
        <StatCard
          title="Document Fee Collections"
          value={formatCurrency(totalFeesCollected)}
          icon={DollarSign}
          color="emerald"
          subtitle="Total fees from issued clearance"
        />
      </div>

      {/* Monthly Analytics Overview Widget */}
      <MonthlyAnalytics requests={requests} />

      {/* Grid Section: System Health & Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Requests Overview */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Recent Document Requests
              </h3>
              <p className="text-xs text-slate-500">
                Live feed of resident submissions
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </span>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-sm font-medium text-slate-700 border-none outline-none focus:ring-0 cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                </select>
              </div>

              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl">
                {filteredRequests.length} Result
                {filteredRequests.length !== 1 && "s"}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3 rounded-l-lg">Tracking No.</th>
                  <th className="p-3">Applicant</th>
                  <th className="p-3">Document</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 rounded-r-lg">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.length > 0 ? (
                  filteredRequests.slice(0, 5).map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-semibold text-slate-900">
                        {req.tracking_number}
                      </td>

                      <td className="p-3">
                        <p className="font-semibold text-slate-800">
                          {req.resident_name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {req.resident_email}
                        </p>
                      </td>

                      <td className="p-3 font-medium text-slate-700">
                        {req.document_title}
                      </td>

                      <td className="p-3">
                        <Badge variant={req.status}>
                          {req.status?.replace("_", " ")}
                        </Badge>
                      </td>

                      <td className="p-3 text-slate-500">
                        {formatDate(req.created_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-6 text-center text-slate-500"
                    >
                      No document requests found for the selected status.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Recent Audit Trail */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">Security Audit Log</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Live Logs</span>
            </div>

            <div className="space-y-3">
              {logs.slice(0, 4).map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">{log.action}</span>
                    <Badge variant={log.level}>{log.level}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">{log.details}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>{log.user_email}</span>
                    <span>{formatDate(log.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-500">System Logs auto-synchronized with Supabase RLS audit policies.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
