'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '@/lib/context/finance-context';
import { Lock, Unlock, Eye, EyeOff, Coins, ShieldCheck, ArrowRight, Delete } from 'lucide-react';

export function LockScreen() {
  const { unlockWithPassword, settings } = useFinance();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the password input on mount
    inputRef.current?.focus();
  }, []);

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password) {
      setError('Please enter your passcode or password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Small delay for smooth feel
    setTimeout(() => {
      const res = unlockWithPassword(password, rememberDevice);
      if (!res.success) {
        setError(res.error || 'Incorrect password. Please try again.');
        setIsSubmitting(false);
        setPassword('');
        inputRef.current?.focus();
      }
    }, 150);
  };

  const handleKeypadPress = (val: string) => {
    setError(null);
    if (val === 'backspace') {
      setPassword((prev) => prev.slice(0, -1));
    } else if (val === 'clear') {
      setPassword('');
    } else {
      setPassword((prev) => prev + val);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-4 sm:p-6 text-slate-800 selection:bg-amber-100">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6 text-center">
          {/* Logo & Header */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-400/30">
                <Coins className="w-8 h-8 stroke-[2.2]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center shadow-md border-2 border-white">
                <Lock className="w-3 h-3 stroke-[2.5]" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">RizqWise</h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Know where your money goes.</p>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-800">Account Locked</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Please enter your passcode or password to unlock your funds and transaction ledger.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter passcode or password..."
                className={`w-full px-4 py-3.5 pr-11 text-center font-semibold text-base sm:text-lg tracking-wider rounded-2xl border transition-all focus:outline-none focus:ring-2 ${
                  error
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-400'
                    : 'border-slate-200 bg-slate-50 focus:border-amber-400 focus:ring-amber-400/30 text-slate-900'
                }`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-shake">
                {error}
              </div>
            )}

            {/* Numeric Keypad for fast mobile / quick PIN entry */}
            <div className="pt-2">
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-xs mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(digit)}
                    className="h-12 rounded-xl bg-slate-50 hover:bg-amber-50 active:bg-amber-100 text-slate-800 hover:text-amber-950 font-bold text-lg border border-slate-200/80 transition-all flex items-center justify-center select-none active:scale-95"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('clear')}
                  className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider border border-slate-200/80 transition-all flex items-center justify-center select-none active:scale-95"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-12 rounded-xl bg-slate-50 hover:bg-amber-50 active:bg-amber-100 text-slate-800 hover:text-amber-950 font-bold text-lg border border-slate-200/80 transition-all flex items-center justify-center select-none active:scale-95"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('backspace')}
                  className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-sm border border-slate-200/80 transition-all flex items-center justify-center select-none active:scale-95"
                  aria-label="Backspace"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Remember Device Checkbox */}
            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 cursor-pointer"
                />
                <span>Remember this device</span>
              </label>
            </div>

            {/* Unlock Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-brand-header hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md shadow-amber-400/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <Unlock className="w-4 h-4 stroke-[2.5]" />
                  <span>Unlock Account</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>End-to-end local & cloud security enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
