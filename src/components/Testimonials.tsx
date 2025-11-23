'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Testimonial } from '@/lib/airtable';

export default function Testimonials() {
  // Hardcoded first testimonial for instant page load
  const hardcodedTestimonial: Testimonial = useMemo(() => ({
    id: 'hardcoded-1',
    name: 'Sarah Johnson',
    notes: 'Working with this coach completely transformed our financial life! We paid off $45,000 in debt in just 18 months and now have a fully funded emergency fund. The guidance and accountability were exactly what we needed to stay on track with the Baby Steps.',
    dateCreated: new Date().toISOString(),
  }), []);

  const [testimonials, setTestimonials] = useState<Testimonial[]>([hardcodedTestimonial]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedFromAirtable, setHasLoadedFromAirtable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for Intersection Observer
  const sectionRef = useRef<HTMLElement>(null);

  // Lazy load testimonials from Airtable via API route with retry
  const loadTestimonialsFromAirtable = useCallback(async (retryCount = 0) => {
    if (hasLoadedFromAirtable || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/testimonials?limit=10&offset=0');
      if (!response.ok) {
        // Retry up to 2 times on failure
        if (retryCount < 2) {
          setIsLoading(false);
          setTimeout(() => loadTestimonialsFromAirtable(retryCount + 1), 1000);
          return;
        }
        // After retries, silently fail - we still have the hardcoded testimonial
        console.warn('Failed to fetch testimonials after retries');
        setHasLoadedFromAirtable(true); // Prevent further attempts
        return;
      }
      const airtableTestimonials: Testimonial[] = await response.json();

      if (airtableTestimonials.length > 0) {
        // Combine hardcoded testimonial with Airtable testimonials
        setTestimonials([hardcodedTestimonial, ...airtableTestimonials]);
      }

      setHasLoadedFromAirtable(true);
    } catch (err) {
      // Retry up to 2 times on error
      if (retryCount < 2) {
        setIsLoading(false);
        setTimeout(() => loadTestimonialsFromAirtable(retryCount + 1), 1000);
        return;
      }
      console.warn('Error loading testimonials:', err);
      // Silently fail - we still have the hardcoded testimonial to show
      setHasLoadedFromAirtable(true); // Prevent further attempts
    } finally {
      setIsLoading(false);
    }
  }, [hasLoadedFromAirtable, isLoading, hardcodedTestimonial]);

  // Navigate to previous testimonial
  const goToPrevious = useCallback(async () => {
    if (isTransitioning) return;

    setIsTransitioning(true);

    // Calculate new index
    const newIndex = currentIndex === 0 ? testimonials.length - 1 : currentIndex - 1;

    // Load testimonials if navigating and not yet loaded
    if (newIndex > 0 && !hasLoadedFromAirtable) {
      await loadTestimonialsFromAirtable();
    }

    setCurrentIndex(newIndex);

    // Re-enable navigation after transition
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, [isTransitioning, currentIndex, testimonials.length, hasLoadedFromAirtable, loadTestimonialsFromAirtable]);

  // Navigate to next testimonial
  const goToNext = useCallback(async () => {
    if (isTransitioning) return;

    setIsTransitioning(true);

    // Load testimonials from Airtable if we're about to go past the first one
    if (currentIndex === 0 && !hasLoadedFromAirtable) {
      await loadTestimonialsFromAirtable();
    }

    // Calculate new index
    const newIndex = currentIndex === testimonials.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);

    // Re-enable navigation after transition
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, [isTransitioning, currentIndex, testimonials.length, hasLoadedFromAirtable, loadTestimonialsFromAirtable]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        goToPrevious();
      } else if (event.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  // Smart loading: Load testimonials when section comes into view or nav link is clicked
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || hasLoadedFromAirtable) return;

    // Intersection Observer for scroll detection
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasLoadedFromAirtable) {
          loadTestimonialsFromAirtable();
        }
      },
      { threshold: 0.1 } // Trigger when 10% of section is visible
    );

    observer.observe(section);

    // Also listen for hash changes (when user clicks nav link)
    const handleHashChange = () => {
      if (window.location.hash === '#testimonials' && !hasLoadedFromAirtable) {
        loadTestimonialsFromAirtable();
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    // Check if already on testimonials section on mount
    if (window.location.hash === '#testimonials') {
      loadTestimonialsFromAirtable();
    }

    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [hasLoadedFromAirtable, loadTestimonialsFromAirtable]);

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section id="testimonials" ref={sectionRef} className="section bg-secondary-50">
      <div className="container-custom">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-primary-700 mb-4">What My Clients Say</h2>
          <p className="text-secondary-600 max-w-2xl mx-auto">
            Real stories from real people who have achieved financial freedom with personalized
            coaching and the proven Ramsey Baby Steps.
          </p>
        </div>

        {/* Testimonial Card */}
        <div className="relative max-w-4xl mx-auto">
          {/* Navigation Arrows */}
          <button
            onClick={goToPrevious}
            disabled={isTransitioning}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 touch-target z-10 bg-white rounded-full shadow-lg p-3 text-primary-600 hover:bg-primary-50 hover:text-primary-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Previous testimonial"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={goToNext}
            disabled={isTransitioning}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 touch-target z-10 bg-white rounded-full shadow-lg p-3 text-primary-600 hover:bg-primary-50 hover:text-primary-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Next testimonial"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Testimonial Content */}
          <div
            className={`testimonial-card transition-opacity duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {/* Quote Icon */}
            <div className="flex justify-center mb-6">
              <svg
                className="w-12 h-12 text-accent-500"
                fill="currentColor"
                viewBox="0 0 32 32"
              >
                <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
              </svg>
            </div>

            {/* Testimonial Text */}
            <blockquote className="mb-8">
              <p className="text-lg md:text-xl text-secondary-700 leading-relaxed">
                "{currentTestimonial.notes}"
              </p>
            </blockquote>

            {/* Author */}
            <div className="flex items-center justify-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 font-bold text-lg">
                  {currentTestimonial.name.split(' ').map(n => n.charAt(0)).join('')}
                </span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-secondary-900">
                  {currentTestimonial.name}
                </p>
                <p className="text-sm text-secondary-600">Verified Client</p>
              </div>
            </div>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="mt-6 text-center">
                <p className="text-sm text-secondary-500">Loading more testimonials...</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-6 text-center">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Pagination Dots */}
          <div className="flex justify-center space-x-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!isTransitioning && index !== currentIndex) {
                    setIsTransitioning(true);
                    setCurrentIndex(index);
                    setTimeout(() => setIsTransitioning(false), 300);
                  }
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-primary-600 w-8'
                    : 'bg-secondary-300 hover:bg-secondary-400'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>

          {/* Counter */}
          <div className="text-center mt-4">
            <p className="text-sm text-secondary-500">
              {currentIndex + 1} / {testimonials.length}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
