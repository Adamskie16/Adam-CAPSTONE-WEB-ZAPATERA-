// Resident/src/features/auth/LoginModal.tsx
import React, { useState } from 'react';
import Modal from '../../components/Modal';
import {
  Mail,
  Lock,
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
import { validateEmail } from '../../core/security';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { ResidentUser } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: ResidentUser) => void;
  users: ResidentUser[];
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [step, setStep] = useState(1); // 1: Credentials, 2: MFA OTP, 3: Forgot Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  const [otpInput, setOtpInput] = useState('');
  const [pendingUser, setPendingUser] = useState<ResidentUser | null>(null);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setLoading(true);

    if (!validateEmail(email)) {
      setError('Please enter a valid Gmail address.');
      setLoading(false);
      return;
    }

    let foundUser: ResidentUser | null = null;

    try {
      if (isSupabaseConfigured()) {
        const { data, error: dbErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();

        if (data && !dbErr) foundUser = data as ResidentUser;
      }
    } catch (err) {
      console.warn('Supabase fetch notice:', err);
    }

    if (!foundUser) {
      setError('Invalid credentials. Account not found.');
      setLoading(false);
      return;
    }

    if (foundUser.is_locked || !foundUser.is_active || (foundUser.failed_attempts || 0) >= 3) {
      setError('ACCOUNT LOCKED OUT: 3 consecutive failed login attempts detected. Please contact Barangay Hall to unlock.');
      setLoading(false);
      return;
    }

    if (foundUser.password && foundUser.password !== password) {
      setError('Invalid password. Please check your credentials and try again.');
      setLoading(false);
      return;
    }

    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
        });
      }
    } catch (err) {
      console.warn('Supabase OTP exception:', err);
    }

    setPendingUser(foundUser);
    setStep(2);
    setInfoMsg(`A 6-digit verification code has been dispatched to your Gmail (${email}). Please open your Gmail Inbox or Spam folder and enter the 6-digit code below.`);
    setLoading(false);
  };

  const handleResendOTP = async () => {
    if (!pendingUser) return;
    setLoading(true);
    setError('');

    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signInWithOtp({
          email: pendingUser.email.trim().toLowerCase(),
        });
      }
    } catch (err) {
      console.warn('Resend OTP exception:', err);
    }

    setInfoMsg(`A fresh 6-digit verification code has been re-sent to ${pendingUser.email}. Please check your Gmail Inbox.`);
    setLoading(false);
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

        if (!verifyErr) {
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
      setError('Invalid or expired OTP code. Please check your email inbox and try again.');
      setLoading(false);
      return;
    }

    localStorage.setItem('zapatera_resident_session', JSON.stringify(pendingUser));
    setLoading(false);
    onLoginSuccess(pendingUser);
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resident Account Sign In" maxWidth="max-w-md" darkMode={true}>
      <div className="space-y-4 text-xs font-sans text-slate-100">
        {error && (
          <div className="p-3 bg-rose-950/80 text-rose-200 border border-rose-800 rounded-xl font-semibold flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
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
                <label className="font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => { setForgotEmail(email); setError(''); setStep(3); }}
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium text-[11px]"
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
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                {loading ? <span>Sending OTP…</span> : (
                  <>
                    <span>Continue to MFA OTP</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <div className="p-3.5 bg-gradient-to-r from-blue-950 to-slate-950 text-white rounded-xl space-y-2 border border-blue-500/30 shadow-lg">
              <div className="flex items-center justify-between text-[11px] font-bold text-blue-300 border-b border-blue-900/80 pb-1.5">
                <span className="flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>Barangay Resident Mailer</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">✉ OTP Sent to Gmail</span>
              </div>
              <p className="text-[11px] text-slate-300">To: <span className="font-mono text-white font-bold">{pendingUser?.email}</span></p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Open your Gmail inbox (check Spam/Junk too). Enter the 6-digit code from the Supabase verification email.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Enter 6-Digit OTP Code</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full pl-10 pr-3.5 py-3 bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-center text-lg tracking-widest font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Resend OTP</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                {loading ? <span>Verifying…</span> : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Sign In</span>
                  </>
                )}
              </button>
            </div>
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
      </div>
    </Modal>
  );
}
