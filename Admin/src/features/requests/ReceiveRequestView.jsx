// Admin/src/features/requests/ReceiveRequestView.jsx
import React, { useState } from 'react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { Inbox, Search, Filter, Eye, CheckSquare, FileText, User, Mail, DollarSign } from 'lucide-react';
import { formatDate, formatCurrency } from '../../core/security';
import { TableSkeleton } from '../../components/SkeletonLoader';

export default function ReceiveRequestView({ requests = [], onProcessRequest, loading = false }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReq, setSelectedReq] = useState(null);

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch =
      r.tracking_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.resident_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.document_title?.toLowerCase().includes(search.toLowerCase()) ||
      r.purpose?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Receive & Inspect Requests</h2>
          <p className="text-xs text-slate-500 mt-1">
            Central inbox of document applications submitted by residents. Review applicant details and attached proof.
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Inbox className="w-4 h-4 mr-1 text-amber-600" />
          {requests.filter((r) => r.status === 'pending').length} Unprocessed Applications
        </span>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-2">
          {['all', 'pending', 'under_review', 'approved', 'declined'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'All Applications' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tracking no, resident or purpose..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4">Tracking Number</th>
                <th className="p-4">Resident Applicant</th>
                <th className="p-4">Document Requested</th>
                <th className="p-4">Pick-Up Time Slot</th>
                <th className="p-4">Purpose</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date Submitted</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <TableSkeleton rows={6} cols={8} isDarkMode={false} />
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No requests found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900">{req.tracking_number}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{req.resident_name}</p>
                      <p className="text-[11px] text-slate-400">{req.resident_email}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-800">{req.document_title}</p>
                      <p className="text-[11px] text-emerald-700 font-bold">
                        {req.fee > 0 ? formatCurrency(req.fee) : 'Free'}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[11px] font-bold">
                        {req.pickup_time_slot || '3:00 PM - 3:30 PM'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">{req.purpose}</td>
                    <td className="p-4">
                      <Badge variant={req.status}>{req.status?.replace('_', ' ')}</Badge>
                    </td>
                    <td className="p-4 text-slate-500">{formatDate(req.created_at)}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedReq(req)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title={`Application Details - ${selectedReq?.tracking_number}`}
      >
        {selectedReq && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Applicant Name</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedReq.resident_name}</p>
                <p className="text-slate-500">{selectedReq.resident_email}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Requested Clearance & Pick-Up Slot</p>
                <p className="text-sm font-bold text-blue-700 mt-0.5">{selectedReq.document_title}</p>
                <p className="font-mono font-bold text-slate-800 mt-0.5">Pick-Up: <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{selectedReq.pickup_time_slot || '3:00 PM - 3:30 PM'}</span></p>
              </div>
            </div>

            <div>
              <p className="font-bold text-slate-700 mb-1">Stated Purpose:</p>
              <p className="p-3 bg-white border border-slate-200 rounded-lg text-slate-800 leading-relaxed">
                {selectedReq.purpose}
              </p>
            </div>

            <div>
              <p className="font-bold text-slate-700 mb-1">Attached Verification Requirements:</p>
              <div className="space-y-1.5">
                {selectedReq.requirements_attached?.map((file, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-100 rounded-lg flex items-center justify-between font-mono">
                    <span className="text-slate-700 font-semibold">{file}</span>
                    <span className="text-emerald-600 font-bold text-[10px]">Verified Attachment</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
