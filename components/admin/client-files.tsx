"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSignedDownloadUrl } from "@/app/actions/files";
import { Download } from "lucide-react";

interface ClientFilesProps {
  files: Array<{
    id: string;
    file_name: string;
    size: number;
    mime_type: string | null;
    created_at: string;
  }>;
  projectId: string;
}

export function ClientFiles({ files, projectId }: ClientFilesProps) {
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const handleDownload = async (fileId: string) => {
    if (!projectId) return;
    
    setDownloadingFileId(fileId);
    try {
      const result = await getSignedDownloadUrl(projectId, fileId);
      if (result.url) {
        window.open(result.url, "_blank");
      } else {
        alert(result.error || "Failed to generate download URL");
      }
    } catch (error) {
      alert("Failed to download file");
    } finally {
      setDownloadingFileId(null);
    }
  };

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No files uploaded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {files.map((file) => (
        <Card key={file.id}>
          <CardContent style={{ padding: "1rem 1.5rem" }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-base mb-0.5 truncate">{file.file_name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.created_at).toLocaleDateString("en-US")}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownload(file.id)}
                  disabled={downloadingFileId === file.id}
                >
                  {downloadingFileId === file.id ? (
                    "Downloading..."
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
