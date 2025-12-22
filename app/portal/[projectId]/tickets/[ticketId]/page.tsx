import { requireProjectMember } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { TicketDetail } from "@/components/tickets/ticket-detail";
import { getTicket } from "@/app/actions/tickets";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface TicketDetailPageProps {
  params: Promise<{ projectId: string; ticketId: string }>;
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { projectId, ticketId } = await params;
  const { user, member } = await requireProjectMember(projectId);

  // Get ticket details
  const ticket = await getTicket(ticketId);

  const isAgencyMember = ["agency_admin", "agency_member"].includes(member.role);

  return (
    <div>
      <div className="mb-6">
        <Link href={`/portal/${projectId}/tickets`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tickets
          </Button>
        </Link>
        <PageHeader
          title="Ticket Details"
          description="View and manage ticket details"
        />
      </div>

      <TicketDetail
        ticket={ticket as any}
        projectId={projectId}
        currentUserId={user.id}
        isAgencyMember={isAgencyMember}
      />
    </div>
  );
}
