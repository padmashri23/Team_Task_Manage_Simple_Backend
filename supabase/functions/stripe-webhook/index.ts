import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-06-20',
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
    const signature = req.headers.get('stripe-signature')
    const body = await req.text()

    let event: Stripe.Event

    try {
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature!,
            webhookSecret
        )
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message)
        return new Response(
            JSON.stringify({ error: 'Invalid signature' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
    }

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session

        console.log('Processing checkout.session.completed:', session.id)

        // Extract metadata
        const teamId = session.metadata?.teamId
        const userId = session.metadata?.userId

        if (!teamId || !userId) {
            console.error('Missing metadata in session:', { teamId, userId })
            return new Response(
                JSON.stringify({ error: 'Missing metadata' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Create Supabase client with service role (bypasses RLS)
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Step 1: Upsert subscription record
        const { error: subError } = await supabase
            .from('team_subscriptions')
            .upsert({
                team_id: teamId,
                user_id: userId,
                stripe_session_id: session.id,
                stripe_payment_intent: session.payment_intent as string,
                amount_paid: (session.amount_total || 0) / 100, // Convert from cents
                status: 'active',
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'team_id,user_id',
            })

        if (subError) {
            console.error('Error upserting subscription:', subError)
        } else {
            console.log('Subscription record created/updated for team:', teamId)
        }

        // Step 2: Add user to team
        const { error: memberError } = await supabase
            .from('team_members')
            .insert({
                team_id: teamId,
                user_id: userId,
                role: 'member',
            })

        if (memberError) {
            // Duplicate key error means user is already a member - that's OK
            if (memberError.code === '23505') {
                console.log('User already a member of team (duplicate key)')
            } else {
                console.error('Error adding team member:', memberError)
            }
        } else {
            console.log(`User ${userId} successfully added to team ${teamId}`)
        }
    }

    return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
})
