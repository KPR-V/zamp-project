export type VendorStatus = 'Processing' | 'Approved' | 'Pending' | 'Rejected';

export type StepName = 'step_a' | 'step_b' | 'step_c' | 'step_d' | 'step_human_review';

export interface VendorPayload {
  legal_company_name: string;   // e.g. "Infosys Technologies Private Limited"
  dba_name: string;             // e.g. "Infosys" (Doing Business As)
  gstin: string;                // 15-char GSTIN, e.g. "27AAACI1681G1ZK"
  bank_name: string;            // e.g. "HDFC Bank", "SBI", "ICICI Bank"
  bank_account_number: string;  // Bank Account Number (from Google Form)
  bank_account_name?: string;   // Optional fallback / alias
  state_code: string;           // 2-digit Indian state code, e.g. "MH", "KA", "DL"
  contact_email: string;        // RFC 5322 email, will receive actual email
}

export interface PipelineStep {
  name: StepName;
  label: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  result?: string;              // Human-readable outcome
  reasoning?: string;           // LLM reasoning (steps C/D only)
  timestamp?: string;           // ISO 8601
}

export interface RunState {
  run_id: string;
  vendor: VendorPayload;
  status: VendorStatus;
  steps: PipelineStep[];
  email_draft?: string;         // Body of email that was actually sent
  email_sent?: boolean;         // Whether Resend delivery succeeded
  email_error?: string;        // Delivery error details if email failed or was blocked by Resend
  created_at: string;
  updated_at: string;
}

