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
