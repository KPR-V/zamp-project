import type { VendorPayload, PipelineStep } from './types';

// RFC 5322 simplified email regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// Indian GSTIN standard format:
// 2-digit state code + 5-character PAN alphabet + 4-digit PAN numbers + 1-character entity code + 1 alphanumeric + 'Z' + 1 checksum alphanumeric
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;

const REQUIRED_FIELDS: (keyof VendorPayload)[] = [
  'legal_company_name',
  'dba_name',
  'gstin',
  'bank_name',
  'bank_account_name',
  'state_code',
  'contact_email',
];

export function runStepA(vendor: VendorPayload): {
  step: PipelineStep;
  passed: boolean;
} {
  // 1. Required field presence validation
  for (const field of REQUIRED_FIELDS) {
    if (!vendor[field] || typeof vendor[field] !== 'string' || !vendor[field].trim()) {
      return {
        step: {
          name: 'step_a',
          label: 'Deterministic Validation',
          status: 'failed',
          result: `Missing or empty required field: ${field}`,
          timestamp: new Date().toISOString(),
        },
        passed: false,
      };
    }
  }

  // 2. Email format validation
  if (!EMAIL_REGEX.test(vendor.contact_email.trim())) {
    return {
      step: {
        name: 'step_a',
        label: 'Deterministic Validation',
        status: 'failed',
        result: `Invalid email format: "${vendor.contact_email}"`,
        timestamp: new Date().toISOString(),
      },
      passed: false,
    };
  }

  // 3. Indian GSTIN format validation (Strict 15-character structure)
  const trimmedGstin = vendor.gstin.trim().toUpperCase();
  if (trimmedGstin.length !== 15) {
    return {
      step: {
        name: 'step_a',
        label: 'Deterministic Validation',
        status: 'failed',
        result: `Invalid GSTIN length: Expected 15 characters, but received ${trimmedGstin.length} characters ("${trimmedGstin}").`,
        timestamp: new Date().toISOString(),
      },
      passed: false,
    };
  }

  if (!GSTIN_REGEX.test(trimmedGstin)) {
    return {
      step: {
        name: 'step_a',
        label: 'Deterministic Validation',
        status: 'failed',
        result: `Invalid GSTIN structure: "${trimmedGstin}" does not match the statutory Indian 15-character GSTIN specification (2 state digits + PAN + entity + Z + check digit).`,
        timestamp: new Date().toISOString(),
      },
      passed: false,
    };
  }

  return {
    step: {
      name: 'step_a',
      label: 'Deterministic Validation',
      status: 'passed',
      result: `Deterministic checks passed. All mandatory fields present, valid email format, and compliant 15-character Indian GSTIN (${trimmedGstin}).`,
      timestamp: new Date().toISOString(),
    },
    passed: true,
  };
}

