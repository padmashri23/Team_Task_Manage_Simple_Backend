-- =====================================================
-- FINAL FIX: RLS policies for paid team subscription flow
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. FIX team_subscriptions RLS
-- =====================================================

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "team_subscriptions_insert" ON public.team_subscriptions;
DROP POLICY IF EXISTS "team_subscriptions_select" ON public.team_subscriptions;
DROP POLICY IF EXISTS "team_subscriptions_update_own" ON public.team_subscriptions;
DROP POLICY IF EXISTS "Users can insert pending subscriptions" ON public.team_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.team_subscriptions;

-- Allow users to insert AND upsert their own subscriptions
CREATE POLICY "team_subscriptions_insert" 
ON public.team_subscriptions 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to view their own subscriptions
CREATE POLICY "team_subscriptions_select" 
ON public.team_subscriptions 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Allow users to update their own subscriptions
CREATE POLICY "team_subscriptions_update" 
ON public.team_subscriptions 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 2. FIX team_members RLS for paid users
-- =====================================================

-- Drop existing insert policies
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_with_subscription" ON public.team_members;
DROP POLICY IF EXISTS "Users can join teams" ON public.team_members;
DROP POLICY IF EXISTS "Admins can add members" ON public.team_members;

-- Create simple insert policy: users can add themselves
-- Payment is tracked separately in team_subscriptions
CREATE POLICY "team_members_insert" 
ON public.team_members 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 3. UPDATE get_my_teams to include subscription fields
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_my_teams()
RETURNS TABLE (
    id TEXT,
    name TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    subscription_type TEXT,
    subscription_price DECIMAL(10,2),
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
        COALESCE(t.subscription_type, 'free') as subscription_type,
        COALESCE(t.subscription_price, 0) as subscription_price,
        (SELECT COUNT(*) FROM public.team_members tm WHERE tm.team_id = t.id),
        (SELECT tm.role FROM public.team_members tm WHERE tm.team_id = t.id AND tm.user_id = auth.uid())
    FROM public.teams t
    WHERE t.id = ANY(public.get_my_team_ids())
    ORDER BY t.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_my_teams() TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.team_subscriptions TO authenticated;
GRANT INSERT ON public.team_members TO authenticated;

-- =====================================================
-- DONE! Run this in Supabase SQL Editor
-- =====================================================
