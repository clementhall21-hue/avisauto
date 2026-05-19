# Mission : Transformer AvisAuto en SaaS premium

Lis d'abord `avisauto_final.html` et `prompt_claude_code.md` entièrement avant de toucher quoi que ce soit.

---

## Ce que je veux

Construis la version production-ready d'AvisAuto. Tout est décrit dans `prompt_claude_code.md`. Suis-le à la lettre pour la stack, le schema, les fonctionnalités et l'ordre de construction.

---

## Design — Niveau premium

Inspire-toi de **Linear**, **Vercel** et **Resend**. Ces trois produits représentent exactement le niveau visuel que je veux : dark mode sophistiqué, typographie soignée, animations subtiles, tout respire la qualité.

**Stack design :**
- Tailwind CSS
- Framer Motion pour les animations
- Radix UI pour les composants accessibles (modals, dropdowns, tooltips)

**Ce que ça doit donner :**
- Animations au scroll sur la landing page — les sections apparaissent proprement
- Transitions fluides entre les onglets du dashboard
- Micro-interactions sur tous les boutons et cards
- Cards d'avis qui apparaissent avec un effet au chargement
- Loader élégant pendant la génération Groq (pas juste des points)
- Toast notifications animées
- Compte à rebours avec une barre de progression visuelle
- Graphiques animés dans les analytiques (Recharts)
- Skeleton loaders pendant le chargement des données

**Landing page — au niveau d'un vrai SaaS :**
- Hero avec gradient animé en arrière-plan
- Mockup du dashboard en 3D perspective légère
- Section "Comment ça marche" avec timeline animée
- Section tons avec un vrai composant interactif — on clique sur un ton et la réponse change en live avec animation
- Testimonials clients (invente 3 témoignages hôtel/restaurant crédibles)
- FAQ accordion animé
- CTA final avant le footer

**Dashboard — propre et professionnel :**
- Sidebar plus raffinée avec icônes (Lucide React)
- En-tête du dashboard avec breadcrumb et actions contextuelles
- Cards d'avis redessinées — plus d'espace, meilleure hiérarchie visuelle
- Badge de statut plus élégant
- Réponse IA dans un bloc distinct avec label animé pendant la génération
- Mode édition inline avec curseur visible et border animée
- Analytics avec vrais graphiques Recharts animés

---

## Priorités absolues

1. **Sécurité** — Clé Groq côté serveur uniquement, jamais exposée
2. **Auth réelle** — Supabase, chaque client voit uniquement ses données
3. **Stripe** — Paiement 49€/mois automatique, essai 14 jours
4. **Toutes les fonctionnalités** du prototype HTML reproduites fidèlement
5. **Design premium** — le site doit avoir l'air de valoir bien plus que 49€/mois

---

## Ce que je veux à la fin

Un dossier Next.js complet, déployable sur Vercel en une commande, avec :
- `.env.example` documenté
- `README.md` avec les instructions de déploiement
- Toutes les migrations Supabase prêtes
- Le produit Stripe configuré

Lance-toi. Pose-moi des questions uniquement si c'est vraiment bloquant.
