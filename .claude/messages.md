# RamseyCoach Project Context & Queue

## Project Overview
RamseyCoach is a professional Next.js website for a Ramsey Preferred Coach personal finance coaching business. It features a comprehensive booking system with client intake forms, testimonials carousel, contact forms, and is fully integrated with Airtable for data persistence.

**Tech Stack:** Next.js 15.5.6, TypeScript, Tailwind CSS, React 18, Airtable REST API, USA Timezone Support (EST standard)

---

## Architecture Quick Reference

### Directory Structure
```
src/
├── components/
│   ├── Header.tsx           # Navigation with dynamic anchor links
│   ├── BookingModal.tsx     # Calendar + time slots + client intake form
│   ├── Testimonials.tsx     # Carousel with lazy loading
│   ├── Hero.tsx
│   └── [other components]
├── lib/
│   ├── airtable.ts         # Airtable client & data operations
│   └── timezone.ts         # US timezone detection & EST conversion
├── pages/
│   ├── api/
│   │   ├── availability.ts     # GET available time slots for a date
│   │   ├── booked-dates.ts     # GET fully booked dates for a month
│   │   ├── bookings.ts         # POST create consultation
│   │   ├── clients.ts          # POST create client record + intake form
│   │   ├── contact.ts          # POST contact form submissions
│   │   └── testimonials.ts     # GET testimonials from Airtable
│   ├── index.tsx           # Home page
│   ├── contact.tsx         # Contact page
│   ├── privacy-policy.tsx
│   └── terms-of-service.tsx
└── styles/
    └── globals.css         # Global Tailwind styles
```

### Key Design Patterns
- **API Layer**: All business logic in `/lib/airtable.ts`, HTTP in `/pages/api/`
- **Client Components**: Use `'use client'` directive for interactive state
- **Retry Logic**: All API fetches have automatic retry (up to 2x) with 1-second delay
- **Timezone Handling**: EST (America/New_York) standard - times stored UTC, converted for display
- **Smart Linking**: Clients table linked to Booked table for data integrity
- **Validation**: Phone required when contact method is Phone/Text

---

## Airtable Schema

### Tables & Fields

#### 1. **Booked** - Consultation bookings
- `dateAndTime` (DateTime, ISO 8601, stored in UTC)
- **Timezone**: America/New_York (EST)
- **Linked from**: Clients.BookedRecord (reverse link)

#### 2. **Clients** - Client records with intake form data
- Contact: `FirstName`, `LastName`, `Email`, `Phone`
- Personal: `RelationshipStatus`, `HouseholdSize`, `AgeRange`, `EmploymentStatus`
- Financial: `ReasonForVisit`, `PrimaryFinancialConcern`, `CurrentDebtType`
- Communication: `PreferredContactMethod`, `BestTimeToContact`
- Other: `Consent`, `BookedRecord` (link), `Attachments`, `Notes`

#### 3. **Testimonials** - Client testimonials
- `Name`, `Notes`, `DateCreated` (Date)
- Sorted by DateCreated DESC

#### 4. **Contacts** - Contact form submissions
- `Name`, `Email`, `Phone`, `Subject`, `Message`

### Environment Variables
```env
NEXT_PUBLIC_AIRTABLE_BASE_ID=app7gD87Z9uw9KS5p    # Public
AIRTABLE_API_TOKEN=<token>                         # Private, server-only
AIRTABLE_BOOKED_TABLE=Booked
AIRTABLE_CLIENTS_TABLE=Clients
AIRTABLE_CONTACTS_TABLE=Contacts
AIRTABLE_TESTIMONIALS_TABLE=Testimonials
```

---

## Current Implementation Status

### ✅ Completed Features

**Testimonials**
- Dynamic carousel with Airtable integration
- Smart lazy loading with retry logic (up to 2 retries)
- Hardcoded first testimonial for instant page load
- Intersection Observer for scroll detection
- Arrow key navigation

**Booking System**
- Calendar modal with date/time selection
- Hourly time slots (9 AM - 5 PM EST, M-F only)
- Month-based fully booked date detection with visual indicators
- Timezone detection & normalization (e.g., America/Havana → EST)
- Double-booking prevention (UTC↔EST conversion fix)
- Time slot validation with retry logic

**Client Intake Form**
- Comprehensive form with 13+ fields
- Contact, personal, financial context sections
- Phone validation (required when contact method is Phone/Text)
- Consent checkbox
- Linked Client records to Booked records
- POST to `/api/clients` endpoint

**Navigation**
- Dynamic anchor links work from any page
- From `/contact`: clicking "Testimonials" → `/#testimonials` (home + scroll)
- From `/contact`: clicking "Consultation" → `/#booking` (home + scroll)

**Error Handling & Resilience**
- Retry logic on all API fetches (testimonials, booked-dates, availability)
- Graceful degradation (shows cached data or defaults on failure)
- Proper error logging without throwing runtime errors

### 🔧 Timezone Implementation

**Standards:**
- **Storage**: UTC (ISO 8601 format in Airtable)
- **Display**: EST (America/New_York)
- **User Input**: EST (HH:MM format from form)

**Key Functions:**
- `detectUserTimezone()` - Detects browser timezone, normalizes to US equivalent
- `normalizeTimezone()` - Maps equivalent timezones (e.g., Havana → NY)
- `convertFromEST()` - EST → User's timezone (for display)
- `getAvailableSlots()` - Converts UTC bookings back to EST for comparison

**Normalization Examples:**
- America/Havana → America/New_York
- America/Toronto → America/New_York
- America/Phoenix → America/Denver
- America/Vancouver → America/Los_Angeles

### 🎨 Design & Styling
- **Color Palette**: Primary (green), Secondary (brown), Accent (gold)
- **Responsive**: Mobile-first with hamburger menu on small screens
- **Tailwind CSS**: Utility-first approach with custom classes

### 📊 Form Fields (Client Intake)

**Required:**
- First Name, Last Name, Email, Reason for Visit, Consent

**Optional:**
- Phone, Relationship, Household Size, Age Range, Employment Status
- Primary Financial Concern, Current Debt Types
- Preferred Contact Method, Best Time to Contact
- Attachments

### 📋 Future Enhancements
- Add E2E testing with Playwright
- Add unit tests for timezone.ts and airtable.ts
- Implement Husky pre-commit hooks
- Add comprehensive error logging
- Consider database migration strategy for schema changes
- Implement optional file upload for financial documents

---

## Recent Changes (Latest Session)

### Key Fixes
1. **RelationshipStatus Field**: Created new field with all 5 options (single, married, divorced, widowed, in a relationship)
2. **Timezone Normalization**: Added support for equivalent timezones to prevent detection errors
3. **Double-Booking Fix**: Fixed UTC↔EST conversion in booking detection
4. **Phone Validation**: Added validation requiring phone when contact method is Phone/Text
5. **Nav Links**: Fixed anchor links to work from non-home pages
6. **Retry Logic**: Added automatic retry (2x) on all API fetches
7. **Build Cache**: Cleaned corrupted `.next` folder

### API Endpoints
- `GET /api/booked-dates?year=2025&month=11` - Fully booked dates for month
- `GET /api/availability?date=2025-11-24` - Available time slots for date
- `POST /api/bookings` - Create consultation booking
- `POST /api/clients` - Create client record with intake form
- `GET /api/testimonials` - Get testimonials from Airtable

### Files Modified
- `src/components/BookingModal.tsx` - Added retry logic, phone validation, intake form
- `src/components/Header.tsx` - Fixed nav links for non-home pages
- `src/components/Testimonials.tsx` - Added retry logic
- `src/lib/airtable.ts` - Fixed UTC↔EST conversion, added RelationshipStatus
- `src/lib/timezone.ts` - Added normalizeTimezone() for equivalent timezones
- `src/styles/globals.css` - Added fully-booked calendar styling

---

## Important Notes

### Critical
- **Never commit** .env.local or Airtable API token to git
- **EST is standard** - All times stored in UTC, converted for display
- **Booked records linked** to Client records - Maintain this relationship
- **Fully booked detection** requires proper EST conversion (not UTC hours)
- **Phone field** required when contact method is Phone/Text

### Security
- `.env.local` is in `.gitignore` - Never push credentials
- API token only used server-side (pages/api/)
- All environment variables validated on startup

### Performance
- Fully booked dates cached after first fetch per month
- Testimonials lazy-load on scroll/nav click with retry
- API retries prevent transient failures from blocking UX
- Client-side timezone detection prevents unnecessary calculations

---

## Quick Commands

```bash
npm run dev      # Start development server (port 3000 or 3001)
npm run build    # Build production bundle
npm run lint     # Run ESLint checks
npm start        # Start production server
```

---

## Code Style & Conventions

### Naming
- Components: `PascalCase` (.tsx files)
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types: `PascalCase`
- API routes: `kebab-case` filenames

### Imports
- Path alias: `@/*` maps to `./src/*`
- Example: `import { getTestimonials } from '@/lib/airtable'`

### TypeScript
- Strict mode enabled
- Target: ES2020
- All functions should have return type annotations

---

## Resources & Documentation
- TypeScript config: `tsconfig.json` (strict mode)
- Tailwind config: `tailwind.config.ts` (custom colors)
- ESLint config: `.eslintrc.json` (Next.js + web vitals)
- Claude Code settings: `.claude/settings.json` (project-wide), `.claude/settings.local.json` (personal)
