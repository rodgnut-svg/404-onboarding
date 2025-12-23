import { requireProjectMember } from "@/lib/auth";
import { TopBar } from "@/components/layout/top-bar";
import { ReactNode } from "react";

interface PortalLayoutProps {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}

export default async function PortalLayout({
  children,
  params,
}: PortalLayoutProps) {
  const { projectId } = await params;
  const { member } = await requireProjectMember(projectId);

  const navItems = [
    { label: "Dashboard", href: `/portal/[projectId]` },
    { label: "Onboarding", href: `/portal/[projectId]/onboarding` },
    { 
      label: member?.role === "agency_admin" ? "Clients" : "Uploads", 
      href: `/portal/[projectId]/uploads` 
    },
    { label: "Tickets", href: `/portal/[projectId]/tickets` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopBar navItems={navItems} projectId={projectId} />
      <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 md:py-12">{children}</main>
    </div>
  );
}

