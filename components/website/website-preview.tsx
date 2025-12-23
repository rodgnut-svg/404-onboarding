"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

interface WebsiteUrl {
  id: string;
  url: string;
  label: string | null;
}

interface WebsitePreviewProps {
  urls: WebsiteUrl[];
}

export function WebsitePreview({ urls }: WebsitePreviewProps) {
  const [selectedUrl, setSelectedUrl] = useState<WebsiteUrl | null>(urls[0] || null);

  if (urls.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">
            No website URLs available yet. Your agency will add them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* URL selector tabs */}
      {urls.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {urls.map((url) => {
            let displayLabel = url.label;
            if (!displayLabel) {
              try {
                displayLabel = new URL(url.url).hostname;
              } catch {
                displayLabel = url.url;
              }
            }
            return (
              <Button
                key={url.id}
                variant={selectedUrl?.id === url.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedUrl(url)}
              >
                {displayLabel}
              </Button>
            );
          })}
        </div>
      )}

      {/* Iframe preview */}
      {selectedUrl && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selectedUrl.label || "Live Site Preview"}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={selectedUrl.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={selectedUrl.url}
                className="absolute top-0 left-0 w-full h-full border border-border rounded-lg"
                style={{ minHeight: "400px" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
