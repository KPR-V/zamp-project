import { VendorPayload } from './pipeline/types';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  expectedStatus: 'Approved' | 'Pending' | 'Rejected';
  expectedBehavior: string;
  payload: VendorPayload;
}

export const TEST_CASES: Record<string, TestCase> = {
  happy_path: {
    id: 'happy_path',
    name: '1. Happy Path (Auto-Approved)',
    description: 'Clean data, valid 15-digit GSTIN, and trade name matches legal entity (>90%).',
    expectedStatus: 'Approved',
    expectedBehavior: 'Bypasses LLM and Auto-Approves in < 1 second. Dispatches formal congratulations approval email via Resend.',
    payload: {
      legal_company_name: 'Meridian Softech Private Limited',
      dba_name: 'Meridian Softech',
      gstin: '27AABCM1234D1Z5',
      bank_name: 'HDFC Bank',
      bank_account_number: '50100432109876',
      bank_account_name: 'Meridian Softech Private Limited',
      state_code: 'MH',
      contact_email: 'decline-sharpness96@bravealias.com',
    },
  },
  dba_mismatch: {
    id: 'dba_mismatch',
    name: '2. DBA Mismatch (LLM Verification → Pending Review)',
    description: 'Legal name and DBA trade name differ (GFS Logistics vs Global Freight Solutions).',
    expectedStatus: 'Pending',
    expectedBehavior: 'Triggers NVIDIA NIM LLM. Verifies DBA acronym consistency. Sends real email notification.',
    payload: {
      legal_company_name: 'Global Freight Solutions LLP',
      dba_name: 'GFS Logistics',
      gstin: '29AABCG5678E1Z3',
      bank_name: 'ICICI Bank',
      bank_account_number: '001105002341',
      bank_account_name: 'GFS Logistics',
      state_code: 'KA',
      contact_email: 'decline-sharpness96@bravealias.com',
    },
  },
  gstin_typo: {
    id: 'gstin_typo',
    name: '3. GSTIN Typo (Deterministic Reject)',
    description: 'Vendor input a 14-character GSTIN instead of 15-character standard.',
    expectedStatus: 'Rejected',
    expectedBehavior: 'Caught instantly by regex layer (bypasses LLM verification). Triggers AI email generation and sends notification.',
    payload: {
      legal_company_name: 'Sunrise Imports and Exports Pvt Ltd',
      dba_name: 'Sunrise Imports',
      gstin: '07AABCS12345Z5',
      bank_name: 'State Bank of India',
      bank_account_number: '3089101002345',
      bank_account_name: 'Sunrise Imports and Exports Pvt Ltd',
      state_code: 'DL',
      contact_email: 'decline-sharpness96@bravealias.com',
    },
  },
};

