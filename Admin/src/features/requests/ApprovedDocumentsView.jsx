// Admin/src/features/requests/ApprovedDocumentsView.jsx
import React, { useState } from 'react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import CertificatePreview from '../../components/CertificatePreview';
import { FileCheck2, Eye, Printer, CheckCircle, PackageCheck } from 'lucide-react';
import { formatDate, formatCurrency } from '../../core/security';
import { CardGridSkeleton } from '../../components/SkeletonLoader';

export default function ApprovedDocumentsView({ requests = [], onUpdateRequestStatus, config, loading = false }) {
  const [selectedReq, setSelectedReq] = useState(null);

  const approvedOrIssuedRequests = requests.filter(
    (r) => r.status === 'approved' || r.status === 'issued'
  );

  const handleMarkAsIssued = (req) => {
    onUpdateRequestStatus({
      ...req,
      status: 'issued',
      issued_at: new Date().toISOString(),
    });
    if (selectedReq?.id === req.id) {
      setSelectedReq({ ...selectedReq, status: 'issued' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Approved Documents & Certificate Generation</h2>
          <p className="text-xs text-slate-500 mt-1">
            Generate official barangay clearances, preview digital certificates, and mark documents as officially claimed/issued.
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <FileCheck2 className="w-4 h-4 mr-1 text-emerald-600" />
          {approvedOrIssuedRequests.length} Approved Certificates
        </span>
      </div>

      {/* Approved Documents Grid */}
      {loading ? (
        <CardGridSkeleton count={4} isDarkMode={false} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {approvedOrIssuedRequests.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {req.tracking_number}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-2">{req.resident_name}</h3>
                    <p className="text-xs text-slate-400">{req.resident_email}</p>
                  </div>
                  <Badge variant={req.status}>{req.status}</Badge>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                  <p className="font-bold text-slate-800">Clearance: <span className="text-blue-700">{req.document_title}</span></p>
                  <p className="text-slate-600 font-semibold">Resident Pick-Up Time: <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{req.pickup_time_slot || '3:00 PM - 3:30 PM'}</span></p>
                  <p className="text-slate-600">Purpose: {req.purpose}</p>
                  <p className="text-slate-500">Processed By: <span className="font-bold">{req.processed_by || 'Maria Santos'}</span></p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Approved {formatDate(req.approved_at || req.updated_at)}</span>
                <div className="flex items-center space-x-2">
                  {req.status === 'approved' && (
                    <button
                      onClick={() => handleMarkAsIssued(req)}
                      className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Mark Issued / Claimed</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedReq(req)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Certificate Preview</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {approvedOrIssuedRequests.length === 0 && (
            <div className="col-span-full p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
              <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Approved Documents Yet</h3>
              <p className="text-xs text-slate-500">Documents will appear here once they are verified and approved in the Process Documents tab.</p>
            </div>
          )}
        </div>
      )}

      {/* Certificate Generator Modal */}
      <Modal
        isOpen={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title="Official Certificate Digital Copy Preview"
        maxWidth="max-w-3xl"
      >
        {selectedReq && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-2">
                <Badge variant={selectedReq.status}>{selectedReq.status}</Badge>
                <span className="text-xs font-mono font-bold text-slate-700">{selectedReq.tracking_number}</span>
              </div>
              <div className="flex items-center space-x-2">
                {selectedReq.status === 'approved' && (
                  <button
                    onClick={() => handleMarkAsIssued(selectedReq)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-xs"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Mark Issued</span>
                  </button>
                )}
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Certificate</span>
                </button>
              </div>
            </div>

            <CertificatePreview request={selectedReq} config={config} />
          </div>
        )}
      </Modal>
    </div>
  );
}
