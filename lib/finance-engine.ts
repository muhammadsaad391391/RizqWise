import {
  Fund,
  Transaction,
  IncomeTransaction,
  ExpenseTransaction,
  TransferTransaction,
  FundAllocationSnapshot,
  FundCalculations,
  DashboardSummary,
  AppSettings,
} from '@/types/finance';
import { parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Calculates allocations for an income amount according to active fund percentages.
 * Guarantees exact sum matching with rounding reconciliation.
 */
export function calculateAllocations(
  amount: number,
  funds: Fund[]
): FundAllocationSnapshot[] {
  const activeFunds = funds.filter((f) => !f.isArchived);
  if (activeFunds.length === 0 || amount <= 0) return [];

  const totalPercentage = activeFunds.reduce((sum, f) => sum + f.allocationPercentage, 0);

  // If percentages don't total 100%, we normalize or calculate proportional
  let allocatedSum = 0;
  const snapshots: FundAllocationSnapshot[] = [];

  // Work with integer minor units (or cents: rounded to 2 decimals or whole integers for PKR)
  // Since PKR is usually handled in whole rupees or 2 decimal places, let's round to 2 decimals:
  for (let i = 0; i < activeFunds.length; i++) {
    const fund = activeFunds[i];
    // Exact proportion based on fund percentage
    const rawAmount = Math.round(((amount * fund.allocationPercentage) / 100) * 100) / 100;
    snapshots.push({
      fundId: fund.id,
      fundName: fund.name,
      percentage: fund.allocationPercentage,
      amount: rawAmount,
    });
    allocatedSum += rawAmount;
  }

  // Rounding difference reconciliation
  const difference = Math.round((amount - allocatedSum) * 100) / 100;
  if (difference !== 0 && snapshots.length > 0) {
    // Add difference to fund with the highest allocation to minimize percentage distortion
    let maxIdx = 0;
    for (let i = 1; i < snapshots.length; i++) {
      if (snapshots[i].amount > snapshots[maxIdx].amount) {
        maxIdx = i;
      }
    }
    snapshots[maxIdx].amount = Math.round((snapshots[maxIdx].amount + difference) * 100) / 100;
  }

  return snapshots;
}

/**
 * Validates that allocation rules sum up to exactly 100%
 */
export function validateAllocationRules(funds: Fund[]): {
  isValid: boolean;
  totalPercentage: number;
  remainingPercentage: number;
  message?: string;
} {
  const activeFunds = funds.filter((f) => !f.isArchived);
  const total = activeFunds.reduce((acc, f) => acc + (Number(f.allocationPercentage) || 0), 0);
  const roundedTotal = Math.round(total * 100) / 100;
  const remaining = Math.round((100 - roundedTotal) * 100) / 100;

  if (roundedTotal === 100) {
    return { isValid: true, totalPercentage: 100, remainingPercentage: 0 };
  } else if (roundedTotal < 100) {
    return {
      isValid: false,
      totalPercentage: roundedTotal,
      remainingPercentage: remaining,
      message: `${remaining}% remains unallocated. Allocation rules must total exactly 100%.`,
    };
  } else {
    return {
      isValid: false,
      totalPercentage: roundedTotal,
      remainingPercentage: remaining,
      message: `Total allocation is ${roundedTotal}%, exceeding 100% by ${Math.abs(remaining)}%.`,
    };
  }
}

/**
 * Calculates current balances, period metrics, and budget status for all funds.
 */
export function calculateFinancialSummary(
  funds: Fund[],
  transactions: Transaction[],
  periodStart?: Date,
  periodEnd?: Date
): DashboardSummary {
  const calculations: Record<string, FundCalculations> = {};

  // Initialize calculations for each fund
  for (const fund of funds) {
    calculations[fund.id] = {
      fundId: fund.id,
      openingBalance: fund.openingBalance || 0,
      lifetimeAllocated: 0,
      lifetimeSpent: 0,
      transfersReceived: 0,
      transfersSent: 0,
      currentBalance: (fund.openingBalance || 0) + (fund.manualBalanceAdjustment || 0),
      periodAllocated: 0,
      periodSpent: 0,
      periodTransfersReceived: 0,
      periodTransfersSent: 0,
      monthlyBudget: fund.monthlyBudget,
      budgetSpent: 0,
      budgetRemaining: fund.monthlyBudget,
      budgetUtilization: 0,
      totalDistributed: 0,
      accountedAmount: 0,
      deviation: 0,
      isReconciled: true,
    };
  }

  let periodIncome = 0;
  let periodExpenses = 0;
  let periodAllocated = 0;

  // Process all transactions
  for (const tx of transactions) {
    const txDate = parseISO(tx.date);
    const inPeriod =
      periodStart && periodEnd
        ? isWithinInterval(txDate, { start: periodStart, end: periodEnd })
        : true;

    if (tx.type === 'income') {
      const inc = tx as IncomeTransaction;
      if (inPeriod) {
        periodIncome += inc.amount;
      }

      if (inc.allocations && inc.allocations.length > 0) {
        for (const alloc of inc.allocations) {
          if (calculations[alloc.fundId]) {
            calculations[alloc.fundId].lifetimeAllocated += alloc.amount;
            calculations[alloc.fundId].currentBalance += alloc.amount;

            if (inPeriod) {
              calculations[alloc.fundId].periodAllocated += alloc.amount;
              periodAllocated += alloc.amount;
            }
          }
        }
      }
    } else if (tx.type === 'expense') {
      const exp = tx as ExpenseTransaction;
      if (calculations[exp.fundId]) {
        calculations[exp.fundId].lifetimeSpent += exp.amount;
        calculations[exp.fundId].currentBalance -= exp.amount;

        if (inPeriod) {
          calculations[exp.fundId].periodSpent += exp.amount;
          calculations[exp.fundId].budgetSpent += exp.amount;
          periodExpenses += exp.amount;
        }
      }
    } else if (tx.type === 'transfer') {
      const trf = tx as TransferTransaction;
      // Sender
      if (calculations[trf.fromFundId]) {
        calculations[trf.fromFundId].transfersSent += trf.amount;
        calculations[trf.fromFundId].currentBalance -= trf.amount;

        if (inPeriod) {
          calculations[trf.fromFundId].periodTransfersSent += trf.amount;
        }
      }
      // Recipient
      if (calculations[trf.toFundId]) {
        calculations[trf.toFundId].transfersReceived += trf.amount;
        calculations[trf.toFundId].currentBalance += trf.amount;

        if (inPeriod) {
          calculations[trf.toFundId].periodTransfersReceived += trf.amount;
        }
      }
    }
  }

  // Calculate budgets and round numbers
  let totalBalance = 0;
  for (const fund of funds) {
    const calc = calculations[fund.id];
    calc.currentBalance = Math.round(calc.currentBalance * 100) / 100;
    calc.lifetimeAllocated = Math.round(calc.lifetimeAllocated * 100) / 100;
    calc.lifetimeSpent = Math.round(calc.lifetimeSpent * 100) / 100;
    calc.transfersReceived = Math.round(calc.transfersReceived * 100) / 100;
    calc.transfersSent = Math.round(calc.transfersSent * 100) / 100;

    // Total Distributed & Reconciliation Tracking
    calc.totalDistributed = calc.lifetimeAllocated;
    const netTransfersOut = calc.transfersSent - calc.transfersReceived;
    const totalInflow = calc.lifetimeAllocated + (fund.openingBalance || 0);
    const accounted = calc.currentBalance + calc.lifetimeSpent + netTransfersOut;
    const rawDeviation = Math.round((totalInflow - accounted) * 100) / 100;

    calc.accountedAmount = Math.round(accounted * 100) / 100;
    calc.deviation = rawDeviation;
    calc.isReconciled = Math.abs(rawDeviation) < 0.01;

    if (!fund.isArchived) {
      totalBalance += calc.currentBalance;
    }

    if (calc.monthlyBudget && calc.monthlyBudget > 0) {
      calc.budgetRemaining = Math.round((calc.monthlyBudget - calc.budgetSpent) * 100) / 100;
      calc.budgetUtilization = Math.round((calc.budgetSpent / calc.monthlyBudget) * 1000) / 10;
    }
  }

  return {
    totalBalance: Math.round(totalBalance * 100) / 100,
    periodIncome: Math.round(periodIncome * 100) / 100,
    periodExpenses: Math.round(periodExpenses * 100) / 100,
    periodAllocated: Math.round(periodAllocated * 100) / 100,
    netSavings: Math.round((periodIncome - periodExpenses) * 100) / 100,
    fundCalculations: calculations,
  };
}

/**
 * Format currency with user's settings (e.g. Rs. 100,000 or $1,500)
 */
export function formatCurrency(
  amount: number,
  settings: Partial<AppSettings> = {}
): string {
  const symbol = settings.currencySymbol || 'Rs.';
  const pos = settings.currencyPosition || 'prefix';

  const formattedNum = (amount ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return pos === 'prefix' ? `${symbol} ${formattedNum}` : `${formattedNum} ${symbol}`;
}
