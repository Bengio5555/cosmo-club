// Tests de la localisation du matériel. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { whereaboutsOf, progressByEvent } from "../lib/equipment/whereabouts.ts";

const events = new Map([
  ["e1", { id: "e1", title: "Soirée A", date: "2026-11-10", end_date: null, status: "en_cours" }],
  ["e2", { id: "e2", title: "Mariage B", date: "2026-11-20", end_date: null, status: "a_venir" }],
  ["e3", { id: "e3", title: "Corpo C", date: "2026-11-01", end_date: null, status: "termine" }],
  ["e4", { id: "e4", title: "Annulé D", date: "2026-11-12", end_date: null, status: "annule" }],
]);
const A = (event_id, equipment_id, depart_at = null, retour_at = null) => ({ event_id, equipment_id, depart_at, retour_at });

test("chargé sur un événement en cours → sur le terrain", () => {
  const w = whereaboutsOf("x", [A("e1", "x", "2026-11-10T08:00:00Z")], events);
  assert.equal(w.kind, "sorti");
  assert.equal(w.event.id, "e1");
});

test("chargé mais pas revenu d'un événement terminé → non revenu", () => {
  const w = whereaboutsOf("x", [A("e3", "x", "2026-11-01T08:00:00Z")], events);
  assert.equal(w.kind, "non_revenu");
});

test("revenu → au stock, même si encore affecté à un événement terminé", () => {
  const w = whereaboutsOf("x", [A("e3", "x", "2026-11-01T08:00:00Z", "2026-11-02T01:00:00Z")], events);
  assert.equal(w.kind, "stock");
});

test("affecté sans chargement → prévu sur le plus proche", () => {
  const w = whereaboutsOf("x", [A("e2", "x"), A("e1", "x")], events);
  assert.equal(w.kind, "prevu");
  assert.equal(w.event.id, "e1");
});

test("le terrain l'emporte sur le prévu ; un événement annulé est ignoré", () => {
  const w = whereaboutsOf("x", [A("e2", "x"), A("e1", "x", "2026-11-10T08:00:00Z"), A("e4", "x", "2026-11-12T08:00:00Z")], events);
  assert.equal(w.kind, "sorti");
  assert.equal(w.event.id, "e1");
});

test("avancement par événement, en cours d'abord", () => {
  const p = progressByEvent([A("e2", "a"), A("e1", "a", "t"), A("e1", "b", "t", "t"), A("e1", "c"), A("e3", "z", "t")], events);
  assert.deepEqual(p.map((x) => [x.event.id, x.total, x.charges, x.revenus]), [["e1", 3, 2, 1], ["e2", 1, 0, 0]]);
});
