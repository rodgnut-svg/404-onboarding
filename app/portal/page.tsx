import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClientSupabase } from "@/lib/supabase/server";
import { JoinProjectForm } from "@/components/onboarding/join-project-form";
import { cookies } from "next/headers";

export default async function PortalPage() {
  const { user, supabase } = await requireUser();

  // Check for active project cookie
  const cookieStore = await cookies();
  const activeProjectId = cookieStore.get("active_project_id")?.value;

  if (activeProjectId) {
    // Verify user is still a member of this project
    const { data: member } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("project_id", activeProjectId)
      .eq("user_id", user.id)
      .single();

    if (member) {
      // User has an active project and is still a member - redirect to it
      redirect(`/portal/${activeProjectId}`);
    } else {
      // Invalid active project, clear cookie
      cookieStore.delete("active_project_id");
    }
  }

  // Get all projects user is a member of
  const { data: members } = await supabase
    .from("project_members")
    .select("project_id, projects(id, name, status)")
    .eq("user_id", user.id);

  if (!members || members.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-24">
          <div className="max-w-2xl">
          <h1 className="font-sans font-semibold mb-4" style={{ fontSize: "2.5rem" }}>No Projects</h1>
          <p className="text-base text-muted mb-8" style={{ fontSize: "1rem" }}>
            You don't have access to any projects yet. Enter a client code to join a project.
          </p>
          <JoinProjectForm />
          </div>
        </div>
      </div>
    );
  }

  // If only one project, redirect to it
  if (members.length === 1) {
    redirect(`/portal/${members[0].project_id}`);
  }

  // Show project selection (legacy case - users without active_project_id cookie)
  return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-24">
          <h1 className="font-sans font-semibold mb-12" style={{ fontSize: "2.5rem" }}>Select a Project</h1>
          <div className="grid gap-4 md:grid-cols-2">
            {members.map((member: any) => {
              const project = member.projects;
              return (
                <a
                  key={member.project_id}
                  href={`/portal/${member.project_id}`}
                  className="block p-6 border border-border rounded-[12px] bg-card hover:shadow-subtle transition-shadow"
                >
                  <h2 className="font-sans font-semibold mb-2" style={{ fontSize: "1.5rem" }}>
                    {project?.name || "Unnamed Project"}
                  </h2>
                  <p className="text-base text-muted">Status: {project?.status}</p>
                </a>
              );
            })}
          </div>
        </div>
      </div>
  );
}

