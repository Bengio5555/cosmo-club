// Tests de la conformité URSSAF des indépendants. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assignmentAmount,
  cumulate,
  addMonths,
  complianceStatus,
  nextComplianceEmail,
  isValidSiret,
  normalizeSiret,
} from "../lib/staff/compliance.ts";

const TODAY = new Date("2026-11-19T10:00:00Z");
const att = (issued, extra = {}) => ({ issued_at: issued, valid_until: null, verified_at: null, created_at: issued + "T12:00:00Z", ...extra });

test("montant : payé prioritaire, sinon heures faites puis prévues × taux", () => {
  assert.equal(assignmentAmount({ date: "", hours_planned: 6, hours_done: null, rate_override: null, paid_amount: 250 }, 30), 250);
  assert.equal(assignmentAmount({ date: "", hours_planned: 6, hours_done: 7, rate_override: null, paid_amount: null }, 30), 210);
  assert.equal(assignmentAmount({ date: "", hours_planned: 6, hours_done: null, rate_override: 40, paid_amount: 0 }, 30), 240);
});

test("cumul : 12 derniers mois + à venir, au-delà de 12 mois ignoré", () => {
  const a = (date, paid) => ({ date, hours_planned: 0, hours_done: null, rate_override: null, paid_amount: paid });
  const r = cumulate([a("2026-10-01", 1000), a("2025-12-01", 500), a("2025-10-01", 9999), a("2026-12-12", 700)], null, TODAY);
  assert.deepEqual(r, { past12m: 1500, upcoming: 700, projected: 2200 });
});

test("addMonths gère les fins de mois", () => {
  assert.equal(addMonths("2026-08-31", 6), "2027-02-28");
  assert.equal(addMonths("2026-05-19", 6), "2026-11-19");
});

test("statuts selon le seuil et l'âge de l'attestation", () => {
  const s = (projected, latest, siretStatus = "actif") => complianceStatus({ projected, latest, siretStatus, today: TODAY });
  assert.equal(s(1200, null).state, "hors_seuil");
  assert.equal(s(1200, null).needsRequest, false);
  assert.equal(s(4200, null).state, "a_demander");
  assert.equal(s(4200, null).severity, "warn");
  assert.equal(s(8100, null).state, "manquante");
  assert.equal(s(8100, null).severity, "alert");
  assert.equal(s(8100, att("2026-10-01")).state, "a_jour");
  assert.equal(s(8100, att("2026-10-01")).severity, "warn"); // pas encore vérifiée
  assert.equal(s(8100, att("2026-10-01", { verified_at: "2026-10-02T00:00:00Z" })).severity, "ok");
  assert.equal(s(8100, att("2026-07-01")).state, "a_renouveler");
  assert.equal(s(8100, att("2026-07-01")).needsRequest, true);
  assert.equal(s(8100, att("2026-04-01")).state, "expiree");
  assert.equal(s(8100, att("2026-04-01")).severity, "alert");
  assert.equal(s(800, att("2026-04-01")).needsRequest, false); // sous le seuil : rien à redemander
  assert.equal(s(800, null, "cesse").severity, "alert");
});

test("cadence des emails : demande, une relance à 10 jours, nouveau cycle à 45 jours", () => {
  const base = { needsRequest: true, hasEmail: true, requestedAt: null, remindedAt: null, lastUploadAt: null, today: TODAY };
  assert.equal(nextComplianceEmail(base), "demande");
  assert.equal(nextComplianceEmail({ ...base, hasEmail: false }), null);
  assert.equal(nextComplianceEmail({ ...base, needsRequest: false }), null);
  assert.equal(nextComplianceEmail({ ...base, requestedAt: "2026-11-15T09:00:00Z" }), null);
  assert.equal(nextComplianceEmail({ ...base, requestedAt: "2026-11-05T09:00:00Z" }), "relance");
  assert.equal(nextComplianceEmail({ ...base, requestedAt: "2026-11-05T09:00:00Z", remindedAt: "2026-11-16T09:00:00Z" }), null);
  assert.equal(nextComplianceEmail({ ...base, requestedAt: "2026-11-05T09:00:00Z", lastUploadAt: "2026-11-07T09:00:00Z" }), null);
  assert.equal(nextComplianceEmail({ ...base, requestedAt: "2026-09-20T09:00:00Z", remindedAt: "2026-10-01T09:00:00Z" }), "demande");
});

test("SIRET : format et clé de contrôle", () => {
  assert.equal(normalizeSiret("987 377 314 00016"), "98737731400016");
  assert.equal(isValidSiret("98737731400016"), true);
  assert.equal(isValidSiret("98737731400017"), false);
  assert.equal(isValidSiret("1234"), false);
});
