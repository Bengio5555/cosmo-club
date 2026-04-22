import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  User,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EventEditor } from "./EventEditor";
import { StaffSection } from "./StaffSection";
import { StockSection } from "./StockSection";

type Params = Promise<{ id: string }>;

export default async function EventDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!event) {
    notFound();
  }

  const [
    { data: client },
    { data: quote },
    { data: allStaff },
    { data: assignments },
    { data: allProducts },
    { data: reservations },
  ] = await Promise.all([
    event.client_id
      ? supabase.from("clients").select("*").eq("id", event.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
    event.quote_id
      ? supabase
          .from("quotes")
          .select("id,number,status,total_ttc")
          .eq("id", event.quote_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("staff")
      .select("id,full_name,role,hourly_rate,archived")
      .eq("archived", false)
      .order("full_name"),
    supabase
      .from("event_staff")
      .select("*")
      .eq("event_id", id),
    supabase
      .from("products")
      .select("id,name,category,unit,stock_qty,archived")
      .eq("archived", false)
      .order("category")
      .order("name"),
    supabase
      .from("event_stock")
      .select("*")
      .eq("event_id", id),
  ]);

  return (
    <>
      <div className="border-b border-neutral-900 px-4 pt-6 md:px-8">
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Tous les événements
        </Link>
      </div>

      <EventEditor event={event} />

      <div className="grid gap-5 px-4 pb-6 md:grid-cols-2 md:px-8">
        <StaffSection
          eventId={event.id}
          eventStatus={event.status}
          staffOptions={allStaff ?? []}
          assignments={assignments ?? []}
        />
        <StockSection
          eventId={event.id}
          eventStatus={event.status}
          productOptions={allProducts ?? []}
          reservations={reservations ?? []}
        />
      </div>

      {(client || quote) && (
        <div className="border-t border-neutral-900 px-4 py-6 md:px-8">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {client && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  Client
                </p>
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="group inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-700 hover:text-white"
                >
                  <User className="h-3.5 w-3.5" />
                  {client.company_name ||
                    [client.first_name, client.last_name]
                      .filter(Boolean)
                      .join(" ") ||
                    client.email ||
                    "—"}
                  <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {client.email && (
                    <a
                      href={`mailto:${client.email}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-neutral-300 hover:border-neutral-700 hover:text-white"
                    >
                      <Mail className="h-3 w-3" /> {client.email}
                    </a>
                  )}
                  {client.phone && (
                    <a
                      href={`tel:${client.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-neutral-300 hover:border-neutral-700 hover:text-white"
                    >
                      <Phone className="h-3 w-3" /> {client.phone}
                    </a>
                  )}
                </div>
              </div>
            )}
            {quote && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  Devis source
                </p>
                <Link
                  href={`/dashboard/devis/${quote.id}`}
                  className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-700 hover:text-white"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {quote.number}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
