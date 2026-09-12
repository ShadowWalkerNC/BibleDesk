-- ==============================================================================
-- BibleDesk Schema Migration v8 — Church Integrations & 4-Tier Prayer Escalation
-- Applies on top of schema-v7.sql
--
-- Order: 8 — apply after supabase/schema-v7.sql
-- (canonical chain: schema.sql → schema-v2.sql → schema-v3.sql → schema-v4.sql
--  → schema-v5.sql → schema-v6.sql → schema-v7.sql → schema-v8.sql
--  → schema-v9.sql → rpc.sql; see supabase/README.md)
-- ==============================================================================

-- 1. Churches Directory & Ministry Profiles
CREATE TABLE IF NOT EXISTS public.churches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  denomination TEXT,
  city TEXT,
  state_province TEXT,
  country TEXT,
  website TEXT,
  contact_email TEXT,
  phone TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  member_count INTEGER DEFAULT 1,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast invite code lookups
CREATE INDEX IF NOT EXISTS idx_churches_invite_code ON public.churches(invite_code);
CREATE INDEX IF NOT EXISTS idx_churches_city_country ON public.churches(city, country);

-- 2. Church Members Link
CREATE TABLE IF NOT EXISTS public.church_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id TEXT REFERENCES public.churches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('pastor', 'elder', 'staff', 'intercessor', 'member')),
  email TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(church_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_church_members_user ON public.church_members(user_id);
CREATE INDEX IF NOT EXISTS idx_church_members_church ON public.church_members(church_id);

<<<<<<< HEAD
-- 3. Extend prayers table with 4-tier escalation & church linkage
=======
-- 3. Extend prayer_requests with 4-tier escalation & church linkage
-- NOTE (B04): this previously targeted a never-created public.prayers table.
-- The canonical table is public.prayer_requests (defined in schema-v4.sql).
>>>>>>> 4b0b33e5316e85d0307cdb3e79295aa959e17999
ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS escalation_level TEXT DEFAULT 'private' CHECK (escalation_level IN ('private', 'circle', 'church', 'atlas')),
  ADD COLUMN IF NOT EXISTS urgency_level TEXT DEFAULT 'normal' CHECK (urgency_level IN ('low', 'normal', 'urgent', 'crisis')),
  ADD COLUMN IF NOT EXISTS church_id TEXT REFERENCES public.churches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;

<<<<<<< HEAD
CREATE INDEX IF NOT EXISTS idx_prayers_escalation ON public.prayer_requests(escalation_level);
CREATE INDEX IF NOT EXISTS idx_prayers_church_id ON public.prayer_requests(church_id);
CREATE INDEX IF NOT EXISTS idx_prayers_urgency ON public.prayer_requests(urgency_level);
=======
CREATE INDEX IF NOT EXISTS idx_prayer_requests_escalation ON public.prayer_requests(escalation_level);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_church_id ON public.prayer_requests(church_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_urgency ON public.prayer_requests(urgency_level);
>>>>>>> 4b0b33e5316e85d0307cdb3e79295aa959e17999

-- 4. Enable RLS
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_members ENABLE ROW LEVEL SECURITY;

-- Churches: directory rows carry contact_email / phone / invite_code.
-- B05: SELECT is restricted to the church's admin (admin_user_id). The app
-- serves public directory reads through the /api/church server route
-- (service role, bypasses RLS), so no client ever needs anon-key SELECT.
DROP POLICY IF EXISTS "Public can view churches" ON public.churches;
DROP POLICY IF EXISTS "Church admins can view church profile" ON public.churches;
CREATE POLICY "Church admins can view church profile"
  ON public.churches FOR SELECT
  USING (auth.uid() = admin_user_id);

DROP POLICY IF EXISTS "Admins can manage church profile" ON public.churches;
CREATE POLICY "Admins can manage church profile"
  ON public.churches FOR ALL
  USING (auth.uid() = admin_user_id);

-- Church Members: Church members can view their church roster
DROP POLICY IF EXISTS "Members can view church roster" ON public.church_members;
CREATE POLICY "Members can view church roster"
  ON public.church_members FOR SELECT
  USING (
    church_id IN (
      SELECT church_id FROM public.church_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage own membership" ON public.church_members;
CREATE POLICY "Users can manage own membership"
  ON public.church_members FOR ALL
  USING (auth.uid() = user_id);

-- Prayers Church Escalation RLS:
-- Church members can view prayers escalated to their church
<<<<<<< HEAD
=======
-- NOTE (B04): retargeted from phantom public.prayers → public.prayer_requests.
>>>>>>> 4b0b33e5316e85d0307cdb3e79295aa959e17999
DROP POLICY IF EXISTS "Church members view church-escalated prayers" ON public.prayer_requests;
CREATE POLICY "Church members view church-escalated prayers"
  ON public.prayer_requests FOR SELECT
  USING (
    escalation_level = 'church' AND
    church_id IN (
      SELECT church_id FROM public.church_members WHERE user_id = auth.uid()
    )
  );
