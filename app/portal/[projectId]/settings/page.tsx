import { requireAgencyAdminForProject } from "@/lib/auth";
import { getAllAgencyProjects } from "@/app/actions/admin";
import { PageHeader } from "@/components/layout/page-header";
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
 * Shows all projects for the agency, allowing management of client codes.
 */
export default async function SettingsPage({ params }: SettingsPageProps) {
  const { projectId } = await params;
  
  // SECURITY: requireAgencyAdminForProject will redirect non-admin users
  // This check happens BEFORE any data is fetched
  await requireAgencyAdminForProject(projectId);

  // Get all projects for the agency
  const projects = await getAllAgencyProjects();

  return (
    <div>
      <PageHeader
        title="Project Settings"
        description="Manage projects and client codes"
      />

      <div className="max-w-6xl">
        <ClientCodeSettings projects={projects} />
      </div>
    </div>
  );
}
