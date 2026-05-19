# AvisAuto — Réponses Google en un clic

SaaS B2B de réponses automatiques aux avis Google pour hôtels et restaurants. Stack : Next.js 14, Supabase, Stripe, Groq.

## Démarrage rapide

```bash
npm install
cp .env.example .env.local
# Remplir .env.local avec vos clés
npm run dev
```

## Déploiement Vercel

### 1. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Dans SQL Editor, exécutez `supabase/migrations/001_initial.sql`
3. Copiez `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` depuis Settings → API

### 2. Stripe

1. Créez un compte sur [stripe.com](https://stripe.com)
2. Créez un produit "AvisAuto" avec un prix récurrent de 49€/mois
3. Copiez le `Price ID` → `STRIPE_PRICE_ID`
4. Copiez vos clés API → `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
5. Créez un webhook endpoint pointant vers `https://votre-app.vercel.app/api/stripe/webhook`
   - Events : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
6. Copiez le webhook secret → `STRIPE_WEBHOOK_SECRET`

### 3. Groq

1. Créez un compte sur [console.groq.com](https://console.groq.com)
2. Générez une clé API → `GROQ_API_KEY`

### 4. Resend (emails)

1. Créez un compte sur [resend.com](https://resend.com)
2. Générez une clé API → `RESEND_API_KEY`

### 5. Déploiement

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel --prod
```

Configurez toutes les variables d'environnement dans Vercel Dashboard → Settings → Environment Variables.

## Variables d'environnement

Voir `.env.example` pour la liste complète et les instructions.

## Architecture

```
app/
  page.tsx                    # Landing page
  dashboard/
    layout.tsx                # Layout dashboard + sidebar + auth
    reviews/page.tsx          # Liste des avis + génération IA
    analytics/page.tsx        # Statistiques et insights
    settings/page.tsx         # Paramètres + panel admin
  api/
    generate-reply/route.ts   # Génération Groq (côté serveur)
    analyze-negative/route.ts # Analyse avis négatifs
    sync-sheets/route.ts      # Import Google Sheets
    zapier/send/route.ts      # Webhooks Zapier
    stripe/
      webhook/route.ts        # Stripe webhook handler
      create-checkout/route.ts
      portal/route.ts
  auth/callback/route.ts      # OAuth callback Supabase

components/
  AuthModal.tsx               # Modal login/signup
  ReviewCard.tsx              # Carte avis avec actions
  Toast.tsx                   # Notifications

lib/
  supabase/client.ts          # Client Supabase (navigateur)
  supabase/server.ts          # Client Supabase (serveur)
  utils.ts                    # Helpers, couleurs, réponses statiques

supabase/migrations/
  001_initial.sql             # Schema + RLS + trigger signup
```

## Sécurité

- **Clé Groq** : jamais exposée au client. Tous les appels passent par `/api/generate-reply`
- **Row Level Security** : chaque utilisateur n'accède qu'à ses propres données
- **Stripe webhooks** : signature vérifiée sur chaque événement
- **Admin panel** : protégé par mot de passe (`ADMIN_PASSWORD`)
