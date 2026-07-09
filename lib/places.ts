// Accès aux données publiques des fiches Google (note, nombre d'avis).
// Implémentation actuelle : SerpAPI (100 requêtes/mois gratuites, sans CB).
// Pour migrer vers l'API Google Places plus tard, il suffit de réécrire
// ces deux fonctions — le reste de l'app ne connaît que cette interface.
// Serveur uniquement : la clé SERPAPI_KEY ne doit jamais atteindre le client.

export interface PlaceInfo {
  placeId: string
  name: string
  rating: number | null
  reviewCount: number | null
}

const SERPAPI_BASE = 'https://serpapi.com/search.json'

function apiKey(): string {
  const key = process.env.SERPAPI_KEY
  if (!key) throw new Error('SERPAPI_KEY manquant dans les variables d’environnement')
  return key
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && !isNaN(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/\s/g, '').replace(',', '.'))
    return isNaN(n) ? null : n
  }
  return null
}

function parsePlaceResult(r: Record<string, unknown>): PlaceInfo | null {
  const placeId = (r.place_id as string) || ''
  if (!placeId) return null
  return {
    placeId,
    name: (r.title as string) || '',
    rating: toNum(r.rating),
    reviewCount: toNum(r.reviews) ?? toNum(r.user_ratings_total) ?? toNum(r.reviews_count),
  }
}

// Détails d'un lieu par son Place ID
export async function getPlaceDetails(placeId: string): Promise<PlaceInfo | null> {
  const params = new URLSearchParams({
    engine: 'google_maps',
    place_id: placeId,
    hl: 'fr',
    api_key: apiKey(),
  })
  const res = await fetch(`${SERPAPI_BASE}?${params}`, { signal: AbortSignal.timeout(20000) })
  const data = await res.json().catch(() => ({}))
  if (data.error) throw new Error(`SerpAPI: ${data.error}`)
  if (!res.ok) return null
  if (data.place_results) return parsePlaceResult(data.place_results)
  return null
}

// Recherche d'un lieu par son nom (ex: "Le Petit Nice Marseille")
export async function searchPlace(query: string): Promise<PlaceInfo | null> {
  const params = new URLSearchParams({
    engine: 'google_maps',
    q: query,
    type: 'search',
    hl: 'fr',
    api_key: apiKey(),
  })
  const res = await fetch(`${SERPAPI_BASE}?${params}`, { signal: AbortSignal.timeout(20000) })
  const data = await res.json().catch(() => ({}))
  if (data.error) throw new Error(`SerpAPI: ${data.error}`)
  if (!res.ok) return null
  if (data.place_results) return parsePlaceResult(data.place_results)
  if (Array.isArray(data.local_results)) {
    // Préfère le premier résultat qui a une note (évite les entrées sponsorisées vides)
    const withRating = data.local_results.find((r: Record<string, unknown>) => r.rating != null)
    const candidate = withRating || data.local_results[0]
    if (candidate) return parsePlaceResult(candidate)
  }
  return null
}

// Résout l'entrée du gérant : Place ID brut, URL Google Maps, ou nom à chercher
export async function resolvePlace(input: string): Promise<PlaceInfo | null> {
  const trimmed = input.trim()

  // Place ID brut (commence par ChIJ, GhIJ…)
  if (/^[A-Za-z0-9_-]{20,}$/.test(trimmed) && trimmed.startsWith('ChIJ')) {
    return getPlaceDetails(trimmed)
  }

  // URL contenant un place_id explicite
  const urlMatch = trimmed.match(/place_id[=:]([A-Za-z0-9_-]+)/)
  if (urlMatch) return getPlaceDetails(urlMatch[1])

  // URL Google Maps classique : on extrait le nom du chemin /place/<nom>/
  const nameMatch = trimmed.match(/\/place\/([^/@?]+)/)
  if (nameMatch) {
    const name = decodeURIComponent(nameMatch[1]).replace(/\+/g, ' ')
    return searchPlace(name)
  }

  // Sinon : recherche par nom
  return searchPlace(trimmed)
}
