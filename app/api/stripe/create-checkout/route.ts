import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

async function createSession(
  plan: 'starter' | 'pro' | null,
  userEmail: string,
  userId: string,
  trialDaysRemaining: number
) {
  const priceId =
    plan === 'starter'
      ? process.env.STRIPE_STARTER_PRICE_ID
      : process.env.STRIPE_PRO_PRICE_ID || process.env.STRIPE_PRICE_ID

  if (!priceId) {
    throw new Error(
      plan === 'starter'
        ? 'STRIPE_STARTER_PRICE_ID is not configured'
        : 'STRIPE_PRO_PRICE_ID is not configured'
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return stripe.checkout.sessions.create({
    customer_email: userEmail,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      ...(trialDaysRemaining > 0 ? { trial_period_days: trialDaysRemaining } : {}),
      metadata: { userId, plan: plan || 'pro' },
    },
    metadata: { userId, plan: plan || 'pro' },
    success_url: `${appUrl}/dashboard?subscription=success`,
    cancel_url: `${appUrl}/?subscription=canceled`,
    allow_promotion_codes: true,
    billing_address_collection: 'required',
  })
}

async function getRemainingTrialDays(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<number> {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('trial_ends_at, status')
    .eq('user_id', userId)
    .maybeSingle()

  if (sub?.trial_ends_at && sub.status === 'trialing') {
    const remaining = Math.ceil(
      (new Date(sub.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    return Math.max(0, remaining)
  }
  return 0
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/', request.url))

    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') as 'starter' | 'pro' | null
    const trialDays = await getRemainingTrialDays(supabase, user.id)
    const session = await createSession(plan, user.email!, user.id, trialDays)
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
    const trialDays = await getRemainingTrialDays(supabase, user.id)
    const session = await createSession(plan, user.email!, user.id, trialDays)
    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('create-checkout error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
