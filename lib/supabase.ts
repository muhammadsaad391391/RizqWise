import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Fund, Transaction, Category, AppSettings } from '@/types/finance';

let supabaseInstance: SupabaseClient | null = null;
let currentUrl: string | null = null;
let currentKey: string | null = null;

export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const url = customUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || (typeof window !== 'undefined' ? localStorage.getItem('rizqflow_supabase_url') : null);
  const key = customKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (typeof window !== 'undefined' ? localStorage.getItem('rizqflow_supabase_key') : null);

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

export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = createClient(url, key);
    // Simple query to verify connection
    const { error } = await client.from('rizqflow_sync').select('id').limit(1);
    // Even if table doesn't exist yet, a 404 or specific code means credentials worked
    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      return { success: false, error: error.message };
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

  try {
    // Upsert into rizqflow_sync table with single sync ID 'primary_sync'
    const { error } = await client.from('rizqflow_sync').upsert(
      {
        id: 'primary_sync',
        data: {
          funds: data.funds,
          transactions: data.transactions,
          categories: data.categories,
          settings: data.settings,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      // If table doesn't exist, we inform the user to run the 2-line SQL script
      if (error.code === '42P01') {
        return {
          success: false,
          error: 'Table "rizqflow_sync" does not exist yet. Please run the SQL snippet in Supabase SQL editor.',
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
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
    const { data, error } = await client
      .from('rizqflow_sync')
      .select('data, updated_at')
      .eq('id', 'primary_sync')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record exists yet
        return { success: true, data: undefined };
      }
      return { success: false, error: error.message };
    }

    if (data && data.data) {
      return { success: true, data: data.data as CloudSyncPayload };
    }

    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch from cloud' };
  }
}
