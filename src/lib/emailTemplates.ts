/**
 * emailTemplates.ts
 * Central source for all transactional email HTML sent via Resend.
 * Each function returns { subject, html } ready to pass to resend.emails.send().
 */

const BRAND_GREEN = '#2d6a4f';
const BRAND_ORANGE = '#f4a261';
const BRAND_BLUE = '#457b9d';
const APP_NAME = 'Money-Willo';

// ─── Base layout ─────────────────────────────────────────────────────────────

function layout(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
        <tr><td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

            <!-- Header -->
            <tr>
              <td style="background:${BRAND_GREEN};border-radius:12px 12px 0 0;padding:24px 32px">
                <p style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px">${APP_NAME}</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="background:#ffffff;padding:32px;color:#1a1a1a;font-size:15px;line-height:1.6">
                ${content}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f9f9f9;border-radius:0 0 12px 12px;padding:16px 32px;border-top:1px solid #e5e7eb">
                <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5">
                  You're receiving this because you have a ${APP_NAME} account.
                  Questions? Reply to this email and we'll get back to you.
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

function btn(href: string, label: string, color: string = BRAND_GREEN): string {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:4px 6px 4px 0">${label}</a>`;
}

function changeList(changes: string[]): string {
  if (changes.length === 0) return '';
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin:16px 0">
      <tr><td style="padding:16px 20px">
        <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:2">
          ${changes.map((c) => `<li>${c}</li>`).join('')}
        </ul>
      </td></tr>
    </table>
  `;
}

// ─── Invite ───────────────────────────────────────────────────────────────────

export function inviteEmail(opts: {
  ownerName: string;
  accessType: 'spouse' | 'accountability';
  acceptUrl: string;
}): { subject: string; html: string } {
  const { ownerName, accessType, acceptUrl } = opts;
  const typeLabel = accessType === 'spouse' ? 'shared budget partner' : 'accountability partner';

  const body =
    accessType === 'spouse'
      ? `<p><strong>${ownerName}</strong> has invited you to co-manage their budget on ${APP_NAME} as a <strong>shared budget partner</strong>.</p>
         <p>You'll both have full access to edit and view the same budget, and you'll each get a friendly heads-up whenever the other makes changes.</p>`
      : `<p><strong>${ownerName}</strong> has invited you to be their <strong>accountability partner</strong> on ${APP_NAME}.</p>
         <p>You'll be able to support ${ownerName} in staying on track with the specific budget categories they've chosen to share with you.</p>`;

  return {
    subject: `${ownerName} invited you to be their ${typeLabel} on ${APP_NAME}`,
    html: layout(`
      <h2 style="margin:0 0 16px;color:${BRAND_GREEN};font-size:22px">You've been invited!</h2>
      ${body}
      <div style="margin:28px 0 8px">
        ${btn(acceptUrl, 'View Invitation')}
      </div>
      <p style="color:#6b7280;font-size:13px;margin-top:24px">If you weren't expecting this, you can safely ignore it — no account will be linked unless you click the button above.</p>
    `),
  };
}

// ─── Invite accepted ─────────────────────────────────────────────────────────

export function inviteAcceptedEmail(opts: {
  partnerName: string;
  accessType: 'spouse' | 'accountability';
  appUrl: string;
}): { subject: string; html: string } {
  const { partnerName, accessType, appUrl } = opts;
  const typeLabel = accessType === 'spouse' ? 'shared budget partner' : 'accountability partner';

  return {
    subject: `${partnerName} accepted your ${APP_NAME} invitation`,
    html: layout(`
      <h2 style="margin:0 0 16px;color:${BRAND_GREEN};font-size:22px">Invitation accepted! 🎉</h2>
      <p><strong>${partnerName}</strong> has accepted your invitation to be your ${typeLabel} on ${APP_NAME}.</p>
      ${accessType === 'spouse'
        ? `<p>You're all set — your budget is now shared. You'll both get notified when the other makes changes.</p>`
        : `<p>You're all set! Head to your account settings to configure which categories ${partnerName} can see and set any alert thresholds.</p>`
      }
      <div style="margin:28px 0 8px">
        ${btn(`${appUrl}/tools`, accessType === 'spouse' ? 'Open the shared budget' : 'Go to Account Settings')}
      </div>
    `),
  };
}

// ─── Invite declined ─────────────────────────────────────────────────────────

export function inviteDeclinedEmail(opts: {
  partnerEmail: string;
  appUrl: string;
}): { subject: string; html: string } {
  const { partnerEmail, appUrl } = opts;

  return {
    subject: `Your ${APP_NAME} invitation was declined`,
    html: layout(`
      <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px">Invitation declined</h2>
      <p>The invitation you sent to <strong>${partnerEmail}</strong> was declined.</p>
      <p>You can send a new invitation from your Account Settings at any time.</p>
      <div style="margin:28px 0 8px">
        ${btn(`${appUrl}/account`, 'Go to Account Settings', '#6b7280')}
      </div>
    `),
  };
}

// ─── Budget change notification (spouse) ─────────────────────────────────────

export function budgetChangeEmail(opts: {
  senderName: string;
  changes: string[];
  approveUrl: string;
  discussUrl: string;
  meetingUrl: string;
  appUrl: string;
}): { subject: string; html: string } {
  const { senderName, changes, approveUrl, discussUrl, meetingUrl, appUrl } = opts;

  return {
    subject: `${senderName} updated the shared budget`,
    html: layout(`
      <h2 style="margin:0 0 16px;color:${BRAND_GREEN};font-size:22px">Budget update</h2>
      <p><strong>${senderName}</strong> made some changes to your shared budget:</p>
      ${changeList(changes)}
      <p style="margin-top:20px">How does this look to you?</p>
      <div style="margin:20px 0 8px">
        ${btn(approveUrl, 'Looks good to me ✓', BRAND_GREEN)}
        ${btn(discussUrl, 'I have thoughts 💬', BRAND_ORANGE)}
        ${btn(meetingUrl, 'Schedule a budget meeting 📅', BRAND_BLUE)}
      </div>
      <p style="color:#6b7280;font-size:13px;margin-top:24px">
        You can also <a href="${appUrl}/tools" style="color:${BRAND_GREEN}">view the full budget</a> on ${APP_NAME}.
      </p>
    `),
  };
}

// ─── Budget response notifications (back to the person who changed it) ────────

export function budgetResponseEmail(opts: {
  action: 'approved' | 'discuss' | 'meeting';
  changes: string[];
  appUrl: string;
}): { subject: string; html: string } {
  const { action, changes, appUrl } = opts;

  const content: Record<string, { subject: string; heading: string; body: string }> = {
    approved: {
      subject: `Your partner approved the budget update`,
      heading: 'Budget approved! 🎉',
      body: `<p>Your partner reviewed the recent changes and gave the thumbs up.</p><p>Great teamwork — keep it up!</p>`,
    },
    discuss: {
      subject: `Your partner wants to discuss the budget update`,
      heading: 'Your partner has some thoughts 💬',
      body: `<p>Your partner reviewed the recent changes and would like to talk them over.</p><p>Consider reaching out — a quick conversation can go a long way!</p>`,
    },
    meeting: {
      subject: `Your partner wants to schedule a budget meeting`,
      heading: 'Budget meeting requested 📅',
      body: `<p>Your partner would like to schedule a budget meeting to go over the recent changes together.</p><p>Reach out and find a time that works for both of you!</p>`,
    },
  };

  const { subject, heading, body } = content[action];

  return {
    subject,
    html: layout(`
      <h2 style="margin:0 0 16px;color:${BRAND_GREEN};font-size:22px">${heading}</h2>
      ${body}
      ${changes.length > 0 ? `
        <p style="color:#6b7280;font-size:13px;margin-top:24px">Changes that were reviewed:</p>
        ${changeList(changes)}
      ` : ''}
      <div style="margin:24px 0 8px">
        ${btn(`${appUrl}/tools`, 'View the budget')}
      </div>
    `),
  };
}

// ─── Accountability alerts (Phase 2 — triggered when actuals are updated) ────

export function overBudgetAlertEmail(opts: {
  ownerName: string;
  category: string;
  amountOver: number;
  appUrl: string;
}): { subject: string; html: string } {
  const { ownerName, category, amountOver, appUrl } = opts;
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return {
    subject: `Heads up: ${ownerName} is over budget in ${category}`,
    html: layout(`
      <h2 style="margin:0 0 16px;color:#b45309;font-size:22px">Budget alert 📣</h2>
      <p><strong>${ownerName}</strong> is currently <strong>${fmt(amountOver)} over budget</strong> in <strong>${category}</strong> this month.</p>
      <p>This might be a great time to reach out — a quick check-in can make all the difference!</p>
      <div style="background:#fffbeb;border-radius:8px;padding:16px 20px;margin:20px 0;border-left:4px solid #f59e0b">
        <p style="margin:0;font-size:14px;color:#92400e">
          Remember: your role as an accountability partner is to encourage, not judge.
          A simple "how's it going?" goes a long way. 💛
        </p>
      </div>
      <div style="margin:24px 0 8px">
        ${btn(`${appUrl}/tools`, 'View the budget', '#b45309')}
      </div>
    `),
  };
}

export function underBudgetCelebrationEmail(opts: {
  ownerName: string;
  category: string;
  amountUnder: number;
  appUrl: string;
}): { subject: string; html: string } {
  const { ownerName, category, amountUnder, appUrl } = opts;
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return {
    subject: `🎉 ${ownerName} stayed under budget in ${category} — celebrate with them!`,
    html: layout(`
      <h2 style="margin:0 0 16px;color:${BRAND_GREEN};font-size:22px">Time to celebrate! 🎉</h2>
      <p><strong>${ownerName}</strong> stayed <strong>${fmt(amountUnder)} under budget</strong> in <strong>${category}</strong> this month!</p>
      <p>That's real progress — and you're part of why it happened. Reach out and celebrate this win together!</p>
      <div style="background:#f0fdf4;border-radius:8px;padding:16px 20px;margin:20px 0;border-left:4px solid ${BRAND_GREEN}">
        <p style="margin:0;font-size:14px;color:#166534">
          Positive reinforcement matters more than you think. A quick "I'm proud of you!" can fuel the next month of progress. 💚
        </p>
      </div>
      <div style="margin:24px 0 8px">
        ${btn(`${appUrl}/tools`, 'View the budget')}
      </div>
    `),
  };
}

// ─── Accountability nudge (owner asks partner to reach out) ───────────────────

export function nudgeEmail(opts: {
  ownerName: string;
  category: string | null;
  note: string | null;
  appUrl: string;
}): { subject: string; html: string } {
  const { ownerName, category, note, appUrl } = opts;
  const subject = category
    ? `${ownerName} needs your support with ${category}`
    : `${ownerName} could use your support right now`;

  const categoryLine = category
    ? `<p>They're reaching out specifically about their <strong>${category}</strong> budget — this is a great moment to give them a call or send a quick message!</p>`
    : `<p>They're reaching out for some general accountability support — a quick call or message could make all the difference!</p>`;

  const noteLine = note
    ? `<div style="background:#f9fafb;border-radius:8px;padding:14px 18px;margin:16px 0;border-left:4px solid #d1d5db">
        <p style="margin:0;font-size:14px;color:#374151;font-style:italic">"${note}"</p>
       </div>`
    : '';

  return {
    subject,
    html: layout(`
      <h2 style="margin:0 0 16px;color:${BRAND_ORANGE};font-size:22px">Your partner needs you! 🤝</h2>
      <p><strong>${ownerName}</strong> is reaching out to their accountability partner — that's you!</p>
      ${categoryLine}
      ${noteLine}
      <div style="background:#fffbeb;border-radius:8px;padding:14px 18px;margin:20px 0;border-left:4px solid #f59e0b">
        <p style="margin:0;font-size:14px;color:#92400e">
          The fact that they're asking for support is a huge step. Your encouragement right now matters more than you know. 💛
        </p>
      </div>
      <div style="margin:24px 0 8px">
        ${btn(`${appUrl}/tools`, 'View their budget', BRAND_ORANGE)}
      </div>
    `),
  };
}

// ─── Monthly summary (sent to accountability partner at end of month) ─────────

export interface MonthlyCategorySummary {
  category: string;
  budgeted: number;
  actual: number;
}

export function monthlySummaryEmail(opts: {
  ownerName: string;
  monthLabel: string;
  categories: MonthlyCategorySummary[];
  appUrl: string;
}): { subject: string; html: string } {
  const { ownerName, monthLabel, categories, appUrl } = opts;
  const fmt = (n: number) => `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const rows = categories.map((c) => {
    const diff = c.actual - c.budgeted;
    const isOver = diff > 0;
    const isUnder = diff < 0;
    const statusColor = isOver ? '#dc2626' : isUnder ? '#16a34a' : '#6b7280';
    const statusText = isOver ? `${fmt(diff)} over` : isUnder ? `${fmt(diff)} under` : 'on budget';
    return `
      <tr>
        <td style="padding:10px 12px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #f3f4f6">${c.category}</td>
        <td style="padding:10px 12px;font-size:14px;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6">${fmt(c.budgeted)}</td>
        <td style="padding:10px 12px;font-size:14px;color:#1a1a1a;text-align:right;border-bottom:1px solid #f3f4f6">${fmt(c.actual)}</td>
        <td style="padding:10px 12px;font-size:14px;font-weight:600;color:${statusColor};text-align:right;border-bottom:1px solid #f3f4f6">${statusText}</td>
      </tr>`;
  }).join('');

  const overCount = categories.filter((c) => c.actual > c.budgeted).length;
  const underCount = categories.filter((c) => c.actual < c.budgeted).length;
  const summaryLine = overCount === 0 && underCount > 0
    ? `<p style="color:#16a34a;font-weight:600">${ownerName} stayed under budget in all tracked categories this month — that deserves a celebration! 🎉</p>`
    : overCount > 0
    ? `<p>${ownerName} went over budget in <strong style="color:#dc2626">${overCount} categor${overCount > 1 ? 'ies' : 'y'}</strong> this month. Consider reaching out to check in!</p>`
    : `<p>${ownerName} hit their budget targets across the board this month. Nice work!</p>`;

  return {
    subject: `${ownerName}'s budget summary for ${monthLabel}`,
    html: layout(`
      <h2 style="margin:0 0 16px;color:${BRAND_GREEN};font-size:22px">${monthLabel} Budget Summary</h2>
      <p>Here's how <strong>${ownerName}</strong> did on their tracked categories this month:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #f3f4f6;margin:20px 0">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Category</th>
            <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Budgeted</th>
            <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Actual</th>
            <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${summaryLine}
      <div style="background:#f0fdf4;border-radius:8px;padding:14px 18px;margin:20px 0;border-left:4px solid ${BRAND_GREEN}">
        <p style="margin:0;font-size:14px;color:#166534">
          As their accountability partner, your role is to encourage and celebrate — not judge. A quick "I'm proud of you" or "let's talk about this" goes a long way. 💚
        </p>
      </div>
      <div style="margin:24px 0 8px">
        ${btn(`${appUrl}/tools`, 'View the full budget')}
      </div>
    `),
  };
}

export function checkInReminderEmail(opts: {
  ownerName: string;
  partnerName: string;
  recipientRole: 'owner' | 'partner';
  scheduleLabel: string;
  appUrl: string;
}): { subject: string; html: string } {
  const { ownerName, partnerName, recipientRole, scheduleLabel, appUrl } = opts;
  const subject = `Time for your ${scheduleLabel} budget check-in!`;
  const greeting = recipientRole === 'owner' ? `Hi ${ownerName},` : `Hi ${partnerName},`;
  const body = recipientRole === 'owner'
    ? `Your accountability partner <strong>${partnerName}</strong> is expecting a ${scheduleLabel} budget check-in. Take a few minutes to review your budget and share an update — even a quick win counts!`
    : `This is your ${scheduleLabel} reminder to check in with <strong>${ownerName}</strong> on their budget. A little encouragement goes a long way. 💚`;

  return {
    subject,
    html: layout(`
      <p style="margin:0 0 20px">${greeting}</p>
      <p style="margin:0 0 20px">${body}</p>
      <div style="background:#f0fdf4;border-radius:8px;padding:14px 18px;margin:20px 0;border-left:4px solid ${BRAND_GREEN}">
        <p style="margin:0;font-size:14px;color:#166534">
          Consistent check-ins are one of the biggest predictors of financial success. You're doing great by showing up.
        </p>
      </div>
      <div style="margin:24px 0 8px">
        ${btn(`${appUrl}/tools`, 'Open Budget Planner')}
      </div>
    `),
  };
}
