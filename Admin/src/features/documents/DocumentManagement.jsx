// Admin/src/features/documents/DocumentManagement.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Printer,
  User,
  Search,
  Check,
  RefreshCw,
  Calendar,
  MapPin,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Phone,
  Clock,
  Cake,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { documentTemplates, formatIssuedDateOrdinal } from './documentTemplates';
import DocumentTemplate from './DocumentTemplate';

export default function DocumentManagement({ docTypes = [] }) {
  // 1. Template selection state
  const templateKeys = Object.keys(documentTemplates);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('barangayCertification');
  
  // 2. Dynamic Certificate Variables
  const [documentTitle, setDocumentTitle] = useState(documentTemplates.barangayCertification.title);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('Barangay Zapatera, Cebu City');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [yearsInBarangay, setYearsInBarangay] = useState('5 years');
  const [purpose, setPurpose] = useState(documentTemplates.barangayCertification.defaultPurpose);
  const [issuedDate, setIssuedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [issuedLocation, setIssuedLocation] = useState('Barangay Zapatera, Cebu City, Philippines');
  const [bodyText, setBodyText] = useState(documentTemplates.barangayCertification.defaultBody);
  const [signatoryName, setSignatoryName] = useState('HON. DAVID M. AGRAVANTE');
  const [signatoryTitle, setSignatoryTitle] = useState('Punong Barangay');

  // 3. Supabase Residents State
  const [residents, setResidents] = useState([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [residentSearchInput, setResidentSearchInput] = useState('');
  const [showResidentDropdown, setShowResidentDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch Residents from Supabase
  const fetchResidentsFromSupabase = async () => {
    setLoadingResidents(true);
    let fetched = [];

    try {
      if (isSupabaseConfigured()) {
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .order('full_name', { ascending: true });

        if (profileData && profileData.length > 0) {
          profileData.forEach((p) => {
            const role = (p.role || p.user_role || '').toLowerCase();
            // Include residents or accounts without elevated admin rights
            if (role === 'resident' || role === 'user' || !role) {
              const fullName =
                p.full_name ||
                p.fullName ||
                `${p.first_name || ''} ${p.last_name || ''}`.trim() ||
                p.email ||
                '';
              if (fullName) {
                fetched.push({
                  id: p.id,
                  fullName,
                  email: p.email || '',
                  address: p.address || p.purok || 'Barangay Zapatera, Cebu City',
                  dateOfBirth: p.date_of_birth || p.birthdate || p.dob || p.birthday || '',
                  contactNo: p.phone || p.contact_no || p.contact_number || p.mobile || '',
                  yearsInBarangay:
                    p.years_in_barangay ||
                    p.years_of_residency ||
                    p.residency_years ||
                    (p.created_at ? `${Math.max(1, new Date().getFullYear() - new Date(p.created_at).getFullYear())} years` : ''),
                });
              }
            }
          });
        }
      }
    } catch (err) {
      console.warn('Supabase profiles fetch notice:', err);
    }

    setResidents(fetched);
    if (fetched.length > 0 && !name) {
      handleSelectResident(fetched[0]);
    }
    setLoadingResidents(false);
  };

  useEffect(() => {
    fetchResidentsFromSupabase();
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowResidentDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle template selection
  const handleSelectTemplate = (key) => {
    setSelectedTemplateKey(key);
    const tmpl = documentTemplates[key];
    if (tmpl) {
      setDocumentTitle(tmpl.title);
      setBodyText(tmpl.defaultBody);
      setPurpose(tmpl.defaultPurpose);
    }
  };

  // Handle selecting a resident from dropdown
  const handleSelectResident = (res) => {
    setName(res.fullName);
    setResidentSearchInput(res.fullName);
    if (res.address) setAddress(res.address);
    if (res.dateOfBirth) setDateOfBirth(res.dateOfBirth);
    if (res.contactNo) setContactNo(res.contactNo);
    if (res.yearsInBarangay) setYearsInBarangay(res.yearsInBarangay);
    setShowResidentDropdown(false);
  };

  // Filter residents matching search
  const filteredResidents = residents.filter((r) => {
    if (!residentSearchInput.trim()) return true;
    const query = residentSearchInput.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(query) ||
      (r.email && r.email.toLowerCase().includes(query)) ||
      (r.address && r.address.toLowerCase().includes(query))
    );
  });

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  const currentTemplateConfig = documentTemplates[selectedTemplateKey] || documentTemplates.barangayCertification;

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Official Document Generator
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              A4 Dynamic
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure dynamic variables, preview live certificate, and print or export to PDF with zero layout shift.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchResidentsFromSupabase}
            disabled={loadingResidents}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Reload Residents from Supabase"
          >
            <RefreshCw size={14} className={loadingResidents ? 'animate-spin text-blue-600' : ''} />
            <span>{loadingResidents ? 'Syncing...' : 'Sync Residents'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Printer size={16} />
            <span>Print Document</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Left Controls | Right Live A4 Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Controls & Dynamic Variables (5 Cols) */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* 1. Document Template Quick Switch */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-600" />
              <span>Select Document Template</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {templateKeys.map((k) => {
                const tmpl = documentTemplates[k];
                const isActive = selectedTemplateKey === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleSelectTemplate(k)}
                    className={`p-2.5 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{tmpl.title}</span>
                      {isActive && <Check size={14} className="text-blue-600 shrink-0 ml-1" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Editable Dynamic Variables Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-100 pb-2">
              Dynamic Variable Fields
            </h3>

            {/* Variable: documentTitle */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                1. Document Title <span className="text-blue-600 font-mono font-normal">{"{documentTitle}"}</span>
              </label>
              <input
                type="text"
                required
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value.toUpperCase())}
                placeholder="e.g. BARANGAY CERTIFICATION"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold tracking-wide uppercase text-slate-900"
              />
            </div>

            {/* Variable: name & Supabase Selector */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <User size={13} className="text-blue-600" />
                  <span>2. Name</span>
                  <span className="text-blue-600 font-mono font-normal">{"{name}"}</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">{residents.length} in database</span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setResidentSearchInput(e.target.value);
                    setShowResidentDropdown(true);
                  }}
                  onFocus={() => setShowResidentDropdown(true)}
                  placeholder="Select or enter resident name..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
                />
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Resident Dropdown Selection */}
              {showResidentDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {filteredResidents.length > 0 ? (
                    filteredResidents.map((r) => (
                      <div
                        key={r.id || r.email || r.fullName}
                        onClick={() => handleSelectResident(r)}
                        className="p-2.5 text-xs hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{r.fullName}</p>
                          <p className="text-[10px] text-slate-500">{r.address}</p>
                        </div>
                        {r.fullName.toLowerCase() === name.toLowerCase() && (
                          <Check size={14} className="text-blue-600 shrink-0" />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-[11px] text-slate-400 text-center">
                      No matching registered resident found. You can type manually above.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Variable: address */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin size={13} className="text-blue-600" />
                <span>3. Address</span>
                <span className="text-blue-600 font-mono font-normal">{"{address}"}</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 197 D. Jakosalem St., Zapatera, Cebu City"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            {/* Variables: dateOfBirth & contactNo in grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Cake size={13} className="text-blue-600" />
                  <span>4. Date of Birth</span>
                </label>
                <input
                  type="text"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  placeholder="e.g. Jan 15, 1995"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone size={13} className="text-blue-600" />
                  <span>5. Contact No.</span>
                </label>
                <input
                  type="text"
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value)}
                  placeholder="e.g. 09171234567"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                />
              </div>
            </div>

            {/* Variable: yearsInBarangay & issuedLocation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock size={13} className="text-blue-600" />
                  <span>6. Years in Barangay</span>
                </label>
                <input
                  type="text"
                  value={yearsInBarangay}
                  onChange={(e) => setYearsInBarangay(e.target.value)}
                  placeholder="e.g. 5 years / 10 years"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar size={13} className="text-blue-600" />
                  <span>8. Issued Date</span>
                </label>
                <input
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans text-slate-900"
                />
              </div>
            </div>

            {/* Dynamic Ordinal Date Preview Banner */}
            <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-[11px] text-blue-900">
              <span className="font-bold">Dynamic Ordinal Date: </span>
              <span className="font-serif italic font-medium">{formatIssuedDateOrdinal(issuedDate)}</span>
            </div>

            {/* Variable: purpose */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">
                  7. Purpose <span className="text-blue-600 font-mono font-normal">{"{purpose}"}</span>
                </label>
              </div>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Local Employment, Scholarship, Bank Requirement"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
              />

              {/* Quick Purpose Suggestion Pills */}
              {currentTemplateConfig.suggestedPurposes && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {currentTemplateConfig.suggestedPurposes.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPurpose(p)}
                      className={`text-[10px] px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                        purpose === p
                          ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Variable: issuedLocation */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                9. Issued Location <span className="text-blue-600 font-mono font-normal">{"{issuedLocation}"}</span>
              </label>
              <input
                type="text"
                value={issuedLocation}
                onChange={(e) => setIssuedLocation(e.target.value)}
                placeholder="Barangay Zapatera, Cebu City, Philippines"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            {/* Certificate Body Text (Editable & Extensible) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Certification Body Text</label>
                <button
                  type="button"
                  onClick={() => setBodyText(currentTemplateConfig.defaultBody)}
                  className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={10} />
                  <span>Reset to default</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 leading-relaxed text-xs"
              />
            </div>

            {/* Signatory Settings */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Signatory Name</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Signatory Title</label>
                <input
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Live A4 Preview (7 Cols) */}
        <div className="xl:col-span-7 bg-slate-100/90 rounded-3xl p-4 sm:p-8 border border-slate-200 flex flex-col items-center justify-start min-h-[750px] overflow-hidden">
          
          <div className="w-full flex items-center justify-between mb-4 px-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live A4 Document Preview</span>
            </span>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>
          </div>

          {/* Scaled Preview Frame */}
          <div className="w-full overflow-x-auto flex justify-center py-2">
            <div className="transform scale-[0.80] sm:scale-[0.88] lg:scale-[0.92] origin-top transition-transform duration-200">
              <DocumentTemplate
                documentTitle={documentTitle}
                name={name}
                address={address}
                dateOfBirth={dateOfBirth}
                contactNo={contactNo}
                yearsInBarangay={yearsInBarangay}
                purpose={purpose}
                issuedDate={issuedDate}
                issuedLocation={issuedLocation}
                bodyText={bodyText}
                signatoryName={signatoryName}
                signatoryTitle={signatoryTitle}
              />
            </div>
          </div>
        </div>

      </div>

      {/* HIDDEN PRINT ROOT: Rendered ONLY when window.print() is executed */}
      <div id="printable-document-root" className="hidden print:block">
        <DocumentTemplate
          documentTitle={documentTitle}
          name={name}
          address={address}
          dateOfBirth={dateOfBirth}
          contactNo={contactNo}
          yearsInBarangay={yearsInBarangay}
          purpose={purpose}
          issuedDate={issuedDate}
          issuedLocation={issuedLocation}
          bodyText={bodyText}
          signatoryName={signatoryName}
          signatoryTitle={signatoryTitle}
        />
      </div>
    </div>
  );
}
