'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useFinance } from '@/lib/context/finance-context';
import { formatCurrency } from '@/lib/finance-engine';
import { IconRenderer } from '@/components/common/icon-renderer';
import { TransactionModal } from '@/components/modals/transaction-modal';
import { Transaction } from '@/types/finance';
import {
  ChevronLeft,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  Calendar,
  AlertTriangle,
  Receipt,
  Wallet,
  Settings,
  Plus,
  Edit2,
  X,
  Sliders,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function FundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const fundId = params.id as string;

  const {
    funds,
    transactions,
    settings,
    summary,
    selectedMonth,
    deleteTransaction,
    updateFund,
    adjustFundBalance,
  } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Direct Balance Adjustment State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustBalanceInput, setAdjustBalanceInput] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Edit Fund State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const fund = useMemo(() => funds.find((f) => f.id === fundId), [funds, fundId]);

  const [editName, setEditName] = useState(fund?.name || '');
  const [editPercent, setEditPercent] = useState(fund?.allocationPercentage?.toString() || '0');
  const [editBudget, setEditBudget] = useState(fund?.monthlyBudget ? fund.monthlyBudget.toString() : '');
  const [editOpeningBalance, setEditOpeningBalance] = useState(fund?.openingBalance?.toString() || '0');
  const [editColor, setEditColor] = useState(fund?.color || '#F59E0B');
  const [editIcon, setEditIcon] = useState(fund?.icon || 'Folder');

  const calc = useMemo(() => {
    return (
      summary.fundCalculations[fundId] || {
        fundId,
        openingBalance: fund?.openingBalance || 0,
        lifetimeAllocated: 0,
        lifetimeSpent: 0,
        transfersReceived: 0,
        transfersSent: 0,
        currentBalance: fund?.openingBalance || 0,
        periodAllocated: 0,
        periodSpent: 0,
        periodTransfersReceived: 0,
        periodTransfersSent: 0,
        monthlyBudget: fund?.monthlyBudget || null,
        budgetSpent: 0,
        budgetRemaining: fund?.monthlyBudget || null,
        budgetUtilization: 0,
      }
    );
  }, [summary, fundId, fund]);

  // Filter transactions that touched this fund
  const fundTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (t.type === 'expense' && t.fundId === fundId) return true;
        if (t.type === 'transfer' && (t.fromFundId === fundId || t.toFundId === fundId)) return true;
        if (t.type === 'income' && t.allocations?.some((a) => a.fundId === fundId)) return true;
        return false;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, fundId]);

  if (!fund) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-sm font-bold text-slate-700">Fund not found or has been removed.</p>
        <Link href="/funds" className="text-xs font-bold text-amber-700 hover:underline">
          Return to My Funds
        </Link>
      </div>
    );
  }

  const openAction = (type: 'expense' | 'income' | 'transfer') => {
    setEditingTx(null);
    setModalType(type);
    setIsModalOpen(true);
  };

  const isNegative = calc.currentBalance < 0;

  return (
    <div className="space-y-6">
      {/* Back button & Fund Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
        <div className="flex items-center gap-3">
          <Link
            href="/funds"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0"
            style={{ backgroundColor: fund.color }}
          >
            <IconRenderer name={fund.icon} className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{fund.name}</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                {fund.allocationPercentage}% of Income
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Created {format(parseISO(fund.createdAt), 'dd MMMM yyyy')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAdjustBalanceInput(calc.currentBalance.toString());
              setAdjustError(null);
              setIsAdjustModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            Edit Balance
          </button>
          <button
            type="button"
            onClick={() => {
              setEditName(fund.name);
              setEditPercent(fund.allocationPercentage.toString());
              setEditBudget(fund.monthlyBudget ? fund.monthlyBudget.toString() : '');
              setEditOpeningBalance(calc.currentBalance.toString());
              setEditColor(fund.color);
              setEditIcon(fund.icon);
              setIsEditModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Fund
          </button>
          <button
            type="button"
            onClick={() => openAction('expense')}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Spend
          </button>
          <button
            type="button"
            onClick={() => openAction('transfer')}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Transfer
          </button>
        </div>
      </div>

      {/* Primary Financial Balance & Ledger Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Available Balance */}
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-amber-400 via-amber-300 to-amber-200 p-4 sm:p-5 rounded-2xl shadow-card text-slate-950 border border-amber-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-950/80">
              Current Available
            </span>
            <button
              type="button"
              onClick={() => {
                setAdjustBalanceInput(calc.currentBalance.toString());
                setAdjustError(null);
                setIsAdjustModalOpen(true);
              }}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950/10 hover:bg-amber-950/20 text-amber-950 transition-colors"
            >
              Adjust
            </button>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 truncate ${
              isNegative ? 'text-red-700' : 'text-slate-950'
            }`}
          >
            {formatCurrency(calc.currentBalance, settings)}
          </div>
          <div className="text-[11px] text-amber-950/90 font-medium mt-1">
            {isNegative ? 'Overdrawn balance' : 'Ready to spend or invest'}
          </div>
        </div>

        {/* Total Distributed from Income */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Distributed
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1 truncate">
            +{formatCurrency(calc.totalDistributed ?? calc.lifetimeAllocated, settings)}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            From income transactions
          </div>
        </div>

        {/* Lifetime Spent for Causes */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Spent for Causes
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1 truncate">
            -{formatCurrency(calc.lifetimeSpent, settings)}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">Total expenses deducted</div>
        </div>

        {/* Net Transfers */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Net Transfers
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600 mt-1 truncate">
            {formatCurrency(calc.transfersReceived - calc.transfersSent, settings)}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            In: +{formatCurrency(calc.transfersReceived, settings)} | Out: -{formatCurrency(calc.transfersSent, settings)}
          </div>
        </div>
      </div>

      {/* Reconciliation & Deviation Status Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          calc.isReconciled
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : calc.deviation > 0
            ? 'bg-amber-50/80 border-amber-200 text-amber-900'
            : 'bg-sky-50/80 border-sky-200 text-sky-900'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {calc.isReconciled ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <div className="font-bold flex items-center gap-2">
              <span>Reconciliation Status:</span>
              <span className="px-2 py-0.5 rounded-md bg-white/80 font-black text-xs shadow-xs">
                {calc.isReconciled
                  ? '0 Difference • Fully Reconciled'
                  : calc.deviation > 0
                  ? `${formatCurrency(calc.deviation, settings)} Deviation (Unaccounted difference)`
                  : `+${formatCurrency(Math.abs(calc.deviation), settings)} Surplus`}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              {calc.isReconciled
                ? `Total distributed from income (${formatCurrency(calc.totalDistributed ?? calc.lifetimeAllocated, settings)}) perfectly equals current balance (${formatCurrency(calc.currentBalance, settings)}) + spent for causes (${formatCurrency(calc.lifetimeSpent, settings)}).`
                : calc.deviation > 0
                ? `You received ${formatCurrency(calc.totalDistributed ?? calc.lifetimeAllocated, settings)} in distributed income, but have ${formatCurrency(calc.currentBalance, settings)} available balance. Once you record an expense for this cause, the deviation returns to 0 difference.`
                : `Current balance exceeds distributed income by ${formatCurrency(Math.abs(calc.deviation), settings)}.`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setAdjustBalanceInput(calc.currentBalance.toString());
              setAdjustError(null);
              setIsAdjustModalOpen(true);
            }}
            className="px-3 py-1.5 bg-white border border-slate-300 font-bold rounded-xl text-xs text-slate-800 hover:bg-slate-50 shadow-xs"
          >
            Adjust Balance
          </button>
          {calc.deviation > 0 && (
            <button
              type="button"
              onClick={() => openAction('expense')}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-xs"
            >
              Record Cause
            </button>
          )}
        </div>
      </div>

      {/* Selected Month Activity & Monthly Budget Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Month Activity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Activity for {format(selectedMonth, 'MMMM yyyy')}
            </h3>
            <span className="text-xs text-slate-400">Selected Reporting Period</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                Month Allocated
              </span>
              <span className="text-lg font-extrabold text-emerald-700">
                +{formatCurrency(calc.periodAllocated, settings)}
              </span>
            </div>
            <div className="p-3 bg-red-50/60 border border-red-100 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-red-800 block">Month Spent</span>
              <span className="text-lg font-extrabold text-slate-900">
                -{formatCurrency(calc.periodSpent, settings)}
              </span>
            </div>
          </div>

          {fund.openingBalance > 0 && (
            <div className="pt-2 text-xs text-slate-500 border-t border-slate-100">
              Initial Capital on Record:{' '}
              <span className="font-bold text-slate-800">
                {formatCurrency(fund.openingBalance, settings)}
              </span>{' '}
              (Never counted as income)
            </div>
          )}
        </div>

        {/* Monthly Budget Tracker */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Monthly Spending Budget</h3>
            {fund.monthlyBudget && fund.monthlyBudget > 0 ? (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  (calc.budgetUtilization || 0) > 100
                    ? 'bg-red-100 text-red-800'
                    : (calc.budgetUtilization || 0) > 80
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {calc.budgetUtilization}% used
              </span>
            ) : (
              <span className="text-xs text-slate-400">Not configured</span>
            )}
          </div>

          {fund.monthlyBudget && fund.monthlyBudget > 0 ? (
            <div className="space-y-2.5 pt-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">
                  Spent: <strong>{formatCurrency(calc.budgetSpent, settings)}</strong>
                </span>
                <span className="text-slate-500">
                  Budget Cap: <strong>{formatCurrency(fund.monthlyBudget, settings)}</strong>
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (calc.budgetUtilization || 0) > 100
                      ? 'bg-red-500'
                      : (calc.budgetUtilization || 0) > 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, calc.budgetUtilization || 0)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500">
                Remaining Budget:{' '}
                <strong
                  className={
                    (calc.budgetRemaining || 0) < 0 ? 'text-red-600' : 'text-emerald-600'
                  }
                >
                  {formatCurrency(calc.budgetRemaining || 0, settings)}
                </strong>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-slate-400">
              No spending limit set for this fund.{' '}
              <Link href="/funds" className="text-amber-700 font-bold hover:underline">
                Edit Fund
              </Link>{' '}
              to set a monthly budget.
            </div>
          )}
        </div>
      </div>

      {/* Fund Ledger (Transactions affecting this fund) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            Fund Transaction Ledger
          </h3>
          <span className="text-xs font-semibold text-slate-400">
            {fundTransactions.length} records
          </span>
        </div>

        {fundTransactions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {fundTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const isExpense = tx.type === 'expense';
              const isTransfer = tx.type === 'transfer';

              // If income, calculate fund-specific allocation amount
              let displayAmount = tx.amount;
              if (isIncome && (tx as any).allocations) {
                const alloc = (tx as any).allocations.find((a: any) => a.fundId === fundId);
                if (alloc) displayAmount = alloc.amount;
              }

              return (
                <div
                  key={tx.id}
                  className="py-3 px-2 flex items-center justify-between hover:bg-slate-50/80 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isIncome
                          ? 'bg-emerald-500 text-white'
                          : isExpense
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : isExpense ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : (
                        <ArrowRightLeft className="w-4 h-4" />
                      )}
                    </div>

                    <div className="truncate">
                      <div className="text-sm font-bold text-slate-800 truncate">
                        {isIncome
                          ? `Income Allocation (${(tx as any).source})`
                          : (tx as any).title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                        <span>{format(parseISO(tx.date), 'dd MMM yyyy')}</span>
                        {isExpense && <span>• {(tx as any).category}</span>}
                        {isTransfer && (
                          <span>
                            • {(tx as any).fromFundId === fundId ? 'Sent to' : 'Received from'}{' '}
                            other fund
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-3">
                    <div
                      className={`text-sm font-extrabold ${
                        isIncome || (isTransfer && (tx as any).toFundId === fundId)
                          ? 'text-emerald-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {isIncome && `+${formatCurrency(displayAmount, settings)}`}
                      {isExpense && `-${formatCurrency(tx.amount, settings)}`}
                      {isTransfer &&
                        ((tx as any).fromFundId === fundId
                          ? `-${formatCurrency(tx.amount, settings)}`
                          : `+${formatCurrency(tx.amount, settings)}`)}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTx(tx);
                          setIsModalOpen(true);
                        }}
                        className="text-[10px] font-bold text-amber-700 hover:text-amber-900 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Delete this transaction? Associated balances will be reversed.')) {
                            deleteTransaction(tx.id);
                          }
                        }}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-slate-400">
            No transactions currently linked to this fund.
          </div>
        )}
      </div>

      {/* EDIT FUND MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-brand-header px-5 py-4 flex items-center justify-between border-b border-brand-500/20">
              <h3 className="font-bold text-slate-950">Edit Fund Details</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-700 hover:text-slate-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateFund(fund.id, {
                  name: editName.trim(),
                  icon: editIcon,
                  color: editColor,
                  allocationPercentage: parseFloat(editPercent) || 0,
                  currentBalance: parseFloat(editOpeningBalance) || 0,
                  monthlyBudget: editBudget ? parseFloat(editBudget) : null,
                });
                setIsEditModalOpen(false);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Fund Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Allocation %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editPercent}
                    onChange={(e) => setEditPercent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Current Available Balance ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editOpeningBalance}
                    onChange={(e) => setEditOpeningBalance(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Monthly Budget Cap ({settings.currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Optional limit"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT BALANCE ADJUSTMENT MODAL */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-brand-header px-5 py-4 flex items-center justify-between border-b border-brand-500/20">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-900" />
                <h3 className="font-bold text-slate-950">
                  Edit Balance: {fund.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-700 hover:text-slate-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const target = parseFloat(adjustBalanceInput);
                if (isNaN(target)) {
                  setAdjustError('Please enter a valid numeric balance.');
                  return;
                }
                const res = adjustFundBalance(fund.id, target);
                if (!res.success) {
                  setAdjustError(res.error || 'Failed to adjust balance');
                  return;
                }
                setIsAdjustModalOpen(false);
              }}
              className="p-5 space-y-4"
            >
              {adjustError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold">
                  {adjustError}
                </div>
              )}

              {/* Fund Summary Stats */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Total Distributed from Income:</span>
                  <span className="font-bold text-emerald-700">
                    +{formatCurrency(calc.totalDistributed ?? calc.lifetimeAllocated, settings)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Spent for Causes / Expenses:</span>
                  <span className="font-bold text-slate-800">
                    -{formatCurrency(calc.lifetimeSpent, settings)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-900 font-semibold pt-1 border-t border-slate-200">
                  <span>Current Recorded Balance:</span>
                  <span className="font-black text-amber-700">
                    {formatCurrency(calc.currentBalance, settings)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Available Balance ({settings.currencySymbol})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder="0.00"
                  value={adjustBalanceInput}
                  onChange={(e) => setAdjustBalanceInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Adjust this fund to match your current physical cash or bank balance. RizqWise tracks the deviation against distributed income automatically.
                </p>
              </div>

              {/* Live Preview of Deviation */}
              {(() => {
                const target = parseFloat(adjustBalanceInput);
                if (isNaN(target)) return null;
                const totalDist = calc.totalDistributed ?? calc.lifetimeAllocated;
                const spent = calc.lifetimeSpent;
                const netTrf = calc.transfersSent - calc.transfersReceived;
                const initialCap = fund.openingBalance || 0;
                const previewAccounted = target + spent + netTrf;
                const previewDev = Math.round(((totalDist + initialCap) - previewAccounted) * 100) / 100;

                return (
                  <div
                    className={`p-3 rounded-xl border text-xs ${
                      Math.abs(previewDev) < 0.01
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : previewDev > 0
                        ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                        : 'bg-sky-50/80 border-sky-200 text-sky-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      {Math.abs(previewDev) < 0.01 ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          0 Difference • Fully Reconciled
                        </>
                      ) : previewDev > 0 ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          {formatCurrency(previewDev, settings)} Deviation (Unaccounted difference)
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                          +{formatCurrency(Math.abs(previewDev), settings)} Surplus
                        </>
                      )}
                    </div>
                    <p className="text-[11px] mt-1 text-slate-600 leading-relaxed">
                      {Math.abs(previewDev) < 0.01
                        ? 'Your balance and recorded expenses match total distributed funds perfectly.'
                        : previewDev > 0
                        ? `There is a difference of ${formatCurrency(previewDev, settings)} between distributed income and this balance. Once you record an expense for this cause, the difference will automatically return to 0.`
                        : `Your balance exceeds distributed funds by ${formatCurrency(Math.abs(previewDev), settings)}.`}
                    </p>
                  </div>
                );
              })()}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl shadow-md"
                >
                  Save New Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(null);
        }}
        initialType={modalType}
        initialFundId={fundId}
        transactionToEdit={editingTx}
      />
    </div>
  );
}
