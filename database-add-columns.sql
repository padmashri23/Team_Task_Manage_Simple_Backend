
ALTER TABLE public.team_subscriptions 
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0;

ALTER TABLE public.team_subscriptions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'cancelled', 'refunded'));

ALTER TABLE public.team_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

ALTER TABLE public.team_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT;


ALTER TABLE public.team_subscriptions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();


DROP POLICY IF EXISTS "team_subscriptions_insert" ON public.team_subscriptions;
DROP POLICY IF EXISTS "team_subscriptions_select" ON public.team_subscriptions;
DROP POLICY IF EXISTS "team_subscriptions_update" ON public.team_subscriptions;
DROP POLICY IF EXISTS "team_subscriptions_update_own" ON public.team_subscriptions;
DROP POLICY IF EXISTS "Users can insert pending subscriptions" ON public.team_subscriptions;

CREATE POLICY "team_subscriptions_insert" 
ON public.team_subscriptions 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "team_subscriptions_select" 
ON public.team_subscriptions 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "team_subscriptions_update" 
ON public.team_subscriptions 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.team_subscriptions TO authenticated;



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

