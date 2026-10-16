# RizqWise — A Modern Islamic-Inspired Personal Finance Management App

> **Tagline:** *Know where your money goes.*

**RizqWise** is a modern, responsive financial management and fund allocation web application built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**.

Inspired by clean money-tracking workflows and premium fintech aesthetics, RizqWise replaces basic expense trackers with an intelligent fund distribution system that automatically divides every rupee of incoming wealth into designated personal and business funds according to predefined percentage rules.

---

## 🌟 Key Highlights & Architectural Features

### 1. ⚡ Automatic Income Fund Allocation Engine
- **Predefined Rules**: Configure your funds (e.g. Business 40%, Investments 20%, Personal 15%, Savings 10%, Education 5%, Emergency 5%, Other 5%).
- **Strict 100% Rule Validation**: Prevents invalid allocation configurations; visually shows remaining unallocated or excess percentages.
- **Instant Preview**: Live breakdown calculates exact allocations per fund as you type the income amount.
- **Zero-Loss Rounding Reconciliation**: Handled with integer/cents reconciliation so allocations always equal the exact income amount.
- **Immutable Historical Snapshots**: Changing future allocation rules will never alter past transaction distribution records.
- **No Double-Counting**: Income is recorded once; fund allocations are distributions of that income, not additional money.

### 2. 🛡️ Expense & Income Tracking with Custom Categories
- **Fund Deduction**: Every expense is charged against a specific fund (e.g., software subscription deducted from the Business fund).
- **Available Balance Check**: Shows current fund balance before saving.
- **Overdraft Protection**: Configurable policy (warn & confirm vs. block) to prevent accidental negative balances.
- **On-the-Fly Category Creator**: Add custom categories directly inside the transaction modal with the `+ New Category` button for both Income and Expenses.
- **Expense & Income Categories**: Food, Groceries, Fuel, Gym, Shopping, Education, Software, Tools, Health, Clothing, Charity/Sadaqah, Salary, Freelancing, Business Revenue, Pocket Money, and custom categories with icons.

### 3. ⇄ Inter-Fund Transfers
- Move money between funds (e.g. PKR 5,000 from Business to Investments).
- Deducts from source fund and credits destination fund atomically.
- Preserves the total available balance. Transfers are never counted as new income or expense.

### 4. 📊 Financial Ledgers, Budgets & Analytics
- **Fund Detail Ledgers**: Lifetime allocated, lifetime spent, net transfers, monthly budget progress bar, and fund-specific transaction history.
- **Monthly Spending Limits**: Set separate spending budgets per fund with utilization warning bars.
- **Analytics & Visual Charts**: Recharts visualizations for Period Cash Flow (Income vs. Expense vs. Allocations), Category Spending Breakdown, and Income Sources.
- **Printable Financial Summary**: Clean one-click print mode for paper/PDF reports.
- **CSV Data Export**: Export filtered transaction ledgers directly to `.csv`.

### 5. ☁️ Multi-Device Cloud Sync & Database
- **Automatic Cross-Device Sync**: Connects to Supabase PostgreSQL cloud database so your phone, tablet, laptop, and desktop stay 100% synchronized in real time.
- **Tab Focus Auto-Refresh**: When unlocking your phone or switching tabs on your laptop, the app automatically checks for cloud updates.
- **Persistent Local Database**: Automatically writes to `data/rizqwise-db.json` on the server filesystem and synchronizes with browser `localStorage`.
- **Complete JSON Backup & Restore**: Download full JSON backups or restore snapshots at any time.
- **Supabase Cloud Ready**: Includes full PostgreSQL schema with Row-Level Security (`supabase/schema.sql`).

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v18+` or `v20+`
- npm `v9+`

### Installation & Local Run

1. Clone or navigate to the project directory:
   ```bash
   cd c:\MVPs\RizqWise
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   *(On Windows PowerShell with execution policy restrictions, use `npm.cmd install`)*

3. Run the development server:
   ```bash
   npm run dev
   # or
   npm.cmd run dev
   ```

4. Open your browser at:
   ```
   http://localhost:3000
   ```

---

## 🧪 Verification & Automated Accounting Tests

To run the automated verification test suite checking all 12 accounting and allocation requirements:
```bash
node scripts/verify-accounting.mjs
```

All 12 automated checks test:
- 100% allocation percentage rule validation
- PKR 100,000 income distribution across 7 funds
- PKR 8,000 expense deducted from Business only
- PKR 5,000 transfer between funds preserving total net balance
- Transaction reversal and deletion accuracy
- Rounding reconciliation with odd amounts
- Immutability of past snapshots when future rules change
- Double-counting prevention

---

## ☁️ Cross-Device Cloud Sync (Supabase)

To sync your data automatically across all devices (mobile phone, laptop, desktop):

1. Create a free account at [supabase.com](https://supabase.com) and create a project.
2. In the Supabase **SQL Editor**, run the script from [`supabase/schema.sql`](supabase/schema.sql):
   ```sql
   CREATE TABLE IF NOT EXISTS public.rizqwise_sync (
       id TEXT PRIMARY KEY DEFAULT 'primary_sync',
       data JSONB NOT NULL DEFAULT '{}'::jsonb,
       updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ALTER TABLE public.rizqwise_sync ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Allow public sync access" ON public.rizqwise_sync FOR ALL USING (true) WITH CHECK (true);
   ```
3. Copy your **Project URL** and **Anon Key** from Supabase (**Project Settings → API**).
4. Add them to Vercel Environment Variables (or in Settings in the app):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Now, every device that visits the app will automatically sync in real time.

---

## 🎨 Visual Design System

- **Brand Name**: RizqWise
- **Primary Brand Accent**: Warm yellow/gold (`#F7C948` / `#F59E0B`) inspired by mobile financial tracking apps.
- **Background**: Soft warm off-white (`#FBFBFA`).
- **Typography**: Clean modern sans-serif.
- **Icons**: Lucide Icons.
- **Mobile Responsive**: Native-feel bottom navigation with prominent yellow floating action button `(+)`; desktop sidebar with brand wordmark and quick stats.
