'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useFinance } from '@/lib/context/finance-context';
import { formatCurrency } from '@/lib/finance-engine';
import { IconRenderer } from '@/components/common/icon-renderer';
import { TransactionModal } from '@/components/modals/transaction-modal';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { IncomeTransaction, ExpenseTransaction, TransferTransaction } from '@/types/finance';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  PieChart as PieIcon,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, parseISO, isSameDay } from 'date-fns';

const CHART_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#64748B'];

export default function DashboardPage() {
  const { funds, transactions, categories, settings, summary, selectedMonth, deleteTransaction } = useFinance();
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'expense' | 'income' | 'transfer'>('expense');

  useEffect(() => {
    setMounted(true);
  }, []);

  const openModal = (type: 'expense' | 'income' | 'transfer') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const activeFunds = useMemo(() => funds.filter((f) => !f.isArchived), [funds]);

  // Filter transactions for recent view
  const recentTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
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

  // Fund allocation breakdown data for Pie Chart
  const fundPieData = useMemo(() => {
    return activeFunds.map((f) => ({
      name: f.name,
      value: summary.fundCalculations[f.id]?.currentBalance || 0,
      color: f.color,
    })).filter((d) => d.value > 0);
  }, [activeFunds, summary]);

  // Income vs Expenses Comparison Data
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
    <div className="space-y-6">
      {!settings.onboardingCompleted && <OnboardingWizard />}

      {/* TOP SUMMARY METRICS (Yellow accent / premium fintech cards) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Available Balance */}
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-amber-400 via-amber-300 to-amber-200 p-4 sm:p-5 rounded-2xl shadow-card text-slate-950 relative overflow-hidden border border-amber-300">
          <div className="absolute top-2 right-2 opacity-10">
            <Wallet className="w-20 h-20" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-950/80">
            Total Available Balance
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 truncate">
            {formatCurrency(summary.totalBalance, settings)}
          </div>
          <div className="text-[11px] font-semibold text-amber-950/90 mt-2 flex items-center gap-1">
            Across {activeFunds.length} active funds
          </div>
        </div>

        {/* Selected Month Income */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-card border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Month Income
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1 truncate">
            {formatCurrency(summary.periodIncome, settings)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-2">
            Received in {format(selectedMonth, 'MMM yyyy')}
          </div>
        </div>

        {/* Selected Month Expenses */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-card border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Month Expenses
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 truncate">
            {formatCurrency(summary.periodExpenses, settings)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-2">
            Spent in {format(selectedMonth, 'MMM yyyy')}
          </div>
        </div>

        {/* Total Allocated This Month */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-card border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Month Allocated
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <PieIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-1 truncate">
            {formatCurrency(summary.periodAllocated, settings)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-2">
            Distributed to funds
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-amber-50/60 border border-amber-200/70 p-3.5 rounded-2xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-amber-950">Quick Actions:</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openModal('income')}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Record Income
          </button>
          <button
            type="button"
            onClick={() => openModal('expense')}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center gap-1.5 transition-all"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Record Expense
          </button>
          <button
            type="button"
            onClick={() => openModal('transfer')}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm flex items-center gap-1.5 transition-all"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Transfer Funds
          </button>
        </div>
      </div>

      {/* MY FUNDS SECTION - Card for each active fund */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">My Funds</h3>
            <p className="text-xs text-slate-500">
              Allocations and live available balances across all personal & business funds
            </p>
          </div>
          <Link
            href="/funds"
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-100/60 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            Manage Funds <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {activeFunds.map((fund) => {
            const calc = summary.fundCalculations[fund.id] || {
              currentBalance: fund.openingBalance || 0,
              periodAllocated: 0,
              periodSpent: 0,
              budgetSpent: 0,
            };
            const isNegative = calc.currentBalance < 0;

            return (
              <Link
                key={fund.id}
                href={`/funds/${fund.id}`}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-soft hover:shadow-card hover:border-amber-400 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: fund.color }}
                      >
                        <IconRenderer name={fund.icon} className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                          {fund.name}
                        </h4>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {fund.allocationPercentage}% allocation
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Available Balance */}
                  <div className="mt-3.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Available Balance
                    </div>
                    <div
                      className={`text-xl font-extrabold tracking-tight mt-0.5 ${
                        isNegative ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {formatCurrency(calc.currentBalance, settings)}
                    </div>
                  </div>

                  {/* Month Activity Pill */}
                  <div className="grid grid-cols-2 gap-1 bg-slate-50 rounded-xl p-2 mt-3 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Allocated</span>
                      <span className="font-bold text-emerald-600">
                        +{formatCurrency(calc.periodAllocated, settings)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Spent</span>
                      <span className="font-bold text-slate-700">
                        -{formatCurrency(calc.periodSpent, settings)}
                      </span>
                    </div>
                  </div>

                  {/* Monthly Budget Progress Bar (if budget configured) */}
                  {fund.monthlyBudget && fund.monthlyBudget > 0 ? (
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                        <span>Budget Spent: {calc.budgetUtilization}%</span>
                        <span>Cap: {formatCurrency(fund.monthlyBudget, settings)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-amber-700">
                  <span>Open Fund Ledger</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* VISUAL ANALYTICS (Charts Grid) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cash Flow Comparison */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Period Cash Flow</h4>
              <p className="text-xs text-slate-400">Income vs Expenses vs Allocations</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              {format(selectedMonth, 'MMMM yyyy')}
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val, settings), 'Amount']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
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

        {/* Category-Wise Spending Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Top Spending Categories</h4>
              <p className="text-xs text-slate-400">Where your money goes</p>
            </div>
            <Link href="/reports" className="text-xs font-bold text-amber-700 hover:underline">
              All Analytics
            </Link>
          </div>
          {categoryData.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} width={100} />
                  <Tooltip
                    formatter={(val: number) => [formatCurrency(val, settings), 'Spent']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="value" fill="#F59E0B" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
              <p>No expense transactions recorded yet.</p>
              <button
                type="button"
                onClick={() => openModal('expense')}
                className="mt-2 text-amber-700 font-bold hover:underline"
              >
                + Record your first expense
              </button>
            </div>
          )}
        </div>
      </section>

      {/* RECENT TRANSACTIONS LEDGER (Grouped by Date, Inspired by Reference Screenshot 2!) */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Recent Transactions
            </h3>
            <p className="text-xs text-slate-500">
              Live ledger entries with associated funds
            </p>
          </div>
          <Link
            href="/transactions"
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-100/60 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            Full Ledger ({transactions.length}) <ChevronRight className="w-3.5 h-3.5" />
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
                  {/* Daily Header (Exact match to reference screenshot 2: "1 Feb Sunday  Expenses: 450  Income: 3000") */}
                  <div className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-50/80 rounded-lg text-slate-500 font-semibold border border-slate-100">
                    <span>{group.displayDate}</span>
                    <div className="flex items-center gap-3 text-[11px]">
                      {dayExpenses > 0 && (
                        <span>Expenses: {formatCurrency(dayExpenses, settings)}</span>
                      )}
                      {dayIncome > 0 && (
                        <span className="text-emerald-700">Income: {formatCurrency(dayIncome, settings)}</span>
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
                          className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-50/80 rounded-xl transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Circular Icon (Inspired by Screenshot 2: green for income, styled circle for expense) */}
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
                                <IconRenderer name="Wallet" className="w-4 h-4" />
                              ) : isExpense ? (
                                <IconRenderer name={cat?.icon || 'Utensils'} className="w-4 h-4" />
                              ) : (
                                <ArrowRightLeft className="w-4 h-4" />
                              )}
                            </div>

                            <div className="truncate">
                              <div className="text-sm font-bold text-slate-800 truncate">
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
                                    Source: {incTx?.source} (Allocated to {incTx?.allocations?.length || 0} funds)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0 ml-3">
                            <div
                              className={`text-sm font-extrabold ${
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
                            <button
                              type="button"
                              onClick={() => deleteTransaction(tx.id)}
                              className="text-[10px] text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Delete
                            </button>
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
          <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-bold text-slate-700">No transactions recorded yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Start by adding an income to preview automatic fund allocation, or record an expense against any fund.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => openModal('income')}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-sm"
              >
                + Add Income
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Global Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialType={modalType}
      />
    </div>
  );
}
