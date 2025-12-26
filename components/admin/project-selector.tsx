"use client";

import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { getAllAgencyProjects } from "@/app/actions/admin";

interface Project {
  id: string;
  name: string;
}

interface ProjectSelectorProps {
  currentProjectId: string;
  currentProjectName: string;
}

export function ProjectSelector({ currentProjectId, currentProjectName }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectList = await getAllAgencyProjects();
        setProjects(projectList || []);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleProjectSwitch = async (projectId: string, projectName: string) => {
    if (projectId === currentProjectId) return;

    setSwitching(true);
    try {
      // Use the API route to set the cookie and redirect
      window.location.href = `/api/set-active-project?projectId=${projectId}&redirectTo=/portal/${projectId}`;
    } catch (error) {
      console.error("Error switching project:", error);
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <Button variant="outline" disabled className="min-w-[200px]">
        Loading...
      </Button>
    );
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="min-w-[200px] justify-between"
          disabled={switching}
        >
          <span className="truncate">{currentProjectName}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => handleProjectSwitch(project.id, project.name)}
            className={project.id === currentProjectId ? "bg-secondary font-semibold" : ""}
            disabled={switching}
          >
            {project.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

