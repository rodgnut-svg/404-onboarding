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
import { regenerateProjectCode } from "@/app/actions/admin";
import Link from "next/link";
import { Copy, Check, RotateCw, ExternalLink } from "lucide-react";

interface Project {
  id: string;
  name: string;
  status: string;
  client_code_active: boolean | null;
  created_at: string;
}

interface ProjectTileProps {
  project: Project;
  onUpdate: () => void;
}

export function ProjectTile({ project, onUpdate }: ProjectTileProps) {
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const result = await regenerateProjectCode(project.id);
      if ("error" in result) {
        alert(result.error);
        setRegenerateConfirmOpen(false);
      } else {
        setGeneratedCode(result.code);
        setCodeDialogOpen(true);
        setRegenerateConfirmOpen(false);
        onUpdate();
      }
    } catch (err) {
      console.error("[ProjectTile] Error regenerating code:", err);
      alert(err instanceof Error ? err.message : "Failed to regenerate code");
      setRegenerateConfirmOpen(false);
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (generatedCode) {
      try {
        await navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("[ProjectTile] Error copying code:", err);
      }
    }
  };

  const createdDate = new Date(project.created_at).toLocaleDateString("en-US");

  return (
    <>
      <Card>
        <CardHeader style={{ padding: "1.5rem" }}>
          <CardTitle className="text-base font-semibold">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="truncate">{project.name}</div>
                <div className="text-sm font-normal text-muted-foreground mt-1">
                  Created: {createdDate}
                </div>
              </div>
              <Badge variant={project.client_code_active ? "default" : "secondary"}>
                {project.client_code_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent style={{ padding: "0 1.5rem 1.5rem 1.5rem" }}>
          <div className="flex flex-wrap gap-2">
            <Link href={`/portal/${project.id}`}>
              <Button variant="secondary" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Project
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRegenerateConfirmOpen(true)}
              disabled={regenerating}
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Regenerate Code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog open={regenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Client Code</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new code for this project. The old code will no longer work. 
              You'll be able to view the new code once after regeneration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegenerate}
              disabled={regenerating}
            >
              {regenerating ? "Regenerating..." : "Regenerate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generated Code Display Dialog */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent className="max-w-md">
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
    </>
  );
}
