'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { user, openAuthModal, signOut } = useAuth();

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

  // Build nav links - anchor links need full path when not on home page
  const getAnchorHref = (anchor: string) => {
    // If on home page, use just the anchor; otherwise prepend with /
    return pathname === '/' ? anchor : `/${anchor}`;
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: getAnchorHref('#testimonials'), label: 'Testimonials' },
    { href: '/tools', label: 'Tools' },
    { href: getAnchorHref('#booking'), label: 'Consultation' },
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
              <Image
                src="/favicon.png"
                alt="Money-Willo logo"
                width={48}
                height={48}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full"
              />

              {/* Banner text */}
              <span className="text-white font-bold text-lg md:text-xl">
                Money-Willo
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

            {/* Auth button — desktop */}
            <div className="hidden md:flex items-center ml-2">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-primary-200 text-sm truncate max-w-[160px]">{user.email}</span>
                  <button
                    onClick={signOut}
                    className="text-white border border-primary-400 hover:border-accent-400 hover:text-accent-400 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-300"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={openAuthModal}
                  className="text-white border border-primary-400 hover:border-accent-400 hover:text-accent-400 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-300"
                >
                  Sign In
                </button>
              )}
            </div>

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

          {/* Auth — mobile */}
          <div className="mt-auto pb-8 border-t border-primary-600 pt-6">
            {user ? (
              <>
                <p className="text-primary-200 text-xs mb-3 truncate">{user.email}</p>
                <button
                  onClick={() => { signOut(); closeMenu(); }}
                  className="text-white border border-primary-400 hover:border-accent-400 hover:text-accent-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-300 w-full text-left"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => { openAuthModal(); closeMenu(); }}
                className="text-white border border-primary-400 hover:border-accent-400 hover:text-accent-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-300 w-full text-left"
              >
                Sign In / Create Account
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
