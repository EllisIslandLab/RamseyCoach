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
  BOOKED: process.env.AIRTABLE_BOOKED_TABLE || 'Booked',
  CONTACTS: process.env.AIRTABLE_CONTACTS_TABLE || 'Contacts',
  TESTIMONIALS: process.env.AIRTABLE_TESTIMONIALS_TABLE || 'Testimonials',
  CLIENTS: process.env.AIRTABLE_CLIENTS_TABLE || 'Clients',
};

// Type definitions
export interface Testimonial {
  id: string;
  name: string;
  notes: string;
  dateCreated: string;
}

export interface Consultation {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  bookingType: 'Free Consultation' | 'Paid Consultation';
  dateBooked: string; // YYYY-MM-DD format (used internally, not saved to Airtable)
  timeSlotStart: string; // HH:MM format in EST (used internally, not saved to Airtable)
  timeSlotEnd: string; // HH:MM format in EST (used internally, not saved to Airtable)
  userTimezone?: string;
  userLocalTime?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

// Client form types
export type RelationshipStatus = 'single' | 'married' | 'divorced' | 'widowed' | 'in a relationship';
export type AgeRange = '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
export type EmploymentStatus = 'Employed Full-time' | 'Employed Part-time' | 'Self-employed' | 'Unemployed' | 'Retired' | 'Student';
export type ReasonForVisit = 'Create/Review Budget' | 'Debt Management' | 'General Financial Planning' | 'Emergency Fund/Savings' | 'Investing & Wealth Building' | 'Business/Self-employed' | 'Other';
export type DebtType = 'Credit Cards' | 'Student Loans' | 'Mortgage' | 'Car Loan' | 'Medical' | 'Personal Loan' | 'Other';
export type PreferredContactMethod = 'Email' | 'Phone' | 'Text';

export interface ClientFormData {
  // Contact info
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;

  // Personal context
  relationship?: RelationshipStatus;
  householdSize?: number;
  ageRange?: AgeRange;
  employmentStatus?: EmploymentStatus;

  // Financial context
  reasonForVisit: ReasonForVisit;
  primaryFinancialConcern?: string;
  currentDebtType?: DebtType[];

  // Communication preferences
  preferredContactMethod?: PreferredContactMethod;
  bestTimeToContact?: string;

  // Consent
  consent: boolean;

  // Linked Booked record ID (for linking to Booked table)
  bookedRecordId?: string;

  // Attachments (handled separately via file upload)
  attachments?: { url: string; filename: string }[];
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
        sort: [{ field: 'DateCreated', direction: 'desc' }],
      })
      .all();

    return records.map((record) => ({
      id: record.id,
      name: (record.get('Name') as string) || '',
      notes: (record.get('Notes') as string) || '',
      dateCreated: (record.get('DateCreated') as string) || '',
    }));
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    throw new Error('Failed to fetch testimonials');
  }
}

// Number of slots per day (9 AM - 5 PM = 8 hourly slots)
const SLOTS_PER_DAY = 8;

/**
 * Fetch fully booked dates for a specific month
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 * @returns Array of fully booked date strings in YYYY-MM-DD format
 */
export async function getFullyBookedDates(
  year: number,
  month: number
): Promise<string[]> {
  try {
    // Fetch all bookings from the Booked table
    const records = await getBase()(TABLES.BOOKED)
      .select({
        fields: ['dateAndTime'],
      })
      .all();

    // Count bookings per date for the requested month
    // Times are stored in UTC but we need to count by EST date
    const bookingsPerDate = new Map<string, number>();

    // Formatter to get date in EST
    const estDateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    records.forEach((record) => {
      const dateAndTime = record.get('dateAndTime') as string;
      if (dateAndTime) {
        const bookingDate = new Date(dateAndTime);

        // Get year, month, and date string in EST
        const estDateStr = estDateFormatter.format(bookingDate); // "YYYY-MM-DD" in EST
        const [estYear, estMonth] = estDateStr.split('-').map(Number);

        // Only count bookings for the requested month (in EST)
        if (estYear === year && estMonth === month) {
          bookingsPerDate.set(estDateStr, (bookingsPerDate.get(estDateStr) || 0) + 1);
        }
      }
    });

    // Return dates that have all slots booked
    const fullyBookedDates: string[] = [];
    bookingsPerDate.forEach((count, dateStr) => {
      if (count >= SLOTS_PER_DAY) {
        fullyBookedDates.push(dateStr);
      }
    });

    return fullyBookedDates;
  } catch (error) {
    console.error('Error fetching fully booked dates:', error);
    throw new Error('Failed to fetch fully booked dates');
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

    // Fetch all bookings from the Booked table
    const records = await getBase()(TABLES.BOOKED)
      .select({
        fields: ['dateAndTime'],
      })
      .all();

    // Parse dateAndTime field (ISO 8601 format) and find bookings for this date
    // Times are stored in UTC but we need to compare against EST slots
    const bookedTimes = new Set<string>();
    records.forEach((record) => {
      const dateAndTime = record.get('dateAndTime') as string;
      if (dateAndTime) {
        // Airtable dateTime fields return ISO 8601 format: "2025-11-21T14:00:00.000Z"
        const bookingDate = new Date(dateAndTime);

        // Convert UTC to EST by formatting in America/New_York timezone
        const estFormatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        const estDateStr = estFormatter.format(bookingDate); // "YYYY-MM-DD" in EST

        if (estDateStr === date) {
          // Extract hour in EST
          const estHourFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            hour: '2-digit',
            hour12: false,
          });
          const estHour = estHourFormatter.format(bookingDate).padStart(2, '0');
          bookedTimes.add(`${estHour}:00`);
        }
      }
    });

    // Mark slots as unavailable if they're booked
    allSlots.forEach((slot) => {
      if (bookedTimes.has(slot.start)) {
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
 * Convert EST time to UTC ISO string for Airtable
 * EST is UTC-5, so we add 5 hours to get UTC
 */
function estToUtcIso(dateStr: string, timeStr: string): string {
  // Parse the EST time
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Create date in EST
  const estDate = new Date(`${dateStr}T${timeStr}:00`);

  // EST is UTC-5, so add 5 hours to convert to UTC
  const utcHours = hours + 5;

  // Handle day rollover (if EST time + 5 >= 24, it's next day in UTC)
  if (utcHours >= 24) {
    const nextDay = new Date(estDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    return `${nextDayStr}T${(utcHours - 24).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`;
  }

  return `${dateStr}T${utcHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`;
}

/**
 * Create a new consultation booking
 * @param consultation - Consultation details
 * @returns Created consultation record with the UTC datetime string
 */
export async function createConsultation(
  consultation: Consultation
): Promise<{ id: string; success: boolean; dateAndTime: string }> {
  try {
    // Convert EST time to UTC for Airtable
    const dateAndTime = estToUtcIso(consultation.dateBooked, consultation.timeSlotStart);

    // Create the booking record in Booked table with dateAndTime field
    const record = await getBase()(TABLES.BOOKED).create([
      {
        fields: {
          dateAndTime: dateAndTime,
        },
      },
    ]);

    const consultationId = record[0].id;

    return { id: consultationId, success: true, dateAndTime };
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
 * Create a new client record (saves to Clients table)
 * @param clientData - Client form data
 * @returns Created record
 */
export async function createClient(
  clientData: ClientFormData
): Promise<{ id: string; success: boolean }> {
  try {
    // Build the fields object for Airtable
    // eslint-disable-next-line
    const fields: any = {
      FirstName: clientData.firstName,
      LastName: clientData.lastName,
      Email: clientData.email,
      ReasonForVisit: clientData.reasonForVisit,
      Consent: clientData.consent,
    };

    // Add optional fields if they have values
    if (clientData.phone) fields.Phone = clientData.phone;
    if (clientData.relationship) fields.RelationshipStatus = clientData.relationship;
    if (clientData.householdSize) fields.HouseholdSize = clientData.householdSize;
    if (clientData.ageRange) fields.AgeRange = clientData.ageRange;
    if (clientData.employmentStatus) fields.EmploymentStatus = clientData.employmentStatus;
    if (clientData.primaryFinancialConcern) fields.PrimaryFinancialConcern = clientData.primaryFinancialConcern;
    if (clientData.currentDebtType && clientData.currentDebtType.length > 0) {
      fields.CurrentDebtType = clientData.currentDebtType;
    }
    if (clientData.preferredContactMethod) fields.PreferredContactMethod = clientData.preferredContactMethod;
    if (clientData.bestTimeToContact) fields.BestTimeToContact = clientData.bestTimeToContact;

    // Link to Booked record (uses the BookedRecord link field)
    if (clientData.bookedRecordId) {
      fields.BookedRecord = [clientData.bookedRecordId];
    }

    // Handle attachments if provided (Airtable expects array of {url} objects)
    if (clientData.attachments && clientData.attachments.length > 0) {
      fields.Attachments = clientData.attachments.map(att => ({ url: att.url }));
    }

    const records = await getBase()(TABLES.CLIENTS).create([{ fields }]);

    return { id: records[0].id, success: true };
  } catch (error) {
    console.error('Error creating client:', error);
    throw new Error('Failed to create client');
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
