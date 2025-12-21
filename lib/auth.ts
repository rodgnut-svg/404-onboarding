import { createClientSupabase } from "./supabase/server";
import { redirect } from "next/navigation";

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

