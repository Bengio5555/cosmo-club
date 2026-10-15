import "server-only";
import { getVercelOidcToken } from "@vercel/oidc";

/**
 * Keyless Google auth for the dashboard's Drive integration.
 *
 * Vercel signs an OIDC token for every function invocation (and for local
 * dev via `vercel env pull`). Google's Security Token Service trusts that
 * token through the workload identity pool "vercel" of the GCP project
 * cosmo-club-dashboard (restricted to this Vercel project), then we
 * impersonate the dashboard-drive service account, which is a content
 * manager of the "Cosmo Club" shared drive. No JSON key exists anywhere.
 */

const STS_URL = "https://sts.googleapis.com/v1/token";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

type CachedToken = { value: string; expiresAt: number };

// Fluid Compute reuses instances, so a module-level cache saves two
// round-trips on most requests. Tokens live 1h; refresh 5 min early.
let cached: CachedToken | null = null;
let inflight: Promise<CachedToken> | null = null;

export class DriveConfigError extends Error {}

export function driveConfig() {
  const audience = process.env.GOOGLE_WIF_AUDIENCE;
  const serviceAccount = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT;
  const rootId = process.env.GOOGLE_DRIVE_ROOT_ID;
  if (!audience || !serviceAccount || !rootId) {
    throw new DriveConfigError(
      "Google Drive n'est pas configuré (GOOGLE_WIF_AUDIENCE, GOOGLE_DRIVE_SERVICE_ACCOUNT, GOOGLE_DRIVE_ROOT_ID).",
    );
  }
  return { audience, serviceAccount, rootId };
}

export function isDriveConfigured() {
  try {
    driveConfig();
    return true;
  } catch {
    return false;
  }
}

async function fetchAccessToken(): Promise<CachedToken> {
  const { audience, serviceAccount } = driveConfig();
  const subjectToken = await getVercelOidcToken();

  const sts = await fetch(STS_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
      audience,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      requestedTokenType: "urn:ietf:params:oauth:token-type:access_token",
      subjectTokenType: "urn:ietf:params:oauth:token-type:jwt",
      subjectToken,
    }),
    cache: "no-store",
  });
  if (!sts.ok) {
    throw new Error(`Échange de jeton Google refusé (STS ${sts.status})`);
  }
  const { access_token: federated } = (await sts.json()) as {
    access_token: string;
  };

  const impersonate = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(serviceAccount)}:generateAccessToken`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${federated}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ scope: [DRIVE_SCOPE], lifetime: "3600s" }),
      cache: "no-store",
    },
  );
  if (!impersonate.ok) {
    throw new Error(
      `Accès au compte de service refusé (IAM ${impersonate.status})`,
    );
  }
  const { accessToken, expireTime } = (await impersonate.json()) as {
    accessToken: string;
    expireTime: string;
  };
  return { value: accessToken, expiresAt: Date.parse(expireTime) };
}

export async function getDriveAccessToken(): Promise<string> {
  if (cached && cached.expiresAt - Date.now() > 5 * 60_000) {
    return cached.value;
  }
  inflight ??= fetchAccessToken().finally(() => {
    inflight = null;
  });
  cached = await inflight;
  return cached.value;
}
