// SuperAdmin/src/features/auth/SuperAdminLoginPage.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../../core/storage';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import {
  validateEmail,
  checkRateLimit,
  isAccountLocked,
  recordFailedAttempt,
  resetFailedAttempts,
} from '../../core/security';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  Unlock,
  ArrowLeft,
  Clock,
} from 'lucide-react';

export default function SuperAdminLoginPage({ onLoginSuccess }) {
  // Steps:
  // 1: Normal Password Login
  // 2: 2FA MFA OTP Code Verification
  // 3: Forgot Password (Request Reset Link)
  // 4: Set New Password (After clicking recovery link)
  // 5: Gmail Account Unlock (Step 1 - Send Code)
  // 6: Gmail Account Unlock (Step 2 - Verify Code)
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

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

  // 2FA OTP State
  const [otpInput, setOtpInput] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // General Messages
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Email Confirmation State
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Gmail Account Unlock State
  const [unlockEmail, setUnlockEmail] = useState('');
  const [unlockOtp, setUnlockOtp] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [unlockSuccess, setUnlockSuccess] = useState('');
  const [unlockCountdown, setUnlockCountdown] = useState(600); // 10 minutes
  const [unlockTimerActive, setUnlockTimerActive] = useState(false);

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
      setInfoMsg('Password Recovery Active: Please enter your new Super Admin password below.');
    }

    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setStep(4);
          setInfoMsg('Password Recovery Active: Please enter your new Super Admin password below.');
        }
      });
      return () => authListener?.subscription?.unsubscribe();
    }
  }, []);

  // BroadcastChannel for live cross-tab unlock synchronization
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('zapatera_security_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'ACCOUNT_UNLOCKED' && event.data?.email === email.toLowerCase().trim()) {
          setIsLocked(false);
          setError('');
          setInfoMsg('Your account has been unlocked. You may now log in.');
        }
      };
      return () => channel.close();
    }
  }, [email]);

  // 10-Minute Unlock Countdown Timer
  useEffect(() => {
    let interval = null;
    if (unlockTimerActive && unlockCountdown > 0) {
      interval = setInterval(() => {
        setUnlockCountdown((prev) => prev - 1);
      }, 1000);
    } else if (unlockCountdown === 0) {
      setUnlockTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [unlockTimerActive, unlockCountdown]);

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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
          setError('Failed to resend confirmation email.');
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

  /**
   * STEP 1: Main Login Submit with Strict Pre-Auth Lockout Check & Consecutive Attempt Tracking
   */
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setShowResendConfirmation(false);
    setIsLocked(false);
    setLoading(true);

    if (!email || !email.trim()) {
      setError('Please enter your registered email address.');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address format.');
      setLoading(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Rate Limiting Check
    const rateLimit = await checkRateLimit(cleanEmail);
    if (!rateLimit.allowed) {
      setError(rateLimit.message || 'Too many authentication attempts. Please wait 10 seconds before trying again.');
      setLoading(false);
      return;
    }

    // 2. STRICT: Pre-Authentication Account Lockout Check
    // If account is already locked in Supabase database, DO NOT call signInWithPassword!
    const locked = await isAccountLocked(cleanEmail);
    if (locked) {
      setIsLocked(true);
      setError('Your account is locked. Please unlock your account using the verification code sent to your email.');
      setLoading(false);
      return;
    }

    // 3. Verify Profile Record Existence
    let profile = null;
    try {
      if (isSupabaseConfigured()) {
        const { data } = await supabase
          .from('profiles')
          .select('id, email, role, full_name, is_locked, failed_attempts, is_active, phone, address')
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

    // Verify Role Authorization
    const pRole = (profile.role || '').toLowerCase();
    if (pRole !== 'super_admin' && pRole !== 'superadmin') {
      setError('Access denied: You do not have Super Administrator privileges.');
      setLoading(false);
      return;
    }

    // 4. Supabase Official Password Authentication
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

          // Track consecutive failed login attempt in database
          const lockRes = await recordFailedAttempt(cleanEmail, 'super_admin');
          
          if (lockRes.isLockedOut || lockRes.attempts >= 3) {
            setIsLocked(true);
            setError('Your account has been locked after 3 failed login attempts.');
          } else if (lockRes.attempts === 1) {
            setError('Invalid email or password. You have 2 attempts remaining.');
          } else if (lockRes.attempts === 2) {
            setError('Invalid email or password. You have 1 attempt remaining.');
          } else {
            setError('Invalid email or password.');
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

    // 5. SUCCESSFUL AUTHENTICATION RESET
    // Reset failed attempts to 0 and is_locked = false immediately upon successful authentication
    await resetFailedAttempts(cleanEmail);

    // 6. Send 6-Digit MFA Verification Code to Gmail
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
      role: 'super_admin',
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

  /**
   * STEP 2: 2FA MFA OTP Submission
   */
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
      // Handled silently
    }

    if (!verified) {
      setError('Invalid or expired verification code. Please check your Gmail or request a new code.');
      setLoading(false);
      return;
    }

    const verifiedSuperAdmin = {
      ...pendingUser,
      role: 'super_admin',
    };

    StorageService.setCurrentUser(verifiedSuperAdmin);
    setLoading(false);
    onLoginSuccess(verifiedSuperAdmin);
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

  /**
   * GMAIL ACCOUNT UNLOCK: Step 1 - Send Unlock Code
   */
  const handleRequestUnlockCode = async (e) => {
    e.preventDefault();
    setUnlockError('');
    setUnlockSuccess('');
    setUnlockLoading(true);

    const targetEmail = (unlockEmail || email).trim().toLowerCase();

    if (!validateEmail(targetEmail)) {
      setUnlockError('Please enter a valid email address.');
      setUnlockLoading(false);
      return;
    }

    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signInWithOtp({
          email: targetEmail,
          options: { shouldCreateUser: false },
        });
      }
    } catch (e) {
      // Handled silently to prevent enumeration
    }

    setUnlockLoading(false);
    setUnlockEmail(targetEmail);
    setUnlockCountdown(600); // 10 mins
    setUnlockTimerActive(true);
    setStep(6);
    setUnlockSuccess('If an account exists for this email, an unlock code has been sent.');
  };

  /**
   * GMAIL ACCOUNT UNLOCK: Step 2 - Verify Code & Unlock Account in Supabase
   */
  const handleVerifyUnlockCode = async (e) => {
    e.preventDefault();
    setUnlockError('');
    setUnlockSuccess('');
    setUnlockLoading(true);

    if (!unlockOtp || unlockOtp.trim().length !== 6) {
      setUnlockError('Please enter the 6-digit unlock code.');
      setUnlockLoading(false);
      return;
    }

    if (unlockCountdown <= 0) {
      setUnlockError('Verification code has expired. Please request a new code.');
      setUnlockLoading(false);
      return;
    }

    const targetEmail = unlockEmail.trim().toLowerCase();
    let isCodeValid = false;

    try {
      if (isSupabaseConfigured()) {
        const { data, error: otpErr } = await supabase.auth.verifyOtp({
          email: targetEmail,
          token: unlockOtp.trim(),
          type: 'email',
        });

        if (!otpErr && data?.user) {
          isCodeValid = true;
        }
      }
    } catch (err) {
      // Handled silently
    }

    if (!isCodeValid) {
      setUnlockError('Invalid verification code. Please check your Gmail or request a new code.');
      setUnlockLoading(false);
      return;
    }

    // Unlock account in Supabase profiles database
    await resetFailedAttempts(targetEmail);

    setIsLocked(false);
    setUnlockTimerActive(false);
    setUnlockLoading(false);
    setUnlockSuccess('Your account has been successfully unlocked. You may now log in.');
  };

  const handleResendUnlockCode = async () => {
    setUnlockError('');
    setUnlockLoading(true);
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signInWithOtp({
          email: unlockEmail.trim().toLowerCase(),
          options: { shouldCreateUser: false },
        });
      }
      setUnlockCountdown(600);
      setUnlockTimerActive(true);
      setUnlockSuccess('A new unlock code has been sent to your Gmail.');
    } catch (e) {
      setUnlockError('Failed to resend unlock code.');
    } finally {
      setUnlockLoading(false);
    }
  };

  /**
   * FORGOT PASSWORD: Send Reset Link
   */
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
        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin,
        });
      }
    } catch (err) {
      // Handled silently
    }
    setForgotLoading(false);
    setForgotSuccess(`If an account exists for ${cleanEmail}, password reset instructions have been sent.`);
  };

  /**
   * RESET PASSWORD: Update Password in Supabase Auth & Reset Lockout in profiles
   */
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
          setResetError(updateErr.message || 'Failed to update password.');
          setResetLoading(false);
          return;
        }

        const targetEmail = (data?.user?.email || forgotEmail || email || '').toLowerCase().trim();

        if (targetEmail) {
          // STRICT: Only update lockout fields in profiles table, NEVER the password column!
          await supabase
            .from('profiles')
            .update({
              is_locked: false,
              failed_attempts: 0,
              locked_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('email', targetEmail);
        }
      }

      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }

      setResetSuccess('Your password has been successfully updated! Redirecting to login...');
      setTimeout(() => {
        setStep(1);
        setResetSuccess('');
        setPassword('');
        setIsLocked(false);
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

        <div className="relative z-10 p-12 flex flex-col justify-between w-full h-full text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
              <ShieldCheck className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-red-300 font-bold block">
                Executive Administration
              </span>
              <h1 className="text-xl font-extrabold tracking-tight text-white drop-shadow-sm">
                Barangay Zapatera
              </h1>
            </div>
          </div>

          <div className="max-w-md my-auto py-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-200 text-xs font-semibold mb-6">
              <Lock className="w-3.5 h-3.5 text-red-300" />
              Highest Security Level Required
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight mb-4">
              Barangay Zapatera Super Admin Portal
            </h2>
            <p className="text-sm text-slate-200/90 leading-relaxed">
              Restricted executive interface for complete system governance, administrative user provisioning, and secure document records.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300/80 pt-6 border-t border-white/10">
            <span>© 2026 Barangay Zapatera, Cebu City</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Secure Auth Online
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Clean White Form Container (max-width ~400px) */}
      <div className="flex-1 min-h-screen bg-white flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        {/* Top-Left Branding / Mobile Header */}
        <div className="flex items-center justify-between w-full max-w-[400px] mx-auto mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-700 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
                Barangay Zapatera
              </span>
              <span className="text-sm font-bold text-slate-900">
                Super Admin Access
              </span>
            </div>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
            GovPH
          </span>
        </div>

        {/* Centered Form Wrapper */}
        <div className="w-full max-w-[400px] mx-auto my-auto py-4">
          {/* ================= STEP 1: PASSWORD LOGIN ================= */}
          {step === 1 && (
            <div>
              <div className="mb-6 text-left">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Super Admin Sign In
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Enter your executive credentials to access the Barangay Zapatera administration portal.
                </p>
              </div>

              {/* Status & Error Alerts */}
              {error && (
                <div className={`p-4 rounded-xl border mb-5 flex flex-col gap-2.5 text-xs animate-in fade-in duration-200 ${
                  isLocked ? 'bg-red-50 border-red-200 text-red-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">{error}</span>
                  </div>

                  {isLocked && (
                    <button
                      type="button"
                      onClick={() => {
                        setUnlockEmail(email);
                        setStep(5);
                        setError('');
                        setInfoMsg('');
                      }}
                      className="mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors shadow-sm"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Unlock Account
                    </button>
                  )}

                  {showResendConfirmation && (
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={resendLoading}
                      className="mt-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors"
                    >
                      {resendLoading ? 'Resending...' : 'Resend Confirmation Email'}
                    </button>
                  )}
                </div>
              )}

              {infoMsg && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2 mb-5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{infoMsg}</span>
                </div>
              )}

              <form onSubmit={handleStep1Submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Super Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="superadmin@zapatera.gov.ph"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Super Admin Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setStep(3);
                        setError('');
                      }}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Account Unlock Help Option */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Account locked out?</span>
                <button
                  type="button"
                  onClick={() => {
                    setUnlockEmail(email);
                    setStep(5);
                    setError('');
                    setInfoMsg('');
                  }}
                  className="font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Unlock Account
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: 2FA MFA OTP CODE ================= */}
          {step === 2 && (
            <div>
              <div className="mb-6 text-left">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-700 mb-3">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Two-Factor Authentication
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Enter the 6-digit verification code sent to <strong className="text-slate-800">{pendingUser?.email}</strong>.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 mb-4">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {infoMsg && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{infoMsg}</span>
                </div>
              )}

              <form onSubmit={handleStep2Submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.4em] font-mono text-lg font-bold py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpInput.length !== 6}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Authorize Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setOtpInput('');
                      setError('');
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Login
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resend Code
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= STEP 3: FORGOT PASSWORD ================= */}
          {step === 3 && (
            <div>
              <div className="mb-6 text-left">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Reset Super Admin Password
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Enter your registered Super Admin email to receive a password reset recovery link.
                </p>
              </div>

              {forgotError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 mb-4">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Super Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="superadmin@zapatera.gov.ph"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Recovery Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setForgotError('');
                      setForgotSuccess('');
                    }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Login
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= STEP 4: SET NEW PASSWORD ================= */}
          {step === 4 && (
            <div>
              <div className="mb-6 text-left">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Set New Password
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Enter your new secure password for your Super Admin account.
                </p>
              </div>

              {resetError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 mb-4">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showResetNewPassword ? 'text' : 'password'}
                      required
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showResetConfirmPassword ? 'text' : 'password'}
                      required
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading || !resetNewPassword || resetNewPassword !== resetConfirmPassword}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Save New Password & Unlock Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ================= STEP 5: GMAIL UNLOCK (STEP 1 - REQUEST CODE) ================= */}
          {step === 5 && (
            <div>
              <div className="mb-6 text-left">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-700 mb-3">
                  <Unlock className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Unlock Your Account
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Enter your registered email address to receive an account unlock code.
                </p>
              </div>

              {unlockError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 mb-4">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{unlockError}</span>
                </div>
              )}

              <form onSubmit={handleRequestUnlockCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={unlockEmail}
                      onChange={(e) => setUnlockEmail(e.target.value)}
                      placeholder="superadmin@zapatera.gov.ph"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={unlockLoading}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {unlockLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Unlock Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Unlock Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setUnlockError('');
                    }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Login
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= STEP 6: GMAIL UNLOCK (STEP 2 - VERIFY CODE) ================= */}
          {step === 6 && (
            <div>
              <div className="mb-6 text-left">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-700 mb-3">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Enter Verification Code
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  We sent an account unlock code to your registered email address.
                </p>
              </div>

              {unlockError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 mb-4">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{unlockError}</span>
                </div>
              )}

              {unlockSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{unlockSuccess}</span>
                </div>
              )}

              {/* Countdown Timer Display */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 mb-4">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Code expires in:
                </span>
                <span className={`font-mono font-bold ${unlockCountdown < 60 ? 'text-red-600' : 'text-slate-900'}`}>
                  {formatCountdown(unlockCountdown)}
                </span>
              </div>

              {unlockSuccess.includes('successfully unlocked') ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setPassword('');
                    setError('');
                    setInfoMsg('Your account has been successfully unlocked. You may now log in.');
                  }}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Back to Login</span>
                </button>
              ) : (
                <form onSubmit={handleVerifyUnlockCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={unlockOtp}
                      onChange={(e) => setUnlockOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full text-center tracking-[0.4em] font-mono text-lg font-bold py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={unlockLoading || unlockOtp.length !== 6 || unlockCountdown <= 0}
                      className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {unlockLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4" />
                          <span>Verify & Unlock</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleResendUnlockCode}
                      disabled={unlockLoading}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend</span>
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setUnlockError('');
                        setUnlockSuccess('');
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="w-full max-w-[400px] mx-auto text-center pt-4 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            Zapatera Document & Records Management System
          </p>
        </div>
      </div>
    </div>
  );
}
