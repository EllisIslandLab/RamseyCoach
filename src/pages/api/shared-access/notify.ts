/**
 * POST /api/shared-access/notify
 * Called by BudgetPlanner when a budget is saved and an active sharing relationship exists.
 * Diffs old vs new budget, stores a notification row, and emails the other partner.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { budgetChangeEmail } from '@/lib/emailTemplates';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'Money-Willo <noreply@moneywillo.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ─── Budget diff ──────────────────────────────────────────────────────────────

interface BudgetCategory {
  name: string;
  budgeted?: number;
  planned?: number;
  [key: string]: unknown;
}

function diffBudgets(
  oldBudget: Record<string, unknown>,
  newBudget: Record<string, unknown>
): string[] {
  const changes: string[] = [];

  // Compare income
  const oldIncome = Number(oldBudget.monthlyIncome ?? oldBudget.income ?? 0);
  const newIncome = Number(newBudget.monthlyIncome ?? newBudget.income ?? 0);
  if (Math.abs(oldIncome - newIncome) > 0.5) {
    changes.push(`Monthly income: $${oldIncome.toLocaleString()} → $${newIncome.toLocaleString()}`);
  }

  // Compare categories (handles array-of-categories structure)
  const oldCats = (oldBudget.categories ?? []) as BudgetCategory[];
  const newCats = (newBudget.categories ?? []) as BudgetCategory[];

  const oldMap = new Map(oldCats.map((c) => [c.name, c]));
  const newMap = new Map(newCats.map((c) => [c.name, c]));

  for (const [name, newCat] of newMap) {
    const oldCat = oldMap.get(name);
    const newAmt = Number(newCat.budgeted ?? newCat.planned ?? 0);
    if (!oldCat) {
      changes.push(`${name}: added ($${newAmt.toLocaleString()})`);
    } else {
      const oldAmt = Number(oldCat.budgeted ?? oldCat.planned ?? 0);
      if (Math.abs(oldAmt - newAmt) > 0.5) {
        changes.push(`${name}: $${oldAmt.toLocaleString()} → $${newAmt.toLocaleString()}`);
      }
    }
  }
  for (const [name] of oldMap) {
    if (!newMap.has(name)) changes.push(`${name}: removed`);
  }

  return changes;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { shared_access_id, old_budget, new_budget } = req.body as {
    shared_access_id: string;
    old_budget: Record<string, unknown>;
    new_budget: Record<string, unknown>;
  };

  if (!shared_access_id || !new_budget) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Verify the shared_access row belongs to this user
  const { data: share } = await supabaseAdmin
    .from('shared_access')
    .select('*')
    .eq('id', shared_access_id)
    .eq('status', 'active')
    .maybeSingle();

  if (!share) return res.status(404).json({ error: 'Sharing relationship not found' });
  if (share.owner_id !== user.id && share.partner_id !== user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const changes = old_budget ? diffBudgets(old_budget, new_budget) : ['Budget updated'];
  if (changes.length === 0) return res.status(200).json({ skipped: true, reason: 'No changes detected' });

  const changeSummary = changes.join('\n');
  const payload = { changes, changed_by: user.email };

  // Create notification row
  const { data: notification, error: notifError } = await supabaseAdmin
    .from('budget_notifications')
    .insert({
      shared_access_id,
      type: 'budget_change',
      payload,
    })
    .select()
    .single();

  if (notifError || !notification) {
    return res.status(500).json({ error: 'Failed to create notification' });
  }

  // Determine recipient (the other partner)
  const recipientId = share.owner_id === user.id ? share.partner_id : share.owner_id;
  if (!recipientId) return res.status(200).json({ skipped: true, reason: 'Partner not yet active' });

  const { data: { user: recipient } } = await supabaseAdmin.auth.admin.getUserById(recipientId);
  if (!recipient?.email) return res.status(200).json({ skipped: true, reason: 'Recipient has no email' });

  const senderName =
    (user.user_metadata?.display_name as string | undefined) || user.email!;

  const responseBase = `${APP_URL}/budget-response?token=${notification.response_token}`;
  const { subject, html } = budgetChangeEmail({
    senderName,
    changes,
    approveUrl: `${responseBase}&action=approved`,
    discussUrl: `${responseBase}&action=discuss`,
    meetingUrl: `${responseBase}&action=meeting`,
    appUrl: APP_URL,
  });

  await resend.emails.send({
    from: FROM,
    replyTo: user.email!,
    to: recipient.email,
    subject,
    html,
  });

  return res.status(200).json({ success: true, changes_count: changes.length });
}
