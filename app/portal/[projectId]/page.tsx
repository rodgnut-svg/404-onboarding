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
import { ProjectSelector } from "@/components/admin/project-selector";
import { CheckCircle2, Circle, Upload, Folder, Ticket, Settings, ChevronRight } from "lucide-react";

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
  
  const title = projectName;
  
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

  // Determine current step for hero card
  const stepTitles = [
    { number: 1, title: "Project Basics" },
    { number: 2, title: "Brand & Style" },
    { number: 3, title: "Content" },
    { number: 4, title: "Access & Integrations" },
    { number: 5, title: "Approvals & Kickoff" },
  ];
  
  let currentStep = null;
  for (let i = 1; i <= 5; i++) {
    const submission = submissions?.find((s: any) => s.step === i);
    if (!submission || !submission.is_complete) {
      currentStep = stepTitles.find((s) => s.number === i);
      break;
    }
  }
  
  // If all steps complete, show step 5
  if (!currentStep && completedSteps === totalSteps) {
    currentStep = stepTitles[4];
  }

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
        rightContent={
          isAgencyAdmin ? (
            <ProjectSelector 
              currentProjectId={projectId} 
              currentProjectName={projectName}
            />
          ) : undefined
        }
      />

      {/* 12-Column Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - 8 cols on desktop */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Website Preview Card */}
          {websiteUrls.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 md:p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Live Website Preview</h3>
              <p className="text-sm text-slate-500 mb-4">Preview your website to see live updates</p>
              <WebsitePreview urls={websiteUrls} />
            </div>
          )}

          {/* Hero Onboarding Card */}
          {!isAgencyAdmin && currentStep && (
            <div className="relative bg-gradient-to-br from-blue-50 via-white to-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              {/* Decorative gradient blobs */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.12),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.10),transparent_40%)] rounded-2xl pointer-events-none" />
              
              {/* Content */}
              <div className="relative z-10 p-5 md:p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Complete onboarding: Step {currentStep.number} — {currentStep.title}
                </h2>
                
                {/* Step checklist */}
                <div className="space-y-2 mb-6">
                  {stepTitles.map((step) => {
                    const submission = submissions?.find((s: any) => s.step === step.number);
                    const isComplete = submission?.is_complete || false;
                    const isCurrent = step.number === currentStep.number;
                    
                    return (
                      <div key={step.number} className="flex items-center gap-2 text-sm">
                        {isComplete ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        ) : (
                          <Circle className={`w-4 h-4 flex-shrink-0 ${isCurrent ? 'text-blue-600' : 'text-slate-400'}`} />
                        )}
                        <span className={isCurrent ? 'text-slate-900 font-medium' : isComplete ? 'text-slate-600' : 'text-slate-400'}>
                          {isComplete ? '✓ ' : ''}Step {step.number}: {step.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <Link href={`/portal/${projectId}/onboarding`}>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl px-5 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2">
                    Continue Onboarding
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Contracts Card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 md:p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Contracts</h3>
            <ContractList contracts={contracts} projectId={projectId} />
          </div>
        </div>

        {/* Right Column - 4 cols on desktop */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Gradient Quick Actions Panel */}
          <div className="rounded-2xl border border-slate-200/50 shadow-sm bg-gradient-to-br from-cyan-200/40 via-blue-200/35 to-violet-200/40 p-4 md:p-5">
            <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-sm p-3">
              <div className="space-y-2">
                <Link href={`/portal/${projectId}/uploads`} className="block">
                  <div className="rounded-xl border border-slate-200/70 bg-white/70 hover:bg-white transition flex items-center justify-between gap-3 px-4 py-3 hover:shadow-sm hover:border-slate-200">
                    <div className="flex items-center gap-3">
                      <Upload className="w-5 h-5 text-slate-500" />
                      <span className="text-sm font-medium text-slate-900">Upload Files</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Link>
                
                <Link href={`/portal/${projectId}/tickets`} className="block">
                  <div className="rounded-xl border border-slate-200/70 bg-white/70 hover:bg-white transition flex items-center justify-between gap-3 px-4 py-3 hover:shadow-sm hover:border-slate-200">
                    <div className="flex items-center gap-3">
                      <Ticket className="w-5 h-5 text-slate-500" />
                      <span className="text-sm font-medium text-slate-900">View Tickets</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Link>
                
                {isAgencyAdmin && (
                  <Link href={`/portal/${projectId}/settings`} className="block">
                    <div className="rounded-xl border border-slate-200/70 bg-white/70 hover:bg-white transition flex items-center justify-between gap-3 px-4 py-3 hover:shadow-sm hover:border-slate-200">
                      <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-slate-500" />
                        <span className="text-sm font-medium text-slate-900">Project Settings</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Onboarding Progress Summary */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Onboarding Progress</h3>
            <p className="text-sm text-slate-500 mb-4">{completedSteps} of {totalSteps} steps complete</p>
            <div className="w-full bg-slate-200/60 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

