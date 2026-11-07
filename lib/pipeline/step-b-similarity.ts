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
  const bank = vendor.bank_account_name.trim();

  // Compare direct lowercased strings
  const directScore = stringSimilarity.compareTwoStrings(
    legal.toLowerCase(),
    bank.toLowerCase()
  );

  // Compare suffix-normalized strings
  const cleanedLegal = cleanCompanyName(legal);
  const cleanedBank = cleanCompanyName(bank);
  const normalizedScore = (cleanedLegal && cleanedBank)
    ? stringSimilarity.compareTwoStrings(cleanedLegal, cleanedBank)
    : 0;

  // Use the best matching representation
  const score = Math.max(directScore, normalizedScore);
  const percentage = Math.round(score * 100);
  const autoApproved = score >= SIMILARITY_THRESHOLD;

  return {
    step: {
      name: 'step_b',
      label: 'String Similarity Match',
      status: autoApproved ? 'passed' : 'failed',
      result: autoApproved
        ? `${percentage}% match — Bank account name matches legal business name. Fast-path auto-approved (bypassing LLM).`
        : `${percentage}% match — Bank account name differs from legal company name (<90% threshold). Escalating to NVIDIA NIM LLM.`,
      timestamp: new Date().toISOString(),
    },
    autoApproved,
    score,
  };
}

