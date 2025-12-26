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
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-6">
        <Link href="/portal" className="text-xl font-sans font-bold text-slate-900 tracking-tight">
          404 FOUND
        </Link>
        <div className="flex items-center gap-6">
          {fullNavItems.length > 0 && (
            <nav className="hidden md:flex items-center gap-2">
              {fullNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <span
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                        isActive
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      )}
                    >
                      {item.label}
                    </span>
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

