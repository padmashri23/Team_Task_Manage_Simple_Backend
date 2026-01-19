-- =============================================
-- Migration: Add Subscription Tracking Columns
-- For: Recurring Subscriptions Feature
-- =============================================

-- Add new columns to team_subscriptions table for recurring subscription tracking
ALTER TABLE public.team_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create index for faster subscription lookups
CREATE INDEX IF NOT EXISTS idx_team_subscriptions_stripe_sub 
ON public.team_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_team_subscriptions_customer 
ON public.team_subscriptions(stripe_customer_id);

-- Verify the columns were added (this will show the table structure)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'team_subscriptions' 
ORDER BY ordinal_position;
