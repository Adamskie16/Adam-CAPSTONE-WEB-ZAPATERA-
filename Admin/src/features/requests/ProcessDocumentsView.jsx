// Admin/src/features/requests/ProcessDocumentsView.jsx
import React, { useState } from 'react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { CheckSquare, CheckCircle2, XCircle, AlertCircle, Clock, FileCheck, FileText, UserCheck } from 'lucide-react';
import { formatDate, formatCurrency, sanitizeInput } from '../../core/security';
import { CardGridSkeleton } from '../../components/SkeletonLoader';

export default function ProcessDocumentsView({ requests = [], onUpdateRequestStatus, currentUser, loading = false }) {
  const [selectedReq, setSelectedReq] = useState(null);
  const [actionType, setActionType] = useState('approve'); // approve, review, decline
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const pendingOrReviewRequests = requests.filter(
    (r) => r.status === 'pending' || r.status === 'under_review'
  );

  const openProcessModal = (req, type) => {
    setSelectedReq(req);
    setActionType(type);
    setNotes(req.notes || '');
    setRejectionReason('');
  };

  const handleExecuteAction = (e) => {
    e.preventDefault();
    if (!selectedReq) return;

    let newStatus = 'approved';
    if (actionType === 'review') newStatus = 'under_review';
    if (actionType === 'decline') newStatus = 'declined';

    const updatedPayload = {
      ...selectedReq,
      status: newStatus,
      notes: sanitizeInput(notes),
      rejection_reason: actionType === 'decline' ? sanitizeInput(rejectionReason) : '',
      processed_by: currentUser?.full_name || 'Maria Santos',
      approved_at: newStatus === 'approved' ? new Date().toISOString() : selectedReq.approved_at,
    };

    onUpdateRequestStatus(updatedPayload);
    setSelectedReq(null);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Process & Verify Documents Workspace</h2>
          <p className="text-xs text-slate-500 mt-1">
            Perform administrative verification of resident identity documents, record processing notes, and issue approvals.
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
          <UserCheck className="w-4 h-4 mr-1 text-blue-600" />
          {pendingOrReviewRequests.length} Pending Verification
        </span>
      </div>

      {/* Verification Desk Grid */}
      {loading ? (
        <CardGridSkeleton count={4} isDarkMode={false} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pendingOrReviewRequests.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {req.tracking_number}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-2">{req.resident_name}</h3>
                  <p className="text-xs text-slate-400">{req.resident_email}</p>
                </div>
                <Badge variant={req.status}>{req.status?.replace('_', ' ')}</Badge>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                <p className="font-bold text-slate-800">Document: <span className="text-blue-700">{req.document_title}</span></p>
                <p className="text-slate-600 font-semibold">Scheduled Pick-Up Slot: <span className="text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono font-bold">{req.pickup_time_slot || '3:00 PM - 3:30 PM'}</span></p>
                <p className="text-slate-600">Fee: <span className="font-bold text-emerald-700">{req.fee > 0 ? formatCurrency(req.fee) : 'Free'}</span></p>
                <p className="text-slate-600">Purpose: {req.purpose}</p>
              </div>

              <div className="mt-3 text-xs">
                <p className="font-bold text-slate-700 mb-1">Attached Proof Documents:</p>
                <div className="flex flex-wrap gap-1.5">
                  {req.requirements_attached?.map((file, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono text-slate-700">
                      {file}
                    </span>
                  ))}
                </div>
              </div>

              {req.notes && (
                <div className="mt-3 p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg text-[11px] text-blue-900">
                  <span className="font-bold">Admin Note:</span> {req.notes}
                </div>
              )}
            </div>

            {/* Verification Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                onClick={() => openProcessModal(req, 'review')}
                className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center space-x-1"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Mark Under Review</span>
              </button>
              <button
                onClick={() => openProcessModal(req, 'decline')}
                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center space-x-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Decline</span>
              </button>
              <button
                onClick={() => openProcessModal(req, 'approve')}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve Document</span>
              </button>
              </div>
            </div>
          ))}

          {pendingOrReviewRequests.length === 0 && (
            <div className="col-span-full p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Verification Queue Clear!</h3>
              <p className="text-xs text-slate-500">All submitted resident requests have been processed.</p>
            </div>
          )}
        </div>
      )}

      {/* Action Execution Modal */}
      <Modal
        isOpen={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title={`Execute Action — ${selectedReq?.tracking_number}`}
      >
        {selectedReq && (
          <form onSubmit={handleExecuteAction} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-900">{selectedReq.resident_name}</p>
              <p className="text-blue-700 font-semibold">{selectedReq.document_title}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Administrative Verification Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter verification notes (e.g. ID details verified against voter database...)"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {actionType === 'decline' && (
              <div>
                <label className="block text-xs font-bold text-rose-700 mb-1">Reason for Rejection (Visible to Resident)</label>
                <textarea
                  rows={2}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why the application was declined (e.g. Attached ID is blurry or expired)..."
                  className="w-full px-3 py-2 text-xs border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 bg-rose-50/40"
                />
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 font-semibold text-white rounded-lg shadow-sm capitalize ${
                  actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : actionType === 'decline'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Confirm {actionType} Application
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
