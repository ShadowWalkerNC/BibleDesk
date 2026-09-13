-- Apply after the legacy schemas. API-only access prevents direct Data API
-- clients from bypassing the public projection or self-approving a prayer.
-- Existing rows default to private/pending; this migration never publishes data.
BEGIN;
ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS display_name text DEFAULT 'Anonymous',
  ADD COLUMN IF NOT EXISTS request text,
  ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_restricted_region boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_restricted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_mode text NOT NULL DEFAULT 'restricted',
  ADD COLUMN IF NOT EXISTS escalation_level text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS urgency_level text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS church_id text REFERENCES public.churches(id),
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT true;

ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.prayer_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_requests TO service_role;

CREATE OR REPLACE FUNCTION public.increment_public_prayer_likes(prayer_id uuid)
RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$
  UPDATE public.prayer_requests
  SET likes_count = coalesce(likes_count, 0) + 1
  WHERE id = prayer_id AND status = 'published' AND escalation_level = 'atlas'
    AND is_restricted = false AND is_restricted_region = false
    AND privacy_mode IN ('approximate', 'precise') AND deleted_at IS NULL
  RETURNING likes_count;
$$;
REVOKE ALL ON FUNCTION public.increment_public_prayer_likes(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_public_prayer_likes(uuid) TO service_role;
COMMIT;
