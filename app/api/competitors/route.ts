import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolvePlace } from '@/lib/places'

const MAX_COMPETITORS = 5

// Ajoute un concurrent (ou la fiche du gérant si isSelf) et crée
// immédiatement son premier snapshot. Authentifié par session Supabase.
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const input = (body.input as string || '').trim()
    const isSelf = Boolean(body.isSelf)
    if (!input) return NextResponse.json({ error: 'Renseignez un nom ou un lien Google Maps' }, { status: 400 })

    const service = await createServiceClient()

    if (!isSelf) {
      const { count } = await service
        .from('competitors')
        .select('id', { count: 'exact', head: true })
        .eq('establishment_id', establishment.id)
        .eq('is_self', false)
      if ((count ?? 0) >= MAX_COMPETITORS) {
        return NextResponse.json({ error: `Maximum ${MAX_COMPETITORS} concurrents` }, { status: 400 })
      }
    }

    const place = await resolvePlace(input)
    if (!place) {
      return NextResponse.json({ error: 'Fiche Google introuvable. Essayez avec « nom + ville ».' }, { status: 404 })
    }

    // La fiche du gérant remplace l'ancienne s'il en avait déjà une
    if (isSelf) {
      await service.from('competitors').delete()
        .eq('establishment_id', establishment.id)
        .eq('is_self', true)
    }

    const { data: competitor, error } = await service
      .from('competitors')
      .insert({
        establishment_id: establishment.id,
        name: place.name || input,
        google_place_id: place.placeId,
        is_self: isSelf,
      })
      .select()
      .single()

    if (error) {
      const msg = error.code === '23505' ? 'Ce lieu est déjà suivi' : 'Erreur lors de l’ajout'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    await service.from('competitor_snapshots').insert({
      competitor_id: competitor.id,
      rating: place.rating,
      review_count: place.reviewCount,
    })

    return NextResponse.json({ competitor, snapshot: { rating: place.rating, review_count: place.reviewCount } })
  } catch (e) {
    console.error('competitors POST error:', e)
    let msg = 'Erreur serveur'
    if (e instanceof Error) {
      if (e.message.includes('SERPAPI_KEY')) msg = 'Clé SerpAPI non configurée côté serveur'
      else if (e.message.startsWith('SerpAPI:')) msg = e.message
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
