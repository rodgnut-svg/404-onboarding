import { requireAgencyAdminForProject } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientCodeSettings } from "@/components/settings/client-code-settings";

interface SettingsPageProps {
  params: Promise<{ projectId: string }>;
}

/**
 * Project Settings Page
 * 
 * SECURITY: This page is ONLY accessible to agency_admin users.
 * Non-admin users (client_admin, client_member, agency_member) are automatically redirected.
 * 
 * Manual Test Checklist:
 * 1. agency_admin generates code -> can copy code
 * 2. Second email logs in -> joins with code -> can see project
 * 3. Second email cannot access settings/regenerate (redirects to dashboard)
 * 4. Regenerating code invalidates old code
 * 5. After regenerating, old code no longer works for new users
 */
export default async function SettingsPage({ params }: SettingsPageProps) {
  const { projectId } = await params;
  
  // SECURITY: requireAgencyAdminForProject will redirect non-admin users
  // This check happens BEFORE any data is fetched
  const { supabase } = await requireAgencyAdminForProject(projectId);

  // Get project details including client code status
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, client_code_hash, client_code_active, client_code_created_at, client_code_last_rotated_at")
    .eq("id", projectId)
    .single();

  if (!project) {
    redirect("/portal");
  }

  const hasClientCode = !!project.client_code_hash;
  const isActive = project.client_code_active ?? true;

  return (
    <div>
      <PageHeader
        title="Project Settings"
        description="Manage project settings and client codes"
      />

      <div className="max-w-2xl">
        <ClientCodeSettings
          projectId={projectId}
          hasClientCode={hasClientCode}
          isActive={isActive}
          createdAt={project.client_code_created_at}
          lastRotatedAt={project.client_code_last_rotated_at}
        />
      </div>
    </div>
  );
}
