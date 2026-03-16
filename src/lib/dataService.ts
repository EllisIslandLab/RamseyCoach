/**
 * dataService.ts
 * Central data service layer — ALL Supabase calls go here.
 * Components call functions from this module; never call supabase.from() directly in a component.
 */

import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GlobalCategory {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

export interface GlobalSubcategory {
  id: string;
  category_id: string;
  name: string;
}

export interface GlobalMerchant {
  id: string;
  merchant_name: string;
  default_category_id: string;
  default_subcategory_id: string | null;
  merchant_type: string;
}

export interface UserCustomCategory {
  id: string;
  user_id: string;
  name: string;
  parent_global_category_id: string | null;
  created_at: string;
}

export interface UserCategoryOverride {
  id: string;
  user_id: string;
  merchant_name: string;
  preferred_category_id: string | null;
  preferred_custom_category_id: string | null;
  preferred_subcategory_name: string | null;
}

export interface UserTransaction {
  id: string;
  user_id: string;
  date: string;
  merchant_name: string;
  description: string | null;
  amount: number;
  resolved_category_id: string | null;
  resolved_custom_category_id: string | null;
  resolved_subcategory_name: string | null;
  was_auto_categorized: boolean;
  was_overridden_by_user: boolean;
  created_at: string;
}

export interface NewTransaction {
  date: string;
  merchant_name: string;
  description?: string;
  amount: number;
  resolved_category_id?: string | null;
  resolved_custom_category_id?: string | null;
  resolved_subcategory_name?: string | null;
  was_auto_categorized: boolean;
  was_overridden_by_user: boolean;
}

export interface FlagPayload {
  flag_type: string;
  merchant_name?: string;
  user_suggested_category?: string;
  user_suggested_subcategory?: string;
  existing_global_mapping?: string;
}

export interface CategorizationFlag {
  id: string;
  flag_type: string;
  merchant_name: string | null;
  user_suggested_category: string | null;
  user_suggested_subcategory: string | null;
  existing_global_mapping: string | null;
  occurrence_count: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

// ─── Global Data ─────────────────────────────────────────────────────────────

export async function getGlobalCategories(): Promise<GlobalCategory[]> {
  try {
    const { data, error } = await supabase
      .from('global_categories')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getGlobalSubcategories(): Promise<GlobalSubcategory[]> {
  try {
    const { data, error } = await supabase
      .from('global_subcategories')
      .select('*')
      .order('name');
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getGlobalMerchants(): Promise<GlobalMerchant[]> {
  try {
    const { data, error } = await supabase
      .from('global_merchants')
      .select('*');
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

// ─── User Data ────────────────────────────────────────────────────────────────

export async function getUserOverrides(userId: string): Promise<UserCategoryOverride[]> {
  try {
    const { data, error } = await supabase
      .from('user_category_overrides')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getUserCustomCategories(userId: string): Promise<UserCustomCategory[]> {
  try {
    const { data, error } = await supabase
      .from('user_custom_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getUserTransactions(
  userId: string,
  year: number,
  month: number
): Promise<UserTransaction[]> {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('user_transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function saveTransaction(
  userId: string,
  tx: NewTransaction
): Promise<UserTransaction | null> {
  try {
    const { data, error } = await supabase
      .from('user_transactions')
      .insert({ user_id: userId, ...tx })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function updateTransaction(
  id: string,
  updates: Partial<Pick<
    UserTransaction,
    'resolved_category_id' | 'resolved_custom_category_id' | 'resolved_subcategory_name' | 'was_overridden_by_user'
  >>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_transactions')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

export async function deleteTransaction(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

// ─── User Overrides ───────────────────────────────────────────────────────────

export async function saveUserOverride(
  userId: string,
  override: {
    merchant_name: string;
    preferred_category_id?: string | null;
    preferred_custom_category_id?: string | null;
    preferred_subcategory_name?: string | null;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_category_overrides')
      .upsert(
        { user_id: userId, ...override },
        { onConflict: 'user_id,merchant_name' }
      );
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

// ─── Custom Categories ────────────────────────────────────────────────────────

export async function saveCustomCategory(
  userId: string,
  name: string,
  parent_global_category_id?: string | null
): Promise<UserCustomCategory | null> {
  try {
    const { data, error } = await supabase
      .from('user_custom_categories')
      .insert({ user_id: userId, name, parent_global_category_id: parent_global_category_id ?? null })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function deleteCustomCategory(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_custom_categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

// ─── Shared Access ────────────────────────────────────────────────────────────

export interface TrackedCategory {
  category: string;
  threshold: number;         // dollar amount over budget to trigger alert
  notify_owner: boolean;
  notify_partner: boolean;
}

export interface AccountabilitySettings {
  can_view_full_budget: boolean;
  show_merchants: boolean;
  tracked_categories: TrackedCategory[];
  check_in_schedule?: 'weekly' | 'biweekly' | 'monthly' | null;
  check_in_day?: number | null; // 0–6 (Sun–Sat) for weekly/biweekly; 1–28 for monthly
}

export interface SharedAccess {
  id: string;
  owner_id: string;
  partner_id: string | null;
  partner_email: string;
  access_type: 'spouse' | 'accountability';
  status: 'pending' | 'active' | 'declined';
  invite_token: string;
  accountability_settings: AccountabilitySettings | null;
  created_at: string;
}

export interface BudgetNotification {
  id: string;
  shared_access_id: string;
  type: 'budget_change' | 'over_budget' | 'under_budget' | 'nudge';
  category: string | null;
  payload: Record<string, unknown> | null;
  response_token: string;
  response: 'approved' | 'discuss' | 'meeting' | 'acknowledged' | null;
  created_at: string;
  responded_at: string | null;
}

/** Returns all active/pending sharing relationships for this user (as owner or partner). */
export async function getSharedAccess(userId: string): Promise<SharedAccess[]> {
  try {
    const { data, error } = await supabase
      .from('shared_access')
      .select('*')
      .or(`owner_id.eq.${userId},partner_id.eq.${userId}`)
      .neq('status', 'declined');
    if (error) throw error;
    return (data ?? []) as SharedAccess[];
  } catch {
    return [];
  }
}

/**
 * For spouse sharing: if this user is an active partner, returns the owner's user_id
 * so BudgetPlanner loads the shared budget. Otherwise returns the user's own id.
 */
export async function getEffectiveBudgetOwnerId(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('shared_access')
      .select('owner_id')
      .eq('partner_id', userId)
      .eq('access_type', 'spouse')
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    return data?.owner_id ?? userId;
  } catch {
    return userId;
  }
}

/** Owner removes a sharing relationship. */
export async function removeSharedAccess(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shared_access')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

/** Owner updates accountability settings (tracked categories, permissions). */
export async function updateAccountabilitySettings(
  id: string,
  settings: AccountabilitySettings
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shared_access')
      .update({ accountability_settings: settings })
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

/** Clears the user's saved budget data (used by "Reset to Defaults" in Account Settings). */
export async function resetBudgetData(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_tool_data')
      .upsert({ user_id: userId, budget_data: {}, updated_at: new Date().toISOString() });
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the user's budget subsection labels (fixedSubs + varSubs) plus
 * "Income" and "Savings" — used to populate the accountability category picker
 * with real budget lines instead of generic global categories.
 */
export async function getBudgetSubsectionNames(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_tool_data')
      .select('budget_data')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    const bd = (data?.budget_data ?? {}) as Record<string, unknown>;
    const names: string[] = ['Income', 'Savings'];
    for (const sub of [
      ...((bd.fixedSubs ?? []) as Array<{ label: string }>),
      ...((bd.varSubs ?? []) as Array<{ label: string }>),
    ]) {
      if (sub.label && !names.includes(sub.label)) names.push(sub.label);
    }
    return names;
  } catch {
    return ['Income', 'Savings'];
  }
}

/**
 * Returns owners whose full budget this user (as accountability partner) is
 * allowed to view — i.e. active accountability shares with can_view_full_budget.
 */
export async function getViewableBudgetOwners(
  userId: string
): Promise<Array<{ shareId: string; ownerId: string }>> {
  try {
    const { data, error } = await supabase
      .from('shared_access')
      .select('id, owner_id, accountability_settings')
      .eq('partner_id', userId)
      .eq('access_type', 'accountability')
      .eq('status', 'active');
    if (error) throw error;
    return (data ?? [])
      .filter((r) => (r.accountability_settings as AccountabilitySettings | null)?.can_view_full_budget)
      .map((r) => ({ shareId: r.id, ownerId: r.owner_id }));
  } catch {
    return [];
  }
}

/** Loads the raw budget_data for a partner-accessible owner (RLS enforces access). */
export async function getPartnerBudgetData(
  ownerId: string
): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabase
      .from('user_tool_data')
      .select('budget_data')
      .eq('user_id', ownerId)
      .maybeSingle();
    if (error) throw error;
    return (data?.budget_data ?? null) as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

// ─── Admin: Flags (read via API route — not directly from client) ─────────────

export async function updateFlagStatus(
  id: string,
  status: string,
  admin_notes?: string
): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';
    const res = await fetch('/api/admin/flags', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, status, admin_notes }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
