import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPlaceDetails } from '@/lib/places'

export const maxDuration = 60

// Rafraîchit immédiatement les snapshots des lieux du gérant connecté
// (le cron hebdo reste la source régulière, ceci est un déclenchement manuel).
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: establishment } = await supabase
      .from('establishments')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!establishment) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 404 })

    const service = await createServiceClient()
    const { data: competitors } = await service
      .from('competitors')
      .select('id, google_place_id, name')
      .eq('establishment_id', establishment.id)

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 })
    }

    let updated = 0
    const errors: string[] = []
    for (const c of competitors) {
      try {
        const place = await getPlaceDetails(c.google_place_id)
        if (place && (place.rating != null || place.reviewCount != null)) {
          await service.from('competitor_snapshots').insert({
            competitor_id: c.id,
            rating: place.rating,
            review_count: place.reviewCount,
          })
          updated++
        } else {
          errors.push(`${c.name}: aucune donnée renvoyée`)
        }
      } catch (e) {
        errors.push(`${c.name}: ${e instanceof Error ? e.message : 'erreur'}`)
      }
      await new Promise((r) => setTimeout(r, 400))
    }

    return NextResponse.json({ ok: true, updated, errors })
  } catch (e) {
    console.error('competitors refresh error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
