import { requireProjectMember } from "@/lib/auth";
import { createClientSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { projectId } = await params;
  const { supabase } = await requireProjectMember(projectId);

  // Get project
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  // Get onboarding progress
  const { data: submissions } = await supabase
    .from("onboarding_submissions")
    .select("*")
    .eq("project_id", projectId)
    .order("step", { ascending: true });

  const completedSteps = submissions?.filter((s) => s.is_complete).length || 0;
  const totalSteps = 5;
  const progress = (completedSteps / totalSteps) * 100;

  // Get next milestone
  const { data: nextMilestone } = await supabase
    .from("milestones")
    .select("*")
    .eq("project_id", projectId)
    .neq("status", "approved")
    .order("sort", { ascending: true })
    .limit(1)
    .single();

  return (
    <div>
      <PageHeader
        title={project?.name || "Dashboard"}
        description="Your project overview and next steps"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Progress</CardTitle>
            <CardDescription>{completedSteps} of {totalSteps} steps complete</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-muted/20 rounded-full h-2 mb-4">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <Link href={`/portal/${projectId}/onboarding`}>
              <Button variant="secondary" className="w-full">
                Continue Onboarding
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Next Step Card */}
        {nextMilestone && (
          <Card>
            <CardHeader>
              <CardTitle>Next Step</CardTitle>
              <CardDescription>{nextMilestone.title}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted mb-4">
                Status: <span className="capitalize">{nextMilestone.status.replace("_", " ")}</span>
              </div>
              <Link href={`/portal/${projectId}/timeline`}>
                <Button variant="secondary" className="w-full">
                  View Timeline
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href={`/portal/${projectId}/uploads`}>
              <Button variant="secondary" className="w-full justify-start">
                Upload Files
              </Button>
            </Link>
            <Link href={`/portal/${projectId}/approvals`}>
              <Button variant="secondary" className="w-full justify-start">
                View Approvals
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

