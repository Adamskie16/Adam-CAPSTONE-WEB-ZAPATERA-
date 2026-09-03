// SuperAdmin/src/features/documents/documentTemplates.js

export const documentTemplates = {
  barangayCertification: {
    id: 'barangayCertification',
    code: 'BC-01',
    title: 'BARANGAY CERTIFICATION',
    defaultBody:
      'This is to certify that the above named person is a resident of the barangay and known to be of good moral standing.',
    defaultPurpose: 'Local Employment Application',
    suggestedPurposes: [
      'Local Employment Application',
      'Overseas Employment (POEA/DMW)',
      'Bank Account Opening',
      'Postal ID Application',
      'NBI / Police Clearance Requirement',
      'School Admission / Scholarship',
      'Loan / Financial Assistance',
      'Legal & Identification Purposes',
    ],
  },
  barangayClearance: {
    id: 'barangayClearance',
    code: 'BC-02',
    title: 'BARANGAY CLEARANCE',
    defaultBody:
      'This is to certify that the above named person is a law-abiding citizen with good moral standing, and has NO DEROGATORY RECORD on file in this barangay.',
    defaultPurpose: 'Employment Requirement',
    suggestedPurposes: [
      'Employment Requirement',
      'Business Permit Application',
      'TIN / SSS / PhilHealth Registration',
      'Driver\'s License Application',
      'Firearms License Application',
      'Bank Requirement',
    ],
  },
  certificateOfResidency: {
    id: 'certificateOfResidency',
    code: 'BC-03',
    title: 'CERTIFICATE OF RESIDENCY',
    defaultBody:
      'This is to certify that the above named person is a bona fide resident of Barangay Zapatera, Cebu City, residing at the address indicated above.',
    defaultPurpose: 'Proof of Residency',
    suggestedPurposes: [
      'Proof of Residency',
      'Voter Registration (COMELEC)',
      'Government Cash Assistance (4Ps / AICS)',
      'Senior Citizen ID Application',
      'PWD ID Application',
      'Electric / Water Utility Connection',
      'Travel Clearance',
    ],
  },
  certificateOfGoodMoralCharacter: {
    id: 'certificateOfGoodMoralCharacter',
    code: 'BC-04',
    title: 'CERTIFICATE OF GOOD MORAL CHARACTER',
    defaultBody:
      'This is to certify that the above named person is a person of good moral character, a peace-loving citizen, and has maintained a clean record in our barangay community.',
    defaultPurpose: 'Academic & Professional Requirement',
    suggestedPurposes: [
      'Academic & Professional Requirement',
      'Scholarship Application',
      'Board Exam / PRC Requirement',
      'Military / Police Enlistment',
      'Legal Reference',
    ],
  },
  certificateOfIndigency: {
    id: 'certificateOfIndigency',
    code: 'BC-05',
    title: 'CERTIFICATE OF INDIGENCY',
    defaultBody:
      'This is to certify that the above named person belongs to the low-income / indigent family in our barangay and is in need of medical, educational, or financial assistance.',
    defaultPurpose: 'Medical & Financial Assistance',
    suggestedPurposes: [
      'Medical & Financial Assistance (DSWD/Malasakit)',
      'Hospital Bill Discount / Waiver',
      'PAO Legal Assistance',
      'Free Tuition / Educational Assistance',
    ],
  },
  firstTimeJobseeker: {
    id: 'firstTimeJobseeker',
    code: 'BC-06',
    title: 'FIRST TIME JOBSEEKER CERTIFICATE',
    defaultBody:
      'This is to certify that the above named person is a first-time jobseeker qualified to avail the benefits and fee exemptions pursuant to Republic Act No. 11261 (First Time Jobseekers Assistance Act).',
    defaultPurpose: 'First Time Job Application (RA 11261)',
    suggestedPurposes: [
      'First Time Job Application (RA 11261)',
      'Government Pre-employment Documents',
      'NBI / Police Clearance Waiver',
    ],
  },
};

/**
 * Returns ordinal suffix for given day (e.g. 1st, 2nd, 3rd, 4th, 21st, 22nd, 23rd, 31st)
 */
export function getOrdinalSuffix(day) {
  const d = parseInt(day, 10);
  if (isNaN(d)) return 'th';
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Formats a date string/object into dynamic ordinal day format:
 * e.g., "September 4, 2026" or "2026-09-04" -> "4th day of September 2026"
 */
export function formatIssuedDateOrdinal(dateInput) {
  if (!dateInput) {
    const today = new Date();
    const day = today.getDate();
    const ordinal = getOrdinalSuffix(day);
    const month = today.toLocaleString('en-US', { month: 'long' });
    const year = today.getFullYear();
    return `${day}${ordinal} day of ${month} ${year}`;
  }

  // Check if string already contains formatted text
  if (typeof dateInput === 'string' && dateInput.includes('day of')) {
    return dateInput;
  }

  const parsed = new Date(dateInput);
  if (isNaN(parsed.getTime())) {
    return dateInput;
  }

  const day = parsed.getDate();
  const ordinal = getOrdinalSuffix(day);
  const month = parsed.toLocaleString('en-US', { month: 'long' });
  const year = parsed.getFullYear();

  return `${day}${ordinal} day of ${month} ${year}`;
}
