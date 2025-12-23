"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { uploadContract } from "@/app/actions/contracts";
import { useRouter } from "next/navigation";

interface ContractUploadProps {
  projectId: string;
}

export function ContractUpload({ projectId }: ContractUploadProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed");
      return;
    }

    setError(null);
    setSuccess(false);
    setUploading(true);

    try {
      const result = await uploadContract(projectId, file);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = "";
        // Refresh the page to show new contract after a short delay
        setTimeout(() => {
          router.refresh();
        }, 500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload contract");
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
      <Button
        type="button"
        variant="default"
        disabled={uploading}
        onClick={handleButtonClick}
      >
        {uploading ? "Uploading..." : "Upload Contract PDF"}
      </Button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600">Contract uploaded successfully!</p>
      )}
    </div>
  );
}
