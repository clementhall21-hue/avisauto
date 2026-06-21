#!/usr/bin/env node
/**
 * StarReviews — Prospection automatique par email
 *
 * Usage:
 *   node outreach.mjs search          → trouve les prospects, sauvegarde dans prospects.csv
 *   node outreach.mjs send --dry-run  → simule sans envoyer
 *   node outreach.mjs send            → envoie les emails (max 50/jour)
 *   node outreach.mjs send --limit 30 → limite à 30 emails
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Config ───────────────────────────────────────────────────────────────────
// Charge .env ou .env.local
for (const name of ['.env', '.env.local']) {
  const envPath = path.join(__dirname, name)
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const [k, ...v] = line.split('=')
      if (k && v.length) process.env[k.trim()] = v.join('=').trim()
    }
  }
}

const BREVO_API_KEY = process.env.BREVO_API_KEY || ''
const SENDER_EMAIL  = 'starreviewsapp@gmail.com'
const SENDER_NAME   = 'Clément — StarReviews'

// Coordonnées hardcodées pour éviter les rate limits de Nominatim
const CITY_COORDS = {
  'Marseille':         [43.2965, 5.3698],
  'Aix-en-Provence':  [43.5297, 5.4474],
  'Aubagne':           [43.2967, 5.5709],
  'Cassis':            [43.2140, 5.5389],
  'La Ciotat':         [43.1742, 5.6083],
  'Martigues':         [43.4054, 5.0471],
  'Salon-de-Provence': [43.6408, 5.0979],
}

const SEARCHES = [
  ['restaurant', 'Marseille',        15000],
  ['restaurant', 'Aix-en-Provence',   8000],
  ['restaurant', 'Aubagne',           5000],
  ['restaurant', 'Cassis',            3000],
  ['restaurant', 'La Ciotat',         4000],
  ['restaurant', 'Martigues',         5000],
  ['restaurant', 'Salon-de-Provence', 5000],
  ['hotel',      'Marseille',        15000],
  ['hotel',      'Aix-en-Provence',   8000],
  ['hotel',      'Aubagne',           5000],
  ['hotel',      'Cassis',            3000],
  ['spa',        'Marseille',        15000],
  ['spa',        'Aix-en-Provence',   8000],
]

const EMAIL_SUBJECT = "Vos avis Google — j'ai quelque chose pour vous"

const EMAIL_BODY = (name) => `Bonjour ${name},

Je m'appelle Clément, j'ai créé StarReviews — un outil qui répond automatiquement à vos avis Google avec l'IA.

Plus besoin de passer du temps chaque semaine à rédiger des réponses. StarReviews s'en charge pour vous, dans le ton que vous choisissez, en quelques secondes.

→ 14 jours gratuits, sans carte bancaire
→ starreviews.vercel.app

Ça vous intéresse ? Je peux vous faire une démo rapide.

Bonne journée,
Clément — StarReviews
starreviewsapp@gmail.com
`

const BLOCKED_DOMAINS = ['example.com','wordpress.com','sentry.io','schema.org',
  'w3.org','cloudflare.com','google.com','facebook.com','instagram.com','wix.com']

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': 'StarReviews-outreach/1.0 (starreviewsapp@gmail.com)' }, ...opts })
  const text = await res.text()
  try { return JSON.parse(text) } catch { return null }
}

async function geocodeCity(city) {
  const data = await fetchJson(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', France')}&format=json&limit=1`)
  if (Array.isArray(data) && data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
  return null
}

async function searchOSM(amenity, lat, lon, radius, retry = 0) {
  let query
  if (amenity === 'hotel') {
    query = `[out:json][timeout:25];(node["tourism"="hotel"](around:${radius},${lat},${lon});way["tourism"="hotel"](around:${radius},${lat},${lon}););out tags center;`
  } else if (amenity === 'spa') {
    query = `[out:json][timeout:25];(node["leisure"="spa"](around:${radius},${lat},${lon});way["leisure"="spa"](around:${radius},${lat},${lon}););out tags center;`
  } else {
    query = `[out:json][timeout:25];(node["amenity"="${amenity}"](around:${radius},${lat},${lon});way["amenity"="${amenity}"](around:${radius},${lat},${lon}););out tags center;`
  }
  const servers = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
  const url = servers[retry % servers.length]
  let text
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'StarReviews-outreach/1.0 (starreviewsapp@gmail.com)',
      },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(30000),
    })
    text = await res.text()
  } catch {
    if (retry < 2) { await sleep(3000); return searchOSM(amenity, lat, lon, radius, retry + 1) }
    return []
  }
  let data
  try { data = JSON.parse(text) } catch {
    console.log('  ⚠️  Réponse API non-JSON:', text.slice(0, 200))
    if (retry < 2) { await sleep(3000); return searchOSM(amenity, lat, lon, radius, retry + 1) }
    return []
  }
  console.log(`  ℹ️  ${data.elements?.length ?? 0} éléments bruts reçus`)
  return (data.elements || []).map(el => {
    const t = el.tags || {}
    return {
      name:    t.name || '',
      website: t.website || t['contact:website'] || '',
      email:   t.email || t['contact:email'] || '',
      phone:   t.phone || t['contact:phone'] || '',
      address: [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' '),
    }
  }).filter(p => p.name)
}

async function extractEmailFromWebsite(siteUrl) {
  const pagesToTry = [siteUrl, siteUrl.replace(/\/?$/, '/contact'), siteUrl.replace(/\/?$/, '/nous-contacter')]
  for (const url of pagesToTry) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(6000),
      })
      const html = await res.text()
      const matches = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || []
      const filtered = matches.filter(e => !BLOCKED_DOMAINS.some(d => e.toLowerCase().includes(d)))
      if (filtered[0]) return filtered[0].toLowerCase()
    } catch { /* continue */ }
  }
  return null
}

// ─── CSV ──────────────────────────────────────────────────────────────────────
function readCsv(file) {
  if (!fs.existsSync(file)) return []
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    const vals = line.split(',')
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']))
  })
}

function writeCsv(file, rows) {
  const headers = ['name','email','website','phone','address','sent']
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => (r[h] || '').replace(/,/g, ' ')).join(','))]
  fs.writeFileSync(file, lines.join('\n'), 'utf8')
}

// ─── Search ───────────────────────────────────────────────────────────────────
async function runSearch(outputFile = 'prospects.csv') {
  const seen = new Set()
  const rows = []
  const cityCache = {}

  for (const [amenity, city, radius] of SEARCHES) {
    console.log(`\n🔍  ${amenity} — ${city}`)

    if (!cityCache[city]) {
      // Utilise les coordonnées hardcodées, sinon Nominatim
      if (CITY_COORDS[city]) {
        cityCache[city] = CITY_COORDS[city]
      } else {
        const coords = await geocodeCity(city)
        if (!coords) { console.log(`  ⚠️  Ville introuvable: ${city}`); continue }
        cityCache[city] = coords
        await sleep(1000)
      }
    }

    const [lat, lon] = cityCache[city]
    const places = await searchOSM(amenity, lat, lon, radius)
    await sleep(1000)

    for (const place of places) {
      const key = place.name.toLowerCase().trim()
      if (seen.has(key)) continue
      seen.add(key)

      let email = place.email
      if (!email && place.website) {
        email = await extractEmailFromWebsite(place.website)
        await sleep(500)
      }

      rows.push({ ...place, email: email || '', sent: 'non' })
      console.log(`  ${email ? '✅' : '❌'}  ${place.name} — ${email || 'pas d\'email'}`)
    }
  }

  writeCsv(outputFile, rows)
  const withEmail = rows.filter(r => r.email).length
  console.log(`\n📄  ${rows.length} établissements trouvés, ${withEmail} avec email`)
  console.log(`    Sauvegardé dans ${outputFile}`)
}

// ─── Send ─────────────────────────────────────────────────────────────────────
async function runSend(prospectsFile = 'prospects.csv', dryRun = false, limit = 50) {
  if (!BREVO_API_KEY && !dryRun) {
    console.log('❌  BREVO_API_KEY manquant dans le fichier .env')
    return
  }

  const rows = readCsv(prospectsFile)
  const toSend = rows.filter(r => r.email && r.sent === 'non').slice(0, limit)
  console.log(`📧  ${toSend.length} emails à envoyer${dryRun ? '  (DRY RUN)' : ''}`)

  let sentCount = 0
  for (const row of toSend) {
    if (dryRun) {
      console.log(`  [DRY RUN]  → ${row.name} <${row.email}>`)
      continue
    }
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
        to:          [{ email: row.email, name: row.name }],
        subject:     EMAIL_SUBJECT,
        textContent: EMAIL_BODY(row.name),
      }),
    })
    if (res.ok) {
      row.sent = 'oui'
      sentCount++
      console.log(`  ✅  Envoyé → ${row.name} <${row.email}>`)
    } else {
      console.log(`  ❌  Erreur → ${row.name} <${row.email}>`)
    }
    await sleep(1000)
  }

  writeCsv(prospectsFile, rows)
  console.log(`\n✅  ${sentCount} emails envoyés`)
}

// ─── Auto mode (search + send en boucle toutes les 23h) ──────────────────────
async function runAuto(prospectsFile = 'prospects.csv', dailyLimit = 10) {
  let round = 1
  while (true) {
    console.log(`\n${'─'.repeat(50)}`)
    console.log(`🔄  Tour ${round} — ${new Date().toLocaleString('fr-FR')}`)
    console.log('─'.repeat(50))

    await runSearch(prospectsFile)
    await runSend(prospectsFile, false, dailyLimit)

    const nextRun = new Date(Date.now() + 23 * 60 * 60 * 1000)
    console.log(`\n⏰  Prochain envoi dans 23h (${nextRun.toLocaleString('fr-FR')})`)
    console.log('   Laisse cette fenêtre ouverte.')
    round++
    await sleep(23 * 60 * 60 * 1000)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const [,, mode, ...flags] = process.argv
const dryRun = flags.includes('--dry-run')
const limitIdx = flags.indexOf('--limit')
const limit = limitIdx >= 0 ? parseInt(flags[limitIdx + 1]) : 10
const fileIdx = flags.indexOf('--file')
const file = fileIdx >= 0 ? flags[fileIdx + 1] : 'prospects.csv'

if (mode === 'search') {
  runSearch(file)
} else if (mode === 'send') {
  runSend(file, dryRun, limit)
} else if (mode === 'auto') {
  runAuto(file, limit)
} else {
  console.log('Usage: node outreach.mjs search | send | auto [--limit N]')
  console.log('  auto  → cherche + envoie automatiquement toutes les 23h')
}
