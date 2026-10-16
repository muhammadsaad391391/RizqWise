'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Trash2,
  Cloud,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Pencil,
  X,
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

const AVAILABLE_ICONS = [
  'Tag', 'Coffee', 'Fuel', 'Dumbbell', 'Receipt', 'Briefcase',
  'Utensils', 'Car', 'ShoppingBag', 'GraduationCap', 'Laptop',
  'Megaphone', 'Smartphone', 'HeartPulse', 'Shirt', 'Home',
  'Plane', 'Wrench', 'Gift', 'ShieldAlert', 'PiggyBank', 'TrendingUp'
];

const PRESET_COLORS = [
  '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#EC4899', '#8B5CF6',
  '#14B8A6', '#F97316', '#EF4444', '#64748B'
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
    updateCategory,
    deleteCategory,
    importData,
    resetToDefaults,
    syncWithCloud,
    pullLatestFromCloud,
    isPasswordRequired,
    setPassword,
    removePassword,
    lockAccount,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'budgets' | 'categories' | 'backup' | 'cloud'>('general');
  const [copiedSql, setCopiedSql] = useState(false);

  // Security & Passcode state
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [securityFeedback, setSecurityFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Category form state (Add)
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatColor, setNewCatColor] = useState('#F59E0B');
  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');
  const [selectedCatFilter, setSelectedCatFilter] = useState<'all' | 'expense' | 'income'>('expense');

  // Category Edit state
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('Tag');
  const [editCatColor, setEditCatColor] = useState('#F59E0B');
  const [editCatType, setEditCatType] = useState<'expense' | 'income'>('expense');

  // Supabase cloud credentials state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUrl =
        settings.supabaseUrl ||
        localStorage.getItem('rizqwise_supabase_url') ||
        localStorage.getItem('rizqflow_supabase_url') ||
        '';
      const storedKey =
        settings.supabaseAnonKey ||
        localStorage.getItem('rizqwise_supabase_key') ||
        localStorage.getItem('rizqflow_supabase_key') ||
        '';
      setSupabaseUrl(storedUrl);
      setSupabaseKey(storedKey);
    }
  }, [settings.supabaseUrl, settings.supabaseAnonKey]);

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
      appName: 'RizqWise',
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
      `RizqWise_Backup_${format(new Date(), 'yyyy-MM-dd')}.json`
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
      type: categoryType,
    });
    setNewCatName('');
  };

  const handleStartEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatIcon(cat.icon || 'Tag');
    setEditCatColor(cat.color || '#F59E0B');
    setEditCatType(cat.type || 'expense');
  };

  const handleSaveEditCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCatName.trim()) return;
    updateCategory(editingCategory.id, {
      name: editCatName.trim(),
      icon: editCatIcon,
      color: editCatColor,
      type: editCatType,
    });
    setEditingCategory(null);
  };

  const handlePushSync = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setSyncFeedback({ type: 'error', text: 'Please enter both Supabase URL and Anon API Key.' });
      return;
    }
    setSyncLoading(true);
    setSyncFeedback(null);
    try {
      const res = await syncWithCloud(supabaseUrl.trim(), supabaseKey.trim());
      if (res.success) {
        setSyncFeedback({ type: 'success', text: res.message });
      } else {
        setSyncFeedback({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setSyncFeedback({ type: 'error', text: err.message || 'Error syncing with cloud.' });
    } finally {
      setSyncLoading(false);
    }
  };

  const handlePullSync = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setSyncFeedback({ type: 'error', text: 'Please enter both Supabase URL and Anon API Key.' });
      return;
    }
    setSyncLoading(true);
    setSyncFeedback(null);
    try {
      const res = await pullLatestFromCloud(supabaseUrl.trim(), supabaseKey.trim());
      if (res.success) {
        setSyncFeedback({ type: 'success', text: res.message });
      } else {
        setSyncFeedback({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setSyncFeedback({ type: 'error', text: err.message || 'Error pulling data from cloud.' });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSetOrUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityFeedback(null);

    // If already protected, check current password
    if (isPasswordRequired && settings.appPassword) {
      if (currentPasswordInput !== settings.appPassword) {
        setSecurityFeedback({ type: 'error', text: 'Current password is incorrect. Please try again.' });
        return;
      }
    }

    if (!newPasswordInput || newPasswordInput.trim().length < 4) {
      setSecurityFeedback({ type: 'error', text: 'Password must be at least 4 characters or digits.' });
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setSecurityFeedback({ type: 'error', text: 'New passwords do not match. Please verify.' });
      return;
    }

    setPassword(newPasswordInput.trim());
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setSecurityFeedback({
      type: 'success',
      text: 'Account password successfully saved! Your finances are now locked behind this password.',
    });
  };

  const handleRemovePassword = () => {
    setSecurityFeedback(null);
    if (isPasswordRequired && settings.appPassword) {
      if (currentPasswordInput !== settings.appPassword) {
        setSecurityFeedback({
          type: 'error',
          text: 'Please enter your current password above to confirm removing password protection.',
        });
        return;
      }
    }
    removePassword();
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setSecurityFeedback({
      type: 'success',
      text: 'Password protection removed. Your account can now be opened freely.',
    });
  };

  const copySqlToClipboard = () => {
    const sql = `-- Supabase PostgreSQL Table for Instant Cross-Device Sync
CREATE TABLE IF NOT EXISTS public.rizqwise_sync (
    id TEXT PRIMARY KEY DEFAULT 'primary_sync',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rizqwise_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public sync access"
    ON public.rizqwise_sync FOR ALL
    USING (true)
    WITH CHECK (true);`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-amber-500" />
          Settings & Preferences
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure accounting rules, currency, budgets, categories, and multi-device cloud synchronization.
        </p>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-slate-100 text-xs font-bold">
          {[
            { id: 'general', label: 'General & Currency' },
            { id: 'security', label: isPasswordRequired ? '🔒 Security & Passcode (Active)' : 'Security & Passcode' },
            { id: 'budgets', label: 'Monthly Budgets' },
            { id: 'categories', label: `Categories (${categories.length})` },
            { id: 'backup', label: 'Backup & Restore' },
            { id: 'cloud', label: 'Cloud Sync (Supabase)' },
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
                  When enabled, expenses exceeding a fund's available balance will prompt for explicit confirmation instead of being completely blocked.
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

      {/* TAB: SECURITY & PASSCODE */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          {/* Status Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                    isPasswordRequired
                      ? 'bg-emerald-500 text-white shadow-emerald-400/20'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {isPasswordRequired ? (
                    <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                  ) : (
                    <KeyRound className="w-6 h-6 stroke-[2.2]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">
                      {isPasswordRequired ? 'Password Protection Active' : 'No Password Set'}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isPasswordRequired
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {isPasswordRequired ? 'Protected' : 'Unlocked'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isPasswordRequired
                      ? 'Your account, balances, funds, and transaction ledger are locked behind a password on this and all synced devices.'
                      : 'Anyone who opens this app can view your account and transaction ledger. Set a passcode below to secure your finances.'}
                  </p>
                </div>
              </div>

              {isPasswordRequired && (
                <button
                  type="button"
                  onClick={lockAccount}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0"
                >
                  <Lock className="w-4 h-4" />
                  <span>Lock Screen Now</span>
                </button>
              )}
            </div>
          </div>

          {/* Password Setup & Change Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span>{isPasswordRequired ? 'Change Account Passcode or Password' : 'Set Account Passcode or Password'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Use a memorable numeric PIN (e.g. 1234, 5829) or an alphanumeric password. It will be required whenever you open RizqWise.
              </p>
            </div>

            <form onSubmit={handleSetOrUpdatePassword} className="space-y-4 pt-1">
              {/* If password already exists, require current password */}
              {isPasswordRequired && settings.appPassword && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative max-w-md">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      placeholder="Enter current password..."
                      className="w-full px-3 py-2.5 pr-10 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isPasswordRequired ? 'New Password / Passcode' : 'Choose Password / Passcode'}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Min 4 characters or digits..."
                      className="w-full px-3 py-2.5 pr-10 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Re-enter new password..."
                      className="w-full px-3 py-2.5 pr-10 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Feedback Alert */}
              {securityFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 max-w-xl ${
                    securityFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {securityFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{securityFeedback.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-extrabold bg-brand-header hover:bg-amber-400 text-slate-950 rounded-xl shadow-md shadow-amber-400/20 transition-all flex items-center gap-2 active:scale-95"
                >
                  <Lock className="w-4 h-4 stroke-[2.5]" />
                  <span>{isPasswordRequired ? 'Update Password' : 'Enable Password Protection'}</span>
                </button>

                {isPasswordRequired && (
                  <button
                    type="button"
                    onClick={handleRemovePassword}
                    className="px-4 py-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Remove Password Protection</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Explainer card on cross-device sync & Vercel deployment */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-600 space-y-2.5">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Multi-Device Protection & Privacy</span>
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-slate-500 leading-relaxed">
              <li>
                <strong>Automatic Cloud Sync:</strong> When you set a password, it syncs across your devices automatically via your Supabase database.
              </li>
              <li>
                <strong>Zero Financial Leaks:</strong> When locked, no fund balances, transactions, or totals are visible or accessible without the passcode.
              </li>
              <li>
                <strong>Remember This Device:</strong> You can check "Remember this device" on your personal phone or laptop so you don't have to enter the passcode on every tab refresh.
              </li>
              <li>
                <strong>Deployment Environment Variable:</strong> You can also set a default deployment password by setting <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px]">NEXT_PUBLIC_APP_PASSWORD</code> in your Vercel project settings.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY BUDGETS */}
      {activeTab === 'budgets' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Monthly Spending Budgets</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Set optional monthly spending caps per fund. Budget warnings alert you without restricting balance accounting.
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
                        Default Allocation: {fund.allocationPercentage}%
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
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Add New {categoryType === 'income' ? 'Income' : 'Expense'} Category
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize your income sources and expense categories for comprehensive budgeting.
              </p>
            </div>

            {/* Category Type Switcher */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Category Type:</span>
              <button
                type="button"
                onClick={() => {
                  setCategoryType('expense');
                  setSelectedCatFilter('expense');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  categoryType === 'expense'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Expense Category
              </button>
              <button
                type="button"
                onClick={() => {
                  setCategoryType('income');
                  setSelectedCatFilter('income');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  categoryType === 'income'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Income Category
              </button>
            </div>

            <form onSubmit={handleAddCategorySubmit} className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                    Category Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      categoryType === 'expense'
                        ? 'e.g. Groceries, Gym, Halal Charity, Books'
                        : 'e.g. Consulting, Freelance Client, YouTube, Bonus'
                    }
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                    Color
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setNewCatColor(col)}
                        style={{ backgroundColor: col }}
                        className={`w-6 h-6 rounded-full transition-all ${
                          newCatColor === col ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                  Select Icon
                </label>
                <div className="flex items-center gap-2 flex-wrap max-h-24 overflow-y-auto p-2 bg-slate-50 border border-slate-100 rounded-xl">
                  {AVAILABLE_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setNewCatIcon(ic)}
                      className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                        newCatIcon === ic
                          ? categoryType === 'income'
                            ? 'bg-emerald-500 text-white ring-2 ring-emerald-600 font-bold'
                            : 'bg-amber-400 text-slate-950 ring-2 ring-amber-500 font-bold'
                          : 'bg-white text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <IconRenderer name={ic} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className={`px-4 py-2.5 text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 ${
                  categoryType === 'income'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-amber-400 hover:bg-amber-500 text-slate-950'
                }`}
              >
                <Plus className="w-4 h-4" />
                Add {categoryType === 'income' ? 'Income' : 'Expense'} Category
              </button>
            </form>
          </div>

          {/* Existing Categories Grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Active Categories ({categories.length})
              </h3>

              {/* Sub-filters for active list */}
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedCatFilter('expense')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    selectedCatFilter === 'expense'
                      ? 'bg-amber-100 text-amber-950 font-bold'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Expenses ({categories.filter((c) => c.type === 'expense' || !c.type).length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCatFilter('income')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    selectedCatFilter === 'income'
                      ? 'bg-emerald-100 text-emerald-950 font-bold'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Income ({categories.filter((c) => c.type === 'income').length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCatFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    selectedCatFilter === 'all'
                      ? 'bg-slate-200 text-slate-900 font-bold'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  All ({categories.length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-2">
              {categories
                .filter((c) => {
                  if (selectedCatFilter === 'expense') return c.type === 'expense' || !c.type;
                  if (selectedCatFilter === 'income') return c.type === 'income';
                  return true;
                })
                .map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-2 text-xs group hover:bg-white hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: c.color }}
                      >
                        <IconRenderer name={c.icon} className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-800 truncate block">{c.name}</span>
                        {selectedCatFilter === 'all' && (
                          <span
                            className={`text-[9px] font-bold uppercase ${
                              c.type === 'income' ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {c.type === 'income' ? 'Income' : 'Expense'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditCategory(c)}
                        title="Edit category"
                        className="text-slate-400 hover:text-amber-600 p-1 rounded transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete category "${c.name}"?`)) {
                            deleteCategory(c.id);
                          }
                        }}
                        title="Delete category"
                        className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                  Import a previously exported RizqWise backup file.
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
                Wipes recorded transactions and resets funds to the initial recommended 7 funds (PKR 100%).
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you absolutely sure you want to reset all data to default? This cannot be undone unless you have a backup.')) {
                    resetToDefaults();
                    alert('RizqWise has been reset to defaults.');
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-amber-500" />
                Cross-Device Multi-Device Cloud Sync (Supabase)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Keep your budget, funds, and transactions synchronized across your phone, tablet, and computer.
              </p>
            </div>
            {settings.cloudSyncEnabled ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1.5 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5" /> Cloud Sync Active
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1.5 self-start sm:self-auto">
                Offline / Local Mode
              </span>
            )}
          </div>

          {/* Vercel Environment Detection Banner */}
          {Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && (
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Automated Vercel Cloud Database Active</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  Your Supabase credentials are configured via deployment environment variables. All your devices (phone, laptop, iPad) accessing this site automatically stay synchronized in real time with zero manual entry required.
                </div>
              </div>
            </div>
          )}

          {/* Sync Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://your-project.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supabase Anon Public API Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                />
              </div>
            </div>

            {/* Status Feedback */}
            {syncFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  syncFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {syncFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{syncFeedback.text}</span>
              </div>
            )}

            {settings.lastSyncedAt && (
              <p className="text-[11px] text-slate-400">
                Last synchronized: {format(new Date(settings.lastSyncedAt), 'MMM dd, yyyy HH:mm:ss')}
              </p>
            )}

            {/* Sync Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handlePushSync}
                disabled={syncLoading}
                className="px-4 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <ArrowUpFromLine className="w-3.5 h-3.5" />
                {syncLoading ? 'Syncing...' : 'Save & Push to Cloud'}
              </button>

              <button
                type="button"
                onClick={handlePullSync}
                disabled={syncLoading}
                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                {syncLoading ? 'Pulling...' : 'Pull Latest from Cloud'}
              </button>
            </div>
          </div>

          {/* Quick Setup Instructions & SQL Copy */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 space-y-3">
            <h4 className="font-bold text-slate-900">3-Step Supabase Setup:</h4>
            <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-slate-600">
              <li>Create a free account at <strong>supabase.com</strong> and start a new project.</li>
              <li>Open the <strong>SQL Editor</strong> tab in Supabase, paste the SQL below and click <strong>Run</strong>.</li>
              <li>Go to <strong>Project Settings → API</strong>, copy your <strong>URL</strong> and <strong>anon key</strong>, and paste them above.</li>
            </ol>

            <div className="pt-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Supabase Setup SQL
                </span>
                <button
                  type="button"
                  onClick={copySqlToClipboard}
                  className="px-2 py-1 text-[11px] font-bold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 flex items-center gap-1 shadow-2xs"
                >
                  <Copy className="w-3 h-3" />
                  {copiedSql ? 'Copied!' : 'Copy SQL'}
                </button>
              </div>
              <pre className="p-3 bg-slate-900 text-amber-300 text-[11px] rounded-xl overflow-x-auto font-mono">
{`-- Supabase PostgreSQL Table for Instant Cross-Device Sync
CREATE TABLE IF NOT EXISTS public.rizqwise_sync (
    id TEXT PRIMARY KEY DEFAULT 'primary_sync',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rizqwise_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public sync access"
    ON public.rizqwise_sync FOR ALL
    USING (true)
    WITH CHECK (true);`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Category Edit Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: editCatColor }}
                >
                  <IconRenderer name={editCatIcon} className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Edit Category</h3>
                  <p className="text-xs text-slate-400">Update name, color, and icon</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCategory} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase">
                  Category Type
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCatType('expense')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      editCatType === 'expense'
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Expense Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCatType('income')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      editCatType === 'income'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Income Category
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  placeholder="e.g. Groceries, Gym, Dining"
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Colors */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase">
                  Color Accent
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setEditCatColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-7 h-7 rounded-full transition-all ${
                        editCatColor === col
                          ? 'ring-2 ring-offset-2 ring-slate-800 scale-110 shadow-xs'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase">
                  Icon
                </label>
                <div className="flex items-center gap-2 flex-wrap max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-100 rounded-xl">
                  {AVAILABLE_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setEditCatIcon(ic)}
                      className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                        editCatIcon === ic
                          ? editCatType === 'income'
                            ? 'bg-emerald-500 text-white ring-2 ring-emerald-600'
                            : 'bg-brand-header text-slate-950 ring-2 ring-amber-500'
                          : 'bg-white text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <IconRenderer name={ic} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-brand-header hover:bg-amber-400 text-slate-950 rounded-xl shadow-md shadow-amber-400/20 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
