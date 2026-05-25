import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)

    if (data.user) {
      const userId = data.user.id
      const businessName = data.user.user_metadata?.business_name || ''
      const fullName = data.user.user_metadata?.full_name || ''

      // Create establishment if it doesn't exist yet
      const { data: existingEst } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (!existingEst && businessName) {
        await supabase.from('establishments').insert({
          user_id: userId,
          name: businessName,
          signature: fullName,
          tone: 'Professionnel',
        })
      }

      // Create subscription if it doesn't exist yet
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (!existingSub) {
        await supabase.from('subscriptions').insert({
          user_id: userId,
          status: 'trialing',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
