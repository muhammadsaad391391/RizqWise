'use client';

import React, { useState } from 'react';
import { useFinance } from '@/lib/context/finance-context';
import { Fund } from '@/types/finance';
import { formatCurrency, validateAllocationRules } from '@/lib/finance-engine';
import { IconRenderer } from '@/components/common/icon-renderer';
import {
  Coins,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Briefcase,
  Sparkles,
} from 'lucide-react';

const CURRENCY_OPTIONS = [
  { code: 'PKR', symbol: 'Rs.', label: 'Pakistani Rupee (PKR)' },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD)' },
  { code: 'SAR', symbol: 'SAR', label: 'Saudi Riyal (SAR)' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'EUR', symbol: '€', label: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (GBP)' },
];

export function OnboardingWizard() {
  const { funds, settings, updateSettings, updateFund, importData } = useFinance();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Currency state
  const [selectedCurrency, setSelectedCurrency] = useState(settings.currency || 'PKR');
  const [selectedSymbol, setSelectedSymbol] = useState(settings.currencySymbol || 'Rs.');

  // Step 2 & 3: Funds & Percentages & Opening Balances state
  const [editableFunds, setEditableFunds] = useState<Fund[]>(() =>
    funds.map((f) => ({ ...f }))
  );

  const handlePercentageChange = (fundId: string, value: string) => {
    const num = parseFloat(value) || 0;
    setEditableFunds((prev) =>
      prev.map((f) => (f.id === fundId ? { ...f, allocationPercentage: num } : f))
    );
  };

  const handleOpeningBalanceChange = (fundId: string, value: string) => {
    const num = parseFloat(value) || 0;
    setEditableFunds((prev) =>
      prev.map((f) => (f.id === fundId ? { ...f, openingBalance: num } : f))
    );
  };

  const rulesValidation = validateAllocationRules(editableFunds);

  const handleFinish = () => {
    // 1. Update settings
    updateSettings({
      currency: selectedCurrency,
      currencySymbol: selectedSymbol,
      onboardingCompleted: true,
    });

    // 2. Commit funds
    importData({
      funds: editableFunds,
      settings: {
        ...settings,
        currency: selectedCurrency,
        currencySymbol: selectedSymbol,
        onboardingCompleted: true,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-brand-header p-6 text-slate-950 border-b border-brand-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-bold shadow-md">
              <Coins className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-950">
                Welcome to RizqWise
              </h2>
              <p className="text-xs font-semibold text-amber-950/80">
                Know where your money goes • Step {step} of 4
              </p>
            </div>
          </div>

          {/* Step Progress indicators */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s <= step ? 'bg-slate-950' : 'bg-black/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wizard Body */}
        <div className="p-6">
          {/* STEP 1: CURRENCY */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Choose your Currency</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Select your primary accounting currency. Default is Pakistani Rupee (PKR).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {CURRENCY_OPTIONS.map((c) => {
                  const isSelected = selectedCurrency === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setSelectedCurrency(c.code);
                        setSelectedSymbol(c.symbol);
                      }}
                      className={`p-3 text-left rounded-xl border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-1 ring-amber-500'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-800">{c.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Example: {c.symbol} 100,000
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-600" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-md transition-all"
                >
                  Continue to Funds <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: FUNDS & ALLOCATION PERCENTAGES */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Your Funds & Rules</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Assign allocation percentages to each fund. Must total exactly 100%.
                </p>
              </div>

              {/* Live 100% check alert */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                  rulesValidation.isValid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {rulesValidation.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  )}
                  <span>
                    {rulesValidation.isValid
                      ? 'Allocations total 100% (Ready)'
                      : rulesValidation.message}
                  </span>
                </div>
                <span className="font-extrabold text-sm">{rulesValidation.totalPercentage}%</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {editableFunds.map((fund) => (
                  <div
                    key={fund.id}
                    className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: fund.color }}
                      >
                        <IconRenderer name={fund.icon} className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-slate-800 truncate">{fund.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={fund.allocationPercentage}
                        onChange={(e) => handlePercentageChange(fund.id, e.target.value)}
                        className="w-16 px-2 py-1 text-center font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-amber-500"
                      />
                      <span className="font-bold text-slate-500">%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!rulesValidation.isValid}
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-sm flex items-center gap-2 shadow-md transition-all"
                >
                  Continue to Balances <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: OPENING BALANCES */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Existing Balances (Optional)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  If you already have money in any of these funds, enter the starting amount. Opening balances are recorded separately and are never counted as new income.
                </p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {editableFunds.map((fund) => (
                  <div
                    key={fund.id}
                    className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: fund.color }}
                      >
                        <IconRenderer name={fund.icon} className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-slate-800 truncate">{fund.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 w-36">
                      <span className="text-slate-400 font-bold">{selectedSymbol}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={fund.openingBalance || ''}
                        onChange={(e) => handleOpeningBalanceChange(fund.id, e.target.value)}
                        className="w-full px-2 py-1 text-right font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-md transition-all"
                >
                  Review & Launch <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & LAUNCH */}
          {step === 4 && (
            <div className="space-y-5 text-center py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900">You are All Set!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Your funds and automatic allocation rules are configured. You can now track your income, expenses, and fund ledgers with complete precision.
                </p>
              </div>

              {/* Summary recap box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Currency:</span>
                  <span className="font-bold text-slate-800">{selectedCurrency} ({selectedSymbol})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Configured Funds:</span>
                  <span className="font-bold text-slate-800">{editableFunds.length} Funds (100% Rules)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Opening Capital:</span>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(
                      editableFunds.reduce((sum, f) => sum + (f.openingBalance || 0), 0),
                      { currencySymbol: selectedSymbol }
                    )}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-sm shadow-md transition-all flex items-center gap-2"
                >
                  Launch RizqWise Dashboard <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
