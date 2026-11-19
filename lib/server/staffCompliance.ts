import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import type { Database } from "@/types/database";
import {
  attestationValidUntil,
  complianceStatus,
  cumulate,
  nextComplianceEmail,
  normalizeSiret,
  type Assignment,
  type Attestation,
  type ComplianceResult,
} from "@/lib/staff/compliance";

type Db = SupabaseClient<Database>;
type StaffRow = Database["public"]["Tables"]["staff"]["Row"];
type DocRow = Database["public"]["Tables"]["staff_documents"]["Row"];

export const STAFF_DOCS_BUCKET = "staff-documents";

export type ComplianceRow = {
  staff: Pick<
    StaffRow,
    | "id"
    | "full_name"
    | "role"
    | "email"
    | "legal_status"
    | "siret"
    | "siret_status"
    | "siret_name"
    | "siret_checked_at"
    | "compliance_token"
    | "compliance_requested_at"
    | "compliance_reminded_at"
  >;
  past12m: number;
  upcoming: number;
  projected: number;
  events12m: number;
  attestation: (DocRow & { computedValidUntil: string | null }) | null;
  rcPro: DocRow | null;
  /** Extra salarié : hors obligation de vigilance. */
  salaried: boolean;
  status: ComplianceResult;
  /** Email automatique que la cadence enverrait aujourd'hui. */
  nextEmail: "demande" | "relance" | null;
};

const STAFF_COLUMNS =
  "id,full_name,role,email,legal_status,siret,siret_status,siret_name,siret_checked_at,compliance_token,compliance_requested_at,compliance_reminded_at,hourly_rate";

/** Calcule l'état de conformité de tout le staff actif. */
export async function loadComplianceRows(db: Db, today = new Date()): Promise<ComplianceRow[]> {
  const [{ data: staff }, { data: assignments }, { data: docs }] = await Promise.all([
    db.from("staff").select(STAFF_COLUMNS).eq("archived", false).order("full_name"),
    db
      .from("event_staff")
      .select("staff_id,hours_planned,hours_done,rate_override,paid_amount,events(date,status)")
      .limit(10000),
    db.from("staff_documents").select("*").order("issued_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
  ]);

  const byStaff = new Map<string, Assignment[]>();
  for (const a of (assignments ?? []) as unknown as Array<Assignment & { staff_id: string; events: { date: string; status: string } | null }>) {
    if (!a.events?.date || a.events.status === "annule") continue;
    const list = byStaff.get(a.staff_id) ?? [];
    list.push({ ...a, date: a.events.date });
    byStaff.set(a.staff_id, list);
  }
  const latestDoc = new Map<string, DocRow>();
  for (const d of docs ?? []) {
    const k = `${d.staff_id}:${d.kind}`;
    if (!latestDoc.has(k)) latestDoc.set(k, d);
  }

  const DAY = 86_400_000;
  return ((staff ?? []) as Array<ComplianceRow["staff"] & { hourly_rate: number | null }>).map((s) => {
    const list = byStaff.get(s.id) ?? [];
    const c = cumulate(list, s.hourly_rate, today);
    const events12m = list.filter((a) => {
      const d = new Date(a.date).getTime();
      return d <= today.getTime() && today.getTime() - d <= 365 * DAY;
    }).length;
    const att = latestDoc.get(`${s.id}:attestation_vigilance`) ?? null;
    const salaried = s.legal_status === "extra_salarie";
    const status = complianceStatus({
      projected: salaried ? 0 : c.projected,
      latest: att as Attestation | null,
      siretStatus: salaried ? null : s.siret_status,
      today,
    });
    const lastUploadAt = att?.created_at ?? null;
    return {
      staff: s,
      ...c,
      events12m,
      attestation: att ? { ...att, computedValidUntil: attestationValidUntil(att as Attestation) } : null,
      rcPro: latestDoc.get(`${s.id}:rc_pro`) ?? null,
      salaried,
      status,
      nextEmail: nextComplianceEmail({
        needsRequest: status.needsRequest,
        hasEmail: !!s.email,
        requestedAt: s.compliance_requested_at,
        remindedAt: s.compliance_reminded_at,
        lastUploadAt,
        today,
      }),
    };
  });
}

/* ─── SIRET : annuaire public des entreprises (gratuit, sans clé) ─── */

export type SiretCheck = { status: "actif" | "cesse" | "introuvable"; name: string | null };

export async function checkSiret(raw: string): Promise<SiretCheck | null> {
  const siret = normalizeSiret(raw);
  if (!siret) return { status: "introuvable", name: null };
  try {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&page=1&per_page=1`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null; // indisponible : on ne touche pas au statut connu
    const data = (await res.json()) as {
      results?: Array<{
        nom_complet?: string;
        matching_etablissements?: Array<{ siret?: string; etat_administratif?: string }>;
        siege?: { siret?: string; etat_administratif?: string };
      }>;
    };
    const r = data.results?.[0];
    const etab = r?.matching_etablissements?.find((e) => e.siret === siret) ?? (r?.siege?.siret === siret ? r.siege : undefined);
    if (!r || !etab) return { status: "introuvable", name: null };
    return { status: etab.etat_administratif === "A" ? "actif" : "cesse", name: r.nom_complet ?? null };
  } catch {
    return null;
  }
}

export async function refreshSiret(db: Db, staffId: string, siret: string | null): Promise<SiretCheck | null> {
  if (!siret) {
    await db.from("staff").update({ siret_status: null, siret_name: null, siret_checked_at: null }).eq("id", staffId);
    return null;
  }
  const check = await checkSiret(siret);
  if (check) {
    await db
      .from("staff")
      .update({ siret_status: check.status, siret_name: check.name, siret_checked_at: new Date().toISOString() })
      .eq("id", staffId);
  }
  return check;
}

/* ─── Emails de demande / relance ─── */

export function complianceLink(token: string): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cosmoclub.fr";
  return `${origin}/conformite/${token}`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function emailHtml(o: { firstName: string; link: string; kind: "demande" | "relance"; renewal: boolean }) {
  const intro =
    o.kind === "relance"
      ? "Petit rappel : nous n'avons pas encore reçu votre attestation de vigilance URSSAF."
      : o.renewal
        ? "Votre attestation de vigilance URSSAF a plus de trois mois : pourriez-vous nous en transmettre une nouvelle ?"
        : "Comme vous travaillez régulièrement avec Cosmo Club, nous devons conserver votre attestation de vigilance URSSAF. C'est une obligation légale pour toute entreprise qui fait appel à des indépendants.";
  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:32px 12px;background:#f4ecd6;font-family:Helvetica,Arial,sans-serif;color:#2a1f14;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#fffaf0;border-radius:14px;">
<tr><td style="padding:32px 32px 8px;">
<p style="margin:0 0 12px;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:bold;color:#8b1a1a;">Cosmo Club · Documents</p>
<p style="margin:0 0 16px;font-size:16px;line-height:24px;">Bonjour ${esc(o.firstName)},</p>
<p style="margin:0 0 16px;font-size:16px;line-height:24px;">${esc(intro)}</p>
<p style="margin:0 0 8px;font-size:15px;line-height:22px;"><strong>Où la trouver :</strong> sur votre espace URSSAF (autoentrepreneur.urssaf.fr ou urssaf.fr), rubrique « Mes documents » puis « Attestation de vigilance ». Elle se télécharge en PDF en une minute.</p>
<p style="margin:0 0 20px;font-size:15px;line-height:22px;">Déposez-la sur votre espace personnel, sans créer de compte :</p>
<a href="${o.link}" style="display:inline-block;padding:14px 28px;background:#8b1a1a;color:#f4ecd6;text-decoration:none;border-radius:999px;font-size:15px;font-weight:bold;">Déposer mon attestation &rarr;</a>
<p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#6b5a48;">Vous pouvez aussi y renseigner votre SIRET et, si vous en avez une, votre attestation d'assurance responsabilité civile pro. Merci beaucoup !</p>
</td></tr>
<tr><td style="padding:20px 32px 28px;font-size:13px;line-height:20px;color:#6b5a48;">Benjamin · Cosmo Club Paris</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendComplianceEmail(
  db: Db,
  staff: Pick<StaffRow, "id" | "full_name" | "email" | "compliance_token">,
  kind: "demande" | "relance",
  renewal: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.DEVIS_FROM_EMAIL;
  if (!apiKey || !from) return { ok: false, error: "Envoi d'email non configuré (Resend)." };
  if (!staff.email) return { ok: false, error: "Aucun email renseigné pour cette personne." };

  const { data: settings } = await db.from("settings").select("company_name,email").eq("id", 1).maybeSingle();
  const firstName = staff.full_name.trim().split(/\s+/)[0] || "";
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: `${settings?.company_name || "Cosmo Club Paris"} <${from}>`,
    to: [staff.email],
    replyTo: settings?.email || undefined,
    subject: kind === "relance" ? "Rappel : votre attestation URSSAF pour Cosmo Club" : "Votre attestation URSSAF pour Cosmo Club",
    html: emailHtml({ firstName, link: complianceLink(staff.compliance_token), kind, renewal }),
    tags: [{ name: "category", value: "conformite" }],
  });
  if (error) return { ok: false, error: error.message };

  const now = new Date().toISOString();
  await db
    .from("staff")
    .update(kind === "demande" ? { compliance_requested_at: now, compliance_reminded_at: null } : { compliance_reminded_at: now })
    .eq("id", staff.id);
  return { ok: true };
}

/**
 * Passage hebdomadaire (appelé par le cron du lundi) :
 *  1. revérifie les SIRET non contrôlés depuis 30 jours ;
 *  2. si les relances automatiques sont activées, envoie demandes et
 *     relances selon la cadence (voir nextComplianceEmail).
 */
export async function runStaffCompliance(db: Db) {
  const summary = { siretChecked: 0, demandes: 0, relances: 0, errors: [] as string[], autoEmails: false };

  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: toCheck } = await db
    .from("staff")
    .select("id,siret,siret_checked_at")
    .eq("archived", false)
    .not("siret", "is", null)
    .or(`siret_checked_at.is.null,siret_checked_at.lt.${cutoff}`)
    .limit(25);
  for (const s of toCheck ?? []) {
    await refreshSiret(db, s.id, s.siret);
    summary.siretChecked++;
    await new Promise((r) => setTimeout(r, 250)); // l'annuaire limite à ~7 requêtes/s
  }

  const { data: settings } = await db.from("settings").select("compliance_auto_emails").eq("id", 1).maybeSingle();
  summary.autoEmails = !!settings?.compliance_auto_emails;
  if (!summary.autoEmails) return summary;

  const rows = await loadComplianceRows(db);
  for (const r of rows) {
    if (!r.nextEmail || r.salaried) continue;
    const res = await sendComplianceEmail(db, r.staff, r.nextEmail, !!r.attestation);
    if (res.ok) summary[r.nextEmail === "demande" ? "demandes" : "relances"]++;
    else summary.errors.push(`${r.staff.full_name}: ${res.error}`);
  }
  return summary;
}
