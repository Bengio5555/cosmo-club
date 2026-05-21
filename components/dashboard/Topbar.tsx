"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, Moon, Sun } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/dashboard/ThemeProvider";
import logoSrc from "@/public/brand/cosmo-logo.avif";

export function Topbar({ email }: { email: string | null }) {
  const router = useRouter();
  const { theme, toggle } = useTheme();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/dashboard/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 md:px-6">
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

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        {email && (
          <span className="hidden text-xs text-slate-500 dark:text-slate-500 md:inline">
            {email}
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
        >
          {theme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          Déconnexion
        </button>
      </div>
    </header>
  );
}
