-- Secure Barangay Document Management and Issuance System (Barangay Zapatera)
-- Supabase Database Schema SQL Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Custom ENUM Types
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('super_admin', 'admin', 'resident');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE request_status_enum AS ENUM ('pending', 'under_review', 'approved', 'declined', 'issued');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE event_audience_enum AS ENUM ('all', 'residents', 'admins');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE audit_level_enum AS ENUM ('info', 'warning', 'danger', 'security');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. UNIFIED PROFILES TABLE (Stores All Accounts: SuperAdmin, Admin, Resident)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE,
    avatar_url TEXT,
    role user_role_enum NOT NULL DEFAULT 'resident',
    phone TEXT,
    address TEXT,
    id_type TEXT,
    id_number TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remove Foreign Key constraint on id if it was referencing auth.users to allow direct admin account creation
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Ensure columns exist if table was created previously
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. DOCUMENT TYPES TABLE (Templates & Fees)
CREATE TABLE IF NOT EXISTS public.document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    processing_days INTEGER NOT NULL DEFAULT 1,
    requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DOCUMENT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.document_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number TEXT UNIQUE NOT NULL,
    resident_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES public.document_types(id),
    purpose TEXT NOT NULL,
    requirements_attached JSONB DEFAULT '[]'::jsonb,
    status request_status_enum NOT NULL DEFAULT 'pending',
    notes TEXT,
    rejection_reason TEXT,
    processed_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    issued_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. EVENTS & ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    target_audience event_audience_enum NOT NULL DEFAULT 'all',
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming', -- upcoming, ongoing, completed, cancelled
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SYSTEM CONFIGURATIONS TABLE
CREATE TABLE IF NOT EXISTS public.system_config (
    id INT PRIMARY KEY DEFAULT 1,
    barangay_name TEXT NOT NULL DEFAULT 'Barangay Zapatera',
    municipality TEXT NOT NULL DEFAULT 'Cebu City',
    province TEXT NOT NULL DEFAULT 'Cebu',
    seal_url TEXT DEFAULT 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=300&q=80',
    office_hours TEXT DEFAULT 'Mon - Fri: 8:00 AM - 5:00 PM',
    contact_email TEXT DEFAULT 'info@barangayzapatera.gov.ph',
    contact_phone TEXT DEFAULT '(032) 253-1234',
    doc_prefix TEXT DEFAULT 'BZ-2026',
    auto_notify BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- 6. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_target user_role_enum, -- null if targeted at specific user
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, alert
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    feature TEXT NOT NULL,
    details TEXT,
    level audit_level_enum NOT NULL DEFAULT 'info',
    ip_address TEXT DEFAULT '127.0.0.1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running script to avoid "policy already exists" error
DROP POLICY IF EXISTS "Public Profiles Read" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Insert" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Delete" ON public.profiles;
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "SuperAdmin Admin Profile All" ON public.profiles;

DROP POLICY IF EXISTS "Doc Types Read All" ON public.document_types;
DROP POLICY IF EXISTS "Doc Types Admin Manage" ON public.document_types;

DROP POLICY IF EXISTS "Resident Read Own Requests" ON public.document_requests;
DROP POLICY IF EXISTS "Resident Create Request" ON public.document_requests;
DROP POLICY IF EXISTS "Admin All Requests" ON public.document_requests;

DROP POLICY IF EXISTS "Events Read All" ON public.events;
DROP POLICY IF EXISTS "Events Admin Manage" ON public.events;

DROP POLICY IF EXISTS "Config Read All" ON public.system_config;
DROP POLICY IF EXISTS "Config SuperAdmin Manage" ON public.system_config;

DROP POLICY IF EXISTS "Audit Logs Admin Read" ON public.audit_logs;

-- Helper function to prevent RLS infinite recursion on public.profiles
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role IN ('super_admin', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Profiles Policies
CREATE POLICY "Public Profiles Read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public Profiles Insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Profiles Delete" ON public.profiles FOR DELETE USING (true);
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR auth.uid() IS NULL);
CREATE POLICY "SuperAdmin Admin Profile All" ON public.profiles FOR ALL USING (
    public.is_admin_or_superadmin(auth.uid())
);

-- Document Types Policies
CREATE POLICY "Doc Types Read All" ON public.document_types FOR SELECT USING (true);
CREATE POLICY "Doc Types Admin Manage" ON public.document_types FOR ALL USING (
    public.is_admin_or_superadmin(auth.uid())
);

-- Document Requests Policies
CREATE POLICY "Resident Read Own Requests" ON public.document_requests FOR SELECT USING (auth.uid() = resident_id);
CREATE POLICY "Resident Create Request" ON public.document_requests FOR INSERT WITH CHECK (auth.uid() = resident_id);
CREATE POLICY "Admin All Requests" ON public.document_requests FOR ALL USING (
    public.is_admin_or_superadmin(auth.uid())
);

-- Events Policies
CREATE POLICY "Events Read All" ON public.events FOR SELECT USING (true);
CREATE POLICY "Events Admin Manage" ON public.events FOR ALL USING (
    public.is_admin_or_superadmin(auth.uid())
);

-- Config & Logs Policies
CREATE POLICY "Config Read All" ON public.system_config FOR SELECT USING (true);
CREATE POLICY "Config SuperAdmin Manage" ON public.system_config FOR ALL USING (
    public.is_admin_or_superadmin(auth.uid())
);

CREATE POLICY "Activity Logs Admin Read" ON public.activity_logs FOR SELECT USING (
    public.is_admin_or_superadmin(auth.uid())
);

-- AUTOMATIC TRIGGERS (SuperAdmin Account Page & Profile Sync)

-- 1. Automatic updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 2. Automatic profile creation trigger when a user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role user_role_enum := 'resident'::user_role_enum;
    meta_role text;
    gen_username text;
BEGIN
    BEGIN
        meta_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'resident'));
        IF meta_role = 'super_admin' OR meta_role = 'superadmin' THEN
            assigned_role := 'super_admin'::user_role_enum;
        ELSIF meta_role = 'admin' THEN
            assigned_role := 'admin'::user_role_enum;
        ELSE
            assigned_role := 'resident'::user_role_enum;
        END IF;

        gen_username := COALESCE(
            NEW.raw_user_meta_data->>'username',
            SPLIT_PART(NEW.email, '@', 1)
        );

        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            username,
            role,
            phone,
            address,
            id_type,
            id_number,
            avatar_url,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', 'Resident User'),
            gen_username,
            assigned_role,
            COALESCE(NEW.raw_user_meta_data->>'phone', '09170000000'),
            COALESCE(NEW.raw_user_meta_data->>'address', 'Barangay Zapatera, Cebu City'),
            COALESCE(NEW.raw_user_meta_data->>'id_type', 'Barangay ID'),
            COALESCE(NEW.raw_user_meta_data->>'id_number', 'BZ-RESIDENT'),
            COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80'),
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            id = EXCLUDED.id,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            id_type = EXCLUDED.id_type,
            id_number = EXCLUDED.id_number,
            updated_at = NOW();
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user_profile notice: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_profile();

-- 3. Automatic auth.users deletion trigger when a profile is deleted
CREATE OR REPLACE FUNCTION public.handle_delete_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.id IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = OLD.id;
    END IF;
    IF OLD.email IS NOT NULL THEN
        DELETE FROM auth.users WHERE LOWER(email) = LOWER(OLD.email);
    END IF;
    RETURN OLD;
EXCEPTION WHEN OTHERS THEN
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
    AFTER DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_delete_user_profile();

-- 4. RPC Helper Functions for Account & Auth User Deletion (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.delete_user_by_id(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.profiles WHERE id = user_id;
    DELETE FROM auth.users WHERE id = user_id;
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.delete_user_by_email(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.profiles WHERE LOWER(email) = LOWER(user_email);
    DELETE FROM auth.users WHERE LOWER(email) = LOWER(user_email);
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.delete_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.profiles WHERE id = user_id;
    DELETE FROM auth.users WHERE id = user_id;
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;


-- Initial Seed Data
INSERT INTO public.system_config (id, barangay_name, municipality, province, seal_url, doc_prefix)
VALUES (1, 'Barangay Zapatera', 'Cebu City', 'Cebu', 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=300&q=80', 'BZ-2026')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.document_types (code, title, description, fee, processing_days, requirements)
VALUES
('BC-01', 'Barangay Clearance', 'Official document certifying good moral character and zero pending complaints for employment or legal requirements.', 50.00, 1, '["Valid Government Issued ID", "Proof of Residency / Utility Bill"]'::jsonb),
('CI-02', 'Certificate of Indigency', 'Issued to low-income residents for medical, financial, or educational assistance.', 0.00, 1, '["Certificate of Low Income / Affidavit", "Barangay ID or Voter ID"]'::jsonb),
('CR-03', 'Certificate of Residency', 'Proof of continuous residence within Barangay Zapatera for bank, school, or employment needs.', 30.00, 1, '["Valid ID showing address", "Lease Contract or Landlord Affidavit"]'::jsonb),
('BP-04', 'Barangay Business Permit', 'Clearance for commercial establishments operating within the jurisdiction of Barangay Zapatera.', 250.00, 3, '["DTI/SEC Registration", "Lease Contract or Title", "Fire Safety Clearance"]'::jsonb)
ON CONFLICT (code) DO NOTHING;
