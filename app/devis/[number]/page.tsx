import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateFR, formatEUR } from "@/lib/format";
import { AcceptanceActions } from "./AcceptanceActions";
import { NavDots } from "./NavDots";
import { t, normalizeLocale } from "@/lib/i18n/quote-plaquette";
import "./plaquette.css";

type Params = Promise<{ number: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Drafts stay private; anything beyond it is viewable via the URL the
// client received in their email.
const PUBLIC_STATUSES = ["envoye", "accepte", "refuse", "expire"] as const;

// Default moodboard — 8 visuals from the public site. Used as a
// fallback when the owner hasn't picked anything from the event
// gallery via the dashboard editor.
const MOODBOARD: string[] = [
  "/brand/ai/gallery-event.png",
  "/brand/ai/bento-bar-cocktails.png",
  "/brand/ai/hero-bar-cocktails.png",
  "/brand/ai/bento-barista.png",
  "/brand/ai/latte-matcha.png",
  "/brand/ai/hero-barista.png",
  "/brand/ai/latte-ube.png",
  "/brand/ai/pastilles.png",
];

const DEFAULT_COVER = "/brand/devis/cover-cocktail-chili.jpg";
const DEFAULT_OFFER_IMAGE = "/brand/ai/bento-bar-cocktails.png";

// Cap aligned with the dashboard picker. The moodboard layout adapts
// (1–8 photos, see plaquette.css `.moodboard-grid--N`).
const MOODBOARD_MAX = 8;

const DEFAULT_COCKTAILS = [
  "Cosmopolitan",
  "Margarita",
  "Moscow Mule",
  "Pornstar Martini",
  "Espresso Martini",
  "Basilic Smash",
  "Amaretto Sour",
  "Old Fashioned",
];

// Default terms when quote.terms is empty. The "Acompte" line is
// generated dynamically from quote.deposit_rate at render time. Locale
// flips the whole block to EN when the operator chose the English
// plaquette in the editor.
function defaultTerms(
  depositPct: number,
  locale: "fr" | "en",
): { label: string; text: string }[] {
  if (locale === "en") {
    return [
      {
        label: "Validity",
        text: "This proposal is valid for 30 days from the date of issue. Beyond that, pricing may be adjusted based on availability.",
      },
      {
        label: "Deposit",
        text: `A ${depositPct}% deposit is required on signature to confirm the booking. The balance is due 7 days before the event.`,
      },
      {
        label: "Cancellation",
        text: "If cancelled more than 30 days before the event, 50% of the deposit is refunded. Between 30 and 15 days, 25%. Within 15 days, the deposit is non-refundable.",
      },
      {
        label: "Changes",
        text: "Minor adjustments to the menu or headcount (±10%) are accepted up to 10 days before the event at no extra cost.",
      },
    ];
  }
  return [
    {
      label: "Validité",
      text: "Cette proposition est valable 30 jours à compter de sa date d'émission. Au-delà, un réajustement tarifaire pourra s'appliquer selon la disponibilité.",
    },
    {
      label: "Acompte",
      text: `Un acompte de ${depositPct} % est demandé à la signature pour confirmer la réservation de la date. Le solde est réglé à J-7.`,
    },
    {
      label: "Annulation",
      text: "En cas d'annulation à plus de 30 jours de l'événement, 50 % de l'acompte est remboursé. Entre 30 et 15 jours, 25 %. Moins de 15 jours, l'acompte est conservé.",
    },
    {
      label: "Modifications",
      text: "Les ajustements mineurs de carte ou d'effectif (±10 %) sont acceptés jusqu'à J-10 sans surcoût.",
    },
  ];
}

// Default note shown under the totals when settings don't provide one.
const DEFAULT_TOTALS_NOTE =
  "Les prix s'entendent hors taxes, matériel et consommables inclus.\n" +
  "Frais de déplacement Paris intra-muros inclus.\n" +
  "Repérage du lieu effectué 48h avant l'événement, sans frais.\n" +
  "Un brief personnalisé vous sera adressé la semaine précédant la date.";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { number } = await params;
  return {
    title: `Devis ${number} — Cosmo Club Paris`,
    robots: { index: false, follow: false },
  };
}

export default async function DevisPlaquettePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { number } = await params;
  const sp = await searchParams;
  const providedToken = typeof sp.t === "string" ? sp.t : null;
  const supabase = createAdminClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("number", number)
    .maybeSingle();

  if (!quote || !PUBLIC_STATUSES.includes(quote.status as (typeof PUBLIC_STATUSES)[number])) {
    notFound();
  }

  // IDOR guard: les devis créés après l'activation du token ont un
  // access_token NOT NULL. Sans token dans l'URL ou token incorrect,
  // on renvoie un 404 (404 plutôt que 403 pour ne pas confirmer
  // l'existence du numéro à un attaquant qui itère).
  // Les devis legacy (access_token IS NULL) restent accessibles par
  // numéro seul — sinon on casserait tous les liens email déjà
  // envoyés avant le déploiement de cette protection.
  if (quote.access_token && quote.access_token !== providedToken) {
    notFound();
  }

  const [{ data: items }, { data: settings }, { data: client }] = await Promise.all([
    supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", quote.id)
      .order("position", { ascending: true }),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    quote.client_id
      ? supabase.from("clients").select("*").eq("id", quote.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // ─── Group items by section ───
  const bySection = new Map<string, typeof items>();
  for (const it of items ?? []) {
    const key = it.section ?? "Prestations";
    const arr = bySection.get(key) ?? [];
    arr.push(it);
    bySection.set(key, arr);
  }
  const sections = [...bySection.entries()];

  // ─── Derived display bits ───
  const companyName = settings?.company_name || "Cosmo Club Paris";
  const senderShortName = "Cosmo Club";

  const clientDisplayName =
    [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
    client?.company_name ||
    client?.email ||
    "";

  const coverTitle = buildCoverTitle(quote.subject, clientDisplayName, quote.number);

  const marqueeWords = buildMarquee(items ?? []);

  const letterHook = buildLetterHook(clientDisplayName);

  // Acompte: per-quote rate stored as a fraction (0..1) on the DB.
  // Defensive coerce + clamp in case of legacy rows. The UI displays
  // the integer percentage so "0.30" becomes "30 %".
  const depositRate = Math.min(
    1,
    Math.max(0, Number((quote as { deposit_rate?: number }).deposit_rate ?? 0.5)),
  );
  const depositPct = Math.round(depositRate * 100);
  // Per-quote locale: 'fr' (default for every existing quote) or 'en'.
  // Falls through normalizeLocale to defend against legacy NULL rows
  // and unexpected values.
  const locale = normalizeLocale((quote as { language?: string }).language);
  const i18n = t(locale);
  const terms = splitTerms(quote.terms) ?? defaultTerms(depositPct, locale);

  const validUntilLabel = quote.valid_until
    ? locale === "en"
      ? `Valid until ${new Date(quote.valid_until).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
      : `Valable jusqu'au ${formatDateFR(quote.valid_until)}`
    : locale === "en"
      ? "Valid for 30 days from issue date"
      : "Valable 30 jours à compter de l'émission";

  const deposit = round2(quote.total_ttc * depositRate);

  // Gross-up factor when an agency commission is in play. We persist
  // base prices on quote_items and apply the multiplier at render so
  // line totals add up to quote.total_ht. The owner-side editor stores
  // commission_rate; on the client-facing PDF nothing is labeled
  // "commission" — only the inflated figures are visible.
  const commissionRate = Math.min(
    99,
    Math.max(0, Number(quote.commission_rate ?? 0)),
  );
  const grossUp =
    commissionRate > 0 ? 100 / (100 - commissionRate) : 1;

  // Global discount surfaced as a distinct row in the totals table so
  // the client sees the commercial gesture. quote.total_ht is already
  // POST-discount (and post-commission), so to render the "before"
  // figure we invert the discount factor — pre = total_ht / (1 − pct).
  const discountGlobalPctNum = Math.min(
    100,
    Math.max(0, Number((quote as { discount_global_pct?: number }).discount_global_pct ?? 0)),
  );
  const displayedSubtotalPreDiscount =
    discountGlobalPctNum > 0
      ? round2(quote.total_ht / (1 - discountGlobalPctNum / 100))
      : quote.total_ht;
  const displayedDiscountAmount = round2(
    displayedSubtotalPreDiscount - quote.total_ht,
  );

  // Cover date label: single day or "du X au Y" range for multi-day
  // events. Locale-aware (long-form EN dates / FR formatting).
  const eventEndDate =
    (quote as { event_end_date?: string | null }).event_end_date ?? null;
  const fmtCoverDate = (iso: string) =>
    locale === "en"
      ? new Date(iso).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : formatDateFR(iso);
  const eventDateLabel =
    quote.event_date && eventEndDate && eventEndDate.slice(0, 10) !== quote.event_date.slice(0, 10)
      ? locale === "en"
        ? `From ${fmtCoverDate(quote.event_date)} to ${fmtCoverDate(eventEndDate)}`
        : `Du ${fmtCoverDate(quote.event_date)} au ${fmtCoverDate(eventEndDate)}`
      : quote.event_date
        ? fmtCoverDate(quote.event_date)
        : "";

  // Totals note from settings (penalty + any custom copy) or the default.
  const totalsNote =
    settings?.penalty_rate_text && settings.penalty_rate_text.trim()
      ? `${DEFAULT_TOTALS_NOTE}\n\n${settings.penalty_rate_text}`
      : DEFAULT_TOTALS_NOTE;

  // Moodboard: owner-picked images from the event gallery if any,
  // otherwise the brand default. Capped at MOODBOARD_MAX so the grid
  // CSS never gets a count it doesn't have a class for.
  const moodboardImages = sanitizeMoodboard(
    (quote as { moodboard_images?: unknown }).moodboard_images,
  );
  const moodboardToRender =
    moodboardImages.length > 0 ? moodboardImages : MOODBOARD.slice(0, MOODBOARD_MAX);

  return (
    <div className="plaquette-body">
      <NavDots />

      {/* ============ 01 — COVER ============ */}
      <section id="cover" className="cover">
        <div
          className="cover-image"
          style={{ backgroundImage: `url('${DEFAULT_COVER}')` }}
        />
        <div className="cover-content">
          <header className="cover-top">
            <div className="cover-logo">COSMO&nbsp;&nbsp;CLUB</div>
            <div className="cover-ref">
              <small>{locale === "en" ? "Proposal N°" : "Proposition N°"}</small>
              {quote.number}
            </div>
          </header>

          <div className="cover-main">
            <div className="cover-kicker">
              <em>{locale === "en" ? "A proposal for" : "Une proposition pour"}</em>
            </div>
            <h1 className="cover-title" dangerouslySetInnerHTML={{ __html: coverTitle }} />

            <div className="cover-meta">
              {quote.event_date && (
                <div className="cover-meta-item">
                  <small>{locale === "en" ? "Date" : "Date"}</small>
                  <strong>{eventDateLabel}</strong>
                </div>
              )}
              {quote.event_location && (
                <div className="cover-meta-item">
                  <small>{locale === "en" ? "Venue" : "Lieu"}</small>
                  <strong>{quote.event_location}</strong>
                </div>
              )}
              {quote.guests_count != null && (
                <div className="cover-meta-item">
                  <small>{locale === "en" ? "Guests" : "Invités"}</small>
                  <strong>{quote.guests_count}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ MARQUEE ============ */}
      <div className="marquee">
        <div className="marquee-inner">
          {[...marqueeWords, ...marqueeWords].map((w, i) => (
            <span key={i}>
              {w}
              {i < marqueeWords.length * 2 - 1 && (
                <span className="dot" style={{ margin: 0 }}>
                  {" "}
                  ·{" "}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* ============ 02 — LETTER ============ */}
      {quote.intro && (
        <section id="lettre" className="intro-letter">
          <div className="brand-mark">COSMO CLUB</div>
          <span className="page-mark">— 02 —</span>

          <div className="intro-letter-wrap">
            <div className="letter-kicker">
              {locale === "en" ? "A word to begin" : "Un mot pour commencer"}
            </div>
            <h2 className="letter-hook" dangerouslySetInnerHTML={{ __html: letterHook }} />

            <p className="letter-body dropcap">{quote.intro}</p>

            <p className="letter-body">
              {locale === "en" ? (
                <>
                  This proposal is valid for <strong>30 days</strong>. We remain
                  available to refine it as your vision takes shape.
                </>
              ) : (
                <>
                  Cette proposition est valable <strong>30 jours</strong>. Nous
                  restons à votre écoute pour l&apos;adapter à mesure que votre
                  vision se précise.
                </>
              )}
            </p>

            <div className="letter-signoff">
              <div>
                <div className="signature-text">{senderShortName} Team</div>
                <div className="signature-name">
                  — {locale === "en" ? "The" : "L'équipe"} {senderShortName}
                  {locale === "en" ? " team" : ""}
                </div>
              </div>
              <div className="letter-date">
                {locale === "en"
                  ? `Paris, ${new Date(quote.issue_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                  : `Paris, le ${formatDateFR(quote.issue_date)}`}
              </div>
            </div>
          </div>

          <div className="page-number">— ii —</div>
        </section>
      )}

      {/* ============ 03 — MOODBOARD ============ */}
      <section id="moodboard" className="moodboard">
        <div className="brand-mark">COSMO CLUB</div>
        <span className="page-mark">— 03 —</span>

        <div className="moodboard-header">
          <div>
            <div className="section-label">Moodboard</div>
          </div>
          <h2 className="section-title">
            {locale === "en" ? (
              <>
                The atmosphere we <em>imagine</em> for you.
              </>
            ) : (
              <>
                L&apos;ambiance que nous <em>imaginons</em> pour vous.
              </>
            )}
          </h2>
        </div>

        <div
          className={`moodboard-grid moodboard-grid--${moodboardToRender.length}`}
        >
          {moodboardToRender.map((src, i) => (
            <div
              key={i}
              className={`mb-img mb-${i + 1}`}
              style={{ backgroundImage: `url('${src}')` }}
            />
          ))}
        </div>

        <div className="page-number">— iii —</div>
      </section>

      {/* ============ 04 — OFFER ============ */}
      {sections.length > 0 && (
        <section id="offre" className="offer-section">
          <div className="brand-mark">COSMO CLUB</div>
          <span className="page-mark">— 04 —</span>

          <div className="moodboard-header">
            <div>
              <div className="section-label">
                {locale === "en" ? "The proposal" : "La proposition"}
              </div>
            </div>
            <h2 className="section-title">
              {quote.subject ||
                (locale === "en" ? "Our proposal" : "Notre proposition")}
            </h2>
          </div>

          <div className="offer-split">
            {(() => {
              const rawSchedule = (quote as { schedule?: unknown }).schedule;
              const scheduleItems = Array.isArray(rawSchedule)
                ? (rawSchedule as Array<{ time?: string; label?: string }>)
                    .map((s) => ({
                      time: String(s?.time ?? "").trim(),
                      label: String(s?.label ?? "").trim(),
                    }))
                    .filter((s) => s.label.length > 0)
                : [];
              if (scheduleItems.length > 0) {
                return (
                  <div className="offer-schedule">
                    <p className="offer-schedule-eyebrow">
                      {locale === "en" ? "Schedule" : "Déroulé"}
                    </p>
                    <h3 className="offer-schedule-title">
                      {locale === "en"
                        ? "Event run-of-show"
                        : "Planning de la prestation"}
                    </h3>
                    <ol className="offer-schedule-list">
                      {scheduleItems.map((s, i) => (
                        <li key={i} className="offer-schedule-row">
                          <span className="offer-schedule-time">
                            {s.time || "—"}
                          </span>
                          <span className="offer-schedule-rule" aria-hidden />
                          <span className="offer-schedule-label">{s.label}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              }
              return (
                <div
                  className="offer-image"
                  style={{ backgroundImage: `url('${DEFAULT_OFFER_IMAGE}')` }}
                />
              );
            })()}

            <div className="offer-content">
              {quote.intro && (
                <p className="offer-intro">{truncate(quote.intro, 260)}</p>
              )}

              {sections.map(([sectionName, sectionItems], idx) => (
                <div className="offer-card" key={sectionName}>
                  <div className="offer-card-num">
                    — N°{String(idx + 1).padStart(2, "0")}
                  </div>
                  <h3 className="offer-card-title">{sectionName}</h3>
                  <ul className="offer-list">
                    {(sectionItems ?? []).map((it) => {
                      const aside = buildItemAside(it);
                      return (
                        <li key={it.id}>
                          <span>{it.title}</span>
                          {aside && <span>{aside}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="page-number">— iv —</div>
        </section>
      )}

      {/* ============ 05 — PRICING ============ */}
      <section id="chiffrage" className="pricing">
        <div className="brand-mark">COSMO CLUB</div>
        <span className="page-mark">— 05 —</span>

        <div className="pricing-header">
          <h2>
            {locale === "en" ? (
              <>
                The <em>pricing</em>.
              </>
            ) : (
              <>
                Le <em>chiffrage</em>.
              </>
            )}
          </h2>
          <div className="pricing-badge">
            <small>{locale === "en" ? "Proposal" : "Proposition"}</small>
            {validUntilLabel}
          </div>
        </div>

        <table className="price-table">
          <tbody>
            {sections.flatMap(([sectionName, sectionItems]) => [
              <tr key={`cat-${sectionName}`} className="category-row">
                <td colSpan={4}>{sectionName}</td>
              </tr>,
              ...(sectionItems ?? []).map((it) => {
                const discount = Number(it.discount_ht ?? 0);
                const grossSubtotal = round2(
                  Number(it.qty ?? 0) *
                    Number(it.unit_price_ht ?? 0) *
                    grossUp,
                );
                const grossDiscount = round2(discount * grossUp);
                const grossLineTotal = round2(
                  Number(it.line_total_ht ?? 0) * grossUp,
                );
                return (
                  <tr key={it.id}>
                    <td>
                      <strong>{it.title}</strong>
                      {it.description && <small>{it.description}</small>}
                      {discount > 0 && (
                        <small className="line-discount">
                          Remise commerciale&nbsp;: −{formatEUR(grossDiscount)}
                        </small>
                      )}
                    </td>
                    <td>{`${it.qty}${it.unit ? ` ${it.unit}` : ""}`}</td>
                    <td>
                      {formatEUR(round2((it.unit_price_ht ?? 0) * grossUp))}
                    </td>
                    <td>
                      {discount > 0 ? (
                        <>
                          <span className="line-strike">
                            {formatEUR(grossSubtotal)}
                          </span>
                          <strong>{formatEUR(grossLineTotal)}</strong>
                        </>
                      ) : (
                        formatEUR(grossLineTotal)
                      )}
                    </td>
                  </tr>
                );
              }),
            ])}
          </tbody>
        </table>

        <div className="totals-block">
          <p className="totals-note">{totalsNote}</p>

          <div>
            <table className="totals-table">
              <tbody>
                {/* When a global discount applies, surface it as its own
                    line so the client sees the commercial gesture
                    explicitly. The displayed pre-discount subtotal
                    grosses up from total_ht (which is already post-
                    discount, post-commission) by inverting the discount
                    factor — so the math the client sees stays
                    consistent with the line items rendered above. */}
                {discountGlobalPctNum > 0 ? (
                  <>
                    <tr>
                      <td>{i18n.totals.subtotal}</td>
                      <td>{formatEUR(displayedSubtotalPreDiscount)}</td>
                    </tr>
                    <tr className="line-discount">
                      <td>
                        {i18n.totals.discount}
                        {" "}(−{discountGlobalPctNum}%)
                      </td>
                      <td>− {formatEUR(displayedDiscountAmount)}</td>
                    </tr>
                    <tr>
                      <td>{i18n.totals.totalHt}</td>
                      <td>{formatEUR(quote.total_ht)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td>{i18n.totals.subtotal}</td>
                    <td>{formatEUR(quote.total_ht)}</td>
                  </tr>
                )}
                <tr>
                  <td>
                    {settings?.tva_franchise
                      ? i18n.totals.tva(0).split(" ")[0]
                      : i18n.totals.tva(Number(quote.tva_rate))}
                  </td>
                  <td>
                    {settings?.tva_franchise
                      ? locale === "en"
                        ? "Not applicable"
                        : "Non applicable"
                      : formatEUR(quote.total_tva)}
                  </td>
                </tr>
                <tr className="total-final">
                  <td>{i18n.totals.totalTtc}</td>
                  <td>{formatEUR(quote.total_ttc)}</td>
                </tr>
              </tbody>
            </table>

            <div className="deposit-block">
              <span>{i18n.totals.deposit(depositPct)}</span>
              <span>{formatEUR(deposit)}</span>
            </div>
          </div>
        </div>

        <div className="page-number">— v —</div>
      </section>

      {/* ============ 06 — SIGNATURE ============ */}
      <section id="signature" className="signature-page">
        <div className="brand-mark">COSMO CLUB</div>
        <span className="page-mark">— 06 —</span>

        <div className="sig-wrap">
          <h2 className="sig-title">
            {locale === "en" ? (
              <>
                Shall we <em>bring this project</em> to life together?
              </>
            ) : (
              <>
                Et si nous <em>donnions vie</em> à ce projet ensemble ?
              </>
            )}
          </h2>

          <div className="terms">
            {terms.slice(0, 4).map((t) => (
              <div className="term-item" key={t.label}>
                <h4>{t.label}</h4>
                <p>{t.text}</p>
              </div>
            ))}
          </div>

          {quote.status === "envoye" && (
            <div className="sig-cta">
              <div className="sig-cta-text">
                {locale === "en" ? (
                  <>
                    One click and we <em>lock in your date</em>.
                    <br />
                    Secure electronic signature, response within 24h.
                  </>
                ) : (
                  <>
                    Un clic et nous <em>bloquons votre date</em>.
                    <br />
                    Signature numérique sécurisée, réponse sous 24 h.
                  </>
                )}
              </div>
              <AcceptanceActions
                quoteId={quote.id}
                number={quote.number}
                defaultName={clientDisplayName}
                locale={locale}
              />
            </div>
          )}

          {quote.status === "accepte" && (
            <div className="sig-cta-status">
              ✓ {locale === "en" ? "Quote accepted" : "Devis accepté"}
              {quote.signed_by_name
                ? ` ${locale === "en" ? "by" : "par"} ${quote.signed_by_name}`
                : clientDisplayName
                  ? ` — ${locale === "en" ? "thank you" : "merci"} ${clientDisplayName}`
                  : ""}
              {quote.accepted_at &&
                ` ${locale === "en" ? "on" : "le"} ${new Date(quote.accepted_at).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })}`}
              .
              <br />
              {locale === "en"
                ? "We'll get back to you with the contract + deposit details within 24h."
                : "Nous revenons vers vous avec contrat + acompte sous 24 h."}
              {quote.signature_data && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "12px",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: "8px",
                    border: "1px solid rgba(201,169,97,0.25)",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>
                    {locale === "en" ? "Signature on file" : "Signature enregistrée"}
                  </p>
                  <img
                    src={quote.signature_data}
                    alt={`${locale === "en" ? "Signature of" : "Signature de"} ${quote.signed_by_name ?? (locale === "en" ? "client" : "client")}`}
                    style={{
                      marginTop: "6px",
                      maxWidth: "260px",
                      maxHeight: "100px",
                      background: "#fff",
                      borderRadius: "6px",
                      padding: "6px",
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {quote.status === "refuse" && (
            <div className="sig-cta-status refused">
              {locale === "en"
                ? "Quote declined. We remain available to adjust the proposal if needed."
                : "Devis refusé. Nous restons à votre disposition pour ajuster si besoin."}
            </div>
          )}

          <footer className="sig-footer">
            <div className="sig-footer-left">
              {companyName}
              {settings?.city ? ` — ${settings.city}` : ""}
            </div>
            <div className="sig-footer-right">
              {settings?.email ?? "contact@cosmoclub.fr"}
              {settings?.phone ? ` · ${settings.phone}` : ""}
            </div>
          </footer>
        </div>

        <div className="page-number">— vi —</div>
      </section>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Cover title logic:
 *  - quote.subject looks like "Julie & Mathieu" / "Sophie Dubois" → keep it
 *    but wrap the "&" in <em> so it renders gold-italic
 *  - no subject → fall back to client name, then to the devis number
 * Always returns HTML-safe markup.
 */
function buildCoverTitle(
  subject: string | null,
  clientDisplayName: string,
  number: string,
): string {
  const text = (subject && subject.trim()) || clientDisplayName || `Devis ${number}`;
  // Highlight " & " as gold italic; otherwise insert a <br/> roughly in
  // the middle for a big two-line title look on long strings.
  const escaped = escapeHtml(text);
  if (/\s&\s/.test(text)) {
    return escaped.replace(/\s&\s/, " <em>&amp;</em><br/>");
  }
  return escaped;
}

function buildLetterHook(clientName: string): string {
  if (clientName) {
    return `${escapeHtml(clientName)},<br/>merci de nous <em>avoir choisis</em>.`;
  }
  return `Merci de nous <em>avoir choisis</em>.`;
}

/**
 * Pick 8 marquee words: unique item titles first, padded with defaults.
 * Titles longer than 24 chars are truncated to keep the ribbon visually
 * consistent.
 */
function buildMarquee(
  items: Array<{ title: string | null }>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const t = (it.title ?? "").trim();
    if (!t) continue;
    const short = t.length > 24 ? t.slice(0, 22) + "…" : t;
    if (!seen.has(short)) {
      seen.add(short);
      out.push(short);
    }
    if (out.length >= 8) break;
  }
  while (out.length < 8) out.push(DEFAULT_COCKTAILS[out.length]);
  return out;
}

/**
 * Right-column label of an offer list line: only the qty with unit
 * when > 1. We deliberately omit any € amount here — the chiffrage
 * section is the single place where the client sees prices, so the
 * "proposition" page stays editorial and not transactional.
 */
function buildItemAside(it: {
  qty: number | null;
  unit: string | null;
}): string {
  const qty = it.qty ?? 0;
  if (qty > 1 && it.unit) return `${qty} ${it.unit}`;
  if (qty > 1) return String(qty);
  return "";
}

/**
 * Split free-form quote.terms into up to 4 labelled sections.
 * Supports two formats:
 *   "Label: text...\n\nLabel2: text..."
 *   "- text...\n- text..." (no labels → generic ones)
 * Returns null to fall back to the DEFAULT_TERMS.
 */
function splitTerms(
  terms: string | null,
): { label: string; text: string }[] | null {
  if (!terms || !terms.trim()) return null;
  const blocks = terms
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length === 0) return null;
  const fallbackLabels = ["Validité", "Acompte", "Annulation", "Modifications"];
  return blocks.slice(0, 4).map((b, i) => {
    const m = b.match(/^([^:\n]{2,40}):\s*([\s\S]+)$/);
    if (m) return { label: m[1].trim(), text: m[2].trim() };
    return { label: fallbackLabels[i] ?? `Condition ${i + 1}`, text: b };
  });
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Parse the persisted `moodboard_images` JSONB column into a clean
 * string[] of URLs. Drops anything that isn't an absolute URL or a
 * site-relative path; capped at MOODBOARD_MAX so the layout never gets
 * a count it isn't styled for.
 */
function sanitizeMoodboard(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const r of raw) {
    if (typeof r !== "string") continue;
    const s = r.trim();
    if (!s) continue;
    if (!/^(https?:\/\/|\/)/.test(s)) continue;
    out.push(s);
    if (out.length >= MOODBOARD_MAX) break;
  }
  return out;
}
