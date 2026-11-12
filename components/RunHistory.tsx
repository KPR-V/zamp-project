'use client';

import React from 'react';
import type { RunState } from '@/lib/pipeline/types';
import { StatusBadge } from './StatusBadge';

interface RunHistoryProps {
  runs: RunState[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectRun: (run: RunState) => void;
  selectedRunId?: string | null;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return date.toLocaleDateString();
}

export function RunHistory({
  runs,
  isLoading,
  onRefresh,
  onSelectRun,
  selectedRunId,
}: RunHistoryProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Run History
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {runs.length} {runs.length === 1 ? 'record' : 'records'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Past execution states queried live from Upstash Redis. Click any row to inspect execution breakdown.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50 transition-all dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer shadow-2xs"
        >
          <svg
            className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-zinc-500'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {isLoading ? 'Refreshing...' : 'Refresh History'}
        </button>
      </div>

      {/* Table */}
      {runs.length === 0 ? (
        <div className="py-10 text-center text-xs text-zinc-400 dark:text-zinc-500">
          No execution runs found in Upstash Redis yet. Submit a test case above to record your first execution.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-zinc-400 dark:border-zinc-800 dark:text-zinc-500 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Run ID</th>
                <th className="py-3 px-3">Vendor / DBA</th>
                <th className="py-3 px-3">GSTIN</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Email Notification</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-sans">
              {runs.map((run) => {
                const isSelected = selectedRunId === run.run_id;
                const timestamp = run.updated_at || run.created_at;

                return (
                  <tr
                    key={run.run_id}
                    onClick={() => onSelectRun(run)}
                    className={`group transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-100/80 dark:bg-zinc-800/60'
                        : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30'
                    }`}
                  >
                    {/* Run ID */}
                    <td className="py-3 px-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                      <span title={run.run_id}>
                        {run.run_id.slice(0, 8)}...
                      </span>
                    </td>

                    {/* Vendor Name & DBA */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {run.vendor?.legal_company_name || 'Unknown Vendor'}
                      </div>
                      {run.vendor?.dba_name && (
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          DBA: {run.vendor.dba_name}
                        </div>
                      )}
                    </td>

                    {/* GSTIN */}
                    <td className="py-3 px-3 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                      {run.vendor?.gstin || '—'}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <StatusBadge status={run.status} />
                    </td>

                    {/* Email Status */}
                    <td className="py-3 px-3">
                      {run.email_sent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {run.status === 'Approved' ? 'Approval Sent' : 'Notice Sent'} ({run.vendor?.contact_email?.split('@')[0]}@...)
                        </span>
                      ) : run.status === 'Pending' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Draft (Awaiting Review)
                        </span>
                      ) : run.email_draft ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-400"
                          title={run.email_error || 'Email dispatch attempted, but blocked or rejected by provider.'}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Delivery Failed / Blocked
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          None (Auto-Approved)
                        </span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      <div>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {formatRelativeTime(timestamp)}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRun(run);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900'
                            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {isSelected ? 'Viewing' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

