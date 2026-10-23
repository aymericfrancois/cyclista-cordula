# Cyclista Cordula

Comment m'habiller pour une sortie vélo, selon la météo AROME le long de ma trace GPX et ma garde-robe.

Site, API, base de données et images tournent sur Cloudflare (offre gratuite). Détails du projet : `CLAUDE.md`.

## Installation

```bash
npm install
cp .env.example .dev.vars   # simule la connexion en local
npm run dev:api             # API locale sur :8787 (terminal 1)
npm run dev                 # site sur http://localhost:5173 (terminal 2)
npm test                    # tests
```

## Configuration Cloudflare (une seule fois)

1. Compte Cloudflare avec e-mail vérifié, plan R2 gratuit activé (carte requise), Zero Trust en plan Free.
2. Jeton d'API (Manage account, Account API tokens) avec les droits : Workers Scripts Write, D1 Write, Workers R2 Storage Write, Access: Apps and Policies Write, Account Settings Read.
3. Secret GitHub `CLOUDFLARE_API_TOKEN` (Settings, Secrets and variables, Actions).
4. Premier déploiement (voir ci-dessous). Cloudflare crée la base `cyclista-cordula` et le bucket `cyclista-cordula-images`.
5. Protéger le site par un login e-mail :
   - Workers & Pages, `cyclista-cordula`, Settings, Domains & Routes, ligne `workers.dev` : activer **Cloudflare Access**.
   - Zero Trust, Access, Applications : ouvrir l'application créée, régler la politique sur **ton e-mail uniquement**, méthode **One-time PIN**, durée de session longue (1 mois).
   - Reporter dans `wrangler.jsonc` : `ACCESS_TEAM_DOMAIN` (ex. `equipe.cloudflareaccess.com`) et `ACCESS_AUD` (Application Audience Tag). Ce ne sont pas des secrets.
6. Redéployer. Tant que ces deux valeurs sont vides, l'API refuse tout.

## Déploiement

Chaque push sur `main` déclenche GitHub Actions : tests, build, `wrangler deploy`, migrations D1. Lancement manuel possible depuis l'onglet Actions.

## Installer sur Android

Ouvrir l'URL dans Chrome, menu, Ajouter à l'écran d'accueil.
