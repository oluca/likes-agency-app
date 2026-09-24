/** Null while Supabase is not configured yet (lets the proxy keep public pages reachable). */
export function readSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  // Tolerate pasted endpoints like https://x.supabase.co/rest/v1/ -> keep only the origin.
  return { url: new URL(url).origin, key };
}

export function supabaseEnv() {
  const env = readSupabaseEnv();
  if (!env) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set");
  }
  return env;
}
