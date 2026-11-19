"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { addMonths, isValidSiret, normalizeSiret, VALID_MONTHS } from "@/lib/staff/compliance";
import { refreshSiret, STAFF_DOCS_BUCKET } from "@/lib/server/staffCompliance";

// Dépôt public, sans compte : le lien personnel (compliance_token) fait
// office d'accès, comme le lien d'un devis. On n'expose jamais les
// documents déjà déposés, seulement leur date.

// Vercel refuse les requêtes de plus de 4,5 Mo : on reste en dessous.
const MAX_BYTES = 4 * 1024 * 1024;
const MIME_EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SubmitResult = { ok: true; message: string } | { ok: false; error: string };

function isoDateOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export async function submitComplianceDocs(token: string, form: FormData): Promise<SubmitResult> {
  if (!UUID.test(token)) return { ok: false, error: "Lien invalide." };
  const db = createAdminClient();
  const { data: staff } = await db.from("staff").select("id,siret,legal_status,archived").eq("compliance_token", token).maybeSingle();
  if (!staff || staff.archived) return { ok: false, error: "Lien invalide ou expiré." };

  const today = new Date().toISOString().slice(0, 10);
  const att = form.get("attestation");
  const rc = form.get("rc_pro");
  const issuedAt = isoDateOrNull(form.get("issued_at"));
  const rcUntil = isoDateOrNull(form.get("rc_valid_until"));
  const rawSiret = String(form.get("siret") ?? "").trim();
  const legal = String(form.get("legal_status") ?? "");

  const hasAtt = att instanceof File && att.size > 0;
  const hasRc = rc instanceof File && rc.size > 0;
  if (!hasAtt && !hasRc && !rawSiret) return { ok: false, error: "Ajoutez au moins votre attestation." };

  for (const f of [hasAtt ? (att as File) : null, hasRc ? (rc as File) : null]) {
    if (!f) continue;
    if (f.size > MAX_BYTES) return { ok: false, error: `« ${f.name} » est trop lourd (4 Mo maximum).` };
    if (!MIME_EXT[f.type]) return { ok: false, error: `« ${f.name} » : formats acceptés PDF, JPG ou PNG.` };
  }
  if (hasAtt) {
    if (!issuedAt) return { ok: false, error: "Indiquez la date de délivrance de l'attestation (elle figure en haut du document)." };
    if (issuedAt > today) return { ok: false, error: "La date de délivrance ne peut pas être dans le futur." };
    if (addMonths(issuedAt, VALID_MONTHS) < today) return { ok: false, error: "Cette attestation a plus de 6 mois : téléchargez-en une nouvelle sur votre espace URSSAF." };
  }

  // SIRET et statut
  let siret: string | null = staff.siret;
  if (rawSiret) {
    siret = normalizeSiret(rawSiret);
    if (!siret || !isValidSiret(siret)) return { ok: false, error: "Ce SIRET n'est pas valide : vérifiez les 14 chiffres." };
  }
  const legalStatus = legal === "micro" || legal === "societe" ? legal : staff.legal_status;
  if (siret !== staff.siret || legalStatus !== staff.legal_status) {
    await db.from("staff").update({ siret, legal_status: legalStatus }).eq("id", staff.id);
    if (siret !== staff.siret) await refreshSiret(db, staff.id, siret);
  }

  async function store(file: File, kind: "attestation_vigilance" | "rc_pro", issued: string | null, until: string | null) {
    const path = `${staff!.id}/${kind}-${Date.now()}.${MIME_EXT[file.type]}`;
    const { error: upErr } = await db.storage.from(STAFF_DOCS_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { error } = await db.from("staff_documents").insert({
      staff_id: staff!.id,
      kind,
      file_path: path,
      file_name: file.name.slice(0, 200),
      issued_at: issued,
      valid_until: until,
      uploaded_via: "lien",
    });
    if (error) {
      await db.storage.from(STAFF_DOCS_BUCKET).remove([path]);
      throw new Error(error.message);
    }
  }

  try {
    if (hasAtt) await store(att as File, "attestation_vigilance", issuedAt, addMonths(issuedAt!, VALID_MONTHS));
    if (hasRc) await store(rc as File, "rc_pro", null, rcUntil);
  } catch (e) {
    console.error("[conformite] upload failed:", e);
    return { ok: false, error: "L'envoi a échoué, réessayez dans un instant." };
  }

  revalidatePath("/dashboard/conformite");
  revalidatePath(`/conformite/${token}`);
  return { ok: true, message: hasAtt ? "Merci, votre attestation est bien reçue." : "Merci, c'est enregistré." };
}
