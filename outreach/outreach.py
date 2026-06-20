#!/usr/bin/env python3
"""
StarReviews — Prospection automatique par email
Trouve restaurants/hôtels dans la région Aix-Marseille et envoie des cold emails.

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
GOOGLE_API_KEY    = os.environ.get('GOOGLE_API_KEY', '')
GMAIL_USER        = 'starreviewsapp@gmail.com'
GMAIL_APP_PASSWORD = os.environ.get('GMAIL_APP_PASSWORD', '')

SEARCH_QUERIES = [
    'restaurant Marseille',
    'restaurant Aix-en-Provence',
    'restaurant Aubagne',
    'restaurant Cassis',
    'restaurant La Ciotat',
    'restaurant Martigues',
    'restaurant Salon-de-Provence',
    'hôtel Marseille',
    'hôtel Aix-en-Provence',
    'hôtel Aubagne',
    'hôtel Cassis',
    'spa Marseille',
    'spa Aix-en-Provence',
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

# Domaines à ignorer lors de l'extraction d'emails
BLOCKED_EMAIL_DOMAINS = {
    'example.com', 'wordpress.com', 'sentry.io', 'jquery.com',
    'schema.org', 'w3.org', 'wixpress.com', 'squarespace.com',
    'cloudflare.com', 'google.com', 'facebook.com', 'instagram.com',
}

# ─── Google Places ─────────────────────────────────────────────────────────────
def search_places(query: str) -> list:
    places = []
    url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
    params = {'query': query, 'key': GOOGLE_API_KEY, 'language': 'fr'}

    while True:
        resp = requests.get(url, params=params, timeout=10)
        data = resp.json()
        places.extend(data.get('results', []))

        next_token = data.get('next_page_token')
        if not next_token:
            break
        time.sleep(2)
        params = {'pagetoken': next_token, 'key': GOOGLE_API_KEY}

    return places


def get_place_details(place_id: str) -> dict:
    url = 'https://maps.googleapis.com/maps/api/place/details/json'
    params = {
        'place_id': place_id,
        'fields': 'name,website,formatted_phone_number,formatted_address',
        'key': GOOGLE_API_KEY,
        'language': 'fr',
    }
    resp = requests.get(url, params=params, timeout=10)
    return resp.json().get('result', {})


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
    if not GOOGLE_API_KEY:
        print('❌  GOOGLE_API_KEY manquant. Ajoute-le dans le fichier .env')
        return

    seen_ids: set = set()
    rows: list = []

    for query in SEARCH_QUERIES:
        print(f'\n🔍  {query}')
        places = search_places(query)

        for place in places:
            place_id = place['place_id']
            if place_id in seen_ids:
                continue
            seen_ids.add(place_id)

            details = get_place_details(place_id)
            name    = details.get('name', place.get('name', ''))
            website = details.get('website', '')
            phone   = details.get('formatted_phone_number', '')
            address = details.get('formatted_address', '')

            email = None
            if website:
                email = extract_email_from_website(website)
                time.sleep(0.5)

            rows.append({
                'name': name,
                'email': email or '',
                'website': website,
                'phone': phone,
                'address': address,
                'sent': 'non',
            })
            status = '✅' if email else '❌'
            print(f'  {status}  {name} — {email or "pas d\'email"}')

        time.sleep(1)

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
        print('❌  GMAIL_APP_PASSWORD manquant. Ajoute-le dans le fichier .env')
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
    parser.add_argument('mode', choices=['search', 'send'], help='search: trouve les prospects | send: envoie les emails')
    parser.add_argument('--dry-run', action='store_true', help='Simuler sans envoyer')
    parser.add_argument('--limit',   type=int, default=50, help='Nombre max d\'emails par session (défaut: 50)')
    parser.add_argument('--file',    default='prospects.csv', help='Fichier CSV des prospects')
    args = parser.parse_args()

    if args.mode == 'search':
        run_search(args.file)
    elif args.mode == 'send':
        run_send(args.file, dry_run=args.dry_run, limit=args.limit)
