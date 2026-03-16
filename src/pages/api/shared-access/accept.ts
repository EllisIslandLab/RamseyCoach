import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { inviteAcceptedEmail } from '@/lib/emailTemplates';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'Money-Willo <noreply@moneywillo.com>';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET — return invite details (no auth required, just the token)
  if (req.method === 'GET') {
    const { token } = req.query as { token: string };
    if (!token) return res.status(400).json({ error: 'Missing token' });

    const { data: invite, error } = await supabaseAdmin
      .from('shared_access')
      .select('id, owner_id, partner_email, access_type, status')
      .eq('invite_token', token)
      .maybeSingle();

    if (error || !invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.status !== 'pending') return res.status(410).json({ error: 'Invite already used' });

    // Get owner display name / email
    const { data: { user: owner } } = await supabaseAdmin.auth.admin.getUserById(invite.owner_id);
    const ownerName =
      (owner?.user_metadata?.display_name as string | undefined) || owner?.email || 'Someone';

    return res.status(200).json({
      id: invite.id,
      owner_name: ownerName,
      owner_email: owner?.email,
      partner_email: invite.partner_email,
      access_type: invite.access_type,
    });
  }

  // POST — accept the invite (requires auth)
  if (req.method === 'POST') {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { token } = req.body as { token: string };
    if (!token) return res.status(400).json({ error: 'Missing token' });

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('shared_access')
      .select('*')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .maybeSingle();

    if (inviteError || !invite) return res.status(404).json({ error: 'Invite not found or already used' });

    // Activate the invite
    const { error: updateError } = await supabaseAdmin
      .from('shared_access')
      .update({ status: 'active', partner_id: user.id })
      .eq('id', invite.id);

    if (updateError) return res.status(500).json({ error: 'Failed to accept invite' });

    // Notify the owner
    const { data: { user: owner } } = await supabaseAdmin.auth.admin.getUserById(invite.owner_id);
    if (owner?.email) {
      const partnerName =
        (user.user_metadata?.display_name as string | undefined) || user.email!;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const { subject, html } = inviteAcceptedEmail({
        partnerName,
        accessType: invite.access_type,
        appUrl,
      });

      await resend.emails.send({
        from: FROM,
        replyTo: user.email!,
        to: owner.email,
        subject,
        html,
      });
    }

    return res.status(200).json({ success: true, access_type: invite.access_type });
  }

  return res.status(405).end();
}
