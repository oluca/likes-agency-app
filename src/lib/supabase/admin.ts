import "server-only";
import { createClient } from "@supabase/supabase-js";
import { readSupabaseEnv } from "@/lib/supabase/env";

/**
 * Service-role client for system-owned job columns (status, durations, billing, ...).
 * Bypasses RLS: only call it after the caller was authorized for the job. Null when
 * SUPABASE_SERVICE_ROLE_KEY is not configured (syncing is then skipped).
 */
export function createAdminClient() {
  const env = readSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !key) return null;
  return createClient(env.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
