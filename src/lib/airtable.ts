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
  CONSULTATIONS: process.env.AIRTABLE_CONSULTATIONS_TABLE || 'Consultations',
  TESTIMONIALS: process.env.AIRTABLE_TESTIMONIALS_TABLE || 'Testimonials',
  AVAILABILITY: process.env.AIRTABLE_AVAILABILITY_TABLE || 'Availability',
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
  userTimezone: string;
  userLocalTime: string;
}

export interface AvailabilitySlot {
  id: string;
  date: string; // YYYY-MM-DD format
  timeSlot: string; // HH:MM format in EST
  bookingType: 'Free' | 'Paid';
  isBooked: boolean;
  consultationId?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

/**
 * Fetch testimonials from Airtable
 * @param limit - Maximum number of testimonials to fetch
 * @param offset - Number of records to skip (for pagination)
 */
export async function getTestimonials(
  limit: number = 10,
  offset: number = 0
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
    // Fetch all slots for the specified date
    const records = await getBase()(TABLES.AVAILABILITY)
      .select({
        filterByFormula: `AND({date} = '${date}', {isBooked} = FALSE())`,
        sort: [{ field: 'timeSlot', direction: 'asc' }],
      })
      .all();

    const slots = records.map((record) => ({
      id: record.id,
      date: record.get('date') as string,
      timeSlot: record.get('timeSlot') as string,
      bookingType: record.get('bookingType') as 'Free' | 'Paid',
      isBooked: record.get('isBooked') as boolean,
    }));

    // Group slots into time blocks (30-min for free, 1-hour for paid)
    const timeSlots: TimeSlot[] = [];

    for (let i = 0; i < slots.length; i++) {
      const currentSlot = slots[i];

      // Free consultation: 30-min (1 slot)
      const endTime = addMinutesToTime(currentSlot.timeSlot, 30);
      timeSlots.push({
        start: currentSlot.timeSlot,
        end: endTime,
        available: !currentSlot.isBooked,
      });
    }

    return timeSlots;
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
          userTimezone: consultation.userTimezone,
          userLocalTime: consultation.userLocalTime,
        },
      },
    ]);

    const consultationId = record[0].id;

    // Mark the time slots as booked in the Availability table
    await markSlotsAsBooked(
      consultation.dateBooked,
      consultation.timeSlotStart,
      consultation.timeSlotEnd,
      consultationId
    );

    return { id: consultationId, success: true };
  } catch (error) {
    console.error('Error creating consultation:', error);
    throw new Error('Failed to create consultation');
  }
}

/**
 * Mark time slots as booked in the Availability table
 * @param date - Date of the booking
 * @param startTime - Start time of the booking
 * @param endTime - End time of the booking
 * @param consultationId - ID of the consultation
 */
async function markSlotsAsBooked(
  date: string,
  startTime: string,
  endTime: string,
  consultationId: string
): Promise<void> {
  try {
    // Find all slots that fall within the booking time range
    const records = await getBase()(TABLES.AVAILABILITY)
      .select({
        filterByFormula: `AND(
          {date} = '${date}',
          {timeSlot} >= '${startTime}',
          {timeSlot} < '${endTime}'
        )`,
      })
      .all();

    // Update each slot to mark it as booked
    const updates = records.map((record) => ({
      id: record.id,
      fields: {
        isBooked: true,
        consultationId: consultationId,
      },
    }));

    if (updates.length > 0) {
      await getBase()(TABLES.AVAILABILITY).update(updates);
    }
  } catch (error) {
    console.error('Error marking slots as booked:', error);
    throw new Error('Failed to mark slots as booked');
  }
}

/**
 * Utility function to add minutes to a time string
 * @param time - Time in HH:MM format
 * @param minutes - Minutes to add
 * @returns New time in HH:MM format
 */
function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, mins + minutes);

  const newHours = date.getHours().toString().padStart(2, '0');
  const newMins = date.getMinutes().toString().padStart(2, '0');

  return `${newHours}:${newMins}`;
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
