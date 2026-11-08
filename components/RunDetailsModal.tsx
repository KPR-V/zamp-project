'use client';

import React, { useState, useEffect } from 'react';
import type { RunState } from '@/lib/pipeline/types';
import { StatusBadge } from './StatusBadge';
import { StepCard } from './StepCard';

interface RunDetailsModalProps {
  run: RunState | null;
  isOpen: boolean;
  onClose: () => void;
  onRunUpdated?: (updatedRun: RunState) => void;
}

export function RunDetailsModal({ run, isOpen, onClose, onRunUpdated }: RunDetailsModalProps) {
  const [currentRun, setCurrentRun] = useState<RunState | null>(run);
  const [isEditingDraft, setIsEditingDraft] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string>('');
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync state whenever the selected run changes
  useEffect(() => {
    setCurrentRun(run);
    setDraftContent(run?.email_draft || '');
    setIsEditingDraft(false);
    setFeedback(null);
  }, [run]);

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

  if (!isOpen || !currentRun) return null;

  const handleExecuteAction = async (action: 'save_draft' | 'send_email' | 'approve' | 'reject') => {
    setIsActionLoading(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/vendor/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: currentRun.run_id,
          action,
          email_draft: draftContent,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete review action');
      }

      const updated = data.run as RunState;
      setCurrentRun(updated);
      onRunUpdated?.(updated);

      if (action === 'save_draft') {
        setIsEditingDraft(false);
        setFeedback({ type: 'success', message: 'Email draft updated successfully.' });
      } else if (action === 'send_email') {
        setFeedback({ type: 'success', message: `Email dispatched to ${currentRun.vendor.contact_email} via Resend.` });
      } else if (action === 'approve') {
        setFeedback({ type: 'success', message: 'Vendor status marked as Approved by Compliance Officer.' });
      } else if (action === 'reject') {
        setFeedback({ type: 'success', message: 'Vendor status marked as Rejected.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsActionLoading(false);
    }
  };

  const isPending = currentRun.status === 'Pending';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-run-title"
    >
      {/* Modal Card */}
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
                <StatusBadge status={currentRun.status} />
              </div>
              <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">
                ID: {currentRun.run_id}
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
          {/* Action Feedback Notification */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300'
              }`}
            >
              <span>{feedback.message}</span>
              <button
                onClick={() => setFeedback(null)}
                className="text-[10px] font-semibold underline ml-2 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

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
                  {currentRun.vendor?.legal_company_name}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-semibold">
                  Trade Name (DBA)
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                  {currentRun.vendor?.dba_name}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-semibold">
                  GSTIN (Tax ID)
                </span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 text-xs">
                  {currentRun.vendor?.gstin}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-semibold">
                  State Code
                </span>
                <span className="text-zinc-900 dark:text-zinc-100 text-xs">
                  {currentRun.vendor?.state_code}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-semibold">
                  Bank Name
                </span>
                <span className="text-zinc-900 dark:text-zinc-100 text-xs">
                  {currentRun.vendor?.bank_name}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-semibold">
                  Bank Account Name
                </span>
                <span className="text-zinc-900 dark:text-zinc-100 text-xs">
                  {currentRun.vendor?.bank_account_name}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-semibold">
                  Contact Email
                </span>
                <span className="text-zinc-900 dark:text-zinc-100 text-xs font-mono">
                  {currentRun.vendor?.contact_email}
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
              {currentRun.steps && currentRun.steps.length > 0 ? (
                currentRun.steps.map((step, idx) => (
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
          {(currentRun.email_draft || isEditingDraft) && (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 p-4 dark:border-zinc-700 dark:bg-zinc-950 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-zinc-700 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Vendor Notification Email
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {currentRun.email_sent ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Dispatched via Resend
                    </span>
                  ) : currentRun.status === 'Pending' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Draft (Held for Review)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Delivery Blocked / Failed
                    </span>
                  )}

                  {!currentRun.email_sent && !isEditingDraft && (
                    <button
                      onClick={() => setIsEditingDraft(true)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 px-2 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                    >
                      ✏️ Edit Draft
                    </button>
                  )}
                </div>
              </div>

              {/* Delivery Failure Notice if Rejected & Not Sent */}
              {!currentRun.email_sent && currentRun.status === 'Rejected' && (
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/70 text-rose-900 text-xs dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-[11px]">
                    <span>⚠️ Email Dispatch Blocked / Failed</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300">
                    {currentRun.email_error ||
                      'The system attempted to send this rejection notice directly to the vendor, but Resend rejected delivery. In free testing mode, Resend only delivers to the account owner email unless a domain is verified.'}
                  </p>
                </div>
              )}

              {/* Draft Body: Editable Textarea vs Read-Only Code Block */}
              {isEditingDraft ? (
                <div className="space-y-2">
                  <textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    rows={6}
                    className="w-full text-xs font-mono p-3 rounded-lg border border-indigo-300 bg-white dark:bg-zinc-900 dark:border-indigo-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y"
                    placeholder="Type or customize the email body for this vendor..."
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftContent(currentRun.email_draft || '');
                        setIsEditingDraft(false);
                      }}
                      className="px-3 py-1 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 font-medium text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleExecuteAction('save_draft')}
                      className="px-3.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                    >
                      {isActionLoading ? 'Saving...' : 'Save Draft'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-mono bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {currentRun.email_draft}
                </div>
              )}

              {/* Send Email Action Button */}
              {!currentRun.email_sent && !isEditingDraft && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Recipient: <span className="font-mono text-zinc-700 dark:text-zinc-300">{currentRun.vendor.contact_email}</span>
                  </span>
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => handleExecuteAction('send_email')}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>{isActionLoading ? 'Dispatching...' : 'Send Email to Vendor'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 shrink-0">
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
            Updated: {new Date(currentRun.updated_at || currentRun.created_at).toLocaleTimeString()}
          </div>

          <div className="flex items-center gap-2">
            {/* Human-in-the-Loop Approval Controls */}
            {isPending && (
              <>
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={() => handleExecuteAction('approve')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Approve Vendor</span>
                </button>

                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={() => handleExecuteAction('reject')}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 dark:border-rose-900 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Reject</span>
                </button>
              </>
            )}

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
    </div>
  );
}
