"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { regenerateClientCode, toggleClientCodeStatus } from "@/app/actions/client-codes";
import { Copy, Check, RotateCw } from "lucide-react";

interface ClientCodeSettingsProps {
  projectId: string;
  hasClientCode: boolean;
  isActive: boolean;
  createdAt: string | null;
  lastRotatedAt: string | null;
}

export function ClientCodeSettings({
  projectId,
  hasClientCode,
  isActive,
  createdAt,
  lastRotatedAt,
}: ClientCodeSettingsProps) {
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("[ClientCodeSettings] Generating code for project:", projectId);
      const result = await regenerateClientCode(projectId);
      console.log("[ClientCodeSettings] Code generated successfully");
      setGeneratedCode(result.code);
      setCodeDialogOpen(true);
    } catch (err) {
      console.error("[ClientCodeSettings] Error generating code:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate code";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerateConfirmOpen(false);
    setLoading(true);
    setError(null);
    try {
      const result = await regenerateClientCode(projectId);
      setGeneratedCode(result.code);
      setCodeDialogOpen(true);
      // Refresh page after a short delay to show updated timestamps
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate code");
    } finally {
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

  const handleToggleActive = async () => {
    setDeactivating(true);
    setError(null);
    try {
      await toggleClientCodeStatus(projectId, !isActive);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setDeactivating(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Client Code</CardTitle>
          <CardDescription>
            Generate a shareable code that allows clients to join this project.
            Codes are stored securely (hashed) and can only be viewed once after generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}

          {!hasClientCode ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                No client code has been generated yet. Generate one to allow clients to join this
                project.
              </p>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? "Generating..." : "Generate Client Code"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <span
                    className={`text-sm font-semibold ${isActive ? "text-green-600" : "text-gray-500"}`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Created</span>
                  <span className="text-sm">{formatDate(createdAt)}</span>
                </div>
                {lastRotatedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Last Rotated</span>
                    <span className="text-sm">{formatDate(lastRotatedAt)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setRegenerateConfirmOpen(true)}
                  disabled={loading}
                  variant="outline"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Regenerate Code
                </Button>
                <Button
                  onClick={handleToggleActive}
                  disabled={deactivating}
                  variant={isActive ? "outline" : "secondary"}
                >
                  {isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted">
                  <strong>Note:</strong> Regenerating a code will invalidate the old code. Make
                  sure to share the new code with clients who need access.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Code Display Dialog */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client Code Generated</DialogTitle>
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
              Share this code with clients who need access to this project.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog open={regenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Client Code?</AlertDialogTitle>
            <AlertDialogDescription>
              Regenerating the client code will invalidate the current code. Users who have not yet
              joined will need the new code to access this project.
              <br />
              <br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate}>Regenerate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
