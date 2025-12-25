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
    return <p className="text-muted-foreground text-base py-2">No projects yet</p>;
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => {
        const progress = progressMap.get(project.id) || 0;
        const progressPercent = (progress / 5) * 100;

        return (
          <div key={project.id} className="border border-border rounded-[12px] p-5 hover:shadow-card transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-base">{project.name}</h3>
              <span className="text-sm text-muted-foreground capitalize">{project.status}</span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <code className="text-sm bg-secondary px-3 py-1.5 rounded-[8px] font-mono">{project.client_code}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(project.client_code)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="w-full bg-[#f0f0f0] rounded-full h-[6px] mb-2">
              <div
                className="bg-primary h-[6px] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{progress}/5 steps complete</p>
          </div>
        );
      })}
    </div>
  );
}

