'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '@/lib/context/finance-context';
import { IconRenderer } from '@/components/common/icon-renderer';
import { formatCurrency, calculateAllocations, validateAllocationRules } from '@/lib/finance-engine';
import { INCOME_SOURCES, PAYMENT_METHODS } from '@/lib/initial-data';
import { FundAllocationSnapshot } from '@/types/finance';
import { format } from 'date-fns';
import { X, ArrowRightLeft, ArrowDownRight, ArrowUpRight, AlertTriangle, CheckCircle2, AlertCircle, PlusCircle } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'expense' | 'income' | 'transfer';
  initialFundId?: string;
}

export function TransactionModal({
  isOpen,
  onClose,
  initialType = 'expense',
  initialFundId,
}: TransactionModalProps) {
  const {
    funds,
    categories,
    settings,
    summary,
    addExpense,
    addIncome,
    addTransfer,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'expense' | 'income' | 'transfer'>(initialType);

  // Common Fields
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Expense Fields
  const [expenseTitle, setExpenseTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedFundId, setSelectedFundId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [forceNegative, setForceNegative] = useState(false);

  // Income Fields
  const [incomeSource, setIncomeSource] = useState('Salary');
  const [allocationMethod, setAllocationMethod] = useState<'automatic' | 'manual' | 'none'>('automatic');
  const [manualAllocations, setManualAllocations] = useState<Record<string, number>>({});

  // Transfer Fields
  const [fromFundId, setFromFundId] = useState('');
  const [toFundId, setToFundId] = useState('');

  // Error & Status
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  // Reset or preset fields on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialType);
      setAmountStr('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setDescription('');
      setNotes('');
      setExpenseTitle('');
      setErrorMsg(null);
      setWarningMsg(null);
      setNeedsConfirmation(false);
      setForceNegative(false);

      const activeFunds = funds.filter((f) => !f.isArchived);
      if (initialFundId) {
        setSelectedFundId(initialFundId);
        setFromFundId(initialFundId);
      } else if (activeFunds.length > 0) {
        setSelectedFundId(activeFunds[0].id);
        setFromFundId(activeFunds[0].id);
      }

      if (activeFunds.length > 1) {
        setToFundId(activeFunds[1].id);
      }

      if (categories.length > 0) {
        setSelectedCategoryId(categories[0].id);
        setExpenseTitle(categories[0].name);
      }
    }
  }, [isOpen, initialType, initialFundId, funds, categories]);

  const activeFunds = useMemo(() => funds.filter((f) => !f.isArchived), [funds]);
  const numAmount = parseFloat(amountStr) || 0;

  // Selected Fund Balance for Expense
  const currentFundBalance = useMemo(() => {
    if (!selectedFundId) return 0;
    return summary.fundCalculations[selectedFundId]?.currentBalance ?? 0;
  }, [selectedFundId, summary]);

  // Source Fund Balance for Transfer
  const fromFundBalance = useMemo(() => {
    if (!fromFundId) return 0;
    return summary.fundCalculations[fromFundId]?.currentBalance ?? 0;
  }, [fromFundId, summary]);

  // Check Expense / Transfer Overdraft Warning
  useEffect(() => {
    if (activeTab === 'expense' && selectedFundId && numAmount > 0) {
      if (numAmount > currentFundBalance) {
        const diff = numAmount - currentFundBalance;
        if (settings.allowNegativeBalance) {
          setWarningMsg(
            `Expense exceeds available fund balance by ${formatCurrency(diff, settings)}. Requires confirmation.`
          );
          setNeedsConfirmation(true);
        } else {
          setErrorMsg(
            `Insufficient balance. Fund has only ${formatCurrency(currentFundBalance, settings)} available.`
          );
        }
      } else {
        setWarningMsg(null);
        setErrorMsg(null);
        setNeedsConfirmation(false);
      }
    } else if (activeTab === 'transfer' && fromFundId && numAmount > 0) {
      if (numAmount > fromFundBalance) {
        const diff = numAmount - fromFundBalance;
        if (settings.allowNegativeBalance) {
          setWarningMsg(
            `Transfer exceeds source fund balance by ${formatCurrency(diff, settings)}. Requires confirmation.`
          );
          setNeedsConfirmation(true);
        } else {
          setErrorMsg(
            `Insufficient balance. Source fund has only ${formatCurrency(fromFundBalance, settings)} available.`
          );
        }
      } else {
        setWarningMsg(null);
        setErrorMsg(null);
        setNeedsConfirmation(false);
      }
    } else {
      setWarningMsg(null);
      setErrorMsg(null);
      setNeedsConfirmation(false);
    }
  }, [numAmount, selectedFundId, currentFundBalance, activeTab, fromFundId, fromFundBalance, settings]);

  // Dynamic automatic allocation calculation for Income preview
  const autoAllocations = useMemo(() => {
    if (activeTab !== 'income' || numAmount <= 0) return [];
    return calculateAllocations(numAmount, activeFunds);
  }, [activeTab, numAmount, activeFunds]);

  // Sync manual allocations when switching to manual
  useEffect(() => {
    if (activeTab === 'income' && allocationMethod === 'manual' && autoAllocations.length > 0) {
      const initial: Record<string, number> = {};
      autoAllocations.forEach((a) => {
        initial[a.fundId] = a.amount;
      });
      setManualAllocations(initial);
    }
  }, [activeTab, allocationMethod, autoAllocations]);

  const rulesValidation = useMemo(() => validateAllocationRules(activeFunds), [activeFunds]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }

    if (activeTab === 'expense') {
      const cat = categories.find((c) => c.id === selectedCategoryId);
      const res = addExpense({
        amount: numAmount,
        title: expenseTitle || cat?.name || 'Expense',
        date,
        fundId: selectedFundId,
        category: cat?.name || 'Other',
        description,
        notes,
        paymentMethod,
        forceAllowNegative: forceNegative,
      });

      if (!res.success) {
        if (res.requiresConfirmation) {
          setNeedsConfirmation(true);
          setWarningMsg(res.error || 'Overdraft requires confirmation.');
        } else {
          setErrorMsg(res.error || 'Failed to record expense.');
        }
        return;
      }

      onClose();
    } else if (activeTab === 'income') {
      let customList: FundAllocationSnapshot[] | undefined = undefined;

      if (allocationMethod === 'manual') {
        customList = activeFunds.map((f) => ({
          fundId: f.id,
          fundName: f.name,
          percentage: f.allocationPercentage,
          amount: Number(manualAllocations[f.id]) || 0,
        }));
      }

      const res = addIncome({
        amount: numAmount,
        source: incomeSource,
        date,
        description: description || `Income: ${incomeSource}`,
        notes,
        allocationMethod,
        customAllocations: customList,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to record income.');
        return;
      }

      onClose();
    } else if (activeTab === 'transfer') {
      const fromFund = funds.find((f) => f.id === fromFundId);
      const toFund = funds.find((f) => f.id === toFundId);

      const res = addTransfer({
        amount: numAmount,
        fromFundId,
        toFundId,
        date,
        title: `Transfer: ${fromFund?.name} → ${toFund?.name}`,
        description,
        notes,
        forceAllowNegative: forceNegative,
      });

      if (!res.success) {
        if (res.requiresConfirmation) {
          setNeedsConfirmation(true);
          setWarningMsg(res.error || 'Overdraft requires confirmation.');
        } else {
          setErrorMsg(res.error || 'Failed to execute transfer.');
        }
        return;
      }

      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-surface-border flex flex-col max-h-[92vh]">
        {/* Header - Warm Yellow inspired by reference screenshot */}
        <div className="bg-brand-header px-5 py-4 flex flex-col gap-3 border-b border-brand-500/20">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-amber-950 font-medium hover:opacity-75 transition-opacity text-sm py-1 px-2 -ml-2 rounded-lg"
            >
              Cancel
            </button>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {activeTab === 'expense' && 'Add Expense'}
              {activeTab === 'income' && 'Add Income'}
              {activeTab === 'transfer' && 'Transfer Funds'}
            </h2>
            <div className="w-12 text-right">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-black/10 text-slate-900">
                {settings.currency}
              </span>
            </div>
          </div>

          {/* Segmented Tab Control (Exact style from reference screenshot) */}
          <div className="grid grid-cols-3 gap-1 bg-amber-200/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('expense');
                setErrorMsg(null);
                setWarningMsg(null);
              }}
              className={`py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'expense'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-amber-950 hover:bg-amber-300/50'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('income');
                setErrorMsg(null);
                setWarningMsg(null);
              }}
              className={`py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'income'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-amber-950 hover:bg-amber-300/50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Income
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('transfer');
                setErrorMsg(null);
                setWarningMsg(null);
              }}
              className={`py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'transfer'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-amber-950 hover:bg-amber-300/50'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              Transfer
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Amount Input Display */}
          <div className="bg-surface-50 p-4 rounded-xl border border-surface-border">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Amount ({settings.currencySymbol})
            </label>
            <div className="relative flex items-center">
              <span className="text-2xl font-bold text-slate-400 mr-2">{settings.currencySymbol}</span>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                autoFocus
                required
                className="w-full text-3xl font-extrabold text-slate-900 bg-transparent focus:outline-none placeholder-slate-300"
              />
            </div>
            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60">
              {[500, 1000, 5000, 10000, 50000].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setAmountStr(quick.toString())}
                  className="px-2 py-1 text-xs font-medium rounded-md bg-white border border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-600 transition-colors"
                >
                  +{quick.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Error & Warning Messages */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              <div className="leading-snug">{errorMsg}</div>
            </div>
          )}

          {warningMsg && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <div className="leading-snug">{warningMsg}</div>
                {needsConfirmation && (
                  <label className="flex items-center gap-2 mt-2 pt-1 border-t border-amber-200/60 cursor-pointer text-xs font-semibold text-amber-900">
                    <input
                      type="checkbox"
                      checked={forceNegative}
                      onChange={(e) => setForceNegative(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
                    />
                    I explicitly confirm this overdraft.
                  </label>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: EXPENSE FORM */}
          {activeTab === 'expense' && (
            <div className="space-y-4">
              {/* Fund Selection with Available Balance */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Deduct from Fund <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeFunds.map((fund) => {
                    const balance = summary.fundCalculations[fund.id]?.currentBalance ?? 0;
                    const isSelected = selectedFundId === fund.id;
                    const isWarning = isSelected && numAmount > balance;

                    return (
                      <button
                        key={fund.id}
                        type="button"
                        onClick={() => setSelectedFundId(fund.id)}
                        className={`p-2.5 text-left rounded-xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? isWarning
                              ? 'border-red-400 bg-red-50/50 shadow-sm'
                              : 'border-amber-400 bg-amber-50/40 shadow-sm ring-1 ring-amber-400'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                            style={{ backgroundColor: fund.color }}
                          >
                            <IconRenderer name={fund.icon} className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-slate-800 truncate">{fund.name}</div>
                            <div className={`text-[11px] font-medium ${balance < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                              Avail: {formatCurrency(balance, settings)}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-amber-500 ml-1 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Grid - Inspired by Reference Screenshot 1 */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Select Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          if (!expenseTitle || categories.some((c) => c.name === expenseTitle)) {
                            setExpenseTitle(cat.name);
                          }
                        }}
                        className={`flex flex-col items-center p-2 rounded-xl border transition-all text-center ${
                          isSelected
                            ? 'bg-amber-100/70 border-amber-400 shadow-sm scale-105'
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${
                            isSelected ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <IconRenderer name={cat.icon} className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-medium text-slate-700 mt-1.5 leading-tight line-clamp-1">
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expense Title & Date & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Expense Title
                  </label>
                  <input
                    type="text"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    placeholder="e.g. Office Lunch, Software Renewal"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Description / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details or vendor info..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: INCOME FORM WITH AUTOMATIC FUND ALLOCATION */}
          {activeTab === 'income' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Income Source <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={incomeSource}
                    onChange={(e) => setIncomeSource(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white"
                  >
                    {INCOME_SOURCES.map((src) => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Date Received <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. October Client Payment, Monthly Salary"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              {/* Allocation Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Fund Allocation Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAllocationMethod('automatic')}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                      allocationMethod === 'automatic'
                        ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ⚡ Automatic Rules
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocationMethod('manual')}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                      allocationMethod === 'manual'
                        ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ✏️ Custom Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocationMethod('none')}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                      allocationMethod === 'none'
                        ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🚫 No Allocation
                  </button>
                </div>
              </div>

              {/* Fund Allocation Live Preview Box */}
              {allocationMethod === 'automatic' && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Automatic Allocation Breakdown
                    </span>
                    <span className={`font-bold flex items-center gap-1 ${rulesValidation.isValid ? 'text-emerald-600' : 'text-red-500'}`}>
                      {rulesValidation.isValid ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> 100% Rules Total
                        </>
                      ) : (
                        `Rules: ${rulesValidation.totalPercentage}%`
                      )}
                    </span>
                  </div>

                  {numAmount > 0 ? (
                    <div className="space-y-1.5 divide-y divide-slate-100 text-xs">
                      {autoAllocations.map((alloc) => (
                        <div key={alloc.fundId} className="pt-1.5 flex items-center justify-between">
                          <span className="font-medium text-slate-700">
                            {alloc.fundName}{' '}
                            <span className="text-slate-400 text-[11px]">({alloc.percentage}%)</span>
                          </span>
                          <span className="font-bold text-emerald-600">
                            +{formatCurrency(alloc.amount, settings)}
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 flex items-center justify-between font-bold text-slate-900 border-t border-slate-200">
                        <span>Total Allocated:</span>
                        <span>{formatCurrency(numAmount, settings)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Enter an income amount above to preview fund distribution.
                    </p>
                  )}
                </div>
              )}

              {/* Manual Allocation Mode Editor */}
              {allocationMethod === 'manual' && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    Custom Amount for Each Fund:
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeFunds.map((fund) => (
                      <div key={fund.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-slate-700 truncate">{fund.name}</span>
                        <div className="flex items-center gap-1 w-36">
                          <span className="text-slate-400 text-xs">{settings.currencySymbol}</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={manualAllocations[fund.id] ?? 0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setManualAllocations((prev) => ({ ...prev, [fund.id]: val }));
                            }}
                            className="w-full px-2 py-1 text-right text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Total check for manual allocation */}
                  {numAmount > 0 && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                      <span>Sum: {formatCurrency(Object.values(manualAllocations).reduce((a, b) => a + b, 0), settings)}</span>
                      <span>Target: {formatCurrency(numAmount, settings)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRANSFER BETWEEN FUNDS */}
          {activeTab === 'transfer' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* From Fund */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    From Fund (Sender) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fromFundId}
                    onChange={(e) => setFromFundId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white font-medium"
                  >
                    {activeFunds.map((f) => {
                      const bal = summary.fundCalculations[f.id]?.currentBalance ?? 0;
                      return (
                        <option key={f.id} value={f.id} disabled={f.id === toFundId}>
                          {f.name} ({formatCurrency(bal, settings)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* To Fund */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    To Fund (Recipient) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={toFundId}
                    onChange={(e) => setToFundId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white font-medium"
                  >
                    {activeFunds.map((f) => {
                      const bal = summary.fundCalculations[f.id]?.currentBalance ?? 0;
                      return (
                        <option key={f.id} value={f.id} disabled={f.id === fromFundId}>
                          {f.name} ({formatCurrency(bal, settings)})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Transfer Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Description / Reason
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Reallocating profits to investments"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              {/* Informative transfer note */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-blue-800 leading-relaxed">
                ℹ️ <strong>Accounting Note:</strong> Transfers move money between your internal funds. They preserve your total available balance and are never counted as new income or expense.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={needsConfirmation && !forceNegative}
              className="px-6 py-2.5 text-sm font-bold bg-amber-400 text-slate-900 hover:bg-amber-500 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
