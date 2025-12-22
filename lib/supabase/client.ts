import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase browser client for use in client components.
 * This client reads/writes cookies automatically for session management.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Alias for backward compatibility
export function createClientSupabase() {
  return createBrowserSupabaseClient();
}

