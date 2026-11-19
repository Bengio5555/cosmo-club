/**
 * Conformité des indépendants — obligation de vigilance URSSAF.
 *
 * Règle légale : dès 5 000 € HT cumulés avec un même indépendant, le
 * donneur d'ordre doit détenir une attestation de vigilance de moins de
 * 6 mois (art. L8222-1 et D8222-5 du Code du travail).
 *
 * Politique Cosmo Club (plus stricte, décidée le 2026-11-19) :
 *  - alerte et demande dès 4 000 € (passé 12 mois + événements à venir),
 *  - renouvellement tous les 3 mois au-delà,
 *  - SIRET vérifié pour tout le monde.
 *
 * Module pur : pas d'accès base, testé dans tests/staff-compliance.test.mjs.
 */

export const ALERT_THRESHOLD = 4000;
export const LEGAL_THRESHOLD = 5000;
/** Âge à partir duquel on redemande une attestation (politique Cosmo). */
export const REFRESH_DAYS = 91;
/** Validité légale d'une attestation de vigilance. */
export const VALID_MONTHS = 6;
/** Délai avant la relance unique, puis délai avant un nouveau cycle. */
export const REMIND_AFTER_DAYS = 10;
export const NEW_CYCLE_AFTER_DAYS = 45;

const DAY = 86_400_000;

export type Assignment = {
  date: string; // date de l'événement, ISO
  hours_planned: number | null;
  hours_done: number | null;
  rate_override: number | null;
  paid_amount: number | null;
};

/** Montant d'une prestation : payé si renseigné, sinon heures × taux. */
export function assignmentAmount(a: Assignment, hourlyRate: number | null): number {
  if (a.paid_amount && a.paid_amount > 0) return Number(a.paid_amount);
  const rate = Number(a.rate_override ?? hourlyRate ?? 0);
  const hours = Number(a.hours_done ?? a.hours_planned ?? 0);
  return Math.max(0, rate * hours);
}

/**
 * Cumul sur les 12 derniers mois (événements passés) et projection avec
 * les événements à venir. Le seuil légal s'apprécie sur l'ensemble de la
 * relation : on anticipe donc avec ce qui est déjà planifié.
 */
export function cumulate(assignments: Assignment[], hourlyRate: number | null, today: Date) {
  const t = today.getTime();
  let past12m = 0;
  let upcoming = 0;
  for (const a of assignments) {
    const d = new Date(a.date).getTime();
    if (!Number.isFinite(d)) continue;
    const amount = assignmentAmount(a, hourlyRate);
    if (d > t) upcoming += amount;
    else if (t - d <= 365 * DAY) past12m += amount;
  }
  return { past12m, upcoming, projected: past12m + upcoming };
}

export function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate + (isoDate.length === 10 ? "T00:00:00Z" : ""));
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

export type Attestation = { issued_at: string | null; valid_until: string | null; verified_at: string | null; created_at: string };

/** Fin de validité légale : celle saisie, sinon délivrance + 6 mois. */
export function attestationValidUntil(a: Attestation): string | null {
  if (a.valid_until) return a.valid_until;
  const base = a.issued_at ?? a.created_at?.slice(0, 10);
  return base ? addMonths(base, VALID_MONTHS) : null;
}

export type ComplianceState =
  | "hors_seuil" // projeté < 4 000 €, rien à demander
  | "a_demander" // ≥ 4 000 € projeté, pas d'attestation, sous le seuil légal
  | "manquante" // ≥ 5 000 € projeté, pas d'attestation : obligation non remplie
  | "a_renouveler" // attestation encore valide mais de plus de 3 mois
  | "expiree" // attestation de plus de 6 mois
  | "a_jour";

export type ComplianceInput = {
  projected: number;
  latest: Attestation | null;
  siretStatus: "actif" | "cesse" | "introuvable" | null;
  today: Date;
};

export type ComplianceResult = {
  state: ComplianceState;
  /** Rouge : obligation légale non couverte ou SIRET en défaut. */
  severity: "ok" | "info" | "warn" | "alert";
  needsRequest: boolean;
  validUntil: string | null;
  ageDays: number | null;
  verified: boolean;
  siretProblem: boolean;
};

export function complianceStatus(i: ComplianceInput): ComplianceResult {
  const siretProblem = i.siretStatus === "cesse" || i.siretStatus === "introuvable";
  const legal = i.projected >= LEGAL_THRESHOLD;
  const concerned = i.projected >= ALERT_THRESHOLD;
  const t = i.today.getTime();

  let state: ComplianceState;
  let validUntil: string | null = null;
  let ageDays: number | null = null;
  const verified = !!i.latest?.verified_at;

  if (i.latest) {
    validUntil = attestationValidUntil(i.latest);
    const issued = i.latest.issued_at ?? i.latest.created_at.slice(0, 10);
    ageDays = Math.floor((t - new Date(issued + "T00:00:00Z").getTime()) / DAY);
  }

  if (!concerned && !i.latest) state = "hors_seuil";
  else if (!i.latest) state = legal ? "manquante" : "a_demander";
  else if (validUntil && new Date(validUntil + "T23:59:59Z").getTime() < t) state = "expiree";
  else if ((ageDays ?? 0) > REFRESH_DAYS) state = "a_renouveler";
  else state = "a_jour";

  // Une attestation expirée sous le seuil d'alerte n'appelle rien.
  const needsRequest = concerned && (state === "a_demander" || state === "manquante" || state === "a_renouveler" || state === "expiree");

  let severity: ComplianceResult["severity"];
  if (siretProblem || (legal && (state === "manquante" || state === "expiree"))) severity = "alert";
  else if (needsRequest || (state === "a_jour" && !verified)) severity = "warn";
  else if (state === "hors_seuil") severity = "info";
  else severity = "ok";

  return { state, severity, needsRequest, validUntil, ageDays, verified, siretProblem };
}

/**
 * Quel email envoyer (cadence automatique) :
 *  - « demande » si rien n'a été demandé, ou si le dernier cycle date de
 *    plus de 45 jours sans dépôt ;
 *  - une seule « relance », 10 jours après la demande, sans dépôt depuis ;
 *  - sinon rien (le dashboard signale « sans réponse »).
 */
export function nextComplianceEmail(o: {
  needsRequest: boolean;
  hasEmail: boolean;
  requestedAt: string | null;
  remindedAt: string | null;
  lastUploadAt: string | null;
  today: Date;
}): "demande" | "relance" | null {
  if (!o.needsRequest || !o.hasEmail) return null;
  const t = o.today.getTime();
  const req = o.requestedAt ? new Date(o.requestedAt).getTime() : null;
  const uploadedSinceRequest = req != null && o.lastUploadAt != null && new Date(o.lastUploadAt).getTime() >= req;
  if (req == null) return "demande";
  if (uploadedSinceRequest) return null; // déposé : attendre la vérification
  if (t - req >= NEW_CYCLE_AFTER_DAYS * DAY) return "demande";
  if (!o.remindedAt && t - req >= REMIND_AFTER_DAYS * DAY) return "relance";
  return null;
}

/** SIRET : 14 chiffres + clé de Luhn (sauf La Poste, 356000000…). */
export function normalizeSiret(raw: string | null | undefined): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  return d.length === 14 ? d : null;
}

export function isValidSiret(raw: string | null | undefined): boolean {
  const s = normalizeSiret(raw);
  if (!s) return false;
  if (s.startsWith("356000000")) return true;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let n = Number(s[13 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export const STATE_LABEL: Record<ComplianceState, string> = {
  hors_seuil: "Sous le seuil",
  a_demander: "À demander",
  manquante: "Manquante",
  a_renouveler: "À renouveler",
  expiree: "Expirée",
  a_jour: "À jour",
};

export const LEGAL_STATUS_LABEL: Record<"micro" | "societe" | "extra_salarie", string> = {
  micro: "Micro-entrepreneur",
  societe: "Société",
  extra_salarie: "Extra salarié",
};
