"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Download, Trash2, File } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

interface UserUploadsViewProps {
  projectId: string;
}

interface File {
  id: string;
  file_name: string;
  size: number;
  created_at: string;
  uploader_id: string;
}

export function UserUploadsView({ projectId }: UserUploadsViewProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([loadFiles(projectId), loadUserRole(projectId)]);
  }, [projectId]);

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
    <div className="space-y-6">
      <PageHeader
        title="File Uploads"
        description="Upload files for your project"
      />

      {/* Upload Section - Gradient Panel */}
      <div className="rounded-2xl border border-slate-200/50 shadow-sm bg-gradient-to-br from-cyan-200/35 via-blue-200/25 to-violet-200/30 p-4 md:p-5">
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-sm p-5 md:p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Upload File</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file" className="text-base font-medium">Select File</Label>
              <div className="rounded-xl border border-slate-200/70 bg-white overflow-hidden h-12 flex items-center px-1">
                <Input
                  id="file"
                  type="file"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="h-full w-full border-0 rounded-xl px-2 py-0 flex items-center file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:hover:bg-blue-700 file:text-white file:px-4 file:py-2 file:text-sm file:font-medium file:cursor-pointer"
                  style={{ lineHeight: '48px' }}
                />
              </div>
            </div>
            {uploading && <p className="text-sm text-slate-500">Uploading...</p>}
          </div>
        </div>
      </div>

      {/* Uploaded Files Section */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Uploaded Files</h2>
        <Card className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 md:p-6">
          {files.length === 0 ? (
            <p className="text-sm text-slate-500">No files uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 hover:border-slate-300/70 hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-slate-900 truncate">{file.file_name}</p>
                        <p className="text-xs text-slate-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
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
                </div>
              ))}
            </div>
          )}
        </Card>
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
    </div>
  );
}
