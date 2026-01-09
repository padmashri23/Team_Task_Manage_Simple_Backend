
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

DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON public.team_members;
DROP POLICY IF EXISTS "Users can join teams" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_with_subscription" ON public.team_members;


CREATE POLICY "team_members_insert_with_subscription" 
ON public.team_members 
FOR INSERT 
TO authenticated
WITH CHECK (
    -- User is adding themselves
    user_id = auth.uid()
    AND (
        -- Team is free OR user has active subscription
        EXISTS (
            SELECT 1 FROM public.teams t 
            WHERE t.id = team_id 
            AND (
                t.subscription_type = 'free' 
                OR t.subscription_type IS NULL
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.team_subscriptions ts
            WHERE ts.team_id = team_id
            AND ts.user_id = auth.uid()
            AND ts.status = 'active'
        )
    )
);




DROP POLICY IF EXISTS "team_subscriptions_update" ON public.team_subscriptions;

-- Allow users to update their own subscription to 'active'
CREATE POLICY "team_subscriptions_update_own" 
ON public.team_subscriptions 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Grant update permission
GRANT UPDATE ON public.team_subscriptions TO authenticated;


