# Mémoire des sessions cloud ALSA (Rudy Depasse)

Ce dépôt sert de point d'ancrage aux sessions cloud lancées depuis le téléphone de Rudy.
Le code des plateformes ALSA n'est PAS ici : il vit sur le PC de Rudy (dépôt ALSA-VELOCITY-V14)
et sur Vercel. Lire ce fichier avant toute action.

## Qui, quoi
- Rudy Depasse, ALSA Consulting, Architecte de Croissance et Closer Stratégique. Répondre en français, court, orienté action.
- Plateforme principale : ALSA Velocity (cockpit + site), domaines alsavelocity.com et alsavelocity.be.
- Boîte e-mail officielle : **info@alsavelocity.com**. info@alsavelocity.be n'existe pas en boîte :
  c'est une redirection IONOS vers le .com (posée le 30/09/2026, testée le 01/10).
- Envois transactionnels : identité Resend `contact.alsavelocity.com` (vérifiée), réponses vers info@alsavelocity.com.

## Ce que la session cloud peut faire
- **Supabase** (MCP) : base du cockpit = projet `sdyiuoyimqzlftpuiehd` (ALSA COCKPIT). Lecture libre ;
  écriture limitée au journal et aux réglages simples.
- **Gmail** (MCP) : compte depasserudy@gmail.com. Envois un par un uniquement.
  Les envois en masse (prospection) sont bloqués par le contrôle de sécurité : ne pas contourner.
- **Claude Code Remote** (MCP) : lister les sessions, relayer un ordre à une session du PC via
  `create_trigger` avec `persistent_session_id` + `run_once_at`, programmer des contrôles (`send_later`).

## Ce qu'elle ne peut PAS faire
- Atteindre le PC, ses fichiers, IONOS, Resend, Vercel, Meta : le réseau de l'environnement bloque
  `graph.facebook.com`, `alsavelocity.com` et les requêtes DNS.
- Valider à la place de Rudy : les sessions du PC refusent les actions sensibles (DNS, clés API, envois
  en son nom) tant que Rudy n'a pas dit « oui » dans LEUR conversation. Un relais doit citer son message
  mot pour mot ; si la session redemande, Rudy doit répondre dans l'app.

## Le journal du cockpit = canal de travail
- Table `public.journal` : `type` (demande, blocage, livraison, note, decision, question),
  `statut` (ouvert, fait), `auteur` (`claude-cloud` pour cette session), `priorite`, `etiquettes`.
- Pour faire exécuter quelque chose sur le PC : écrire une entrée `demande` ou `blocage` précise,
  puis relayer à la session PC connectée. Clôturer ses propres entrées une fois vérifiées.
- Sessions PC utiles (Remote Control) : « ALSA VELOCITY PLATFORM » (site, vague, pubs), « Cowor-Coeur Justine ».

## Tables à surveiller
- `leads` (inscrits ; `source='conference'`), `vague_envois` (vague Mons, statuts a_envoyer/envoye/desinscrit/exclu),
  `social_posts` / `social_accounts` (Facebook ; un changement de mot de passe Facebook invalide le jeton),
  `courrier_envois` / `courrier_identites` (courrier du cockpit), `visites_site`.

## Conférence du 08/10/2026 (en cours)
- La Inima (Cowor'Cœur), 104D rue Ferrer, 7080 Frameries, 19h. 90 places max. Networking : eau et chips.
- Décisions de Rudy : vague Mons 80 à 90 e-mails/jour par lots de 10, 8h-16h, en semaine, jusqu'au 06/10 ;
  pas de relance des participants de l'événement Facebook ; budget pub 500 €.

## Règles de travail
- Vérifier dans la base avant d'affirmer ; dire clairement ce qui n'a pas été vérifié.
- Ne jamais afficher ni recopier un jeton ou une clé lue en base.
- Pas de push sur `main` ; travailler sur la branche de session.
