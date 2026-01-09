-- =====================================================
-- FIX: Create join_existing_team function
-- This function is needed for the Discover Teams page
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop if exists
DROP FUNCTION IF EXISTS public.join_existing_team(text);

-- Create the join function
CREATE OR REPLACE FUNCTION public.join_existing_team(p_team_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_team_exists BOOLEAN;
    v_already_member BOOLEAN;
BEGIN
    -- Check if team exists
    SELECT EXISTS(SELECT 1 FROM public.teams WHERE id = p_team_id) INTO v_team_exists;
    
    IF NOT v_team_exists THEN
        RAISE EXCEPTION 'Team not found';
    END IF;
    
    -- Check if already a member
    SELECT EXISTS(
        SELECT 1 FROM public.team_members 
        WHERE team_id = p_team_id AND user_id = auth.uid()
    ) INTO v_already_member;
    
    IF v_already_member THEN
        RAISE EXCEPTION 'Already a member of this team';
    END IF;
    
    -- Insert the member
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (p_team_id, auth.uid(), 'member');
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.join_existing_team(text) TO authenticated;

-- =====================================================
-- DONE! Run this in Supabase SQL Editor
-- =====================================================
