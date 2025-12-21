import { requireProjectMember } from "@/lib/auth";
import { createClientSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CompletePageProps {
  params: Promise<{ projectId: string }>;
}

export default async function CompletePage({ params }: CompletePageProps) {
  const { projectId } = await params;
  await requireProjectMember(projectId);

  const { supabase } = await requireProjectMember(projectId);

  const { data: milestones } = await supabase
    .from("milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("sort", { ascending: true });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Onboarding Complete!"
        description="Thank you for completing your onboarding. Here's what happens next."
      />

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Next Steps</h2>
            <ol className="list-decimal list-inside space-y-3 text-muted">
              <li>Our team will review your submission</li>
              <li>We'll set up your project timeline</li>
              <li>You'll receive updates in this portal</li>
              <li>We'll reach out if we need any clarifications</li>
            </ol>
          </div>

          {milestones && milestones.length > 0 && (
            <div>
              <h2 className="text-2xl font-serif font-semibold mb-4">Project Timeline</h2>
              <div className="space-y-2">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <span>{milestone.title}</span>
                    <span className="text-sm text-muted capitalize">{milestone.status.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Link href={`/portal/${projectId}`}>
              <Button>Go to Dashboard</Button>
            </Link>
            <Link href={`/portal/${projectId}/timeline`}>
              <Button variant="secondary">View Timeline</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

