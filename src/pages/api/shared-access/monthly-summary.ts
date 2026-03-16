/**
 * POST /api/shared-access/monthly-summary
 * Sends a monthly budget summary to the accountability partner.
 * Can be triggered manually from Account Settings, or automated via a cron job
 * (e.g. call this endpoint on the last day of each month via cron-job.org or Vercel cron).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { monthlySummaryEmail, type MonthlyCategorySummary } from '@/lib/emailTemplates';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'Money-Willo <noreply@moneywillo.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function getBudgetedForCategory(categoryName: string, budgetData: Record<string, unknown>): number {
  const cn = categoryName.toLowerCase();
  function labelMatches(label: string): boolean {
    const l = label.toLowerCase();
    if (cn.includes('housing') || cn.includes('mortgage')) return l.includes('mortgage') || l.includes('housing');
    if (cn.includes('auto') || cn.includes('transport')) return l.includes('auto') || l.includes('car') || l.includes('transport');
    if (cn.includes('giving') || cn.includes('charity')) return l.includes('giv') || l.includes('charit') || l.includes('tithe');
    if (cn.includes('entertainment') || cn.includes('subscription')) return l.includes('subscri') || l.includes('entertain') || l.includes('stream');
    if (cn.includes('miscellaneous') || cn.includes('personal')) return l.includes('spend') || l.includes('discret') || l.includes('misc');
    if (cn.includes('utilities') || cn.includes('food') || cn.includes('grocery')) return l.includes('necessit') || l.includes('utilit') || l.includes('groceri');
    if (cn.includes('saving')) return l.includes('saving');
    return false;
  }
  interface AmtRow { amount: string }
  interface SubsectionData { label: string; rows: AmtRow[] }
  const nv = (s: string) => parseFloat(String(s).replace(/[^0-9.-]/g, '')) || 0;
  let total = 0;
  for (const sub of [...((budgetData.fixedSubs ?? []) as SubsectionData[]), ...((budgetData.varSubs ?? []) as SubsectionData[])]) {
    if (labelMatches(sub.label)) total += sub.rows.reduce((s, r) => s + nv(r.amount), 0);
  }
  if (cn.includes('saving')) {
    total += ((budgetData.savings ?? []) as AmtRow[]).reduce((s, r) => s + nv(r.amount), 0);
  }
  return total;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { shared_access_id } = req.body as { shared_access_id: string };
  if (!shared_access_id) return res.status(400).json({ error: 'Missing shared_access_id' });

  const { data: share } = await supabaseAdmin
    .from('shared_access')
    .select('*')
    .eq('id', shared_access_id)
    .eq('owner_id', user.id)
    .eq('access_type', 'accountability')
    .eq('status', 'active')
    .maybeSingle();

  if (!share) return res.status(404).json({ error: 'Sharing relationship not found' });
  if (!share.partner_id) return res.status(400).json({ error: 'Partner has not accepted yet' });

  const settings = share.accountability_settings as {
    tracked_categories: Array<{ category: string; threshold: number }>;
  } | null;

  if (!settings?.tracked_categories?.length) {
    return res.status(400).json({ error: 'No tracked categories configured' });
  }

  // Load budget data
  const { data: toolData } = await supabaseAdmin
    .from('user_tool_data')
    .select('budget_data')
    .eq('user_id', user.id)
    .maybeSingle();

  const budgetData = (toolData?.budget_data ?? {}) as Record<string, unknown>;

  // Load this month's transactions
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: transactions } = await supabaseAdmin
    .from('user_transactions')
    .select('amount, resolved_category_id')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate);

  const { data: categories } = await supabaseAdmin.from('global_categories').select('id, name');
  const catNameById: Record<string, string> = {};
  for (const c of categories ?? []) catNameById[c.id] = c.name;

  const actualByCat: Record<string, number> = {};
  for (const tx of transactions ?? []) {
    const name = catNameById[tx.resolved_category_id];
    if (!name) continue;
    actualByCat[name] = (actualByCat[name] ?? 0) + Number(tx.amount);
  }

  // Build summary rows for tracked categories
  const summaryCategories: MonthlyCategorySummary[] = settings.tracked_categories.map((tc) => ({
    category: tc.category,
    budgeted: getBudgetedForCategory(tc.category, budgetData),
    actual: actualByCat[tc.category] ?? 0,
  }));

  const { data: { user: partner } } = await supabaseAdmin.auth.admin.getUserById(share.partner_id);
  if (!partner?.email) return res.status(400).json({ error: 'Partner has no email' });

  const ownerName = (user.user_metadata?.display_name as string | undefined) || user.email!;
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const { subject, html } = monthlySummaryEmail({
    ownerName,
    monthLabel,
    categories: summaryCategories,
    appUrl: APP_URL,
  });

  await resend.emails.send({
    from: FROM,
    replyTo: user.email!,
    to: partner.email,
    subject,
    html,
  });

  return res.status(200).json({ success: true, categories_included: summaryCategories.length });
}
