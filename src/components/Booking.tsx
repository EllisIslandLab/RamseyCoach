'use client';

import { useState } from 'react';
import BookingModal from './BookingModal';

export default function Booking() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const openBookingModal = () => setIsBookingModalOpen(true);
  const closeBookingModal = () => setIsBookingModalOpen(false);

  return (
    <>
      <section id="booking" className="section bg-primary-600">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-accent-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-secondary-900"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>

            {/* Heading */}
            <h2 className="text-white mb-6">Ready to Take Control of Your Finances?</h2>

            {/* Subheading */}
            <p className="text-primary-100 text-xl mb-8 max-w-2xl mx-auto">
              Schedule your free 1-hour consultation today and take the first step toward
              financial peace. Let's work together to create a personalized plan that fits your
              unique situation and goals.
            </p>

            {/* Benefits List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-left">
              <div className="bg-primary-700 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-6 h-6 text-accent-500 flex-shrink-0 mt-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h3 className="text-white font-semibold mb-2">No Obligation</h3>
                    <p className="text-primary-200 text-sm">
                      Your first consultation is completely free with no commitment required.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary-700 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-6 h-6 text-accent-500 flex-shrink-0 mt-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h3 className="text-white font-semibold mb-2">Personalized Plan</h3>
                    <p className="text-primary-200 text-sm">
                      Get a custom financial roadmap tailored to your specific situation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary-700 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-6 h-6 text-accent-500 flex-shrink-0 mt-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h3 className="text-white font-semibold mb-2">Proven Method</h3>
                    <p className="text-primary-200 text-sm">
                      Follow the time-tested Ramsey Baby Steps to achieve financial freedom.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={openBookingModal}
              className="btn-accent text-lg px-8 py-4 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Book Your Free Consultation
            </button>

            {/* Trust Message */}
            <p className="text-primary-200 text-sm mt-6">
              Available Monday - Friday, 9:00 AM - 5:00 PM EST
            </p>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      <BookingModal isOpen={isBookingModalOpen} onClose={closeBookingModal} />
    </>
  );
}
