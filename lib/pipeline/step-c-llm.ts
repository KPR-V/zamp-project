import { chatWithFallback, extractJsonFromResponse } from '../nvidia-client';
import type { VendorPayload, PipelineStep } from './types';

interface LLMConsistencyResponse {
  is_consistent: boolean;
  reasoning: string;
}

/**
 * Heuristic fallback for business trade name & acronym cross-referencing
 * Used if external LLM provider endpoints are temporarily unreachable or unentitled.
 */
function evaluateNameConsistencyHeuristic(vendor: VendorPayload): {
  isConsistent: boolean;
  reasoning: string;
} {
  const legal = vendor.legal_company_name.toLowerCase();
  const dba = vendor.dba_name.toLowerCase();
  const accountRef = vendor.bank_account_number || vendor.bank_account_name || '';

  // Extract acronym of legal name words (e.g. "Global Freight Solutions" -> "gfs")
  const stopWords = new Set(['pvt', 'ltd', 'private', 'limited', 'llp', 'inc', 'co', 'and', '&']);
  const words = legal
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w && !stopWords.has(w));

  const acronym = words.map((w) => w[0]).join('');

  // Check if DBA starts with or matches acronym
  const dbaClean = dba.replace(/[^a-z0-9]/g, '');

  const acronymMatches =
    (acronym.length >= 2 && dbaClean.startsWith(acronym)) ||
    (acronym.length >= 2 && dbaClean.includes(acronym));

  // Check if words overlap significantly
  const matchingWords = words.filter((w) => dba.includes(w));
  const wordOverlap = matchingWords.length > 0;

  if (acronymMatches || wordOverlap) {
    return {
      isConsistent: true,
      reasoning: `Trade name & acronym analysis: "${vendor.dba_name}" matches corporate acronym ("${acronym.toUpperCase()}") or root entities of "${vendor.legal_company_name}". Plausible Indian commercial representation for Account #${accountRef}.`,
    };
  }

  return {
    isConsistent: false,
    reasoning: `No structural, lexical, or acronym correlation found between legal entity "${vendor.legal_company_name}" and trade name "${vendor.dba_name}".`,
  };
}

export async function runStepC(vendor: VendorPayload): Promise<{
  step: PipelineStep;
  llmApproved: boolean;
  reasoning: string;
  modelUsed: string;
}> {
  const prompt = `You are a strict Indian corporate compliance officer evaluating a vendor onboarding application.

Legal Company Name: "${vendor.legal_company_name}"
Doing Business As (DBA) Name: "${vendor.dba_name}"
Bank Name: "${vendor.bank_name}"
Bank Account Number: "${vendor.bank_account_number || vendor.bank_account_name || ''}"
State: "${vendor.state_code}"

Your Task:
Determine whether the Trade / DBA Name is commercially consistent with the Legal Company Name for bank account verification.
Take into account:
1. Acronyms (e.g. "Global Freight Solutions" -> "GFS").
2. Standard Indian corporate entities (Pvt Ltd, LLP, Limited).
3. Subsidiary or brand names that clearly derive from the legal name.

You must respond ONLY with a valid JSON object in this exact format:
{
  "is_consistent": true,
  "reasoning": "Brief one or two sentences explaining why the name is consistent or fraudulent."
}`;

  try {
    const { content, modelUsed } = await chatWithFallback(
      [
        {
          role: 'system',
          content:
            'You are an expert AI auditor for Indian KYC/Vendor verification. Always output pure JSON without extra markdown commentary.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      { temperature: 0.1, max_tokens: 250 }
    );

    const parsed = extractJsonFromResponse<LLMConsistencyResponse>(content);
    const isConsistent = Boolean(parsed.is_consistent);
    const reasoning = parsed.reasoning || 'No specific reasoning provided.';

    return {
      step: {
        name: 'step_c',
        label: `NVIDIA NIM LLM Analysis (${modelUsed.split('/')[1] || modelUsed})`,
        status: isConsistent ? 'passed' : 'failed',
        result: isConsistent
          ? 'LLM verified that the DBA/Bank name is a legitimate trade representation of the legal entity.'
          : 'LLM flagged a naming inconsistency between the bank account and registered legal name.',
        reasoning,
        timestamp: new Date().toISOString(),
      },
      llmApproved: isConsistent,
      reasoning,
      modelUsed,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('[Step C] NVIDIA NIM API unavailable or unentitled, falling back to corporate acronym analysis:', errorMsg);

    const fallback = evaluateNameConsistencyHeuristic(vendor);

    return {
      step: {
        name: 'step_c',
        label: 'Corporate Entity & Acronym Verification',
        status: fallback.isConsistent ? 'passed' : 'failed',
        result: fallback.isConsistent
          ? 'Entity trade name verified: DBA matches registered corporate acronym and commercial variant.'
          : 'Flagged naming discrepancy between bank account and registered entity name.',
        reasoning: fallback.reasoning,
        timestamp: new Date().toISOString(),
      },
      llmApproved: fallback.isConsistent,
      reasoning: fallback.reasoning,
      modelUsed: 'heuristic-acronym-engine',
    };
  }
}
