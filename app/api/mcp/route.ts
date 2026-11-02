import { timingSafeEqual } from "node:crypto";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { z } from "zod";
import { equipmentStatus, kpis, listEvents, listInvoices, listLeads, listQuotes, revenueByMonth } from "@/lib/mcp/readonly";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Serveur MCP Cosmo Club, LECTURE SEULE. Pensé pour un assistant personnel
 * (Pally ou autre) : chiffres, devis, factures, demandes et événements,
 * sans aucune donnée de contact. Aucun outil n'écrit en base.
 *
 * Accès : en-tête `Authorization: Bearer <MCP_READ_TOKEN>`.
 */

const text = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "cosmo_synthese",
      {
        title: "Synthèse Cosmo Club",
        description:
          "Vue d'ensemble du jour : CA du mois et de l'année (HT), devis en attente, factures à encaisser, nouvelles demandes sur 30 jours, événements des 14 prochains jours avec l'état du matériel.",
        inputSchema: z.object({}),
      },
      async () => text(await kpis()),
    );

    server.registerTool(
      "cosmo_ca_par_mois",
      {
        title: "Chiffre d'affaires par mois",
        description: "CA hors taxes par mois et par type d'événement pour une année, rattaché au mois de l'événement (un avoir suit la facture qu'il annule).",
        inputSchema: z.object({ annee: z.number().int().min(2020).max(2100).optional().describe("Année, par défaut l'année en cours") }),
      },
      async ({ annee }) => text(await revenueByMonth(annee ?? Number(new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }).slice(0, 4)))),
    );

    server.registerTool(
      "cosmo_devis",
      {
        title: "Devis",
        description: "Liste des devis (client = raison sociale ou « Particulier », type, date, montants). Par défaut les devis envoyés et en attente de réponse.",
        inputSchema: z.object({
          statut: z.enum(["envoye", "accepte", "refuse", "expire", "tous"]).default("envoye"),
          limite: z.number().int().min(1).max(100).default(30),
        }),
      },
      async ({ statut, limite }) => text(await listQuotes(statut, limite)),
    );

    server.registerTool(
      "cosmo_factures",
      {
        title: "Factures",
        description: "Factures avec le reste à encaisser, les jours de retard et le nombre de relances. Par défaut celles à encaisser.",
        inputSchema: z.object({
          perimetre: z.enum(["a_encaisser", "en_retard", "payees", "toutes"]).default("a_encaisser"),
          limite: z.number().int().min(1).max(100).default(30),
        }),
      },
      async ({ perimetre, limite }) => text(await listInvoices(perimetre, limite)),
    );

    server.registerTool(
      "cosmo_demandes",
      {
        title: "Demandes de devis reçues",
        description: "Demandes reçues via le site (sans coordonnées) : date, statut, société, type et date d'événement, invités, budget, canal d'acquisition.",
        inputSchema: z.object({
          jours: z.number().int().min(1).max(365).default(30),
          statut: z.enum(["nouveau", "contacte", "devis_envoye", "gagne", "perdu", "toutes"]).default("toutes"),
          limite: z.number().int().min(1).max(100).default(30),
        }),
      },
      async ({ jours, statut, limite }) => text(await listLeads(jours, statut, limite)),
    );

    server.registerTool(
      "cosmo_evenements",
      {
        title: "Événements à venir",
        description: "Événements d'hier jusqu'à N jours : titre, date, horaires, lieu, invités, taille de l'équipe, matériel prévu / chargé / revenu. Renvoie l'id à passer à cosmo_materiel.",
        inputSchema: z.object({ jours: z.number().int().min(1).max(180).default(30), limite: z.number().int().min(1).max(100).default(30) }),
      },
      async ({ jours, limite }) => text(await listEvents(jours, limite)),
    );

    server.registerTool(
      "cosmo_materiel",
      {
        title: "Matériel d'un événement",
        description: "État du matériel (QR) d'un événement : éléments prévus, scannés au départ et au retour, manquants.",
        inputSchema: z.object({ evenement_id: z.string().uuid() }),
      },
      async ({ evenement_id }) => text(await equipmentStatus(evenement_id)),
    );
  },
  {
    serverInfo: { name: "cosmo-club", version: "1.0.0" },
  },
);

function tokenMatches(provided: string, expected: string) {
  const a = Buffer.from(provided), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const verifyToken = async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  const expected = process.env.MCP_READ_TOKEN;
  // Fail closed: no token configured → nothing is served.
  if (!expected || expected.length < 24 || !bearerToken) return undefined;
  if (!tokenMatches(bearerToken, expected)) return undefined;
  return { token: bearerToken, clientId: "assistant", scopes: ["read"] };
};

const authHandler = withMcpAuth(handler, verifyToken, { required: true, requiredScopes: ["read"] });

export { authHandler as GET, authHandler as POST };
