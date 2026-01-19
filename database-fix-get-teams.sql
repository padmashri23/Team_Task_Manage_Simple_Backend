
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
