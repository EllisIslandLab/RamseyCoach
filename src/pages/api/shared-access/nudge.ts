import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { nudgeEmail } from '@/lib/emailTemplates';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'Money-Willo <noreply@moneywillo.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { shared_access_id, category, note } = req.body as {
    shared_access_id: string;
    category?: string;
    note?: string;
  };

  if (!shared_access_id) return res.status(400).json({ error: 'Missing shared_access_id' });

  // Verify this user is the owner
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

  const { data: { user: partner } } = await supabaseAdmin.auth.admin.getUserById(share.partner_id);
  if (!partner?.email) return res.status(400).json({ error: 'Partner has no email' });

  const ownerName = (user.user_metadata?.display_name as string | undefined) || user.email!;
  const { subject, html } = nudgeEmail({
    ownerName,
    category: category?.trim() || null,
    note: note?.trim() || null,
    appUrl: APP_URL,
  });

  await resend.emails.send({
    from: FROM,
    replyTo: user.email!,
    to: partner.email,
    subject,
    html,
  });

  // Record in budget_notifications
  await supabaseAdmin.from('budget_notifications').insert({
    shared_access_id,
    type: 'nudge',
    category: category?.trim() || null,
    payload: { note: note?.trim() || null, sent_by: user.email },
  });

  return res.status(200).json({ success: true });
}
