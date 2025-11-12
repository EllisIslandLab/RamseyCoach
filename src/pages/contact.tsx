import Head from 'next/head';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact Us | Ramsey Preferred Coach</title>
        <meta
          name="description"
          content="Get in touch with our certified financial coaching team. We're here to help you achieve financial peace."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 bg-secondary-50">
          <div className="container-custom section">
            {/* Page Header */}
            <div className="text-center mb-12">
              <h1 className="text-primary-700 mb-4">Get In Touch</h1>
              <p className="text-secondary-600 text-lg max-w-2xl mx-auto">
                Have questions about financial coaching? Want to learn more about how we can help you
                achieve financial freedom? We'd love to hear from you.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {/* Contact Information */}
              <div>
                <h2 className="text-2xl font-bold text-primary-700 mb-6">Contact Information</h2>

                <div className="space-y-6">
                  {/* Email */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-primary-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-secondary-900 mb-1">Email</h3>
                      <a
                        href="mailto:coach@example.com"
                        className="text-primary-600 hover:text-primary-700"
                      >
                        [coach@example.com]
                      </a>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-primary-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-secondary-900 mb-1">Phone</h3>
                      <a
                        href="tel:+15555551234"
                        className="text-primary-600 hover:text-primary-700"
                      >
                        [(555) 555-1234]
                      </a>
                    </div>
                  </div>

                  {/* Office Hours */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-primary-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-secondary-900 mb-1">Office Hours</h3>
                      <p className="text-secondary-600">Monday - Friday</p>
                      <p className="text-secondary-600">8:00 AM - 5:00 PM EST</p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-primary-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-secondary-900 mb-1">Location</h3>
                      <p className="text-secondary-600">[Your Business Name]</p>
                      <p className="text-secondary-600">[Street Address]</p>
                      <p className="text-secondary-600">[City, State ZIP]</p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-10 p-6 bg-primary-600 rounded-lg">
                  <h3 className="text-white font-semibold text-lg mb-3">
                    Ready to Get Started?
                  </h3>
                  <p className="text-primary-100 mb-4">
                    Schedule your free consultation today and take the first step toward financial
                    peace.
                  </p>
                  <a href="/#booking" className="btn-accent inline-block">
                    Book Free Consultation
                  </a>
                </div>
              </div>

              {/* Contact Form Placeholder */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold text-primary-700 mb-6">Send Us a Message</h2>

                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-secondary-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        required
                        className="input"
                        placeholder="John"
                      />
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-secondary-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        required
                        className="input"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="input"
                      placeholder="john.doe@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-secondary-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="input"
                      placeholder="(555) 555-1234"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-secondary-700 mb-1">
                      Subject *
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      required
                      className="input"
                      placeholder="How can we help you?"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-secondary-700 mb-1">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      className="input resize-none"
                      placeholder="Tell us about your financial goals..."
                    />
                  </div>

                  <button type="submit" className="btn-primary w-full">
                    Send Message
                  </button>

                  <p className="text-xs text-secondary-500 text-center">
                    We'll respond to your inquiry within 24 hours during business days.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
