import Head from 'next/head';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy | Money-Willo</title>
        <meta
          name="description"
          content="Read my privacy policy to understand how I collect, use, and protect your personal information."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="48x48" />
        <link rel="apple-touch-icon" href="/favicon.png" sizes="180x180" />
      </Head>

      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 bg-secondary-50">
          <div className="container-custom section">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 md:p-12">
              <h1 className="text-primary-700 mb-4">Privacy Policy</h1>
              <p className="text-secondary-600 mb-8">
                Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-700 mb-6">
                  Your privacy matters to me. This policy explains what information I collect when you use this
                  website or work with me as a coaching client, and how that information is handled. I keep things
                  simple and straightforward — just like a good budget.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">1. Introduction</h2>
                <p className="text-secondary-700 mb-4">
                  Money-Willo is an independent financial coaching practice operated as a branch of Web Launch
                  Academy LLC. This Privacy Policy describes how I collect, use, and protect your personal
                  information when you visit this website or engage my coaching services. I am committed to
                  handling your information with the same care and intentionality I encourage in every area of
                  personal finance.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">2. Information I Collect</h2>
                <p className="text-secondary-700 mb-4">
                  I may collect the following types of information:
                </p>
                <ul className="list-disc list-inside text-secondary-700 mb-4 space-y-2">
                  <li>Personal identification information (name, email address, phone number)</li>
                  <li>Financial information provided during coaching sessions</li>
                  <li>Booking and appointment information</li>
                  <li>Website usage data and analytics</li>
                  <li>Communications between you and me</li>
                </ul>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">3. How I Use Your Information</h2>
                <p className="text-secondary-700 mb-4">
                  I use your information for the following purposes:
                </p>
                <ul className="list-disc list-inside text-secondary-700 mb-4 space-y-2">
                  <li>To provide financial coaching services</li>
                  <li>To schedule and manage appointments</li>
                  <li>To communicate with you about my services</li>
                  <li>To send appointment reminders and follow-ups</li>
                  <li>To improve my website and services</li>
                  <li>To comply with legal obligations</li>
                </ul>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">4. Information Sharing and Disclosure</h2>
                <p className="text-secondary-700 mb-4">
                  I do not sell, trade, or rent your personal information to third parties. I may share your
                  information with:
                </p>
                <ul className="list-disc list-inside text-secondary-700 mb-4 space-y-2">
                  <li>Service providers who assist in operating my website and conducting my business</li>
                  <li>Legal authorities when required by law or to protect my rights</li>
                  <li>Third parties with your explicit consent</li>
                </ul>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">5. Data Security</h2>
                <p className="text-secondary-700 mb-4">
                  I implement appropriate technical and organizational measures to protect your personal information
                  against unauthorized access, alteration, disclosure, or destruction. However, no method of
                  transmission over the Internet is 100% secure.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">6. Cookies and Tracking Technologies</h2>
                <p className="text-secondary-700 mb-4">
                  My website may use cookies and similar tracking technologies to enhance your browsing experience
                  and analyze website traffic. You can control cookie settings through your browser preferences.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">7. Your Rights</h2>
                <p className="text-secondary-700 mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc list-inside text-secondary-700 mb-4 space-y-2">
                  <li>Access your personal information</li>
                  <li>Request correction of inaccurate information</li>
                  <li>Request deletion of your information</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Object to processing of your information</li>
                </ul>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">8. Children's Privacy</h2>
                <p className="text-secondary-700 mb-4">
                  My services are not directed to individuals under the age of 18. I do not knowingly collect
                  personal information from children.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">9. Changes to This Privacy Policy</h2>
                <p className="text-secondary-700 mb-4">
                  I may update this Privacy Policy from time to time. I will notify you of any changes by posting
                  the new Privacy Policy on this page and updating the "Last Updated" date.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">10. Contact Me</h2>
                <p className="text-secondary-700 mb-4">
                  If you have any questions about this Privacy Policy, please contact me at:
                </p>
                <div className="bg-primary-50 p-6 rounded-lg">
                  <p className="text-secondary-700">
                    The best way to reach me is through the contact form on this website. I respond to all
                    inquiries within 24–48 business hours.
                  </p>
                  <p className="text-secondary-700 mt-3">
                    <strong>Business:</strong> Money-Willo, a branch of Web Launch Academy LLC
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
