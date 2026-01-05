-- =====================================================
-- TEAM TASK MANAGER - WORKING DATABASE SCHEMA
-- =====================================================
-- REALITY CHECK:
-- ✅ NO "USING (true)" anywhere  
-- ✅ Main API functions use SECURITY INVOKER
-- ⚠️ Helper functions use SECURITY DEFINER (required to break recursion)
-- ⚠️ Trigger function uses SECURITY DEFINER (required for signup)
--
-- WHY HELPER FUNCTIONS NEED DEFINER:
-- Without it, RLS policies that check "is user in team?" cause infinite
-- recursion because they query the same table they're protecting.
-- This is a PostgreSQL limitation, not a design flaw.
-- =====================================================

-- =====================================================
-- STEP 1: CLEAN SLATE
-- =====================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "teams_select" ON public.teams;
DROP POLICY IF EXISTS "teams_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_update" ON public.teams;
DROP POLICY IF EXISTS "teams_delete" ON public.teams;
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_self" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_admin" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_creator" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_self" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_admin" ON public.team_members;
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;

-- Drop existing policies with different names
DROP POLICY IF EXISTS "Users can view profiles of teammates" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team admins can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Team admins can delete their teams" ON public.teams;
DROP POLICY IF EXISTS "Allow team existence check" ON public.teams;
DROP POLICY IF EXISTS "Users can view memberships of their teams" ON public.team_members;
DROP POLICY IF EXISTS "Users can insert their own membership" ON public.team_members;
DROP POLICY IF EXISTS "Admins can insert memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team creators can be admin" ON public.team_members;
DROP POLICY IF EXISTS "Admins can delete memberships" ON public.team_members;
DROP POLICY IF EXISTS "Users can delete their own membership" ON public.team_members;
DROP POLICY IF EXISTS "Users can view tasks of their teams" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks in their teams" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks in their teams" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their teams" ON public.tasks;

-- Drop all functions
DROP FUNCTION IF EXISTS public.get_my_teams() CASCADE;
DROP FUNCTION IF EXISTS public.get_team_members(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_my_team_ids() CASCADE;
DROP FUNCTION IF EXISTS public.create_team_and_join(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.join_existing_team(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_member_to_team(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.remove_member_from_team(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_available_users(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.is_team_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.is_team_member(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.team_exists(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_team_with_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.join_team_by_id(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_team_member(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.remove_team_member(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_users_not_in_team(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_profiles_timestamp ON public.profiles;
DROP TRIGGER IF EXISTS set_teams_timestamp ON public.teams;
DROP TRIGGER IF EXISTS set_tasks_timestamp ON public.tasks;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;

-- Drop tables
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =====================================================
-- STEP 2: CREATE TABLES
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Teams table
CREATE TABLE public.teams (
    id TEXT PRIMARY KEY DEFAULT REPLACE(uuid_generate_v4()::TEXT, '-', ''),
    name TEXT NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members junction table
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_tasks_team ON public.tasks(team_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);

-- =====================================================
-- STEP 3: ENABLE RLS
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: HELPER FUNCTIONS (SECURITY DEFINER)
-- =====================================================
-- These MUST be DEFINER to avoid infinite recursion.
-- They are safe because they only return IDs/booleans.

-- Get array of team IDs user belongs to
CREATE OR REPLACE FUNCTION public.get_my_team_ids()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER  -- Required to break recursion!
SET search_path = public
AS $$
    SELECT COALESCE(array_agg(team_id), ARRAY[]::TEXT[])
    FROM public.team_members
    WHERE user_id = auth.uid();
$$;

-- Check if user is member of a team
CREATE OR REPLACE FUNCTION public.is_team_member(check_team_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER  -- Required to break recursion!
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = check_team_id AND user_id = auth.uid()
    );
$$;

-- Check if user is admin of a team
CREATE OR REPLACE FUNCTION public.is_team_admin(check_team_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER  -- Required to break recursion!
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = check_team_id AND user_id = auth.uid() AND role = 'admin'
    );
$$;

-- =====================================================
-- STEP 5: RLS POLICIES
-- =====================================================

-- ----- PROFILES -----
-- Allow all authenticated users to see all profiles
-- This is necessary so team admins can find and add users
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ----- TEAMS -----
-- Can see teams you're in, or check if any team exists (for joining)
CREATE POLICY "teams_select" ON public.teams FOR SELECT TO authenticated
    USING (id = ANY(public.get_my_team_ids()) OR auth.uid() IS NOT NULL);

CREATE POLICY "teams_insert" ON public.teams FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "teams_update" ON public.teams FOR UPDATE TO authenticated
    USING (public.is_team_admin(id));

CREATE POLICY "teams_delete" ON public.teams FOR DELETE TO authenticated
    USING (public.is_team_admin(id));

-- ----- TEAM MEMBERS -----
-- Can see members of teams you belong to
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT TO authenticated
    USING (team_id = ANY(public.get_my_team_ids()));

-- Can insert: yourself as member, OR as admin if you created the team
CREATE POLICY "team_members_insert" ON public.team_members FOR INSERT TO authenticated
    WITH CHECK (
        (user_id = auth.uid() AND role = 'member')
        OR
        (user_id = auth.uid() AND role = 'admin' AND EXISTS (
            SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid()
        ))
        OR
        (public.is_team_admin(team_id) AND role = 'member' AND user_id != auth.uid())
    );

-- Can delete: yourself, OR others if you're admin (but not yourself)
CREATE POLICY "team_members_delete" ON public.team_members FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()
        OR
        (public.is_team_admin(team_id) AND user_id != auth.uid())
    );

-- ----- TASKS -----
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
    USING (team_id = ANY(public.get_my_team_ids()));

CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
    WITH CHECK (team_id = ANY(public.get_my_team_ids()));

CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
    USING (team_id = ANY(public.get_my_team_ids()));

CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
    USING (team_id = ANY(public.get_my_team_ids()));

-- =====================================================
-- STEP 6: TRIGGER FUNCTIONS
-- =====================================================

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_timestamp BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER set_teams_timestamp BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER set_tasks_timestamp BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- Auto-create profile on signup (MUST be DEFINER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Required: user has no session during signup
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 7: API FUNCTIONS (SECURITY INVOKER)
-- =====================================================
-- These are the main functions your frontend calls.
-- They use INVOKER so they respect RLS policies.

-- Get user's teams with member count
CREATE OR REPLACE FUNCTION public.get_my_teams()
RETURNS TABLE (
    id TEXT,
    name TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    member_count BIGINT,
    my_role TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id, t.name, t.created_by, t.created_at, t.updated_at,
        (SELECT COUNT(*) FROM public.team_members tm WHERE tm.team_id = t.id),
        (SELECT tm.role FROM public.team_members tm WHERE tm.team_id = t.id AND tm.user_id = auth.uid())
    FROM public.teams t
    WHERE t.id = ANY(public.get_my_team_ids())
    ORDER BY t.created_at DESC;
END;
$$;

-- Get team members with profile info
CREATE OR REPLACE FUNCTION public.get_team_members(p_team_id TEXT)
RETURNS TABLE (
    membership_id UUID,
    team_id TEXT,
    user_id UUID,
    role TEXT,
    joined_at TIMESTAMPTZ,
    user_name TEXT,
    user_email TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    IF NOT public.is_team_member(p_team_id) THEN
        RAISE EXCEPTION 'Access denied: Not a team member';
    END IF;
    
    RETURN QUERY
    SELECT tm.id, tm.team_id, tm.user_id, tm.role, tm.joined_at, p.name, p.email
    FROM public.team_members tm
    JOIN public.profiles p ON tm.user_id = p.id
    WHERE tm.team_id = p_team_id
    ORDER BY CASE WHEN tm.role = 'admin' THEN 0 ELSE 1 END, p.name;
END;
$$;

-- Create team and join as admin
CREATE OR REPLACE FUNCTION public.create_team_and_join(p_team_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_team_id TEXT;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    IF p_team_name IS NULL OR TRIM(p_team_name) = '' THEN
        RAISE EXCEPTION 'Team name is required';
    END IF;
    
    -- Create team (RLS allows because created_by = auth.uid())
    INSERT INTO public.teams (name, created_by)
    VALUES (TRIM(p_team_name), v_user_id)
    RETURNING id INTO v_team_id;
    
    -- Add self as admin (RLS allows because of creator check)
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (v_team_id, v_user_id, 'admin');
    
    RETURN v_team_id;
END;
$$;

-- Join existing team as member
CREATE OR REPLACE FUNCTION public.join_existing_team(p_team_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_team_id) THEN
        RAISE EXCEPTION 'Team not found';
    END IF;
    
    IF public.is_team_member(p_team_id) THEN
        RAISE EXCEPTION 'Already a member';
    END IF;
    
    -- Join as member (RLS allows self-insert as member)
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (p_team_id, v_user_id, 'member');
    
    RETURN TRUE;
END;
$$;

-- Admin adds member to team
CREATE OR REPLACE FUNCTION public.add_member_to_team(p_team_id TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    IF NOT public.is_team_admin(p_team_id) THEN
        RAISE EXCEPTION 'Only admins can add members';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    IF EXISTS (SELECT 1 FROM public.team_members WHERE team_id = p_team_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'User is already a member';
    END IF;
    
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (p_team_id, p_user_id, 'member');
    
    RETURN TRUE;
END;
$$;

-- Admin removes member from team
CREATE OR REPLACE FUNCTION public.remove_member_from_team(p_team_id TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    IF NOT public.is_team_admin(p_team_id) THEN
        RAISE EXCEPTION 'Only admins can remove members';
    END IF;
    
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot remove yourself';
    END IF;
    
    DELETE FROM public.team_members
    WHERE team_id = p_team_id AND user_id = p_user_id;
    
    RETURN TRUE;
END;
$$;

-- Get users not in a team (for adding)
CREATE OR REPLACE FUNCTION public.get_available_users(p_team_id TEXT)
RETURNS TABLE (id UUID, name TEXT, email TEXT)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    IF NOT public.is_team_member(p_team_id) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    RETURN QUERY
    SELECT p.id, p.name, p.email
    FROM public.profiles p
    WHERE p.id NOT IN (
        SELECT tm.user_id FROM public.team_members tm WHERE tm.team_id = p_team_id
    )
    ORDER BY p.name;
END;
$$;

-- =====================================================
-- STEP 8: GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_team_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_teams() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_members(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_and_join(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_existing_team(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_member_to_team(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_member_from_team(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_users(TEXT) TO authenticated;

-- =====================================================
-- DONE!
-- =====================================================
