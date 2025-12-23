"use client";

import { useState } from "react";
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
import { createClientCode } from "@/app/actions/client-codes";
import { Copy, Check } from "lucide-react";

interface CreateClientCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateClientCodeDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateClientCodeDialogProps) {
  const [label, setLabel] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!label.trim()) {
      setError("Label is required");
      return;
    }

    setLoading(true);
    try {
      const result = await createClientCode(
        label.trim(),
        clientName.trim() || undefined,
        clientEmail.trim() || undefined,
        notes.trim() || undefined
      );
      
      setGeneratedCode(result.code);
      setShowCode(true);
      setLoading(false);
      // Don't auto-close - let user copy the code and close manually
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client code");
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (generatedCode) {
      try {
        await navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        setError("Failed to copy to clipboard");
      }
    }
  };

  const handleClose = () => {
    if (!showCode) {
      setLabel("");
      setClientName("");
      setClientEmail("");
      setNotes("");
      setError(null);
      onOpenChange(false);
    } else {
      // When closing the code display, refresh and close
      setShowCode(false);
      setGeneratedCode(null);
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {!showCode ? (
          <>
            <DialogHeader>
              <DialogTitle>Create Client Code</DialogTitle>
              <DialogDescription>
                Generate a new client code and create a new project. You'll be able to view the code once after creation.
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
                  {loading ? "Creating..." : "Create Code"}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Client Code Created</DialogTitle>
              <DialogDescription>
                Copy this code now. You won't be able to view it again after closing this dialog.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between gap-4">
                  <code className="text-2xl font-mono font-bold tracking-wider flex-1 text-center">
                    {generatedCode}
                  </code>
                  <Button
                    onClick={handleCopyCode}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted text-center">
                Share this code with clients who need access to the new project.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
