"use server";

import { requireAgencyAdminForProject } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { uploadFile } from "./files";

/**
 * Upload a contract PDF for a project
 * Only agency admins can upload contracts
 */
export async function uploadContract(projectId: string, file: File) {
  // Verify user is agency admin for this project
  await requireAgencyAdminForProject(projectId);
  
  // Validate file is PDF
  if (file.type !== "application/pdf") {
    return { error: "Only PDF files are allowed for contracts" };
  }
  
  // Use existing uploadFile function with kind="contract"
  return await uploadFile(projectId, file, "contract");
}

/**
 * Get all contracts for a project
 * Project members can view contracts
 */
export async function getContracts(projectId: string) {
  const supabase = await createServerSupabase();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated", data: [] };
  }
  
  // Verify project membership (handled by RLS, but explicit check for clarity)
  const { data: member, error: memberError } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();
  
  if (memberError || !member) {
    return { error: "Access denied: You are not a member of this project", data: [] };
  }
  
  // Fetch files with kind="contract"
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("project_id", projectId)
    .eq("kind", "contract")
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("[getContracts] Error fetching contracts:", error);
    return { error: error.message, data: [] };
  }
  
  return { data: data || [] };
}
