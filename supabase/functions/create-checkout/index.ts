// Supabase Edge Function for Stripe Checkout
// Deploy via Supabase Dashboard -> Edge Functions

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
        // Get environment variables
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!stripeSecretKey) {
            throw new Error('STRIPE_SECRET_KEY is not set')
        }
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase credentials not set')
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2024-06-20',
        })

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Parse request body
        const { teamId, teamName, price, userId, userEmail } = await req.json()

        console.log('Received request:', { teamId, teamName, price, userId, userEmail })

        // Validate required fields
        if (!teamId || !price || !userId) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: teamId, price, userId' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get origin for redirect URLs
        const origin = req.headers.get('origin') || 'http://localhost:3000'

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Join Team: ${teamName || 'Team'}`,
                            description: `One-time membership fee to join the team`,
                        },
                        unit_amount: Math.round(parseFloat(price) * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${origin}/Team_Task_Manage_Simple_Backend/#/payment/success?session_id={CHECKOUT_SESSION_ID}&team_id=${teamId}`,
            cancel_url: `${origin}/Team_Task_Manage_Simple_Backend/#/payment/cancel?team_id=${teamId}`,
            customer_email: userEmail || undefined,
            metadata: {
                teamId,
                userId,
            },
        })

        console.log('Stripe session created:', session.id)

        // Store pending subscription in database
        const { error: insertError } = await supabase
            .from('team_subscriptions')
            .insert({
                team_id: teamId,
                user_id: userId,
                stripe_session_id: session.id,
                amount_paid: parseFloat(price),
                status: 'pending',
            })

        if (insertError) {
            console.error('Error storing subscription:', insertError)
        }

        return new Response(
            JSON.stringify({ url: session.url }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    } catch (error) {
        console.error('Checkout error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Unknown error occurred' }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    }
})
