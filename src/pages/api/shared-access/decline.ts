import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { inviteDeclinedEmail } from '@/lib/emailTemplates';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'Money-Willo <noreply@moneywillo.com>';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { token } = req.body as { token: string };
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('shared_access')
    .select('*')
    .eq('invite_token', token)
    .eq('status', 'pending')
    .maybeSingle();

  if (inviteError || !invite) return res.status(404).json({ error: 'Invite not found or already used' });

  const { error: updateError } = await supabaseAdmin
    .from('shared_access')
    .update({ status: 'declined' })
    .eq('id', invite.id);

  if (updateError) return res.status(500).json({ error: 'Failed to decline invite' });

  // Notify the owner
  const { data: { user: owner } } = await supabaseAdmin.auth.admin.getUserById(invite.owner_id);
  if (owner?.email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { subject, html } = inviteDeclinedEmail({ partnerEmail: invite.partner_email, appUrl });
    await resend.emails.send({ from: FROM, to: owner.email, subject, html });
  }

  return res.status(200).json({ success: true });
}
