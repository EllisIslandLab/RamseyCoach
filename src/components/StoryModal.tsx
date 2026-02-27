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
            I grew up in North Eastern Ohio where responsibility was a key lesson from my
            parents. Everything they did with me and my other two brothers was carefully thought
            out, and once we signed up for an activity, we had to follow through.
          </p>

          <p className="text-secondary-700 mb-4">
            I think this is a great way to live life, and it&apos;s also a great value to apply to
            personal finances. If you&apos;re ready to get on a plan and follow through, I think
            we&apos;ll be a perfect fit!
          </p>

          <h3 className="text-2xl font-bold text-primary-600 mt-8 mb-4">
            My Journey to Financial Freedom
          </h3>

          <p className="text-secondary-700 mb-4">
            I&apos;m not going to lie just to make my story artificially inspiring. My parents
            supplied my brothers and I every basic need through Biblical principals. They even
            paid our ways through college. To be fair to myself and my brothers, none of us grew
            up to become entitled brats. We were privileged, but I think we all knew it. I showed
            that I was grateful for everything my parents gave me by buckling down, and studying
            hard. I even saved money by going to community college for two-and-a-half years, and
            reduced costs to my university by applying for, and attaining the position of
            Communications Director for Student Senate.
          </p>

          <p className="text-secondary-700 mb-4">
            The solid Biblical foundation built by the examples set by my parents has helped me
            become the responsible husband and father I am today. It&apos;s not a rags to riches
            inspiring story, but it&apos;s not a total screw-up, so for that I can hold my head
            up. I also hope to pass on the examples given to me to others. I&apos;ve seen them,
            lived them, and I now teach them. They&apos;re not hard. They&apos;re the basics. My
            parents, I, and &mdash; yes &mdash; you can do these basics too.
          </p>

          <h3 className="text-2xl font-bold text-primary-600 mt-8 mb-4">
            Why I Became a Financial Coach
          </h3>

          <p className="text-secondary-700 mb-4">
            My dad taught Financial Peace University (FPU) as the Treasurer of our church. The
            responsible money values he instilled in my brothers and I came through those
            teachings as well. Recently he passed the Treasurer duties to me, and now I&apos;m
            following in those footsteps. As the Treasurer, I&apos;m always available to friends
            and family of my church for financial coaching. That service has also extended to
            anyone outside of the church as I&apos;ve grown my practice.
          </p>

          <p className="text-secondary-700 mb-4">
            If you&apos;ve made it through my whole biography, I&apos;d be more than happy to
            give you a no obligation consultation for financial coaching, and to get to know you
            as a person since you took the time for me. Thanks again, and I look forward to
            getting to know you!
          </p>

          <div className="mt-8 p-6 bg-primary-50 rounded-lg border-l-4 border-primary-600">
            <p className="text-primary-800 font-semibold italic">
              &quot;My mission is to help you achieve financial peace and build the life you&apos;ve
              always dreamed of.&quot;
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
