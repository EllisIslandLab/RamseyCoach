import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import type { CategorizationFlag } from '@/lib/dataService';
import { updateFlagStatus } from '@/lib/dataService';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'merged';

const FLAG_TYPE_LABELS: Record<string, string> = {
  new_merchant: 'New Merchant',
  unusual_mapping: 'Unusual Mapping',
  new_category_candidate: 'New Category',
  subcategory_nomination: 'Subcategory Nomination',
};

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  merged:   'bg-blue-100 text-blue-700',
};

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<CategorizationFlag[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [mergeNote, setMergeNote] = useState<Record<string, string>>({});

  // ── Load flags via API route ───────────────────────────────────────────────
  const loadFlags = async () => {
    setLoadingFlags(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      const url = statusFilter === 'all'
        ? '/api/admin/flags'
        : `/api/admin/flags?status=${statusFilter}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFlags(data);
      }
    } catch {
      // Fail silently
    }
    setLoadingFlags(false);
  };

  useEffect(() => {
    loadFlags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleAction = async (id: string, status: string, notes?: string) => {
    setActionId(id);
    await updateFlagStatus(id, status, notes);
    await loadFlags();
    setActionId(null);
  };

  // ── Summary counts ─────────────────────────────────────────────────────────
  const pending  = flags.filter(f => f.status === 'pending').length;
  const approved = flags.filter(f => f.status === 'approved').length;

  return (
    <AdminLayout title="Category Flags">
      <div className="px-6 py-8 max-w-5xl">
        <h1 className="text-2xl font-bold text-secondary-800 mb-6">Category Flags</h1>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Pending Review', value: pending, color: 'text-amber-600' },
              { label: 'Approved', value: approved, color: 'text-green-600' },
              { label: 'Total Loaded', value: flags.length, color: 'text-secondary-600' },
              {
                label: 'Top Merchant',
                value: flags.reduce<string>((top, f) => {
                  if (!f.merchant_name) return top;
                  return f.occurrence_count > (flags.find(g => g.merchant_name === top)?.occurrence_count ?? 0)
                    ? f.merchant_name
                    : top;
                }, '—'),
                color: 'text-secondary-600',
              },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-secondary-200 px-4 py-3">
                <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wide">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mb-4 bg-white border border-secondary-200 rounded-lg p-1 w-fit">
            {(['pending', 'approved', 'rejected', 'merged', 'all'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-primary-600 text-white'
                    : 'text-secondary-500 hover:text-secondary-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Flags table */}
          <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden">
            {loadingFlags ? (
              <div className="py-12 text-center text-secondary-400 text-sm">Loading…</div>
            ) : flags.length === 0 ? (
              <div className="py-12 text-center text-secondary-400 text-sm">No flags found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary-50 border-b border-secondary-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-secondary-500 uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-secondary-500 uppercase tracking-wide">Merchant</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-secondary-500 uppercase tracking-wide">User's Suggestion</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-secondary-500 uppercase tracking-wide">Global Mapping</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-secondary-500 uppercase tracking-wide">Count</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-secondary-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {flags.map(flag => (
                      <tr key={flag.id} className="hover:bg-secondary-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs font-medium text-secondary-600">
                            {FLAG_TYPE_LABELS[flag.flag_type] ?? flag.flag_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-secondary-800 font-medium">
                          {flag.merchant_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-secondary-600">
                          {flag.user_suggested_category ?? '—'}
                          {flag.user_suggested_subcategory && (
                            <span className="text-secondary-400"> / {flag.user_suggested_subcategory}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-secondary-400">
                          {flag.existing_global_mapping ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-secondary-600 font-semibold">
                          {flag.occurrence_count}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[flag.status] ?? ''}`}>
                            {flag.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {flag.status === 'pending' && (
                            <div className="flex gap-2 items-center">
                              <button
                                disabled={actionId === flag.id}
                                onClick={() => handleAction(flag.id, 'approved')}
                                className="text-xs text-green-600 font-semibold hover:text-green-800 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                disabled={actionId === flag.id}
                                onClick={() => handleAction(flag.id, 'rejected')}
                                className="text-xs text-red-500 font-semibold hover:text-red-700 disabled:opacity-50"
                              >
                                Reject
                              </button>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={mergeNote[flag.id] ?? ''}
                                  onChange={e => setMergeNote(prev => ({ ...prev, [flag.id]: e.target.value }))}
                                  placeholder="Merge into…"
                                  className="border border-secondary-200 rounded px-2 py-0.5 text-xs text-secondary-800 w-28 focus:outline-none focus:ring-1 focus:ring-primary-400"
                                />
                                <button
                                  disabled={actionId === flag.id || !mergeNote[flag.id]?.trim()}
                                  onClick={() => handleAction(flag.id, 'merged', mergeNote[flag.id])}
                                  className="text-xs text-blue-500 font-semibold hover:text-blue-700 disabled:opacity-50"
                                >
                                  Merge
                                </button>
                              </div>
                            </div>
                          )}
                          {flag.admin_notes && (
                            <p className="text-xs text-secondary-400 mt-1 italic">{flag.admin_notes}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
    </AdminLayout>
  );
}
