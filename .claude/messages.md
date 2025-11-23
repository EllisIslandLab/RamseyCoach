# RamseyCoach Project Context & Queue

## Project Overview
RamseyCoach is a professional Next.js website for a Ramsey Preferred Coach personal finance coaching business. It features a booking system, testimonials carousel, contact forms, and is fully integrated with Airtable for data persistence.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, React 18, Airtable, USA Timezone Support

---

## Architecture Quick Reference

### Directory Structure
```
src/
├── components/        # React components (Header, Hero, BookingModal, Testimonials, etc.)
├── lib/
│   ├── airtable.ts   # Airtable client & data functions
│   └── timezone.ts   # US timezone utilities
├── pages/
│   ├── api/          # API endpoints (availability, bookings, contact, testimonials)
│   ├── index.tsx     # Home page
│   ├── contact.tsx   # Contact page
│   └── [other pages]
└── styles/
    └── globals.css   # Global Tailwind styles
```

### Key Design Patterns
- **Lazy Loading**: Components using Airtable are dynamically imported to prevent SSR issues
- **API Layer**: Business logic in `/lib/airtable.ts`, HTTP handling in `/pages/api/`
- **Client Components**: Use `'use client'` directive for interactive state
- **Timezone Handling**: EST storage, automatic user timezone detection and conversion

---

## Airtable Schema

### Tables
1. **Booked** - Consultation bookings
   - Field: `dateAndTime` (DateTime, ISO 8601 format)

2. **Testimonials** - Client testimonials
   - Fields: `Name`, `Notes`, `DateCreated` (Date)
   - Sorted by DateCreated DESC

3. **Contacts** - Contact form submissions
   - Fields: `Name`, `Email`, `Phone`, `Subject`, `Message`

4. **Clients** - Client records (if used)
   - Fields: `Name`, `Email`, `Phone`, `Subject`, `Message`

### Environment Variables
```env
NEXT_PUBLIC_AIRTABLE_BASE_ID=app7gD87Z9uw9KS5p    # Public
AIRTABLE_API_TOKEN=<token>                         # Private, server-only
AIRTABLE_BOOKED_TABLE=Booked
AIRTABLE_CONTACTS_TABLE=Contacts
AIRTABLE_TESTIMONIALS_TABLE=Testimonials
```

---

## Current Implementation Status

### ✅ Completed Features
- **Testimonials**: Dynamic carousel with Airtable integration, smart scroll-based lazy loading
  - Hardcoded first testimonial for instant page load
  - Intersection Observer for scroll detection
  - Arrow key navigation (left/right arrows)
  - Navigation dots and counter
  - Schema mapping: `Name`, `Notes`, `DateCreated`

- **Booking System**: Modal with date/time selection
  - Month-by-month calendar navigation
  - Hourly time slots (9 AM - 5 PM EST, M-F only)
  - Smart lazy loading: loads booked dates when selecting a single date
  - Timezone detection and conversion
  - Form validation and error handling
  - Integration with Booked table

- **Contact Form**: Simple submission to Contacts table

### 🔄 In Progress
- **Month-based Smart Loading for Bookings** (Active Todo List)
  1. Create `getBookedDates()` function to fetch all booked dates for a month
  2. Create `/api/booked-dates` endpoint
  3. Load booked dates when modal opens (on "Book Your Free Consultation" click)
  4. Load new month's booked dates when navigating months
  5. Visual indicators: grey out/disable fully booked dates on calendar
  6. Cache fetched months to avoid refetching
  7. Test end-to-end booking flow with month-based loading

### 📋 Future Enhancements
- Add reason field to Booked table (Vacation, Sick, Booked)
- Color-code calendar by availability reason
- Prefetch 2+ months on modal open for better UX
- Show "5 slots available" badge on dates (optional)

---

## API Endpoints

| Endpoint | Method | Purpose | Parameters |
|----------|--------|---------|-----------|
| `/api/availability` | GET | Fetch time slots for a date | `date` (YYYY-MM-DD) |
| `/api/bookings` | POST | Create booking | `Consultation` object |
| `/api/contact` | POST | Submit contact form | `ContactFormData` object |
| `/api/testimonials` | GET | Fetch testimonials | `limit`, `offset` |
| `/api/booked-dates` | GET | **[NEW]** Fetch booked dates for month | `year`, `month` |

---

## Important Functions & Types

### Airtable Library (`src/lib/airtable.ts`)
```typescript
// Data fetching
getTestimonials(limit, offset) → Testimonial[]
getAvailableSlots(date: string) → TimeSlot[]
getBookedDates(year, month) → string[] // [NEW]

// Data creation
createConsultation(consultation) → { id, success }
createContactSubmission(formData) → { id, success }

// Utilities
isWeekday(date) → boolean
isPastDate(date) → boolean
```

### Types
```typescript
interface Testimonial {
  id: string;
  name: string;
  notes: string;
  dateCreated: string;
}

interface TimeSlot {
  start: string;  // "HH:00"
  end: string;    // "HH:00"
  available: boolean;
}

interface Consultation {
  firstName: string;
  lastName: string;
  email: string;
  bookingType: 'Free Consultation' | 'Paid Consultation';
  dateBooked: string;  // YYYY-MM-DD
  timeSlotStart: string;  // HH:00
  timeSlotEnd: string;  // HH:00
  userTimezone?: string;
  userLocalTime?: string;
}
```

---

## Development Notes

### Client vs Server Code
- **Client (`'use client'`)**: BookingModal, Testimonials, Header (interactive components)
- **Server-only**: API routes, `/lib/airtable.ts` functions
- **API routes**: Call server-only `/lib/airtable.ts` functions, return JSON to client

### Smart Loading Philosophy
- **Testimonials**: Load only when user scrolls to section or clicks nav link
- **Bookings**: Load only when modal opens (date range), fetch full month to show availability
- **Hardcoded defaults**: First testimonial is hardcoded for instant page load

### Timezone Handling
- **Storage**: All times stored in EST in Airtable
- **Display**: Converted to user's detected timezone
- **User input**: Converted back to EST for storage

### Common Pitfalls
- ❌ Calling Airtable functions directly from client components (use API routes instead)
- ❌ Not using `'use client'` directive in interactive components
- ❌ Forgetting to handle timezone conversions
- ❌ Not validating dates are weekdays and not in the past

---

## Quick Commands

```bash
# Development
npm run dev          # Start dev server (localhost:3000)

# Building
npm run build        # Production build
npm run start        # Start production server

# Linting
npm run lint         # Run ESLint

# Type checking
npx tsc --noEmit     # Check TypeScript errors
```

---

## Session Management

This file serves as a knowledge base for Claude Code sessions. When continuing work:
1. Check the **Current Implementation Status** section
2. Reference the **In Progress** todo list
3. Review API endpoints and types for context
4. Consult **Common Pitfalls** if encountering issues

**Last Updated:** November 21, 2025
