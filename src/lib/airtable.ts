import Airtable from 'airtable';

// Lazy initialization of Airtable client
let base: ReturnType<Airtable['base']> | null = null;

function getBase() {
  if (!base) {
    if (!process.env.AIRTABLE_API_TOKEN || !process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID) {
      throw new Error('Airtable credentials are not configured. Please set AIRTABLE_API_TOKEN and NEXT_PUBLIC_AIRTABLE_BASE_ID in your .env.local file.');
    }
    base = new Airtable({
      apiKey: process.env.AIRTABLE_API_TOKEN,
    }).base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID);
  }
  return base;
}

// Table names
const TABLES = {
  CONSULTATIONS: process.env.AIRTABLE_CONSULTATIONS_TABLE || 'Free_Consultations',
  CONTACTS: process.env.AIRTABLE_CONTACTS_TABLE || 'Contacts',
  TESTIMONIALS: process.env.AIRTABLE_TESTIMONIALS_TABLE || 'Testimonials',
};

// Type definitions
export interface Testimonial {
  id: string;
  firstName: string;
  lastName: string;
  note: string;
  createdAt: string;
}

export interface Consultation {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  bookingType: 'Free Consultation' | 'Paid Consultation';
  dateBooked: string; // YYYY-MM-DD format
  timeSlotStart: string; // HH:MM format in EST
  timeSlotEnd: string; // HH:MM format in EST
  userTimezone?: string;
  userLocalTime?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

/**
 * Fetch testimonials from Airtable
 * @param limit - Maximum number of testimonials to fetch
 * @param _offset - Number of records to skip (for pagination) - not currently implemented
 */
export async function getTestimonials(
  limit: number = 10,
  _offset: number = 0
): Promise<Testimonial[]> {
  try {
    const records = await getBase()(TABLES.TESTIMONIALS)
      .select({
        maxRecords: limit,
        pageSize: limit,
        sort: [{ field: 'createdAt', direction: 'desc' }],
      })
      .all();

    return records.map((record) => ({
      id: record.id,
      firstName: record.get('firstName') as string,
      lastName: record.get('lastName') as string,
      note: record.get('note') as string,
      createdAt: record.get('createdAt') as string,
    }));
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    throw new Error('Failed to fetch testimonials');
  }
}

/**
 * Fetch available time slots for a specific date
 * @param date - Date in YYYY-MM-DD format
 * @returns Array of available time slots
 */
export async function getAvailableSlots(date: string): Promise<TimeSlot[]> {
  try {
    // Generate all possible hourly slots from 9 AM - 5 PM
    const allSlots: TimeSlot[] = [];
    for (let hour = 9; hour < 17; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      allSlots.push({
        start: startTime,
        end: endTime,
        available: true,
      });
    }

    // Fetch existing bookings for this date
    const records = await getBase()(TABLES.CONSULTATIONS)
      .select({
        filterByFormula: `{dateBooked} = '${date}'`,
      })
      .all();

    // Get booked time slots
    const bookedSlots = records.map((record) => ({
      start: record.get('timeSlotStart') as string,
      end: record.get('timeSlotEnd') as string,
    }));

    // Mark slots as unavailable if they're booked
    allSlots.forEach((slot) => {
      const isBooked = bookedSlots.some(
        (booked) => booked.start === slot.start
      );
      if (isBooked) {
        slot.available = false;
      }
    });

    return allSlots;
  } catch (error) {
    console.error('Error fetching available slots:', error);
    throw new Error('Failed to fetch available slots');
  }
}

/**
 * Create a new consultation booking
 * @param consultation - Consultation details
 * @returns Created consultation record
 */
export async function createConsultation(
  consultation: Consultation
): Promise<{ id: string; success: boolean }> {
  try {
    // Format date as MM/DD/YYYY
    const [year, month, day] = consultation.dateBooked.split('-');
    const formattedDate = `${month}/${day}/${year}`;

    // Combine date and time in the format "MM/DD/YYYY HH:MM"
    const dateAndTime = `${formattedDate} ${consultation.timeSlotStart}`;

    // Create the consultation record
    const record = await getBase()(TABLES.CONSULTATIONS).create([
      {
        fields: {
          firstName: consultation.firstName,
          lastName: consultation.lastName,
          email: consultation.email,
          bookingType: consultation.bookingType,
          dateBooked: consultation.dateBooked,
          timeSlotStart: consultation.timeSlotStart,
          timeSlotEnd: consultation.timeSlotEnd,
          Date_and_Time: dateAndTime,
          ...(consultation.userTimezone && { userTimezone: consultation.userTimezone }),
          ...(consultation.userLocalTime && { userLocalTime: consultation.userLocalTime }),
        },
      },
    ]);

    const consultationId = record[0].id;

    return { id: consultationId, success: true };
  } catch (error) {
    console.error('Error creating consultation:', error);
    throw new Error('Failed to create consultation');
  }
}

export interface ContactFormData {
  Name: string;
  Email: string;
  Phone?: string;
  Subject?: string;
  Message?: string;
}

/**
 * Create a contact form submission (saves to Contacts table)
 * @param formData - Contact form data with Name, Email, Phone, Subject, Message
 * @returns Created record
 */
export async function createContactSubmission(
  formData: ContactFormData
): Promise<{ id: string; success: boolean }> {
  try {
    const fields: Record<string, string> = {
      Name: formData.Name,
      Email: formData.Email,
    };

    // Add optional fields only if they have values
    if (formData.Phone) {
      fields.Phone = formData.Phone;
    }
    if (formData.Subject) {
      fields.Subject = formData.Subject;
    }
    if (formData.Message) {
      fields.Message = formData.Message;
    }

    const record = await getBase()(TABLES.CONTACTS).create([
      {
        fields,
      },
    ]);

    return { id: record[0].id, success: true };
  } catch (error) {
    console.error('Error creating contact submission:', error);
    throw new Error('Failed to create contact submission');
  }
}


/**
 * Check if a specific date is a weekday (Mon-Fri)
 * @param date - Date to check
 */
export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5; // Monday = 1, Friday = 5
}

/**
 * Check if a date is in the past (before today)
 * @param date - Date to check
 */
export function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}
