import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import CategoryManager from '@/components/CategoryManager';
import {
  getGlobalCategories,
  getGlobalSubcategories,
  getGlobalMerchants,
  getUserOverrides,
  getUserCustomCategories,
  getUserTransactions,
  saveTransaction,
  updateTransaction,
  deleteTransaction,
  saveUserOverride,
} from '@/lib/dataService';
import type {
  GlobalCategory,
  GlobalSubcategory,
  GlobalMerchant,
  UserCustomCategory,
  UserCategoryOverride,
  UserTransaction,
} from '@/lib/dataService';
import {
  resolveCategory,
  buildFlagPayload,
  queueFlag,
  getFlagQueueAndClear,
} from '@/lib/categorization';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt$ = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const todayISO = () => new Date().toISOString().slice(0, 10);

const inputCls =
  'w-full border border-secondary-300 rounded-lg px-3 py-2 text-secondary-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const labelCls =
  'block text-xs font-semibold text-secondary-600 mb-1 uppercase tracking-wide';

// A unified category value like "global:uuid" or "custom:uuid" or ""
type CatValue = string;

function parseCatValue(val: CatValue): { type: 'global' | 'custom' | null; id: string | null } {
  if (!val) return { type: null, id: null };
  const [type, id] = val.split(':');
  return { type: type as 'global' | 'custom', id };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TransactionPanel() {
  const { user, openAuthModal } = useAuth();

  // ── Reference data ──────────────────────────────────────────────────────────
  const [globalCategories, setGlobalCategories] = useState<GlobalCategory[]>([]);
  const [globalSubcategories, setGlobalSubcategories] = useState<GlobalSubcategory[]>([]);
  const [globalMerchants, setGlobalMerchants] = useState<GlobalMerchant[]>([]);
  const [userOverrides, setUserOverrides] = useState<UserCategoryOverride[]>([]);
  const [customCategories, setCustomCategories] = useState<UserCustomCategory[]>([]);

  // ── Transaction list ────────────────────────────────────────────────────────
  const now = new Date();
  const [viewYear] = useState(now.getFullYear());
  const [viewMonth] = useState(now.getMonth() + 1);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // ── Entry form ──────────────────────────────────────────────────────────────
  const [date, setDate] = useState(todayISO());
  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCat, setSelectedCat] = useState<CatValue>('');
  const [subcategoryName, setSubcategoryName] = useState('');
  const [wasAutoCategorized, setWasAutoCategorized] = useState(false);
  const [autoMatchedMerchant, setAutoMatchedMerchant] = useState<GlobalMerchant | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // ── Merchant typeahead ──────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<GlobalMerchant[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const merchantInputRef = useRef<HTMLInputElement>(null);

  // ── Inline edit ─────────────────────────────────────────────────────────────
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editCat, setEditCat] = useState<CatValue>('');
  const [editSubcat, setEditSubcat] = useState('');

  // ── Category manager ────────────────────────────────────────────────────────
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // ── Load global reference data (once, for all users) ───────────────────────
  useEffect(() => {
    Promise.all([
      getGlobalCategories(),
      getGlobalSubcategories(),
      getGlobalMerchants(),
    ]).then(([cats, subs, merchants]) => {
      setGlobalCategories(cats);
      setGlobalSubcategories(subs);
      setGlobalMerchants(merchants);
    });
  }, []);

  // ── Load user-specific data ─────────────────────────────────────────────────
  const loadUserData = useCallback(async () => {
    if (!user) return;
    const [overrides, custom] = await Promise.all([
      getUserOverrides(user.id),
      getUserCustomCategories(user.id),
    ]);
    setUserOverrides(overrides);
    setCustomCategories(custom);
  }, [user]);

  const loadTransactions = useCallback(async () => {
    if (!user) return;
    setLoadingTx(true);
    const txs = await getUserTransactions(user.id, viewYear, viewMonth);
    setTransactions(txs);
    setLoadingTx(false);
  }, [user, viewYear, viewMonth]);

  useEffect(() => {
    loadUserData();
    loadTransactions();
  }, [loadUserData, loadTransactions]);

  // ── Flush flag queue on page unload ────────────────────────────────────────
  useEffect(() => {
    const handleUnload = () => {
      const flags = getFlagQueueAndClear();
      if (flags.length === 0) return;
      try {
        navigator.sendBeacon('/api/flags', JSON.stringify(flags));
      } catch {
        // Fail silently
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // ── Merchant input → typeahead + auto-categorize ───────────────────────────
  const handleMerchantChange = (val: string) => {
    setMerchantName(val);

    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const norm = val.toLowerCase();
    const matches = globalMerchants
      .filter(m => m.merchant_name.includes(norm) || norm.includes(m.merchant_name))
      .slice(0, 6);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);

    // Auto-categorize
    if (val.trim()) {
      const resolved = resolveCategory(val.trim(), userOverrides, globalMerchants);
      setWasAutoCategorized(resolved.wasAutoCategorized);
      setAutoMatchedMerchant(resolved.matchedMerchant);
      if (resolved.globalCategoryId) {
        setSelectedCat(`global:${resolved.globalCategoryId}`);
      } else if (resolved.customCategoryId) {
        setSelectedCat(`custom:${resolved.customCategoryId}`);
      }
      // Don't overwrite subcategory if user already typed one
      if (!subcategoryName && resolved.subcategoryName) {
        setSubcategoryName(resolved.subcategoryName);
      }
    }
  };

  const selectMerchantSuggestion = (merchant: GlobalMerchant) => {
    setMerchantName(merchant.merchant_name);
    setShowSuggestions(false);
    handleMerchantChange(merchant.merchant_name);
  };

  // ── Category change (user overrides auto) ──────────────────────────────────
  const handleCategoryChange = (val: CatValue) => {
    setSelectedCat(val);
    if (wasAutoCategorized) setWasAutoCategorized(false);
  };

  // ── Subcategory suggestions for selected category ─────────────────────────
  const relevantSubcategories = (): GlobalSubcategory[] => {
    const { type, id } = parseCatValue(selectedCat);
    if (type !== 'global' || !id) return [];
    return globalSubcategories.filter(s => s.category_id === id);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { openAuthModal(); return; }
    if (!merchantName.trim() || !amount) return;

    setSaveError('');
    setSaving(true);

    const { type: catType, id: catId } = parseCatValue(selectedCat);
    const resolvedCatId = catType === 'global' ? catId : null;
    const resolvedCustomCatId = catType === 'custom' ? catId : null;

    const userChangedFromAuto = !wasAutoCategorized && autoMatchedMerchant !== null;

    // Queue flag for silent batch flush
    if (catId) {
      const catName =
        catType === 'global'
          ? (globalCategories.find(c => c.id === catId)?.name ?? '')
          : (customCategories.find(c => c.id === catId)?.name ?? '');
      const flag = buildFlagPayload(
        { merchant_name: merchantName },
        { categoryName: catName, subcategoryName: subcategoryName || undefined },
        autoMatchedMerchant,
        globalCategories
      );
      if (flag) queueFlag(flag);
    }

    // Save user override if they changed from auto-suggestion
    if (userChangedFromAuto && catId) {
      await saveUserOverride(user.id, {
        merchant_name: merchantName.trim().toLowerCase(),
        preferred_category_id: resolvedCatId,
        preferred_custom_category_id: resolvedCustomCatId,
        preferred_subcategory_name: subcategoryName || null,
      });
    }

    const saved = await saveTransaction(user.id, {
      date,
      merchant_name: merchantName.trim(),
      description: description.trim() || undefined,
      amount: parseFloat(amount),
      resolved_category_id: resolvedCatId,
      resolved_custom_category_id: resolvedCustomCatId,
      resolved_subcategory_name: subcategoryName.trim() || null,
      was_auto_categorized: wasAutoCategorized,
      was_overridden_by_user: userChangedFromAuto,
    });

    setSaving(false);

    if (!saved) {
      setSaveError('Could not save transaction. Please try again.');
      return;
    }

    // Reset form
    setMerchantName('');
    setAmount('');
    setDescription('');
    setSelectedCat('');
    setSubcategoryName('');
    setWasAutoCategorized(false);
    setAutoMatchedMerchant(null);
    setDate(todayISO());

    // Refresh list
    await loadTransactions();
  };

  // ── Inline edit ─────────────────────────────────────────────────────────────
  const startEdit = (tx: UserTransaction) => {
    setEditingTxId(tx.id);
    if (tx.resolved_category_id) setEditCat(`global:${tx.resolved_category_id}`);
    else if (tx.resolved_custom_category_id) setEditCat(`custom:${tx.resolved_custom_category_id}`);
    else setEditCat('');
    setEditSubcat(tx.resolved_subcategory_name ?? '');
  };

  const saveEdit = async (txId: string) => {
    const { type, id } = parseCatValue(editCat);
    await updateTransaction(txId, {
      resolved_category_id: type === 'global' ? id : null,
      resolved_custom_category_id: type === 'custom' ? id : null,
      resolved_subcategory_name: editSubcat.trim() || null,
      was_overridden_by_user: true,
    });
    setEditingTxId(null);
    await loadTransactions();
  };

  const handleDelete = async (txId: string) => {
    await deleteTransaction(txId);
    setTransactions(prev => prev.filter(t => t.id !== txId));
  };

  // ── Category label helpers ─────────────────────────────────────────────────
  const getCategoryLabel = (tx: UserTransaction): string => {
    if (tx.resolved_category_id) {
      const cat = globalCategories.find(c => c.id === tx.resolved_category_id);
      return cat ? `${cat.icon} ${cat.name}` : '—';
    }
    if (tx.resolved_custom_category_id) {
      return customCategories.find(c => c.id === tx.resolved_custom_category_id)?.name ?? '—';
    }
    return '—';
  };

  // ── Month total ────────────────────────────────────────────────────────────
  const monthTotal = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto py-10 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 px-8 py-12">
          <div className="text-4xl mb-4">💳</div>
          <h2 className="text-xl font-bold text-secondary-800 mb-2">Track Your Spending</h2>
          <p className="text-secondary-500 text-sm mb-6 max-w-sm mx-auto">
            Sign in to log transactions, auto-categorize spending, and see how you're tracking against your budget.
          </p>
          <button onClick={openAuthModal} className="btn-primary px-6 py-2.5 text-sm font-semibold">
            Sign In to Get Started
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">

      {/* ── Entry Form ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
          <h2 className="font-bold text-secondary-800 text-base">Log a Transaction</h2>
          <button
            onClick={() => setShowCategoryManager(true)}
            className="text-xs text-primary-600 font-semibold hover:text-primary-800 transition-colors"
          >
            Manage Categories
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className={labelCls}>Date</label>
              <input
                type="date"
                className={inputCls}
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className={labelCls}>Amount ($)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className={inputCls}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Merchant with typeahead */}
          <div className="relative">
            <label className={labelCls}>Merchant / Payee</label>
            <div className="relative">
              <input
                ref={merchantInputRef}
                type="text"
                className={inputCls}
                value={merchantName}
                onChange={e => handleMerchantChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="e.g. Walmart, McDonald's…"
                autoComplete="off"
                required
              />
              {wasAutoCategorized && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-primary-600 font-semibold bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Auto-categorized
                </span>
              )}
            </div>

            {/* Typeahead dropdown */}
            {showSuggestions && (
              <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg overflow-hidden">
                {suggestions.map(m => {
                  const cat = globalCategories.find(c => c.id === m.default_category_id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={() => selectMerchantSuggestion(m)}
                      className="w-full text-left px-4 py-2.5 hover:bg-secondary-50 transition-colors flex items-center justify-between"
                    >
                      <span className="text-secondary-800 text-sm capitalize">{m.merchant_name}</span>
                      {cat && (
                        <span className="text-secondary-400 text-xs">
                          {cat.icon} {cat.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Unknown merchant prompt */}
            {merchantName.trim().length > 2 && !wasAutoCategorized && !autoMatchedMerchant && (
              <p className="text-amber-600 text-xs mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                We don&apos;t recognize this merchant — how would you like to categorize it?
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className={labelCls}>Category</label>
              <select
                className={inputCls}
                value={selectedCat}
                onChange={e => handleCategoryChange(e.target.value)}
              >
                <option value="">Select a category…</option>
                <optgroup label="Categories">
                  {globalCategories.map(cat => (
                    <option key={cat.id} value={`global:${cat.id}`}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </optgroup>
                {customCategories.length > 0 && (
                  <optgroup label="My Custom Categories">
                    {customCategories.map(cat => (
                      <option key={cat.id} value={`custom:${cat.id}`}>
                        {cat.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Subcategory */}
            <div>
              <label className={labelCls}>Subcategory (optional)</label>
              <input
                type="text"
                list="subcategory-list"
                className={inputCls}
                value={subcategoryName}
                onChange={e => setSubcategoryName(e.target.value)}
                placeholder="e.g. Groceries, Gasoline…"
              />
              <datalist id="subcategory-list">
                {relevantSubcategories().map(s => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description (optional)</label>
            <input
              type="text"
              className={inputCls}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Any notes about this transaction"
            />
          </div>

          {saveError && (
            <p className="text-red-600 text-sm">{saveError}</p>
          )}

          <button
            type="submit"
            disabled={saving || !merchantName.trim() || !amount}
            className="btn-primary text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save Transaction'}
          </button>
        </form>
      </div>

      {/* ── Transaction History ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-secondary-800 text-base">
              {new Date(viewYear, viewMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            {transactions.length > 0 && (
              <p className="text-secondary-400 text-xs mt-0.5">
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} · Total {fmt$(monthTotal)}
              </p>
            )}
          </div>
        </div>

        {loadingTx ? (
          <div className="px-6 py-8 text-center text-secondary-400 text-sm">Loading…</div>
        ) : transactions.length === 0 ? (
          <div className="px-6 py-8 text-center text-secondary-400 text-sm">
            No transactions logged this month yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-secondary-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-secondary-500 uppercase tracking-wide">Merchant</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-secondary-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-secondary-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-secondary-500 uppercase tracking-wide hidden sm:table-cell">Subcategory</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-secondary-50 transition-colors">
                    <td className="px-4 py-3 text-secondary-500 whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="px-4 py-3 text-secondary-800 font-medium">
                      {tx.merchant_name}
                      {tx.was_auto_categorized && !tx.was_overridden_by_user && (
                        <span className="ml-1.5 text-primary-500 text-xs">✓</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-secondary-800 whitespace-nowrap">
                      {fmt$(Number(tx.amount))}
                    </td>

                    {editingTxId === tx.id ? (
                      <>
                        <td className="px-4 py-2">
                          <select
                            className="border border-secondary-300 rounded px-2 py-1 text-xs text-secondary-800 focus:outline-none focus:ring-1 focus:ring-primary-500 w-full min-w-[140px]"
                            value={editCat}
                            onChange={e => setEditCat(e.target.value)}
                          >
                            <option value="">—</option>
                            <optgroup label="Categories">
                              {globalCategories.map(cat => (
                                <option key={cat.id} value={`global:${cat.id}`}>
                                  {cat.icon} {cat.name}
                                </option>
                              ))}
                            </optgroup>
                            {customCategories.length > 0 && (
                              <optgroup label="Custom">
                                {customCategories.map(cat => (
                                  <option key={cat.id} value={`custom:${cat.id}`}>
                                    {cat.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        </td>
                        <td className="px-4 py-2 hidden sm:table-cell">
                          <input
                            type="text"
                            className="border border-secondary-300 rounded px-2 py-1 text-xs text-secondary-800 focus:outline-none focus:ring-1 focus:ring-primary-500 w-full"
                            value={editSubcat}
                            onChange={e => setEditSubcat(e.target.value)}
                            placeholder="Subcategory"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(tx.id)}
                              className="text-xs text-primary-600 font-semibold hover:text-primary-800"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTxId(null)}
                              className="text-xs text-secondary-400 hover:text-secondary-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-secondary-600">
                          {getCategoryLabel(tx)}
                        </td>
                        <td className="px-4 py-3 text-secondary-400 hidden sm:table-cell">
                          {tx.resolved_subcategory_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => startEdit(tx)}
                              className="text-xs text-secondary-400 hover:text-primary-600 transition-colors"
                              title="Edit"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="text-xs text-secondary-300 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Category Manager Modal ─────────────────────────────────────────── */}
      {showCategoryManager && (
        <CategoryManager
          userId={user.id}
          globalCategories={globalCategories}
          customCategories={customCategories}
          onClose={() => setShowCategoryManager(false)}
          onUpdate={updated => setCustomCategories(updated)}
        />
      )}
    </div>
  );
}
