import type { NextApiRequest, NextApiResponse } from 'next';
import { getAvailableSlots } from '@/lib/airtable';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const date = req.query.date as string;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const slots = await getAvailableSlots(date);
    res.status(200).json(slots);
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
}
