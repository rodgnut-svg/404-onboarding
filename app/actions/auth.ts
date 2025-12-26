"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { createClientSupabase } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Admin email whitelist - only these two emails can be admins
const ADMIN_EMAILS = [
  "rodgnut@gmail.com",
  "davidmortleman@gmail.com",
];

/**
 * Check if an email is in the admin whitelist
 */
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

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

  // Get user's email to check if they're an admin
  const { data: { user } } = await supabase.auth.admin.getUserById(userId);
  const userEmail = user?.email;
  const isAdmin = isAdminEmail(userEmail);

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", pendingProjectId)
    .eq("user_id", userId)
    .single();

  if (existingMember) {
    // If user is admin and their role is not agency_admin, update it
    if (isAdmin && existingMember.role !== "agency_admin") {
      await supabase
        .from("project_members")
        .update({ role: "agency_admin" })
        .eq("project_id", pendingProjectId)
        .eq("user_id", userId);
    }
    cookieStore.delete("pending_project");
    return;
  }

  // Determine role: admins get agency_admin, others get client_admin/client_member
  let role: string;
  if (isAdmin) {
    role = "agency_admin";
  } else {
    // Check if there's already a client_admin
    const { data: existingAdmin } = await supabase
      .from("project_members")
      .select("*")
      .eq("project_id", pendingProjectId)
      .eq("role", "client_admin")
      .single();

    role = existingAdmin ? "client_member" : "client_admin";
  }

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

