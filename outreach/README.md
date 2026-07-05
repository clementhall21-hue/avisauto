# StarReviews — Outreach automatique

## Setup (à faire une seule fois)

### 1. Google Places API Key
1. Va sur https://console.cloud.google.com
2. Crée un projet → **APIs & Services** → **Enable APIs** → active **Places API**
3. **Credentials** → **Create Credentials** → **API Key**
4. Copie la clé

### 2. Gmail App Password
1. Va sur https://myaccount.google.com/security (connecté sur starreviewsapp@gmail.com)
2. Active la **validation en 2 étapes** si pas déjà fait
3. Cherche **Mots de passe des applications**
4. Crée un mot de passe pour "StarReviews Outreach"
5. Copie les 16 caractères (format: xxxx xxxx xxxx xxxx)

### 3. Fichier .env
Copie `.env.example` en `.env` et remplis les valeurs :
```
GOOGLE_API_KEY=ta_clé_google
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

### 4. Installe Python et les dépendances
```bash
pip install -r requirements.txt
```

---

## Utilisation

```bash
# Étape 1 : Trouver les prospects (sauvegardé dans prospects.csv)
python outreach.py search

# Étape 2 : Tester l'envoi sans vraiment envoyer
python outreach.py send --dry-run

# Étape 3 : Envoyer pour de vrai (max 50 emails)
python outreach.py send

# Limiter à 30 emails
python outreach.py send --limit 30
```

Le CSV `prospects.csv` garde la trace de qui a reçu l'email (`sent: oui/non`).
Tu peux l'ouvrir dans Excel pour voir et modifier les données.

---

## Conseils
- Ne dépasse pas 50 emails/jour pour éviter que Gmail te spam-flag
- Modifie `EMAIL_BODY` dans le script pour personnaliser le message
- Lance `search` une fois par semaine pour trouver de nouveaux prospects
