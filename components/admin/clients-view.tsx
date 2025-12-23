import { PageHeader } from "@/components/layout/page-header";
import { ClientTile } from "./client-tile";
import { AgencyClient } from "@/app/actions/admin";

interface ClientsViewProps {
  clients: AgencyClient[];
}

export function ClientsView({ clients }: ClientsViewProps) {
  return (
    <div>
      <PageHeader
        title="Clients"
        description="View all clients across your agency projects"
      />

      {clients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted">No clients found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <ClientTile key={`${client.client_id}-${client.project_id}`} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
