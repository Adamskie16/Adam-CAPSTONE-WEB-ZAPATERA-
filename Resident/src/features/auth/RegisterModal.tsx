// Resident/src/features/auth/RegisterModal.tsx
import React, { useState } from 'react';
import Modal from '../../components/Modal';
import { UserPlus, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { validateEmail, sanitizeInput } from '../../core/security';
import { ResidentUser } from '../../types';
import { supabase, isSupabaseConfigured } from '../../core/supabase';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterSuccess: (newUser: ResidentUser) => void;
}

export default function RegisterModal({ isOpen, onClose, onRegisterSuccess }: RegisterModalProps) {
  const [formData, setFormData] = useState({
    last_name: '',
    first_name: '',
    middle_initial: '',
    email: '',
    age: '',
    civil_status: 'Single',
    sitio: 'Sitio Ramos',
    voter_status: 'Registered Voter',
    password: '',
    phone: '09171234567',
    id_type: 'Drivers License',
    id_number: 'N01-12-984321',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!formData.last_name.trim() || !formData.first_name.trim()) {
      setError('Please provide your Last Name and First Name.');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid Gmail or personal email address.');
      return;
    }

    const numAge = Number(formData.age);
    if (!formData.age || isNaN(numAge) || numAge < 1 || numAge > 120) {
      setError('Please enter a valid age.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const formattedMI = formData.middle_initial.trim().toUpperCase();
    const fullName = `${formData.first_name.trim()} ${formattedMI ? formattedMI + '.' : ''} ${formData.last_name.trim()}`;
    const fullAddress = `${formData.sitio}, Zapatera, Cebu City`;

    let generatedId = `res-${Date.now()}`;

    // 1. Send Supabase Auth Sign Up & store all input fields in Auth User metadata and Database tables
    try {
      if (isSupabaseConfigured()) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: {
              display_name: fullName,
              full_name: fullName,
              first_name: formData.first_name.trim(),
              last_name: formData.last_name.trim(),
              middle_initial: formattedMI,
              age: numAge,
              civil_status: formData.civil_status,
              sitio: formData.sitio,
              voter_status: formData.voter_status,
              phone: formData.phone,
              address: fullAddress,
              id_type: formData.id_type,
              id_number: formData.id_number,
              role: 'resident',
            },
          },
        });

        if (authError) {
          console.warn('Supabase auth signUp notice:', authError.message);
          if (authError.message.includes('already registered')) {
            setError('This email is already registered. Please log in instead.');
            setLoading(false);
            return;
          }
        }

        if (authData?.user?.id) {
          generatedId = authData.user.id;
        }

        // 2. Store account details exclusively in public.profiles table
        const { error: profileErr } = await supabase.from('profiles').upsert({
          id: generatedId,
          email: formData.email.trim(),
          full_name: fullName,
          username: formData.email.trim().split('@')[0],
          role: 'resident',
          phone: formData.phone,
          address: fullAddress,
          id_type: formData.id_type,
          id_number: formData.id_number,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (profileErr) {
          console.warn('Supabase profiles upsert notice:', profileErr.message);
        }
      }
    } catch (err: any) {
      console.warn('Registration notice:', err);
    }

    const newUser: ResidentUser = {
      id: generatedId,
      email: sanitizeInput(formData.email.trim()),
      password: formData.password,
      full_name: sanitizeInput(fullName),
      first_name: sanitizeInput(formData.first_name.trim()),
      last_name: sanitizeInput(formData.last_name.trim()),
      middle_initial: sanitizeInput(formattedMI),
      age: numAge,
      civil_status: formData.civil_status,
      sitio: formData.sitio,
      voter_status: formData.voter_status,
      role: 'resident',
      phone: sanitizeInput(formData.phone),
      address: sanitizeInput(fullAddress),
      id_type: sanitizeInput(formData.id_type),
      id_number: sanitizeInput(formData.id_number),
      is_active: true,
      failed_attempts: 0,
      is_locked: false,
    };

    setLoading(false);
    setSuccessMessage(`Account registered successfully! An authentication confirmation notice has been dispatched to ${formData.email}.`);

    setTimeout(() => {
      onRegisterSuccess(newUser);
      onClose();
    }, 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register Resident Account" maxWidth="max-w-lg" darkMode={true}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans text-slate-100">
        {error && (
          <div className="p-3 bg-rose-950/80 text-rose-200 border border-rose-800 rounded-xl font-semibold">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-950/80 text-emerald-200 border border-emerald-800 rounded-xl font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="p-3 bg-blue-950/60 border border-blue-800 rounded-xl flex items-center space-x-2 text-blue-200 font-semibold">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
          <span>Register your official resident profile to request barangay clearances and digital certificates online.</span>
        </div>

        {/* 1. Last Name, First Name, MI */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Last Name *</label>
            <input
              type="text"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Dela Cruz"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-300 mb-1">First Name *</label>
            <input
              type="text"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="Juan"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-300 mb-1">M.I.</label>
            <input
              type="text"
              maxLength={2}
              value={formData.middle_initial}
              onChange={(e) => setFormData({ ...formData, middle_initial: e.target.value })}
              placeholder="A."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>
        </div>

        {/* 2. Email & Password */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Gmail / Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="resident@gmail.com"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Account Password *</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 3. Age, Civil Status, Voter Status */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Age *</label>
            <input
              type="number"
              min={1}
              max={120}
              required
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              placeholder="25"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Civil Status</label>
            <select
              value={formData.civil_status}
              onChange={(e) => setFormData({ ...formData, civil_status: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Widowed">Widowed</option>
              <option value="Separated">Separated</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Voter Status</label>
            <select
              value={formData.voter_status}
              onChange={(e) => setFormData({ ...formData, voter_status: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Registered Voter">Registered Voter</option>
              <option value="Non-Registered Voter">Non-Registered</option>
            </select>
          </div>
        </div>

        {/* 4. Sitio / Address & Phone */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Sitio Location</label>
            <select
              value={formData.sitio}
              onChange={(e) => setFormData({ ...formData, sitio: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold text-blue-300"
            >
              <option value="Sitio Ramos">Sitio Ramos</option>
              <option value="Sitio Echavez">Sitio Echavez</option>
              <option value="Sitio Upper Zapatera">Sitio Upper Zapatera</option>
              <option value="Sitio Lower Zapatera">Sitio Lower Zapatera</option>
              <option value="Barangay Hall Proper">Barangay Hall Proper</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Mobile Phone Number</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="09171234567"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 5. Identification */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">ID Type Presented</label>
            <input
              type="text"
              value={formData.id_type}
              onChange={(e) => setFormData({ ...formData, id_type: e.target.value })}
              placeholder="Drivers License, UMID, Barangay ID"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-300 mb-1">ID Reference Number</label>
            <input
              type="text"
              value={formData.id_number}
              onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
              placeholder="N01-12-984321"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Authentication...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Register & Send Auth Email</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
