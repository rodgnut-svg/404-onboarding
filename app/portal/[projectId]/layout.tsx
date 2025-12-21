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
  await requireProjectMember(projectId);

  const navItems = [
    { label: "Dashboard", href: `/portal/[projectId]` },
    { label: "Onboarding", href: `/portal/[projectId]/onboarding` },
    { label: "Uploads", href: `/portal/[projectId]/uploads` },
    { label: "Approvals", href: `/portal/[projectId]/approvals` },
    { label: "Timeline", href: `/portal/[projectId]/timeline` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopBar navItems={navItems} projectId={projectId} />
      <main className="container mx-auto px-6 py-12">{children}</main>
    </div>
  );
}

