-- Run in the Supabase SQL editor as the database owner. No rows are deleted or rewritten.
-- A duplicate preflight failure rolls back the entire transaction: review those records manually.
BEGIN;
DO $$
BEGIN
  IF EXISTS (
    SELECT upper(btrim(serial_number)) FROM public.devices
    WHERE nullif(btrim(serial_number), '') IS NOT NULL
    GROUP BY upper(btrim(serial_number)) HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate normalized serial numbers exist. Review them before applying this migration.';
  END IF;
  IF EXISTS (
    SELECT lower(btrim(insurer_name)), lower(btrim(policy_number)) FROM public.insurance_policies
    GROUP BY lower(btrim(insurer_name)), lower(btrim(policy_number)) HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate provider/policy numbers exist. Review them before applying this migration.';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS devices_serial_normalized_unique
  ON public.devices (upper(btrim(serial_number))) WHERE nullif(btrim(serial_number), '') IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS policies_provider_number_unique
  ON public.insurance_policies (lower(btrim(insurer_name)), lower(btrim(policy_number)));
CREATE TABLE IF NOT EXISTS public.insurance_providers (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  phone_number text
);
CREATE UNIQUE INDEX IF NOT EXISTS insurance_providers_name_unique
  ON public.insurance_providers (lower(btrim(name)));
-- Keep the directory compatible with policies already in the project.
INSERT INTO public.insurance_providers (id, name)
SELECT gen_random_uuid(), min(btrim(insurer_name)) FROM public.insurance_policies
WHERE nullif(btrim(insurer_name), '') IS NOT NULL
GROUP BY lower(btrim(insurer_name))
ON CONFLICT DO NOTHING;
-- Provider management goes through the backend, never anonymous Supabase access.
ALTER TABLE public.insurance_providers ENABLE ROW LEVEL SECURITY;
COMMIT;
