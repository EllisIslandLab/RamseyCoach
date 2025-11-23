'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  isWeekday,
  isPastDate,
  TimeSlot,
  Consultation,
  ClientFormData,
  RelationshipStatus,
  AgeRange,
  EmploymentStatus,
  ReasonForVisit,
  DebtType,
  PreferredContactMethod,
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

  // Fully booked dates state (for calendar indicators)
  const [fullyBookedDates, setFullyBookedDates] = useState<Set<string>>(new Set());
  const [isLoadingBookedDates, setIsLoadingBookedDates] = useState(false);
  const [cachedMonths, setCachedMonths] = useState<Map<string, string[]>>(new Map());

  // Client form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState<RelationshipStatus | ''>('');
  const [householdSize, setHouseholdSize] = useState<number | ''>('');
  const [ageRange, setAgeRange] = useState<AgeRange | ''>('');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus | ''>('');
  const [reasonForVisit, setReasonForVisit] = useState<ReasonForVisit | ''>('');
  const [primaryFinancialConcern, setPrimaryFinancialConcern] = useState('');
  const [currentDebtType, setCurrentDebtType] = useState<DebtType[]>([]);
  const [preferredContactMethod, setPreferredContactMethod] = useState<PreferredContactMethod | ''>('');
  const [bestTimeToContact, setBestTimeToContact] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialize timezone detection
  useEffect(() => {
    const detected = detectUserTimezone();
    setDetectedTimezone(detected);
    setUserTimezone(detected || 'EST');
  }, []);

  // Fetch fully booked dates for a month (with caching and retry)
  const loadBookedDatesForMonth = useCallback(async (date: Date, retryCount = 0) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 0-indexed to 1-indexed
    const cacheKey = `${year}-${month}`;

    // Check cache first
    if (cachedMonths.has(cacheKey)) {
      const cached = cachedMonths.get(cacheKey)!;
      setFullyBookedDates(new Set(cached));
      return;
    }

    setIsLoadingBookedDates(true);

    try {
      const response = await fetch(`/api/booked-dates?year=${year}&month=${month}`);
      if (!response.ok) {
        // Retry up to 2 times on failure
        if (retryCount < 2) {
          setIsLoadingBookedDates(false);
          setTimeout(() => loadBookedDatesForMonth(date, retryCount + 1), 1000);
          return;
        }
        // After retries, silently fail - calendar will still work, just won't show fully booked dates
        console.warn('Failed to fetch booked dates after retries');
        setFullyBookedDates(new Set());
        return;
      }
      const bookedDates: string[] = await response.json();

      // Update cache
      setCachedMonths(prev => new Map(prev).set(cacheKey, bookedDates));
      setFullyBookedDates(new Set(bookedDates));
    } catch (error) {
      // Retry up to 2 times on error
      if (retryCount < 2) {
        setIsLoadingBookedDates(false);
        setTimeout(() => loadBookedDatesForMonth(date, retryCount + 1), 1000);
        return;
      }
      console.warn('Error loading booked dates:', error);
      setFullyBookedDates(new Set());
    } finally {
      setIsLoadingBookedDates(false);
    }
  }, [cachedMonths]);

  // Handle modal open/close animations and load booked dates
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
      // Load booked dates for current month when modal opens
      loadBookedDatesForMonth(currentMonth);
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
        setPhone('');
        setRelationship('');
        setHouseholdSize('');
        setAgeRange('');
        setEmploymentStatus('');
        setReasonForVisit('');
        setPrimaryFinancialConcern('');
        setCurrentDebtType([]);
        setPreferredContactMethod('');
        setBestTimeToContact('');
        setConsent(false);
        setFormError(null);
      }, 300);

      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(newMonth);
    loadBookedDatesForMonth(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(newMonth);
    loadBookedDatesForMonth(newMonth);
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
    const dateStr = date.toISOString().split('T')[0];
    if (!isWeekday(date) || isPastDate(date) || fullyBookedDates.has(dateStr)) return;

    setSelectedDate(date);
    setStep('timeSlots');
    await loadAvailableSlots(date);
  };

  // Load available time slots for a date via API with retry
  const loadAvailableSlots = async (date: Date, retryCount = 0) => {
    setIsLoadingSlots(true);

    try {
      const dateString = date.toISOString().split('T')[0];
      const response = await fetch(`/api/availability?date=${dateString}`);
      if (!response.ok) {
        // Retry up to 2 times on failure
        if (retryCount < 2) {
          setIsLoadingSlots(false);
          setTimeout(() => loadAvailableSlots(date, retryCount + 1), 1000);
          return;
        }
        console.warn('Failed to fetch availability after retries');
        setAvailableSlots([]);
        return;
      }
      const slots: TimeSlot[] = await response.json();
      setAvailableSlots(slots);
    } catch (error) {
      // Retry up to 2 times on error
      if (retryCount < 2) {
        setIsLoadingSlots(false);
        setTimeout(() => loadAvailableSlots(date, retryCount + 1), 1000);
        return;
      }
      console.warn('Error loading time slots:', error);
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

    // Validate reason for visit (required)
    if (!reasonForVisit) {
      setFormError('Please select a reason for your visit');
      return;
    }

    // Validate consent
    if (!consent) {
      setFormError('Please agree to the privacy policy to continue');
      return;
    }

    // Validate phone number if contact method requires it
    if ((preferredContactMethod === 'Phone' || preferredContactMethod === 'Text') && !phone.trim()) {
      setFormError('Please provide a phone number if you want us to contact you by phone or text');
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

      // Create consultation booking
      const consultation: Consultation = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        bookingType: 'Free Consultation',
        dateBooked: dateString,
        timeSlotStart: selectedTimeSlot.start,
        timeSlotEnd: selectedTimeSlot.end,
        userTimezone: userTimezone,
        userLocalTime: userLocalTime,
      };

      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consultation),
      });

      if (!bookingResponse.ok) {
        throw new Error('Failed to create booking');
      }

      // Get the booking record ID and datetime from the response
      const bookingResult = await bookingResponse.json();

      // Create client record with all information and link to booking record
      const clientData: ClientFormData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        relationship: relationship || undefined,
        householdSize: householdSize || undefined,
        ageRange: ageRange || undefined,
        employmentStatus: employmentStatus || undefined,
        reasonForVisit: reasonForVisit,
        primaryFinancialConcern: primaryFinancialConcern.trim() || undefined,
        currentDebtType: currentDebtType.length > 0 ? currentDebtType : undefined,
        preferredContactMethod: preferredContactMethod || undefined,
        bestTimeToContact: bestTimeToContact.trim() || undefined,
        consent: consent,
        bookedRecordId: bookingResult.id,
      };

      const clientResponse = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });

      if (!clientResponse.ok) {
        throw new Error('Failed to create client record');
      }

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
                const isWeekend = !isWeekday(date);
                const dateStr = date.toISOString().split('T')[0];
                const isFullyBooked = fullyBookedDates.has(dateStr);
                const isDisabled = !isWeekday(date) || isPastDate(date) || isFullyBooked;

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => handleDateSelect(date)}
                    disabled={isDisabled}
                    className={`calendar-day ${isSelected ? 'calendar-day-selected' : ''} ${
                      isToday ? 'calendar-day-today' : ''
                    } ${isDisabled && !isWeekend && !isFullyBooked ? 'calendar-day-disabled' : ''} ${
                      isWeekend ? 'calendar-day-weekend' : ''
                    } ${isFullyBooked ? 'calendar-day-fully-booked' : ''}`}
                    title={isFullyBooked ? 'Fully booked' : undefined}
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
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-secondary-300 rounded opacity-60"></div>
                <span>Fully Booked</span>
              </div>
            </div>

            <p className="text-center text-secondary-600 mt-6">
              Available Monday - Friday, 9:00 AM - 5:00 PM EST
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
            <h2 className="text-2xl font-bold text-primary-700 mb-2 text-center">
              Just a Few Details
            </h2>
            <p className="text-secondary-600 text-center mb-6">
              A little personal information helps us prepare for your consultation.
            </p>

            {/* Booking Summary */}
            <div className="bg-primary-50 rounded-lg p-4 mb-6">
              <div className="flex flex-wrap gap-4 text-sm text-secondary-700">
                <p>
                  <span className="font-medium">Date:</span>{' '}
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <p>
                  <span className="font-medium">Time:</span>{' '}
                  {formatTimeForDisplay(selectedTimeSlot.start)} -{' '}
                  {formatTimeForDisplay(selectedTimeSlot.end)}{' '}
                  {userTimezone && `(${getTimezoneFriendlyName(userTimezone)})`}
                </p>
              </div>
            </div>

            {/* Client Information Form */}
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Contact Information Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-secondary-800 border-b pb-2">Contact Information</h3>

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-secondary-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Context Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-secondary-800 border-b pb-2">Personal Context</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="relationship" className="block text-sm font-medium text-secondary-700 mb-1">
                      Relationship Status
                    </label>
                    <select
                      id="relationship"
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value as RelationshipStatus | '')}
                      className="input"
                    >
                      <option value="">Select...</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="widowed">Widowed</option>
                      <option value="in a relationship">In a relationship</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="householdSize" className="block text-sm font-medium text-secondary-700 mb-1">
                      Household Size
                    </label>
                    <input
                      type="number"
                      id="householdSize"
                      value={householdSize}
                      onChange={(e) => setHouseholdSize(e.target.value ? parseInt(e.target.value) : '')}
                      min="1"
                      max="20"
                      className="input"
                      placeholder="Number of people"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ageRange" className="block text-sm font-medium text-secondary-700 mb-1">
                      Age Range
                    </label>
                    <select
                      id="ageRange"
                      value={ageRange}
                      onChange={(e) => setAgeRange(e.target.value as AgeRange | '')}
                      className="input"
                    >
                      <option value="">Select...</option>
                      <option value="18-24">18-24</option>
                      <option value="25-34">25-34</option>
                      <option value="35-44">35-44</option>
                      <option value="45-54">45-54</option>
                      <option value="55-64">55-64</option>
                      <option value="65+">65+</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="employmentStatus" className="block text-sm font-medium text-secondary-700 mb-1">
                      Employment Status
                    </label>
                    <select
                      id="employmentStatus"
                      value={employmentStatus}
                      onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus | '')}
                      className="input"
                    >
                      <option value="">Select...</option>
                      <option value="Employed Full-time">Employed Full-time</option>
                      <option value="Employed Part-time">Employed Part-time</option>
                      <option value="Self-employed">Self-employed</option>
                      <option value="Unemployed">Unemployed</option>
                      <option value="Retired">Retired</option>
                      <option value="Student">Student</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Financial Context Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-secondary-800 border-b pb-2">Financial Context</h3>

                <div>
                  <label htmlFor="reasonForVisit" className="block text-sm font-medium text-secondary-700 mb-1">
                    Reason for Visit *
                  </label>
                  <select
                    id="reasonForVisit"
                    value={reasonForVisit}
                    onChange={(e) => setReasonForVisit(e.target.value as ReasonForVisit | '')}
                    required
                    className="input"
                  >
                    <option value="">Select a reason...</option>
                    <option value="Create/Review Budget">Create/Review Budget</option>
                    <option value="Debt Management">Debt Management</option>
                    <option value="General Financial Planning">General Financial Planning</option>
                    <option value="Emergency Fund/Savings">Emergency Fund/Savings</option>
                    <option value="Investing & Wealth Building">Investing & Wealth Building</option>
                    <option value="Business/Self-employed">Business/Self-employed</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="primaryFinancialConcern" className="block text-sm font-medium text-secondary-700 mb-1">
                    What&apos;s your primary financial concern?
                  </label>
                  <textarea
                    id="primaryFinancialConcern"
                    value={primaryFinancialConcern}
                    onChange={(e) => setPrimaryFinancialConcern(e.target.value)}
                    rows={3}
                    className="input resize-none"
                    placeholder="Tell us what's on your mind financially..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Current Debt Types (select all that apply)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(['Credit Cards', 'Student Loans', 'Mortgage', 'Car Loan', 'Medical', 'Personal Loan', 'Other'] as DebtType[]).map((debt) => (
                      <label key={debt} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={currentDebtType.includes(debt)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCurrentDebtType([...currentDebtType, debt]);
                            } else {
                              setCurrentDebtType(currentDebtType.filter(d => d !== debt));
                            }
                          }}
                          className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span>{debt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Communication Preferences */}
              <div className="space-y-4">
                <h3 className="font-semibold text-secondary-800 border-b pb-2">Communication Preferences</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="preferredContactMethod" className="block text-sm font-medium text-secondary-700 mb-1">
                      Preferred Contact Method
                    </label>
                    <select
                      id="preferredContactMethod"
                      value={preferredContactMethod}
                      onChange={(e) => setPreferredContactMethod(e.target.value as PreferredContactMethod | '')}
                      className="input"
                    >
                      <option value="">Select...</option>
                      <option value="Email">Email</option>
                      <option value="Phone">Phone</option>
                      <option value="Text">Text</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="bestTimeToContact" className="block text-sm font-medium text-secondary-700 mb-1">
                      Best Time to Contact
                    </label>
                    <input
                      type="text"
                      id="bestTimeToContact"
                      value={bestTimeToContact}
                      onChange={(e) => setBestTimeToContact(e.target.value)}
                      className="input"
                      placeholder="e.g., Weekday evenings"
                    />
                  </div>
                </div>
              </div>

              {/* Consent */}
              <div className="bg-secondary-50 rounded-lg p-4">
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                    className="mt-1 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-secondary-700">
                    I agree to the{' '}
                    <a href="/privacy-policy" target="_blank" className="text-primary-600 hover:underline">
                      Privacy Policy
                    </a>{' '}
                    and consent to having my information stored for the purpose of this consultation. *
                  </span>
                </label>
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
