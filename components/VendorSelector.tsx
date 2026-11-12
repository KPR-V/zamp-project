'use client';

import React, { useState } from 'react';
import { TEST_CASES, TestCase } from '@/lib/test-cases';
import type { VendorPayload } from '@/lib/pipeline/types';

interface VendorSelectorProps {
  onRun: (payload: VendorPayload) => void;
  disabled: boolean;
}

export function VendorSelector({ onRun, disabled }: VendorSelectorProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('happy_path');
  const [customPayload, setCustomPayload] = useState<VendorPayload>(
    TEST_CASES.happy_path.payload
  );
  const [showJson, setShowJson] = useState<boolean>(false);

  const selectedCase = TEST_CASES[selectedCaseId] || TEST_CASES.happy_path;

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setCustomPayload(TEST_CASES[caseId].payload);
  };

  const handleFieldChange = (key: keyof VendorPayload, value: string) => {
    setCustomPayload((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRun(customPayload);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 pb-5 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Vendor Intake &amp; Test Scenario Selection
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Select a test case to simulate real-world Indian vendor onboarding conditions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 underline self-start sm:self-auto cursor-pointer"
        >
          {showJson ? '← Show Form Fields' : '{ } Inspect / Edit Raw JSON'}
        </button>
      </div>

      {/* Preset Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-5">
        {Object.values(TEST_CASES).map((item: TestCase) => {
          const isSelected = selectedCaseId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => handleSelectCase(item.id)}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${isSelected
                  ? 'border-zinc-900 bg-zinc-50/80 ring-2 ring-zinc-900/10 dark:border-zinc-100 dark:bg-zinc-800/80 dark:ring-zinc-100/10'
                  : 'border-zinc-200 hover:border-zinc-300 bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700'
                }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {item.name}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.expectedStatus === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : item.expectedStatus === 'Pending'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                >
                  {item.expectedStatus}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {showJson ? (
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Custom JSON Payload
            </label>
            <textarea
              rows={8}
              value={JSON.stringify(customPayload, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setCustomPayload(parsed);
                } catch {
                  // allow user to type invalid json temporarily
                }
              }}
              disabled={disabled}
              className="w-full font-mono text-xs p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Legal Company Name
              </label>
              <input
                type="text"
                value={customPayload.legal_company_name}
                onChange={(e) => handleFieldChange('legal_company_name', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                DBA (Doing Business As) Name
              </label>
              <input
                type="text"
                value={customPayload.dba_name}
                onChange={(e) => handleFieldChange('dba_name', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                GSTIN (15 Alphanumeric Characters)
              </label>
              <input
                type="text"
                value={customPayload.gstin}
                onChange={(e) => handleFieldChange('gstin', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={customPayload.bank_name}
                onChange={(e) => handleFieldChange('bank_name', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Bank Account Number
              </label>
              <input
                type="text"
                value={customPayload.bank_account_number || customPayload.bank_account_name || ''}
                onChange={(e) => {
                  handleFieldChange('bank_account_number', e.target.value);
                  handleFieldChange('bank_account_name', e.target.value);
                }}
                disabled={disabled}
                placeholder="e.g. 50100432109876"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Notification Email
              </label>
              <input
                type="email"
                value={customPayload.contact_email}
                onChange={(e) => handleFieldChange('contact_email', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                required
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Expected Flow:</span>{' '}
            {selectedCase.expectedBehavior}
          </div>

          <button
            type="submit"
            disabled={disabled}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 text-white font-medium text-xs hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {disabled ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Streaming Pipeline Execution...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run Validation Pipeline
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

