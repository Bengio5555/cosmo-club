# Dashboard — Phase 0 setup

Phase 0 scaffolds the new `/dashboard` business-pilot app.
It is protected by Supabase Auth (magic link — no password) and shares
the database that will back every other module (leads, devis, factures,
stock, staff…).

## 1. Environment variables

Paste these into **Vercel → Project `cosmo-club` → Settings →
Environment Variables**. Tick **Production**, **Preview**, **Development**
for each so the dashboard works in every environment.

| Key                              | Where                                     | Notes |
|----------------------------------|-------------------------------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL`       | Supabase → Project settings → API         | Public URL, ok in the browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Supabase → Project settings → API         | Publishable/anon key. |
| `SUPABASE_SERVICE_ROLE_KEY`      | Supabase → Project settings → API         | **Server only** — never expose to the browser. Used by `/api/devis` to persist leads. |
| `RESEND_API_KEY`                 | Resend dashboard                           | For transactional emails (devis/facture). |
| `RESEND_FROM_EMAIL`              | eg. `contact@cosmoclub.fr`                | Must match a verified Resend sender domain. |
| `BLOB_READ_WRITE_TOKEN`          | Already set — don't touch                 | Vercel Blob (images). |
| `ADMIN_PASSWORD`                 | Already set — keep it                     | Legacy `/admin` image UI still uses it for now. |

Current project values discovered via the Supabase MCP:

- Project: `cosmo-club` (`rqqjndxxjpsdkbtqikyn`)
- Region: `eu-west-3` (Paris)
- URL: `https://rqqjndxxjpsdkbtqikyn.supabase.co`
- Anon key (publishable): `sb_publishable_Umg4CRK-NEdOq-7PvF2RnQ_gWL0lpRN`

The **service role key** must be pulled from the Supabase dashboard:
Project Settings → API → `service_role` → **Reveal & copy**.
Paste it into Vercel as `SUPABASE_SERVICE_ROLE_KEY`. Do **not** commit it.

## 2. Allow magic-link redirect URLs in Supabase

Supabase → **Authentication → URL Configuration → Redirect URLs**
(and **Site URL**). Add:

- `https://cosmo-club.vercel.app/dashboard/auth/callback`
- `https://cosmo-club-git-*-<team>.vercel.app/dashboard/auth/callback` *(wildcard optional)*
- `http://localhost:3000/dashboard/auth/callback` *(for local dev)*

Without this, Supabase will refuse to send the login email.

## 3. Resend sender domain

If `RESEND_FROM_EMAIL` uses a custom domain (eg. `cosmoclub.fr`), add
the DNS records Resend prints in its dashboard (SPF + DKIM). Until the
domain verifies, keep it on Resend's default test sender
(`onboarding@resend.dev`) to avoid bounced mail.

## 4. Grant yourself access

Once the env vars are live:

1. Visit `https://cosmo-club.vercel.app/dashboard/login`
2. Enter your email → receive magic link
3. Click the link → session cookie set, landed on `/dashboard`

The `auth.users.handle_new_user` trigger creates a matching `profiles`
row with `role='owner'` automatically.

If you want to invite other users later, create them from Supabase →
Authentication → Users (or run a controlled invite flow from the
dashboard). The current RLS policies grant full access to every
`authenticated` user, so don't invite anyone you wouldn't trust fully.
We'll tighten policies with role-based rules when staff arrive.

## 5. What's already wired in Phase 0

- `/dashboard`                 — KPI overview (live counts from DB).
- `/dashboard/settings`        — company legal info (used on devis/factures).
- `/dashboard/images`          — link to the legacy `/admin` (fully migrated in a later sprint).
- `/dashboard/{leads,devis,factures,events,stock,staff,clients}` — placeholders that explain which sprint builds them.
- `/api/devis` (public `/contact` form) now **persists every submission into `leads`** alongside sending the Resend email.
  Submissions made before Supabase env vars are set go through email only;
  after env vars are set, each new submission lands in the dashboard too.
- Next.js 16 `proxy.ts` guards `/dashboard/**` and refreshes the session
  on every navigation.

## 6. What comes next (sprint plan)

| Sprint | Focus | Delivers |
|--------|-------|----------|
| 1      | Leads list + fiche | Real list UI, filters, status updates, conversion into devis. |
| 2      | Devis full flow   | Editor per sections, plaquette HTML, PDF, Resend send. |
| 3      | Factures conformes FR | Numbering, due dates, PDF, locked-after-issuance rules. |
| 4      | Events calendar   | Calendar view, briefings, links to devis/stock. |
| 5      | Stock             | Products CRUD, in/out movements, low-stock alerts. |
| 6      | Staff             | Profiles, event assignment, payroll calc. |
| 7+     | Polishing         | Images manager fully migrated inline, bulk actions, exports. |

## 7. Dev loop

```bash
# ensure .env.local has the 5 Supabase/Resend vars above (copy from Vercel)
npm run dev
open http://localhost:3000/dashboard/login
```

Changing the DB schema? Ask me to apply another migration via the
Supabase MCP — migrations stay tracked in Supabase so the schema is
reproducible. Never edit tables manually from the Supabase UI; it will
drift from code.
