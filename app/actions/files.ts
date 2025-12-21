"use server";

import { requireProjectMember } from "@/lib/auth";
import { createClientSupabase } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function uploadFile(
  projectId: string,
  file: File,
  kind: string
) {
  const { user, supabase } = await requireProjectMember(projectId);

  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${projectId}/${fileName}`;

  // Upload to storage (requires service role for storage operations)
  const serviceClient = createServiceRoleClient();
  const { error: uploadError } = await serviceClient.storage
    .from("project_uploads")
    .upload(filePath, file);

  if (uploadError) {
    return { error: uploadError.message };
  }

  // Create file record
  const { error: dbError } = await supabase.from("files").insert({
    project_id: projectId,
    uploader_id: user.id,
    storage_path: filePath,
    file_name: file.name,
    mime_type: file.type,
    size: file.size,
    kind,
  });

  if (dbError) {
    return { error: dbError.message };
  }

  return { success: true };
}

export async function getFiles(projectId: string) {
  const { supabase } = await requireProjectMember(projectId);

  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function getFileUrl(projectId: string, fileId: string) {
  const { supabase } = await requireProjectMember(projectId);

  const { data: file, error } = await supabase
    .from("files")
    .select("storage_path")
    .eq("id", fileId)
    .eq("project_id", projectId)
    .single();

  if (error || !file) {
    return { error: "File not found" };
  }

  const serviceClient = createServiceRoleClient();
  const { data: urlData } = serviceClient.storage
    .from("project_uploads")
    .createSignedUrl(file.storage_path, 3600);

  return { url: urlData?.signedUrl };
}

