import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { MenuChoiceForm, type ChoiceCocktail } from "./MenuChoiceForm";

export const metadata: Metadata = {
  title: "Votre carte de cocktails — Cosmo Club Paris",
  robots: { index: false, follow: false },
};

type Params = Promise<{ token: string }>;

/**
 * Public, token-gated: the cocktail card sent from a quote. The client
 * ticks up to max_choices cocktails and validates; the answer then shows
 * on the quote and the linked event in the dashboard.
 */
export default async function CartePage({ params }: { params: Params }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const supabase = createAdminClient();

  const { data: prop } = await supabase
    .from("quote_menu_proposals")
    .select("id,quote_id,gamme,cocktail_ids,max_choices,message,status,chosen_ids")
    .eq("access_token", token)
    .maybeSingle();
  if (!prop) notFound();

  const [{ data: quote }, { data: cocktails }, { data: ings }, { data: settings }] = await Promise.all([
    supabase.from("quotes").select("number,client_id").eq("id", prop.quote_id).maybeSingle(),
    supabase.from("cocktails").select("id,name,description").in("id", prop.cocktail_ids),
    supabase
      .from("cocktail_ingredients")
      .select("cocktail_id,position,qty,product_id")
      .in("cocktail_id", prop.cocktail_ids)
      .order("position", { ascending: true }),
    supabase.from("settings").select("company_name").eq("id", 1).maybeSingle(),
  ]);
  const { data: client } = quote?.client_id
    ? await supabase.from("clients").select("first_name").eq("id", quote.client_id).maybeSingle()
    : { data: null };

  const productIds = Array.from(new Set((ings ?? []).map((i) => i.product_id).filter((v): v is string => !!v)));
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id,name,unit,content_unit").in("id", productIds)
    : { data: [] };
  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const ingByCocktail = new Map<string, string[]>();
  for (const i of ings ?? []) {
    const pr = i.product_id ? productById.get(i.product_id) : null;
    if (!pr) continue;
    const arr = ingByCocktail.get(i.cocktail_id) ?? [];
    arr.push(`${Number(i.qty)} ${pr.content_unit ?? pr.unit} ${pr.name}`);
    ingByCocktail.set(i.cocktail_id, arr);
  }
  const byId = new Map((cocktails ?? []).map((c) => [c.id, c]));
  const list: ChoiceCocktail[] = prop.cocktail_ids
    .map((id) => byId.get(id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({ id: c.id, name: c.name, description: c.description, ingredients: ingByCocktail.get(c.id) ?? [] }));

  const company = settings?.company_name || "Cosmo Club Paris";
  const answered = prop.status === "answered";
  const chosen = (prop.chosen_ids ?? []).map((id) => byId.get(id)?.name).filter((n): n is string => !!n);

  return (
    <main className="min-h-screen bg-[color:var(--color-cream)] px-5 py-12 text-[color:var(--color-ink-text)] md:py-20">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow mb-4"><span className="rule" />{company}</p>
        <h1 className="font-display text-4xl leading-[1.05] md:text-5xl">
          Votre carte <span className="font-accent italic text-[color:var(--color-grenat)]">{prop.gamme}</span>
        </h1>
        <p className="mt-4 text-sm text-[color:var(--color-espresso)]">
          {client?.first_name ? `Bonjour ${client.first_name}, ` : ""}
          voici les cocktails que nous vous proposons pour votre événement
          {quote?.number ? ` (devis ${quote.number})` : ""}.
        </p>
        {prop.message && (
          <blockquote className="mt-5 whitespace-pre-line rounded-md border-l-2 border-[color:var(--color-grenat)] bg-white/60 px-4 py-3 text-sm text-[color:var(--color-ink-text)]">
            {prop.message}
          </blockquote>
        )}

        <div className="mt-8">
          {answered ? (
            <div className="rounded-xl border border-[color:var(--color-ash)]/50 bg-white px-6 py-6">
              <p className="eyebrow mb-3"><span className="rule" />Merci, c&apos;est noté</p>
              <p className="text-sm text-[color:var(--color-espresso)]">Vous avez choisi :</p>
              <ul className="mt-3 space-y-1.5">
                {chosen.map((n) => (
                  <li key={n} className="font-display text-lg text-[color:var(--color-ink-text)]">— {n}</li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-[color:var(--color-espresso)]/70">
                Notre équipe a reçu votre sélection. Pour la modifier, répondez simplement à notre email.
              </p>
            </div>
          ) : (
            <MenuChoiceForm token={token} cocktails={list} max={prop.max_choices} />
          )}
        </div>

        <p className="mt-10 text-[11px] text-[color:var(--color-espresso)]/60">{company} · Paris & Île-de-France</p>
      </div>
    </main>
  );
}
