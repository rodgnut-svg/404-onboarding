"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { AgencyClient } from "@/app/actions/admin";

interface ClientTileProps {
  client: AgencyClient;
}

const ONBOARDING_STEPS = [
  { number: 1, title: "Project Basics" },
  { number: 2, title: "Brand & Style" },
  { number: 3, title: "Content" },
  { number: 4, title: "Access & Integrations" },
  { number: 5, title: "Approvals & Kickoff" },
];

export function ClientTile({ client }: ClientTileProps) {
  const currentStepInfo = client.onboarding_current_step
    ? ONBOARDING_STEPS.find((s) => s.number === client.onboarding_current_step)
    : null;

  // Use API route to set active project cookie and navigate to client detail
  const clientDetailUrl = `/api/set-active-project?projectId=${client.project_id}&redirectTo=/portal/${client.project_id}/clients/${client.client_id}`;

  return (
    <Link href={clientDetailUrl}>
      <Card className="hover:shadow-card hover:border-[rgba(0,0,0,0.08)] transition-all duration-200 cursor-pointer group">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="truncate group-hover:text-primary transition-colors">{client.project_name}</div>
                <div className="text-sm font-normal text-muted-foreground mt-2 truncate">
                  {client.email}
                </div>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">

            {/* Onboarding Progress */}
            <div>
              <p className="text-sm font-semibold mb-2 text-foreground">Onboarding Progress</p>
              <div className="w-full bg-[#f0f0f0] rounded-full h-[6px] mb-2">
                <div
                  className="bg-primary h-[6px] rounded-full transition-all duration-300"
                  style={{ width: `${(client.onboarding_completed_steps / 5) * 100}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {client.onboarding_completed_steps}/5 steps completed
              </p>
              {currentStepInfo ? (
                <p className="text-sm text-muted-foreground mt-1.5">
                  Current: Step {currentStepInfo.number}: {currentStepInfo.title}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1.5">
                  All steps complete
                </p>
              )}
            </div>

            {/* Files */}
            <div>
              <p className="text-sm font-semibold mb-2 text-foreground">Files</p>
              <p className="text-sm text-muted-foreground">
                {client.file_count} {client.file_count === 1 ? "file" : "files"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
