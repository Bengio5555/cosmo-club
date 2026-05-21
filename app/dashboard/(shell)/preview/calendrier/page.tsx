import { createClient } from "@/lib/supabase/server";
import { PreviewCalendar } from "./PreviewCalendar";

export default async function PreviewCalendarPage() {
  const supabase = await createClient();
  const today = new Date();
  // Fenêtre large : 3 mois avant / 6 mois après pour pouvoir naviguer
  // librement dans la grille mois sans re-fetch.
  const start = new Date(today.getFullYear(), today.getMonth() - 3, 1)
    .toISOString()
    .slice(0, 10);
  const end = new Date(today.getFullYear(), today.getMonth() + 7, 0)
    .toISOString()
    .slice(0, 10);

  const { data: events } = await supabase
    .from("events")
    .select(
      "id,title,date,start_time,end_time,location,status,guests_count,client_id",
    )
    .gte("date", start)
    .lte("date", end)
    .neq("status", "annule")
    .order("date", { ascending: true });

  return <PreviewCalendar events={events ?? []} />;
}
