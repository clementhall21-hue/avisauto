import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getPlaceDetails } from '@/lib/places'

export const maxDuration = 60

// Cron hebdomadaire (vercel.json) : un snapshot par lieu suivi.
// Vercel envoie automatiquement Authorization: Bearer <CRON_SECRET>.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const { data: competitors } = await supabase
    .from('competitors')
    .select('id, google_place_id, name')

  if (!competitors || competitors.length === 0) {
    return NextResponse.json({ ok: true, snapshots: 0 })
  }

  let ok = 0
  let failed = 0
  for (const c of competitors) {
    try {
      const place = await getPlaceDetails(c.google_place_id)
      if (place) {
        await supabase.from('competitor_snapshots').insert({
          competitor_id: c.id,
          rating: place.rating,
          review_count: place.reviewCount,
        })
        ok++
      } else {
        failed++
      }
    } catch {
      failed++
    }
    // Douceur avec l'API
    await new Promise((r) => setTimeout(r, 500))
  }

  return NextResponse.json({ ok: true, snapshots: ok, failed })
}
