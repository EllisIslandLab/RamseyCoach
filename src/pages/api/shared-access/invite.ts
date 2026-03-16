import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { inviteEmail } from '@/lib/emailTemplates';

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

  const { partner_email, access_type } = req.body as {
    partner_email: string;
    access_type: 'spouse' | 'accountability';
  };

  if (!partner_email || !access_type) {
    return res.status(400).json({ error: 'Missing partner_email or access_type' });
  }

  if (partner_email.toLowerCase() === user.email?.toLowerCase()) {
    return res.status(400).json({ error: 'You cannot invite yourself' });
  }

  // Block duplicate active/pending invites from this owner
  const { data: existing } = await supabaseAdmin
    .from('shared_access')
    .select('id, status')
    .eq('owner_id', user.id)
    .eq('partner_email', partner_email.toLowerCase())
    .neq('status', 'declined')
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'An invite for this email already exists' });
  }

  // Create the invite row
  const { data: invite, error: insertError } = await supabaseAdmin
    .from('shared_access')
    .insert({
      owner_id: user.id,
      partner_email: partner_email.toLowerCase(),
      access_type,
    })
    .select()
    .single();

  if (insertError || !invite) {
    return res.status(500).json({ error: 'Failed to create invite' });
  }

  const acceptUrl = `${APP_URL}/shared-access/accept?token=${invite.invite_token}`;
  const ownerName = (user.user_metadata?.display_name as string | undefined) || user.email!;
  const { subject, html } = inviteEmail({ ownerName, accessType: access_type, acceptUrl });

  await resend.emails.send({
    from: FROM,
    replyTo: user.email!,
    to: partner_email,
    subject,
    html,
  });

  return res.status(200).json({ success: true });
}
