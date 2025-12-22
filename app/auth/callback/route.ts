import { createServerClient } from "@supabase/ssr";
import { attachMemberAfterAuth } from "@/app/actions/auth";
import { acceptClientCode } from "@/app/actions/client-codes";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/portal";
  const error_param = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");

  // Check for OAuth errors in the URL
  if (error_param) {
    console.error("[auth/callback] OAuth error in URL:", error_param, error_description);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error_description || error_param)}`, requestUrl.origin)
    );
  }

  if (!code) {
    console.error("[auth/callback] No code parameter in URL");
    return NextResponse.redirect(new URL("/login?error=no_code", requestUrl.origin));
  }

  const cookieStore = await cookies();
  
  // Create a server client with working cookie set/remove for route handlers
  // Route handlers CAN set cookies, unlike server actions
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Route handlers CAN set cookies, so we do it here
          try {
            cookieStore.set(name, value, options);
          } catch (err) {
            console.error(`[auth/callback] Failed to set cookie ${name}:`, err);
          }
        },
        remove(name: string, options: any) {
          // Route handlers CAN remove cookies, so we do it here
          try {
            cookieStore.delete(name);
          } catch (err) {
            console.error(`[auth/callback] Failed to remove cookie ${name}:`, err);
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] Error exchanging code for session:", {
      message: error.message,
      status: error.status,
      code: code.substring(0, 10) + "...", // Log partial code for debugging
    });
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
    );
  }

  if (!data.user) {
    console.error("[auth/callback] No user in session data");
    return NextResponse.redirect(new URL("/login?error=no_user", requestUrl.origin));
  }

  try {
    // Check for pending client code (new flow)
    const pendingClientCode = cookieStore.get("pending_client_code")?.value;

    if (pendingClientCode) {
      try {
        // Auto-join project using the stored client code
        const { projectId } = await acceptClientCode(pendingClientCode);
        
        // Clear the cookie
        cookieStore.delete("pending_client_code");
        
        // Redirect to the project dashboard
        return NextResponse.redirect(new URL(`/portal/${projectId}`, requestUrl.origin));
      } catch (joinError) {
        console.error("[auth/callback] Error joining project with client code:", joinError);
        // Clear the cookie on error
        cookieStore.delete("pending_client_code");
        // Fall through to portal redirect
      }
    }

    // Legacy flow: Attach user to pending project if exists (old system)
    await attachMemberAfterAuth(data.user.id);
    
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } catch (err) {
    console.error("[auth/callback] Error attaching member:", err);
    // Still redirect even if attachMemberAfterAuth fails
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }
}

