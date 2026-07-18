# Application de préparation aux courses — Les Coureurs des Vignes

Spec de conception validée le 18 juillet 2026.

## 1. Objectif

Offrir aux adhérents de l'association un programme d'entraînement personnalisé selon la
course qu'ils préparent, publié semaine par semaine chaque dimanche soir, avec un suivi
des séances réalisées visible par l'encadrant.

Public : coureurs débutants à moyens. Chacun adapte son rythme à son niveau grâce à un
langage d'intensité en zones 1 à 5, jamais en allures imposées.

## 2. Périmètre

### Les 5 programmes

Tous démarrent le **lundi 27 juillet 2026**. La course tombe toujours le dernier jour
de la dernière semaine.

| Code | Objectif | Date | Durée | Izon |
|---|---|---|---|---|
| `P1` | 10 km d'Izon | dim. 27/09/2026 | 9 semaines | c'est l'objectif |
| `P2` | 10 km de Bordeaux | dim. 08/11/2026 | 15 semaines | optionnelle en S9 |
| `P3` | Semi-marathon de Bordeaux | dim. 08/11/2026 | 15 semaines | optionnelle en S9 |
| `P4` | Marathon de Bordeaux **ou** Nice-Cannes | dim. 08/11/2026 | 15 semaines | optionnelle en S9 |
| `P5` | 10 km HOKA Paris | dim. 15/11/2026 | 16 semaines | intégrée en S9 |

Les durées vont du premier lundi jusqu'au jour de la course. **Une semaine de
récupération s'ajoute ensuite** à chaque programme (S10 pour `P1`, S16 pour `P2` à `P4`,
S17 pour `P5`) : elle est écrite et publiée comme les autres.

Les marathons de Bordeaux et de Nice-Cannes partagent la même date et donc le même
programme. Le choix entre les deux est un simple libellé affiché, sans incidence sur le
contenu.

Le 27 septembre est la **semaine 9 de tous les programmes**, ce qui permet de n'écrire
qu'une seule semaine de course-test, déclinée en deux variantes.

### Hors périmètre (à ne pas construire)

Comptes individuels avec mot de passe, application mobile, connexion Strava ou Garmin,
notifications push, messagerie entre coureurs, paiement, gestion des adhésions.

## 3. Contenu d'entraînement

### Rythme hebdomadaire

**3 séances de course + 1 séance de renforcement optionnelle**, identique sur les 5
programmes. Seules les 3 séances de course comptent dans le taux d'assiduité ; le renfo
est comptabilisé à part, sans pénalité.

### Types de séance

| Code | Nom | Zone dominante |
|---|---|---|
| `EF` | Endurance fondamentale | Z2 |
| `SL` | Sortie longue | Z2, avec blocs Z3 en fin de prépa |
| `TEMPO` | Tempo / endurance active | Z3 |
| `SEUIL` | Seuil, fractionné long | Z4 |
| `VMA` | Fractionné court | Z5 |
| `RENFO` | Gainage, PPG, côtes | hors zones |
| `COURSE` | Course objectif ou course-test | libre |
| `RECUP` | Footing de récupération | Z1 à Z2 |

Chaque séance porte : un type, une durée totale, un descriptif court et concret
(« 40 min en Z2, dont 3 × 5 min en Z3 avec 2 min de récup en Z1 »), et un objectif en
une phrase (« construire l'endurance de base »).

### Les zones

| Zone | Nom | % FC max | Sensation |
|---|---|---|---|
| Z1 | Récupération | 50 à 60 % | conversation totale, effort quasi nul |
| Z2 | Endurance fondamentale | 60 à 75 % | on parle par phrases entières |
| Z3 | Tempo | 75 à 85 % | phrases courtes, respiration marquée |
| Z4 | Seuil | 85 à 92 % | trois ou quatre mots à la fois |
| Z5 | VMA | 92 à 100 % | aucun mot possible |

Le calculateur de fourchettes personnelles utilise la formule de **Tanaka**
(`FC max ≈ 208 − 0,7 × âge`), plus fiable que `220 − âge`, surtout après 40 ans. Le
coureur qui connaît sa FC max réelle la saisit directement et elle prime.

### Trame de progression

Règles appliquées à tous les programmes :

- **Blocs de 3 semaines chargées suivies d'1 semaine allégée** (volume en baisse
  d'environ 25 %, un peu d'intensité conservée).
- **Hausse de volume plafonnée à +10 % par semaine**, jamais deux hausses consécutives
  sur le même type de séance.
- **Affûtage sur les 2 dernières semaines** : le volume descend nettement (jusqu'à
  moitié moins la dernière semaine), l'intensité est maintenue. C'est le volume qui
  fatigue, l'intensité qui entretient la forme.
- **Semaine de récupération publiée après la course** : footings Z1 à Z2, aucune
  intensité, renfo léger. Elle fait partie du programme et se publie comme les autres.

Macro-structures :

```
P1  (9 sem)   S1-S3 bloc 1 · S4 allégée · S5-S7 bloc 2 · S8-S9 affûtage + course
              S10 récupération

P2/P3/P4      S1-S4 bloc 1 (3+1) · S5-S8 bloc 2 (3+1) · S9 course-test Izon
    (15 sem)  S10-S13 bloc 3 spécifique (3+1, pic de charge en S12)
              S14-S15 affûtage + course · S16 récupération

P5  (16 sem)  S1-S4 bloc 1 · S5-S8 bloc 2 (S8 pré-allégée avant Izon)
              S9 Izon · S10 récupération active
              S11-S13 bloc 3 spécifique 10 km · S14 allégée
              S15-S16 affûtage + course · S17 récupération
```

### La semaine 9 et Izon

Pour `P2`, `P3` et `P5` : allègement la veille, course, puis reprise douce. Pour `P4`
(marathon), Izon **se substitue à la sortie longue** de la semaine et se court en
effort-test, sans affûtage réel, afin de ne pas casser le bloc de construction en cours.

Le coureur de `P2`, `P3` ou `P4` qui ne fait pas Izon reçoit la variante normale de la
semaine 9. Une seule semaine, deux variantes, sélectionnées par la case « je fais Izon ».

### Prérequis affichés

Chaque programme affiche un prérequis en tête, avant le choix :

- `P1`, `P2`, `P5` (10 km) : savoir courir 30 minutes sans s'arrêter.
- `P3` (semi) : courir déjà environ 20 km par semaine depuis 2 mois.
- `P4` (marathon) : courir déjà environ 30 km par semaine depuis 2 mois.

**Ce point n'est pas cosmétique.** 15 semaines suffisent pour un marathon à qui a déjà
une base, pas à un débutant parti de zéro. Le coureur qui ne coche pas le prérequis se
voit proposer un programme plus court, sans blocage dur.

## 4. Architecture

### Vue d'ensemble

```
Cloudflare Pages (existant)          Worker "prepa-api" (nouveau)
  prepa.html  ────── fetch ─────►      /api/*
  js/prepa.js                            │
  css/style.css (charte partagée)        ├── D1  : coureurs, validations, overrides
                                         ├── repo: data/programmes.json (contenu)
                                         └── Cron: samedi 9 h → e-mail de rappel
```

**Décision : un Worker séparé plutôt que des Pages Functions.** Les Pages Functions ne
supportent pas les Cron Triggers, or le rappel du samedi en a besoin. Un Worker distinct
laisse le site actuel et son flux de déploiement strictement intacts, ce qui est le choix
le moins risqué. Le site reste déployé comme aujourd'hui depuis `dist/`.

Coût : palier gratuit Cloudflare, très largement suffisant pour une trentaine de coureurs.

### Le contenu des programmes

Le contenu des 5 programmes vit dans `data/programmes.json`, **versionné en git** : il
est relisible, diffable, et une erreur se corrige par un commit. Les modifications faites
depuis le back-office sont stockées séparément en D1 (`semaines_override`) et priment sur
le fichier au moment du rendu.

### Confidentialité des semaines futures

Règle centrale : **le Worker ne renvoie jamais le contenu d'une semaine dont la date de
publication n'est pas atteinte.** Ce n'est pas un masquage côté navigateur, le contenu ne
transite pas. Un cookie admin valide lève la restriction.

`date_publication(semaine N) = le dimanche 19 h 00 (Europe/Paris) précédant le lundi de
la semaine N`. La semaine 1 (lundi 27/07) se publie donc le **dimanche 26/07 à 19 h**.

Attention au changement d'heure : le passage à l'heure d'hiver a lieu le 25 octobre 2026,
soit avant les courses du 8 et du 15 novembre. Le calcul doit se faire en heure locale
Europe/Paris, pas en UTC fixe.

### Authentification

Deux secrets Cloudflare : `CODE_COUREUR` (diffusé aux adhérents) et `CODE_ADMIN`. À la
saisie, le Worker pose un cookie signé HMAC-SHA256 (`HttpOnly`, `Secure`, `SameSite=Lax`,
1 an), pour que le code ne soit pas resaisi à chaque visite. Limitation de débit sur
l'endpoint de saisie (10 tentatives par IP et par heure) contre le forçage brutal.

### Identité du coureur

Prénom saisi librement. La clé technique est une **forme normalisée** (minuscules, sans
accents, sans espaces ni ponctuation) : « Jean-Mi » et « jean mi » se rejoignent
naturellement. Pour les cas restants (« JM » vs « Jean-Michel »), le back-office propose
une fusion manuelle qui réaffecte les validations puis supprime le doublon.

### Modèle de données (D1)

```sql
coureurs(
  id INTEGER PRIMARY KEY, prenom TEXT NOT NULL, cle TEXT NOT NULL UNIQUE,
  programme TEXT NOT NULL, variante_course TEXT,   -- "bordeaux" | "nice-cannes"
  fait_izon INTEGER NOT NULL DEFAULT 0, cree_le TEXT NOT NULL
)

validations(
  id INTEGER PRIMARY KEY, coureur_id INTEGER NOT NULL REFERENCES coureurs(id),
  semaine INTEGER NOT NULL, seance TEXT NOT NULL,
  ressenti TEXT,          -- "facile" | "ok" | "difficile"
  note TEXT, valide_le TEXT NOT NULL,
  UNIQUE(coureur_id, semaine, seance)
)

semaines_override(
  programme TEXT NOT NULL, semaine INTEGER NOT NULL,
  contenu_json TEXT, veto INTEGER NOT NULL DEFAULT 0, modifie_le TEXT NOT NULL,
  PRIMARY KEY(programme, semaine)
)
```

### API

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/api/session` | valider le code, poser le cookie |
| `POST` | `/api/coureur` | créer ou retrouver le coureur (prénom, programme, Izon) |
| `GET` | `/api/semaine` | la semaine courante publiée du coureur |
| `GET` | `/api/programme` | semaines passées en clair, futures réduites au numéro et à leur date de sortie |
| `POST` | `/api/validation` | valider une séance (+ ressenti, + note) |
| `DELETE` | `/api/validation` | dévalider une séance |
| `GET` | `/api/admin/tableau` | assiduité et ressentis, toutes semaines |
| `GET` | `/api/admin/alertes` | coureurs à surveiller |
| `PUT` | `/api/admin/semaine` | modifier une semaine à venir |
| `POST` | `/api/admin/veto` | bloquer ou débloquer une publication |
| `POST` | `/api/admin/fusion` | fusionner deux coureurs |
| `DELETE` | `/api/admin/coureur` | effacement RGPD |

## 5. Interface coureur

Page `prepa.html`, ajoutée au menu du site.

**Premier passage** : code d'accès, puis prénom, puis choix du programme (avec son
prérequis et, pour `P4`, le choix Bordeaux ou Nice-Cannes), puis la case « je fais le
10 km d'Izon le 27 septembre » pour `P2`, `P3` et `P4`. Ensuite, plus aucune saisie : le
choix est mémorisé en `localStorage` et côté serveur.

**Ma semaine** (vue par défaut) : les 3 séances plus le renfo, chacune avec sa zone, sa
durée, son descriptif et son objectif. Un bouton de validation par séance, qui déplie les
3 boutons de ressenti (facile / ok / difficile) et un lien discret « ajouter une note »,
replié et facultatif.

**Mon programme** : les semaines passées consultables en clair, la semaine à venir
affichée floutée avec la mention « disponible dimanche à 19 h ». Une barre de progression
situe le coureur dans sa préparation et rappelle le compte à rebours jusqu'à sa course.

**Comprendre les zones** : chaque zone décrite par la sensation, l'essoufflement et le
% FC max, plus le calculateur de fourchettes personnelles (âge, ou FC max si connue).

## 6. Back-office

Même page, avec le code admin.

- **Tableau d'assiduité** : qui a validé quoi, semaine par semaine, tous programmes.
- **Ressentis de la semaine**, avec remontée automatique des coureurs à surveiller :
  3 séances manquées d'affilée, ou « difficile » déclaré deux semaines de suite. C'est le
  signal qui permet d'alléger la semaine suivante de quelqu'un.
- **Éditeur de la semaine à venir** : relire, modifier, ou bloquer la publication.
- **Fusion de prénoms** et **effacement d'un coureur**.
- **Accès anticipé** : toutes les semaines à venir de tous les programmes, en clair.

**Publication** : automatique le dimanche à 19 h (Europe/Paris), par simple calcul de
date à chaque requête, sans tâche planifiée. Un **Cron Trigger le samedi à 9 h** envoie
un rappel à **tridav00@gmail.com** (« la semaine 7 part demain, relis-la ») avec un lien
direct vers l'éditeur. Envoi via Cloudflare Email Service.

## 7. Charte graphique

L'application **reprend intégralement le design system existant**, sans nouvelle
feuille de style : `css/style.css` est partagé, les ajouts propres à la prépa vont dans
un bloc dédié du même fichier.

- **Couleurs** : `--limestone #e7e4d8` (fond), `--chalk #faf8f1` (surfaces),
  `--vine-deep #14331e` (héros, pied de page), `--vine #2e6b3e`, `--shoot #a9ce3c`
  (accent), `--wine #6e1a2a`, `--ink #1a211b`, `--muted #6d7a70`.
- **Typographies** : Archivo Expanded (titres), Instrument Sans (texte),
  **Space Mono pour toutes les données chiffrées** (durées, zones, distances, FC), ce qui
  est exactement son usage actuel sur le site.
- **Composants réutilisés** : `.container`, `.section`, `.surface-chalk`,
  `.surface-limestone`, `.surface-vine`, `.eyebrow`, `.btn` et ses variantes
  (`.btn--vine`, `.btn--shoot`, `.btn--outline-vine`), `.page-hero`, l'en-tête et le pied
  de page complets, la barre `.scroll-progress`.
- **Couleurs de zones**, tirées de la palette pour rester dans le terroir :
  Z1 `--muted`, Z2 `--vine`, Z3 `--shoot-dark`, Z4 `--wine`, Z5 `--wine-2`.
- **Rayons et ombres** existants (`--r`, `--r-lg`, `--r-pill`, `--sh`, `--sh-vine`).
- La page respecte `prefers-reduced-motion` et le motif `.js` sur `<html>`, comme le
  reste du site. Le lien CSS conserve le paramètre de cache `?v=`.

## 8. Données personnelles

Collecte limitée au prénom, au programme choisi et aux validations de séances. Aucun
e-mail de coureur, aucun mot de passe, aucune donnée de santé nominative. Le ressenti
reste une appréciation subjective d'effort, pas une donnée médicale.

Mention courte en bas de page expliquant ce qui est stocké, pourquoi, et comment demander
l'effacement. L'effacement se fait depuis le back-office et supprime le coureur et toutes
ses validations.

## 9. Tests

Développement piloté par les tests, avec Vitest et `@cloudflare/vitest-pool-workers`.

Cas critiques à couvrir en priorité :

1. Une semaine non publiée n'est **jamais** renvoyée sans cookie admin, sur aucune route.
2. Le calcul de la date de publication est juste de part et d'autre du changement
   d'heure du 25 octobre 2026.
3. La normalisation des prénoms regroupe bien les variantes d'orthographe.
4. La case Izon bascule bien la semaine 9 vers la bonne variante, pour chaque programme.
5. Chaque programme se termine par 2 semaines d'affûtage et contient une semaine de
   récupération après la course.
6. La progression de volume ne dépasse jamais +10 % d'une semaine à l'autre.
7. Le veto admin empêche effectivement la publication.
8. Un cookie forgé ou expiré est rejeté.

## 10. Livraison par étapes

1. Contenu des 5 programmes (`data/programmes.json`) et tests de cohérence de la trame.
2. Worker : session, coureur, semaine, validation, plus le filtrage par date.
3. Page coureur dans la charte : première visite, Ma semaine, Mon programme, les zones.
4. Back-office : tableau, alertes, éditeur, veto, fusion, effacement.
5. Cron du samedi et e-mail de rappel.
6. Mise en ligne et lien depuis le menu du site.

L'étape 1 doit être terminée avant le **dimanche 26 juillet 19 h**, date de publication
de la semaine 1.
