/**
 * /api/admin/flags
 * GET  — returns all flags (optionally filtered by status)
 * PATCH — updates a flag's status/admin_notes
 * Only accessible to users with app_metadata.role === 'admin'
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getRequestUser(req: NextApiRequest) {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getRequestUser(req);
  if (!user || user.app_metadata?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'GET') {
    const { status } = req.query;
    let query = supabaseAdmin
      .from('categorization_flags')
      .select('*')
      .order('created_at', { ascending: false });
    if (status && typeof status === 'string') query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'PATCH') {
    const { id, status, admin_notes } = req.body as {
      id: string;
      status: string;
      admin_notes?: string;
    };
    if (!id || !status) return res.status(400).json({ error: 'id and status required' });
    const { error } = await supabaseAdmin
      .from('categorization_flags')
      .update({ status, admin_notes: admin_notes ?? null, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
