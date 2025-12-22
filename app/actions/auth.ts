"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { createClientSupabase } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function validateClientCode(formData: FormData) {
  const clientCode = formData.get("clientCode") as string;

  if (!clientCode) {
    return { error: "Client code is required" };
  }

  const supabase = createServiceRoleClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("id")
    .eq("client_code", clientCode.trim().toUpperCase())
    .single();

  if (error || !project) {
    return { error: "Invalid client code" };
  }

  // Store project ID in httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set("pending_project", project.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  });

  return { success: true };
}

export async function sendMagicLink(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email is required" };
  }

  const supabase = await createClientSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function attachMemberAfterAuth(userId: string) {
  const cookieStore = await cookies();
  const pendingProjectId = cookieStore.get("pending_project")?.value;

  if (!pendingProjectId) {
    return;
  }

  const supabase = createServiceRoleClient();

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", pendingProjectId)
    .eq("user_id", userId)
    .single();

  if (existingMember) {
    cookieStore.delete("pending_project");
    return;
  }

  // Check if there's already a client_admin
  const { data: existingAdmin } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", pendingProjectId)
    .eq("role", "client_admin")
    .single();

  const role = existingAdmin ? "client_member" : "client_admin";

  // Create membership
  await supabase.from("project_members").insert({
    project_id: pendingProjectId,
    user_id: userId,
    role,
  });

  cookieStore.delete("pending_project");
}

/**
 * Debug server action to verify auth.uid() is present in server actions.
 * Returns the current user's ID and email from the server's perspective.
 */
export async function debugWhoAmI() {
  const supabase = await createClientSupabase();
  
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      userId: null,
      email: null,
      error: authError?.message || "No user found",
    };
  }

  return {
    userId: user.id,
    email: user.email || null,
    error: null,
  };
}

