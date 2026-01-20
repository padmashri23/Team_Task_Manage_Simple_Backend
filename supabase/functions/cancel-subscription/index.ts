// Supabase Edge Function to cancel a subscription
// Calls Stripe API to cancel the subscription

import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!stripeSecretKey) throw new Error('STRIPE_SECRET_KEY not set')
        if (!supabaseUrl || !supabaseServiceKey) throw new Error('Supabase credentials not set')

        const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { subscriptionId, userId, teamId } = await req.json()

        console.log('Cancel subscription request:', { subscriptionId, userId, teamId })

        if (!subscriptionId || !userId) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: subscriptionId, userId' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Cancel the subscription in Stripe
        // cancel_at_period_end: true means it stays active until current period ends
        // Set to false to cancel immediately
        const canceledSubscription = await stripe.subscriptions.cancel(subscriptionId)

        console.log('Subscription cancelled in Stripe:', canceledSubscription.id)

        // Update database - mark subscription as cancelled
        const { error: updateError } = await supabase
            .from('team_subscriptions')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId)
            .eq('user_id', userId)

        if (updateError) {
            console.error('Error updating subscription in DB:', updateError)
        }

        // Remove user from team members
        if (teamId) {
            const { error: removeError } = await supabase
                .from('team_members')
                .delete()
                .eq('team_id', teamId)
                .eq('user_id', userId)

            if (removeError) {
                console.error('Error removing from team:', removeError)
            } else {
                console.log('User removed from team:', teamId)
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Subscription cancelled successfully',
                subscriptionId: canceledSubscription.id
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Cancel subscription error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to cancel subscription' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
