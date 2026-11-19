"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, FileText, Loader2, RefreshCw, Send, Trash2, Upload } from "lucide-react";
import {
  deleteDocument,
  getDocumentUrl,
  recheckSiret,
  saveLegalInfo,
  sendRequestNow,
  setDocumentVerified,
  uploadDocumentFromDashboard,
} from "./actions";
import { LEGAL_STATUS_LABEL, LEGAL_THRESHOLD, STATE_LABEL, type ComplianceState } from "@/lib/staff/compliance";

export type TableRow = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  legalStatus: "micro" | "societe" | "extra_salarie" | null;
  siret: string | null;
  siretStatus: "actif" | "cesse" | "introuvable" | null;
  siretName: string | null;
  past12m: number;
  upcoming: number;
  projected: number;
  events12m: number;
  salaried: boolean;
  state: ComplianceState;
  severity: "ok" | "info" | "warn" | "alert";
  needsRequest: boolean;
  requestedAt: string | null;
  remindedAt: string | null;
  link: string;
  attestation: { id: string; issuedAt: string | null; validUntil: string | null; verifiedAt: string | null; createdAt: string; via: string } | null;
  rcPro: { id: string; validUntil: string | null; createdAt: string } | null;
};

const SEVERITY_STYLE: Record<TableRow["severity"], string> = {
  alert: "bg-red-100 text-red-800 ring-red-600/20 dark:bg-red-500/15 dark:text-red-300",
  warn: "bg-amber-100 text-amber-800 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300",
  ok: "bg-emerald-100 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300",
  info: "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300",
};

const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const dateFR = (iso: string | null) => (iso ? new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");

export function ComplianceTable({ rows }: { rows: TableRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  function run(id: string, fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setBusy(id);
    start(async () => {
      const res = await fn();
      setFlash({ id, text: res.ok ? res.message ?? "OK" : res.error ?? "Erreur", ok: res.ok });
      setBusy(null);
      router.refresh();
    });
  }

  async function openDoc(docId: string) {
    const res = await getDocumentUrl(docId);
    if (res.ok) window.open(res.url, "_blank", "noopener");
    else setFlash({ id: docId, text: res.error, ok: false });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
        Personne n&apos;atteint le seuil d&apos;alerte pour l&apos;instant. Passe sur « Tous les actifs » pour renseigner les SIRET.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const isBusy = pending && busy === r.id;
        const pct = Math.min(100, (r.projected / LEGAL_THRESHOLD) * 100);
        const pastPct = Math.min(100, (r.past12m / LEGAL_THRESHOLD) * 100);
        return (
          <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {r.name}
                  <span className="ml-2 text-xs font-normal capitalize text-slate-500">{r.role.replace(/_/g, " ")}</span>
                  {r.legalStatus && <span className="ml-2 text-xs font-normal text-slate-500">· {LEGAL_STATUS_LABEL[r.legalStatus]}</span>}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{r.email ?? "Pas d'email : impossible d'envoyer la demande"}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${SEVERITY_STYLE[r.severity]}`}>
                {r.salaried ? "Extra salarié, non concerné" : r.siretStatus === "cesse" ? "SIRET fermé" : r.siretStatus === "introuvable" ? "SIRET introuvable" : STATE_LABEL[r.state]}
              </span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {/* Montants */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cumul</p>
                <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                  {eur(r.past12m)} <span className="text-slate-500">sur 12 mois · {r.events12m} événement{r.events12m > 1 ? "s" : ""}</span>
                </p>
                {r.upcoming > 0 && <p className="text-xs text-slate-500">+ {eur(r.upcoming)} déjà planifiés</p>}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" title={`Seuil légal ${eur(LEGAL_THRESHOLD)}`}>
                  <div className="relative h-full" style={{ width: `${pct}%` }}>
                    <div className={`absolute inset-y-0 left-0 ${r.projected >= LEGAL_THRESHOLD ? "bg-red-500" : "bg-amber-400"} opacity-40`} style={{ width: "100%" }} />
                    <div className={`absolute inset-y-0 left-0 ${r.past12m >= LEGAL_THRESHOLD ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${pct ? (pastPct / pct) * 100 : 0}%` }} />
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Seuil légal {eur(LEGAL_THRESHOLD)}</p>
              </div>

              {/* SIRET */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">SIRET</p>
                {editing === r.id ? (
                  <form
                    className="mt-1 space-y-2"
                    action={(f) => {
                      setEditing(null);
                      run(r.id, () => saveLegalInfo(r.id, { legal_status: String(f.get("legal_status") || "") || null, siret: String(f.get("siret") || "") || null }));
                    }}
                  >
                    <select name="legal_status" defaultValue={r.legalStatus ?? ""} className="block w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950">
                      <option value="">Statut…</option>
                      <option value="micro">Micro-entrepreneur</option>
                      <option value="societe">Société</option>
                      <option value="extra_salarie">Extra salarié</option>
                    </select>
                    <input name="siret" defaultValue={r.siret ?? ""} inputMode="numeric" placeholder="14 chiffres" className="block w-full rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-950" />
                    <div className="flex gap-2">
                      <button className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900">Enregistrer</button>
                      <button type="button" onClick={() => setEditing(null)} className="px-2 py-1 text-xs text-slate-500">
                        Annuler
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-1">
                    {r.siret ? (
                      <>
                        <p className="font-mono text-sm text-slate-900 dark:text-slate-100">{r.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4")}</p>
                        <p className={`text-xs ${r.siretStatus === "actif" ? "text-emerald-600 dark:text-emerald-400" : r.siretStatus ? "text-red-600 dark:text-red-400" : "text-slate-500"}`}>
                          {r.siretStatus === "actif" ? `Actif${r.siretName ? ` · ${r.siretName}` : ""}` : r.siretStatus === "cesse" ? "Établissement fermé" : r.siretStatus === "introuvable" ? "Introuvable dans l'annuaire" : "Pas encore vérifié"}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">Non renseigné</p>
                    )}
                    <div className="mt-1 flex gap-3 text-xs">
                      <button type="button" onClick={() => setEditing(r.id)} className="text-slate-600 underline-offset-2 hover:underline dark:text-slate-400">
                        Modifier
                      </button>
                      {r.siret && (
                        <button type="button" onClick={() => run(r.id, () => recheckSiret(r.id))} className="inline-flex items-center gap-1 text-slate-600 hover:underline dark:text-slate-400">
                          <RefreshCw className="h-3 w-3" /> Revérifier
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Attestation de vigilance</p>
                {r.attestation ? (
                  <div className="mt-1 text-sm">
                    <button type="button" onClick={() => openDoc(r.attestation!.id)} className="inline-flex items-center gap-1 text-slate-900 hover:underline dark:text-slate-100">
                      <FileText className="h-3.5 w-3.5" /> Délivrée le {dateFR(r.attestation.issuedAt)}
                    </button>
                    <p className="text-xs text-slate-500">Valable jusqu&apos;au {dateFR(r.attestation.validUntil)}</p>
                    {r.attestation.verifiedAt ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3 w-3" /> Vérifiée le {dateFR(r.attestation.verifiedAt)}
                        <button type="button" onClick={() => run(r.id, () => setDocumentVerified(r.attestation!.id, false))} className="ml-1 text-slate-400 hover:underline">
                          annuler
                        </button>
                      </p>
                    ) : (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <a href="https://www.urssaf.fr/accueil/outils-documentation/outils/verification-attestation.html" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-slate-600 hover:underline dark:text-slate-400">
                          Vérifier sur urssaf.fr <ExternalLink className="h-3 w-3" />
                        </a>
                        <button type="button" onClick={() => run(r.id, () => setDocumentVerified(r.attestation!.id, true))} className="rounded-md bg-emerald-600 px-2 py-0.5 font-medium text-white hover:bg-emerald-700">
                          C&apos;est vérifié
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">Aucune</p>
                )}
                {r.rcPro && (
                  <button type="button" onClick={() => openDoc(r.rcPro!.id)} className="mt-2 inline-flex items-center gap-1 text-xs text-slate-600 hover:underline dark:text-slate-400">
                    <FileText className="h-3 w-3" /> Assurance RC pro{r.rcPro.validUntil ? ` · jusqu'au ${dateFR(r.rcPro.validUntil)}` : ""}
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
              {!r.salaried && (
                <button
                  type="button"
                  disabled={!r.email || isBusy}
                  onClick={() => run(r.id, () => sendRequestNow(r.id))}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium ${r.needsRequest ? "bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900" : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"} disabled:opacity-40`}
                >
                  {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Envoyer la demande
                </button>
              )}
              <button type="button" onClick={() => { void navigator.clipboard.writeText(r.link); setFlash({ id: r.id, text: "Lien de dépôt copié.", ok: true }); }} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <Copy className="h-3.5 w-3.5" /> Copier le lien de dépôt
              </button>
              <button type="button" onClick={() => setUploading(uploading === r.id ? null : r.id)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <Upload className="h-3.5 w-3.5" /> Ajouter un document
              </button>
              {r.attestation && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Supprimer définitivement cette attestation ?")) run(r.id, () => deleteDocument(r.attestation!.id));
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1.5 text-slate-400 hover:text-red-600"
                  title="Supprimer l'attestation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="ml-auto text-slate-500">
                {r.requestedAt ? `Demandé le ${dateFR(r.requestedAt)}${r.remindedAt ? `, relancé le ${dateFR(r.remindedAt)}` : ""}` : "Jamais demandé"}
              </span>
            </div>

            {uploading === r.id && (
              <form
                className="mt-3 grid gap-2 rounded-md bg-slate-50 p-3 text-xs sm:grid-cols-[auto_1fr_auto_auto_auto] sm:items-end dark:bg-slate-950"
                action={(f) => {
                  f.set("staff_id", r.id);
                  setUploading(null);
                  run(r.id, () => uploadDocumentFromDashboard(f));
                }}
              >
                <label className="block">
                  <span className="text-slate-500">Type</span>
                  <select name="kind" className="mt-0.5 block rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
                    <option value="attestation_vigilance">Attestation de vigilance</option>
                    <option value="rc_pro">Assurance RC pro</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-slate-500">Fichier (PDF, JPG, PNG)</span>
                  <input name="file" type="file" required accept="application/pdf,image/jpeg,image/png" className="mt-0.5 block w-full" />
                </label>
                <label className="block">
                  <span className="text-slate-500">Délivrée le</span>
                  <input name="issued_at" type="date" className="mt-0.5 block rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900" />
                </label>
                <label className="block">
                  <span className="text-slate-500">Valable jusqu&apos;au (facultatif)</span>
                  <input name="valid_until" type="date" className="mt-0.5 block rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900" />
                </label>
                <button className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white dark:bg-slate-100 dark:text-slate-900">Ajouter</button>
              </form>
            )}

            {flash?.id === r.id && <p className={`mt-2 text-xs ${flash.ok ? "text-emerald-600" : "text-red-600"}`}>{flash.text}</p>}
          </div>
        );
      })}
    </div>
  );
}
