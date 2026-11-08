'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { RunState, VendorPayload } from '@/lib/pipeline/types';
import type { VendorEventPayload } from '@/lib/pipeline/events';
import { VendorSelector } from '@/components/VendorSelector';
import { StepCard } from '@/components/StepCard';
import { StatusBadge } from '@/components/StatusBadge';

export default function DashboardPage() {
  const [runId, setRunId] = useState<string | null>(null);
  const [state, setState] = useState<RunState | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isExternalRun, setIsExternalRun] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const localActiveRunIdRef = useRef<string | null>(null);
  const executionSectionRef = useRef<HTMLElement | null>(null);

  // 1. Global SSE Feed Listener: Automatically catches external submissions (e.g. Google Forms)
  useEffect(() => {
    const feedEs = new EventSource('/api/vendor/feed');

    feedEs.onmessage = (event) => {
      try {
        const payload: VendorEventPayload = JSON.parse(event.data);
        if (!payload || !payload.state) return;

        // If this run wasn't triggered by local browser button click, it's an external intake
        if (payload.state.run_id !== localActiveRunIdRef.current) {
          setIsExternalRun(true);
          setRunId(payload.state.run_id);
          setState(payload.state);
          setIsExecuting(payload.state.status === 'Processing');

          if (payload.type === 'new_submission') {
            executionSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      } catch (err) {
        console.warn('[Dashboard Feed SSE] Error parsing payload:', err);
      }
    };

    feedEs.onerror = () => {
      // EventSource auto-retries reconnection
    };

    return () => {
      feedEs.close();
    };
  }, []);

  // 2. Dedicated SSE listener for active runId
  useEffect(() => {
    if (!runId) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sseUrl = `/api/vendor/stream?run_id=${encodeURIComponent(runId)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log(`[Dashboard SSE] Connected to stream for run: ${runId}`);
    };

    es.onmessage = (event) => {
      try {
        const data: RunState = JSON.parse(event.data);
        setState(data);

        if (data.status !== 'Processing') {
          setIsExecuting(false);
          es.close();
        }
      } catch (err) {
        console.error('[Dashboard SSE] Failed to parse event payload:', err);
      }
    };

    es.onerror = (err) => {
      console.warn('[Dashboard SSE] Stream closed or connection lost:', err);
      es.close();
      setIsExecuting(false);
    };

    return () => {
      es.close();
    };
  }, [runId]);

  const handleRunPipeline = async (payload: VendorPayload) => {
    setIsExecuting(true);
    setIsExternalRun(false);
    setErrorMsg(null);
    setState(null);

    try {
      const response = await fetch('/api/vendor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Server error initiating run');
      }

      const { run_id } = await response.json();
      localActiveRunIdRef.current = run_id;
      setRunId(run_id);

      setTimeout(() => {
        executionSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setIsExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/70 text-zinc-900 dark:bg-black dark:text-zinc-100 font-sans pb-24">
      {/* Top Navigation Bar */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-20 dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="h-8 w-8 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-sm shadow-sm hover:opacity-90 transition-opacity"
            >
              Z
            </Link>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Vendor Onboarding Gateway
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Hybrid Deterministic + NVIDIA NIM Architecture (India Compliance)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
              <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs">
                Dashboard
              </span>
              <Link
                href="/history"
                className="px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium transition-colors flex items-center gap-1.5"
              >
                Run History
              </Link>
            </nav>

            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Upstash Redis Connected
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Architecture Highlight Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-0.5">
              Step A: Deterministic
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              Fast Regex, presence, &amp; 15-char Indian GSTIN verification.
            </span>
          </div>
          <div className="p-3.5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-0.5">
              Step B: String Match
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              &gt;90% legal vs bank name match auto-approves &amp; bypasses LLM.
            </span>
          </div>
          <div className="p-3.5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-0.5">
              Step C: NVIDIA NIM
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              Cross-references DBA acronyms &amp; business trade names.
            </span>
          </div>
          <div className="p-3.5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-0.5">
              Step D: Email Dispatch
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              AI drafts resolution steps &amp; delivers via Resend API.
            </span>
          </div>
        </div>

        {/* Input & Scenario Selector */}
        <VendorSelector onRun={handleRunPipeline} disabled={isExecuting} />

        {errorMsg && (
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
            <span className="font-semibold">Pipeline Error:</span> {errorMsg}
          </div>
        )}

        {/* Real-time Execution Feed via Server-Sent Events */}
        {(isExecuting || state) && (
          <section
            ref={executionSectionRef}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6"
          >
            {/* External Submission Badge */}
            {isExternalRun && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-800 text-xs animate-in fade-in">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-semibold">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600 dark:bg-indigo-400" />
                  </span>
                  <span>External Intake: Google Forms Webhook Received</span>
                </div>
                <span className="font-mono text-[11px] text-indigo-700 dark:text-indigo-300">
                  Target: {state?.vendor?.contact_email || 'Vendor Submission'}
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Real-time Execution Stream
                </h2>
                {state && <StatusBadge status={state.status} />}
              </div>

              {state?.run_id && (
                <div className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                  Run ID: <span className="text-zinc-600 dark:text-zinc-300">{state.run_id}</span>
                </div>
              )}
            </div>

            {/* Steps Timeline */}
            <div className="space-y-3">
              {state?.steps && state.steps.length > 0 ? (
                state.steps.map((step, idx) => (
                  <StepCard key={step.name + idx} step={step} index={idx} />
                ))
              ) : (
                <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500 animate-pulse">
                  Establishing SSE stream with Upstash Redis...
                </div>
              )}
            </div>

            {/* Email Notification Preview Section */}
            {state?.email_draft && (
              <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 p-5 dark:border-zinc-700 dark:bg-zinc-950">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-zinc-700 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Automated Vendor Notification
                    </span>
                  </div>

                  {state.email_sent ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Dispatched to {state.vendor.contact_email}
                    </span>
                  ) : state.status === 'Pending' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Draft (Held for Human Review)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Delivery Blocked / Failed
                    </span>
                  )}
                </div>

                {!state.email_sent && state.status === 'Rejected' && (
                  <div className="mb-3 p-3 rounded-lg border border-rose-200 bg-rose-50/70 text-rose-900 text-xs dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-[11px]">
                      <span>⚠️ Email Delivery Notice</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300">
                      {state.email_error ||
                        'The system attempted to send this rejection notice directly to the vendor, but Resend rejected delivery. In free testing mode, Resend only delivers to the account owner email unless a domain is verified.'}
                    </p>
                  </div>
                )}

                <div className="text-xs font-mono bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {state.email_draft}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
