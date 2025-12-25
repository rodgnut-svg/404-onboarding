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

      <div className="space-y-3 max-w-3xl">
        {steps.map((step) => {
          const submission = submissionMap.get(step.number);
          const isComplete = submission?.is_complete || false;

          return (
            <Card key={step.number} className="hover:shadow-card transition-all duration-200">
              <CardHeader style={{ padding: "1.25rem 1.75rem" }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div>
                      <CardTitle className="text-base font-semibold">
                        Step {step.number}: {step.title}
                      </CardTitle>
                    </div>
                  </div>
                  <Link href={`/portal/${projectId}/onboarding/${step.slug}`}>
                    <Button variant={isComplete ? "secondary" : "default"} size="sm">
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

