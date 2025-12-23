"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

/**
 * Sanitizes a filename by removing/replacing unsafe characters.
 * Keeps alphanumeric, dots, hyphens, underscores. Replaces spaces and other chars with hyphens.
 */
function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "-") // Replace unsafe chars with hyphen
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

export async function uploadFile(
  projectId: string,
  file: File,
  kind: string
) {
  const supabase = await createServerSupabase();
  
  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated on server (auth cookie missing)");
  }

  // Sanitize original filename and preserve extension
  const originalName = file.name;
  const fileExt = originalName.split(".").pop() || "";
  const baseName = originalName.substring(0, originalName.lastIndexOf(".")) || originalName;
  const safeBaseName = sanitizeFilename(baseName);
  const safeFilename = fileExt ? `${safeBaseName}.${fileExt}` : safeBaseName;

  // Build storage path: ${projectId}/${uploaderId}/${uuid}-${safeFilename}
  // This encodes uploader ID into the path for better security and organization
  const fileId = randomUUID();
  const storagePath = `${projectId}/${user.id}/${fileId}-${safeFilename}`;

  // Upload to storage using authenticated client
  const { error: uploadError } = await supabase.storage
    .from("project_uploads")
    .upload(storagePath, file);

  if (uploadError) {
    return { error: uploadError.message };
  }

  // Create file record with exact storage_path used in storage
  const { error: dbError } = await supabase.from("files").insert({
    project_id: projectId,
    uploader_id: user.id, // Store uploader ID for permission checks
    storage_path: storagePath, // Store exact path used in storage
    file_name: originalName, // Store original filename for display
    mime_type: file.type,
    size: file.size,
    kind,
  });

  if (dbError) {
    // If DB insert fails, try to clean up storage
    await supabase.storage.from("project_uploads").remove([storagePath]);
    return { error: dbError.message };
  }

  return { success: true };
}

export async function getFiles(projectId: string) {
  const supabase = await createServerSupabase();
  
  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated on server (auth cookie missing)");
  }

  // SECURITY: Verify user is a member of this project before fetching files
  const { data: membership, error: membershipError } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    throw new Error("Access denied: You are not a member of this project");
  }

  // Now fetch files - RLS will also enforce, but we've added an explicit check
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("project_id", projectId)  // Explicit filter by project_id
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function getSignedDownloadUrl(projectId: string, fileId: string) {
  const supabase = await createServerSupabase();
  
  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated on server (auth cookie missing)");
  }

  // Get file metadata (includes storage_path which may be legacy or new format)
  const { data: file, error } = await supabase
    .from("files")
    .select("storage_path")
    .eq("id", fileId)
    .eq("project_id", projectId)
    .single();

  if (error || !file) {
    return { error: "File not found" };
  }

  // Generate signed URL using stored storage_path (works for both legacy and new paths)
  const { data: urlData, error: urlError } = await supabase.storage
    .from("project_uploads")
    .createSignedUrl(file.storage_path, 60); // 60 seconds expiry

  if (urlError || !urlData) {
    return { error: urlError?.message || "Failed to generate download URL" };
  }

  return { url: urlData.signedUrl };
}

export async function getCurrentUserRole(projectId: string) {
  const supabase = await createServerSupabase();
  
  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated on server (auth cookie missing)");
  }

  const { data: member, error: memberError } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !member) {
    throw new Error("User is not a project member");
  }

  return { role: member.role, userId: user.id };
}

/**
 * DELETE FILE SERVER ACTION
 * 
 * Supabase Dashboard Checklist (verify these policies exist):
 * 
 * 1. files table DELETE policy:
 *    - Policy name: "Agency admins and uploaders can delete files"
 *    - Should allow DELETE if:
 *      a) User is agency_admin in project_members for the file's project_id
 *      b) OR user.id === files.uploader_id
 * 
 * 2. storage.objects DELETE policy (bucket: project_uploads):
 *    - Should allow DELETE if user is agency_admin OR user is the uploader
 *    - Should check file.storage_path matches the object name
 *    - See migration file 002_add_file_delete_policies.sql for recommended policy SQL
 */
export async function deleteFile(projectId: string, fileId: string) {
  console.log("[deleteFile] Starting delete for fileId:", fileId);

  // Step 1: Create authenticated server client (reads cookies)
  const supabase = await createServerSupabase();

  // Step 2: Get authenticated user - CRITICAL for RLS
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log("[deleteFile] Auth error - no user:", authError);
    throw new Error("Not authenticated on server (auth cookie missing)");
  }

  const serverUserId = user.id;
  console.log("[deleteFile] serverUserId from getUser():", serverUserId);
  console.log("[deleteFile] user.email:", user.email);

  // Step 3: Fetch file row by id
  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("id, project_id, uploader_id, storage_path")
    .eq("id", fileId)
    .single();

  if (fileError || !file) {
    console.log("[deleteFile] File fetch error:", fileError);
    throw new Error("File not found");
  }

  console.log("[deleteFile] Fetched file:");
  console.log("  - id:", file.id);
  console.log("  - project_id:", file.project_id);
  console.log("  - uploader_id:", file.uploader_id);
  console.log("  - storage_path:", file.storage_path);

  // Verify file belongs to the project
  if (file.project_id !== projectId) {
    console.log("[deleteFile] Project ID mismatch:", file.project_id, "!=", projectId);
    throw new Error("File not found");
  }

  // Step 4: Check permission - user is uploader OR user is agency_admin
  const isUploader = file.uploader_id === serverUserId;
  console.log("[deleteFile] Permission check:");
  console.log("  - isUploader (file.uploader_id === serverUserId):", isUploader);
  console.log("  - file.uploader_id:", file.uploader_id);
  console.log("  - serverUserId:", serverUserId);

  // Check if user is agency_admin for this project
  const { data: member, error: memberError } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", file.project_id)
    .eq("user_id", serverUserId)
    .eq("role", "agency_admin")
    .maybeSingle();

  const isAgencyAdmin = !!member && member.role === "agency_admin";
  console.log("  - isAgencyAdmin:", isAgencyAdmin);
  console.log("  - member query result:", member);

  if (!isUploader && !isAgencyAdmin) {
    console.log("[deleteFile] Permission denied - not uploader or agency_admin");
    throw new Error("Permission denied");
  }

  // Step 5: Delete from storage first (using exact storage_path as stored)
  const { error: storageError } = await supabase.storage
    .from("project_uploads")
    .remove([file.storage_path]);

  if (storageError) {
    console.log("[deleteFile] Storage delete error:", storageError);
    throw new Error(`Storage delete failed: ${storageError.message}`);
  }

  console.log("[deleteFile] Storage delete successful");

  // Step 6: Delete DB row and verify it actually deleted
  const { data: deleted, error: dbError } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId)
    .select("id");

  console.log("[deleteFile] DB delete result:");
  console.log("  - deleted rows:", deleted);
  console.log("  - deleted count:", deleted?.length || 0);
  console.log("  - error:", dbError);

  if (dbError) {
    console.log("[deleteFile] DB delete error:", dbError);
    throw new Error(`DB delete failed: ${dbError.message}`);
  }

  if (!deleted || deleted.length === 0) {
    console.log("[deleteFile] ❌ DB delete affected 0 rows - RLS mismatch!");
    console.log("[deleteFile] Debug info:");
    console.log("  - serverUserId:", serverUserId);
    console.log("  - file.uploader_id:", file.uploader_id);
    console.log("  - isUploader:", isUploader);
    console.log("  - isAgencyAdmin:", isAgencyAdmin);
    console.log("  - project_id:", file.project_id);
    throw new Error(
      "DB delete affected 0 rows (RLS mismatch or wrong id). Check that RLS policies allow DELETE for this user."
    );
  }

  console.log("[deleteFile] ✅ DB delete successful, deleted id:", deleted[0].id);

  // Step 7: Return success only after DB row is removed
  return { ok: true };
}

