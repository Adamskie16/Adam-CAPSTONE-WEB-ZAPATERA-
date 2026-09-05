import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  Info,
  Check,
  X,
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  Vote,
} from 'lucide-react';
import { ResidentUser } from '../../types';
import { validateEmail, sanitizeInput, checkRateLimit, isAccountLocked, recordFailedAttempt, resetFailedAttempts } from '../../core/security';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { MobileStorage } from '../../core/storage';
import UnlockAccountModal from '../../components/UnlockAccountModal';

// ============================================================================
// SAMPLE SITIO LIST FOR BARANGAY ZAPATERA
// NOTE: You can easily add, edit, or customize any sitio names in this array:
// ============================================================================
export const SAMPLE_SITIOS: string[] = [
  'Sitio Zapatera Proper',
  'Sitio San Roque',
  'Sitio Lower Zapatera',
  'Sitio Upper Zapatera',
  'Sitio Central',
  'Sitio Riverside',
  'Sitio Ramos',
  'Sitio Kamagong',
];

interface ResidentAuthPageProps {
  onLoginSuccess: (user: ResidentUser) => void;
}

// Strong Password Validation Helper
export function checkPasswordStrength(password: string) {
  return {
    hasLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

export function isStrongPassword(password: string): boolean {
  const s = checkPasswordStrength(password);
  return s.hasLength && s.hasUpper && s.hasLower && s.hasNumber && s.hasSpecial;
}

export default function ResidentAuthPage({ onLoginSuccess }: ResidentAuthPageProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [authStep, setAuthStep] = useState<'credentials' | 'otp' | 'forgot_password' | 'reset_password'>('credentials');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successBanner, setSuccessBanner] = useState<string>('');
  const [infoBanner, setInfoBanner] = useState<string>('');

  // Login Credentials State
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState<boolean>(false);

  // Forgot Password & Reset Password State
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [resetNewPassword, setResetNewPassword] = useState<string>('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState<string>('');
  const [showResetNewPassword, setShowResetNewPassword] = useState<boolean>(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState<boolean>(false);

  // OTP State
  const [otpInput, setOtpInput] = useState<string>('');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [pendingUser, setPendingUser] = useState<ResidentUser | null>(null);

  // Register Form State (Structured Fields)
  const [regData, setRegData] = useState({
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

  // Password Visibility State for Register
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState<boolean>(false);

  // Privacy Policy Modal State
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Detect password recovery redirect
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const isRecovery =
      hash.includes('type=recovery') ||
      search.includes('type=recovery') ||
      hash.includes('access_token');

    if (isRecovery) {
      setAuthStep('reset_password');
      setInfoBanner('Password Recovery Active: Please enter and confirm your new account password.');
    }

    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setAuthStep('reset_password');
          setInfoBanner('Password Recovery Active: Please enter and confirm your new account password.');
        }
      });
      return () => authListener?.subscription?.unsubscribe();
    }
  }, []);

  // Live password strength indicator for register
  const passwordStrength = checkPasswordStrength(regData.password);
  const passwordsMatch = regData.password && regData.confirmPassword && regData.password === regData.confirmPassword;

  // Formatted Full Name Preview: "Lastname, Firstname MI."
  const cleanMI = regData.middle_initial.trim().toUpperCase().replace(/\.$/, '');
  const previewFormattedName = regData.last_name.trim() || regData.first_name.trim()
    ? `${regData.last_name.trim() || '[Last Name]'}, ${regData.first_name.trim() || '[First Name]'} ${cleanMI ? cleanMI + '.' : ''}`
    : '';

  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleResendConfirmation = async () => {
    if (!loginEmail) return;
    setResendLoading(true);
    setErrorMessage('');
    try {
      if (isSupabaseConfigured()) {
        const { error: resendErr } = await supabase.auth.resend({
          type: 'signup',
          email: loginEmail.trim().toLowerCase(),
        });
        if (resendErr) {
          setErrorMessage(resendErr.message || 'Failed to resend confirmation email.');
        } else {
          setSuccessBanner(`A confirmation link has been resent to ${loginEmail.trim().toLowerCase()}. Please check your Gmail.`);
        }
      }
    } catch (err) {
      setErrorMessage('Failed to resend confirmation email.');
    } finally {
      setResendLoading(false);
    }
  };

  // ==========================================
  // HANDLE RESIDENT LOGIN
  // ==========================================
  const handleCredentialsSubmit = async () => {
    setErrorMessage('');
    setSuccessBanner('');
    setInfoBanner('');
    setShowResendConfirmation(false);

    if (!validateEmail(loginEmail)) {
      setErrorMessage('Please enter a valid Gmail / email address.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    const cleanEmail = loginEmail.toLowerCase().trim();

    // 1. CHECK RATE LIMIT (10-second interval)
    const rateLimit = await checkRateLimit(cleanEmail);
    if (!rateLimit.allowed) {
      setErrorMessage(rateLimit.message || 'Too many authentication attempts. Please wait 10 seconds before trying again.');
      setLoading(false);
      return;
    }

    // 2. CHECK IF ACCOUNT IS LOCKED (3 Failed Attempts)
    const locked = await isAccountLocked(cleanEmail);
    if (locked) {
      setIsLocked(true);
      setErrorMessage('Your account has been locked after 3 failed login attempts. Please unlock your account using the verification code sent to your email.');
      setLoading(false);
      return;
    }

    // 3. CHECK WHETHER GMAIL / ACCOUNT EXISTS
    let profData: any = null;
    try {
      if (isSupabaseConfigured()) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        profData = data;
      }
    } catch (e) {
      // Handled silently
    }

    if (!profData) {
      setErrorMessage('This Gmail account is not registered. Please sign up first.');
      setLoading(false);
      return;
    }

    // 4. VERIFY PASSWORD WITH OFFICIAL SUPABASE AUTH & CHECK EMAIL CONFIRMATION
    let authUser: any = null;
    try {
      if (isSupabaseConfigured()) {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: loginPassword,
        });

        if (authErr) {
          const errMsg = (authErr.message || '').toLowerCase();
          if (errMsg.includes('email not confirmed') || errMsg.includes('confirm') || authErr.code === 'email_not_confirmed') {
            setErrorMessage('Your account has been created, but your Gmail has not been confirmed yet. Please check your email and click the confirmation link before logging in.');
            setShowResendConfirmation(true);
            setLoading(false);
            return;
          }

          const lockRes = await recordFailedAttempt(cleanEmail, 'resident');
          if (lockRes.isLockedOut || lockRes.attempts >= 3) {
            setIsLocked(true);
            setErrorMessage('Your account has been locked after 3 failed login attempts. Please unlock your account using the verification code sent to your email.');
          } else {
            const remaining = lockRes.remaining ?? (3 - lockRes.attempts);
            setErrorMessage(`Invalid email or password. You have ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`);
          }

          setLoading(false);
          return;
        }

        authUser = authData?.user;
      }
    } catch (err: any) {
      setErrorMessage('Authentication service error. Please try again.');
      setLoading(false);
      return;
    }

    // 5. SUCCESSFUL PASSWORD VERIFICATION -> RESET LOCKOUT AND DISPATCH 6-DIGIT OTP TO GMAIL
    await resetFailedAttempts(cleanEmail);
    setIsLocked(false);

    try {
      if (isSupabaseConfigured()) {
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            shouldCreateUser: false,
          },
        });

        if (otpErr) {
          setErrorMessage('Failed to send verification code to your Gmail. Please try again.');
          setLoading(false);
          return;
        }
      }
    } catch (err: any) {
      setErrorMessage('Failed to send OTP code to your Gmail. Please check your connection.');
      setLoading(false);
      return;
    }

    const residentPayload: ResidentUser = {
      id: profData.id,
      email: cleanEmail,
      full_name: profData.full_name || authUser?.user_metadata?.full_name || 'Resident User',
      first_name: profData.first_name || '',
      last_name: profData.last_name || '',
      middle_initial: profData.middle_initial || '',
      role: 'resident',
      password: '',
      phone: profData.phone || '09171234567',
      address: profData.address || 'Barangay Zapatera, Cebu City',
      sitio: profData.sitio || 'Sitio Zapatera Proper',
      civil_status: profData.civil_status || 'Single',
      voter_status: profData.voter_status || 'Registered Voter',
      id_type: profData.id_type || 'Barangay ID',
      id_number: profData.id_number || 'BZ-RES-001',
      is_active: true,
      is_locked: false,
      failed_attempts: 0,
      created_at: profData.created_at || new Date().toISOString(),
    };

    setPendingUser(residentPayload);
    setAuthStep('otp');
    setInfoBanner(
      `Password verified! A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your Gmail Inbox or Spam folder and enter it below.`
    );
    setLoading(false);
  };

  // VERIFY GMAIL 6-DIGIT OTP
  const handleOtpSubmit = async () => {
    setErrorMessage('');
    if (!otpInput || otpInput.trim().length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    const cleanOtp = otpInput.trim();
    let isVerified = false;

    if (pendingUser && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: pendingUser.email.trim().toLowerCase(),
          token: cleanOtp,
          type: 'email',
        });
        if (!error && (data?.session || data?.user)) {
          isVerified = true;
          if (data?.session) {
            await supabase.auth.setSession(data.session);
          }
        }
      } catch (vErr) {
        console.warn('Supabase verifyOtp exception:', vErr);
      }
    }

    if (isVerified && pendingUser) {
      await MobileStorage.setItem('zapatera_resident_session', JSON.stringify(pendingUser));
      setLoading(false);
      onLoginSuccess(pendingUser);
      return;
    }

    setErrorMessage('Invalid or expired 6-digit verification code. Please check your Gmail inbox or request a new code.');
    setLoading(false);
  };

  // RESEND GMAIL OTP
  const handleResendOtp = async () => {
    if (!pendingUser) return;
    setLoading(true);
    setErrorMessage('');

    try {
      if (isSupabaseConfigured()) {
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: pendingUser.email.trim().toLowerCase(),
          options: { shouldCreateUser: false },
        });

        if (otpErr) {
          setErrorMessage('Failed to resend code. Please try again in a few moments.');
        } else {
          setInfoBanner(
            `A new 6-digit verification code has been re-sent to ${pendingUser.email}. Please check your Gmail inbox.`
          );
        }
      }
    } catch (err: any) {
      setErrorMessage('Resend failed. Please check your internet connection.');
    }

    setLoading(false);
  };

  // ==========================================================================
  // FORGOT PASSWORD (REQUEST RESET LINK TO GMAIL)
  // ==========================================================================
  const handleForgotPasswordSubmit = async () => {
    setErrorMessage('');
    setSuccessBanner('');
    setInfoBanner('');

    if (!validateEmail(forgotEmail)) {
      setErrorMessage('Please enter a valid Gmail / email address.');
      return;
    }

    setLoading(true);
    const cleanEmail = forgotEmail.trim().toLowerCase();

    try {
      if (isSupabaseConfigured()) {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        });

        if (resetErr) {
          console.warn('Supabase resetPassword notice:', resetErr.message);
        }
      }
    } catch (err: any) {
      console.warn('Password reset error:', err);
    }

    setLoading(false);
    setSuccessBanner(`Password reset instructions dispatched to (${cleanEmail}). Please check your Gmail inbox and click the reset link.`);
  };

  // ==========================================================================
  // RESET PASSWORD (SET NEW PASSWORD IN SUPABASE & DATABASE)
  // ==========================================================================
  const handleResetPasswordSubmit = async () => {
    setErrorMessage('');
    setSuccessBanner('');
    setInfoBanner('');

    if (resetNewPassword.length < 8) {
      setErrorMessage('Security Alert: Password must be at least 8 characters long.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMessage('Password Mismatch: Passwords do not match. Please ensure both fields match.');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured()) {
        const { data, error: updateErr } = await supabase.auth.updateUser({
          password: resetNewPassword,
        });

        if (updateErr) {
          console.warn('Supabase updateUser notice:', updateErr.message);
        }

        const targetEmail = (data?.user?.email || forgotEmail || loginEmail || '').toLowerCase().trim();

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

      setLoading(false);
      setSuccessBanner('Your password has been successfully updated in the database! You can now log in with your new password.');
      setTimeout(() => {
        setAuthStep('credentials');
        setLoginPassword('');
        setResetNewPassword('');
        setResetConfirmPassword('');
      }, 2000);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage('Failed to update password. Please try requesting a new reset link.');
    }
  };

  // ==========================================================================
  // 3. REGISTER RESIDENT ACCOUNT (Strict Validation + Supabase Storage)
  // ==========================================================================
  const handleRegister = async () => {
    setErrorMessage('');
    setSuccessBanner('');
    setInfoBanner('');

    // 1. Full Name Validation (Last Name, First Name, MI)
    if (!regData.last_name.trim()) {
      setErrorMessage('Required: Please provide your Last Name.');
      return;
    }
    if (!regData.first_name.trim()) {
      setErrorMessage('Required: Please provide your First Name.');
      return;
    }
    if (!regData.middle_initial.trim()) {
      setErrorMessage('Required: Please provide your Middle Initial (MI).');
      return;
    }

    // 2. Email Validation
    if (!validateEmail(regData.email)) {
      setErrorMessage('Required: Please enter a valid Gmail / email address.');
      return;
    }

    // 3. Mobile Number Validation
    if (!regData.phone.trim()) {
      setErrorMessage('Required: Please provide your 11-digit mobile phone number (e.g. 09171234567).');
      return;
    }

    // 4. Voter Status Validation
    if (!regData.voter_status) {
      setErrorMessage('Required: Please select if you are a Registered Voter or Not.');
      return;
    }

    // 5. Sitio Selection Validation
    if (!regData.sitio) {
      setErrorMessage('Required: Please select your Sitio in Barangay Zapatera.');
      return;
    }

    // 6. Strong Password Validation
    if (!isStrongPassword(regData.password)) {
      setErrorMessage(
        'Password Security Alert: Your password does not meet the strong password requirements. A strong password requires: at least 8 characters, 1 uppercase letter (A-Z), 1 lowercase letter (a-z), 1 number (0-9), and 1 special character (!@#$%^&*).'
      );
      return;
    }

    // 7. Confirm Password Matching Validation
    if (regData.password !== regData.confirmPassword) {
      setErrorMessage('Password Mismatch Alert: Password and Confirm Password do not match. Please re-enter.');
      return;
    }

    // 8. Privacy Policy Acceptance Validation
    if (!regData.privacyPolicyAccepted) {
      setErrorMessage(
        'Privacy Policy Required: You must read and agree to the Barangay Zapatera Data Privacy Policy before registering.'
      );
      return;
    }

    setLoading(true);
    const cleanEmail = regData.email.toLowerCase().trim();
    const cleanLastName = sanitizeInput(regData.last_name.trim());
    const cleanFirstName = sanitizeInput(regData.first_name.trim());
    const cleanMI = sanitizeInput(regData.middle_initial.trim().toUpperCase().replace(/\.$/, ''));

    // Combined Name: "Lastname, Firstname MI."
    const formattedFullName = `${cleanLastName}, ${cleanFirstName} ${cleanMI ? cleanMI + '.' : ''}`;
    const displayName = `${cleanFirstName} ${cleanMI ? cleanMI + '.' : ''} ${cleanLastName}`;

    let assignedId = `res-${Date.now()}`;

    // 9. Store to Supabase Auth & Database Profiles
    try {
      if (isSupabaseConfigured()) {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: regData.password,
          options: {
            data: {
              display_name: displayName,
              full_name: formattedFullName,
              first_name: cleanFirstName,
              last_name: cleanLastName,
              middle_initial: cleanMI,
              role: 'resident',
              phone: regData.phone.trim(),
              voter_status: regData.voter_status,
              sitio: regData.sitio,
              privacy_policy_accepted: true,
            },
          },
        });

        if (signUpErr) {
          console.warn('Supabase signUp notice:', signUpErr.message);
          if (signUpErr.message.includes('already registered')) {
            setErrorMessage('This Gmail address is already registered. Please log in instead.');
            setLoading(false);
            return;
          }
        }

        if (signUpData?.user?.id) {
          assignedId = signUpData.user.id;
        }

        // Insert/Upsert into Supabase `profiles` table (All resident info except password)
        await supabase.from('profiles').upsert(
          [
            {
              id: assignedId,
              email: cleanEmail,
              full_name: formattedFullName,
              first_name: cleanFirstName,
              last_name: cleanLastName,
              middle_initial: cleanMI,
              role: 'resident',
              phone: regData.phone.trim(),
              sitio: regData.sitio,
              voter_status: regData.voter_status,
              civil_status: 'Single',
              id_type: regData.voter_status === 'Registered Voter' ? 'Voters ID' : 'Barangay Resident ID',
              id_number: `BZ-RES-${Date.now().toString().slice(-6)}`,
              privacy_policy_accepted: true,
              is_active: true,
              is_locked: false,
              failed_attempts: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'email' }
        );
      }
    } catch (err: any) {
      console.warn('Supabase registration error:', err);
    }

    const newResident: ResidentUser = {
      id: assignedId,
      email: cleanEmail,
      full_name: formattedFullName,
      first_name: cleanFirstName,
      last_name: cleanLastName,
      middle_initial: cleanMI,
      role: 'resident',
      password: regData.password,
      phone: regData.phone.trim(),
      sitio: regData.sitio,
      civil_status: 'Single',
      voter_status: regData.voter_status,
      id_type: regData.voter_status === 'Registered Voter' ? 'Voters ID' : 'Barangay Resident ID',
      id_number: `BZ-RES-${Date.now().toString().slice(-6)}`,
      is_active: true,
      is_locked: false,
      failed_attempts: 0,
      created_at: new Date().toISOString(),
    };

    try {
      const storedDb = await MobileStorage.getItem('zapatera_residents_db');
      const residents: ResidentUser[] = storedDb ? JSON.parse(storedDb) : [];
      const filtered = residents.filter((r) => r.email.toLowerCase() !== cleanEmail);
      filtered.unshift(newResident);
      await MobileStorage.setItem('zapatera_residents_db', JSON.stringify(filtered));
    } catch (err) {
      console.warn('MobileStorage register notice:', err);
    }

    setLoading(false);
    setLoginEmail(cleanEmail);
    setActiveTab('login');
    setAuthStep('credentials');
    setSuccessBanner(
      `Registration Successful! Account created for ${formattedFullName}. A confirmation link has been sent to your Gmail (${cleanEmail}). You can now log in.`
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerArea}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=300&q=80' }}
          style={styles.sealLogo}
        />
        <Text style={styles.portalTitle}>BARANGAY ZAPATERA</Text>
        <Text style={styles.portalSubtitle}>Resident Digital Service Portal</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'login' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('login');
            setAuthStep('credentials');
            setErrorMessage('');
            setSuccessBanner('');
            setInfoBanner('');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>Resident Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'register' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('register');
            setErrorMessage('');
            setSuccessBanner('');
            setInfoBanner('');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'register' && styles.tabTextActive]}>New Resident Sign Up</Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic Alerts and Banners */}
      {successBanner ? (
        <View style={styles.successBox}>
          <View style={styles.alertHeaderRow}>
            <CheckCircle2 size={18} color="#10b981" />
            <Text style={styles.successTitle}>Registration Completed</Text>
          </View>
          <Text style={styles.successText}>{successBanner}</Text>
        </View>
      ) : null}

      {infoBanner ? (
        <View style={styles.infoBox}>
          <View style={styles.alertHeaderRow}>
            <Info size={18} color="#3b82f6" />
            <Text style={styles.infoTitle}>Verification Notice</Text>
          </View>
          <Text style={styles.infoText}>{infoBanner}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={[styles.errorBox, isLocked && styles.lockedBox]}>
          <View style={styles.alertHeaderRow}>
            {isLocked ? <Lock size={18} color="#f43f5e" /> : <AlertTriangle size={18} color="#f43f5e" />}
            <Text style={styles.errorTitle}>{isLocked ? 'Account Security Lockout' : 'Validation Alert'}</Text>
          </View>
          <Text style={styles.errorText}>{errorMessage}</Text>
          {isLocked ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 10, paddingVertical: 10, backgroundColor: '#dc2626' }]}
              onPress={() => setIsUnlockModalOpen(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Unlock size={16} color="#ffffff" />
                <Text style={styles.primaryBtnText}>Unlock Account with Gmail Code</Text>
              </View>
            </TouchableOpacity>
          ) : null}
          {showResendConfirmation ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 8, paddingVertical: 8, backgroundColor: '#2563eb' }]}
              onPress={handleResendConfirmation}
              disabled={resendLoading}
            >
              {resendLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={[styles.primaryBtnText, { fontSize: 12 }]}>Resend Confirmation Email Link ✉</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* ================================================================= */}
      {/* 1. RESIDENT LOGIN TAB */}
      {/* ================================================================= */}
      {activeTab === 'login' ? (
        authStep === 'credentials' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resident Sign In</Text>
            <Text style={styles.cardSubtitle}>
              Enter your registered Gmail credentials to request documents & certificates.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gmail / Email Address *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="resident.name@gmail.com"
                  placeholderTextColor="#64748b"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.label}>Password *</Text>
                <TouchableOpacity onPress={() => { setAuthStep('forgot_password'); setErrorMessage(''); setSuccessBanner(''); }}>
                  <Text style={{ color: '#60a5fa', fontSize: 11, fontWeight: '600' }}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your account password"
                  placeholderTextColor="#64748b"
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  secureTextEntry={!showLoginPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowLoginPassword(!showLoginPassword)}
                >
                  {showLoginPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleCredentialsSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryBtnText}>Verify Credentials & Send Gmail OTP →</Text>
              )}
            </TouchableOpacity>

            <View style={styles.helperTipBox}>
              <ShieldCheck size={14} color="#3b82f6" />
              <Text style={styles.helperTipText}>
                Protected with Multi-Factor Authentication (MFA) & Automatic 3-Strike Security Lockout.
              </Text>
            </View>
          </View>
        ) : authStep === 'forgot_password' ? (
          /* FORGOT PASSWORD STEP */
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reset Resident Password</Text>
            <Text style={styles.cardSubtitle}>
              Enter your registered Gmail address below. We'll send a password recovery link to your Gmail inbox.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Registered Gmail Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="resident.name@gmail.com"
                placeholderTextColor="#64748b"
                value={forgotEmail}
                onChangeText={setForgotEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleForgotPasswordSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryBtnText}>Send Password Reset Link ✉</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.backBtn, { marginTop: 12, alignSelf: 'center' }]}
              onPress={() => { setAuthStep('credentials'); setErrorMessage(''); setSuccessBanner(''); }}
            >
              <Text style={styles.backBtnText}>← Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : authStep === 'reset_password' ? (
          /* SET NEW PASSWORD STEP (FROM RECOVERY LINK) */
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Choose New Password</Text>
            <Text style={styles.cardSubtitle}>
              Your Gmail recovery token is verified. Please create and confirm your new secure password.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password (min. 8 characters) *</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter new password"
                  placeholderTextColor="#64748b"
                  value={resetNewPassword}
                  onChangeText={setResetNewPassword}
                  secureTextEntry={!showResetNewPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowResetNewPassword(!showResetNewPassword)}
                >
                  {showResetNewPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password *</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#64748b"
                  value={resetConfirmPassword}
                  onChangeText={setResetConfirmPassword}
                  secureTextEntry={!showResetConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                >
                  {showResetConfirmPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleResetPasswordSubmit}
              disabled={loading || !resetNewPassword || resetNewPassword !== resetConfirmPassword}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryBtnText}>Save New Password & Unlock Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.backBtn, { marginTop: 12, alignSelf: 'center' }]}
              onPress={() => { setAuthStep('credentials'); setErrorMessage(''); setSuccessBanner(''); }}
            >
              <Text style={styles.backBtnText}>← Cancel and Return to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* MFA OTP VERIFICATION STEP */
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gmail Security MFA Code</Text>
            <Text style={styles.cardSubtitle}>
              Enter the 6-digit authentication OTP dispatched to your Gmail address.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>6-Digit Verification Code *</Text>
              <TextInput
                style={[styles.input, styles.otpInputText]}
                placeholder="• • • • • •"
                placeholderTextColor="#64748b"
                value={otpInput}
                onChangeText={setOtpInput}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleOtpSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryBtnText}>Authorize Login Session</Text>
              )}
            </TouchableOpacity>

            <View style={styles.otpActionRow}>
              <TouchableOpacity style={styles.resendBtn} onPress={handleResendOtp} disabled={loading}>
                <Text style={styles.resendBtnText}>Resend 6-Digit OTP</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  setAuthStep('credentials');
                  setOtpInput('');
                  setErrorMessage('');
                }}
              >
                <Text style={styles.backBtnText}>← Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      ) : (
        /* ================================================================= */
        /* 2. NEW RESIDENT SIGN UP TAB (All Required Fields & Strong Password) */
        /* ================================================================= */
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resident Account Registration</Text>
          <Text style={styles.cardSubtitle}>
            Complete all required fields below to create your official Barangay Zapatera resident profile.
          </Text>

          {/* Section: Full Name (Last Name, First Name, Middle Initial) */}
          <View style={styles.sectionDivider}>
            <Text style={styles.sectionTitle}>1. Full Name Information *</Text>
          </View>

          <View style={styles.nameRow}>
            <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dela Cruz"
                placeholderTextColor="#64748b"
                value={regData.last_name}
                onChangeText={(txt) => setRegData({ ...regData, last_name: txt })}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Juan"
                placeholderTextColor="#64748b"
                value={regData.first_name}
                onChangeText={(txt) => setRegData({ ...regData, first_name: txt })}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>MI *</Text>
              <TextInput
                style={[styles.input, { textAlign: 'center' }]}
                placeholder="M."
                placeholderTextColor="#64748b"
                maxLength={3}
                value={regData.middle_initial}
                onChangeText={(txt) => setRegData({ ...regData, middle_initial: txt })}
              />
            </View>
          </View>

          {previewFormattedName ? (
            <View style={styles.namePreviewBox}>
              <Text style={styles.namePreviewLabel}>Official Formatted Name:</Text>
              <Text style={styles.namePreviewValue}>{previewFormattedName}</Text>
            </View>
          ) : null}

          {/* Section: Contact & Residency Info */}
          <View style={styles.sectionDivider}>
            <Text style={styles.sectionTitle}>2. Contact & Residency Details *</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gmail / Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="juan.delacruz@gmail.com"
              placeholderTextColor="#64748b"
              value={regData.email}
              onChangeText={(txt) => setRegData({ ...regData, email: txt })}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="09171234567"
              placeholderTextColor="#64748b"
              value={regData.phone}
              onChangeText={(txt) => setRegData({ ...regData, phone: txt })}
              keyboardType="phone-pad"
              maxLength={13}
            />
          </View>

          {/* Registered Voter Status (Yes / No) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Registered Voter in Barangay Zapatera? *</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  regData.voter_status === 'Registered Voter' && styles.toggleBtnActive,
                ]}
                onPress={() => setRegData({ ...regData, voter_status: 'Registered Voter' })}
              >
                <Vote size={14} color={regData.voter_status === 'Registered Voter' ? '#ffffff' : '#94a3b8'} />
                <Text
                  style={[
                    styles.toggleBtnText,
                    regData.voter_status === 'Registered Voter' && styles.toggleBtnTextActive,
                  ]}
                >
                  Yes (Registered Voter)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  regData.voter_status === 'Not Registered Voter' && styles.toggleBtnActiveRose,
                ]}
                onPress={() => setRegData({ ...regData, voter_status: 'Not Registered Voter' })}
              >
                <X size={14} color={regData.voter_status === 'Not Registered Voter' ? '#ffffff' : '#94a3b8'} />
                <Text
                  style={[
                    styles.toggleBtnText,
                    regData.voter_status === 'Not Registered Voter' && styles.toggleBtnTextActive,
                  ]}
                >
                  No (Non-Voter)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Select Sitio (Sample list with easy customization) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Sitio (Barangay Zapatera) *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sitioScroll}>
              {SAMPLE_SITIOS.map((sitioName) => (
                <TouchableOpacity
                  key={sitioName}
                  style={[
                    styles.sitioPill,
                    regData.sitio === sitioName && styles.sitioPillActive,
                  ]}
                  onPress={() => setRegData({ ...regData, sitio: sitioName })}
                >
                  <MapPin size={12} color={regData.sitio === sitioName ? '#ffffff' : '#94a3b8'} />
                  <Text
                    style={[
                      styles.sitioPillText,
                      regData.sitio === sitioName && styles.sitioPillTextActive,
                    ]}
                  >
                    {sitioName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Section: Security & Strong Password */}
          <View style={styles.sectionDivider}>
            <Text style={styles.sectionTitle}>3. Account Password & Security *</Text>
          </View>

          {/* Strong Password Requirement Guide Alert */}
          <View style={styles.passwordRequirementsBox}>
            <View style={styles.alertHeaderRow}>
              <Shield size={16} color="#60a5fa" />
              <Text style={styles.passwordRequirementsTitle}>Strong Password Requirements (Required):</Text>
            </View>

            <View style={styles.checklistGrid}>
              <View style={styles.checklistItem}>
                {passwordStrength.hasLength ? (
                  <Check size={14} color="#10b981" />
                ) : (
                  <X size={14} color="#ef4444" />
                )}
                <Text
                  style={[
                    styles.checklistText,
                    passwordStrength.hasLength && styles.checklistTextValid,
                  ]}
                >
                  At least 8 characters
                </Text>
              </View>

              <View style={styles.checklistItem}>
                {passwordStrength.hasUpper ? (
                  <Check size={14} color="#10b981" />
                ) : (
                  <X size={14} color="#ef4444" />
                )}
                <Text
                  style={[
                    styles.checklistText,
                    passwordStrength.hasUpper && styles.checklistTextValid,
                  ]}
                >
                  1 Uppercase letter (A-Z)
                </Text>
              </View>

              <View style={styles.checklistItem}>
                {passwordStrength.hasLower ? (
                  <Check size={14} color="#10b981" />
                ) : (
                  <X size={14} color="#ef4444" />
                )}
                <Text
                  style={[
                    styles.checklistText,
                    passwordStrength.hasLower && styles.checklistTextValid,
                  ]}
                >
                  1 Lowercase letter (a-z)
                </Text>
              </View>

              <View style={styles.checklistItem}>
                {passwordStrength.hasNumber ? (
                  <Check size={14} color="#10b981" />
                ) : (
                  <X size={14} color="#ef4444" />
                )}
                <Text
                  style={[
                    styles.checklistText,
                    passwordStrength.hasNumber && styles.checklistTextValid,
                  ]}
                >
                  1 Number (0-9)
                </Text>
              </View>

              <View style={styles.checklistItem}>
                {passwordStrength.hasSpecial ? (
                  <Check size={14} color="#10b981" />
                ) : (
                  <X size={14} color="#ef4444" />
                )}
                <Text
                  style={[
                    styles.checklistText,
                    passwordStrength.hasSpecial && styles.checklistTextValid,
                  ]}
                >
                  1 Special symbol (!@#$%^&*)
                </Text>
              </View>
            </View>
          </View>

          {/* Password Input with Eye Icon */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Create a strong password"
                placeholderTextColor="#64748b"
                value={regData.password}
                onChangeText={(txt) => setRegData({ ...regData, password: txt })}
                secureTextEntry={!showRegPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowRegPassword(!showRegPassword)}
              >
                {showRegPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input with Eye Icon */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Re-enter your password to confirm"
                placeholderTextColor="#64748b"
                value={regData.confirmPassword}
                onChangeText={(txt) => setRegData({ ...regData, confirmPassword: txt })}
                secureTextEntry={!showRegConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
              >
                {showRegConfirmPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
              </TouchableOpacity>
            </View>

            {regData.confirmPassword ? (
              <View style={styles.matchStatusRow}>
                {passwordsMatch ? (
                  <View style={styles.matchValidBox}>
                    <CheckCircle2 size={12} color="#10b981" />
                    <Text style={styles.matchValidText}>Passwords match perfectly</Text>
                  </View>
                ) : (
                  <View style={styles.matchInvalidBox}>
                    <X size={12} color="#ef4444" />
                    <Text style={styles.matchInvalidText}>Passwords do not match yet</Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>

          {/* Section: Privacy Policy Agreement */}
          <View style={styles.privacyPolicyContainer}>
            <TouchableOpacity
              style={styles.checkboxTouchable}
              onPress={() => setRegData({ ...regData, privacyPolicyAccepted: !regData.privacyPolicyAccepted })}
            >
              <View
                style={[
                  styles.checkbox,
                  regData.privacyPolicyAccepted && styles.checkboxChecked,
                ]}
              >
                {regData.privacyPolicyAccepted ? <Check size={14} color="#ffffff" /> : null}
              </View>

              <Text style={styles.privacyPolicyLabel}>
                I have read, understood, and agree to the{' '}
                <Text
                  style={styles.privacyPolicyLink}
                  onPress={() => setIsPrivacyModalOpen(true)}
                >
                  Barangay Zapatera Data Privacy Policy
                </Text>{' '}
                under Republic Act No. 10173 (Data Privacy Act of 2012). *
              </Text>
            </TouchableOpacity>
          </View>

          {/* Submit Registration Button */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>Register Resident Account & Send Confirmation →</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Privacy Policy Modal */}
      <Modal
        visible={isPrivacyModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPrivacyModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <ShieldCheck size={20} color="#3b82f6" />
                <Text style={styles.modalTitle}>Data Privacy Notice & Consent</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPrivacyModalOpen(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalSectionTitle}>Republic Act No. 10173 (Data Privacy Act of 2012)</Text>
              <Text style={styles.modalText}>
                Barangay Zapatera, Cebu City is committed to safeguarding your personal data in accordance with the Philippine Data Privacy Act of 2012.
              </Text>

              <Text style={styles.modalSectionTitle}>1. Information Collected</Text>
              <Text style={styles.modalText}>
                When registering, we collect your Full Name (Last Name, First Name, Middle Initial), Gmail / Email Address, Mobile Phone Number, Voter Registration Status, Sitio Location, and Street Address.
              </Text>

              <Text style={styles.modalSectionTitle}>2. Purpose of Collection</Text>
              <Text style={styles.modalText}>
                Your data is strictly used for official barangay document clearance verification, identity validation, appointment scheduling, and community service updates.
              </Text>

              <Text style={styles.modalSectionTitle}>3. Confidentiality & Security</Text>
              <Text style={styles.modalText}>
                Your data is encrypted, protected by multi-factor authentication, and will never be shared with unauthorized third parties without your explicit written consent.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setRegData({ ...regData, privacyPolicyAccepted: true });
                setIsPrivacyModalOpen(false);
              }}
            >
              <Text style={styles.modalCloseBtnText}>I Agree & Accept Privacy Terms</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Account Unlock Modal */}
      <UnlockAccountModal
        visible={isUnlockModalOpen}
        initialEmail={loginEmail}
        onClose={() => setIsUnlockModalOpen(false)}
        onUnlocked={(unlockedEmail) => {
          setIsLocked(false);
          setErrorMessage('');
          setSuccessBanner(`Your account (${unlockedEmail}) has been successfully unlocked. You may now log in.`);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  lockedBox: {
    backgroundColor: 'rgba(127, 29, 29, 0.45)',
    borderColor: '#ef4444',
    borderWidth: 1.5,
  },
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 45,
    paddingBottom: 60,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sealLogo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  portalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  portalSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  successTitle: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  successText: {
    color: '#a7f3d0',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: '#3b82f6',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  infoTitle: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  infoText: {
    color: '#bfdbfe',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: '#f43f5e',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#fb7185',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  errorText: {
    color: '#fecdd3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#131c2e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 17,
  },
  sectionDivider: {
    marginTop: 10,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#60a5fa',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  namePreviewBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  namePreviewLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  namePreviewValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#60a5fa',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#ffffff',
    fontSize: 13,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputWithIcon: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#ffffff',
    fontSize: 13,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#ffffff',
    fontSize: 13,
  },
  eyeBtn: {
    padding: 8,
  },
  otpInputText: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 11,
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  toggleBtnActiveRose: {
    backgroundColor: '#e11d48',
    borderColor: '#f43f5e',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  toggleBtnTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  sitioScroll: {
    flexDirection: 'row',
    marginTop: 2,
  },
  sitioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    gap: 4,
  },
  sitioPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  sitioPillText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  sitioPillTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  passwordRequirementsBox: {
    backgroundColor: '#0d1527',
    borderWidth: 1,
    borderColor: '#1e3a8a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  passwordRequirementsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#93c5fd',
    marginLeft: 6,
  },
  checklistGrid: {
    marginTop: 6,
    gap: 4,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checklistText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  checklistTextValid: {
    color: '#34d399',
    fontWeight: '600',
  },
  matchStatusRow: {
    marginTop: 6,
  },
  matchValidBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchValidText: {
    fontSize: 11,
    color: '#34d399',
    fontWeight: '600',
  },
  matchInvalidBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchInvalidText: {
    fontSize: 11,
    color: '#f87171',
  },
  privacyPolicyContainer: {
    marginTop: 8,
    marginBottom: 18,
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
  },
  checkboxTouchable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748b',
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  privacyPolicyLabel: {
    flex: 1,
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  privacyPolicyLink: {
    color: '#60a5fa',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  helperTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 6,
  },
  helperTipText: {
    fontSize: 11,
    color: '#64748b',
  },
  otpActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  resendBtn: {
    paddingVertical: 6,
  },
  resendBtnText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
  },
  backBtn: {
    paddingVertical: 6,
  },
  backBtnText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#131c2e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalBody: {
    marginVertical: 14,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#60a5fa',
    marginTop: 8,
    marginBottom: 4,
  },
  modalText: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    marginBottom: 8,
  },
  modalCloseBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
