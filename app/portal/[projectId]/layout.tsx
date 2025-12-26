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
    // Only show Onboarding for non-admin users (clients)
    ...(member?.role !== "agency_admin" ? [{ label: "Onboarding", href: `/portal/[projectId]/onboarding` }] : []),
    { 
      label: member?.role === "agency_admin" ? "Clients" : "Uploads", 
      href: `/portal/[projectId]/uploads` 
    },
    { label: "Tickets", href: `/portal/[projectId]/tickets` },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar navItems={navItems} projectId={projectId} />
      <main className="max-w-6xl mx-auto px-6 py-6 md:py-8">{children}</main>
    </div>
  );
}

