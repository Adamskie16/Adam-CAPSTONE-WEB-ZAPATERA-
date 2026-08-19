// Admin/src/features/documents/DocumentManagement.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FileText, Printer, ShieldCheck, User, Search, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from '../../core/supabase';

export default function DocumentManagement({ docTypes = [] }) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [residents, setResidents] = useState([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  
  // Resident Search & Filter State
  const [residentInput, setResidentInput] = useState('');
  const [showResidentDropdown, setShowResidentDropdown] = useState(false);

  const [purpose, setPurpose] = useState('Local Employment');
  const dropdownRef = useRef(null);

  // Fetch Residents strictly from Supabase public.profiles table (role = resident)
  const fetchResidentsFromSupabase = async () => {
    setLoadingResidents(true);
    let fetched = [];

    try {
      if (isSupabaseConfigured()) {
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*');

        if (profileData && profileData.length > 0) {
          profileData.forEach((p) => {
            const role = (p.role || p.user_role || '').toLowerCase();
            // Strictly include accounts that belong to resident role or have no elevated admin role
            if (role === 'resident' || role === 'user') {
              const name = p.full_name || p.fullName || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email;
              if (name && !fetched.some((f) => f.fullName.toLowerCase() === name.toLowerCase())) {
                fetched.push({
                  id: p.id,
                  fullName: name,
                  email: p.email || '',
                  address: p.address || p.purok || 'Barangay Zapatera, Cebu City',
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
    if (fetched.length > 0 && !residentInput) {
      setResidentInput(fetched[0].fullName);
    }
    setLoadingResidents(false);
  };

  useEffect(() => {
    fetchResidentsFromSupabase();
  }, []);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowResidentDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (docTypes.length > 0 && !selectedDoc) {
      setSelectedDoc(docTypes[0]);
    } else if (docTypes.length > 0 && selectedDoc) {
      const current = docTypes.find((d) => (d.id || d.code) === (selectedDoc.id || selectedDoc.code));
      if (current) setSelectedDoc(current);
      else setSelectedDoc(docTypes[0]);
    }
  }, [docTypes]);

  const activeDoc = selectedDoc || docTypes[0];

  // Filter residents matching typed text input (or return all if input is empty)
  const filteredResidents = residents.filter((r) => {
    if (!residentInput || !residentInput.trim()) return true;
    const search = residentInput.trim().toLowerCase();
    const nameMatch = (r.fullName || '').toLowerCase().includes(search);
    const emailMatch = (r.email || '').toLowerCase().includes(search);
    const addressMatch = (r.address || '').toLowerCase().includes(search);
    return nameMatch || emailMatch || addressMatch;
  });

  const handleSelectResident = (resName) => {
    setResidentInput(resName);
    setShowResidentDropdown(false);
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Document Generator & Print</h2>
          <p className="text-xs text-slate-500 mt-1">Generate, preview, and print official barangay documents and certificates.</p>
        </div>
        <button
          onClick={fetchResidentsFromSupabase}
          disabled={loadingResidents}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer disabled:opacity-50"
          title="Reload Residents from Supabase"
        >
          <RefreshCw size={14} className={loadingResidents ? 'animate-spin' : ''} />
          <span>{loadingResidents ? 'Syncing...' : 'Sync Supabase Residents'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Document Types List */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Document Types</h3>
          {docTypes.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              No document types found. Switch to "Document Information Management" tab to add one.
            </div>
          ) : (
            docTypes.map((doc) => (
              <button
                key={doc.id || doc.code}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                  activeDoc && (activeDoc.id === doc.id || activeDoc.code === doc.code)
                    ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`p-2 rounded-lg ${
                      activeDoc && (activeDoc.id === doc.id || activeDoc.code === doc.code)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <FileText size={18} />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 mr-2">
                      {doc.code}
                    </span>
                    <span
                      className={`font-bold text-xs ${
                        activeDoc && (activeDoc.id === doc.id || activeDoc.code === doc.code)
                          ? 'text-blue-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {doc.title || doc.name}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{doc.description}</p>
              </button>
            ))
          )}
        </div>

        {/* Editor & Preview Panel */}
        <div className="lg:col-span-2 space-y-6">
          {activeDoc ? (
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-8 min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Document Certificate Generator & Preview</h4>
                    <p className="text-xs text-slate-500">Customize fields for {activeDoc.title || activeDoc.name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPreviewOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 cursor-pointer"
                  >
                    <Printer size={16} />
                    <span>Print Document</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 flex-1">
                {/* Left Controls - Interactive Supabase Resident Search */}
                <div className="space-y-6 border-r border-slate-100 pr-6 text-xs">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>Document Variables</span>
                    <span className="text-[9px] font-semibold text-emerald-600 font-mono">Supabase Live</span>
                  </h5>
                  
                  <div className="space-y-4">
                    {/* Text Input + Auto-Filtering Resident Selector */}
                    <div className="space-y-1 relative" ref={dropdownRef}>
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <User size={12} className="text-blue-600" />
                          <span>Resident Name</span>
                        </label>
                        <span className="text-[9px] text-slate-400 font-medium">{residents.length} Registered</span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={residentInput}
                          onChange={(e) => {
                            setResidentInput(e.target.value);
                            setShowResidentDropdown(true);
                          }}
                          onFocus={() => setShowResidentDropdown(true)}
                          placeholder="Type or filter resident name..."
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                        />
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>

                      {/* Dropdown suggestions matching Supabase residents strictly */}
                      {showResidentDropdown && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                          {filteredResidents.length > 0 ? (
                            filteredResidents.map((r) => {
                              const rName = r.fullName || r.full_name || '';
                              const isSelected = rName.toLowerCase() === residentInput.toLowerCase();
                              return (
                                <div
                                  key={r.id || r.email || rName}
                                  onClick={() => handleSelectResident(rName)}
                                  className={`p-2.5 text-xs hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors ${
                                    isSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'
                                  }`}
                                >
                                  <div>
                                    <p className="font-semibold">{rName}</p>
                                    {r.address && <p className="text-[10px] text-slate-400">{r.address}</p>}
                                  </div>
                                  {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-3 text-[11px] text-slate-400 text-center">
                              No matching resident in Supabase database.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Purpose</label>
                      <input
                        type="text"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder="e.g. Local Employment, Scholarship"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Header Style</label>
                      <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-medium text-slate-800">
                        <option>Official Centered Header</option>
                        <option>Left Aligned Official</option>
                        <option>Modern Minimalist Header</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right Preview - Updates Live as User Types */}
                <div className="md:col-span-3 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-8 flex flex-col items-center text-center overflow-y-auto max-h-[600px]">
                  <div className="w-full max-w-md bg-white shadow-2xl rounded-sm p-10 space-y-8 text-left border border-slate-100 scale-90 origin-top">
                    <div className="text-center border-b pb-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Republic of the Philippines</p>
                      <p className="text-xs font-bold text-slate-900">Province of Cebu</p>
                      <p className="text-xs font-bold text-slate-900">City of Cebu</p>
                      <p className="text-sm font-black text-blue-600 mt-1 uppercase text-center">Barangay Zapatera</p>
                    </div>

                    <div className="py-4">
                      <h5 className="text-center font-black text-xl text-slate-900 uppercase tracking-widest underline underline-offset-8 decoration-2 decoration-blue-500">
                        {activeDoc.title || activeDoc.name}
                      </h5>
                    </div>

                    <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                      <p>TO WHOM IT MAY CONCERN:</p>
                      <p>
                        This is to certify that{' '}
                        <span className="font-bold text-slate-900 underline underline-offset-2">
                          {residentInput || '[RESIDENT NAME]'}
                        </span>
                        , of legal age, Filipino, is a bona fide resident of Barangay Zapatera, Cebu City.
                      </p>
                      <p>{activeDoc.description}</p>
                      <p>
                        This certification is being issued upon the request of the above-named person for{' '}
                        <span className="font-bold text-slate-900 underline underline-offset-2">
                          {purpose || '[PURPOSE]'}
                        </span>
                        .
                      </p>
                      <p>
                        Issued this{' '}
                        <span className="font-bold text-slate-900">
                          {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        .
                      </p>
                    </div>

                    <div className="pt-12 flex justify-end">
                      <div className="text-center">
                        <div className="w-48 border-b-2 border-slate-900 mb-1"></div>
                        <p className="text-xs font-black text-slate-900 uppercase">Hon. Ricardo Dalisay</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase text-center">Barangay Captain</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-100">
              No document type selected. Add document types in Document Information Management tab.
            </div>
          )}
        </div>
      </div>

      {/* High-Resolution Print Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && activeDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            ></motion.div>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <Printer size={20} className="text-blue-600" />
                  <h3 className="text-lg font-bold text-slate-900">Print Preview - {activeDoc.title || activeDoc.name}</h3>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="px-6 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-xs"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      window.print();
                      setIsPreviewOpen(false);
                    }}
                    className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 cursor-pointer text-xs"
                  >
                    Confirm Print
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-12 bg-slate-200 flex justify-center">
                <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl p-[20mm] space-y-12">
                  <div className="text-center space-y-1">
                    <p className="text-xs uppercase tracking-widest">Republic of the Philippines</p>
                    <p className="text-sm font-bold">Province of Cebu</p>
                    <p className="text-sm font-bold">City of Cebu</p>
                    <p className="text-lg font-black text-blue-600 mt-2 uppercase text-center">Barangay Zapatera</p>
                    <p className="text-xs italic text-slate-500">Office of the Barangay Captain</p>
                  </div>

                  <div className="h-[2px] bg-blue-600 w-full"></div>

                  <div className="py-10">
                    <h1 className="text-center font-black text-3xl text-slate-900 uppercase tracking-[0.2em]">
                      {activeDoc.title || activeDoc.name}
                    </h1>
                  </div>

                  <div className="space-y-8 text-lg text-slate-800 leading-loose">
                    <p className="font-bold">TO WHOM IT MAY CONCERN:</p>
                    <p className="indent-12 text-justify">
                      This is to certify that{' '}
                      <span className="font-black text-slate-900 underline underline-offset-4">
                        {residentInput || '[RESIDENT NAME]'}
                      </span>
                      , of legal age, Filipino, is a bona fide resident of Barangay Zapatera, Cebu City.
                    </p>
                    <p className="indent-12 text-justify">{activeDoc.description}</p>
                    <p className="indent-12 text-justify">
                      This certification is being issued upon the request of the above-named person for{' '}
                      <span className="font-black text-slate-900 underline underline-offset-4">
                        {purpose || '[PURPOSE]'}
                      </span>{' '}
                      and for whatever legal purpose it may serve.
                    </p>
                    <p className="indent-12">
                      Issued this{' '}
                      <span className="font-bold text-slate-900">
                        {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>{' '}
                      at Barangay Zapatera, Cebu City.
                    </p>
                  </div>

                  <div className="pt-32 flex justify-end">
                    <div className="text-center space-y-1">
                      <div className="w-64 border-b-2 border-slate-900 mb-2"></div>
                      <p className="text-xl font-black text-slate-900 uppercase tracking-wider">Hon. Ricardo Dalisay</p>
                      <p className="text-sm font-bold text-slate-500 uppercase text-center">Barangay Captain</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
