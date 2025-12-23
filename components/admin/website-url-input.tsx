"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addWebsiteUrl } from "@/app/actions/website-urls";
import { useRouter } from "next/navigation";

interface WebsiteUrlInputProps {
  projectId: string;
}

export function WebsiteUrlInput({ projectId }: WebsiteUrlInputProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await addWebsiteUrl(projectId, url, label || undefined);
      if (result.error) {
        setError(result.error);
      } else {
        setUrl("");
        setLabel("");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add URL");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url">Website URL</Label>
        <Input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="label">Label (optional)</Label>
        <Input
          id="label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Production, Staging, Preview"
          disabled={loading}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <Button type="submit" disabled={loading || !url.trim()}>
        {loading ? "Adding..." : "Add Website URL"}
      </Button>
    </form>
  );
}
