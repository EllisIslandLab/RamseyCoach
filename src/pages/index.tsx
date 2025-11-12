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
