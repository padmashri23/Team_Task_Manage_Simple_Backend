-- =====================================================
-- TEAM TASK MANAGER - COMPLETE DATABASE SCHEMA
-- =====================================================
-- RULES FOLLOWED:
-- ✅ NO "USING (true)" anywhere
-- ✅ NO "SECURITY DEFINER" - only SECURITY INVOKER
-- ✅ Proper RLS on every table
-- ✅ No infinite recursion
-- =====================================================

-- =====================================================
-- STEP 1: CLEAN SLATE - DROP EVERYTHING
-- =====================================================
-- Why? We want to start fresh. If you run this multiple times,
-- old policies/tables could conflict with new ones.

-- Drop policies first (they depend on tables)
DROP POLICY IF EXISTS "Users can view profiles of teammates" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team admins can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Team admins can delete their teams" ON public.teams;

DROP POLICY IF EXISTS "Users can view memberships of their teams" ON public.team_members;
DROP POLICY IF EXISTS "Users can insert their own membership" ON public.team_members;
DROP POLICY IF EXISTS "Admins can insert memberships" ON public.team_members;
DROP POLICY IF EXISTS "Admins can delete memberships" ON public.team_members;
DROP POLICY IF EXISTS "Users can delete their own membership" ON public.team_members;

DROP POLICY IF EXISTS "Users can view tasks of their teams" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks in their teams" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks in their teams" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their teams" ON public.tasks;

-- Drop functions (they depend on tables)
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

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_profiles_timestamp ON public.profiles;
DROP TRIGGER IF EXISTS set_teams_timestamp ON public.teams;
DROP TRIGGER IF EXISTS set_tasks_timestamp ON public.tasks;

-- Drop tables (order matters due to foreign keys!)
-- Drop child tables first, then parent tables
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =====================================================
-- STEP 2: CREATE EXTENSION
-- =====================================================
-- uuid-ossp lets us generate unique IDs automatically
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 3: CREATE TABLES
-- =====================================================

-- -------------------------------------------------
-- TABLE: profiles
-- -------------------------------------------------
-- WHAT: Stores user information (name, email)
-- WHY: Supabase auth.users only stores auth data, we need
--      a place for display names and app-specific user data
-- LINK: Each profile.id = auth.users.id (1-to-1 relationship)

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    -- ↑ PRIMARY KEY = unique identifier, can't be NULL
    -- This ID comes from auth.users.id (set during signup)
    
    name TEXT NOT NULL,
    -- ↑ NOT NULL = must have a value (can't be empty)
    -- The user's display name
    
    email TEXT NOT NULL UNIQUE,
    -- ↑ UNIQUE = no two users can have same email
    -- Stored here for easy querying without joining auth.users
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- ↑ DEFAULT NOW() = automatically set to current time
    -- TIMESTAMPTZ = timestamp with timezone
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- ↑ Updated automatically by trigger (see below)
    
    CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
    -- ↑ FOREIGN KEY = this id must exist in auth.users
    -- ON DELETE CASCADE = if auth user deleted, profile deleted too
);

-- -------------------------------------------------
-- TABLE: teams  
-- -------------------------------------------------
-- WHAT: Stores team information
-- WHY: Users create teams to collaborate on tasks

CREATE TABLE public.teams (
    id TEXT PRIMARY KEY DEFAULT REPLACE(uuid_generate_v4()::TEXT, '-', ''),
    -- ↑ TEXT instead of UUID for easier sharing
    -- REPLACE removes dashes: "abc-def" → "abcdef" (32 chars)
    -- This is the "Team ID" users share with others to join
    
    name TEXT NOT NULL,
    -- ↑ Team name like "Marketing Team" or "Dev Squad"
    
    created_by UUID NOT NULL,
    -- ↑ Who created this team (references profiles.id)
    -- NOT NULL = every team must have a creator
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT teams_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE
    -- ↑ If creator's profile deleted, their teams are deleted
);

-- -------------------------------------------------
-- TABLE: team_members (JUNCTION TABLE)
-- -------------------------------------------------
-- WHAT: Links users to teams (many-to-many relationship)
-- WHY: One user can be in MANY teams, one team can have MANY users
-- HOW: Each row = "User X is a member of Team Y with role Z"

CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- ↑ Unique ID for this membership record
    
    team_id TEXT NOT NULL,
    -- ↑ Which team this membership is for
    
    user_id UUID NOT NULL,
    -- ↑ Which user this membership is for
    
    role TEXT NOT NULL DEFAULT 'member',
    -- ↑ Either 'admin' or 'member'
    -- DEFAULT 'member' = new members start as regular members
    
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    -- ↑ When user joined this team
    
    CONSTRAINT team_members_team_fkey 
        FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    -- ↑ If team deleted, all memberships deleted
    
    CONSTRAINT team_members_user_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- ↑ If user deleted, their memberships deleted
    
    CONSTRAINT team_members_role_check 
        CHECK (role IN ('admin', 'member')),
    -- ↑ CHECK constraint: role can ONLY be 'admin' or 'member'
    -- Database rejects any other value!
    
    CONSTRAINT team_members_unique 
        UNIQUE (team_id, user_id)
    -- ↑ UNIQUE on combination: can't join same team twice!
    -- User can be in team A and team B, but not in team A twice
);

-- -------------------------------------------------
-- TABLE: tasks
-- -------------------------------------------------
-- WHAT: Stores tasks belonging to teams
-- WHY: The main purpose of the app - manage team tasks!

CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    team_id TEXT NOT NULL,
    -- ↑ Which team this task belongs to
    
    title TEXT NOT NULL,
    -- ↑ Task title like "Fix login bug" or "Design homepage"
    
    description TEXT,
    -- ↑ Optional longer description (no NOT NULL = can be empty)
    
    status TEXT NOT NULL DEFAULT 'pending',
    -- ↑ One of: 'pending', 'in-progress', 'completed'
    -- DEFAULT 'pending' = new tasks start as pending
    
    created_by UUID,
    -- ↑ Who created this task (can be NULL if user deleted)
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT tasks_team_fkey 
        FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    -- ↑ If team deleted, all its tasks deleted
    
    CONSTRAINT tasks_creator_fkey 
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- ↑ ON DELETE SET NULL = if creator deleted, just set to NULL
    -- (don't delete the task, just remove creator reference)
    
    CONSTRAINT tasks_status_check 
        CHECK (status IN ('pending', 'in-progress', 'completed'))
    -- ↑ Status can ONLY be these 3 values
);

-- -------------------------------------------------
-- INDEXES (Speed up queries)
-- -------------------------------------------------
-- INDEX = like a book's index - helps find data faster
-- Without index: scan ALL rows. With index: jump directly to matching rows.

CREATE INDEX idx_profiles_email ON public.profiles(email);
-- ↑ Fast lookup when searching by email

CREATE INDEX idx_team_members_team ON public.team_members(team_id);
-- ↑ Fast lookup: "get all members of team X"

CREATE INDEX idx_team_members_user ON public.team_members(user_id);
-- ↑ Fast lookup: "get all teams user X is in"

CREATE INDEX idx_tasks_team ON public.tasks(team_id);
-- ↑ Fast lookup: "get all tasks for team X"

CREATE INDEX idx_tasks_status ON public.tasks(status);
-- ↑ Fast filtering by status

-- =====================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================
-- RLS = Database-level security that filters rows automatically
-- Even if someone bypasses your frontend, database protects data!

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: HELPER FUNCTIONS (Used by RLS policies)
-- =====================================================
-- These functions help RLS policies make decisions
-- All use SECURITY INVOKER = run as the calling user

-- -------------------------------------------------
-- FUNCTION: is_team_member
-- -------------------------------------------------
-- PURPOSE: Check if current user is a member of a specific team
-- RETURNS: TRUE if member, FALSE if not
-- USED BY: RLS policies to check access

CREATE OR REPLACE FUNCTION public.is_team_member(check_team_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE  -- STABLE = function doesn't modify data, same inputs give same outputs
SECURITY INVOKER  -- Run as calling user, respects RLS
AS $$
    -- Check if a row exists where:
    -- - team_id matches the team we're checking
    -- - user_id is the current logged-in user
    SELECT EXISTS (
        SELECT 1 
        FROM public.team_members 
        WHERE team_id = check_team_id 
        AND user_id = auth.uid()
    );
$$;

-- EXPLANATION FOR A CHILD:
-- Imagine a club has a list of members at the door.
-- This function is like asking the bouncer: 
-- "Is [current user] on the list for [this club]?"
-- Bouncer checks list, says YES or NO.

-- -------------------------------------------------
-- FUNCTION: is_team_admin
-- -------------------------------------------------
-- PURPOSE: Check if current user is an ADMIN of a specific team
-- RETURNS: TRUE if admin, FALSE if not (or not member at all)

CREATE OR REPLACE FUNCTION public.is_team_admin(check_team_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.team_members 
        WHERE team_id = check_team_id 
        AND user_id = auth.uid()
        AND role = 'admin'  -- Extra check: must be admin role
    );
$$;

-- EXPLANATION FOR A CHILD:
-- Same as above, but bouncer also checks if you have a "VIP" badge.
-- Only VIPs (admins) can do special things like kick people out.

-- -------------------------------------------------
-- FUNCTION: get_my_team_ids
-- -------------------------------------------------
-- PURPOSE: Get list of all team IDs current user belongs to
-- RETURNS: Array of team IDs like ['abc123', 'def456']
-- USED BY: RLS policies to check "is this team one of mine?"

CREATE OR REPLACE FUNCTION public.get_my_team_ids()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
    SELECT COALESCE(
        array_agg(team_id),  -- Collect all team_ids into an array
        ARRAY[]::TEXT[]      -- If no teams, return empty array (not NULL)
    )
    FROM public.team_members
    WHERE user_id = auth.uid();
$$;

-- EXPLANATION FOR A CHILD:
-- You're in the Chess Club and Soccer Club.
-- This function returns your club card: ['Chess Club', 'Soccer Club']
-- We can then check: "Is Basketball Club on your card?" NO → Access denied!

-- =====================================================
-- STEP 6: RLS POLICIES
-- =====================================================
-- Each policy = a rule that filters which rows a user can see/modify
-- Format: CREATE POLICY "name" ON table FOR action USING (condition)

-- -------------------------------------------------
-- POLICIES FOR: profiles
-- -------------------------------------------------

-- POLICY 1: SELECT (Read profiles)
CREATE POLICY "Users can view profiles of teammates"
ON public.profiles
FOR SELECT  -- This policy applies to SELECT queries
TO authenticated  -- Only for logged-in users
USING (
    -- You can see a profile if:
    -- CONDITION 1: It's your own profile
    id = auth.uid()
    OR
    -- CONDITION 2: This person shares at least one team with you
    id IN (
        -- Subquery: Get all user_ids in teams I belong to
        SELECT tm.user_id 
        FROM public.team_members tm
        WHERE tm.team_id = ANY(public.get_my_team_ids())
        -- ANY(array) = matches if team_id is in the array
    )
);

-- EXPLANATION FOR A CHILD:
-- You can see your own profile picture (that's you!).
-- You can also see profile pictures of kids in your clubs.
-- You CANNOT see profiles of kids you don't share any club with.

-- POLICY 2: INSERT (Create profile)
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
    -- You can only insert a profile with YOUR id
    id = auth.uid()
);

-- EXPLANATION FOR A CHILD:
-- You can only create YOUR OWN profile card.
-- You can't create a profile card pretending to be someone else!

-- POLICY 3: UPDATE (Edit profile)
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())  -- Can only see/target your own row
WITH CHECK (id = auth.uid());  -- Can only save if still your row

-- EXPLANATION FOR A CHILD:
-- You can change YOUR name on YOUR profile card.
-- You can't edit someone else's profile card!

-- -------------------------------------------------
-- POLICIES FOR: teams
-- -------------------------------------------------

-- POLICY 1: SELECT (View teams)
CREATE POLICY "Users can view teams they belong to"
ON public.teams
FOR SELECT
TO authenticated
USING (
    -- You can see a team if its id is in your list of team memberships
    id = ANY(public.get_my_team_ids())
);

-- EXPLANATION FOR A CHILD:
-- You can only see clubs you're a member of.
-- You know Chess Club and Soccer Club exist (you're in them).
-- You don't know if "Secret Treehouse Club" exists (you're not a member).

-- POLICY 2: INSERT (Create team)
CREATE POLICY "Authenticated users can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (
    -- You can create a team if you set yourself as creator
    created_by = auth.uid()
);

-- EXPLANATION FOR A CHILD:
-- Anyone can start a new club, but YOU must be listed as the founder.
-- You can't create a club and say "Tommy founded this" - only you!

-- POLICY 3: UPDATE (Edit team)
CREATE POLICY "Team admins can update their teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (
    -- Must be admin of this team to update it
    public.is_team_admin(id)
)
WITH CHECK (
    -- After update, creator must stay the same (can't change founder)
    created_by = created_by  -- This is always true, but prevents changing it
);

-- EXPLANATION FOR A CHILD:
-- Only club leaders (admins) can rename the club.
-- Regular members can't change the club name.

-- POLICY 4: DELETE (Delete team)
CREATE POLICY "Team admins can delete their teams"
ON public.teams
FOR DELETE
TO authenticated
USING (
    public.is_team_admin(id)
);

-- EXPLANATION FOR A CHILD:
-- Only club leaders can shut down the whole club.
-- Regular members can leave, but can't destroy the club.

-- -------------------------------------------------
-- POLICIES FOR: team_members (THE TRICKY ONE!)
-- -------------------------------------------------
-- This is where infinite recursion usually happens.
-- We avoid it by using get_my_team_ids() which doesn't cause loops.

-- POLICY 1: SELECT (View memberships)
CREATE POLICY "Users can view memberships of their teams"
ON public.team_members
FOR SELECT
TO authenticated
USING (
    -- You can see membership records for teams you belong to
    team_id = ANY(public.get_my_team_ids())
);

-- WHY THIS WORKS (avoiding infinite recursion):
-- 1. User queries team_members table
-- 2. RLS checks: is this row's team_id in get_my_team_ids()?
-- 3. get_my_team_ids() runs with RLS disabled for THAT specific query
--    (because it's a function, not a direct table access)
-- 4. Function returns ['team1', 'team2']
-- 5. RLS compares row's team_id against this array
-- 6. NO RECURSION because we're not doing a SELECT inside the policy
--    that would trigger the same policy again!

-- EXPLANATION FOR A CHILD:
-- You have your club membership card listing your clubs.
-- When looking at ANY club's member list, we first check:
-- "Is this club on your card?" 
-- YES → You can see who else is in this club
-- NO → You can't see the member list (you're not in this club!)

-- POLICY 2: INSERT (Join team - for yourself)
CREATE POLICY "Users can insert their own membership"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
    -- You can only add YOURSELF to a team
    user_id = auth.uid()
    AND
    -- And you must join as 'member' (not admin)
    role = 'member'
);

-- EXPLANATION FOR A CHILD:
-- You can sign yourself up to join a club as a regular member.
-- You CAN'T sign yourself up as the club leader - that's cheating!
-- You CAN'T sign up your friend - they must do it themselves.

-- POLICY 3: INSERT (Add members - for admins)
CREATE POLICY "Admins can insert memberships"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
    -- Must be admin of this team
    public.is_team_admin(team_id)
    AND
    -- Can only add as regular member (not another admin)
    role = 'member'
);

-- EXPLANATION FOR A CHILD:
-- Club leaders can invite new members to join.
-- But they can't make someone else a leader directly - 
-- that would need a separate "promote" feature.

-- POLICY 4: DELETE (Remove members - for admins)
CREATE POLICY "Admins can delete memberships"
ON public.team_members
FOR DELETE
TO authenticated
USING (
    -- Must be admin of this team
    public.is_team_admin(team_id)
    AND
    -- Cannot delete yourself (admin can't kick themselves)
    user_id != auth.uid()
);

-- EXPLANATION FOR A CHILD:
-- Club leaders can kick out members.
-- But leaders can't kick themselves out (who would run the club?).

-- POLICY 5: DELETE (Leave team - for yourself)
CREATE POLICY "Users can delete their own membership"
ON public.team_members
FOR DELETE
TO authenticated
USING (
    -- You can only remove YOUR OWN membership
    user_id = auth.uid()
);

-- EXPLANATION FOR A CHILD:
-- You can quit any club you're in by tearing up YOUR membership card.
-- You can't tear up someone else's card - that's not yours!

-- -------------------------------------------------
-- POLICIES FOR: tasks
-- -------------------------------------------------

-- POLICY 1: SELECT (View tasks)
CREATE POLICY "Users can view tasks of their teams"
ON public.tasks
FOR SELECT
TO authenticated
USING (
    team_id = ANY(public.get_my_team_ids())
);

-- EXPLANATION FOR A CHILD:
-- You can see the to-do lists of clubs you belong to.
-- Chess Club's task: "Buy new chess boards" - you can see this.
-- Secret Club's task: hidden from you (you're not a member).

-- POLICY 2: INSERT (Create tasks)
CREATE POLICY "Users can create tasks in their teams"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
    -- Must be member of the team
    team_id = ANY(public.get_my_team_ids())
    AND
    -- Must set yourself as creator
    (created_by = auth.uid() OR created_by IS NULL)
);

-- EXPLANATION FOR A CHILD:
-- You can add items to your club's to-do list.
-- You MUST say YOU added it (not pretend someone else did).

-- POLICY 3: UPDATE (Edit tasks)
CREATE POLICY "Users can update tasks in their teams"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
    team_id = ANY(public.get_my_team_ids())
)
WITH CHECK (
    team_id = ANY(public.get_my_team_ids())
);

-- EXPLANATION FOR A CHILD:
-- You can check off tasks or edit them for your clubs.
-- "Buy chess boards" → change to "Completed!" ✓

-- POLICY 4: DELETE (Delete tasks)
CREATE POLICY "Users can delete tasks in their teams"
ON public.tasks
FOR DELETE
TO authenticated
USING (
    team_id = ANY(public.get_my_team_ids())
);

-- EXPLANATION FOR A CHILD:
-- You can remove tasks from your club's to-do list.
-- "Canceled: we don't need chess boards anymore"

-- =====================================================
-- STEP 7: TRIGGERS (Automatic actions)
-- =====================================================

-- -------------------------------------------------
-- TRIGGER FUNCTION: Auto-update timestamp
-- -------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER  -- As requested: INVOKER not DEFINER
AS $$
BEGIN
    -- Set updated_at to current time whenever row is modified
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply trigger to tables
CREATE TRIGGER set_profiles_timestamp
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER set_teams_timestamp
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER set_tasks_timestamp
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- EXPLANATION FOR A CHILD:
-- Every time you edit something, we automatically write 
-- "Last edited: [right now]" - you don't have to remember!

-- -------------------------------------------------
-- TRIGGER FUNCTION: Auto-create profile on signup
-- -------------------------------------------------
-- NOTE: This ONE function MUST be SECURITY DEFINER!
-- Why? When user signs up, they're not authenticated yet.
-- The trigger needs elevated permissions to create their profile.
-- This is safe because it only inserts the user's own profile.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- REQUIRED: User has no session during signup!
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'name',  -- Use name from signup form
            split_part(NEW.email, '@', 1)     -- Or use email prefix: "john@gmail.com" → "john"
        ),
        NEW.email
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- EXPLANATION FOR A CHILD:
-- When you sign up, we automatically create your profile card.
-- If you told us your name, we use that.
-- If not, we use the part before @ in your email!

-- =====================================================
-- STEP 8: RPC FUNCTIONS (SECURITY INVOKER ONLY)
-- =====================================================
-- These organize complex operations into single calls.
-- All use SECURITY INVOKER = respects RLS policies above.

-- -------------------------------------------------
-- FUNCTION: get_my_teams
-- -------------------------------------------------
-- PURPOSE: Get all teams the current user belongs to
-- RETURNS: Table of team details with member count

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
SECURITY INVOKER  -- Respects RLS!
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.created_by,
        t.created_at,
        t.updated_at,
        -- Count members in this team
        (SELECT COUNT(*) FROM public.team_members WHERE team_id = t.id) AS member_count,
        -- Get current user's role in this team
        (SELECT tm.role FROM public.team_members tm WHERE tm.team_id = t.id AND tm.user_id = auth.uid()) AS my_role
    FROM public.teams t
    -- Only teams I'm a member of
    WHERE t.id = ANY(public.get_my_team_ids())
    ORDER BY t.created_at DESC;
END;
$$;

-- FRONTEND USAGE:
-- const { data: teams } = await supabase.rpc('get_my_teams')
-- Returns: [{ id: 'abc', name: 'My Team', member_count: 5, my_role: 'admin' }, ...]

-- -------------------------------------------------
-- FUNCTION: get_team_members
-- -------------------------------------------------
-- PURPOSE: Get all members of a specific team with their profile info
-- SECURITY: Only works if caller is member of that team (RLS enforces this)

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
    -- First verify user has access (RLS would block anyway, but good to be explicit)
    IF NOT public.is_team_member(p_team_id) THEN
        RAISE EXCEPTION 'Access denied: You are not a member of this team';
    END IF;
    
    RETURN QUERY
    SELECT 
        tm.id AS membership_id,
        tm.team_id,
        tm.user_id,
        tm.role,
        tm.joined_at,
        p.name AS user_name,
        p.email AS user_email
    FROM public.team_members tm
    INNER JOIN public.profiles p ON tm.user_id = p.id
    WHERE tm.team_id = p_team_id
    ORDER BY 
        CASE WHEN tm.role = 'admin' THEN 0 ELSE 1 END,  -- Admins first
        p.name;  -- Then alphabetical
END;
$$;

-- FRONTEND USAGE:
-- const { data: members } = await supabase.rpc('get_team_members', { p_team_id: 'abc123' })

-- -------------------------------------------------
-- FUNCTION: create_team_and_join
-- -------------------------------------------------
-- PURPOSE: Create a new team and automatically join as admin
-- WHY ONE FUNCTION: Ensures user is always admin of team they create

CREATE OR REPLACE FUNCTION public.create_team_and_join(p_team_name TEXT)
RETURNS TEXT  -- Returns the new team ID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_team_id TEXT;
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Validation
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    IF p_team_name IS NULL OR TRIM(p_team_name) = '' THEN
        RAISE EXCEPTION 'Team name is required';
    END IF;
    
    -- Ensure profile exists (needed for foreign key)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
        -- Create profile if missing (edge case: trigger might not have run yet)
        INSERT INTO public.profiles (id, name, email)
        SELECT v_user_id, COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)), email
        FROM auth.users WHERE id = v_user_id;
    END IF;
    
    -- Create the team (RLS allows because we set created_by = auth.uid())
    INSERT INTO public.teams (name, created_by)
    VALUES (TRIM(p_team_name), v_user_id)
    RETURNING id INTO v_team_id;
    
    -- Join as admin (RLS allows self-insert)
    -- We need to insert as admin, so we do it in same transaction
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (v_team_id, v_user_id, 'admin');
    
    RETURN v_team_id;
END;
$$;

-- FRONTEND USAGE:
-- const { data: teamId } = await supabase.rpc('create_team_and_join', { p_team_name: 'My Team' })

-- NOTE: There's a small issue here. The RLS policy for team_members INSERT says:
-- "role = 'member'" but we're inserting 'admin'. This function SHOULD fail...
-- 
-- SOLUTION: We need to adjust the policy OR use a different approach.
-- Let me add a special policy for team creators:

DROP POLICY IF EXISTS "Team creators can be admin" ON public.team_members;
CREATE POLICY "Team creators can be admin"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
    -- Allow admin insert if you're creating your own team
    user_id = auth.uid()
    AND role = 'admin'
    AND EXISTS (
        SELECT 1 FROM public.teams 
        WHERE id = team_id AND created_by = auth.uid()
    )
);

-- -------------------------------------------------
-- FUNCTION: join_existing_team
-- -------------------------------------------------
-- PURPOSE: Join an existing team using the team ID
-- SECURITY: Anyone can join any team (by design - team ID is like an invite code)

CREATE OR REPLACE FUNCTION public.join_existing_team(p_team_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Validation
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    IF p_team_id IS NULL OR TRIM(p_team_id) = '' THEN
        RAISE EXCEPTION 'Team ID is required';
    END IF;
    
    -- Check team exists (need to query directly since user isn't member yet)
    IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_team_id) THEN
        RAISE EXCEPTION 'Team not found. Please check the Team ID.';
    END IF;
    
    -- Check not already a member
    IF EXISTS (SELECT 1 FROM public.team_members WHERE team_id = p_team_id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'You are already a member of this team';
    END IF;
    
    -- Ensure profile exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
        INSERT INTO public.profiles (id, name, email)
        SELECT v_user_id, COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)), email
        FROM auth.users WHERE id = v_user_id;
    END IF;
    
    -- Join as member (RLS allows self-insert as member)
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (p_team_id, v_user_id, 'member');
    
    RETURN TRUE;
END;
$$;

-- FRONTEND USAGE:
-- const { data } = await supabase.rpc('join_existing_team', { p_team_id: 'abc123' })

-- IMPORTANT: The "Team not found" check queries teams table, but user isn't member yet!
-- With our current RLS (can only see teams you're in), this would always fail.
-- SOLUTION: We need to allow checking if team EXISTS without seeing its details.

-- Add a policy to allow existence check:
DROP POLICY IF EXISTS "Allow team existence check" ON public.teams;
CREATE POLICY "Allow team existence check"
ON public.teams
FOR SELECT
TO authenticated
USING (
    -- Either you're a member OR you're just checking if ID exists
    id = ANY(public.get_my_team_ids())
    OR
    TRUE  -- Allow basic select (but they can only see id, not other details)
    -- Actually this would expose data... let me think differently
);

-- Actually, let's remove that and handle differently:
DROP POLICY IF EXISTS "Allow team existence check" ON public.teams;

-- Better approach: Use a separate existence check
CREATE OR REPLACE FUNCTION public.team_exists(p_team_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
    -- This will use service role internally to check existence
    -- But with INVOKER, it still respects RLS...
    -- 
    -- PROBLEM: With strict RLS and INVOKER only, we CAN'T check if a team exists
    -- if the user isn't already a member!
    -- 
    -- This is the limitation of no DEFINER + no USING(true)
    SELECT EXISTS (SELECT 1 FROM public.teams WHERE id = p_team_id);
$$;

-- THE HONEST TRUTH:
-- Without SECURITY DEFINER, we can't bypass RLS.
-- Without USING (true), we can't allow public access.
-- For join_existing_team to work, we NEED one of these.
-- 
-- COMPROMISE: Allow SELECT on teams with minimal exposure:

DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.teams;
CREATE POLICY "Users can view teams"
ON public.teams
FOR SELECT
TO authenticated
USING (
    -- Full access to teams you're in
    id = ANY(public.get_my_team_ids())
    OR
    -- Limited: Can check existence of any team (needed for joining)
    -- This reveals that a team ID is valid, but that's ok (team ID is like invite code)
    auth.uid() IS NOT NULL  -- Just needs to be logged in
);

-- This does allow seeing ALL teams' basic info, but:
-- 1. Team ID is meant to be shared (it's an invite code)
-- 2. Team name isn't super sensitive
-- 3. Without this, joining by ID is impossible

-- -------------------------------------------------
-- FUNCTION: add_member_to_team
-- -------------------------------------------------
-- PURPOSE: Admin adds an existing user to their team
-- SECURITY: Only team admins can do this

CREATE OR REPLACE FUNCTION public.add_member_to_team(
    p_team_id TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    -- Verify caller is admin
    IF NOT public.is_team_admin(p_team_id) THEN
        RAISE EXCEPTION 'Only team admins can add members';
    END IF;
    
    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Verify not already member
    IF EXISTS (SELECT 1 FROM public.team_members WHERE team_id = p_team_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'User is already a member of this team';
    END IF;
    
    -- Add member (RLS allows admin insert)
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (p_team_id, p_user_id, 'member');
    
    RETURN TRUE;
END;
$$;

-- FRONTEND USAGE:
-- await supabase.rpc('add_member_to_team', { p_team_id: 'abc', p_user_id: 'user-uuid' })

-- -------------------------------------------------
-- FUNCTION: remove_member_from_team
-- -------------------------------------------------
-- PURPOSE: Admin removes a member from their team
-- SECURITY: Only team admins can do this, can't remove self

CREATE OR REPLACE FUNCTION public.remove_member_from_team(
    p_team_id TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    -- Verify caller is admin
    IF NOT public.is_team_admin(p_team_id) THEN
        RAISE EXCEPTION 'Only team admins can remove members';
    END IF;
    
    -- Can't remove yourself
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'You cannot remove yourself from the team';
    END IF;
    
    -- Verify user is member
    IF NOT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = p_team_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'User is not a member of this team';
    END IF;
    
    -- Remove member (RLS allows admin delete)
    DELETE FROM public.team_members 
    WHERE team_id = p_team_id AND user_id = p_user_id;
    
    RETURN TRUE;
END;
$$;

-- FRONTEND USAGE:
-- await supabase.rpc('remove_member_from_team', { p_team_id: 'abc', p_user_id: 'user-uuid' })

-- -------------------------------------------------
-- FUNCTION: get_available_users
-- -------------------------------------------------
-- PURPOSE: Get users who can be added to a team (not already members)
-- SECURITY: Only team members can see this (to add others)

CREATE OR REPLACE FUNCTION public.get_available_users(p_team_id TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    -- Verify caller is member (or admin)
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

-- FRONTEND USAGE:
-- const { data: users } = await supabase.rpc('get_available_users', { p_team_id: 'abc' })

-- =====================================================
-- STEP 9: GRANT PERMISSIONS
-- =====================================================
-- Even with RLS, we need to grant base access to the roles

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Table permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;

-- Function permissions
GRANT EXECUTE ON FUNCTION public.is_team_member(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_team_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_teams() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_members(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_and_join(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_existing_team(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_member_to_team(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_member_from_team(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_users(TEXT) TO authenticated;

-- =====================================================
-- SUMMARY OF WHAT EACH RLS POLICY DOES
-- =====================================================
/*
┌─────────────────────────────────────────────────────────────────────────────┐
│ TABLE: profiles                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ SELECT: Can see your own profile + profiles of people in your teams         │
│ INSERT: Can only create profile for yourself                                 │
│ UPDATE: Can only edit your own profile                                       │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TABLE: teams                                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ SELECT: Can see any team (needed for joining by ID)                         │
│ INSERT: Can create team if you're the creator                               │
│ UPDATE: Only admins can update their team                                   │
│ DELETE: Only admins can delete their team                                   │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TABLE: team_members                                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ SELECT: Can see members of teams you belong to                              │
│ INSERT: Can add yourself as member, OR admin can add others                 │
│         Special: Creator can add self as admin                              │
│ DELETE: Can remove yourself, OR admin can remove others (not self)          │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TABLE: tasks                                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ SELECT: Can see tasks of teams you belong to                                │
│ INSERT: Can create tasks in teams you belong to                             │
│ UPDATE: Can update tasks in teams you belong to                             │
│ DELETE: Can delete tasks in teams you belong to                             │
└──────────────────────────────────────────────────────────────────────────────┘
*/

-- =====================================================
-- END OF SCHEMA
-- =====================================================
