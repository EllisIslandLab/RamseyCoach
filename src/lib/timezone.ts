/**
 * Timezone utilities for handling timezone detection and conversion
 * All times are stored in EST in Airtable and converted to user's local timezone for display
 */

// USA timezone mappings
export const USA_TIMEZONES = {
  EST: 'America/New_York',
  CST: 'America/Chicago',
  MST: 'America/Denver',
  PST: 'America/Los_Angeles',
} as const;

export type USATimezoneKey = keyof typeof USA_TIMEZONES;

/**
 * Detect the user's timezone using browser API
 * @returns Detected timezone name (e.g., 'America/New_York') or null if detection fails
 */
export function detectUserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Failed to detect timezone:', error);
    return null;
  }
}

/**
 * Get the user's timezone abbreviation (EST, CST, MST, PST)
 * @param timezone - IANA timezone name (e.g., 'America/New_York')
 * @returns Timezone abbreviation or null if not a USA timezone
 */
export function getTimezoneAbbreviation(timezone: string): USATimezoneKey | null {
  const entry = Object.entries(USA_TIMEZONES).find(([_, value]) => value === timezone);
  return entry ? (entry[0] as USATimezoneKey) : null;
}

/**
 * Get friendly timezone display name
 * @param timezone - IANA timezone name or abbreviation
 * @returns Friendly display name (e.g., 'Eastern Time (EST)')
 */
export function getTimezoneFriendlyName(timezone: string): string {
  const timezoneMap: Record<string, string> = {
    'America/New_York': 'Eastern Time (EST)',
    EST: 'Eastern Time (EST)',
    'America/Chicago': 'Central Time (CST)',
    CST: 'Central Time (CST)',
    'America/Denver': 'Mountain Time (MST)',
    MST: 'Mountain Time (MST)',
    'America/Los_Angeles': 'Pacific Time (PST)',
    PST: 'Pacific Time (PST)',
  };

  return timezoneMap[timezone] || timezone;
}

/**
 * Convert a time from EST to another timezone
 * @param date - Date string (YYYY-MM-DD)
 * @param time - Time string in EST (HH:MM)
 * @param targetTimezone - Target timezone (IANA name or abbreviation)
 * @returns Time in target timezone (HH:MM format)
 */
export function convertFromEST(
  date: string,
  time: string,
  targetTimezone: string
): string {
  // If target timezone is an abbreviation, convert to IANA name
  const targetTZ =
    targetTimezone in USA_TIMEZONES
      ? USA_TIMEZONES[targetTimezone as USATimezoneKey]
      : targetTimezone;

  // Create a date object in EST
  const [hours, minutes] = time.split(':').map(Number);
  const dateTime = new Date(`${date}T${time}:00`);

  // Format in target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: targetTZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return formatter.format(dateTime);
}

/**
 * Convert a time from user's timezone to EST
 * @param date - Date string (YYYY-MM-DD)
 * @param time - Time string in user's timezone (HH:MM)
 * @param userTimezone - User's timezone (IANA name or abbreviation)
 * @returns Time in EST (HH:MM format)
 */
export function convertToEST(
  date: string,
  time: string,
  userTimezone: string
): string {
  // If user timezone is an abbreviation, convert to IANA name
  const userTZ =
    userTimezone in USA_TIMEZONES
      ? USA_TIMEZONES[userTimezone as USATimezoneKey]
      : userTimezone;

  // Create a date object in user's timezone
  const dateTime = new Date(`${date}T${time}:00`);

  // Format in EST
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: USA_TIMEZONES.EST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return formatter.format(dateTime);
}

/**
 * Format a time string for display with AM/PM
 * @param time - Time in HH:MM format (24-hour)
 * @returns Formatted time string (e.g., '2:30 PM')
 */
export function formatTimeForDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Generate business hours time slots (8am - 5pm EST)
 * @returns Array of time slots in HH:MM format (30-minute intervals)
 */
export function generateBusinessHours(): string[] {
  const slots: string[] = [];
  const startHour = 8; // 8 AM
  const endHour = 17; // 5 PM

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeSlot);
    }
  }

  return slots;
}

/**
 * Check if a time slot is within business hours (8am - 5pm)
 * @param time - Time in HH:MM format
 * @returns True if within business hours
 */
export function isBusinessHours(time: string): boolean {
  const [hours] = time.split(':').map(Number);
  return hours >= 8 && hours < 17;
}

/**
 * Calculate end time for a consultation
 * @param startTime - Start time in HH:MM format
 * @param duration - Duration in minutes (30 for free, 60 for paid)
 * @returns End time in HH:MM format
 */
export function calculateEndTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;

  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}
