# Renowation — Plateforme ALSA

Site vitrine haut de gamme + tunnel de devis + cockpit commercial pour **Renowation**
(rénovation, Rhode-Saint-Genèse / Bruxelles). Conçu par ALSA Consulting.

| Route | Rôle |
|---|---|
| `/` | Accueil : hero, 7 expertises, mosaïque réalisations, méthode en 5 étapes, zone d’intervention, CTA |
| `/realisations` | Galerie filtrable par catégorie + lightbox (clavier ← → Échap) |
| `/devis` | Simulateur en 3 étapes (travaux → surface/finition/délai → coordonnées) avec fourchette de prix en direct |
| `/cockpit` | Cockpit ALSA : KPI (pipeline, CA signé, **commission 10 %**, taux de closing), pipeline en 6 colonnes, notes de suivi, appel / WhatsApp / e-mail en un clic, export CSV |
| `/mentions-legales`, `/confidentialite` | Pages légales belges / RGPD |

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

## Mise en production sur Supabase

Tout le code est prêt ; il suffit de le brancher sur un projet Supabase.

1. **Créer le projet** sur https://supabase.com/dashboard → *New project* → nom `RENOWATION`,
   région *Central EU (Frankfurt)*.
2. **Créer la base** (table des demandes + sécurité) :
   ```bash
   npx supabase login
   npx supabase link --project-ref <REF_DU_PROJET>
   npx supabase db push
   ```
   (ou coller `supabase/migrations/20261002000000_renowation_init.sql` dans le *SQL Editor*).
3. **Donner l'accès au cockpit** — pour chaque membre de l'équipe :
   ```sql
   insert into public.team_members (email, role) values ('prenom@domaine.be', 'admin');
   ```
   puis *Authentication → Users → Invite user* avec la même adresse. Les inscriptions libres
   sont désactivées : seule une adresse présente dans `team_members` entre dans le cockpit.
4. **Brancher le site** : copier `.env.example` en `.env` et renseigner `VITE_SUPABASE_URL` et
   `VITE_SUPABASE_ANON_KEY` (*Project Settings → API*). Sur Vercel : mêmes variables dans
   *Settings → Environment Variables*.
5. **Alerte e-mail à chaque devis** (optionnel, recommandé) :
   ```bash
   npx supabase secrets set RESEND_API_KEY=... WEBHOOK_SECRET=<chaîne aléatoire> \
     NOTIFY_TO=info@renowation.be NOTIFY_FROM="Renowation <devis@renowation.be>" \
     COCKPIT_URL=https://renowation.be/cockpit
   npx supabase functions deploy notify-lead
   ```
   Puis *Database → Webhooks → Create* : table `renowation_leads`, événement `INSERT`,
   type *Supabase Edge Function* `notify-lead`, en-tête `x-webhook-secret: <même chaîne>`.

### Sécurité (testée sur PostgreSQL)

| Qui | Créer une demande | Lire les demandes | Modifier statut / montant / notes |
|---|---|---|---|
| Visiteur du site | ✅ (statut « nouveau » uniquement) | ❌ | ❌ |
| Compte connecté hors équipe | ✅ | ❌ (0 ligne) | ❌ |
| Membre de `team_members` | ✅ | ✅ | ✅ |

Contrôles en base : format e-mail, longueurs maximales, services autorisés, montants positifs.
Le formulaire contient aussi un champ piège anti-robots.

### Mode démo (sans Supabase)

Sans variables d'environnement, les demandes restent dans le navigateur et le cockpit
s'ouvre avec le code `VITE_COCKPIT_PIN` (défaut `2026`). À réserver aux démonstrations.

## Pages légales

`/mentions-legales` et `/confidentialite` (RGPD : finalités, destinataires dont ALSA
Consulting, durée de conservation, droits, APD). Compléter la forme juridique et le
numéro BCE/TVA dans `src/data/company.ts` (`legalForm`, `vat`).

## À valider avec le client avant mise en ligne

- Liste des services, fourchettes de prix du simulateur (`src/data/company.ts`)
- Forme juridique et numéro BCE/TVA (`legalForm`, `vat`)
- Textes et légendes des photos importées
