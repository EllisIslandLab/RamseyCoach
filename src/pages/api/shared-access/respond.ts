/**
 * POST /api/shared-access/respond
 * Called from the budget-response page when a partner responds to a budget change email.
 * No auth required — response token is the credential.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { budgetResponseEmail } from '@/lib/emailTemplates';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'Money-Willo <noreply@moneywillo.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { token, action } = req.body as {
    token: string;
    action: 'approved' | 'discuss' | 'meeting';
  };

  if (!token || !action) return res.status(400).json({ error: 'Missing token or action' });
  if (!['approved', 'discuss', 'meeting'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  // Look up the notification
  const { data: notification, error: notifError } = await supabaseAdmin
    .from('budget_notifications')
    .select('*, shared_access(*)')
    .eq('response_token', token)
    .maybeSingle();

  if (notifError || !notification) return res.status(404).json({ error: 'Notification not found' });
  if (notification.response) return res.status(410).json({ error: 'Already responded' });

  // Record the response
  const { error: updateError } = await supabaseAdmin
    .from('budget_notifications')
    .update({ response: action, responded_at: new Date().toISOString() })
    .eq('id', notification.id);

  if (updateError) return res.status(500).json({ error: 'Failed to record response' });

  // Notify the person who made the budget change
  const share = notification.shared_access as Record<string, string>;
  const changerId = (notification.payload as Record<string, string>)?.changed_by_id ?? share.owner_id;

  // Find who made the change — owner or partner
  const { data: { user: owner } } = await supabaseAdmin.auth.admin.getUserById(share.owner_id);
  const partnerEmail = share.partner_id
    ? (await supabaseAdmin.auth.admin.getUserById(share.partner_id)).data.user?.email
    : null;

  // The changer is whoever is NOT the responder — send notification to the other person
  const responderEmail = await (async () => {
    if (share.partner_id) {
      const { data: { user: p } } = await supabaseAdmin.auth.admin.getUserById(share.partner_id);
      return p?.email;
    }
    return null;
  })();

  // Determine who changed the budget (owner or partner) to notify them of the response
  const changerEmail = responderEmail === owner?.email ? partnerEmail : owner?.email;

  if (changerEmail) {
    const changes = (notification.payload as { changes?: string[] })?.changes ?? [];
    const { subject, html } = budgetResponseEmail({ action, changes, appUrl: APP_URL });
    await resend.emails.send({ from: FROM, to: changerEmail, subject, html });
  }

  return res.status(200).json({ success: true, action });
}
