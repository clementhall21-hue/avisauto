import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPlaceDetails } from '@/lib/places'
import { generateAndStoreInsight } from '@/lib/competitor-insight'

export const maxDuration = 60

interface CompetitorRow {
  id: string
  name: string
  google_place_id: string
  competitor_snapshots: { rating: number | null; review_count: number | null }[]
}

const hasUsableSnap = (c: CompetitorRow) =>
  (c.competitor_snapshots || []).some((s) => s.rating != null || s.review_count != null)

// Régénère le briefing concurrentiel à la demande.
// Auto-réparation : si aucun relevé exploitable, récupère les données Google d'abord.
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
    const { data } = await service
      .from('competitors')
      .select('id, name, google_place_id, competitor_snapshots ( rating, review_count )')
      .eq('establishment_id', establishment.id)

    const competitors = (data as CompetitorRow[]) || []
    if (competitors.length === 0) {
      return NextResponse.json({ insight: 'Ajoutez d’abord des concurrents pour obtenir une analyse.' })
    }

    // Aucune donnée exploitable → on récupère depuis Google maintenant
    if (!competitors.some(hasUsableSnap)) {
      const fetchErrors: string[] = []
      for (const c of competitors) {
        try {
          const place = await getPlaceDetails(c.google_place_id)
          if (place && (place.rating != null || place.reviewCount != null)) {
            const { error: insertError } = await service.from('competitor_snapshots').insert({
              competitor_id: c.id,
              rating: place.rating,
              review_count: place.reviewCount,
            })
            if (insertError) fetchErrors.push(`${c.name}: DB ${insertError.message}`)
          } else {
            fetchErrors.push(`${c.name}: fiche Google sans note exploitable`)
          }
        } catch (e) {
          fetchErrors.push(`${c.name}: ${e instanceof Error ? e.message : 'erreur'}`)
        }
        await new Promise((r) => setTimeout(r, 400))
      }

      const { data: recheck } = await service
        .from('competitors')
        .select('id, name, google_place_id, competitor_snapshots ( rating, review_count )')
        .eq('establishment_id', establishment.id)
      if (!((recheck as CompetitorRow[]) || []).some(hasUsableSnap)) {
        return NextResponse.json({
          insight: `Impossible de récupérer les données Google pour le moment. Détail technique : ${fetchErrors[0] || 'aucune donnée renvoyée'}`,
        })
      }
    }

    const insight = await generateAndStoreInsight(service, establishment.id)
    return NextResponse.json({
      insight: insight || 'Analyse IA indisponible pour le moment. Comparez vos chiffres dans le tableau ci-dessus.',
    })
  } catch (e) {
    console.error('competitor-insight error:', e)
    return NextResponse.json({ error: 'Erreur lors de l’analyse' }, { status: 500 })
  }
}
