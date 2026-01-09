-- =====================================================
-- FIX: Add missing columns to team_subscriptions
-- Run this FIRST in Supabase SQL Editor
-- =====================================================

-- Add the missing amount_paid column
ALTER TABLE public.team_subscriptions 
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0;

-- Ensure status column exists
ALTER TABLE public.team_subscriptions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'cancelled', 'refunded'));

-- Ensure stripe_session_id column exists
ALTER TABLE public.team_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Ensure stripe_payment_intent column exists
ALTER TABLE public.team_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT;

-- Ensure updated_at column exists
ALTER TABLE public.team_subscriptions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- STEP 2: FIX RLS policies
-- =====================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "team_subscriptions_insert" ON public.team_subscriptions;
DROP POLICY IF EXISTS "team_subscriptions_select" ON public.team_subscriptions;
DROP POLICY IF EXISTS "team_subscriptions_update" ON public.team_subscriptions;
DROP POLICY IF EXISTS "team_subscriptions_update_own" ON public.team_subscriptions;
DROP POLICY IF EXISTS "Users can insert pending subscriptions" ON public.team_subscriptions;

-- Users can insert their own subscriptions
CREATE POLICY "team_subscriptions_insert" 
ON public.team_subscriptions 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can view their own subscriptions
CREATE POLICY "team_subscriptions_select" 
ON public.team_subscriptions 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own subscriptions
CREATE POLICY "team_subscriptions_update" 
ON public.team_subscriptions 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.team_subscriptions TO authenticated;

-- =====================================================
-- STEP 3: UPDATE get_my_teams to include subscription fields
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

GRANT EXECUTE ON FUNCTION public.get_my_teams() TO authenticated;

-- =====================================================
-- DONE! Now run this SQL and test again!
-- =====================================================
