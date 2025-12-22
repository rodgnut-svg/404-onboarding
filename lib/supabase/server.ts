import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase server client that reads cookies for authentication.
 * This ensures all operations run with the authenticated user's session context.
 * Use this in Server Components and Server Actions.
 * 
 * IMPORTANT: In App Router server actions, cookie setting/removal is restricted,
 * so set() and remove() are no-ops. Cookie updates should be handled by middleware
 * or the auth callback route.
 * 
 * This uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to ensure
 * RLS policies can access auth.uid() correctly.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // No-op in App Router server actions (cookies can't be set here)
          // Cookie updates are handled by middleware or auth callback
        },
        remove(name: string, options: any) {
          // No-op in App Router server actions (cookies can't be removed here)
          // Cookie updates are handled by middleware or auth callback
        },
      },
    }
  );
}

// Alias for backward compatibility with existing code
export async function createServerSupabaseClient() {
  return createServerSupabase();
}

// Alias for backward compatibility
export async function createClientSupabase() {
  return createServerSupabase();
}

export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

