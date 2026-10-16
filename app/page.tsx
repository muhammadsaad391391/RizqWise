'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useFinance } from '@/lib/context/finance-context';
import { formatCurrency } from '@/lib/finance-engine';
import { IconRenderer } from '@/components/common/icon-renderer';
import { TransactionModal } from '@/components/modals/transaction-modal';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { Transaction, IncomeTransaction, ExpenseTransaction, TransferTransaction } from '@/types/finance';
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
  const { funds, transactions, categories, settings, summary, selectedMonth, deleteTransaction } = useFinance();
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [dashboardTab, setDashboardTab] = useState<'ledger' | 'charts'>('ledger');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

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

      {/* TOP CALM SUMMARY HEADER - Inspired by Reference Screenshot 2 */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Available Wealth
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-0.5">
              {formatCurrency(summary.totalBalance, settings)}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openModal('income')}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <ArrowUpRight className="w-4 h-4" />
              Income
            </button>
            <button
              type="button"
              onClick={() => openModal('expense')}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <ArrowDownRight className="w-4 h-4" />
              Expense
            </button>
            <button
              type="button"
              onClick={() => openModal('transfer')}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Transfer
            </button>
          </div>
        </div>

        {/* 3 Clean Summary Stats (Exact style from reference screenshot 2: Expenses, Income, Balance) */}
        <div className="grid grid-cols-3 gap-2 pt-4 text-center">
          <div className="p-2 sm:p-3 rounded-2xl bg-slate-50/70">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Expenses
            </span>
            <span className="text-base sm:text-xl font-black text-slate-800 mt-0.5 block truncate">
              {formatCurrency(summary.periodExpenses, settings)}
            </span>
          </div>

          <div className="p-2 sm:p-3 rounded-2xl bg-emerald-50/60">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Income
            </span>
            <span className="text-base sm:text-xl font-black text-emerald-600 mt-0.5 block truncate">
              +{formatCurrency(summary.periodIncome, settings)}
            </span>
          </div>

          <div className="p-2 sm:p-3 rounded-2xl bg-amber-50/70">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              Allocated
            </span>
            <span className="text-base sm:text-xl font-black text-amber-700 mt-0.5 block truncate">
              {formatCurrency(summary.periodAllocated, settings)}
            </span>
          </div>
        </div>
      </section>

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
            Manage / Edit Funds <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-soft hover:shadow-card hover:border-amber-400 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs shrink-0 shadow-xs"
                        style={{ backgroundColor: fund.color }}
                      >
                        <IconRenderer name={fund.icon} className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-amber-700">
                          {fund.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {fund.allocationPercentage}%
                        </span>
                      </div>
                    </div>

                    {/* Reconciliation Pill */}
                    {calc.isReconciled ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200/70 text-emerald-700 shrink-0">
                        0 Diff
                      </span>
                    ) : (calc.deviation ?? 0) > 0 ? (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 shrink-0"
                        title={`Deviation: ${formatCurrency(calc.deviation, settings)}`}
                      >
                        Diff
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <span>Available</span>
                      <span className="text-emerald-700 font-bold lowercase">
                        +{formatCurrency(calc.totalDistributed ?? calc.lifetimeAllocated ?? 0, settings)}
                      </span>
                    </div>
                    <div
                      className={`text-base sm:text-lg font-black tracking-tight mt-0.5 truncate ${
                        isNegative ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {formatCurrency(calc.currentBalance, settings)}
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 group-hover:text-amber-700 font-bold">
                  <span>View Ledger</span>
                  <ChevronRight className="w-3 h-3" />
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
    </div>
  );
}
