import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface InviteDetails {
  id: string;
  owner_name: string;
  owner_email: string;
  partner_email: string;
  access_type: 'spouse' | 'accountability';
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const { token } = router.query as { token?: string };
  const { user, loading: authLoading, openAuthModal } = useAuth();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null);

  // Load invite details (no auth required)
  useEffect(() => {
    if (!token) return;
    fetch(`/api/shared-access/accept?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setFetchError(data.error);
        else setInvite(data);
      })
      .catch(() => setFetchError('Failed to load invitation'));
  }, [token]);

  async function handleAccept() {
    if (!user || !token) return;
    setActionLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/shared-access/accept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ token }),
    });
    setActionLoading(false);
    if (res.ok) {
      setDone('accepted');
    } else {
      const body = await res.json().catch(() => ({}));
      setFetchError(body.error ?? 'Something went wrong');
    }
  }

  async function handleDecline() {
    if (!token) return;
    setActionLoading(true);
    const res = await fetch('/api/shared-access/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    setActionLoading(false);
    if (res.ok) setDone('declined');
    else setFetchError('Something went wrong');
  }

  const isSpouse = invite?.access_type === 'spouse';

  return (
    <>
      <Head>
        <title>Invitation – Money-Willo</title>
      </Head>
      <Header />

      <main className="min-h-screen bg-gray-50 py-16 px-4">
        <div className="max-w-lg mx-auto">

          {/* Loading */}
          {!invite && !fetchError && (
            <p className="text-center text-gray-500">Loading invitation…</p>
          )}

          {/* Error */}
          {fetchError && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
              <p className="text-red-600 font-medium">{fetchError}</p>
              <Link href="/" className="mt-4 inline-block text-sm text-primary-600 hover:underline">
                Go to Money-Willo
              </Link>
            </div>
          )}

          {/* Done — accepted */}
          {done === 'accepted' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">You're all set!</h1>
              <p className="text-gray-600 mb-6">
                {isSpouse
                  ? `You're now co-managing a shared budget with ${invite?.owner_name}.`
                  : `You're now ${invite?.owner_name}'s accountability partner.`}
              </p>
              <Link
                href="/tools"
                className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                {isSpouse ? 'Open the shared budget' : 'Get started'}
              </Link>
            </div>
          )}

          {/* Done — declined */}
          {done === 'declined' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
              <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation declined</h1>
              <p className="text-gray-600 mb-6">{invite?.owner_name} has been notified.</p>
              <Link href="/" className="text-sm text-primary-600 hover:underline">
                Go to Money-Willo
              </Link>
            </div>
          )}

          {/* Main invite card */}
          {invite && !done && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {isSpouse ? 'Shared budget invitation' : 'Accountability partner invitation'}
              </h1>
              <p className="text-gray-600 mb-6">
                <strong>{invite.owner_name}</strong> has invited you to be their{' '}
                {isSpouse ? 'shared budget partner' : 'accountability partner'} on Money-Willo.
              </p>

              {isSpouse && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-800">
                  <strong>Heads up:</strong> Accepting will add you as a co-editor of {invite.owner_name}'s budget.
                  Your own saved budget will be kept but won't be active while sharing is on —
                  it'll be waiting for you if you ever remove the sharing.
                </div>
              )}

              {!isSpouse && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
                  As an accountability partner, you'll be able to see selected budget categories
                  and receive alerts when {invite.owner_name} needs your support.
                  {invite.owner_name} controls exactly what you can see.
                </div>
              )}

              {/* Must be signed in to accept */}
              {!authLoading && !user && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-700 text-center">
                  You need a Money-Willo account to accept this invitation.
                  <button
                    onClick={openAuthModal}
                    className="block mx-auto mt-2 text-primary-600 font-semibold hover:underline"
                  >
                    Sign in or create an account
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleAccept}
                  disabled={!user || actionLoading}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Processing…' : 'Accept invitation'}
                </button>
                <button
                  onClick={handleDecline}
                  disabled={actionLoading}
                  className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </>
  );
}
