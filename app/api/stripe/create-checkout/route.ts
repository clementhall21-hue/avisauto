import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

async function createSession(plan: 'starter' | 'pro' | null, userEmail: string, userId: string, requestUrl: string) {
  let priceId: string
  if (plan === 'starter') {
    priceId = process.env.STRIPE_STARTER_PRICE_ID!
  } else {
    priceId = process.env.STRIPE_PRO_PRICE_ID || process.env.STRIPE_PRICE_ID!
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return stripe.checkout.sessions.create({
    customer_email: userEmail,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId, plan: plan || 'pro' },
    },
    metadata: { userId, plan: plan || 'pro' },
    success_url: `${appUrl}/dashboard?subscription=success`,
    cancel_url: `${appUrl}/?subscription=canceled`,
    allow_promotion_codes: true,
    billing_address_collection: 'required',
  })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/', request.url))

    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') as 'starter' | 'pro' | null
    const session = await createSession(plan, user.email!, user.id, request.url)
    return NextResponse.redirect(session.url!)
  } catch (error) {
    console.error('create-checkout GET error:', error)
    return NextResponse.redirect(new URL('/', request.url))
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') as 'starter' | 'pro' | null
    const session = await createSession(plan, user.email!, user.id, request.url)
    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('create-checkout error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
