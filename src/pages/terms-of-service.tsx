import Head from 'next/head';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TermsOfService() {
  return (
    <>
      <Head>
        <title>Terms of Service | Ramsey Preferred Coach</title>
        <meta
          name="description"
          content="Read our terms of service to understand the guidelines and policies for using our financial coaching services."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 bg-secondary-50">
          <div className="container-custom section">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 md:p-12">
              <h1 className="text-primary-700 mb-4">Terms of Service</h1>
              <p className="text-secondary-600 mb-8">
                Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-700 mb-6">
                  [This is a placeholder terms of service document. Please consult with a legal professional to create
                  comprehensive terms of service tailored to your business needs and compliant with applicable laws.]
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">1. Acceptance of Terms</h2>
                <p className="text-secondary-700 mb-4">
                  By accessing and using this website and our coaching services, you accept and agree to be bound by
                  these Terms of Service. If you do not agree to these terms, please do not use our services.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">2. Description of Services</h2>
                <p className="text-secondary-700 mb-4">
                  We provide financial coaching services designed to help individuals and families achieve financial
                  wellness through education, accountability, and personalized guidance based on proven financial
                  principles.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">3. Nature of Coaching Services</h2>
                <p className="text-secondary-700 mb-4">
                  <strong>Important Disclaimer:</strong> Our coaching services are educational in nature and do not
                  constitute:
                </p>
                <ul className="list-disc list-inside text-secondary-700 mb-4 space-y-2">
                  <li>Financial planning or investment advice</li>
                  <li>Legal advice</li>
                  <li>Tax advice</li>
                  <li>Accounting services</li>
                  <li>Credit repair services</li>
                </ul>
                <p className="text-secondary-700 mb-4">
                  For specific financial, legal, or tax advice, please consult with a licensed professional in the
                  appropriate field.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">4. Client Responsibilities</h2>
                <p className="text-secondary-700 mb-4">
                  As a client, you agree to:
                </p>
                <ul className="list-disc list-inside text-secondary-700 mb-4 space-y-2">
                  <li>Provide accurate and complete information</li>
                  <li>Attend scheduled coaching sessions or provide adequate notice for cancellations</li>
                  <li>Take responsibility for implementing financial strategies discussed during coaching</li>
                  <li>Maintain confidentiality of coaching materials and resources provided</li>
                  <li>Pay all fees as agreed upon in a timely manner</li>
                </ul>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">5. Booking and Cancellation Policy</h2>
                <p className="text-secondary-700 mb-4">
                  <strong>Booking:</strong> Consultations can be booked through our online booking system. You will
                  receive a confirmation email upon successful booking.
                </p>
                <p className="text-secondary-700 mb-4">
                  <strong>Cancellation:</strong> If you need to cancel or reschedule an appointment, please provide at
                  least 24 hours notice. Late cancellations or no-shows may result in fees.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">6. Payment Terms</h2>
                <p className="text-secondary-700 mb-4">
                  Payment for coaching services is due at the time of booking or as otherwise agreed upon in writing.
                  We accept various payment methods as indicated during the booking process.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">7. Refund Policy</h2>
                <p className="text-secondary-700 mb-4">
                  Free consultations are provided at no charge. For paid services, refunds may be available under
                  certain circumstances as outlined in your service agreement. Please contact us to discuss refund
                  requests.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">8. Confidentiality</h2>
                <p className="text-secondary-700 mb-4">
                  We maintain strict confidentiality regarding your personal and financial information shared during
                  coaching sessions. Information will not be shared with third parties except as required by law or
                  with your explicit consent.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">9. Intellectual Property</h2>
                <p className="text-secondary-700 mb-4">
                  All content on this website, including text, graphics, logos, and coaching materials, is the property
                  of our coaching practice or our licensors and is protected by copyright and other intellectual
                  property laws. You may not reproduce, distribute, or create derivative works without written
                  permission.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">10. Limitation of Liability</h2>
                <p className="text-secondary-700 mb-4">
                  Our coaching services are provided "as is" without any warranties. We are not liable for any
                  financial losses, damages, or consequences resulting from actions taken or not taken based on our
                  coaching advice. You acknowledge that all financial decisions are ultimately your responsibility.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">11. Indemnification</h2>
                <p className="text-secondary-700 mb-4">
                  You agree to indemnify and hold harmless our coaching practice, its owners, and employees from any
                  claims, damages, or expenses arising from your use of our services or violation of these terms.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">12. Termination</h2>
                <p className="text-secondary-700 mb-4">
                  Either party may terminate the coaching relationship at any time with written notice. Upon
                  termination, you remain responsible for any outstanding fees for services already provided.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">13. Modifications to Terms</h2>
                <p className="text-secondary-700 mb-4">
                  We reserve the right to modify these Terms of Service at any time. Changes will be effective
                  immediately upon posting to this website. Your continued use of our services constitutes acceptance
                  of any modifications.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">14. Governing Law</h2>
                <p className="text-secondary-700 mb-4">
                  These Terms of Service are governed by the laws of [Your State/Country]. Any disputes arising from
                  these terms or our services shall be resolved in the courts of [Your Jurisdiction].
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">15. Contact Information</h2>
                <p className="text-secondary-700 mb-4">
                  If you have any questions about these Terms of Service, please contact us at:
                </p>
                <div className="bg-primary-50 p-6 rounded-lg">
                  <p className="text-secondary-700">
                    <strong>Email:</strong> [coach@example.com]
                  </p>
                  <p className="text-secondary-700 mt-2">
                    <strong>Phone:</strong> [(555) 555-1234]
                  </p>
                  <p className="text-secondary-700 mt-2">
                    <strong>Address:</strong> [Your Business Address]
                  </p>
                </div>

                <div className="mt-8 p-6 bg-accent-50 border-l-4 border-accent-500 rounded">
                  <p className="text-sm text-secondary-700 italic">
                    <strong>Important:</strong> This is a template terms of service document and should be reviewed and
                    customized by a legal professional to ensure compliance with applicable laws and regulations. Terms
                    should be tailored to your specific business practices and jurisdiction.
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
