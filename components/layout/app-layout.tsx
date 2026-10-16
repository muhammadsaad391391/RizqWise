'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFinance } from '@/lib/context/finance-context';
import { formatCurrency } from '@/lib/finance-engine';
import { TransactionModal } from '@/components/modals/transaction-modal';
import {
  LayoutDashboard,
  PieChart,
  Receipt,
  BarChart3,
  Settings,
  Plus,
  Coins,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { summary, settings, selectedMonth, setSelectedMonth } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'expense' | 'income' | 'transfer'>('expense');

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'My Funds', href: '/funds', icon: Layers },
    { label: 'Transactions', href: '/transactions', icon: Receipt },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleOpenAdd = (type: 'expense' | 'income' | 'transfer' = 'expense') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handlePrevMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col md:flex-row text-slate-800">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 p-5 shrink-0 sticky top-0 h-screen">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-md shadow-amber-400/20">
            <Coins className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">RizqWise</h1>
            <p className="text-[11px] font-medium text-slate-500 tracking-tight">
              Know where your money goes.
            </p>
          </div>
        </div>

        {/* Prominent Quick Action Button */}
        <button
          onClick={() => handleOpenAdd('expense')}
          className="w-full py-3 px-4 mb-6 rounded-xl bg-brand-header hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md shadow-amber-400/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Add Transaction</span>
        </button>

        {/* Navigation Links */}
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-amber-100/60 text-amber-950'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-amber-600 stroke-[2.3]' : 'text-slate-400 stroke-[1.8]'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Balance Badge */}
        <div className="pt-4 border-t border-slate-100 px-2">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Total Available
            </div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">
              {formatCurrency(summary.totalBalance, settings)}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              All Funds Active
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* TOP HEADER (Yellow on mobile inspired by reference app, sleek bar on desktop) */}
        <header className="bg-brand-header md:bg-white border-b border-amber-300/40 md:border-slate-200/80 px-4 py-3 md:py-4 sticky top-0 z-30 shadow-sm md:shadow-none">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            {/* Left: Mobile Title or Desktop Page context */}
            <div className="flex items-center gap-3">
              <div className="md:hidden flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center font-bold">
                  <Coins className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-lg text-slate-950 tracking-tight">RizqWise</span>
              </div>
              <div className="hidden md:block">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                  Islamic-Inspired Fund Accounting
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  {pathname === '/' && 'Financial Dashboard'}
                  {pathname.startsWith('/funds') && 'Fund Management & Ledgers'}
                  {pathname === '/transactions' && 'Transaction Ledger'}
                  {pathname === '/reports' && 'Reports & Analytics'}
                  {pathname === '/settings' && 'App Settings & Rules'}
                </h2>
              </div>
            </div>

            {/* Right: Month Selector & Quick Actions */}
            <div className="flex items-center gap-2">
              {/* Cloud Sync Status Indicator */}
              {settings.cloudSyncEnabled ? (
                <Link
                  href="/settings"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/80 hover:bg-emerald-100 transition-colors shadow-2xs"
                  title="Multi-device Cloud Sync is active"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden sm:inline">Cloud Synced</span>
                </Link>
              ) : (
                <Link
                  href="/settings"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50/80 text-amber-900 text-xs font-semibold border border-amber-200 hover:bg-amber-100 transition-colors shadow-2xs"
                  title="Connect database to sync across your phone and laptop"
                >
                  <span className="text-xs">☁️</span>
                  <span className="hidden sm:inline">Sync Devices</span>
                </Link>
              )}
              <div className="flex items-center bg-black/10 md:bg-slate-100 rounded-xl p-1 text-slate-900">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                  className="p-1.5 rounded-lg hover:bg-black/10 md:hover:bg-white text-slate-700 hover:text-slate-950 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-2 text-xs font-bold whitespace-nowrap flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700 md:text-amber-600" />
                  <span>{format(selectedMonth, 'MMM yyyy')}</span>
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Next month"
                  className="p-1.5 rounded-lg hover:bg-black/10 md:hover:bg-white text-slate-700 hover:text-slate-950 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Desktop Direct Action Buttons */}
              <div className="hidden sm:flex items-center gap-2 ml-2">
                <button
                  type="button"
                  onClick={() => handleOpenAdd('income')}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  + Add Income
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAdd('transfer')}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  ⇄ Transfer
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 md:py-6">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION - Matching Reference Screenshot 2! */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1 shadow-lg">
        <div className="flex items-center justify-around relative">
          <Link
            href="/"
            className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-center transition-colors ${
              pathname === '/' ? 'text-amber-600 font-bold' : 'text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Home</span>
          </Link>

          <Link
            href="/funds"
            className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-center transition-colors ${
              pathname.startsWith('/funds') ? 'text-amber-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Funds</span>
          </Link>

          {/* Prominent Center Yellow Plus Button (Exact circle floating style from reference screenshot) */}
          <div className="relative -top-5 flex flex-col items-center">
            <button
              onClick={() => handleOpenAdd('expense')}
              className="w-13 h-13 p-3.5 rounded-full bg-brand-header text-slate-950 shadow-xl shadow-amber-400/50 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-4 border-[#FBFBFA]"
              aria-label="Add transaction"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>
          </div>

          <Link
            href="/transactions"
            className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-center transition-colors ${
              pathname === '/transactions' ? 'text-amber-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Ledger</span>
          </Link>

          <Link
            href="/reports"
            className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-center transition-colors ${
              pathname === '/reports' ? 'text-amber-600 font-bold' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Reports</span>
          </Link>
        </div>
      </div>

      {/* Global Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialType={modalType}
      />
    </div>
  );
}
