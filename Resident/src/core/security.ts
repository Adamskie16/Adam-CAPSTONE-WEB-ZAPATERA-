// Resident/src/core/security.ts
// Resident Security, Input Validation & Robust 3-Attempt Account Lockout Utilities

import { supabase, isSupabaseConfigured } from './supabase';
import { ResidentUser } from '../types';

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

export const checkRateLimit = async (identifier: string, maxAttempts: number = 10, windowMinutes: number = 15) => {
  const cleanId = String(identifier).toLowerCase().trim();
  const now = new Date();
  
  try {
    if (isSupabaseConfigured()) {
      const { data: limitData } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('identifier', cleanId)
        .maybeSingle();

      if (limitData) {
        const windowStart = new Date(limitData.window_start || limitData.last_attempt);
        const minutesDiff = (now.getTime() - windowStart.getTime()) / (1000 * 60);

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
      } else {
        await supabase
          .from('rate_limits')
          .insert([{ identifier: cleanId, attempts: 1, window_start: now.toISOString(), last_attempt: now.toISOString() }]);
        return { allowed: true, remaining: maxAttempts - 1 };
      }
    }
  } catch (err) {
    console.warn('Rate limit notice:', err);
  }

  return { allowed: true, remaining: maxAttempts - 1 };
};

export const isAccountLocked = async (email: string): Promise<boolean> => {
  const cleanEmail = String(email).toLowerCase().trim();

  try {
    if (isSupabaseConfigured()) {
      const { data: unlockReq } = await supabase
        .from('account_unlock_requests')
        .select('id, status, failed_attempts')
        .eq('email', cleanEmail)
        .eq('status', 'pending')
        .maybeSingle();

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_locked, failed_attempts, is_active')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (unlockReq || (profile && (profile.is_locked || (profile.failed_attempts || 0) >= 3 || profile.is_active === false))) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`zapatera_locked_${cleanEmail}`, 'true');
          localStorage.setItem(`zapatera_failed_${cleanEmail}`, '3');
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
  } catch (err) {
    console.warn('Check locked notice:', err);
  }

  if (typeof localStorage !== 'undefined') {
    if (localStorage.getItem(`zapatera_locked_${cleanEmail}`) === 'true') {
      return true;
    }
    const localAttempts = parseInt(localStorage.getItem(`zapatera_failed_${cleanEmail}`) || '0', 10);
    if (localAttempts >= 3) {
      return true;
    }
  }

  return false;
};

export const recordFailedAttempt = async (email: string, userRole: string = 'resident'): Promise<{ attempts: number; isLockedOut: boolean }> => {
  const cleanEmail = String(email).toLowerCase().trim();
  let dbAttempts = 0;
  let profile: any = null;
  let fullName = cleanEmail.split('@')[0];

  try {
    if (isSupabaseConfigured()) {
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profData) {
        profile = profData;
        dbAttempts = Number(profData.failed_attempts) || 0;
        fullName = profData.full_name || profData.name || fullName;
      }

      const { data: existingReq } = await supabase
        .from('account_unlock_requests')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingReq) {
        dbAttempts = Math.max(dbAttempts, Number(existingReq.failed_attempts) || 0);
      }
    }
  } catch (err) {
    console.warn('Supabase fetch failed attempts notice:', err);
  }

  let localAttempts = 0;
  try {
    if (typeof localStorage !== 'undefined') {
      localAttempts = parseInt(localStorage.getItem(`zapatera_failed_${cleanEmail}`) || '0', 10);
    }
  } catch (e) {}

  const currentAttempts = Math.max(dbAttempts, localAttempts) + 1;
  const isLockedOut = currentAttempts >= 3;

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
      const lockedAt = isLockedOut ? new Date().toISOString() : null;

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
            locked_at: lockedAt,
            created_at: lockedAt,
          }], { onConflict: 'email' });

        broadcastSecurityEvent('ACCOUNT_LOCKED', cleanEmail, { attempts: currentAttempts, lockedAt });
      }

      if (profile?.id) {
        await supabase
          .from('profiles')
          .update({
            failed_attempts: currentAttempts,
            is_locked: isLockedOut,
            is_active: !isLockedOut,
            locked_at: lockedAt,
            unlock_requested_at: isLockedOut ? lockedAt : null,
          })
          .eq('id', profile.id);
      } else {
        await supabase
          .from('profiles')
          .upsert([{
            email: cleanEmail,
            full_name: fullName,
            role: userRole,
            failed_attempts: currentAttempts,
            is_locked: isLockedOut,
            is_active: !isLockedOut,
            locked_at: lockedAt,
            unlock_requested_at: isLockedOut ? lockedAt : null,
          }], { onConflict: 'email' });
      }
    }
  } catch (err) {
    console.warn('Failed attempt database update notice:', err);
  }

  return { attempts: currentAttempts, isLockedOut };
};

export const resetFailedAttempts = async (email: string): Promise<void> => {
  const cleanEmail = String(email).toLowerCase().trim();
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
          unlock_requested_at: null,
        })
        .eq('email', cleanEmail);

      await supabase
        .from('account_unlock_requests')
        .delete()
        .eq('email', cleanEmail);

      broadcastSecurityEvent('ACCOUNT_UNLOCKED', cleanEmail);
    }
  } catch (err) {
    console.warn('Reset attempts notice:', err);
  }
};
