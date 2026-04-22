import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Inbox, FileText, Receipt, Package, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EventTypeLabel } from "@/components/dashboard/EventTypeLabel";
import { formatDateFR } from "@/lib/format";

export default async function DashboardHome() {
  const supabase = await createClient();

  // Lightweight KPI queries. Count-only — cheap and fine for <1000 rows.
  const [{ count: leadsNew }, { count: quotesPending }, { count: invoicesUnpaid }, { count: lowStock }, { data: recentLeads }] =
    await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "nouveau"),
      supabase.from("quotes").select("*", { count: "exact", head: true }).eq("status", "envoye"),
      supabase.from("invoices").select("*", { count: "exact", head: true }).in("status", ["envoye", "en_retard"]),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("archived", false).filter("stock_qty", "lte", 0),
      supabase.from("leads")
        .select("id,status,contact_name,contact_email,event_type,event_date,created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const kpis = [
    { label: "Nouvelles demandes", value: leadsNew ?? 0, href: "/dashboard/leads", icon: Inbox, tone: "grenat" },
    { label: "Devis en attente", value: quotesPending ?? 0, href: "/dashboard/devis", icon: FileText, tone: "or" },
    { label: "Factures à encaisser", value: invoicesUnpaid ?? 0, href: "/dashboard/factures", icon: Receipt, tone: "or-deep" },
    { label: "Stock faible", value: lowStock ?? 0, href: "/dashboard/stock", icon: Package, tone: "grenat" },
  ];

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Tableau de bord</h1>
        <p className="mt-1 text-sm text-neutral-400">Vue d&apos;ensemble de ton activité.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="group rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  {kpi.label}
                </p>
                <Icon className="h-4 w-4 text-neutral-600 transition-colors group-hover:text-neutral-400" />
              </div>
              <p className="mt-3 font-display text-3xl text-white md:text-4xl">
                {kpi.value}
              </p>
            </Link>
          );
        })}
      </div>

      {recentLeads && recentLeads.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-300">Demandes récentes</h2>
            <Link
              href="/dashboard/leads"
              className="inline-flex items-center gap-1 text-xs text-neutral-400 transition-colors hover:text-white"
            >
              Tout voir <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60">
            <table className="w-full text-left text-sm">
              <tbody>
                {recentLeads.map((l) => (
                  <tr
                    key={l.id}
                    className="border-t border-neutral-900 first:border-t-0 transition-colors hover:bg-neutral-900"
                  >
                    <td className="px-4 py-2.5">
                      <Link href={`/dashboard/leads/${l.id}`} className="block">
                        <p className="text-sm font-medium text-white">
                          {l.contact_name || l.contact_email || "Sans nom"}
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          {formatDateFR(l.created_at, { withTime: true })}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <EventTypeLabel value={l.event_type} />
                    </td>
                    <td className="hidden px-4 py-2.5 text-xs text-neutral-400 md:table-cell">
                      {formatDateFR(l.event_date)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <StatusBadge status={l.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-neutral-300">Accès rapide</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <QuickCard
            href="/dashboard/leads"
            title="Consulter les demandes"
            desc="Liste des leads entrants depuis le site et conversion en devis."
          />
          <QuickCard
            href="/dashboard/devis"
            title="Créer un devis"
            desc="Nouveau devis façon plaquette éditoriale, envoi par email."
          />
          <QuickCard
            href="/dashboard/factures"
            title="Générer une facture"
            desc="Facture conforme FR à partir d'un devis accepté."
          />
        </div>
      </section>
    </div>
  );
}

function QuickCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-5 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-neutral-400">{desc}</p>
    </Link>
  );
}
