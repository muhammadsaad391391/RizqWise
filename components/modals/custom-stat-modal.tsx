'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '@/lib/context/finance-context';
import { formatCurrency } from '@/lib/finance-engine';
import { IconRenderer } from '@/components/common/icon-renderer';
import { CustomStatMetric } from '@/types/finance';
import {
  X,
  Plus,
  Trash2,
  Check,
  Briefcase,
  Wallet,
  ShoppingBag,
  TrendingUp,
  Sparkles,
  Info,
} from 'lucide-react';

interface CustomStatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStat?: CustomStatMetric | null;
}

const AVAILABLE_ICONS = [
  'Briefcase',
  'Wallet',
  'ShoppingBag',
  'TrendingUp',
  'PiggyBank',
  'Sparkles',
  'Folder',
  'Coins',
  'Home',
  'Laptop',
];

const AVAILABLE_COLORS = [
  '#0284C7', // Sky
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#64748B', // Slate
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

export function CustomStatModal({ isOpen, onClose, initialStat }: CustomStatModalProps) {
  const { funds, summary, settings, addCustomStat, updateCustomStat, deleteCustomStat } = useFinance();

  const [name, setName] = useState('');
  const [selectedFundIds, setSelectedFundIds] = useState<string[]>([]);
  const [icon, setIcon] = useState('Briefcase');
  const [color, setColor] = useState('#0284C7');
  const [error, setError] = useState<string | null>(null);

  const activeFunds = useMemo(() => funds.filter((f) => !f.isArchived), [funds]);

  // Reset or initialize state
  useEffect(() => {
    if (initialStat) {
      setName(initialStat.name);
      setSelectedFundIds(initialStat.fundIds || []);
      setIcon(initialStat.icon || 'Briefcase');
      setColor(initialStat.color || '#0284C7');
    } else {
      setName('');
      setSelectedFundIds([]);
      setIcon('Briefcase');
      setColor('#0284C7');
    }
    setError(null);
  }, [initialStat, isOpen]);

  // Calculate live combined total of selected funds
  const combinedTotal = useMemo(() => {
    return selectedFundIds.reduce((sum, fid) => {
      const calc = summary.fundCalculations[fid];
      return sum + (calc?.currentBalance ?? 0);
    }, 0);
  }, [selectedFundIds, summary.fundCalculations]);

  if (!isOpen) return null;

  const toggleFund = (fundId: string) => {
    setSelectedFundIds((prev) =>
      prev.includes(fundId) ? prev.filter((id) => id !== fundId) : [...prev, fundId]
    );
  };

  const handleApplyPreset = (presetName: string, targetFundKeywords: string[]) => {
    setName(presetName);
    const matchingIds = activeFunds
      .filter((f) => targetFundKeywords.some((kw) => f.name.toLowerCase().includes(kw.toLowerCase())))
      .map((f) => f.id);
    setSelectedFundIds(matchingIds);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for this combined stat (e.g. Available for Business).');
      return;
    }
    if (selectedFundIds.length === 0) {
      setError('Please select at least one fund to combine.');
      return;
    }

    if (initialStat) {
      updateCustomStat(initialStat.id, {
        name: name.trim(),
        fundIds: selectedFundIds,
        icon,
        color,
      });
    } else {
      addCustomStat({
        name: name.trim(),
        fundIds: selectedFundIds,
        icon,
        color,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (initialStat && confirm(`Delete "${initialStat.name}" combined stat?`)) {
      deleteCustomStat(initialStat.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {initialStat ? 'Edit Combined Stat' : 'Add Combined Balance Stat'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Combine multiple funds into one custom balance visible at the top of your dashboard
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Quick Presets */}
          {!initialStat && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('Available for Business', ['business', 'investment'])}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                >
                  + Available for Business (Investments + Business)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('Available to Spend', ['personal', 'expense', 'other'])}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                >
                  + Available to Spend (Personal + Other)
                </button>
              </div>
            </div>
          )}

          {/* Stat Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Stat Name / Label *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Available for Business, Available to Spend..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400 font-semibold"
              required
            />
          </div>

          {/* Icon and Color Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Icon</label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                {AVAILABLE_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      icon === ic ? 'bg-amber-400 text-slate-950 font-bold shadow-xs scale-105' : 'text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <IconRenderer name={ic} className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Color Theme</label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                {AVAILABLE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-lg transition-transform flex items-center justify-center ${
                      color === c ? 'ring-2 ring-slate-950 scale-105' : 'hover:scale-95'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Select Funds Checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Select Funds to Combine ({selectedFundIds.length} selected)
              </label>
              <div className="flex gap-2 text-[11px] font-bold text-amber-700">
                <button
                  type="button"
                  onClick={() => setSelectedFundIds(activeFunds.map((f) => f.id))}
                  className="hover:underline"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSelectedFundIds([])}
                  className="hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {activeFunds.map((fund) => {
                const isSelected = selectedFundIds.includes(fund.id);
                const calc = summary.fundCalculations[fund.id] || {
                  currentBalance: fund.openingBalance || 0,
                };

                return (
                  <div
                    key={fund.id}
                    onClick={() => toggleFund(fund.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-50/60 border-amber-300 shadow-2xs'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs shrink-0"
                        style={{ backgroundColor: fund.color }}
                      >
                        <IconRenderer name={fund.icon} className="w-3 h-3" />
                      </div>

                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 truncate block">
                          {fund.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {fund.allocationPercentage}% allocation
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-slate-900 block">
                        {formatCurrency(calc.currentBalance, settings)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300/60">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Live Combined Total Preview:
                </span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {name.trim() || 'Custom Stat'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-950">
                  {formatCurrency(combinedTotal, settings)}
                </span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          {initialStat ? (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 text-xs font-bold rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{initialStat ? 'Save Changes' : 'Add to Dashboard'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
