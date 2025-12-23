"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllAgencyProjects } from "@/app/actions/admin";
import { ProjectTile } from "./project-tile";
import { CreateClientCodeDialog } from "./create-client-code-dialog";
import { Plus } from "lucide-react";

interface Project {
  id: string;
  name: string;
  status: string;
  client_code_active: boolean | null;
  created_at: string;
}

interface ClientCodeSettingsProps {
  projects: Project[];
}

export function ClientCodeSettings({
  projects: initialProjects,
}: ClientCodeSettingsProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const refreshProjects = async () => {
    setLoading(true);
    try {
      const result = await getAllAgencyProjects();
      setProjects(result as Project[]);
    } catch (err) {
      console.error("[ClientCodeSettings] Error refreshing projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Projects & Client Codes</CardTitle>
              <CardDescription>
                Manage projects and their client codes. Creating a new code will create a new project with a unique code.
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} className="h-12">
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted mb-4">No projects have been created yet.</p>
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create First Project
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectTile
                  key={project.id}
                  project={project}
                  onUpdate={refreshProjects}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateClientCodeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={refreshProjects}
      />
    </>
  );
}
