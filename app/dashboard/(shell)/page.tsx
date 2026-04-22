import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Inbox, FileText, Receipt, Package } from "lucide-react";

export default async function DashboardHome() {
  const supabase = await createClient();

  // Lightweight KPI queries. Count-only — cheap and fine for <1000 rows.
  const [{ count: leadsNew }, { count: quotesPending }, { count: invoicesUnpaid }, { count: lowStock }] =
    await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "nouveau"),
      supabase.from("quotes").select("*", { count: "exact", head: true }).eq("status", "envoye"),
      supabase.from("invoices").select("*", { count: "exact", head: true }).in("status", ["envoye", "en_retard"]),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("archived", false).filter("stock_qty", "lte", 0),
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
