import "server-only";

/**
 * Client Qonto Business API — LECTURE SEULE.
 *
 * Ce module n'expose volontairement que des GET : organisation, comptes,
 * transactions. Aucun virement, aucune écriture côté banque, quoi qu'il
 * arrive. La clé API (QONTO_LOGIN + QONTO_SECRET_KEY) ne sort jamais du
 * serveur et n'est jamais loguée.
 *
 * Doc : https://docs.qonto.com/api-reference/business-api
 */

const BASE_URL = "https://thirdparty.qonto.com/v2";

export type QontoBankAccount = {
  id: string;
  slug: string;
  iban: string;
  bic: string;
  currency: string;
  balance: number;
  balance_cents: number;
  authorized_balance: number;
  authorized_balance_cents: number;
  name: string;
  updated_at: string;
  status: string;
  main: boolean;
};

export type QontoOrganization = {
  slug: string;
  legal_name: string;
  bank_accounts: QontoBankAccount[];
};

export type QontoTransaction = {
  transaction_id: string;
  id: string;
  amount: number;
  amount_cents: number;
  side: "credit" | "debit";
  operation_type: string;
  currency: string;
  label: string | null;
  reference: string | null;
  note: string | null;
  settled_at: string | null;
  emitted_at: string;
  updated_at: string;
  status: "pending" | "completed" | "declined" | "reversed" | string;
  attachment_ids?: string[];
  bank_account_id?: string;
};

type QontoMeta = {
  current_page: number;
  next_page: number | null;
  prev_page: number | null;
  total_pages: number;
  total_count: number;
  per_page: number;
};

export class QontoError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "QontoError";
    this.status = status;
  }
}

export function isQontoConfigured(): boolean {
  return Boolean(process.env.QONTO_LOGIN && process.env.QONTO_SECRET_KEY);
}

function authHeader(): string {
  const login = process.env.QONTO_LOGIN?.trim();
  const key = process.env.QONTO_SECRET_KEY?.trim();
  if (!login || !key) {
    throw new QontoError(503, "Qonto n'est pas configuré (QONTO_LOGIN / QONTO_SECRET_KEY manquants).");
  }
  return `${login}:${key}`;
}

async function qontoGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: authHeader(), Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { errors?: { detail?: string; code?: string }[] };
      detail = body.errors?.map((e) => e.detail ?? e.code).filter(Boolean).join(", ") || detail;
    } catch {
      /* corps non JSON */
    }
    if (res.status === 401) detail = "Identifiants Qonto refusés. Vérifie QONTO_LOGIN et QONTO_SECRET_KEY.";
    throw new QontoError(res.status, detail);
  }
  return (await res.json()) as T;
}

export async function getOrganization(): Promise<QontoOrganization> {
  const data = await qontoGet<{ organization: QontoOrganization }>("/organization");
  return data.organization;
}

/**
 * Transactions d'un compte, toutes pages confondues. `updatedFrom` permet
 * une synchro incrémentale (Qonto renvoie aussi les transactions dont le
 * statut a changé, pending → completed par exemple).
 */
export async function listTransactions(opts: {
  bankAccountId: string;
  settledFrom?: string; // ISO
  updatedFrom?: string; // ISO
  maxPages?: number;
}): Promise<QontoTransaction[]> {
  const out: QontoTransaction[] = [];
  let page = 1;
  const maxPages = opts.maxPages ?? 20;
  while (page <= maxPages) {
    const data = await qontoGet<{ transactions: QontoTransaction[]; meta: QontoMeta }>("/transactions", {
      bank_account_id: opts.bankAccountId,
      settled_at_from: opts.settledFrom,
      updated_at_from: opts.updatedFrom,
      per_page: 100,
      page,
      "sort_by": "settled_at:desc",
    });
    out.push(...data.transactions);
    if (!data.meta?.next_page) break;
    page = data.meta.next_page;
  }
  return out;
}
