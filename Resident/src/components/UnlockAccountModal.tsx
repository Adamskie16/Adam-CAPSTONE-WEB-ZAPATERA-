// Resident/src/components/UnlockAccountModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  Unlock,
  Mail,
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { validateEmail, resetFailedAttempts } from '../core/security';
import { supabase, isSupabaseConfigured } from '../core/supabase';

interface UnlockAccountModalProps {
  visible: boolean;
  initialEmail?: string;
  onClose: () => void;
  onUnlocked: (unlockedEmail: string) => void;
}

export default function UnlockAccountModal({
  visible,
  initialEmail = '',
  onClose,
  onUnlocked,
}: UnlockAccountModalProps) {
  // Step 1: Request Code (Email)
  // Step 2: Verify Code (OTP + Countdown)
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState<string>(initialEmail);
  const [otpCode, setOtpCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(600); // 10 minutes
  const [timerActive, setTimerActive] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setEmail(initialEmail || '');
      setStep(1);
      setOtpCode('');
      setErrorMessage('');
      setSuccessMessage('');
      setCountdown(600);
      setTimerActive(false);
    }
  }, [visible, initialEmail]);

  useEffect(() => {
    let interval: any = null;
    if (timerActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, countdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  /**
   * STEP 1: Send Unlock Code to Gmail (with privacy-preserving generic message)
   */
  const handleSendUnlockCode = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { shouldCreateUser: false },
        });
      }
    } catch (e) {
      // Handled silently to prevent account enumeration
    }

    setLoading(false);
    setCountdown(600);
    setTimerActive(true);
    setStep(2);
    setSuccessMessage('If an account exists for this email, an unlock code has been sent.');
  };

  /**
   * STEP 2: Verify Code & Unlock Account in Database
   */
  const handleVerifyCode = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    if (countdown <= 0) {
      setErrorMessage('Your verification code has expired. Please request a new code.');
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    let isCodeValid = false;

    try {
      if (isSupabaseConfigured()) {
        const { data, error: otpErr } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: otpCode.trim(),
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
      setErrorMessage('Invalid verification code. Please try again.');
      setLoading(false);
      return;
    }

    // Reset account lockout status in Supabase database
    await resetFailedAttempts(cleanEmail);

    setTimerActive(false);
    setLoading(false);
    setSuccessMessage('Your account has been successfully unlocked. You may now log in.');
  };

  const handleResendCode = async () => {
    setErrorMessage('');
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { shouldCreateUser: false },
        });
      }
      setCountdown(600);
      setTimerActive(true);
      setSuccessMessage('A new unlock code has been dispatched to your Gmail.');
    } catch (e) {
      setErrorMessage('Failed to resend unlock code. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <View style={styles.iconCircle}>
                <Unlock size={20} color="#2563eb" />
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {step === 1 ? 'Unlock Your Account' : 'Enter Verification Code'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {step === 1
                    ? 'Enter your registered email address to receive an account unlock code.'
                    : 'We sent a verification code to your registered email address.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Status Alerts */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <ShieldAlert size={16} color="#dc2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBanner}>
              <CheckCircle2 size={16} color="#16a34a" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* ================= STEP 1: EMAIL ================= */}
          {step === 1 && (
            <View style={styles.body}>
              <Text style={styles.label}>Registered Email Address</Text>
              <View style={styles.inputContainer}>
                <Mail size={16} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="resident@gmail.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.disabledButton]}
                  onPress={handleSendUnlockCode}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Send Unlock Code</Text>
                      <ArrowRight size={16} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ================= STEP 2: VERIFY CODE ================= */}
          {step === 2 && (
            <View style={styles.body}>
              {/* Countdown Timer Display */}
              <View style={styles.timerRow}>
                <View style={styles.timerLeft}>
                  <Clock size={14} color="#64748b" />
                  <Text style={styles.timerLabel}>Code expires in:</Text>
                </View>
                <Text style={[styles.timerValue, countdown < 60 && styles.timerValueExpiring]}>
                  {formatCountdown(countdown)}
                </Text>
              </View>

              {successMessage.includes('successfully unlocked') ? (
                <TouchableOpacity
                  style={styles.successDoneButton}
                  onPress={() => {
                    onUnlocked(email.trim().toLowerCase());
                    onClose();
                  }}
                >
                  <CheckCircle2 size={16} color="#ffffff" />
                  <Text style={styles.primaryButtonText}>Back to Login</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <Text style={[styles.label, { textAlign: 'center', marginTop: 4 }]}>
                    6-Digit Verification Code
                  </Text>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="123456"
                    placeholderTextColor="#94a3b8"
                    value={otpCode}
                    onChangeText={(val) => setOtpCode(val.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!loading}
                  />

                  <View style={styles.step2Buttons}>
                    <TouchableOpacity
                      style={[
                        styles.primaryButton,
                        (loading || otpCode.length !== 6 || countdown <= 0) && styles.disabledButton,
                      ]}
                      onPress={handleVerifyCode}
                      disabled={loading || otpCode.length !== 6 || countdown <= 0}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Unlock size={16} color="#ffffff" />
                          <Text style={styles.primaryButtonText}>Verify & Unlock</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={handleResendCode}
                      disabled={loading}
                    >
                      <RefreshCw size={14} color="#2563eb" />
                      <Text style={styles.resendButtonText}>Resend Code</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                      setStep(1);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                  >
                    <ArrowLeft size={14} color="#64748b" />
                    <Text style={styles.backButtonText}>Back to Email Input</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 440,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '600',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '600',
    flex: 1,
  },
  body: {
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  otpInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    color: '#0f172a',
    marginBottom: 16,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  timerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  timerValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  timerValueExpiring: {
    color: '#dc2626',
  },
  actionRow: {
    gap: 8,
  },
  step2Buttons: {
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  resendButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resendButtonText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  successDoneButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
