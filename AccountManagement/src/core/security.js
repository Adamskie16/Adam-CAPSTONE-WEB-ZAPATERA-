// Security Helpers & Input Validation Utilities

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

export function formatRoleName(role) {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Barangay Admin';
    case 'resident':
      return 'Resident Account';
    default:
      return role || 'User';
  }
}
