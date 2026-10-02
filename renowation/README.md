# Renowation — Plateforme ALSA

Site vitrine haut de gamme + tunnel de devis + cockpit commercial pour **Renowation**
(rénovation, Rhode-Saint-Genèse / Bruxelles). Conçu par ALSA Consulting.

| Route | Rôle |
|---|---|
| `/` | Accueil : hero, 7 expertises, mosaïque réalisations, méthode en 5 étapes, zone d’intervention, CTA |
| `/realisations` | Galerie filtrable par catégorie + lightbox (clavier ← → Échap) |
| `/devis` | Simulateur en 3 étapes (travaux → surface/finition/délai → coordonnées) avec fourchette de prix en direct |
| `/cockpit` | Cockpit ALSA : KPI (pipeline, CA signé, **commission 10 %**, taux de closing), pipeline en 6 colonnes, appel / WhatsApp / e-mail en un clic, export CSV |

Stack : Vite · React 19 · TypeScript · Tailwind · Supabase (optionnel).

## Démarrage

```bash
cd renowation
npm install
npm run import:photos   # récupère toutes les photos de renowation.be
npm run dev             # http://localhost:5173
```

## Photos du site renowation.be

`npm run import:photos` explore le site (jusqu’à 40 pages), récupère toutes les images
(`<img>`, `srcset`, lazy-load, fonds CSS, og:image, liens lightbox), télécharge la
**version pleine résolution** (suppression des suffixes WordPress `-300x200`), ignore
icônes et doublons, puis écrit `public/photos/manifest.json` avec une catégorie déduite
(toiture, façade, salle de bain, cuisine, isolation, intérieur, rénovation).

Options : `npm run import:photos -- https://renowation.be --max-pages 80`

Ajout manuel : déposer les fichiers dans `public/photos/` et les déclarer dans
`manifest.json` :

```json
[{ "src": "/photos/toiture-uccle.jpg", "alt": "Toiture en ardoise à Uccle", "category": "toiture" }]
```

Tant qu’aucune photo n’est importée, la plateforme affiche des visuels de remplacement soignés.

## Données des leads

- **Sans configuration** : les demandes sont stockées dans le navigateur (démo).
  Code d’accès cockpit : `VITE_COCKPIT_PIN` (défaut `2026`).
- **Production (Supabase)** : exécuter `supabase/schema.sql`, créer les comptes de
  l’équipe dans Supabase Auth, puis renseigner `.env` (voir `.env.example`).
  Le public ne peut qu’**insérer** une demande (RLS) ; lecture et mise à jour sont
  réservées aux utilisateurs connectés.

## Déploiement

`npm run build` → `dist/`. `vercel.json` inclut la réécriture SPA.

## À valider avec le client avant mise en ligne

- Liste des services, fourchettes de prix du simulateur (`src/data/company.ts`)
- Communes desservies, numéro de TVA, mentions légales / politique RGPD
- Textes et légendes des photos importées
