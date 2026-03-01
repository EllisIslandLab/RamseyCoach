import Head from 'next/head';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Footer from '@/components/Footer';

// Dynamically import components that use Airtable to avoid SSR issues
const Testimonials = dynamic(() => import('@/components/Testimonials'), { ssr: false });
const Booking = dynamic(() => import('@/components/Booking'), { ssr: false });

export default function Home() {
  return (
    <>
      <Head>
        <title>Money-Willo | Financial Coaching & Consulting</title>
        <meta
          name="description"
          content="Achieve financial peace with personalized coaching from a Financial Coach and Treasurer of Willo-Hill Church. Get out of debt, build wealth, and secure your financial future."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="48x48" />
        <link rel="apple-touch-icon" href="/favicon.png" sizes="180x180" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://ramseycoach.com/" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ramseycoach.com/" />
        <meta property="og:title" content="Money-Willo | Financial Coaching & Consulting" />
        <meta
          property="og:description"
          content="Achieve financial peace with personalized coaching from a Financial Coach and Treasurer of Willo-Hill Church. Get out of debt, build wealth, and secure your financial future."
        />
        <meta property="og:image" content="https://ramseycoach.com/images/og-image.jpg" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://ramseycoach.com/" />
        <meta name="twitter:title" content="Money-Willo | Financial Coaching & Consulting" />
        <meta
          name="twitter:description"
          content="Achieve financial peace with personalized coaching from a Financial Coach and Treasurer of Willo-Hill Church. Get out of debt, build wealth, and secure your financial future."
        />
        <meta name="twitter:image" content="https://ramseycoach.com/images/og-image.jpg" />

        {/* Schema.org JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FinancialService',
              name: 'Money-Willo',
              description: 'Financial Coach and Treasurer of Willo-Hill Church providing personalized financial coaching and consulting services.',
              url: 'https://ramseycoach.com',
              logo: 'https://ramseycoach.com/images/logo.png',
              image: 'https://ramseycoach.com/images/og-image.jpg',
              telephone: '(555) 555-1234',
              email: 'coach@example.com',
              address: {
                '@type': 'PostalAddress',
                streetAddress: '[Street Address]',
                addressLocality: '[City]',
                addressRegion: '[State]',
                postalCode: '[ZIP]',
                addressCountry: 'US'
              },
              sameAs: [
                'https://www.facebook.com/yourpage',
                'https://www.linkedin.com/in/yourprofile',
                'https://www.instagram.com/yourprofile'
              ],
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '5',
                reviewCount: '1'
              }
            })
          }}
        />
      </Head>

      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1">
          <Hero />
          <Testimonials />
          <Booking />
        </main>

        <Footer />
      </div>
    </>
  );
}
