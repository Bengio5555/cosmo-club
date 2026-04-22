"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function Topbar({ email }: { email: string | null }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/dashboard/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-neutral-800 bg-neutral-950/90 px-4 backdrop-blur md:px-6">
      {/* Mobile brand */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-[13px] font-semibold text-white md:hidden"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[color:var(--color-grenat)] text-[10px] font-bold text-[color:var(--color-bone)]">
          CC
        </span>
        Cosmo Club Admin
      </Link>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        {email && (
          <span className="hidden text-xs text-neutral-500 md:inline">
            {email}
          </span>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          Déconnexion
        </button>
      </div>
    </header>
  );
}
