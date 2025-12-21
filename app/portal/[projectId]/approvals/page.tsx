import { requireProjectMember } from "@/lib/auth";
import { createClientSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ApprovalsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ApprovalsPage({ params }: ApprovalsPageProps) {
  const { projectId } = await params;
  await requireProjectMember(projectId);

  const { supabase } = await requireProjectMember(projectId);

  const { data: approvals } = await supabase
    .from("approvals")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Review and approve project deliverables"
      />

      {!approvals || approvals.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted">No approvals pending at this time</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <Card key={approval.id}>
              <CardHeader>
                <CardTitle>{approval.type}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Status</span>
                    <span className="capitalize">{approval.status}</span>
                  </div>
                  {approval.notes && (
                    <div>
                      <span className="text-sm text-muted">Notes: </span>
                      <span>{approval.notes}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

