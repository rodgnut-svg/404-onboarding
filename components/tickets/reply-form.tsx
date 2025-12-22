"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { addTicketReply } from "@/app/actions/tickets";

interface ReplyFormProps {
  ticketId: string;
  onSuccess?: () => void;
}

export function ReplyForm({ ticketId, onSuccess }: ReplyFormProps) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await addTicketReply(ticketId, body);

      if ("error" in result) {
        setError(result.error);
        setLoading(false);
      } else {
        setBody("");
        setLoading(false);
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add reply");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="reply" className="text-base font-medium">Add a reply</Label>
        <Textarea
          id="reply"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your reply here..."
          required
          rows={4}
          className="resize-none mt-2"
        />
      </div>
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}
      <Button type="submit" disabled={loading || !body.trim()} className="h-12">
        {loading ? "Posting..." : "Post Reply"}
      </Button>
    </form>
  );
}
