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

  // Paliers RÉALISTES : avis 5★ nécessaires pour gagner +0,1 puis +0,2 de note
  // (formule : n = avis × (cible − note) / (5 − cible)), avec durée estimée
  // à un rythme de collecte atteignable via QR code (~25 avis 5★/mois).
  const round1 = (x: number) => Math.round(x * 10) / 10
  const PACE = 25
  let paliers: { note_cible: number; avis_5_etoiles: number; mois_estimes: number }[] = []
  if (me?.note != null && me?.avis != null && me.note < 4.8) {
    paliers = [round1(me.note + 0.1), round1(me.note + 0.2)]
      .filter((t) => t < 5)
      .map((t) => {
        const n = Math.ceil((me.avis! * (t - me.note!)) / (5 - t))
        return { note_cible: t, avis_5_etoiles: n, mois_estimes: Math.max(1, Math.ceil(n / PACE)) }
      })
  }

  const stats = {
    etablissements: summary.map((s) => ({ ...s, avis_par_mois_estime: velocity(s) })),
    moyenne_concurrents: { note: avgRivalRating ? Number(avgRivalRating.toFixed(1)) : null, avis: avgRivalReviews },
    paliers_realistes: paliers,
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null

  const groq = new Groq({ apiKey })
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Tu es un consultant senior en réputation locale pour restaurants et hôtels. Tu parles à un gérant pressé, pas à un analyste.
On te donne des statistiques Google pré-calculées : l'établissement du client est marqué (MOI), la moyenne de ses concurrents, la vitesse d'acquisition d'avis estimée, et des "paliers_realistes" (nombre d'avis 5★ et durée pour gagner +0,1 puis +0,2 de note).
L'établissement utilise StarReviews, qui propose : collecte d'avis par QR code posé sur les tables (les clients mécontents sont captés en privé avant de publier sur Google), et réponse automatique IA à chaque avis Google.

Réponds en français, en texte brut structuré EXACTEMENT ainsi (pas de markdown, pas de gras) :

📊 CONSTAT
2 phrases max, langage simple. Compare les notes en les citant telles quelles (ex: "3,6 contre 4,6 de moyenne chez vos concurrents, soit un point de retard"). INTERDIT : nombres signés type "-1,03" ou vocabulaire statistique. Cite le concurrent le plus menaçant.

🎯 PRIORITÉ
1 phrase : le levier n°1, avec le PREMIER palier réaliste (ex: "passer de 3,6 à 3,7 = environ 120 avis 5★, soit ~5 mois de collecte au QR code"). INTERDIT de proposer de rattraper toute la moyenne d'un coup — si l'écart est grand, dis explicitement que la stratégie est de progresser palier par palier tout en stoppant les avis négatifs grâce à l'interception QR.

✅ PLAN D'ACTION
1. [action concrète, chiffrée, réalisable cette semaine — mentionne le QR code StarReviews si pertinent]
2. [action concrète sur les avis existants — mentionne les réponses IA si pertinent]
3. [action concrète de fond, mesurable au prochain relevé hebdo]

Règles : chiffres issus des données uniquement, pas d'invention. Chaque objectif doit être atteignable en moins de 6 mois. Actions spécifiques (où, combien, quand), jamais de généralités type "améliorer la qualité". Si les avis gagnés sont à 0 sur une période courte, dis que la dynamique sera mesurable dès les prochains relevés hebdomadaires, sans en tirer de conclusion.`,
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
