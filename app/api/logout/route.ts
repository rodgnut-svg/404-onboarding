import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  // Create Supabase client to sign out
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set(name, value, options);
          } catch (err) {
            // Ignore errors in route handlers
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete(name);
          } catch (err) {
            // Ignore errors in route handlers
          }
        },
      },
    }
  );

  // Sign out the user
  await supabase.auth.signOut();

  // Clear the active_project_id cookie
  cookieStore.delete("active_project_id");

  return NextResponse.json({ success: true });
}
