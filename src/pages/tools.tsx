import { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BudgetPlanner from '@/components/BudgetPlanner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt$ = (n: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

const formatMonths = (months: number): string => {
  if (months <= 0) return '0 months';
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} month${m !== 1 ? 's' : ''}`;
  if (m === 0) return `${y} year${y !== 1 ? 's' : ''}`;
  return `${y} yr ${m} mo`;
};

// ─── Shared style tokens ──────────────────────────────────────────────────────

const inputCls =
  'w-full border border-secondary-300 rounded-lg px-3 py-2 text-secondary-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const labelCls = 'block text-xs font-semibold text-secondary-600 mb-1 uppercase tracking-wide';
const calcBtnCls =
  'btn-primary text-sm px-5 py-2.5 mt-1';
const resultBox =
  'mt-5 bg-primary-50 border border-primary-200 rounded-xl p-4';
const resultRow =
  'flex justify-between items-center py-1.5 border-b border-primary-100 last:border-0';
const resultLabel = 'text-secondary-600 text-sm';
const resultVal = 'font-bold text-primary-700 text-sm';
const bigVal = 'font-bold text-primary-700 text-xl';
const grid2 = 'grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5';

type CalcId = 'mortgage' | 'payoff' | 'loan' | 'compound' | 'retirement' | 'eir';

type EIRRow = { id: string; name: string; balance: string; rate: string };
const eirUid = () => Math.random().toString(36).slice(2, 9);
const eirNv  = (s: string) => parseFloat(s) || 0;

// ─── localStorage persistence ─────────────────────────────────────────────────

const CALC_LS_KEY = 'ramseycoach_calcs';

const getSaved = (): Record<string, unknown> => {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(CALC_LS_KEY) || '{}'); }
  catch { return {}; }
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const { user, openAuthModal } = useAuth();
  const [calcSaveStatus, setCalcSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [activeTab, setActiveTab] = useState<'calculators' | 'budget'>('calculators');
  const [openCalc, setOpenCalc] = useState<CalcId | null>('mortgage');

  const toggleCalc = (id: CalcId) =>
    setOpenCalc((prev) => (prev === id ? null : id));

  // ── 1. Mortgage ─────────────────────────────────────────────────────────────
  const [m_price, setMPrice] = useState(() => (getSaved().m_price as string) ?? '300000');
  const [m_down, setMDown] = useState(() => (getSaved().m_down as string) ?? '60000');
  const [m_term, setMTerm] = useState(() => (getSaved().m_term as string) ?? '30');
  const [m_rate, setMRate] = useState(() => (getSaved().m_rate as string) ?? '6.5');
  const [m_res, setMRes] = useState<{
    monthly: number;
    loanAmt: number;
    totalInterest: number;
    totalCost: number;
  } | null>(null);
  const [m_err, setMErr] = useState('');

  const calcMortgage = () => {
    setMErr('');
    const price = parseFloat(m_price);
    const down = parseFloat(m_down);
    const r = parseFloat(m_rate) / 100 / 12;
    const n = parseFloat(m_term) * 12;
    const P = price - down;
    if (!price || !r || !n || P <= 0) {
      setMErr('Please check your inputs — loan amount must be greater than zero.');
      setMRes(null);
      return;
    }
    const M = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    setMRes({ monthly: M, loanAmt: P, totalInterest: M * n - P, totalCost: M * n });
  };

  // ── 2. Mortgage Payoff ──────────────────────────────────────────────────────
  const [po_bal, setPobal] = useState(() => (getSaved().po_bal as string) ?? '250000');
  const [po_rate, setPoRate] = useState(() => (getSaved().po_rate as string) ?? '6.5');
  const [po_pmt, setPoPmt] = useState(() => (getSaved().po_pmt as string) ?? '1580');
  const [po_extra, setPoExtra] = useState(() => (getSaved().po_extra as string) ?? '200');
  const [po_res, setPoRes] = useState<{
    origMonths: number;
    newMonths: number;
    saved: number;
    origInterest: number;
    newInterest: number;
    interestSaved: number;
  } | null>(null);
  const [po_err, setPoErr] = useState('');

  const calcPayoff = () => {
    setPoErr('');
    const bal = parseFloat(po_bal);
    const mr = parseFloat(po_rate) / 100 / 12;
    const pmt = parseFloat(po_pmt);
    const extra = parseFloat(po_extra) || 0;
    if (!bal || !mr || !pmt) { setPoErr('Please fill in all required fields.'); return; }
    if (pmt <= bal * mr) { setPoErr('Your current payment does not cover the monthly interest. Please enter a higher payment.'); return; }

    const simulate = (payment: number) => {
      let b = bal, months = 0, interest = 0;
      while (b > 0.005 && months < 1200) {
        const i = b * mr;
        const prin = Math.min(payment - i, b);
        b -= prin;
        interest += i;
        months++;
      }
      return { months, interest };
    };

    const orig = simulate(pmt);
    const withExtra = simulate(pmt + extra);
    setPoRes({
      origMonths: orig.months,
      newMonths: withExtra.months,
      saved: orig.months - withExtra.months,
      origInterest: orig.interest,
      newInterest: withExtra.interest,
      interestSaved: orig.interest - withExtra.interest,
    });
  };

  // ── 3. Loan / Debt Payoff ───────────────────────────────────────────────────
  const [l_amt, setLAmt] = useState(() => (getSaved().l_amt as string) ?? '25000');
  const [l_rate, setLRate] = useState(() => (getSaved().l_rate as string) ?? '7.0');
  const [l_term, setLTerm] = useState(() => (getSaved().l_term as string) ?? '60');
  const [l_extra, setLExtra] = useState(() => (getSaved().l_extra as string) ?? '0');
  const [l_res, setLRes] = useState<{
    monthly: number;
    totalInterest: number;
    totalPaid: number;
    savedMonths?: number;
    savedInterest?: number;
  } | null>(null);
  const [l_err, setLErr] = useState('');

  const calcLoan = () => {
    setLErr('');
    const P = parseFloat(l_amt);
    const r = parseFloat(l_rate) / 100 / 12;
    const n = parseFloat(l_term);
    const extra = parseFloat(l_extra) || 0;
    if (!P || !r || !n || P <= 0) { setLErr('Please check your inputs.'); return; }
    const M = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    let savedMonths: number | undefined;
    let savedInterest: number | undefined;

    if (extra > 0) {
      const simulate = (payment: number) => {
        let b = P, months = 0, interest = 0;
        while (b > 0.005 && months < 1200) {
          const i = b * r;
          const prin = Math.min(payment - i, b);
          b -= prin;
          interest += i;
          months++;
        }
        return { months, interest };
      };
      const orig = simulate(M);
      const withExtra = simulate(M + extra);
      savedMonths = orig.months - withExtra.months;
      savedInterest = orig.interest - withExtra.interest;
    }

    setLRes({
      monthly: M,
      totalInterest: M * n - P,
      totalPaid: M * n,
      savedMonths,
      savedInterest,
    });
  };

  // ── 4. Compound Interest ────────────────────────────────────────────────────
  const [ci_principal, setCiPrincipal] = useState(() => (getSaved().ci_principal as string) ?? '10000');
  const [ci_monthly, setCiMonthly] = useState(() => (getSaved().ci_monthly as string) ?? '500');
  const [ci_rate, setCiRate] = useState(() => (getSaved().ci_rate as string) ?? '8.0');
  const [ci_years, setCiYears] = useState(() => (getSaved().ci_years as string) ?? '20');
  const [ci_res, setCiRes] = useState<{
    finalBalance: number;
    totalContrib: number;
    totalInterest: number;
    table: { year: number; balance: number; contrib: number }[];
  } | null>(null);
  const [ci_err, setCiErr] = useState('');

  const calcCompound = () => {
    setCiErr('');
    const P = parseFloat(ci_principal);
    const C = parseFloat(ci_monthly);
    const r = parseFloat(ci_rate) / 100 / 12;
    const years = parseInt(ci_years);
    if (isNaN(P) || isNaN(C) || isNaN(r) || isNaN(years) || years <= 0) {
      setCiErr('Please check your inputs.'); return;
    }

    const table: { year: number; balance: number; contrib: number }[] = [];
    let balance = P;
    let totalContrib = P;

    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + r) + C;
      }
      totalContrib += C * 12;
      table.push({ year: y, balance, contrib: totalContrib });
    }

    setCiRes({
      finalBalance: balance,
      totalContrib,
      totalInterest: balance - totalContrib,
      table,
    });
  };

  // ── 5. Effective Interest Rate ──────────────────────────────────────────────
  const [eir_rows, setEirRows] = useState<EIRRow[]>(() => {
    const s = getSaved().eir_rows;
    return Array.isArray(s) && s.length > 0
      ? (s as EIRRow[])
      : [
          { id: 'e1', name: 'Mortgage', balance: '', rate: '' },
          { id: 'e2', name: 'Car Loan', balance: '', rate: '' },
        ];
  });
  const eir_totalBal = eir_rows.reduce((s, r) => s + eirNv(r.balance), 0);
  const eir_weighted = eir_rows.reduce((s, r) => s + eirNv(r.balance) * eirNv(r.rate), 0);
  const eir_rate     = eir_totalBal > 0 ? eir_weighted / eir_totalBal : 0;

  // ── 6. 401K / Retirement ────────────────────────────────────────────────────
  const [ret_currAge, setRetCurrAge] = useState(() => (getSaved().ret_currAge as string) ?? '35');
  const [ret_retireAge, setRetRetireAge] = useState(() => (getSaved().ret_retireAge as string) ?? '65');
  const [ret_bal, setRetBal] = useState(() => (getSaved().ret_bal as string) ?? '50000');
  const [ret_monthly, setRetMonthly] = useState(() => (getSaved().ret_monthly as string) ?? '500');
  const [ret_match, setRetMatch] = useState(() => (getSaved().ret_match as string) ?? '50');
  const [ret_return, setRetReturn] = useState(() => (getSaved().ret_return as string) ?? '7.0');
  const [ret_res, setRetRes] = useState<{
    projected: number;
    totalContrib: number;
    totalGrowth: number;
    table: { age: number; balance: number }[];
  } | null>(null);
  const [ret_err, setRetErr] = useState('');

  const calcRetirement = () => {
    setRetErr('');
    const currAge = parseInt(ret_currAge);
    const retireAge = parseInt(ret_retireAge);
    const P = parseFloat(ret_bal);
    const userMonthly = parseFloat(ret_monthly);
    const matchPct = parseFloat(ret_match) / 100;
    const annualReturn = parseFloat(ret_return) / 100;

    if (isNaN(currAge) || isNaN(retireAge) || retireAge <= currAge) {
      setRetErr('Retirement age must be greater than current age.'); return;
    }
    if (isNaN(P) || isNaN(userMonthly) || isNaN(matchPct) || isNaN(annualReturn)) {
      setRetErr('Please check your inputs.'); return;
    }

    const totalMonthly = userMonthly * (1 + matchPct);
    const r = annualReturn / 12;
    const years = retireAge - currAge;

    let balance = P;
    let totalContrib = P;
    const table: { age: number; balance: number }[] = [{ age: currAge, balance: P }];

    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + r) + totalMonthly;
      }
      totalContrib += totalMonthly * 12;
      const age = currAge + y;
      if (age % 10 === 0 || age === retireAge) {
        table.push({ age, balance });
      }
    }

    if (table[table.length - 1].age !== retireAge) {
      table.push({ age: retireAge, balance });
    }

    setRetRes({ projected: balance, totalContrib, totalGrowth: balance - totalContrib, table });
  };

  // ── Persist all calculator inputs to localStorage ────────────────────────────
  useEffect(() => {
    localStorage.setItem(CALC_LS_KEY, JSON.stringify({
      m_price, m_down, m_term, m_rate,
      po_bal, po_rate, po_pmt, po_extra,
      l_amt, l_rate, l_term, l_extra,
      ci_principal, ci_monthly, ci_rate, ci_years,
      ret_currAge, ret_retireAge, ret_bal, ret_monthly, ret_match, ret_return,
      eir_rows,
    }));
  }, [
    m_price, m_down, m_term, m_rate,
    po_bal, po_rate, po_pmt, po_extra,
    l_amt, l_rate, l_term, l_extra,
    ci_principal, ci_monthly, ci_rate, ci_years,
    ret_currAge, ret_retireAge, ret_bal, ret_monthly, ret_match, ret_return,
    eir_rows,
  ]);

  // ── Load calculator data from Supabase when user signs in ────────────────────
  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_tool_data')
      .select('calculator_data')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.calculator_data) return;
        const c = data.calculator_data as Record<string, unknown>;
        if (c.m_price)      setMPrice(c.m_price as string);
        if (c.m_down)       setMDown(c.m_down as string);
        if (c.m_term)       setMTerm(c.m_term as string);
        if (c.m_rate)       setMRate(c.m_rate as string);
        if (c.po_bal)       setPobal(c.po_bal as string);
        if (c.po_rate)      setPoRate(c.po_rate as string);
        if (c.po_pmt)       setPoPmt(c.po_pmt as string);
        if (c.po_extra)     setPoExtra(c.po_extra as string);
        if (c.l_amt)        setLAmt(c.l_amt as string);
        if (c.l_rate)       setLRate(c.l_rate as string);
        if (c.l_term)       setLTerm(c.l_term as string);
        if (c.l_extra)      setLExtra(c.l_extra as string);
        if (c.ci_principal) setCiPrincipal(c.ci_principal as string);
        if (c.ci_monthly)   setCiMonthly(c.ci_monthly as string);
        if (c.ci_rate)      setCiRate(c.ci_rate as string);
        if (c.ci_years)     setCiYears(c.ci_years as string);
        if (c.ret_currAge)  setRetCurrAge(c.ret_currAge as string);
        if (c.ret_retireAge)setRetRetireAge(c.ret_retireAge as string);
        if (c.ret_bal)      setRetBal(c.ret_bal as string);
        if (c.ret_monthly)  setRetMonthly(c.ret_monthly as string);
        if (c.ret_match)    setRetMatch(c.ret_match as string);
        if (c.ret_return)   setRetReturn(c.ret_return as string);
        if (Array.isArray(c.eir_rows)) setEirRows(c.eir_rows as EIRRow[]);
      });
  }, [user]);

  // ── Save calculators to Supabase ─────────────────────────────────────────────
  const handleSaveCalcs = async () => {
    if (!user) { openAuthModal(); return; }
    setCalcSaveStatus('saving');
    const snapshot = {
      m_price, m_down, m_term, m_rate,
      po_bal, po_rate, po_pmt, po_extra,
      l_amt, l_rate, l_term, l_extra,
      ci_principal, ci_monthly, ci_rate, ci_years,
      ret_currAge, ret_retireAge, ret_bal, ret_monthly, ret_match, ret_return,
      eir_rows,
    };
    const { error } = await supabase
      .from('user_tool_data')
      .upsert({ user_id: user.id, calculator_data: snapshot, updated_at: new Date().toISOString() },
               { onConflict: 'user_id' });
    setCalcSaveStatus(error ? 'error' : 'saved');
    setTimeout(() => setCalcSaveStatus('idle'), 3000);
  };

  const eir_inp = inputCls + ' text-right';

  // ─── Calculator definitions ───────────────────────────────────────────────

  const calculators: {
    id: CalcId;
    title: string;
    description: string;
    content: React.ReactNode;
  }[] = [
    {
      id: 'mortgage',
      title: 'Mortgage Calculator',
      description:
        "Buying a home is the biggest purchase most people ever make — know your numbers before you sign. Ramsey recommends keeping your monthly payment at or below 25% of your take-home pay on a 15-year fixed mortgage.",
      content: (
        <div>
          <div className={grid2}>
            <div>
              <label className={labelCls}>Home Price ($)</label>
              <input className={inputCls} type="number" value={m_price} onChange={(e) => setMPrice(e.target.value)} placeholder="300000" />
            </div>
            <div>
              <label className={labelCls}>Down Payment ($)</label>
              <input className={inputCls} type="number" value={m_down} onChange={(e) => setMDown(e.target.value)} placeholder="60000" />
            </div>
            <div>
              <label className={labelCls}>Loan Term</label>
              <select className={inputCls} value={m_term} onChange={(e) => setMTerm(e.target.value)}>
                <option value="10">10 years</option>
                <option value="15">15 years (Ramsey recommended)</option>
                <option value="20">20 years</option>
                <option value="30">30 years</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Annual Interest Rate (%)</label>
              <input className={inputCls} type="number" step="0.1" value={m_rate} onChange={(e) => setMRate(e.target.value)} placeholder="6.5" />
            </div>
          </div>
          <button className={calcBtnCls} onClick={calcMortgage}>Calculate</button>
          {m_err && <p className="text-red-600 text-sm mt-2">{m_err}</p>}
          {m_res && (
            <div className={resultBox}>
              <div className={`${resultRow} mb-1`}>
                <span className="text-secondary-700 text-sm font-semibold">Monthly Payment (P&amp;I)</span>
                <span className={bigVal}>{fmt$(m_res.monthly)}</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>Loan Amount</span>
                <span className={resultVal}>{fmt$(m_res.loanAmt)}</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>Total Interest Paid</span>
                <span className={resultVal}>{fmt$(m_res.totalInterest)}</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>Total Cost of Loan</span>
                <span className={resultVal}>{fmt$(m_res.totalCost)}</span>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'payoff',
      title: 'Mortgage Payoff Calculator',
      description:
        "Even a small extra payment each month can shave years off your mortgage and save you tens of thousands in interest. See exactly how fast you can own your home outright.",
      content: (
        <div>
          <div className={grid2}>
            <div>
              <label className={labelCls}>Current Balance ($)</label>
              <input className={inputCls} type="number" value={po_bal} onChange={(e) => setPobal(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Interest Rate (%)</label>
              <input className={inputCls} type="number" step="0.1" value={po_rate} onChange={(e) => setPoRate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Current Monthly Payment ($)</label>
              <input className={inputCls} type="number" value={po_pmt} onChange={(e) => setPoPmt(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Extra Monthly Payment ($)</label>
              <input className={inputCls} type="number" value={po_extra} onChange={(e) => setPoExtra(e.target.value)} />
            </div>
          </div>
          <button className={calcBtnCls} onClick={calcPayoff}>Calculate</button>
          {po_err && <p className="text-red-600 text-sm mt-2">{po_err}</p>}
          {po_res && (
            <div className={resultBox}>
              <div className={`${resultRow} mb-1`}>
                <span className="text-secondary-700 text-sm font-semibold">Time Saved</span>
                <span className={bigVal}>{formatMonths(po_res.saved)}</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>Original Payoff Time</span>
                <span className={resultVal}>{formatMonths(po_res.origMonths)}</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>New Payoff Time</span>
                <span className={resultVal}>{formatMonths(po_res.newMonths)}</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>Interest Saved</span>
                <span className={resultVal}>{fmt$(po_res.interestSaved)}</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>Original Total Interest</span>
                <span className={resultVal}>{fmt$(po_res.origInterest)}</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>New Total Interest</span>
                <span className={resultVal}>{fmt$(po_res.newInterest)}</span>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'loan',
      title: 'Loan & Debt Payoff Calculator',
      description:
        "Whether it's a car loan, student debt, or personal loan — this calculator shows your monthly payment, the true total cost, and how much faster extra payments get you to debt-free.",
      content: (
        <div>
          <div className={grid2}>
            <div>
              <label className={labelCls}>Loan Amount ($)</label>
              <input className={inputCls} type="number" value={l_amt} onChange={(e) => setLAmt(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Annual Interest Rate (%)</label>
              <input className={inputCls} type="number" step="0.1" value={l_rate} onChange={(e) => setLRate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Loan Term (months)</label>
              <input className={inputCls} type="number" value={l_term} onChange={(e) => setLTerm(e.target.value)} placeholder="60" />
            </div>
            <div>
              <label className={labelCls}>Extra Monthly Payment ($) — optional</label>
              <input className={inputCls} type="number" value={l_extra} onChange={(e) => setLExtra(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className={calcBtnCls} onClick={calcLoan}>Calculate</button>
          {l_err && <p className="text-red-600 text-sm mt-2">{l_err}</p>}
          {l_res && (
            <div className={resultBox}>
              <div className={`${resultRow} mb-1`}>
                <span className="text-secondary-700 text-sm font-semibold">Monthly Payment</span>
                <span className={bigVal}>{fmt$(l_res.monthly)}</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>Total Interest</span>
                <span className={resultVal}>{fmt$(l_res.totalInterest)}</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>Total Paid</span>
                <span className={resultVal}>{fmt$(l_res.totalPaid)}</span>
              </div>
              {l_res.savedMonths !== undefined && l_res.savedMonths > 0 && (
                <>
                  <div className={`${resultRow} pt-3 mt-2 border-t-2 border-primary-200`}>
                    <span className="text-secondary-700 text-sm font-semibold">With Extra Payment — Months Saved</span>
                    <span className={bigVal}>{l_res.savedMonths}</span>
                  </div>
                  <div className={resultRow}>
                    <span className={resultLabel}>Interest Saved</span>
                    <span className={resultVal}>{fmt$(l_res.savedInterest!)}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'compound',
      title: 'Compound Interest Calculator',
      description:
        "Compound interest rewards consistency and patience. Start now, keep contributing, and let time do the heavy lifting — this is the math behind every successful Baby Step 4 investor.",
      content: (
        <div>
          <div className={grid2}>
            <div>
              <label className={labelCls}>Starting Amount ($)</label>
              <input className={inputCls} type="number" value={ci_principal} onChange={(e) => setCiPrincipal(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Monthly Contribution ($)</label>
              <input className={inputCls} type="number" value={ci_monthly} onChange={(e) => setCiMonthly(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Annual Interest Rate (%)</label>
              <input className={inputCls} type="number" step="0.1" value={ci_rate} onChange={(e) => setCiRate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Years to Grow</label>
              <input className={inputCls} type="number" value={ci_years} onChange={(e) => setCiYears(e.target.value)} />
            </div>
          </div>
          <button className={calcBtnCls} onClick={calcCompound}>Calculate</button>
          {ci_err && <p className="text-red-600 text-sm mt-2">{ci_err}</p>}
          {ci_res && (
            <div className={resultBox}>
              <div className={`${resultRow} mb-1`}>
                <span className="text-secondary-700 text-sm font-semibold">Final Balance</span>
                <span className={bigVal}>{fmt$(ci_res.finalBalance)}</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>Total Contributions</span>
                <span className={resultVal}>{fmt$(ci_res.totalContrib)}</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>Interest Earned</span>
                <span className={resultVal}>{fmt$(ci_res.totalInterest)}</span>
              </div>
              <div className="mt-4 overflow-auto max-h-60 rounded-lg border border-primary-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-primary-100">
                    <tr>
                      <th className="text-left px-3 py-2 text-secondary-600 font-semibold text-xs uppercase">Year</th>
                      <th className="text-right px-3 py-2 text-secondary-600 font-semibold text-xs uppercase">Balance</th>
                      <th className="text-right px-3 py-2 text-secondary-600 font-semibold text-xs uppercase">Contributed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ci_res.table.map((row) => (
                      <tr key={row.year} className="border-t border-primary-100 hover:bg-primary-50">
                        <td className="px-3 py-1.5 text-secondary-600">Year {row.year}</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-primary-700">{fmt$(row.balance)}</td>
                        <td className="px-3 py-1.5 text-right text-secondary-500">{fmt$(row.contrib)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'retirement',
      title: '401K / Retirement Calculator',
      description:
        "Baby Step 4 is investing 15% of your household income for retirement. See what your current contributions — plus your employer's match — can grow into by the time you're ready to stop working.",
      content: (
        <div>
          <div className={grid2}>
            <div>
              <label className={labelCls}>Current Age</label>
              <input className={inputCls} type="number" value={ret_currAge} onChange={(e) => setRetCurrAge(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Retirement Age</label>
              <input className={inputCls} type="number" value={ret_retireAge} onChange={(e) => setRetRetireAge(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Current 401K Balance ($)</label>
              <input className={inputCls} type="number" value={ret_bal} onChange={(e) => setRetBal(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Your Monthly Contribution ($)</label>
              <input className={inputCls} type="number" value={ret_monthly} onChange={(e) => setRetMonthly(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Employer Match (% of your contribution)</label>
              <input className={inputCls} type="number" value={ret_match} onChange={(e) => setRetMatch(e.target.value)} placeholder="50" />
            </div>
            <div>
              <label className={labelCls}>Expected Annual Return (%)</label>
              <input className={inputCls} type="number" step="0.1" value={ret_return} onChange={(e) => setRetReturn(e.target.value)} />
            </div>
          </div>
          <button className={calcBtnCls} onClick={calcRetirement}>Calculate</button>
          {ret_err && <p className="text-red-600 text-sm mt-2">{ret_err}</p>}
          {ret_res && (
            <div className={resultBox}>
              <div className={`${resultRow} mb-1`}>
                <span className="text-secondary-700 text-sm font-semibold">Projected Balance at Retirement</span>
                <span className={bigVal}>{fmt$(ret_res.projected)}</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>Total Contributions (you + employer)</span>
                <span className={resultVal}>{fmt$(ret_res.totalContrib)}</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>Total Growth</span>
                <span className={resultVal}>{fmt$(ret_res.totalGrowth)}</span>
              </div>
              <div className="mt-4 overflow-auto max-h-60 rounded-lg border border-primary-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-primary-100">
                    <tr>
                      <th className="text-left px-3 py-2 text-secondary-600 font-semibold text-xs uppercase">Age</th>
                      <th className="text-right px-3 py-2 text-secondary-600 font-semibold text-xs uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ret_res.table.map((row) => (
                      <tr key={row.age} className="border-t border-primary-100 hover:bg-primary-50">
                        <td className="px-3 py-1.5 text-secondary-600">{row.age}</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-primary-700">{fmt$(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'eir',
      title: 'Effective Interest Rate Calculator',
      description:
        "Your effective interest rate is the balance-weighted average across all your debts — it tells you the true blended cost of your debt. Use it to evaluate consolidation offers or track your progress as you pay down balances.",
      content: (
        <div>
          {/* Column headers */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_8rem_7rem_1.5rem] gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wide text-secondary-400 pl-1">Debt Name</span>
            <span className="text-xs font-bold uppercase tracking-wide text-secondary-400 text-right">Balance ($)</span>
            <span className="text-xs font-bold uppercase tracking-wide text-secondary-400 text-right">Rate (%)</span>
            <span />
          </div>

          <div className="space-y-2 mb-4">
            {eir_rows.map((row, i) => (
              <div key={row.id} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                <input
                  className={inputCls + ' flex-1 min-w-0'}
                  value={row.name}
                  onChange={e => setEirRows(eir_rows.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}
                  placeholder="Debt name"
                />
                <input
                  className={eir_inp + ' w-32 flex-shrink-0'}
                  type="number" min="0"
                  value={row.balance}
                  onChange={e => setEirRows(eir_rows.map((r, j) => j === i ? { ...r, balance: e.target.value } : r))}
                  placeholder="Balance"
                />
                <input
                  className={eir_inp + ' w-24 flex-shrink-0'}
                  type="number" min="0" step="0.1"
                  value={row.rate}
                  onChange={e => setEirRows(eir_rows.map((r, j) => j === i ? { ...r, rate: e.target.value } : r))}
                  placeholder="Rate %"
                />
                <button
                  onClick={() => setEirRows(eir_rows.filter((_, j) => j !== i))}
                  className="text-secondary-300 hover:text-red-400 transition-colors font-bold text-xl leading-none px-1 flex-shrink-0"
                  title="Remove"
                >×</button>
              </div>
            ))}
            <button
              onClick={() => setEirRows([...eir_rows, { id: eirUid(), name: '', balance: '', rate: '' }])}
              className="text-primary-600 hover:text-primary-800 text-sm font-semibold flex items-center gap-1 mt-2 transition-colors"
            >
              <span className="font-bold text-base">+</span> Add Debt
            </button>
          </div>

          {eir_rate > 0 && (
            <div className={resultBox}>
              <div className={`${resultRow} mb-1`}>
                <span className="text-secondary-700 text-sm font-semibold">Effective Interest Rate</span>
                <span className={bigVal}>{eir_rate.toFixed(2)}%</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>Total Debt Balance</span>
                <span className={resultVal}>{fmt$(eir_totalBal)}</span>
              </div>
              <div className={resultRow}>
                <span className={resultLabel}>Debts Entered</span>
                <span className={resultVal}>{eir_rows.filter(r => eirNv(r.balance) > 0).length}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-primary-100">
                <p className="text-secondary-500 text-xs leading-relaxed">
                  This is the balance-weighted average of all your interest rates. Use it as a benchmark
                  when evaluating consolidation offers — and watch it drop as you eliminate debt.
                </p>
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Financial Tools | Money-Willo</title>
        <meta
          name="description"
          content="Free financial calculators and budget planning tools to help you get out of debt, build wealth, and take control of your money."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 bg-secondary-50">
          {/* Page Hero */}
          <section className="bg-primary-700 text-white py-10 px-4">
            <div className="container-custom text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white">Financial Tools</h1>
              <p className="text-primary-100 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                Free calculators and planning tools to help you take control of your money.
                Sign in to save your data permanently — or use them without an account.
              </p>
            </div>
          </section>

          {/* Tab Nav */}
          <div className="bg-white border-b border-secondary-200 sticky top-[64px] md:top-[80px] z-20">
            <div className="container-custom">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('calculators')}
                  className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors duration-200 focus:outline-none ${
                    activeTab === 'calculators'
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-secondary-500 hover:text-secondary-700'
                  }`}
                >
                  Financial Calculators
                </button>
                <button
                  onClick={() => setActiveTab('budget')}
                  className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors duration-200 focus:outline-none ${
                    activeTab === 'budget'
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-secondary-500 hover:text-secondary-700'
                  }`}
                >
                  Budget Planner
                </button>
              </div>
            </div>
          </div>

          {/* ── Calculators Tab ─────────────────────────────────────────────── */}
          {activeTab === 'calculators' && (
            <section className="container-custom py-10">
              <div className="max-w-3xl mx-auto mb-4 flex justify-end">
                <button
                  onClick={handleSaveCalcs}
                  disabled={calcSaveStatus === 'saving'}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                    calcSaveStatus === 'saved'
                      ? 'bg-green-100 border border-green-300 text-green-700'
                      : calcSaveStatus === 'error'
                      ? 'bg-red-100 border border-red-300 text-red-600'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {calcSaveStatus === 'saved' ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Saved!
                    </>
                  ) : calcSaveStatus === 'error' ? (
                    'Error — try again'
                  ) : calcSaveStatus === 'saving' ? (
                    'Saving…'
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      {user ? 'Save Calculator Inputs' : 'Save to Account'}
                    </>
                  )}
                </button>
              </div>
              <div className="max-w-3xl mx-auto space-y-3">
                {calculators.map((calc) => (
                  <div
                    key={calc.id}
                    className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden"
                  >
                    {/* Accordion Header */}
                    <button
                      className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-secondary-50 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      onClick={() => toggleCalc(calc.id)}
                      aria-expanded={openCalc === calc.id}
                    >
                      <span className="font-bold text-secondary-800 text-base md:text-lg">
                        {calc.title}
                      </span>
                      <svg
                        className={`w-5 h-5 text-secondary-400 flex-shrink-0 ml-4 transform transition-transform duration-200 ${
                          openCalc === calc.id ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Accordion Body */}
                    {openCalc === calc.id && (
                      <div className="px-6 pb-6 border-t border-secondary-100">
                        <p className="text-secondary-500 text-sm italic mt-4 mb-5 leading-relaxed">
                          {calc.description}
                        </p>
                        {calc.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <p className="text-secondary-400 text-xs text-center max-w-2xl mx-auto mt-10 leading-relaxed">
                These calculators are for educational purposes only. Results are estimates based on the inputs you provide
                and assume consistent rates. Consult a financial professional before making major financial decisions.
              </p>
            </section>
          )}

          {/* ── Budget Planner Tab ──────────────────────────────────────────── */}
          {activeTab === 'budget' && (
            <section className="bg-secondary-50 min-h-[50vh]">
              <BudgetPlanner />
            </section>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}
