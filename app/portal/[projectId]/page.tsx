import { requireProjectMember } from "@/lib/auth";
import { createClientSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getContracts } from "@/app/actions/contracts";
import { ContractList } from "@/components/contracts/contract-list";
import { getWebsiteUrls } from "@/app/actions/website-urls";
import { WebsitePreview } from "@/components/website/website-preview";

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

  // Get contracts for this project - query directly using existing supabase client
  let contracts: any[] = [];
  try {
    const { data: contractsData, error: contractsError } = await supabase
      .from("files")
      .select("*")
      .eq("project_id", projectId)
      .eq("kind", "contract")
      .order("created_at", { ascending: false });
    
    if (contractsError) {
      console.error("[Dashboard] Error fetching contracts:", contractsError);
    } else {
      contracts = contractsData || [];
      console.log("[Dashboard] Found contracts:", contracts.length);
    }
  } catch (error) {
    console.error("[Dashboard] Exception fetching contracts:", error);
    // Continue without contracts if there's an error
  }

  // Get website URLs for this project
  let websiteUrls: any[] = [];
  try {
    const websiteUrlsResult = await getWebsiteUrls(projectId);
    websiteUrls = websiteUrlsResult.data || [];
  } catch (error) {
    console.error("[Dashboard] Exception fetching website URLs:", error);
    // Continue without website URLs if there's an error
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
      />

      {/* Website Preview Card */}
      {websiteUrls.length > 0 && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Live Website Preview</CardTitle>
              <CardDescription>
                Preview your website to see live updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebsitePreview urls={websiteUrls} />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-10 md:grid-cols-2">
        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Progress</CardTitle>
            <CardDescription>{completedSteps} of {totalSteps} steps complete</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-[#f0f0f0] rounded-full h-[8px] mb-6">
              <div
                className="bg-primary h-[8px] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            {!isAgencyAdmin && (
              <Link href={`/portal/${projectId}/onboarding`}>
                <Button variant="secondary" className="w-full justify-start h-12">
                  Continue Onboarding
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
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

      {/* Contracts Card */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Contracts</CardTitle>
            <CardDescription>
              View and download your project contracts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContractList contracts={contracts} projectId={projectId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

