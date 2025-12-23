"use server";

import { requireAgencyAdminForProject } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireProjectMember } from "@/lib/auth";

export interface WebsiteUrl {
  id: string;
  project_id: string;
  url: string;
  label: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Add a website URL for a project
 * Only agency admins can add URLs
 */
export async function addWebsiteUrl(projectId: string, url: string, label?: string) {
  await requireAgencyAdminForProject(projectId);
  
  // Validate URL format
  try {
    new URL(url);
  } catch {
    return { error: "Invalid URL format" };
  }
  
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from("project_website_urls")
    .insert({
      project_id: projectId,
      url: url.trim(),
      label: label?.trim() || null,
      created_by: user?.id || null,
    })
    .select()
    .single();
  
  if (error) {
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Get all website URLs for a project
 * Project members can view URLs
 */
export async function getWebsiteUrls(projectId: string) {
  const { supabase } = await requireProjectMember(projectId);
  
  const { data, error } = await supabase
    .from("project_website_urls")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  
  if (error) {
    return { error: error.message, data: [] };
  }
  
  return { data: data || [] };
}

/**
 * Delete a website URL
 * Only agency admins can delete URLs
 */
export async function deleteWebsiteUrl(projectId: string, urlId: string) {
  await requireAgencyAdminForProject(projectId);
  
  const supabase = await createServerSupabase();
  
  const { error } = await supabase
    .from("project_website_urls")
    .delete()
    .eq("id", urlId)
    .eq("project_id", projectId);
  
  if (error) {
    return { error: error.message };
  }
  
  return { success: true };
}
