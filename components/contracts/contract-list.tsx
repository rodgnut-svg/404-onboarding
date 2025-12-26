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
      <p className="text-sm text-slate-500">
        No contracts available yet. Your agency will upload contracts here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {contracts.map((contract) => (
        <div
          key={contract.id}
          className="rounded-xl border border-slate-200/70 bg-white/70 hover:bg-white transition flex items-center justify-between gap-3 px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">
                {contract.file_name}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(contract.created_at).toLocaleDateString("en-US", {
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
            className="flex-shrink-0"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      ))}
    </div>
  );
}
