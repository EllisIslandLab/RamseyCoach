'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect for header shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu when clicking outside (mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMenuOpen && !target.closest('.mobile-menu') && !target.closest('.hamburger-btn')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const closeMenu = () => setIsMenuOpen(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '#testimonials', label: 'Testimonials' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <>
      {/* Sticky Header */}
      <header
        className={`sticky top-0 z-30 bg-primary-600 transition-shadow duration-300 ${
          isScrolled ? 'shadow-lg' : ''
        }`}
      >
        <div className="container-custom">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo/Brand */}
            <Link href="/" className="flex items-center space-x-3 group">
              {/* Icon/Logo placeholder */}
              <div className="w-10 h-10 md:w-12 md:h-12 bg-accent-500 rounded-full flex items-center justify-center group-hover:bg-accent-600 transition-colors duration-300">
                <svg
                  className="w-6 h-6 md:w-7 md:h-7 text-secondary-900"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Growth/Tree icon representing coaching */}
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>

              {/* Banner text */}
              <span className="text-white font-bold text-lg md:text-xl">
                Ramsey Preferred Coach
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white hover:text-accent-400 font-medium transition-colors duration-300"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Hamburger Menu Button (Mobile) */}
            <button
              onClick={toggleMenu}
              className="hamburger-btn md:hidden touch-target flex items-center justify-center text-white hover:text-accent-400 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-accent-400 rounded-lg"
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              {/* Hamburger Icon */}
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-secondary-900 bg-opacity-50 z-20 md:hidden animate-fadeIn"
          onClick={closeMenu}
        />
      )}

      {/* Mobile Menu Slide-in Panel */}
      <div
        className={`mobile-menu fixed top-0 left-0 h-full w-64 bg-primary-700 z-30 md:hidden transform transition-transform duration-300 ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full pt-20 px-6">
          <nav className="flex flex-col space-y-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="text-white hover:text-accent-400 font-medium text-lg transition-colors duration-300 touch-target"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Additional mobile menu content */}
          <div className="mt-auto pb-8">
            <p className="text-primary-200 text-sm">
              Take control of your finances today
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
