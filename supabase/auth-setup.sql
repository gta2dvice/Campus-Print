-- Campus Print — Supabase Auth & Profiles Setup
-- This script sets up:
-- 1. public.profiles linked to auth.users(id)
-- 2. Row Level Security (RLS) on profiles
-- 3. Automatic profile generation on auth.users signup
-- 4. Protection against client-side role privilege escalation
-- 5. Safe backward-compatible updates to public.users (passwords removed, linked to auth.users)

-- 1. Create profiles table linked to Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    classroom VARCHAR(100) DEFAULT '',
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'printer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role has full access to profiles" ON public.profiles;

-- RLS: Authenticated users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- RLS: Authenticated users can update their own profile fields
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- RLS: Service role can perform all operations
CREATE POLICY "Service role has full access to profiles"
    ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Guard against role escalation: non-admin users cannot alter their role
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- If the role is being changed
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Only allow if called by service_role (current_user = 'postgres' or auth.role() = 'service_role')
        IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'postgres' THEN
            NEW.role := OLD.role;
        END IF;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_escalation();

-- 3. Automatic profile generation on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'student'
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name
    WHERE public.profiles.full_name = '' OR public.profiles.full_name IS NULL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Backward compatibility with existing public.users table:
-- Drop NOT NULL constraint from password column (passwords are stored in Supabase Auth ONLY)
ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;

-- Add supabase_uid UUID referencing auth.users(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'supabase_uid'
    ) THEN
        ALTER TABLE public.users ADD COLUMN supabase_uid UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON public.users(supabase_uid);
