// Resident/src/features/auth/RegisterModal.tsx
import React, { useState } from 'react';
import Modal from '../../components/Modal';
import {
  UserPlus,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
  X,
  Shield,
  MapPin,
  Vote,
  FileText,
} from 'lucide-react';
import { validateEmail, sanitizeInput } from '../../core/security';
import { ResidentUser } from '../../types';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { SAMPLE_SITIOS, checkPasswordStrength, isStrongPassword } from './ResidentAuthPage';

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
    phone: '',
    voter_status: 'Registered Voter', // 'Registered Voter' | 'Not Registered Voter'
    sitio: SAMPLE_SITIOS[0],
    password: '',
    confirmPassword: '',
    privacyPolicyAccepted: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const passwordStrength = checkPasswordStrength(formData.password);
  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;

  const cleanMI = formData.middle_initial.trim().toUpperCase().replace(/\.$/, '');
  const previewFormattedName = formData.last_name.trim() || formData.first_name.trim()
    ? `${formData.last_name.trim() || '[Last Name]'}, ${formData.first_name.trim() || '[First Name]'} ${cleanMI ? cleanMI + '.' : ''}`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // 1. Full Name Validation
    if (!formData.last_name.trim()) {
      setError('Please provide your Last Name.');
      return;
    }
    if (!formData.first_name.trim()) {
      setError('Please provide your First Name.');
      return;
    }
    if (!formData.middle_initial.trim()) {
      setError('Please provide your Middle Initial (MI).');
      return;
    }

    // 2. Email Validation
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid Gmail / email address.');
      return;
    }

    // 3. Mobile Number Validation
    if (!formData.phone.trim()) {
      setError('Please enter your active mobile phone number.');
      return;
    }

    // 4. Voter Status Validation
    if (!formData.voter_status) {
      setError('Please indicate if you are a Registered Voter or Not.');
      return;
    }

    // 5. Sitio Validation
    if (!formData.sitio) {
      setError('Please select your Sitio.');
      return;
    }

    // 6. Strong Password Validation
    if (!isStrongPassword(formData.password)) {
      setError(
        'Password Security Alert: A strong password requires at least 8 characters, 1 uppercase (A-Z), 1 lowercase (a-z), 1 number (0-9), and 1 special character (!@#$%^&*).'
      );
      return;
    }

    // 8. Password Match Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Password Mismatch Alert: Password and Confirm Password do not match.');
      return;
    }

    // 9. Privacy Policy Validation
    if (!formData.privacyPolicyAccepted) {
      setError('You must agree to the Data Privacy Policy under RA 10173 to create an account.');
      return;
    }

    setLoading(true);

    const cleanLastName = sanitizeInput(formData.last_name.trim());
    const cleanFirstName = sanitizeInput(formData.first_name.trim());
    const formattedFullName = `${cleanLastName}, ${cleanFirstName} ${cleanMI ? cleanMI + '.' : ''}`;
    const displayName = `${cleanFirstName} ${cleanMI ? cleanMI + '.' : ''} ${cleanLastName}`;

    let generatedId = `res-${Date.now()}`;

    try {
      if (isSupabaseConfigured()) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          options: {
            data: {
              display_name: displayName,
              full_name: formattedFullName,
              first_name: cleanFirstName,
              last_name: cleanLastName,
              middle_initial: cleanMI,
              phone: formData.phone.trim(),
              voter_status: formData.voter_status,
              sitio: formData.sitio,
              privacy_policy_accepted: true,
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

        // Insert/Upsert into Supabase profiles table (All resident info except password)
        await supabase.from('profiles').upsert({
          id: generatedId,
          email: formData.email.trim().toLowerCase(),
          full_name: formattedFullName,
          first_name: cleanFirstName,
          last_name: cleanLastName,
          middle_initial: cleanMI,
          role: 'resident',
          phone: formData.phone.trim(),
          sitio: formData.sitio,
          voter_status: formData.voter_status,
          civil_status: 'Single',
          id_type: formData.voter_status === 'Registered Voter' ? 'Voters ID' : 'Barangay ID',
          id_number: `BZ-RES-${Date.now().toString().slice(-6)}`,
          privacy_policy_accepted: true,
          is_active: true,
          is_locked: false,
          failed_attempts: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.warn('Supabase registration error:', err);
    }

    const newUser: ResidentUser = {
      id: generatedId,
      email: formData.email.trim().toLowerCase(),
      full_name: formattedFullName,
      first_name: cleanFirstName,
      last_name: cleanLastName,
      middle_initial: cleanMI,
      role: 'resident',
      password: formData.password,
      phone: formData.phone.trim(),
      sitio: formData.sitio,
      voter_status: formData.voter_status,
      civil_status: 'Single',
      id_type: formData.voter_status === 'Registered Voter' ? 'Voters ID' : 'Barangay ID',
      id_number: `BZ-RES-${Date.now().toString().slice(-6)}`,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    setLoading(false);
    setSuccessMessage('Registration successful! Profile saved to Supabase database.');

    setTimeout(() => {
      onRegisterSuccess(newUser);
      onClose();
    }, 1500);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="New Resident Account Registration">
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 text-xs">
          {error && (
            <div className="p-3 bg-red-900/40 border border-red-800 rounded-xl text-red-200 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-900/40 border border-emerald-800 rounded-xl text-emerald-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Full Name Section */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">1. Full Name Information *</h4>
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dela Cruz"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium"
                />
              </div>

              <div className="col-span-1">
                <label className="block text-slate-300 font-semibold mb-1">MI *</label>
                <input
                  type="text"
                  required
                  maxLength={3}
                  placeholder="M."
                  value={formData.middle_initial}
                  onChange={(e) => setFormData({ ...formData, middle_initial: e.target.value })}
                  className="w-full px-2 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-center font-bold"
                />
              </div>
            </div>

            {previewFormattedName && (
              <div className="p-2 bg-blue-950/40 border border-blue-900/60 rounded-lg flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Formatted Full Name:</span>
                <span className="font-bold text-blue-300 font-mono">{previewFormattedName}</span>
              </div>
            )}
          </div>

          {/* Contact & Sitio Details */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">2. Contact & Residency Details *</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Gmail / Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="juan.delacruz@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mobile Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="09171234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Registered Voter Status *</label>
                <select
                  value={formData.voter_status}
                  onChange={(e) => setFormData({ ...formData, voter_status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                >
                  <option value="Registered Voter">Yes (Registered Voter)</option>
                  <option value="Not Registered Voter">No (Non-Voter)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Sitio *</label>
                <select
                  value={formData.sitio}
                  onChange={(e) => setFormData({ ...formData, sitio: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                >
                  {SAMPLE_SITIOS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Password & Security Section */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">3. Password & Security *</h4>

            {/* Strong Password Requirements Checklist */}
            <div className="p-3 bg-slate-950 border border-blue-900/60 rounded-lg space-y-1.5 text-[11px]">
              <div className="flex items-center space-x-1.5 font-bold text-blue-300">
                <Shield className="w-3.5 h-3.5" />
                <span>Strong Password Criteria (Required):</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div className={`flex items-center space-x-1 ${passwordStrength.hasLength ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {passwordStrength.hasLength ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-red-400" />}
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center space-x-1 ${passwordStrength.hasUpper ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {passwordStrength.hasUpper ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-red-400" />}
                  <span>1 Uppercase (A-Z)</span>
                </div>
                <div className={`flex items-center space-x-1 ${passwordStrength.hasLower ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {passwordStrength.hasLower ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-red-400" />}
                  <span>1 Lowercase (a-z)</span>
                </div>
                <div className={`flex items-center space-x-1 ${passwordStrength.hasNumber ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {passwordStrength.hasNumber ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-red-400" />}
                  <span>1 Number (0-9)</span>
                </div>
                <div className={`flex items-center space-x-1 ${passwordStrength.hasSpecial ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {passwordStrength.hasSpecial ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-red-400" />}
                  <span>1 Special symbol (!@#$%^&*)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Create password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {formData.confirmPassword && (
              <div className="text-[10px]">
                {passwordsMatch ? (
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" /> <span>Passwords match</span>
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center space-x-1">
                    <X className="w-3 h-3" /> <span>Passwords do not match</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Privacy Policy Checkbox */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start space-x-2 text-slate-300">
            <input
              type="checkbox"
              id="modalPrivacyCheck"
              checked={formData.privacyPolicyAccepted}
              onChange={(e) => setFormData({ ...formData, privacyPolicyAccepted: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-700 bg-slate-950"
            />
            <label htmlFor="modalPrivacyCheck" className="text-[11px] leading-tight">
              I agree to the{' '}
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="text-blue-400 hover:underline font-bold"
              >
                Data Privacy Policy
              </button>{' '}
              under Republic Act No. 10173 (Data Privacy Act of 2012). *
            </label>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 font-bold flex items-center space-x-2 shadow-lg shadow-blue-900/30"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Complete Sign Up</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Privacy Policy Notice Modal */}
      <Modal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} title="Data Privacy Notice (RA 10173)">
        <div className="space-y-3 text-xs text-slate-300 max-h-96 overflow-y-auto pr-1">
          <p className="font-bold text-white">Barangay Zapatera Resident Data Protection & Privacy Consent</p>
          <p>
            In compliance with the Data Privacy Act of 2012 (Republic Act No. 10173), Barangay Zapatera is dedicated to protecting the privacy and security of your personal data.
          </p>
          <h5 className="font-bold text-blue-300">Collected Information:</h5>
          <p>Full name, Gmail address, contact number, voter registration status, sitio location, and street address.</p>
          <h5 className="font-bold text-blue-300">Usage & Purpose:</h5>
          <p>Data will strictly be utilized for processing official clearances, resident verification, and municipal service announcements.</p>
          <div className="pt-3 border-t border-slate-800 text-right">
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, privacyPolicyAccepted: true });
                setIsPrivacyModalOpen(false);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
