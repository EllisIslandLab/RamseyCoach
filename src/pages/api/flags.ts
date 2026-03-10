/**
 * /api/flags
 * Receives flag payloads from navigator.sendBeacon on page unload.
 * Uses service role to write to categorization_flags (RLS blocks client writes).
 * Increments occurrence_count when the same merchant+flag_type already exists.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { FlagPayload } from '@/lib/dataService';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    let flags: FlagPayload[];
    try {
      const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      flags = JSON.parse(raw);
      if (!Array.isArray(flags)) return res.status(400).end();
    } catch {
      return res.status(400).end();
    }

    for (const flag of flags) {
      if (!flag.flag_type) continue;

      // Try to increment occurrence_count if same merchant+type already pending
      if (flag.merchant_name) {
        const { data: existing } = await supabaseAdmin
          .from('categorization_flags')
          .select('id, occurrence_count')
          .eq('flag_type', flag.flag_type)
          .eq('merchant_name', flag.merchant_name)
          .eq('status', 'pending')
          .maybeSingle();

        if (existing) {
          await supabaseAdmin
            .from('categorization_flags')
            .update({ occurrence_count: existing.occurrence_count + 1 })
            .eq('id', existing.id);
          continue;
        }
      }

      await supabaseAdmin.from('categorization_flags').insert(flag);
    }

    res.status(200).end();
  } catch {
    // Fail silently — never surface errors
    res.status(200).end();
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '50kb' } },
};
