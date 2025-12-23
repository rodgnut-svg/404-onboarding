import { requireProjectMember } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { ClientsView } from "@/components/admin/clients-view";
import { UserUploadsView } from "@/components/uploads/user-uploads-view";
import { getAllAgencyClients } from "@/app/actions/admin";
import { PageHeader } from "@/components/layout/page-header";

interface UploadsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function UploadsPage({ params }: UploadsPageProps) {
  const { projectId } = await params;
  const { user, supabase, member } = await requireProjectMember(projectId);

  const isAgencyAdmin = member?.role === "agency_admin";

  // If agency admin, show clients view
  if (isAgencyAdmin) {
    // Get user's agency ID (similar to admin page)
    const { data: members } = await supabase
      .from("project_members")
      .select("project_id, projects(agency_id)")
      .eq("user_id", user.id)
      .eq("role", "agency_admin")
      .limit(1)
      .single();

    const agencyId = (members as any)?.projects?.agency_id;

    if (!agencyId) {
      return (
        <div>
          <PageHeader
            title="Clients"
            description="View all clients across your agency projects"
          />
          <div className="text-center py-12">
            <p className="text-muted">No agency found</p>
          </div>
        </div>
      );
    }

    const clients = await getAllAgencyClients(agencyId);
    return <ClientsView clients={clients} />;
  }

  // Regular user: show uploads view
  return <UserUploadsView projectId={projectId} />;
}
