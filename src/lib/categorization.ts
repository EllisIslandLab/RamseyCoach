/**
 * categorization.ts
 * Pure categorization logic: resolution, duplicate detection, flag building.
 * Flag queue is module-level and flushed silently on page unload via sendBeacon.
 */

import type { GlobalMerchant, GlobalCategory, UserCategoryOverride, FlagPayload } from '@/lib/dataService';

// ─── Normalize ────────────────────────────────────────────────────────────────

function normalize(name: string): string {
  return name.toLowerCase().trim();
}

// ─── Bigram similarity (Dice coefficient) — no external library ───────────────

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };

  const aBi = bigrams(a);
  const bBi = bigrams(b);
  let intersection = 0;
  for (const bg of aBi) {
    if (bBi.has(bg)) intersection++;
  }
  return (2 * intersection) / (aBi.size + bBi.size);
}

// ─── resolveCategory ─────────────────────────────────────────────────────────

export interface ResolvedCategory {
  globalCategoryId: string | null;
  customCategoryId: string | null;
  subcategoryName: string | null;
  wasAutoCategorized: boolean;
  matchedMerchant: GlobalMerchant | null;
}

/**
 * Resolution priority:
 * 1. User's personal override for this merchant
 * 2. Fuzzy match against global_merchants
 * 3. null → prompt user
 */
export function resolveCategory(
  merchantName: string,
  userOverrides: UserCategoryOverride[],
  globalMerchants: GlobalMerchant[]
): ResolvedCategory {
  const norm = normalize(merchantName);

  // 1. User override
  const override = userOverrides.find(o => normalize(o.merchant_name) === norm);
  if (override) {
    return {
      globalCategoryId: override.preferred_category_id,
      customCategoryId: override.preferred_custom_category_id,
      subcategoryName: override.preferred_subcategory_name,
      wasAutoCategorized: true,
      matchedMerchant: null,
    };
  }

  // 2. Global merchant fuzzy match
  let bestMerchant: GlobalMerchant | null = null;
  let bestScore = 0;

  for (const merchant of globalMerchants) {
    const mNorm = normalize(merchant.merchant_name);

    // Exact or substring match gets priority
    if (mNorm === norm) {
      bestScore = 1;
      bestMerchant = merchant;
      break;
    }
    if (norm.includes(mNorm) || mNorm.includes(norm)) {
      const score = 0.8;
      if (score > bestScore) { bestScore = score; bestMerchant = merchant; }
      continue;
    }

    const score = similarity(norm, mNorm);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMerchant = merchant;
    }
  }

  if (bestMerchant && bestScore >= 0.5) {
    return {
      globalCategoryId: bestMerchant.default_category_id,
      customCategoryId: null,
      subcategoryName: null,
      wasAutoCategorized: true,
      matchedMerchant: bestMerchant,
    };
  }

  // 3. No match
  return {
    globalCategoryId: null,
    customCategoryId: null,
    subcategoryName: null,
    wasAutoCategorized: false,
    matchedMerchant: null,
  };
}

// ─── checkForDuplicate ────────────────────────────────────────────────────────

export interface DuplicateCheck {
  isDuplicate: boolean;
  closestMatch: string | null;
  warning: string | null;
}

/**
 * Case-insensitive similarity check against existing names.
 * Returns a gentle warning string at ≥85% similarity. Never blocks.
 */
export function checkForDuplicate(newName: string, existingNames: string[]): DuplicateCheck {
  const norm = normalize(newName);
  let closestMatch: string | null = null;
  let highestScore = 0;

  for (const existing of existingNames) {
    const score = similarity(norm, normalize(existing));
    if (score > highestScore) {
      highestScore = score;
      closestMatch = existing;
    }
  }

  if (highestScore >= 0.85) {
    return {
      isDuplicate: true,
      closestMatch,
      warning: `This looks similar to "${closestMatch}" — is that what you meant?`,
    };
  }

  return { isDuplicate: false, closestMatch: null, warning: null };
}

// ─── buildFlagPayload ─────────────────────────────────────────────────────────

/**
 * Builds a flag object for later silent batch insertion.
 * Returns null if no flag is warranted.
 */
export function buildFlagPayload(
  transaction: { merchant_name: string },
  userChoice: { categoryName: string; subcategoryName?: string },
  globalMapping: GlobalMerchant | null,
  globalCategories: GlobalCategory[]
): FlagPayload | null {
  const merchantName = normalize(transaction.merchant_name);

  if (!globalMapping) {
    return {
      flag_type: 'new_merchant',
      merchant_name: merchantName,
      user_suggested_category: userChoice.categoryName,
      user_suggested_subcategory: userChoice.subcategoryName,
    };
  }

  const globalCategoryName = globalCategories.find(
    c => c.id === globalMapping.default_category_id
  )?.name;

  if (globalCategoryName && globalCategoryName !== userChoice.categoryName) {
    return {
      flag_type: 'unusual_mapping',
      merchant_name: merchantName,
      user_suggested_category: userChoice.categoryName,
      user_suggested_subcategory: userChoice.subcategoryName,
      existing_global_mapping: globalCategoryName,
    };
  }

  if (userChoice.subcategoryName) {
    return {
      flag_type: 'subcategory_nomination',
      merchant_name: merchantName,
      user_suggested_category: userChoice.categoryName,
      user_suggested_subcategory: userChoice.subcategoryName,
      existing_global_mapping: globalCategoryName,
    };
  }

  return null;
}

// ─── Flag Queue (module-level) ────────────────────────────────────────────────

const _flagQueue: FlagPayload[] = [];

export function queueFlag(flag: FlagPayload): void {
  _flagQueue.push(flag);
}

export function getFlagQueueAndClear(): FlagPayload[] {
  const copy = [..._flagQueue];
  _flagQueue.length = 0;
  return copy;
}
