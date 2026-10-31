import { createClient, type SupabaseClient } from '@supabase/supabase-js';
// The public publishable key is safe in the browser only with correctly configured RLS.
// NO secret/service_role key. V2 does not yet request or alter user data.
let client: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}
