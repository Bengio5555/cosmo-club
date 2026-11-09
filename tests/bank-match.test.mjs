// Tests du rapprochement bancaire. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  mentionsNumber,
  clientTokens,
  rankCandidates,
  pickAutoMatch,
  scoreCandidate,
} from "../lib/bank/match.ts";

const inv = (over = {}) => ({
  id: "i1",
  number: "F-2026-0012",
  total_ttc: 1200,
  remaining: 1200,
  issue_date: "2026-10-20",
  due_date: "2026-11-19",
  client_name: "Maison Dupont SAS",
  client_tokens: clientTokens("Maison Dupont SAS"),
  ...over,
});

const tx = (over = {}) => ({
  amount: 1200,
  label: "MAISON DUPONT",
  reference: "Facture F-2026-0012",
  note: null,
  settled_at: "2026-11-02T10:00:00Z",
  emitted_at: "2026-11-02T10:00:00Z",
  ...over,
});

test("numéro reconnu sous plusieurs écritures", () => {
  assert.ok(mentionsNumber("VIR SEPA F-2026-0012", "F-2026-0012"));
  assert.ok(mentionsNumber("f20260012 merci", "F-2026-0012"));
  assert.ok(mentionsNumber("fact 2026 0012", "F-2026-0012"));
  assert.ok(!mentionsNumber("F-2026-0013", "F-2026-0012"));
  assert.ok(!mentionsNumber("", "F-2026-0012"));
});

test("mots du client sans formes juridiques", () => {
  assert.deepEqual(clientTokens("Maison Dupont SAS"), ["maison", "dupont"]);
  assert.deepEqual(clientTokens("Jean-Pierre Le Roux"), ["jean", "pierre", "roux"]);
});

test("numéro + montant exact → rapprochement automatique", () => {
  const ranked = rankCandidates(tx(), [inv(), inv({ id: "i2", number: "F-2026-0013", total_ttc: 1200, remaining: 1200, client_name: "Autre", client_tokens: ["autre"] })]);
  const auto = pickAutoMatch(ranked);
  assert.ok(auto, "un candidat automatique");
  assert.equal(auto.invoice.id, "i1");
  assert.ok(auto.reasons.includes("numero") && auto.reasons.includes("montant_exact"));
});

test("montant exact + nom du client, candidat unique → automatique", () => {
  const ranked = rankCandidates(tx({ reference: null, label: "VIR MAISON DUPONT" }), [
    inv(),
    inv({ id: "i2", number: "F-2026-0013", total_ttc: 980, remaining: 980, client_name: "Autre", client_tokens: ["autre"] }),
  ]);
  assert.equal(pickAutoMatch(ranked), null, "désactivé par défaut : suggestion seulement");
  const auto = pickAutoMatch(ranked, { amountAndClient: true });
  assert.ok(auto && auto.invoice.id === "i1", "activable par option");
});

test("montant exact + client mais une autre facture plausible → suggestion seulement", () => {
  const ranked = rankCandidates(tx({ reference: null, label: "VIR MAISON DUPONT" }), [
    inv(),
    inv({ id: "i2", number: "F-2026-0013" }), // même client, même montant
  ]);
  assert.equal(ranked.length, 2);
  assert.equal(pickAutoMatch(ranked, { amountAndClient: true }), null);
});

test("montant seul : suggestion, pas d'automatique", () => {
  const ranked = rankCandidates(tx({ reference: null, label: "VIR INCONNU" }), [inv()]);
  assert.equal(ranked.length, 1);
  assert.equal(pickAutoMatch(ranked), null);
});

test("deux factures de même montant au même client : rien n'est automatique", () => {
  const a = inv();
  const b = inv({ id: "i2", number: "F-2026-0013" });
  const ranked = rankCandidates(tx({ reference: "F-2026-0012 et F-2026-0013" }), [a, b]);
  assert.equal(pickAutoMatch(ranked), null);
});

test("acompte : proposé mais pas automatique", () => {
  const ranked = rankCandidates(tx({ amount: 400, reference: "acompte F-2026-0012" }), [inv()]);
  assert.equal(ranked.length, 1);
  assert.ok(ranked[0].reasons.includes("acompte"));
  assert.equal(pickAutoMatch(ranked), null);
});

test("virement antérieur à la facture : pénalisé", () => {
  const early = scoreCandidate(tx({ settled_at: "2026-09-01T00:00:00Z", emitted_at: "2026-09-01T00:00:00Z" }), inv());
  const normal = scoreCandidate(tx(), inv());
  assert.ok(early.score < normal.score);
});

test("facture déjà soldée : jamais proposée", () => {
  assert.equal(rankCandidates(tx(), [inv({ remaining: 0 })]).length, 0);
});
