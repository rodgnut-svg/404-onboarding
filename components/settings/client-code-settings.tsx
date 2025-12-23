"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getClientCodes } from "@/app/actions/client-codes";
import { ClientCodeTile } from "./client-code-tile";
import { CreateClientCodeDialog } from "./create-client-code-dialog";
import { Plus } from "lucide-react";

interface ClientCode {
  id: string;
  code_hash: string;
  label: string;
  client_name: string | null;
  client_email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

interface ClientCodeSettingsProps {
  projectId: string;
  clientCodes: ClientCode[];
}

export function ClientCodeSettings({
  projectId,
  clientCodes: initialClientCodes,
}: ClientCodeSettingsProps) {
  const [clientCodes, setClientCodes] = useState<ClientCode[]>(initialClientCodes);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const refreshCodes = async () => {
    setLoading(true);
    try {
      const result = await getClientCodes(projectId);
      setClientCodes(result.codes);
    } catch (err) {
      console.error("[ClientCodeSettings] Error refreshing codes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setClientCodes(initialClientCodes);
  }, [initialClientCodes]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Client Codes</CardTitle>
              <CardDescription>
                Manage client codes that allow clients to join this project. Each code can be customized with client details.
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
          ) : clientCodes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted mb-4">No client codes have been created yet.</p>
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create First Client Code
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clientCodes.map((code) => (
                <ClientCodeTile
                  key={code.id}
                  code={code}
                  onUpdate={refreshCodes}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateClientCodeDialog
        projectId={projectId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={refreshCodes}
      />
    </>
  );
}
