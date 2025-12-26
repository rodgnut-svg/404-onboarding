"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
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

/**
 * Validates a client code before authentication (pre-auth validation).
 * Uses service role to check if code exists and is active in client_codes table.
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
  const { data: codeHash, error: hashError } = await supabase.rpc("hash_client_code", {
    code: normalizedCode,
  });

  if (hashError || !codeHash) {
    console.error("[validateClientCodePreAuth] Hash error:", hashError);
    return { success: false, error: "Failed to validate code" };
  }

  // Check client_codes table first (new system)
  const { data: clientCode, error: codeCheckError } = await supabase
    .from("client_codes")
    .select("project_id")
    .eq("code_hash", codeHash)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  // If not found, check old projects table for backward compatibility
  let projectId: string | null = null;
  if (!clientCode && !codeCheckError) {
    const { data: projectByHash } = await supabase
      .from("projects")
      .select("id")
      .eq("client_code_hash", codeHash)
      .eq("client_code_active", true)
      .maybeSingle();

    if (!projectByHash) {
      const { data: projectByCode } = await supabase
        .from("projects")
        .select("id")
        .eq("client_code", normalizedCode)
        .maybeSingle();
      
      if (projectByCode) {
        projectId = projectByCode.id;
      }
    } else {
      projectId = projectByHash.id;
    }
  } else if (clientCode) {
    projectId = clientCode.project_id;
  }

  if (!projectId) {
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
 * Creates a new project with a client code.
 * Only agency_admin can call this.
 * Returns the plaintext code once (must be copied immediately) and the projectId.
 */
export async function createClientCode(
  label: string,
  clientName?: string,
  clientEmail?: string,
  notes?: string
): Promise<{ code: string; projectId: string }> {
  const { createProjectWithClientCode } = await import("./admin");
  
  const result = await createProjectWithClientCode(
    label,
    clientName,
    clientEmail,
    notes
  );

  if ("error" in result) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Gets all client codes for a project.
 * Only agency_admin can call this.
 */
export async function getClientCodes(projectId: string) {
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

  // Call RPC function
  const { data: codes, error } = await supabase.rpc("get_project_client_codes", {
    p_project_id: projectId,
  });

  if (error) {
    console.error("[getClientCodes] RPC error:", error);
    throw new Error(error.message || "Failed to fetch client codes");
  }

  return { codes: codes || [] };
}

/**
 * Updates a client code's details.
 * Only agency_admin can call this.
 */
export async function updateClientCode(
  codeId: string,
  label?: string,
  clientName?: string,
  clientEmail?: string,
  notes?: string
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

  // Call RPC function (it will verify permissions)
  // Pass empty string to clear a field, or undefined/null to leave unchanged
  const { error } = await supabase.rpc("update_client_code_details", {
    p_code_id: codeId,
    p_label: label !== undefined ? (label || '') : null,
    p_client_name: clientName !== undefined ? (clientName || '') : null,
    p_client_email: clientEmail !== undefined ? (clientEmail || '') : null,
    p_notes: notes !== undefined ? (notes || '') : null,
  });

  if (error) {
    console.error("[updateClientCode] RPC error:", error);
    throw new Error(error.message || "Failed to update client code");
  }

  return { success: true };
}

/**
 * Deletes (soft deletes) a client code.
 * Only agency_admin can call this.
 */
export async function deleteClientCode(codeId: string): Promise<{ success: boolean }> {
  const supabase = await createServerSupabase();
  
  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Call RPC function (it will verify permissions)
  const { error } = await supabase.rpc("delete_client_code", {
    p_code_id: codeId,
  });

  if (error) {
    console.error("[deleteClientCode] RPC error:", error);
    throw new Error(error.message || "Failed to delete client code");
  }

  return { success: true };
}

/**
 * Regenerates a specific client code.
 * Only agency_admin can call this.
 * Returns the plaintext code once (must be copied immediately).
 */
export async function regenerateClientCode(codeId: string): Promise<{ code: string }> {
  const supabase = await createServerSupabase();
  
  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Call RPC function (it will verify permissions internally)
  const { data: code, error } = await supabase.rpc("regenerate_client_code", {
    p_code_id: codeId,
  });

  if (error) {
    console.error("[regenerateClientCode] RPC error:", error);
    throw new Error(error.message || "Failed to regenerate client code");
  }

  if (!code) {
    throw new Error("No code returned from server");
  }

  return { code };
}

/**
 * Toggles the active status of a client code.
 * Only agency_admin can call this.
 */
export async function toggleClientCodeActive(
  codeId: string,
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

  // Call RPC function (it will verify permissions)
  const { error } = await supabase.rpc("toggle_client_code_status", {
    p_code_id: codeId,
    p_is_active: active,
  });

  if (error) {
    console.error("[toggleClientCodeActive] RPC error:", error);
    throw new Error(error.message || "Failed to update client code status");
  }

  return { success: true };
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

  // Check if user is an admin
  const userEmail = user.email;
  const isAdmin = isAdminEmail(userEmail);

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

  // If user is an admin, update their role to agency_admin
  if (isAdmin) {
    const serviceSupabase = createServiceRoleClient();
    
    // Check current role
    const { data: member } = await serviceSupabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();

    // Update to agency_admin if not already
    if (member && member.role !== "agency_admin") {
      await serviceSupabase
        .from("project_members")
        .update({ role: "agency_admin" })
        .eq("project_id", projectId)
        .eq("user_id", user.id);
      
      console.log("[acceptClientCode] Updated user role to agency_admin for admin:", userEmail);
    } else if (!member) {
      // If somehow no member record exists, create one with agency_admin role
      await serviceSupabase.from("project_members").insert({
        project_id: projectId,
        user_id: user.id,
        role: "agency_admin",
      });
      console.log("[acceptClientCode] Created agency_admin membership for admin:", userEmail);
    }
  }

  // Set active project cookie to restrict user to this project
  const cookieStore = await cookies();
  cookieStore.set("active_project_id", projectId.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  console.log("[acceptClientCode] Success! Joined project:", projectId);
  console.log("[acceptClientCode] Set active_project_id cookie to:", projectId.toString());
  return { projectId: projectId.toString() };
}

/**
 * @deprecated Use toggleClientCodeActive(codeId, active) instead
 * Kept for backward compatibility
 */
export async function toggleClientCodeStatus(
  projectId: string,
  active: boolean
): Promise<{ success: boolean }> {
  // This function is deprecated but kept for backward compatibility
  // It's not used in the new multi-code system
  const supabase = await createServerSupabase();
  
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

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

  const { error: updateError } = await supabase
    .from("projects")
    .update({ client_code_active: active })
    .eq("id", projectId);

  if (updateError) {
    throw new Error("Failed to update client code status");
  }

  return { success: true };
}
