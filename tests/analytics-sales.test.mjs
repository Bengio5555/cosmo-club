// Tests du module d'analyse des ventes. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { salesKey, aggregateSales, totalsBySection, summarizeByType } from "../lib/analytics/sales.ts";

test("clé de regroupement : chiffres, parenthèses, accents neutralisés", () => {
  assert.equal(salesKey("Barman (6h)"), salesKey("Barman (5 h)"));
  assert.equal(salesKey("Glaçons 20 kg : cubes"), salesKey("Glacons 40kg : cubes"));
  assert.notEqual(salesKey("Barman"), salesKey("Barista"));
  assert.equal(salesKey("Cocktails gamme « Cosmo »"), salesKey("cocktails gamme \"COSMO\""));
});

test("agrégation : CA, lignes, devis distincts, taux de présence", () => {
  const items = aggregateSales(
    [
      { quote_id: "q1", title: "Barman (6h)", section: "Personnels", qty: 2, line_total_ht: 600 },
      { quote_id: "q1", title: "Barman (4h)", section: "Personnels", qty: 1, line_total_ht: 200 },
      { quote_id: "q2", title: "Barman", section: "Personnels", qty: 1, line_total_ht: 300 },
      { quote_id: "q2", title: "Glaçons 20 kg", section: "Options", qty: 20, line_total_ht: 60 },
    ],
    4,
  );
  assert.equal(items[0].key, salesKey("Barman"));
  assert.equal(items[0].revenueHt, 1100);
  assert.equal(items[0].lines, 3);
  assert.equal(items[0].quotes, 2);
  assert.equal(items[0].presencePct, 50);
  assert.equal(items[0].qty, 4);
  assert.equal(items[1].presencePct, 25);
  const sections = totalsBySection(items);
  assert.deepEqual(sections.map((s) => [s.section, s.revenueHt, s.sharePct]), [["Personnels", 1100, 95], ["Options", 60, 5]]);
});

test("synthèse par type : panier, CA/invité, marge pondérée, acceptation", () => {
  const s = summarizeByType(
    [
      { type: "corporate", revenueNetHt: 2000, marginHt: 1000, guests: 100 },
      { type: "corporate", revenueNetHt: 1000, marginHt: null, guests: null },
      { type: "mariage", revenueNetHt: 5000, marginHt: 2000, guests: 100 },
    ],
    [
      { type: "corporate", status: "accepte" },
      { type: "corporate", status: "refuse" },
      { type: "corporate", status: "envoye" },
      { type: "mariage", status: "accepte" },
    ],
  );
  const corpo = s.find((x) => x.type === "corporate");
  assert.equal(corpo.events, 2);
  assert.equal(corpo.avgBasket, 1500);
  assert.equal(corpo.revenuePerGuest, 20, "seulement les événements avec invités");
  assert.equal(corpo.marginPct, 50, "marge pondérée sur les événements qui en ont une");
  assert.equal(corpo.marginEvents, 1);
  assert.equal(corpo.quotesSent, 3);
  assert.equal(corpo.acceptancePct, 50, "les devis encore en attente ne comptent pas");
  assert.equal(s[0].type, "mariage", "trié par CA");
});
