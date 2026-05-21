import Link from "next/link";
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

export function LeadsStatusTabs({
  activeStatus,
  counts,
  preserve,
}: {
  activeStatus: string;
  counts: Record<LeadStatus | "all", number>;
  preserve: { q?: string; type?: string };
}) {
  // Helper to build hrefs that keep the search query + event type
  // filters alive when the user switches between tabs.
  function hrefFor(value: LeadStatus | "all") {
    const params = new URLSearchParams();
    if (value !== "all") params.set("status", value);
    if (preserve.q) params.set("q", preserve.q);
    if (preserve.type) params.set("type", preserve.type);
    const qs = params.toString();
    return qs ? `/dashboard/leads?${qs}` : "/dashboard/leads";
  }

  return (
    <div className="-mx-1 flex flex-wrap gap-1 rounded-lg border border-neutral-800 bg-neutral-950/60 p-1">
      {TABS.map((t) => {
        const isActive =
          t.value === "all" ? activeStatus === "" : activeStatus === t.value;
        const tone = isActive
          ? ACTIVE_TONE[t.value]
          : "text-neutral-400 hover:bg-neutral-900 hover:text-white";
        return (
          <Link
            key={t.value}
            href={hrefFor(t.value)}
            scroll={false}
            className={
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
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
          </Link>
        );
      })}
    </div>
  );
}
