// Tests du suivi des demandes d'avis (relance, avis reçu, règle des 12 mois,
// clics). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { reviewStage, clientBlock, isHumanClick, remindFrom, REVIEW_TOKEN_RE } from "../lib/reviewFollowup.ts";
import { candidateActions } from "../lib/geo/actions.ts";
import { buildReviewReminderEmail } from "../app/dashboard/(shell)/avis/email.ts";

const NOW = Date.parse("2026-10-28T10:00:00Z");
const ev = (id, client_id, requested = null, reminded = null, received = null) => ({
  id,
  client_id,
  review_requested_at: requested,
  review_reminded_at: reminded,
  review_received_at: received,
});

test("étapes : demande, attente, relance due, relancé, reçu", () => {
  assert.equal(reviewStage(ev("e1", "c1"), [], NOW).stage, "to_request");
  const waiting = reviewStage(ev("e1", "c1", "2026-10-25T10:00:00Z"), [], NOW);
  assert.equal(waiting.stage, "waiting");
  assert.equal(waiting.remindFrom, remindFrom("2026-10-25T10:00:00Z"));
  assert.equal(reviewStage(ev("e1", "c1", "2026-10-21T10:00:00Z"), [], NOW).stage, "to_remind", "7 jours pile");
  assert.equal(reviewStage(ev("e1", "c1", "2026-10-01T10:00:00Z", "2026-10-09T10:00:00Z"), [], NOW).stage, "reminded");
  assert.equal(
    reviewStage(ev("e1", "c1", "2026-10-01T10:00:00Z", null, "2026-10-03T10:00:00Z"), [], NOW).stage,
    "received",
    "un avis reçu arrête les relances",
  );
});

test("une demande par client sur 12 mois, aucune après un avis", () => {
  const history = [ev("old", "c1", "2026-03-01T10:00:00Z")];
  const s = reviewStage(ev("e2", "c1"), history, NOW);
  assert.equal(s.stage, "client_done");
  assert.equal(s.reason, "recent");
  assert.equal(clientBlock("e2", [ev("old", "c1", "2025-09-01T10:00:00Z")], NOW), null, "plus de 12 mois : on redemande");
  const reviewed = clientBlock("e2", [ev("old", "c1", "2024-01-01T10:00:00Z", null, "2024-01-05T10:00:00Z")], NOW);
  assert.equal(reviewed.reason, "reviewed", "un avis laissé, même ancien, suffit");
  assert.equal(clientBlock("e2", [ev("e2", "c1", "2026-10-20T10:00:00Z")], NOW), null, "l'événement lui-même ne compte pas");
});

test("clics : robots et antivirus de messagerie ignorés", () => {
  const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";
  assert.ok(isHumanClick(ua, "2026-10-28T09:00:00Z", NOW));
  assert.ok(!isHumanClick(ua, "2026-10-28T09:59:00Z", NOW), "clic dans les 2 minutes après l'envoi");
  assert.ok(!isHumanClick("Mozilla/5.0 (compatible; SafeLinks)", "2026-10-27T09:00:00Z", NOW));
  assert.ok(!isHumanClick("", "2026-10-27T09:00:00Z", NOW));
  assert.ok(REVIEW_TOKEN_RE.test("0123456789abcdef0123456789abcdef"));
  assert.ok(!REVIEW_TOKEN_RE.test("../../etc"));
});

test("relance : e-mail court, même lien, HTML échappé", () => {
  const { subject, text, html } = buildReviewReminderEmail({
    firstName: "Paul",
    reviewUrl: "https://www.cosmoclub.fr/avis/0123456789abcdef0123456789abcdef",
  });
  assert.equal(subject, "Petit rappel de la Cosmo Team");
  assert.match(text, /^Bonjour Paul,/);
  assert.match(text, /Laisser un avis : https:\/\/www\.cosmoclub\.fr\/avis\//);
  assert.ok(html.includes('href="https://www.cosmoclub.fr/avis/0123456789abcdef0123456789abcdef"'));
});

test("à faire : demandes et relances sur une seule ligne", () => {
  const base = { runs: [], results: [] };
  const both = candidateActions({
    ...base,
    pendingReviews: { count: 2, latestEventId: "e1" },
    remindableReviews: { count: 1, latestEventId: "e5" },
  });
  assert.equal(both.length, 1);
  assert.equal(both[0].title, "Envoie les 2 demandes et la relance d'avis en attente");
  const remindOnly = candidateActions({
    ...base,
    pendingReviews: { count: 0, latestEventId: null },
    remindableReviews: { count: 3, latestEventId: "e5" },
  });
  assert.equal(remindOnly[0].key, "reviews:relance-e5");
  assert.equal(remindOnly[0].href, "/dashboard/avis?vue=relancer");
  assert.equal(candidateActions({ ...base, pendingReviews: { count: 0, latestEventId: null } }).length, 0);
});
