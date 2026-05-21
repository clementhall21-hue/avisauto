import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Read plan from query param (?plan=starter or ?plan=pro)
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') as 'starter' | 'pro' | null

    let priceId: string
    if (plan === 'starter') {
      priceId = process.env.STRIPE_STARTER_PRICE_ID!
    } else {
      // Default to pro (backward compat: fall back to STRIPE_PRICE_ID)
      priceId = process.env.STRIPE_PRO_PRICE_ID || process.env.STRIPE_PRICE_ID!
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId: user.id,
          plan: plan || 'pro',
        },
      },
      metadata: {
        userId: user.id,
        plan: plan || 'pro',
      },
      success_url: `${appUrl}/dashboard?subscription=success`,
      cancel_url: `${appUrl}/?subscription=canceled`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('create-checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
