"use server";

import { requireUser } from "@/lib/auth";
import { createClientSupabase } from "@/lib/supabase/server";

export async function saveOnboardingStep(
  projectId: string,
  step: number,
  data: Record<string, any>
) {
  const { user, supabase } = await requireUser();

  // Verify user is project member
  const { data: member } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("onboarding_submissions")
    .upsert({
      project_id: projectId,
      step,
      data,
      is_complete: false,
    }, {
      onConflict: "project_id,step",
    });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function markStepComplete(projectId: string, step: number) {
  const { user, supabase } = await requireUser();

  const { data: member } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("onboarding_submissions")
    .update({ is_complete: true })
    .eq("project_id", projectId)
    .eq("step", step);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getOnboardingStep(projectId: string, step: number) {
  const { user, supabase } = await requireUser();

  const { data: member } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return { error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("onboarding_submissions")
    .select("*")
    .eq("project_id", projectId)
    .eq("step", step)
    .single();

  if (error && error.code !== "PGRST116") {
    return { error: error.message };
  }

  return { data: data || null };
}

export async function getAllOnboardingSteps(projectId: string) {
  const { user, supabase } = await requireUser();

  const { data: member } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return { error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("onboarding_submissions")
    .select("*")
    .eq("project_id", projectId)
    .order("step", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

