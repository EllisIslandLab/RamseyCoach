import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  getSharedAccess,
  removeSharedAccess,
  type SharedAccess,
} from '@/lib/dataService';
import AccountabilitySettingsPanel from '@/components/AccountabilitySettingsPanel';

// ─── Shared styles ────────────────────────────────────────────────────────────

const card = 'bg-white rounded-xl border border-gray-100 shadow-sm p-6';
const label = 'block text-sm font-medium text-gray-700 mb-1';
const input =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent';
const btnPrimary =
  'px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnOutline =
  'px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

// ─── Feedback banner ─────────────────────────────────────────────────────────

type FeedbackState = { type: 'success' | 'error'; message: string } | null;

function Feedback({ state }: { state: FeedbackState }) {
  if (!state) return null;
  const base = 'text-sm rounded-lg px-4 py-2.5 mt-3';
  return state.type === 'success' ? (
    <p className={`${base} bg-green-50 text-green-700`}>{state.message}</p>
  ) : (
    <p className={`${base} bg-red-50 text-red-700`}>{state.message}</p>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  // Display name
  const [displayName, setDisplayName] = useState('');
  const [nameFeedback, setNameFeedback] = useState<FeedbackState>(null);
  const [nameSaving, setNameSaving] = useState(false);

  // Email
  const [newEmail, setNewEmail] = useState('');
  const [emailFeedback, setEmailFeedback] = useState<FeedbackState>(null);
  const [emailSaving, setEmailSaving] = useState(false);

  // Password reset
  const [passwordFeedback, setPasswordFeedback] = useState<FeedbackState>(null);
  const [passwordSending, setPasswordSending] = useState(false);

  // Shared access
  const [shares, setShares] = useState<SharedAccess[]>([]);
  const [expandedConfigure, setExpandedConfigure] = useState<string | null>(null);
  const [nudgeOpen, setNudgeOpen] = useState<string | null>(null);
  const [nudgeCategory, setNudgeCategory] = useState('');
  const [nudgeNote, setNudgeNote] = useState('');
  const [nudgeSending, setNudgeSending] = useState(false);
  const [nudgeFeedback, setNudgeFeedback] = useState<FeedbackState>(null);
  const [summarySending, setSummarySending] = useState<string | null>(null);
  const [summaryFeedback, setSummaryFeedback] = useState<Record<string, FeedbackState>>({});
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteType, setInviteType] = useState<'spouse' | 'accountability'>('spouse');
  const [inviteFeedback, setInviteFeedback] = useState<FeedbackState>(null);
  const [inviteSending, setInviteSending] = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<FeedbackState>(null);

  // Populate display name from user metadata
  useEffect(() => {
    if (user?.user_metadata?.display_name) {
      setDisplayName(user.user_metadata.display_name as string);
    }
  }, [user]);

  // Load sharing relationships
  useEffect(() => {
    if (user) getSharedAccess(user.id).then(setShares);
  }, [user]);

  // Redirect if not authenticated (after loading resolves)
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  if (loading || !user) return null;

  // ─── Handlers ───────────────────────────────────────────────────────────────

  async function handleSaveName() {
    setNameSaving(true);
    setNameFeedback(null);
    const { error } = await supabase.auth.updateUser({ data: { display_name: displayName.trim() } });
    setNameSaving(false);
    if (error) {
      setNameFeedback({ type: 'error', message: error.message });
    } else {
      setNameFeedback({ type: 'success', message: 'Display name updated.' });
    }
  }

  async function handleUpdateEmail() {
    if (!newEmail.trim()) return;
    setEmailSaving(true);
    setEmailFeedback(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setEmailSaving(false);
    if (error) {
      setEmailFeedback({ type: 'error', message: error.message });
    } else {
      setEmailFeedback({
        type: 'success',
        message: 'Confirmation emails sent to both your old and new address. Follow the link to confirm the change.',
      });
      setNewEmail('');
    }
  }

  async function handleSendPasswordReset() {
    setPasswordSending(true);
    setPasswordFeedback(null);
    const { error } = await supabase.auth.resetPasswordForEmail(user!.email!, {
      redirectTo: `${window.location.origin}/account`,
    });
    setPasswordSending(false);
    if (error) {
      setPasswordFeedback({ type: 'error', message: error.message });
    } else {
      setPasswordFeedback({ type: 'success', message: `Password reset email sent to ${user!.email}.` });
    }
  }

  async function handleSendNudge(shareId: string) {
    setNudgeSending(true);
    setNudgeFeedback(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/shared-access/nudge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ shared_access_id: shareId, category: nudgeCategory || undefined, note: nudgeNote || undefined }),
    });
    setNudgeSending(false);
    if (res.ok) {
      setNudgeFeedback({ type: 'success', message: 'Your partner has been notified!' });
      setNudgeCategory('');
      setNudgeNote('');
      setTimeout(() => { setNudgeOpen(null); setNudgeFeedback(null); }, 2500);
    } else {
      const body = await res.json().catch(() => ({}));
      setNudgeFeedback({ type: 'error', message: body.error ?? 'Failed to send' });
    }
  }

  async function handleSendMonthlySummary(shareId: string) {
    setSummarySending(shareId);
    setSummaryFeedback((prev) => ({ ...prev, [shareId]: null }));
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/shared-access/monthly-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ shared_access_id: shareId }),
    });
    setSummarySending(null);
    const body = await res.json().catch(() => ({}));
    setSummaryFeedback((prev) => ({
      ...prev,
      [shareId]: res.ok
        ? { type: 'success', message: 'Monthly summary sent to your partner!' }
        : { type: 'error', message: body.error ?? 'Failed to send summary' },
    }));
  }

  async function handleSendInvite() {
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    setInviteFeedback(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/shared-access/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ partner_email: inviteEmail.trim(), access_type: inviteType }),
    });
    const body = await res.json().catch(() => ({}));
    setInviteSending(false);
    if (!res.ok) {
      setInviteFeedback({ type: 'error', message: body.error ?? 'Failed to send invite' });
    } else {
      setInviteFeedback({ type: 'success', message: `Invitation sent to ${inviteEmail.trim()}.` });
      setInviteEmail('');
      getSharedAccess(user!.id).then(setShares);
    }
  }

  async function handleRemoveShare(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/shared-access/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    setShares((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleDeleteAccount() {
    if (deleteConfirmInput !== user!.email) return;
    setDeleteLoading(true);
    setDeleteFeedback(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setDeleteFeedback({ type: 'error', message: 'Session expired. Please sign in again.' });
      setDeleteLoading(false);
      return;
    }

    const res = await fetch('/api/account/delete', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setDeleteFeedback({ type: 'error', message: body.error ?? 'Something went wrong.' });
      setDeleteLoading(false);
      return;
    }

    await signOut();
    router.replace('/');
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Account Settings – Money-Willo</title>
      </Head>
      <Header />

      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
            <p className="text-sm text-gray-500 mt-1">{user.email}</p>
          </div>

          {/* ── Profile ──────────────────────────────────────────────────── */}
          <section className={card}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Profile</h2>
            <div>
              <label htmlFor="display-name" className={label}>Display name</label>
              <input
                id="display-name"
                type="text"
                className={input}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={80}
              />
              <p className="text-xs text-gray-400 mt-1">Used to personalise your experience ("Hi, Ellis").</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button className={btnPrimary} onClick={handleSaveName} disabled={nameSaving}>
                {nameSaving ? 'Saving…' : 'Save name'}
              </button>
            </div>
            <Feedback state={nameFeedback} />
          </section>

          {/* ── Email ────────────────────────────────────────────────────── */}
          <section className={card}>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Email address</h2>
            <p className="text-sm text-gray-500 mb-4">Current: <span className="font-medium text-gray-700">{user.email}</span></p>
            <div>
              <label htmlFor="new-email" className={label}>New email address</label>
              <input
                id="new-email"
                type="email"
                className={input}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@example.com"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button className={btnPrimary} onClick={handleUpdateEmail} disabled={emailSaving || !newEmail.trim()}>
                {emailSaving ? 'Sending…' : 'Update email'}
              </button>
            </div>
            <Feedback state={emailFeedback} />
          </section>

          {/* ── Password ─────────────────────────────────────────────────── */}
          <section className={card}>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Password</h2>
            <p className="text-sm text-gray-500 mb-4">
              We'll send a reset link to <span className="font-medium text-gray-700">{user.email}</span>.
            </p>
            <button className={btnOutline} onClick={handleSendPasswordReset} disabled={passwordSending}>
              {passwordSending ? 'Sending…' : 'Send password reset email'}
            </button>
            <Feedback state={passwordFeedback} />
          </section>

          {/* ── Shared Access ────────────────────────────────────────────── */}
          <section className={card}>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Shared Access</h2>
            <p className="text-sm text-gray-500 mb-4">
              Invite a spouse to co-manage your budget, or an accountability partner to help keep you on track.
            </p>

            {/* Existing relationships */}
            {shares.length > 0 && (
              <div className="mb-5 space-y-2">
                {shares.map((s) => (
                  <div key={s.id} className="bg-gray-50 rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.partner_email}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {s.access_type === 'spouse' ? 'Shared budget partner' : 'Accountability partner'}
                          {' · '}
                          <span className={s.status === 'active' ? 'text-green-600' : 'text-amber-600'}>
                            {s.status === 'active' ? 'Active' : 'Invite pending'}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {s.access_type === 'accountability' && s.owner_id === user!.id && s.status === 'active' && (
                          <button
                            onClick={() => setExpandedConfigure(expandedConfigure === s.id ? null : s.id)}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                          >
                            {expandedConfigure === s.id ? 'Done' : 'Configure'}
                          </button>
                        )}
                        {s.access_type === 'accountability' && s.partner_id === user!.id && s.status === 'active' &&
                          (s.accountability_settings?.can_view_full_budget) && (
                          <a
                            href={`/partner-budget?owner=${s.owner_id}`}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                          >
                            View budget →
                          </a>
                        )}
                        {s.owner_id === user!.id && (
                          <button
                            onClick={() => handleRemoveShare(s.id)}
                            className="text-xs text-red-500 hover:text-red-700 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    {expandedConfigure === s.id && (
                      <AccountabilitySettingsPanel
                        share={s}
                        userId={user!.id}
                        onUpdated={() => getSharedAccess(user!.id).then(setShares)}
                      />
                    )}

                    {/* Nudge + Monthly Summary — owner only, active accountability */}
                    {s.access_type === 'accountability' && s.owner_id === user.id && s.status === 'active' && expandedConfigure !== s.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                        <button
                          onClick={() => { setNudgeOpen(nudgeOpen === s.id ? null : s.id); setNudgeFeedback(null); }}
                          className="text-xs font-medium text-amber-600 hover:text-amber-700 border border-amber-200 hover:border-amber-400 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          I need support 🤝
                        </button>
                        <button
                          onClick={() => handleSendMonthlySummary(s.id)}
                          disabled={summarySending === s.id}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700 border border-primary-200 hover:border-primary-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {summarySending === s.id ? 'Sending…' : 'Send monthly summary'}
                        </button>
                        {summaryFeedback[s.id] && (
                          <p className={`text-xs w-full mt-1 ${summaryFeedback[s.id]?.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {summaryFeedback[s.id]?.message}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Nudge form */}
                    {nudgeOpen === s.id && (
                      <div className="mt-3 pt-3 border-t border-amber-100 space-y-2">
                        <p className="text-xs font-medium text-gray-600">What do you need support with?</p>
                        <input
                          type="text"
                          className={`${input} w-full`}
                          placeholder="Category (optional, e.g. Food & Grocery)"
                          value={nudgeCategory}
                          onChange={(e) => setNudgeCategory(e.target.value)}
                        />
                        <textarea
                          className={`${input} w-full resize-none`}
                          rows={2}
                          placeholder="Add a note for your partner (optional)"
                          value={nudgeNote}
                          onChange={(e) => setNudgeNote(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSendNudge(s.id)}
                            disabled={nudgeSending}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            {nudgeSending ? 'Sending…' : 'Send to partner'}
                          </button>
                          <button
                            onClick={() => { setNudgeOpen(null); setNudgeFeedback(null); }}
                            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                        {nudgeFeedback && (
                          <p className={`text-xs ${nudgeFeedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {nudgeFeedback.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Invite form */}
            <div className="space-y-3">
              <div>
                <label className={label}>Their email address</label>
                <input
                  type="email"
                  className={input}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="partner@example.com"
                />
              </div>
              <div>
                <label className={label}>Relationship type</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="invite-type"
                      value="spouse"
                      checked={inviteType === 'spouse'}
                      onChange={() => setInviteType('spouse')}
                      className="accent-primary-600"
                    />
                    <span className="text-sm text-gray-700">Spouse / Partner</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="invite-type"
                      value="accountability"
                      checked={inviteType === 'accountability'}
                      onChange={() => setInviteType('accountability')}
                      className="accent-primary-600"
                    />
                    <span className="text-sm text-gray-700">Accountability Partner</span>
                  </label>
                </div>
              </div>
              {inviteType === 'spouse' && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Your partner will co-edit your budget. Their own saved budget will be paused (not deleted) while sharing is active.
                </p>
              )}
              {inviteType === 'accountability' && (
                <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
                  Your partner will only see what you choose to share. You control all permissions.
                </p>
              )}
              <div className="flex justify-end">
                <button
                  className={btnPrimary}
                  onClick={handleSendInvite}
                  disabled={inviteSending || !inviteEmail.trim()}
                >
                  {inviteSending ? 'Sending…' : 'Send invitation'}
                </button>
              </div>
              <Feedback state={inviteFeedback} />
            </div>
          </section>

          {/* ── Danger zone ──────────────────────────────────────────────── */}
          <section className={`${card} border-red-100`}>
            <h2 className="text-base font-semibold text-red-700 mb-1">Danger zone</h2>
            <p className="text-sm text-gray-500 mb-4">
              Permanently deletes your account and all saved data. This cannot be undone.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
              >
                Delete my account
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  Type your email address to confirm: <span className="font-medium">{user.email}</span>
                </p>
                <input
                  type="email"
                  className={`${input} border-red-200 focus:ring-red-400`}
                  placeholder={user.email}
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmInput !== user.email || deleteLoading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteLoading ? 'Deleting…' : 'Yes, delete my account'}
                  </button>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmInput(''); }}
                    className={btnOutline}
                  >
                    Cancel
                  </button>
                </div>
                <Feedback state={deleteFeedback} />
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
