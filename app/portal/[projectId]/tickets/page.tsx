import { requireProjectMember } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTicketForm } from "@/components/tickets/create-ticket-form";
import { TicketList } from "@/components/tickets/ticket-list";
import { getTickets } from "@/app/actions/tickets";

interface TicketsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function TicketsPage({ params }: TicketsPageProps) {
  const { projectId } = await params;
  const { user, supabase, member } = await requireProjectMember(projectId);

  const isAgencyAdmin = member?.role === "agency_admin";

  let submittedTickets: any[] = [];
  let receivedTickets: any[] = [];
  let pastTickets: any[] = [];
  let resolvedTickets: any[] = [];
  let ticketsError: string | null = null;

  try {
    if (isAgencyAdmin) {
      // Agency admin: fetch ALL tickets (not filtered by created_by)
      const openTickets = await getTickets(projectId, { status: "open" });
      const inProgressTickets = await getTickets(projectId, { status: "in_progress" });
      receivedTickets = [...openTickets, ...inProgressTickets];
      resolvedTickets = await getTickets(projectId, { status: "resolved" });
    } else {
      // Regular user: fetch only their own tickets
      const allTickets = await getTickets(projectId, {
        created_by: user.id,
      });
      submittedTickets = allTickets.filter((t: any) => t.status !== "resolved");

      // Get past/resolved tickets for current user
      pastTickets = await getTickets(projectId, {
        created_by: user.id,
        status: "resolved",
      });
    }
  } catch (error) {
    console.error("[TicketsPage] Error fetching tickets:", error);
    ticketsError = error instanceof Error ? error.message : "Failed to load tickets";
  }

  return (
    <div>
      <PageHeader
        title="Tickets"
        description={isAgencyAdmin ? "Review and resolve tickets from clients" : "Submit tickets for website updates and track their status"}
      />

      {ticketsError ? (
        <Card>
          <CardContent className="pt-6">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">Database Migration Required</h3>
              <p className="text-sm text-yellow-700 mb-4">
                {ticketsError}
              </p>
              <p className="text-sm text-yellow-700">
                Please run the migration file <code className="bg-yellow-100 px-2 py-1 rounded">supabase/migrations/004_create_tickets_table.sql</code> in your Supabase SQL Editor.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isAgencyAdmin ? (
        <div className="space-y-8">
          {/* Received Tickets */}
          <Card>
            <CardHeader>
              <CardTitle>Received Tickets</CardTitle>
              <CardDescription>
                Tickets from clients that are open or in progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TicketList
                tickets={receivedTickets as any}
                projectId={projectId}
                layout="grid"
                emptyMessage="No received tickets at this time"
              />
            </CardContent>
          </Card>

          {/* Resolved Tickets */}
          <Card>
            <CardHeader>
              <CardTitle>Resolved Tickets</CardTitle>
              <CardDescription>
                Tickets that have been marked as resolved
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TicketList
                tickets={resolvedTickets as any}
                projectId={projectId}
                layout="grid"
                emptyMessage="No resolved tickets yet"
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Create New Ticket */}
          <CreateTicketForm projectId={projectId} />

          {/* Submitted Tickets */}
          <Card>
            <CardHeader>
              <CardTitle>Submitted Tickets</CardTitle>
              <CardDescription>
                Your active tickets that are open or in progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TicketList
                tickets={submittedTickets as any}
                projectId={projectId}
                emptyMessage="You haven't submitted any tickets yet"
              />
            </CardContent>
          </Card>

          {/* Past Tickets */}
          <Card>
            <CardHeader>
              <CardTitle>Past Tickets</CardTitle>
              <CardDescription>
                Your resolved tickets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TicketList
                tickets={pastTickets as any}
                projectId={projectId}
                emptyMessage="No resolved tickets yet"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
