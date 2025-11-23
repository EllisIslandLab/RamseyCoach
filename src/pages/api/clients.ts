import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, ClientFormData } from '@/lib/airtable';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clientData: ClientFormData = req.body;

    // Validate required fields
    if (
      !clientData.firstName ||
      !clientData.lastName ||
      !clientData.email ||
      !clientData.reasonForVisit ||
      clientData.consent !== true
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientData.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const result = await createClient(clientData);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
}
