import Groq from 'groq-sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

// Génère l'analyse concurrentielle d'un établissement à partir de ses
// snapshots. Utilisé par la route API (à la demande) et par le cron hebdo
// (briefing automatique). Client service role attendu.

interface Snap {
  rating: number | null
  review_count: number | null
  captured_at: string
}

interface CompetitorRow {
  id: string
  name: string
  is_self: boolean
  competitor_snapshots: Snap[]
}

export async function generateCompetitorInsight(
  service: SupabaseClient,
  establishmentId: string
): Promise<string | null> {
  const { data } = await service
    .from('competitors')
    .select('id, name, is_self, competitor_snapshots ( rating, review_count, captured_at )')
    .eq('establishment_id', establishmentId)

  const competitors = (data as CompetitorRow[]) || []
  if (competitors.length === 0) return null

  const summary = competitors.map((c) => {
    const snaps = (c.competitor_snapshots || [])
      .filter((s) => s.rating != null || s.review_count != null)
      .sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime())
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

  if (!summary.some((s) => s.note != null || s.avis != null)) return null

  // ── Statistiques calculées côté serveur (le modèle commente, il ne calcule pas) ──
  const me = summary.find((s) => s.nom.includes('(MOI)'))
  const others = summary.filter((s) => !s.nom.includes('(MOI)') && s.note != null)

  const avgRivalRating = others.length
    ? others.reduce((acc, s) => acc + (s.note ?? 0), 0) / others.length
    : null
  const avgRivalReviews = others.length
    ? Math.round(others.reduce((acc, s) => acc + (s.avis ?? 0), 0) / others.length)
    : null

  const velocity = (s: { avis_gagnes: number; periode_jours: number }) =>
    s.periode_jours > 0 ? Math.round((s.avis_gagnes / s.periode_jours) * 30) : null

  // Avis 5★ nécessaires pour atteindre la note cible : n = avis × (cible − note) / (5 − cible)
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
  if (!apiKey) return null

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

  return completion.choices[0]?.message?.content?.trim() || null
}

// Génère ET sauvegarde le briefing (utilisé par le cron et la route API)
export async function generateAndStoreInsight(
  service: SupabaseClient,
  establishmentId: string
): Promise<string | null> {
  const insight = await generateCompetitorInsight(service, establishmentId)
  if (insight) {
    await service.from('competitor_insights').insert({
      establishment_id: establishmentId,
      insight,
    })
  }
  return insight
}
