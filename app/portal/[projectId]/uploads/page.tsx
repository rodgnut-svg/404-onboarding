"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getFiles, uploadFile } from "@/app/actions/files";

interface UploadsPageProps {
  params: Promise<{ projectId: string }>;
}

export default function UploadsPage({ params }: UploadsPageProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>("");
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId);
      loadFiles(p.projectId);
    });
  }, [params]);

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
    } else {
      alert(result.error || "Upload failed");
    }
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
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                onChange={handleUpload}
                disabled={uploading}
              />
            </div>
            {uploading && <p className="text-sm text-muted">Uploading...</p>}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="text-2xl font-serif font-semibold mb-4">Uploaded Files</h2>
        {files.length === 0 ? (
          <p className="text-muted">No files uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <Card key={file.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{file.file_name}</p>
                      <p className="text-sm text-muted">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

