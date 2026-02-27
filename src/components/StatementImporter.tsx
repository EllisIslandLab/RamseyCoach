import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import * as XLSX from 'xlsx';

/* ─── Types ────────────────────────────────────────────────────────────────── */
type Section =
  | 'income' | 'mortgage' | 'auto' | 'giving' | 'subscriptions'
  | 'insurance' | 'spending' | 'needed' | 'savings' | 'skip';

interface Tx {
  id: string;
  date: string;
  description: string;
  amount: number;       // positive = income, negative = expense
  category: string;
  section: Section;
  included: boolean;
  monthId: string;      // "2026-01"
  source: string;       // filename
}

export interface AppliedItem {
  section: Section;
  name: string;
  amount: number;       // always positive monthly average
}

interface Props {
  onApply: (items: AppliedItem[]) => void;
}

/* ─── Constants ────────────────────────────────────────────────────────────── */
const SECTION_LABELS: Record<Section, string> = {
  income:        'Income',
  mortgage:      'Mortgage / Housing',
  auto:          'Auto',
  giving:        'Giving / Charity',
  subscriptions: 'Subscriptions',
  insurance:     'Insurance',
  spending:      'Discretionary Spending',
  needed:        'Necessities & Utilities',
  savings:       'Savings',
  skip:          'Skip (transfer / ignore)',
};

const RULES: { re: RegExp; cat: string; sec: Section }[] = [
  { re: /payroll|direct dep|salary|wages|employer/i,                               cat: 'Paycheck',          sec: 'income'        },
  { re: /mortgage|escrow|home loan/i,                                              cat: 'Mortgage',          sec: 'mortgage'      },
  { re: /rent(?!.?a.?car)/i,                                                       cat: 'Rent',              sec: 'mortgage'      },
  { re: /car payment|auto loan|ford motor|toyota|honda finance|bmw financial/i,   cat: 'Car Payment',       sec: 'auto'          },
  { re: /auto ins|car ins|geico|state farm|progressive|allstate|nationwide/i,     cat: 'Auto Insurance',    sec: 'auto'          },
  { re: /life ins|term life|umbrella ins|homeowners ins/i,                         cat: 'Insurance',         sec: 'insurance'     },
  { re: /netflix|spotify|hulu|disney\+?|apple tv|youtube premium|amazon prime/i, cat: 'Streaming',         sec: 'subscriptions' },
  { re: /verizon|at&?t|t-?mobile|sprint|comcast|xfinity|cox|spectrum|century/i,  cat: 'Phone / Internet',  sec: 'subscriptions' },
  { re: /gym|planet fitness|anytime fitness|ymca|crossfit/i,                      cat: 'Gym',               sec: 'subscriptions' },
  { re: /church|tithe|donation|charity|nonprofit|giving/i,                         cat: 'Tithe / Giving',    sec: 'giving'        },
  { re: /kroger|walmart|aldi|trader joe|whole foods|publix|safeway|costco|meijer|hy.?vee|giant|stop.?shop/i, cat: 'Groceries', sec: 'needed' },
  { re: /shell|bp|exxon|chevron|marathon|speedway|sunoco|fuel|gas station|circle k|kwik/i, cat: 'Gas', sec: 'needed' },
  { re: /electric|natural gas|water bill|sewer|utility|pge|con.?ed|duke energy|aep|ameren/i, cat: 'Utilities', sec: 'needed' },
  { re: /mcdonald|burger king|wendy|taco bell|chipotle|pizza|starbucks|dunkin|panera|subway|chick.?fil|applebee|olive garden|darden/i, cat: 'Restaurants', sec: 'spending' },
  { re: /cvs|walgreen|pharmacy|hospital|medical|dental|vision|health/i,           cat: 'Healthcare',        sec: 'spending'      },
  { re: /savings transfer|to savings|401k|retirement|ira contrib/i,               cat: 'Savings',           sec: 'savings'       },
  { re: /transfer|zelle|venmo|cash app|paypal transfer|account xfer/i,            cat: 'Transfer (skip)',   sec: 'skip'          },
  { re: /atm withdrawal/i,                                                          cat: 'ATM Cash',          sec: 'spending'      },
];

const categorize = (desc: string): { cat: string; sec: Section } => {
  for (const r of RULES) {
    if (r.re.test(desc)) return { cat: r.cat, sec: r.sec };
  }
  return { cat: 'Uncategorized', sec: 'spending' };
};

const uid = () => Math.random().toString(36).slice(2, 9);

/* ─── Date → "YYYY-MM" ─────────────────────────────────────────────────────── */
const toMonthId = (s: string): string => {
  // Handle Excel serial dates (number as string)
  const asNum = Number(s);
  if (!isNaN(asNum) && asNum > 40000) {
    const d = XLSX.SSF.parse_date_code(asNum);
    return `${d.y}-${String(d.m).padStart(2, '0')}`;
  }
  // Try native Date parse (handles ISO and MM/DD/YYYY etc.)
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  // Manual MM/DD/YYYY or MM-DD-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yr}-${m[1].padStart(2, '0')}`;
  }
  return 'unknown';
};

const monthLabel = (id: string) => {
  if (id === 'unknown') return 'Unknown Month';
  const [y, mo] = id.split('-');
  return new Date(+y, +mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/* ─── CSV / Excel parser ───────────────────────────────────────────────────── */
const parseFile = (file: File): Promise<Tx[]> =>
  new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
        if (rows.length < 2) { resolve([]); return; }

        // Detect header row — scan first 5 rows for one containing "date"
        let hdrIdx = 0;
        for (let i = 0; i < Math.min(5, rows.length); i++) {
          if (rows[i].some(c => /date/i.test(c?.toString() ?? ''))) { hdrIdx = i; break; }
        }
        const hdrs = rows[hdrIdx].map(h => h?.toString().toLowerCase().trim());

        const col = (terms: string[]) =>
          hdrs.findIndex(h => terms.some(t => h.includes(t)));

        const dateCol   = col(['date']);
        const descCol   = col(['description', 'desc', 'memo', 'name', 'payee', 'transaction']);
        const amtCol    = col(['amount', 'amt', 'transaction amount']);
        const debitCol  = col(['debit', 'withdrawal', 'charge', 'expense']);
        const creditCol = col(['credit', 'deposit', 'payment received']);

        if (dateCol === -1) { resolve([]); return; }

        const txs: Tx[] = [];
        for (let i = hdrIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row?.length || !row[dateCol]) continue;

          const date = row[dateCol]?.toString().trim() ?? '';
          const desc = (descCol >= 0 ? row[descCol]?.toString().trim() : '') ?? '';

          let amount = 0;
          if (amtCol >= 0) {
            amount = parseFloat(row[amtCol]?.toString().replace(/[$,\s]/g, '') ?? '0') || 0;
          } else if (debitCol >= 0 || creditCol >= 0) {
            const deb = parseFloat(row[debitCol]?.toString().replace(/[$,\s]/g, '') ?? '0') || 0;
            const cre = parseFloat(row[creditCol]?.toString().replace(/[$,\s]/g, '') ?? '0') || 0;
            amount = cre - deb; // positive = income
          }

          if (!date || amount === 0) continue;
          const { cat, sec } = categorize(desc);
          txs.push({
            id: uid(), date, description: desc, amount,
            category: cat, section: sec,
            included: sec !== 'skip',
            monthId: toMonthId(date),
            source: file.name,
          });
        }
        resolve(txs);
      } catch { resolve([]); }
    };
    reader.readAsArrayBuffer(file);
  });

/* ─── Module-level UI sub-components ──────────────────────────────────────── */
const inp = 'border border-secondary-300 rounded-lg px-2 py-1.5 text-secondary-800 text-xs '
          + 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';

function DropZone({ onFiles, isDragging, onDrag }: {
  onFiles: (files: FileList) => void;
  isDragging: boolean;
  onDrag: (v: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const stop = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors duration-200 ${
        isDragging ? 'border-primary-500 bg-primary-50' : 'border-secondary-300 hover:border-primary-400 hover:bg-secondary-50'
      }`}
      onClick={() => ref.current?.click()}
      onDragEnter={e => { stop(e); onDrag(true); }}
      onDragOver={e => { stop(e); onDrag(true); }}
      onDragLeave={e => { stop(e); onDrag(false); }}
      onDrop={e => { stop(e); onDrag(false); if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files); }}
    >
      <svg className="w-10 h-10 mx-auto mb-3 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="text-secondary-600 font-semibold text-sm mb-1">Drop CSV or Excel files here</p>
      <p className="text-secondary-400 text-xs">
        Works with Chase, Bank of America, Wells Fargo, and most US banks — use your bank&apos;s &ldquo;Export as CSV&rdquo; option
      </p>
      <input
        ref={ref}
        type="file"
        className="hidden"
        accept=".csv,.xlsx,.xls"
        multiple
        onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files && onFiles(e.target.files)}
      />
    </div>
  );
}

function TxRow({ tx, onToggle, onCategory, onSection }: {
  tx: Tx;
  onToggle: () => void;
  onCategory: (cat: string) => void;
  onSection: (sec: Section) => void;
}) {
  const isIncome = tx.amount > 0;
  return (
    <tr className={`border-b border-secondary-100 text-xs ${tx.included ? '' : 'opacity-40'}`}>
      <td className="px-3 py-2">
        <input type="checkbox" checked={tx.included} onChange={onToggle} className="accent-primary-600 cursor-pointer" />
      </td>
      <td className="px-2 py-2 text-secondary-500 whitespace-nowrap">{tx.date}</td>
      <td className="px-2 py-2 text-secondary-700 max-w-[180px] truncate" title={tx.description}>{tx.description}</td>
      <td className={`px-2 py-2 font-semibold whitespace-nowrap text-right ${isIncome ? 'text-primary-600' : 'text-secondary-700'}`}>
        {isIncome ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tx.amount)}
      </td>
      <td className="px-2 py-2">
        <input
          className={inp + ' w-28'}
          value={tx.category}
          onChange={e => onCategory(e.target.value)}
          placeholder="Category"
        />
      </td>
      <td className="px-2 py-2">
        <select
          className={inp + ' w-36'}
          value={tx.section}
          onChange={e => onSection(e.target.value as Section)}
        >
          {(Object.keys(SECTION_LABELS) as Section[]).map(k => (
            <option key={k} value={k}>{SECTION_LABELS[k]}</option>
          ))}
        </select>
      </td>
    </tr>
  );
}

/* ─── Main component ───────────────────────────────────────────────────────── */
export default function StatementImporter({ onApply }: Props) {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleFiles = async (files: FileList) => {
    setLoading(true);
    setApplied(false);
    const parsed: Tx[] = [];
    for (const f of Array.from(files)) {
      const results = await parseFile(f);
      parsed.push(...results);
    }
    // Merge with existing transactions (new files add to existing)
    setTxs(prev => {
      const existingIds = new Set(prev.map(t => t.source + t.date + t.description + t.amount));
      const deduped = parsed.filter(t => !existingIds.has(t.source + t.date + t.description + t.amount));
      return [...prev, ...deduped];
    });
    setLoading(false);
  };

  const updateTx = (id: string, patch: Partial<Tx>) =>
    setTxs(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));

  const handleApply = () => {
    const included = txs.filter(t => t.included && t.section !== 'skip');
    const months = new Set(included.map(t => t.monthId));
    const monthCount = Math.max(months.size, 1);

    // Group by section + category, sum per month, then average
    const grouped: Record<string, { section: Section; name: string; byMonth: Record<string, number> }> = {};
    for (const tx of included) {
      const key = `${tx.section}::${tx.category}`;
      if (!grouped[key]) grouped[key] = { section: tx.section, name: tx.category, byMonth: {} };
      const amt = tx.section === 'income' ? Math.max(0, tx.amount) : Math.abs(tx.amount);
      grouped[key].byMonth[tx.monthId] = (grouped[key].byMonth[tx.monthId] ?? 0) + amt;
    }

    const items: AppliedItem[] = Object.values(grouped).map(g => {
      const total = Object.values(g.byMonth).reduce((s, v) => s + v, 0);
      return { section: g.section, name: g.name, amount: Math.round(total / monthCount) };
    });

    onApply(items);
    setApplied(true);
  };

  // Derived stats
  const months = [...new Set(txs.map(t => t.monthId))].sort();
  const included = txs.filter(t => t.included);
  const incomeTotal = included.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenseTotal = included.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const monthCount = Math.max(new Set(included.map(t => t.monthId)).size, 1);

  const fmtCur = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  if (txs.length === 0) {
    return (
      <DropZone
        onFiles={handleFiles}
        isDragging={isDragging}
        onDrag={setIsDragging}
      />
    );
  }

  return (
    <div>
      {/* File sources + month badges */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {months.map(m => (
          <span key={m} className="bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-1 rounded-full">
            {monthLabel(m)}
          </span>
        ))}
        <button
          onClick={() => { setTxs([]); setApplied(false); }}
          className="text-xs text-secondary-400 hover:text-red-400 transition-colors ml-auto"
        >
          Clear all
        </button>
        <label className="text-xs text-primary-600 hover:text-primary-800 font-semibold cursor-pointer transition-colors">
          + Add more files
          <input
            type="file" className="hidden" accept=".csv,.xlsx,.xls" multiple
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
        </label>
      </div>

      {loading && (
        <p className="text-secondary-400 text-sm text-center py-4">Parsing transactions…</p>
      )}

      {/* Transaction table */}
      {!loading && (
        <div className="overflow-auto max-h-72 rounded-lg border border-secondary-200">
          <table className="w-full text-xs min-w-[640px]">
            <thead className="sticky top-0 bg-secondary-100 z-10">
              <tr>
                <th className="px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={txs.every(t => t.included)}
                    onChange={e => setTxs(prev => prev.map(t => ({ ...t, included: e.target.checked })))}
                    className="accent-primary-600 cursor-pointer"
                    title="Select all"
                  />
                </th>
                <th className="px-2 py-2 text-left text-secondary-500 font-semibold uppercase tracking-wide">Date</th>
                <th className="px-2 py-2 text-left text-secondary-500 font-semibold uppercase tracking-wide">Description</th>
                <th className="px-2 py-2 text-right text-secondary-500 font-semibold uppercase tracking-wide">Amount</th>
                <th className="px-2 py-2 text-left text-secondary-500 font-semibold uppercase tracking-wide">Label</th>
                <th className="px-2 py-2 text-left text-secondary-500 font-semibold uppercase tracking-wide">Budget Section</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {txs.map(tx => (
                <TxRow
                  key={tx.id}
                  tx={tx}
                  onToggle={() => updateTx(tx.id, { included: !tx.included })}
                  onCategory={cat => updateTx(tx.id, { category: cat })}
                  onSection={sec => updateTx(tx.id, { section: sec })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary + apply */}
      <div className="mt-4 flex flex-wrap items-center gap-4 justify-between">
        <div className="text-xs text-secondary-500 space-y-0.5">
          <div>
            <span className="font-semibold text-secondary-700">{included.length}</span> transactions selected
            {months.length > 1 && (
              <span className="ml-1 text-primary-600 font-medium">
                across {months.length} months — will apply monthly averages
              </span>
            )}
          </div>
          <div className="flex gap-4">
            <span>Income: <strong className="text-primary-600">{fmtCur(incomeTotal / monthCount)}/mo</strong></span>
            <span>Expenses: <strong className="text-secondary-700">{fmtCur(expenseTotal / monthCount)}/mo</strong></span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {applied && (
            <span className="text-primary-600 text-xs font-semibold flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Applied!
            </span>
          )}
          <button
            onClick={handleApply}
            className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {months.length > 1 ? 'Apply Monthly Averages to Budget' : 'Apply to Budget'}
          </button>
        </div>
      </div>
    </div>
  );
}
