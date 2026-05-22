import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Global dashboard search — used by the command palette (⌘K) in the
 * Topbar. Fans the query out across the seven tables that surface in
 * day-to-day work, capped at 5 hits each so the dropdown stays
 * readable. All `.or(...)` patterns are ILIKE %query%; trade off
 * Postgres index hits for substring-friendly UX since the volumes
 * are small (<1k rows per table).
 *
 * Auth is mandatory — the API leaks operational data, so we 401 if
 * the session cookie can't resolve to a user.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ groups: [] });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // PostgREST `.or()` requires commas to separate filters and
  // doesn't accept commas inside the value — escape them.
  const safe = q.replace(/[,()]/g, " ");
  const like = `%${safe}%`;

  const [
    clientsRes,
    cocktailsRes,
    quotesRes,
    invoicesRes,
    leadsRes,
    eventsRes,
    productsRes,
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id,first_name,last_name,company_name,email,city")
      .or(
        `first_name.ilike.${like},last_name.ilike.${like},company_name.ilike.${like},email.ilike.${like}`,
      )
      .eq("archived", false)
      .limit(5),
    supabase
      .from("cocktails")
      .select("id,name,category")
      .or(`name.ilike.${like},category.ilike.${like}`)
      .eq("archived", false)
      .limit(5),
    supabase
      .from("quotes")
      .select("id,number,status,total_ttc,event_date,client_id")
      .ilike("number", like)
      .limit(5),
    supabase
      .from("invoices")
      .select("id,number,status,total_ttc,client_id")
      .ilike("number", like)
      .limit(5),
    supabase
      .from("leads")
      .select("id,contact_name,contact_email,company,status,event_date")
      .or(
        `contact_name.ilike.${like},contact_email.ilike.${like},company.ilike.${like}`,
      )
      .limit(5),
    supabase
      .from("events")
      .select("id,title,date,status,location")
      .or(`title.ilike.${like},location.ilike.${like}`)
      .limit(5),
    supabase
      .from("products")
      .select("id,name,category,unit")
      .or(`name.ilike.${like},category.ilike.${like}`)
      .eq("archived", false)
      .limit(5),
  ]);

  // Resolve client display names for the quote/invoice hits so the
  // hint line reads "DV-2026-00033 · Social Killers" instead of a
  // bare uuid. One extra round-trip but only when results exist.
  const clientIdsToResolve = new Set<string>();
  for (const q of quotesRes.data ?? []) {
    if (q.client_id) clientIdsToResolve.add(q.client_id);
  }
  for (const i of invoicesRes.data ?? []) {
    if (i.client_id) clientIdsToResolve.add(i.client_id);
  }
  let clientNameById = new Map<string, string>();
  if (clientIdsToResolve.size > 0) {
    const { data: cs } = await supabase
      .from("clients")
      .select("id,first_name,last_name,company_name,email")
      .in("id", Array.from(clientIdsToResolve));
    clientNameById = new Map(
      (cs ?? []).map((c) => [
        c.id,
        c.company_name ||
          [c.first_name, c.last_name].filter(Boolean).join(" ") ||
          c.email ||
          "—",
      ]),
    );
  }

  type Hit = {
    id: string;
    type:
      | "clients"
      | "cocktails"
      | "quotes"
      | "invoices"
      | "leads"
      | "events"
      | "products";
    label: string;
    hint?: string;
    href: string;
  };
  type Group = { type: string; label: string; hits: Hit[] };

  const groups: Group[] = [
    {
      type: "clients",
      label: "Clients",
      hits: (clientsRes.data ?? []).map((c): Hit => ({
        id: c.id,
        type: "clients",
        label:
          c.company_name ||
          [c.first_name, c.last_name].filter(Boolean).join(" ") ||
          c.email ||
          "—",
        hint: c.email ?? c.city ?? undefined,
        href: `/dashboard/clients/${c.id}`,
      })),
    },
    {
      type: "leads",
      label: "Demandes",
      // A converted lead lives twice in the DB: once in `leads` (the
      // entry-point form submission) and once in `clients` (the
      // promoted record). Both surface with the same name/email,
      // which feels like a duplicate to the operator. Drop the lead
      // hit whenever a client with the same email already exists in
      // the result set — the client is the authoritative entity.
      hits: (() => {
        const clientEmails = new Set(
          (clientsRes.data ?? [])
            .map((c) => c.email?.toLowerCase())
            .filter((e): e is string => !!e),
        );
        return (leadsRes.data ?? [])
          .filter((l) => {
            const e = l.contact_email?.toLowerCase();
            return !e || !clientEmails.has(e);
          })
          .map((l): Hit => ({
            id: l.id,
            type: "leads",
            label: l.contact_name || l.company || l.contact_email || "—",
            hint:
              [l.contact_email, l.company].filter(Boolean).join(" · ") ||
              undefined,
            href: `/dashboard/leads/${l.id}`,
          }));
      })(),
    },
    {
      type: "quotes",
      label: "Devis",
      hits: (quotesRes.data ?? []).map((qq): Hit => ({
        id: qq.id,
        type: "quotes",
        label: qq.number,
        hint: qq.client_id
          ? clientNameById.get(qq.client_id) ?? undefined
          : undefined,
        href: `/dashboard/devis/${qq.id}`,
      })),
    },
    {
      type: "invoices",
      label: "Factures",
      hits: (invoicesRes.data ?? []).map((i): Hit => ({
        id: i.id,
        type: "invoices",
        label: i.number,
        hint: i.client_id
          ? clientNameById.get(i.client_id) ?? undefined
          : undefined,
        href: `/dashboard/factures/${i.id}`,
      })),
    },
    {
      type: "events",
      label: "Événements",
      hits: (eventsRes.data ?? []).map((e): Hit => ({
        id: e.id,
        type: "events",
        label: e.title,
        hint:
          [e.date, e.location].filter(Boolean).join(" · ") || undefined,
        href: `/dashboard/events/${e.id}`,
      })),
    },
    {
      type: "cocktails",
      label: "Cocktails",
      hits: (cocktailsRes.data ?? []).map((c): Hit => ({
        id: c.id,
        type: "cocktails",
        label: c.name,
        hint: c.category ?? undefined,
        href: `/dashboard/cocktails/${c.id}`,
      })),
    },
    {
      type: "products",
      label: "Catalogue",
      hits: (productsRes.data ?? []).map((p): Hit => ({
        id: p.id,
        type: "products",
        label: p.name,
        hint:
          [p.category, p.unit].filter(Boolean).join(" · ") || undefined,
        href: `/dashboard/catalog#${p.id}`,
      })),
    },
  ].filter((g) => g.hits.length > 0);

  return NextResponse.json({ groups });
}
