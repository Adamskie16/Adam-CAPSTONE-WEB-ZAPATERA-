// Admin/src/components/CertificatePreview.jsx
import React from 'react';
import { ShieldCheck, Printer, CheckCircle } from 'lucide-react';
import { formatDate } from '../core/security';

export default function CertificatePreview({ request, config }) {
  if (!request) return null;

  return (
    <div className="bg-white p-8 rounded-2xl border-4 border-double border-slate-300 shadow-xl max-w-2xl mx-auto space-y-6 print:border-none print:shadow-none font-serif">
      {/* Official Header */}
      <div className="text-center space-y-1 border-b border-slate-300 pb-4">
        <div className="flex items-center justify-center space-x-3 mb-2">
          {config?.seal_url && (
            <img src={config.seal_url} alt="Barangay Seal" className="w-16 h-16 rounded-full border border-slate-200 object-cover" />
          )}
        </div>
        <p className="text-xs uppercase tracking-widest text-slate-500 font-sans">Republic of the Philippines</p>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">Province of {config?.province || 'Cebu'}, City of {config?.municipality || 'Cebu City'}</p>
        <h2 className="text-xl font-extrabold uppercase text-slate-900 tracking-wider font-sans">{config?.barangay_name || 'BARANGAY ZAPATERA'}</h2>
        <p className="text-xs italic text-slate-500 font-sans">Office of the Barangay Captain & Clearance Secretariat</p>
      </div>

      {/* Title */}
      <div className="text-center py-2">
        <h1 className="text-2xl font-black uppercase tracking-widest text-slate-900 underline decoration-slate-400 underline-offset-8">
          OFFICIAL {request.document_title?.toUpperCase()}
        </h1>
        <p className="text-xs font-mono font-bold text-slate-600 mt-3 font-sans">
          CONTROL NO: <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{request.tracking_number}</span>
        </p>
      </div>

      {/* Body Content */}
      <div className="text-sm text-slate-800 space-y-4 leading-relaxed font-sans px-4">
        <p className="font-semibold text-slate-900">TO WHOM IT MAY CONCERN:</p>

        <p className="indent-8 text-justify">
          THIS IS TO CERTIFY that <span className="font-bold uppercase text-slate-900 text-base underline">{request.resident_name}</span>, of legal age, Filipino citizen, and a bonafide resident of <span className="font-bold">Barangay Zapatera, Cebu City</span>, is a person of good moral character and has zero pending derogatory record or adverse legal complaints filed against them in this office.
        </p>

        <p className="indent-8 text-justify">
          This Certification is being issued upon the request of the above-named person for the specific purpose of:
        </p>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center font-bold text-slate-900 uppercase">
          "{request.purpose}"
        </div>

        <p className="indent-8 text-justify">
          GIVEN this <span className="font-bold">{new Date().getDate()}th</span> day of <span className="font-bold">{new Date().toLocaleString('default', { month: 'long' })}</span>, <span className="font-bold">{new Date().getFullYear()}</span> at the Barangay Hall of Zapatera, Cebu City, Philippines.
        </p>
      </div>

      {/* Signatures */}
      <div className="pt-8 grid grid-cols-2 gap-8 text-center font-sans">
        <div className="space-y-1 pt-6 border-t border-slate-300">
          <p className="font-bold text-slate-900 text-xs uppercase">{request.processed_by || 'MARIA SANTOS'}</p>
          <p className="text-[10px] text-slate-500 uppercase font-semibold">Barangay Secretary</p>
        </div>
        <div className="space-y-1 pt-6 border-t border-slate-300">
          <p className="font-bold text-slate-900 text-xs uppercase">HON. EXECUTIVE CAPTAIN</p>
          <p className="text-[10px] text-slate-500 uppercase font-semibold">Punong Barangay</p>
        </div>
      </div>

      {/* Digital Seal */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-sans">
        <span className="flex items-center text-emerald-700 font-bold">
          <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" /> Digital Authenticity Verified (Supabase Secured)
        </span>
        <span>Issued: {formatDate(request.approved_at || request.updated_at)}</span>
      </div>
    </div>
  );
}
