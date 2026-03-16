import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { getViewableBudgetOwners, getPartnerBudgetData } from '@/lib/dataService';

// ─── Types (mirrors BudgetPlanner's internal types) ────────────────────────────

interface AmtRow  { id: string; name: string; amount: string; }
interface SinkRow { id: string; name: string; amount: string; freq: string; }
interface NVRow   { id: string; name: string; value: string; }
interface Sub     { id: string; label: string; rows: AmtRow[]; }

interface BudgetData {
  incRows?: AmtRow[];
  assets?: NVRow[];
  debts?: NVRow[];
  fixedSubs?: Sub[];
  varSubs?: Sub[];
  sinks?: SinkRow[];
  sinksLabel?: string;
  savings?: AmtRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const nv = (s: string) => parseFloat(s) || 0;
const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const FREQ_LABELS: Record<string, string> = {
  weekly: '/wk', biweekly: '/2wk', monthly: '/mo',
  every2: '/2mo', quarterly: '/qtr', every4: '/4mo',
  twice: '×2/yr', yearly: '/yr',
};
const FREQ_DIV: Record<string, number> = {
  weekly: 4.33, biweekly: 2.17, monthly: 1,
  every2: 0.5, quarterly: 0.33, every4: 0.25,
  twice: 0.167, yearly: 0.083,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionBlock({ title, total, children }: { title: string; total: number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-secondary-200 shadow-sm mb-4 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-secondary-50 border-b border-secondary-100">
        <p className="text-sm font-bold text-secondary-700">{title}</p>
        <p className="text-sm font-bold text-secondary-800">{fmt(total)}</p>
      </div>
      <div className="px-5 py-3 space-y-1">{children}</div>
    </div>
  );
}

function RowLine({ name, amount }: { name: string; amount: number }) {
  return (
    <div className="flex justify-between items-center py-1 text-sm">
      <span className="text-secondary-700">{name}</span>
      <span className="font-medium text-secondary-800">{fmt(amount)}</span>
    </div>
  );
}

function SubSection({ label, rows }: { label: string; rows: AmtRow[] }) {
  const total = rows.reduce((s, r) => s + nv(r.amount), 0);
  if (rows.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-1">{label}</p>
      {rows.map((r) => <RowLine key={r.id} name={r.name || '—'} amount={nv(r.amount)} />)}
      {rows.length > 1 && (
        <div className="flex justify-between text-xs text-secondary-400 pt-1 border-t border-secondary-100 mt-1">
          <span>Subtotal</span><span>{fmt(total)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PartnerBudgetPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const ownerId = router.query.owner as string | undefined;

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/'); return; }
    if (!ownerId) return;

    // Verify this user actually has view access to this owner's budget
    getViewableBudgetOwners(user.id).then(async (owners) => {
      const match = owners.find((o) => o.ownerId === ownerId);
      if (!match) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
      const data = await getPartnerBudgetData(ownerId);
      if (!data) {
        setLoadError("Your partner hasn't saved a budget yet.");
      } else {
        setBudget(data as BudgetData);
      }
    });
  }, [user, loading, ownerId, router]);

  // ── Derived totals ──────────────────────────────────────────────────────────

  const totalIncome  = (budget?.incRows ?? []).reduce((s, r) => s + nv(r.amount), 0);
  const totalFixed   = [
    ...(budget?.fixedSubs ?? []).flatMap((s) => s.rows),
    ...(budget?.sinks ?? []).map((r) => ({ ...r, amount: String(Math.round(nv(r.amount) / (FREQ_DIV[r.freq] ?? 1))) })),
  ].reduce((s, r) => s + nv(r.amount), 0);
  const totalVar     = (budget?.varSubs ?? []).flatMap((s) => s.rows).reduce((s, r) => s + nv(r.amount), 0);
  const totalSavings = (budget?.savings ?? []).reduce((s, r) => s + nv(r.amount), 0);
  const leftover     = totalIncome - totalFixed - totalVar - totalSavings;
  const totalAssets  = (budget?.assets ?? []).reduce((s, r) => s + nv(r.value), 0);
  const totalDebts   = (budget?.debts ?? []).reduce((s, r) => s + nv(r.value), 0);
  const netWorth     = totalAssets - totalDebts;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Partner Budget – Money-Willo</title>
      </Head>
      <Header />

      <main className="min-h-screen bg-secondary-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Back link */}
          <Link href="/account" className="inline-flex items-center gap-1.5 text-sm text-secondary-500 hover:text-secondary-700 mb-5 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Account
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-secondary-800">Partner&rsquo;s Budget</h1>
              <p className="text-xs text-secondary-400 mt-0.5">Read-only view — you cannot make changes</p>
            </div>
            <span className="text-xs bg-primary-100 text-primary-700 font-semibold px-3 py-1 rounded-full">
              Read only
            </span>
          </div>

          {/* Loading / auth states */}
          {(loading || authorized === null) && (
            <p className="text-secondary-400 text-sm">Loading…</p>
          )}

          {authorized === false && (
            <div className="bg-white rounded-xl border border-red-100 p-6 text-center">
              <p className="text-red-600 font-medium mb-2">Access not permitted</p>
              <p className="text-sm text-secondary-500">Either this budget doesn&rsquo;t exist or your partner hasn&rsquo;t enabled full budget view.</p>
            </div>
          )}

          {loadError && (
            <div className="bg-white rounded-xl border border-secondary-100 p-6 text-center">
              <p className="text-secondary-500">{loadError}</p>
            </div>
          )}

          {authorized && budget && (
            <>
              {/* Summary bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Income', value: totalIncome, color: 'text-primary-700' },
                  { label: 'Expenses', value: totalFixed + totalVar, color: 'text-secondary-800' },
                  { label: 'Savings', value: totalSavings, color: 'text-blue-700' },
                  { label: 'Leftover', value: leftover, color: leftover >= 0 ? 'text-green-700' : 'text-red-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-secondary-200 shadow-sm p-4 text-center">
                    <p className="text-xs text-secondary-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>{fmt(value)}</p>
                  </div>
                ))}
              </div>

              {/* Net Worth */}
              {(totalAssets > 0 || totalDebts > 0) && (
                <SectionBlock title="Net Worth" total={netWorth}>
                  {(budget.assets ?? []).map((r) => <RowLine key={r.id} name={r.name || '—'} amount={nv(r.value)} />)}
                  {totalDebts > 0 && (
                    <>
                      <div className="border-t border-secondary-100 my-2" />
                      <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wide mb-1">Debts</p>
                      {(budget.debts ?? []).map((r) => <RowLine key={r.id} name={r.name || '—'} amount={nv(r.value)} />)}
                    </>
                  )}
                </SectionBlock>
              )}

              {/* Income */}
              {(budget.incRows ?? []).length > 0 && (
                <SectionBlock title="Income" total={totalIncome}>
                  {(budget.incRows ?? []).map((r) => <RowLine key={r.id} name={r.name || '—'} amount={nv(r.amount)} />)}
                </SectionBlock>
              )}

              {/* Fixed Costs */}
              {((budget.fixedSubs ?? []).some((s) => s.rows.length > 0) || (budget.sinks ?? []).length > 0) && (
                <SectionBlock title="Fixed Costs" total={totalFixed}>
                  {(budget.fixedSubs ?? []).map((sub) => (
                    <SubSection key={sub.id} label={sub.label} rows={sub.rows} />
                  ))}
                  {(budget.sinks ?? []).length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-1">
                        {budget.sinksLabel || 'Sinking Funds'}
                      </p>
                      {(budget.sinks ?? []).map((r) => (
                        <div key={r.id} className="flex justify-between items-center py-1 text-sm">
                          <span className="text-secondary-700">{r.name || '—'}</span>
                          <span className="font-medium text-secondary-800">
                            {fmt(Math.round(nv(r.amount) / (FREQ_DIV[r.freq] ?? 1)))}/mo
                            <span className="text-xs text-secondary-400 ml-1">({fmt(nv(r.amount))}{FREQ_LABELS[r.freq] ?? ''})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionBlock>
              )}

              {/* Variable Costs */}
              {(budget.varSubs ?? []).some((s) => s.rows.length > 0) && (
                <SectionBlock title="Variable Costs" total={totalVar}>
                  {(budget.varSubs ?? []).map((sub) => (
                    <SubSection key={sub.id} label={sub.label} rows={sub.rows} />
                  ))}
                </SectionBlock>
              )}

              {/* Savings */}
              {(budget.savings ?? []).length > 0 && (
                <SectionBlock title="Savings" total={totalSavings}>
                  {(budget.savings ?? []).map((r) => <RowLine key={r.id} name={r.name || '—'} amount={nv(r.amount)} />)}
                </SectionBlock>
              )}

              {/* Leftover */}
              <div className={`rounded-xl border-2 p-5 text-center ${leftover >= 0 ? 'bg-primary-50 border-primary-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-xs font-bold uppercase tracking-wide text-secondary-500 mb-1">Monthly Leftover</p>
                <p className={`text-3xl font-bold ${leftover >= 0 ? 'text-primary-700' : 'text-red-600'}`}>{fmt(leftover)}</p>
                {leftover < 0 && (
                  <p className="text-xs text-red-500 mt-1">Spending exceeds income — a great thing to discuss at your next check-in.</p>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
