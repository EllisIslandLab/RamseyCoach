'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import UserMenu from '@/components/UserMenu';
import { useIsStandalone } from '@/hooks/useIsStandalone';

const toolsItems = [
  { href: '/tools?tab=calculators', label: 'Financial Calculators', shortLabel: 'Calculators', tab: 'calculators' },
  { href: '/tools?tab=budget', label: 'Budget Planner', shortLabel: 'Budget', tab: 'budget' },
  { href: '/tools?tab=transactions', label: 'Transactions', shortLabel: 'Transactions', tab: 'transactions' },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, openAuthModal, signOut } = useAuth();
  const isStandalone = useIsStandalone();
  const activeAppTab = (router.query.tab as string) || 'budget';

  // Handle scroll effect for header shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMenuOpen && !target.closest('.mobile-menu') && !target.closest('.hamburger-btn')) {
        setIsMenuOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(target as Node)) {
        setIsToolsOpen(false);
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

  // ── App (standalone/PWA) header ─────────────────────────────────────────────
  if (isStandalone) {
    return (
      <header
        className={`sticky top-0 z-30 bg-primary-600 transition-shadow duration-300 ${
          isScrolled ? 'shadow-lg' : ''
        }`}
      >
        {/* App top bar */}
        <div className="flex items-center justify-between h-12 px-4">
          <Link href="/tools?tab=budget" className="flex items-center space-x-2">
            <Image
              src="/favicon.png"
              alt="Money-Willo Budget"
              width={32}
              height={32}
              className="w-8 h-8 rounded-full"
            />
            <span className="text-white font-bold text-sm">Money-Willo Budget</span>
          </Link>
          <div>
            {user ? (
              <UserMenu />
            ) : (
              <button
                onClick={openAuthModal}
                className="text-white border border-primary-400 hover:border-accent-400 hover:text-accent-400 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors duration-300"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Tool tab bar */}
        <div className="flex border-t border-primary-500">
          {toolsItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 text-center py-2 text-xs font-semibold transition-colors duration-200 ${
                activeAppTab === item.tab
                  ? 'text-accent-400 border-b-2 border-accent-400'
                  : 'text-primary-200 hover:text-white'
              }`}
            >
              {item.shortLabel}
            </Link>
          ))}
        </div>
      </header>
    );
  }

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
              <Link href="/" className="text-white hover:text-accent-400 font-medium transition-colors duration-300">
                Home
              </Link>
              <Link href={getAnchorHref('#testimonials')} className="text-white hover:text-accent-400 font-medium transition-colors duration-300">
                Testimonials
              </Link>
              <Link href={getAnchorHref('#booking')} className="text-white hover:text-accent-400 font-medium transition-colors duration-300">
                Consultation
              </Link>
              <Link href="/contact" className="text-white hover:text-accent-400 font-medium transition-colors duration-300">
                Contact
              </Link>

              {/* Tools dropdown — visually distinct, pushed right */}
              <div ref={toolsRef} className="relative ml-4">
                <button
                  onClick={() => setIsToolsOpen((o) => !o)}
                  className="flex items-center gap-1.5 bg-accent-500 hover:bg-accent-400 text-primary-900 font-semibold px-4 py-1.5 rounded-lg transition-colors duration-200 focus:outline-none"
                >
                  Tools
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isToolsOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isToolsOpen && (
                  <div className="absolute top-full right-0 mt-3 w-52 bg-white rounded-xl shadow-lg border border-secondary-100 overflow-hidden z-50">
                    {toolsItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsToolsOpen(false)}
                        className="block px-4 py-3 text-sm text-secondary-700 hover:bg-primary-50 hover:text-primary-700 font-medium transition-colors duration-150"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>

            {/* Auth button — desktop */}
            <div className="hidden md:flex items-center ml-2">
              {user ? (
                <UserMenu />
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
            <Link href="/" onClick={closeMenu} className="text-white hover:text-accent-400 font-medium text-lg transition-colors duration-300 touch-target">
              Home
            </Link>
            <Link href={getAnchorHref('#testimonials')} onClick={closeMenu} className="text-white hover:text-accent-400 font-medium text-lg transition-colors duration-300 touch-target">
              Testimonials
            </Link>

            {/* Tools expandable */}
            <div>
              <button
                onClick={() => setIsMobileToolsOpen((o) => !o)}
                className="flex items-center gap-2 text-white hover:text-accent-400 font-medium text-lg transition-colors duration-300 w-full text-left touch-target focus:outline-none"
              >
                Tools
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isMobileToolsOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isMobileToolsOpen && (
                <div className="mt-3 ml-4 flex flex-col space-y-3 border-l border-primary-500 pl-4">
                  {toolsItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className="text-primary-200 hover:text-accent-400 font-medium text-base transition-colors duration-300"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href={getAnchorHref('#booking')} onClick={closeMenu} className="text-white hover:text-accent-400 font-medium text-lg transition-colors duration-300 touch-target">
              Consultation
            </Link>
            <Link href="/contact" onClick={closeMenu} className="text-white hover:text-accent-400 font-medium text-lg transition-colors duration-300 touch-target">
              Contact
            </Link>
          </nav>

          {/* Auth — mobile */}
          <div className="mt-auto pb-8 border-t border-primary-600 pt-6">
            {user ? (
              <>
                <p className="text-primary-200 text-xs mb-3 truncate">{user.email}</p>
                <Link
                  href="/account"
                  onClick={closeMenu}
                  className="flex items-center text-white hover:text-accent-400 text-sm font-medium py-2 transition-colors duration-300 touch-target"
                >
                  Account Settings
                </Link>
                <Link
                  href="/account#preferences"
                  onClick={closeMenu}
                  className="flex items-center text-white hover:text-accent-400 text-sm font-medium py-2 transition-colors duration-300 touch-target"
                >
                  Preferences
                </Link>
                <button
                  onClick={() => { signOut(); closeMenu(); }}
                  className="mt-2 text-white border border-primary-400 hover:border-accent-400 hover:text-accent-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-300 w-full text-left"
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
