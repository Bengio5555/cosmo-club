"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { Search } from "lucide-react";

type Filters = { status: string; q: string; type: string };

export function LeadsToolbar({ initial }: { initial: Filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [filters, setFilters] = useState<Filters>(initial);

  // Sync URL when filters change (debounced for the search input).
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.q) params.set("q", filters.q);
      if (filters.type) params.set("type", filters.type);
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    }, 200);
    return () => clearTimeout(t);
  }, [filters, router, pathname]);

  function reset() {
    setFilters({ status: "", q: "", type: "" });
  }

  const hasAny = filters.status || filters.q || filters.type;

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
        <input
          type="search"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          placeholder="Nom, email, entreprise, message…"
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 py-2 pl-9 pr-3 text-sm text-white placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
        />
      </div>

      <select
        value={filters.status}
        onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-[color:var(--color-grenat)] focus:outline-none"
      >
        <option value="">Tous statuts</option>
        <option value="nouveau">Nouveau</option>
        <option value="contacte">Contacté</option>
        <option value="devis_envoye">Devis envoyé</option>
        <option value="gagne">Gagné</option>
        <option value="perdu">Perdu</option>
      </select>

      <select
        value={filters.type}
        onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-[color:var(--color-grenat)] focus:outline-none"
      >
        <option value="">Tous types</option>
        <option value="mariage">Mariage</option>
        <option value="corporate">Corporate</option>
        <option value="prive">Privé</option>
        <option value="defile">Défilé</option>
        <option value="lancement">Lancement</option>
        <option value="autre">Autre</option>
      </select>

      {hasAny && (
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
