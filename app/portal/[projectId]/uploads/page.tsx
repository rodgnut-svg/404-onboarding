"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { getFiles, uploadFile, getSignedDownloadUrl, deleteFile, getCurrentUserRole } from "@/app/actions/files";
import { debugWhoAmI } from "@/app/actions/auth";
import { Download, Trash2 } from "lucide-react";

interface UploadsPageProps {
  params: Promise<{ projectId: string }>;
}

interface File {
  id: string;
  file_name: string;
  size: number;
  created_at: string;
  uploader_id: string;
}

export default function UploadsPage({ params }: UploadsPageProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{ userId: string | null; email: string | null; error: string | null } | null>(null);

  useEffect(() => {
    params.then(async (p) => {
      setProjectId(p.projectId);
      await Promise.all([loadFiles(p.projectId), loadUserRole(p.projectId), loadDebugInfo()]);
    });
  }, [params]);

  const loadDebugInfo = async () => {
    const info = await debugWhoAmI();
    setDebugInfo(info);
  };

  const loadUserRole = async (pid: string) => {
    const result = await getCurrentUserRole(pid);
    if (result.role) {
      setUserRole(result.role);
      setUserId(result.userId);
    }
  };

  const loadFiles = async (pid: string) => {
    const result = await getFiles(pid);
    if (result.data) {
      setFiles(result.data);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    setUploading(true);
    const result = await uploadFile(projectId, file, "general");
    setUploading(false);

    if (result.success) {
      await loadFiles(projectId);
      // Reset file input
      e.target.value = "";
    } else {
      alert(result.error || "Upload failed");
    }
  };

  const handleDownload = async (fileId: string) => {
    if (!projectId) return;
    const result = await getSignedDownloadUrl(projectId, fileId);
    if (result.url) {
      window.open(result.url, "_blank");
    } else {
      alert(result.error || "Failed to generate download URL");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteFileId || !projectId) return;

    setDeleting(true);
    try {
      const result = await deleteFile(projectId, deleteFileId);
      
      if (result.ok) {
        // Remove file from UI state immediately for better UX
        setFiles((prev) => prev.filter((f) => f.id !== deleteFileId));
        // Also refresh from server to ensure consistency
        await loadFiles(projectId);
      } else {
        alert("Failed to delete file");
      }
    } catch (error) {
      // Handle thrown errors from deleteFile
      const errorMessage = error instanceof Error ? error.message : "Failed to delete file";
      alert(errorMessage);
    } finally {
      setDeleting(false);
      setDeleteFileId(null);
    }
  };

  const canDeleteFile = (file: File): boolean => {
    return userRole === "agency_admin" || file.uploader_id === userId;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <PageHeader
        title="File Uploads"
        description="Upload files for your project"
      />

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file" className="text-base font-medium">Select File</Label>
              <Input
                id="file"
                type="file"
                onChange={handleUpload}
                disabled={uploading}
                className="h-12"
              />
            </div>
            {uploading && <p className="text-sm text-muted">Uploading...</p>}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        <h2 className="font-sans font-semibold mb-6" style={{ fontSize: "1.5rem" }}>Uploaded Files</h2>
        {files.length === 0 ? (
          <p className="text-muted text-base">No files uploaded yet</p>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <Card key={file.id}>
                <CardContent style={{ padding: "1rem 1.5rem" }}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-base mb-0.5 truncate">{file.file_name}</p>
                      <p className="text-sm text-muted">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownload(file.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      {canDeleteFile(file) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteFileId(file.id)}
                          className="h-9 w-9"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteFileId} onOpenChange={(open) => !open && setDeleteFileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Debug info at bottom */}
      {debugInfo && (
        <div className="mt-8 pt-4 border-t text-xs text-muted-foreground">
          <p className="font-mono">
            Server Auth Debug: userId={debugInfo.userId || "null"}, email={debugInfo.email || "null"}
            {debugInfo.error && `, error=${debugInfo.error}`}
          </p>
        </div>
      )}
    </div>
  );
}

