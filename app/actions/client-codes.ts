"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * Validates a client code before authentication (pre-auth validation).
 * Uses service role to check if code exists and is active.
 * Stores the code in a cookie for later use after authentication.
 */
export async function validateClientCodePreAuth(code: string): Promise<{ success: boolean; error?: string }> {
  // Normalize code (trim and uppercase)
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode || normalizedCode.length < 8) {
    return { success: false, error: "Invalid client code format" };
  }

  const supabase = createServiceRoleClient();

  // Hash the code using the database function
  // Note: hash_client_code is a SQL function, call it via RPC
  const { data: codeHash, error: hashError } = await supabase.rpc("hash_client_code", {
    code: normalizedCode,
  });

  if (hashError || !codeHash) {
    console.error("[validateClientCodePreAuth] Hash error:", hashError);
    return { success: false, error: "Failed to validate code" };
  }

  // Check if a project exists with this hash and is active
  // Also check plaintext code for backward compatibility (projects created before migration)
  const { data: projectByHash, error: hashCheckError } = await supabase
    .from("projects")
    .select("id")
    .eq("client_code_hash", codeHash)
    .eq("client_code_active", true)
    .maybeSingle();

  // If not found by hash, try plaintext code (backward compatibility)
  let project = projectByHash;
  if (!project && !hashCheckError) {
    const { data: projectByCode, error: codeCheckError } = await supabase
      .from("projects")
      .select("id")
      .eq("client_code", normalizedCode)
      .maybeSingle();
    
    if (!codeCheckError && projectByCode) {
      project = projectByCode;
      // Auto-migrate: set the hash for this project so future lookups work
      await supabase
        .from("projects")
        .update({
          client_code_hash: codeHash,
          client_code_active: true,
          client_code_created_at: new Date().toISOString(),
        })
        .eq("id", project.id);
    }
  }

  if (!project) {
    return { success: false, error: "Invalid client code" };
  }

  // Store the plaintext code in a cookie for later use
  const cookieStore = await cookies();
  cookieStore.set("pending_client_code", normalizedCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  });

  return { success: true };
}

/**
 * Regenerates a client code for a project.
 * Only agency_admin can call this.
 * Returns the plaintext code once (must be copied immediately).
 */
export async function regenerateClientCode(projectId: string): Promise<{ code: string }> {
  const supabase = await createServerSupabase();
  
  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // SECURITY: Explicitly verify user is agency_admin for this project
  const { data: member, error: memberError } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .eq("role", "agency_admin")
    .single();

  if (memberError || !member) {
    throw new Error("Permission denied: must be agency_admin");
  }

  // Call RPC function (which also checks permissions, but we do it here for defense-in-depth)
  console.log("[regenerateClientCode] Calling RPC with projectId:", projectId);
  console.log("[regenerateClientCode] User ID:", user.id);
  
  const { data: code, error } = await supabase.rpc("regenerate_project_client_code", {
    p_project_id: projectId,
  });

  console.log("[regenerateClientCode] RPC response - code:", code, "error:", error);

  if (error) {
    console.error("[regenerateClientCode] RPC error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(error.message || "Failed to regenerate client code");
  }

  if (!code) {
    console.error("[regenerateClientCode] No code returned from RPC");
    throw new Error("No code returned from server");
  }

  return { code };
}

/**
 * Accepts a client code and joins the project.
 * Returns the project ID.
 * Idempotent - can be called multiple times safely.
 */
export async function acceptClientCode(code: string): Promise<{ projectId: string }> {
  console.log("[acceptClientCode] Starting with code:", code);
  const supabase = await createServerSupabase();
  
  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("[acceptClientCode] Auth check - user:", user?.id, "error:", authError);

  if (authError || !user) {
    console.error("[acceptClientCode] Authentication failed:", authError);
    throw new Error("Not authenticated. Please sign in first.");
  }

  // Normalize code (trim and uppercase)
  const normalizedCode = code.trim().toUpperCase();
  console.log("[acceptClientCode] Normalized code:", normalizedCode);

  if (!normalizedCode || normalizedCode.length < 8) {
    console.error("[acceptClientCode] Code validation failed - length:", normalizedCode.length);
    throw new Error("Invalid client code format");
  }

  // Call RPC function
  console.log("[acceptClientCode] Calling RPC function with code:", normalizedCode);
  const { data: projectId, error } = await supabase.rpc("accept_project_client_code", {
    p_code: normalizedCode,
  });

  console.log("[acceptClientCode] RPC response - projectId:", projectId, "error:", error);

  if (error) {
    console.error("[acceptClientCode] RPC error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    // Provide more specific error messages
    if (error.message?.includes("Invalid client code")) {
      throw new Error("Invalid client code. Please check the code and try again.");
    }
    throw new Error(error.message || "Invalid client code");
  }

  if (!projectId) {
    console.error("[acceptClientCode] No projectId returned from RPC");
    throw new Error("Failed to join project. The code may be invalid or expired.");
  }

  console.log("[acceptClientCode] Success! Joined project:", projectId);
  return { projectId: projectId.toString() };
}

/**
 * Toggles client code active status for a project.
 * Only agency_admin can call this.
 */
export async function toggleClientCodeStatus(
  projectId: string,
  active: boolean
): Promise<{ success: boolean }> {
  const supabase = await createServerSupabase();
  
  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Verify user is agency_admin
  const { data: member, error: memberError } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .eq("role", "agency_admin")
    .single();

  if (memberError || !member) {
    throw new Error("Permission denied: must be agency_admin");
  }

  // Update client_code_active
  const { error: updateError } = await supabase
    .from("projects")
    .update({ client_code_active: active })
    .eq("id", projectId);

  if (updateError) {
    console.error("[toggleClientCodeStatus] Update error:", updateError);
    throw new Error("Failed to update client code status");
  }

  return { success: true };
}
