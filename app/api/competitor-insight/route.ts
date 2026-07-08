import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'

// Résumé IA de la situation concurrentielle, à partir des snapshots.
// Authentifié par session Supabase — chaque gérant n'analyse que ses données.
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

    const { data: competitors } = await supabase
      .from('competitors')
      .select('id, name, is_self, competitor_snapshots ( rating, review_count, captured_at )')
      .eq('establishment_id', establishment.id)

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({ insight: 'Ajoutez d’abord des concurrents pour obtenir une analyse.' })
    }

    // Compacte les données pour le prompt : dernier snapshot + plus ancien
    const summary = competitors.map((c) => {
      const snaps = (c.competitor_snapshots || []).sort(
        (a: { captured_at: string }, b: { captured_at: string }) =>
          new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
      )
      const first = snaps[0]
      const last = snaps[snaps.length - 1]
      const days = first && last
        ? Math.max(1, Math.round((new Date(last.captured_at).getTime() - new Date(first.captured_at).getTime()) / 86400000))
        : 0
      const gained = first && last ? (last.review_count ?? 0) - (first.review_count ?? 0) : 0
      return {
        nom: c.is_self ? `${c.name} (MOI)` : c.name,
        note: last?.rating ?? null,
        avis: last?.review_count ?? null,
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
