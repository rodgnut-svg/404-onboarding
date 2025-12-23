"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { getSignedDownloadUrl } from "@/app/actions/files";

interface Contract {
  id: string;
  file_name: string;
  created_at: string;
  size?: number;
}

interface ContractListProps {
  contracts: Contract[];
  projectId: string;
}

export function ContractList({ contracts, projectId }: ContractListProps) {
  const handleDownload = async (contractId: string, fileName: string) => {
    try {
      const result = await getSignedDownloadUrl(projectId, contractId);
      if (result.url) {
        const link = document.createElement("a");
        link.href = result.url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Failed to download contract:", error);
    }
  };

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">
            No contracts available yet. Your agency will upload contracts here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {contracts.map((contract) => (
        <Card key={contract.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base font-semibold">
                    {contract.file_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Uploaded {new Date(contract.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {contract.size && ` • ${(contract.size / 1024).toFixed(1)} KB`}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(contract.id, contract.file_name)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
