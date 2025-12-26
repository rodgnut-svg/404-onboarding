"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const [initial, setInitial] = useState<string>("U");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        
        // Get authenticated user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setInitial("U");
          setLoading(false);
          return;
        }

        // Fetch user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .single();

        // Get initial letter: priority: full_name > email > "U"
        if (profile?.full_name?.trim()) {
          setInitial(profile.full_name.trim()[0]);
        } else if (profile?.email?.trim()) {
          setInitial(profile.email.trim()[0]);
        } else if (user.email?.trim()) {
          setInitial(user.email.trim()[0]);
        } else {
          setInitial("U");
        }
      } catch (error) {
        console.error("[LogoutButton] Error fetching profile:", error);
        setInitial("U");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    // Call logout API route to clear cookies server-side
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100/80 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2 transition-colors cursor-pointer group"
          aria-label="User menu"
        >
          <Avatar initial={initial} size="default" variant="default" />
          <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer focus:bg-accent"
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
