import { chatWithFallback } from '../nvidia-client';
import { sendVendorEmail } from '../mailer';
import type { VendorPayload, PipelineStep, VendorStatus } from './types';

export async function runStepD(
  vendor: VendorPayload,
  status: VendorStatus,
  issues: string[]
): Promise<{
  step: PipelineStep;
  emailDraft: string;
  emailSent: boolean;
  modelUsed: string;
}> {
  const issuesList = issues.length > 0
    ? issues.map((issue, idx) => `${idx + 1}. ${issue}`).join('\n')
    : '1. Discrepancy observed during automated verification.';

  const prompt = `You are a professional Vendor Onboarding & Accounts Payable specialist in India.
Write a clear, concise email to the vendor regarding their onboarding submission.

Vendor Name: ${vendor.legal_company_name}
DBA Name: ${vendor.dba_name}
Application Status: ${status}
Issues Detected:
${issuesList}

Requirements:
- Address the email politely to "Dear ${vendor.legal_company_name} Accounts Team,"
- Inform them of their status: ${status === 'Pending' ? 'under manual review due to bank verification' : 'action required due to submission errors'}.
- Explicitly list what needs to be rectified or verified.
- End with:
Regards,
Vendor Compliance & Accounts Payable Team
Auto-Onboarding Gateway
- Keep it to 3-5 sentences total. Do NOT include placeholder tags like [Date] or [Phone Number].`;

  let emailDraft = '';
  let modelUsed = 'fallback';

  try {
    const response = await chatWithFallback(
      [
        {
          role: 'system',
          content: 'You are an automated corporate communications assistant. Generate only the email body text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      { temperature: 0.3, max_tokens: 350 }
    );
    emailDraft = response.content;
    modelUsed = response.modelUsed;
  } catch (err) {
    console.error('[Step D] LLM email generation failed:', err);
    emailDraft = `Dear ${vendor.legal_company_name} Accounts Team,\n\nWe have reviewed your vendor onboarding application. Your application is currently marked as ${status}.\n\nIssues noted:\n${issuesList}\n\nPlease review your submission details.\n\nRegards,\nVendor Compliance Team`;
  }

  // Determine email subject
  const subject = status === 'Rejected'
    ? `[Action Required] Vendor Onboarding Submission - ${vendor.legal_company_name}`
    : `[Under Review] Vendor Onboarding Status Update - ${vendor.legal_company_name}`;

  let sendResult: { success: boolean; messageId?: string; error?: string };

  if (status === 'Pending') {
    // When an application requires human review, hold email as draft
    // Compliance reviewer can edit, approve, or dispatch from Inspect Modal
    sendResult = {
      success: false,
      error: 'Held as draft awaiting human compliance review',
    };
  } else {
    // For Rejected, send immediate actionable notification
    sendResult = await sendVendorEmail(vendor.contact_email, subject, emailDraft);
  }

  const resultMessage = status === 'Pending'
    ? 'Notification draft generated and queued for human compliance review.'
    : sendResult.success
    ? `Email successfully generated and sent to ${vendor.contact_email} (Resend ID: ${sendResult.messageId}).`
    : `Email draft generated. Delivery failed or simulated (${sendResult.error || 'Check Resend configuration'}).`;

  const label = status === 'Pending'
    ? 'Automated Vendor Communication (Draft Queued for Review)'
    : `Automated Vendor Communication (${sendResult.success ? 'Email Sent' : 'Email Drafted'})`;

  return {
    step: {
      name: 'step_d',
      label,
      status: 'passed',
      result: resultMessage,
      reasoning: emailDraft,
      timestamp: new Date().toISOString(),
    },
    emailDraft,
    emailSent: sendResult.success,
    modelUsed,
  };
}

