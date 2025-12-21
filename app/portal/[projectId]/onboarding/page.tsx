import { requireProjectMember } from "@/lib/auth";
import { createClientSupabase } from "@/lib/supabase/server";
import { getAllOnboardingSteps } from "@/app/actions/onboarding";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div>
      <PageHeader
        title="Onboarding Wizard"
        description="Complete all steps to finish your project setup"
      />

      <div className="space-y-4 max-w-3xl">
        {steps.map((step) => {
          const submission = submissionMap.get(step.number);
          const isComplete = submission?.is_complete || false;

          return (
            <Card key={step.number}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {isComplete ? (
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted" />
                    )}
                    <div>
                      <CardTitle className="text-xl">
                        Step {step.number}: {step.title}
                      </CardTitle>
                    </div>
                  </div>
                  <Link href={`/portal/${projectId}/onboarding/${step.slug}`}>
                    <Button variant={isComplete ? "secondary" : "default"}>
                      {isComplete ? "Review" : "Start"}
                    </Button>
                  </Link>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

