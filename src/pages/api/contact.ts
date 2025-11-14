import type { NextApiRequest, NextApiResponse } from 'next';
import { createContactSubmission, ContactFormData } from '@/lib/airtable';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { Name, Email, Phone, Subject, Message } = req.body;

    // Validate required fields
    if (!Name || typeof Name !== 'string' || Name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!Email || typeof Email !== 'string' || Email.trim() === '') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const formData: ContactFormData = {
      Name: Name.trim(),
      Email: Email.trim(),
      Phone: Phone?.trim(),
      Subject: Subject?.trim(),
      Message: Message?.trim(),
    };

    const result = await createContactSubmission(formData);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating contact submission:', error);
    res.status(500).json({ error: 'Failed to submit contact form' });
  }
}
