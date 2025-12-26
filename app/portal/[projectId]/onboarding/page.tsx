import { requireProjectMember } from "@/lib/auth";
import { createClientSupabase } from "@/lib/supabase/server";
import { getAllOnboardingSteps } from "@/app/actions/onboarding";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";

interface OnboardingPageProps {
  params: Promise<{ projectId: string }>;
}

const steps = [
  { number: 1, title: "Project Basics", slug: "step-1" },
  { number: 2, title: "Brand & Style", slug: "step-2" },
  { number: 3, title: "Content", slug: "step-3" },
  { number: 4, title: "Access & Integrations", slug: "step-4" },
  { number: 5, title: "Approvals & Kickoff", slug: "step-5" },
];

export default async function OnboardingPage({ params }: OnboardingPageProps) {
  const { projectId } = await params;
  await requireProjectMember(projectId);

  const { data: submissions } = await getAllOnboardingSteps(projectId);
  const submissionMap = new Map(
    submissions?.map((s: any) => [s.step, s]) || []
  );

  // Calculate progress
  const completedSteps = submissions?.filter((s: any) => s.is_complete).length || 0;
  const totalSteps = 5;
  const progress = (completedSteps / totalSteps) * 100;

  // Determine current step
  let currentStepNumber = null;
  for (let i = 1; i <= 5; i++) {
    const submission = submissions?.find((s: any) => s.step === i);
    if (!submission || !submission.is_complete) {
      currentStepNumber = i;
      break;
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 mb-2">
          Onboarding Wizard
        </h1>
        <p className="text-sm md:text-base text-slate-500">
          Complete all steps to finish your project setup
        </p>
      </div>

      {/* Gradient Overview Hero Card */}
      <div className="rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden relative bg-gradient-to-br from-cyan-200/35 via-blue-200/25 to-violet-200/30 mb-6">
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-sm p-5">
          <p className="text-sm text-slate-600 mb-4">
            Complete all steps to finish your project setup
          </p>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-900">Progress</span>
              <span className="text-sm text-slate-500">{completedSteps} of {totalSteps} steps complete</span>
            </div>
            <div className="w-full bg-slate-200/60 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3 md:space-y-4">
        {steps.map((step) => {
          const submission = submissionMap.get(step.number);
          const isComplete = submission?.is_complete || false;
          const isCurrent = step.number === currentStepNumber;

          return (
            <div
              key={step.number}
              className={`bg-white rounded-2xl border border-slate-200/60 shadow-sm px-5 py-4 hover:border-slate-300/60 hover:shadow-sm transition ${
                isCurrent ? "ring-2 ring-blue-500/15 bg-blue-50/40" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  ) : (
                    <div className="bg-slate-100 text-slate-700 border border-slate-200/70 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {step.number}
                    </div>
                  )}
                  <div>
                    <div className="text-base md:text-lg font-semibold text-slate-900">
                      Step {step.number}: {step.title}
                    </div>
                  </div>
                </div>
                <Link href={`/portal/${projectId}/onboarding/${step.slug}`}>
                  <Button 
                    variant={isComplete ? "secondary" : "default"}
                    size="sm"
                  >
                    {isComplete ? "Review" : "Start"}
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

