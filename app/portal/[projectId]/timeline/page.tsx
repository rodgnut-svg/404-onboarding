import { requireProjectMember } from "@/lib/auth";
import { createClientSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimelinePageProps {
  params: Promise<{ projectId: string }>;
}

export default async function TimelinePage({ params }: TimelinePageProps) {
  const { projectId } = await params;
  await requireProjectMember(projectId);

  const { supabase } = await requireProjectMember(projectId);

  const { data: milestones } = await supabase
    .from("milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("sort", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Project Timeline"
        description="Track your project milestones"
      />

      <div className="space-y-6">
        {milestones && milestones.length > 0 ? (
          milestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className="sticky"
              style={{ top: `${index * 20 + 80}px` }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{milestone.title}</CardTitle>
                    <span className="text-sm text-muted capitalize">
                      {milestone.status.replace("_", " ")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {milestone.due_date && (
                    <p className="text-sm text-muted">
                      Due: {new Date(milestone.due_date).toLocaleDateString()}
                    </p>
                  )}
                  {milestone.completed_at && (
                    <p className="text-sm text-muted">
                      Completed: {new Date(milestone.completed_at).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted">No milestones created yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

