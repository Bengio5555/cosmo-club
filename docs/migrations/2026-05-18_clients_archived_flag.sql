-- Soft-archive for clients. Listing pages filter on archived=false by
-- default; the dashboard can opt into "show archived" via a query param.
-- We intentionally keep this as a flag (not a hard delete) so historical
-- leads / quotes / invoices keep referencing a valid client row.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.clients.archived IS
  'Quand TRUE, le client est masqué des listings dashboard mais ses leads/devis/factures restent intacts.';
