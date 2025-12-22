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
  const { supabase, member } = await requireProjectMember(projectId);

  // Get project
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  // Determine title and description based on user role
  const role = member?.role || "client_member";
  const projectName = project?.name || "Project";
  const isAgencyAdmin = role === "agency_admin";
  
  const title = isAgencyAdmin 
    ? `${projectName} — Admin Project`
    : `${projectName} — Client Portal`;
  
  const description = isAgencyAdmin
    ? "Your project overview and next steps"
    : "Complete onboarding, upload files, and track progress";

  // Get onboarding progress
  const { data: submissions } = await supabase
    .from("onboarding_submissions")
    .select("*")
    .eq("project_id", projectId)
    .order("step", { ascending: true });

  const completedSteps = submissions?.filter((s) => s.is_complete).length || 0;
  const totalSteps = 5;
  const progress = (completedSteps / totalSteps) * 100;

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
      />

      <div className="grid gap-8 md:grid-cols-2">
        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Progress</CardTitle>
            <CardDescription>{completedSteps} of {totalSteps} steps complete</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-[#e5e7eb] rounded-full h-[6px] mb-4">
              <div
                className="bg-[#2563eb] h-[6px] rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <Link href={`/portal/${projectId}/onboarding`}>
              <Button variant="default" className="w-full">
                Continue Onboarding
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/portal/${projectId}/uploads`}>
              <Button variant="secondary" className="w-full justify-start h-12">
                Upload Files
              </Button>
            </Link>
            <Link href={`/portal/${projectId}/tickets`}>
              <Button variant="secondary" className="w-full justify-start h-12">
                View Tickets
              </Button>
            </Link>
            {isAgencyAdmin && (
              <Link href={`/portal/${projectId}/settings`}>
                <Button variant="secondary" className="w-full justify-start h-12">
                  Project Settings
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

