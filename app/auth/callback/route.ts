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
      const meta = data.user.user_metadata ?? {}
      const businessName = meta.business_name || meta.full_name || meta.name || ''
      const fullName = meta.full_name || meta.name || ''

      const { data: existing } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (!existing) {
        const baseSlug = businessName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
        const slug = baseSlug
          ? `${baseSlug}-${userId.slice(0, 4)}`
          : `etablissement-${userId.slice(0, 8)}`

        await supabase.from('establishments').insert({
          user_id: userId,
          name: businessName,
          signature: fullName,
          tone: 'Professionnel',
          slug,
        })
      }

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
