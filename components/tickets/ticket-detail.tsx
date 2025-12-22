"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReplyForm } from "./reply-form";
import { updateTicketStatus, getTicketReplies } from "@/app/actions/tickets";
import { useRouter } from "next/navigation";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  created_by: string;
  profiles?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

interface Reply {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

interface TicketDetailProps {
  ticket: Ticket;
  projectId: string;
  currentUserId: string;
  isAgencyMember: boolean;
}

export function TicketDetail({
  ticket,
  projectId,
  currentUserId,
  isAgencyMember,
}: TicketDetailProps) {
  const router = useRouter();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReplies();
  }, [ticket.id]);

  const loadReplies = async () => {
    try {
      setLoading(true);
      const fetchedReplies = await getTicketReplies(ticket.id);
      setReplies(fetchedReplies as Reply[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load replies");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: "open" | "in_progress" | "resolved") => {
    setUpdating(true);
    setError(null);

    try {
      const result = await updateTicketStatus(ticket.id, newStatus);
      if ("error" in result) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

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

  const createdDate = new Date(ticket.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const authorName = ticket.profiles?.full_name || ticket.profiles?.email || "Unknown";

  return (
    <div className="space-y-6">
      {/* Ticket Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="mb-2" style={{ fontSize: "1.5rem" }}>{ticket.title}</CardTitle>
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
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap text-base">{ticket.description}</p>
          </div>

          {/* Status Update Controls (Agency Only) */}
          {isAgencyMember && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Update Status:</span>
                {ticket.status !== "open" && (
                  <Button
                    variant="secondary"
                    size="default"
                    onClick={() => handleStatusUpdate("open")}
                    disabled={updating}
                    className="h-12"
                  >
                    Mark Open
                  </Button>
                )}
                {ticket.status !== "in_progress" && (
                  <Button
                    variant="secondary"
                    size="default"
                    onClick={() => handleStatusUpdate("in_progress")}
                    disabled={updating}
                    className="h-12"
                  >
                    Mark In Progress
                  </Button>
                )}
                {ticket.status !== "resolved" && (
                  <Button
                    variant="secondary"
                    size="default"
                    onClick={() => handleStatusUpdate("resolved")}
                    disabled={updating}
                    className="h-12"
                  >
                    Mark Resolved
                  </Button>
                )}
              </div>
              {error && (
                <div className="mt-2 p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Replies Section */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontSize: "1.5rem" }}>Replies ({replies.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <p className="text-sm text-muted">Loading replies...</p>
          ) : replies.length === 0 ? (
            <p className="text-sm text-muted">No replies yet. Be the first to reply!</p>
          ) : (
            replies.map((reply) => {
              const replyDate = new Date(reply.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              const replyAuthorName =
                reply.profiles?.full_name || reply.profiles?.email || "Unknown";

              return (
                <div key={reply.id} className="pb-4 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">{replyAuthorName}</span>
                    <span className="text-xs text-muted">{replyDate}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
                </div>
              );
            })
          )}

          {/* Reply Form */}
          <div className="pt-4 border-t border-border">
            <ReplyForm ticketId={ticket.id} onSuccess={loadReplies} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
