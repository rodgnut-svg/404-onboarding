import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientDetails } from "@/app/actions/admin";
import { ClientFiles } from "./client-files";
import { ContractUpload } from "./contract-upload";
import { ContractList } from "@/components/contracts/contract-list";
import { WebsiteUrlInput } from "./website-url-input";
import { WebsiteUrlList } from "./website-url-list";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";

interface Contract {
  id: string;
  file_name: string;
  created_at: string;
  size?: number;
}

interface WebsiteUrl {
  id: string;
  url: string;
  label: string | null;
  created_at: string;
}

interface ClientDetailViewProps {
  details: ClientDetails;
  projectId: string;
  contracts: Contract[];
  websiteUrls: WebsiteUrl[];
}

export function ClientDetailView({ details, projectId, contracts, websiteUrls }: ClientDetailViewProps) {
  const { client, project, onboarding, tickets } = details;

  return (
    <div>
      <div className="mb-6">
        <Link href={`/portal/${projectId}/uploads`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
        </Link>
        <PageHeader
          title={project.name}
          description={`Client details for ${client.email}`}
        />
      </div>

      {/* Client Info Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-base">{client.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Project</p>
              <p className="text-base">{project.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Details */}
      <div className="mb-8">
        <h2 className="font-sans font-semibold mb-6" style={{ fontSize: "1.5rem" }}>
          Onboarding Details
        </h2>
        <div className="space-y-4">
          {onboarding.map((step) => (
            <Card key={step.step}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {step.is_complete ? (
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <CardTitle className="text-base font-semibold">
                      Step {step.step}: {step.title}
                    </CardTitle>
                  </div>
                  <Badge variant={step.is_complete ? "default" : "secondary"}>
                    {step.is_complete ? "Complete" : "Incomplete"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {step.data ? (
                  <div className="space-y-3">
                    {Object.entries(step.data).map(([key, value]) => {
                      // Skip null, undefined, or empty values
                      if (value === null || value === undefined || value === "") {
                        return null;
                      }

                      // Handle arrays
                      if (Array.isArray(value)) {
                        if (value.length === 0) return null;
                        return (
                          <div key={key}>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              {formatFieldName(key)}
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {value.map((item, idx) => {
                                if (typeof item === "object" && item !== null) {
                                  // Handle object arrays (like services)
                                  return (
                                    <li key={idx} className="text-base">
                                      {Object.entries(item)
                                        .filter(([_, v]) => v !== null && v !== undefined && v !== "")
                                        .map(([k, v]) => `${formatFieldName(k)}: ${v}`)
                                        .join(", ")}
                                    </li>
                                  );
                                }
                                return <li key={idx} className="text-base">{item}</li>;
                              })}
                            </ul>
                          </div>
                        );
                      }

                      // Handle booleans
                      if (typeof value === "boolean") {
                        return (
                          <div key={key}>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              {formatFieldName(key)}
                            </p>
                            <p className="text-base">{value ? "Yes" : "No"}</p>
                          </div>
                        );
                      }

                      // Handle regular values
                      return (
                        <div key={key}>
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            {formatFieldName(key)}
                          </p>
                          <p className="text-base">{String(value)}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No data submitted yet</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Tickets Section */}
      <div className="mb-8">
        <h2 className="font-sans font-semibold mb-6" style={{ fontSize: "1.5rem" }}>
          Submitted Tickets
        </h2>
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No tickets submitted yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold mb-2">
                        <Link
                          href={`/portal/${projectId}/tickets/${ticket.id}`}
                          className="hover:underline"
                        >
                          {ticket.title}
                        </Link>
                      </CardTitle>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge
                          variant={
                            ticket.status === "resolved"
                              ? "default"
                              : ticket.status === "in_progress"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {ticket.status === "open"
                            ? "Open"
                            : ticket.status === "in_progress"
                            ? "In Progress"
                            : "Resolved"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(ticket.created_at).toLocaleDateString("en-US")}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-base text-muted-foreground line-clamp-3">
                    {ticket.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Files Section */}
      <div className="mb-8">
        <h2 className="font-sans font-semibold mb-6" style={{ fontSize: "1.5rem" }}>
          Uploaded Files
        </h2>
        <ClientFiles files={details.files} projectId={projectId} />
      </div>

      {/* Contracts Section */}
      <div className="mb-8">
        <h2 className="font-sans font-semibold mb-6" style={{ fontSize: "1.5rem" }}>
          Contracts
        </h2>
        
        {/* Upload Contract Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upload Contract</CardTitle>
            <CardDescription>
              Upload a PDF contract for this client. The client will be able to view it on their dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContractUpload projectId={projectId} />
          </CardContent>
        </Card>

        {/* Existing Contracts */}
        {contracts.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3">Uploaded Contracts</h3>
            <ContractList contracts={contracts} projectId={projectId} />
          </div>
        )}

        {/* Website URLs Section */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-3">Website URLs</h3>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Website URL</CardTitle>
              <CardDescription>
                Add website URLs for this project. Clients will be able to preview them on their dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebsiteUrlInput projectId={projectId} />
            </CardContent>
          </Card>
          
          {websiteUrls.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Added URLs</h4>
              <WebsiteUrlList urls={websiteUrls} projectId={projectId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFieldName(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
