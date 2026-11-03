/**
 * RizqWise — PDF Account Statement Generator
 * Uses jsPDF + jspdf-autotable to produce professional, printable statements.
 */

import { format, parseISO } from 'date-fns';
import {
  Transaction,
  IncomeTransaction,
  ExpenseTransaction,
  TransferTransaction,
  Fund,
  AppSettings,
  TransactionPostBalance,
} from '@/types/finance';
import { formatCurrency } from '@/lib/finance-engine';

// ─── Lazy imports (client-side only) ─────────────────────────────────────────
async function getJsPDF() {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  return jsPDF;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function txLabel(tx: Transaction, funds: Fund[]): string {
  if (tx.type === 'income') return (tx as IncomeTransaction).description || (tx as IncomeTransaction).source;
  if (tx.type === 'expense') return (tx as ExpenseTransaction).title;
  const trf = tx as TransferTransaction;
  const from = funds.find((f) => f.id === trf.fromFundId)?.name ?? '?';
  const to = funds.find((f) => f.id === trf.toFundId)?.name ?? '?';
  return `Transfer: ${from} → ${to}`;
}

function txFundLabel(tx: Transaction, funds: Fund[]): string {
  if (tx.type === 'expense') {
    return funds.find((f) => f.id === (tx as ExpenseTransaction).fundId)?.name ?? 'Unassigned';
  }
  if (tx.type === 'income') {
    return (tx as IncomeTransaction).allocations?.map((a) => a.fundName).join(', ') || 'All Funds';
  }
  const trf = tx as TransferTransaction;
  const from = funds.find((f) => f.id === trf.fromFundId)?.name ?? '?';
  const to = funds.find((f) => f.id === trf.toFundId)?.name ?? '?';
  return `${from} → ${to}`;
}

function txSign(tx: Transaction): string {
  if (tx.type === 'income') return '+';
  if (tx.type === 'expense') return '-';
  return '⇄';
}

function amountStr(tx: Transaction, settings: AppSettings): string {
  return `${txSign(tx)} ${formatCurrency(tx.amount, settings)}`;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────
// jsPDF works with RGB arrays
const BRAND = [245, 158, 11] as [number, number, number];       // amber-400
const DARK  = [15,  23,  42] as [number, number, number];       // slate-900
const MID   = [71,  85, 105] as [number, number, number];       // slate-600
const LIGHT = [241, 245, 249] as [number, number, number];      // slate-100
const GREEN = [5, 150, 105] as [number, number, number];        // emerald-600
const RED   = [220, 38,  38] as [number, number, number];       // red-600
const BLUE  = [37, 99, 235] as [number, number, number];        // blue-600
const WHITE = [255, 255, 255] as [number, number, number];

// ─── Header painter ───────────────────────────────────────────────────────────
function paintHeader(
  doc: any,
  title: string,
  subtitle: string,
  dateRange: string,
  generatedAt: string,
  pageWidth: number,
) {
  // Brand bar
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 22, 'F');

  // App name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text('RizqWise', 14, 13);

  // Statement title on the right
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Account Statement', pageWidth - 14, 9, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title, pageWidth - 14, 16, { align: 'right' });

  // Subtitle strip
  doc.setFillColor(...DARK);
  doc.rect(0, 22, pageWidth, 10, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text(subtitle, 14, 28.5);
  doc.text(dateRange, pageWidth - 14, 28.5, { align: 'right' });

  // Meta row
  doc.setFillColor(...LIGHT);
  doc.rect(0, 32, pageWidth, 8, 'F');
  doc.setTextColor(...MID);
  doc.setFontSize(6.5);
  doc.text(`Generated: ${generatedAt}`, 14, 37);
  doc.text('This is a system-generated statement for personal records only.', pageWidth - 14, 37, { align: 'right' });
}

// ─── Summary row painter ──────────────────────────────────────────────────────
function paintSummaryBar(
  doc: any,
  metrics: { income: number; expense: number; net: number; count: number },
  settings: AppSettings,
  y: number,
  pageWidth: number,
) {
  const margin = 14;
  const boxW = (pageWidth - margin * 2) / 4;
  const boxes = [
    { label: 'Transactions', value: String(metrics.count), color: DARK },
    { label: 'Total Income', value: `+ ${formatCurrency(metrics.income, settings)}`, color: GREEN },
    { label: 'Total Expense', value: `- ${formatCurrency(metrics.expense, settings)}`, color: RED },
    { label: 'Net', value: formatCurrency(metrics.net, settings), color: metrics.net >= 0 ? GREEN : RED },
  ];

  boxes.forEach((box, i) => {
    const x = margin + i * boxW;
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, y, boxW - 2, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...(box.color as [number, number, number]));
    doc.text(box.value, x + (boxW - 2) / 2, y + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...MID);
    doc.text(box.label, x + (boxW - 2) / 2, y + 11.5, { align: 'center' });
  });

  return y + 18;
}

// ─── Footer painter ───────────────────────────────────────────────────────────
function addPageNumbers(doc: any) {
  const total = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(...MID);
    doc.text(`RizqWise  •  Confidential`, 14, doc.internal.pageSize.getHeight() - 6);
    doc.text(`Page ${i} of ${total}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
  }
}

// ─── PUBLIC: Full Account Statement ──────────────────────────────────────────
export async function downloadAccountStatementPDF(
  transactions: Transaction[],
  funds: Fund[],
  settings: AppSettings,
  runningBalances: Record<string, TransactionPostBalance>,
  options?: {
    dateFrom?: string;
    dateTo?: string;
    fundFilter?: string; // 'all' or fundId
    filteredTitle?: string;
  },
) {
  const jsPDF = await getJsPDF();
  const doc = new (jsPDF as any)({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedAt = format(new Date(), 'dd MMM yyyy, hh:mm a');

  // Sort chronologically oldest → newest for statement readability
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const dateRange =
    sorted.length > 0
      ? `${format(parseISO(sorted[0].date), 'dd MMM yyyy')} – ${format(parseISO(sorted[sorted.length - 1].date), 'dd MMM yyyy')}`
      : 'No Date Range';

  const subtitle = options?.filteredTitle
    ? `Fund: ${options.filteredTitle}`
    : 'All Funds · All Transactions';

  // Header
  paintHeader(doc, 'Full Account Statement', subtitle, dateRange, generatedAt, pageWidth);

  // Summary
  let income = 0, expense = 0;
  sorted.forEach((t) => {
    if (t.type === 'income') income += t.amount;
    if (t.type === 'expense') expense += t.amount;
  });
  let y = paintSummaryBar(doc, { income, expense, net: income - expense, count: sorted.length }, settings, 42, pageWidth);

  // Table
  const tableBody = sorted.map((tx) => {
    const postBal = runningBalances[tx.id];
    let balAfter = '';
    if (postBal) {
      if (tx.type === 'expense' && postBal.fundBalanceAfter !== undefined) {
        balAfter = formatCurrency(postBal.fundBalanceAfter, settings);
      } else if (tx.type === 'transfer' && postBal.fromFundBalanceAfter !== undefined) {
        balAfter = formatCurrency(postBal.fromFundBalanceAfter, settings);
      } else if (postBal.totalBalanceAfter !== undefined) {
        balAfter = formatCurrency(postBal.totalBalanceAfter, settings);
      }
    }

    return [
      format(parseISO(tx.date), 'dd MMM yy'),
      tx.type.toUpperCase(),
      txLabel(tx, funds),
      txFundLabel(tx, funds),
      amountStr(tx, settings),
      balAfter,
    ];
  });

  (doc as any).autoTable({
    startY: y,
    head: [['Date', 'Type', 'Description', 'Fund / Direction', 'Amount', 'Balance After']],
    body: tableBody,
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      overflow: 'linebreak',
      font: 'helvetica',
      textColor: DARK,
    },
    headStyles: {
      fillColor: DARK,
      textColor: WHITE,
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 18 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 38 },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 1) {
        const type = data.cell.raw as string;
        if (type === 'INCOME') data.cell.styles.textColor = GREEN;
        else if (type === 'EXPENSE') data.cell.styles.textColor = RED;
        else data.cell.styles.textColor = BLUE;
      }
      if (data.section === 'body' && data.column.index === 4) {
        const raw = data.cell.raw as string;
        if (raw.startsWith('+')) data.cell.styles.textColor = GREEN;
        else if (raw.startsWith('-')) data.cell.styles.textColor = RED;
      }
    },
    margin: { left: 14, right: 14 },
  });

  addPageNumbers(doc);

  const filename = `RizqWise_Statement_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
  doc.save(filename);
}

// ─── PUBLIC: Individual Fund Statement ───────────────────────────────────────
export async function downloadFundStatementPDF(
  fund: Fund,
  transactions: Transaction[],
  allFunds: Fund[],
  settings: AppSettings,
  runningBalances: Record<string, TransactionPostBalance>,
  fundCurrentBalance: number,
) {
  const jsPDF = await getJsPDF();
  const doc = new (jsPDF as any)({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedAt = format(new Date(), 'dd MMM yyyy, hh:mm a');

  // Filter transactions relevant to this fund
  const relevant = [...transactions]
    .filter((tx) => {
      if (tx.type === 'expense') return (tx as ExpenseTransaction).fundId === fund.id;
      if (tx.type === 'income') return (tx as IncomeTransaction).allocations?.some((a) => a.fundId === fund.id);
      if (tx.type === 'transfer') {
        const t = tx as TransferTransaction;
        return t.fromFundId === fund.id || t.toFundId === fund.id;
      }
      return false;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const dateRange =
    relevant.length > 0
      ? `${format(parseISO(relevant[0].date), 'dd MMM yyyy')} – ${format(parseISO(relevant[relevant.length - 1].date), 'dd MMM yyyy')}`
      : 'No Transactions';

  paintHeader(doc, `${fund.name} — Fund Statement`, `Fund passbook for: ${fund.name}`, dateRange, generatedAt, pageWidth);

  // Fund summary strip
  let income = 0, expense = 0;
  relevant.forEach((tx) => {
    if (tx.type === 'income') {
      const alloc = (tx as IncomeTransaction).allocations?.find((a) => a.fundId === fund.id);
      income += alloc?.amount ?? 0;
    }
    if (tx.type === 'expense') expense += tx.amount;
    if (tx.type === 'transfer') {
      const t = tx as TransferTransaction;
      if (t.fromFundId === fund.id) expense += t.amount;
      else income += t.amount;
    }
  });

  let y = paintSummaryBar(
    doc,
    { income, expense, net: income - expense, count: relevant.length },
    settings,
    42,
    pageWidth,
  );

  // Current balance highlight
  doc.setFillColor(...(fundCurrentBalance >= 0 ? ([209, 250, 229] as [number, number, number]) : ([254, 226, 226] as [number, number, number])));
  doc.roundedRect(14, y, pageWidth - 28, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...(fundCurrentBalance >= 0 ? GREEN : RED));
  doc.text(`Current Balance: ${formatCurrency(fundCurrentBalance, settings)}`, 18, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MID);
  doc.text(`Allocation: ${fund.allocationPercentage}%  •  Opening Balance: ${formatCurrency(fund.openingBalance, settings)}`, pageWidth - 18, y + 6.5, { align: 'right' });
  y += 14;

  // Table
  const tableBody = relevant.map((tx) => {
    const postBal = runningBalances[tx.id];
    const fundBalAfter = postBal?.fundBalancesAfter?.[fund.id];

    let debit = '';
    let credit = '';
    let description = txLabel(tx, allFunds);

    if (tx.type === 'expense') {
      debit = formatCurrency(tx.amount, settings);
    } else if (tx.type === 'income') {
      const alloc = (tx as IncomeTransaction).allocations?.find((a) => a.fundId === fund.id);
      if (alloc) credit = formatCurrency(alloc.amount, settings);
    } else if (tx.type === 'transfer') {
      const t = tx as TransferTransaction;
      if (t.fromFundId === fund.id) {
        debit = formatCurrency(tx.amount, settings);
        description = `Transfer to: ${allFunds.find((f) => f.id === t.toFundId)?.name ?? '?'}`;
      } else {
        credit = formatCurrency(tx.amount, settings);
        description = `Transfer from: ${allFunds.find((f) => f.id === t.fromFundId)?.name ?? '?'}`;
      }
    }

    return [
      format(parseISO(tx.date), 'dd MMM yy'),
      tx.type.toUpperCase(),
      description,
      debit,
      credit,
      fundBalAfter !== undefined ? formatCurrency(fundBalAfter, settings) : '',
    ];
  });

  (doc as any).autoTable({
    startY: y,
    head: [['Date', 'Type', 'Description', 'Debit (Out)', 'Credit (In)', 'Balance After']],
    body: tableBody,
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      overflow: 'linebreak',
      font: 'helvetica',
      textColor: DARK,
    },
    headStyles: {
      fillColor: DARK,
      textColor: WHITE,
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 18 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 30, halign: 'right', textColor: RED },
      4: { cellWidth: 30, halign: 'right', textColor: GREEN },
      5: { cellWidth: 28, halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 1) {
        const type = data.cell.raw as string;
        if (type === 'INCOME') data.cell.styles.textColor = GREEN;
        else if (type === 'EXPENSE') data.cell.styles.textColor = RED;
        else data.cell.styles.textColor = BLUE;
      }
      if (data.section === 'body' && data.column.index === 3 && data.cell.raw) {
        data.cell.styles.textColor = RED;
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.section === 'body' && data.column.index === 4 && data.cell.raw) {
        data.cell.styles.textColor = GREEN;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 14, right: 14 },
  });

  addPageNumbers(doc);

  const filename = `RizqWise_${fund.name.replace(/\s+/g, '_')}_Statement_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}
