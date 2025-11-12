import type { NextApiRequest, NextApiResponse } from 'next';
import { createConsultation, Consultation } from '@/lib/airtable';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const consultation: Consultation = req.body;

    // Validate required fields
    if (
      !consultation.firstName ||
      !consultation.lastName ||
      !consultation.email ||
      !consultation.dateBooked ||
      !consultation.timeSlotStart ||
      !consultation.timeSlotEnd
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await createConsultation(consultation);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
}
