"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogoutButton } from "./logout-button";

interface NavItem {
  label: string;
  href: string;
}

interface TopBarProps {
  navItems?: NavItem[];
  projectId?: string;
}

export function TopBar({ navItems = [], projectId }: TopBarProps) {
  const pathname = usePathname();

  const fullNavItems = projectId
    ? navItems.map((item) => ({
        ...item,
        href: item.href.replace("[projectId]", projectId),
      }))
    : navItems;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur-sm">
      <div className="max-w-[1200px] mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/portal" className="text-xl font-sans font-bold text-foreground tracking-tight">
          404 FOUND
        </Link>
        <div className="flex items-center gap-6">
          {fullNavItems.length > 0 && (
            <nav className="hidden md:flex items-center gap-1">
              {fullNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-9 rounded-[10px]",
                        isActive && "font-semibold bg-secondary"
                      )}
                    >
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          )}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

