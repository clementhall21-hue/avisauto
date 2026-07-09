import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Diagnostic temporaire : montre la réponse brute de SerpAPI (sans la clé)
// pour comprendre pourquoi note / nombre d'avis reviennent vides.
// Authentifié — à ouvrir connecté : /api/competitors/debug?q=nom+ville
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Connectez-vous d’abord' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q') || 'Une table au sud Marseille'
  const key = process.env.SERPAPI_KEY

  if (!key) return NextResponse.json({ diagnostic: 'SERPAPI_KEY absente des variables Vercel' })

  const params = new URLSearchParams({
    engine: 'google_maps',
    q,
    type: 'search',
    hl: 'fr',
    api_key: key,
  })

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      signal: AbortSignal.timeout(20000),
    })
    const data = await res.json().catch(() => null)

    if (!data) return NextResponse.json({ diagnostic: `Réponse non-JSON, HTTP ${res.status}` })

    const pick = (r: Record<string, unknown> | undefined) =>
      r ? {
        title: r.title ?? null,
        place_id: r.place_id ?? null,
        rating: r.rating ?? null,
        rating_type: typeof r.rating,
        reviews: r.reviews ?? null,
        reviews_type: typeof r.reviews,
        keys: Object.keys(r).slice(0, 30),
      } : null

    return NextResponse.json({
      http_status: res.status,
      serpapi_error: data.error ?? null,
      serpapi_status: data.search_metadata?.status ?? null,
      has_place_results: Boolean(data.place_results),
      place_results: pick(data.place_results),
      local_results_count: Array.isArray(data.local_results) ? data.local_results.length : 0,
      first_local_result: pick(Array.isArray(data.local_results) ? data.local_results[0] : undefined),
    })
  } catch (e) {
    return NextResponse.json({ diagnostic: `Échec réseau: ${e instanceof Error ? e.message : 'inconnu'}` })
  }
}
