import { requireAgencyAdmin } from "@/lib/auth";
import { createClientSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProjectForm } from "@/components/admin/create-project-form";
import { ProjectList } from "@/components/admin/project-list";

export default async function AdminPage() {
  await requireAgencyAdmin();

  const { user, supabase } = await requireAgencyAdmin();

  // Get user's agency
  const { data: members } = await supabase
    .from("project_members")
    .select("project_id, projects(agency_id, agencies(id, name))")
    .eq("user_id", user.id)
    .eq("role", "agency_admin")
    .limit(1)
    .single();

  const agency = (members as any)?.projects?.agencies;
  const agencyId = agency?.id;

  if (!agencyId) {
    return (
      <div>
        <PageHeader title="Admin" description="Agency admin dashboard" />
        <Card>
          <CardContent className="pt-6">
            <p>No agency found. Please run bootstrap first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get all projects for this agency
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, client_code, status, created_at")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  // Get onboarding progress for all projects
  const { data: submissions } = await supabase
    .from("onboarding_submissions")
    .select("project_id, step, is_complete");

  const projectProgress = new Map<string, number>();
  submissions?.forEach((sub: any) => {
    if (sub.is_complete) {
      const current = projectProgress.get(sub.project_id) || 0;
      projectProgress.set(sub.project_id, current + 1);
    }
  });

  return (
    <div>
      <PageHeader title="Admin Dashboard" description="Manage projects and view progress" />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create Project */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateProjectForm agencyId={agencyId} />
          </CardContent>
        </Card>

        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectList projects={projects || []} progressMap={projectProgress} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

