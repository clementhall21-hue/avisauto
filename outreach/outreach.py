#!/usr/bin/env python3
"""
StarReviews — Prospection automatique par email
Trouve restaurants/hôtels dans la région Aix-Marseille via OpenStreetMap (100% gratuit).

Usage:
  python outreach.py search          # Trouve les prospects et les sauvegarde dans prospects.csv
  python outreach.py send --dry-run  # Simule l'envoi (sans vraiment envoyer)
  python outreach.py send            # Envoie les emails (max 50/jour par défaut)
  python outreach.py send --limit 30 # Limite à 30 emails
"""

import os
import re
import csv
import time
import smtplib
import argparse
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ─── Config ───────────────────────────────────────────────────────────────────
GMAIL_USER         = 'starreviewsapp@gmail.com'
GMAIL_APP_PASSWORD = os.environ.get('GMAIL_APP_PASSWORD', '')

# Zones et types de lieux à chercher (OpenStreetMap)
SEARCHES = [
    # (type OSM, ville, rayon en mètres)
    ('restaurant',  'Marseille',         15000),
    ('restaurant',  'Aix-en-Provence',    8000),
    ('restaurant',  'Aubagne',            5000),
    ('restaurant',  'Cassis',             3000),
    ('restaurant',  'La Ciotat',          4000),
    ('restaurant',  'Martigues',          5000),
    ('restaurant',  'Salon-de-Provence',  5000),
    ('hotel',       'Marseille',         15000),
    ('hotel',       'Aix-en-Provence',    8000),
    ('hotel',       'Aubagne',            5000),
    ('hotel',       'Cassis',             3000),
    ('spa',         'Marseille',         15000),
    ('spa',         'Aix-en-Provence',    8000),
]

EMAIL_SUBJECT = "Vos avis Google — j'ai quelque chose pour vous"

EMAIL_BODY = """\
Bonjour {name},

Je m'appelle Clément, j'ai créé StarReviews — un outil qui répond automatiquement à vos avis Google avec l'IA.

Plus besoin de passer du temps chaque semaine à rédiger des réponses. StarReviews s'en charge pour vous, dans le ton que vous choisissez, en quelques secondes.

→ 14 jours gratuits, sans carte bancaire
→ starreviews.vercel.app

Ça vous intéresse ? Je peux vous faire une démo rapide.

Bonne journée,
Clément — StarReviews
starreviewsapp@gmail.com
"""

BLOCKED_EMAIL_DOMAINS = {
    'example.com', 'wordpress.com', 'sentry.io', 'jquery.com',
    'schema.org', 'w3.org', 'wixpress.com', 'squarespace.com',
    'cloudflare.com', 'google.com', 'facebook.com', 'instagram.com',
    'wix.com', 'jimdo.com',
}

# ─── OpenStreetMap (Overpass API) — 100% gratuit ──────────────────────────────
def geocode_city(city: str) -> tuple[float, float] | None:
    """Retourne (lat, lon) d'une ville via Nominatim."""
    url = 'https://nominatim.openstreetmap.org/search'
    params = {'q': city + ', France', 'format': 'json', 'limit': 1}
    headers = {'User-Agent': 'StarReviews-outreach/1.0 (starreviewsapp@gmail.com)'}
    resp = requests.get(url, params=params, headers=headers, timeout=10)
    results = resp.json()
    if results:
        return float(results[0]['lat']), float(results[0]['lon'])
    return None


def search_osm(amenity: str, lat: float, lon: float, radius: int) -> list[dict]:
    """Cherche des lieux via Overpass API (OpenStreetMap)."""
    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"="{amenity}"](around:{radius},{lat},{lon});
      way["amenity"="{amenity}"](around:{radius},{lat},{lon});
      node["tourism"="hotel"](around:{radius},{lat},{lon});
      way["tourism"="hotel"](around:{radius},{lat},{lon});
    );
    out tags center;
    """
    # Pour les hôtels et spas on utilise tourism=hotel / leisure=spa
    if amenity == 'hotel':
        query = f"""
        [out:json][timeout:25];
        (
          node["tourism"="hotel"](around:{radius},{lat},{lon});
          way["tourism"="hotel"](around:{radius},{lat},{lon});
          node["tourism"="motel"](around:{radius},{lat},{lon});
        );
        out tags center;
        """
    elif amenity == 'spa':
        query = f"""
        [out:json][timeout:25];
        (
          node["leisure"="spa"](around:{radius},{lat},{lon});
          way["leisure"="spa"](around:{radius},{lat},{lon});
          node["amenity"="spa"](around:{radius},{lat},{lon});
        );
        out tags center;
        """

    resp = requests.post(
        'https://overpass-api.de/api/interpreter',
        data={'data': query},
        timeout=30,
    )
    elements = resp.json().get('elements', [])

    results = []
    for el in elements:
        tags = el.get('tags', {})
        name = tags.get('name', '')
        if not name:
            continue
        results.append({
            'name':    name,
            'website': tags.get('website', tags.get('contact:website', '')),
            'email':   tags.get('email', tags.get('contact:email', '')),
            'phone':   tags.get('phone', tags.get('contact:phone', '')),
            'address': f"{tags.get('addr:housenumber', '')} {tags.get('addr:street', '')} {tags.get('addr:city', '')}".strip(),
        })
    return results


# ─── Email extraction ──────────────────────────────────────────────────────────
def extract_email_from_website(url: str) -> str | None:
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (compatible; StarReviews-bot/1.0)'}
        resp = requests.get(url, headers=headers, timeout=8, allow_redirects=True)
        emails = re.findall(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', resp.text)
        emails = [
            e.lower() for e in emails
            if not any(b in e.lower() for b in BLOCKED_EMAIL_DOMAINS)
        ]
        return emails[0] if emails else None
    except Exception:
        return None


# ─── Search mode ───────────────────────────────────────────────────────────────
def run_search(output_file: str = 'prospects.csv'):
    seen: set = set()
    rows: list = []

    city_cache: dict = {}

    for (amenity, city, radius) in SEARCHES:
        print(f'\n🔍  {amenity} — {city}')

        if city not in city_cache:
            coords = geocode_city(city)
            if not coords:
                print(f'  ⚠️  Ville introuvable: {city}')
                continue
            city_cache[city] = coords
            time.sleep(1)

        lat, lon = city_cache[city]
        places = search_osm(amenity, lat, lon, radius)
        time.sleep(1)

        for place in places:
            key = place['name'].lower().strip()
            if key in seen:
                continue
            seen.add(key)

            email = place['email']

            if not email and place['website']:
                email = extract_email_from_website(place['website'])
                time.sleep(0.5)

            rows.append({
                'name':    place['name'],
                'email':   email or '',
                'website': place['website'],
                'phone':   place['phone'],
                'address': place['address'],
                'sent':    'non',
            })
            status = '✅' if email else '❌'
            print(f"  {status}  {place['name']} — {email or 'pas d\\'email'}")

    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['name', 'email', 'website', 'phone', 'address', 'sent'])
        writer.writeheader()
        writer.writerows(rows)

    with_email = sum(1 for r in rows if r['email'])
    print(f'\n📄  {len(rows)} établissements trouvés, {with_email} avec email')
    print(f'    Sauvegardé dans {output_file}')


# ─── Send mode ─────────────────────────────────────────────────────────────────
def run_send(prospects_file: str = 'prospects.csv', dry_run: bool = False, limit: int = 50):
    if not GMAIL_APP_PASSWORD and not dry_run:
        print('❌  GMAIL_APP_PASSWORD manquant dans le fichier .env')
        return

    with open(prospects_file, 'r', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))

    to_send = [r for r in rows if r['email'] and r['sent'] == 'non'][:limit]
    print(f'📧  {len(to_send)} emails à envoyer{"  (DRY RUN — rien ne sera envoyé)" if dry_run else ""}')

    smtp = None
    if not dry_run:
        smtp = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        smtp.login(GMAIL_USER, GMAIL_APP_PASSWORD)

    sent_count = 0
    for row in to_send:
        name  = row['name']
        email = row['email']
        body  = EMAIL_BODY.format(name=name)

        msg = MIMEMultipart('alternative')
        msg['Subject'] = EMAIL_SUBJECT
        msg['From']    = f'Clément — StarReviews <{GMAIL_USER}>'
        msg['To']      = email
        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        if dry_run:
            print(f'  [DRY RUN]  → {name} <{email}>')
        else:
            try:
                smtp.sendmail(GMAIL_USER, email, msg.as_string())
                row['sent'] = 'oui'
                sent_count += 1
                print(f'  ✅  Envoyé → {name} <{email}>')
                time.sleep(3)
            except Exception as e:
                print(f'  ❌  Erreur → {name}: {e}')

    if smtp:
        smtp.quit()

    if not dry_run:
        with open(prospects_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['name', 'email', 'website', 'phone', 'address', 'sent'])
            writer.writeheader()
            writer.writerows(rows)
        print(f'\n✅  {sent_count} emails envoyés')


# ─── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='StarReviews Outreach')
    parser.add_argument('mode', choices=['search', 'send'])
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--limit',   type=int, default=50)
    parser.add_argument('--file',    default='prospects.csv')
    args = parser.parse_args()

    if args.mode == 'search':
        run_search(args.file)
    elif args.mode == 'send':
        run_send(args.file, dry_run=args.dry_run, limit=args.limit)
