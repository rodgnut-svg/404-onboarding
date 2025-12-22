"use server";

import { requireAgencyAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

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

