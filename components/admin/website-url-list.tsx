"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2 } from "lucide-react";
import { deleteWebsiteUrl } from "@/app/actions/website-urls";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface WebsiteUrl {
  id: string;
  url: string;
  label: string | null;
  created_at: string;
}

interface WebsiteUrlListProps {
  urls: WebsiteUrl[];
  projectId: string;
}

export function WebsiteUrlList({ urls, projectId }: WebsiteUrlListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (urlId: string) => {
    if (!confirm("Are you sure you want to remove this website URL?")) {
      return;
    }

    setDeletingId(urlId);
    try {
      const result = await deleteWebsiteUrl(projectId, urlId);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete URL");
    } finally {
      setDeletingId(null);
    }
  };

  if (urls.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No website URLs added yet</p>
    );
  }

  return (
    <div className="space-y-2">
      {urls.map((url) => (
        <div
          key={url.id}
          className="flex items-center justify-between p-3 border border-border rounded-lg"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <a
                href={url.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline truncate"
              >
                {url.label || url.url}
              </a>
              <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{url.url}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(url.id)}
            disabled={deletingId === url.id}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
