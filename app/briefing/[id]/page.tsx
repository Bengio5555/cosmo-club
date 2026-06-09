import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateFR } from "@/lib/format";
import {
  parseBriefing,
  BRIEFING_MONTAGE_GUIDE,
  type BriefingScheduleStep,
} from "@/lib/server/briefingPreset";
import { PrintButton } from "./PrintButton";
import "./briefing.css";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Briefing staff · ${id.slice(0, 8)}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicBriefingPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const providedToken = typeof sp.t === "string" ? sp.t : null;

  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select(
      "id,title,date,start_time,end_time,location,guests_count,briefing_data,briefing_token,client_id",
    )
    .eq("id", id)
    .maybeSingle();

  // IDOR guard: token must match. We 404 on mismatch / missing token /
  // null briefing so we don't confirm the event exists.
  if (
    !event ||
    !event.briefing_token ||
    !providedToken ||
    event.briefing_token !== providedToken ||
    !event.briefing_data
  ) {
    notFound();
  }

  // Auto-fill: pull cocktails + ingredients + client. Avoid PostgREST
  // nested joins (typed client doesn't infer them) — use plain .in()
  // queries with in-memory join.
  const [{ data: cocktailLinks }, { data: client }] = await Promise.all([
    supabase
      .from("event_cocktails")
      .select("cocktail_id,qty_planned")
      .eq("event_id", id),
    event.client_id
      ? supabase
          .from("clients")
          .select("first_name,last_name,company_name")
          .eq("id", event.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const cocktailIds = (cocktailLinks ?? [])
    .map((c) => c.cocktail_id)
    .filter((v): v is string => !!v);

  let cocktails: Array<{
    name: string;
    description: string | null;
    qty_planned: number;
    ingredients: { name: string; qty: number; unit: string }[];
  }> = [];

  if (cocktailIds.length > 0) {
    const [{ data: cocktailRows }, { data: ings }] = await Promise.all([
      supabase
        .from("cocktails")
        .select("id,name,description")
        .in("id", cocktailIds),
      supabase
        .from("cocktail_ingredients")
        .select("cocktail_id,position,qty,product_id")
        .in("cocktail_id", cocktailIds)
        .order("position", { ascending: true }),
    ]);

    const productIds = Array.from(
      new Set((ings ?? []).map((i) => i.product_id).filter((v): v is string => !!v)),
    );
    const { data: products } = productIds.length
      ? await supabase
          .from("products")
          .select("id,name,unit,content_unit")
          .in("id", productIds)
      : { data: [] };
    const productById = new Map((products ?? []).map((p) => [p.id, p]));

    const byCocktail = new Map<string, NonNullable<typeof ings>>();
    for (const i of ings ?? []) {
      const arr = byCocktail.get(i.cocktail_id) ?? [];
      arr.push(i);
      byCocktail.set(i.cocktail_id, arr);
    }
    const plannedById = new Map(
      (cocktailLinks ?? []).map((c) => [c.cocktail_id, Number(c.qty_planned ?? 0)]),
    );

    cocktails = (cocktailRows ?? []).map((c) => ({
      name: c.name,
      description: c.description,
      qty_planned: plannedById.get(c.id) ?? 0,
      ingredients: (byCocktail.get(c.id) ?? []).map((i) => {
        const p = productById.get(i.product_id);
        return {
          name: p?.name ?? "—",
          qty: Number(i.qty),
          unit: p?.content_unit ?? p?.unit ?? "",
        };
      }),
    }));
  }

  const data = parseBriefing(event.briefing_data);
  const clientLabel =
    client?.company_name ||
    [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
    null;

  return (
    <div className="briefing-body">
      <div className="briefing-actions no-print">
        <PrintButton />
      </div>

      <article className="briefing">
        <header className="briefing-header">
          <h1>{event.title}</h1>
          <p className="briefing-subtitle">
            {formatDateFR(event.date)}
            {event.start_time ? ` · ${event.start_time.slice(0, 5)}` : ""}
            {event.location ? ` · ${event.location}` : ""}
            {clientLabel ? ` · ${clientLabel}` : ""}
            {event.guests_count != null ? ` · ${event.guests_count} invités` : ""}
          </p>
        </header>

        {/* ─── Schedule table — matches the PDF format ─── */}
        <section className="briefing-section">
          <h2 className="briefing-h2 briefing-h2--grenat">
            Planning de la prestation
          </h2>
          <table className="briefing-schedule">
            <thead>
              <tr>
                <th style={{ width: "12%" }}>Horaires</th>
                <th style={{ width: "32%" }}>Désignations</th>
                <th style={{ width: "20%" }}>Intervenants</th>
                <th style={{ width: "36%" }}>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {data.schedule.map((step: BriefingScheduleStep, i: number) => (
                <tr key={i}>
                  <td className="briefing-time" data-label="Horaire">
                    {step.time ? step.time.replace(":", "h").toUpperCase() : "—"}
                  </td>
                  <td className="briefing-desc" data-label="Désignation">
                    {step.label || "—"}
                  </td>
                  <td className="briefing-people" data-label="Intervenants">
                    {step.assignees.length > 0
                      ? step.assignees.join(" / ")
                      : "—"}
                  </td>
                  <td className="briefing-comment" data-label="Commentaire">
                    {step.comment ? (
                      <pre>{step.comment}</pre>
                    ) : (
                      <span className="briefing-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ─── Stocks ─── */}
        {data.stocks_notes.trim() && (
          <section className="briefing-section">
            <h2 className="briefing-h2">Stocks à prendre</h2>
            <pre className="briefing-pre">{data.stocks_notes}</pre>
          </section>
        )}

        {/* ─── Cocktails / recettes ─── */}
        {cocktails.length > 0 && (
          <section className="briefing-section">
            <h2 className="briefing-h2">
              Recettes ({cocktails.length} cocktail
              {cocktails.length > 1 ? "s" : ""})
            </h2>
            <div className="briefing-recipes">
              {cocktails.map((c, idx) => (
                <div key={idx} className="briefing-recipe">
                  <p className="briefing-recipe-name">
                    {c.name}
                    {c.qty_planned > 0 && (
                      <span className="briefing-recipe-qty">
                        — {c.qty_planned} prévus
                      </span>
                    )}
                  </p>
                  {c.description && (
                    <p className="briefing-recipe-desc">{c.description}</p>
                  )}
                  {c.ingredients.length > 0 && (
                    <ul className="briefing-recipe-ings">
                      {c.ingredients.map((i, j) => (
                        <li key={j}>
                          {i.qty} {i.unit} {i.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Dress code ─── */}
        {data.dress_code.trim() && (
          <section className="briefing-section">
            <h2 className="briefing-h2">Dress code</h2>
            <p>{data.dress_code}</p>
          </section>
        )}

        {/* ─── External contacts ─── */}
        {data.external_contacts.length > 0 && (
          <section className="briefing-section">
            <h2 className="briefing-h2">Contacts livreurs externes</h2>
            <table className="briefing-contacts">
              <thead>
                <tr>
                  <th>Rôle</th>
                  <th>Nom / société</th>
                  <th>Téléphone</th>
                  <th>N° commande</th>
                </tr>
              </thead>
              <tbody>
                {data.external_contacts.map((c, i) => (
                  <tr key={i}>
                    <td data-label="Rôle">{c.role || "—"}</td>
                    <td data-label="Nom / société">{c.name || "—"}</td>
                    <td data-label="Téléphone">
                      {c.phone ? (
                        <a href={`tel:${c.phone.replace(/\s/g, "")}`}>
                          {c.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label="N° commande">{c.order_ref || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ─── General notes ─── */}
        {data.general_notes.trim() && (
          <section className="briefing-section">
            <h2 className="briefing-h2 briefing-h2--warn">⚠️ Notes & warnings</h2>
            <pre className="briefing-pre">{data.general_notes}</pre>
          </section>
        )}

        {/* ─── Attachments ─── */}
        {data.attachments.length > 0 && (
          <section className="briefing-section">
            <h2 className="briefing-h2">Documents annexes</h2>
            <ul className="briefing-attachments">
              {data.attachments.map((a, i) => (
                <li key={i}>
                  <a href={a.url} target="_blank" rel="noopener noreferrer">
                    {a.label || a.url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ─── Fixed montage guide ─── */}
        <section className="briefing-section briefing-guide">
          <h2 className="briefing-h2">Guide de référence</h2>
          <pre className="briefing-pre">{BRIEFING_MONTAGE_GUIDE}</pre>
        </section>

        <footer className="briefing-footer">
          Cosmo Club Paris · briefing interne — ne pas partager au client
        </footer>
      </article>
    </div>
  );
}
