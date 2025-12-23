"use server";

import { requireAgencyAdmin } from "@/lib/auth";
import { createServiceRoleClient, createServerSupabase } from "@/lib/supabase/server";

function generateClientCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createProject(formData: FormData) {
  await requireAgencyAdmin();

  const name = formData.get("name") as string;
  const agencyId = formData.get("agency_id") as string;

  if (!name || !agencyId) {
    return { error: "Name and agency ID are required" };
  }

  const supabase = createServiceRoleClient();

  // Generate unique client code
  let clientCode = generateClientCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("client_code", clientCode)
      .single();

    if (!existing) break;
    clientCode = generateClientCode();
    attempts++;
  }

  // Hash the client code
  const { data: codeHash, error: hashError } = await supabase.rpc("hash_client_code", {
    code: clientCode,
  });

  if (hashError || !codeHash) {
    return { error: "Failed to hash client code" };
  }

  // Create project with both plaintext code (for backward compatibility) and hash
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name,
      agency_id: agencyId,
      client_code: clientCode,
      client_code_hash: codeHash,
      client_code_active: true,
      client_code_created_at: new Date().toISOString(),
      status: "active",
    })
    .select()
    .single();

  if (projectError || !project) {
    return { error: projectError?.message || "Failed to create project" };
  }

  // Create default milestones
  const defaultMilestones = [
    { key: "sitemap", title: "Sitemap", sort: 1 },
    { key: "homepage_concept", title: "Homepage Concept", sort: 2 },
    { key: "full_build", title: "Full Build", sort: 3 },
    { key: "qa", title: "QA", sort: 4 },
    { key: "launch", title: "Launch", sort: 5 },
  ];

  await supabase.from("milestones").insert(
    defaultMilestones.map((m) => ({
      project_id: project.id,
      key: m.key,
      title: m.title,
      status: "not_started",
      sort: m.sort,
    }))
  );

  return { success: true, project, clientCode };
}

export async function bootstrapAgency(
  bootstrapSecret: string,
  agencyName: string,
  email: string
) {
  if (bootstrapSecret !== process.env.BOOTSTRAP_SECRET) {
    return { error: "Invalid bootstrap secret" };
  }

  const supabase = createServiceRoleClient();

  // Create agency
  const slug = agencyName.toLowerCase().replace(/\s+/g, "-");
  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .insert({
      name: agencyName,
      slug,
    })
    .select()
    .single();

  if (agencyError || !agency) {
    return { error: agencyError?.message || "Failed to create agency" };
  }

  // Find user by email
  const { data: user } = await supabase.auth.admin.listUsers();
  const targetUser = user?.users.find((u) => u.email === email);

  if (!targetUser) {
    return {
      error: "User not found. Please sign up first, then run bootstrap again.",
    };
  }

  // Create a personal admin project for the user
  const clientCode = generateClientCode();
  
  // Hash the client code
  const { data: codeHash, error: hashError } = await supabase.rpc("hash_client_code", {
    code: clientCode,
  });

  if (hashError || !codeHash) {
    return { error: "Failed to hash client code" };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: `${agencyName} - Admin Project`,
      agency_id: agency.id,
      client_code: clientCode,
      client_code_hash: codeHash,
      client_code_active: true,
      client_code_created_at: new Date().toISOString(),
      status: "active",
    })
    .select()
    .single();

  if (projectError || !project) {
    return { error: "Failed to create admin project" };
  }

  // Add user as agency_admin
  await supabase.from("project_members").insert({
    project_id: project.id,
    user_id: targetUser.id,
    role: "agency_admin",
  });

  return { success: true, agencyId: agency.id };
}

/**
 * Create a new project with a generated client code
 * Only accessible by agency admins
 */
export async function createProjectWithClientCode(
  label: string,
  clientName?: string,
  clientEmail?: string,
  notes?: string
): Promise<{ code: string; projectId: string } | { error: string }> {
  await requireAgencyAdmin();
  
  // Use regular client to verify user and get agency_id (respects RLS for reads)
  const supabase = await createServerSupabase();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  // Get user's agency_id from their existing project membership
  const { data: members } = await supabase
    .from("project_members")
    .select("project_id, projects(agency_id)")
    .eq("user_id", user.id)
    .eq("role", "agency_admin")
    .limit(1)
    .single();

  const agencyId = (members as any)?.projects?.agency_id;

  if (!agencyId) {
    return { error: "Agency not found. Please ensure you are an agency admin." };
  }

  // Determine project name: label > clientName > default
  const projectName = label.trim() || clientName?.trim() || "New Project";

  // Use service role client for INSERT operations (bypasses RLS)
  // This is necessary because projects table has no INSERT policy
  const serviceSupabase = createServiceRoleClient();

  // Generate unique client code
  let clientCode = generateClientCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await serviceSupabase
      .from("projects")
      .select("id")
      .eq("client_code", clientCode)
      .maybeSingle();

    if (!existing) break;
    clientCode = generateClientCode();
    attempts++;
  }

  // Hash the client code
  const { data: codeHash, error: hashError } = await serviceSupabase.rpc("hash_client_code", {
    code: clientCode,
  });

  if (hashError || !codeHash) {
    return { error: "Failed to hash client code" };
  }

  // Create project with code and hash (using service role to bypass RLS)
  const { data: project, error: projectError } = await serviceSupabase
    .from("projects")
    .insert({
      name: projectName,
      agency_id: agencyId,
      client_code: clientCode, // For backward compatibility
      client_code_hash: codeHash,
      client_code_active: true,
      client_code_created_at: new Date().toISOString(),
      status: "active",
    })
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("[createProjectWithClientCode] Error creating project:", projectError);
    return { error: projectError?.message || "Failed to create project" };
  }

  // Create default milestones
  const defaultMilestones = [
    { key: "sitemap", title: "Sitemap", sort: 1 },
    { key: "homepage_concept", title: "Homepage Concept", sort: 2 },
    { key: "full_build", title: "Full Build", sort: 3 },
    { key: "qa", title: "QA", sort: 4 },
    { key: "launch", title: "Launch", sort: 5 },
  ];

  await serviceSupabase.from("milestones").insert(
    defaultMilestones.map((m) => ({
      project_id: project.id,
      key: m.key,
      title: m.title,
      status: "not_started",
      sort: m.sort,
    }))
  );

  // Add agency_admin as project member (using service role)
  await serviceSupabase.from("project_members").insert({
    project_id: project.id,
    user_id: user.id,
    role: "agency_admin",
  });

  return { code: clientCode, projectId: project.id };
}

/**
 * Get all projects for the agency
 * Only accessible by agency admins
 */
export async function getAllAgencyProjects() {
  await requireAgencyAdmin();
  
  const supabase = await createServerSupabase();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Get user's agency_id from their existing project membership
  const { data: members } = await supabase
    .from("project_members")
    .select("project_id, projects(agency_id)")
    .eq("user_id", user.id)
    .eq("role", "agency_admin")
    .limit(1)
    .single();

  const agencyId = (members as any)?.projects?.agency_id;

  if (!agencyId) {
    return [];
  }

  // Get all projects for this agency
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, client_code, client_code_hash, client_code_active, status, created_at")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (projectsError) {
    console.error("[getAllAgencyProjects] Error fetching projects:", projectsError);
    return [];
  }

  return projects || [];
}

/**
 * Regenerate the client code for a project
 * Only accessible by agency admins for that project
 */
export async function regenerateProjectCode(projectId: string): Promise<{ code: string } | { error: string }> {
  await requireAgencyAdmin();
  
  // Use regular client to verify permissions (respects RLS)
  const supabase = await createServerSupabase();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  // Verify user is agency_admin for this project
  const { data: member, error: memberError } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .eq("role", "agency_admin")
    .single();

  if (memberError || !member) {
    return { error: "Permission denied: must be agency_admin" };
  }

  // Use service role client for UPDATE operation (bypasses RLS)
  // This is necessary because projects table may not have UPDATE policy
  const serviceSupabase = createServiceRoleClient();

  // Generate new unique client code
  let clientCode = generateClientCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await serviceSupabase
      .from("projects")
      .select("id")
      .eq("client_code", clientCode)
      .neq("id", projectId)
      .maybeSingle();

    if (!existing) break;
    clientCode = generateClientCode();
    attempts++;
  }

  // Hash the new code
  const { data: codeHash, error: hashError } = await serviceSupabase.rpc("hash_client_code", {
    code: clientCode,
  });

  if (hashError || !codeHash) {
    return { error: "Failed to hash client code" };
  }

  // Update project with new code and hash (using service role to bypass RLS)
  const { error: updateError } = await serviceSupabase
    .from("projects")
    .update({
      client_code: clientCode,
      client_code_hash: codeHash,
      client_code_created_at: new Date().toISOString(),
      client_code_active: true,
    })
    .eq("id", projectId);

  if (updateError) {
    console.error("[regenerateProjectCode] Error updating project:", updateError);
    return { error: updateError.message || "Failed to regenerate code" };
  }

  return { code: clientCode };
}

export interface AgencyClient {
  client_id: string;
  full_name: string | null;
  email: string;
  project_id: string;
  project_name: string;
  onboarding_completed_steps: number;
  onboarding_current_step: number | null;
  file_count: number;
}

const ONBOARDING_STEPS = [
  { number: 1, title: "Project Basics" },
  { number: 2, title: "Brand & Style" },
  { number: 3, title: "Content" },
  { number: 4, title: "Access & Integrations" },
  { number: 5, title: "Approvals & Kickoff" },
];

/**
 * Get all clients across all agency projects with onboarding progress and file counts
 * Only accessible by agency admins
 */
export async function getAllAgencyClients(agencyId: string): Promise<AgencyClient[]> {
  await requireAgencyAdmin();
  
  const supabase = await createServerSupabase();

  // Get all projects for this agency
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name")
    .eq("agency_id", agencyId);

  if (projectsError || !projects) {
    console.error("[getAllAgencyClients] Error fetching projects:", projectsError);
    return [];
  }

  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) {
    return [];
  }

  // Get all client members (client_admin, client_member) across all agency projects
  const { data: clientMembers, error: membersError } = await supabase
    .from("project_members")
    .select("user_id, project_id, role")
    .in("project_id", projectIds)
    .in("role", ["client_admin", "client_member"]);

  if (membersError || !clientMembers) {
    console.error("[getAllAgencyClients] Error fetching client members:", membersError);
    return [];
  }

  // Get unique user IDs
  const userIds = [...new Set(clientMembers.map((m) => m.user_id))];

  // Get profiles for all clients
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (profilesError || !profiles) {
    console.error("[getAllAgencyClients] Error fetching profiles:", profilesError);
    return [];
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Get onboarding submissions for all projects
  const { data: submissions, error: submissionsError } = await supabase
    .from("onboarding_submissions")
    .select("project_id, step, is_complete")
    .in("project_id", projectIds);

  if (submissionsError) {
    console.error("[getAllAgencyClients] Error fetching submissions:", submissionsError);
  }

  // Group submissions by project_id
  const submissionsByProject = new Map<string, any[]>();
  (submissions || []).forEach((sub: any) => {
    if (!submissionsByProject.has(sub.project_id)) {
      submissionsByProject.set(sub.project_id, []);
    }
    submissionsByProject.get(sub.project_id)!.push(sub);
  });

  // Get file counts for all clients
  const { data: files, error: filesError } = await supabase
    .from("files")
    .select("uploader_id")
    .in("project_id", projectIds)
    .in("uploader_id", userIds);

  if (filesError) {
    console.error("[getAllAgencyClients] Error fetching files:", filesError);
  }

  // Count files per user
  const fileCountByUser = new Map<string, number>();
  (files || []).forEach((file: any) => {
    const current = fileCountByUser.get(file.uploader_id) || 0;
    fileCountByUser.set(file.uploader_id, current + 1);
  });

  // Build result array
  const clients: AgencyClient[] = [];

  for (const member of clientMembers) {
    const profile = profileMap.get(member.user_id);
    if (!profile) continue;

    const project = projects.find((p) => p.id === member.project_id);
    if (!project) continue;

    // Calculate onboarding progress for this project
    const projectSubmissions = submissionsByProject.get(member.project_id) || [];
    const completedSteps = projectSubmissions.filter((s: any) => s.is_complete).length;
    
    // Find highest incomplete step (or null if all complete)
    let currentStep: number | null = null;
    for (let i = 1; i <= 5; i++) {
      const submission = projectSubmissions.find((s: any) => s.step === i);
      if (!submission || !submission.is_complete) {
        currentStep = i;
        break;
      }
    }

    const fileCount = fileCountByUser.get(member.user_id) || 0;

    clients.push({
      client_id: member.user_id,
      full_name: profile.full_name,
      email: profile.email,
      project_id: member.project_id,
      project_name: project.name,
      onboarding_completed_steps: completedSteps,
      onboarding_current_step: currentStep,
      file_count: fileCount,
    });
  }

  return clients;
}

export interface ClientDetails {
  client: {
    id: string;
    full_name: string | null;
    email: string;
  };
  project: {
    id: string;
    name: string;
  };
  onboarding: Array<{
    step: number;
    title: string;
    data: any;
    is_complete: boolean;
    updated_at: string;
  }>;
  tickets: Array<{
    id: string;
    title: string;
    description: string;
    status: "open" | "in_progress" | "resolved";
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
  }>;
  files: Array<{
    id: string;
    file_name: string;
    size: number;
    mime_type: string | null;
    created_at: string;
    uploader_id: string;
  }>;
}

/**
 * Get detailed information about a specific client
 * Only accessible by agency admins
 */
export async function getClientDetails(clientId: string, projectId: string): Promise<ClientDetails | { error: string }> {
  await requireAgencyAdmin();
  
  const supabase = await createServerSupabase();

  // Verify the client is a member of the project
  const { data: clientMember, error: memberError } = await supabase
    .from("project_members")
    .select("project_id, role")
    .eq("project_id", projectId)
    .eq("user_id", clientId)
    .in("role", ["client_admin", "client_member"])
    .single();

  if (memberError || !clientMember) {
    return { error: "Client not found in project" };
  }

  // Get client profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", clientId)
    .single();

  if (profileError || !profile) {
    return { error: "Client profile not found" };
  }

  // Get project info
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return { error: "Project not found" };
  }

  // Get all onboarding submissions for the project
  const { data: submissions, error: submissionsError } = await supabase
    .from("onboarding_submissions")
    .select("step, data, is_complete, updated_at")
    .eq("project_id", projectId)
    .order("step", { ascending: true });

  if (submissionsError) {
    console.error("[getClientDetails] Error fetching submissions:", submissionsError);
    return { error: "Failed to fetch onboarding data" };
  }

  // Map onboarding submissions with step titles
  const onboardingSteps = ONBOARDING_STEPS.map((stepDef) => {
    const submission = (submissions || []).find((s: any) => s.step === stepDef.number);
    return {
      step: stepDef.number,
      title: stepDef.title,
      data: submission?.data || null,
      is_complete: submission?.is_complete || false,
      updated_at: submission?.updated_at || "",
    };
  });

  // Get all tickets created by the client
  const { data: tickets, error: ticketsError } = await supabase
    .from("tickets")
    .select("id, title, description, status, created_at, updated_at, resolved_at")
    .eq("project_id", projectId)
    .eq("created_by", clientId)
    .order("created_at", { ascending: false });

  if (ticketsError) {
    console.error("[getClientDetails] Error fetching tickets:", ticketsError);
    return { error: "Failed to fetch tickets" };
  }

  // Get all files uploaded by the client
  const { data: files, error: filesError } = await supabase
    .from("files")
    .select("id, file_name, size, mime_type, created_at, uploader_id")
    .eq("project_id", projectId)
    .eq("uploader_id", clientId)
    .order("created_at", { ascending: false });

  if (filesError) {
    console.error("[getClientDetails] Error fetching files:", filesError);
    return { error: "Failed to fetch files" };
  }

  return {
    client: {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
    },
    project: {
      id: project.id,
      name: project.name,
    },
    onboarding: onboardingSteps,
    tickets: (tickets || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      created_at: t.created_at,
      updated_at: t.updated_at,
      resolved_at: t.resolved_at,
    })),
    files: (files || []).map((f: any) => ({
      id: f.id,
      file_name: f.file_name,
      size: f.size,
      mime_type: f.mime_type,
      created_at: f.created_at,
      uploader_id: f.uploader_id,
    })),
  };
}

