import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import StatementImporter, { AppliedItem } from './StatementImporter';

/* ─── Types ────────────────────────────────────────────────────────────────── */
interface NVRow   { id: string; name: string; value: string; }
interface AmtRow  { id: string; name: string; amount: string; }
interface SinkRow { id: string; name: string; amount: string; freq: FreqVal; }
interface EIRRow  { id: string; name: string; balance: string; rate: string; }
type FreqVal = 'monthly' | 'every2' | 'quarterly' | 'twice' | 'yearly';

/* ─── Module-level helpers ─────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);
const nv  = (s: string) => parseFloat(s) || 0;
const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const FREQS: { val: FreqVal; label: string; div: number }[] = [
  { val: 'monthly',   label: 'Monthly',        div: 1  },
  { val: 'every2',    label: 'Every 2 Months',  div: 2  },
  { val: 'quarterly', label: 'Quarterly',       div: 3  },
  { val: 'twice',     label: 'Twice a Year',    div: 6  },
  { val: 'yearly',    label: 'Yearly',          div: 12 },
];
const fdiv = (f: FreqVal) => FREQS.find(o => o.val === f)!.div;

/* Pure row-update helpers — no component closure, safe to use in child props */
const setAmtField = (rows: AmtRow[], i: number, k: 'name' | 'amount', v: string): AmtRow[] =>
  rows.map((r, j) => (j === i ? { ...r, [k]: v } : r));
const setNVField = (rows: NVRow[], i: number, k: 'name' | 'value', v: string): NVRow[] =>
  rows.map((r, j) => (j === i ? { ...r, [k]: v } : r));

/* ─── Style tokens ─────────────────────────────────────────────────────────── */
const inp     = 'border border-secondary-300 rounded-lg px-3 py-2 text-secondary-800 text-sm '
              + 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const inpFull = inp + ' w-full';
const addBtn  = 'text-primary-600 hover:text-primary-800 text-sm font-semibold flex items-center gap-1 mt-3 transition-colors';
const subHdr  = 'text-xs font-bold uppercase tracking-wider text-secondary-400 mb-3 pb-1 border-b border-secondary-100';
const subGrp  = 'mb-6 last:mb-0';
const rmBtn   = 'text-secondary-300 hover:text-red-400 transition-colors flex-shrink-0 font-bold text-xl leading-none px-1';

/* ─── Default state factories ──────────────────────────────────────────────── */
const dfAssets   = (): NVRow[]   => [
  { id: uid(), name: '401K Balance',              value: '' },
  { id: uid(), name: 'Crypto / Investments',      value: '' },
  { id: uid(), name: 'Estimated Home Value',      value: '' },
];
const dfDebts    = (): NVRow[]   => [
  { id: uid(), name: 'Home Debt (Mortgage)',       value: '' },
  { id: uid(), name: 'Car Debt',                   value: '' },
];
const dfIncome   = (): AmtRow[]  => [
  { id: uid(), name: 'Paycheck 1',                amount: '' },
  { id: uid(), name: 'Paycheck 2',                amount: '' },
];
const dfMort     = (): AmtRow[]  => [
  { id: uid(), name: 'Principal',                 amount: '' },
  { id: uid(), name: 'Interest',                  amount: '' },
  { id: uid(), name: 'Additional Principal',      amount: '' },
  { id: uid(), name: 'Escrow (tax + insurance)',  amount: '' },
];
const dfAuto     = (): AmtRow[]  => [
  { id: uid(), name: 'Car Payment',               amount: '' },
  { id: uid(), name: 'Auto Insurance',            amount: '' },
];
const dfGive     = (): AmtRow[]  => [
  { id: uid(), name: 'Tithe / Church',            amount: '' },
  { id: uid(), name: 'Other Giving',              amount: '' },
];
const dfSubs     = (): AmtRow[]  => [
  { id: uid(), name: 'TV / Internet',             amount: '' },
  { id: uid(), name: 'Phone',                     amount: '' },
  { id: uid(), name: 'Gym',                       amount: '' },
  { id: uid(), name: 'Streaming',                 amount: '' },
];
const dfIns      = (): AmtRow[]  => [
  { id: uid(), name: 'Life Insurance (Term)',     amount: '' },
  { id: uid(), name: 'Homeowners Insurance',      amount: '' },
  { id: uid(), name: 'Umbrella Policy',           amount: '' },
];
const dfSinks    = (): SinkRow[] => [
  { id: uid(), name: 'Waste Removal',             amount: '', freq: 'quarterly' },
  { id: uid(), name: 'Sewer',                     amount: '', freq: 'every2'    },
  { id: uid(), name: 'Dentist',                   amount: '', freq: 'twice'     },
  { id: uid(), name: 'Auto Insurance Pmts',       amount: '', freq: 'yearly'    },
];
const dfSpending = (): AmtRow[]  => [
  { id: uid(), name: 'Cash / Allowance',          amount: '' },
  { id: uid(), name: 'Restaurants',               amount: '' },
];
const dfNeeded   = (): AmtRow[]  => [
  { id: uid(), name: 'Gasoline / Transportation', amount: '' },
  { id: uid(), name: 'Water',                     amount: '' },
  { id: uid(), name: 'Electric',                  amount: '' },
  { id: uid(), name: 'Natural Gas',               amount: '' },
  { id: uid(), name: 'Groceries',                 amount: '' },
  { id: uid(), name: 'Miscellaneous',             amount: '' },
];
const dfSavings  = (): AmtRow[]  => [
  { id: uid(), name: 'Clothing',                  amount: '' },
  { id: uid(), name: 'Christmas / Gifts',         amount: '' },
  { id: uid(), name: 'Home Repair & Replace',     amount: '' },
  { id: uid(), name: 'Auto Repair & Replace',     amount: '' },
  { id: uid(), name: 'Health Savings',            amount: '' },
  { id: uid(), name: 'Vacation',                  amount: '' },
  { id: uid(), name: 'Emergency Fund',            amount: '' },
];
const dfEIR      = (): EIRRow[]  => [
  { id: uid(), name: 'Mortgage',  balance: '', rate: '' },
  { id: uid(), name: 'Car Loan',  balance: '', rate: '' },
];

/* ─── localStorage persistence ─────────────────────────────────────────────── */
const LS_KEY = 'ramseycoach_budget';

const loadSaved = (): Record<string, unknown> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem(LS_KEY);
    return s ? (JSON.parse(s) as Record<string, unknown>) : null;
  } catch { return null; }
};

/* ══════════════════════════════════════════════════════════════════════════════
   Module-level sub-components.
   IMPORTANT: These MUST live outside BudgetPlanner so React preserves their
   identity across re-renders. Defining components inside a parent function
   causes React to unmount/remount them on every keystroke, destroying focus.
══════════════════════════════════════════════════════════════════════════════ */

interface SectionCardProps {
  letter: string;
  title: string;
  subtitle: string;
  badge?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}
function SectionCard({ letter, title, subtitle, badge, isOpen, onToggle, children }: SectionCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary-50 transition-colors focus:outline-none"
      >
        <div className="flex items-start gap-3">
          <span className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
            {letter}
          </span>
          <div>
            <p className="font-bold text-secondary-800 text-sm md:text-base leading-tight">{title}</p>
            <p className="text-secondary-400 text-xs mt-0.5 leading-tight">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          {/* Always render badge slot to prevent layout shift */}
          <span className={`text-sm font-bold text-primary-700 hidden sm:block min-w-[90px] text-right ${badge ? '' : 'invisible'}`}>
            {badge ?? '—'}
          </span>
          <svg
            className={`w-5 h-5 text-secondary-400 transform transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {isOpen && (
        <div className="px-5 pb-6 border-t border-secondary-100 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function SubTotal({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between items-center pt-2 mt-2 border-t border-secondary-200">
      <span className="text-xs font-bold uppercase tracking-wide text-secondary-500">{label}</span>
      <span className="text-sm font-bold text-primary-700">{fmt(amount)}/mo</span>
    </div>
  );
}

function SectionTotal({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between items-center pt-3 mt-4 border-t-2 border-primary-300">
      <span className="font-bold text-secondary-700 text-sm">{label}</span>
      <span className="text-lg font-bold text-primary-700">{fmt(amount)}/mo</span>
    </div>
  );
}

function AmtRowList({ rows, setRows, addLabel }: {
  rows: AmtRow[];
  setRows: (r: AmtRow[]) => void;
  addLabel: string;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={row.id} className="flex gap-2 items-center">
          <input
            className={inpFull}
            value={row.name}
            onChange={e => setRows(setAmtField(rows, i, 'name', e.target.value))}
            placeholder="Description"
          />
          <input
            className={`${inp} w-28 flex-shrink-0 text-right`}
            type="number"
            min="0"
            value={row.amount}
            onChange={e => setRows(setAmtField(rows, i, 'amount', e.target.value))}
            placeholder="0"
          />
          <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className={rmBtn} title="Remove">
            ×
          </button>
        </div>
      ))}
      <button onClick={() => setRows([...rows, { id: uid(), name: '', amount: '' }])} className={addBtn}>
        <span className="font-bold text-base">+</span> {addLabel}
      </button>
    </div>
  );
}

function NVRowList({ rows, setRows, addLabel }: {
  rows: NVRow[];
  setRows: (r: NVRow[]) => void;
  addLabel: string;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={row.id} className="flex gap-2 items-center">
          <input
            className={inpFull}
            value={row.name}
            onChange={e => setRows(setNVField(rows, i, 'name', e.target.value))}
            placeholder="Description"
          />
          <input
            className={`${inp} w-32 flex-shrink-0 text-right`}
            type="number"
            min="0"
            value={row.value}
            onChange={e => setRows(setNVField(rows, i, 'value', e.target.value))}
            placeholder="0"
          />
          <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className={rmBtn} title="Remove">
            ×
          </button>
        </div>
      ))}
      <button onClick={() => setRows([...rows, { id: uid(), name: '', value: '' }])} className={addBtn}>
        <span className="font-bold text-base">+</span> {addLabel}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   BudgetPlanner — main component
══════════════════════════════════════════════════════════════════════════════ */
export default function BudgetPlanner() {

  /* Load once from localStorage (lazy — runs only on mount) */
  const [saved] = useState(() => loadSaved());

  /* Sections open/closed */
  const [open, setOpen] = useState<Record<string, boolean>>(
    () => (saved?.open as Record<string, boolean>) ?? { A: true, B: true, C: false, D: false, E: false, F: false }
  );
  const tog = (s: string) => setOpen(p => ({ ...p, [s]: !p[s] }));

  /* Section A */
  const [assets, setAssets] = useState<NVRow[]>(() => (saved?.assets as NVRow[]) ?? dfAssets());
  const [debts,  setDebts]  = useState<NVRow[]>(() => (saved?.debts  as NVRow[]) ?? dfDebts());

  /* Section B */
  const [incRows, setIncRows] = useState<AmtRow[]>(() => (saved?.incRows as AmtRow[]) ?? dfIncome());

  /* Section C */
  const [mortRows, setMortRows] = useState<AmtRow[]>(() => (saved?.mortRows as AmtRow[]) ?? dfMort());
  const [autoRows, setAutoRows] = useState<AmtRow[]>(() => (saved?.autoRows as AmtRow[]) ?? dfAuto());
  const [giveRows, setGiveRows] = useState<AmtRow[]>(() => (saved?.giveRows as AmtRow[]) ?? dfGive());
  const [subs,     setSubs]     = useState<AmtRow[]>(() => (saved?.subs     as AmtRow[]) ?? dfSubs());
  const [insRows,  setInsRows]  = useState<AmtRow[]>(() => (saved?.insRows  as AmtRow[]) ?? dfIns());
  const [sinks,    setSinks]    = useState<SinkRow[]>(() => (saved?.sinks   as SinkRow[]) ?? dfSinks());

  /* Section D */
  const [spending,   setSpending]   = useState<AmtRow[]>(() => (saved?.spending   as AmtRow[]) ?? dfSpending());
  const [neededRows, setNeededRows] = useState<AmtRow[]>(() => (saved?.neededRows as AmtRow[]) ?? dfNeeded());

  /* Section E */
  const [savings, setSavings] = useState<AmtRow[]>(() => (saved?.savings as AmtRow[]) ?? dfSavings());

  /* Section F */
  const [eirRows, setEirRows] = useState<EIRRow[]>(() => (saved?.eirRows as EIRRow[]) ?? dfEIR());

  /* ── Auto-save to localStorage on every state change ─────────────────── */
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({
      open, assets, debts, incRows, mortRows, autoRows, giveRows,
      subs, insRows, sinks, spending, neededRows, savings, eirRows,
    }));
  }, [open, assets, debts, incRows, mortRows, autoRows, giveRows,
      subs, insRows, sinks, spending, neededRows, savings, eirRows]);

  /* ── Derived calculations ─────────────────────────────────────────────── */
  const totalAssets  = assets.reduce((s, r) => s + nv(r.value), 0);
  const totalDebtA   = debts.reduce((s, r) => s + nv(r.value), 0);
  const netWorth     = totalAssets - totalDebtA;

  const totalIncome  = incRows.reduce((s, r) => s + nv(r.amount), 0);

  const mortTotal   = mortRows.reduce((s, r) => s + nv(r.amount), 0);
  const autoTotal   = autoRows.reduce((s, r) => s + nv(r.amount), 0);
  const givingTotal = giveRows.reduce((s, r) => s + nv(r.amount), 0);
  const subsTotal   = subs.reduce((s, r) => s + nv(r.amount), 0);
  const insTotal    = insRows.reduce((s, r) => s + nv(r.amount), 0);
  const sinksTotal  = sinks.reduce((s, r) => s + nv(r.amount) / fdiv(r.freq), 0);
  const totalFixed  = mortTotal + autoTotal + givingTotal + subsTotal + insTotal + sinksTotal;

  const spendTotal  = spending.reduce((s, r) => s + nv(r.amount), 0);
  const neededTotal = neededRows.reduce((s, r) => s + nv(r.amount), 0);
  const totalVar    = spendTotal + neededTotal;

  const totalSavings  = savings.reduce((s, r) => s + nv(r.amount), 0);
  const totalExpenses = totalFixed + totalVar;
  const leftover      = totalIncome - totalExpenses - totalSavings;

  const eirTotalBal   = eirRows.reduce((s, r) => s + nv(r.balance), 0);
  const eirWeighted   = eirRows.reduce((s, r) => s + nv(r.balance) * nv(r.rate), 0);
  const effectiveRate = eirTotalBal > 0 ? eirWeighted / eirTotalBal : 0;

  /* ── Reset / Print ────────────────────────────────────────────────────── */
  const handleReset = () => {
    if (!window.confirm('Reset all budget data? This cannot be undone.')) return;
    localStorage.removeItem(LS_KEY);
    setAssets(dfAssets());   setDebts(dfDebts());
    setIncRows(dfIncome());
    setMortRows(dfMort());   setAutoRows(dfAuto());   setGiveRows(dfGive());
    setSubs(dfSubs());       setInsRows(dfIns());     setSinks(dfSinks());
    setSpending(dfSpending()); setNeededRows(dfNeeded());
    setSavings(dfSavings());
    setEirRows(dfEIR());
    setOpen({ A: true, B: true, C: false, D: false, E: false, F: false });
  };

  const handlePrint = () => {
    setOpen({ A: true, B: true, C: true, D: true, E: true, F: true });
    setTimeout(() => window.print(), 150);
  };

  /* ── Apply imported transactions ──────────────────────────────────────── */
  const handleApplyTransactions = (items: AppliedItem[]) => {
    const bucket: Record<string, AmtRow[]> = {
      income: [], mortgage: [], auto: [], giving: [],
      subscriptions: [], insurance: [], spending: [], needed: [], savings: [],
    };
    for (const item of items) {
      const key = item.section as keyof typeof bucket;
      if (key in bucket) {
        bucket[key].push({ id: uid(), name: item.name, amount: String(item.amount) });
      }
    }
    if (bucket.income.length)        setIncRows(p => [...p, ...bucket.income]);
    if (bucket.mortgage.length)      setMortRows(p => [...p, ...bucket.mortgage]);
    if (bucket.auto.length)          setAutoRows(p => [...p, ...bucket.auto]);
    if (bucket.giving.length)        setGiveRows(p => [...p, ...bucket.giving]);
    if (bucket.subscriptions.length) setSubs(p => [...p, ...bucket.subscriptions]);
    if (bucket.insurance.length)     setInsRows(p => [...p, ...bucket.insurance]);
    if (bucket.spending.length)      setSpending(p => [...p, ...bucket.spending]);
    if (bucket.needed.length)        setNeededRows(p => [...p, ...bucket.needed]);
    if (bucket.savings.length)       setSavings(p => [...p, ...bucket.savings]);
    // Expand the affected budget sections
    setOpen(p => ({ ...p, B: true, C: true, D: true, E: true }));
  };

  /* ── Download as Excel / ODS ──────────────────────────────────────────── */
  const handleDownload = (format: 'xlsx' | 'ods') => {
    const $ = (n: number) => n || 0;
    const rows: (string | number)[][] = [
      ['Ramsey Preferred Coach — Monthly Budget'],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [],
      ['INCOME', 'Monthly Amount'],
      ...incRows.map(r => [r.name, $(nv(r.amount))]),
      ['TOTAL INCOME', totalIncome],
      [],
      ['FIXED COSTS — Mortgage / Housing', ''],
      ...mortRows.map(r => [r.name, $(nv(r.amount))]),
      ['FIXED COSTS — Auto', ''],
      ...autoRows.map(r => [r.name, $(nv(r.amount))]),
      ['FIXED COSTS — Giving & Charity', ''],
      ...giveRows.map(r => [r.name, $(nv(r.amount))]),
      ['FIXED COSTS — Subscriptions', ''],
      ...subs.map(r => [r.name, $(nv(r.amount))]),
      ['FIXED COSTS — Insurance', ''],
      ...insRows.map(r => [r.name, $(nv(r.amount))]),
      ['FIXED COSTS — Sinking Funds (monthly equiv.)', ''],
      ...sinks.map(r => [r.name, Math.round($(nv(r.amount)) / fdiv(r.freq))]),
      ['TOTAL FIXED COSTS', totalFixed],
      [],
      ['VARIABLE COSTS — Discretionary', ''],
      ...spending.map(r => [r.name, $(nv(r.amount))]),
      ['VARIABLE COSTS — Necessities & Utilities', ''],
      ...neededRows.map(r => [r.name, $(nv(r.amount))]),
      ['TOTAL VARIABLE COSTS', totalVar],
      [],
      ['SAVINGS BUCKETS', ''],
      ...savings.map(r => [r.name, $(nv(r.amount))]),
      ['TOTAL SAVINGS', totalSavings],
      [],
      ['SUMMARY', ''],
      ['Total Income', totalIncome],
      ['Total Fixed Costs', totalFixed],
      ['Total Variable Costs', totalVar],
      ['Total Savings', totalSavings],
      ['Leftover', leftover],
      [],
      ['NET WORTH SNAPSHOT', ''],
      ...assets.map(r => [r.name + ' (asset)', $(nv(r.value))]),
      ...debts.map(r => [r.name + ' (debt)', -$(nv(r.value))]),
      ['Estimated Net Worth', netWorth],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 40 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Budget');
    XLSX.writeFile(wb, `monthly-budget.${format}`);
  };

  /* ── Email gate state (stub — wire to Resend API route when ready) ─────── */
  const [emailGate, setEmailGate] = useState('');
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<'xlsx' | 'ods'>('xlsx');

  const startDownload = (format: 'xlsx' | 'ods') => {
    setPendingFormat(format);
    setShowEmailGate(true);
  };

  const confirmDownload = () => {
    // TODO: if emailGate is set, POST to /api/budget-email with { email: emailGate, format: pendingFormat }
    // using Resend to send the file — hook in when ready
    handleDownload(pendingFormat);
    setShowEmailGate(false);
  };

  /* ── Import section open/closed ───────────────────────────────────────── */
  const [importOpen, setImportOpen] = useState(false);

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="container-custom py-8 max-w-3xl mx-auto">

      {/* Action Bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-secondary-800">Interactive Budget Planner</h2>
          <p className="text-secondary-400 text-xs mt-0.5">
            Your data is saved locally in your browser — nothing is transmitted.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          {/* Download dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-2 border border-primary-300 rounded-lg text-primary-700 hover:bg-primary-50 text-xs font-semibold transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
              <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg py-1 z-30 hidden group-hover:block min-w-[140px]">
              <button onClick={() => startDownload('xlsx')} className="w-full text-left px-4 py-2 text-xs text-secondary-700 hover:bg-secondary-50 font-medium">
                Excel (.xlsx)
              </button>
              <button onClick={() => startDownload('ods')} className="w-full text-left px-4 py-2 text-xs text-secondary-700 hover:bg-secondary-50 font-medium">
                OpenDocument (.ods)
              </button>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 border border-secondary-300 rounded-lg text-secondary-600 hover:bg-secondary-100 text-xs font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 text-xs font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        </div>
      </div>

      {/* Email gate modal */}
      {showEmailGate && (
        <div className="fixed inset-0 bg-secondary-900 bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-bold text-secondary-800 mb-1">Download Budget Spreadsheet</h3>
            <p className="text-secondary-500 text-xs mb-4 leading-relaxed">
              Optionally enter your email to also receive a copy. Your email is never shared.
            </p>
            <input
              className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              type="email"
              placeholder="your@email.com (optional)"
              value={emailGate}
              onChange={e => setEmailGate(e.target.value)}
            />
            <p className="text-secondary-400 text-xs mb-4">
              Email delivery coming soon — your download will start immediately.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowEmailGate(false)}
                className="px-4 py-2 text-xs text-secondary-500 hover:text-secondary-700 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDownload}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import from Bank Statements ───────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden mb-4">
        <button
          onClick={() => setImportOpen(p => !p)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary-50 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-accent-500 text-secondary-900 text-xs font-bold flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </span>
            <div>
              <p className="font-bold text-secondary-800 text-sm md:text-base leading-tight">Import from Bank Statements</p>
              <p className="text-secondary-400 text-xs mt-0.5 leading-tight">
                Drop CSV exports from your bank — auto-categorizes and populates the budget below
              </p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-secondary-400 transform transition-transform duration-200 flex-shrink-0 ml-4 ${importOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {importOpen && (
          <div className="px-5 pb-6 border-t border-secondary-100 pt-4">
            <StatementImporter onApply={handleApplyTransactions} />
          </div>
        )}
      </div>

      {/* ── A: Net Worth ─────────────────────────────────────────────────── */}
      <SectionCard
        letter="A" title="Net Worth Snapshot" subtitle="What you own minus what you owe"
        badge={totalAssets > 0 || totalDebtA > 0 ? `Net Worth: ${fmt(netWorth)}` : undefined}
        isOpen={open.A} onToggle={() => tog('A')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className={subHdr}>Assets — What You Own</p>
            <NVRowList rows={assets} setRows={setAssets} addLabel="Add Asset" />
            <SubTotal label="Total Assets" amount={totalAssets} />
          </div>
          <div>
            <p className={subHdr}>Debts — What You Owe</p>
            <NVRowList rows={debts} setRows={setDebts} addLabel="Add Debt" />
            <SubTotal label="Total Debt" amount={totalDebtA} />
          </div>
        </div>
        <div className={`mt-5 p-4 rounded-xl border-2 text-center ${netWorth >= 0 ? 'bg-primary-50 border-primary-300' : 'bg-red-50 border-red-300'}`}>
          <p className="text-xs font-bold uppercase tracking-wide text-secondary-500 mb-1">Estimated Net Worth</p>
          <p className={`text-3xl font-bold ${netWorth >= 0 ? 'text-primary-700' : 'text-red-600'}`}>{fmt(netWorth)}</p>
          {netWorth < 0 && (
            <p className="text-red-500 text-xs mt-1">Negative net worth is very common — every Baby Step moves this number in the right direction.</p>
          )}
        </div>
      </SectionCard>

      {/* ── B: Income Overview ───────────────────────────────────────────── */}
      <SectionCard
        letter="B" title="Income Overview" subtitle="Monthly take-home pay after taxes"
        badge={totalIncome > 0 ? `${fmt(totalIncome)}/mo` : undefined}
        isOpen={open.B} onToggle={() => tog('B')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className={subHdr}>Monthly Take-Home Pay</p>
            <AmtRowList rows={incRows} setRows={setIncRows} addLabel="Add Income Source" />
            <SubTotal label="Total Income" amount={totalIncome} />
          </div>
          <div>
            <p className={subHdr}>Budget Summary</p>
            <div className="space-y-0">
              {[
                { label: 'Total Income',        val: totalIncome,  cls: 'text-primary-700'   },
                { label: '− Fixed Costs (C)',    val: totalFixed,   cls: 'text-secondary-700' },
                { label: '− Variable Costs (D)', val: totalVar,     cls: 'text-secondary-700' },
                { label: '− Savings (E)',         val: totalSavings, cls: 'text-secondary-700' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-secondary-100">
                  <span className="text-sm text-secondary-600">{row.label}</span>
                  <span className={`text-sm font-semibold ${row.cls}`}>{fmt(row.val)}</span>
                </div>
              ))}
              <div className={`flex justify-between items-center pt-3 mt-1 border-t-2 ${leftover >= 0 ? 'border-primary-300' : 'border-red-300'}`}>
                <span className="text-sm font-bold text-secondary-700">Leftover</span>
                <span className={`text-xl font-bold ${leftover >= 0 ? 'text-primary-700' : 'text-red-600'}`}>{fmt(leftover)}</span>
              </div>
            </div>
            {leftover < 0 && (
              <p className="text-red-500 text-xs mt-2 leading-tight">You&apos;re spending more than you earn. Review variable costs and savings buckets.</p>
            )}
            {leftover >= 0 && leftover < 100 && totalIncome > 0 && (
              <p className="text-accent-700 text-xs mt-2 leading-tight">Every dollar has a job — great budgeting!</p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── C: Fixed Monthly Costs ───────────────────────────────────────── */}
      <SectionCard
        letter="C" title="Fixed Monthly Costs" subtitle="Consistent expenses that don't change month to month"
        badge={totalFixed > 0 ? `${fmt(totalFixed)}/mo` : undefined}
        isOpen={open.C} onToggle={() => tog('C')}
      >
        <div className={subGrp}>
          <p className={subHdr}>Mortgage / Housing</p>
          <AmtRowList rows={mortRows} setRows={setMortRows} addLabel="Add Row" />
          <SubTotal label="Mortgage Subtotal" amount={mortTotal} />
        </div>

        <div className={subGrp}>
          <p className={subHdr}>Auto</p>
          <AmtRowList rows={autoRows} setRows={setAutoRows} addLabel="Add Row" />
          <SubTotal label="Auto Subtotal" amount={autoTotal} />
        </div>

        <div className={subGrp}>
          <p className={subHdr}>
            Giving &amp; Charity
            <span className="ml-2 font-normal normal-case tracking-normal text-secondary-400">
              — bi-weekly? enter amount × 2.17 for monthly
            </span>
          </p>
          <AmtRowList rows={giveRows} setRows={setGiveRows} addLabel="Add Row" />
          <SubTotal label="Giving Subtotal" amount={givingTotal} />
        </div>

        <div className={subGrp}>
          <p className={subHdr}>Monthly Subscriptions</p>
          <AmtRowList rows={subs} setRows={setSubs} addLabel="Add Subscription" />
          <SubTotal label="Subscriptions Subtotal" amount={subsTotal} />
        </div>

        <div className={subGrp}>
          <p className={subHdr}>Insurance</p>
          <AmtRowList rows={insRows} setRows={setInsRows} addLabel="Add Insurance" />
          <SubTotal label="Insurance Subtotal" amount={insTotal} />
        </div>

        <div className={subGrp}>
          <p className={subHdr}>
            Sinking Funds
            <span className="ml-2 font-normal normal-case tracking-normal text-secondary-400">
              — irregular bills averaged to a monthly amount
            </span>
          </p>
          <div className="space-y-2">
            {sinks.map((row, i) => (
              <div key={row.id} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                <input
                  className={`${inp} flex-1 min-w-0`}
                  value={row.name}
                  onChange={e => setSinks(sinks.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}
                  placeholder="Description"
                />
                <input
                  className={`${inp} w-24 flex-shrink-0 text-right`}
                  type="number" min="0"
                  value={row.amount}
                  onChange={e => setSinks(sinks.map((r, j) => j === i ? { ...r, amount: e.target.value } : r))}
                  placeholder="0"
                />
                <select
                  className={`${inp} w-36 flex-shrink-0`}
                  value={row.freq}
                  onChange={e => setSinks(sinks.map((r, j) => j === i ? { ...r, freq: e.target.value as FreqVal } : r))}
                >
                  {FREQS.map(f => <option key={f.val} value={f.val}>{f.label}</option>)}
                </select>
                <span className="text-xs text-primary-600 font-semibold w-20 flex-shrink-0 text-right">
                  {nv(row.amount) > 0 ? `${fmt(nv(row.amount) / fdiv(row.freq))}/mo` : '—'}
                </span>
                <button
                  onClick={() => setSinks(sinks.filter((_, j) => j !== i))}
                  className={`${rmBtn} flex-shrink-0`}
                  title="Remove"
                >×</button>
              </div>
            ))}
            <button
              onClick={() => setSinks([...sinks, { id: uid(), name: '', amount: '', freq: 'monthly' }])}
              className={addBtn}
            >
              <span className="font-bold text-base">+</span> Add Sinking Fund
            </button>
          </div>
          <SubTotal label="Sinking Funds Subtotal (monthly equiv.)" amount={sinksTotal} />
        </div>

        <SectionTotal label="Total Fixed Costs" amount={totalFixed} />
      </SectionCard>

      {/* ── D: Variable Costs ────────────────────────────────────────────── */}
      <SectionCard
        letter="D" title="Fluctuating / Variable Costs" subtitle="Expenses that vary month to month"
        badge={totalVar > 0 ? `${fmt(totalVar)}/mo` : undefined}
        isOpen={open.D} onToggle={() => tog('D')}
      >
        <div className={subGrp}>
          <p className={subHdr}>Discretionary Spending</p>
          <AmtRowList rows={spending} setRows={setSpending} addLabel="Add Spending Category" />
          <SubTotal label="Spending Subtotal" amount={spendTotal} />
        </div>

        <div className={subGrp}>
          <p className={subHdr}>Necessities &amp; Utilities</p>
          <AmtRowList rows={neededRows} setRows={setNeededRows} addLabel="Add Utility / Necessity" />
          <SubTotal label="Necessities Subtotal" amount={neededTotal} />
        </div>

        <SectionTotal label="Total Variable Costs" amount={totalVar} />
      </SectionCard>

      {/* ── E: Savings Buckets ───────────────────────────────────────────── */}
      <SectionCard
        letter="E" title="Savings Buckets" subtitle="Planned monthly saving for future expenses"
        badge={totalSavings > 0 ? `${fmt(totalSavings)}/mo` : undefined}
        isOpen={open.E} onToggle={() => tog('E')}
      >
        <p className="text-secondary-500 text-xs italic mb-4 leading-relaxed">
          Assign a monthly amount to each bucket. These are pulled out of your leftover in the Section B summary.
        </p>
        <AmtRowList rows={savings} setRows={setSavings} addLabel="Add Savings Bucket" />
        <SectionTotal label="Total Monthly Savings" amount={totalSavings} />
      </SectionCard>

      {/* ── F: Effective Interest Rate ───────────────────────────────────── */}
      <SectionCard
        letter="F" title="Effective Interest Rate" subtitle="Your blended cost of debt across all loans"
        badge={effectiveRate > 0 ? `${effectiveRate.toFixed(2)}%` : undefined}
        isOpen={open.F} onToggle={() => tog('F')}
      >
        <p className="text-secondary-500 text-xs italic mb-4 leading-relaxed">
          Enter each debt with its current balance and annual interest rate. The effective rate is the
          balance-weighted average — the lower this number, the better. Use the same balances from Section A above.
        </p>

        {/* Column headers */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_7rem_6rem_1.5rem] gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wide text-secondary-400 pl-1">Debt Name</span>
          <span className="text-xs font-bold uppercase tracking-wide text-secondary-400 text-right">Balance ($)</span>
          <span className="text-xs font-bold uppercase tracking-wide text-secondary-400 text-right">Rate (%)</span>
          <span />
        </div>

        <div className="space-y-2">
          {eirRows.map((row, i) => (
            <div key={row.id} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
              <input
                className={`${inp} flex-1 min-w-0`}
                value={row.name}
                onChange={e => setEirRows(eirRows.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}
                placeholder="Debt name"
              />
              <input
                className={`${inp} w-28 flex-shrink-0 text-right`}
                type="number" min="0"
                value={row.balance}
                onChange={e => setEirRows(eirRows.map((r, j) => j === i ? { ...r, balance: e.target.value } : r))}
                placeholder="Balance"
              />
              <input
                className={`${inp} w-24 flex-shrink-0 text-right`}
                type="number" min="0" step="0.1"
                value={row.rate}
                onChange={e => setEirRows(eirRows.map((r, j) => j === i ? { ...r, rate: e.target.value } : r))}
                placeholder="Rate %"
              />
              <button
                onClick={() => setEirRows(eirRows.filter((_, j) => j !== i))}
                className={`${rmBtn} flex-shrink-0`}
                title="Remove"
              >×</button>
            </div>
          ))}
          <button
            onClick={() => setEirRows([...eirRows, { id: uid(), name: '', balance: '', rate: '' }])}
            className={addBtn}
          >
            <span className="font-bold text-base">+</span> Add Debt
          </button>
        </div>

        {effectiveRate > 0 && (
          <div className="mt-5 p-4 bg-accent-50 border border-accent-300 rounded-xl">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-sm text-secondary-600">Effective Interest Rate</span>
              <span className="text-3xl font-bold text-accent-700">{effectiveRate.toFixed(2)}%</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
              <div className="flex justify-between border-b border-accent-200 pb-1">
                <span className="text-secondary-500">Total Debt</span>
                <span className="font-semibold text-secondary-700">{fmt(eirTotalBal)}</span>
              </div>
              <div className="flex justify-between border-b border-accent-200 pb-1">
                <span className="text-secondary-500">Debts Entered</span>
                <span className="font-semibold text-secondary-700">
                  {eirRows.filter(r => nv(r.balance) > 0).length}
                </span>
              </div>
            </div>
            <p className="text-secondary-500 text-xs leading-relaxed">
              This is the balance-weighted average of all your interest rates. Use it as a benchmark when
              evaluating debt payoff order or consolidation offers — and watch it drop as you eliminate debt.
            </p>
          </div>
        )}
      </SectionCard>

    </div>
  );
}
