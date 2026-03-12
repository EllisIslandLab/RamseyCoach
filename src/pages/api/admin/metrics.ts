/**
 * /api/admin/metrics
 * GET — returns DB stats for the admin dashboard.
 * Uses JWT bearer auth (same pattern as /api/admin/flags).
 * For external uptime monitoring, use /api/admin/health?token=... instead.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getRequestUser(req: NextApiRequest) {
  const token = (req.headers.authorization ?? '').replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const user = await getRequestUser(req);
  if (!user || user.app_metadata?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const [pendingFlags, allFlags, transactions, budgetUsers] = await Promise.all([
      supabaseAdmin
        .from('categorization_flags')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabaseAdmin
        .from('categorization_flags')
        .select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('user_transactions')
        .select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('user_tool_data')
        .select('user_id', { count: 'exact', head: true }),
    ]);

    return res.status(200).json({
      pending_flags:      pendingFlags.count  ?? 0,
      total_flags:        allFlags.count       ?? 0,
      total_transactions: transactions.count   ?? 0,
      total_budget_users: budgetUsers.count    ?? 0,
      fetched_at:         new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
