import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, format, fileBase64 } = req.body as {
    email: string;
    format: 'xlsx' | 'ods';
    fileBase64: string;
  };

  if (!email || !fileBase64 || !format) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Money-Willo <noreply@moneywillo.com>';
  const filename = `monthly-budget.${format}`;
  const mimeType = format === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/vnd.oasis.opendocument.spreadsheet';

  try {
    await resend.emails.send({
      from,
      to: email,
      subject: 'Your Money-Willo Budget Spreadsheet',
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #292524;">
          <div style="background: #15803d; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Money-Willo</h1>
            <p style="color: #bbf7d0; margin: 4px 0 0; font-size: 14px;">Financial Coaching</p>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e7e5e4; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 16px; font-size: 16px;">Here is your budget spreadsheet, attached and ready to go.</p>
            <p style="margin: 0 0 16px; font-size: 14px; color: #57534e;">
              Your budget is a living document — revisit it every month and update it as life changes.
              The goal is a plan that tells every dollar where to go before the month begins.
            </p>
            <p style="margin: 0 0 24px; font-size: 14px; color: #57534e;">
              If you have questions or want to walk through your numbers together,
              feel free to book a free consultation at
              <a href="https://moneywillo.com" style="color: #15803d;">moneywillo.com</a>.
            </p>
            <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 0 0 16px;" />
            <p style="margin: 0; font-size: 12px; color: #a8a29e;">
              This email was sent because you requested a copy of your budget from the Money-Willo
              budget tool. Your data is never stored on our servers.
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename,
          content: fileBase64,
          contentType: mimeType,
        },
      ],
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending budget email:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
