# Cyclista Cordula

Web app perso : me dire comment m'habiller pour une sortie vélo, selon la météo AROME le long de ma trace GPX et ma garde-robe réelle.

L'utilisateur est PM, pas dev senior : expliquer chaque choix technique en une phrase. Avancer phase par phase, il valide chaque phase avant la suivante.

## Dépôt et déploiement

- Repo : `https://github.com/aymericfrancois/cyclista-cordula.git`, branche principale `main`.
- Déploiement : GitHub Pages via GitHub Actions, URL `https://aymericfrancois.github.io/cyclista-cordula/`.
- Vite `base: '/cyclista-cordula/'`. Le manifest PWA (`start_url`, `scope`) et le service worker utilisent ce même préfixe.
- Routage en `HashRouter` (GitHub Pages ne sait pas réécrire les URL d'une SPA).
- Supabase Auth, URL de redirection autorisées : l'URL de prod ci-dessus et `http://localhost:5173`.

## Stack imposée

- Vite + React + TypeScript strict + Tailwind.
- PWA installable sur Android (`vite-plugin-pwa`), caméra via `<input type="file" accept="image/*" capture>`.
- Supabase offre gratuite : auth par lien magique (e-mail), Postgres, Storage. Données synchronisées PC et téléphone.
- Aucune API payante. Aucun appel LLM depuis l'app.
- Code, commentaires et interface en français. Composants simples, pas de sur-architecture.

## Contraintes qualité

- zod pour toute donnée externe : GPX parsé, réponses météo, JSON collé, lignes Supabase si utile.
- Images compressées en WebP côté client avant upload, largeur max 1200 px.
- RLS Supabase sur toutes les tables et le bucket Storage : chaque utilisateur ne voit que ses données (`user_id = auth.uid()`).
- `.env.example` documente les variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Jamais de secret commité. En CI, ces valeurs viennent des secrets GitHub.
- README court : installation, configuration Supabase pas à pas, déploiement.
- Petits commits, messages clairs en français.
- Logique métier (découpage trace, vitesse, météo, ressenti, reco, feedback) dans des modules purs testés avec Vitest, séparés de l'UI.
- Tous les seuils et coefficients dans un seul fichier de constantes nommées.

## Modèle de données (générique)

Champ `sport` (`'velo'` pour l'instant, `'course'` plus tard) sur les pièces et les sorties.

### Pièce (`pieces`)
- nom, marque, lien produit (optionnel), sport.
- type : sous-maillot, maillot manches courtes, maillot manches longues, veste, gilet coupe-vent, imperméable, cuissard court, cuissard long, collant, manchettes, jambières, genouillères, gants courts, gants longs, couvre-chaussures, chaussettes, bonnet, casquette, tour de cou.
- zone : tronc base, tronc milieu, tronc extérieur, jambes, bras, mains, pieds, tête/cou. Déduite du type par défaut, modifiable.
- composition, grammage : texte libre.
- indices 0 à 5 : chaleur, coupe-vent, imperméabilité, respirabilité.
- compressible en poche : booléen.
- état : dispo, au sale, en lavage. Bascule en un tap depuis la liste.
- images : photos originales + une image « propre » (PNG généré à part avec Flux/ComfyUI puis uploadé). Afficher l'image propre si elle existe, sinon la première photo.

### Sortie (`sorties`)
- sport, date/heure de départ, vitesse moyenne sur le plat (km/h), trace (GPX stocké ou points simplifiés).
- résultat calculé : segments, météo, synthèse, tenue recommandée, tenue portée.
- feedback : global (froid, ok, chaud) et optionnel par zone.

### Réglages (`reglages`)
- décalage personnel par zone, ajusté par les feedbacks, modifiable à la main.

## Fonctionnalités

### 1. Garde-robe
CRUD des pièces. Ajout en trois étapes :
1. Photos (caméra ou fichier) + type + lien.
2. Aide LLM par copier-coller : l'app génère un prompt prêt à copier (lien, type, schéma JSON attendu). L'utilisateur le colle dans Claude, recopie le JSON dans l'app. Validation zod, pré-remplissage : composition, grammage, indices.
3. Vérification, correction, enregistrement.

### 2. Sortie
- Entrées : fichier GPX (export Strava, pas d'API Strava), date et heure de départ, vitesse moyenne sur le plat.
- Découpage en segments d'environ 2 km.
- Heure de passage par segment : vitesse ajustée selon la pente (formule simple, documentée dans le code).
- Météo : Open-Meteo Météo-France `https://api.open-meteo.com/v1/meteofrance`, gratuite, sans clé. Variables horaires : `temperature_2m`, `wind_speed_10m`, `wind_gusts_10m`, `wind_direction_10m`, `precipitation`, `relative_humidity_2m`. Vérifier la doc avant d'implémenter.
- Limiter les appels : grouper les points proches (plusieurs coordonnées par requête), cache local.
- Au-delà de l'horizon AROME (environ 2 jours), l'API bascule sur ARPEGE : l'afficher clairement.
- Correction d'altitude : environ -0,65 °C / 100 m entre l'altitude de la trace et celle de la maille. Note : Open-Meteo applique déjà une correction si on lui passe `elevation`. Ne pas corriger deux fois.
- Ressenti par segment : vent apparent = vitesse vélo + composante du vent selon la direction de la trace.
- Affichage : profil d'altitude avec ressenti min/max, pluie et vent de face colorés. Synthèse : ressenti le plus froid, le plus chaud, risque de pluie, passage le plus exposé (col, descente).

### 3. Recommandation
- Par zone (tronc, jambes, bras, mains, pieds, tête), plusieurs pièces ou combinaisons classées par % de pertinence.
- Besoin de chaleur par zone = fonction du ressenti, pondéré par l'effort (montée : besoin réduit, descente : besoin accru).
- Besoin coupe-vent et imperméabilité selon vent apparent et précipitations.
- Score d'une combinaison = adéquation somme des indices des couches / besoin, pénalité trop chaud, pénalité trop froid.
- Exclure les pièces au sale ou en lavage. Marquer une pièce indisponible depuis l'écran de reco recalcule et propose la suivante.
- « Dans la poche » : si l'écart froid/chaud est important, proposer une couche compressible (gilet, manchettes, jambières) et dire quand l'enfiler.

### 4. Feedback
- Après l'heure de fin estimée, retour en un tap : froid, ok, chaud. Ignorable.
- Option : préciser la zone (mains froides, tronc trop chaud...).
- Chaque retour ajuste un décalage personnel par zone, appliqué aux recos suivantes, visible et modifiable dans les réglages.
- Historique des sorties : météo, tenue portée, retour.

## Hors périmètre pour l'instant
- API Strava (OAuth).
- Génération d'images dans l'app.
- Version course à pied (mais garder le champ `sport`).

## Phases
1. Squelette : Vite, Tailwind, PWA, Supabase auth, déploiement GitHub Pages qui marche.
2. Garde-robe : CRUD, photos, upload image propre, état dispo/sale.
3. Aide LLM copier-coller : génération du prompt, validation du JSON.
4. Sortie : import GPX, heures de passage, météo AROME, profil.
5. Moteur de reco + tests.
6. Écran de reco avec remplacement de pièce et « dans la poche ».
7. Feedback et ajustement personnel.

## État d'avancement
- [ ] Phase 1
- [ ] Phase 2
- [ ] Phase 3
- [ ] Phase 4
- [ ] Phase 5
- [ ] Phase 6
- [ ] Phase 7
