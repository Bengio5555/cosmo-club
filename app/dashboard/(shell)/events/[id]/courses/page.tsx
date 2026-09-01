import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDateFR, formatEUR } from "@/lib/format";
import { PrintButton } from "./PrintButton";
import { computeCoursesData, type CoursesMode } from "./computeCoursesData";
import "./courses.css";

type Params = Promise<{ id: string }>;
type SP = Promise<{ mode?: string }>;

/**
 * Shopping list HTML preview. Kept as a browsable page so the owner
 * can see the list before downloading, or print it directly from the
 * browser if they prefer. The actual PDF download goes through the
 * /api/dashboard/events/[id]/courses-pdf route (same data source).
 */
export default async function CoursesPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SP;
}) {
  const { id } = await params;
  const { mode: modeParam } = await searchParams;
  const mode: CoursesMode = modeParam === "full" ? "full" : "shortage";
  const showOnlyShortage = mode === "shortage";

  const supabase = await createClient();
  const data = await computeCoursesData(supabase, id, mode);
  if (!data) notFound();

  const {
    event,
    clientName,
    menuLines,
    totalCocktails,
    supplierGroups,
    grandTotal,
    missingMenu,
  } = data;

  return (
    <div className="courses-body bg-slate-100 dark:bg-slate-900">
      <div className="courses-toolbar no-print">
        <div className="left">
          <Link
            href={`/dashboard/events/${event.id}`}
            className="inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Retour à l&apos;événement
          </Link>
        </div>
        <div className="right">
          <Link
            href={`/dashboard/events/${event.id}/courses?mode=${
              showOnlyShortage ? "full" : "shortage"
            }`}
          >
            {showOnlyShortage ? "Vue complète" : "Manques seulement"}
          </Link>
          <PrintButton eventId={event.id} mode={mode} />
        </div>
      </div>

      <article className="courses">
        <header className="courses-header">
          <div>
            <p className="courses-eyebrow">Liste de courses</p>
            <h1 className="courses-title">{event.title}</h1>
            <div className="courses-meta">
              <strong>{event.date ? formatDateFR(event.date) : ""}</strong>
              {event.location && <> · {event.location}</>}
              {clientName && (
                <>
                  <br />Client&nbsp;: <strong>{clientName}</strong>
                </>
              )}
              {event.guests_count && <> · {event.guests_count}&nbsp;invités</>}
            </div>
          </div>

          {menuLines.length > 0 && (
            <dl className="courses-menu">
              <dt>Menu prévu</dt>
              <dd>
                {menuLines.map((m, i) => (
                  <div key={i}>
                    <strong>× {m.qty}</strong> · {m.name}
                  </div>
                ))}
                <div style={{ marginTop: 6, fontSize: 10, opacity: 0.7 }}>
                  Total : {totalCocktails} cocktails
                </div>
              </dd>
            </dl>
          )}
        </header>

        {supplierGroups.length === 0 ? (
          <div className="courses-empty">
            {missingMenu
              ? "Aucun menu saisi pour cet événement — ajoute des cocktails sur la fiche event pour générer la liste."
              : showOnlyShortage
                ? "✓ Tout est en stock. Aucune course à faire pour cet événement."
                : "Aucun produit à acheter."}
          </div>
        ) : (
          supplierGroups.map((g) => (
            <section key={g.name} className="supplier-group">
              <div className="supplier-header">
                <span className="supplier-name">{g.name}</span>
                <span className="supplier-count">
                  {g.lines.length} produit{g.lines.length > 1 ? "s" : ""}
                </span>
              </div>
              <table className="courses-table">
                <thead>
                  <tr>
                    <th className="check"></th>
                    <th>Produit</th>
                    <th className="num">À acheter</th>
                    <th className="num">Unité</th>
                    <th className="num">PU</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {g.lines.map((l) => (
                    <tr key={l.productId}>
                      <td className="check">
                        <span />
                      </td>
                      <td>
                        <div className="prod-name">{l.productName}</div>
                        <div className="prod-sub">
                          {l.category}
                          {l.perUnit &&
                            l.contentUnit &&
                            ` · ${l.perUnit} ${l.contentUnit}/${l.unit}`}
                          {showOnlyShortage && (
                            <>
                              {" "}· besoin {l.packsNeeded}, stock {l.stockQty}
                              {l.stockClaimedElsewhere > 0 &&
                                ` (${l.stockClaimedElsewhere} réservé${l.stockClaimedElsewhere > 1 ? "s" : ""} sur un événement antérieur)`}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="num qty">{l.toBuy}</td>
                      <td className="num unit">{l.unit}</td>
                      <td className="num">
                        {l.costPerPack != null
                          ? formatEUR(l.costPerPack)
                          : "—"}
                      </td>
                      <td className="num">
                        {l.lineCost != null ? formatEUR(l.lineCost) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {g.subtotal > 0 && (
                <div className="supplier-subtotal">
                  Sous-total {g.name}&nbsp;:{" "}
                  <strong>{formatEUR(g.subtotal)}</strong>
                </div>
              )}
            </section>
          ))
        )}

        {supplierGroups.length > 0 && grandTotal > 0 && (
          <div className="courses-totals">
            <span className="label">
              {showOnlyShortage ? "Total à acheter" : "Total matière"}
            </span>
            <span className="value">{formatEUR(grandTotal)}</span>
          </div>
        )}

        <footer className="courses-footer">
          Liste générée le {formatDateFR(new Date(), { withTime: true })} ·
          Cosmo Club Paris · à valider à réception fournisseur.
        </footer>
      </article>
    </div>
  );
}
