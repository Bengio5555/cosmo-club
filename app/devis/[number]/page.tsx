import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateFR, formatEUR } from "@/lib/format";
import { AcceptanceActions } from "./AcceptanceActions";
import "./plaquette.css";

type Params = Promise<{ number: string }>;

// The devis number is human-readable ("DV-2026-00001") — anyone with the
// URL can view the plaquette. We also scope visibility to statuses that
// are intentionally exposed: drafts stay private, everything else can be
// read (the client needs to see the devis even after it has been
// accepted/refused so they can re-download their copy).
const PUBLIC_STATUSES = ["envoye", "accepte", "refuse", "expire"] as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { number } = await params;
  return {
    title: `Devis ${number} — Cosmo Club Paris`,
    robots: { index: false, follow: false },
  };
}

export default async function DevisPlaquettePage({ params }: { params: Params }) {
  const { number } = await params;
  // Use the service-role client server-side: RLS on quotes only lets
  // authenticated users read, but the plaquette must be viewable by
  // unauthenticated clients who received the link by email. We manually
  // gate visibility on `status` below so drafts stay private. A future
  // improvement is adding a per-quote `public_token` column so the URL
  // isn't enumerable from the sequence number.
  const supabase = createAdminClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("number", number)
    .maybeSingle();

  if (!quote || !PUBLIC_STATUSES.includes(quote.status as (typeof PUBLIC_STATUSES)[number])) {
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

  // Group items by section (preserving position order within each group).
  const sections = new Map<string, typeof items>();
  for (const it of items ?? []) {
    const key = it.section ?? "Prestations";
    const arr = sections.get(key) ?? [];
    arr.push(it);
    sections.set(key, arr);
  }

  const clientDisplayName =
    [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
    client?.company_name ||
    client?.email ||
    "";

  return (
    <main className="plaquette">
      {/* ─── Cover ─── */}
      <section className="plaquette__cover">
        <header className="plaquette__brand">
          <div className="plaquette__brand-mark">CC</div>
          <div>
            <p className="plaquette__brand-name">Cosmo Club Paris</p>
            <p className="plaquette__brand-tag">Bar à cocktails · Barista · Événementiel</p>
          </div>
        </header>

        <div className="plaquette__cover-body">
          <p className="plaquette__eyebrow">Proposition</p>
          <h1 className="plaquette__cover-title">
            {quote.subject || `Devis ${quote.number}`}
          </h1>
          {quote.intro && (
            <p className="plaquette__cover-intro">{quote.intro}</p>
          )}
          <dl className="plaquette__cover-meta">
            <div>
              <dt>Client</dt>
              <dd>{clientDisplayName || "—"}</dd>
            </div>
            <div>
              <dt>Référence</dt>
              <dd>{quote.number}</dd>
            </div>
            <div>
              <dt>Émis le</dt>
              <dd>{formatDateFR(quote.issue_date)}</dd>
            </div>
            {quote.valid_until && (
              <div>
                <dt>Valable jusqu&apos;au</dt>
                <dd>{formatDateFR(quote.valid_until)}</dd>
              </div>
            )}
            {quote.event_date && (
              <div>
                <dt>Événement</dt>
                <dd>{formatDateFR(quote.event_date)}</dd>
              </div>
            )}
            {quote.event_location && (
              <div>
                <dt>Lieu</dt>
                <dd>{quote.event_location}</dd>
              </div>
            )}
            {quote.guests_count && (
              <div>
                <dt>Invités</dt>
                <dd>{quote.guests_count}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      {/* ─── Sections ─── */}
      {Array.from(sections.entries()).map(([name, sectionItems], idx) => (
        <section className="plaquette__section" key={name}>
          <header className="plaquette__section-head">
            <p className="plaquette__eyebrow">Section {String(idx + 1).padStart(2, "0")}</p>
            <h2 className="plaquette__section-title">{name}</h2>
          </header>

          <table className="plaquette__table">
            <thead>
              <tr>
                <th className="plaquette__col-title">Prestation</th>
                <th className="plaquette__col-qty">Qté</th>
                <th className="plaquette__col-unit">Unité</th>
                <th className="plaquette__col-price">PU HT</th>
                <th className="plaquette__col-total">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {(sectionItems ?? []).map((it) => (
                <tr key={it.id}>
                  <td>
                    <p className="plaquette__item-title">{it.title}</p>
                    {it.description && (
                      <p className="plaquette__item-desc">{it.description}</p>
                    )}
                  </td>
                  <td className="plaquette__num">{it.qty}</td>
                  <td className="plaquette__unit">{it.unit ?? ""}</td>
                  <td className="plaquette__num">{formatEUR(it.unit_price_ht ?? 0)}</td>
                  <td className="plaquette__num plaquette__total">
                    {formatEUR(it.line_total_ht ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {/* ─── Totaux ─── */}
      <section className="plaquette__totals">
        <div className="plaquette__totals-box">
          <div className="plaquette__totals-row">
            <span>Total HT</span>
            <span>{formatEUR(quote.total_ht)}</span>
          </div>
          <div className="plaquette__totals-row">
            <span>
              {settings?.tva_franchise ? "TVA" : `TVA (${quote.tva_rate}%)`}
            </span>
            <span>
              {settings?.tva_franchise
                ? "Non applicable"
                : formatEUR(quote.total_tva)}
            </span>
          </div>
          <div className="plaquette__totals-row plaquette__totals-ttc">
            <span>Total TTC</span>
            <span>{formatEUR(quote.total_ttc)}</span>
          </div>
        </div>
      </section>

      {/* ─── Conditions + mentions légales ─── */}
      {(quote.terms || settings) && (
        <section className="plaquette__fine-print">
          {quote.terms && (
            <div className="plaquette__terms">
              <p className="plaquette__eyebrow">Conditions</p>
              <p>{quote.terms}</p>
            </div>
          )}
          {settings && (
            <div className="plaquette__legal">
              <p className="plaquette__eyebrow">Cosmo Club Paris</p>
              <p>
                {settings.company_name}
                {settings.legal_form ? ` · ${settings.legal_form}` : ""}
                {settings.siret ? ` · SIRET ${settings.siret}` : ""}
                {settings.tva_intracom ? ` · TVA ${settings.tva_intracom}` : ""}
              </p>
              {settings.tva_franchise && (
                <p className="plaquette__legal-note">
                  TVA non applicable, art. 293 B du CGI.
                </p>
              )}
              {(settings.address_line1 || settings.city) && (
                <p>
                  {[settings.address_line1, settings.address_line2]
                    .filter(Boolean)
                    .join(", ")}
                  {settings.postal_code || settings.city
                    ? ` — ${[settings.postal_code, settings.city].filter(Boolean).join(" ")}`
                    : ""}
                </p>
              )}
              <p>
                {settings.email ? settings.email : ""}
                {settings.phone ? ` · ${settings.phone}` : ""}
              </p>
              {settings.penalty_rate_text && (
                <p className="plaquette__legal-note">
                  {settings.penalty_rate_text}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* ─── Acceptation (only when sent) ─── */}
      {quote.status === "envoye" && (
        <section className="plaquette__cta">
          <h2 className="plaquette__cta-title">Prêt à valider ?</h2>
          <p className="plaquette__cta-sub">
            Un clic sur « Accepter le devis » vaut engagement. Nous revenons
            vers vous sous 24 h pour la suite (acompte, contrat, logistique).
          </p>
          <AcceptanceActions quoteId={quote.id} number={quote.number} />
        </section>
      )}

      {quote.status === "accepte" && (
        <section className="plaquette__cta plaquette__cta--accepte">
          <p className="plaquette__eyebrow">Devis accepté</p>
          <h2 className="plaquette__cta-title">Merci {clientDisplayName} !</h2>
          <p className="plaquette__cta-sub">
            Nous revenons vers vous avec le contrat + modalités de paiement.
          </p>
        </section>
      )}

      {quote.status === "refuse" && (
        <section className="plaquette__cta plaquette__cta--refuse">
          <p className="plaquette__eyebrow">Devis refusé</p>
          <p className="plaquette__cta-sub">
            On prend note. On reste à votre disposition pour ajuster si
            besoin.
          </p>
        </section>
      )}

      <footer className="plaquette__footer">
        <p>© {new Date().getFullYear()} Cosmo Club Paris — Tous droits réservés.</p>
      </footer>
    </main>
  );
}
