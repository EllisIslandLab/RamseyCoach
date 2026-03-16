/**
 * POST /api/cron/check-in-reminders
 * Runs daily (via Vercel cron) to send accountability check-in reminder emails.
 * Protected by CRON_SECRET env var — Vercel sets Authorization: Bearer <secret> automatically.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { checkInReminderEmail } from '@/lib/emailTemplates';
import type { AccountabilitySettings } from '@/lib/dataService';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'Money-Willo <noreply@moneywillo.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const SCHEDULE_LABELS: Record<string, string> = {
  weekly: 'weekly',
  biweekly: 'bi-weekly',
  monthly: 'monthly',
};

function isDueToday(settings: AccountabilitySettings): boolean {
  const { check_in_schedule, check_in_day } = settings;
  if (!check_in_schedule) return false;

  const now = new Date();
  const dayOfWeek = now.getDay();   // 0 = Sunday
  const dayOfMonth = now.getDate(); // 1–31

  if (check_in_schedule === 'weekly') {
    return dayOfWeek === (check_in_day ?? 1);
  }

  if (check_in_schedule === 'biweekly') {
    // Fire on the configured weekday every other week.
    // Use ISO week number parity to determine "this week vs next".
    if (dayOfWeek !== (check_in_day ?? 1)) return false;
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return weekNum % 2 === 0;
  }

  if (check_in_schedule === 'monthly') {
    return dayOfMonth === (check_in_day ?? 1);
  }

  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vercel cron passes the secret automatically; manual calls must supply it too.
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Load all active accountability relationships that have a check-in schedule
  const { data: shares, error } = await supabaseAdmin
    .from('shared_access')
    .select('id, owner_id, partner_id, accountability_settings')
    .eq('access_type', 'accountability')
    .eq('status', 'active')
    .not('accountability_settings->check_in_schedule', 'is', null);

  if (error) return res.status(500).json({ error: error.message });

  let sent = 0;

  for (const share of shares ?? []) {
    const settings = share.accountability_settings as AccountabilitySettings | null;
    if (!settings?.check_in_schedule || !isDueToday(settings)) continue;
    if (!share.partner_id) continue;

    const scheduleLabel = SCHEDULE_LABELS[settings.check_in_schedule] ?? settings.check_in_schedule;

    // Fetch owner + partner emails via admin auth API
    const [{ data: ownerData }, { data: partnerData }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(share.owner_id),
      supabaseAdmin.auth.admin.getUserById(share.partner_id),
    ]);

    const ownerEmail = ownerData.user?.email;
    const partnerEmail = partnerData.user?.email;
    if (!ownerEmail || !partnerEmail) continue;

    const ownerName = (ownerData.user?.user_metadata?.display_name as string | undefined) || ownerEmail;
    const partnerName = (partnerData.user?.user_metadata?.display_name as string | undefined) || partnerEmail;

    // Send to both concurrently
    await Promise.all([
      resend.emails.send({
        from: FROM,
        to: ownerEmail,
        subject: checkInReminderEmail({ ownerName, partnerName, recipientRole: 'owner', scheduleLabel, appUrl: APP_URL }).subject,
        html: checkInReminderEmail({ ownerName, partnerName, recipientRole: 'owner', scheduleLabel, appUrl: APP_URL }).html,
      }),
      resend.emails.send({
        from: FROM,
        to: partnerEmail,
        subject: checkInReminderEmail({ ownerName, partnerName, recipientRole: 'partner', scheduleLabel, appUrl: APP_URL }).subject,
        html: checkInReminderEmail({ ownerName, partnerName, recipientRole: 'partner', scheduleLabel, appUrl: APP_URL }).html,
      }),
    ]);

    sent++;
  }

  return res.status(200).json({ sent });
}
