// AccountManagement/src/core/security.js
// Input Validation, Security Sanitization, Rate Limiting & Account Lockout Core Utilities

import { supabase, isSupabaseConfigured } from './supabase';

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
  } catch (err) {
    console.warn('Activity log notice:', err);
  }
};

export const checkRateLimit = async (identifier, maxAttempts = 5, windowMinutes = 15) => {
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
        const minutesDiff = (now - windowStart) / (1000 * 60);

        if (minutesDiff > windowMinutes) {
          await supabase
            .from('rate_limits')
            .update({ attempts: 1, window_start: now.toISOString(), last_attempt: now.toISOString() })
            .eq('id', limitData.id);
          return { allowed: true, remaining: maxAttempts - 1 };
        } else if (limitData.attempts >= maxAttempts) {
          await logActivityEvent('Rate Limit Exceeded', `Too many login attempts for ${cleanId}`, 'warning', cleanId, 'Security Rate Limit');
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

export const recordFailedAttempt = async (email, userRole = 'resident') => {
  const cleanEmail = String(email).toLowerCase().trim();
  let currentAttempts = 0;
  let isLockedOut = false;

  try {
    if (isSupabaseConfigured()) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profile) {
        currentAttempts = (profile.failed_attempts || 0) + 1;

        if (currentAttempts >= 3) {
          isLockedOut = true;
          const lockedAt = new Date().toISOString();

          await supabase
            .from('profiles')
            .update({
              is_locked: true,
              failed_attempts: currentAttempts,
              locked_at: lockedAt,
              unlock_requested_at: lockedAt,
            })
            .eq('id', profile.id);

          await supabase
            .from('account_unlock_requests')
            .insert([{
              user_id: profile.id,
              email: cleanEmail,
              full_name: profile.full_name || profile.name || cleanEmail.split('@')[0],
              role: profile.role || userRole,
              status: 'pending',
              failed_attempts: currentAttempts,
              locked_at: lockedAt,
              created_at: lockedAt,
            }]);

          await logActivityEvent(
            'Account Locked Out',
            `Account ${cleanEmail} locked out due to 3 consecutive failed login attempts. Pending unlock request created.`,
            'danger',
            cleanEmail,
            'Account Security'
          );
        } else {
          await supabase
            .from('profiles')
            .update({ failed_attempts: currentAttempts })
            .eq('id', profile.id);

          await logActivityEvent(
            'Failed Login Attempt',
            `Failed password attempt ${currentAttempts}/3 for account ${cleanEmail}`,
            'warning',
            cleanEmail,
            'Authentication'
          );
        }
      }
    }
  } catch (err) {
    console.warn('Failed attempt tracking notice:', err);
  }

  return { attempts: currentAttempts, isLockedOut };
};

export const resetFailedAttempts = async (email) => {
  const cleanEmail = String(email).toLowerCase().trim();
  try {
    if (isSupabaseConfigured()) {
      await supabase
        .from('profiles')
        .update({ failed_attempts: 0, is_locked: false, locked_at: null })
        .eq('email', cleanEmail);
    }
  } catch (err) {
    console.warn('Reset attempts notice:', err);
  }
};

export const unlockUserAccount = async (targetEmail, adminUserEmail = 'admin@zapatera.gov.ph') => {
  const cleanEmail = String(targetEmail).toLowerCase().trim();
  try {
    if (isSupabaseConfigured()) {
      await supabase
        .from('profiles')
        .update({
          is_locked: false,
          failed_attempts: 0,
          locked_at: null,
          unlock_requested_at: null,
        })
        .eq('email', cleanEmail);

      await supabase
        .from('account_unlock_requests')
        .update({
          status: 'approved',
          resolved_at: new Date().toISOString(),
          resolved_by: adminUserEmail,
        })
        .eq('email', cleanEmail)
        .eq('status', 'pending');

      await logActivityEvent(
        'Account Unlocked',
        `Account ${cleanEmail} successfully unlocked by administrator (${adminUserEmail}). Failed attempts reset to 0.`,
        'security',
        adminUserEmail,
        'Account Security'
      );
      return true;
    }
  } catch (err) {
    console.warn('Unlock user notice:', err);
  }
  return false;
};

export const lockUserAccount = async (targetEmail, adminUserEmail = 'admin@zapatera.gov.ph', reason = 'Manual Admin Lockout') => {
  const cleanEmail = String(targetEmail).toLowerCase().trim();
  try {
    if (isSupabaseConfigured()) {
      const lockedAt = new Date().toISOString();

      await supabase
        .from('profiles')
        .update({
          is_locked: true,
          failed_attempts: 3,
          locked_at: lockedAt,
        })
        .eq('email', cleanEmail);

      await logActivityEvent(
        'Account Locked Manually',
        `Account ${cleanEmail} locked manually by admin ${adminUserEmail}. Reason: ${reason}`,
        'danger',
        adminUserEmail,
        'Account Security'
      );
      return true;
    }
  } catch (err) {
    console.warn('Lock user notice:', err);
  }
  return false;
};
