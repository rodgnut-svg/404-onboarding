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

  // Get all open/in_progress tickets across all agency projects
  const projectIds = projects?.map((p) => p.id) || [];
  const { data: openTickets } = await supabase
    .from("tickets")
    .select("id, title, status, created_at, project_id, created_by, projects(id, name)")
    .in("project_id", projectIds)
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch profiles for ticket creators
  const ticketUserIds = [...new Set((openTickets || []).map((t: any) => t.created_by))];
  const { data: ticketProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ticketUserIds);

  const profileMap = new Map((ticketProfiles || []).map((p: any) => [p.id, p]));

  // Add profiles to tickets
  const ticketsWithProfiles = (openTickets || []).map((ticket: any) => ({
    ...ticket,
    profiles: profileMap.get(ticket.created_by) || null,
  }));

  return (
    <div>
      <PageHeader title="Admin Dashboard" description="Manage projects and view progress" />

      <div className="grid gap-8 md:grid-cols-2">
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

      {/* Open Tickets Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Open Tickets</CardTitle>
          <p className="text-sm text-muted-foreground">
            Recent open and in-progress tickets across all projects
          </p>
        </CardHeader>
        <CardContent>
          {!ticketsWithProfiles || ticketsWithProfiles.length === 0 ? (
            <p className="text-muted-foreground text-base py-4">No open tickets at this time</p>
          ) : (
            <div className="space-y-3">
              {ticketsWithProfiles.map((ticket: any) => {
                const project = ticket.projects;
                const submitter = ticket.profiles;
                const submitterName =
                  submitter?.full_name || submitter?.email || "Unknown";
                const createdDate = new Date(ticket.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <a
                    key={ticket.id}
                    href={`/portal/${ticket.project_id}/tickets/${ticket.id}`}
                    className="block p-5 border border-border rounded-[12px] hover:shadow-card hover:border-[rgba(0,0,0,0.08)] transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold mb-2 truncate group-hover:text-primary transition-colors">{ticket.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          <span className="font-medium text-foreground">{project?.name || "Unknown Project"}</span>
                          {" • "}
                          {submitterName}
                          {" • "}
                          {createdDate}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            ticket.status === "open"
                              ? "bg-primary/10 text-primary"
                              : "bg-accent/10 text-accent"
                          }`}
                        >
                          {ticket.status === "open" ? "Open" : "In Progress"}
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

