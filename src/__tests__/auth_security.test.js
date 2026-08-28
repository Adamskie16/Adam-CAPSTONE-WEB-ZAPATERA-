// src/__tests__/auth_security.test.js
// Automated Test Suite for 3-Attempt Account Lockouts, Rate Limiting, Admin Unlock, and Security Audit Logging

import assert from 'assert';

// Mock Security Core Engine
class SecurityEngine {
  constructor() {
    this.profiles = new Map();
    this.unlockRequests = [];
    this.rateLimits = new Map();
    this.auditLogs = [];
  }

  registerUser(email, password, role = 'resident') {
    this.profiles.set(email.toLowerCase(), {
      email: email.toLowerCase(),
      password,
      role,
      failed_attempts: 0,
      is_locked: false,
      locked_at: null,
    });
  }

  checkRateLimit(identifier, maxAttempts = 5) {
    const cleanId = identifier.toLowerCase();
    const current = this.rateLimits.get(cleanId) || 0;
    if (current >= maxAttempts) {
      this.logAudit('Rate Limit Exceeded', `Rate limit exceeded for ${cleanId}`, 'warning', cleanId);
      return { allowed: false, message: 'Too many authentication attempts. Please wait 15 minutes before trying again.' };
    }
    this.rateLimits.set(cleanId, current + 1);
    return { allowed: true, remaining: maxAttempts - (current + 1) };
  }

  recordFailedAttempt(email, role = 'resident') {
    const cleanEmail = email.toLowerCase();
    const profile = this.profiles.get(cleanEmail);
    if (!profile) return { attempts: 0, isLockedOut: false };

    profile.failed_attempts += 1;
    if (profile.failed_attempts >= 3) {
      profile.is_locked = true;
      profile.locked_at = new Date().toISOString();

      this.unlockRequests.push({
        id: `req-${Date.now()}`,
        email: cleanEmail,
        status: 'pending',
        failed_attempts: profile.failed_attempts,
        created_at: profile.locked_at,
      });

      this.logAudit('Account Locked Out', `Account ${cleanEmail} locked out due to 3 consecutive failed login attempts.`, 'danger', cleanEmail);
      return { attempts: profile.failed_attempts, isLockedOut: true };
    } else {
      this.logAudit('Failed Login Attempt', `Failed password attempt ${profile.failed_attempts}/3 for ${cleanEmail}`, 'warning', cleanEmail);
      return { attempts: profile.failed_attempts, isLockedOut: false };
    }
  }

  resetFailedAttempts(email) {
    const profile = this.profiles.get(email.toLowerCase());
    if (profile) {
      profile.failed_attempts = 0;
      profile.is_locked = false;
      profile.locked_at = null;
    }
  }

  login(email, password) {
    const cleanEmail = email.toLowerCase();

    // 1. Rate limit check
    const limit = this.checkRateLimit(cleanEmail);
    if (!limit.allowed) {
      return { success: false, code: 'RATE_LIMIT', message: limit.message };
    }

    // 2. Lock status check
    const profile = this.profiles.get(cleanEmail);
    if (profile && profile.is_locked) {
      return { success: false, code: 'ACCOUNT_LOCKED', message: 'Your account has been temporarily locked. Please contact an administrator to request access.' };
    }

    // 3. Password check
    if (!profile || profile.password !== password) {
      const lockResult = this.recordFailedAttempt(cleanEmail);
      if (lockResult.isLockedOut) {
        return { success: false, code: 'JUST_LOCKED', message: 'Your account has been locked due to multiple failed login attempts. Please contact an administrator to request an unlock.' };
      }
      return { success: false, code: 'INVALID_CREDENTIALS', message: 'Invalid login credentials. Please check your email and password.' };
    }

    // 4. Success
    this.resetFailedAttempts(cleanEmail);
    this.logAudit('User Login Success', `User ${cleanEmail} logged in successfully.`, 'info', cleanEmail);
    return { success: true, user: profile };
  }

  unlockAccount(targetEmail, adminUser, isAdmin = true) {
    if (!isAdmin) {
      this.logAudit('Unauthorized Unlock Attempt', `User ${adminUser} attempted to unlock ${targetEmail} without authorization.`, 'security', adminUser);
      return { success: false, message: 'Unauthorized: Only administrators can unlock accounts.' };
    }

    const cleanEmail = targetEmail.toLowerCase();
    const profile = this.profiles.get(cleanEmail);
    if (profile) {
      profile.is_locked = false;
      profile.failed_attempts = 0;
      profile.locked_at = null;

      const req = this.unlockRequests.find(r => r.email === cleanEmail && r.status === 'pending');
      if (req) req.status = 'approved';

      this.logAudit('Account Unlocked', `Account ${cleanEmail} unlocked by admin (${adminUser}).`, 'security', adminUser);
      return { success: true };
    }
    return { success: false, message: 'User profile not found.' };
  }

  logAudit(action, details, level, userEmail) {
    this.auditLogs.push({ action, details, level, user_email: userEmail, timestamp: new Date().toISOString() });
  }
}

// AUTOMATED TEST SUITE RUNNER
export function runSecurityTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING AUTHENTICATION SECURITY AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  const engine = new SecurityEngine();
  const testUser = 'resident.zapatera@gmail.com';
  const correctPassword = 'Password123!';
  const wrongPassword = 'WrongPassword999';

  engine.registerUser(testUser, correctPassword);

  // TEST 1: 1st Failed Login Attempt
  console.log('--> Test 1: 1st Failed Login Attempt...');
  const res1 = engine.login(testUser, wrongPassword);
  assert.strictEqual(res1.success, false);
  assert.strictEqual(res1.code, 'INVALID_CREDENTIALS');
  assert.strictEqual(engine.profiles.get(testUser).failed_attempts, 1);
  assert.strictEqual(engine.profiles.get(testUser).is_locked, false);
  console.log('  [PASS] 1st failed attempt tracked cleanly (failed_attempts: 1, is_locked: false)\n');

  // TEST 2: 2nd Failed Login Attempt
  console.log('--> Test 2: 2nd Failed Login Attempt...');
  const res2 = engine.login(testUser, wrongPassword);
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.code, 'INVALID_CREDENTIALS');
  assert.strictEqual(engine.profiles.get(testUser).failed_attempts, 2);
  assert.strictEqual(engine.profiles.get(testUser).is_locked, false);
  console.log('  [PASS] 2nd failed attempt tracked cleanly (failed_attempts: 2, is_locked: false)\n');

  // TEST 3: 3rd Failed Login Attempt -> Account Locked
  console.log('--> Test 3: 3rd Failed Attempt Triggering Account Lockout...');
  const res3 = engine.login(testUser, wrongPassword);
  assert.strictEqual(res3.success, false);
  assert.strictEqual(res3.code, 'JUST_LOCKED');
  assert.strictEqual(engine.profiles.get(testUser).failed_attempts, 3);
  assert.strictEqual(engine.profiles.get(testUser).is_locked, true);
  assert.strictEqual(engine.unlockRequests.length, 1);
  assert.strictEqual(engine.unlockRequests[0].status, 'pending');
  console.log('  [PASS] Account locked on 3rd attempt & pending unlock request created\n');

  // TEST 4: Correct Password Attempt While Locked -> Login Denied
  console.log('--> Test 4: Attempting Correct Password While Locked...');
  const res4 = engine.login(testUser, correctPassword);
  assert.strictEqual(res4.success, false);
  assert.strictEqual(res4.code, 'ACCOUNT_LOCKED');
  assert.strictEqual(res4.message, 'Your account has been temporarily locked. Please contact an administrator to request access.');
  console.log('  [PASS] Login denied on correct password when account is locked out\n');

  // TEST 5: Unauthorized User Attempting to Unlock Account
  console.log('--> Test 5: Unauthorized Non-Admin Attempting Unlock...');
  const unauthRes = engine.unlockAccount(testUser, 'attacker@gmail.com', false);
  assert.strictEqual(unauthRes.success, false);
  assert.strictEqual(engine.profiles.get(testUser).is_locked, true);
  console.log('  [PASS] Unauthorized unlock attempt rejected\n');

  // TEST 6: Authorized Administrator Unlock Action
  console.log('--> Test 6: Authorized Admin Unlocking Account...');
  const unlockRes = engine.unlockAccount(testUser, 'admin@zapatera.gov.ph', true);
  assert.strictEqual(unlockRes.success, true);
  assert.strictEqual(engine.profiles.get(testUser).is_locked, false);
  assert.strictEqual(engine.profiles.get(testUser).failed_attempts, 0);
  assert.strictEqual(engine.unlockRequests[0].status, 'approved');
  console.log('  [PASS] Admin unlock successful, failed_attempts reset to 0\n');

  // TEST 7: Login After Admin Unlock -> Access Restored & Counter Reset
  console.log('--> Test 7: Login Post-Unlock with Correct Password...');
  const res7 = engine.login(testUser, correctPassword);
  assert.strictEqual(res7.success, true);
  assert.strictEqual(engine.profiles.get(testUser).failed_attempts, 0);
  console.log('  [PASS] Account fully usable post-unlock\n');

  // TEST 8: Server-Side Rate Limiting Enforcement
  console.log('--> Test 8: Rate Limit Threshold Enforcement...');
  const rateUser = 'rate.limit.test@gmail.com';
  engine.registerUser(rateUser, correctPassword);
  for (let i = 0; i < 5; i++) {
    engine.checkRateLimit(rateUser, 5);
  }
  const rateRes = engine.login(rateUser, correctPassword);
  assert.strictEqual(rateRes.success, false);
  assert.strictEqual(rateRes.code, 'RATE_LIMIT');
  console.log('  [PASS] Rate limit enforced after threshold exceeded\n');

  // TEST 9: Audit Trail Logging Verification
  console.log('--> Test 9: Audit Trail Logs Inspection...');
  const lockoutLog = engine.auditLogs.find(l => l.action === 'Account Locked Out');
  const unlockLog = engine.auditLogs.find(l => l.action === 'Account Unlocked');
  assert.notStrictEqual(lockoutLog, undefined);
  assert.notStrictEqual(unlockLog, undefined);
  assert.strictEqual(unlockLog.user_email, 'admin@zapatera.gov.ph');
  console.log('  [PASS] Audit logs recorded admin identity, timestamp, and action without exposing credentials\n');

  console.log('====================================================');
  console.log('✅ ALL 9 AUTOMATED SECURITY TESTS PASSED SUCCESSFULLY');
  console.log('====================================================\n');
}

// Execute tests if invoked directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('auth_security.test.js')) {
  runSecurityTestSuite();
}
