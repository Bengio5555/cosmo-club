import { createClient } from "@/lib/supabase/server";
import { PreviewDashboard } from "./PreviewDashboard";

export default async function PreviewDashboardPage() {
  const supabase = await createClient();
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1)
    .toISOString()
    .slice(0, 10);

  // Récupère les vraies données pour que les KPI affichent du
  // réalisme, pas du Lorem Ipsum.
  const [
    { data: monthInvoices },
    { data: unpaidInvoices },
    { data: pendingQuotes },
    { count: newLeadsCount },
    { data: trendInvoices },
    { data: recentLeads },
    { data: upcomingEvents },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("total_ttc,is_credit_note,issue_date")
      .gte("issue_date", firstOfMonth)
      .neq("status", "brouillon")
      .neq("status", "annule"),
    supabase
      .from("invoices")
      .select("total_ttc,status")
      .in("status", ["envoye", "en_retard"])
      .eq("is_credit_note", false),
    supabase
      .from("quotes")
      .select("total_ttc,status")
      .eq("status", "envoye"),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "nouveau"),
    supabase
      .from("invoices")
      .select("issue_date,total_ttc,status,is_credit_note")
      .gte("issue_date", sixMonthsAgo)
      .neq("status", "brouillon")
      .neq("status", "annule"),
    supabase
      .from("leads")
      .select("id,status,contact_name,contact_email,company,event_type,event_date,created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("events")
      .select("id,title,date,start_time,location,status,guests_count")
      .gte("date", today.toISOString().slice(0, 10))
      .neq("status", "annule")
      .order("date", { ascending: true })
      .limit(6),
  ]);

  // Agrégations
  const caMonth = (monthInvoices ?? []).reduce(
    (sum, inv) => sum + Number(inv.total_ttc ?? 0),
    0,
  );
  const unpaidAmount = (unpaidInvoices ?? []).reduce(
    (sum, inv) => sum + Number(inv.total_ttc ?? 0),
    0,
  );
  const pendingAmount = (pendingQuotes ?? []).reduce(
    (sum, q) => sum + Number(q.total_ttc ?? 0),
    0,
  );

  // Série mensuelle pour le sparkline / mini-bar chart
  const monthlySeries: { month: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("fr-FR", { month: "short" });
    const total = (trendInvoices ?? [])
      .filter((inv) => (inv.issue_date ?? "").startsWith(monthKey))
      .reduce((sum, inv) => sum + Number(inv.total_ttc ?? 0), 0);
    monthlySeries.push({ month: label, total });
  }

  return (
    <PreviewDashboard
      stats={{
        caMonth,
        unpaidAmount,
        unpaidCount: unpaidInvoices?.length ?? 0,
        pendingAmount,
        pendingCount: pendingQuotes?.length ?? 0,
        newLeads: newLeadsCount ?? 0,
      }}
      trend={monthlySeries}
      recentLeads={recentLeads ?? []}
      upcomingEvents={upcomingEvents ?? []}
    />
  );
}
