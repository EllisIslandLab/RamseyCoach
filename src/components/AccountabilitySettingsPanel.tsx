'use client';

import { useState, useEffect } from 'react';
import {
  getBudgetSubsectionNames,
  updateAccountabilitySettings,
  type SharedAccess,
  type AccountabilitySettings,
  type TrackedCategory,
} from '@/lib/dataService';

interface Props {
  share: SharedAccess;
  userId: string;
  onUpdated: () => void;
}

const inp =
  'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent';

const defaultSettings: AccountabilitySettings = {
  can_view_full_budget: false,
  show_merchants: false,
  tracked_categories: [],
  check_in_schedule: null,
  check_in_day: null,
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AccountabilitySettingsPanel({ share, userId, onUpdated }: Props) {
  const [settings, setSettings] = useState<AccountabilitySettings>(
    share.accountability_settings ?? defaultSettings
  );
  const [budgetCategories, setBudgetCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // New tracked category form state
  const [newCatName, setNewCatName] = useState('');
  const [newThreshold, setNewThreshold] = useState('');
  const [newNotifyOwner, setNewNotifyOwner] = useState(true);
  const [newNotifyPartner, setNewNotifyPartner] = useState(true);

  useEffect(() => {
    getBudgetSubsectionNames(userId).then(setBudgetCategories);
  }, [userId]);

  function handleToggle(field: 'can_view_full_budget' | 'show_merchants') {
    setSettings((prev) => ({ ...prev, [field]: !prev[field] }));
    setFeedback(null);
  }

  function handleAddCategory() {
    const name = newCatName.trim();
    const threshold = parseFloat(newThreshold);
    if (!name || isNaN(threshold) || threshold <= 0) return;
    if (settings.tracked_categories.some((c) => c.category.toLowerCase() === name.toLowerCase())) return;

    const newEntry: TrackedCategory = {
      category: name,
      threshold,
      notify_owner: newNotifyOwner,
      notify_partner: newNotifyPartner,
    };

    setSettings((prev) => ({
      ...prev,
      tracked_categories: [...prev.tracked_categories, newEntry],
    }));
    setNewCatName('');
    setNewThreshold('');
    setNewNotifyOwner(true);
    setNewNotifyPartner(true);
    setFeedback(null);
  }

  function handleRemoveCategory(category: string) {
    setSettings((prev) => ({
      ...prev,
      tracked_categories: prev.tracked_categories.filter((c) => c.category !== category),
    }));
    setFeedback(null);
  }

  function handleScheduleChange(schedule: AccountabilitySettings['check_in_schedule']) {
    setSettings((prev) => ({
      ...prev,
      check_in_schedule: schedule,
      check_in_day: schedule === 'monthly' ? 1 : schedule ? 1 : null,
    }));
    setFeedback(null);
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    const ok = await updateAccountabilitySettings(share.id, settings);
    setSaving(false);
    setFeedback(ok
      ? { type: 'success', msg: 'Settings saved.' }
      : { type: 'error', msg: 'Failed to save. Please try again.' }
    );
    if (ok) onUpdated();
  }

  return (
    <div className="mt-3 pt-4 border-t border-gray-100 space-y-5">

      {/* Permissions */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Permissions</p>
        <div className="space-y-2">
          {(
            [
              { field: 'can_view_full_budget', label: 'Allow full budget view', desc: 'Partner can see your entire budget in read-only mode' },
              { field: 'show_merchants',       label: 'Show merchant names',    desc: 'Partner sees individual store/merchant names, not just category totals' },
            ] as const
          ).map(({ field, label, desc }) => (
            <label key={field} className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  checked={settings[field]}
                  onChange={() => handleToggle(field)}
                  className="w-4 h-4 accent-primary-600 cursor-pointer"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 group-hover:text-primary-700">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Tracked categories */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tracked Categories</p>
        <p className="text-xs text-gray-500 mb-3">
          Your partner gets an alert when your actual spending in these categories exceeds your budget by the threshold amount.
        </p>

        {settings.tracked_categories.length === 0 && (
          <p className="text-sm text-gray-400 italic mb-3">No tracked categories yet.</p>
        )}

        {settings.tracked_categories.map((cat) => (
          <div key={cat.category} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 mb-2 gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{cat.category}</p>
              <p className="text-xs text-gray-500">
                Alert at ${cat.threshold} over budget
                {cat.notify_owner && cat.notify_partner && ' · notify both'}
                {cat.notify_owner && !cat.notify_partner && ' · notify you only'}
                {!cat.notify_owner && cat.notify_partner && ' · notify partner only'}
              </p>
            </div>
            <button
              onClick={() => handleRemoveCategory(cat.category)}
              className="text-xs text-red-400 hover:text-red-600 shrink-0 transition-colors"
            >
              Remove
            </button>
          </div>
        ))}

        {/* Add category form */}
        <div className="bg-gray-50 rounded-lg p-3 mt-2 space-y-2">
          <p className="text-xs font-medium text-gray-600">Add a tracked category</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <select
                className={`${inp} w-full`}
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              >
                <option value="">Select a category…</option>
                {budgetCategories.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <input
                type="number"
                className={`${inp} w-full`}
                placeholder="$ threshold"
                min="1"
                value={newThreshold}
                onChange={(e) => setNewThreshold(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4 text-xs text-gray-700">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={newNotifyOwner} onChange={(e) => setNewNotifyOwner(e.target.checked)} className="accent-primary-600" />
              Notify me
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={newNotifyPartner} onChange={(e) => setNewNotifyPartner(e.target.checked)} className="accent-primary-600" />
              Notify partner
            </label>
          </div>
          <button
            onClick={handleAddCategory}
            disabled={!newCatName || !newThreshold || Number(newThreshold) <= 0}
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            + Add category
          </button>
        </div>
      </div>

      {/* Check-in schedule */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Check-in Reminders</p>
        <p className="text-xs text-gray-500 mb-3">
          Both of you get a friendly reminder email to review the budget together.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {([null, 'weekly', 'biweekly', 'monthly'] as const).map((opt) => (
            <button
              key={String(opt)}
              onClick={() => handleScheduleChange(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                settings.check_in_schedule === opt
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt === null ? 'Off' : opt === 'biweekly' ? 'Every 2 weeks' : opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>

        {(settings.check_in_schedule === 'weekly' || settings.check_in_schedule === 'biweekly') && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Send on:</label>
            <select
              value={settings.check_in_day ?? 1}
              onChange={(e) => setSettings((prev) => ({ ...prev, check_in_day: Number(e.target.value) }))}
              className={`${inp} w-36`}
            >
              {DAY_NAMES.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
        )}

        {settings.check_in_schedule === 'monthly' && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Send on day:</label>
            <select
              value={settings.check_in_day ?? 1}
              onChange={(e) => setSettings((prev) => ({ ...prev, check_in_day: Number(e.target.value) }))}
              className={`${inp} w-24`}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <span className="text-xs text-gray-400">of the month</span>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {feedback && (
          <p className={`text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {feedback.msg}
          </p>
        )}
      </div>
    </div>
  );
}
