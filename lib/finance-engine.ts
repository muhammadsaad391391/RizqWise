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
  DeficitFundInfo,
  CategoryLoan,
  TransactionPostBalance,
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
 * Calculates allocations for an income amount with automatic deficit clearance.
 * When a fund has a negative balance (deficit), that deficit can be routed
 * to replenish the indebted fund(s), deducting the same amount from the user's
 * chosen spendable fund(s) (e.g. Personal Expenses & Brother).
 */
export function calculateAllocationsWithDeficitAdjustment(
  amount: number,
  funds: Fund[],
  deficitFunds: DeficitFundInfo[],
  spendableFundIds: string[]
): {
  snapshots: FundAllocationSnapshot[];
  totalDeficitCleared: number;
  clearedPerFund: Record<string, number>;
  deductedPerSpendableFund: Record<string, number>;
} {
  const baseSnapshots = calculateAllocations(amount, funds);
  const clearedPerFund: Record<string, number> = {};
  const deductedPerSpendableFund: Record<string, number> = {};

  if (!deficitFunds || deficitFunds.length === 0 || !spendableFundIds || spendableFundIds.length === 0) {
    return {
      snapshots: baseSnapshots,
      totalDeficitCleared: 0,
      clearedPerFund,
      deductedPerSpendableFund,
    };
  }

  // Filter spendable funds that are active and have positive baseline allocation from this income
  const spendableSnapshots = baseSnapshots.filter((s) => spendableFundIds.includes(s.fundId));
  const totalSpendableAllocated = spendableSnapshots.reduce((sum, s) => sum + s.amount, 0);

  if (totalSpendableAllocated <= 0) {
    return {
      snapshots: baseSnapshots,
      totalDeficitCleared: 0,
      clearedPerFund,
      deductedPerSpendableFund,
    };
  }

  // Total deficit to clear across deficit funds
  const totalDeficitNeeded = deficitFunds.reduce((sum, d) => sum + d.deficitAmount, 0);
  // Cap at what spendable funds can absorb
  const totalToClear = Math.round(Math.min(totalDeficitNeeded, totalSpendableAllocated) * 100) / 100;

  if (totalToClear <= 0) {
    return {
      snapshots: baseSnapshots,
      totalDeficitCleared: 0,
      clearedPerFund,
      deductedPerSpendableFund,
    };
  }

  // Distribute clearance amount across deficit funds
  let remainingClearance = totalToClear;
  for (let i = 0; i < deficitFunds.length; i++) {
    const d = deficitFunds[i];
    const canClearForFund = Math.min(d.deficitAmount, remainingClearance);
    clearedPerFund[d.fundId] = Math.round(canClearForFund * 100) / 100;
    remainingClearance = Math.round((remainingClearance - canClearForFund) * 100) / 100;
  }

  // Distribute deduction across selected spendable funds proportionally
  let remainingDeduction = totalToClear;
  for (let i = 0; i < spendableSnapshots.length; i++) {
    const s = spendableSnapshots[i];
    const isLast = i === spendableSnapshots.length - 1;
    let share = 0;
    if (isLast) {
      share = remainingDeduction;
    } else {
      const proportion = s.amount / totalSpendableAllocated;
      share = Math.min(s.amount, Math.round(totalToClear * proportion * 100) / 100);
    }
    deductedPerSpendableFund[s.fundId] = share;
    remainingDeduction = Math.round((remainingDeduction - share) * 100) / 100;
  }

  // Apply adjustments to snapshots
  const adjustedSnapshots = baseSnapshots.map((snapshot) => {
    let newAmount = snapshot.amount;
    if (clearedPerFund[snapshot.fundId]) {
      newAmount += clearedPerFund[snapshot.fundId];
    }
    if (deductedPerSpendableFund[snapshot.fundId]) {
      newAmount -= deductedPerSpendableFund[snapshot.fundId];
    }
    return {
      ...snapshot,
      amount: Math.round(newAmount * 100) / 100,
    };
  });

  return {
    snapshots: adjustedSnapshots,
    totalDeficitCleared: totalToClear,
    clearedPerFund,
    deductedPerSpendableFund,
  };
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
  periodEnd?: Date,
  loans: CategoryLoan[] = []
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
      totalOutflows: 0,
      totalInflows: 0,
      activeLoansBorrowed: 0,
      activeLoansLent: 0,
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

  // Calculate budgets, deficits, and round numbers
  let totalBalance = 0;
  let totalDeficit = 0;
  let positiveWealth = 0;
  const deficitFunds: DeficitFundInfo[] = [];

  for (const fund of funds) {
    const calc = calculations[fund.id];
    calc.currentBalance = Math.round(calc.currentBalance * 100) / 100;
    calc.lifetimeAllocated = Math.round(calc.lifetimeAllocated * 100) / 100;
    calc.lifetimeSpent = Math.round(calc.lifetimeSpent * 100) / 100;
    calc.transfersReceived = Math.round(calc.transfersReceived * 100) / 100;
    calc.transfersSent = Math.round(calc.transfersSent * 100) / 100;

    // Outflows & Inflows from the fund's own perspective:
    // When money is transferred out, it counts as an outflow/expense from that category.
    // When money is transferred in, it counts as incoming into that category (without increasing overall app income).
    calc.totalOutflows = Math.round((calc.lifetimeSpent + calc.transfersSent) * 100) / 100;
    calc.totalInflows = Math.round((calc.lifetimeAllocated + calc.transfersReceived + (fund.openingBalance || 0)) * 100) / 100;

    // Active Category Loans
    const borrowed = (loans || [])
      .filter((l) => l.borrowerFundId === fund.id && l.status === 'active')
      .reduce((sum, l) => sum + (l.remainingAmount ?? (l.amount - (l.amountRepaid || 0))), 0);
    const lent = (loans || [])
      .filter((l) => l.lenderFundId === fund.id && l.status === 'active')
      .reduce((sum, l) => sum + (l.remainingAmount ?? (l.amount - (l.amountRepaid || 0))), 0);

    calc.activeLoansBorrowed = Math.round(borrowed * 100) / 100;
    calc.activeLoansLent = Math.round(lent * 100) / 100;

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

      // Deficit calculation:
      // A fund is in deficit/debit if:
      // 1. Its currentBalance is negative (overdrawn): def = abs(currentBalance)
      // 2. Or it has an unaccounted shortfall/deviation where distributed > accounted: def = deviation
      // 3. Or it has an active loan borrowed that is pending repayment: def = activeLoansBorrowed
      const negativeDef = calc.currentBalance < 0 ? Math.abs(calc.currentBalance) : 0;
      const deviationDef = calc.deviation && calc.deviation > 0 ? calc.deviation : 0;
      const loanDef = calc.activeLoansBorrowed > 0 ? calc.activeLoansBorrowed : 0;
      const fundDeficit = Math.round(Math.max(negativeDef, deviationDef, loanDef) * 100) / 100;

      if (fundDeficit > 0) {
        totalDeficit += fundDeficit;
        deficitFunds.push({
          fundId: fund.id,
          fundName: fund.name,
          deficitAmount: fundDeficit,
          currentBalance: calc.currentBalance,
          deviation: calc.deviation,
          color: fund.color,
          icon: fund.icon,
        });
      }

      if (calc.currentBalance > 0) {
        positiveWealth += calc.currentBalance;
      }
    }

    if (calc.monthlyBudget && calc.monthlyBudget > 0) {
      calc.budgetRemaining = Math.round((calc.monthlyBudget - calc.budgetSpent) * 100) / 100;
      calc.budgetUtilization = Math.round((calc.budgetSpent / calc.monthlyBudget) * 1000) / 10;
    }
  }

  const activeLoans = (loans || []).filter((l) => l.status === 'active');
  const totalActiveLoans = activeLoans.reduce((sum, l) => sum + (l.remainingAmount ?? (l.amount - (l.amountRepaid || 0))), 0);

  return {
    totalBalance: Math.round(totalBalance * 100) / 100,
    periodIncome: Math.round(periodIncome * 100) / 100,
    periodExpenses: Math.round(periodExpenses * 100) / 100,
    periodAllocated: Math.round(periodAllocated * 100) / 100,
    netSavings: Math.round((periodIncome - periodExpenses) * 100) / 100,
    fundCalculations: calculations,
    totalDeficit: Math.round(totalDeficit * 100) / 100,
    deficitFunds,
    netAvailableWealth: Math.round((positiveWealth - totalDeficit) * 100) / 100,
    categoryLoans: loans || [],
    totalActiveLoans: Math.round(totalActiveLoans * 100) / 100,
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

/**
 * Calculates the exact running balance of each fund and total wealth after each transaction.
 * Processes transactions chronologically so that for every transaction, users can see
 * exactly what the balance was after that transaction occurred at that time.
 */
export function calculateTransactionRunningBalances(
  funds: Fund[],
  transactions: Transaction[]
): Record<string, TransactionPostBalance> {
  const result: Record<string, TransactionPostBalance> = {};
  if (!transactions || transactions.length === 0) return result;

  // Initialize running balances from fund opening balances and adjustments
  const currentFundBalances: Record<string, number> = {};
  for (const fund of funds) {
    currentFundBalances[fund.id] = (fund.openingBalance || 0) + (fund.manualBalanceAdjustment || 0);
  }

  // Sort transactions chronologically (oldest first)
  const sorted = [...transactions].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    if (timeA !== timeB) return timeA - timeB;
    const createA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return createA - createB;
  });

  for (const tx of sorted) {
    if (tx.type === 'income') {
      const inc = tx as IncomeTransaction;
      if (inc.allocations && inc.allocations.length > 0) {
        for (const alloc of inc.allocations) {
          const prev = currentFundBalances[alloc.fundId] || 0;
          currentFundBalances[alloc.fundId] = Math.round((prev + alloc.amount) * 100) / 100;
        }
      }
    } else if (tx.type === 'expense') {
      const exp = tx as ExpenseTransaction;
      const prev = currentFundBalances[exp.fundId] || 0;
      currentFundBalances[exp.fundId] = Math.round((prev - exp.amount) * 100) / 100;
    } else if (tx.type === 'transfer') {
      const trf = tx as TransferTransaction;
      const prevFrom = currentFundBalances[trf.fromFundId] || 0;
      currentFundBalances[trf.fromFundId] = Math.round((prevFrom - trf.amount) * 100) / 100;

      const prevTo = currentFundBalances[trf.toFundId] || 0;
      currentFundBalances[trf.toFundId] = Math.round((prevTo + trf.amount) * 100) / 100;
    }

    // Compute active total wealth after this transaction
    let totalBal = 0;
    for (const fund of funds) {
      if (!fund.isArchived) {
        totalBal += currentFundBalances[fund.id] || 0;
      }
    }
    totalBal = Math.round(totalBal * 100) / 100;

    let fundBalAfter: number | undefined;
    let fromBalAfter: number | undefined;
    let toBalAfter: number | undefined;

    if (tx.type === 'expense') {
      fundBalAfter = currentFundBalances[(tx as ExpenseTransaction).fundId];
    } else if (tx.type === 'transfer') {
      fromBalAfter = currentFundBalances[(tx as TransferTransaction).fromFundId];
      toBalAfter = currentFundBalances[(tx as TransferTransaction).toFundId];
      fundBalAfter = toBalAfter;
    } else if (tx.type === 'income') {
      const inc = tx as IncomeTransaction;
      if (inc.allocations && inc.allocations.length === 1) {
        fundBalAfter = currentFundBalances[inc.allocations[0].fundId];
      }
    }

    result[tx.id] = {
      transactionId: tx.id,
      totalBalanceAfter: totalBal,
      fundBalanceAfter: fundBalAfter,
      fromFundBalanceAfter: fromBalAfter,
      toFundBalanceAfter: toBalAfter,
      fundBalancesAfter: { ...currentFundBalances },
    };
  }

  return result;
}
