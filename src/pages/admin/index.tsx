import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';

interface Metrics {
  pending_flags:      number;
  total_flags:        number;
  total_transactions: number;
  total_budget_users: number;
  fetched_at:         string;
}

const WARN_THRESHOLDS = {
  pending_flags:      50,
  total_transactions: 100_000,
};

function MetricCard({
  label, value, sub, warn,
}: {
  label: string;
  value: string | number;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border px-5 py-4 ${warn ? 'border-amber-300' : 'border-secondary-200'}`}>
      <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${warn ? 'text-amber-600' : 'text-secondary-800'}`}>{value}</p>
      {sub && <p className="text-xs text-secondary-400 mt-0.5">{sub}</p>}
      {warn && (
        <p className="text-xs text-amber-600 font-semibold mt-1">⚠ Approaching threshold</p>
      )}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      const res = await fetch('/api/admin/metrics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setMetrics(await res.json());
    } catch (e) {
      setError('Could not load metrics. Check that SUPABASE_SERVICE_ROLE_KEY is set.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const lastFetched = metrics?.fetched_at
    ? new Date(metrics.fetched_at).toLocaleTimeString()
    : null;

  return (
    <AdminLayout title="Overview">
      <div className="px-6 py-8 max-w-4xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-secondary-800">Overview</h1>
            {lastFetched && (
              <p className="text-xs text-secondary-400 mt-0.5">Last updated {lastFetched}</p>
            )}
          </div>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-secondary-300 rounded-lg text-xs font-semibold text-secondary-600 hover:bg-secondary-100 disabled:opacity-50 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Metrics grid */}
        {loading && !metrics ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-secondary-200 px-5 py-4 animate-pulse">
                <div className="h-3 bg-secondary-100 rounded w-24 mb-3" />
                <div className="h-7 bg-secondary-100 rounded w-16" />
              </div>
            ))}
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              label="Pending Flags"
              value={metrics.pending_flags}
              sub={`of ${metrics.total_flags} total`}
              warn={metrics.pending_flags > WARN_THRESHOLDS.pending_flags}
            />
            <MetricCard
              label="Budget Users"
              value={metrics.total_budget_users}
              sub="saved budgets"
            />
            <MetricCard
              label="Transactions"
              value={metrics.total_transactions.toLocaleString()}
              sub="all time"
              warn={metrics.total_transactions > WARN_THRESHOLDS.total_transactions}
            />
            <MetricCard
              label="API Headroom"
              value={(() => {
                // Rough estimate: ~3.5 queries per session, 3 sessions/user/day
                const dailyQueries = metrics.total_budget_users * 3.5 * 3;
                const monthlyQueries = Math.round(dailyQueries * 30);
                const pct = Math.round((monthlyQueries / 50_000) * 100);
                return `~${pct}%`;
              })()}
              sub="of free tier used (est.)"
              warn={(() => {
                const dailyQueries = metrics.total_budget_users * 3.5 * 3;
                return dailyQueries * 30 > 40_000;
              })()}
            />
          </div>
        ) : null}

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="/admin/flags"
            className="bg-white rounded-xl border border-secondary-200 px-5 py-4 flex items-center justify-between hover:border-primary-300 hover:shadow-sm transition-all group"
          >
            <div>
              <p className="font-semibold text-secondary-800 text-sm">Category Flags</p>
              <p className="text-xs text-secondary-400 mt-0.5">
                Review unknown merchants and categorization issues
              </p>
            </div>
            {metrics && metrics.pending_flags > 0 && (
              <span className="ml-4 flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                {metrics.pending_flags}
              </span>
            )}
            <svg className="w-4 h-4 text-secondary-300 group-hover:text-primary-500 ml-3 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          <a
            href="https://stats.uptimerobot.com/XweJfCuHrr"
            target="_blank"
            rel="noreferrer"
            className="bg-white rounded-xl border border-secondary-200 px-5 py-4 flex items-center justify-between hover:border-primary-300 hover:shadow-sm transition-all group"
          >
            <div>
              <p className="font-semibold text-secondary-800 text-sm">Uptime Status</p>
              <p className="text-xs text-secondary-400 mt-0.5">
                Monitor availability and response times
              </p>
            </div>
            <svg className="w-4 h-4 text-secondary-300 group-hover:text-primary-500 ml-3 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

      </div>
    </AdminLayout>
  );
}
