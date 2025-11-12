'use client';

import { useEffect, useState } from 'react';

interface StoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StoryModal({ isOpen, onClose }: StoryModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Delay unmounting to allow fade-out animation
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);

      document.body.style.overflow = 'unset';

      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen && !isAnimating) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`modal-overlay ${isOpen ? 'animate-fadeIn' : 'animate-fadeOut'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className={`modal-content max-w-3xl p-8 ${isOpen ? 'animate-fadeIn' : 'animate-fadeOut'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-modal-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 touch-target text-secondary-500 hover:text-secondary-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg"
          aria-label="Close modal"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Modal Header */}
        <h2
          id="story-modal-title"
          className="text-3xl md:text-4xl font-bold text-primary-700 mb-6"
        >
          My Story
        </h2>

        {/* Modal Body */}
        <div className="prose prose-lg max-w-none">
          <p className="text-secondary-700 mb-4">
            [Your introduction here - This is a placeholder for your personal story and journey
            into financial coaching.]
          </p>

          <p className="text-secondary-700 mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>

          <p className="text-secondary-700 mb-4">
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
            fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa
            qui officia deserunt mollit anim id est laborum.
          </p>

          <h3 className="text-2xl font-bold text-primary-600 mt-8 mb-4">
            My Journey to Financial Freedom
          </h3>

          <p className="text-secondary-700 mb-4">
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
            laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi
            architecto beatae vitae dicta sunt explicabo.
          </p>

          <p className="text-secondary-700 mb-4">
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
            consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
          </p>

          <h3 className="text-2xl font-bold text-primary-600 mt-8 mb-4">
            Why I Became a Ramsey Preferred Coach
          </h3>

          <p className="text-secondary-700 mb-4">
            Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur,
            adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore
            magnam aliquam quaerat voluptatem.
          </p>

          <p className="text-secondary-700 mb-4">
            Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit
            laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure
            reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.
          </p>

          <div className="mt-8 p-6 bg-primary-50 rounded-lg border-l-4 border-primary-600">
            <p className="text-primary-800 font-semibold italic">
              "My mission is to help you achieve financial peace and build the life you've
              always dreamed of."
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-8 flex justify-end">
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </>
  );
}
