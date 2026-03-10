import { useState } from 'react';
import type {
  GlobalCategory,
  UserCustomCategory,
} from '@/lib/dataService';
import {
  saveCustomCategory,
  deleteCustomCategory,
} from '@/lib/dataService';
import { checkForDuplicate } from '@/lib/categorization';

interface Props {
  userId: string;
  globalCategories: GlobalCategory[];
  customCategories: UserCustomCategory[];
  onClose: () => void;
  onUpdate: (updated: UserCustomCategory[]) => void;
}

export default function CategoryManager({
  userId,
  globalCategories,
  customCategories,
  onClose,
  onUpdate,
}: Props) {
  const [newCatName, setNewCatName] = useState('');
  const [newCatParent, setNewCatParent] = useState('');
  const [warning, setWarning] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const allNames = [
    ...globalCategories.map(c => c.name),
    ...customCategories.map(c => c.name),
  ];

  const handleNameChange = (val: string) => {
    setNewCatName(val);
    if (val.trim().length > 1) {
      const check = checkForDuplicate(val.trim(), allNames);
      setWarning(check.warning ?? '');
    } else {
      setWarning('');
    }
  };

  const handleCreate = async () => {
    if (!newCatName.trim()) return;
    setSaving(true);
    const result = await saveCustomCategory(
      userId,
      newCatName.trim(),
      newCatParent || null
    );
    setSaving(false);
    if (result) {
      onUpdate([...customCategories, result]);
      setNewCatName('');
      setNewCatParent('');
      setWarning('');
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const ok = await deleteCustomCategory(id);
    if (ok) onUpdate(customCategories.filter(c => c.id !== id));
    setDeletingId(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200">
          <h2 className="text-lg font-bold text-secondary-800">Manage Categories</h2>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {/* Global categories (read-only) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-secondary-400 mb-2">
              Global Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              {globalCategories.map(cat => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-100 text-secondary-600 text-xs font-medium"
                >
                  {cat.icon} {cat.name}
                </span>
              ))}
            </div>
          </div>

          {/* Custom categories */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-secondary-400 mb-2">
              My Custom Categories
            </h3>
            {customCategories.length === 0 ? (
              <p className="text-secondary-400 text-sm italic">No custom categories yet.</p>
            ) : (
              <div className="space-y-2">
                {customCategories.map(cat => {
                  const parent = globalCategories.find(g => g.id === cat.parent_global_category_id);
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between bg-secondary-50 rounded-lg px-3 py-2"
                    >
                      <div>
                        <span className="text-secondary-800 text-sm font-medium">{cat.name}</span>
                        {parent && (
                          <span className="text-secondary-400 text-xs ml-2">
                            under {parent.icon} {parent.name}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        disabled={deletingId === cat.id}
                        className="text-secondary-300 hover:text-red-400 transition-colors disabled:opacity-50 text-xs font-semibold"
                      >
                        {deletingId === cat.id ? '…' : 'Remove'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create new custom category */}
          <div className="border-t border-secondary-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-secondary-400 mb-3">
              + Create Custom Category
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-secondary-600 mb-1 uppercase tracking-wide">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Pet Expenses"
                  className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-secondary-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {warning && (
                  <p className="text-amber-600 text-xs mt-1.5 flex items-start gap-1">
                    <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {warning}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary-600 mb-1 uppercase tracking-wide">
                  Parent Category (optional)
                </label>
                <select
                  value={newCatParent}
                  onChange={e => setNewCatParent(e.target.value)}
                  className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-secondary-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  {globalCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCreate}
                disabled={saving || !newCatName.trim()}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
