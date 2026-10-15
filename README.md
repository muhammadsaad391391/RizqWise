# RizqFlow — A Modern Islamic-Inspired Personal Finance Management App

> **Tagline:** *Know where your money goes.*

**RizqFlow** is a modern, responsive financial management and fund allocation web application built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**.

Inspired by clean money-tracking workflows and premium fintech aesthetics, RizqFlow replaces basic expense trackers with an intelligent fund distribution system that automatically divides every rupee of incoming wealth into designated personal and business funds according to predefined percentage rules.

---

## 🌟 Key Highlights & Architectural Features

### 1. ⚡ Automatic Income Fund Allocation Engine
- **Predefined Rules**: Configure your funds (e.g. Business 40%, Investments 20%, Personal 15%, Savings 10%, Education 5%, Emergency 5%, Other 5%).
- **Strict 100% Rule Validation**: Prevents invalid allocation configurations; visually shows remaining unallocated or excess percentages.
- **Instant Preview**: Live breakdown calculates exact allocations per fund as you type the income amount.
- **Zero-Loss Rounding Reconciliation**: Handled with integer/cents reconciliation so allocations always equal the exact income amount.
- **Immutable Historical Snapshots**: Changing future allocation rules will never alter past transaction distribution records.
- **No Double-Counting**: Income is recorded once; fund allocations are distributions of that income, not additional money.

### 2. 🛡️ Expense Tracking with Fund Protection
- **Fund Deduction**: Every expense is charged against a specific fund (e.g., software subscription deducted from the Business fund).
- **Available Balance Check**: Shows current fund balance before saving.
- **Overdraft Protection**: Configurable policy (warn & confirm vs. block) to prevent accidental negative balances.
- **Expense Categories**: Clean icon grid inspired by mobile money trackers (Food, Transportation, Shopping, Education, Software, Tools, Health, Clothing, Charity/Sadaqah, Halal Dining, and custom user categories).

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

### 5. 💾 Dual-Layer Persistence & Cloud Ready
- **Persistent Local Database**: Automatically writes to `data/rizqflow-db.json` on the server filesystem via `/api/data` and synchronizes with browser `localStorage`.
- **Complete JSON Backup & Restore**: Download full JSON backups or restore snapshots at any time.
- **Supabase Cloud Ready**: Includes full PostgreSQL schema with Row-Level Security (`supabase/schema.sql`).

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v18+` or `v20+` (tested on Node.js `v24.13.1`)
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

## ☁️ Connecting Supabase (Optional Persistent Cloud Mode)

To deploy with Supabase PostgreSQL cloud storage:

1. Create a project on [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** tab in your Supabase dashboard.
3. Open and run [`supabase/schema.sql`](supabase/schema.sql).
4. Create a `.env.local` file in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Deploy to Vercel or your hosting platform of choice with standard Next.js deployment.

---

## 🎨 Visual Design System

- **Primary Brand Accent**: Warm yellow/gold (`#F7C948` / `#F59E0B`) inspired by mobile financial tracking apps.
- **Background**: Soft warm off-white (`#FBFBFA`).
- **Typography**: Clean modern sans-serif.
- **Icons**: Lucide Icons.
- **Mobile Responsive**: Native-feel bottom navigation with prominent yellow floating action button `(+)`; desktop sidebar with brand wordmark and quick stats.
