import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPlaceDetails } from '@/lib/places'

export const maxDuration = 60

interface CompetitorWithSnaps {
  id: string
  name: string
  is_self: boolean
  google_place_id: string
  competitor_snapshots: { rating: number | null; review_count: number | null; captured_at: string }[]
}

const hasUsableSnap = (c: CompetitorWithSnaps) =>
  (c.competitor_snapshots || []).some((s) => s.rating != null || s.review_count != null)

// Résumé IA de la situation concurrentielle, à partir des snapshots.
// Authentifié par session Supabase — chaque gérant n'analyse que ses données.
// Auto-réparation : si aucun relevé exploitable, on va chercher les données
// Google immédiatement avant d'analyser.
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: establishment } = await supabase
      .from('establishments')
      .select('id, name')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!establishment) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 404 })

    const selectCompetitors = () =>
      supabase
        .from('competitors')
        .select('id, name, is_self, google_place_id, competitor_snapshots ( rating, review_count, captured_at )')
        .eq('establishment_id', establishment.id)

    let { data: competitors } = await selectCompetitors() as { data: CompetitorWithSnaps[] | null }

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({ insight: 'Ajoutez d’abord des concurrents pour obtenir une analyse.' })
    }

    // Aucune donnée exploitable → on récupère depuis Google maintenant
    if (!competitors.some(hasUsableSnap)) {
      const service = await createServiceClient()
      const fetchErrors: string[] = []
      for (const c of competitors) {
        try {
          const place = await getPlaceDetails(c.google_place_id)
          if (place && (place.rating != null || place.reviewCount != null)) {
            await service.from('competitor_snapshots').insert({
              competitor_id: c.id,
              rating: place.rating,
              review_count: place.reviewCount,
            })
          } else {
            fetchErrors.push(`${c.name}: fiche Google sans note exploitable`)
          }
        } catch (e) {
          fetchErrors.push(`${c.name}: ${e instanceof Error ? e.message : 'erreur'}`)
        }
        await new Promise((r) => setTimeout(r, 400))
      }

      const requery = await selectCompetitors() as { data: CompetitorWithSnaps[] | null }
      competitors = requery.data || competitors

      if (!competitors.some(hasUsableSnap)) {
        return NextResponse.json({
          insight: `Impossible de récupérer les données Google pour le moment. Détail technique : ${fetchErrors[0] || 'aucune donnée renvoyée'}`,
        })
      }
    }

    // Compacte les données pour le prompt : dernier snapshot + plus ancien
    const summary = competitors.map((c) => {
      const snaps = (c.competitor_snapshots || [])
        .filter((s: { rating: number | null; review_count: number | null }) => s.rating != null || s.review_count != null)
        .sort(
        (a: { captured_at: string }, b: { captured_at: string }) =>
          new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
      )
      const first = snaps[0]
      const last = snaps[snaps.length - 1]
      const days = first && last
        ? Math.max(1, Math.round((new Date(last.captured_at).getTime() - new Date(first.captured_at).getTime()) / 86400000))
        : 0
      // Postgres renvoie les numeric en texte → Number() systématique
      const gained = first && last ? Number(last.review_count ?? 0) - Number(first.review_count ?? 0) : 0
      return {
        nom: c.is_self ? `${c.name} (MOI)` : c.name,
        note: last?.rating != null ? Number(last.rating) : null,
        avis: last?.review_count != null ? Number(last.review_count) : null,
        avis_gagnes: gained,
        periode_jours: days,
      }
    })

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        insight:
          'Analyse IA indisponible (clé Groq non configurée). Comparez vos notes et volumes dans le tableau ci-dessus.',
        fallback: true,
      })
    }

    const groq = new Groq({ apiKey })
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Tu es un consultant en réputation locale pour restaurants et hôtels.
On te donne les données Google (note moyenne, nombre d'avis, avis gagnés sur la période) d'un établissement (marqué MOI) et de ses concurrents directs.
Rédige UN SEUL paragraphe en français (4 phrases max), concret et actionnable :
- situe l'établissement par rapport à la moyenne des concurrents (note et volume)
- signale le concurrent le plus dynamique si pertinent
- termine par UNE recommandation concrète (ex: intensifier la collecte d'avis par QR code)
Pas de titre, pas de liste, pas de flatterie inutile.`,
        },
        {
          role: 'user',
          content: `Données: ${JSON.stringify(summary)}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 300,
    })

    const insight = completion.choices[0]?.message?.content?.trim() || 'Analyse non disponible.'
    return NextResponse.json({ insight })
  } catch (e) {
    console.error('competitor-insight error:', e)
    return NextResponse.json({ error: 'Erreur lors de l’analyse' }, { status: 500 })
  }
}
