// AccountManagement/src/core/security.js
// Input Validation, Security Sanitization, Rate Limiting & Robust 3-Attempt Account Lockout Core Utilities

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

export const broadcastSecurityEvent = (type, email, data = {}) => {
  const channel = getSecurityChannel();
  if (channel) {
    channel.postMessage({ type, email: String(email).toLowerCase().trim(), data, timestamp: Date.now() });
  }
};

export const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(String(email).toLowerCase().trim());
};

export const generateTrackingNumber = (prefix = 'BZ-2026') => {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomDigits}`;
};

export const formatCurrency = (amount) => {
  const numericAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(numericAmount);
};

export const formatDate = (dateStr) => {
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

export const logActivityEvent = async (action, details, level = 'info', userEmail = 'system', feature = 'Authentication') => {
  try {
    if (isSupabaseConfigured()) {
      await supabase.from('activity_logs').insert([{
        action,
        details,
        level,
        user_email: userEmail,
        feature,
        created_at: new Date().toISOString(),
      }]);
    }
  } catch (err) {}
};

export const checkRateLimit = async (identifier, maxAttempts = 10, windowMinutes = 15) => {
  const cleanId = String(identifier).toLowerCase().trim();
  const now = new Date();
  
  try {
    if (isSupabaseConfigured()) {
      const { data: limitData, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('identifier', cleanId)
        .maybeSingle();

      if (!error && limitData) {
        const windowStart = new Date(limitData.window_start || limitData.last_attempt);
        const minutesDiff = (now - windowStart) / (1000 * 60);

        if (minutesDiff > windowMinutes) {
          await supabase
            .from('rate_limits')
            .update({ attempts: 1, window_start: now.toISOString(), last_attempt: now.toISOString() })
            .eq('id', limitData.id);
          return { allowed: true, remaining: maxAttempts - 1 };
        } else if (limitData.attempts >= maxAttempts) {
          return { allowed: false, remaining: 0, message: 'Too many authentication attempts. Please wait 15 minutes before trying again.' };
        } else {
          await supabase
            .from('rate_limits')
            .update({ attempts: limitData.attempts + 1, last_attempt: now.toISOString() })
            .eq('id', limitData.id);
          return { allowed: true, remaining: maxAttempts - (limitData.attempts + 1) };
        }
      } else if (!error) {
        await supabase
          .from('rate_limits')
          .insert([{ identifier: cleanId, attempts: 1, window_start: now.toISOString(), last_attempt: now.toISOString() }]);
        return { allowed: true, remaining: maxAttempts - 1 };
      }
    }
  } catch (err) {}

  return { allowed: true, remaining: maxAttempts - 1 };
};

/**
 * Check whether an account is locked in Supabase profiles database.
 */
export const isAccountLocked = async (email) => {
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
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('id, email, is_locked, failed_attempts, is_active, locked_at')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!profErr && profile) {
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
 * Record a consecutive failed password attempt directly on profiles table.
 */
export const recordFailedAttempt = async (email, userRole = 'super_admin') => {
  const cleanEmail = String(email).toLowerCase().trim();
  let dbAttempts = 0;
  let profile = null;

  try {
    if (isSupabaseConfigured()) {
      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('id, email, failed_attempts, is_locked, full_name, role')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!profErr && profData) {
        profile = profData;
        dbAttempts = Number(profData.failed_attempts) || 0;
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
            full_name: profile?.full_name || cleanEmail.split('@')[0],
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
export const resetFailedAttempts = async (email) => {
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
export const unlockUserAccount = async (targetEmail, adminUserEmail = 'admin@zapatera.gov.ph') => {
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

/**
 * Lock a user account manually or programmatically.
 */
export const lockUserAccount = async (targetEmail, adminUserEmail = 'admin@zapatera.gov.ph', reason = 'Manual Admin Lockout') => {
  const cleanEmail = String(targetEmail).toLowerCase().trim();
  const nowTs = new Date().toISOString();

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`zapatera_failed_${cleanEmail}`, '3');
      localStorage.setItem(`zapatera_locked_${cleanEmail}`, 'true');
    }
  } catch (e) {}

  try {
    if (isSupabaseConfigured()) {
      await supabase
        .from('profiles')
        .update({
          is_locked: true,
          is_active: false,
          failed_attempts: 3,
          locked_at: nowTs,
          updated_at: nowTs,
        })
        .eq('email', cleanEmail);

      await supabase
        .from('account_unlock_requests')
        .upsert([{
          email: cleanEmail,
          full_name: cleanEmail.split('@')[0],
          role: 'super_admin',
          status: 'pending',
          failed_attempts: 3,
          locked_at: nowTs,
          created_at: nowTs,
        }], { onConflict: 'email' });

      broadcastSecurityEvent('ACCOUNT_LOCKED', cleanEmail, { attempts: 3, lockedAt: nowTs });
      return true;
    }
  } catch (err) {}
  return true;
};
