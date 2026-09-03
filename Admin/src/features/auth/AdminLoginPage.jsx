// Admin/src/features/auth/AdminLoginPage.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../../core/storage';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { validateEmail, checkRateLimit, isAccountLocked, recordFailedAttempt, resetFailedAttempts } from '../../core/security';
import {
  Shield,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  FileText,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
} from 'lucide-react';

export default function AdminLoginPage({ onLoginSuccess }) {
  const [step, setStep] = useState(1); // 1: Credentials, 2: MFA OTP, 3: Forgot Password, 4: Set New Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
  const [pendingUser, setPendingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    // 1. Detect if redirected from password reset email link
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const isRecovery =
      hash.includes('type=recovery') ||
      search.includes('type=recovery') ||
      hash.includes('access_token');

    if (isRecovery) {
      setStep(4);
      setInfoMsg('Password Recovery Active: Please enter your new Admin password below.');
    }

    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setStep(4);
          setInfoMsg('Password Recovery Active: Please enter your new Admin password below.');
        }
      });
      return () => authListener?.subscription?.unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('zapatera_security_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'ACCOUNT_UNLOCKED' && event.data?.email === email.toLowerCase().trim()) {
          setError('');
          setInfoMsg('Account has been unlocked by administrator. You may now log in.');
        }
      };
      return () => channel.close();
    }
  }, [email]);

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

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setShowResendConfirmation(false);
    setLoading(true);

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Rate Limiting Check
    const rateLimit = await checkRateLimit(cleanEmail);
    if (!rateLimit.allowed) {
      setError(rateLimit.message || 'Too many authentication attempts. Please wait 15 minutes before trying again.');
      setLoading(false);
      return;
    }

    // 2. Account Lockout Check
    const locked = await isAccountLocked(cleanEmail);
    if (locked) {
      setError('ACCOUNT LOCKED OUT: 3 consecutive failed login attempts detected. Please contact an administrator to unlock your account.');
      setLoading(false);
      return;
    }

    // 3. Check whether the Gmail / account exists
    let profile = null;
    try {
      if (isSupabaseConfigured()) {
        const { data, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        profile = data;
      }
    } catch (e) {
      console.warn('Profiles check error:', e);
    }

    if (!profile) {
      setError('This Gmail account is not registered. Please sign up first.');
      setLoading(false);
      return;
    }

    // 4. Verify Password with Official Supabase Auth Provider & Check Email Confirmation
    let authUser = null;
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

          const lockRes = await recordFailedAttempt(cleanEmail, 'admin');
          if (lockRes.isLockedOut || lockRes.attempts >= 3) {
            setError('ACCOUNT LOCKED OUT: You have exceeded 3 failed login attempts. Your account has been locked for security. Please contact an administrator to request an unlock.');
          } else {
            setError('Incorrect email or password.');
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

    // 5. Verify Role Authorization (Admin, Super Admin, or Staff)
    const pRole = (profile.role || '').toLowerCase();
    if (pRole !== 'admin' && pRole !== 'super_admin' && pRole !== 'superadmin' && pRole !== 'staff') {
      setError('Access denied: You do not have Admin privileges.');
      setLoading(false);
      return;
    }

    // 6. Proceed to OTP verification -> Send 6-Digit Code to Gmail
    await resetFailedAttempts(cleanEmail);

    try {
      if (isSupabaseConfigured()) {
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { shouldCreateUser: false },
        });

        if (otpErr) {
          setError('Failed to dispatch verification code to Gmail. Please verify your connection.');
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      setError('Failed to send OTP code to your email. Please try again.');
      setLoading(false);
      return;
    }

    const pendingPayload = {
      id: profile.id,
      email: cleanEmail,
      full_name: profile.full_name || authUser?.user_metadata?.full_name || cleanEmail.split('@')[0],
      role: pRole === 'superadmin' ? 'super_admin' : pRole,
      phone: profile.phone || '',
      address: profile.address || 'Barangay Zapatera, Cebu City',
      is_active: true,
      is_locked: false,
      failed_attempts: 0,
    };

    setPendingUser(pendingPayload);
    setStep(2);
    setInfoMsg(`Password verified! A 6-digit verification code has been dispatched to ${cleanEmail}. Please enter it below.`);
    setLoading(false);
  };

  const handleResendOTP = async () => {
    if (!pendingUser) return;
    setLoading(true);
    setError('');

    try {
      if (isSupabaseConfigured()) {
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: pendingUser.email,
          options: { shouldCreateUser: false },
        });

        if (otpErr) {
          setError('Failed to resend OTP. Please try again.');
        } else {
          setInfoMsg(`A new 6-digit verification code has been re-sent to ${pendingUser.email}. Check your Gmail.`);
        }
      }
    } catch (err) {
      setError('Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

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

    // Role-based redirection verification from trusted server data
    let trustedRole = 'admin';
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

    if (trustedRole !== 'admin' && trustedRole !== 'super_admin' && trustedRole !== 'superadmin' && trustedRole !== 'staff') {
      setError('Access denied: You do not have Admin privileges.');
      setLoading(false);
      return;
    }

    const verifiedAdmin = {
      ...pendingUser,
      role: trustedRole === 'superadmin' ? 'super_admin' : trustedRole,
    };

    StorageService.resetFailedAttempts(pendingUser.email);
    StorageService.setCurrentUser(verifiedAdmin);
    setLoading(false);
    onLoginSuccess(verifiedAdmin);
  };

  // Handle Forgot Password Submission
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    if (!validateEmail(forgotEmail)) {
      setForgotError('Please enter a valid email address.');
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
  const handleResetPasswordSubmit = async (e) => {
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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans text-slate-800 antialiased overflow-x-hidden">
      {/* LEFT SIDE: Abstract Decorative Fluid/Marble Background (~50% width) */}
      <div className="relative hidden lg:flex lg:w-1/2 min-h-screen bg-slate-950 overflow-hidden select-none">
        <img
          src="/auth-bg.jpg"
          alt="Abstract decorative fluid background"
          className="absolute inset-0 w-full h-full object-cover object-center transform scale-105 hover:scale-100 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/40 via-transparent to-pink-500/15 pointer-events-none" />
        <div className="absolute inset-0 bg-blue-900/10 pointer-events-none" />
      </div>

      {/* RIGHT SIDE: Clean White Background, Top-Left Branding, Centered Form (Max Width ~400px) */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-white relative">
        {/* Top-Left Branding */}
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white flex items-center justify-center shrink-0">
            <img src="/logo.jpg" alt="Barangay Zapatera" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">Barangay Zapatera</h2>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-blue-600 tracking-wide uppercase">Operations Portal</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Admin Officer</span>
            </div>
          </div>
        </div>

        {/* Center Content Container (Max-Width 400px) */}
        <div className="w-full max-w-[400px] mx-auto my-auto py-8 space-y-6">
          {/* Header Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {step === 1 && 'Admin Sign In'}
              {step === 2 && 'MFA Verification'}
              {step === 3 && 'Reset Password'}
              {step === 4 && 'Create New Password'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              {step === 1 && 'Enter your administrator credentials to manage documents, clearances, and barangay operations.'}
              {step === 2 && 'Enter the 6-digit verification code dispatched to your Gmail inbox.'}
              {step === 3 && 'Enter your registered Admin email address to receive a secure password reset link.'}
              {step === 4 && 'Choose and confirm a new strong password to restore full access to your account.'}
            </p>
          </div>

          {/* Progress Indicator for Step 1 & 2 */}
          {step !== 3 && step !== 4 && (
            <div className="flex items-center space-x-2 text-xs">
              <span className={`px-3 py-1 rounded-full font-semibold transition-all ${step === 1 ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs' : 'bg-slate-100 text-slate-400'}`}>
                1. Admin Credentials
              </span>
              <span className="text-slate-300">→</span>
              <span className={`px-3 py-1 rounded-full font-semibold transition-all ${step === 2 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs' : 'bg-slate-100 text-slate-400'}`}>
                2. Email MFA Code
              </span>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-2 shadow-xs">
              <div className="flex items-start space-x-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
              {showResendConfirmation && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendLoading}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[11px] flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
                  >
                    {resendLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    <span>Resend Confirmation Email Link</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {infoMsg && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-start space-x-2.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{infoMsg}</div>
            </div>
          )}

          {/* STEP 1: CREDENTIALS */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Admin Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sample@gmail.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-100 focus:border-blue-600 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-700 font-semibold">Account Password</label>
                  <button
                    type="button"
                    onClick={() => { setStep(3); setError(''); setInfoMsg(''); }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-100 focus:border-blue-600 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify Admin Credentials</span>}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* STEP 2: MFA OTP VERIFICATION */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Authorizing Admin:</span>
                  <span className="text-blue-700 font-mono font-bold">{pendingUser?.full_name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">OTP Destination:</span>
                  <span className="text-slate-700 font-mono font-medium">{email}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Enter 6-Digit Verification Code</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-300 text-slate-900 rounded-xl text-center tracking-[0.5em] font-mono text-base font-bold focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-100 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Resend Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setStep(1); setOtpInput(''); setError(''); }}
                  className="text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otpInput.length !== 6}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Verify MFA & Enter Admin Portal</span>
              </button>
            </form>
          )}

          {/* STEP 3: FORGOT PASSWORD */}
          {step === 3 && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-xs">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-blue-900 font-bold">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span>Reset Admin Password</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Enter your registered Admin email address below. A secure password reset link will be dispatched to your Gmail inbox.
                </p>
              </div>

              {forgotError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-medium">
                  {forgotError}
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium">
                  {forgotSuccess}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Account Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="sample@gmail.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-100 focus:border-blue-600 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => { setStep(1); setForgotError(''); setForgotSuccess(''); }}
                  className="text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
                >
                  ← Back to Login
                </button>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  <span>Send Reset Link</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: SET NEW PASSWORD (RECOVERY MODE) */}
          {step === 4 && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Choose New Admin Password</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Your recovery link has been verified. Please create and confirm your new secure password.
                </p>
              </div>

              {resetError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-medium">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium">
                  {resetSuccess}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">New Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showResetNewPassword ? 'text' : 'password'}
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 8 characters)"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-3 focus:ring-emerald-100 focus:border-emerald-600 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Confirm New Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showResetConfirmPassword ? 'text' : 'password'}
                    required
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:ring-3 focus:ring-emerald-100 focus:border-emerald-600 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {resetConfirmPassword && (
                <div className="text-[10px]">
                  {resetNewPassword === resetConfirmPassword ? (
                    <span className="text-emerald-600 font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" /> <span>Passwords match</span>
                    </span>
                  ) : (
                    <span className="text-rose-600 font-semibold">Passwords do not match</span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading || !resetNewPassword || resetNewPassword !== resetConfirmPassword}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Save New Password & Unlock Account</span>
              </button>
            </form>
          )}
        </div>

        {/* Bottom Footer Info */}
        <div className="pt-6 border-t border-slate-100 text-center text-[11px] text-slate-400">
          Barangay Zapatera Information Management System • Admin Operations
        </div>
      </div>
    </div>
  );
}
