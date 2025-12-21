import { createClientSupabase } from "@/lib/supabase/server";
import { attachMemberAfterAuth } from "@/app/actions/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/portal";

  if (code) {
    const supabase = await createClientSupabase();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Attach user to pending project if exists
      await attachMemberAfterAuth(data.user.id);
      
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL("/login?error=auth_failed", requestUrl.origin));
}

