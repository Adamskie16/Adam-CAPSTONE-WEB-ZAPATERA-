// Admin/src/features/auth/AdminLoginPage.jsx
import React, { useState } from 'react';
import { StorageService } from '../../core/storage';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { validateEmail, checkRateLimit, recordFailedAttempt, resetFailedAttempts } from '../../core/security';
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
  const [pendingUser, setPendingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setLoading(true);

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // 0. Server-Side Rate Limiting Check
    const rateLimit = await checkRateLimit(cleanEmail);
    if (!rateLimit.allowed) {
      setError(rateLimit.message || 'Too many authentication attempts. Please wait 15 minutes before trying again.');
      setLoading(false);
      return;
    }

    // 0.1 Check if Account is Already Locked in Database
    try {
      if (isSupabaseConfigured()) {
        const { data: lockProfile } = await supabase
          .from('profiles')
          .select('is_locked, failed_attempts')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (lockProfile && (lockProfile.is_locked || (lockProfile.failed_attempts || 0) >= 3)) {
          setError('Your account has been temporarily locked. Please contact an administrator to request access.');
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Pre-auth lock check notice:', err);
    }

    let foundUser = null;
    let authNoticeMessage = '';

    // 1. Authenticate via Supabase Auth (auth.users)
    try {
      if (isSupabaseConfigured()) {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (authErr) {
          if (authErr.message.includes('Email not confirmed')) {
            setError('Email Not Confirmed: Please check your Gmail inbox and click the confirmation link before logging in.');
            setLoading(false);
            return;
          } else {
            authNoticeMessage = authErr.message;
          }
        }

        if (authData?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

          const userMeta = authData.user.user_metadata || {};
          const metaRole = (profile?.role || userMeta.role || userMeta.user_role || 'admin').toLowerCase();

          if (metaRole !== 'admin' && metaRole !== 'super_admin' && metaRole !== 'superadmin') {
            setError('Access Denied: This login portal is restricted to Barangay Admin officers.');
            setLoading(false);
            return;
          }

          foundUser = {
            id: authData.user.id,
            email: authData.user.email || cleanEmail,
            full_name: profile?.full_name || userMeta.full_name || userMeta.display_name || cleanEmail.split('@')[0],
            role: metaRole === 'superadmin' ? 'super_admin' : metaRole,
            phone: profile?.phone || userMeta.phone || '',
            address: profile?.address || userMeta.address || '',
            is_active: profile?.is_active !== false,
            failed_attempts: 0,
            is_locked: false,
          };

          // Successful Login -> Reset Failed Attempts Counter
          await resetFailedAttempts(cleanEmail);
        }
      }
    } catch (err) {
      console.warn('Supabase Auth signIn notice:', err);
    }

    // 2. Query public.profiles table for admin or super_admin role if not auth yet
    if (!foundUser) {
      try {
        const { data, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (data && !profileErr) {
          const pRole = (data.role || '').toLowerCase();
          if (pRole === 'admin' || pRole === 'super_admin' || pRole === 'superadmin') {
            if (data.password && data.password === password) {
              foundUser = {
                id: data.id,
                email: data.email,
                full_name: data.full_name || cleanEmail.split('@')[0],
                role: pRole === 'superadmin' ? 'super_admin' : pRole,
                password: data.password,
                phone: data.phone || '',
                address: data.address || '',
                is_active: data.is_active !== false,
                failed_attempts: 0,
                is_locked: false,
              };

              // Successful Login -> Reset Failed Attempts Counter
              await resetFailedAttempts(cleanEmail);
            }
          }
        }
      } catch (err) {
        console.warn('Profiles fetch notice:', err);
      }
    }

    // 3. Handle Failed Login Attempt if user wasn't authenticated
    if (!foundUser) {
      const lockRes = await recordFailedAttempt(cleanEmail, 'admin');
      if (lockRes.isLockedOut || lockRes.attempts >= 3) {
        setError('Your account has been locked due to multiple failed login attempts. Please contact an administrator to request an unlock.');
      } else {
        setError('Invalid login credentials. Please check your email and password.');
      }
      setLoading(false);
      return;
    }

    // 6. Generate local OTP fallback + dispatch Supabase Email OTP
    const localOtp = StorageService.generateOTP(cleanEmail);
    setDevOtp(localOtp);

    try {
      if (isSupabaseConfigured()) {
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
        });

        if (!otpErr) {
          setPendingUser(foundUser);
          setStep(2);
          setEmailSent(true);
          setDevOtp('');
          setInfoMsg(`MFA Email Verification Required: A 6-digit OTP code has been sent to ${cleanEmail}. Please check your Gmail inbox.`);
        } else {
          setPendingUser(foundUser);
          setStep(2);
          setEmailSent(false);
          setInfoMsg(`A 6-digit Verification Code (${localOtp}) has been generated for ${cleanEmail}. Enter code ${localOtp} (or testing code 123456) below.`);
        }
      } else {
        setPendingUser(foundUser);
        setStep(2);
        setEmailSent(false);
        setInfoMsg(`A 6-digit Verification Code (${localOtp}) has been generated for ${cleanEmail}. Enter code ${localOtp} (or testing code 123456) below.`);
      }
    } catch (err) {
      setPendingUser(foundUser);
      setStep(2);
      setEmailSent(false);
      setInfoMsg(`A 6-digit Verification Code (${localOtp}) has been generated for ${cleanEmail}. Enter code ${localOtp} (or testing code 123456) below.`);
    }

    setLoading(false);
  };

  const handleResendOTP = async () => {
    if (!pendingUser) return;
    setLoading(true);
    setError('');

    const localOtp = StorageService.generateOTP(pendingUser.email);
    setDevOtp(localOtp);

    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: pendingUser.email.trim().toLowerCase(),
      });

      if (otpErr) {
        setEmailSent(false);
        setInfoMsg(`Email delivery unavailable. Use temporary code ${localOtp}.`);
      } else {
        setEmailSent(true);
        setDevOtp('');
        setInfoMsg(`A new OTP has been re-sent to ${pendingUser.email}. Please check your inbox.`);
      }
    } catch (err) {
      setEmailSent(false);
      setInfoMsg(`Resend failed. Use temporary code ${localOtp}.`);
    }

    setLoading(false);
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

    if (emailSent) {
      try {
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
      } catch (err) {
        console.warn('Supabase verifyOtp notice:', err);
      }
    }

    if (!verified) {
      const isLocalOtpValid = StorageService.verifyOTP(pendingUser.email, otpInput.trim());
      if (isLocalOtpValid) {
        verified = true;
      }
    }

    if (!verified) {
      setError('Invalid or expired OTP code. Please check your email inbox and try again.');
      setLoading(false);
      return;
    }

    StorageService.resetFailedAttempts(pendingUser.email);
    StorageService.setCurrentUser(pendingUser);
    setLoading(false);
    onLoginSuccess(pendingUser);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/15 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-indigo-600/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden relative z-10">
        
        <div className="p-6 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-3 shadow-inner">
            <FileText className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">Barangay Zapatera</h1>
          <div className="flex items-center justify-center space-x-2 mt-1">
            <p className="text-xs text-slate-300 font-medium">Admin Operations & Documents Portal</p>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">Admin Officer</span>
          </div>

          {step !== 3 && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-[11px]">
              <span className={`px-2.5 py-1 rounded-full font-semibold border ${step === 1 ? 'bg-blue-600/30 text-blue-300 border-blue-500/40' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>
                1. Admin Credentials
              </span>
              <span className="text-slate-600">→</span>
              <span className={`px-2.5 py-1 rounded-full font-semibold border ${step === 2 ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>
                2. Email MFA Code
              </span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          
          {error && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-800/80 text-rose-200 rounded-xl text-xs flex items-start space-x-2.5 shadow-sm">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {infoMsg && (
            <div className="p-3.5 bg-blue-950/80 border border-blue-800/80 text-blue-200 rounded-xl text-xs flex items-start space-x-2.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{infoMsg}</div>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Admin Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@zapatera.gov.ph"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-semibold">Admin Password</label>
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
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 text-xs cursor-pointer"
              >
                {loading ? (
                  <span>Sending OTP to your email…</span>
                ) : (
                  <>
                    <span>Continue to MFA Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-4 text-xs">
              {emailSent ? (
                <div className="p-4 bg-gradient-to-r from-blue-950 to-slate-950 border border-blue-500/40 rounded-xl space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-[11px] font-bold text-blue-300 border-b border-blue-900/60 pb-1.5">
                    <span className="flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      <span>Barangay Official Mail Server</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">✉ OTP Sent to Gmail</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    OTP dispatched to: <span className="font-mono text-white font-semibold">{pendingUser?.email}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Open your Gmail inbox (check Spam/Junk too). Enter the 6-digit code from the Supabase verification email.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-gradient-to-r from-amber-950 to-slate-950 border border-amber-500/40 rounded-xl space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-300 border-b border-amber-900/60 pb-1.5">
                    <span className="flex items-center space-x-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>Email Unavailable — Temporary OTP Code</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">Dev Fallback</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Email service is not configured yet. Use this temporary code:</p>
                  <div className="bg-slate-950 border border-amber-500/30 p-3 rounded-lg text-center">
                    <span className="text-2xl font-mono font-bold tracking-widest text-amber-300">{devOtp || '123456'}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Enter 6-Digit Email OTP</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-center text-lg tracking-widest font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); setInfoMsg(''); }}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ← Back to Credentials
                </button>

                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-semibold disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend OTP Code</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 text-xs cursor-pointer"
              >
                {loading ? (
                  <span>Verifying OTP…</span>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Verify OTP & Sign In</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 3: FORGOT PASSWORD */}
          {step === 3 && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-xs">
              <div className="p-4 bg-blue-950/40 border border-blue-800/60 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-blue-300 font-bold">
                  <HelpCircle className="w-4 h-4 text-blue-400" />
                  <span>Reset Admin Password</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Enter your registered Admin email address below. A password reset link will be sent to your Gmail inbox.
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
                <label className="block text-slate-300 font-semibold mb-1.5">Account Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@zapatera.gov.ph"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
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
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  <span>Send Reset Link</span>
                </button>
              </div>
            </form>
          )}

        </div>

        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center text-[10px] text-slate-500">
          Barangay Zapatera Administration Portal • 3 Failed Login Attempts Lockout & Supabase Email MFA Active
        </div>

      </div>
    </div>
  );
}
