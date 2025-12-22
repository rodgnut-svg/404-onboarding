"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { acceptClientCode } from "@/app/actions/client-codes";

export function JoinProjectForm() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log("[JoinProjectForm] Submitting code:", code);
      const result = await acceptClientCode(code);
      console.log("[JoinProjectForm] Success, got projectId:", result.projectId);
      
      if (!result?.projectId) {
        throw new Error("No project ID returned");
      }
      
      // Redirect to the project using window.location for a hard redirect
      // This ensures the page fully reloads and the user sees the new project
      window.location.href = `/portal/${result.projectId}`;
    } catch (err) {
      console.error("[JoinProjectForm] Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Invalid client code";
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-uppercase and trim spaces
    const value = e.target.value.toUpperCase().replace(/\s/g, "");
    setCode(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join Project</CardTitle>
        <CardDescription>
          Enter the client code provided by your agency to join a project
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              value={code}
              onChange={handleCodeChange}
              placeholder="Enter client code"
              className="w-full font-mono text-lg tracking-wider h-12"
              maxLength={12}
              autoFocus
              required
            />
          </div>
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full h-12" disabled={loading || !code.trim()}>
            {loading ? "Joining..." : "Join Project"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
