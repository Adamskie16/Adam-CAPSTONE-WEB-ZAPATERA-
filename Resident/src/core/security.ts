// Resident/src/core/security.ts
// Resident Security, Input Validation & Robust 3-Attempt Account Lockout Utilities

import { supabase, isSupabaseConfigured } from './supabase';

export const getSecurityChannel = () => {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      return new BroadcastChannel('zapatera_security_channel');
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const broadcastSecurityEvent = (type: string, email: string, data: any = {}) => {
  const channel = getSecurityChannel();
  if (channel) {
    channel.postMessage({ type, email: String(email).toLowerCase().trim(), data, timestamp: Date.now() });
  }
};

export const sanitizeInput = (str: string): string => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(String(email).toLowerCase().trim());
};

export const generateTrackingNumber = (prefix: string = 'BZ-2026'): string => {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomDigits}`;
};

export const formatCurrency = (amount: number | string): string => {
  const numericAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(numericAmount);
};

export const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Rate Limiting Check with 10-second cooldown interval
 */
export const checkRateLimit = async (identifier: string, maxAttempts: number = 5, windowSeconds: number = 10) => {
  const cleanId = String(identifier).toLowerCase().trim();
  const now = new Date();

  let localLastAttempt = 0;
  if (typeof localStorage !== 'undefined') {
    localLastAttempt = parseInt(localStorage.getItem(`zapatera_ratelimit_${cleanId}`) || '0', 10);
    const secondsPassed = Math.floor((now.getTime() - localLastAttempt) / 1000);
    if (localLastAttempt > 0 && secondsPassed < windowSeconds) {
      const waitRemaining = windowSeconds - secondsPassed;
      return {
        allowed: false,
        remaining: 0,
        message: `Too many authentication attempts. Please wait ${waitRemaining} second${waitRemaining > 1 ? 's' : ''} before trying again.`,
      };
    }
  }
  
  try {
    if (isSupabaseConfigured()) {
      const { data: limitData } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('identifier', cleanId)
        .maybeSingle();

      if (limitData) {
        const lastAttempt = new Date(limitData.last_attempt || limitData.window_start).getTime();
        const secondsDiff = Math.floor((now.getTime() - lastAttempt) / 1000);

        if (secondsDiff < windowSeconds && limitData.attempts >= maxAttempts) {
          const waitRemaining = windowSeconds - secondsDiff;
          return {
            allowed: false,
            remaining: 0,
            message: `Too many authentication attempts. Please wait ${waitRemaining} second${waitRemaining > 1 ? 's' : ''} before trying again.`,
          };
        } else if (secondsDiff >= windowSeconds) {
          await supabase
            .from('rate_limits')
            .update({ attempts: 1, window_start: now.toISOString(), last_attempt: now.toISOString() })
            .eq('id', limitData.id);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`zapatera_ratelimit_${cleanId}`, String(now.getTime()));
          }
          return { allowed: true, remaining: maxAttempts - 1 };
        } else {
          await supabase
            .from('rate_limits')
            .update({ attempts: limitData.attempts + 1, last_attempt: now.toISOString() })
            .eq('id', limitData.id);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`zapatera_ratelimit_${cleanId}`, String(now.getTime()));
          }
          return { allowed: true, remaining: maxAttempts - (limitData.attempts + 1) };
        }
      } else {
        await supabase
          .from('rate_limits')
          .insert([{ identifier: cleanId, attempts: 1, window_start: now.toISOString(), last_attempt: now.toISOString() }]);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`zapatera_ratelimit_${cleanId}`, String(now.getTime()));
        }
        return { allowed: true, remaining: maxAttempts - 1 };
      }
    }
  } catch (err) {}

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`zapatera_ratelimit_${cleanId}`, String(now.getTime()));
  }
  return { allowed: true, remaining: maxAttempts - 1 };
};

/**
 * Check whether a resident account is locked in Supabase profiles database.
 */
export const isAccountLocked = async (email: string): Promise<boolean> => {
  const cleanEmail = String(email).toLowerCase().trim();

  let localLocked = false;
  if (typeof localStorage !== 'undefined') {
    if (localStorage.getItem(`zapatera_locked_${cleanEmail}`) === 'true') {
      localLocked = true;
    }
    const localAttempts = parseInt(localStorage.getItem(`zapatera_failed_${cleanEmail}`) || '0', 10);
    if (localAttempts >= 3) {
      localLocked = true;
    }
  }

  try {
    if (isSupabaseConfigured()) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, is_locked, failed_attempts, is_active, locked_at')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profile) {
        const isDbLocked = profile.is_locked === true || (profile.failed_attempts || 0) >= 3 || profile.is_active === false;
        if (isDbLocked) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`zapatera_locked_${cleanEmail}`, 'true');
            localStorage.setItem(`zapatera_failed_${cleanEmail}`, String(Math.max(3, profile.failed_attempts || 3)));
          }
          return true;
        } else {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(`zapatera_locked_${cleanEmail}`);
            localStorage.removeItem(`zapatera_failed_${cleanEmail}`);
          }
          return false;
        }
      }
    }
  } catch (err) {}

  return localLocked;
};

/**
 * Record consecutive failed password attempt directly on profiles table.
 * - Attempt 1: failed_attempts = 1, is_locked = false
 * - Attempt 2: failed_attempts = 2, is_locked = false
 * - Attempt 3: failed_attempts = 3, is_locked = true, locked_at = NOW()
 */
export const recordFailedAttempt = async (
  email: string,
  userRole: string = 'resident'
): Promise<{ attempts: number; isLockedOut: boolean; remaining: number }> => {
  const cleanEmail = String(email).toLowerCase().trim();
  let dbAttempts = 0;
  let profile: any = null;
  let fullName = cleanEmail.split('@')[0];

  try {
    if (isSupabaseConfigured()) {
      const { data: profData } = await supabase
        .from('profiles')
        .select('id, email, failed_attempts, is_locked, full_name, role')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profData) {
        profile = profData;
        dbAttempts = Number(profData.failed_attempts) || 0;
        fullName = profData.full_name || profData.name || fullName;
      }
    }
  } catch (err) {}

  let localAttempts = 0;
  try {
    if (typeof localStorage !== 'undefined') {
      localAttempts = parseInt(localStorage.getItem(`zapatera_failed_${cleanEmail}`) || '0', 10);
    }
  } catch (e) {}

  const currentAttempts = Math.max(dbAttempts, localAttempts) + 1;
  const isLockedOut = currentAttempts >= 3;
  const remainingAttempts = Math.max(0, 3 - currentAttempts);
  const nowTs = new Date().toISOString();

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`zapatera_failed_${cleanEmail}`, String(currentAttempts));
      if (isLockedOut) {
        localStorage.setItem(`zapatera_locked_${cleanEmail}`, 'true');
      }
    }
  } catch (e) {}

  try {
    if (isSupabaseConfigured()) {
      if (profile?.id) {
        await supabase
          .from('profiles')
          .update({
            failed_attempts: currentAttempts,
            is_locked: isLockedOut,
            is_active: !isLockedOut,
            locked_at: isLockedOut ? nowTs : null,
            updated_at: nowTs,
          })
          .eq('id', profile.id);
      } else {
        await supabase
          .from('profiles')
          .update({
            failed_attempts: currentAttempts,
            is_locked: isLockedOut,
            is_active: !isLockedOut,
            locked_at: isLockedOut ? nowTs : null,
            updated_at: nowTs,
          })
          .eq('email', cleanEmail);
      }

      if (isLockedOut) {
        await supabase
          .from('account_unlock_requests')
          .upsert([{
            user_id: profile?.id || null,
            email: cleanEmail,
            full_name: fullName,
            role: profile?.role || userRole,
            status: 'pending',
            failed_attempts: currentAttempts,
            locked_at: nowTs,
            created_at: nowTs,
          }], { onConflict: 'email' });

        broadcastSecurityEvent('ACCOUNT_LOCKED', cleanEmail, { attempts: currentAttempts, lockedAt: nowTs });
      }
    }
  } catch (err) {}

  return { attempts: currentAttempts, isLockedOut, remaining: remainingAttempts };
};

/**
 * Reset failed attempts immediately upon successful authentication or verified unlock.
 */
export const resetFailedAttempts = async (email: string): Promise<void> => {
  const cleanEmail = String(email).toLowerCase().trim();
  const nowTs = new Date().toISOString();

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`zapatera_failed_${cleanEmail}`);
      localStorage.removeItem(`zapatera_locked_${cleanEmail}`);
    }
  } catch (e) {}

  try {
    if (isSupabaseConfigured()) {
      await supabase
        .from('profiles')
        .update({
          failed_attempts: 0,
          is_locked: false,
          is_active: true,
          locked_at: null,
          updated_at: nowTs,
        })
        .eq('email', cleanEmail);

      await supabase
        .from('account_unlock_requests')
        .delete()
        .eq('email', cleanEmail);

      broadcastSecurityEvent('ACCOUNT_UNLOCKED', cleanEmail);
    }
  } catch (err) {}
};

/**
 * Unlock a user account manually or programmatically.
 */
export const unlockUserAccount = async (targetEmail: string): Promise<boolean> => {
  const cleanEmail = String(targetEmail).toLowerCase().trim();
  const nowTs = new Date().toISOString();

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`zapatera_failed_${cleanEmail}`);
      localStorage.removeItem(`zapatera_locked_${cleanEmail}`);
    }
  } catch (e) {}

  try {
    if (isSupabaseConfigured()) {
      await supabase
        .from('account_unlock_requests')
        .delete()
        .eq('email', cleanEmail);

      await supabase
        .from('profiles')
        .update({
          is_locked: false,
          is_active: true,
          failed_attempts: 0,
          locked_at: null,
          updated_at: nowTs,
        })
        .eq('email', cleanEmail);

      broadcastSecurityEvent('ACCOUNT_UNLOCKED', cleanEmail);
      return true;
    }
  } catch (err) {}
  return true;
};
