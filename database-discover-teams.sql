-- =====================================================
-- Get All Public Teams for Discovery Page
-- Run this in Supabase SQL Editor
-- =====================================================

-- Function to get all teams for the discover page
CREATE OR REPLACE FUNCTION public.get_all_teams()
RETURNS TABLE (
    id TEXT,
    name TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ,
    subscription_type TEXT,
    subscription_price DECIMAL(10,2),
    member_count BIGINT,
    admin_name TEXT,
    admin_email TEXT,
    is_member BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER  -- So everyone can see teams
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.created_by,
        t.created_at,
        COALESCE(t.subscription_type, 'free') as subscription_type,
        COALESCE(t.subscription_price, 0) as subscription_price,
        (SELECT COUNT(*) FROM public.team_members tm WHERE tm.team_id = t.id) as member_count,
        p.name as admin_name,
        p.email as admin_email,
        EXISTS(
            SELECT 1 FROM public.team_members tm 
            WHERE tm.team_id = t.id AND tm.user_id = auth.uid()
        ) as is_member
    FROM public.teams t
    LEFT JOIN public.profiles p ON p.id = t.created_by
    ORDER BY t.created_at DESC;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_teams() TO authenticated;

-- =====================================================
-- DONE! Run this in Supabase SQL Editor
-- =====================================================
