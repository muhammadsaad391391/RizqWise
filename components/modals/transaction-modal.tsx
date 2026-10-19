'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '@/lib/context/finance-context';
import { IconRenderer } from '@/components/common/icon-renderer';
import {
  formatCurrency,
  calculateAllocations,
  calculateAllocationsWithDeficitAdjustment,
  validateAllocationRules,
} from '@/lib/finance-engine';
import { INCOME_SOURCES, PAYMENT_METHODS } from '@/lib/initial-data';
import {
  FundAllocationSnapshot,
  Transaction,
  IncomeTransaction,
  ExpenseTransaction,
  TransferTransaction,
} from '@/types/finance';
import { format } from 'date-fns';
import { X, ArrowRightLeft, ArrowDownRight, ArrowUpRight, AlertTriangle, CheckCircle2, AlertCircle, PlusCircle, Plus, Edit2 } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'expense' | 'income' | 'transfer';
  initialFundId?: string;
  transactionToEdit?: Transaction | null;
}

export function TransactionModal({
  isOpen,
  onClose,
  initialType = 'expense',
  initialFundId,
  transactionToEdit = null,
}: TransactionModalProps) {
  const {
    funds,
    categories,
    settings,
    summary,
    customStats,
    addExpense,
    addIncome,
    addTransfer,
    updateTransaction,
    addCategory,
    updateAllocationRules,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'expense' | 'income' | 'transfer'>(initialType);

  // Inline Category Creation State (Expense & Income)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatColor, setNewCatColor] = useState('#F59E0B');

  const [isCreatingIncomeCat, setIsCreatingIncomeCat] = useState(false);
  const [newIncomeCatName, setNewIncomeCatName] = useState('');
  const [newIncomeCatIcon, setNewIncomeCatIcon] = useState('Coins');
  const [newIncomeCatColor, setNewIncomeCatColor] = useState('#10B981');

  // Inline Allocation Adjustment State
  const [isEditingRulesInline, setIsEditingRulesInline] = useState(false);
  const [inlineRules, setInlineRules] = useState<Record<string, number>>({});

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
  const [autoClearDeficit, setAutoClearDeficit] = useState(true);
  const [spendableFundIds, setSpendableFundIds] = useState<string[]>([]);

  // Transfer Fields
  const [fromFundId, setFromFundId] = useState('');
  const [toFundId, setToFundId] = useState('');

  // Error & Status
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  // Reset or preset fields on open or when editing a transaction
  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setActiveTab(transactionToEdit.type);
        setAmountStr(transactionToEdit.amount.toString());
        setDate(transactionToEdit.date || format(new Date(), 'yyyy-MM-dd'));
        setDescription(transactionToEdit.description || '');
        setNotes(transactionToEdit.notes || '');
        setErrorMsg(null);
        setWarningMsg(null);
        setNeedsConfirmation(false);
        setForceNegative(false);

        if (transactionToEdit.type === 'expense') {
          const exp = transactionToEdit as ExpenseTransaction;
          setExpenseTitle(exp.title || '');
          setSelectedFundId(exp.fundId || '');
          setPaymentMethod(exp.paymentMethod || 'Cash');
          const cat = categories.find(
            (c) => c.name.toLowerCase() === exp.category.toLowerCase()
          );
          if (cat) {
            setSelectedCategoryId(cat.id);
          } else if (categories.length > 0) {
            setSelectedCategoryId(categories[0].id);
          }
        } else if (transactionToEdit.type === 'income') {
          const inc = transactionToEdit as IncomeTransaction;
          setIncomeSource(inc.source || 'Salary');
          setAllocationMethod(inc.allocationMethod || 'automatic');
          if (inc.allocationMethod === 'manual' && inc.allocations) {
            const manualMap: Record<string, number> = {};
            inc.allocations.forEach((a) => {
              manualMap[a.fundId] = a.amount;
            });
            setManualAllocations(manualMap);
          }
        } else if (transactionToEdit.type === 'transfer') {
          const trf = transactionToEdit as TransferTransaction;
          setFromFundId(trf.fromFundId || '');
          setToFundId(trf.toFundId || '');
        }
      } else {
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

        const expCats = categories.filter((c) => c.type === 'expense' || !c.type);
        if (expCats.length > 0) {
          setSelectedCategoryId(expCats[0].id);
          setExpenseTitle(expCats[0].name);
        }
        const incCats = categories.filter((c) => c.type === 'income');
        if (incCats.length > 0) {
          setIncomeSource(incCats[0].name);
        }
      }

      // Initialize spendable funds (Personal, Brother, Spend, Pocket, Mine, etc.)
      const deficitFundIdSet = new Set((summary.deficitFunds || []).map((df) => df.fundId));
      const matching = funds
        .filter((f) => !f.isArchived && !deficitFundIdSet.has(f.id))
        .filter((f) => {
          const n = f.name.toLowerCase();
          return (
            n.includes('personal') ||
            n.includes('brother') ||
            n.includes('spend') ||
            n.includes('pocket') ||
            n.includes('mine')
          );
        })
        .map((f) => f.id);

      // Also check if any custom combined stat contains "spend" in its name and include its funds
      if (customStats) {
        customStats
          .filter((s) => s.name.toLowerCase().includes('spend'))
          .forEach((s) => {
            s.fundIds.forEach((fid) => {
              if (!deficitFundIdSet.has(fid) && !matching.includes(fid)) {
                matching.push(fid);
              }
            });
          });
      }

      if (matching.length > 0) {
        setSpendableFundIds(matching);
      } else {
        const nonDeficit = funds
          .filter((f) => !f.isArchived && !deficitFundIdSet.has(f.id))
          .filter((f) => (summary.fundCalculations[f.id]?.currentBalance ?? 0) >= 0);
        setSpendableFundIds(nonDeficit.length > 0 ? [nonDeficit[0].id] : []);
      }
      setAutoClearDeficit(true);
    }
  }, [isOpen, transactionToEdit, initialType, initialFundId, funds, categories, summary.fundCalculations, summary.deficitFunds, customStats]);

  const activeFunds = useMemo(() => funds.filter((f) => !f.isArchived), [funds]);
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense' || !c.type),
    [categories]
  );
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories]
  );
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

  // Deficit adjustment calculation for Income
  const deficitAdjustmentResult = useMemo(() => {
    if (
      !autoClearDeficit ||
      summary.totalDeficit <= 0 ||
      spendableFundIds.length === 0 ||
      numAmount <= 0
    ) {
      return null;
    }
    return calculateAllocationsWithDeficitAdjustment(
      numAmount,
      activeFunds,
      summary.deficitFunds,
      spendableFundIds
    );
  }, [autoClearDeficit, summary.totalDeficit, summary.deficitFunds, spendableFundIds, numAmount, activeFunds]);

  // Dynamic automatic allocation calculation for Income preview
  const autoAllocations = useMemo(() => {
    if (activeTab !== 'income' || numAmount <= 0) return [];
    if (
      allocationMethod === 'automatic' &&
      autoClearDeficit &&
      deficitAdjustmentResult &&
      deficitAdjustmentResult.totalDeficitCleared > 0
    ) {
      return deficitAdjustmentResult.snapshots;
    }
    return calculateAllocations(numAmount, activeFunds);
  }, [activeTab, numAmount, activeFunds, allocationMethod, autoClearDeficit, deficitAdjustmentResult]);

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

    // UPDATE EXISTING TRANSACTION FLOW
    if (transactionToEdit) {
      if (activeTab === 'expense') {
        const cat = categories.find((c) => c.id === selectedCategoryId);
        const res = updateTransaction(transactionToEdit.id, {
          amount: numAmount,
          title: expenseTitle || cat?.name || 'Expense',
          date,
          fundId: selectedFundId,
          category: cat?.name || 'Other',
          description,
          notes,
          paymentMethod,
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to update expense.');
          return;
        }

        onClose();
        return;
      } else if (activeTab === 'income') {
        let customList: FundAllocationSnapshot[] | undefined = undefined;

        if (allocationMethod === 'manual') {
          customList = activeFunds.map((f) => ({
            fundId: f.id,
            fundName: f.name,
            percentage: f.allocationPercentage,
            amount: Number(manualAllocations[f.id]) || 0,
          }));
        } else if (allocationMethod === 'automatic') {
          if (autoClearDeficit && deficitAdjustmentResult && deficitAdjustmentResult.totalDeficitCleared > 0) {
            customList = deficitAdjustmentResult.snapshots;
          } else {
            customList = calculateAllocations(numAmount, activeFunds);
          }
        } else {
          customList = [];
        }

        const res = updateTransaction(transactionToEdit.id, {
          amount: numAmount,
          source: incomeSource,
          date,
          description: description || `Income: ${incomeSource}`,
          notes,
          allocationMethod,
          allocations: customList,
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to update income.');
          return;
        }

        onClose();
        return;
      } else if (activeTab === 'transfer') {
        const fromFund = funds.find((f) => f.id === fromFundId);
        const toFund = funds.find((f) => f.id === toFundId);

        const res = updateTransaction(transactionToEdit.id, {
          amount: numAmount,
          fromFundId,
          toFundId,
          date,
          title: `Transfer: ${fromFund?.name} → ${toFund?.name}`,
          description,
          notes,
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to update transfer.');
          return;
        }

        onClose();
        return;
      }
    }

    // CREATE NEW TRANSACTION FLOW
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
      } else if (
        allocationMethod === 'automatic' &&
        autoClearDeficit &&
        deficitAdjustmentResult &&
        deficitAdjustmentResult.totalDeficitCleared > 0
      ) {
        customList = deficitAdjustmentResult.snapshots;
      }

      let finalNotes = notes;
      if (
        allocationMethod === 'automatic' &&
        autoClearDeficit &&
        deficitAdjustmentResult &&
        deficitAdjustmentResult.totalDeficitCleared > 0
      ) {
        const clearedInfo = `Auto-cleared deficit: ${formatCurrency(
          deficitAdjustmentResult.totalDeficitCleared,
          settings
        )} routed to clear deficits and deducted from spendable funds.`;
        finalNotes = finalNotes ? `${finalNotes} | ${clearedInfo}` : clearedInfo;
      }

      const res = addIncome({
        amount: numAmount,
        source: incomeSource,
        date,
        description: description || `Income: ${incomeSource}`,
        notes: finalNotes,
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
            <div className="flex items-center gap-2">
              {transactionToEdit && (
                <div className="w-6 h-6 rounded-md bg-amber-400 text-slate-900 flex items-center justify-center shadow-xs">
                  <Edit2 className="w-3.5 h-3.5" />
                </div>
              )}
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {transactionToEdit
                  ? activeTab === 'expense'
                    ? 'Edit Expense'
                    : activeTab === 'income'
                    ? 'Edit Income'
                    : 'Edit Transfer'
                  : activeTab === 'expense'
                  ? 'Add Expense'
                  : activeTab === 'income'
                  ? 'Add Income'
                  : 'Transfer Funds'}
              </h2>
            </div>
            <div className="w-12 text-right">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-black/10 text-slate-900">
                {settings.currency}
              </span>
            </div>
          </div>

          {/* Segmented Tab Control (Exact style from reference screenshot) */}
          {!transactionToEdit ? (
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
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-amber-200/80 text-amber-950 text-xs font-semibold flex items-center justify-between">
              <span>Editing existing record</span>
              <span className="font-bold uppercase tracking-wider text-[10px] bg-white/80 px-2 py-0.5 rounded-md shadow-xs">
                {transactionToEdit.type}
              </span>
            </div>
          )}
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-600">
                    Select Category <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isCreatingCategory ? 'Cancel' : 'New Category'}
                  </button>
                </div>

                {/* Inline Category Creator */}
                {isCreatingCategory && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                    <span className="font-bold text-amber-950 block">Create Custom Category</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Category Name (e.g. Groceries, Gym, Charity)"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newCatName.trim()) return;
                          const created = addCategory({
                            name: newCatName.trim(),
                            icon: newCatIcon,
                            color: newCatColor,
                            type: 'expense',
                          });
                          setSelectedCategoryId(created.id);
                          setExpenseTitle(created.name);
                          setNewCatName('');
                          setIsCreatingCategory(false);
                        }}
                        className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 font-bold text-slate-950 rounded-lg transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {expenseCategories.map((cat) => {
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

                  {/* + Button at end of category grid (Reference Screenshot 1!) */}
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                    className="flex flex-col items-center p-2 rounded-xl border border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/50 transition-all text-center"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:text-amber-700 hover:bg-amber-100 transition-colors">
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 mt-1.5 leading-tight">
                      + Add
                    </span>
                  </button>
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
              {/* Income Category Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-600">
                    Income Category / Source <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingIncomeCat(!isCreatingIncomeCat)}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isCreatingIncomeCat ? 'Cancel' : 'New Category'}
                  </button>
                </div>

                {/* Inline Income Category Creator */}
                {isCreatingIncomeCat && (
                  <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                    <span className="font-bold text-emerald-950 block">Create Income Category</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Income Category (e.g. YouTube, Consulting, Bonus)"
                        value={newIncomeCatName}
                        onChange={(e) => setNewIncomeCatName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-emerald-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newIncomeCatName.trim()) return;
                          const created = addCategory({
                            name: newIncomeCatName.trim(),
                            icon: newIncomeCatIcon,
                            color: newIncomeCatColor,
                            type: 'income',
                          });
                          setIncomeSource(created.name);
                          setNewIncomeCatName('');
                          setIsCreatingIncomeCat(false);
                        }}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-white rounded-lg transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-44 overflow-y-auto p-1">
                  {incomeCategories.map((cat) => {
                    const isSelected = incomeSource === cat.name;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setIncomeSource(cat.name)}
                        className={`flex flex-col items-center p-2 rounded-xl border transition-all text-center ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 shadow-sm scale-105'
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${
                            isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
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

                  {/* + Button at end of category grid */}
                  <button
                    type="button"
                    onClick={() => setIsCreatingIncomeCat(!isCreatingIncomeCat)}
                    className="flex flex-col items-center p-2 rounded-xl border border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-center"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100 transition-colors">
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 mt-1.5 leading-tight">
                      + Add
                    </span>
                  </button>
                </div>
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

              {/* Deficit / Debit Auto-Clearance Section */}
              {summary.totalDeficit > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="autoClearDeficitCheck"
                        checked={autoClearDeficit}
                        onChange={(e) => setAutoClearDeficit(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded border-rose-300 focus:ring-rose-400 cursor-pointer"
                      />
                      <label htmlFor="autoClearDeficitCheck" className="text-xs font-bold text-rose-950 cursor-pointer flex items-center gap-1.5">
                        <span>Cut Deficit from Spendable Funds</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-200/80 text-rose-900 font-black">
                          -{formatCurrency(summary.totalDeficit, settings)}
                        </span>
                      </label>
                    </div>
                    <span className="text-[10px] text-rose-700 font-semibold">
                      {summary.deficitFunds.length} in deficit
                    </span>
                  </div>

                  {autoClearDeficit && (
                    <div className="pt-2 border-t border-rose-200/70 space-y-2 text-xs">
                      <p className="text-[11px] text-rose-800 leading-snug">
                        Automatically replenishes deficit funds to 0 and cuts that debit from your spendable funds (Personal & Brother) so you get to spend less since you already used it.
                      </p>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 block mb-1">
                          Select Spendable Fund(s) to Absorb Debit:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {activeFunds
                            .filter((f) => !summary.deficitFunds.some((df) => df.fundId === f.id))
                            .map((f) => {
                              const isChecked = spendableFundIds.includes(f.id);
                              return (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => {
                                    setSpendableFundIds((prev) =>
                                      prev.includes(f.id) ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                                    );
                                  }}
                                  className={`px-2.5 py-1 text-xs rounded-xl font-bold border flex items-center gap-1.5 transition-all ${
                                    isChecked
                                      ? 'bg-rose-500 text-white border-rose-600 shadow-2xs'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <span>{f.name}</span>
                                  {isChecked && <span className="text-[10px]">✓</span>}
                                </button>
                              );
                            })}
                        </div>
                      </div>

                      {summary.deficitFunds.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-white/95 border border-rose-200 text-[11px] text-slate-700 space-y-1.5">
                          <div className="font-bold text-rose-950 flex items-center justify-between">
                            <span>Outstanding Category Deficits:</span>
                            <span className="text-rose-700 font-black">
                              {formatCurrency(summary.totalDeficit, settings)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-600 space-y-1">
                            {summary.deficitFunds.map((df) => {
                              const clearedAmt = deficitAdjustmentResult?.clearedPerFund[df.fundId] || 0;
                              return (
                                <div key={df.fundId} className="flex justify-between items-center bg-rose-50/50 p-1.5 rounded-lg">
                                  <span>
                                    <strong>{df.fundName}:</strong>{' '}
                                    {df.currentBalance < 0
                                      ? `Overdrawn balance (-${formatCurrency(df.deficitAmount, settings)})`
                                      : `Shortfall / Deviation of ${formatCurrency(df.deficitAmount, settings)}`}
                                  </span>
                                  <span className="font-bold text-emerald-700">
                                    {numAmount > 0
                                      ? `+${formatCurrency(clearedAmt, settings)} replenishing`
                                      : 'Will replenish on income'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          {numAmount > 0 && deficitAdjustmentResult && deficitAdjustmentResult.totalDeficitCleared > 0 && (
                            <div className="pt-1 border-t border-rose-100 flex items-center justify-between text-[11px] font-bold text-emerald-800">
                              <span>Total Debit Cut from Spendable Funds:</span>
                              <span>-{formatCurrency(deficitAdjustmentResult.totalDeficitCleared, settings)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Fund Allocation Live Preview Box */}
              {allocationMethod === 'automatic' && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Automatic Allocation Breakdown
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const initial: Record<string, number> = {};
                          activeFunds.forEach((f) => {
                            initial[f.id] = f.allocationPercentage;
                          });
                          setInlineRules(initial);
                          setIsEditingRulesInline(!isEditingRulesInline);
                        }}
                        className="text-[11px] font-bold text-amber-700 hover:underline"
                      >
                        {isEditingRulesInline ? 'Done' : '✏️ Edit %'}
                      </button>
                      <span className={`font-bold flex items-center gap-1 ${rulesValidation.isValid ? 'text-emerald-600' : 'text-red-500'}`}>
                        {rulesValidation.isValid ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> 100%
                          </>
                        ) : (
                          `${rulesValidation.totalPercentage}%`
                        )}
                      </span>
                    </div>
                  </div>

                  {isEditingRulesInline && (
                    <div className="p-2.5 bg-white border border-amber-200 rounded-xl space-y-2 text-xs">
                      <span className="font-bold text-slate-800 block text-[11px]">
                        Adjust Default Fund Allocation Percentages (Must Total 100%):
                      </span>
                      <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                        {activeFunds.map((f) => (
                          <div key={f.id} className="flex items-center justify-between gap-1 p-1.5 bg-slate-50 rounded-lg">
                            <span className="truncate font-medium text-[11px]">{f.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={inlineRules[f.id] ?? f.allocationPercentage}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setInlineRules((prev) => ({ ...prev, [f.id]: val }));
                                }}
                                className="w-12 px-1 py-0.5 text-center text-xs font-bold border border-slate-300 rounded bg-white"
                              />
                              <span className="text-[10px] text-slate-400">%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-600">
                          Total: {Object.values(inlineRules).reduce((a, b) => a + b, 0)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const total = Object.values(inlineRules).reduce((a, b) => a + b, 0);
                            if (total !== 100) {
                              alert(`Total must equal 100%. Current total: ${total}%`);
                              return;
                            }
                            const payload = Object.entries(inlineRules).map(([fundId, percentage]) => ({
                              fundId,
                              percentage,
                            }));
                            updateAllocationRules(payload);
                            setIsEditingRulesInline(false);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-md"
                        >
                          Save Rules
                        </button>
                      </div>
                    </div>
                  )}

                  {numAmount > 0 ? (
                    <div className="space-y-1.5 divide-y divide-slate-100 text-xs">
                      {autoAllocations.map((alloc) => (
                        <div key={alloc.fundId} className="pt-1.5 flex items-center justify-between">
                          <div>
                            <span className="font-medium text-slate-700 block">
                              {alloc.fundName}{' '}
                              <span className="text-slate-400 text-[11px]">({alloc.percentage}%)</span>
                            </span>
                            {deficitAdjustmentResult?.clearedPerFund[alloc.fundId] && (
                              <span className="text-[10px] font-bold text-emerald-600 block">
                                +{formatCurrency(deficitAdjustmentResult.clearedPerFund[alloc.fundId], settings)} to clear deficit
                              </span>
                            )}
                            {deficitAdjustmentResult?.deductedPerSpendableFund[alloc.fundId] && (
                              <span className="text-[10px] font-bold text-rose-600 block">
                                -{formatCurrency(deficitAdjustmentResult.deductedPerSpendableFund[alloc.fundId], settings)} deficit deduction
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-emerald-600 shrink-0">
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
              {transactionToEdit
                ? activeTab === 'expense'
                  ? 'Update Expense'
                  : activeTab === 'income'
                  ? 'Update Income'
                  : 'Update Transfer'
                : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
