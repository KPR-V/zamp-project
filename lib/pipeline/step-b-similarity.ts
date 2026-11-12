import stringSimilarity from 'string-similarity';
import type { VendorPayload, PipelineStep } from './types';

const SIMILARITY_THRESHOLD = 0.9;

function cleanCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(private|pvt|limited|ltd|llp|inc|corp|co)\b/gi, '')
    .replace(/[^a-z0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function runStepB(vendor: VendorPayload): {
  step: PipelineStep;
  autoApproved: boolean;
  score: number;
} {
  const legal = vendor.legal_company_name.trim();
  const dba = vendor.dba_name.trim();
  const bankAccount = (vendor.bank_account_name || vendor.bank_account_number || '').trim();

  // Compare Legal Company Name vs DBA Trade Name
  const dbaDirect = stringSimilarity.compareTwoStrings(
    legal.toLowerCase(),
    dba.toLowerCase()
  );
  const cleanedLegal = cleanCompanyName(legal);
  const cleanedDba = cleanCompanyName(dba);
  const dbaNormalized = (cleanedLegal && cleanedDba)
    ? stringSimilarity.compareTwoStrings(cleanedLegal, cleanedDba)
    : 0;

  // Also compare against bank account name if provided as text (non-numeric)
  const isNumericAccount = /^\d+$/.test(bankAccount.replace(/[\s-]/g, ''));
  let bankScore = 0;
  if (!isNumericAccount && bankAccount) {
    const bankDirect = stringSimilarity.compareTwoStrings(
      legal.toLowerCase(),
      bankAccount.toLowerCase()
    );
    const cleanedBank = cleanCompanyName(bankAccount);
    const bankNormalized = (cleanedLegal && cleanedBank)
      ? stringSimilarity.compareTwoStrings(cleanedLegal, cleanedBank)
      : 0;
    bankScore = Math.max(bankDirect, bankNormalized);
  }

  // Use the highest confidence matching representation
  const score = Math.max(dbaDirect, dbaNormalized, bankScore);
  const percentage = Math.round(score * 100);
  const autoApproved = score >= SIMILARITY_THRESHOLD;

  return {
    step: {
      name: 'step_b',
      label: 'String Similarity Match',
      status: autoApproved ? 'passed' : 'failed',
      result: autoApproved
        ? `${percentage}% match — Business name matches legal registered entity. Fast-path auto-approved (bypassing LLM).`
        : `${percentage}% match — Trade name (${vendor.dba_name}) differs from legal company name (<90% threshold). Escalating to NVIDIA NIM LLM.`,
      timestamp: new Date().toISOString(),
    },
    autoApproved,
    score,
  };
}

