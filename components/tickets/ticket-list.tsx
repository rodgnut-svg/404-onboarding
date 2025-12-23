"use client";

import { TicketCard } from "./ticket-card";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
  updated_at: string;
  created_by: string;
  profiles?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

interface TicketListProps {
  tickets: Ticket[];
  projectId: string;
  emptyMessage?: string;
  layout?: "vertical" | "grid";
}

export function TicketList({ tickets, projectId, emptyMessage = "No tickets found", layout = "vertical" }: TicketListProps) {
  if (!tickets || tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">{emptyMessage}</p>
      </div>
    );
  }

  if (layout === "grid") {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} projectId={projectId} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} projectId={projectId} />
      ))}
    </div>
  );
}
