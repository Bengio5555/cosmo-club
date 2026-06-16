"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlobalSearch } from "@/components/dashboard/GlobalSearch";
import logoSrc from "@/public/brand/cosmo-logo.avif";

/**
 * Sticky app header. Mobile: brand + theme toggle + icon-only logout
 * sit tight against the safe-area inset so the bar tucks under the
 * status bar / notch when installed as a PWA. Desktop: shows the
 * user email and a labelled logout button.
 */
export function Topbar({ email }: { email: string | null }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/dashboard/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 md:px-6">
      <div className="flex h-12 items-center justify-between pt-[env(safe-area-inset-top)]">
        {/* Mobile brand */}
        <Link
          href="/dashboard"
          aria-label="Cosmo Club — tableau de bord"
          className="flex items-center gap-2 md:hidden"
        >
          <Image
            src={logoSrc}
            alt="Cosmo Club"
            width={Math.round((304 / 106) * 22)}
            height={22}
            priority
            unoptimized
            className="h-[22px] w-auto select-none"
          />
          <span className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-500">
            Admin
          </span>
        </Link>

        <div className="hidden flex-1 md:block" />

        <div className="flex items-center gap-2 md:gap-3">
          <GlobalSearch />
          {email && (
            <span className="hidden text-xs text-slate-500 dark:text-slate-500 lg:inline">
              {email}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Déconnexion"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white md:h-8 md:w-auto md:gap-1.5 md:rounded-md md:px-2.5 md:py-1 md:text-xs"
          >
            <LogOut className="h-4 w-4 md:h-3.5 md:w-3.5" />
            <span className="hidden md:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}
