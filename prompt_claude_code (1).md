# Prompt Claude Code — AvisAuto SaaS

## Contexte
J'ai un prototype HTML complet d'un SaaS B2B appelé **AvisAuto** — réponses automatiques aux avis Google pour hôtels et restaurants. Le fichier `avisauto_final.html` est dans ce dossier. Lis-le entièrement avant de commencer.

## Ce que tu dois construire
Transforme ce prototype en une vraie application web production-ready, déployable immédiatement.

---

## Stack technique
- **Frontend** : Next.js 14 (App Router)
- **Base de données + Auth** : Supabase
- **Paiements** : Stripe (49€/mois par établissement)
- **IA** : Groq API llama-3.3-70b (côté serveur uniquement — jamais exposée au client)
- **Déploiement** : Vercel
- **Email** : Resend (notifications)

---

## Modèle business
- **Prix** : 49€/mois par établissement
- **Essai gratuit** : 14 jours sans carte bancaire
- **Cible** : Hôtels et restaurants français
- **Mot de passe admin** : à stocker en variable d'environnement

---

## Fonctionnalités à reproduire exactement

### Landing page
- Hero avec titre "Répondez à vos avis Google en un clic"
- Section "Comment ça fonctionne" (3 étapes + 2 modes côte à côte avec exemples)
- Section "L'IA parle comme vous" (même avis répondu en 4 tons)
- Section features, pricing 49€/mois, footer
- Boutons "Se connecter" et "Essai gratuit" qui ouvrent un modal

### Dashboard — Avis reçus
- Liste des avis avec génération Groq côté serveur
- Filtres : étoiles, statut (répondus / sans réponse), barre de recherche
- Stats dynamiques : note moyenne, total avis, taux de réponse, sans réponse
- Sélecteur de ton : Professionnel, Chaleureux, Empathique, Décontracté
- Boutons par avis : Publier, Régénérer, ✏️ Modifier (inline editable), 📋 Copier, 🗑 Supprimer
- Badge rouge sur sidebar avec nombre d'avis en attente
- Nom de l'établissement affiché en haut de sidebar

### Mode automatique
- Toggle dans Paramètres
- Quand activé : Groq génère la réponse dès qu'un avis arrive, publie après le délai choisi
- Délai configurable : Immédiat, 30min, 45min, 1h, 1h30, 2h, ou délai personnalisé (champs heures + minutes)
- Compte à rebours visible sur chaque carte d'avis programmée
- Boutons sur les avis programmés : ⚡ Publier maintenant, ✕ Annuler
- Quand délai = 0 : publication immédiate
- La réponse paraît humaine car elle n'arrive pas instantanément

### Signature
- Champ dans Paramètres
- Ajoutée automatiquement à la fin de chaque réponse avec retour à la ligne + tiret : `\n— [signature]`
- Appliquée aussi bien aux réponses Groq qu'aux réponses statiques

### Dashboard — Analytiques
- Répartition des étoiles avec barres de progression colorées
- Donut animé taux de réponse
- Insights auto-générés (basés sur les vraies données)
- Top 3 meilleurs avis
- Analyse des avis négatifs via Groq : bouton "Analyser avec Groq" qui résume les problèmes récurrents et propose des actions concrètes en langage simple

### Dashboard — Paramètres (vue client)
- Ton des réponses (4 boutons)
- Signature
- Mode automatique (toggle)
- Délai de publication (chips + personnalisé)
- Bouton discret "🔧 Accès admin" protégé par mot de passe

### Panel Admin (protégé par mot de passe)
- Nom de l'établissement
- Clé API Groq (avec bouton Tester)
- Google Sheets import
- Zapier webhook + triggers configurables + journal des envois

### Zapier
- Webhook URL configurable
- 3 triggers : nouvel avis, avis négatif (1-2★), réponse publiée
- Test de connexion
- Journal des envois en temps réel

### Ajouter un avis manuellement
- Dans Paramètres
- Champs : nom du client, étoiles (cliquables), texte de l'avis
- Génère la réponse IA et l'ajoute en haut de la liste

### Mobile
- Responsive complet 768px et 380px
- Menu burger avec tiroir latéral sur mobile
- Overflow horizontal bloqué partout
- Tone bar et boutons scrollables horizontalement si nécessaire

---

## Base de données Supabase — Schema

```sql
-- Utilisateurs (géré par Supabase Auth)
-- Table establishments
create table establishments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  signature text,
  tone text default 'Professionnel',
  auto_mode boolean default false,
  publish_delay_sec integer default 0,
  groq_api_key text, -- chiffré
  zapier_webhook_url text,
  zapier_triggers jsonb,
  created_at timestamptz default now()
);

-- Table reviews
create table reviews (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references establishments(id),
  reviewer_name text,
  reviewer_initials text,
  stars integer,
  review_text text,
  review_date text,
  status text default 'pending', -- pending | published
  ai_reply text,
  published_at timestamptz,
  source text default 'manual', -- manual | sheets | gmb
  created_at timestamptz default now()
);

-- Table stripe_subscriptions
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  status text, -- active | trialing | canceled | past_due
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now()
);
```

---

## Sécurité — Points critiques

1. **Clé Groq côté serveur uniquement** — Route API Next.js `/api/generate-reply` qui appelle Groq. Le client ne voit jamais la clé.
2. **Auth Supabase** — Chaque utilisateur ne voit que ses propres établissements et avis (Row Level Security)
3. **Stripe webhook** — Vérifier la signature Stripe sur chaque événement
4. **Variables d'environnement** :
   - `GROQ_API_KEY` (clé Groq globale pour les utilisateurs sans leur propre clé)
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_ID` (49€/mois)
   - `ADMIN_PASSWORD`
   - `RESEND_API_KEY`

---

## Design — À reproduire exactement

### Palette de couleurs
```css
--navy: #0b0f1e;
--navy-mid: #111827;
--navy-light: #1a2340;
--white: #e8eaf6;
--green: #34d399;
--indigo: #6366f1;
--violet: #a78bfa;
--cyan: #06b6d4;
--amber: #f59e0b;
--rose: #f43f5e;
--text-muted: #8892b0;
```

- Font : Inter (Google Fonts)
- Fond sombre ardoise/indigo
- Cards avec `border: 1px solid rgba(255,255,255,0.07)`
- Boutons principaux en dégradé indigo→violet
- Logo en dégradé indigo→cyan
- Sidebar active : bordure gauche indigo
- Stat cards avec bordures top colorées différentes par card

---

## Flux utilisateur

1. L'utilisateur arrive sur la landing page
2. Clique "Essai gratuit" → modal signup → crée son compte Supabase
3. Stripe crée un essai gratuit 14 jours (pas de carte requise)
4. Redirigé vers le dashboard — voit ses avis (vide au début)
5. Configure son établissement dans Paramètres
6. Ajoute des avis manuellement ou via Google Sheets
7. L'IA génère les réponses via `/api/generate-reply`
8. Après 14 jours → Stripe demande la carte → 49€/mois

---

## Routes API à créer

```
POST /api/generate-reply      — Appelle Groq côté serveur
POST /api/analyze-negative    — Analyse avis négatifs via Groq
POST /api/sync-sheets         — Import depuis Google Sheets
POST /api/zapier/send         — Envoie webhook Zapier
POST /api/stripe/webhook      — Reçoit événements Stripe
POST /api/stripe/create-checkout — Crée session paiement
GET  /api/stripe/portal       — Portail client Stripe
```

---

## Ce qui est déjà fait dans le prototype HTML

Tout le design, toute la logique métier, toutes les fonctionnalités. Lis `avisauto_final.html` pour comprendre exactement comment chaque feature fonctionne avant de la reconstruire. Ne réinvente pas — reproduis fidèlement en mieux.

---

## Ordre de construction recommandé

1. Setup Next.js + Supabase + variables d'env
2. Auth (signup/login/logout) avec Supabase
3. Schema BDD + RLS policies
4. Landing page (copie du design HTML)
5. Dashboard layout + sidebar
6. Onglet Avis reçus + route API Groq
7. Mode automatique + système de délai
8. Onglet Analytiques
9. Onglet Paramètres + Panel Admin
10. Stripe (checkout + webhook + portail)
11. Zapier + Google Sheets
12. Mobile responsive
13. Déploiement Vercel

---

Commence par lire entièrement `avisauto_final.html`, puis construis dans l'ordre ci-dessus. Pose-moi des questions si quelque chose n'est pas clair.
