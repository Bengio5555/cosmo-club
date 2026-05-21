"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database";

type LeadStatus = Database["public"]["Enums"]["lead_status"];

const TABS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "nouveau", label: "Nouveau" },
  { value: "contacte", label: "Contacté" },
  { value: "devis_envoye", label: "Devis envoyé" },
  { value: "gagne", label: "Gagné" },
  { value: "perdu", label: "Perdu" },
];

// Tab pill coloring per status — same palette as the StatusBadge so
// the active tab matches the badge of the rows it surfaces below.
const ACTIVE_TONE: Record<LeadStatus | "all", string> = {
  all: "bg-neutral-800 text-white",
  nouveau: "bg-blue-500/20 text-blue-200",
  contacte: "bg-amber-500/20 text-amber-200",
  devis_envoye: "bg-violet-500/20 text-violet-200",
  gagne: "bg-emerald-500/25 text-emerald-200",
  perdu: "bg-neutral-700/40 text-neutral-300",
};

/**
 * Client-side tab switcher. Previous version used <Link> which felt
 * sluggish (full SSR re-render with no visual feedback). Now we:
 *   - Use router.replace inside useTransition so the navigation is
 *     non-blocking and we can show a loading indicator
 *   - Optimistically highlight the clicked tab before SSR responds,
 *     so the UI feels instant even when the DB query is slow
 */
export function LeadsStatusTabs({
  activeStatus,
  counts,
  preserve,
}: {
  activeStatus: string;
  counts: Record<LeadStatus | "all", number>;
  preserve: { q?: string; type?: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Optimistic state: tracks the tab the user just clicked so we can
  // highlight it before the server returns. Cleared when activeStatus
  // catches up (via the parent re-render).
  const [optimistic, setOptimistic] = useState<string | null>(null);

  // The current "rendered" active value: optimistic first, then real.
  const currentActive = optimistic ?? activeStatus;

  function go(value: LeadStatus | "all") {
    const targetStatus = value === "all" ? "" : value;
    if (targetStatus === activeStatus) return;
    setOptimistic(targetStatus);
    const params = new URLSearchParams();
    if (targetStatus) params.set("status", targetStatus);
    if (preserve.q) params.set("q", preserve.q);
    if (preserve.type) params.set("type", preserve.type);
    const qs = params.toString();
    const href = qs ? `/dashboard/leads?${qs}` : "/dashboard/leads";
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  // Once the parent re-render lands with the new activeStatus, clear
  // the optimistic override so future clicks aren't stuck on it.
  if (optimistic !== null && optimistic === activeStatus) {
    setOptimistic(null);
  }

  return (
    <div
      className={
        "-mx-1 flex flex-wrap gap-1 rounded-lg border border-neutral-800 bg-neutral-950/60 p-1 transition-opacity " +
        (pending ? "opacity-70" : "")
      }
      aria-busy={pending}
    >
      {TABS.map((t) => {
        const isActive =
          t.value === "all" ? currentActive === "" : currentActive === t.value;
        const tone = isActive
          ? ACTIVE_TONE[t.value]
          : "text-neutral-400 hover:bg-neutral-900 hover:text-white";
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => go(t.value)}
            disabled={pending}
            className={
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-wait " +
              tone
            }
          >
            <span>{t.label}</span>
            <span
              className={
                "rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums " +
                (isActive
                  ? "bg-black/30 text-current"
                  : "bg-neutral-900 text-neutral-500")
              }
            >
              {counts[t.value] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
