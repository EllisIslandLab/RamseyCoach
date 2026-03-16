import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

type Action = 'approved' | 'discuss' | 'meeting';

const MESSAGES: Record<Action, { heading: string; body: string; emoji: string }> = {
  approved: {
    emoji: '✅',
    heading: 'Response sent!',
    body: 'Your partner has been notified that the budget looks good to you.',
  },
  discuss: {
    emoji: '💬',
    heading: 'Response sent!',
    body: "Your partner has been notified that you'd like to talk it over. Consider reaching out to them directly!",
  },
  meeting: {
    emoji: '📅',
    heading: 'Meeting requested!',
    body: "Your partner has been notified that you'd like to schedule a budget meeting. Reach out to find a time that works!",
  },
};

export default function BudgetResponsePage() {
  const router = useRouter();
  const { token, action } = router.query as { token?: string; action?: Action };

  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token || !action || status !== 'idle') return;

    setStatus('loading');
    fetch('/api/shared-access/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          // "Already responded" is not a hard error — just show success
          if (data.error === 'Already responded') {
            setStatus('done');
          } else {
            setErrorMsg(data.error);
            setStatus('error');
          }
        } else {
          setStatus('done');
        }
      })
      .catch(() => {
        setErrorMsg('Something went wrong. Please try again.');
        setStatus('error');
      });
  }, [token, action, status]);

  const message = action ? MESSAGES[action] : null;

  return (
    <>
      <Head>
        <title>Budget Response – Money-Willo</title>
      </Head>
      <Header />

      <main className="min-h-screen bg-gray-50 py-16 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">

            {status === 'loading' && (
              <p className="text-gray-500">Recording your response…</p>
            )}

            {status === 'done' && message && (
              <>
                <div className="text-5xl mb-4">{message.emoji}</div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">{message.heading}</h1>
                <p className="text-gray-600 mb-6">{message.body}</p>
                <Link
                  href="/tools"
                  className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  View the budget
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
                <p className="text-red-600 mb-6">{errorMsg}</p>
                <Link href="/" className="text-sm text-primary-600 hover:underline">
                  Go to Money-Willo
                </Link>
              </>
            )}

          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
