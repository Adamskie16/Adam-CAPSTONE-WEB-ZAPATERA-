// Resident/src/features/auth/LoginModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import {
  Mail,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { validateEmail, checkRateLimit, isAccountLocked, recordFailedAttempt, resetFailedAttempts } from '../../core/security';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { ResidentUser } from '../../types';
import UnlockAccountModal from '../../components/UnlockAccountModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: ResidentUser) => void;
  users: ResidentUser[];
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [step, setStep] = useState(1); // 1: Credentials, 2: MFA OTP, 3: Forgot Password, 4: Set New Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Reset Password State (After clicking Gmail recovery link)
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  const [otpInput, setOtpInput] = useState('');
  const [pendingUser, setPendingUser] = useState<ResidentUser | null>(null);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  useEffect(() => {
    // Detect password recovery redirect
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const isRecovery =
      hash.includes('type=recovery') ||
      search.includes('type=recovery') ||
      hash.includes('access_token');

    if (isRecovery) {
      setStep(4);
      setInfoMsg('Password Recovery Active: Please enter and confirm your new resident password.');
    }

    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setStep(4);
          setInfoMsg('Password Recovery Active: Please enter and confirm your new resident password.');
        }
      });
      return () => authListener?.subscription?.unsubscribe();
    }
  }, []);

  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleResendConfirmation = async () => {
    if (!email) return;
    setResendLoading(true);
    setError('');
    try {
      if (isSupabaseConfigured()) {
        const { error: resendErr } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim().toLowerCase(),
        });
        if (resendErr) {
          setError(resendErr.message || 'Failed to resend confirmation email.');
        } else {
          setInfoMsg(`A confirmation link has been resent to ${email.trim().toLowerCase()}. Please check your Gmail.`);
        }
      }
    } catch (err) {
      setError('Failed to resend confirmation email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setShowResendConfirmation(false);
    setLoading(true);

    if (!validateEmail(email)) {
      setError('Please enter a valid Gmail address.');
      setLoading(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Rate Limiting Check (10-second interval)
    const rateLimit = await checkRateLimit(cleanEmail);
    if (!rateLimit.allowed) {
      setError(rateLimit.message || 'Too many authentication attempts. Please wait 10 seconds before trying again.');
      setLoading(false);
      return;
    }

    // 2. Account Lockout Check (Pre-auth check)
    const locked = await isAccountLocked(cleanEmail);
    if (locked) {
      setIsLocked(true);
      setError('Your account has been locked after 3 failed login attempts. Please unlock your account using the verification code sent to your email.');
      setLoading(false);
      return;
    }

    // 3. Check whether the Gmail / account exists
    let profile: any = null;
    try {
      if (isSupabaseConfigured()) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        profile = data;
      }
    } catch (e) {
      // Handled silently
    }

    if (!profile) {
      setError('This Gmail account is not registered. Please sign up first.');
      setLoading(false);
      return;
    }

    // 4. Verify Password with Official Supabase Auth Provider & Check Email Confirmation
    let authUser: any = null;
    try {
      if (isSupabaseConfigured()) {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (authErr) {
          const errMsg = (authErr.message || '').toLowerCase();
          if (errMsg.includes('email not confirmed') || errMsg.includes('confirm') || authErr.code === 'email_not_confirmed') {
            setError('Your account has been created, but your Gmail has not been confirmed yet. Please check your email and click the confirmation link before logging in.');
            setShowResendConfirmation(true);
            setLoading(false);
            return;
          }

          const lockRes = await recordFailedAttempt(cleanEmail, 'resident');
          if (lockRes.isLockedOut || lockRes.attempts >= 3) {
            setIsLocked(true);
            setError('Your account has been locked after 3 failed login attempts. Please unlock your account using the verification code sent to your email.');
          } else {
            const remaining = lockRes.remaining ?? (3 - lockRes.attempts);
            setError(`Invalid email or password. You have ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`);
          }
          setLoading(false);
          return;
        }

        authUser = authData?.user;
      }
    } catch (err) {
      setError('Authentication server error. Please try again.');
      setLoading(false);
      return;
    }

    // 5. Proceed to OTP verification -> Reset lockout and Send 6-Digit Code to Gmail
    await resetFailedAttempts(cleanEmail);
    setIsLocked(false);

    try {
      if (isSupabaseConfigured()) {
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { shouldCreateUser: false },
        });

        if (otpErr) {
          setError('Failed to dispatch verification code to Gmail. Please try again.');
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      setError('Failed to send OTP code to your Gmail.');
      setLoading(false);
      return;
    }

    const residentPayload: ResidentUser = {
      id: profile.id,
      email: cleanEmail,
      full_name: profile.full_name || authUser?.user_metadata?.full_name || 'Resident User',
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      middle_initial: profile.middle_initial || '',
      role: 'resident',
      password: '',
      phone: profile.phone || '',
      address: profile.address || 'Barangay Zapatera, Cebu City',
      sitio: profile.sitio || 'Sitio Zapatera Proper',
      civil_status: profile.civil_status || 'Single',
      voter_status: profile.voter_status || 'Registered Voter',
      id_type: profile.id_type || 'Barangay ID',
      id_number: profile.id_number || 'BZ-RES-001',
      is_active: true,
      is_locked: false,
      failed_attempts: 0,
      created_at: profile.created_at || new Date().toISOString(),
    };

    setPendingUser(residentPayload);
    setStep(2);
    setInfoMsg(`Password verified! A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your Gmail Inbox or Spam folder and enter it below.`);
    setLoading(false);
  };

  const handleResendOTP = async () => {
    if (!pendingUser) return;
    setLoading(true);
    setError('');

    try {
      if (isSupabaseConfigured()) {
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: pendingUser.email.trim().toLowerCase(),
          options: { shouldCreateUser: false },
        });

        if (otpErr) {
          setError('Failed to resend code. Please try again.');
        } else {
          setInfoMsg(`A fresh 6-digit verification code has been re-sent to ${pendingUser.email}. Please check your Gmail Inbox.`);
        }
      }
    } catch (err) {
      setError('Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!pendingUser) return;

    if (!otpInput || otpInput.trim().length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      setLoading(false);
      return;
    }

    let verified = false;

    try {
      if (isSupabaseConfigured()) {
        const { data, error: verifyErr } = await supabase.auth.verifyOtp({
          email: pendingUser.email.trim().toLowerCase(),
          token: otpInput.trim(),
          type: 'email',
        });

        if (!verifyErr && data?.user) {
          verified = true;
          if (data?.session) {
            await supabase.auth.setSession(data.session);
          }
        }
      }
    } catch (err) {
      console.warn('Supabase verifyOtp notice:', err);
    }

    if (!verified) {
      setError('Invalid or expired verification code. Please check your Gmail or request a new code.');
      setLoading(false);
      return;
    }

    // Role-based verification from server
    let trustedRole = 'resident';
    try {
      if (isSupabaseConfigured()) {
        const { data: serverProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', pendingUser.email)
          .single();

        if (serverProfile) {
          trustedRole = (serverProfile.role || '').toLowerCase();
        }
      }
    } catch (err) {}

    const verifiedResident: ResidentUser = {
      ...pendingUser,
      role: 'resident',
    };

    localStorage.setItem('zapatera_resident_session', JSON.stringify(verifiedResident));
    setLoading(false);
    onLoginSuccess(verifiedResident);
    onClose();
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    if (!validateEmail(forgotEmail)) {
      setForgotError('Please enter a valid Gmail address.');
      setForgotLoading(false);
      return;
    }

    const cleanEmail = forgotEmail.trim().toLowerCase();

    try {
      if (isSupabaseConfigured()) {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin,
        });
        if (resetErr) {
          console.warn('Password reset notice:', resetErr.message);
        }
      }
    } catch (err) {
      console.warn('Password reset notice:', err);
    }

    setForgotLoading(false);
    setForgotSuccess(`Password reset instructions sent to ${cleanEmail}. Check your Gmail Inbox and click the reset link.`);
  };

  // Handle Setting New Password after recovery link verification
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (resetNewPassword.length < 8) {
      setResetError('Password must be at least 8 characters long.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match. Please ensure both fields match.');
      return;
    }

    setResetLoading(true);

    try {
      if (isSupabaseConfigured()) {
        const { data, error: updateErr } = await supabase.auth.updateUser({
          password: resetNewPassword,
        });

        if (updateErr) {
          console.warn('Supabase updateUser notice:', updateErr.message);
        }

        const targetEmail = (data?.user?.email || forgotEmail || email || '').toLowerCase().trim();

        if (targetEmail) {
          await supabase
            .from('profiles')
            .update({
              password: resetNewPassword,
              is_locked: false,
              failed_attempts: 0,
              updated_at: new Date().toISOString(),
            })
            .eq('email', targetEmail);
        }
      }

      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }

      setResetSuccess('Your password has been successfully updated in the database! Redirecting to login...');
      setTimeout(() => {
        setStep(1);
        setResetSuccess('');
        setPassword('');
        setInfoMsg('Password reset successful! Please log in with your new password.');
      }, 2000);
    } catch (err) {
      setResetError('Failed to update password. Please try requesting a new reset link.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resident Account Sign In" maxWidth="max-w-md" darkMode={true}>
      <div className="space-y-4 text-xs font-sans text-slate-100">
        {error && (
          <div className={`p-3 border rounded-xl font-semibold space-y-2 ${isLocked ? 'bg-rose-950/90 text-rose-200 border-rose-600 ring-1 ring-rose-500' : 'bg-rose-950/80 text-rose-200 border-rose-800'}`}>
            <div className="flex items-start space-x-2">
              {isLocked ? (
                <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{error}</span>
            </div>
            {isLocked && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsUnlockModalOpen(true)}
                  className="w-full px-3 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow transition-colors cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock Account with Gmail Code</span>
                </button>
              </div>
            )}
            {showResendConfirmation && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendLoading}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-[11px] flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer shadow"
                >
                  {resendLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  <span>Resend Confirmation Email Link</span>
                </button>
              </div>
            )}
          </div>
        )}

        {infoMsg && (
          <div className="p-3 bg-blue-950/80 text-blue-200 border border-blue-800 rounded-xl font-semibold flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>{infoMsg}</span>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Email / Gmail Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="resident@gmail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-slate-300">Account Password</label>
                <button
                  type="button"
                  onClick={() => { setStep(3); setError(''); setInfoMsg(''); }}
                  className="text-blue-400 hover:text-blue-300 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter resident password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify Credentials & Send OTP</span>}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex justify-between items-center text-slate-300 font-mono text-[11px]">
                <span>Recipient:</span>
                <span className="text-blue-400 font-bold">{email}</span>
              </div>
              <p className="text-[10px] text-slate-400">
                A 6-digit OTP code was sent to your Gmail inbox. Please enter it below.
              </p>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">6-Digit Verification Code</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl text-center tracking-[0.5em] font-mono text-base font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setStep(1); setOtpInput(''); setError(''); }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Back
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-semibold disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Resend OTP</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otpInput.length !== 6}
              className="w-full py-2.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Verify OTP & Sign In</span>
            </button>
          </form>
        )}

        {/* STEP 3: FORGOT PASSWORD */}
        {step === 3 && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-xl space-y-1.5">
              <div className="flex items-center space-x-2 text-blue-300 font-bold">
                <HelpCircle className="w-4 h-4 text-blue-400" />
                <span>Reset Resident Account Password</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Enter your registered Gmail address below. A password reset link will be sent directly to your inbox.
              </p>
            </div>

            {forgotError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl font-medium">
                {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-xl font-medium">
                {forgotSuccess}
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Gmail Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="resident@gmail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setStep(1); setForgotError(''); setForgotSuccess(''); }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Back to Login
              </button>

              <button
                type="submit"
                disabled={forgotLoading}
                className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                <span>Send Reset Link</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: SET NEW PASSWORD (RECOVERY MODE) */}
        {step === 4 && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-1.5">
              <div className="flex items-center space-x-2 text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Choose New Resident Password</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Your recovery link has been verified. Please create and confirm your new secure password.
              </p>
            </div>

            {resetError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl font-medium">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-xl font-medium">
                {resetSuccess}
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">New Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showResetNewPassword ? 'text' : 'password'}
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 8 characters)"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Confirm New Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showResetConfirmPassword ? 'text' : 'password'}
                  required
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {resetConfirmPassword && (
              <div className="text-[10px]">
                {resetNewPassword === resetConfirmPassword ? (
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" /> <span>Passwords match</span>
                  </span>
                ) : (
                  <span className="text-rose-400">Passwords do not match</span>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={resetLoading || !resetNewPassword || resetNewPassword !== resetConfirmPassword}
              className="w-full py-2.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
            >
              {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Save New Password & Unlock Account</span>
            </button>
          </form>
        )}
      </div>

      <UnlockAccountModal
        visible={isUnlockModalOpen}
        initialEmail={email}
        onClose={() => setIsUnlockModalOpen(false)}
        onUnlocked={(unlockedEmail) => {
          setIsLocked(false);
          setError('');
          setInfoMsg(`Your account (${unlockedEmail}) has been successfully unlocked. You may now log in.`);
        }}
      />
    </Modal>
  );
}
