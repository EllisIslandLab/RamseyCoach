# Ramsey Preferred Coach Website

A professional Next.js website for a Ramsey Preferred Coach personal finance coaching business, built using the Web Launch Academy methodology. Features mobile-first responsive design, Airtable integration for bookings and testimonials, and a clean nature-inspired design theme.

## Features

- ✅ Mobile-first responsive design
- ✅ Sticky navigation with hamburger menu
- ✅ Hero section with "My Story" modal
- ✅ Testimonials carousel with lazy loading from Airtable
- ✅ Interactive booking calendar with timezone detection
- ✅ Real-time availability checking
- ✅ Airtable integration for consultations and testimonials
- ✅ Nature-inspired color palette (green, brown, gold)
- ✅ Smooth animations and transitions
- ✅ SEO-friendly page structure
- ✅ Legal pages (Privacy Policy, Terms of Service)

## Tech Stack

- **Framework:** Next.js 15 with TypeScript
- **Styling:** Tailwind CSS with custom design system
- **Database:** Airtable
- **Deployment:** Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- An Airtable account

### Installation

1. **Clone the repository:**
   ```bash
   cd RamseyCoach
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**

   Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and add your Airtable credentials:
   ```env
   NEXT_PUBLIC_AIRTABLE_BASE_ID=your_base_id_here
   AIRTABLE_API_TOKEN=your_api_token_here
   ```

4. **Set up Airtable database** (see detailed instructions below)

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Airtable Setup

### Creating Your Airtable Base

1. Log in to [Airtable](https://airtable.com)
2. Create a new base called "Ramsey Coach Bookings" (or any name you prefer)
3. Create three tables with the following schemas:

### Table 1: Consultations

| Field Name | Field Type | Options/Description |
|------------|-----------|---------------------|
| id | Auto number | Primary key (auto-generated) |
| firstName | Single line text | Client's first name |
| lastName | Single line text | Client's last name |
| email | Email | Client's email address |
| bookingType | Single select | Options: "Free Consultation", "Paid Consultation" |
| dateBooked | Date | Date of the consultation |
| timeSlotStart | Single line text | Start time in EST (HH:MM format) |
| timeSlotEnd | Single line text | End time in EST (HH:MM format) |
| userTimezone | Single line text | User's timezone (e.g., "EST", "PST") |
| userLocalTime | Single line text | Time displayed to user in their timezone |
| createdAt | Created time | Auto-populated timestamp |

### Table 2: Testimonials

| Field Name | Field Type | Options/Description |
|------------|-----------|---------------------|
| id | Auto number | Primary key (auto-generated) |
| firstName | Single line text | Client's first name |
| lastName | Single line text | Client's last name |
| note | Long text | Testimonial content |
| createdAt | Created time | Auto-populated timestamp |

### Table 3: Availability

| Field Name | Field Type | Options/Description |
|------------|-----------|---------------------|
| id | Auto number | Primary key (auto-generated) |
| date | Date | Date of availability |
| timeSlot | Single line text | Time slot in EST (HH:MM format) |
| bookingType | Single select | Options: "Free", "Paid" |
| isBooked | Checkbox | Whether the slot is booked (default: unchecked) |
| consultationId | Link to Consultations | Linked record to Consultations table |

### Populating Initial Availability

You'll need to populate the Availability table with your available time slots. Here's an example script to help you create slots:

**Available Times:** Monday-Friday, 8:00 AM - 5:00 PM EST (30-minute intervals)

You can either:
1. Manually create records in Airtable
2. Use Airtable's API or bulk import feature
3. Create a script to populate slots programmatically

Example records:
- Date: 2025-11-15, timeSlot: 08:00, bookingType: Free, isBooked: false
- Date: 2025-11-15, timeSlot: 08:30, bookingType: Free, isBooked: false
- Date: 2025-11-15, timeSlot: 09:00, bookingType: Free, isBooked: false
- ...and so on

### Getting Your Airtable Credentials

#### Base ID:
1. Open your Airtable base
2. Look at the URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`
3. The part starting with `app` is your Base ID

#### API Token:
1. Go to [https://airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Click "Create new token"
3. Give it a name (e.g., "Ramsey Coach Website")
4. Add the following scopes:
   - `data.records:read`
   - `data.records:write`
5. Add access to your base
6. Create the token and copy it to your `.env.local` file

### Setting Up Airtable Automations (Optional)

To automatically send email confirmations when bookings are created:

1. In your Airtable base, go to "Automations"
2. Create a new automation:
   - **Trigger:** When a record is created in "Consultations" table
   - **Action:** Send email
   - Configure email template with booking details

## Customization Guide

### Content Updates

1. **Hero Section** (`src/components/Hero.tsx`):
   - Update introductory text
   - Replace placeholder image with your photo
   - Customize call-to-action buttons

2. **My Story Modal** (`src/components/StoryModal.tsx`):
   - Replace placeholder text with your personal story
   - Add your journey and credentials

3. **Footer** (`src/components/Footer.tsx`):
   - Update business name and address
   - Update contact information
   - Update social media links

4. **Contact Page** (`src/pages/contact.tsx`):
   - Update contact information
   - Customize form (optional: connect to email service)

### Design Customization

The color palette is defined in `tailwind.config.ts`:

```typescript
colors: {
  primary: { /* green shades */ },
  secondary: { /* brown shades */ },
  accent: { /* gold shades */ },
}
```

Modify these values to match your brand colors.

### Adding Features

#### Email Notifications:
- Install a service like SendGrid or Resend
- Add email sending logic to `src/lib/airtable.ts`
- Send confirmation emails after successful bookings

#### Payment Integration:
- Add Stripe or PayPal for paid consultations
- Update booking flow to include payment
- Store payment information in Airtable

## Project Structure

```
RamseyCoach/
├── src/
│   ├── components/          # React components
│   │   ├── Header.tsx       # Navigation header
│   │   ├── Hero.tsx         # Hero section
│   │   ├── StoryModal.tsx   # My Story modal
│   │   ├── Testimonials.tsx # Testimonials carousel
│   │   ├── Booking.tsx      # Booking section
│   │   ├── BookingModal.tsx # Booking calendar modal
│   │   └── Footer.tsx       # Footer
│   ├── pages/               # Next.js pages
│   │   ├── index.tsx        # Home page
│   │   ├── contact.tsx      # Contact page
│   │   ├── privacy-policy.tsx
│   │   ├── terms-of-service.tsx
│   │   ├── _app.tsx         # App wrapper
│   │   └── _document.tsx    # Document wrapper
│   ├── lib/                 # Utility libraries
│   │   ├── airtable.ts      # Airtable client
│   │   └── timezone.ts      # Timezone utilities
│   └── styles/
│       └── globals.css      # Global styles
├── public/                  # Static assets
├── .env.local.example       # Environment template
├── tailwind.config.ts       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
└── next.config.js           # Next.js configuration
```

## Deployment

### Deploying to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables in Vercel dashboard
5. Deploy!

Vercel will automatically:
- Build your Next.js app
- Set up SSL certificates
- Enable continuous deployment from GitHub

### Environment Variables in Vercel

In your Vercel project settings, add:
- `NEXT_PUBLIC_AIRTABLE_BASE_ID`
- `AIRTABLE_API_TOKEN`

## Development

### Running Locally

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Best Practices

1. **Content:** Replace all placeholder text with your actual content
2. **Images:** Add real images to the `/public` folder
3. **Legal:** Have a lawyer review privacy policy and terms of service
4. **SEO:** Update meta descriptions and titles in each page
5. **Testing:** Test booking flow thoroughly before launch
6. **Security:** Never commit `.env.local` to version control
7. **Monitoring:** Set up error tracking (e.g., Sentry)

## Maintenance

### Regular Updates

- Review and respond to booking inquiries daily
- Update availability in Airtable weekly
- Monitor testimonials and add new ones
- Keep dependencies updated: `npm update`

### Troubleshooting

**Booking not working?**
- Check Airtable API credentials
- Verify Availability table has future dates
- Check browser console for errors

**Testimonials not loading?**
- Verify Testimonials table has records
- Check Airtable API token permissions
- Check network tab in browser dev tools

## Support

For issues or questions:
- Check existing documentation
- Review Airtable setup
- Check browser console for errors
- Review Next.js documentation: [nextjs.org/docs](https://nextjs.org/docs)

## License

Private and proprietary. All rights reserved.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Data powered by [Airtable](https://airtable.com/)
- Inspired by Ramsey Solutions principles
