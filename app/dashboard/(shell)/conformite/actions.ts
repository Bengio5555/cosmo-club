"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRole } from "@/lib/auth/server";
import { addMonths, isValidSiret, normalizeSiret, VALID_MONTHS } from "@/lib/staff/compliance";
import { refreshSiret, sendComplianceEmail, STAFF_DOCS_BUCKET } from "@/lib/server/staffCompliance";

const ALLOWED = ["owner", "admin", "compta"] as const;
// Vercel refuse les requêtes de plus de 4,5 Mo : on reste en dessous.
const MAX_BYTES = 4 * 1024 * 1024;
const MIME_EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };

async function guard() {
  const role = await getCurrentRole();
  if (!role || !(ALLOWED as readonly string[]).includes(role)) {
    return { ok: false as const, error: "Accès refusé." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { ok: true as const, userId: user?.id ?? null };
}

function refresh() {
  revalidatePath("/dashboard/conformite");
}

export async function sendRequestNow(staffId: string) {
  const g = await guard();
  if (!g.ok) return g;
  const db = createAdminClient();
  const [{ data: staff }, { count }] = await Promise.all([
    db.from("staff").select("id,full_name,email,compliance_token").eq("id", staffId).maybeSingle(),
    db.from("staff_documents").select("id", { count: "exact", head: true }).eq("staff_id", staffId).eq("kind", "attestation_vigilance"),
  ]);
  if (!staff) return { ok: false as const, error: "Personne introuvable." };
  const res = await sendComplianceEmail(db, staff, "demande", (count ?? 0) > 0);
  refresh();
  if (!res.ok) return res;
  return { ok: true as const, message: `Demande envoyée à ${staff.email}.` };
}

export async function setAutoEmails(enabled: boolean) {
  const g = await guard();
  if (!g.ok) return g;
  const db = createAdminClient();
  const { error } = await db.from("settings").update({ compliance_auto_emails: enabled }).eq("id", 1);
  refresh();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, message: enabled ? "Relances automatiques activées." : "Relances automatiques désactivées." };
}

export async function saveLegalInfo(staffId: string, input: { legal_status: string | null; siret: string | null }) {
  const g = await guard();
  if (!g.ok) return g;
  const status = input.legal_status === "micro" || input.legal_status === "societe" || input.legal_status === "extra_salarie" ? input.legal_status : null;
  const rawSiret = (input.siret ?? "").trim();
  const siret = rawSiret ? normalizeSiret(rawSiret) : null;
  if (rawSiret && (!siret || !isValidSiret(siret))) return { ok: false as const, error: "SIRET invalide (14 chiffres, clé de contrôle incorrecte)." };
  const db = createAdminClient();
  const { error } = await db.from("staff").update({ legal_status: status, siret }).eq("id", staffId);
  if (error) return { ok: false as const, error: error.message };
  const check = await refreshSiret(db, staffId, siret);
  refresh();
  return {
    ok: true as const,
    message: !siret
      ? "Enregistré."
      : check
        ? check.status === "actif"
          ? `SIRET actif${check.name ? ` : ${check.name}` : ""}.`
          : check.status === "cesse"
            ? "Attention : cet établissement est fermé."
            : "SIRET introuvable dans l'annuaire des entreprises."
        : "Enregistré. L'annuaire des entreprises ne répond pas, vérification au prochain passage.",
  };
}

export async function recheckSiret(staffId: string) {
  const g = await guard();
  if (!g.ok) return g;
  const db = createAdminClient();
  const { data } = await db.from("staff").select("siret").eq("id", staffId).maybeSingle();
  const check = await refreshSiret(db, staffId, data?.siret ?? null);
  refresh();
  if (!check) return { ok: false as const, error: "Annuaire indisponible ou SIRET absent." };
  return { ok: true as const, message: check.status === "actif" ? "SIRET actif." : check.status === "cesse" ? "Établissement fermé." : "SIRET introuvable." };
}

export async function uploadDocumentFromDashboard(form: FormData) {
  const g = await guard();
  if (!g.ok) return g;
  const staffId = String(form.get("staff_id") || "");
  const kind = form.get("kind") === "rc_pro" ? "rc_pro" : "attestation_vigilance";
  const file = form.get("file");
  const issuedAt = String(form.get("issued_at") || "") || null;
  const validUntil = String(form.get("valid_until") || "") || null;
  if (!staffId || !(file instanceof File) || file.size === 0) return { ok: false as const, error: "Fichier manquant." };
  if (file.size > MAX_BYTES) return { ok: false as const, error: "Fichier trop lourd (4 Mo maximum)." };
  const ext = MIME_EXT[file.type];
  if (!ext) return { ok: false as const, error: "Format accepté : PDF, JPG ou PNG." };
  if (kind === "attestation_vigilance" && !issuedAt) return { ok: false as const, error: "Indique la date de délivrance de l'attestation." };

  const db = createAdminClient();
  const path = `${staffId}/${kind}-${Date.now()}.${ext}`;
  const { error: upErr } = await db.storage.from(STAFF_DOCS_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (upErr) return { ok: false as const, error: upErr.message };
  const { error } = await db.from("staff_documents").insert({
    staff_id: staffId,
    kind,
    file_path: path,
    file_name: file.name.slice(0, 200),
    issued_at: issuedAt,
    valid_until: validUntil ?? (kind === "attestation_vigilance" && issuedAt ? addMonths(issuedAt, VALID_MONTHS) : null),
    uploaded_via: "dashboard",
  });
  if (error) {
    await db.storage.from(STAFF_DOCS_BUCKET).remove([path]);
    return { ok: false as const, error: error.message };
  }
  refresh();
  return { ok: true as const, message: "Document ajouté." };
}

export async function setDocumentVerified(docId: string, verified: boolean) {
  const g = await guard();
  if (!g.ok) return g;
  const db = createAdminClient();
  const { error } = await db
    .from("staff_documents")
    .update(verified ? { verified_at: new Date().toISOString(), verified_by: g.userId } : { verified_at: null, verified_by: null })
    .eq("id", docId);
  refresh();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, message: verified ? "Marquée comme vérifiée." : "Vérification retirée." };
}

/** Lien signé de 2 minutes pour ouvrir un document privé. */
export async function getDocumentUrl(docId: string) {
  const g = await guard();
  if (!g.ok) return g;
  const db = createAdminClient();
  const { data: doc } = await db.from("staff_documents").select("file_path").eq("id", docId).maybeSingle();
  if (!doc) return { ok: false as const, error: "Document introuvable." };
  const { data, error } = await db.storage.from(STAFF_DOCS_BUCKET).createSignedUrl(doc.file_path, 120);
  if (error || !data) return { ok: false as const, error: error?.message ?? "Lien indisponible." };
  return { ok: true as const, url: data.signedUrl };
}

export async function deleteDocument(docId: string) {
  const g = await guard();
  if (!g.ok) return g;
  const db = createAdminClient();
  const { data: doc } = await db.from("staff_documents").select("file_path").eq("id", docId).maybeSingle();
  if (!doc) return { ok: false as const, error: "Document introuvable." };
  const { error } = await db.from("staff_documents").delete().eq("id", docId);
  if (error) return { ok: false as const, error: error.message };
  await db.storage.from(STAFF_DOCS_BUCKET).remove([doc.file_path]);
  refresh();
  return { ok: true as const, message: "Document supprimé." };
}
