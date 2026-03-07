import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type Tab = 'signin' | 'signup';

export default function AuthModal() {
  const { authModalOpen, closeAuthModal } = useAuth();
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens/closes or tab changes
  useEffect(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccessMsg('');
    setLoading(false);
  }, [authModalOpen, tab]);

  // Close on Escape key
  useEffect(() => {
    if (!authModalOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAuthModal(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [authModalOpen, closeAuthModal]);

  if (!authModalOpen) return null;

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    closeAuthModal();
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccessMsg('Account created! Check your email to confirm, then sign in.');
    setTab('signin');
  };

  const inp = 'w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-secondary-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
  const lbl = 'block text-xs font-semibold text-secondary-600 mb-1 uppercase tracking-wide';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={closeAuthModal}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 text-secondary-400 hover:text-secondary-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="px-8 pt-8 pb-0">
            <h2 className="text-2xl font-bold text-secondary-800">
              {tab === 'signin' ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-secondary-500 text-sm mt-1">
              {tab === 'signin'
                ? 'Save your budget and calculator data across devices.'
                : 'Create a free account to save your financial data permanently.'}
            </p>

            {/* Tabs */}
            <div className="flex gap-0 mt-5 border-b border-secondary-200">
              <button
                onClick={() => setTab('signin')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  tab === 'signin'
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setTab('signup')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  tab === 'signup'
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            {successMsg && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm">
                {successMsg}
              </div>
            )}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">
                {error}
              </div>
            )}

            {tab === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className={lbl}>Email</label>
                  <input
                    type="email"
                    className={inp}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className={lbl}>Password</label>
                  <input
                    type="password"
                    className={inp}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing In…' : 'Sign In'}
                </button>
                <p className="text-center text-secondary-500 text-xs">
                  No account yet?{' '}
                  <button
                    type="button"
                    onClick={() => setTab('signup')}
                    className="text-primary-600 font-semibold hover:underline"
                  >
                    Create one free
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className={lbl}>Email</label>
                  <input
                    type="email"
                    className={inp}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className={lbl}>Password</label>
                  <input
                    type="password"
                    className={inp}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className={lbl}>Confirm Password</label>
                  <input
                    type="password"
                    className={inp}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Account…' : 'Create Account'}
                </button>
                <p className="text-center text-secondary-500 text-xs">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setTab('signin')}
                    className="text-primary-600 font-semibold hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            )}

            {/* Newsletter Coming Soon */}
            <div className="mt-6 pt-5 border-t border-secondary-100">
              <div className="flex items-center gap-3 bg-secondary-50 rounded-xl px-4 py-3">
                <div className="text-primary-600 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-secondary-700 text-xs font-semibold">
                    Monthly Newsletter{' '}
                    <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-700">
                      Coming Soon
                    </span>
                  </p>
                  <p className="text-secondary-400 text-xs mt-0.5">
                    Tips, tools, and encouragement for your financial journey — delivered monthly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
