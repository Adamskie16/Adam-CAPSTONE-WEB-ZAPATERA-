-- Migration: 20260906_fix_authentication_and_lockout.sql
-- Description: Standardizes profiles account lockout fields, RLS policies, and account unlock requests table.

-- 1. Ensure exact account lockout columns on public.profiles
ALTER TABLE IF EXISTS public.profiles 
  ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure account_unlock_requests table exists with proper schema
CREATE TABLE IF NOT EXISTS public.account_unlock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'resident',
  status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'approved', 'rejected'
  failed_attempts INT DEFAULT 3,
  code_hash TEXT,
  attempts INT DEFAULT 0,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

-- Index for quick lookup of unlock requests
CREATE INDEX IF NOT EXISTS idx_unlock_requests_email ON public.account_unlock_requests(email);
CREATE INDEX IF NOT EXISTS idx_unlock_requests_status ON public.account_unlock_requests(status);

-- 3. Ensure rate_limits table exists
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  ip_address TEXT,
  attempts INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  last_attempt TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON public.rate_limits(identifier);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_unlock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow reading profiles (for existence check and lockout status check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow public select on profiles'
  ) THEN
    CREATE POLICY "Allow public select on profiles" 
      ON public.profiles FOR SELECT 
      USING (true);
  END IF;
END $$;

-- Allow updating security and lockout state on profiles safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow update failed attempts and lockout'
  ) THEN
    CREATE POLICY "Allow update failed attempts and lockout" 
      ON public.profiles FOR UPDATE 
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- RLS for account_unlock_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'account_unlock_requests' AND policyname = 'Allow insert unlock requests'
  ) THEN
    CREATE POLICY "Allow insert unlock requests" 
      ON public.account_unlock_requests FOR INSERT 
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'account_unlock_requests' AND policyname = 'Allow select unlock requests'
  ) THEN
    CREATE POLICY "Allow select unlock requests" 
      ON public.account_unlock_requests FOR SELECT 
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'account_unlock_requests' AND policyname = 'Allow update unlock requests'
  ) THEN
    CREATE POLICY "Allow update unlock requests" 
      ON public.account_unlock_requests FOR UPDATE 
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'account_unlock_requests' AND policyname = 'Allow delete unlock requests'
  ) THEN
    CREATE POLICY "Allow delete unlock requests" 
      ON public.account_unlock_requests FOR DELETE 
      USING (true);
  END IF;
END $$;

-- RLS for rate_limits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rate_limits' AND policyname = 'Allow all on rate_limits'
  ) THEN
    CREATE POLICY "Allow all on rate_limits" 
      ON public.rate_limits FOR ALL 
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Helper RPC Functions for Atomic Server-Side Lockout Operations
CREATE OR REPLACE FUNCTION public.record_failed_login_attempt(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_email TEXT := LOWER(TRIM(user_email));
  prof_rec RECORD;
  new_attempts INT;
  is_now_locked BOOLEAN;
  now_ts TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO prof_rec FROM public.profiles WHERE LOWER(TRIM(email)) = clean_email LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Profile not found');
  END IF;

  new_attempts := COALESCE(prof_rec.failed_attempts, 0) + 1;
  is_now_locked := (new_attempts >= 3);

  UPDATE public.profiles
  SET 
    failed_attempts = new_attempts,
    is_locked = is_now_locked,
    locked_at = CASE WHEN is_now_locked THEN now_ts ELSE prof_rec.locked_at END,
    updated_at = now_ts
  WHERE id = prof_rec.id;

  IF is_now_locked THEN
    INSERT INTO public.account_unlock_requests (user_id, email, full_name, role, status, failed_attempts, locked_at, created_at)
    VALUES (prof_rec.id, clean_email, prof_rec.full_name, prof_rec.role::TEXT, 'pending', new_attempts, now_ts, now_ts)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'attempts', new_attempts,
    'is_locked', is_now_locked,
    'remaining', GREATEST(0, 3 - new_attempts)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_account_lockout(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_email TEXT := LOWER(TRIM(user_email));
  now_ts TIMESTAMPTZ := NOW();
BEGIN
  UPDATE public.profiles
  SET 
    failed_attempts = 0,
    is_locked = false,
    locked_at = NULL,
    updated_at = now_ts
  WHERE LOWER(TRIM(email)) = clean_email;

  DELETE FROM public.account_unlock_requests WHERE LOWER(TRIM(email)) = clean_email;

  RETURN jsonb_build_object('success', true, 'message', 'Account unlocked and counter reset');
END;
$$;
