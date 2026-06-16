-- 2026-06-16 — Role-based RLS lockdown ("zero trust")
--
-- Applied to prod (project rqqjndxxjpsdkbtqikyn) via the Supabase MCP on
-- 2026-06-16 as migrations `role_based_rls_lockdown` +
-- `rls_lockdown_followup_revoke_definer_and_anon_leads`. Kept here for the
-- record (this repo documents migrations, it does not auto-apply them).
--
-- WHY: every table previously had a single `FOR ALL TO authenticated
-- USING(true)` policy, so any logged-in user (incl. the `staff` role)
-- could read/write everything via a direct PostgREST call with their JWT,
-- bypassing the app-layer (proxy + hidden UI) restrictions. This pins
-- table access to the same role matrix as lib/auth/roles.ts ROUTE_ROLES,
-- enforced in the database.
--
-- ARCHITECTURE NOTES (important for future changes):
--   - Dashboard READS use the anon key + user JWT (lib/supabase/server.ts)
--     => RLS applies. These policies gate them.
--   - Dashboard WRITES + public vitrine reads + public-token pages
--     (devis/factures/briefing/calendar) + /api/devis use the service_role
--     client (lib/supabase/admin.ts) => RLS is bypassed, so they keep
--     working regardless of these policies.
--   - No browser/client component queries tables directly (auth only).
--
-- KNOWN GAP (phase 2, not yet done): staff keep SELECT on events/event_staff/
--   staff/products to render the event page, so via a direct API call a
--   staff JWT can still read the sensitive COLUMNS products.cost_ht,
--   staff.hourly_rate and event_staff pay amounts. Closing that needs
--   column splitting (companion tables) or admin-mediated staff reads.

-- Current user's app role. SECURITY DEFINER => reads profiles without
-- triggering RLS (no recursion) and centralises the lookup.
create or replace function public.app_role()
returns public.user_role
language sql stable security definer
set search_path = public, pg_temp
as $$ select role from public.profiles where id = (select auth.uid()); $$;

revoke all on function public.app_role() from public, anon;
grant execute on function public.app_role() to authenticated;

-- ---------- CRM / FINANCE ----------
drop policy if exists clients_auth_all on public.clients;
create policy clients_rw on public.clients for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager','compta']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager','compta']::user_role[]));

drop policy if exists leads_auth_all on public.leads;
create policy leads_rw on public.leads for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager']::user_role[]));

drop policy if exists quotes_auth_all on public.quotes;
create policy quotes_rw on public.quotes for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager','compta']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager','compta']::user_role[]));

drop policy if exists quote_items_auth_all on public.quote_items;
create policy quote_items_rw on public.quote_items for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager','compta']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager','compta']::user_role[]));

drop policy if exists quote_messages_auth_all on public.quote_messages;
create policy quote_messages_rw on public.quote_messages for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager','compta']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager','compta']::user_role[]));

drop policy if exists invoices_auth_all on public.invoices;
create policy invoices_rw on public.invoices for all to authenticated
  using      (public.app_role() = any (array['owner','admin','compta']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','compta']::user_role[]));

drop policy if exists invoice_items_auth_all on public.invoice_items;
create policy invoice_items_rw on public.invoice_items for all to authenticated
  using      (public.app_role() = any (array['owner','admin','compta']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','compta']::user_role[]));

drop policy if exists invoice_payments_auth_all on public.invoice_payments;
create policy invoice_payments_rw on public.invoice_payments for all to authenticated
  using      (public.app_role() = any (array['owner','admin','compta']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','compta']::user_role[]));

-- ---------- EVENTS (staff allowed) ----------
drop policy if exists events_auth_all on public.events;
create policy events_rw on public.events for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]));

drop policy if exists event_staff_auth_all on public.event_staff;
create policy event_staff_rw on public.event_staff for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]));

drop policy if exists event_stock_auth_all on public.event_stock;
create policy event_stock_rw on public.event_stock for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]));

drop policy if exists event_cocktails_auth_all on public.event_cocktails;
create policy event_cocktails_rw on public.event_cocktails for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]));

-- ---------- RECIPES / STOCK / CATALOGUE ----------
drop policy if exists cocktails_auth_all on public.cocktails;
create policy cocktails_rw on public.cocktails for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]));

drop policy if exists cocktail_ingredients_auth_all on public.cocktail_ingredients;
create policy cocktail_ingredients_rw on public.cocktail_ingredients for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]));

drop policy if exists products_auth_all on public.products;
create policy products_rw on public.products for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]));

drop policy if exists stock_movements_auth_all on public.stock_movements;
create policy stock_movements_rw on public.stock_movements for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager']::user_role[]));

drop policy if exists catalog_items_auth_all on public.catalog_items;
create policy catalog_items_rw on public.catalog_items for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager']::user_role[]));

-- ---------- TEAM RESOURCES ----------
drop policy if exists staff_auth_all on public.staff;
create policy staff_rw on public.staff for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]));

drop policy if exists providers_authenticated_all on public.providers;
create policy providers_rw on public.providers for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager']::user_role[]));

drop policy if exists partners_authenticated_all on public.partners;
create policy partners_rw on public.partners for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager']::user_role[]));

-- ---------- CONTENT / CONFIG ----------
drop policy if exists reddit_threads_authenticated_all on public.reddit_threads;
create policy reddit_threads_rw on public.reddit_threads for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager']::user_role[]));

drop policy if exists settings_auth_all on public.settings;
create policy settings_rw on public.settings for all to authenticated
  using      (public.app_role() = any (array['owner','admin']::user_role[]))
  with check (public.app_role() = any (array['owner','admin']::user_role[]));

drop policy if exists "client_logos authenticated all" on public.client_logos;
drop policy if exists client_logos_authenticated_all on public.client_logos;
create policy client_logos_rw on public.client_logos for all to authenticated
  using      (public.app_role() = any (array['owner','admin']::user_role[]))
  with check (public.app_role() = any (array['owner','admin']::user_role[]));

drop policy if exists homepage_gallery_authenticated_all on public.homepage_gallery_selection;
create policy homepage_gallery_rw on public.homepage_gallery_selection for all to authenticated
  using      (public.app_role() = any (array['owner','admin']::user_role[]))
  with check (public.app_role() = any (array['owner','admin']::user_role[]));

drop policy if exists image_overrides_authenticated_all on public.image_overrides;
create policy image_overrides_rw on public.image_overrides for all to authenticated
  using      (public.app_role() = any (array['owner','admin']::user_role[]))
  with check (public.app_role() = any (array['owner','admin']::user_role[]));

-- ---------- PROFILES (tighten SELECT to self or owner/admin) ----------
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_self_or_admin on public.profiles for select to authenticated
  using ((select auth.uid()) = id
         or public.app_role() = any (array['owner','admin']::user_role[]));

-- articles: left unchanged (already role-gated admin_all + anon public_read).

-- ---------- FOLLOW-UP HARDENING ----------
-- Public devis form inserts leads via the service_role, so the anon
-- INSERT policy was dead; drop it.
drop policy if exists leads_anon_insert on public.leads;

-- Trigger functions never called via PostgREST RPC: revoke RPC exposure.
-- (Triggers fire as the table owner regardless of these grants.)
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.recompute_invoice_payment_status() from anon, authenticated, public;
