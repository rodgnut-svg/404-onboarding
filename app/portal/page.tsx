import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClientSupabase } from "@/lib/supabase/server";

export default async function PortalPage() {
  const { user, supabase } = await requireUser();

  // Get all projects user is a member of
  const { data: members } = await supabase
    .from("project_members")
    .select("project_id, projects(id, name, status)")
    .eq("user_id", user.id);

  if (!members || members.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-24 max-w-2xl">
          <h1 className="text-5xl font-serif font-semibold mb-4">No Projects</h1>
          <p className="text-lg text-muted">
            You don't have access to any projects yet. Please contact your agency
            or enter a client code to get started.
          </p>
        </div>
      </div>
    );
  }

  // If only one project, redirect to it
  if (members.length === 1) {
    redirect(`/portal/${members[0].project_id}`);
  }

  // Show project selection
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-24 max-w-4xl">
        <h1 className="text-5xl font-serif font-semibold mb-12">Select a Project</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {members.map((member: any) => {
            const project = member.projects;
            return (
              <a
                key={member.project_id}
                href={`/portal/${member.project_id}`}
                className="block p-6 border border-border rounded-lg bg-card hover:shadow-subtle transition-shadow"
              >
                <h2 className="text-2xl font-serif font-semibold mb-2">
                  {project?.name || "Unnamed Project"}
                </h2>
                <p className="text-muted">Status: {project?.status}</p>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

