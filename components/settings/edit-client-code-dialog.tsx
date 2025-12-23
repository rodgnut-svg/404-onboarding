"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateClientCode } from "@/app/actions/client-codes";

interface ClientCode {
  id: string;
  label: string;
  client_name: string | null;
  client_email: string | null;
  notes: string | null;
}

interface EditClientCodeDialogProps {
  code: ClientCode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditClientCodeDialog({
  code,
  open,
  onOpenChange,
  onSuccess,
}: EditClientCodeDialogProps) {
  const [label, setLabel] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && code) {
      setLabel(code.label || "");
      setClientName(code.client_name || "");
      setClientEmail(code.client_email || "");
      setNotes(code.notes || "");
      setError(null);
    }
  }, [open, code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!label.trim()) {
      setError("Label is required");
      return;
    }

    setLoading(true);
    try {
      await updateClientCode(
        code.id,
        label.trim(),
        clientName.trim() || undefined,
        clientEmail.trim() || undefined,
        notes.trim() || undefined
      );
      
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update client code");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Client Code</DialogTitle>
          <DialogDescription>
            Update the details for this client code. The code itself can only be changed by regenerating it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="label" className="text-base font-medium">
              Label <span className="text-red-500">*</span>
            </Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Client A, Marketing Team"
              required
              className="mt-2 h-12"
            />
          </div>
          
          <div>
            <Label htmlFor="clientName" className="text-base font-medium">
              Client Name
            </Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Optional client name"
              className="mt-2 h-12"
            />
          </div>

          <div>
            <Label htmlFor="clientEmail" className="text-base font-medium">
              Client Email
            </Label>
            <Input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="Optional client email"
              className="mt-2 h-12"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-base font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or description"
              rows={3}
              className="mt-2 resize-none"
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !label.trim()} className="h-12">
              {loading ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
