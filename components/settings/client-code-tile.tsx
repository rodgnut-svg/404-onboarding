"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { 
  regenerateClientCode, 
  deleteClientCode, 
  toggleClientCodeActive 
} from "@/app/actions/client-codes";
import { Copy, Check, RotateCw, Trash2, Edit2, Power } from "lucide-react";
import { EditClientCodeDialog } from "./edit-client-code-dialog";

interface ClientCode {
  id: string;
  label: string;
  client_name: string | null;
  client_email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface ClientCodeTileProps {
  code: ClientCode;
  onUpdate: () => void;
}

export function ClientCodeTile({ code, onUpdate }: ClientCodeTileProps) {
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const handleRegenerate = async () => {
    setRegenerateConfirmOpen(false);
    setLoading(true);
    setError(null);
    try {
      const result = await regenerateClientCode(code.id);
      setGeneratedCode(result.code);
      setCodeDialogOpen(true);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate code");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteConfirmOpen(false);
    setLoading(true);
    setError(null);
    try {
      await deleteClientCode(code.id);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete code");
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    setToggling(true);
    setError(null);
    try {
      await toggleClientCodeActive(code.id, !code.is_active);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setToggling(false);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  return (
    <>
      <Card>
        <CardHeader style={{ padding: "1rem 1.5rem" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-base font-semibold truncate">
                  {code.label}
                </CardTitle>
                <Badge className={code.is_active ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}>
                  {code.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {code.client_name && (
                <p className="text-sm text-muted mb-1">
                  <strong>Client:</strong> {code.client_name}
                </p>
              )}
              {code.client_email && (
                <p className="text-sm text-muted mb-1">
                  <strong>Email:</strong> {code.client_email}
                </p>
              )}
              {code.notes && (
                <p className="text-sm text-muted mt-2 line-clamp-2">
                  {code.notes}
                </p>
              )}
              <p className="text-xs text-muted mt-2">
                Created: {formatDate(code.created_at)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent style={{ padding: "0 1.5rem 1.5rem 1.5rem" }}>
          {error && (
            <div className="mb-3 p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
              disabled={loading || toggling}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRegenerateConfirmOpen(true)}
              disabled={loading || toggling}
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleActive}
              disabled={loading || toggling}
            >
              <Power className="w-4 h-4 mr-2" />
              {code.is_active ? "Deactivate" : "Activate"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={loading || toggling}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditClientCodeDialog
        code={code}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={onUpdate}
      />

      {/* Regenerated Code Display Dialog */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client Code Regenerated</DialogTitle>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client Code?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting this client code will permanently remove it. Users who have not yet joined will
              no longer be able to use this code to access the project.
              <br />
              <br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
