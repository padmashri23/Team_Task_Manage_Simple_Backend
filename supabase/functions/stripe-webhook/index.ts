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
        console.log('Session metadata:', session.metadata)

        // Check if this is an owner checkout (no teamId, has teamName)
        const checkoutType = session.metadata?.type
        if (checkoutType === 'owner_checkout') {
            // Owner checkout - team will be created by frontend after payment success
            console.log('Owner checkout detected - team will be created by frontend')
            return new Response(
                JSON.stringify({ received: true, type: 'owner_checkout' }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Member checkout - requires teamId and userId
        const teamId = session.metadata?.teamId
        const userId = session.metadata?.userId

        if (!teamId || !userId) {
            console.error('Missing metadata in session:', { teamId, userId })
            return new Response(
                JSON.stringify({ error: 'Missing metadata' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // For subscription mode, extract subscription and customer IDs
        const subscriptionId = session.subscription as string
        const customerId = session.customer as string

        // Fetch subscription to get current period end (for expires_at)
        let expiresAt: Date | null = null
        let amountPaid = (session.amount_total || 0) / 100

        if (subscriptionId) {
            try {
                const subscription = await stripe.subscriptions.retrieve(subscriptionId)
                expiresAt = new Date(subscription.current_period_end * 1000)
                console.log('Subscription fetched, expires at:', expiresAt)
            } catch (subError) {
                console.error('Error fetching subscription:', subError)
            }
        }

        // Create Supabase client with service role (bypasses RLS)
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Step 1: Upsert subscription record with all subscription data
        const { error: subError } = await supabase
            .from('team_subscriptions')
            .upsert({
                team_id: teamId,
                user_id: userId,
                stripe_session_id: session.id,
                stripe_payment_intent: session.payment_intent as string || null,
                stripe_subscription_id: subscriptionId || null,
                stripe_customer_id: customerId || null,
                amount_paid: amountPaid,
                status: 'active',
                expires_at: expiresAt ? expiresAt.toISOString() : null,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'team_id,user_id',
            })

        if (subError) {
            console.error('Error upserting subscription:', subError)
        } else {
            console.log('Subscription record created/updated for team:', teamId, 'with subscription:', subscriptionId)
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

    // Handle subscription cancellation
    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object as Stripe.Subscription

        console.log('Processing customer.subscription.deleted:', subscription.id)
        console.log('Subscription metadata:', subscription.metadata)

        const teamId = subscription.metadata?.teamId
        const userId = subscription.metadata?.userId

        if (teamId && userId) {
            const supabase = createClient(supabaseUrl, supabaseServiceKey)

            // Update subscription status
            const { error: updateError } = await supabase
                .from('team_subscriptions')
                .update({
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('stripe_subscription_id', subscription.id)

            if (updateError) {
                console.error('Error updating subscription status:', updateError)
            }

            // Remove user from team
            const { error: removeError } = await supabase
                .from('team_members')
                .delete()
                .eq('team_id', teamId)
                .eq('user_id', userId)

            if (removeError) {
                console.error('Error removing user from team:', removeError)
            } else {
                console.log(`User ${userId} removed from team ${teamId} due to subscription cancellation`)
            }
        }
    }

    return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
})
