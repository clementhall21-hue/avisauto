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

      const requery = await selectCompetitors() as { data: CompetitorWithSnaps[] | null; error: { message: string } | null }
      if (requery.error) fetchErrors.push(`Relecture DB: ${requery.error.message}`)
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

    // ── Statistiques calculées côté serveur (le modèle ne calcule pas, il commente) ──
    const me = summary.find((s) => s.nom.includes('(MOI)'))
    const others = summary.filter((s) => !s.nom.includes('(MOI)') && s.note != null)

    const avgRivalRating = others.length
      ? others.reduce((acc, s) => acc + (s.note ?? 0), 0) / others.length
      : null
    const avgRivalReviews = others.length
      ? Math.round(others.reduce((acc, s) => acc + (s.avis ?? 0), 0) / others.length)
      : null

    // Vitesse d'acquisition (avis / 30 jours), extrapolée depuis la période observée
    const velocity = (s: { avis_gagnes: number; periode_jours: number }) =>
      s.periode_jours > 0 ? Math.round((s.avis_gagnes / s.periode_jours) * 30) : null

    // Nombre d'avis 5★ nécessaires pour atteindre la note cible :
    // n = avis × (cible − note) / (5 − cible)
    let fiveStarsNeeded: number | null = null
    if (me?.note != null && me?.avis != null && avgRivalRating != null && me.note < avgRivalRating && avgRivalRating < 5) {
      fiveStarsNeeded = Math.ceil((me.avis * (avgRivalRating - me.note)) / (5 - avgRivalRating))
    }

    const stats = {
      etablissements: summary.map((s) => ({ ...s, avis_par_mois_estime: velocity(s) })),
      moyenne_concurrents: { note: avgRivalRating ? Number(avgRivalRating.toFixed(2)) : null, avis: avgRivalReviews },
      ecart_note: me?.note != null && avgRivalRating != null ? Number((me.note - avgRivalRating).toFixed(2)) : null,
      avis_5_etoiles_necessaires_pour_rattraper_moyenne: fiveStarsNeeded,
    }

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
          content: `Tu es un consultant senior en réputation locale pour restaurants et hôtels.
On te donne des statistiques Google pré-calculées : l'établissement du client est marqué (MOI), avec la moyenne de ses concurrents, l'écart de note, la vitesse d'acquisition d'avis estimée, et le nombre d'avis 5★ nécessaires pour rattraper la moyenne.
L'établissement utilise StarReviews, qui propose : collecte d'avis par QR code posé sur les tables (les clients mécontents sont captés en privé avant de publier sur Google), et réponse automatique IA à chaque avis Google.

Réponds en français, en texte brut structuré EXACTEMENT ainsi (pas de markdown, pas de gras) :

📊 CONSTAT
2 phrases max : position vs concurrents, chiffres clés (écart de note, volumes). Cite le concurrent le plus menaçant.

🎯 PRIORITÉ
1 phrase : LE levier n°1 à actionner, avec l'objectif chiffré (utilise le nombre d'avis 5★ nécessaires si fourni).

✅ PLAN D'ACTION
1. [action concrète, chiffrée, réalisable cette semaine — mentionne le QR code StarReviews si pertinent]
2. [action concrète sur les avis existants — mentionne les réponses IA si pertinent]
3. [action concrète de fond, mesurable au prochain relevé hebdo]

Règles : chiffres issus des données uniquement, pas d'invention. Actions spécifiques (où, combien, quand), jamais de généralités type "améliorer la qualité". Si les avis gagnés sont à 0 sur une période courte, dis que la dynamique sera mesurable dès les prochains relevés hebdomadaires, sans en tirer de conclusion.`,
        },
        {
          role: 'user',
          content: `Statistiques: ${JSON.stringify(stats)}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 700,
    })

    const insight = completion.choices[0]?.message?.content?.trim() || 'Analyse non disponible.'
    return NextResponse.json({ insight })
  } catch (e) {
    console.error('competitor-insight error:', e)
    return NextResponse.json({ error: 'Erreur lors de l’analyse' }, { status: 500 })
  }
}
