import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Fund, Transaction, Category, AppSettings } from '@/types/finance';

let supabaseInstance: SupabaseClient | null = null;
let currentUrl: string | null = null;
let currentKey: string | null = null;

export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const url =
    customUrl ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('rizqwise_supabase_url') || localStorage.getItem('rizqflow_supabase_url')
      : null);
  const key =
    customKey ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('rizqwise_supabase_key') || localStorage.getItem('rizqflow_supabase_key')
      : null);

  if (!url || !key) {
    return null;
  }

  if (!supabaseInstance || currentUrl !== url || currentKey !== key) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      currentUrl = url;
      currentKey = key;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }

  return supabaseInstance;
}

export async function testSupabaseConnection(
  url: string,
  key: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = createClient(url, key);
    // Query either rizqwise_sync or rizqflow_sync
    const { error: err1 } = await client.from('rizqwise_sync').select('id').limit(1);
    if (!err1 || err1.code === 'PGRST116') {
      return { success: true };
    }
    const { error: err2 } = await client.from('rizqflow_sync').select('id').limit(1);
    if (!err2 || err2.code === 'PGRST116') {
      return { success: true };
    }
    if (err1 && err1.code !== '42P01' && err1.code !== 'PGRST116') {
      return { success: false, error: err1.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reach Supabase project' };
  }
}

export interface CloudSyncPayload {
  funds: Fund[];
  transactions: Transaction[];
  categories: Category[];
  settings: AppSettings;
}

/**
 * Pushes local state to Supabase cloud database
 */
export async function pushToSupabase(
  data: CloudSyncPayload,
  customUrl?: string,
  customKey?: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(customUrl, customKey);
  if (!client) {
    return { success: false, error: 'Supabase credentials not configured' };
  }

  const payload = {
    id: 'primary_sync',
    data: {
      funds: data.funds,
      transactions: data.transactions,
      categories: data.categories,
      settings: data.settings,
    },
    updated_at: new Date().toISOString(),
  };

  try {
    // 1. Try pushing to rizqwise_sync table
    const { error } = await client.from('rizqwise_sync').upsert(payload, { onConflict: 'id' });

    if (!error) {
      return { success: true };
    }

    // 2. If rizqwise_sync table does not exist (42P01), try fallback to legacy rizqflow_sync table
    if (error.code === '42P01') {
      const { error: legacyError } = await client
        .from('rizqflow_sync')
        .upsert(payload, { onConflict: 'id' });

      if (!legacyError) {
        return { success: true };
      }

      return {
        success: false,
        error:
          'Table "rizqwise_sync" does not exist yet. Please run the SQL snippet in your Supabase SQL editor.',
      };
    }

    return { success: false, error: error.message };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Sync failed' };
  }
}

/**
 * Pulls latest state from Supabase cloud database
 */
export async function pullFromSupabase(
  customUrl?: string,
  customKey?: string
): Promise<{ success: boolean; data?: CloudSyncPayload; error?: string }> {
  const client = getSupabaseClient(customUrl, customKey);
  if (!client) {
    return { success: false, error: 'Supabase credentials not configured' };
  }

  try {
    // 1. Try pulling from rizqwise_sync table
    const { data, error } = await client
      .from('rizqwise_sync')
      .select('data, updated_at')
      .eq('id', 'primary_sync')
      .single();

    if (!error && data && data.data) {
      return { success: true, data: data.data as CloudSyncPayload };
    }

    // 2. Fallback to legacy rizqflow_sync table if 42P01 or empty
    if (error && error.code === '42P01') {
      const { data: legacyData, error: legacyError } = await client
        .from('rizqflow_sync')
        .select('data, updated_at')
        .eq('id', 'primary_sync')
        .single();

      if (!legacyError && legacyData && legacyData.data) {
        return { success: true, data: legacyData.data as CloudSyncPayload };
      }

      if (legacyError && legacyError.code !== 'PGRST116') {
        return { success: false, error: legacyError.message };
      }
    }

    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      return { success: false, error: error.message };
    }

    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch from cloud' };
  }
}
