import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { redis } from '@/lib/redis';
import { emitVendorEvent, type VendorEventType } from '@/lib/pipeline/events';
import { runStepA } from '@/lib/pipeline/step-a-deterministic';
import { runStepB } from '@/lib/pipeline/step-b-similarity';
import { runStepC } from '@/lib/pipeline/step-c-llm';
import { runStepD } from '@/lib/pipeline/step-d-email';
import type { RunState, VendorPayload, PipelineStep } from '@/lib/pipeline/types';

// Next.js 16 Route Segment Configuration
export const maxDuration = 60;

// Helper to persist RunState to Upstash Redis with 1-hour expiration
// and immediately broadcast progress over the Server-Sent Events (SSE) live feed
async function persistState(runId: string, state: RunState): Promise<void> {
  state.updated_at = new Date().toISOString();
  try {
    await redis.set(`run:${runId}`, JSON.stringify(state), { ex: 3600 });
    // Maintain ordered index of recent run IDs
    await redis.lrem('recent_runs', 0, runId);
    await redis.lpush('recent_runs', runId);
    await redis.ltrim('recent_runs', 0, 19);
  } catch (err) {
    console.error(`[Redis] Failed to write state for run ${runId}:`, err);
  }

  // Instant zero-lag push over the /api/vendor/feed SSE connection
  const eventType: VendorEventType =
    state.steps.length === 0
      ? 'new_submission'
      : state.status === 'Processing'
      ? 'step_progress'
      : 'run_complete';

  emitVendorEvent(eventType, state, true);
}

export async function POST(request: NextRequest) {
  try {
    const vendor: VendorPayload = await request.json();
    const run_id = randomUUID();
    const issuesList: string[] = [];

    // Initialize fresh RunState
    const state: RunState = {
      run_id,
      vendor,
      status: 'Processing',
      steps: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await persistState(run_id, state);

    // =========================================================================
    // STEP A: Deterministic Layer (Regex + Required Field Checks)
    // =========================================================================
    const stepARunning: PipelineStep = {
      name: 'step_a',
      label: 'Deterministic Validation',
      status: 'running',
      result: 'Validating mandatory fields, email syntax, and Indian GSTIN format...',
      timestamp: new Date().toISOString(),
    };
    state.steps.push(stepARunning);
    await persistState(run_id, state);

    const stepAResult = runStepA(vendor);
    state.steps[0] = stepAResult.step;

    if (!stepAResult.passed) {
      // Deterministic validation failed -> Immediately Reject, Bypass Steps B & C
      issuesList.push(stepAResult.step.result || 'Failed deterministic validation.');
      state.status = 'Rejected';
      await persistState(run_id, state);

      // STEP D: Email Feedback Loop for Rejected submission
      const stepDRunning: PipelineStep = {
        name: 'step_d',
        label: 'Automated Vendor Communication',
        status: 'running',
        result: 'Generating actionable correction instructions and sending email...',
        timestamp: new Date().toISOString(),
      };
      state.steps.push(stepDRunning);
      await persistState(run_id, state);

      const stepDResult = await runStepD(vendor, 'Rejected', issuesList);
      state.steps[state.steps.length - 1] = stepDResult.step;
      state.email_draft = stepDResult.emailDraft;
      state.email_sent = stepDResult.emailSent;
      await persistState(run_id, state);

      return Response.json({ run_id, status: 'Rejected' }, { status: 200 });
    }

    await persistState(run_id, state);

    // =========================================================================
    // STEP B: String Similarity Check (Dice's Coefficient)
    // =========================================================================
    const stepBRunning: PipelineStep = {
      name: 'step_b',
      label: 'String Similarity Match',
      status: 'running',
      result: 'Comparing Bank Account Name against Legal Company Name...',
      timestamp: new Date().toISOString(),
    };
    state.steps.push(stepBRunning);
    await persistState(run_id, state);

    const stepBResult = runStepB(vendor);
    state.steps[state.steps.length - 1] = stepBResult.step;

    if (stepBResult.autoApproved) {
      // Fast Path: Similarity >= 90% -> Auto-Approved!
      // Bypasses LLM API calls completely to save compute & time
      state.status = 'Approved';
      await persistState(run_id, state);
      return Response.json({ run_id, status: 'Approved' }, { status: 200 });
    }

    await persistState(run_id, state);

    // =========================================================================
    // STEP C: Probabilistic Layer (NVIDIA NIM LLM Analysis)
    // =========================================================================
    const stepCRunning: PipelineStep = {
      name: 'step_c',
      label: 'NVIDIA NIM LLM Analysis',
      status: 'running',
      result: 'Auditing DBA vs Legal Name consistency with LLM...',
      timestamp: new Date().toISOString(),
    };
    state.steps.push(stepCRunning);
    await persistState(run_id, state);

    const stepCResult = await runStepC(vendor);
    state.steps[state.steps.length - 1] = stepCResult.step;

    if (stepCResult.llmApproved) {
      // DBA matches or is a plausible abbreviation -> Needs Human Review
      state.status = 'Pending';
      issuesList.push(
        `Bank account name matches commercial trade name (${vendor.dba_name}), but differs from registered legal name (${vendor.legal_company_name}). Manual compliance sign-off required.`
      );
    } else {
      // LLM deemed names inconsistent or suspicious -> Reject
      state.status = 'Rejected';
      issuesList.push(
        `Discrepancy detected: ${stepCResult.reasoning}`
      );
    }

    await persistState(run_id, state);

    // =========================================================================
    // STEP D: Feedback Loop (LLM Email Draft + Real Dispatch via Resend)
    // =========================================================================
    const stepDRunning: PipelineStep = {
      name: 'step_d',
      label: 'Automated Vendor Communication',
      status: 'running',
      result: 'Drafting notification email via NVIDIA NIM & dispatching via Resend...',
      timestamp: new Date().toISOString(),
    };
    state.steps.push(stepDRunning);
    await persistState(run_id, state);

    const stepDResult = await runStepD(vendor, state.status, issuesList);
    state.steps[state.steps.length - 1] = stepDResult.step;
    state.email_draft = stepDResult.emailDraft;
    state.email_sent = stepDResult.emailSent;
    await persistState(run_id, state);

    return Response.json({ run_id, status: state.status }, { status: 200 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API /api/vendor] Unhandled error:', errorMsg);
    return Response.json(
      { error: 'Internal server error processing vendor onboarding', details: errorMsg },
      { status: 500 }
    );
  }
}
