// Admin/src/features/documents/DocumentTemplate.jsx
import React from 'react';
import { formatIssuedDateOrdinal } from './documentTemplates';

/**
 * Standard A4 Printable Document Template (210mm x 297mm)
 * Used identically for live on-screen preview and browser print / PDF generation.
 */
export default function DocumentTemplate({
  documentTitle = 'BARANGAY CERTIFICATION',
  name = '',
  address = '',
  dateOfBirth = '',
  contactNo = '',
  yearsInBarangay = '',
  purpose = '',
  issuedDate = '',
  issuedLocation = 'Barangay Zapatera, Cebu City, Philippines',
  bodyText = 'This is to certify that the above named person is a resident of the barangay and known to be of good moral standing.',
  signatoryName = 'HON. DAVID M. AGRAVANTE',
  signatoryTitle = 'Punong Barangay',
  logoUrl = '/logo.jpg',
}) {
  const formattedDate = formatIssuedDateOrdinal(issuedDate);

  return (
    <div className="document-a4-page bg-white text-slate-900 font-serif leading-normal select-text shadow-xl print:shadow-none border border-slate-200 print:border-none mx-auto relative box-border overflow-hidden">
      <div className="document-inner-content flex flex-col justify-between h-full p-[18mm] sm:p-[20mm]">
        
        {/* HEADER SECTION */}
        <div className="text-center space-y-1 relative pb-4 border-b-2 border-slate-900">
          {/* Logo */}
          <div className="absolute left-0 top-0 w-20 h-20 flex items-center justify-center">
            <img
              src={logoUrl}
              alt="Barangay Zapatera Seal"
              className="w-18 h-18 object-contain rounded-full border border-slate-300"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>

          <div className="space-y-0.5">
            <p className="text-xs uppercase tracking-widest font-sans font-medium text-slate-700">
              Republic of the Philippines
            </p>
            <p className="text-sm font-bold uppercase tracking-wider text-slate-800">
              City of Cebu
            </p>
            <p className="text-lg font-extrabold uppercase tracking-wide text-blue-900 font-sans">
              Barangay Zapatera
            </p>
          </div>

          <div className="text-[11px] text-slate-600 font-sans space-y-0.5 pt-1">
            <p>197 D. Jakosalem St., Cebu City</p>
            <p>(032)503-6465 • email add: zapatera.lnb24@gmail.com</p>
          </div>

          <div className="pt-2">
            <p className="text-xs font-bold font-sans tracking-widest text-slate-900 uppercase">
              OFFICE OF THE PUNONG BARANGAY
            </p>
          </div>
        </div>

        {/* DOCUMENT TITLE */}
        <div className="my-6 text-center">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-[0.18em] font-sans text-slate-900 underline underline-offset-8 decoration-2 decoration-slate-900">
            {documentTitle || 'BARANGAY CERTIFICATION'}
          </h1>
        </div>

        {/* RESIDENT INFORMATION TABLE */}
        <div className="my-4 bg-slate-50/60 print:bg-transparent rounded-lg p-4 print:p-0 border border-slate-200 print:border-none">
          <div className="space-y-2.5 text-xs sm:text-sm text-slate-800">
            <div className="flex">
              <span className="w-40 font-bold font-sans text-slate-900 shrink-0">Name :</span>
              <span className="font-bold underline decoration-slate-400 underline-offset-2 uppercase flex-1 break-words">
                {name || '________________________________________'}
              </span>
            </div>

            <div className="flex">
              <span className="w-40 font-bold font-sans text-slate-900 shrink-0">Address :</span>
              <span className="flex-1 break-words">
                {address || 'Barangay Zapatera, Cebu City'}
              </span>
            </div>

            <div className="flex">
              <span className="w-40 font-bold font-sans text-slate-900 shrink-0">Date of Birth :</span>
              <span className="flex-1">
                {dateOfBirth || '____________________'}
              </span>
            </div>

            <div className="flex">
              <span className="w-40 font-bold font-sans text-slate-900 shrink-0">Contact No. :</span>
              <span className="flex-1 font-mono">
                {contactNo || '____________________'}
              </span>
            </div>

            <div className="flex">
              <span className="w-40 font-bold font-sans text-slate-900 shrink-0">Years in Barangay :</span>
              <span className="flex-1">
                {yearsInBarangay ? `${yearsInBarangay}` : '____________________'}
              </span>
            </div>

            <div className="flex">
              <span className="w-40 font-bold font-sans text-slate-900 shrink-0">Purpose :</span>
              <span className="font-bold underline decoration-slate-400 underline-offset-2 flex-1 break-words text-slate-900">
                {purpose || '________________________________________'}
              </span>
            </div>
          </div>
        </div>

        {/* CERTIFICATION BODY PARAGRAPH */}
        <div className="my-6 space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed text-justify">
          <p className="indent-10">
            {bodyText ||
              'This is to certify that the above named person is a resident of the barangay and known to be of good moral standing.'}
          </p>

          <p className="indent-10">
            Issued and signed this <span className="font-bold text-slate-950">{formattedDate}</span> at{' '}
            <span className="font-bold text-slate-950">{issuedLocation}</span>.
          </p>
        </div>

        {/* SIGNATURE & OFFICIAL SEAL SECTION */}
        <div className="mt-8 pt-4 flex items-end justify-between">
          {/* Official Seal Watermark / Box */}
          <div className="w-36 h-28 border-2 border-dashed border-slate-400 rounded-lg flex flex-col items-center justify-center text-center p-2 text-slate-400">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500">
              NOT VALID WITHOUT
            </span>
            <span className="text-[11px] font-sans font-black uppercase tracking-widest text-slate-600 mt-0.5">
              OFFICIAL SEAL
            </span>
          </div>

          {/* Punong Barangay Signature */}
          <div className="text-center min-w-[240px]">
            <div className="h-10"></div>
            <p className="text-sm sm:text-base font-black text-slate-950 uppercase font-sans tracking-wide border-b-2 border-slate-900 pb-1">
              {signatoryName}
            </p>
            <p className="text-xs font-bold text-slate-600 uppercase font-sans mt-1">
              {signatoryTitle}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
