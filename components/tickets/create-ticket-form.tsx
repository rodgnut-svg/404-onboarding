"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createTicket } from "@/app/actions/tickets";

interface CreateTicketFormProps {
  projectId: string;
  onSuccess?: () => void;
}

export function CreateTicketForm({ projectId, onSuccess }: CreateTicketFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const result = await createTicket(projectId, title, description);

      if ("error" in result) {
        setError(result.error);
        setLoading(false);
      } else {
        setSuccess(true);
        setTitle("");
        setDescription("");
        setLoading(false);
        router.refresh(); // Trigger server component refresh to show new ticket
        // Reset success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Ticket</CardTitle>
        <CardDescription>
          Submit a new ticket to request website updates or ask questions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-base font-medium">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue or request"
              required
              maxLength={200}
              className="h-12 mt-2"
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-base font-medium">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about what needs to be updated or changed..."
              required
              rows={6}
              className="resize-none mt-2"
            />
          </div>
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg">
              Ticket created successfully!
            </div>
          )}
          <Button type="submit" disabled={loading || !title.trim() || !description.trim()} className="h-12">
            {loading ? "Creating..." : "Create Ticket"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
