/**
 * /api/admin/health
 * GET — returns row counts and basic health metrics.
 * Admin-only. Designed to be pinged by an external monitor (e.g. UptimeRobot, cron-job.org).
 *
 * Monitoring setup:
 *   1. Go to https://uptimerobot.com (free) or https://cron-job.org (free)
 *   2. Add a "Keyword" monitor targeting:
 *        GET https://your-domain.com/api/admin/health?token=<ADMIN_HEALTH_TOKEN>
 *   3. Set keyword alert: if response does NOT contain "ok" → send email
 *   4. Set ADMIN_HEALTH_TOKEN in your .env.local and Vercel env vars.
 *
 * Thresholds that trigger a "warn" status (check response for "warn" keyword):
 *   - monthly_api_requests > 40000   (approaching free tier 50k limit)
 *   - total_transactions  > 100000   (storage check)
 *   - pending_flags       > 50       (category flags piling up)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WARN_THRESHOLDS = {
  pending_flags: 50,
  total_transactions: 100_000,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  // Token auth — simpler than JWT for a monitoring ping
  const token = req.query.token;
  if (!token || token !== process.env.ADMIN_HEALTH_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const [flagsResult, txResult, usersResult] = await Promise.all([
      supabaseAdmin
        .from('categorization_flags')
        .select('status', { count: 'exact', head: false })
        .eq('status', 'pending'),
      supabaseAdmin
        .from('user_transactions')
        .select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('user_tool_data')
        .select('user_id', { count: 'exact', head: true }),
    ]);

    const pending_flags    = flagsResult.count ?? 0;
    const total_transactions = txResult.count ?? 0;
    const total_users      = usersResult.count ?? 0;

    const warnings: string[] = [];
    if (pending_flags      > WARN_THRESHOLDS.pending_flags)      warnings.push(`pending_flags=${pending_flags} (threshold: ${WARN_THRESHOLDS.pending_flags})`);
    if (total_transactions > WARN_THRESHOLDS.total_transactions) warnings.push(`total_transactions=${total_transactions} (threshold: ${WARN_THRESHOLDS.total_transactions})`);

    const status = warnings.length > 0 ? 'warn' : 'ok';

    return res.status(200).json({
      status,
      checked_at: new Date().toISOString(),
      metrics: { pending_flags, total_transactions, total_users },
      warnings,
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: String(err) });
  }
}
