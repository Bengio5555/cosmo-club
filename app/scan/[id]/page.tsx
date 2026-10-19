import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateFR } from "@/lib/format";
import { loadScanItems } from "./actions";
import { ScanClient } from "./ScanClient";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Scan matériel · Cosmo Club",
  robots: { index: false, follow: false },
};

/**
 * Module de scan pour les manutentionnaires. Même garde que le briefing :
 * l'URL porte le token de l'événement, pas de compte. Tout passe par le
 * service_role côté serveur.
 */
export default async function ScanPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : null;

  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("id,title,date,location,briefing_token")
    .eq("id", id)
    .maybeSingle();
  if (!event || !event.briefing_token || !token || event.briefing_token !== token) {
    notFound();
  }

  const items = await loadScanItems(id, token);

  return (
    <ScanClient
      eventId={id}
      token={token}
      title={event.title}
      subtitle={`${formatDateFR(event.date)}${event.location ? ` · ${event.location}` : ""}`}
      initialItems={items}
      briefingUrl={`/briefing/${id}?t=${token}`}
    />
  );
}
