"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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

interface TicketCardProps {
  ticket: Ticket;
  projectId: string;
  showFullDescription?: boolean;
}

export function TicketCard({ ticket, projectId, showFullDescription = false }: TicketCardProps) {
  const statusColors = {
    open: "bg-blue-100 text-blue-800 border-blue-200",
    in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
    resolved: "bg-green-100 text-green-800 border-green-200",
  };

  const statusLabels = {
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
  };

  const descriptionPreview = showFullDescription
    ? ticket.description
    : ticket.description.length > 150
    ? `${ticket.description.substring(0, 150)}...`
    : ticket.description;

  const createdDate = new Date(ticket.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const authorName = ticket.profiles?.full_name || ticket.profiles?.email || "Unknown";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold mb-2">{ticket.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>Created by {authorName}</span>
              <span>•</span>
              <span>{createdDate}</span>
            </div>
          </div>
          <Badge className={statusColors[ticket.status]} style={{ flexShrink: 0 }}>
            {statusLabels[ticket.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted mb-4 whitespace-pre-wrap">{descriptionPreview}</p>
        <Link href={`/portal/${projectId}/tickets/${ticket.id}`}>
          <Button variant="secondary" size="default" className="h-12">
            View Details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
