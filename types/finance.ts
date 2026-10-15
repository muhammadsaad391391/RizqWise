export interface Fund {
  id: string;
  name: string;
  icon: string;
  color: string;
  allocationPercentage: number;
  openingBalance: number;
  monthlyBudget: number | null;
  isArchived: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface FundAllocationSnapshot {
  fundId: string;
  fundName: string;
  percentage: number;
  amount: number;
}

export interface IncomeTransaction {
  id: string;
  type: 'income';
  amount: number;
  source: string;
  date: string; // YYYY-MM-DD
  description: string;
  notes?: string;
  allocationMethod: 'automatic' | 'manual' | 'none';
  allocations: FundAllocationSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseTransaction {
  id: string;
  type: 'expense';
  amount: number;
  title: string;
  date: string; // YYYY-MM-DD
  fundId: string;
  category: string;
  description?: string;
  notes?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransferTransaction {
  id: string;
  type: 'transfer';
  amount: number;
  fromFundId: string;
  toFundId: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type Transaction = IncomeTransaction | ExpenseTransaction | TransferTransaction;

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  isCustom?: boolean;
}

export interface AppSettings {
  appName: string;
  tagline: string;
  currency: string;
  currencySymbol: string;
  currencyPosition: 'prefix' | 'suffix';
  dateFormat: string;
  monthStartDay: number;
  allowNegativeBalance: boolean;
  onboardingCompleted: boolean;
  budgetWarningThreshold: number; // e.g. 80
}

export interface FundCalculations {
  fundId: string;
  openingBalance: number;
  lifetimeAllocated: number;
  lifetimeSpent: number;
  transfersReceived: number;
  transfersSent: number;
  currentBalance: number;
  periodAllocated: number;
  periodSpent: number;
  periodTransfersReceived: number;
  periodTransfersSent: number;
  monthlyBudget: number | null;
  budgetSpent: number;
  budgetRemaining: number | null;
  budgetUtilization: number | null;
}

export interface DashboardSummary {
  totalBalance: number;
  periodIncome: number;
  periodExpenses: number;
  periodAllocated: number;
  netSavings: number;
  fundCalculations: Record<string, FundCalculations>;
}
