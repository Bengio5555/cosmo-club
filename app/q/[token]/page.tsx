import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateFR } from "@/lib/format";
import { EQUIPMENT_CATEGORY_LABEL } from "@/lib/equipment/shared";

type Params = Promise<{ token: string }>;

export const metadata: Metadata = {
  title: "Matériel Cosmo Club",
  robots: { index: false, follow: false },
};

/**
 * Page ouverte quand on scanne une étiquette avec l'appareil photo du
 * téléphone (hors module). Dit ce que c'est et sur quel événement
 * l'élément est attendu. Le scan « officiel » se fait depuis le brief.
 */
export default async function PublicEquipmentPage({ params }: { params: Params }) {
  const { token } = await params;
  if (!/^[a-f0-9]{16,64}$/i.test(token)) notFound();

  const supabase = createAdminClient();
  const { data: eq } = await supabase
    .from("equipment")
    .select("id,code,name,category,contents,archived")
    .eq("qr_token", token.toLowerCase())
    .maybeSingle();
  if (!eq) notFound();

  const { data: links } = await supabase
    .from("event_equipment")
    .select("event_id,depart_at,retour_at")
    .eq("equipment_id", eq.id);
  const eventIds = (links ?? []).map((l) => l.event_id);
  const { data: events } = eventIds.length
    ? await supabase
        .from("events")
        .select("id,title,date")
        .in("id", eventIds)
        .in("status", ["a_venir", "en_cours"])
        .order("date")
        .limit(3)
    : { data: [] };
  const linkById = new Map((links ?? []).map((l) => [l.event_id, l]));

  return (
    <div className="min-h-dvh bg-slate-950 px-5 py-8 text-white">
      <div className="mx-auto max-w-md">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">Cosmo Club · Matériel</p>
        <p className="mt-3 font-mono text-sm font-semibold text-amber-300">{eq.code}</p>
        <h1 className="text-2xl font-bold">{eq.name}</h1>
        <p className="mt-1 text-sm text-white/60">{EQUIPMENT_CATEGORY_LABEL[eq.category]}</p>
        {eq.contents && (
          <div className="mt-4 rounded-xl bg-white/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">Contenu</p>
            <p className="mt-1 whitespace-pre-line text-sm">{eq.contents}</p>
          </div>
        )}
        {eq.archived && <p className="mt-4 text-sm text-red-300">Élément retiré du service.</p>}

        <div className="mt-6">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">Prévu sur</p>
          {(events ?? []).length === 0 ? (
            <p className="mt-1 text-sm text-white/70">Aucun événement à venir. Il reste au stock.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {(events ?? []).map((ev) => {
                const l = linkById.get(ev.id);
                return (
                  <li key={ev.id} className="rounded-xl bg-white/10 p-3">
                    <p className="font-semibold">{ev.title}</p>
                    <p className="text-xs text-white/60">
                      {formatDateFR(ev.date)}
                      {l?.depart_at ? " · chargé" : ""}
                      {l?.retour_at ? " · revenu" : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="mt-8 text-xs text-white/50">
          Pour valider un chargement, scanne depuis le lien « Scanner le matériel » du brief de l&apos;événement.
        </p>
      </div>
    </div>
  );
}
