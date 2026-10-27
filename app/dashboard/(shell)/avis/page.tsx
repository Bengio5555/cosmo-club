import Link from "next/link";
import { CalendarDays, MapPin, Star, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRole } from "@/lib/auth/server";
import { formatDateFR } from "@/lib/format";
import { normalizeGoogleReviewUrl } from "@/lib/reviewUrl";
import { reviewStage, REMIND_AFTER_DAYS, type ReviewEventLite, type ReviewStage } from "@/lib/reviewFollowup";
import { ReviewActions } from "./ReviewActions";

type SP = Promise<{ vue?: string }>;

/**
 * Demandes d'avis Google : les événements passés des 12 derniers mois,
 * avec un bouton par ligne. Rien ne part automatiquement. Trois vues :
 * à demander, à relancer (une fois, 7 jours après), tous.
 */
export default async function AvisPage({ searchParams }: { searchParams: SP }) {
  const { vue } = await searchParams;
  const view: "demander" | "relancer" | "toutes" =
    vue === "toutes" || vue === "relancer" ? vue : "demander";
  const role = await getCurrentRole();
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const yearAgo = daysAgoISO(365).slice(0, 10);

  const { data: events, error } = await supabase
    .from("events")
    .select(
      "id,title,date,location,status,client_id,review_requested_at,review_reminded_at,review_received_at,review_clicked_at",
    )
    .lt("date", today)
    .gte("date", yearAgo)
    .neq("status", "annule")
    .order("date", { ascending: false })
    .limit(300);

  // settings n'est lisible que par owner/admin (RLS) : le lien est lu via la
  // clé de service, le proxy ayant déjà filtré les rôles de cette page.
  const { data: settings } = await createAdminClient()
    .from("settings")
    .select("google_review_url")
    .eq("id", 1)
    .maybeSingle();
  const reviewUrl = normalizeGoogleReviewUrl(settings?.google_review_url);

  const clientIds = Array.from(
    new Set((events ?? []).map((e) => e.client_id).filter((x): x is string => !!x)),
  );
  const { data: clientRows } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id,first_name,last_name,company_name,email")
        .in("id", clientIds)
    : { data: [] };
  const clients = new Map((clientRows ?? []).map((c) => [c.id, c]));

  // Historique complet des clients (au-delà de 12 mois) : règle « une
  // demande par client sur 12 mois, aucune s'il a déjà laissé un avis ».
  const { data: historyRows } = clientIds.length
    ? await supabase
        .from("events")
        .select("id,client_id,review_requested_at,review_reminded_at,review_received_at")
        .in("client_id", clientIds)
        .or("review_requested_at.not.is.null,review_received_at.not.is.null")
    : { data: [] };
  const byClient = new Map<string, ReviewEventLite[]>();
  for (const h of historyRows ?? []) {
    if (!h.client_id) continue;
    byClient.set(h.client_id, [...(byClient.get(h.client_id) ?? []), h]);
  }

  const now = nowMs();
  const all = (events ?? []).map((ev) => ({
    ev,
    stage: reviewStage(ev, ev.client_id ? (byClient.get(ev.client_id) ?? []) : [], now),
  }));
  const toRequest = all.filter((r) => r.stage.stage === "to_request");
  const toRemind = all.filter((r) => r.stage.stage === "to_remind");
  const sentCount = all.filter((r) => r.ev.review_requested_at).length;
  const receivedCount = all.filter((r) => r.stage.stage === "received").length;
  const rows = view === "toutes" ? all : view === "relancer" ? toRemind : toRequest;
  const canEditSettings = role === "owner" || role === "admin";
  const missingMigration = error?.message.includes("review_");

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
          Avis clients
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Après un événement, envoie au client un e-mail qui l&apos;invite à laisser un avis Google.
          Les avis comptent beaucoup dans les recommandations de Google et des assistants IA.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Une seule relance, possible {REMIND_AFTER_DAYS} jours après la demande. Coche « Avis reçu » quand
          l&apos;avis apparaît sur Google. Un même client n&apos;est sollicité qu&apos;une fois sur 12 mois.
        </p>
      </header>

      {reviewUrl ? (
        <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
          <Star className="h-3.5 w-3.5" />
          Lien envoyé&nbsp;:
          <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-full truncate font-mono text-slate-800 underline underline-offset-2 dark:text-slate-200"
          >
            {reviewUrl}
          </a>
          {canEditSettings && (
            <Link href="/dashboard/settings" className="underline underline-offset-2">
              Modifier
            </Link>
          )}
        </p>
      ) : (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Aucun lien d&apos;avis Google n&apos;est configuré : les envois sont bloqués.{" "}
            {canEditSettings ? (
              <Link href="/dashboard/settings" className="font-medium underline underline-offset-2">
                Ajouter le lien dans Paramètres
              </Link>
            ) : (
              "Demande à un administrateur de l'ajouter dans Paramètres."
            )}
          </span>
        </div>
      )}

      <div className="mb-4 flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          {sentCount} demande{sentCount > 1 ? "s" : ""} envoyée{sentCount > 1 ? "s" : ""},{" "}
          {receivedCount} avis reçu{receivedCount > 1 ? "s" : ""} sur {all.length} événement
          {all.length > 1 ? "s" : ""} des 12 derniers mois.
        </p>
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
          <TabLink href="/dashboard/avis" active={view === "demander"} label={`À demander (${toRequest.length})`} />
          <TabLink
            href="/dashboard/avis?vue=relancer"
            active={view === "relancer"}
            label={`À relancer (${toRemind.length})`}
          />
          <TabLink href="/dashboard/avis?vue=toutes" active={view === "toutes"} label="Tous" />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {missingMigration
            ? "La base n'est pas encore à jour : applique docs/migrations/2026-10-28_review_followup.sql dans Supabase."
            : error.message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
        {rows.length > 0 ? (
          <ul className="divide-y divide-slate-100 dark:divide-slate-900">
            {rows.map(({ ev, stage }) => {
              const client = ev.client_id ? clients.get(ev.client_id) : null;
              const clientName =
                client?.company_name ||
                [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
                "—";
              const email = client?.email?.trim() || null;
              const disabledReason = !client
                ? "Aucun client rattaché"
                : !email
                  ? "Pas d'e-mail client"
                  : !reviewUrl
                    ? "Lien d'avis manquant"
                    : null;
              return (
                <li
                  key={ev.id}
                  className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-4 md:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/events/${ev.id}`}
                      className="text-sm font-medium text-slate-900 hover:underline dark:text-white"
                    >
                      {ev.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {formatDateFR(ev.date)}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 text-xs md:w-56">
                    <p className="truncate text-slate-700 dark:text-slate-200">{clientName}</p>
                    <p className="truncate text-slate-500">{email ?? "—"}</p>
                  </div>
                  <div className="text-xs md:w-48">
                    <StageLabel stage={stage} />
                    {ev.review_clicked_at && stage.stage !== "received" && (
                      <p className="mt-0.5 text-slate-500">Lien ouvert le {formatDateFR(ev.review_clicked_at)}</p>
                    )}
                  </div>
                  <div className="md:w-52 md:text-right">
                    <ReviewActions eventId={ev.id} email={email} stage={stage} disabledReason={disabledReason} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            {view === "toutes"
              ? "Aucun événement passé sur les 12 derniers mois."
              : view === "relancer"
                ? "Aucune relance à faire pour l'instant."
                : "Tout est à jour : chaque événement passé a reçu sa demande."}
          </p>
        )}
      </div>
    </div>
  );
}

function StageLabel({ stage }: { stage: ReviewStage }) {
  switch (stage.stage) {
    case "received":
      return <p className="text-emerald-700 dark:text-emerald-400">Avis reçu le {formatDateFR(stage.at)}</p>;
    case "reminded":
      return (
        <>
          <p className="text-slate-700 dark:text-slate-300">Demandé le {formatDateFR(stage.requestedAt)}</p>
          <p className="text-slate-500">Relancé le {formatDateFR(stage.at)}</p>
        </>
      );
    case "to_remind":
      return (
        <>
          <p className="text-slate-700 dark:text-slate-300">Demandé le {formatDateFR(stage.requestedAt)}</p>
          <p className="text-amber-700 dark:text-amber-400">Relance possible</p>
        </>
      );
    case "waiting":
      return (
        <>
          <p className="text-slate-700 dark:text-slate-300">Demandé le {formatDateFR(stage.requestedAt)}</p>
          <p className="text-slate-500">Relance possible le {formatDateFR(stage.remindFrom)}</p>
        </>
      );
    case "client_done":
      return (
        <p className="text-slate-500">
          {stage.reason === "reviewed"
            ? "Ce client a déjà laissé un avis"
            : `Client déjà sollicité le ${formatDateFR(stage.at)}`}
        </p>
      );
    case "to_request":
      return <p className="text-slate-500">Pas encore demandé</p>;
  }
}

function nowMs(): number {
  return Date.now();
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function TabLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
        active
          ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
