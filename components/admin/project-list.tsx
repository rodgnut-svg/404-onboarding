"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

interface Project {
  id: string;
  name: string;
  client_code: string;
  status: string;
  created_at: string;
}

interface ProjectListProps {
  projects: Project[];
  progressMap: Map<string, number>;
}

export function ProjectList({ projects, progressMap }: ProjectListProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Client code copied!");
  };

  if (projects.length === 0) {
    return <p className="text-muted">No projects yet</p>;
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => {
        const progress = progressMap.get(project.id) || 0;
        const progressPercent = (progress / 5) * 100;

        return (
          <div key={project.id} className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{project.name}</h3>
              <span className="text-sm text-muted capitalize">{project.status}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <code className="text-sm bg-muted/20 px-2 py-1 rounded">{project.client_code}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(project.client_code)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="w-full bg-muted/20 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-1">{progress}/5 steps complete</p>
          </div>
        );
      })}
    </div>
  );
}

