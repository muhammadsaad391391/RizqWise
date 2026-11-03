'use client';

import React, { useState, useEffect } from 'react';
import { useFinance } from '@/lib/context/finance-context';
import { CategoryLoan } from '@/types/finance';
import { formatCurrency } from '@/lib/finance-engine';
import { IconRenderer } from '@/components/common/icon-renderer';
import { format } from 'date-fns';
import { X, ArrowRightLeft, HandCoins, AlertCircle } from 'lucide-react';

interface LoanRepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: CategoryLoan | null;
}

export function LoanRepaymentModal({ isOpen, onClose, loan }: LoanRepaymentModalProps) {
  const { funds, settings, summary, repayCategoryLoan } = useFinance();

  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (loan) {
      setAmountStr((loan.remainingAmount ?? (loan.amount - (loan.amountRepaid || 0))).toString());
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
      setErrorMsg(null);
    }
  }, [loan, isOpen]);

  if (!isOpen || !loan) return null;

  const lenderFund = funds.find((f) => f.id === loan.lenderFundId);
  const borrowerFund = funds.find((f) => f.id === loan.borrowerFundId);
  const borrowerBalance = summary.fundCalculations[loan.borrowerFundId]?.currentBalance ?? 0;
  const remaining = loan.remainingAmount ?? (loan.amount - (loan.amountRepaid || 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid positive repayment amount.');
      return;
    }

    if (numAmount > remaining) {
      setErrorMsg(`Repayment amount cannot exceed remaining loan balance (${formatCurrency(remaining, settings)}).`);
      return;
    }

    if (borrowerBalance < numAmount && !settings.allowNegativeBalance) {
      setErrorMsg(`Insufficient balance: ${borrowerFund?.name} only has ${formatCurrency(borrowerBalance, settings)} available.`);
      return;
    }

    const res = repayCategoryLoan({
      loanId: loan.id,
      amount: numAmount,
      date,
      notes,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to process repayment.');
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-modal overflow-hidden border border-slate-200/80 flex flex-col">
        {/* Header */}
        <div className="bg-brand-header px-5 py-4 border-b border-brand-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs">
              <HandCoins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">Repay Category Loan</h3>
              <p className="text-[11px] text-slate-600 font-medium">Settle debt between internal funds</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-900/10 text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Loan Overview Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Borrower (Paying Back)</span>
              <span className="font-bold text-slate-800">{borrowerFund?.name || 'Borrower'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lender (Receiving Money)</span>
              <span className="font-bold text-slate-800">{lenderFund?.name || 'Lender'}</span>
            </div>
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
              <span className="font-bold text-slate-700">Remaining Loan Balance:</span>
              <span className="text-sm font-black text-rose-600">{formatCurrency(remaining, settings)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{borrowerFund?.name}&apos;s Current Balance:</span>
              <span className="font-semibold text-slate-700">{formatCurrency(borrowerBalance, settings)}</span>
            </div>
          </div>

          {/* Repayment Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Repayment Amount ({settings.currencySymbol}) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                max={remaining}
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full px-3.5 py-2.5 text-lg font-black border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setAmountStr(remaining.toString())}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors"
              >
                Pay Full
              </button>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared after client payment"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>

          {/* Informative Note */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-blue-800 leading-relaxed">
            ℹ️ <strong>Accounting Note:</strong> This repayment will be lodged as an outflow/expense from <strong>{borrowerFund?.name}</strong> and sent to <strong>{lenderFund?.name}</strong> to settle the loan.
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-500 rounded-xl shadow-md transition-all"
            >
              Confirm Repayment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
