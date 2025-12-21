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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-6">
        <Link href="/portal" className="text-xl font-serif font-semibold">
          404 FOUND
        </Link>
        <div className="flex items-center gap-4">
          {fullNavItems.length > 0 && (
            <nav className="flex items-center gap-2">
              {fullNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "rounded-full",
                        isActive && "shadow-subtle"
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

