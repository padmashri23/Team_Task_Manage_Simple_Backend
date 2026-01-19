// Supabase Edge Function for Team Owner Checkout
// Owner pays for team tier (capacity/features)

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

        const { teamName, tier, tierPrice, joiningFee, userId, userEmail } = await req.json()

        console.log('Owner checkout:', { teamName, tier, tierPrice, joiningFee, userId })

        if (!teamName || !userId || !tier) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const origin = req.headers.get('origin') || 'http://localhost:3000'
        const amount = parseFloat(tierPrice) || 5
        const amountInCents = Math.round(amount * 100)

        // Create Stripe Checkout for owner (team tier payment)
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Team: ${teamName}`,
                            description: `Monthly subscription for ${tier} team features`,
                        },
                        unit_amount: amountInCents,
                        recurring: { interval: 'month' },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${origin}/Team_Task_Manage_Simple_Backend/#/payment/owner-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/Team_Task_Manage_Simple_Backend/#/dashboard`,
            customer_email: userEmail || undefined,
            metadata: {
                teamName,
                tier,
                tierPrice: amount.toString(),
                joiningFee: joiningFee?.toString() || '10',
                userId,
                type: 'owner_checkout',
            },
            subscription_data: {
                metadata: {
                    teamName,
                    tier,
                    joiningFee: joiningFee?.toString() || '10',
                    userId,
                    type: 'owner_checkout',
                },
            },
        })

        console.log('Owner Stripe session created:', session.id)

        return new Response(
            JSON.stringify({ url: session.url }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Owner checkout error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
