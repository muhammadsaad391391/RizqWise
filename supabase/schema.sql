-- =========================================================================
-- RizqFlow — Database Schema for Supabase (PostgreSQL)
-- =========================================================================

-- 1. UNIFIED REALTIME SYNC TABLE (Easiest & Fastest for Cross-Device Sync)
-- This table syncs all your funds, transactions, categories, and settings across devices.
CREATE TABLE IF NOT EXISTS public.rizqflow_sync (
    id TEXT PRIMARY KEY DEFAULT 'primary_sync',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and public access (or link with Supabase auth)
ALTER TABLE public.rizqflow_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated and anon users with key"
    ON public.rizqflow_sync FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. DEDICATED RELATIONAL TABLES (Optional, for deep SQL queries)
CREATE TABLE IF NOT EXISTS public.funds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Folder',
    color TEXT NOT NULL DEFAULT '#F59E0B',
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
    amount NUMERIC NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT,
    description TEXT,
    notes TEXT,
    fund_id TEXT REFERENCES public.funds(id) ON DELETE SET NULL,
    from_fund_id TEXT REFERENCES public.funds(id) ON DELETE SET NULL,
    to_fund_id TEXT REFERENCES public.funds(id) ON DELETE SET NULL,
    category TEXT,
    source TEXT,
    payment_method TEXT,
    allocation_method TEXT DEFAULT 'automatic',
    allocations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Tag',
    color TEXT NOT NULL DEFAULT '#F59E0B',
    type TEXT NOT NULL DEFAULT 'expense',
    is_custom BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for funds" ON public.funds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
