'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { RunState } from '@/lib/pipeline/types';
import { RunHistory } from '@/components/RunHistory';
import { RunDetailsModal } from '@/components/RunDetailsModal';

export default function HistoryPage() {
  const [historyRuns, setHistoryRuns] = useState<RunState[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [selectedRun, setSelectedRun] = useState<RunState | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const fetchHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const response = await fetch('/api/vendor/history');
      if (response.ok) {
        const data = await response.json();
        setHistoryRuns(data.runs || []);
      }
    } catch (err) {
      console.error('[HistoryPage] Failed to fetch run history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleOpenInspectModal = (run: RunState) => {
    setSelectedRun(run);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRun(null);
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
                Audit Trail &amp; Execution Log Database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium transition-colors"
              >
                Dashboard
              </Link>
              <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs">
                Run History
              </span>
            </nav>

            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Upstash Redis Connected
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Active Pipeline
          </Link>

          <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
            Showing latest {historyRuns.length} executions
          </span>
        </div>

        {/* History Table */}
        <RunHistory
          runs={historyRuns}
          isLoading={isHistoryLoading}
          onRefresh={fetchHistory}
          onSelectRun={handleOpenInspectModal}
          selectedRunId={isModalOpen ? selectedRun?.run_id : null}
        />
      </main>

      {/* Inspect Popup Modal */}
      <RunDetailsModal
        run={selectedRun}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}

