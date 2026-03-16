import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query as { id: string };

  // Only the owner can delete the relationship
  const { error } = await supabaseAdmin
    .from('shared_access')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id);

  if (error) return res.status(500).json({ error: 'Failed to remove sharing' });

  return res.status(200).json({ success: true });
}
