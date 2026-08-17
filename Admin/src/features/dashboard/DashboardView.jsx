// Admin/src/features/dashboard/DashboardView.jsx
import React from 'react';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import { Inbox, CheckSquare, FileCheck2, Clock, Activity, AlertCircle } from 'lucide-react';
import { formatDate } from '../../core/security';
import MonthlyAnalytics from '../../components/MonthlyAnalytics';

export default function DashboardView({ requests, events, logs, setActiveTab }) {
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const reviewRequests = requests.filter((r) => r.status === 'under_review');
  const approvedRequests = requests.filter((r) => r.status === 'approved');
  const issuedRequests = requests.filter((r) => r.status === 'issued');

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-3">
            <CheckSquare className="w-3.5 h-3.5 mr-1" /> Barangay Admin Operations
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">Barangay Zapatera Issuance Desk</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Receive incoming resident document applications, inspect supporting identity documents, process approvals, and issue official certificates.
          </p>
        </div>

        <div className="hidden sm:flex space-x-3">
          <button
            onClick={() => setActiveTab('receive_request')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
          >
            Open Request Inbox ({pendingRequests.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="New Requests Inbox"
          value={pendingRequests.length}
          icon={Inbox}
          color="amber"
          subtitle="Awaiting initial desk review"
        />
        <StatCard
          title="Under Active Verification"
          value={reviewRequests.length}
          icon={Clock}
          color="blue"
          subtitle="IDs & requirements check"
        />
        <StatCard
          title="Approved (Ready for Pickup)"
          value={approvedRequests.length}
          icon={CheckSquare}
          color="emerald"
          subtitle="Certificate generated"
        />
        <StatCard
          title="Officially Issued"
          value={issuedRequests.length}
          icon={FileCheck2}
          color="purple"
          subtitle="Claimed by resident"
        />
      </div>

      {/* Monthly Analytics Widget */}
      <MonthlyAnalytics requests={requests} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Requests Stream */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Incoming Applications Queue</h3>
              <p className="text-xs text-slate-500">Requires administrative verification</p>
            </div>
            <button
              onClick={() => setActiveTab('receive_request')}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              View All Queue ➔
            </button>
          </div>

          <div className="space-y-3">
            {requests.slice(0, 5).map((req) => (
              <div key={req.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:bg-slate-100/80 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs text-slate-900">{req.tracking_number}</span>
                    <Badge variant={req.status}>{req.status?.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs font-bold text-slate-800">{req.resident_name} — <span className="text-blue-700">{req.document_title}</span></p>
                  <p className="text-[11px] text-slate-500">Purpose: {req.purpose}</p>
                </div>

                <button
                  onClick={() => setActiveTab('process_documents')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Verify Application
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Logs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">Admin Action Logs</h3>
              </div>
            </div>

            <div className="space-y-3">
              {logs.slice(0, 4).map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">{log.action}</span>
                    <Badge variant={log.level}>{log.level}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">{log.details}</p>
                  <span className="text-[10px] text-slate-400 block pt-1">{formatDate(log.created_at)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-400">Barangay Zapatera Document Issuance System</span>
          </div>
        </div>
      </div>
    </div>
  );
}
