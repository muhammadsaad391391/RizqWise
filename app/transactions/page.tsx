'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/lib/context/finance-context';
import { formatCurrency } from '@/lib/finance-engine';
import { IconRenderer } from '@/components/common/icon-renderer';
import { TransactionModal } from '@/components/modals/transaction-modal';
import { Transaction, IncomeTransaction, ExpenseTransaction, TransferTransaction } from '@/types/finance';
import { INCOME_SOURCES, PAYMENT_METHODS } from '@/lib/initial-data';
import {
  Receipt,
  Search,
  Filter,
  Download,
  Trash2,
  Edit3,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  ChevronDown,
  X,
  Plus,
  Calendar,
} from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';

export default function TransactionsPage() {
  const { funds, transactions, categories, settings, deleteTransaction } = useFinance();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFundId, setSelectedFundId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Modal & View Detail state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);

  // Active Funds
  const activeFunds = useMemo(() => funds.filter((f) => !f.isArchived), [funds]);

  // Filtering Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (selectedType !== 'all' && tx.type !== selectedType) return false;

      // Fund filter
      if (selectedFundId !== 'all') {
        if (tx.type === 'expense' && (tx as ExpenseTransaction).fundId !== selectedFundId) {
          return false;
        }
        if (
          tx.type === 'transfer' &&
          (tx as TransferTransaction).fromFundId !== selectedFundId &&
          (tx as TransferTransaction).toFundId !== selectedFundId
        ) {
          return false;
        }
        if (
          tx.type === 'income' &&
          !(tx as IncomeTransaction).allocations?.some((a) => a.fundId === selectedFundId)
        ) {
          return false;
        }
      }

      // Category filter (Expense only)
      if (selectedCategory !== 'all') {
        if (tx.type !== 'expense' || (tx as ExpenseTransaction).category !== selectedCategory) {
          return false;
        }
      }

      // Income Source filter (Income only)
      if (selectedSource !== 'all') {
        if (tx.type !== 'income' || (tx as IncomeTransaction).source !== selectedSource) {
          return false;
        }
      }

      // Payment Method filter
      if (selectedPaymentMethod !== 'all') {
        if (
          tx.type !== 'expense' ||
          (tx as ExpenseTransaction).paymentMethod !== selectedPaymentMethod
        ) {
          return false;
        }
      }

      // Date Range filter
      if (startDate) {
        if (tx.date < startDate) return false;
      }
      if (endDate) {
        if (tx.date > endDate) return false;
      }

      // Amount Range filter
      const min = parseFloat(minAmount);
      if (!isNaN(min) && tx.amount < min) return false;

      const max = parseFloat(maxAmount);
      if (!isNaN(max) && tx.amount > max) return false;

      // Search Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        let match = false;
        if (tx.type === 'expense') {
          const exp = tx as ExpenseTransaction;
          if (
            exp.title.toLowerCase().includes(query) ||
            exp.category.toLowerCase().includes(query) ||
            exp.description?.toLowerCase().includes(query) ||
            exp.notes?.toLowerCase().includes(query)
          ) {
            match = true;
          }
        } else if (tx.type === 'income') {
          const inc = tx as IncomeTransaction;
          if (
            inc.description.toLowerCase().includes(query) ||
            inc.source.toLowerCase().includes(query) ||
            inc.notes?.toLowerCase().includes(query)
          ) {
            match = true;
          }
        } else if (tx.type === 'transfer') {
          const trf = tx as TransferTransaction;
          if (
            trf.title.toLowerCase().includes(query) ||
            trf.description?.toLowerCase().includes(query)
          ) {
            match = true;
          }
        }
        if (!match) return false;
      }

      return true;
    });
  }, [
    transactions,
    selectedType,
    selectedFundId,
    selectedCategory,
    selectedSource,
    selectedPaymentMethod,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    searchQuery,
  ]);

  // Sorting Logic
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'highest') return b.amount - a.amount;
      if (sortBy === 'lowest') return a.amount - b.amount;
      return 0;
    });
  }, [filteredTransactions, sortBy]);

  // Filtered Totals
  const filteredMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let count = sortedTransactions.length;
    sortedTransactions.forEach((t) => {
      if (t.type === 'income') income += t.amount;
      if (t.type === 'expense') expense += t.amount;
    });
    return { income, expense, count, net: income - expense };
  }, [sortedTransactions]);

  // Export to CSV Function
  const exportToCSV = () => {
    if (sortedTransactions.length === 0) {
      alert('No transactions to export.');
      return;
    }

    const headers = ['ID', 'Date', 'Type', 'Title / Description', 'Amount', 'Currency', 'Fund', 'Category / Source', 'Payment Method'];
    const rows = sortedTransactions.map((tx) => {
      let fundName = '';
      let catOrSource = '';
      let pMethod = '';
      let title = '';

      if (tx.type === 'expense') {
        const exp = tx as ExpenseTransaction;
        title = exp.title;
        fundName = funds.find((f) => f.id === exp.fundId)?.name || '';
        catOrSource = exp.category;
        pMethod = exp.paymentMethod || '';
      } else if (tx.type === 'income') {
        const inc = tx as IncomeTransaction;
        title = inc.description;
        fundName = inc.allocations?.map((a) => `${a.fundName} (${a.amount})`).join('; ') || 'Unallocated';
        catOrSource = inc.source;
      } else if (tx.type === 'transfer') {
        const trf = tx as TransferTransaction;
        title = trf.title;
        const from = funds.find((f) => f.id === trf.fromFundId)?.name || '';
        const to = funds.find((f) => f.id === trf.toFundId)?.name || '';
        fundName = `${from} -> ${to}`;
      }

      return [
        tx.id,
        tx.date,
        tx.type,
        `"${title.replace(/"/g, '""')}"`,
        tx.amount,
        settings.currency,
        `"${fundName.replace(/"/g, '""')}"`,
        `"${catOrSource.replace(/"/g, '""')}"`,
        `"${pMethod.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RizqFlow_Transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedFundId('all');
    setSelectedCategory('all');
    setSelectedSource('all');
    setSelectedPaymentMethod('all');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('newest');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-500" />
            Financial Transaction Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, filter, and inspect every financial entry across all your funds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportToCSV}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-600" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-header hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Transaction
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-soft space-y-4">
        {/* Search Input & Quick Type Pills */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, description, category, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'all', label: 'All' },
              { id: 'income', label: 'Income' },
              { id: 'expense', label: 'Expense' },
              { id: 'transfer', label: 'Transfer' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedType === tab.id
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Fund Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Fund
            </label>
            <select
              value={selectedFundId}
              onChange={(e) => setSelectedFundId(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <option value="all">All Funds</option>
              {activeFunds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Expense Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <option value="all">All Categories</option>
              {categories
                .filter((c) => c.type === 'expense' || !c.type)
                .map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Income Source */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Income Source
            </label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <option value="all">All Sources</option>
              {Array.from(
                new Set([
                  ...categories.filter((c) => c.type === 'income').map((c) => c.name),
                  ...INCOME_SOURCES,
                ])
              ).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {/* Sorting Order */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Sort Order
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400 font-semibold"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-500 border-t border-slate-100">
          <div>
            Showing <strong>{filteredMetrics.count}</strong> transactions (Income:{' '}
            <strong className="text-emerald-600">+{formatCurrency(filteredMetrics.income, settings)}</strong> | Expenses:{' '}
            <strong className="text-red-600">-{formatCurrency(filteredMetrics.expense, settings)}</strong>)
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="text-amber-700 font-bold hover:underline"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* TRANSACTION TABLE / LIST */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        {sortedTransactions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {sortedTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const isExpense = tx.type === 'expense';
              const isTransfer = tx.type === 'transfer';

              // @ts-expect-error category
              const cat = categories.find((c) => c.name === tx.category);
              // @ts-expect-error fund
              const fund = funds.find((f) => f.id === tx.fundId);
              // @ts-expect-error fromFund
              const fromFund = funds.find((f) => f.id === tx.fromFundId);
              // @ts-expect-error toFund
              const toFund = funds.find((f) => f.id === tx.toFundId);

              return (
                <div
                  key={tx.id}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Type/Category Icon */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isIncome
                          ? 'bg-emerald-500 text-white'
                          : isExpense
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : isExpense ? (
                        <IconRenderer name={cat?.icon || 'Utensils'} className="w-5 h-5" />
                      ) : (
                        <ArrowRightLeft className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {isIncome
                            ? (tx as IncomeTransaction).description || (tx as IncomeTransaction).source
                            : (tx as any).title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-700'
                              : isExpense
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                        <span>{format(parseISO(tx.date), 'dd MMM yyyy')}</span>
                        {isExpense && (
                          <span>
                            • Fund: <strong className="text-slate-700">{fund?.name || 'Unassigned'}</strong>
                          </span>
                        )}
                        {isExpense && (tx as ExpenseTransaction).paymentMethod && (
                          <span>• {(tx as ExpenseTransaction).paymentMethod}</span>
                        )}
                        {isTransfer && (
                          <span>
                            • <strong className="text-blue-700">{fromFund?.name}</strong> →{' '}
                            <strong className="text-blue-700">{toFund?.name}</strong>
                          </span>
                        )}
                        {isIncome && (
                          <span>
                            • Source: <strong className="text-emerald-700">{(tx as IncomeTransaction).source}</strong>{' '}
                            (Allocated across {(tx as IncomeTransaction).allocations?.length || 0} funds)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount & Actions */}
                  <div className="text-right flex-shrink-0 flex items-center gap-3">
                    <div>
                      <div
                        className={`text-base font-extrabold ${
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
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setSelectedTxForDetail(tx)}
                        title="View details"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this transaction? All associated fund balances will be reversed.')) {
                            deleteTransaction(tx.id);
                          }
                        }}
                        title="Delete transaction"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">
            No transactions match your current search and filter criteria.
          </div>
        )}
      </div>

      {/* DETAIL MODAL FOR A TRANSACTION */}
      {selectedTxForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-brand-header px-5 py-4 flex items-center justify-between border-b border-brand-500/20">
              <h3 className="font-bold text-slate-950">Transaction Details</h3>
              <button
                type="button"
                onClick={() => setSelectedTxForDetail(null)}
                className="text-slate-700 hover:text-slate-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Type:</span>
                  <span className="font-bold uppercase text-slate-800">{selectedTxForDetail.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Amount:</span>
                  <span className="font-extrabold text-sm text-slate-950">
                    {formatCurrency(selectedTxForDetail.amount, settings)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Date:</span>
                  <span className="font-semibold text-slate-700">
                    {format(parseISO(selectedTxForDetail.date), 'dd MMMM yyyy')}
                  </span>
                </div>
              </div>

              {/* Income Allocations Snapshot (Immutable history proof) */}
              {selectedTxForDetail.type === 'income' && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-2">
                  <div className="font-bold text-emerald-950">Fund Distribution Snapshot:</div>
                  {(selectedTxForDetail as IncomeTransaction).allocations?.map((a) => (
                    <div key={a.fundId} className="flex justify-between">
                      <span className="text-slate-600">
                        {a.fundName} ({a.percentage}%):
                      </span>
                      <span className="font-bold text-emerald-700">
                        +{formatCurrency(a.amount, settings)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Expense Details */}
              {selectedTxForDetail.type === 'expense' && (
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="font-bold text-slate-800">
                      {(selectedTxForDetail as ExpenseTransaction).category}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Deducted from Fund:</span>
                    <span className="font-bold text-amber-800">
                      {funds.find((f) => f.id === (selectedTxForDetail as ExpenseTransaction).fundId)?.name || 'Unassigned'}
                    </span>
                  </div>
                  {(selectedTxForDetail as ExpenseTransaction).paymentMethod && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Payment Method:</span>
                      <span className="font-semibold text-slate-700">
                        {(selectedTxForDetail as ExpenseTransaction).paymentMethod}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Transfer Details */}
              {selectedTxForDetail.type === 'transfer' && (
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-blue-800 font-semibold">From Fund:</span>
                    <span className="font-bold text-slate-900">
                      {funds.find((f) => f.id === (selectedTxForDetail as TransferTransaction).fromFundId)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800 font-semibold">To Fund:</span>
                    <span className="font-bold text-slate-900">
                      {funds.find((f) => f.id === (selectedTxForDetail as TransferTransaction).toFundId)?.name}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Delete this transaction?')) {
                      deleteTransaction(selectedTxForDetail.id);
                      setSelectedTxForDetail(null);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Delete Record
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTxForDetail(null)}
                  className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
