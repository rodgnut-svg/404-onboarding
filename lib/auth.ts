import { createClientSupabase } from "./supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

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
  if (member.role !== "agency_admin") {
    redirect(`/portal/${projectId}`);
  }

  return { user, supabase, member };
}

