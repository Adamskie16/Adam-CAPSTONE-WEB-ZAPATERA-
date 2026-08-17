// Resident/src/components/CertificateView.tsx
import React from 'react';
import { ShieldCheck, Printer } from 'lucide-react';
import { DocumentRequest, BarangayConfig } from '../types';

interface CertificateViewProps {
  request: DocumentRequest;
  config?: BarangayConfig;
}

export default function CertificateView({ request, config }: CertificateViewProps) {
  if (!request) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-200">
        <span className="text-xs font-bold text-emerald-900 flex items-center">
          <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" /> Authenticated Digital Document
        </span>
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      <div className="bg-white p-8 rounded-2xl border-4 border-double border-slate-300 shadow-lg space-y-6 font-serif text-slate-900">
        <div className="text-center space-y-1 border-b border-slate-300 pb-4">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-sans">Republic of the Philippines</p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
            Province of {config?.province || 'Cebu'}, City of {config?.municipality || 'Cebu City'}
          </p>
          <h2 className="text-xl font-extrabold uppercase text-slate-900 font-sans">
            {config?.barangay_name || 'BARANGAY ZAPATERA'}
          </h2>
          <p className="text-xs italic text-slate-500 font-sans">Office of the Barangay Captain</p>
        </div>

        <div className="text-center py-2">
          <h1 className="text-2xl font-black uppercase tracking-widest text-slate-900 underline decoration-slate-400 underline-offset-8">
            OFFICIAL {request.document_title?.toUpperCase()}
          </h1>
          <p className="text-xs font-mono font-bold text-slate-600 mt-3 font-sans">
            CONTROL NO: <span className="text-emerald-700 font-extrabold">{request.tracking_number}</span>
          </p>
        </div>

        <div className="text-sm text-slate-800 space-y-4 leading-relaxed font-sans px-4">
          <p className="font-semibold text-slate-900">TO WHOM IT MAY CONCERN:</p>
          <p className="indent-8 text-justify">
            THIS IS TO CERTIFY that <span className="font-bold uppercase text-slate-900 text-base underline">{request.resident_name}</span>, a bonafide resident of <span className="font-bold">Barangay Zapatera, Cebu City</span>, is hereby cleared of any legal or administrative encumbrance in this barangay jurisdiction.
          </p>
          <p className="indent-8 text-justify">
            Issued for purpose of: <span className="font-bold text-slate-900">"{request.purpose}"</span>.
          </p>
        </div>

        <div className="pt-8 grid grid-cols-2 gap-8 text-center font-sans text-xs">
          <div className="pt-4 border-t border-slate-300">
            <p className="font-bold text-slate-900 uppercase">{request.processed_by || 'MARIA SANTOS'}</p>
            <p className="text-[10px] text-slate-500">Barangay Secretary</p>
          </div>
          <div className="pt-4 border-t border-slate-300">
            <p className="font-bold text-slate-900 uppercase">HON. EXECUTIVE CAPTAIN</p>
            <p className="text-[10px] text-slate-500">Punong Barangay</p>
          </div>
        </div>
      </div>
    </div>
  );
}
