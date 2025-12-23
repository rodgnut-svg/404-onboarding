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
  const displayName = client.full_name || client.email;
  const currentStepInfo = client.onboarding_current_step
    ? ONBOARDING_STEPS.find((s) => s.number === client.onboarding_current_step)
    : null;

  return (
    <Card>
      <CardHeader style={{ padding: "1.5rem" }}>
        <CardTitle className="text-base font-semibold">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="truncate">{displayName}</div>
              <div className="text-sm font-normal text-muted-foreground mt-1 truncate">
                {client.project_name}
              </div>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: "0 1.5rem 1.5rem 1.5rem" }}>
        <div className="space-y-3">
          {/* Email */}
          <div>
            <p className="text-sm text-muted-foreground">{client.email}</p>
          </div>

          {/* Onboarding Progress */}
          <div>
            <p className="text-sm font-medium mb-1">Onboarding Progress</p>
            <p className="text-sm text-muted-foreground">
              {client.onboarding_completed_steps}/5 steps completed
            </p>
            {currentStepInfo ? (
              <p className="text-sm text-muted-foreground mt-1">
                Current: Step {currentStepInfo.number}: {currentStepInfo.title}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                All steps complete
              </p>
            )}
          </div>

          {/* Files */}
          <div>
            <p className="text-sm font-medium mb-1">Files</p>
            <Link
              href={`/portal/${client.project_id}/uploads`}
              className="text-sm text-primary hover:underline"
            >
              {client.file_count} {client.file_count === 1 ? "file" : "files"}
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
