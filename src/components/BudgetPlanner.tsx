import { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import StatementImporter, { AppliedItem } from './StatementImporter';
import { buildBudgetWorkbook } from '@/lib/buildBudgetWorkbook';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getUserTransactions, getGlobalCategories } from '@/lib/dataService';

/* ─── Types ────────────────────────────────────────────────────────────────── */
interface NVRow   { id: string; name: string; value: string; }
interface AmtRow  { id: string; name: string; amount: string; }
interface SinkRow { id: string; name: string; amount: string; freq: FreqVal; }
type FreqVal = 'weekly' | 'biweekly' | 'monthly' | 'every2' | 'quarterly' | 'every4' | 'twice' | 'yearly';

interface SubsectionData {
  id: string;
  label: string;
  rows: AmtRow[];
}

interface MonthData {
  label: string;                    // "March 2025"
  actuals: Record<string, string>;  // row.id → actual value entered by user
}

/* ─── Module-level helpers ─────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);
const nv  = (s: string) => parseFloat(s) || 0;
const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const FREQS: { val: FreqVal; label: string; div: number }[] = [
  { val: 'weekly',    label: 'Weekly',          div: 12 / 52 }, // × 52/12 → monthly
  { val: 'biweekly',  label: 'Bi-Weekly',       div: 12 / 26 }, // × 26/12 → monthly
  { val: 'monthly',   label: 'Monthly',          div: 1       },
  { val: 'every2',    label: 'Every 2 Months',   div: 2       },
  { val: 'quarterly', label: 'Quarterly',        div: 3       },
  { val: 'every4',    label: 'Every 4 Months',   div: 4       },
  { val: 'twice',     label: 'Twice a Year',     div: 6       },
  { val: 'yearly',    label: 'Yearly',           div: 12      },
];
const fdiv = (f: FreqVal) => FREQS.find(o => o.val === f)!.div;

/* Pure row-update helpers — no component closure, safe to use in child props */
const setAmtField = (rows: AmtRow[], i: number, k: 'name' | 'amount', v: string): AmtRow[] =>
  rows.map((r, j) => (j === i ? { ...r, [k]: v } : r));
const setNVField = (rows: NVRow[], i: number, k: 'name' | 'value', v: string): NVRow[] =>
  rows.map((r, j) => (j === i ? { ...r, [k]: v } : r));

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

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

const dfFixedSubs = (): SubsectionData[] => [
  { id: 'mort', label: 'Mortgage / Housing', rows: dfMort() },
  { id: 'auto', label: 'Auto', rows: dfAuto() },
  { id: 'give', label: 'Giving & Charity', rows: dfGive() },
  { id: 'subs', label: 'Monthly Subscriptions', rows: dfSubs() },
  { id: 'ins',  label: 'Insurance', rows: dfIns() },
];
const dfVarSubs = (): SubsectionData[] => [
  { id: 'spend',  label: 'Discretionary Spending', rows: dfSpending() },
  { id: 'needed', label: 'Necessities & Utilities', rows: dfNeeded() },
];

/* ─── localStorage persistence ─────────────────────────────────────────────── */
const LS_KEY        = 'ramseycoach_budget';
const LS_MONTHS_KEY = 'ramseycoach_budget_months';

const loadSaved = (): Record<string, unknown> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem(LS_KEY);
    return s ? (JSON.parse(s) as Record<string, unknown>) : null;
  } catch { return null; }
};

const loadMonths = (): MonthData[] => {
  if (typeof window === 'undefined') return [];
  try {
    const s = localStorage.getItem(LS_MONTHS_KEY);
    return s ? (JSON.parse(s) as MonthData[]) : [];
  } catch { return []; }
};

/* ─── TxIndicator category mapper ──────────────────────────────────────────── */
function getTxCategories(subLabel: string): string[] {
  const l = subLabel.toLowerCase();
  if (l.includes('mortgage') || l.includes('housing')) return ['Housing'];
  if (l.includes('auto') || l.includes('car') || l.includes('transport')) return ['Auto & Transportation'];
  if (l.includes('giv') || l.includes('charit') || l.includes('tithe')) return ['Giving & Charity'];
  if (l.includes('subscri') || l.includes('entertain') || l.includes('stream')) return ['Entertainment & Subscriptions'];
  if (l.includes('spend') || l.includes('discret') || l.includes('misc')) return ['Miscellaneous', 'Personal Care'];
  if (l.includes('necessit') || l.includes('utilit') || l.includes('groceri')) return ['Utilities', 'Food & Grocery'];
  if (l.includes('saving')) return ['Savings'];
  return [];
}

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

function TxIndicator({ budgeted, categoryNames, txByCat }: {
  budgeted: number;
  categoryNames: string[];
  txByCat: Record<string, { count: number; total: number }>;
}) {
  const spent = categoryNames.reduce((sum, n) => sum + (txByCat[n]?.total ?? 0), 0);
  const count = categoryNames.reduce((sum, n) => sum + (txByCat[n]?.count ?? 0), 0);
  if (count === 0) return null;
  const ratio = budgeted > 0 ? spent / budgeted : 0;
  const cls = ratio <= 1
    ? 'border-green-200 bg-green-50 text-green-700'
    : ratio <= 1.1
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : 'border-red-200 bg-red-50 text-red-700';
  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs mt-2 ${cls}`}>
      <span>{count} transaction{count !== 1 ? 's' : ''} this month</span>
      <span className="font-semibold">
        {fmt(spent)} spent{budgeted > 0 ? ` of ${fmt(budgeted)}` : ''}
      </span>
    </div>
  );
}

interface AmtRowListProps {
  rows: AmtRow[];
  setRows: (r: AmtRow[]) => void;
  addLabel: string;
  sectionKey?: string;
  selectedKeys?: Set<string>;
  onToggleSelect?: (key: string) => void;
  pendingMove?: boolean;
  onMoveHere?: () => void;
  onPushUndo?: () => void;
  dragItem?: React.MutableRefObject<{ sectionType: string; subId: string; rowId: string } | null>;
  dragOverItem?: React.MutableRefObject<{ sectionType: string; subId: string; rowId: string } | null>;
  onDropReorder?: (rows: AmtRow[]) => void;
  onDropMove?: (fromSectionType: string, fromSubId: string, rowId: string) => void;
}

function AmtRowList({
  rows, setRows, addLabel,
  sectionKey, selectedKeys, onToggleSelect,
  pendingMove, onMoveHere, onPushUndo,
  dragItem, dragOverItem, onDropReorder, onDropMove,
}: AmtRowListProps) {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Parse sectionType and subId from sectionKey (e.g. "fixed:mort")
  const [sectionType, subId] = sectionKey ? sectionKey.split(':') : ['', ''];

  return (
    <div className="space-y-2">
      {rows.map((row, i) => {
        const rowKey = sectionKey ? `${sectionKey}:${row.id}` : '';
        const isSelected = rowKey && selectedKeys ? selectedKeys.has(rowKey) : false;
        return (
          <div
            key={row.id}
            className={`flex gap-2 items-center rounded transition-colors ${isSelected ? 'bg-primary-50' : ''} ${dragOverIdx === i ? 'border-t-2 border-primary-400' : ''}`}
            draggable={!!dragItem}
            onDragStart={() => {
              if (dragItem) dragItem.current = { sectionType, subId, rowId: row.id };
            }}
            onDragOver={e => {
              e.preventDefault();
              if (dragItem?.current && dragItem.current.rowId !== row.id) {
                setDragOverIdx(i);
                if (dragOverItem) dragOverItem.current = { sectionType, subId, rowId: row.id };
              }
            }}
            onDrop={e => {
              e.preventDefault();
              setDragOverIdx(null);
              if (!dragItem?.current) return;
              const from = dragItem.current;
              if (from.sectionType === sectionType && from.subId === subId) {
                // Reorder within same sub
                if (onDropReorder && from.rowId !== row.id) {
                  const fromIdx = rows.findIndex(r => r.id === from.rowId);
                  if (fromIdx < 0) return;
                  const newRows = [...rows];
                  const [moved] = newRows.splice(fromIdx, 1);
                  newRows.splice(i, 0, moved);
                  onPushUndo?.();
                  onDropReorder(newRows);
                }
              } else {
                // Move to different sub
                if (onDropMove) {
                  onPushUndo?.();
                  onDropMove(from.sectionType, from.subId, from.rowId);
                }
              }
              dragItem.current = null;
            }}
            onDragEnd={() => {
              setDragOverIdx(null);
              if (dragItem) dragItem.current = null;
            }}
          >
            {/* Drag handle */}
            {dragItem && (
              <span className="text-secondary-300 cursor-grab active:cursor-grabbing text-base select-none flex-shrink-0 px-0.5" title="Drag to reorder">
                ⠿
              </span>
            )}
            {/* Checkbox for selection */}
            {sectionKey && onToggleSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(rowKey)}
                className="flex-shrink-0 w-4 h-4 accent-primary-600 cursor-pointer"
              />
            )}
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
            <button onClick={() => { onPushUndo?.(); setRows(rows.filter((_, j) => j !== i)); }} className={rmBtn} title="Remove">
              ×
            </button>
          </div>
        );
      })}
      {pendingMove && onMoveHere ? (
        <button onClick={onMoveHere} className="text-primary-600 hover:text-primary-800 text-sm font-semibold flex items-center gap-1 mt-3 transition-colors border border-dashed border-primary-400 rounded-lg px-3 py-2 w-full justify-center">
          <span className="font-bold text-base">→</span> Move selected here
        </button>
      ) : (
        <button onClick={() => { onPushUndo?.(); setRows([...rows, { id: uid(), name: '', amount: '' }]); }} className={addBtn}>
          <span className="font-bold text-base">+</span> {addLabel}
        </button>
      )}
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

/* ─── EditableSubHeader ─────────────────────────────────────────────────────── */
interface EditableSubHeaderProps {
  label: string;
  onLabelChange: (v: string) => void;
  onDelete: () => void;
  extraNote?: string;
}
function EditableSubHeader({ label, onLabelChange, onDelete, extraNote }: EditableSubHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    setEditing(false);
    if (draft.trim()) onLabelChange(draft.trim());
    else setDraft(label);
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <div className="flex items-center gap-2 mb-3 pb-1 border-b border-secondary-100">
      {editing ? (
        <input
          ref={inputRef}
          className="text-xs font-bold uppercase tracking-wider text-secondary-600 bg-transparent border-b border-primary-400 outline-none flex-1"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setDraft(label); } }}
        />
      ) : (
        <span className="text-xs font-bold uppercase tracking-wider text-secondary-400 flex-1">
          {label}
          {extraNote && <span className="ml-2 font-normal normal-case tracking-normal text-secondary-400">{extraNote}</span>}
        </span>
      )}
      <button
        onClick={() => { setDraft(label); setEditing(e => !e); }}
        className="text-secondary-300 hover:text-primary-500 transition-colors flex-shrink-0"
        title="Edit label"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button
        onClick={onDelete}
        className="text-secondary-300 hover:text-red-400 transition-colors flex-shrink-0"
        title="Delete subsection"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

/* ─── ComparisonSection (helper for MonthComparisonView) ───────────────────── */
interface CompRow { id: string; name: string; budget: number; }
interface ComparisonSectionProps {
  title: string;
  rows: CompRow[];
  actuals: Record<string, string>;
  onActualChange: (id: string, value: string) => void;
}

function ComparisonSection({ title, rows, actuals, onActualChange }: ComparisonSectionProps) {
  const [open, setOpen] = useState(true);
  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalActual = rows.reduce((s, r) => s + (parseFloat(actuals[r.id]) || 0), 0);
  const hasActuals  = rows.some(r => actuals[r.id]);
  const totalDiff   = totalActual - totalBudget;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden mb-3">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-secondary-50 transition-colors focus:outline-none"
      >
        <span className="font-bold text-secondary-800 text-sm">{title}</span>
        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          <span className="text-xs text-secondary-400 hidden sm:block">
            Budget: {fmt(totalBudget)}
            {hasActuals && ` | Actual: ${fmt(totalActual)}`}
          </span>
          {hasActuals && (
            <span className={`text-sm font-bold ${totalDiff > 0 ? 'text-red-500' : totalDiff < 0 ? 'text-primary-600' : 'text-secondary-400'}`}>
              {totalDiff > 0 ? '+' : ''}{fmt(totalDiff)}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-secondary-400 transform transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-secondary-100">
          {/* Column header */}
          <div className="flex items-center px-5 py-2 gap-3 bg-secondary-50 border-b border-secondary-100">
            <span className="flex-1 text-xs font-bold uppercase tracking-wider text-secondary-400">Category</span>
            <span className="w-20 text-right text-xs font-bold uppercase tracking-wider text-secondary-400 flex-shrink-0">Budget</span>
            <span className="w-20 text-right text-xs font-bold uppercase tracking-wider text-secondary-400 flex-shrink-0">Actual</span>
            <span className="w-20 text-right text-xs font-bold uppercase tracking-wider text-secondary-400 flex-shrink-0">Diff</span>
          </div>

          {rows.map(row => {
            const actual = parseFloat(actuals[row.id]) || 0;
            const diff   = actual - row.budget;
            const hasVal = !!actuals[row.id];
            return (
              <div key={row.id} className="flex items-center px-5 py-2 gap-3 border-b border-secondary-50 hover:bg-secondary-50">
                <span className="flex-1 text-sm text-secondary-700 truncate">{row.name || '—'}</span>
                <span className="w-20 text-right text-sm text-secondary-500 flex-shrink-0">{fmt(row.budget)}</span>
                <div className="w-20 flex-shrink-0 flex justify-end">
                  <input
                    type="number"
                    min="0"
                    className="border border-secondary-200 rounded px-2 py-1 text-xs text-right w-20 focus:outline-none focus:ring-1 focus:ring-primary-400"
                    value={actuals[row.id] ?? ''}
                    onChange={e => onActualChange(row.id, e.target.value)}
                    placeholder="0"
                  />
                </div>
                <span className={`w-20 text-right text-sm font-semibold flex-shrink-0 ${
                  hasVal
                    ? diff > 0 ? 'text-red-500' : diff < 0 ? 'text-primary-600' : 'text-secondary-400'
                    : 'text-secondary-300'
                }`}>
                  {hasVal ? (diff > 0 ? '+' : '') + fmt(diff) : '—'}
                </span>
              </div>
            );
          })}

          {/* Totals row */}
          <div className="flex items-center px-5 py-2 gap-3 bg-secondary-50 border-t border-secondary-200">
            <span className="flex-1 text-xs font-bold uppercase text-secondary-500">Total</span>
            <span className="w-20 text-right text-sm font-bold text-secondary-700 flex-shrink-0">{fmt(totalBudget)}</span>
            <span className="w-20 text-right text-sm font-bold text-secondary-700 flex-shrink-0">
              {hasActuals ? fmt(totalActual) : '—'}
            </span>
            <span className={`w-20 text-right text-sm font-bold flex-shrink-0 ${
              hasActuals
                ? totalDiff > 0 ? 'text-red-500' : totalDiff < 0 ? 'text-primary-600' : 'text-secondary-400'
                : 'text-secondary-300'
            }`}>
              {hasActuals ? (totalDiff > 0 ? '+' : '') + fmt(totalDiff) : '—'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MCVActionButtons — reusable action bar for MonthComparisonView ───────── */
interface MCVActionButtonsProps {
  onSave: () => void;
  onImport: () => void;
  onUndo: (toIndex?: number) => void;
  undoStack: BudgetUndoSnapshot[];
}

function MCVActionButtons({ onSave, onImport, onUndo, undoStack }: MCVActionButtonsProps) {
  const [savePrintOpen, setSavePrintOpen] = useState(false);
  const [undoMenuOpen, setUndoMenuOpen] = useState(false);
  const savePrintRef = useRef<HTMLDivElement>(null);
  const undoMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (savePrintRef.current && !savePrintRef.current.contains(e.target as Node)) setSavePrintOpen(false);
      if (undoMenuRef.current && !undoMenuRef.current.contains(e.target as Node)) setUndoMenuOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const relTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return `${Math.floor(diff / 3600)} hr ago`;
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {/* Save / Print dropdown */}
      <div className="relative" ref={savePrintRef}>
        <button
          onClick={() => setSavePrintOpen(p => !p)}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white hover:bg-primary-700 text-xs font-semibold rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save / Print
          <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {savePrintOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg py-1 z-30 min-w-[180px]">
            <button
              onClick={() => { onSave(); setSavePrintOpen(false); }}
              className="w-full text-left px-4 py-2 text-xs text-secondary-700 hover:bg-secondary-50 font-medium"
            >
              Save to account
            </button>
            <div className="border-t border-secondary-100 my-1" />
            <button
              onClick={() => { window.print(); setSavePrintOpen(false); }}
              className="w-full text-left px-4 py-2 text-xs text-secondary-700 hover:bg-secondary-50 font-medium"
            >
              Print
            </button>
          </div>
        )}
      </div>

      {/* Import button */}
      <button
        onClick={onImport}
        className="flex items-center gap-1.5 px-3 py-2 border border-secondary-300 rounded-lg text-secondary-600 hover:bg-secondary-100 text-xs font-semibold transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Import
      </button>

      {/* Undo dropdown */}
      <div className="relative" ref={undoMenuRef}>
        <button
          onClick={() => setUndoMenuOpen(p => !p)}
          className={`flex items-center gap-1.5 px-3 py-2 border border-secondary-300 rounded-lg text-secondary-600 hover:bg-secondary-100 text-xs font-semibold transition-colors ${undoStack.length === 0 ? 'opacity-40' : ''}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6" />
          </svg>
          Undo
          <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {undoMenuOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg py-1 z-30 min-w-[220px]">
            {undoStack.length === 0 ? (
              <span className="block px-4 py-2 text-xs text-secondary-400">Nothing to undo</span>
            ) : (
              [...undoStack].reverse().slice(0, 5).map((snap, i) => {
                const realIdx = undoStack.length - 1 - i;
                return (
                  <button
                    key={realIdx}
                    onClick={() => { onUndo(realIdx); setUndoMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs text-secondary-700 hover:bg-secondary-50 font-medium"
                  >
                    Step {realIdx + 1} — {relTime(snap.timestamp)}
                  </button>
                );
              })
            )}
            <div className="border-t border-secondary-100 my-1" />
            <button
              onClick={() => { setUndoMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 font-medium"
            >
              Total Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── MonthComparisonView ───────────────────────────────────────────────────── */
interface MonthComparisonViewProps {
  incRows: AmtRow[];
  fixedSubs: SubsectionData[];
  varSubs: SubsectionData[];
  sinks: SinkRow[];
  sinksLabel: string;
  savings: AmtRow[];
  totalIncome: number;
  totalFixed: number;
  totalVar: number;
  totalSavings: number;
  months: MonthData[];
  setMonths: (months: MonthData[]) => void;
  onBack: () => void;
  onAddFixedSub: (label: string) => void;
  onAddVarSub: (label: string) => void;
  onSave: () => void;
  onImport: () => void;
  onUndo: (toIndex?: number) => void;
  undoStack: BudgetUndoSnapshot[];
}

function MonthComparisonView({
  incRows, fixedSubs, varSubs, sinks, sinksLabel, savings,
  totalIncome, totalFixed, totalVar, totalSavings,
  months, setMonths, onBack,
  onAddFixedSub, onAddVarSub,
  onSave, onImport, onUndo, undoStack,
}: MonthComparisonViewProps) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const activeLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
  const activeMonth = months.find(m => m.label === activeLabel);
  const actuals = activeMonth?.actuals ?? {};

  const updateActual = (rowId: string, value: string) => {
    setMonths(months.map(m => m.label === activeLabel
      ? { ...m, actuals: { ...m.actuals, [rowId]: value } }
      : m
    ).concat(activeMonth ? [] : [{ label: activeLabel, actuals: { [rowId]: value } }]));
  };

  // Build comparison row groups
  const incComp = incRows.map(r => ({ id: r.id, name: r.name, budget: nv(r.amount) }));
  const fixedComp = [
    ...fixedSubs.flatMap(sub => sub.rows.map(r => ({ id: r.id, name: r.name, budget: nv(r.amount) }))),
    ...sinks.map(r => ({ id: r.id, name: r.name, budget: Math.round(nv(r.amount) / fdiv(r.freq)) })),
  ];
  const varComp = varSubs.flatMap(sub => sub.rows.map(r => ({ id: r.id, name: r.name, budget: nv(r.amount) })));
  const savingsComp = savings.map(r => ({ id: r.id, name: r.name, budget: nv(r.amount) }));

  // Derived summary actuals
  const actualIncome   = incComp.reduce((s, r) => s + (parseFloat(actuals[r.id]) || 0), 0);
  const actualFixed    = fixedComp.reduce((s, r) => s + (parseFloat(actuals[r.id]) || 0), 0);
  const actualVar      = varComp.reduce((s, r) => s + (parseFloat(actuals[r.id]) || 0), 0);
  const actualSavings  = savingsComp.reduce((s, r) => s + (parseFloat(actuals[r.id]) || 0), 0);
  const actualLeftover = actualIncome - actualFixed - actualVar - actualSavings;
  const budgetLeftover = totalIncome - totalFixed - totalVar - totalSavings;
  const hasAnyActuals  = [...incComp, ...fixedComp, ...varComp, ...savingsComp].some(r => actuals[r.id]);

  const yearOptions = Array.from({ length: 11 }, (_, i) => now.getFullYear() - 5 + i);

  return (
    <div className="container-custom py-8 max-w-3xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-secondary-600 hover:text-secondary-800 font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Budget
        </button>
        <h2 className="text-xl font-bold text-secondary-800">Monthly Comparison</h2>
        {/* Quick action buttons */}
        <MCVActionButtons onSave={onSave} onImport={onImport} onUndo={onUndo} undoStack={undoStack} />
      </div>

      {/* Year + Month picker */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4 mb-4">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <label className="text-xs font-bold uppercase tracking-wider text-secondary-500">Year</label>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className={`${inp} w-28`}
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {MONTH_NAMES.map((m, i) => (
            <button
              key={m}
              onClick={() => setSelectedMonth(i)}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                i === selectedMonth
                  ? 'bg-primary-600 text-white'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              }`}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Active month label */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl px-5 py-3 mb-4">
        <p className="font-bold text-primary-700">{activeLabel}</p>
        <p className="text-primary-500 text-xs">Enter actual amounts spent this month. Changes save automatically.</p>
      </div>

      {/* Comparison sections */}
      <ComparisonSection title="Income" rows={incComp} actuals={actuals} onActualChange={updateActual} />
      <ComparisonSection title={`Fixed Costs (incl. ${sinksLabel})`} rows={fixedComp} actuals={actuals} onActualChange={updateActual} />
      <div className="flex justify-end mb-2">
        <button
          onClick={() => {
            const label = window.prompt('New fixed subsection name:');
            if (label?.trim()) onAddFixedSub(label.trim());
          }}
          className="text-xs text-primary-600 hover:text-primary-800 font-semibold flex items-center gap-1 transition-colors"
        >
          <span className="font-bold">+</span> Add Fixed Subsection
        </button>
      </div>
      <ComparisonSection title="Variable Costs" rows={varComp} actuals={actuals} onActualChange={updateActual} />
      <div className="flex justify-end mb-2">
        <button
          onClick={() => {
            const label = window.prompt('New variable subsection name:');
            if (label?.trim()) onAddVarSub(label.trim());
          }}
          className="text-xs text-primary-600 hover:text-primary-800 font-semibold flex items-center gap-1 transition-colors"
        >
          <span className="font-bold">+</span> Add Variable Subsection
        </button>
      </div>
      <ComparisonSection title="Savings" rows={savingsComp} actuals={actuals} onActualChange={updateActual} />

      {/* Summary card — only when some actuals entered */}
      {hasAnyActuals && (
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-5 mb-4">
          <h3 className="font-bold text-secondary-800 mb-3 text-sm">Summary</h3>
          {[
            { label: 'Total Income',   budget: totalIncome,  actual: actualIncome  },
            { label: 'Fixed Costs',    budget: totalFixed,   actual: actualFixed   },
            { label: 'Variable Costs', budget: totalVar,     actual: actualVar     },
            { label: 'Savings',        budget: totalSavings, actual: actualSavings },
          ].map(row => {
            const diff = row.actual - row.budget;
            return (
              <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-secondary-100 gap-4">
                <span className="text-sm text-secondary-600 flex-shrink-0">{row.label}</span>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs text-secondary-400 w-24 text-right hidden sm:block">Budget: {fmt(row.budget)}</span>
                  <span className="text-sm font-semibold text-secondary-700 w-20 text-right">{fmt(row.actual)}</span>
                  <span className={`text-sm font-bold w-20 text-right ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-primary-600' : 'text-secondary-400'}`}>
                    {diff !== 0 ? (diff > 0 ? '+' : '') + fmt(diff) : '—'}
                  </span>
                </div>
              </div>
            );
          })}
          <div className={`flex items-center justify-between pt-3 mt-2 border-t-2 gap-4 ${actualLeftover >= 0 ? 'border-primary-300' : 'border-red-300'}`}>
            <span className="text-sm font-bold text-secondary-700 flex-shrink-0">Leftover</span>
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="text-xs text-secondary-400 w-24 text-right hidden sm:block">Budget: {fmt(budgetLeftover)}</span>
              <span className={`text-xl font-bold w-20 text-right ${actualLeftover >= 0 ? 'text-primary-700' : 'text-red-600'}`}>
                {fmt(actualLeftover)}
              </span>
              <span className={`text-sm font-bold w-20 text-right ${
                actualLeftover - budgetLeftover > 0 ? 'text-primary-600'
                : actualLeftover - budgetLeftover < 0 ? 'text-red-500'
                : 'text-secondary-400'
              }`}>
                {actualLeftover !== budgetLeftover
                  ? (actualLeftover - budgetLeftover > 0 ? '+' : '') + fmt(actualLeftover - budgetLeftover)
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   BudgetPlanner — main component
══════════════════════════════════════════════════════════════════════════════ */

type BudgetUndoSnapshot = {
  fixedSubs: SubsectionData[];
  varSubs: SubsectionData[];
  sinks: SinkRow[];
  sinksLabel: string;
  savings: AmtRow[];
  incRows: AmtRow[];
  assets: NVRow[];
  debts: NVRow[];
  timestamp: number;
};

export default function BudgetPlanner() {
  const { user, openAuthModal } = useAuth();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  /* Load once from localStorage (lazy — runs only on mount) */
  const [saved] = useState(() => loadSaved());

  /* Sections open/closed */
  const [open, setOpen] = useState<Record<string, boolean>>(
    () => (saved?.open as Record<string, boolean>) ?? { A: true, B: true, C: false, D: false, E: false }
  );
  const tog = (s: string) => setOpen(p => ({ ...p, [s]: !p[s] }));

  /* Import modal */
  const [importModalOpen, setImportModalOpen] = useState(false);

  /* Chart tip modal — shown after spreadsheet download */
  const [chartTipOpen, setChartTipOpen] = useState(false);

  /* Section A */
  const [assets, setAssets] = useState<NVRow[]>(() => (saved?.assets as NVRow[]) ?? dfAssets());
  const [debts,  setDebts]  = useState<NVRow[]>(() => (saved?.debts  as NVRow[]) ?? dfDebts());

  /* Section B */
  const [incRows, setIncRows] = useState<AmtRow[]>(() => (saved?.incRows as AmtRow[]) ?? dfIncome());

  /* Section C — dynamic subsections */
  const [fixedSubs, setFixedSubs] = useState<SubsectionData[]>(() => {
    const s = saved;
    if (s?.mortRows && !s?.fixedSubs) {
      return [
        { id: 'mort', label: 'Mortgage / Housing', rows: (s.mortRows as AmtRow[]) || dfMort() },
        { id: 'auto', label: 'Auto', rows: (s.autoRows as AmtRow[]) || dfAuto() },
        { id: 'give', label: 'Giving & Charity', rows: (s.giveRows as AmtRow[]) || dfGive() },
        { id: 'subs', label: 'Monthly Subscriptions', rows: (s.subs as AmtRow[]) || dfSubs() },
        { id: 'ins',  label: 'Insurance', rows: (s.insRows as AmtRow[]) || dfIns() },
      ];
    }
    return (s?.fixedSubs as SubsectionData[]) ?? dfFixedSubs();
  });
  const [sinks, setSinks] = useState<SinkRow[]>(() => (saved?.sinks as SinkRow[]) ?? dfSinks());
  const [sinksLabel, setSinksLabel] = useState<string>(() => (saved?.sinksLabel as string) ?? 'Sinking Funds');

  /* Section D — dynamic subsections */
  const [varSubs, setVarSubs] = useState<SubsectionData[]>(() => {
    const s = saved;
    if (s?.spending && !s?.varSubs) {
      return [
        { id: 'spend',  label: 'Discretionary Spending', rows: (s.spending as AmtRow[]) || dfSpending() },
        { id: 'needed', label: 'Necessities & Utilities', rows: (s.neededRows as AmtRow[]) || dfNeeded() },
      ];
    }
    return (s?.varSubs as SubsectionData[]) ?? dfVarSubs();
  });

  /* Section E */
  const [savings, setSavings] = useState<AmtRow[]>(() => (saved?.savings as AmtRow[]) ?? dfSavings());

  /* ── Undo stack ────────────────────────────────────────────────────────── */
  const [undoStack, setUndoStack] = useState<BudgetUndoSnapshot[]>([]);

  const pushUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-19), {
      fixedSubs, varSubs, sinks, sinksLabel, savings, incRows, assets, debts, timestamp: Date.now()
    }]);
  }, [fixedSubs, varSubs, sinks, sinksLabel, savings, incRows, assets, debts]);

  const handleUndo = (toIndex?: number) => {
    setUndoStack(prev => {
      const idx = toIndex ?? prev.length - 1;
      if (idx < 0 || idx >= prev.length) return prev;
      const snap = prev[idx];
      setFixedSubs(snap.fixedSubs);
      setVarSubs(snap.varSubs);
      setSinks(snap.sinks);
      setSinksLabel(snap.sinksLabel);
      setSavings(snap.savings);
      setIncRows(snap.incRows);
      setAssets(snap.assets);
      setDebts(snap.debts);
      return prev.slice(0, idx);
    });
  };

  /* ── Row selection + bulk actions ────────────────────────────────────── */
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [pendingMove, setPendingMove] = useState(false);

  const handleBulkDelete = () => {
    pushUndo();
    setFixedSubs(prev => prev.map(sub => ({
      ...sub,
      rows: sub.rows.filter(r => !selectedKeys.has(`fixed:${sub.id}:${r.id}`))
    })));
    setVarSubs(prev => prev.map(sub => ({
      ...sub,
      rows: sub.rows.filter(r => !selectedKeys.has(`var:${sub.id}:${r.id}`))
    })));
    setSavings(prev => prev.filter(r => !selectedKeys.has(`savings:savings:${r.id}`)));
    setIncRows(prev => prev.filter(r => !selectedKeys.has(`income:income:${r.id}`)));
    setSelectedKeys(new Set());
  };

  const handleMoveToSub = (targetSubId: string, targetSectionType: 'fixed' | 'var' | 'savings') => {
    pushUndo();
    // Collect selected rows
    const collected: AmtRow[] = [];
    // From fixedSubs
    setFixedSubs(prev => prev.map(sub => {
      const toMove = sub.rows.filter(r => selectedKeys.has(`fixed:${sub.id}:${r.id}`));
      collected.push(...toMove);
      return { ...sub, rows: sub.rows.filter(r => !selectedKeys.has(`fixed:${sub.id}:${r.id}`)) };
    }));
    // From varSubs
    setVarSubs(prev => prev.map(sub => {
      const toMove = sub.rows.filter(r => selectedKeys.has(`var:${sub.id}:${r.id}`));
      collected.push(...toMove);
      return { ...sub, rows: sub.rows.filter(r => !selectedKeys.has(`var:${sub.id}:${r.id}`)) };
    }));
    // From savings
    const savingsToMove = savings.filter(r => selectedKeys.has(`savings:savings:${r.id}`));
    collected.push(...savingsToMove);
    setSavings(prev => prev.filter(r => !selectedKeys.has(`savings:savings:${r.id}`)));
    // From incRows
    const incToMove = incRows.filter(r => selectedKeys.has(`income:income:${r.id}`));
    collected.push(...incToMove);
    setIncRows(prev => prev.filter(r => !selectedKeys.has(`income:income:${r.id}`)));

    // Add collected to target
    if (targetSectionType === 'fixed') {
      setFixedSubs(prev => prev.map(sub =>
        sub.id === targetSubId ? { ...sub, rows: [...sub.rows, ...collected] } : sub
      ));
    } else if (targetSectionType === 'var') {
      setVarSubs(prev => prev.map(sub =>
        sub.id === targetSubId ? { ...sub, rows: [...sub.rows, ...collected] } : sub
      ));
    } else if (targetSectionType === 'savings') {
      setSavings(prev => [...prev, ...collected]);
    }

    setSelectedKeys(new Set());
    setPendingMove(false);
  };

  /* ── Drag and drop refs ──────────────────────────────────────────────── */
  const dragItem = useRef<{ sectionType: string; subId: string; rowId: string } | null>(null);
  const dragOverItem = useRef<{ sectionType: string; subId: string; rowId: string } | null>(null);

  const handleDropMove = useCallback((fromSectionType: string, fromSubId: string, rowId: string, toSectionType: string, toSubId: string) => {
    // Find the row
    let movedRow: AmtRow | undefined;
    if (fromSectionType === 'fixed') {
      const sub = fixedSubs.find(s => s.id === fromSubId);
      movedRow = sub?.rows.find(r => r.id === rowId);
      if (movedRow) setFixedSubs(prev => prev.map(s => s.id === fromSubId ? { ...s, rows: s.rows.filter(r => r.id !== rowId) } : s));
    } else if (fromSectionType === 'var') {
      const sub = varSubs.find(s => s.id === fromSubId);
      movedRow = sub?.rows.find(r => r.id === rowId);
      if (movedRow) setVarSubs(prev => prev.map(s => s.id === fromSubId ? { ...s, rows: s.rows.filter(r => r.id !== rowId) } : s));
    }
    if (!movedRow) return;
    const row = movedRow;
    if (toSectionType === 'fixed') {
      setFixedSubs(prev => prev.map(s => s.id === toSubId ? { ...s, rows: [...s.rows, row] } : s));
    } else if (toSectionType === 'var') {
      setVarSubs(prev => prev.map(s => s.id === toSubId ? { ...s, rows: [...s.rows, row] } : s));
    }
  }, [fixedSubs, varSubs]);

  /* ── Save/Print and Undo dropdowns ───────────────────────────────────── */
  const [savePrintOpen, setSavePrintOpen] = useState(false);
  const [undoMenuOpen, setUndoMenuOpen] = useState(false);
  const savePrintRef = useRef<HTMLDivElement>(null);
  const undoMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (savePrintRef.current && !savePrintRef.current.contains(e.target as Node)) setSavePrintOpen(false);
      if (undoMenuRef.current && !undoMenuRef.current.contains(e.target as Node)) setUndoMenuOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  /* ── Month comparison state ───────────────────────────────────────────── */
  const [months,        setMonths]        = useState<MonthData[]>(() => loadMonths());
  const [showMonthView, setShowMonthView] = useState(false);

  /* ── Auto-save budget to localStorage on every state change ─────────── */
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({
      open, assets, debts, incRows, fixedSubs, sinks, sinksLabel, varSubs, savings,
    }));
  }, [open, assets, debts, incRows, fixedSubs, sinks, sinksLabel, varSubs, savings]);

  /* ── Auto-save months to localStorage ────────────────────────────────── */
  useEffect(() => {
    localStorage.setItem(LS_MONTHS_KEY, JSON.stringify(months));
  }, [months]);

  /* ── Cloud save / load ────────────────────────────────────────────────── */
  const getBudgetSnapshot = useCallback(() => ({
    open, assets, debts, incRows, fixedSubs, sinks, sinksLabel, varSubs, savings,
  }), [open, assets, debts, incRows, fixedSubs, sinks, sinksLabel, varSubs, savings]);

  const applySnapshot = useCallback((snap: Record<string, unknown>) => {
    if (snap.open)       setOpen(snap.open as Record<string, boolean>);
    if (snap.assets)     setAssets(snap.assets as NVRow[]);
    if (snap.debts)      setDebts(snap.debts as NVRow[]);
    if (snap.incRows)    setIncRows(snap.incRows as AmtRow[]);
    if (snap.sinks)      setSinks(snap.sinks as SinkRow[]);
    if (snap.sinksLabel) setSinksLabel(snap.sinksLabel as string);
    if (snap.savings)    setSavings(snap.savings as AmtRow[]);
    // Migration: old format → new format
    if (snap.mortRows && !snap.fixedSubs) {
      const migrated: SubsectionData[] = [
        { id: 'mort', label: 'Mortgage / Housing', rows: (snap.mortRows as AmtRow[]) || dfMort() },
        { id: 'auto', label: 'Auto', rows: (snap.autoRows as AmtRow[]) || dfAuto() },
        { id: 'give', label: 'Giving & Charity', rows: (snap.giveRows as AmtRow[]) || dfGive() },
        { id: 'subs', label: 'Monthly Subscriptions', rows: (snap.subs as AmtRow[]) || dfSubs() },
        { id: 'ins',  label: 'Insurance', rows: (snap.insRows as AmtRow[]) || dfIns() },
      ];
      setFixedSubs(migrated);
      const migratedVar: SubsectionData[] = [
        { id: 'spend',  label: 'Discretionary Spending', rows: (snap.spending as AmtRow[]) || dfSpending() },
        { id: 'needed', label: 'Necessities & Utilities', rows: (snap.neededRows as AmtRow[]) || dfNeeded() },
      ];
      setVarSubs(migratedVar);
    } else {
      if (snap.fixedSubs) setFixedSubs(snap.fixedSubs as SubsectionData[]);
      if (snap.varSubs)   setVarSubs(snap.varSubs as SubsectionData[]);
    }
  }, []);

  // Load cloud data when user signs in
  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_tool_data')
      .select('budget_data')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.budget_data) {
          applySnapshot(data.budget_data as Record<string, unknown>);
        }
      });
  }, [user, applySnapshot]);

  // Load this month's transaction totals by category name (for budget indicators)
  const [txByCat, setTxByCat] = useState<Record<string, { count: number; total: number }>>({});
  useEffect(() => {
    if (!user) return;
    const now = new Date();
    Promise.all([
      getUserTransactions(user.id, now.getFullYear(), now.getMonth() + 1),
      getGlobalCategories(),
    ]).then(([txs, cats]) => {
      const byName: Record<string, { count: number; total: number }> = {};
      for (const tx of txs) {
        const cat = cats.find(c => c.id === tx.resolved_category_id);
        if (!cat) continue;
        if (!byName[cat.name]) byName[cat.name] = { count: 0, total: 0 };
        byName[cat.name].count++;
        byName[cat.name].total += Number(tx.amount);
      }
      setTxByCat(byName);
    });
  }, [user]);

  const handleSaveToAccount = async () => {
    if (!user) { openAuthModal(); return; }
    setSaveStatus('saving');
    const snapshot = getBudgetSnapshot();
    const { error } = await supabase
      .from('user_tool_data')
      .upsert({ user_id: user.id, budget_data: snapshot, updated_at: new Date().toISOString() },
               { onConflict: 'user_id' });
    setSaveStatus(error ? 'error' : 'saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  /* ── Derived calculations ─────────────────────────────────────────────── */
  const totalAssets  = assets.reduce((s, r) => s + nv(r.value), 0);
  const totalDebtA   = debts.reduce((s, r) => s + nv(r.value), 0);
  const netWorth     = totalAssets - totalDebtA;

  const totalIncome  = incRows.reduce((s, r) => s + nv(r.amount), 0);

  const fixedSubsTotal = fixedSubs.reduce((s, sub) => s + sub.rows.reduce((r2, row) => r2 + nv(row.amount), 0), 0);
  const sinksTotal     = sinks.reduce((s, r) => s + nv(r.amount) / fdiv(r.freq), 0);
  const totalFixed     = fixedSubsTotal + sinksTotal;

  const totalVar = varSubs.reduce((s, sub) => s + sub.rows.reduce((r2, row) => r2 + nv(row.amount), 0), 0);

  const totalSavings  = savings.reduce((s, r) => s + nv(r.amount), 0);
  const totalExpenses = totalFixed + totalVar;
  const leftover      = totalIncome - totalExpenses - totalSavings;

  /* ── Reset / Print ────────────────────────────────────────────────────── */
  const handleReset = () => {
    if (!window.confirm('Reset all budget data? This cannot be undone.')) return;
    localStorage.removeItem(LS_KEY);
    setAssets(dfAssets());   setDebts(dfDebts());
    setIncRows(dfIncome());
    setFixedSubs(dfFixedSubs());
    setSinks(dfSinks());
    setSinksLabel('Sinking Funds');
    setVarSubs(dfVarSubs());
    setSavings(dfSavings());
    setOpen({ A: true, B: true, C: false, D: false, E: false });
  };

  const handlePrint = () => {
    setOpen({ A: true, B: true, C: true, D: true, E: true });
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
    if (bucket.income.length) setIncRows(p => [...p, ...bucket.income]);
    // Map to fixedSubs by sub id
    const fixedMap: Record<string, AmtRow[]> = {
      mort: bucket.mortgage,
      auto: bucket.auto,
      give: bucket.giving,
      subs: bucket.subscriptions,
      ins:  bucket.insurance,
    };
    if (Object.values(fixedMap).some(v => v.length > 0)) {
      setFixedSubs(prev => prev.map(sub => {
        const toAdd = fixedMap[sub.id] ?? [];
        return toAdd.length > 0 ? { ...sub, rows: [...sub.rows, ...toAdd] } : sub;
      }));
    }
    // Map to varSubs
    const varMap: Record<string, AmtRow[]> = {
      spend:  bucket.spending,
      needed: bucket.needed,
    };
    if (Object.values(varMap).some(v => v.length > 0)) {
      setVarSubs(prev => prev.map(sub => {
        const toAdd = varMap[sub.id] ?? [];
        return toAdd.length > 0 ? { ...sub, rows: [...sub.rows, ...toAdd] } : sub;
      }));
    }
    if (bucket.savings.length) setSavings(p => [...p, ...bucket.savings]);
    setOpen(p => ({ ...p, B: true, C: true, D: true, E: true }));
  };

  /* ── Build workbook — template format ────────────────────────────────── */
  const buildWorkbook = () => {
    const WB_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const headers: (string | number)[] = ['Account', 'Category', 'Budget', ...WB_MONTHS];

    const data: (string | number)[][] = [headers];
    const sectionHeaderIndices: number[] = [];

    const addSectionHeader = (title: string) => {
      sectionHeaderIndices.push(data.length);
      data.push(['', title, '', ...new Array(12).fill('')]);
    };

    const makeRow = (account: string, category: string, budget: number, rowId?: string): (string | number)[] => {
      const actCols: (string | number)[] = new Array(12).fill('');
      if (rowId && months.length > 0) {
        for (const monthData of months) {
          const parts = monthData.label.split(' ');
          const mIdx = MONTH_NAMES.indexOf(parts[0]);
          if (mIdx >= 0) {
            const val = monthData.actuals[rowId];
            if (val) actCols[mIdx] = parseFloat(val) || '';
          }
        }
      }
      return [account, category, budget, ...actCols];
    };

    // NET WORTH SNAPSHOT
    addSectionHeader('NET WORTH SNAPSHOT');
    data.push(makeRow('Savings Account', 'Estimated Net Worth', netWorth));
    for (const r of assets) {
      data.push(makeRow('Savings Account', r.name, nv(r.value), r.id));
    }
    for (const r of debts) {
      data.push(makeRow('Savings Account', r.name, -nv(r.value), r.id));
    }

    // OVERVIEW
    addSectionHeader('OVERVIEW');
    data.push(makeRow('', 'Net Income', totalIncome));
    for (const r of incRows) {
      data.push(makeRow('', r.name, nv(r.amount), r.id));
    }
    data.push(makeRow('', 'Total Expenses', totalExpenses));
    data.push(makeRow('', 'Leftover', leftover));

    // FIXED MONTHLY COSTS
    addSectionHeader('FIXED MONTHLY COSTS');
    data.push(makeRow('Checking Account', 'Total Fixed Monthly', totalFixed));
    for (const sub of fixedSubs) {
      const subTotal = sub.rows.reduce((s, r) => s + nv(r.amount), 0);
      data.push(makeRow('', sub.label, subTotal));
      for (const r of sub.rows) {
        data.push(makeRow('', r.name, nv(r.amount), r.id));
      }
    }
    data.push(makeRow('', sinksLabel, sinksTotal));
    for (const r of sinks) {
      const freqLabel = FREQS.find(f => f.val === r.freq)?.label ?? r.freq;
      data.push(makeRow(freqLabel, r.name, Math.round(nv(r.amount) / fdiv(r.freq)), r.id));
    }

    // FLUCTUATING COSTS
    addSectionHeader('FLUCTUATING COSTS');
    data.push(makeRow('', 'Total Fluctuating', totalVar));
    for (const sub of varSubs) {
      const subTotal = sub.rows.reduce((s, r) => s + nv(r.amount), 0);
      data.push(makeRow('', sub.label, subTotal));
      for (const r of sub.rows) {
        data.push(makeRow('', r.name, nv(r.amount), r.id));
      }
    }

    // SAVINGS
    addSectionHeader('SAVINGS');
    data.push(makeRow('', 'Total Savings', totalSavings));
    for (const r of savings) {
      data.push(makeRow('', r.name, nv(r.amount), r.id));
    }

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths: A=28, B=32, C=14, D-O=12 each
    ws['!cols'] = [
      { wch: 28 }, { wch: 32 }, { wch: 14 },
      ...Array(12).fill(null).map(() => ({ wch: 12 })),
    ];

    // Merge section header rows across B:O (columns 1–14)
    ws['!merges'] = sectionHeaderIndices.map(r => ({
      s: { r, c: 1 },
      e: { r, c: 14 },
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Budget');
    return wb;
  };

  /* ── Download as Spreadsheet ──────────────────────────────────────────── */
  const handleDownload = () => {
    setSavePrintOpen(false);
    const wb = buildBudgetWorkbook({
      assets, debts, netWorth,
      incRows, totalIncome,
      fixedSubs, sinks, sinksLabel, totalFixed,
      varSubs, totalVar,
      savings, totalSavings,
      totalExpenses, leftover,
      months,
    });
    XLSXStyle.writeFile(wb, 'monthly-budget.xlsx');
    setChartTipOpen(true);
  };


  /* ── Relative time helper for undo dropdown ───────────────────────────── */
  const relTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return `${Math.floor(diff / 3600)} hr ago`;
  };

  /* ── Comparison view — full-page replacement ─────────────────────────── */
  if (showMonthView) {
    return (
      <MonthComparisonView
        incRows={incRows}
        fixedSubs={fixedSubs}
        varSubs={varSubs}
        sinks={sinks}
        sinksLabel={sinksLabel}
        savings={savings}
        totalIncome={totalIncome}
        totalFixed={totalFixed}
        totalVar={totalVar}
        totalSavings={totalSavings}
        months={months}
        setMonths={setMonths}
        onBack={() => setShowMonthView(false)}
        onAddFixedSub={label => {
          pushUndo();
          setFixedSubs(prev => [...prev, { id: uid(), label, rows: [] }]);
        }}
        onAddVarSub={label => {
          pushUndo();
          setVarSubs(prev => [...prev, { id: uid(), label, rows: [] }]);
        }}
        onSave={handleSaveToAccount}
        onImport={() => {
          setShowMonthView(false);
          setTimeout(() => setImportModalOpen(true), 50);
        }}
        onUndo={handleUndo}
        undoStack={undoStack}
      />
    );
  }

  /* ── Render budget view ───────────────────────────────────────────────── */
  return (
    <div className="container-custom py-8 max-w-3xl mx-auto">

      {/* Action Bar */}
      <div data-noprint className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-secondary-800">Interactive Budget Planner</h2>
          <p className="text-secondary-400 text-xs mt-0.5">
            {user
              ? 'Signed in — click Save to sync your data to your account.'
              : 'Data saves locally. Sign in to keep it permanently.'}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">

          {/* Save / Print dropdown */}
          <div className="relative" ref={savePrintRef}>
            <button
              onClick={() => setSavePrintOpen(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                saveStatus === 'saved'
                  ? 'bg-green-100 border border-green-300 text-green-700'
                  : saveStatus === 'error'
                  ? 'bg-red-100 border border-red-300 text-red-600'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {saveStatus === 'saved' ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : saveStatus === 'error' ? (
                'Error — try again'
              ) : saveStatus === 'saving' ? (
                'Saving…'
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save / Print
                  <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
            {savePrintOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg py-1 z-30 min-w-[180px]">
                <button
                  onClick={() => { handleSaveToAccount(); setSavePrintOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs text-secondary-700 hover:bg-secondary-50 font-medium"
                >
                  {user ? 'Save to account' : 'Sign in to save'}
                </button>
                <div className="border-t border-secondary-100 my-1" />
                <button
                  onClick={() => { handlePrint(); setSavePrintOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs text-secondary-700 hover:bg-secondary-50 font-medium"
                >
                  Print
                </button>
                <div className="border-t border-secondary-100 my-1" />
                <button
                  onClick={() => handleDownload()}
                  className="w-full text-left px-4 py-2 text-xs text-secondary-700 hover:bg-secondary-50 font-medium"
                >
                  Download Spreadsheet
                </button>
              </div>
            )}
          </div>

          {/* Import button */}
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-secondary-300 rounded-lg text-secondary-600 hover:bg-secondary-100 text-xs font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>

          {/* Undo dropdown */}
          <div className="relative" ref={undoMenuRef}>
            <button
              onClick={() => setUndoMenuOpen(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-2 border border-secondary-300 rounded-lg text-secondary-600 hover:bg-secondary-100 text-xs font-semibold transition-colors ${undoStack.length === 0 ? 'opacity-40' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6" />
              </svg>
              Undo
              <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {undoMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg py-1 z-30 min-w-[220px]">
                {undoStack.length === 0 ? (
                  <span className="block px-4 py-2 text-xs text-secondary-400">Nothing to undo</span>
                ) : (
                  [...undoStack].reverse().slice(0, 5).map((snap, i) => {
                    const realIdx = undoStack.length - 1 - i;
                    return (
                      <button
                        key={realIdx}
                        onClick={() => { handleUndo(realIdx); setUndoMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs text-secondary-700 hover:bg-secondary-50 font-medium"
                      >
                        Step {realIdx + 1} — {relTime(snap.timestamp)}
                      </button>
                    );
                  })
                )}
                <div className="border-t border-secondary-100 my-1" />
                <button
                  onClick={() => { handleReset(); setUndoMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 font-medium"
                >
                  Total Reset
                </button>
              </div>
            )}
          </div>
        </div>
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
            <AmtRowList
              rows={incRows}
              setRows={setIncRows}
              addLabel="Add Income Source"
              sectionKey="income:income"
              selectedKeys={selectedKeys}
              onToggleSelect={key => setSelectedKeys(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; })}
              pendingMove={pendingMove}
              onMoveHere={() => handleMoveToSub('income', 'savings')}
              onPushUndo={pushUndo}
              dragItem={dragItem}
              dragOverItem={dragOverItem}
              onDropReorder={rows => setIncRows(rows)}
            />
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
        {/* Dynamic subsections */}
        {fixedSubs.map(sub => {
          const subTotal = sub.rows.reduce((s, r) => s + nv(r.amount), 0);
          return (
            <div key={sub.id} className={subGrp}>
              <EditableSubHeader
                label={sub.label}
                onLabelChange={newLabel => {
                  pushUndo();
                  setFixedSubs(prev => prev.map(s => s.id === sub.id ? { ...s, label: newLabel } : s));
                }}
                onDelete={() => {
                  if (sub.rows.length > 0 && !window.confirm(`Delete "${sub.label}" and its ${sub.rows.length} row(s)?`)) return;
                  pushUndo();
                  setFixedSubs(prev => prev.filter(s => s.id !== sub.id));
                }}
                extraNote={sub.id === 'give' ? '— bi-weekly? enter amount × 2.17 for monthly' : undefined}
              />
              <AmtRowList
                rows={sub.rows}
                setRows={rows => setFixedSubs(prev => prev.map(s => s.id === sub.id ? { ...s, rows } : s))}
                addLabel="Add Row"
                sectionKey={`fixed:${sub.id}`}
                selectedKeys={selectedKeys}
                onToggleSelect={key => setSelectedKeys(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; })}
                pendingMove={pendingMove}
                onMoveHere={() => handleMoveToSub(sub.id, 'fixed')}
                onPushUndo={pushUndo}
                dragItem={dragItem}
                dragOverItem={dragOverItem}
                onDropReorder={rows => setFixedSubs(prev => prev.map(s => s.id === sub.id ? { ...s, rows } : s))}
                onDropMove={(fromSectionType, fromSubId, rowId) =>
                  handleDropMove(fromSectionType, fromSubId, rowId, 'fixed', sub.id)
                }
              />
              <TxIndicator budgeted={subTotal} categoryNames={getTxCategories(sub.label)} txByCat={txByCat} />
              <SubTotal label={`${sub.label} Subtotal`} amount={subTotal} />
            </div>
          );
        })}

        {/* Sinking Funds (special — has editable label + frequency selectors) */}
        <div className={subGrp}>
          <EditableSubHeader
            label={sinksLabel}
            onLabelChange={newLabel => { pushUndo(); setSinksLabel(newLabel); }}
            onDelete={() => {
              if (sinks.length > 0 && !window.confirm(`Delete "${sinksLabel}" and its ${sinks.length} item(s)?`)) return;
              pushUndo();
              setSinks([]);
            }}
            extraNote="— irregular bills averaged to a monthly amount"
          />
          <div className="space-y-2">
            {sinks.map((row, i) => (
              <div key={row.id} className="flex flex-col sm:flex-row gap-2">
                <input
                  className={`${inp} w-full sm:flex-1`}
                  value={row.name}
                  onChange={e => setSinks(sinks.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}
                  placeholder="Description"
                />
                <div className="flex gap-2 items-center">
                  <input
                    className={`${inp} w-24 flex-shrink-0 text-right`}
                    type="number" min="0"
                    value={row.amount}
                    onChange={e => setSinks(sinks.map((r, j) => j === i ? { ...r, amount: e.target.value } : r))}
                    placeholder="0"
                  />
                  <select
                    className={`${inp} flex-1 sm:w-36 sm:flex-shrink-0`}
                    value={row.freq}
                    onChange={e => setSinks(sinks.map((r, j) => j === i ? { ...r, freq: e.target.value as FreqVal } : r))}
                  >
                    {FREQS.map(f => <option key={f.val} value={f.val}>{f.label}</option>)}
                  </select>
                  <span className="text-xs text-primary-600 font-semibold w-20 flex-shrink-0 text-right">
                    {nv(row.amount) > 0 ? `${fmt(nv(row.amount) / fdiv(row.freq))}/mo` : '—'}
                  </span>
                  <button
                    onClick={() => { pushUndo(); setSinks(sinks.filter((_, j) => j !== i)); }}
                    className={`${rmBtn} flex-shrink-0`}
                    title="Remove"
                  >×</button>
                </div>
              </div>
            ))}
            <button
              onClick={() => { pushUndo(); setSinks([...sinks, { id: uid(), name: '', amount: '', freq: 'monthly' }]); }}
              className={addBtn}
            >
              <span className="font-bold text-base">+</span> Add Sinking Fund
            </button>
          </div>
          <SubTotal label={`${sinksLabel} Subtotal (monthly equiv.)`} amount={sinksTotal} />
        </div>

        {/* Add Subsection button */}
        <button
          onClick={() => {
            const label = window.prompt('New subsection name:');
            if (label?.trim()) {
              pushUndo();
              setFixedSubs(prev => [...prev, { id: uid(), label: label.trim(), rows: [] }]);
            }
          }}
          className="text-primary-600 hover:text-primary-800 text-sm font-semibold flex items-center gap-1 mt-2 mb-4 transition-colors border border-dashed border-primary-300 rounded-lg px-3 py-2 w-full justify-center"
        >
          <span className="font-bold text-base">+</span> Add Subsection
        </button>

        <SectionTotal label="Total Fixed Costs" amount={totalFixed} />
      </SectionCard>

      {/* ── D: Variable Costs ────────────────────────────────────────────── */}
      <SectionCard
        letter="D" title="Fluctuating / Variable Costs" subtitle="Expenses that vary month to month"
        badge={totalVar > 0 ? `${fmt(totalVar)}/mo` : undefined}
        isOpen={open.D} onToggle={() => tog('D')}
      >
        {varSubs.map(sub => {
          const subTotal = sub.rows.reduce((s, r) => s + nv(r.amount), 0);
          return (
            <div key={sub.id} className={subGrp}>
              <EditableSubHeader
                label={sub.label}
                onLabelChange={newLabel => {
                  pushUndo();
                  setVarSubs(prev => prev.map(s => s.id === sub.id ? { ...s, label: newLabel } : s));
                }}
                onDelete={() => {
                  if (sub.rows.length > 0 && !window.confirm(`Delete "${sub.label}" and its ${sub.rows.length} row(s)?`)) return;
                  pushUndo();
                  setVarSubs(prev => prev.filter(s => s.id !== sub.id));
                }}
              />
              <AmtRowList
                rows={sub.rows}
                setRows={rows => setVarSubs(prev => prev.map(s => s.id === sub.id ? { ...s, rows } : s))}
                addLabel="Add Row"
                sectionKey={`var:${sub.id}`}
                selectedKeys={selectedKeys}
                onToggleSelect={key => setSelectedKeys(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; })}
                pendingMove={pendingMove}
                onMoveHere={() => handleMoveToSub(sub.id, 'var')}
                onPushUndo={pushUndo}
                dragItem={dragItem}
                dragOverItem={dragOverItem}
                onDropReorder={rows => setVarSubs(prev => prev.map(s => s.id === sub.id ? { ...s, rows } : s))}
                onDropMove={(fromSectionType, fromSubId, rowId) =>
                  handleDropMove(fromSectionType, fromSubId, rowId, 'var', sub.id)
                }
              />
              <TxIndicator budgeted={subTotal} categoryNames={getTxCategories(sub.label)} txByCat={txByCat} />
              <SubTotal label={`${sub.label} Subtotal`} amount={subTotal} />
            </div>
          );
        })}

        {/* Add Subsection button */}
        <button
          onClick={() => {
            const label = window.prompt('New subsection name:');
            if (label?.trim()) {
              pushUndo();
              setVarSubs(prev => [...prev, { id: uid(), label: label.trim(), rows: [] }]);
            }
          }}
          className="text-primary-600 hover:text-primary-800 text-sm font-semibold flex items-center gap-1 mt-2 mb-4 transition-colors border border-dashed border-primary-300 rounded-lg px-3 py-2 w-full justify-center"
        >
          <span className="font-bold text-base">+</span> Add Subsection
        </button>

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
        <AmtRowList
          rows={savings}
          setRows={setSavings}
          addLabel="Add Savings Bucket"
          sectionKey="savings:savings"
          selectedKeys={selectedKeys}
          onToggleSelect={key => setSelectedKeys(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; })}
          pendingMove={pendingMove}
          onMoveHere={() => handleMoveToSub('savings', 'savings')}
          onPushUndo={pushUndo}
          dragItem={dragItem}
          dragOverItem={dragOverItem}
          onDropReorder={rows => setSavings(rows)}
        />
        <TxIndicator budgeted={totalSavings} categoryNames={['Savings']} txByCat={txByCat} />
        <SectionTotal label="Total Monthly Savings" amount={totalSavings} />
      </SectionCard>

      {/* ── Compare Months button ─────────────────────────────────────────── */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => setShowMonthView(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Compare Months
        </button>
      </div>

      {/* ── Bulk action floating bar ──────────────────────────────────────── */}
      {selectedKeys.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-secondary-800 text-white px-5 py-3 rounded-full shadow-xl">
          <span className="text-sm font-semibold">{selectedKeys.size} selected</span>
          {pendingMove && (
            <span className="text-xs text-secondary-300">Click &ldquo;Move selected here&rdquo; on the target subsection</span>
          )}
          {!pendingMove && (
            <button
              onClick={() => setPendingMove(true)}
              className="text-xs bg-primary-500 hover:bg-primary-600 px-3 py-1.5 rounded-full font-semibold transition-colors"
            >
              Move
            </button>
          )}
          <button
            onClick={handleBulkDelete}
            className="text-xs bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-full font-semibold transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => { setSelectedKeys(new Set()); setPendingMove(false); }}
            className="text-xs text-secondary-300 hover:text-white font-semibold"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Import Modal ────────────────────────────────────────────────────── */}
      {importModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) setImportModalOpen(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-accent-500 text-secondary-900 flex items-center justify-center flex-shrink-0">
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
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-secondary-400 hover:text-secondary-600 transition-colors ml-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto">
              <StatementImporter onApply={items => { handleApplyTransactions(items); setImportModalOpen(false); }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Net Worth Chart Tip Modal ──────────────────────────────────────── */}
      {chartTipOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) setChartTipOpen(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-secondary-200">
              <div>
                <p className="font-bold text-secondary-800 text-base">Add the Net Worth Chart</p>
                <p className="text-secondary-400 text-xs mt-0.5">
                  Your file downloaded. Follow these steps to insert the line chart.
                </p>
              </div>
              <button
                onClick={() => setChartTipOpen(false)}
                className="text-secondary-400 hover:text-secondary-600 transition-colors ml-4 flex-shrink-0 mt-0.5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 text-sm text-secondary-700">

              <div>
                <ol className="space-y-1 pl-4 list-decimal text-secondary-600 text-xs leading-relaxed">
                  <li>Open your downloaded spreadsheet</li>
                  <li>Click cell <span className="font-mono bg-secondary-100 px-1 rounded">D2</span>, then Shift-click <span className="font-mono bg-secondary-100 px-1 rounded">O2</span> to select the Net Worth row</li>
                  <li>Go to <strong>Insert</strong> → <strong>Charts</strong> → <strong>Line</strong> → choose <em>Line with Markers</em></li>
                  <li>Right-click the chart → <strong>Move Chart</strong> to place it where you like</li>
                </ol>
              </div>

<p className="text-secondary-400 text-xs border-t border-secondary-100 pt-4">
                The Net Worth row is always in row 2 of your downloaded file — the chart will update automatically each time you re-download with new data.
              </p>
            </div>

            <div className="px-6 pb-5">
              <button
                onClick={() => setChartTipOpen(false)}
                className="w-full py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
