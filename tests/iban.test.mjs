// Tests du contrôle d'IBAN (changement protégé par code). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { isValidIban, isValidBic, formatIban, maskIban, maskEmail, normalizeIban } from "../lib/iban.ts";

test("IBAN : contrôle mod 97 et longueur française", () => {
  assert.ok(isValidIban("FR76 3000 6000 0112 3456 7890 189"));
  assert.ok(isValidIban("fr7630006000011234567890189"), "minuscules et sans espaces");
  assert.ok(isValidIban("DE89 3704 0044 0532 0130 00"));
  assert.ok(!isValidIban("FR76 3000 6000 0112 3456 7890 188"), "une faute de frappe est refusée");
  assert.ok(!isValidIban("FR76 3000 6000 0112 3456 7890 18"), "IBAN français trop court");
  assert.ok(!isValidIban("<script>"));
  assert.ok(!isValidIban(""));
});

test("BIC, affichage et masquage", () => {
  assert.ok(isValidBic("AGRIFRPP"));
  assert.ok(isValidBic("bnpa frpp xxx"));
  assert.ok(!isValidBic("AGRI"));
  assert.equal(formatIban("fr7630006000011234567890189"), "FR76 3000 6000 0112 3456 7890 189");
  assert.equal(maskIban("FR76 3000 6000 0112 3456 7890 189"), "FR76 •••• 0189");
  assert.equal(maskIban(null), "—");
  assert.equal(normalizeIban(" fr76-3000 "), "FR763000");
  assert.equal(maskEmail("benjamin@cosmoclub.fr"), "b…@cosmoclub.fr");
});
