'use client';

import React, { useState, useRef } from 'react';
import { useFinance } from '@/lib/context/finance-context';
import { IconRenderer } from '@/components/common/icon-renderer';
import {
  Settings as SettingsIcon,
  Coins,
  Shield,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Database,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

const CURRENCIES = [
  { code: 'PKR', symbol: 'Rs.', label: 'Pakistani Rupee (PKR)' },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD)' },
  { code: 'SAR', symbol: 'SAR', label: 'Saudi Riyal (SAR)' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'EUR', symbol: '€', label: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (GBP)' },
];

export default function SettingsPage() {
  const {
    settings,
    funds,
    transactions,
    categories,
    updateSettings,
    updateFund,
    addCategory,
    importData,
    resetToDefaults,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'general' | 'budgets' | 'categories' | 'backup' | 'cloud'>('general');
  const [copiedSql, setCopiedSql] = useState(false);

  // New Category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatColor, setNewCatColor] = useState('#F59E0B');

  // File upload input ref for JSON restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCurrencyChange = (code: string) => {
    const selected = CURRENCIES.find((c) => c.code === code);
    if (selected) {
      updateSettings({
        currency: selected.code,
        currencySymbol: selected.symbol,
      });
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appName: 'RizqFlow',
      settings,
      funds,
      categories,
      transactions,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `RizqFlow_Backup_${format(new Date(), 'yyyy-MM-dd')}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.funds && Array.isArray(parsed.funds)) {
          const success = importData({
            funds: parsed.funds,
            transactions: parsed.transactions || [],
            categories: parsed.categories || categories,
            settings: parsed.settings || settings,
          });
          if (success) {
            alert('Database successfully restored!');
          }
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory({
      name: newCatName.trim(),
      icon: newCatIcon,
      color: newCatColor,
      type: 'expense',
    });
    setNewCatName('');
    alert(`Category "${newCatName}" added!`);
  };

  const copySqlToClipboard = () => {
    const sql = `-- Supabase PostgreSQL Schema for RizqFlow
CREATE TABLE IF NOT EXISTS public.funds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    allocation_percentage NUMERIC NOT NULL DEFAULT 0,
    opening_balance NUMERIC NOT NULL DEFAULT 0,
    monthly_budget NUMERIC,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    title TEXT,
    description TEXT,
    notes TEXT,
    fund_id TEXT REFERENCES public.funds(id),
    from_fund_id TEXT REFERENCES public.funds(id),
    to_fund_id TEXT REFERENCES public.funds(id),
    category TEXT,
    source TEXT,
    payment_method TEXT,
    allocation_method TEXT,
    allocations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-amber-500" />
          Settings & Preferences
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure accounting rules, currency, budgets, categories, and data backup.
        </p>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-slate-100 text-xs font-bold">
          {[
            { id: 'general', label: 'General & Currency' },
            { id: 'budgets', label: 'Monthly Budgets' },
            { id: 'categories', label: 'Categories' },
            { id: 'backup', label: 'Backup & Restore' },
            { id: 'cloud', label: 'Cloud Database (Supabase)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-100 text-amber-950 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: GENERAL & CURRENCY */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Currency & Formatting</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Primary Currency
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-full p-2.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label} ({c.symbol})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Default is PKR (Rs. 100,000). Updates all formatted amounts instantly.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Currency Symbol Customization
                </label>
                <input
                  type="text"
                  value={settings.currencySymbol}
                  onChange={(e) => updateSettings({ currencySymbol: e.target.value })}
                  className="w-full p-2.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  For example: "Rs." or "PKR" or "$"
                </p>
              </div>
            </div>
          </div>

          {/* Negative Balance Policy */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Accounting Rules & Overdraft Policy</h3>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <div>
                <div className="text-xs font-bold text-slate-800">
                  Allow Negative Fund Balances (With Confirmation)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  When enabled, expenses that exceed a fund's available balance will prompt for explicit confirmation instead of being completely blocked.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.allowNegativeBalance}
                  onChange={(e) => updateSettings({ allowNegativeBalance: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY BUDGETS */}
      {activeTab === 'budgets' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Monthly Spending Budgets</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Set optional monthly spending caps per fund. Budget warnings will alert you without restricting balance accounting.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {funds
              .filter((f) => !f.isArchived)
              .map((fund) => (
                <div
                  key={fund.id}
                  className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: fund.color }}
                    >
                      <IconRenderer name={fund.icon} className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{fund.name}</div>
                      <div className="text-[11px] text-slate-400">
                        Allocation: {fund.allocationPercentage}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold">{settings.currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="No limit set"
                      value={fund.monthlyBudget || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : null;
                        updateFund(fund.id, { monthlyBudget: val });
                      }}
                      className="w-32 p-1.5 text-right font-semibold border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 3: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {/* Add Category Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Create Custom Category</h3>

            <form onSubmit={handleAddCategorySubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                placeholder="Category Name (e.g. Halal Investments, Sadaqah)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            </form>
          </div>

          {/* Existing Categories Grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Active Categories ({categories.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-2 text-xs"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: c.color }}
                  >
                    <IconRenderer name={c.icon} className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-slate-800 truncate">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Data Ownership & Portability</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Download a complete, offline JSON snapshot of your funds, transactions, categories, and settings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Export Button */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                  <Download className="w-4 h-4 text-amber-600" />
                  Export Full JSON Backup
                </div>
                <p className="text-[11px] text-slate-500">
                  Save all {transactions.length} transactions and fund structures to your local disk.
                </p>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 transition-colors shadow-sm"
                >
                  Download Backup File (.json)
                </button>
              </div>

              {/* Restore Button */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  Restore from JSON Backup
                </div>
                <p className="text-[11px] text-slate-500">
                  Import a previously exported RizqFlow backup file.
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileRestore}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-sm"
                >
                  Upload & Restore Backup
                </button>
              </div>
            </div>

            {/* Reset Defaults */}
            <div className="p-4 bg-red-50/60 rounded-xl border border-red-200/70 space-y-2 pt-3">
              <div className="font-bold text-xs text-red-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-red-600" />
                Reset Application to Clean Defaults
              </div>
              <p className="text-[11px] text-red-700">
                Wipes all recorded transactions and resets funds to the initial recommended 7 funds (PKR 100%).
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you absolutely sure you want to reset all data to default? This cannot be undone unless you have a backup.')) {
                    resetToDefaults();
                    alert('RizqFlow has been reset to defaults.');
                  }
                }}
                className="py-1.5 px-3 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CLOUD (SUPABASE) CONFIGURATION */}
      {activeTab === 'cloud' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                Persistent Cloud Database (PostgreSQL / Supabase)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Current Mode: <strong>Persistent Local Database Mode</strong> (Saved to <code>data/rizqflow-db.json</code> on server & IndexedDB/localStorage).
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Local Persistence Active
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 space-y-3">
            <h4 className="font-bold text-slate-900">How to connect Supabase Cloud:</h4>
            <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
              <li>Create a free account at <strong>supabase.com</strong> and create a new project.</li>
              <li>Go to the <strong>SQL Editor</strong> in Supabase and paste the schema below.</li>
              <li>Copy your <strong>Project URL</strong> and <strong>Anon Public Key</strong>.</li>
              <li>Add them to your <code>.env.local</code> file as <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.</li>
            </ol>

            <div className="pt-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Supabase SQL Schema
                </span>
                <button
                  type="button"
                  onClick={copySqlToClipboard}
                  className="px-2 py-1 text-[11px] font-bold bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  {copiedSql ? 'Copied!' : 'Copy SQL'}
                </button>
              </div>
              <pre className="p-3 bg-slate-900 text-amber-300 text-[11px] rounded-xl overflow-x-auto font-mono">
{`-- Supabase PostgreSQL Schema for RizqFlow
CREATE TABLE IF NOT EXISTS public.funds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    allocation_percentage NUMERIC NOT NULL DEFAULT 0,
    opening_balance NUMERIC NOT NULL DEFAULT 0,
    monthly_budget NUMERIC,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    title TEXT,
    description TEXT,
    notes TEXT,
    fund_id TEXT REFERENCES public.funds(id),
    from_fund_id TEXT REFERENCES public.funds(id),
    to_fund_id TEXT REFERENCES public.funds(id),
    category TEXT,
    source TEXT,
    payment_method TEXT,
    allocation_method TEXT,
    allocations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
