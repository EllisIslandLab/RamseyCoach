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
        <title>Ramsey Preferred Coach | Financial Coaching & Consulting</title>
        <meta
          name="description"
          content="Achieve financial peace with personalized coaching from a certified Ramsey Preferred Coach. Get out of debt, build wealth, and secure your financial future."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://ramseycoach.com/" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ramseycoach.com/" />
        <meta property="og:title" content="Ramsey Preferred Coach | Financial Coaching & Consulting" />
        <meta
          property="og:description"
          content="Achieve financial peace with personalized coaching from a certified Ramsey Preferred Coach. Get out of debt, build wealth, and secure your financial future."
        />
        <meta property="og:image" content="https://ramseycoach.com/images/og-image.jpg" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://ramseycoach.com/" />
        <meta name="twitter:title" content="Ramsey Preferred Coach | Financial Coaching & Consulting" />
        <meta
          name="twitter:description"
          content="Achieve financial peace with personalized coaching from a certified Ramsey Preferred Coach. Get out of debt, build wealth, and secure your financial future."
        />
        <meta name="twitter:image" content="https://ramseycoach.com/images/og-image.jpg" />

        {/* Schema.org JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FinancialService',
              name: 'Ramsey Preferred Coach',
              description: 'Certified Ramsey Preferred Coach providing personalized financial coaching and consulting services.',
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
