'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/lib/context/finance-context';
import { formatCurrency } from '@/lib/finance-engine';
import { IconRenderer } from '@/components/common/icon-renderer';
import { IncomeTransaction, ExpenseTransaction } from '@/types/finance';
import {
  BarChart3,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  ShieldAlert,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
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
  Legend,
} from 'recharts';
import {
  format,
  parseISO,
  subMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from 'date-fns';

const PALETTE = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#64748B', '#14B8A6'];

export default function ReportsPage() {
  const { funds, transactions, categories, settings, summary } = useFinance();

  // Period Preset
  const [periodPreset, setPeriodPreset] = useState<'this-month' | '3-months' | '6-months' | 'all'>('this-month');

  // Compute period boundaries
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = new Date();
    if (periodPreset === 'this-month') {
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
        periodLabel: format(now, 'MMMM yyyy'),
      };
    } else if (periodPreset === '3-months') {
      return {
        startDate: startOfMonth(subMonths(now, 2)),
        endDate: endOfMonth(now),
        periodLabel: 'Last 3 Months',
      };
    } else if (periodPreset === '6-months') {
      return {
        startDate: startOfMonth(subMonths(now, 5)),
        endDate: endOfMonth(now),
        periodLabel: 'Last 6 Months',
      };
    } else {
      return {
        startDate: new Date(2020, 0, 1),
        endDate: new Date(2035, 11, 31),
        periodLabel: 'All Time History',
      };
    }
  }, [periodPreset]);

  // Filter transactions within period
  const periodTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const d = parseISO(tx.date);
      return isWithinInterval(d, { start: startDate, end: endDate });
    });
  }, [transactions, startDate, endDate]);

  // Top summary metrics
  const periodMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let allocated = 0;

    periodTransactions.forEach((tx) => {
      if (tx.type === 'income') {
        const inc = tx as IncomeTransaction;
        income += inc.amount;
        if (inc.allocations) {
          allocated += inc.allocations.reduce((sum, a) => sum + a.amount, 0);
        }
      } else if (tx.type === 'expense') {
        expense += tx.amount;
      }
    });

    return {
      income,
      expense,
      allocated,
      net: income - expense,
      savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
    };
  }, [periodTransactions]);

  // Category Spending Data
  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    periodTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = (t as ExpenseTransaction).category || 'Other';
        map[cat] = (map[cat] || 0) + t.amount;
      });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [periodTransactions]);

  // Income Sources Breakdown
  const incomeSources = useMemo(() => {
    const map: Record<string, number> = {};
    periodTransactions
      .filter((t) => t.type === 'income')
      .forEach((t) => {
        const src = (t as IncomeTransaction).source || 'Other';
        map[src] = (map[src] || 0) + t.amount;
      });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [periodTransactions]);

  // Fund-wise spending & balances table
  const fundReportList = useMemo(() => {
    return funds
      .filter((f) => !f.isArchived)
      .map((fund) => {
        const calc = summary.fundCalculations[fund.id] || {
          currentBalance: 0,
          lifetimeAllocated: 0,
          lifetimeSpent: 0,
        };

        // Calculate period spent for this fund
        const periodFundSpent = periodTransactions
          .filter((t) => t.type === 'expense' && (t as ExpenseTransaction).fundId === fund.id)
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          id: fund.id,
          name: fund.name,
          color: fund.color,
          icon: fund.icon,
          percentage: fund.allocationPercentage,
          balance: calc.currentBalance,
          periodSpent: periodFundSpent,
          lifetimeAllocated: calc.lifetimeAllocated,
          lifetimeSpent: calc.lifetimeSpent,
        };
      });
  }, [funds, summary, periodTransactions]);

  // Top 5 Largest Expenses
  const largestExpenses = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5) as ExpenseTransaction[];
  }, [periodTransactions]);

  // Allocation History
  const allocationHistory = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'income' && (t as IncomeTransaction).allocations?.length > 0)
      .slice(0, 10) as IncomeTransaction[];
  }, [periodTransactions]);

  // Savings & Investment Contribution
  const investmentSavingsContribution = useMemo(() => {
    let totalInvested = 0;
    periodTransactions
      .filter((t) => t.type === 'income')
      .forEach((tx) => {
        const inc = tx as IncomeTransaction;
        inc.allocations?.forEach((a) => {
          const lower = a.fundName.toLowerCase();
          if (lower.includes('invest') || lower.includes('saving')) {
            totalInvested += a.amount;
          }
        });
      });
    return totalInvested;
  }, [periodTransactions]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:p-0">
      {/* Top Header & Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft print:border-none print:shadow-none">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            Financial Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit where every rupee came from, how it was distributed, and where it went.
          </p>
        </div>

        <div className="flex items-center gap-2.5 print:hidden">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'this-month', label: 'This Month' },
              { id: '3-months', label: '3 Months' },
              { id: '6-months', label: '6 Months' },
              { id: 'all', label: 'All Time' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodPreset(p.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  periodPreset === p.id
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Period Indicator */}
      <div className="px-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
        Reporting Period: <span className="text-slate-900">{periodLabel}</span>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Income
          </span>
          <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
            {formatCurrency(periodMetrics.income, settings)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Recorded inflows</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Expenses
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">
            {formatCurrency(periodMetrics.expense, settings)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Deducted from funds</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Net Surplus / Cash Flow
          </span>
          <div
            className={`text-xl font-extrabold mt-0.5 ${
              periodMetrics.net >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {formatCurrency(periodMetrics.net, settings)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Savings Rate: {periodMetrics.savingsRate}%
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Savings & Investments Built
          </span>
          <div className="text-xl font-extrabold text-blue-600 mt-0.5">
            {formatCurrency(investmentSavingsContribution, settings)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Allocated to growth</div>
        </div>
      </div>

      {/* VISUAL CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category-Wise Spending Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Category Spending Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Breakdown of expenses by category</p>
          {categorySpending.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySpending}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categorySpending.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [formatCurrency(val, settings), 'Amount']}
                    contentStyle={{ borderRadius: '12px' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-xs text-slate-400">
              No expense activity in this period.
            </div>
          )}
        </div>

        {/* Income Sources Breakdown Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Income Sources</h3>
          <p className="text-xs text-slate-400 mb-4">Origin of money received</p>
          {incomeSources.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeSources}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {incomeSources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [formatCurrency(val, settings), 'Amount']}
                    contentStyle={{ borderRadius: '12px' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-xs text-slate-400">
              No income received in this period.
            </div>
          )}
        </div>
      </div>

      {/* FUND-WISE AUDIT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 space-y-3">
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
          Fund Balance & Performance Audit
        </h3>
        <p className="text-xs text-slate-500">
          Complete breakdown of available balances and lifetime allocations per fund
        </p>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-2.5 px-3">Fund</th>
                <th className="py-2.5 px-3">Allocation %</th>
                <th className="py-2.5 px-3">Available Balance</th>
                <th className="py-2.5 px-3">Period Spent</th>
                <th className="py-2.5 px-3">Lifetime Allocated</th>
                <th className="py-2.5 px-3">Lifetime Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {fundReportList.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-3 flex items-center gap-2 font-bold text-slate-900">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white"
                      style={{ backgroundColor: f.color }}
                    >
                      <IconRenderer name={f.icon} className="w-3.5 h-3.5" />
                    </div>
                    {f.name}
                  </td>
                  <td className="py-3 px-3">{f.percentage}%</td>
                  <td className={`py-3 px-3 font-extrabold ${f.balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {formatCurrency(f.balance, settings)}
                  </td>
                  <td className="py-3 px-3 text-slate-700">
                    {formatCurrency(f.periodSpent, settings)}
                  </td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">
                    +{formatCurrency(f.lifetimeAllocated, settings)}
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    -{formatCurrency(f.lifetimeSpent, settings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOP 5 LARGEST EXPENSES */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 space-y-3">
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
          Largest Expenses in Period
        </h3>
        {largestExpenses.length > 0 ? (
          <div className="divide-y divide-slate-100 text-xs">
            {largestExpenses.map((exp, idx) => (
              <div key={exp.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-center font-bold text-slate-400">#{idx + 1}</span>
                  <div>
                    <span className="font-bold text-slate-900">{exp.title}</span>
                    <span className="text-slate-400 ml-2">
                      ({exp.category} • Fund: {funds.find((f) => f.id === exp.fundId)?.name})
                    </span>
                  </div>
                </div>
                <div className="font-extrabold text-slate-900">
                  {formatCurrency(exp.amount, settings)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">No expenses in this period.</div>
        )}
      </div>

      {/* HISTORICAL ALLOCATION LOGS (Snapshot Proof) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 space-y-3">
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
          Income Allocation History Log
        </h3>
        <p className="text-xs text-slate-500">
          Immutable snapshots recorded at the time of each income distribution
        </p>

        {allocationHistory.length > 0 ? (
          <div className="space-y-3 pt-2 text-xs">
            {allocationHistory.map((inc) => (
              <div
                key={inc.id}
                className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>
                    {format(parseISO(inc.date), 'dd MMM yyyy')} • {inc.source}
                  </span>
                  <span className="text-emerald-700 font-extrabold text-sm">
                    +{formatCurrency(inc.amount, settings)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                  {inc.allocations?.map((a) => (
                    <span
                      key={a.fundId}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-700"
                    >
                      {a.fundName} ({a.percentage}%):{' '}
                      <strong className="text-emerald-700">+{formatCurrency(a.amount, settings)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            No income allocations recorded in this period.
          </div>
        )}
      </div>
    </div>
  );
}
