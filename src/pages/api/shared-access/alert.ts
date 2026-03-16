/**
 * POST /api/shared-access/alert
 * Called after a budget save. Checks actual transaction totals against
 * accountability partner thresholds and sends alert emails where needed.
 *
 * Uses the current calendar month's transactions. If no transactions have
 * been imported yet, this is a no-op (no false alerts).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { overBudgetAlertEmail, underBudgetCelebrationEmail } from '@/lib/emailTemplates';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'Money-Willo <noreply@moneywillo.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ─── Category → subsection label mapping (mirrors BudgetPlanner's getTxCategories) ──

function getBudgetedForCategory(
  categoryName: string,
  budgetData: Record<string, unknown>
): number {
  const cn = categoryName.toLowerCase();

  // Determine which subsection labels map to this global category
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
  const fixedSubs = (budgetData.fixedSubs ?? []) as SubsectionData[];
  const varSubs = (budgetData.varSubs ?? []) as SubsectionData[];

  for (const sub of [...fixedSubs, ...varSubs]) {
    if (labelMatches(sub.label)) {
      total += sub.rows.reduce((s, r) => s + nv(r.amount), 0);
    }
  }

  // Savings rows (flat array)
  if (cn.includes('saving')) {
    const savings = (budgetData.savings ?? []) as AmtRow[];
    total += savings.reduce((s, r) => s + nv(r.amount), 0);
  }

  return total;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Find active accountability relationships where this user is the owner
  const { data: shares } = await supabaseAdmin
    .from('shared_access')
    .select('*')
    .eq('owner_id', user.id)
    .eq('access_type', 'accountability')
    .eq('status', 'active');

  if (!shares || shares.length === 0) {
    return res.status(200).json({ skipped: true, reason: 'No active accountability relationships' });
  }

  // Load owner's budget data
  const { data: toolData } = await supabaseAdmin
    .from('user_tool_data')
    .select('budget_data')
    .eq('user_id', user.id)
    .maybeSingle();

  const budgetData = (toolData?.budget_data ?? {}) as Record<string, unknown>;

  // Load this month's transactions grouped by global category name
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

  if (!transactions || transactions.length === 0) {
    return res.status(200).json({ skipped: true, reason: 'No transactions this month' });
  }

  // Map category id → name
  const { data: categories } = await supabaseAdmin
    .from('global_categories')
    .select('id, name');

  const catNameById: Record<string, string> = {};
  for (const c of categories ?? []) catNameById[c.id] = c.name;

  // Group actual spending by category name
  const actualByCat: Record<string, number> = {};
  for (const tx of transactions) {
    const name = catNameById[tx.resolved_category_id];
    if (!name) continue;
    actualByCat[name] = (actualByCat[name] ?? 0) + Number(tx.amount);
  }

  const ownerName = (user.user_metadata?.display_name as string | undefined) || user.email!;
  const alertsSent: string[] = [];

  for (const share of shares) {
    const settings = share.accountability_settings as {
      tracked_categories: Array<{
        category: string;
        threshold: number;
        notify_owner: boolean;
        notify_partner: boolean;
      }>;
    } | null;

    if (!settings?.tracked_categories?.length) continue;

    const { data: { user: partner } } = await supabaseAdmin.auth.admin.getUserById(share.partner_id);
    if (!partner?.email) continue;

    for (const tracked of settings.tracked_categories) {
      const actual = actualByCat[tracked.category] ?? 0;
      if (actual === 0) continue; // No transactions in this category yet

      const budgeted = getBudgetedForCategory(tracked.category, budgetData);
      const overage = actual - budgeted;

      const recipients: string[] = [];
      if (tracked.notify_partner) recipients.push(partner.email);
      if (tracked.notify_owner && user.email) recipients.push(user.email);

      if (recipients.length === 0) continue;

      if (overage > tracked.threshold) {
        // Over budget alert
        const { subject, html } = overBudgetAlertEmail({
          ownerName,
          category: tracked.category,
          amountOver: Math.round(overage),
          appUrl: APP_URL,
        });

        for (const to of recipients) {
          await resend.emails.send({ from: FROM, to, subject, html });
        }

        // Record the notification
        await supabaseAdmin.from('budget_notifications').insert({
          shared_access_id: share.id,
          type: 'over_budget',
          category: tracked.category,
          payload: { actual, budgeted, overage: Math.round(overage), threshold: tracked.threshold },
        });

        alertsSent.push(`over_budget:${tracked.category}`);
      } else if (budgeted > 0 && actual <= budgeted && month === now.getMonth() + 1) {
        // Under budget — only celebrate at end of month (last 3 days)
        const isEndOfMonth = now.getDate() >= lastDay - 2;
        if (isEndOfMonth) {
          const { subject, html } = underBudgetCelebrationEmail({
            ownerName,
            category: tracked.category,
            amountUnder: Math.round(budgeted - actual),
            appUrl: APP_URL,
          });

          for (const to of recipients) {
            await resend.emails.send({ from: FROM, to, subject, html });
          }

          await supabaseAdmin.from('budget_notifications').insert({
            shared_access_id: share.id,
            type: 'under_budget',
            category: tracked.category,
            payload: { actual, budgeted, amountUnder: Math.round(budgeted - actual) },
          });

          alertsSent.push(`under_budget:${tracked.category}`);
        }
      }
    }
  }

  return res.status(200).json({ success: true, alerts_sent: alertsSent });
}
