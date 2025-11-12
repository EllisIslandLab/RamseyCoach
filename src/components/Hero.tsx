'use client';

import { useState } from 'react';
import Image from 'next/image';
import StoryModal from './StoryModal';

export default function Hero() {
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);

  const openStoryModal = () => setIsStoryModalOpen(true);
  const closeStoryModal = () => setIsStoryModalOpen(false);

  return (
    <>
      <section className="relative bg-gradient-to-b from-primary-50 to-white">
        <div className="container-custom section">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="order-2 lg:order-1 text-center lg:text-left">
              <h1 className="text-primary-700 mb-6 leading-tight">
                Take Control of Your Financial Future
              </h1>

              <p className="text-secondary-600 mb-8 max-w-2xl mx-auto lg:mx-0">
                [Your introduction here - Welcome message about your financial coaching services
                and how you help families achieve financial peace through the proven Ramsey
                principles.]
              </p>

              <p className="text-secondary-600 mb-8 max-w-2xl mx-auto lg:mx-0">
                As a Ramsey Preferred Coach, I'm dedicated to helping you build a solid
                financial foundation, eliminate debt, and create lasting wealth for generations
                to come. Whether you're just starting your financial journey or looking to
                optimize your path to financial freedom, I'm here to guide you every step of the
                way.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button onClick={openStoryModal} className="btn-primary">
                  My Story
                </button>

                <a href="#booking" className="btn-accent">
                  Book Free Consultation
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="mt-12 flex flex-wrap gap-6 justify-center lg:justify-start items-center">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-6 h-6 text-accent-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-secondary-600 font-medium">
                    Ramsey Preferred Coach
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <svg
                    className="w-6 h-6 text-accent-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-secondary-600 font-medium">
                    Certified Financial Coach
                  </span>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="order-1 lg:order-2">
              <div className="relative aspect-square lg:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/images/Boat_on_lake.jpg"
                  alt="Financial coaching and wellness"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        {/* Decorative wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            className="w-full h-12 md:h-16 text-white"
            preserveAspectRatio="none"
            viewBox="0 0 1200 120"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </section>

      {/* Story Modal */}
      <StoryModal isOpen={isStoryModalOpen} onClose={closeStoryModal} />
    </>
  );
}
