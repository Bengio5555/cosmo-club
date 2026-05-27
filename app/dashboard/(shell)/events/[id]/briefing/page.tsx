import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { site } from "@/lib/site";
import {
  parseBriefing,
  emptyBriefing,
  type BriefingData,
} from "@/lib/server/briefingPreset";
import { BriefingEditor, type CocktailLite } from "./BriefingEditor";
import { formatDateFR } from "@/lib/format";
import { createBriefing } from "./actions";

type Params = Promise<{ id: string }>;

export default async function EventBriefingPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id,title,date,start_time,end_time,location,guests_count,client_id,briefing_data,briefing_token",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !event) notFound();

  // Auto-fill staff (assignees pool) and cocktails (recipes display).
  // We don't use PostgREST nested joins here because the Supabase typed
  // client doesn't infer those relationships — plain .in() queries +
  // in-memory join give the same shape with proper types.
  const [{ data: staffLinks }, { data: cocktailLinks }] = await Promise.all([
    supabase.from("event_staff").select("staff_id").eq("event_id", id),
    supabase
      .from("event_cocktails")
      .select("cocktail_id,qty_planned")
      .eq("event_id", id),
  ]);

  const staffIds = (staffLinks ?? [])
    .map((s) => s.staff_id)
    .filter((v): v is string => !!v);
  const cocktailIds = (cocktailLinks ?? [])
    .map((c) => c.cocktail_id)
    .filter((v): v is string => !!v);

  const [{ data: staffPeople }, { data: cocktailRows }] = await Promise.all([
    staffIds.length
      ? supabase.from("staff").select("id,full_name").in("id", staffIds)
      : Promise.resolve({ data: [] }),
    cocktailIds.length
      ? supabase
          .from("cocktails")
          .select("id,name,description")
          .in("id", cocktailIds)
      : Promise.resolve({ data: [] }),
  ]);

  const staffPool: string[] = (staffPeople ?? [])
    .map((s) => s.full_name)
    .filter((n): n is string => !!n);

  let cocktails: CocktailLite[] = [];
  if (cocktailRows && cocktailRows.length > 0) {
    const { data: ings } = await supabase
      .from("cocktail_ingredients")
      .select("cocktail_id,position,qty,product_id")
      .in("cocktail_id", cocktailIds)
      .order("position", { ascending: true });

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

    cocktails = cocktailRows.map((c) => ({
      id: c.id,
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

  const briefing: BriefingData = event.briefing_data
    ? parseBriefing(event.briefing_data)
    : emptyBriefing();
  const hasBriefing = !!event.briefing_data;

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href={`/dashboard/events/${id}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" />
              Retour à l&apos;événement
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
              Briefing staff
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {event.title} · {formatDateFR(event.date)}
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </div>
        </header>

        {!hasBriefing ? (
          <InitState eventId={id} />
        ) : (
          <BriefingEditor
            eventId={id}
            initial={briefing}
            shareUrl={
              event.briefing_token
                ? `${site.url}/briefing/${id}?t=${event.briefing_token}`
                : null
            }
            staffPool={staffPool}
            cocktails={cocktails}
          />
        )}
      </div>
    </div>
  );
}

function InitState({ eventId }: { eventId: string }) {
  async function init() {
    "use server";
    await createBriefing(eventId);
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
      <p className="text-base font-medium text-slate-900 dark:text-slate-100">
        Aucun briefing préparé pour cet événement.
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        Crée le briefing pour pré-remplir les 10 étapes types (chargement,
        livraisons, service, rangement, reprise) + un lien partageable
        WhatsApp pour le staff.
      </p>
      <form action={init} className="mt-5 inline-flex">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Printer className="h-3.5 w-3.5" />
          Préparer le briefing
        </button>
      </form>
      <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-500">
        <ExternalLink className="mr-1 inline h-3 w-3" />
        Le briefing est privé : seules les personnes avec le lien (token
        unique) peuvent l&apos;ouvrir.
      </p>
    </div>
  );
}
