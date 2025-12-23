import { requireAgencyAdminForProject } from "@/lib/auth";
import { getClientDetails } from "@/app/actions/admin";
import { getContracts } from "@/app/actions/contracts";
import { getWebsiteUrls } from "@/app/actions/website-urls";
import { ClientDetailView } from "@/components/admin/client-detail-view";
import { redirect } from "next/navigation";

interface ClientDetailPageProps {
  params: Promise<{ projectId: string; clientId: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { projectId, clientId } = await params;
  
  // Verify user is agency admin for this project
  await requireAgencyAdminForProject(projectId);

  // Get client details
  const result = await getClientDetails(clientId, projectId);

  if ("error" in result) {
    redirect(`/portal/${projectId}/uploads`);
  }

  // Get contracts for this project
  const contractsResult = await getContracts(projectId);
  const contracts = contractsResult.data || [];

  // Get website URLs for this project
  const websiteUrlsResult = await getWebsiteUrls(projectId);
  const websiteUrls = websiteUrlsResult.data || [];

  return (
    <ClientDetailView 
      details={result} 
      projectId={projectId} 
      contracts={contracts}
      websiteUrls={websiteUrls}
    />
  );
}
