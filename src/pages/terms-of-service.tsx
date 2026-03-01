import Head from 'next/head';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TermsOfService() {
  return (
    <>
      <Head>
        <title>Terms of Service | Money-Willo</title>
        <meta
          name="description"
          content="Read my terms of service to understand the guidelines and policies for using my financial coaching services."
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
              <h1 className="text-primary-700 mb-4">Terms of Service</h1>
              <p className="text-secondary-600 mb-8">
                Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <div className="prose prose-lg max-w-none">
                <p className="text-secondary-700 mb-6">
                  Please read these terms carefully before booking a session or using this website. By using my
                  services, you agree to what is outlined below. If you have any questions, reach out through the
                  contact form and I am happy to walk you through anything.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">1. Acceptance of Terms</h2>
                <p className="text-secondary-700 mb-4">
                  By accessing this website or scheduling a coaching session with Money-Willo, you agree to be
                  bound by these Terms of Service. If you do not agree with any part of these terms, please do
                  not book a session or use this website.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">2. Description of Services</h2>
                <p className="text-secondary-700 mb-4">
                  Money-Willo provides personal financial coaching services to individuals and families who are
                  ready to take control of their money. Coaching focuses on practical tools like budgeting, debt
                  elimination, building an emergency fund, and developing habits that lead to long-term financial
                  stability. Sessions are built around personal accountability and a step-by-step approach to
                  getting your finances on track.
                </p>
                <p className="text-secondary-700 mb-4">
                  Money-Willo is an independent coaching practice operated as a branch of Web Launch Academy LLC.
                  It is not affiliated with or endorsed by Dave Ramsey, Ramsey Solutions, or any other financial
                  organization.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">3. Nature of Coaching Services</h2>
                <p className="text-secondary-700 mb-4">
                  <strong>Coaching is education and accountability — not professional financial advice.</strong> My
                  services are designed to help you understand your finances and build better habits, but they do
                  not constitute:
                </p>
                <ul className="list-disc list-inside text-secondary-700 mb-4 space-y-2">
                  <li>Financial planning or investment advisory services</li>
                  <li>Legal advice of any kind</li>
                  <li>Tax preparation or tax advice</li>
                  <li>Accounting or bookkeeping services</li>
                  <li>Credit counseling or credit repair services</li>
                  <li>Insurance recommendations</li>
                </ul>
                <p className="text-secondary-700 mb-4">
                  I hold no financial licenses, securities licenses, or professional certifications beyond my
                  coaching training. For matters requiring licensed expertise — such as investment accounts, tax
                  filing, estate planning, or legal documents — please consult a qualified professional in that
                  field. I am happy to encourage you to take that step as part of your financial journey.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">4. Client Responsibilities</h2>
                <p className="text-secondary-700 mb-4">
                  Financial coaching works best when both sides show up ready. As a client, you agree to:
                </p>
                <ul className="list-disc list-inside text-secondary-700 mb-4 space-y-2">
                  <li>Provide honest and accurate information about your financial situation</li>
                  <li>Attend scheduled sessions or provide at least 24 hours notice if you need to cancel or reschedule</li>
                  <li>Take ownership of the financial decisions you make — coaching provides guidance, but you are responsible for your choices</li>
                  <li>Treat coaching materials, worksheets, and resources as confidential and for your personal use only</li>
                  <li>Pay any agreed-upon fees in a timely manner</li>
                </ul>
                <p className="text-secondary-700 mb-4">
                  The most important thing you can bring to coaching is a willingness to follow through. If you
                  commit to a plan, commit to working it.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">5. Booking and Cancellation Policy</h2>
                <p className="text-secondary-700 mb-4">
                  <strong>Booking:</strong> Sessions are scheduled through my online booking system. You will
                  receive a confirmation once your appointment is set.
                </p>
                <p className="text-secondary-700 mb-4">
                  <strong>Cancellations:</strong> Life happens. If you need to cancel or reschedule, please do so
                  at least 24 hours before your appointment. Repeated no-shows or last-minute cancellations may
                  result in a cancellation fee or termination of the coaching relationship.
                </p>
                <p className="text-secondary-700 mb-4">
                  <strong>Late arrivals:</strong> If you arrive late to a session, the session will still end at
                  the scheduled time. Please be on time so you get the full value of our time together.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">6. Payment Terms</h2>
                <p className="text-secondary-700 mb-4">
                  Free consultations are provided at no charge and carry no obligation. For paid coaching packages
                  or sessions, payment is due at the time of booking unless otherwise agreed upon in writing.
                  Accepted payment methods will be confirmed during the booking process.
                </p>
                <p className="text-secondary-700 mb-4">
                  Paying for coaching is itself a step of commitment. I want to see you succeed, and I take that
                  responsibility seriously.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">7. Refund Policy</h2>
                <p className="text-secondary-700 mb-4">
                  Free consultations are at no cost and no refund is applicable. For paid services, if a session
                  has not yet taken place and you cancel with at least 48 hours notice, a full refund will be
                  issued. Sessions that have already been completed are non-refundable. For multi-session packages,
                  unused sessions may be refunded at a prorated rate upon written request. Please reach out
                  through the contact form to discuss any refund questions.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">8. Confidentiality</h2>
                <p className="text-secondary-700 mb-4">
                  What you share in coaching stays in coaching. I take confidentiality seriously. Your personal
                  and financial information will not be shared with anyone outside of this coaching relationship
                  without your explicit written consent, except where required by law.
                </p>
                <p className="text-secondary-700 mb-4">
                  In return, I ask that you keep our sessions and any resources I share with you confidential as
                  well. Coaching materials are provided for your personal use only.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">9. Intellectual Property</h2>
                <p className="text-secondary-700 mb-4">
                  All content on this website — including text, graphics, coaching worksheets, and other
                  materials — is the property of Money-Willo / Web Launch Academy LLC and may not be reproduced,
                  shared publicly, or used commercially without written permission. You are welcome to use
                  materials for your own personal financial journey.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">10. Limitation of Liability</h2>
                <p className="text-secondary-700 mb-4">
                  I will show up prepared and give you my best in every session. However, coaching does not
                  guarantee specific financial outcomes. Your results depend on your own actions and circumstances.
                  Money-Willo and Web Launch Academy LLC are not liable for any financial losses or consequences
                  that result from choices you make during or after coaching. All financial decisions are
                  ultimately yours to make and yours to own.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">11. Indemnification</h2>
                <p className="text-secondary-700 mb-4">
                  You agree to hold harmless Money-Willo, Web Launch Academy LLC, and its owner from any claims,
                  losses, or expenses arising from your use of these services or from any violation of these
                  Terms of Service.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">12. Termination</h2>
                <p className="text-secondary-700 mb-4">
                  Either of us can end the coaching relationship at any time with written notice. I want this to
                  be a good fit for both of us. If it is not working, that is okay. Upon termination, you remain
                  responsible for any fees already due for services rendered. Unused prepaid sessions may be
                  refunded according to the refund policy above.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">13. Modifications to Terms</h2>
                <p className="text-secondary-700 mb-4">
                  I may update these Terms of Service from time to time. When I do, the updated date at the top
                  of this page will change. Continued use of my services after changes are posted means you
                  accept the updated terms.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">14. Governing Law</h2>
                <p className="text-secondary-700 mb-4">
                  These Terms of Service are governed by the laws of the State of Ohio. Any disputes arising
                  from these terms or from my services shall be resolved in the courts of Ohio.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mt-8 mb-4">15. Contact Information</h2>
                <p className="text-secondary-700 mb-4">
                  If you have any questions about these Terms of Service, please reach out through the contact
                  form on this website. I am happy to talk through anything.
                </p>
                <div className="bg-primary-50 p-6 rounded-lg">
                  <p className="text-secondary-700">
                    <strong>Business:</strong> Money-Willo, a branch of Web Launch Academy LLC
                  </p>
                  <p className="text-secondary-700 mt-2">
                    <strong>Contact:</strong> Use the <a href="/contact" className="text-primary-600 underline">contact form</a> on this website
                  </p>
                  <p className="text-secondary-700 mt-2">
                    <strong>Response time:</strong> Within 24–48 business hours
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
