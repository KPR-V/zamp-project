import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { sendVendorEmail } from '@/lib/mailer';
import { emitVendorEvent } from '@/lib/pipeline/events';
import type { RunState, PipelineStep } from '@/lib/pipeline/types';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { run_id, action, email_draft } = body;

    if (!run_id || !action) {
      return Response.json(
        { error: 'Missing required fields: run_id and action' },
        { status: 400 }
      );
    }

    const raw = await redis.get<string | RunState>(`run:${run_id}`);
    if (!raw) {
      return Response.json(
        { error: `Run with ID ${run_id} not found` },
        { status: 404 }
      );
    }

    const state: RunState = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Update draft content if provided
    if (typeof email_draft === 'string') {
      state.email_draft = email_draft;
    }

    // 1. Action: Save updated draft text
    if (action === 'save_draft') {
      state.updated_at = new Date().toISOString();
      await redis.set(`run:${run_id}`, JSON.stringify(state), { ex: 3600 });
      return Response.json({ success: true, run: state });
    }

    // 2. Action: Send the draft email via Resend
    if (action === 'send_email') {
      const subject = state.status === 'Approved'
        ? `[Approved] Vendor Onboarding Confirmation - ${state.vendor.legal_company_name}`
        : state.status === 'Rejected'
        ? `[Action Required] Vendor Onboarding Submission - ${state.vendor.legal_company_name}`
        : `[Under Review] Vendor Onboarding Status Update - ${state.vendor.legal_company_name}`;

      const content = state.email_draft || 'Vendor onboarding status update.';
      const sendResult = await sendVendorEmail(state.vendor.contact_email, subject, content);

      if (sendResult.success) {
        state.email_sent = true;
        state.updated_at = new Date().toISOString();

        // Update Step D or add dispatch log
        const stepD = state.steps.find((s) => s.name === 'step_d');
        if (stepD) {
          stepD.label = 'Automated Vendor Communication (Email Sent)';
          stepD.result = `Email successfully dispatched to ${state.vendor.contact_email} (Resend ID: ${sendResult.messageId}).`;
        }

        await redis.set(`run:${run_id}`, JSON.stringify(state), { ex: 3600 });
        emitVendorEvent('step_progress', state, false);

        return Response.json({
          success: true,
          run: state,
          messageId: sendResult.messageId,
        });
      } else {
        return Response.json(
          {
            success: false,
            error: sendResult.error || 'Failed to dispatch email via Resend',
            run: state,
          },
          { status: 400 }
        );
      }
    }

    // 3. Action: Human Compliance Approval
    if (action === 'approve') {
      state.status = 'Approved';
      state.updated_at = new Date().toISOString();

      const approvalStep: PipelineStep = {
        name: 'step_human_review',
        label: 'Human Compliance Sign-Off',
        status: 'passed',
        result: 'Approved by Compliance Officer: Trade name variation and bank credentials verified.',
        timestamp: new Date().toISOString(),
      };
      state.steps.push(approvalStep);

      // Optionally draft an approval confirmation email
      state.email_draft = `Dear ${state.vendor.legal_company_name} Accounts Team,\n\nWe are pleased to inform you that your vendor onboarding application has been reviewed and officially Approved by our compliance team.\n\nYour banking credentials and trade name (${state.vendor.dba_name}) have been verified.\n\nRegards,\nVendor Compliance Team`;
      state.email_sent = false; // Left as draft ready to send, or reviewer can click send

      await redis.set(`run:${run_id}`, JSON.stringify(state), { ex: 3600 });
      emitVendorEvent('run_complete', state, false);

      return Response.json({ success: true, run: state });
    }

    // 4. Action: Human Compliance Rejection
    if (action === 'reject') {
      state.status = 'Rejected';
      state.updated_at = new Date().toISOString();

      const rejectionStep: PipelineStep = {
        name: 'step_human_review',
        label: 'Human Compliance Sign-Off',
        status: 'failed',
        result: 'Rejected by Compliance Officer: Entity documentation deemed insufficient.',
        timestamp: new Date().toISOString(),
      };
      state.steps.push(rejectionStep);

      state.email_draft = `Dear ${state.vendor.legal_company_name} Accounts Team,\n\nFollowing manual review by our compliance team, your vendor onboarding application has been Rejected due to inconsistent trade documentation.\n\nPlease resubmit with official statutory proofs.\n\nRegards,\nVendor Compliance Team`;
      state.email_sent = false;

      await redis.set(`run:${run_id}`, JSON.stringify(state), { ex: 3600 });
      emitVendorEvent('run_complete', state, false);

      return Response.json({ success: true, run: state });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API /api/vendor/review] Error processing review action:', errorMsg);
    return Response.json(
      { error: 'Internal server error processing review action', details: errorMsg },
      { status: 500 }
    );
  }
}
