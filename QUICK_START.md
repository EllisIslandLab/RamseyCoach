# Quick Start Guide

## 🚀 Your Ramsey Coach Website is Ready!

Your complete Next.js website has been built with all the features you requested. Follow these steps to get it running.

## ✅ What's Been Built

- **Home Page** with Hero, Testimonials, and Booking sections
- **Contact Page** with contact form
- **Privacy Policy** and **Terms of Service** pages
- **Mobile-responsive design** with hamburger menu
- **Booking system** with calendar and timezone detection
- **Airtable integration** for bookings and testimonials
- **All components** are production-ready

## 📋 Next Steps

### 1. Set Up Airtable (Required)

1. **Create an Airtable account** at [airtable.com](https://airtable.com)
2. **Create a new base** called "Ramsey Coach Bookings"
3. **Create three tables** following the schema in `README.md`:
   - Consultations
   - Testimonials
   - Availability

4. **Get your credentials:**
   - Base ID: From your Airtable URL (starts with `app...`)
   - API Token: Create at [airtable.com/create/tokens](https://airtable.com/create/tokens)

5. **Update `.env.local`** with your actual credentials:
   ```env
   NEXT_PUBLIC_AIRTABLE_BASE_ID=appYourActualBaseId
   AIRTABLE_API_TOKEN=patYourActualToken.xxxxxxxx
   ```

### 2. Customize Your Content

Replace placeholder text in these files:

1. **Hero Section** (`src/components/Hero.tsx`):
   - Update introductory text
   - Add your photo (replace placeholder)

2. **My Story Modal** (`src/components/StoryModal.tsx`):
   - Replace Lorem ipsum with your personal story

3. **Footer** (`src/components/Footer.tsx`):
   - Update business name and address
   - Update contact information (email, phone)
   - Update social media links

4. **Contact Page** (`src/pages/contact.tsx`):
   - Update all placeholder contact information

### 3. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your site!

### 4. Test the Booking Flow

1. Click "Book Free Consultation"
2. Select a date (weekday, not past)
3. Choose a time slot
4. Fill in contact information
5. Confirm booking

**Note:** You need to populate the Availability table in Airtable with future dates/times first.

### 5. Add Testimonials

Add at least one testimonial to your Airtable Testimonials table:
- firstName: Client's first name
- lastName: Client's last name
- note: Their testimonial text

The first hardcoded testimonial will show, then additional ones from Airtable.

### 6. Deploy to Production

When ready to launch:

```bash
# Build for production
npm run build

# Test production build locally
npm start
```

**Deploy to Vercel (Recommended):**
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables
5. Deploy!

## 🎨 Customization

### Colors
Edit `tailwind.config.ts` to change the color palette:
- `primary`: Green tones (main brand color)
- `secondary`: Brown tones (supporting color)
- `accent`: Gold tones (call-to-action buttons)

### Layout
All components are in `src/components/` and can be edited independently.

## 📱 Features

- ✅ Mobile-first responsive design
- ✅ Sticky navigation with hamburger menu
- ✅ Timezone detection for bookings
- ✅ Real-time availability checking
- ✅ Smooth animations and transitions
- ✅ SEO-friendly structure
- ✅ Accessible design (WCAG AA compliant colors)

## 🔧 Common Issues

**Build fails?**
- Make sure `.env.local` exists (even with placeholder values)
- Run `npm install` to ensure all dependencies are installed

**Testimonials not loading?**
- Check Airtable credentials in `.env.local`
- Verify Testimonials table has records
- Check browser console for errors

**Booking not working?**
- Populate Availability table with future dates
- Verify Airtable API token has read/write permissions
- Check that dates are weekdays (Mon-Fri)

## 📚 Documentation

See `README.md` for:
- Complete Airtable schema
- Detailed setup instructions
- Deployment guide
- Customization options

## 🆘 Need Help?

1. Check the `README.md` for detailed documentation
2. Review the Airtable setup section
3. Check Next.js docs: [nextjs.org/docs](https://nextjs.org/docs)
4. Check Tailwind docs: [tailwindcss.com/docs](https://tailwindcss.com/docs)

---

**🎉 Congratulations! Your financial coaching website is ready to help clients achieve financial freedom!**
