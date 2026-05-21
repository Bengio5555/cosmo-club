import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EventTypeLabel } from "@/components/dashboard/EventTypeLabel";
import { formatDateFR } from "@/lib/format";
import { LeadDetailForm } from "./LeadDetailForm";
import { ArrowLeft, Mail, Phone, Building2, Calendar, Users } from "lucide-react";

// The /contact form lets visitors type the date in free French
// ("14 juin 2026", "printemps 2026", "fin septembre"). Most of the time
// Postgres can't coerce that into a DATE so `event_date` stays null.
// The original text is kept in `raw_payload.date` so we surface that in
// the UI when the typed column is empty.
function rawDate(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "date" in payload) {
    const v = (payload as Record<string, unknown>).date;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function rawLocation(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "location" in payload) {
    const v = (payload as Record<string, unknown>).location;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

type Params = Promise<{ id: string }>;

export default async function LeadDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !lead) {
    notFound();
  }

  // Fetch any related quote(s) already minted from this lead so we can show
  // a quick link instead of re-converting.
  const { data: relatedQuotes } = await supabase
    .from("quotes")
    .select("id,number,status,total_ttc,created_at")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <Link
        href="/dashboard/leads"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-neutral-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Toutes les demandes
      </Link>

      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <StatusBadge status={lead.status} />
            <span className="text-[11px] text-slate-500 dark:text-neutral-500">
              Reçu {formatDateFR(lead.created_at, { withTime: true })}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white md:text-3xl">
            {lead.contact_name || <span className="text-neutral-500">Sans nom</span>}
          </h1>
          {lead.company && (
            <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">{lead.company}</p>
          )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[1fr_minmax(0,320px)]">
        {/* Main column */}
        <section className="space-y-4">
          <Card title="Demande">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-xs text-slate-500 dark:text-neutral-500">Type</dt>
              <dd className="text-right">
                <EventTypeLabel value={lead.event_type} />
              </dd>

              <dt className="text-xs text-slate-500 dark:text-neutral-500">Date événement</dt>
              <dd className="text-right text-neutral-200">
                {lead.event_date
                  ? formatDateFR(lead.event_date)
                  : rawDate(lead.raw_payload) ?? "—"}
              </dd>

              <dt className="text-xs text-slate-500 dark:text-neutral-500">Lieu</dt>
              <dd className="text-right text-neutral-200">
                {rawLocation(lead.raw_payload) ?? "—"}
              </dd>

              <dt className="text-xs text-slate-500 dark:text-neutral-500">Invités</dt>
              <dd className="text-right text-neutral-200">
                {lead.guests_count ?? "—"}
              </dd>

              {lead.budget_estimate != null && (
                <>
                  <dt className="text-xs text-slate-500 dark:text-neutral-500">Budget estimé</dt>
                  <dd className="text-right text-neutral-200">
                    {lead.budget_estimate} €
                  </dd>
                </>
              )}
            </dl>

            {lead.message && (
              <div className="mt-4 border-t border-neutral-900 pt-4">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                  Message
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-neutral-200">
                  {lead.message}
                </p>
              </div>
            )}
          </Card>

          <Card title="Contact">
            <dl className="space-y-2 text-sm">
              {lead.contact_email && (
                <Row icon={Mail} label="Email">
                  <a
                    className="text-neutral-200 transition-colors hover:text-white"
                    href={`mailto:${lead.contact_email}`}
                  >
                    {lead.contact_email}
                  </a>
                </Row>
              )}
              {lead.contact_phone && (
                <Row icon={Phone} label="Téléphone">
                  <a
                    className="text-neutral-200 transition-colors hover:text-white"
                    href={`tel:${lead.contact_phone}`}
                  >
                    {lead.contact_phone}
                  </a>
                </Row>
              )}
              {lead.company && (
                <Row icon={Building2} label="Entreprise">
                  <span className="text-neutral-200">{lead.company}</span>
                </Row>
              )}
              {(lead.event_date || rawDate(lead.raw_payload)) && (
                <Row icon={Calendar} label="Date">
                  <span className="text-neutral-200">
                    {lead.event_date
                      ? formatDateFR(lead.event_date)
                      : rawDate(lead.raw_payload)}
                  </span>
                </Row>
              )}
              {lead.guests_count != null && (
                <Row icon={Users} label="Invités">
                  <span className="text-neutral-200">{lead.guests_count}</span>
                </Row>
              )}
            </dl>
          </Card>

          {relatedQuotes && relatedQuotes.length > 0 && (
            <Card title="Devis liés">
              <ul className="space-y-1.5 text-sm">
                {relatedQuotes.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard/devis/${q.id}`}
                      className="text-neutral-200 transition-colors hover:text-white"
                    >
                      {q.number}
                    </Link>
                    <StatusBadge status={q.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        {/* Sidebar: status + notes + actions */}
        <aside>
          <LeadDetailForm lead={lead} hasQuote={(relatedQuotes?.length ?? 0) > 0} />
        </aside>
      </div>
    </div>
  );
}

/* ─── Local UI helpers ──────────────────────────────────────────────── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none p-4 md:p-5">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
      <span className="w-24 text-xs text-slate-500 dark:text-neutral-500">{label}</span>
      <span className="flex-1">{children}</span>
    </div>
  );
}
