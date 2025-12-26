import { createClientSupabase } from "./supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

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

export async function requireUser() {
  const supabase = await createClientSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { user, supabase };
}

export async function requireProjectMember(projectId: string) {
  const { user, supabase } = await requireUser();

  // Check for active project restriction
  const cookieStore = await cookies();
  const activeProjectId = cookieStore.get("active_project_id")?.value;

  if (activeProjectId && activeProjectId !== projectId) {
    // User is restricted to a different project - redirect them to their active project
    redirect(`/portal/${activeProjectId}`);
  }

  const { data: member, error } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (error || !member) {
    redirect("/portal");
  }

  return { user, supabase, member };
}

export async function requireAgencyAdmin() {
  const { user, supabase } = await requireUser();

  // First check: user must be in admin email whitelist
  if (!isAdminEmail(user.email)) {
    redirect("/portal");
  }

  // Second check: user must have agency_admin role in at least one project
  const { data: members } = await supabase
    .from("project_members")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["agency_admin"]);

  if (!members || members.length === 0) {
    redirect("/portal");
  }

  return { user, supabase };
}

/**
 * Requires that the user is an agency_admin for the specific project.
 * Redirects to project dashboard if user is not an agency_admin.
 */
export async function requireAgencyAdminForProject(projectId: string) {
  const { user, supabase, member } = await requireProjectMember(projectId);

  // SECURITY: Only agency_admin can perform admin actions
  // Also verify they're in the admin email whitelist
  if (member.role !== "agency_admin" || !isAdminEmail(user.email)) {
    redirect(`/portal/${projectId}`);
  }

  return { user, supabase, member };
}

