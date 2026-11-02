import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { REVENUE_TYPE_LABEL, type EventType } from "@/lib/dashboard/revenue";

/**
 * Lectures pour le serveur MCP (/api/mcp). Tout est en lecture seule et
 * sans donnée personnelle : jamais de nom de contact, d'e-mail, de
 * téléphone ni de message libre. Les clients apparaissent par leur raison
 * sociale, ou « Particulier » quand il n'y en a pas.
 */

type Admin = ReturnType<typeof createAdminClient>;

const EVENT_TYPE_LABEL: Record<string, string> = { ...REVENUE_TYPE_LABEL };
const QUOTE_STATUS: Record<string, string> = {
  brouillon: "brouillon",
  envoye: "envoyé",
  accepte: "accepté",
  refuse: "refusé",
  expire: "expiré",
};
const INVOICE_STATUS: Record<string, string> = {
  brouillon: "brouillon",
  envoye: "envoyée",
  paye: "payée",
  en_retard: "en retard",
  annule: "annulée",
};
const LEAD_STATUS: Record<string, string> = {
  nouveau: "nouvelle",
  contacte: "contactée",
  devis_envoye: "devis envoyé",
  gagne: "gagnée",
  perdu: "perdue",
};
const EVENT_STATUS: Record<string, string> = {
  a_venir: "à venir",
  en_cours: "en cours",
  termine: "terminé",
  annule: "annulé",
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const todayIso = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
const addDays = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

async function companyNames(supabase: Admin, ids: Array<string | null | undefined>) {
  const uniq = Array.from(new Set(ids.filter((v): v is string => !!v)));
  if (uniq.length === 0) return new Map<string, string>();
  const { data } = await supabase.from("clients").select("id,company_name").in("id", uniq);
  return new Map((data ?? []).map((c) => [c.id, c.company_name?.trim() || "Particulier"]));
}

// ─── Chiffre d'affaires ────────────────────────────────────────────────

type InvoiceRow = {
  id: string;
  issue_date: string;
  event_date: string | null;
  total_ht: number;
  is_credit_note: boolean;
  source_invoice_id: string | null;
  quote_id: string | null;
  client_id: string | null;
};

/** Mois de rattachement d'une facture : date d'événement, sinon celle de la
 *  facture annulée pour un avoir, sinon date d'émission. */
function bucketMonth(inv: InvoiceRow, byId: Map<string, InvoiceRow>): string {
  if (inv.event_date) return inv.event_date.slice(0, 7);
  if (inv.is_credit_note && inv.source_invoice_id) {
    const src = byId.get(inv.source_invoice_id);
    if (src) return (src.event_date ?? src.issue_date).slice(0, 7);
  }
  return inv.issue_date.slice(0, 7);
}

export async function revenueByMonth(year: number) {
  const supabase = createAdminClient();
  const start = `${year}-01-01`, end = `${year}-12-31`;
  const { data } = await supabase
    .from("invoices")
    .select("id,issue_date,event_date,total_ht,is_credit_note,source_invoice_id,quote_id,client_id")
    .or(`and(event_date.gte.${start},event_date.lte.${end}),and(issue_date.gte.${start},issue_date.lte.${end})`)
    .not("status", "in", "(brouillon,annule)");
  const rows = (data ?? []) as InvoiceRow[];
  // Les avoirs peuvent viser une facture hors fenêtre : on la charge pour le rattachement.
  const missing = rows.filter((r) => r.is_credit_note && r.source_invoice_id && !rows.some((x) => x.id === r.source_invoice_id)).map((r) => r.source_invoice_id!);
  if (missing.length) {
    const { data: extra } = await supabase
      .from("invoices")
      .select("id,issue_date,event_date,total_ht,is_credit_note,source_invoice_id,quote_id,client_id")
      .in("id", missing);
    for (const e of extra ?? []) rows.push({ ...(e as InvoiceRow), total_ht: 0 });
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  // Type d'événement via le devis
  const quoteIds = Array.from(new Set(rows.map((r) => r.quote_id).filter((v): v is string => !!v)));
  const { data: quotes } = quoteIds.length ? await supabase.from("quotes").select("id,event_type").in("id", quoteIds) : { data: [] };
  const typeByQuote = new Map((quotes ?? []).map((q) => [q.id, q.event_type as EventType | null]));

  const months: Record<string, { total_ht: number; par_type: Record<string, number> }> = {};
  for (let m = 1; m <= 12; m++) months[`${year}-${String(m).padStart(2, "0")}`] = { total_ht: 0, par_type: {} };
  for (const inv of rows) {
    const key = bucketMonth(inv, byId);
    if (!key.startsWith(String(year)) || !months[key]) continue;
    const amount = Number(inv.total_ht) || 0;
    if (!amount) continue;
    const type = (inv.quote_id && typeByQuote.get(inv.quote_id)) || "autre";
    const label = EVENT_TYPE_LABEL[type] ?? type;
    months[key].total_ht = round2(months[key].total_ht + amount);
    months[key].par_type[label] = round2((months[key].par_type[label] ?? 0) + amount);
  }
  const total = round2(Object.values(months).reduce((s, m) => s + m.total_ht, 0));
  return { annee: year, devise: "EUR", hors_taxes: true, total_ht: total, mois: months };
}

// ─── Devis ─────────────────────────────────────────────────────────────

export async function listQuotes(status: "envoye" | "accepte" | "refuse" | "expire" | "tous", limit: number) {
  const supabase = createAdminClient();
  let q = supabase
    .from("quotes")
    .select("number,status,event_type,event_date,event_location,guests_count,total_ht,total_ttc,sent_at,valid_until,accepted_at,client_id")
    .neq("status", "brouillon")
    .order("issue_date", { ascending: false })
    .limit(limit);
  if (status !== "tous") q = q.eq("status", status);
  const { data } = await q;
  const names = await companyNames(supabase, (data ?? []).map((r) => r.client_id));
  return (data ?? []).map((r) => ({
    numero: r.number,
    statut: QUOTE_STATUS[r.status] ?? r.status,
    client: names.get(r.client_id ?? "") ?? "Particulier",
    type_evenement: r.event_type ? (EVENT_TYPE_LABEL[r.event_type] ?? r.event_type) : null,
    date_evenement: r.event_date,
    lieu: r.event_location,
    invites: r.guests_count,
    total_ht: Number(r.total_ht),
    total_ttc: Number(r.total_ttc),
    envoye_le: r.sent_at?.slice(0, 10) ?? null,
    valide_jusquau: r.valid_until,
    accepte_le: r.accepted_at?.slice(0, 10) ?? null,
  }));
}

// ─── Factures ──────────────────────────────────────────────────────────

export async function listInvoices(scope: "a_encaisser" | "en_retard" | "payees" | "toutes", limit: number) {
  const supabase = createAdminClient();
  let q = supabase
    .from("invoices")
    .select("id,number,status,issue_date,due_date,event_date,total_ht,total_ttc,is_credit_note,paid_at,reminder_count,client_id")
    .neq("status", "brouillon")
    .order("issue_date", { ascending: false })
    .limit(scope === "toutes" ? limit : 200);
  if (scope === "a_encaisser") q = q.in("status", ["envoye", "en_retard"]).eq("is_credit_note", false);
  if (scope === "en_retard") q = q.eq("status", "en_retard").eq("is_credit_note", false);
  if (scope === "payees") q = q.eq("status", "paye").eq("is_credit_note", false);
  const { data } = await q;
  const rows = data ?? [];
  const ids = rows.map((r) => r.id);
  const [{ data: payments }, { data: credits }] = await Promise.all([
    ids.length ? supabase.from("invoice_payments").select("invoice_id,amount").in("invoice_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("invoices").select("source_invoice_id,total_ttc").eq("is_credit_note", true).in("source_invoice_id", ids) : Promise.resolve({ data: [] }),
  ]);
  const paid = new Map<string, number>();
  for (const p of payments ?? []) paid.set(p.invoice_id, (paid.get(p.invoice_id) ?? 0) + Number(p.amount));
  const credited = new Map<string, number>();
  for (const c of credits ?? []) if (c.source_invoice_id) credited.set(c.source_invoice_id, (credited.get(c.source_invoice_id) ?? 0) + Math.abs(Number(c.total_ttc)));
  const names = await companyNames(supabase, rows.map((r) => r.client_id));
  const today = todayIso();
  const out = rows
    .map((r) => {
      const reste = r.is_credit_note ? 0 : round2(Number(r.total_ttc) - (paid.get(r.id) ?? 0) - (credited.get(r.id) ?? 0));
      const retard = r.due_date && !r.is_credit_note && reste > 0 && r.due_date < today
        ? Math.round((Date.parse(today) - Date.parse(r.due_date)) / 86400000)
        : 0;
      return {
        numero: r.number,
        avoir: r.is_credit_note || undefined,
        statut: INVOICE_STATUS[r.status] ?? r.status,
        client: names.get(r.client_id ?? "") ?? "Particulier",
        emise_le: r.issue_date,
        echeance: r.due_date,
        date_evenement: r.event_date,
        total_ht: Number(r.total_ht),
        total_ttc: Number(r.total_ttc),
        reste_a_encaisser_ttc: reste,
        jours_de_retard: retard || undefined,
        relances: r.reminder_count ?? 0,
        payee_le: r.paid_at?.slice(0, 10) ?? null,
      };
    })
    .filter((r) => (scope === "a_encaisser" || scope === "en_retard" ? r.reste_a_encaisser_ttc > 0 : true))
    .slice(0, limit);
  return { factures: out, total_reste_a_encaisser_ttc: round2(out.reduce((s, r) => s + r.reste_a_encaisser_ttc, 0)) };
}

// ─── Demandes (leads) ──────────────────────────────────────────────────

type LeadStatus = "nouveau" | "contacte" | "devis_envoye" | "gagne" | "perdu";

export async function listLeads(days: number, status: LeadStatus | "toutes", limit: number) {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  let q = supabase
    .from("leads")
    .select("created_at,status,event_type,event_date,guests_count,budget_estimate,company,channel,source,utm_source,utm_campaign")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status !== "toutes") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []).map((l) => ({
    recue_le: l.created_at.slice(0, 16).replace("T", " "),
    statut: LEAD_STATUS[l.status] ?? l.status,
    societe: l.company?.trim() || null,
    type_evenement: l.event_type ? (EVENT_TYPE_LABEL[l.event_type] ?? l.event_type) : null,
    date_evenement: l.event_date,
    invites: l.guests_count,
    budget_estime: l.budget_estimate,
    canal: l.channel ?? null,
    provenance: l.utm_source ?? l.source ?? null,
    campagne: l.utm_campaign ?? null,
  }));
}

// ─── Événements + matériel ─────────────────────────────────────────────

export async function listEvents(days: number, limit: number) {
  const supabase = createAdminClient();
  const today = todayIso();
  const { data } = await supabase
    .from("events")
    .select("id,title,date,end_date,start_time,end_time,location,guests_count,status,client_id")
    .gte("date", addDays(today, -1))
    .lte("date", addDays(today, days))
    .neq("status", "annule")
    .order("date")
    .order("start_time")
    .limit(limit);
  const events = data ?? [];
  const ids = events.map((e) => e.id);
  const [{ data: staff }, { data: equip }, names] = await Promise.all([
    ids.length ? supabase.from("event_staff").select("event_id").in("event_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("event_equipment").select("event_id,depart_at,retour_at").in("event_id", ids) : Promise.resolve({ data: [] }),
    companyNames(supabase, events.map((e) => e.client_id)),
  ]);
  const staffCount = new Map<string, number>();
  for (const s of staff ?? []) staffCount.set(s.event_id, (staffCount.get(s.event_id) ?? 0) + 1);
  const eq = new Map<string, { prevu: number; charge: number; revenu: number }>();
  for (const e of equip ?? []) {
    const cur = eq.get(e.event_id) ?? { prevu: 0, charge: 0, revenu: 0 };
    cur.prevu++; if (e.depart_at) cur.charge++; if (e.retour_at) cur.revenu++;
    eq.set(e.event_id, cur);
  }
  return events.map((e) => ({
    id: e.id,
    titre: e.title,
    statut: EVENT_STATUS[e.status] ?? e.status,
    client: names.get(e.client_id ?? "") ?? "Particulier",
    date: e.date,
    date_fin: e.end_date,
    horaires: [e.start_time?.slice(0, 5), e.end_time?.slice(0, 5)].filter(Boolean).join(" – ") || null,
    lieu: e.location,
    invites: e.guests_count,
    equipe: staffCount.get(e.id) ?? 0,
    materiel: eq.get(e.id) ?? { prevu: 0, charge: 0, revenu: 0 },
  }));
}

export async function equipmentStatus(eventId: string) {
  const supabase = createAdminClient();
  const { data: event } = await supabase.from("events").select("id,title,date,status").eq("id", eventId).maybeSingle();
  if (!event) return { erreur: "Événement introuvable." };
  const { data: links } = await supabase.from("event_equipment").select("equipment_id,depart_at,depart_by,retour_at,retour_by").eq("event_id", eventId);
  const ids = (links ?? []).map((l) => l.equipment_id);
  const { data: items } = ids.length ? await supabase.from("equipment").select("id,code,name,category").in("id", ids).order("code") : { data: [] };
  const byId = new Map((links ?? []).map((l) => [l.equipment_id, l]));
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null);
  const elements = (items ?? []).map((it) => {
    const l = byId.get(it.id)!;
    return { code: it.code, nom: it.name, categorie: it.category, depart: fmt(l.depart_at), depart_par: l.depart_by, retour: fmt(l.retour_at), retour_par: l.retour_by };
  });
  return {
    evenement: { titre: event.title, date: event.date, statut: EVENT_STATUS[event.status] ?? event.status },
    prevu: elements.length,
    charges: elements.filter((e) => e.depart).length,
    revenus: elements.filter((e) => e.retour).length,
    manquants_au_depart: elements.filter((e) => !e.depart).map((e) => e.code),
    manquants_au_retour: elements.filter((e) => !e.retour).map((e) => e.code),
    elements,
  };
}

// ─── Synthèse ──────────────────────────────────────────────────────────

export async function kpis() {
  const now = new Date();
  const year = Number(todayIso().slice(0, 4));
  const monthKey = todayIso().slice(0, 7);
  const prevKey = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }).slice(0, 7);
  const [rev, prevRev, devis, factures, leads, events] = await Promise.all([
    revenueByMonth(year),
    prevKey.startsWith(String(year)) ? null : revenueByMonth(Number(prevKey.slice(0, 4))),
    listQuotes("envoye", 200),
    listInvoices("a_encaisser", 200),
    listLeads(30, "nouveau", 200),
    listEvents(14, 50),
  ]);
  const monthTotal = rev.mois[monthKey]?.total_ht ?? 0;
  const prevTotal = (prevRev ?? rev).mois[prevKey]?.total_ht ?? 0;
  return {
    date: todayIso(),
    ca_du_mois_ht: monthTotal,
    ca_mois_precedent_ht: prevTotal,
    ca_annee_ht: rev.total_ht,
    devis_en_attente: { nombre: devis.length, total_ttc: round2(devis.reduce((s, d) => s + d.total_ttc, 0)) },
    factures_a_encaisser: { nombre: factures.factures.length, total_ttc: factures.total_reste_a_encaisser_ttc, en_retard: factures.factures.filter((f) => f.jours_de_retard).length },
    nouvelles_demandes_30j: leads.length,
    evenements_14j: events.map((e) => ({ titre: e.titre, date: e.date, horaires: e.horaires, invites: e.invites, materiel: e.materiel })),
  };
}
