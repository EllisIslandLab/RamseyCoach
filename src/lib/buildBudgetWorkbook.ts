/**
 * buildBudgetWorkbook.ts
 *
 * Generates a styled .xlsx workbook that matches the Money-Willo Budget Template:
 *   - Blue header row, green net-worth section, cyan totals/subtotals
 *   - Yellow sinking-fund rows, medium-border section headers
 *   - Arial fonts, currency number format, 23.65hpt row height
 *
 * NOTE: Browser-generated XLSX files cannot embed charts — this is a technical
 * limitation of all JS xlsx libraries. The Net Worth total is in row 2 (cols D–O)
 * so you can insert the line chart manually in Excel/LibreOffice by selecting
 * that row and choosing Insert → Chart → Line.
 */

// xlsx-js-style is a drop-in replacement for xlsx that adds the `s` (style) property.
// It has the same API so existing xlsx imports are unaffected.
import XLSXStyle from 'xlsx-js-style';

/* ─── Types ──────────────────────────────────────────────────────────────────── */

export interface BudgetWorkbookData {
  assets:        Array<{ id: string; name: string; value: string | number }>;
  debts:         Array<{ id: string; name: string; value: string | number }>;
  netWorth:      number;
  incRows:       Array<{ id: string; name: string; amount: string | number }>;
  totalIncome:   number;
  fixedSubs:     Array<{ id: string; label: string; rows: Array<{ id: string; name: string; amount: string | number }> }>;
  sinks:         Array<{ id: string; name: string; amount: string | number; freq: string }>;
  sinksLabel:    string;
  totalFixed:    number;
  varSubs:       Array<{ id: string; label: string; rows: Array<{ id: string; name: string; amount: string | number }> }>;
  totalVar:      number;
  savings:       Array<{ id: string; name: string; amount: string | number }>;
  totalSavings:  number;
  totalExpenses: number;
  leftover:      number;
  months:        Array<{ label: string; actuals: Record<string, string> }>;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

const nv = (v: string | number | undefined): number =>
  typeof v === 'number' ? v : parseFloat(String(v ?? '0')) || 0;

const fdiv = (f: string): number => {
  if (f === 'monthly') return 1;
  const n = parseFloat(f);
  return isNaN(n) ? 1 : 12 / n;
};

const MONTH_NAMES  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FREQ_LABELS: Record<string, string> = {
  monthly: 'Monthly', '6': '6× / Year', '4': '4× / Year', '2': '2× / Year', '1': 'Annual',
};

/** Convert 0-based column index to Excel letter(s): 0→A, 25→Z, 26→AA … */
function col(idx: number): string {
  let s = '', n = idx + 1;
  while (n > 0) { s = String.fromCharCode(64 + ((n - 1) % 26 + 1)) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

const addr = (r: number, c: number) => `${col(c)}${r + 1}`;

/* ─── Colors ─────────────────────────────────────────────────────────────────── */

const BG_BLUE   = '0000FF'; // Header row
const FG_YELLOW = 'FFFF99'; // Header text
const BG_GREEN  = '00FA9A'; // Net worth & Leftover rows
const BG_CYAN   = '00FFFF'; // Totals & subtotals
const BG_YELLOW = 'FFFF00'; // Sinking-fund rows
const BLACK     = '000000';

/* ─── Borders ────────────────────────────────────────────────────────────────── */

const thin   = { style: 'thin',   color: { rgb: BLACK } };
const medium = { style: 'medium', color: { rgb: BLACK } };
const THIN_B   = { top: thin,   bottom: thin,   left: thin,   right: thin   };
const MEDIUM_B = { top: medium, bottom: medium, left: medium, right: medium };

/* ─── Number format ──────────────────────────────────────────────────────────── */

const CURRENCY = '[$$-409]#,##0.00;[Red]"-"[$$-409]#,##0.00';
const ROW_H    = 23.65; // matches template

/* ─── Cell builder ───────────────────────────────────────────────────────────── */

interface StyleOpts {
  bg?:        string;          // fill hex, omit for no fill
  fg?:        string;          // font color hex, default black
  font?:      string;          // font name, default Arial
  sz?:        number;          // font size, default 12
  bold?:      boolean;
  italic?:    boolean;
  border?:    typeof THIN_B | typeof MEDIUM_B | null;
  align?:     'left' | 'center' | 'right';
  currency?:  boolean;
}

type Cell = { v: string | number; t: string; s: Record<string, unknown> };

function cell(value: string | number, o: StyleOpts = {}): Cell {
  const {
    bg, fg = BLACK, font = 'Arial', sz = 12,
    bold = false, italic = false,
    border = THIN_B, align = 'left', currency = false,
  } = o;

  const s: Record<string, unknown> = {
    font:      { name: font, sz, bold, italic, color: { rgb: fg } },
    alignment: { horizontal: align, vertical: 'center' },
  };
  if (bg)     s.fill   = { patternType: 'solid', fgColor: { rgb: bg } };
  if (border) s.border = border;
  if (currency && typeof value === 'number') s.numFmt = CURRENCY;

  const t = typeof value === 'number' ? 'n' : (value === '' ? 'z' : 's');
  return { v: value, t, s };
}

/* ─── Main builder ───────────────────────────────────────────────────────────── */

export function buildBudgetWorkbook(data: BudgetWorkbookData): ReturnType<typeof XLSXStyle.utils.book_new> {
  const ws: Record<string, unknown> = {};
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  const rows:   { hpt: number }[] = [];
  let r = 0; // current row (0-based)

  const set = (row: number, c: number, v: Cell) => { ws[addr(row, c)] = v; };
  const empty = (row: number, c: number, bg?: string) =>
    set(row, c, cell('', { bg, border: THIN_B }));

  /** Monthly actuals for a given row ID → 12-element array */
  const actuals = (rowId?: string): (number | '')[] => {
    const out: (number | '')[] = new Array(12).fill('');
    if (!rowId) return out;
    for (const m of data.months) {
      const idx = MONTH_NAMES.indexOf(m.label.split(' ')[0]);
      if (idx >= 0 && m.actuals[rowId]) out[idx] = parseFloat(m.actuals[rowId]) || '';
    }
    return out;
  };

  /**
   * Write a full 15-column data row:
   * col 0 = account type, col 1 = label, col 2 = budget, cols 3-14 = monthly actuals
   */
  const writeRow = (
    row: number,
    accountType: string,
    label: string,
    budget: number,
    rowId?: string,
    o: StyleOpts = {},
  ) => {
    set(row, 0, cell(accountType || '', { ...o, align: 'left' }));
    set(row, 1, cell(label,            { ...o, align: 'left' }));
    set(row, 2, cell(budget,           { ...o, currency: true }));
    const monthly = actuals(rowId);
    for (let m = 0; m < 12; m++) {
      const v = monthly[m];
      if (v !== '') set(row, 3 + m, cell(v as number, { ...o, currency: true }));
      else          empty(row, 3 + m, o.bg);
    }
    rows[row] = { hpt: ROW_H };
  };

  /** Section header — col A empty, B–O merged, medium border, 14pt bold centered */
  const sectionHeader = (row: number, title: string) => {
    empty(row, 0);
    set(row, 1, cell(title, { font: 'Arial', sz: 14, bold: true, border: MEDIUM_B, align: 'center' }));
    merges.push({ s: { r: row, c: 1 }, e: { r: row, c: 14 } });
    rows[row] = { hpt: ROW_H };
  };

  /** Total row — cyan background, Arial Black bold */
  const totalRow = (row: number, label: string, amount: number, rowId?: string, bg = BG_CYAN) => {
    writeRow(row, '', label, amount, rowId, { bg, bold: true, font: 'Arial Black' });
  };

  /** Subtotal row — cyan background, bold */
  const subtotalRow = (row: number, label: string, amount: number) => {
    writeRow(row, '', label, amount, undefined, { bg: BG_CYAN, bold: true });
  };

  /** Blank row (thin borders, no fill) */
  const blankRow = (row: number) => {
    for (let c = 0; c <= 14; c++) empty(row, c);
    rows[row] = { hpt: ROW_H };
  };

  /* ════════════════════════════════════════════════════════════
     ROW 1 — Header
  ════════════════════════════════════════════════════════════ */
  const hdrOpts: StyleOpts = { bg: BG_BLUE, fg: FG_YELLOW, font: 'Arial Black', sz: 12, bold: true, align: 'center' };
  set(r, 0, cell('Account Type',    hdrOpts));
  set(r, 1, cell('Income / Expense', hdrOpts));
  set(r, 2, cell('Expected',        hdrOpts));
  for (let m = 0; m < 12; m++) set(r, 3 + m, cell(MONTH_SHORT[m], hdrOpts));
  rows[r] = { hpt: ROW_H };
  r++;

  /* ════════════════════════════════════════════════════════════
     NET WORTH (rows start at index 1 = Excel row 2, matching
     the template's chart reference Sheet1!$D$2:$O$2)
  ════════════════════════════════════════════════════════════ */
  // Estimated Net Worth total — pinned to row 2 for chart compatibility
  writeRow(r, 'Balance Sheet', 'Estimated Net Worth', data.netWorth, undefined,
    { bg: BG_GREEN, bold: true, font: 'Arial Black' });
  r++;

  for (const asset of data.assets) {
    writeRow(r, 'Asset', asset.name, nv(asset.value), asset.id, { bg: BG_GREEN });
    r++;
  }
  for (const debt of data.debts) {
    writeRow(r, 'Debt', debt.name, -nv(debt.value), debt.id, { bg: BG_GREEN });
    r++;
  }

  blankRow(r); r++;

  /* ════════════════════════════════════════════════════════════
     OVERVIEW
  ════════════════════════════════════════════════════════════ */
  sectionHeader(r, 'OVERVIEW'); r++;
  totalRow(r, 'Net Income', data.totalIncome); r++;
  for (const inc of data.incRows) {
    writeRow(r, '', inc.name, nv(inc.amount), inc.id);
    r++;
  }
  totalRow(r, 'Total Expenses', data.totalExpenses); r++;
  writeRow(r, '', 'Leftover', data.leftover, undefined,
    { bg: BG_GREEN, bold: true, sz: 14 });
  r++;
  blankRow(r); r++;

  /* ════════════════════════════════════════════════════════════
     FIXED MONTHLY COSTS
  ════════════════════════════════════════════════════════════ */
  sectionHeader(r, 'FIXED MONTHLY COSTS'); r++;
  totalRow(r, 'Total Fixed Monthly', data.totalFixed); r++;

  for (const sub of data.fixedSubs) {
    const subTotal = sub.rows.reduce((s, row) => s + nv(row.amount), 0);
    subtotalRow(r, sub.label, subTotal); r++;
    for (const row of sub.rows) {
      writeRow(r, '', row.name, nv(row.amount), row.id);
      r++;
    }
  }

  if (data.sinks.length > 0) {
    const sinksTotal = data.sinks.reduce((s, sk) => s + nv(sk.amount) / fdiv(sk.freq), 0);
    subtotalRow(r, data.sinksLabel, sinksTotal); r++;
    for (const sk of data.sinks) {
      const monthlyAmt = Math.round(nv(sk.amount) / fdiv(sk.freq));
      writeRow(r, FREQ_LABELS[sk.freq] ?? sk.freq, sk.name, monthlyAmt, sk.id,
        { bg: BG_YELLOW });
      r++;
    }
  }

  blankRow(r); r++;

  /* ════════════════════════════════════════════════════════════
     FLUCTUATING COSTS
  ════════════════════════════════════════════════════════════ */
  sectionHeader(r, 'FLUCTUATING COSTS'); r++;
  totalRow(r, 'Total Fluctuating Costs', data.totalVar); r++;

  for (const sub of data.varSubs) {
    const subTotal = sub.rows.reduce((s, row) => s + nv(row.amount), 0);
    subtotalRow(r, sub.label, subTotal); r++;
    for (const row of sub.rows) {
      writeRow(r, '', row.name, nv(row.amount), row.id);
      r++;
    }
  }

  blankRow(r); r++;

  /* ════════════════════════════════════════════════════════════
     SAVINGS
  ════════════════════════════════════════════════════════════ */
  sectionHeader(r, 'SAVINGS'); r++;
  totalRow(r, 'Total Savings', data.totalSavings); r++;
  for (const row of data.savings) {
    writeRow(r, '', row.name, nv(row.amount), row.id);
    r++;
  }

  /* ─── Worksheet metadata ─────────────────────────────────────────────────── */

  ws['!ref'] = `A1:${col(14)}${r}`;

  ws['!cols'] = [
    { wch: 32.21 },                      // A  Account Type
    { wch: 31.5  },                      // B  Label
    { wch: 14.79 },                      // C  Budget
    ...Array(12).fill({ wch: 14.79 }),   // D–O  Jan–Dec
  ];

  ws['!rows'] = rows;
  ws['!merges'] = merges;

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws as XLSXStyle.WorkSheet, 'Monthly Budget');
  return wb;
}
