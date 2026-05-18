-- Two new resource directories for the dashboard:
--  * providers  → fournisseurs / services (matériel, imprimeurs, fleuristes…)
--  * partners   → contacts métier (orchestres, traiteurs, lieux, wedding planners…)

CREATE TABLE IF NOT EXISTS public.providers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category      text NOT NULL,
  service_type  text,
  company_name  text,
  contact_name  text,
  email         text,
  phone         text,
  website       text,
  pricing_info  text,
  file_url      text,
  notes         text,
  archived      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS providers_category_idx ON public.providers (category) WHERE archived = false;

CREATE TABLE IF NOT EXISTS public.partners (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category      text NOT NULL,
  name          text NOT NULL,
  contact_name  text,
  position      text,
  email         text,
  email_alt     text,
  phone         text,
  notes         text,
  archived      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partners_category_idx ON public.partners (category) WHERE archived = false;

CREATE OR REPLACE FUNCTION public._touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS providers_updated_at ON public.providers;
CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();

DROP TRIGGER IF EXISTS partners_updated_at ON public.partners;
CREATE TRIGGER partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY providers_authenticated_all ON public.providers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY partners_authenticated_all ON public.partners
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
