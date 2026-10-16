'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Fund,
  Transaction,
  IncomeTransaction,
  ExpenseTransaction,
  TransferTransaction,
  Category,
  AppSettings,
  DashboardSummary,
  FundAllocationSnapshot,
} from '@/types/finance';
import { DEFAULT_FUNDS, DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '@/lib/initial-data';
import {
  calculateFinancialSummary,
  calculateAllocations,
  validateAllocationRules,
} from '@/lib/finance-engine';
import { pushToSupabase, pullFromSupabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface FinanceContextType {
  funds: Fund[];
  transactions: Transaction[];
  categories: Category[];
  settings: AppSettings;
  isLoading: boolean;
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  summary: DashboardSummary;
  addIncome: (income: {
    amount: number;
    source: string;
    date: string;
    description: string;
    notes?: string;
    allocationMethod: 'automatic' | 'manual' | 'none';
    customAllocations?: FundAllocationSnapshot[];
  }) => { success: boolean; error?: string };
  addExpense: (expense: {
    amount: number;
    title: string;
    date: string;
    fundId: string;
    category: string;
    description?: string;
    notes?: string;
    paymentMethod?: string;
    forceAllowNegative?: boolean;
  }) => { success: boolean; error?: string; requiresConfirmation?: boolean; availableBalance?: number };
  addTransfer: (transfer: {
    amount: number;
    fromFundId: string;
    toFundId: string;
    date: string;
    title: string;
    description?: string;
    notes?: string;
    forceAllowNegative?: boolean;
  }) => { success: boolean; error?: string; requiresConfirmation?: boolean; availableBalance?: number };
  updateTransaction: (id: string, updated: Partial<Transaction>) => { success: boolean; error?: string };
  deleteTransaction: (id: string) => { success: boolean };
  addFund: (fund: {
    name: string;
    icon: string;
    color: string;
    allocationPercentage: number;
    openingBalance?: number;
    monthlyBudget?: number | null;
  }) => { success: boolean; error?: string };
  updateFund: (id: string, updated: Partial<Fund>) => { success: boolean; error?: string };
  deleteFund: (id: string) => { success: boolean; error?: string };
  updateAllocationRules: (rules: { fundId: string; percentage: number }[]) => { success: boolean; error?: string };
  addCategory: (category: { name: string; icon: string; color: string; type: 'expense' | 'income' }) => Category;
  deleteCategory: (id: string) => void;
  syncWithCloud: (customUrl?: string, customKey?: string) => Promise<{ success: boolean; message: string }>;
  pullLatestFromCloud: (customUrl?: string, customKey?: string) => Promise<{ success: boolean; message: string }>;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  importData: (data: { funds?: Fund[]; transactions?: Transaction[]; categories?: Category[]; settings?: AppSettings }) => boolean;
  resetToDefaults: () => void;
  getFundById: (id: string) => Fund | undefined;
  getFundBalance: (id: string) => number;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'rizqwise_state_v1';
const LEGACY_STORAGE_KEY = 'rizqflow_state_v1';

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [funds, setFunds] = useState<Fund[]>(DEFAULT_FUNDS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Save changes to API and localStorage
  const persistState = useCallback(
    async (
      newFunds: Fund[],
      newTransactions: Transaction[],
      newCategories: Category[],
      newSettings: AppSettings
    ) => {
      // 1. Sync to localStorage immediately for instant local caching
      try {
        if (typeof window !== 'undefined') {
          const serialized = JSON.stringify({
            funds: newFunds,
            transactions: newTransactions,
            categories: newCategories,
            settings: newSettings,
          });
          localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
          localStorage.setItem(LEGACY_STORAGE_KEY, serialized);
        }
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }

      // 2. Sync to persistent backend API
      try {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            funds: newFunds,
            transactions: newTransactions,
            categories: newCategories,
            settings: newSettings,
          }),
        });
      } catch (err) {
        console.error('Failed to sync data to server API:', err);
      }

      // 3. Sync to Supabase cloud if enabled
      try {
        const url =
          newSettings.supabaseUrl ||
          (typeof window !== 'undefined'
            ? localStorage.getItem('rizqwise_supabase_url') || localStorage.getItem('rizqflow_supabase_url')
            : undefined) ||
          process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key =
          newSettings.supabaseAnonKey ||
          (typeof window !== 'undefined'
            ? localStorage.getItem('rizqwise_supabase_key') || localStorage.getItem('rizqflow_supabase_key')
            : undefined) ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (url && key) {
          await pushToSupabase(
            {
              funds: newFunds,
              transactions: newTransactions,
              categories: newCategories,
              settings: newSettings,
            },
            url,
            key
          );
        }
      } catch (err) {
        console.error('Failed to sync data to Supabase cloud:', err);
      }
    },
    []
  );

  // Initial load: 1. Try Supabase Cloud Database (for cross-device sync)
  //               2. Try Server API (/api/data)
  //               3. Fallback to localStorage cache
  useEffect(() => {
    async function loadData() {
      let loaded = false;

      // 1. Check Supabase Cloud first for multi-device sync
      const sbUrl =
        (typeof window !== 'undefined'
          ? localStorage.getItem('rizqwise_supabase_url') || localStorage.getItem('rizqflow_supabase_url')
          : null) || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const sbKey =
        (typeof window !== 'undefined'
          ? localStorage.getItem('rizqwise_supabase_key') || localStorage.getItem('rizqflow_supabase_key')
          : null) || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (sbUrl && sbKey) {
        try {
          const cloudRes = await pullFromSupabase(sbUrl, sbKey);
          if (cloudRes.success && cloudRes.data) {
            if (cloudRes.data.funds && cloudRes.data.funds.length > 0) setFunds(cloudRes.data.funds);
            if (cloudRes.data.transactions) setTransactions(cloudRes.data.transactions);
            if (cloudRes.data.categories && cloudRes.data.categories.length > 0) {
              const hasIncome = cloudRes.data.categories.some((c: Category) => c.type === 'income');
              const finalCats = hasIncome
                ? cloudRes.data.categories
                : [...cloudRes.data.categories, ...DEFAULT_CATEGORIES.filter((c) => c.type === 'income')];
              setCategories(finalCats);
            }
            if (cloudRes.data.settings) setSettings(cloudRes.data.settings);
            loaded = true;
          }
        } catch (cloudErr) {
          console.warn('Supabase cloud fetch failed, falling back to local...', cloudErr);
        }
      }

      // 2. Fallback to server API
      if (!loaded) {
        try {
          const res = await fetch('/api/data');
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
              if (json.data.funds && json.data.funds.length > 0) setFunds(json.data.funds);
              if (json.data.transactions) setTransactions(json.data.transactions);
              if (json.data.categories && json.data.categories.length > 0) {
                const hasIncome = json.data.categories.some((c: Category) => c.type === 'income');
                const finalCats = hasIncome
                  ? json.data.categories
                  : [...json.data.categories, ...DEFAULT_CATEGORIES.filter((c) => c.type === 'income')];
                setCategories(finalCats);
              }
              if (json.data.settings) setSettings(json.data.settings);
              loaded = true;
            }
          }
        } catch (err) {
          console.warn('Backend fetch failed, checking localStorage fallback...', err);
        }
      }

      // 3. Fallback to localStorage
      if (!loaded && typeof window !== 'undefined') {
        try {
          const cached =
            localStorage.getItem(LOCAL_STORAGE_KEY) ||
            localStorage.getItem(LEGACY_STORAGE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.funds) setFunds(parsed.funds);
            if (parsed.transactions) setTransactions(parsed.transactions);
            if (parsed.categories) {
              const hasIncome = parsed.categories.some((c: Category) => c.type === 'income');
              const finalCats = hasIncome
                ? parsed.categories
                : [...parsed.categories, ...DEFAULT_CATEGORIES.filter((c) => c.type === 'income')];
              setCategories(finalCats);
            }
            if (parsed.settings) setSettings(parsed.settings);
          }
        } catch (e) {
          console.error('Failed to load from localStorage cache:', e);
        }
      }

      setIsLoading(false);
    }

    loadData();

    // Auto-sync when device tab is focused or unlocked
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const sbUrl =
          localStorage.getItem('rizqwise_supabase_url') ||
          localStorage.getItem('rizqflow_supabase_url') ||
          process.env.NEXT_PUBLIC_SUPABASE_URL;
        const sbKey =
          localStorage.getItem('rizqwise_supabase_key') ||
          localStorage.getItem('rizqflow_supabase_key') ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (sbUrl && sbKey) {
          const cloudRes = await pullFromSupabase(sbUrl, sbKey);
          if (cloudRes.success && cloudRes.data) {
            if (cloudRes.data.funds) setFunds(cloudRes.data.funds);
            if (cloudRes.data.transactions) setTransactions(cloudRes.data.transactions);
            if (cloudRes.data.categories) setCategories(cloudRes.data.categories);
            if (cloudRes.data.settings) setSettings(cloudRes.data.settings);
          }
        }
      }
    };

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  // Compute date range for selected month
  const periodStart = useMemo(() => startOfMonth(selectedMonth), [selectedMonth]);
  const periodEnd = useMemo(() => endOfMonth(selectedMonth), [selectedMonth]);

  // Financial summary based on funds, all transactions, and current selected period
  const summary = useMemo(() => {
    return calculateFinancialSummary(funds, transactions, periodStart, periodEnd);
  }, [funds, transactions, periodStart, periodEnd]);

  const getFundById = useCallback(
    (id: string) => {
      return funds.find((f) => f.id === id);
    },
    [funds]
  );

  const getFundBalance = useCallback(
    (fundId: string) => {
      return summary.fundCalculations[fundId]?.currentBalance ?? 0;
    },
    [summary]
  );

  // 1. Add Income with automatic or custom allocation
  const addIncome = useCallback(
    ({
      amount,
      source,
      date,
      description,
      notes,
      allocationMethod,
      customAllocations,
    }: {
      amount: number;
      source: string;
      date: string;
      description: string;
      notes?: string;
      allocationMethod: 'automatic' | 'manual' | 'none';
      customAllocations?: FundAllocationSnapshot[];
    }) => {
      if (!amount || amount <= 0) {
        return { success: false, error: 'Please enter a valid positive income amount.' };
      }

      let allocations: FundAllocationSnapshot[] = [];

      if (allocationMethod === 'automatic') {
        const validation = validateAllocationRules(funds);
        if (!validation.isValid) {
          return {
            success: false,
            error: `Cannot automatically allocate: ${validation.message}`,
          };
        }
        allocations = calculateAllocations(amount, funds);
      } else if (allocationMethod === 'manual') {
        if (!customAllocations || customAllocations.length === 0) {
          return { success: false, error: 'Please specify allocation amounts for funds.' };
        }
        const totalAllocated = customAllocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
        if (Math.abs(totalAllocated - amount) > 0.01) {
          return {
            success: false,
            error: `Total allocations (${totalAllocated}) must equal the income amount (${amount}).`,
          };
        }
        allocations = customAllocations;
      } else {
        allocations = [];
      }

      const newTx: IncomeTransaction = {
        id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'income',
        amount,
        source: source || 'Other',
        date: date || format(new Date(), 'yyyy-MM-dd'),
        description: description || `Income from ${source || 'Other'}`,
        notes,
        allocationMethod,
        allocations,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const nextTransactions = [newTx, ...transactions];
      setTransactions(nextTransactions);
      persistState(funds, nextTransactions, categories, settings);

      return { success: true };
    },
    [funds, transactions, categories, settings, persistState]
  );

  // 2. Add Expense with fund balance check & negative balance protection
  const addExpense = useCallback(
    ({
      amount,
      title,
      date,
      fundId,
      category,
      description,
      notes,
      paymentMethod,
      forceAllowNegative = false,
    }: {
      amount: number;
      title: string;
      date: string;
      fundId: string;
      category: string;
      description?: string;
      notes?: string;
      paymentMethod?: string;
      forceAllowNegative?: boolean;
    }) => {
      if (!amount || amount <= 0) {
        return { success: false, error: 'Please enter a valid positive expense amount.' };
      }
      if (!fundId) {
        return { success: false, error: 'Please select a fund to pay this expense from.' };
      }

      const currentBalance = summary.fundCalculations[fundId]?.currentBalance ?? 0;
      const targetFund = funds.find((f) => f.id === fundId);
      const fundName = targetFund?.name || 'Selected Fund';

      if (currentBalance < amount && !forceAllowNegative) {
        if (settings.allowNegativeBalance) {
          return {
            success: false,
            requiresConfirmation: true,
            availableBalance: currentBalance,
            error: `Warning: This expense (${amount}) exceeds ${fundName}'s available balance (${currentBalance}). An overdraft will occur. Do you want to proceed?`,
          };
        } else {
          return {
            success: false,
            availableBalance: currentBalance,
            error: `Insufficient balance: ${fundName} only has ${currentBalance} available. Enable negative balances in Settings or choose another fund.`,
          };
        }
      }

      const newTx: ExpenseTransaction = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'expense',
        amount,
        title: title || `${category} Expense`,
        date: date || format(new Date(), 'yyyy-MM-dd'),
        fundId,
        category: category || 'Other',
        description,
        notes,
        paymentMethod,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const nextTransactions = [newTx, ...transactions];
      setTransactions(nextTransactions);
      persistState(funds, nextTransactions, categories, settings);

      return { success: true };
    },
    [funds, transactions, categories, settings, summary, persistState]
  );

  // 3. Add Transfer between funds
  const addTransfer = useCallback(
    ({
      amount,
      fromFundId,
      toFundId,
      date,
      title,
      description,
      notes,
      forceAllowNegative = false,
    }: {
      amount: number;
      fromFundId: string;
      toFundId: string;
      date: string;
      title: string;
      description?: string;
      notes?: string;
      forceAllowNegative?: boolean;
    }) => {
      if (!amount || amount <= 0) {
        return { success: false, error: 'Please enter a valid positive transfer amount.' };
      }
      if (!fromFundId || !toFundId) {
        return { success: false, error: 'Please select both source and destination funds.' };
      }
      if (fromFundId === toFundId) {
        return { success: false, error: 'Source and destination funds cannot be the same.' };
      }

      const senderBalance = summary.fundCalculations[fromFundId]?.currentBalance ?? 0;
      const fromFund = funds.find((f) => f.id === fromFundId);
      const toFund = funds.find((f) => f.id === toFundId);

      if (senderBalance < amount && !forceAllowNegative) {
        if (settings.allowNegativeBalance) {
          return {
            success: false,
            requiresConfirmation: true,
            availableBalance: senderBalance,
            error: `Warning: Transfer amount exceeds ${fromFund?.name}'s balance (${senderBalance}). Do you want to proceed?`,
          };
        } else {
          return {
            success: false,
            availableBalance: senderBalance,
            error: `Insufficient balance: ${fromFund?.name} only has ${senderBalance} available.`,
          };
        }
      }

      const newTx: TransferTransaction = {
        id: `trf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'transfer',
        amount,
        fromFundId,
        toFundId,
        date: date || format(new Date(), 'yyyy-MM-dd'),
        title: title || `Transfer: ${fromFund?.name} → ${toFund?.name}`,
        description,
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const nextTransactions = [newTx, ...transactions];
      setTransactions(nextTransactions);
      persistState(funds, nextTransactions, categories, settings);

      return { success: true };
    },
    [funds, transactions, categories, settings, summary, persistState]
  );

  // Update existing transaction
  const updateTransaction = useCallback(
    (id: string, updated: Partial<Transaction>) => {
      const idx = transactions.findIndex((t) => t.id === id);
      if (idx === -1) return { success: false, error: 'Transaction not found' };

      const existing = transactions[idx];
      const merged = {
        ...existing,
        ...updated,
        updatedAt: new Date().toISOString(),
      } as Transaction;

      const nextTransactions = [...transactions];
      nextTransactions[idx] = merged;
      setTransactions(nextTransactions);
      persistState(funds, nextTransactions, categories, settings);

      return { success: true };
    },
    [transactions, funds, categories, settings, persistState]
  );

  // Delete transaction
  const deleteTransaction = useCallback(
    (id: string) => {
      const nextTransactions = transactions.filter((t) => t.id !== id);
      setTransactions(nextTransactions);
      persistState(funds, nextTransactions, categories, settings);
      return { success: true };
    },
    [transactions, funds, categories, settings, persistState]
  );

  // Add fund
  const addFund = useCallback(
    ({
      name,
      icon,
      color,
      allocationPercentage,
      openingBalance = 0,
      monthlyBudget = null,
    }: {
      name: string;
      icon: string;
      color: string;
      allocationPercentage: number;
      openingBalance?: number;
      monthlyBudget?: number | null;
    }) => {
      if (!name.trim()) return { success: false, error: 'Fund name is required' };

      const newFund: Fund = {
        id: `fund-${Date.now()}`,
        name: name.trim(),
        icon: icon || 'Folder',
        color: color || '#F59E0B',
        allocationPercentage: Number(allocationPercentage) || 0,
        openingBalance: Number(openingBalance) || 0,
        monthlyBudget: monthlyBudget ? Number(monthlyBudget) : null,
        isArchived: false,
        order: funds.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const nextFunds = [...funds, newFund];
      setFunds(nextFunds);
      persistState(nextFunds, transactions, categories, settings);
      return { success: true };
    },
    [funds, transactions, categories, settings, persistState]
  );

  // Update fund
  const updateFund = useCallback(
    (id: string, updated: Partial<Fund>) => {
      const nextFunds = funds.map((f) =>
        f.id === id
          ? {
              ...f,
              ...updated,
              updatedAt: new Date().toISOString(),
            }
          : f
      );
      setFunds(nextFunds);
      persistState(nextFunds, transactions, categories, settings);
      return { success: true };
    },
    [funds, transactions, categories, settings, persistState]
  );

  // Delete/Archive fund
  const deleteFund = useCallback(
    (id: string) => {
      const hasTransactions = transactions.some((t) => {
        if (t.type === 'expense' && t.fundId === id) return true;
        if (t.type === 'transfer' && (t.fromFundId === id || t.toFundId === id)) return true;
        if (t.type === 'income' && t.allocations?.some((a) => a.fundId === id)) return true;
        return false;
      });

      let nextFunds: Fund[];
      if (hasTransactions) {
        // Safe archive so historical transaction balances remain accurate
        nextFunds = funds.map((f) => (f.id === id ? { ...f, isArchived: true } : f));
      } else {
        nextFunds = funds.filter((f) => f.id !== id);
      }

      setFunds(nextFunds);
      persistState(nextFunds, transactions, categories, settings);
      return { success: true };
    },
    [funds, transactions, categories, settings, persistState]
  );

  // Update Allocation Rules (Strict 100% check)
  const updateAllocationRules = useCallback(
    (rules: { fundId: string; percentage: number }[]) => {
      const total = rules.reduce((acc, r) => acc + (Number(r.percentage) || 0), 0);
      const roundedTotal = Math.round(total * 100) / 100;

      if (roundedTotal !== 100) {
        return {
          success: false,
          error: `Total percentage must equal 100%. Current total: ${roundedTotal}%`,
        };
      }

      const nextFunds = funds.map((f) => {
        const rule = rules.find((r) => r.fundId === f.id);
        if (rule) {
          return {
            ...f,
            allocationPercentage: rule.percentage,
            updatedAt: new Date().toISOString(),
          };
        }
        return f;
      });

      setFunds(nextFunds);
      persistState(nextFunds, transactions, categories, settings);
      return { success: true };
    },
    [funds, transactions, categories, settings, persistState]
  );

  // Add Category
  const addCategory = useCallback(
    (category: { name: string; icon: string; color: string; type: 'expense' | 'income' }) => {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: category.name.trim(),
        icon: category.icon || 'Tag',
        color: category.color || '#F59E0B',
        type: category.type,
        isCustom: true,
      };
      const nextCategories = [...categories, newCat];
      setCategories(nextCategories);
      persistState(funds, transactions, nextCategories, settings);
      return newCat;
    },
    [categories, funds, transactions, settings, persistState]
  );

  // Delete Category
  const deleteCategory = useCallback(
    (id: string) => {
      const nextCategories = categories.filter((c) => c.id !== id);
      setCategories(nextCategories);
      persistState(funds, transactions, nextCategories, settings);
    },
    [categories, funds, transactions, settings, persistState]
  );

  // Sync with Cloud Database
  const syncWithCloud = useCallback(
    async (customUrl?: string, customKey?: string) => {
      const url =
        customUrl ||
        settings.supabaseUrl ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('rizqwise_supabase_url') || localStorage.getItem('rizqflow_supabase_url')
          : undefined) ||
        process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key =
        customKey ||
        settings.supabaseAnonKey ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('rizqwise_supabase_key') || localStorage.getItem('rizqflow_supabase_key')
          : undefined) ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        return { success: false, message: 'Please enter your Supabase Project URL and Anon API Key.' };
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('rizqwise_supabase_url', url);
        localStorage.setItem('rizqwise_supabase_key', key);
        localStorage.setItem('rizqflow_supabase_url', url);
        localStorage.setItem('rizqflow_supabase_key', key);
      }

      const res = await pushToSupabase(
        { funds, transactions, categories, settings },
        url,
        key
      );

      if (!res.success) {
        return { success: false, message: res.error || 'Failed to sync with Supabase cloud.' };
      }

      const updatedSettings: AppSettings = {
        ...settings,
        supabaseUrl: url,
        supabaseAnonKey: key,
        cloudSyncEnabled: true,
        lastSyncedAt: new Date().toISOString(),
      };
      setSettings(updatedSettings);
      persistState(funds, transactions, categories, updatedSettings);

      return {
        success: true,
        message: 'Connected & Synced! All your devices with these credentials will stay in sync.',
      };
    },
    [funds, transactions, categories, settings, persistState]
  );

  // Pull latest from Cloud Database
  const pullLatestFromCloud = useCallback(
    async (customUrl?: string, customKey?: string) => {
      const url =
        customUrl ||
        settings.supabaseUrl ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('rizqwise_supabase_url') || localStorage.getItem('rizqflow_supabase_url')
          : undefined) ||
        process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key =
        customKey ||
        settings.supabaseAnonKey ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('rizqwise_supabase_key') || localStorage.getItem('rizqflow_supabase_key')
          : undefined) ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        return { success: false, message: 'Supabase credentials missing.' };
      }

      const res = await pullFromSupabase(url, key);
      if (res.success && res.data) {
        if (res.data.funds) setFunds(res.data.funds);
        if (res.data.transactions) setTransactions(res.data.transactions);
        if (res.data.categories) setCategories(res.data.categories);
        if (res.data.settings) setSettings(res.data.settings);
        persistState(
          res.data.funds || funds,
          res.data.transactions || transactions,
          res.data.categories || categories,
          res.data.settings || settings
        );
        return { success: true, message: 'Latest financial data successfully loaded from cloud!' };
      }
      return { success: false, message: res.error || 'No remote cloud data found yet.' };
    },
    [funds, transactions, categories, settings, persistState]
  );

  // Update Settings
  const updateSettings = useCallback(
    (newSettings: Partial<AppSettings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      persistState(funds, transactions, categories, updated);
    },
    [settings, funds, transactions, categories, persistState]
  );

  // Import Full Data
  const importData = useCallback(
    (data: { funds?: Fund[]; transactions?: Transaction[]; categories?: Category[]; settings?: AppSettings }) => {
      try {
        const newFunds = data.funds || funds;
        const newTransactions = data.transactions || transactions;
        const newCategories = data.categories || categories;
        const newSettings = data.settings || settings;

        setFunds(newFunds);
        setTransactions(newTransactions);
        setCategories(newCategories);
        setSettings(newSettings);
        persistState(newFunds, newTransactions, newCategories, newSettings);
        return true;
      } catch (e) {
        console.error('Import failed:', e);
        return false;
      }
    },
    [funds, transactions, categories, settings, persistState]
  );

  // Reset to Defaults
  const resetToDefaults = useCallback(() => {
    setFunds(DEFAULT_FUNDS);
    setTransactions([]);
    setCategories(DEFAULT_CATEGORIES);
    setSettings(DEFAULT_SETTINGS);
    persistState(DEFAULT_FUNDS, [], DEFAULT_CATEGORIES, DEFAULT_SETTINGS);
  }, [persistState]);

  return (
    <FinanceContext.Provider
      value={{
        funds,
        transactions,
        categories,
        settings,
        isLoading,
        selectedMonth,
        setSelectedMonth,
        summary,
        addIncome,
        addExpense,
        addTransfer,
        updateTransaction,
        deleteTransaction,
        addFund,
        updateFund,
        deleteFund,
        updateAllocationRules,
        addCategory,
        deleteCategory,
        syncWithCloud,
        pullLatestFromCloud,
        updateSettings,
        importData,
        resetToDefaults,
        getFundById,
        getFundBalance,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
