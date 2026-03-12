import { useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const NAV_ITEMS = [
  {
    href: '/admin',
    label: 'Overview',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/admin/flags',
    label: 'Category Flags',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
  },
];

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/tools'); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.app_metadata?.role !== 'admin') {
        router.replace('/tools');
      } else {
        setChecking(false);
      }
    });
  }, [user, loading, router]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <span className="text-secondary-400 text-sm">Loading…</span>
      </div>
    );
  }

  const pageTitle = title ? `${title} | Admin` : 'Admin | Money-Willo';

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="flex min-h-screen bg-secondary-50">

        {/* ── Sidebar (desktop) ──────────────────────────────────────────────── */}
        <aside className="hidden md:flex w-56 bg-secondary-900 text-white flex-col flex-shrink-0 fixed inset-y-0 left-0 z-20">
          <div className="px-5 py-5 border-b border-secondary-700">
            <p className="font-bold text-sm text-white leading-tight">Money-Willo</p>
            <p className="text-xs text-secondary-400 mt-0.5">Admin Dashboard</p>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-0.5">
            {NAV_ITEMS.map(item => {
              const active = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary-600 text-white'
                      : 'text-secondary-300 hover:bg-secondary-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-secondary-700 space-y-0.5">
            <a
              href="https://stats.uptimerobot.com/XweJfCuHrr"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-secondary-400 hover:text-white hover:bg-secondary-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Uptime Status ↗
            </a>
            <button
              onClick={() => { signOut(); router.push('/'); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-secondary-400 hover:text-white hover:bg-secondary-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Mobile top bar ─────────────────────────────────────────────────── */}
        <div className="md:hidden fixed top-0 inset-x-0 z-20 bg-secondary-900 text-white flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-bold text-sm leading-tight">Money-Willo Admin</p>
          </div>
          <button
            onClick={() => setMobileNavOpen(p => !p)}
            className="text-secondary-300 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileNavOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-10 bg-black/50" onClick={() => setMobileNavOpen(false)}>
            <nav
              className="absolute top-12 left-0 w-56 bg-secondary-900 text-white py-3 px-3 space-y-0.5 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    router.pathname === item.href
                      ? 'bg-primary-600 text-white'
                      : 'text-secondary-300 hover:bg-secondary-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* ── Main content ───────────────────────────────────────────────────── */}
        <main className="flex-1 md:ml-56 mt-12 md:mt-0 overflow-y-auto">
          {children}
        </main>

      </div>
    </>
  );
}
