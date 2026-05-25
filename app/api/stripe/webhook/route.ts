import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        const plan = session.metadata?.plan || 'pro'

        if (!userId) {
          console.error('checkout.session.completed: missing userId in metadata', session.id)
          return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
        }

        // Fetch real subscription to get accurate current_period_end
        let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        if (subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId)
            currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString()
          } catch (e) {
            console.error('Failed to retrieve subscription for period_end:', e)
          }
        }

        const { error: upsertError } = await supabaseAdmin.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: 'active',
            current_period_end: currentPeriodEnd,
            plan,
            ai_replies_count: 0,
            ai_replies_reset_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

        if (upsertError) {
          console.error('Failed to upsert subscription after checkout:', upsertError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const subscriptionId = (invoice as unknown as { subscription?: string }).subscription

        if (!subscriptionId) break

        let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          periodEnd = new Date(sub.current_period_end * 1000).toISOString()
        } catch (e) {
          console.error('Failed to retrieve subscription in payment_succeeded:', e)
        }

        const { data: subData } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()

        if (!subData) {
          console.warn('invoice.payment_succeeded: no subscription found for customer', customerId)
          break
        }

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_end: periodEnd,
            ai_replies_count: 0,
            ai_replies_reset_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)

        if (error) console.error('Failed to update subscription on payment_succeeded:', error)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_customer_id', customerId)

        if (error) console.error('Failed to update subscription on payment_failed:', error)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: subData } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()

        if (subData) {
          const updatePayload: Record<string, unknown> = {
            status: subscription.status,
            stripe_subscription_id: subscription.id,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          }

          if (subscription.metadata?.plan) {
            updatePayload.plan = subscription.metadata.plan
          }

          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update(updatePayload)
            .eq('stripe_customer_id', customerId)

          if (error) console.error('Failed to update subscription on subscription.updated:', error)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_customer_id', customerId)

        if (error) console.error('Failed to update subscription on subscription.deleted:', error)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
