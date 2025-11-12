'use client';

import { useEffect, useState } from 'react';
import {
  createConsultation,
  getAvailableSlots,
  isWeekday,
  isPastDate,
  TimeSlot,
} from '@/lib/airtable';
import {
  detectUserTimezone,
  getTimezoneFriendlyName,
  convertFromEST,
  formatTimeForDisplay,
  calculateEndTime,
  USA_TIMEZONES,
  USATimezoneKey,
} from '@/lib/timezone';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BookingStep = 'calendar' | 'timeSlots' | 'contactInfo' | 'success';

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  // Modal state
  const [isAnimating, setIsAnimating] = useState(false);
  const [step, setStep] = useState<BookingStep>('calendar');

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Timezone state
  const [userTimezone, setUserTimezone] = useState<string | null>(null);
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);
  const [manualTimezoneSelection, setManualTimezoneSelection] = useState(false);

  // Time slot state
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Contact form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialize timezone detection
  useEffect(() => {
    const detected = detectUserTimezone();
    setDetectedTimezone(detected);
    setUserTimezone(detected || 'EST');
  }, []);

  // Handle modal open/close animations
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => {
        setIsAnimating(false);
        // Reset state when modal closes
        setStep('calendar');
        setSelectedDate(null);
        setSelectedTimeSlot(null);
        setFirstName('');
        setLastName('');
        setEmail('');
        setFormError(null);
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

  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  // Handle date selection
  const handleDateSelect = async (date: Date) => {
    if (!isWeekday(date) || isPastDate(date)) return;

    setSelectedDate(date);
    setStep('timeSlots');
    await loadAvailableSlots(date);
  };

  // Load available time slots for a date
  const loadAvailableSlots = async (date: Date) => {
    setIsLoadingSlots(true);

    try {
      const dateString = date.toISOString().split('T')[0];
      const slots = await getAvailableSlots(dateString);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading time slots:', error);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Handle time slot selection
  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
    setStep('contactInfo');
  };

  // Handle booking submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedDate || !selectedTimeSlot || !userTimezone) {
      setFormError('Please select a date and time slot');
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setFormError('Please fill in all required fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const dateString = selectedDate.toISOString().split('T')[0];

      // Format user local time for reference
      const userLocalTime = `${formatTimeForDisplay(selectedTimeSlot.start)} - ${formatTimeForDisplay(selectedTimeSlot.end)}`;

      await createConsultation({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        bookingType: 'Free Consultation',
        dateBooked: dateString,
        timeSlotStart: selectedTimeSlot.start,
        timeSlotEnd: selectedTimeSlot.end,
        userTimezone: userTimezone,
        userLocalTime: userLocalTime,
      });

      setStep('success');
    } catch (error) {
      console.error('Error creating booking:', error);
      setFormError('Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Go back to previous step
  const goBack = () => {
    if (step === 'timeSlots') {
      setStep('calendar');
      setSelectedTimeSlot(null);
    } else if (step === 'contactInfo') {
      setStep('timeSlots');
    }
  };

  if (!isOpen && !isAnimating) return null;

  const calendarDays = generateCalendarDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
        className={`modal-content max-w-4xl p-8 ${isOpen ? 'animate-fadeIn' : 'animate-fadeOut'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
      >
        {/* Close Button */}
        {step !== 'success' && (
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
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Back Button */}
        {(step === 'timeSlots' || step === 'contactInfo') && (
          <button
            onClick={goBack}
            className="absolute top-4 left-4 touch-target text-secondary-500 hover:text-secondary-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg flex items-center space-x-1"
            aria-label="Go back"
          >
            <svg
              className="w-5 h-5"
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
            <span className="text-sm font-medium">Back</span>
          </button>
        )}

        {/* Calendar Step */}
        {step === 'calendar' && (
          <div>
            <h2 id="booking-modal-title" className="text-3xl font-bold text-primary-700 mb-6 text-center">
              Select a Date
            </h2>

            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={goToPreviousMonth}
                className="touch-target p-2 rounded-lg hover:bg-primary-50 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Previous month"
              >
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h3 className="text-xl font-semibold text-secondary-900">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>

              <button
                onClick={goToNextMonth}
                className="touch-target p-2 rounded-lg hover:bg-primary-50 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Next month"
              >
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {/* Weekday headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center font-semibold text-secondary-600 py-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const isToday = date.getTime() === today.getTime();
                const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
                const isDisabled = !isWeekday(date) || isPastDate(date);
                const isWeekend = !isWeekday(date);

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => handleDateSelect(date)}
                    disabled={isDisabled}
                    className={`calendar-day ${isSelected ? 'calendar-day-selected' : ''} ${
                      isToday ? 'calendar-day-today' : ''
                    } ${isDisabled && !isWeekend ? 'calendar-day-disabled' : ''} ${
                      isWeekend ? 'calendar-day-weekend' : ''
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center text-sm text-secondary-600">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-primary-600 rounded"></div>
                <span>Today</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-primary-600 rounded"></div>
                <span>Selected</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-secondary-200 rounded opacity-50 line-through"></div>
                <span>Weekend</span>
              </div>
            </div>

            <p className="text-center text-secondary-600 mt-6">
              Available Monday - Friday, 8:00 AM - 5:00 PM EST
            </p>
          </div>
        )}

        {/* Time Slots Step */}
        {step === 'timeSlots' && selectedDate && (
          <div>
            <h2 className="text-3xl font-bold text-primary-700 mb-2 text-center">
              Select a Time
            </h2>
            <p className="text-secondary-600 text-center mb-6">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>

            {/* Timezone Detection/Selection */}
            <div className="mb-6 p-4 bg-primary-50 rounded-lg">
              {detectedTimezone && !manualTimezoneSelection ? (
                <div>
                  <p className="text-sm text-secondary-700 mb-2">
                    <span className="font-semibold">Detected Timezone:</span>{' '}
                    {getTimezoneFriendlyName(detectedTimezone)}
                  </p>
                  <button
                    onClick={() => setManualTimezoneSelection(true)}
                    className="text-sm text-primary-600 hover:text-primary-700 underline"
                  >
                    Change timezone
                  </button>
                </div>
              ) : (
                <div>
                  <label htmlFor="timezone-select" className="block text-sm font-semibold text-secondary-700 mb-2">
                    Select Your Timezone:
                  </label>
                  <select
                    id="timezone-select"
                    value={userTimezone || ''}
                    onChange={(e) => setUserTimezone(e.target.value)}
                    className="input"
                  >
                    {Object.entries(USA_TIMEZONES).map(([key, value]) => (
                      <option key={key} value={key}>
                        {getTimezoneFriendlyName(key)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Time Slots */}
            {isLoadingSlots ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                <p className="mt-4 text-secondary-600">Loading available times...</p>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-2">
                {availableSlots.map((slot, index) => {
                  // Convert EST times to user's timezone for display
                  const displayStart = userTimezone
                    ? formatTimeForDisplay(
                        convertFromEST(
                          selectedDate.toISOString().split('T')[0],
                          slot.start,
                          userTimezone
                        )
                      )
                    : formatTimeForDisplay(slot.start);

                  const displayEnd = userTimezone
                    ? formatTimeForDisplay(
                        convertFromEST(
                          selectedDate.toISOString().split('T')[0],
                          slot.end,
                          userTimezone
                        )
                      )
                    : formatTimeForDisplay(slot.end);

                  return (
                    <button
                      key={index}
                      onClick={() => handleTimeSlotSelect(slot)}
                      disabled={!slot.available}
                      className={`time-slot ${
                        selectedTimeSlot === slot ? 'time-slot-selected' : ''
                      } ${!slot.available ? 'time-slot-disabled' : ''}`}
                    >
                      {displayStart} - {displayEnd}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-secondary-400"
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
                <p className="text-secondary-600">No available times for this date.</p>
                <p className="text-sm text-secondary-500 mt-2">
                  Please select a different date or contact us directly.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Contact Info Step */}
        {step === 'contactInfo' && selectedDate && selectedTimeSlot && (
          <div>
            <h2 className="text-3xl font-bold text-primary-700 mb-6 text-center">
              Confirm Your Booking
            </h2>

            {/* Booking Summary */}
            <div className="bg-primary-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-primary-800 mb-3">Booking Summary</h3>
              <div className="space-y-2 text-secondary-700">
                <p>
                  <span className="font-medium">Date:</span>{' '}
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <p>
                  <span className="font-medium">Time:</span>{' '}
                  {formatTimeForDisplay(selectedTimeSlot.start)} -{' '}
                  {formatTimeForDisplay(selectedTimeSlot.end)}{' '}
                  {userTimezone && `(${getTimezoneFriendlyName(userTimezone)})`}
                </p>
                <p>
                  <span className="font-medium">Type:</span> Free 30-Minute Consultation
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-secondary-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
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
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input"
                  placeholder="john.doe@example.com"
                />
              </div>

              {/* Error Message */}
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full"
              >
                {isSubmitting ? 'Booking...' : 'Confirm Booking'}
              </button>

              <p className="text-xs text-secondary-500 text-center">
                You will receive an email confirmation shortly after booking.
              </p>
            </form>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="text-center py-12">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-primary-700 mb-4">
              Your consultation is booked!
            </h2>

            <p className="text-lg text-secondary-600 mb-8 max-w-md mx-auto">
              You will receive an email confirmation shortly with all the details and instructions for your consultation.
            </p>

            <button onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
}
