"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createProject } from "@/app/actions/admin";

interface CreateProjectFormProps {
  agencyId: string;
}

export function CreateProjectForm({ agencyId }: CreateProjectFormProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    formData.append("agency_id", agencyId);
    const result = await createProject(formData);
    setLoading(false);

    if (result.success && result.clientCode) {
      alert(`Project created! Client Code: ${result.clientCode}`);
      window.location.reload();
    } else {
      alert(result.error || "Failed to create project");
    }
  };

  return (
    <form action={handleSubmit}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Project Name</Label>
          <Input id="name" name="name" required disabled={loading} />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </form>
  );
}

