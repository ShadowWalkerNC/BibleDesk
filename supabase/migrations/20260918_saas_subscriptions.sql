-- BibleDesk — SaaS Subscriptions Migration
-- Adds subscription tier and billing metadata to public.profiles
-- Safe to re-run: uses DO $$ / column existence checks

DO $$
BEGIN
  -- subscription_tier
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free'
      CHECK (subscription_tier IN ('free', 'pro', 'ministry', 'lifetime'));
  END IF;

  -- subscription_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'active'
      CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing'));
  END IF;

  -- stripe_customer_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
  END IF;

  -- stripe_subscription_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_subscription_id TEXT;
  END IF;

  -- subscription_current_period_end
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_current_period_end'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_current_period_end TIMESTAMPTZ;
  END IF;
END $$;

-- Create index on stripe_customer_id for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- Ensure reliable upserting of personal notes per user and verse reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_verse_notes_user_ref ON public.verse_notes(user_id, reference);

