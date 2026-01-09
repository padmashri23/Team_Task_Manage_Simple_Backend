-- =====================================================
-- SUBSCRIPTION SYSTEM SCHEMA UPDATES
-- =====================================================
-- Run this AFTER running the main database-working.sql
-- This adds subscription support to teams
-- =====================================================

-- =====================================================
-- STEP 1: ADD SUBSCRIPTION COLUMNS TO TEAMS
-- =====================================================

-- Add subscription type (free or paid)
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'free' 
CHECK (subscription_type IN ('free', 'paid'));

-- Add subscription price (in dollars, e.g., 9.99)
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS subscription_price DECIMAL(10,2) DEFAULT 0;

-- Add Stripe price ID (optional, for recurring subscriptions in future)
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- =====================================================
-- STEP 2: CREATE TEAM SUBSCRIPTIONS TABLE
-- =====================================================
-- Tracks who has paid for team access

CREATE TABLE IF NOT EXISTS public.team_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_session_id TEXT,
    stripe_payment_intent TEXT,
    amount_paid DECIMAL(10,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'refunded')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- For future recurring subscription support
    UNIQUE(team_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_subscriptions_team ON public.team_subscriptions(team_id);
CREATE INDEX IF NOT EXISTS idx_team_subscriptions_user ON public.team_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_team_subscriptions_session ON public.team_subscriptions(stripe_session_id);

-- =====================================================
-- STEP 3: ENABLE RLS ON NEW TABLE
-- =====================================================

ALTER TABLE public.team_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "team_subscriptions_select" ON public.team_subscriptions FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own pending subscriptions
CREATE POLICY "team_subscriptions_insert" ON public.team_subscriptions FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Only allow updates via service role (webhooks)
-- No direct user updates allowed

-- =====================================================
-- STEP 4: HELPER FUNCTION - GET TEAM INFO FOR JOINING
-- =====================================================
-- Returns team info including subscription details (for non-members)

CREATE OR REPLACE FUNCTION public.get_team_info(p_team_id TEXT)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    subscription_type TEXT,
    subscription_price DECIMAL(10,2),
    member_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER  -- Needs to be definer so non-members can check team info
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.subscription_type,
        t.subscription_price,
        (SELECT COUNT(*) FROM public.team_members tm WHERE tm.team_id = t.id)
    FROM public.teams t
    WHERE t.id = p_team_id;
END;
$$;

-- =====================================================
-- STEP 5: HELPER FUNCTION - CHECK SUBSCRIPTION STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_active_subscription(p_team_id TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.team_subscriptions 
        WHERE team_id = p_team_id 
        AND user_id = p_user_id 
        AND status = 'active'
    );
$$;

-- =====================================================
-- STEP 6: UPDATE JOIN TEAM FUNCTION (FOR FREE TEAMS)
-- =====================================================
-- Modified to check subscription type before allowing join

CREATE OR REPLACE FUNCTION public.join_existing_team(p_team_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user_id UUID;
    v_sub_type TEXT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Get team subscription type
    SELECT subscription_type INTO v_sub_type
    FROM public.teams WHERE id = p_team_id;
    
    IF v_sub_type IS NULL THEN
        RAISE EXCEPTION 'Team not found';
    END IF;
    
    IF public.is_team_member(p_team_id) THEN
        RAISE EXCEPTION 'Already a member';
    END IF;
    
    -- If team is paid, check for active subscription
    IF v_sub_type = 'paid' THEN
        IF NOT public.has_active_subscription(p_team_id, v_user_id) THEN
            RAISE EXCEPTION 'Payment required to join this team';
        END IF;
    END IF;
    
    -- Join as member
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (p_team_id, v_user_id, 'member');
    
    RETURN TRUE;
END;
$$;

-- =====================================================
-- STEP 7: ADD USER TO TEAM AFTER PAYMENT (FOR WEBHOOKS)
-- =====================================================
-- This function is called by the Stripe webhook after successful payment

CREATE OR REPLACE FUNCTION public.complete_team_subscription(
    p_stripe_session_id TEXT,
    p_payment_intent TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- Must be definer for webhook to work
SET search_path = public
AS $$
DECLARE
    v_sub RECORD;
BEGIN
    -- Find the pending subscription
    SELECT * INTO v_sub
    FROM public.team_subscriptions
    WHERE stripe_session_id = p_stripe_session_id
    AND status = 'pending';
    
    IF v_sub IS NULL THEN
        RAISE EXCEPTION 'Subscription not found';
    END IF;
    
    -- Update subscription to active
    UPDATE public.team_subscriptions
    SET status = 'active',
        stripe_payment_intent = p_payment_intent,
        updated_at = NOW()
    WHERE id = v_sub.id;
    
    -- Add user to team
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (v_sub.team_id, v_sub.user_id, 'member')
    ON CONFLICT (team_id, user_id) DO NOTHING;
    
    RETURN TRUE;
END;
$$;

-- =====================================================
-- STEP 8: GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT ON public.team_subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_info(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_team_subscription(TEXT, TEXT) TO service_role;

-- =====================================================
-- DONE! Run this in your Supabase SQL Editor
-- =====================================================
