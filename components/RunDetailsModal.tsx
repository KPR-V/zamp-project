'use client';

import React, { useEffect } from 'react';
import type { RunState } from '@/lib/pipeline/types';
import { StatusBadge } from './StatusBadge';
import { StepCard } from './StepCard';

interface RunDetailsModalProps {
  run: RunState | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RunDetailsModal({ run, isOpen, onClose }: RunDetailsModalProps) {
  // Handle ESC key press to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !run) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-run-title"
    >
      {/* Modal Card - stopPropagation so clicking inside does NOT close */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 id="modal-run-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Execution Run Details
                </h3>
                <StatusBadge status={run.status} />
              </div>
              <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">
                ID: {run.run_id}
              </p>
            </div>
          </div>

          {/* Dedicated Close Button (✕) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs font-sans">
          {/* Vendor Metadata Summary Grid */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
              Vendor Submission Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-700 dark:text-zinc-300">
              <div>
                <span className="text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-semibold">
                  Legal Entity Name
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                  {run.vendor?.legal_company_name}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-semibold">
                  Trade / DBA Name
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                  {run.vendor?.dba_name || '—'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-semibold">
                  GSTIN (Tax ID)
                </span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 text-xs">
                  {run.vendor?.gstin}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-semibold">
                  State Code
                </span>
                <span className="text-zinc-900 dark:text-zinc-100 text-xs">
                  {run.vendor?.state_code}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-semibold">
                  Bank Name
                </span>
                <span className="text-zinc-900 dark:text-zinc-100 text-xs">
                  {run.vendor?.bank_name}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-semibold">
                  Bank Account Name
                </span>
                <span className="text-zinc-900 dark:text-zinc-100 text-xs">
                  {run.vendor?.bank_account_name}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-semibold">
                  Contact Email
                </span>
                <span className="text-zinc-900 dark:text-zinc-100 text-xs font-mono">
                  {run.vendor?.contact_email}
                </span>
              </div>
            </div>
          </div>

          {/* Execution Steps */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
              Validation Step Breakdown
            </h4>
            <div className="space-y-3">
              {run.steps && run.steps.length > 0 ? (
                run.steps.map((step, idx) => (
                  <StepCard key={step.name + idx} step={step} index={idx} />
                ))
              ) : (
                <div className="text-zinc-400 dark:text-zinc-500 italic py-2">
                  No step details recorded for this execution.
                </div>
              )}
            </div>
          </div>

          {/* Email Notification Preview Section */}
          {run.email_draft && (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 p-4 dark:border-zinc-700 dark:bg-zinc-950">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-zinc-700 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Generated Vendor Notification
                  </span>
                </div>

                {run.email_sent ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Sent via Resend
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    Draft Generated
                  </span>
                )}
              </div>

              <div className="text-xs font-mono bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {run.email_draft}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 shrink-0">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            Recorded at {new Date(run.updated_at || run.created_at).toLocaleString()}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-900 text-white font-medium text-xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

