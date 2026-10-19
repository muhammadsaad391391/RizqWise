'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useFinance } from '@/lib/context/finance-context';
import { formatCurrency } from '@/lib/finance-engine';
import { IconRenderer } from '@/components/common/icon-renderer';
import { TransactionModal } from '@/components/modals/transaction-modal';
import { CustomStatModal } from '@/components/modals/custom-stat-modal';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { Transaction, IncomeTransaction, ExpenseTransaction, TransferTransaction, CustomStatMetric } from '@/types/finance';
import {
  Wallet,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Calendar,
  Layers,
  Sparkles,
  BarChart2,
  ListOrdered,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { format, parseISO } from 'date-fns';

export default function DashboardPage() {
  const { funds, transactions, categories, settings, summary, selectedMonth, deleteTransaction, customStats } = useFinance();
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [dashboardTab, setDashboardTab] = useState<'ledger' | 'charts'>('ledger');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isStatModalOpen, setIsStatModalOpen] = useState(false);
  const [editingStat, setEditingStat] = useState<CustomStatMetric | null>(null);

  const openStatModal = (stat?: CustomStatMetric | null) => {
    setEditingStat(stat || null);
    setIsStatModalOpen(true);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const openModal = (type: 'expense' | 'income' | 'transfer') => {
    setEditingTx(null);
    setModalType(type);
    setIsModalOpen(true);
  };

  const activeFunds = useMemo(() => funds.filter((f) => !f.isArchived), [funds]);

  // Filter transactions for recent view
  const recentTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }, [transactions]);

  // Group recent transactions by date (Inspired by Screenshot 2!)
  const groupedTransactions = useMemo(() => {
    const groups: { date: string; displayDate: string; items: typeof transactions }[] = [];
    recentTransactions.forEach((tx) => {
      const parsed = parseISO(tx.date);
      const displayDate = format(parsed, 'd MMM yyyy, EEEE');
      let grp = groups.find((g) => g.date === tx.date);
      if (!grp) {
        grp = { date: tx.date, displayDate, items: [] };
        groups.push(grp);
      }
      grp.items.push(tx);
    });
    return groups;
  }, [recentTransactions]);

  // Category spending breakdown data for Chart
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t): t is ExpenseTransaction => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category || 'Other';
        map[cat] = (map[cat] || 0) + t.amount;
      });

    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [transactions]);

  // Comparison Data
  const comparisonData = useMemo(() => {
    return [
      { name: 'Income', amount: summary.periodIncome, fill: '#10B981' },
      { name: 'Expenses', amount: summary.periodExpenses, fill: '#EF4444' },
      { name: 'Allocated', amount: summary.periodAllocated, fill: '#F59E0B' },
    ];
  }, [summary]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {!settings.onboardingCompleted && <OnboardingWizard />}

      {/* SIMPLIFIED AVAILABLE WEALTH HEADER */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Available Wealth
              </span>
              {summary.totalDeficit > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                  Deficit: -{formatCurrency(summary.totalDeficit, settings)}
                </span>
              )}
            </div>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
              {formatCurrency(summary.totalBalance, settings)}
            </div>
          </div>

          {/* Clean Quick Action Buttons */}
          <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => openModal('income')}
              className="py-2.5 px-3.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95"
            >
              <ArrowUpRight className="w-4 h-4 shrink-0" />
              <span>Income</span>
            </button>
            <button
              type="button"
              onClick={() => openModal('expense')}
              className="py-2.5 px-3.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95"
            >
              <ArrowDownRight className="w-4 h-4 shrink-0" />
              <span>Expense</span>
            </button>
            <button
              type="button"
              onClick={() => openModal('transfer')}
              className="py-2.5 px-3.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Transfer</span>
            </button>
          </div>
        </div>

        {/* CUSTOM COMBINED STATS (e.g. "Available for Business: Investments + Business", "Available to Spend") */}
        <div className="pt-4 mt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>Combined Balances</span>
              {customStats.length > 0 && (
                <span className="text-[10px] font-semibold text-slate-400">({customStats.length})</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => openStatModal(null)}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-200/60 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Stat</span>
            </button>
          </div>

          {customStats.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {customStats.map((stat) => {
                const combinedBalance = stat.fundIds.reduce((sum, fid) => {
                  const calc = summary.fundCalculations[fid];
                  return sum + (calc?.currentBalance ?? 0);
                }, 0);

                const includedFunds = stat.fundIds
                  .map((fid) => funds.find((f) => f.id === fid))
                  .filter(Boolean) as typeof funds;

                return (
                  <div
                    key={stat.id}
                    onClick={() => openStatModal(stat)}
                    className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/70 hover:bg-amber-50/60 border border-slate-200/70 hover:border-amber-300 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs shrink-0 shadow-xs"
                          style={{ backgroundColor: stat.color || '#0284C7' }}
                        >
                          <IconRenderer name={stat.icon || 'Briefcase'} className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 truncate block group-hover:text-amber-800 transition-colors">
                            {stat.name}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                            {includedFunds.map((f) => f.name).join(' + ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm sm:text-base font-black text-slate-900 group-hover:text-amber-950 transition-colors">
                        {formatCurrency(combinedBalance, settings)}
                      </div>
                      <span className="text-[9px] font-semibold text-slate-400 group-hover:text-amber-700 flex items-center justify-end gap-0.5">
                        Edit <ChevronRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-dashed border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="text-xs text-slate-500">
                Combine two or more funds (e.g. <strong>Available for Business</strong> = Investments + Business, or <strong>Available to Spend</strong> = Personal + Brother)
              </div>
              <button
                type="button"
                onClick={() => openStatModal(null)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 transition-colors shrink-0 flex items-center justify-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Combine Funds Now</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CATEGORY DEFICITS / DEBITS ALERT BANNER */}
      {summary.totalDeficit > 0 && (
        <section className="bg-rose-50/80 border border-rose-200/90 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-extrabold text-rose-950">
                    Category Deficits &amp; Debits
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-900">
                    {summary.deficitFunds.length} {summary.deficitFunds.length === 1 ? 'category in deficit' : 'categories in deficit'}
                  </span>
                </div>
                <p className="text-xs text-rose-700 mt-0.5">
                  Total deficit / debit of <span className="font-black text-rose-950">{formatCurrency(summary.totalDeficit, settings)}</span> across short or overspent funds. You can clear it automatically from spendable funds when adding income, or settle via transfer.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => openModal('income')}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Clear via Income</span>
              </button>
              <button
                type="button"
                onClick={() => openModal('transfer')}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-rose-100/70 border border-rose-200 text-rose-900 transition-colors flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>Settle via Transfer</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {summary.deficitFunds.map((df) => (
              <Link
                key={df.fundId}
                href={`/funds/${df.fundId}`}
                className="p-3 rounded-2xl bg-white/95 hover:bg-white border border-rose-200 hover:border-rose-300 transition-all flex items-center justify-between gap-3 shadow-2xs group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs shrink-0"
                    style={{ backgroundColor: df.color || '#EF4444' }}
                  >
                    <IconRenderer name={df.icon || 'AlertTriangle'} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate block group-hover:text-rose-700">
                      {df.fundName}
                    </span>
                    <span className="text-[10px] font-semibold text-rose-600 block">
                      {df.currentBalance < 0 ? 'Negative balance' : 'Shortfall / Deviation'}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs sm:text-sm font-black text-rose-600 block">
                    -{formatCurrency(df.deficitAmount, settings)}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center justify-end gap-0.5 group-hover:text-rose-700">
                    View <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* MY FUNDS - Simple, Clean, Non-rushy Cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">My Funds</h3>
            <p className="text-xs text-slate-500">Live balance assigned to each fund</p>
          </div>
          <Link
            href="/funds"
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-100/60 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            Manage Funds <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {activeFunds.map((fund) => {
            const calc = summary.fundCalculations[fund.id] || {
              currentBalance: fund.openingBalance || 0,
              lifetimeAllocated: 0,
              totalDistributed: 0,
              deviation: 0,
              isReconciled: true,
              periodAllocated: 0,
              periodSpent: 0,
            };
            const isNegative = calc.currentBalance < 0;

            return (
              <Link
                key={fund.id}
                href={`/funds/${fund.id}`}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-soft hover:shadow-card hover:border-amber-400 active:scale-[0.98] transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs shrink-0 shadow-xs"
                      style={{ backgroundColor: fund.color }}
                    >
                      <IconRenderer name={fund.icon} className="w-4 h-4" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!calc.isReconciled && (calc.deviation ?? 0) > 0 && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800"
                          title={`Deviation: ${formatCurrency(calc.deviation, settings)}`}
                        >
                          Diff
                        </span>
                      )}
                      <div className="w-6 h-6 rounded-full bg-slate-50 group-hover:bg-amber-100 flex items-center justify-center transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-700 transition-colors" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-amber-700 transition-colors">
                      {fund.name}
                    </h4>
                    <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                      {fund.allocationPercentage}% of income
                    </span>
                  </div>
                </div>

                <div className="mt-3.5 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Available
                  </span>
                  <div
                    className={`text-base sm:text-lg font-black tracking-tight mt-0.5 truncate ${
                      isNegative ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {formatCurrency(calc.currentBalance, settings)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* DASHBOARD TAB TOGGLE (Keeps view calm & uncluttered!) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between bg-slate-100 p-1 rounded-2xl text-xs font-semibold w-full sm:w-auto self-start">
          <button
            type="button"
            onClick={() => setDashboardTab('ledger')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              dashboardTab === 'ledger'
                ? 'bg-white text-slate-950 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListOrdered className="w-4 h-4 text-amber-600" />
            Recent Activity
          </button>
          <button
            type="button"
            onClick={() => setDashboardTab('charts')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              dashboardTab === 'charts'
                ? 'bg-white text-slate-950 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-4 h-4 text-amber-600" />
            Visual Analytics
          </button>
        </div>

        {/* TAB 1: CALM DAY-BY-DAY TRANSACTIONS (Matching Reference Screenshot 2!) */}
        {dashboardTab === 'ledger' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-slate-900">Recent Transactions</h3>
              <Link
                href="/transactions"
                className="text-xs font-bold text-amber-700 hover:underline"
              >
                View All ({transactions.length})
              </Link>
            </div>

            {groupedTransactions.length > 0 ? (
              <div className="space-y-4">
                {groupedTransactions.map((group) => {
                  const dayExpenses = group.items
                    .filter((t) => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0);
                  const dayIncome = group.items
                    .filter((t) => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);

                  return (
                    <div key={group.date} className="space-y-1.5">
                      {/* Daily Header (Reference Screenshot 2 match) */}
                      <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-slate-50 rounded-xl text-slate-500 font-semibold border border-slate-100">
                        <span>{group.displayDate}</span>
                        <div className="flex items-center gap-3 text-[11px]">
                          {dayExpenses > 0 && (
                            <span>Expenses: {formatCurrency(dayExpenses, settings)}</span>
                          )}
                          {dayIncome > 0 && (
                            <span className="text-emerald-700 font-bold">
                              Income: {formatCurrency(dayIncome, settings)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Transaction items */}
                      <div className="divide-y divide-slate-100">
                        {group.items.map((tx) => {
                          const isIncome = tx.type === 'income';
                          const isExpense = tx.type === 'expense';
                          const isTransfer = tx.type === 'transfer';

                          const expTx = isExpense ? (tx as ExpenseTransaction) : null;
                          const incTx = isIncome ? (tx as IncomeTransaction) : null;
                          const trfTx = isTransfer ? (tx as TransferTransaction) : null;

                          const cat = expTx ? categories.find((c) => c.name === expTx.category) : null;
                          const fund = expTx ? funds.find((f) => f.id === expTx.fundId) : null;
                          const fromFund = trfTx ? funds.find((f) => f.id === trfTx.fromFundId) : null;
                          const toFund = trfTx ? funds.find((f) => f.id === trfTx.toFundId) : null;

                          return (
                            <div
                              key={tx.id}
                              className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-50/80 rounded-2xl transition-colors group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Circular Icon matching reference screenshot 2 */}
                                <div
                                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                                    isIncome
                                      ? 'bg-emerald-500 text-white'
                                      : isExpense
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-blue-100 text-blue-900'
                                  }`}
                                >
                                  {isIncome ? (
                                    <IconRenderer name="Wallet" className="w-4 h-4" />
                                  ) : isExpense ? (
                                    <IconRenderer name={cat?.icon || 'Utensils'} className="w-4 h-4" />
                                  ) : (
                                    <ArrowRightLeft className="w-4 h-4" />
                                  )}
                                </div>

                                <div className="truncate">
                                  <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                                    {isIncome ? incTx?.description || incTx?.source : expTx?.title || trfTx?.title}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                                    {isExpense && (
                                      <span className="font-semibold text-slate-600">
                                        Fund: {fund?.name || 'Unassigned'}
                                      </span>
                                    )}
                                    {isTransfer && (
                                      <span className="font-semibold text-blue-600">
                                        {fromFund?.name} → {toFund?.name}
                                      </span>
                                    )}
                                    {isIncome && (
                                      <span className="font-semibold text-emerald-600">
                                        Allocated across {incTx?.allocations?.length || 0} funds
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0 ml-3">
                                <div
                                  className={`text-sm sm:text-base font-black ${
                                    isIncome
                                      ? 'text-emerald-600'
                                      : isExpense
                                      ? 'text-slate-900'
                                      : 'text-blue-600'
                                  }`}
                                >
                                  {isIncome && '+'}
                                  {isExpense && '-'}
                                  {isTransfer && '⇄ '}
                                  {formatCurrency(tx.amount, settings)}
                                </div>
                                <div className="flex items-center gap-2.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity justify-end mt-1">
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
                                      if (confirm('Delete this transaction? All associated fund balances will be reversed.')) {
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
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-700">No transactions recorded yet</p>
                <button
                  type="button"
                  onClick={() => openModal('income')}
                  className="mt-3 px-4 py-2 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-sm"
                >
                  + Add Income
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CLEAN ANALYTICS & CHARTS */}
        {dashboardTab === 'charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-soft">
              <h4 className="text-sm font-bold text-slate-900 mb-1">Cash Flow Comparison</h4>
              <p className="text-xs text-slate-400 mb-3">Income vs Expenses vs Allocations</p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(val: number) => [formatCurrency(val, settings), 'Amount']}
                      contentStyle={{ borderRadius: '12px' }}
                    />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                      {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-soft">
              <h4 className="text-sm font-bold text-slate-900 mb-1">Top Category Expenses</h4>
              <p className="text-xs text-slate-400 mb-3">Where your money goes</p>
              {categoryData.length > 0 ? (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} width={100} />
                      <Tooltip
                        formatter={(val: number) => [formatCurrency(val, settings), 'Spent']}
                        contentStyle={{ borderRadius: '12px' }}
                      />
                      <Bar dataKey="value" fill="#F59E0B" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                  No expense records yet.
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Global Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(null);
        }}
        initialType={modalType}
        transactionToEdit={editingTx}
      />

      {/* Custom Combined Stat Modal */}
      <CustomStatModal
        isOpen={isStatModalOpen}
        onClose={() => {
          setIsStatModalOpen(false);
          setEditingStat(null);
        }}
        initialStat={editingStat}
      />
    </div>
  );
}
