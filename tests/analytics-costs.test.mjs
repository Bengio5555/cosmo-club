// Tests du module « ce qui nous coûte ». Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { sumBy, merchantKey, groupDebits, monthsBetween } from "../lib/analytics/costs.ts";

test("sumBy regroupe, somme, compte et trie", () => {
  const out = sumBy(
    [{ k: "a", n: "Rhum", v: 10 }, { k: "a", n: "Rhum", v: 5 }, { k: "b", n: "Gin", v: 40 }, { k: "c", n: "Vide", v: 0 }],
    (r) => r.k, (r) => r.n, (r) => r.v,
  );
  assert.deepEqual(out.map((x) => [x.label, x.amount, x.count]), [["Gin", 40, 1], ["Rhum", 15, 2]]);
});

test("clé fournisseur : mots vides et numéros ignorés", () => {
  assert.equal(merchantKey("GENERALI IARD SA", "x"), "generali iard");
  assert.equal(merchantKey("Vir SEPA Bluespace 2026", "x"), "bluespace");
  assert.equal(merchantKey("", "qonto_fee"), "qonto_fee");
});

test("charges fixes : présentes chaque mois avec un montant stable", () => {
  const d = (m, label, amount) => ({ amount, label, operation_type: "direct_debit", settled_at: `2026-${m}-05T00:00:00Z` });
  const groups = groupDebits(
    [d("08", "Bluespace", 750.8), d("09", "Bluespace", 750.8), d("10", "Bluespace", 750.8), d("08", "METRO FRANCE", 300), d("09", "METRO FRANCE", 50), d("10", "METRO FRANCE", 700), d("09", "FOMO PRODUCTION", 12000)],
    3,
  );
  const blue = groups.find((g) => g.key === "bluespace");
  const metro = groups.find((g) => g.key === "metro france");
  const fomo = groups.find((g) => g.key === "fomo production");
  assert.ok(blue.recurring, "Bluespace est fixe");
  assert.equal(blue.perMonth, 750.8);
  assert.ok(!metro.recurring, "Metro varie trop");
  assert.ok(!fomo.recurring, "un seul mois");
  assert.equal(groups[0].key, "fomo production", "trié par total");
});

test("mois couverts", () => {
  assert.ok(Math.abs(monthsBetween("2026-08-01", "2026-11-01") - 3.02) < 0.05);
  assert.equal(monthsBetween("2026-11-01", "2026-11-02"), 0.5, "plancher");
});
