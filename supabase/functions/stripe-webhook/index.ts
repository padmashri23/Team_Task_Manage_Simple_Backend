// Stripe Webhook Handler - processes checkout.session.completed events
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-06-20',
})

const webhookSecret = Deno.env.get('WEBHOOK_SIGNING_SECRET')!
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

        console.log('Payment successful for session:', session.id)

        // Extract metadata
        const teamId = session.metadata?.teamId
        const userId = session.metadata?.userId

        if (!teamId || !userId) {
            console.error('Missing metadata in session')
            return new Response(
                JSON.stringify({ error: 'Missing metadata' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Create Supabase client with service role
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Update subscription status to active
        const { error: updateError } = await supabase
            .from('team_subscriptions')
            .update({
                status: 'active',
                stripe_payment_intent: session.payment_intent as string,
                updated_at: new Date().toISOString(),
            })
            .eq('stripe_session_id', session.id)

        if (updateError) {
            console.error('Error updating subscription:', updateError)
        }

        // Add user to team
        const { error: memberError } = await supabase
            .from('team_members')
            .insert({
                team_id: teamId,
                user_id: userId,
                role: 'member',
            })
            .single()

        if (memberError) {
            // If already a member, that's okay
            if (!memberError.message.includes('duplicate')) {
                console.error('Error adding team member:', memberError)
            }
        }

        console.log(`User ${userId} added to team ${teamId}`)
    }

    return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
})
