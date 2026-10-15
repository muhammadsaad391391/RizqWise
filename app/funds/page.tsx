'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFinance } from '@/lib/context/finance-context';
import { formatCurrency, validateAllocationRules } from '@/lib/finance-engine';
import { IconRenderer } from '@/components/common/icon-renderer';
import { Fund } from '@/types/finance';
import {
  Layers,
  Plus,
  Percent,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  X,
  Sliders,
  DollarSign,
} from 'lucide-react';

const COLOR_OPTIONS = [
  '#0284C7', '#F59E0B', '#8B5CF6', '#10B981', '#6366F1', '#EF4444', '#64748B',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#D97706',
];

const ICON_OPTIONS = [
  'TrendingUp', 'Briefcase', 'ShoppingBag', 'PiggyBank', 'GraduationCap', 'ShieldAlert',
  'Sparkles', 'Wallet', 'Home', 'Car', 'Laptop', 'HeartHandshake', 'Folder',
];

export default function FundsPage() {
  const { funds, summary, settings, addFund, updateFund, deleteFund, updateAllocationRules } = useFinance();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);

  // Add Fund Form state
  const [fundName, setFundName] = useState('');
  const [fundIcon, setFundIcon] = useState('Folder');
  const [fundColor, setFundColor] = useState('#F59E0B');
  const [fundPercentage, setFundPercentage] = useState('0');
  const [fundOpeningBalance, setFundOpeningBalance] = useState('0');
  const [fundBudget, setFundBudget] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Allocation Rules Editor state
  const [rulesState, setRulesState] = useState<Record<string, number>>({});

  const activeFunds = useMemo(() => funds.filter((f) => !f.isArchived), [funds]);
  const rulesValidation = useMemo(() => validateAllocationRules(activeFunds), [activeFunds]);

  const openRulesEditor = () => {
    const initial: Record<string, number> = {};
    activeFunds.forEach((f) => {
      initial[f.id] = f.allocationPercentage;
    });
    setRulesState(initial);
    setIsRulesModalOpen(true);
  };

  const handleSaveRules = () => {
    const total = Object.values(rulesState).reduce((a, b) => a + (Number(b) || 0), 0);
    const rounded = Math.round(total * 100) / 100;
    if (rounded !== 100) {
      setErrorMsg(`Allocations must total 100%. Current total: ${rounded}%`);
      return;
    }

    const payload = Object.entries(rulesState).map(([fundId, percentage]) => ({
      fundId,
      percentage: Number(percentage) || 0,
    }));

    const res = updateAllocationRules(payload);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update rules');
      return;
    }
    setIsRulesModalOpen(false);
    setErrorMsg(null);
  };

  const handleSaveFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundName.trim()) {
      setErrorMsg('Fund name is required.');
      return;
    }

    if (editingFund) {
      updateFund(editingFund.id, {
        name: fundName.trim(),
        icon: fundIcon,
        color: fundColor,
        monthlyBudget: fundBudget ? parseFloat(fundBudget) : null,
      });
      setEditingFund(null);
    } else {
      addFund({
        name: fundName.trim(),
        icon: fundIcon,
        color: fundColor,
        allocationPercentage: parseFloat(fundPercentage) || 0,
        openingBalance: parseFloat(fundOpeningBalance) || 0,
        monthlyBudget: fundBudget ? parseFloat(fundBudget) : null,
      });
      setIsAddModalOpen(false);
    }

    // Reset
    setFundName('');
    setFundIcon('Folder');
    setFundColor('#F59E0B');
    setFundPercentage('0');
    setFundOpeningBalance('0');
    setFundBudget('');
    setErrorMsg(null);
  };

  const startEditFund = (f: Fund) => {
    setEditingFund(f);
    setFundName(f.name);
    setFundIcon(f.icon);
    setFundColor(f.color);
    setFundPercentage(f.allocationPercentage.toString());
    setFundOpeningBalance(f.openingBalance.toString());
    setFundBudget(f.monthlyBudget ? f.monthlyBudget.toString() : '');
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            My Financial Funds
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Divide your incoming wealth into designated funds and track allocations, spending, and balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openRulesEditor}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Percent className="w-4 h-4 text-amber-600" />
            Allocation Rules ({rulesValidation.totalPercentage}%)
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingFund(null);
              setFundName('');
              setFundIcon('Folder');
              setFundColor('#F59E0B');
              setFundPercentage('0');
              setFundOpeningBalance('0');
              setFundBudget('');
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-header hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Fund
          </button>
        </div>
      </div>

      {/* Allocation Rule Status Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          rulesValidation.isValid
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : 'bg-amber-50/80 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {rulesValidation.isValid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <div className="font-bold">
              {rulesValidation.isValid
                ? 'Automatic Allocation Rules are 100% Configured'
                : 'Allocation Rules Need Adjustment'}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              {rulesValidation.isValid
                ? 'Whenever you record income, it will be automatically distributed according to your set rules.'
                : rulesValidation.message}
            </div>
          </div>
        </div>
        {!rulesValidation.isValid && (
          <button
            type="button"
            onClick={openRulesEditor}
            className="px-3 py-1.5 bg-amber-600 text-white font-bold rounded-xl text-xs hover:bg-amber-700 shrink-0"
          >
            Fix Percentages
          </button>
        )}
      </div>

      {/* Funds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeFunds.map((fund) => {
          const calc = summary.fundCalculations[fund.id] || {
            currentBalance: fund.openingBalance || 0,
            lifetimeAllocated: 0,
            lifetimeSpent: 0,
            transfersReceived: 0,
            transfersSent: 0,
            periodAllocated: 0,
            periodSpent: 0,
            budgetSpent: 0,
          };
          const isNegative = calc.currentBalance < 0;

          return (
            <div
              key={fund.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 flex flex-col justify-between hover:border-amber-400 transition-all group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: fund.color }}
                    >
                      <IconRenderer name={fund.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
                        {fund.name}
                      </h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {fund.allocationPercentage}% of Income
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEditFund(fund)}
                      aria-label="Edit fund"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove or archive "${fund.name}"?`)) {
                          deleteFund(fund.id);
                        }
                      }}
                      aria-label="Delete fund"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Available Balance */}
                <div className="mt-4 p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Current Available Balance
                  </span>
                  <div
                    className={`text-2xl font-black tracking-tight mt-0.5 ${
                      isNegative ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {formatCurrency(calc.currentBalance, settings)}
                  </div>
                </div>

                {/* Lifetime Stats */}
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
                    <span className="text-[10px] text-emerald-800 font-semibold block">
                      Lifetime Allocated
                    </span>
                    <span className="font-extrabold text-emerald-700">
                      +{formatCurrency(calc.lifetimeAllocated, settings)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      Lifetime Spent
                    </span>
                    <span className="font-extrabold text-slate-800">
                      -{formatCurrency(calc.lifetimeSpent, settings)}
                    </span>
                  </div>
                </div>

                {/* Opening balance indicator if present */}
                {fund.openingBalance > 0 && (
                  <div className="mt-2 text-[11px] text-slate-500 font-medium">
                    Initial Capital: {formatCurrency(fund.openingBalance, settings)}
                  </div>
                )}
              </div>

              {/* Action Link to Detail Page */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <Link
                  href={`/funds/${fund.id}`}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-slate-100 group-hover:bg-amber-400 group-hover:text-slate-950 text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  View Detailed Ledger <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: ADD / EDIT FUND */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-brand-header px-5 py-4 flex items-center justify-between border-b border-brand-500/20">
              <h3 className="font-bold text-slate-950">
                {editingFund ? 'Edit Fund' : 'Create New Fund'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-700 hover:text-slate-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFund} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Fund Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Travel Fund, Tech Equipment"
                  value={fundName}
                  onChange={(e) => setFundName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              {/* Icon & Color Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Icon</label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl max-h-28 overflow-y-auto">
                    {ICON_OPTIONS.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setFundIcon(ic)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          fundIcon === ic ? 'bg-amber-400 text-slate-900 ring-2 ring-amber-500' : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <IconRenderer name={ic} className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Color</label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl max-h-28 overflow-y-auto">
                    {COLOR_OPTIONS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setFundColor(col)}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          fundColor === col ? 'scale-110 ring-2 ring-offset-2 ring-amber-500' : ''
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Opening balance & Monthly budget */}
              {!editingFund && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Initial Capital ({settings.currencySymbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={fundOpeningBalance}
                      onChange={(e) => setFundOpeningBalance(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Monthly Budget Cap
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Optional"
                      value={fundBudget}
                      onChange={(e) => setFundBudget(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {editingFund && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Monthly Budget Cap ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Optional monthly spending cap"
                    value={fundBudget}
                    onChange={(e) => setFundBudget(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl shadow-md"
                >
                  {editingFund ? 'Save Changes' : 'Create Fund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ALLOCATION RULES EDITOR (Ensuring strict 100% total) */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-brand-header px-5 py-4 flex items-center justify-between border-b border-brand-500/20">
              <div>
                <h3 className="font-bold text-slate-950">Default Allocation Rules</h3>
                <p className="text-xs text-amber-950/80">
                  Changing rules applies only to FUTURE income transactions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(false)}
                className="text-slate-700 hover:text-slate-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Live percentage sum indicator */}
              {(() => {
                const total = Object.values(rulesState).reduce((a, b) => a + (Number(b) || 0), 0);
                const rounded = Math.round(total * 100) / 100;
                const isValid = rounded === 100;

                return (
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                      isValid
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <span>
                      {isValid
                        ? 'Allocation rules total exactly 100% (Ready to Save)'
                        : `Current Total: ${rounded}% (${100 - rounded}% remaining)`}
                    </span>
                    <span className="text-sm font-extrabold">{rounded}%</span>
                  </div>
                );
              })()}

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {activeFunds.map((fund) => (
                  <div
                    key={fund.id}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: fund.color }}
                      >
                        <IconRenderer name={fund.icon} className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-slate-800">{fund.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={rulesState[fund.id] ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setRulesState((prev) => ({ ...prev, [fund.id]: val }));
                        }}
                        className="w-16 px-2 py-1 text-center font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-amber-500"
                      />
                      <span className="font-bold text-slate-500">%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRulesModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRules}
                  className="px-5 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl shadow-md"
                >
                  Save Allocation Rules
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
