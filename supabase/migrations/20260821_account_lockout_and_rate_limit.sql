-- Migration: 20260821_account_lockout_and_rate_limit.sql
-- Description: Adds account lockout fields to profiles, account_unlock_requests queue, and rate_limits tracking.

-- 1. Ensure lockout fields exist on public.profiles
ALTER TABLE IF EXISTS public.profiles 
  ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unlock_requested_at TIMESTAMPTZ;

-- 2. Create account_unlock_requests table for pending admin approvals
CREATE TABLE IF NOT EXISTS public.account_unlock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'resident',
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  failed_attempts INT DEFAULT 3,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

-- Index for quick lookup of pending unlock requests
CREATE INDEX IF NOT EXISTS idx_unlock_requests_email_status ON public.account_unlock_requests(email, status);
CREATE INDEX IF NOT EXISTS idx_unlock_requests_status ON public.account_unlock_requests(status);

-- 3. Create rate_limits table for backend rate limiting enforcement
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- e.g. clean email or user IP
  ip_address TEXT,
  attempts INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  last_attempt TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick rate limit checks
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON public.rate_limits(identifier);

-- 4. Enable Row Level Security (RLS) policies where appropriate
ALTER TABLE public.account_unlock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow public insertion into account_unlock_requests on lockout
CREATE POLICY "Allow system insertion for unlock requests" 
  ON public.account_unlock_requests FOR INSERT 
  WITH CHECK (true);

-- Allow authenticated users/admins to read and update unlock requests
CREATE POLICY "Allow read access to unlock requests" 
  ON public.account_unlock_requests FOR SELECT 
  USING (true);

CREATE POLICY "Allow update access to unlock requests" 
  ON public.account_unlock_requests FOR UPDATE 
  USING (true);

-- Allow system rate limits access
CREATE POLICY "Allow rate limits access" 
  ON public.rate_limits FOR ALL 
  USING (true) WITH CHECK (true);

-- 5. Allow anonymous and authenticated update of failed attempts and lockout on profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Allow update failed attempts and lockout'
  ) THEN
    CREATE POLICY "Allow update failed attempts and lockout" 
      ON public.profiles FOR UPDATE 
      USING (true) WITH CHECK (true);
  END IF;
END $$;
