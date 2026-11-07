'use client';

import React from 'react';
import type { PipelineStep } from '@/lib/pipeline/types';

interface StepCardProps {
  step: PipelineStep;
  index: number;
}

export function StepCard({ step, index }: StepCardProps) {
  const isRunning = step.status === 'running';
  const isPassed = step.status === 'passed';
  const isFailed = step.status === 'failed';
  const isSkipped = step.status === 'skipped';

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-300 ${
        isRunning
          ? 'border-blue-300 bg-blue-50/50 shadow-sm ring-1 ring-blue-200 dark:border-blue-800 dark:bg-blue-950/20'
          : isPassed
          ? 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60'
          : isFailed
          ? 'border-rose-200 bg-rose-50/30 dark:border-rose-900 dark:bg-rose-950/20'
          : isSkipped
          ? 'border-dashed border-zinc-200 bg-zinc-50/50 opacity-60 dark:border-zinc-800 dark:bg-zinc-950'
          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              isRunning
                ? 'bg-blue-600 text-white animate-pulse'
                : isPassed
                ? 'bg-emerald-600 text-white'
                : isFailed
                ? 'bg-rose-600 text-white'
                : isSkipped
                ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {isPassed ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : isFailed ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : isRunning ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              index + 1
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {step.label}
              {isRunning && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  Executing
                </span>
              )}
              {isSkipped && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  Bypassed (Saved LLM Tokens)
                </span>
              )}
            </h3>
            {step.timestamp && (
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                {new Date(step.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        <div>
          {isPassed && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
              Passed
            </span>
          )}
          {isFailed && (
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
              Failed
            </span>
          )}
        </div>
      </div>

      {step.result && (
        <div className="mt-3 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 pl-10">
          <p className="font-mono bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
            {step.result}
          </p>
        </div>
      )}

      {step.reasoning && step.name === 'step_c' && (
        <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 pl-10">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">LLM Reasoning:</span>{' '}
          <em>&quot;{step.reasoning}&quot;</em>
        </div>
      )}
    </div>
  );
}

