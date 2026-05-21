import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { LeadsToolbar } from "./LeadsToolbar";
import { LeadsStatusTabs } from "./LeadsStatusTabs";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EventTypeLabel } from "@/components/dashboard/EventTypeLabel";
import { formatDateFR } from "@/lib/format";

type Search = Promise<{
  status?: string;
  q?: string;
  type?: string;
}>;

export default async function LeadsPage({ searchParams }: { searchParams: Search }) {
  const { status, q, type } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select("id,status,contact_name,contact_email,company,event_type,event_date,guests_count,message,raw_payload,created_at")
    .order("created_at", { ascending: false });

  if (status && STATUS_VALUES.includes(status as LeadStatus)) {
    query = query.eq("status", status as LeadStatus);
  }
  if (type && TYPE_VALUES.includes(type as EventType)) {
    query = query.eq("event_type", type as EventType);
  }
  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`;
    // simple OR across key text fields
    query = query.or(
      `contact_name.ilike.${term},contact_email.ilike.${term},company.ilike.${term},message.ilike.${term}`,
    );
  }

  const { data: leads, error } = await query.limit(200);

  // Compteurs par statut pour les onglets de filtre rapide.
  // Une seule requête lit toute la table (~quelques centaines de
  // lignes au plus, donc négligeable) et on agrège côté JS.
  const { data: allStatuses } = await supabase
    .from("leads")
    .select("status");
  const counts: Record<LeadStatus | "all", number> = {
    all: allStatuses?.length ?? 0,
    nouveau: 0,
    contacte: 0,
    devis_envoye: 0,
    gagne: 0,
    perdu: 0,
  };
  for (const row of allStatuses ?? []) {
    counts[row.status as LeadStatus] += 1;
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">Demandes</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Leads entrants depuis le site (formulaire <code className="text-neutral-500">/contact</code>).
          </p>
        </div>
      </header>

      <LeadsStatusTabs
        activeStatus={status ?? ""}
        counts={counts}
        preserve={{ q, type }}
      />

      <div className="mt-3">
        <LeadsToolbar initial={{ status: status ?? "", q: q ?? "", type: type ?? "" }} />
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
          Erreur de chargement : {error.message}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60">
        {leads && leads.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-800 text-[10px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2.5 font-medium md:px-4">Contact</th>
                <th className="px-3 py-2.5 font-medium md:px-4">Événement</th>
                <th className="px-3 py-2.5 font-medium md:px-4">Date</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">Invités</th>
                <th className="px-3 py-2.5 font-medium md:px-4">Statut</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">Reçu</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr
                  key={l.id}
                  className="border-t border-neutral-900 transition-colors hover:bg-neutral-900"
                >
                  <td className="px-3 py-3 md:px-4">
                    <Link href={`/dashboard/leads/${l.id}`} className="block">
                      <p className="font-medium text-white">
                        {l.contact_name || <span className="text-neutral-500">—</span>}
                      </p>
                      <p className="text-xs text-neutral-400">{l.contact_email}</p>
                      {l.company && (
                        <p className="mt-0.5 text-xs text-neutral-500">{l.company}</p>
                      )}
                    </Link>
                  </td>
                  <td className="px-3 py-3 md:px-4">
                    <EventTypeLabel value={l.event_type} />
                  </td>
                  <td className="px-3 py-3 text-xs text-neutral-300 md:px-4">
                    {l.event_date
                      ? formatDateFR(l.event_date)
                      : rawDateText(l.raw_payload) ?? (
                          <span className="text-neutral-500">—</span>
                        )}
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-neutral-300 md:table-cell md:px-4">
                    {l.guests_count ?? <span className="text-neutral-500">—</span>}
                  </td>
                  <td className="px-3 py-3 md:px-4">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-neutral-500 md:table-cell md:px-4">
                    {formatDateFR(l.created_at, { withTime: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-sm text-neutral-500">
            Aucune demande pour ces filtres.
            {(status || q || type) && (
              <>
                {" "}
                <Link href="/dashboard/leads" className="text-neutral-300 underline">
                  Réinitialiser
                </Link>
                .
              </>
            )}
          </div>
        )}
      </div>

      {leads && leads.length >= 200 && (
        <p className="mt-2 text-[11px] text-neutral-500">
          200 premières demandes affichées. Affine les filtres pour voir les plus anciennes.
        </p>
      )}
    </div>
  );
}

type LeadStatus = Database["public"]["Enums"]["lead_status"];
type EventType = Database["public"]["Enums"]["event_type"];
const STATUS_VALUES: LeadStatus[] = ["nouveau", "contacte", "devis_envoye", "gagne", "perdu"];
const TYPE_VALUES: EventType[] = ["mariage", "corporate", "prive", "defile", "lancement", "autre"];

// Free-form date typed by the visitor ("14 juin 2026"). When Postgres can't
// coerce it, we keep the raw text in `raw_payload.date` — surface it when
// the typed column is null so the list stays informative.
function rawDateText(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "date" in payload) {
    const v = (payload as Record<string, unknown>).date;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}
