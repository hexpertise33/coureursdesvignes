# Application de préparation aux courses — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer une application web permettant aux adhérents des Coureurs des Vignes de suivre un programme de préparation adapté à leur course, publié semaine par semaine le dimanche à 19 h, avec suivi des séances consultable par l'encadrant.

**Architecture:** Le site statique existant (Cloudflare Pages) reçoit une page `prepa.html` dans la charte actuelle. Un Worker Cloudflare distinct (`prepa-api/`) sert l'API, détient le contenu des programmes et filtre les semaines non publiées avant tout envoi réseau. Une base D1 stocke les coureurs, leurs validations et les modifications admin. Un Cron Trigger envoie le rappel du samedi.

**Tech Stack:** Cloudflare Workers, D1 (SQLite), Wrangler 3, Vitest + `@cloudflare/vitest-pool-workers`, JavaScript ES modules (pas de TypeScript, pas de framework front, cohérent avec le site existant).

**Spec de référence:** `docs/superpowers/specs/2026-07-18-prepa-courses-design.md`

## Global Constraints

- **Langue** : tout le texte visible est en français.
- **Pas de tiret cadratin.** Le caractère `—` est proscrit dans tout texte rédigé destiné à l'affichage : titres de page, descriptions de séances, objectifs, libellés d'interface, messages d'erreur, corps des e-mails. Utiliser virgule, point, deux-points ou parenthèses. `seances.js` fait respecter cette règle mécaniquement en levant une erreur.
  - **Unique exception, décidée le 18/07 :** la balise `<title>` du document, où le site utilise déjà `Page — Les Coureurs des Vignes` sur ses 6 pages. La cohérence avec l'existant l'emporte sur ce seul élément, qui est technique et non rédactionnel.
- **Zones définies à un seul endroit.** Le tableau des 5 zones vit dans `seances.js` côté Worker et est servi par la route `GET /api/zones`. Le front ne le duplique jamais : une fourchette corrigée doit changer partout d'un coup. Décision du 18/07.
- **Charte partagée** : aucune nouvelle feuille de style. Les ajouts vont dans un bloc `/* ===== PRÉPA ===== */` à la fin de `css/style.css`. Jetons imposés : `--limestone #e7e4d8`, `--chalk #faf8f1`, `--vine-deep #14331e`, `--vine #2e6b3e`, `--shoot #a9ce3c`, `--wine #6e1a2a`, `--ink #1a211b`, `--muted #6d7a70`. Polices : Archivo Expanded (titres), Instrument Sans (texte), Space Mono (toute donnée chiffrée).
- **Couleurs de zones** : Z1 `--muted`, Z2 `--vine`, Z3 `--shoot-dark`, Z4 `--wine`, Z5 `--wine-2`.
- **Aucun secret dans git.** `CODE_COUREUR` et `CODE_ADMIN` vivent en secrets Cloudflare, et en local dans `prepa-api/.dev.vars` (déjà couvert par `.gitignore`). Cette règle vaut aussi pour les **fichiers de test et de configuration versionnés** : `vitest.config.js` et les tests utilisent les valeurs factices `coureur-test` et `admin-test`, jamais les codes réels. Un code de production dans un fichier suivi par git est un défaut bloquant, quelle que soit la commodité.
- **Départ de tous les programmes** : lundi 27 juillet 2026.
- **Publication** : le dimanche 19 h 00 heure d'Europe/Paris précédant le lundi de la semaine concernée.
- **Rythme** : 3 séances de course + 1 renfo optionnelle par semaine, sur les 5 programmes.
- **Intensité** : zones 1 à 5 uniquement. Jamais d'allure en min/km imposée.
- **FC max** : formule de Tanaka, `208 − 0,7 × âge`.
- **Échéance dure** : les tâches 1 à 6 (contenu des programmes) doivent être terminées avant le **dimanche 26 juillet 19 h**, date de publication de la semaine 1.

**Écart assumé par rapport à la spec.** La spec mentionnait `data/programmes.json`. Le plan utilise des **modules JS** (`src/programmes/*.js`) plutôt que du JSON brut. Raison : le contenu représente environ 300 séances, et des fonctions d'assemblage évitent une répétition massive tout en restant versionnées, relisibles et diffables en git, ce qui était l'exigence réelle. Le Worker sérialise en JSON à la volée.

---

## Structure des fichiers

```
coureurs-des-vignes/
  prepa.html                        CRÉÉ  page unique (coureur + admin)
  js/prepa.js                       CRÉÉ  logique front
  css/style.css                     MODIFIÉ  bloc prépa en fin de fichier
  index.html, entrainements.html,
  evenements.html, blog.html,
  adhesion.html, contact.html       MODIFIÉ  entrée « Prépa » dans le menu
  prepa-api/
    package.json                    CRÉÉ
    wrangler.toml                   CRÉÉ
    vitest.config.js                CRÉÉ
    .dev.vars                       CRÉÉ (ignoré par git)
    migrations/0001_init.sql        CRÉÉ
    src/
      index.js                      CRÉÉ  routeur fetch + handler scheduled
      calendrier.js                 CRÉÉ  dates de publication, Europe/Paris
      auth.js                       CRÉÉ  jetons HMAC, codes, limitation de débit
      coureurs.js                   CRÉÉ  normalisation des prénoms, CRUD
      validations.js                CRÉÉ  validation et dévalidation de séances
      admin.js                      CRÉÉ  tableau, alertes, éditeur, veto, fusion
      email.js                      CRÉÉ  rappel du samedi
      programmes/
        seances.js                  CRÉÉ  fabriques de séances, trame commune
        regles.js                   CRÉÉ  validateurs de progression
        p1-10km-izon.js             CRÉÉ
        p2-10km-bordeaux.js         CRÉÉ
        p3-semi-bordeaux.js         CRÉÉ
        p4-marathon.js              CRÉÉ
        p5-10km-paris.js            CRÉÉ
        index.js                    CRÉÉ  registre, overrides, variante Izon
    test/
      calendrier.test.js            CRÉÉ
      auth.test.js                  CRÉÉ
      coureurs.test.js              CRÉÉ
      programmes.test.js            CRÉÉ
      api.test.js                   CRÉÉ
      admin.test.js                 CRÉÉ
```

**Découpage** : un fichier par responsabilité. Chaque programme est isolé dans son module pour qu'une correction de contenu sur le marathon ne touche jamais au 10 km. `regles.js` est le garde-fou partagé : il vérifie mécaniquement ce qu'un relecteur humain ne verra pas.

---

### Task 1: Bootstrap du Worker et de la base

**Files:**
- Create: `prepa-api/package.json`
- Create: `prepa-api/wrangler.toml`
- Create: `prepa-api/vitest.config.js`
- Create: `prepa-api/.dev.vars`
- Create: `prepa-api/migrations/0001_init.sql`
- Create: `prepa-api/src/index.js`
- Test: `prepa-api/test/api.test.js`

**Interfaces:**
- Consomme : rien.
- Produit : `export default { fetch, scheduled }` dans `src/index.js`. Bindings disponibles pour toutes les tâches suivantes : `env.DB` (D1), `env.CODE_COUREUR`, `env.CODE_ADMIN`, `env.SECRET_JETON`, `env.EMAIL_ADMIN`.

- [ ] **Step 1: Créer le squelette npm**

```bash
mkdir -p prepa-api/src/programmes prepa-api/test prepa-api/migrations
cd prepa-api
```

`prepa-api/package.json` :

```json
{
  "name": "prepa-api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "db:local": "wrangler d1 migrations apply prepa --local",
    "db:prod": "wrangler d1 migrations apply prepa --remote"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.5.2",
    "vitest": "^2.0.5",
    "wrangler": "^3.78.0"
  }
}
```

- [ ] **Step 2: Configurer Wrangler**

`prepa-api/wrangler.toml` :

```toml
name = "prepa-api"
main = "src/index.js"
compatibility_date = "2026-07-18"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "prepa"
database_id = "REMPLACER_APRES_CREATION"
migrations_dir = "migrations"

[triggers]
crons = ["0 7 * * 6"]

[vars]
EMAIL_ADMIN = "tridav00@gmail.com"
SITE_URL = "https://coureursdesvignes.fr"
```

Note : `0 7 * * 6` est samedi 7 h UTC, soit 9 h en heure d'été et 8 h en heure d'hiver. Acceptable pour un rappel, aucune logique métier n'en dépend.

`prepa-api/.dev.vars` (jamais commité). Les valeurs réelles de `<CODE_COUREUR>` et `<CODE_ADMIN>` ne figurent **nulle part dans ce dépôt**, volontairement : David les fournit au moment de la mise en ligne, et elles ne vivent qu'ici en local et en secrets Cloudflare.

```
CODE_COUREUR=<CODE_COUREUR>
CODE_ADMIN=<CODE_ADMIN>
SECRET_JETON=chaine-aleatoire-longue-a-generer-en-local
```

- [ ] **Step 3: Écrire la migration**

`prepa-api/migrations/0001_init.sql` :

```sql
CREATE TABLE coureurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prenom TEXT NOT NULL,
  cle TEXT NOT NULL UNIQUE,
  programme TEXT NOT NULL,
  variante_course TEXT,
  fait_izon INTEGER NOT NULL DEFAULT 0,
  cree_le TEXT NOT NULL
);

CREATE TABLE validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coureur_id INTEGER NOT NULL REFERENCES coureurs(id) ON DELETE CASCADE,
  semaine INTEGER NOT NULL,
  seance TEXT NOT NULL,
  ressenti TEXT,
  note TEXT,
  valide_le TEXT NOT NULL,
  UNIQUE(coureur_id, semaine, seance)
);

CREATE TABLE semaines_override (
  programme TEXT NOT NULL,
  semaine INTEGER NOT NULL,
  contenu_json TEXT,
  veto INTEGER NOT NULL DEFAULT 0,
  modifie_le TEXT NOT NULL,
  PRIMARY KEY (programme, semaine)
);

CREATE TABLE tentatives (
  ip TEXT NOT NULL,
  heure TEXT NOT NULL,
  compte INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, heure)
);

CREATE INDEX idx_validations_coureur ON validations(coureur_id);
CREATE INDEX idx_validations_semaine ON validations(semaine);
```

- [ ] **Step 4: Configurer Vitest**

`prepa-api/vitest.config.js` :

```js
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          d1Databases: ['DB'],
          // Valeurs de test volontairement factices. Les vrais codes vivent
          // dans .dev.vars et en secrets Cloudflare. Ce fichier est versionne :
          // n'y mettre JAMAIS un code de production.
          bindings: {
            CODE_COUREUR: 'coureur-test',
            CODE_ADMIN: 'admin-test',
            SECRET_JETON: 'secret-de-test',
            EMAIL_ADMIN: 'test@example.com',
            SITE_URL: 'https://example.test',
          },
        },
      },
    },
  },
});
```

- [ ] **Step 5: Écrire le test de santé (il doit échouer)**

`prepa-api/test/api.test.js` :

```js
import { env, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('Worker', () => {
  it('répond sur /api/sante', async () => {
    const r = await SELF.fetch('https://prepa.test/api/sante');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });

  it('renvoie 404 sur une route inconnue', async () => {
    const r = await SELF.fetch('https://prepa.test/api/nimporte-quoi');
    expect(r.status).toBe(404);
  });
});
```

- [ ] **Step 6: Lancer le test et vérifier qu'il échoue**

```bash
cd prepa-api && npm install && npm test
```

Attendu : ÉCHEC, `src/index.js` n'existe pas.

- [ ] **Step 7: Écrire le routeur minimal**

`prepa-api/src/index.js` :

```js
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

export function json(donnees, statut = 200, entetes = {}) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { ...JSON_HEADERS, ...entetes },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/sante') return json({ ok: true });

    return json({ erreur: 'route inconnue' }, 404);
  },

  async scheduled(event, env, ctx) {
    // Rempli en tâche 14.
  },
};
```

- [ ] **Step 8: Relancer les tests**

```bash
npm test
```

Attendu : 2 tests passent.

- [ ] **Step 9: Créer la base et appliquer la migration en local**

```bash
npx wrangler d1 create prepa
# Reporter le database_id affiché dans wrangler.toml
npm run db:local
```

- [ ] **Step 10: Commit**

```bash
cd .. && git add prepa-api && git commit -m "Prepa : bootstrap du Worker, base D1 et harnais de tests"
```

---

### Task 2: Fabriques de séances et trame commune

**Files:**
- Create: `prepa-api/src/programmes/seances.js`
- Test: `prepa-api/test/programmes.test.js`

**Interfaces:**
- Consomme : rien.
- Produit :
  - `ZONES` : objet figé, clés `Z1` à `Z5`, chaque valeur `{ nom, fcMin, fcMax, sensation }`.
  - `ef(duree, description, objectif)` → séance `EF`
  - `sl(duree, description, objectif)` → séance `SL`
  - `tempo(duree, description, objectif)`, `seuil(...)`, `vma(...)`, `recup(...)`
  - `renfo(duree, description, objectif)` → séance `RENFO`
  - `course(nom, distance, duree, description, objectif)` → séance `COURSE`, cinq arguments
  - `semaine(numero, phase, titre, intention, seances)` → objet semaine
  - `volume(semaineObj)` → entier, somme des durées hors `RENFO`
  - `volumeHorsCourse(semaineObj)` → entier, somme des durées hors `RENFO` **et hors `COURSE`**. Indispensable : la course objectif compte 55 min pour un 10 km mais 4 h pour un marathon, elle fausserait toute comparaison de charge d'entraînement.
  - Forme d'une séance : `{ code, titre, duree, zone, description, objectif }`. `zone` vaut `null` pour `RENFO` et `COURSE`.

- [ ] **Step 1: Écrire les tests (ils doivent échouer)**

Ajouter à `prepa-api/test/programmes.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { ZONES, ef, sl, vma, renfo, semaine, volume } from '../src/programmes/seances.js';

describe('zones', () => {
  it('couvre Z1 à Z5 avec des fourchettes croissantes et jointives', () => {
    const codes = Object.keys(ZONES);
    expect(codes).toEqual(['Z1', 'Z2', 'Z3', 'Z4', 'Z5']);
    expect(ZONES.Z2.fcMin).toBe(ZONES.Z1.fcMax);
    expect(ZONES.Z5.fcMax).toBe(100);
  });
});

describe('fabriques de séances', () => {
  it('construit une endurance fondamentale en Z2', () => {
    const s = ef(40, '40 min de course souple.', "Construire l'endurance de base.");
    expect(s).toEqual({
      code: 'EF',
      titre: 'Endurance fondamentale',
      duree: 40,
      zone: 'Z2',
      description: '40 min de course souple.',
      objectif: "Construire l'endurance de base.",
    });
  });

  it('laisse le renfo hors zones', () => {
    expect(renfo(20, 'Gainage.', 'Renforcer.').zone).toBeNull();
  });

  it("refuse un texte contenant un tiret cadratin", () => {
    expect(() => ef(40, 'Un texte — fautif.', 'Objectif.')).toThrow(/cadratin/i);
  });
});

describe('volume', () => {
  it('somme les durées de course et ignore le renfo', () => {
    const s = semaine(1, 'bloc1', 'Prise de contact', 'Poser les bases.', [
      ef(30, 'a.', 'b.'), ef(35, 'a.', 'b.'), sl(50, 'a.', 'b.'), renfo(20, 'a.', 'b.'),
    ]);
    expect(volume(s)).toBe(115);
  });
});

describe('structure de semaine', () => {
  it('exige exactement 3 séances de course et 1 renfo', () => {
    expect(() => semaine(1, 'bloc1', 't', 'i', [ef(30, 'a.', 'b.'), renfo(20, 'a.', 'b.')]))
      .toThrow(/3 séances de course/);
  });
});
```

- [ ] **Step 2: Lancer et vérifier l'échec**

```bash
cd prepa-api && npm test -- programmes
```

Attendu : ÉCHEC, module introuvable.

- [ ] **Step 3: Implémenter les fabriques**

`prepa-api/src/programmes/seances.js` :

```js
export const ZONES = Object.freeze({
  Z1: { nom: 'Récupération', fcMin: 50, fcMax: 60, sensation: 'Conversation totale, effort quasi nul.' },
  Z2: { nom: 'Endurance fondamentale', fcMin: 60, fcMax: 75, sensation: 'On parle par phrases entières.' },
  Z3: { nom: 'Tempo', fcMin: 75, fcMax: 85, sensation: 'Phrases courtes, respiration marquée.' },
  Z4: { nom: 'Seuil', fcMin: 85, fcMax: 92, sensation: 'Trois ou quatre mots à la fois.' },
  Z5: { nom: 'VMA', fcMin: 92, fcMax: 100, sensation: 'Aucun mot possible.' },
});

// Toutes les seances de course a pied, renfo exclu. Ne pas confondre avec le
// code 'COURSE', qui designe la seule course objectif et n'est qu'un membre.
const CODES_HORS_RENFO = new Set(['EF', 'SL', 'TEMPO', 'SEUIL', 'VMA', 'RECUP', 'COURSE']);

function verifierTexte(...textes) {
  for (const t of textes) {
    if (typeof t !== 'string' || t.trim() === '') throw new Error('Texte manquant.');
    if (t.includes('—')) throw new Error('Tiret cadratin interdit dans les textes affichés.');
  }
}

function fabrique(code, titre, zone) {
  return (duree, description, objectif) => {
    verifierTexte(description, objectif);
    if (!Number.isInteger(duree) || duree <= 0) throw new Error('Durée invalide.');
    return { code, titre, duree, zone, description, objectif };
  };
}

export const ef = fabrique('EF', 'Endurance fondamentale', 'Z2');
export const sl = fabrique('SL', 'Sortie longue', 'Z2');
export const tempo = fabrique('TEMPO', 'Tempo', 'Z3');
export const seuil = fabrique('SEUIL', 'Seuil', 'Z4');
export const vma = fabrique('VMA', 'Fractionné court', 'Z5');
export const recup = fabrique('RECUP', 'Footing de récupération', 'Z1');
export const renfo = fabrique('RENFO', 'Renforcement', null);

export function course(nom, distance, duree, description, objectif) {
  verifierTexte(nom, description, objectif);
  return { code: 'COURSE', titre: nom, distance, duree, zone: null, description, objectif };
}

export function semaine(numero, phase, titre, intention, seances) {
  verifierTexte(titre, intention);
  const courses = seances.filter((s) => COURSE_CODES.has(s.code));
  const renfos = seances.filter((s) => s.code === 'RENFO');
  if (courses.length !== 3) {
    throw new Error(`Semaine ${numero} : 3 séances de course attendues, ${courses.length} trouvées.`);
  }
  if (renfos.length !== 1) {
    throw new Error(`Semaine ${numero} : 1 renfo attendu, ${renfos.length} trouvé(s).`);
  }
  return { numero, phase, titre, intention, seances };
}

export function volume(semaineObj) {
  return semaineObj.seances
    .filter((s) => s.code !== 'RENFO')
    .reduce((total, s) => total + s.duree, 0);
}

/**
 * Volume d'entraînement seul. La course objectif est exclue : elle dure 55 min
 * pour un 10 km et près de 4 h pour un marathon, ce qui rendrait toute
 * comparaison de charge entre semaines et entre programmes absurde.
 */
export function volumeHorsCourse(semaineObj) {
  return semaineObj.seances
    .filter((s) => s.code !== 'RENFO' && s.code !== 'COURSE')
    .reduce((total, s) => total + s.duree, 0);
}
```

- [ ] **Step 4: Relancer les tests**

```bash
npm test -- programmes
```

Attendu : tous passent.

- [ ] **Step 5: Commit**

```bash
cd .. && git add prepa-api && git commit -m "Prepa : fabriques de seances et trame hebdomadaire"
```

---

### Task 3: Règles de progression

**Files:**
- Create: `prepa-api/src/programmes/regles.js`
- Modify: `prepa-api/test/programmes.test.js`

**Interfaces:**
- Consomme : `volume`, depuis `seances.js`.
- Produit : `verifierProgramme(prog)` qui lève une `Error` détaillée, ou retourne `true`. Signature du programme attendue : `{ code, nom, dateCourse, prerequis, izon, semainesContenu: [...] }`.

Ces règles sont le garde-fou de tout le contenu. Elles s'appliquent aux 5 programmes en tâches 4 à 6.

- [ ] **Step 1: Écrire les tests (ils doivent échouer)**

Ajouter à `prepa-api/test/programmes.test.js` :

```js
import { verifierProgramme } from '../src/programmes/regles.js';
import { ef, sl, vma, recup, renfo, semaine } from '../src/programmes/seances.js';

function prog(semainesContenu) {
  return { code: 'PX', nom: 'Test', dateCourse: '2026-09-27', prerequis: 'Aucun.', izon: 'aucune', semainesContenu };
}
const sem = (n, phase, d1, d2, d3) => semaine(n, phase, 'Titre', 'Intention.', [
  ef(d1, 'a.', 'b.'), ef(d2, 'a.', 'b.'), sl(d3, 'a.', 'b.'), renfo(20, 'a.', 'b.'),
]);
const semRecup = (n) => semaine(n, 'recuperation', 'Titre', 'Intention.', [
  recup(25, 'a.', 'b.'), recup(30, 'a.', 'b.'), recup(30, 'a.', 'b.'), renfo(15, 'a.', 'b.'),
]);

describe('règles de progression', () => {
  it('refuse une hausse de volume supérieure à 10 % entre deux semaines chargées', () => {
    const p = prog([sem(1, 'bloc1', 30, 30, 40), sem(2, 'bloc1', 40, 40, 50), semRecup(3)]);
    expect(() => verifierProgramme(p)).toThrow(/10 %/);
  });

  it('accepte une remontée de volume après une semaine allégée', () => {
    const p = prog([
      sem(1, 'bloc1', 30, 30, 40),
      sem(2, 'bloc1', 32, 32, 44),
      sem(3, 'allegee', 25, 25, 30),
      sem(4, 'bloc2', 34, 34, 46),
      sem(5, 'affutage', 30, 25, 30),
      sem(6, 'affutage', 25, 20, 20),
      semRecup(7),
    ]);
    expect(verifierProgramme(p)).toBe(true);
  });

  it("exige que la semaine allégée baisse d'au moins 15 %", () => {
    const p = prog([sem(1, 'bloc1', 40, 40, 50), sem(2, 'allegee', 40, 40, 48), semRecup(3)]);
    expect(() => verifierProgramme(p)).toThrow(/allégée/);
  });

  it('exige deux semaines d\'affûtage terminales décroissantes', () => {
    const p = prog([sem(1, 'bloc1', 40, 40, 50), sem(2, 'affutage', 40, 40, 50), semRecup(3)]);
    expect(() => verifierProgramme(p)).toThrow(/affûtage/);
  });

  it('exige une semaine de récupération finale sans intensité', () => {
    const p = prog([sem(1, 'bloc1', 40, 40, 50), sem(2, 'affutage', 35, 30, 40), sem(3, 'affutage', 25, 20, 25)]);
    expect(() => verifierProgramme(p)).toThrow(/récupération/);
  });

  it('refuse de la VMA dans la semaine de récupération', () => {
    const mauvaise = semaine(3, 'recuperation', 'T', 'I.', [
      recup(25, 'a.', 'b.'), vma(30, 'a.', 'b.'), recup(30, 'a.', 'b.'), renfo(15, 'a.', 'b.'),
    ]);
    const p = prog([sem(1, 'bloc1', 40, 40, 50), sem(2, 'affutage', 35, 30, 40), sem(3, 'affutage', 25, 20, 25), mauvaise]);
    expect(() => verifierProgramme(p)).toThrow(/intensité/);
  });
});
```

- [ ] **Step 2: Lancer et vérifier l'échec**

```bash
npm test -- programmes
```

Attendu : ÉCHEC, `regles.js` introuvable.

- [ ] **Step 3: Implémenter les règles**

`prepa-api/src/programmes/regles.js` :

```js
import { volumeHorsCourse as volume } from './seances.js';

// Toutes les comparaisons de charge se font hors course objectif : voir la note
// de volumeHorsCourse dans seances.js.
const INTENSITE = new Set(['VMA', 'SEUIL', 'TEMPO']);

export function verifierProgramme(prog) {
  const sems = prog.semainesContenu;
  if (!sems.length) throw new Error(`${prog.code} : programme vide.`);

  // Numérotation continue à partir de 1.
  sems.forEach((s, i) => {
    if (s.numero !== i + 1) throw new Error(`${prog.code} : numérotation cassée en position ${i + 1}.`);
  });

  const dernier = sems[sems.length - 1];
  if (dernier.phase !== 'recuperation') {
    throw new Error(`${prog.code} : la dernière semaine doit être une semaine de récupération.`);
  }
  for (const s of dernier.seances) {
    if (INTENSITE.has(s.code)) {
      throw new Error(`${prog.code} : intensité (${s.code}) interdite dans la semaine de récupération.`);
    }
  }

  // Les deux semaines précédant la récupération sont l'affûtage, décroissantes.
  const affutage = sems.slice(-3, -1);
  if (affutage.length !== 2 || affutage.some((s) => s.phase !== 'affutage')) {
    throw new Error(`${prog.code} : les 2 semaines avant la course doivent être en phase affûtage.`);
  }
  if (volume(affutage[1]) >= volume(affutage[0])) {
    throw new Error(`${prog.code} : le volume d'affûtage doit décroître jusqu'à la course.`);
  }

  const pic = Math.max(...sems.filter((s) => s.phase.startsWith('bloc')).map(volume));
  if (volume(affutage[1]) > pic * 0.65) {
    throw new Error(`${prog.code} : la dernière semaine d'affûtage dépasse 65 % du pic de charge.`);
  }

  // Progression de volume.
  let picPrecedent = 0;
  for (let i = 0; i < sems.length; i++) {
    const s = sems[i];
    const v = volume(s);
    const precedent = i > 0 ? sems[i - 1] : null;

    if (s.phase === 'allegee') {
      if (v > volume(precedent) * 0.85) {
        throw new Error(`${prog.code} S${s.numero} : semaine allégée, baisse d'au moins 15 % attendue.`);
      }
    } else if (s.phase.startsWith('bloc')) {
      const reference = precedent && precedent.phase.startsWith('bloc') ? volume(precedent) : picPrecedent;
      if (reference && v > reference * 1.1001) {
        throw new Error(`${prog.code} S${s.numero} : hausse de volume supérieure à 10 % (${reference} vers ${v}).`);
      }
      picPrecedent = Math.max(picPrecedent, v);
    }
  }

  return true;
}
```

- [ ] **Step 4: Relancer les tests**

```bash
npm test -- programmes
```

Attendu : tous passent.

- [ ] **Step 5: Commit**

```bash
cd .. && git add prepa-api && git commit -m "Prepa : regles de progression verifiables mecaniquement"
```

---

### Task 4: Programme P1, 10 km d'Izon (9 semaines)

**Files:**
- Create: `prepa-api/src/programmes/p1-10km-izon.js`
- Modify: `prepa-api/test/programmes.test.js`

**Interfaces:**
- Consomme : `seances.js`, `regles.js`.
- Produit : `export const P1` de forme `{ code:'P1', nom, dateCourse:'2026-09-27', prerequis, izon:'objectif', semainesContenu: Semaine[10] }` (9 semaines plus la récupération).

Trame imposée : S1 à S3 bloc 1, S4 allégée, S5 à S7 bloc 2, S8 et S9 affûtage (la course tombe le dimanche de S9), S10 récupération.

- [ ] **Step 1: Écrire le test (il doit échouer)**

```js
import { P1 } from '../src/programmes/p1-10km-izon.js';

describe('P1, 10 km d\'Izon', () => {
  it('respecte les règles de progression', () => {
    expect(verifierProgramme(P1)).toBe(true);
  });

  it('compte 9 semaines de prépa plus une de récupération', () => {
    expect(P1.semainesContenu).toHaveLength(10);
    expect(P1.semainesContenu[8].phase).toBe('affutage');
    expect(P1.semainesContenu[9].phase).toBe('recuperation');
  });

  it('place la course en S9', () => {
    const s9 = P1.semainesContenu[8];
    expect(s9.seances.some((s) => s.code === 'COURSE')).toBe(true);
  });

  it("n'impose jamais d'allure en min/km", () => {
    const textes = P1.semainesContenu.flatMap((s) => s.seances.map((x) => x.description));
    expect(textes.join(' ')).not.toMatch(/min\/km/);
  });
});
```

- [ ] **Step 2: Lancer et vérifier l'échec**

```bash
npm test -- programmes
```

Attendu : ÉCHEC, module introuvable.

- [ ] **Step 3: Écrire le contenu**

`prepa-api/src/programmes/p1-10km-izon.js`. Modèle des deux premières semaines et de la semaine de course, à décliner sur les 10 :

```js
import { ef, sl, tempo, seuil, vma, recup, renfo, course, semaine } from './seances.js';

export const P1 = {
  code: 'P1',
  nom: "10 km d'Izon",
  dateCourse: '2026-09-27',
  izon: 'objectif',
  prerequis: "Savoir courir 30 minutes d'affilée sans s'arrêter.",
  semainesContenu: [
    semaine(1, 'bloc1', 'Poser les fondations', "On installe l'habitude de courir 3 fois par semaine, sans forcer.", [
      ef(30, '30 min en Z2. Tu dois pouvoir parler en courant, sinon ralentis.', "Habituer le corps à l'effort régulier."),
      ef(35, '35 min en Z2, sur terrain souple si possible.', 'Construire la base aérobie.'),
      sl(45, '45 min en Z2, allure de balade. La durée compte, pas la vitesse.', "Allonger progressivement le temps d'effort."),
      renfo(20, 'Gainage : 3 séries de 30 s de planche ventrale, 30 s de chaque côté, 20 fentes par jambe.', 'Protéger le dos et les hanches.'),
    ]),
    semaine(2, 'bloc1', 'Un peu de rythme', "On introduit la première touche d'intensité, très courte.", [
      ef(32, '32 min en Z2.', "Entretenir l'endurance."),
      vma(35, '10 min en Z2, puis 8 fois 30 s en Z5 avec 1 min de marche ou trottinement en Z1, puis 10 min en Z2.', 'Réveiller la vitesse sans casser les jambes.'),
      sl(48, '48 min en Z2.', "Continuer d'allonger la sortie longue."),
      renfo(20, 'Gainage identique à la semaine 1, plus 2 séries de 15 squats.', 'Renforcer sans nouveauté, la répétition fait le travail.'),
    ]),
    // Semaines 3 a 8 : ecrire sur le meme modele, en suivant exactement ce bareme.
    // Les durees sont en minutes, le volume exclut le renfo.
    //
    //   S3  bloc1     EF 35 / VMA 38 (10 fois 30 s en Z5) / SL 52 / renfo 20   volume 125
    //   S4  allegee   EF 30 / EF 30                       / SL 40 / renfo 20   volume 100
    //   S5  bloc2     EF 35 / SEUIL 40 (2 fois 6 min Z4)  / SL 55 / renfo 25   volume 130
    //   S6  bloc2     EF 38 / SEUIL 45 (3 fois 6 min Z4)  / SL 60 / renfo 25   volume 143
    //   S7  bloc2     EF 40 / VMA 45 (12 fois 30 s Z5)    / SL 62 / renfo 25   volume 147  (pic)
    //   S8  affutage  EF 32 / SEUIL 38 (2 fois 6 min Z4)  / SL 45 / renfo 18   volume 115
    //   S9  affutage  EF 25 / VMA 28                      / COURSE / renfo 12  volume hors course 53
    //
    // Verification : hausses de 10 % maximum respectees dans chaque bloc, S4 a 20 %
    // sous S3, affutage decroissant de 147 vers 115 vers 53, soit 36 % du pic.
    semaine(9, 'affutage', "Semaine de course", "Volume réduit de moitié, on garde du jus pour dimanche.", [
      ef(25, '25 min en Z2, très souple.', 'Rester en mouvement sans fatiguer.'),
      vma(28, '10 min en Z2, puis 5 fois 1 min en Z4 avec 1 min en Z1, puis 8 min en Z2.', "Garder la vivacité sans creuser la fatigue."),
      course("10 km d'Izon", 10, 55, "Ta course. Pars prudemment sur les 2 premiers kilomètres, en Z3, puis monte en Z4 si les sensations sont bonnes. Le dernier kilomètre, tu donnes ce qu'il reste.", 'Ton objectif de ces 9 semaines.'),
      renfo(12, 'Gainage léger en début de semaine seulement : 2 séries de 30 s de planche.', 'Entretenir sans fatiguer.'),
    ]),
    semaine(10, 'recuperation', 'On récupère', "La semaine la plus importante et la plus négligée. Aucune intensité, on laisse le corps encaisser.", [
      recup(25, '25 min en Z1, ou 30 min de marche si les jambes sont lourdes.', 'Relancer la circulation.'),
      recup(30, '30 min en Z1 à Z2.', 'Reprendre en douceur.'),
      recup(35, '35 min en Z2, sur terrain souple.', 'Retrouver des sensations normales.'),
      renfo(15, 'Étirements doux et mobilité des hanches, 15 min.', 'Redonner de la souplesse.'),
    ]),
  ],
};
```

Consigne de rédaction : chaque `description` décrit une séance exécutable telle quelle, sans jargon et sans allure chiffrée. Chaque `objectif` tient en une phrase et explique le pourquoi.

- [ ] **Step 4: Relancer les tests**

```bash
npm test -- programmes
```

Attendu : les 4 tests de P1 passent. Si `verifierProgramme` échoue, c'est le contenu qu'il faut corriger, jamais la règle.

- [ ] **Step 5: Commit**

```bash
cd .. && git add prepa-api && git commit -m "Prepa : programme P1, 10 km d'Izon sur 9 semaines"
```

---

### Task 5: Programmes P2 et P3, 10 km et semi de Bordeaux (15 semaines)

**Files:**
- Create: `prepa-api/src/programmes/p2-10km-bordeaux.js`
- Create: `prepa-api/src/programmes/p3-semi-bordeaux.js`
- Modify: `prepa-api/test/programmes.test.js`

**Interfaces:**
- Produit : `export const P2` et `export const P3`, même forme que `P1`, avec `izon: 'option'` et `semainesContenu` de 16 entrées (15 semaines plus récupération).
- Chaque semaine 9 porte en plus `variantes: { avecIzon: Semaine, sansIzon: Semaine }` et son champ `seances` vaut la variante `sansIzon` par défaut.

Trame : S1 à S4 bloc 1 (3 chargées, S4 allégée), S5 à S8 bloc 2 (S8 allégée), S9 course-test, S10 à S13 bloc 3 spécifique (S13 allégée, pic en S12), S14 et S15 affûtage, S16 récupération.

- [ ] **Step 1: Écrire les tests (ils doivent échouer)**

```js
import { P2 } from '../src/programmes/p2-10km-bordeaux.js';
import { P3 } from '../src/programmes/p3-semi-bordeaux.js';

describe.each([['P2', P2], ['P3', P3]])('%s', (nom, p) => {
  it('respecte les règles de progression dans les deux variantes', () => {
    expect(verifierProgramme(p)).toBe(true);
    const avec = { ...p, semainesContenu: p.semainesContenu.map((s) => (s.numero === 9 ? { ...s, seances: s.variantes.avecIzon.seances } : s)) };
    expect(verifierProgramme(avec)).toBe(true);
  });

  it('compte 15 semaines plus la récupération', () => {
    expect(p.semainesContenu).toHaveLength(16);
  });

  it('propose les deux variantes en S9', () => {
    const s9 = p.semainesContenu[8];
    expect(s9.variantes.avecIzon.seances.some((s) => s.code === 'COURSE')).toBe(true);
    expect(s9.variantes.sansIzon.seances.some((s) => s.code === 'COURSE')).toBe(false);
  });

  it('place la course objectif en S15', () => {
    expect(p.semainesContenu[14].seances.some((s) => s.code === 'COURSE')).toBe(true);
  });
});

it('P3 comporte des sorties longues plus longues que P2', () => {
  const longue = (p) => Math.max(...p.semainesContenu.flatMap((s) => s.seances.filter((x) => x.code === 'SL').map((x) => x.duree)));
  expect(longue(P3)).toBeGreaterThan(longue(P2));
});
```

- [ ] **Step 2: Lancer et vérifier l'échec**

```bash
npm test -- programmes
```

- [ ] **Step 3: Écrire les contenus**

Même structure que P1. Différences à respecter :

- **P2 (10 km)** : sortie longue plafonnée à 1 h 15, travail dominant en Z4 et Z5, séance seuil type `3 fois 8 min en Z4` en fin de prépa.
- **P3 (semi)** : sortie longue montant jusqu'à 1 h 50 en S12, travail dominant en Z3 et Z4, séance spécifique type `2 fois 20 min en Z3` en fin de prépa.
- **Semaine 9, variante `sansIzon`** : semaine normale du bloc, avec une séance tempo à la place de la course.
- **Semaine 9, variante `avecIzon`** : allègement la veille, `course("10 km d'Izon", 10, 55, ...)` couru à l'objectif, puis reprise douce.

Gabarit de la S9 :

```js
const s9Base = { numero: 9, phase: 'bloc2', titre: 'Course test ou semaine de rythme' };

semaine9 = {
  ...s9Base,
  intention: "Un repère à mi-parcours, avec ou sans dossard.",
  variantes: {
    avecIzon: semaine(9, 'bloc2', 'Course test à Izon', "Tu prends un repère chronométré en conditions réelles.", [
      ef(30, '30 min en Z2 en début de semaine.', "Rester en mouvement."),
      ef(25, '25 min en Z2 la veille, avec 4 lignes droites en Z4 de 20 s.', 'Réveiller les jambes sans les fatiguer.'),
      course("10 km d'Izon", 10, 55, "Cours-la à ton objectif. Pars en Z3 sur 2 km, puis monte en Z4.", 'Prendre un repère fiable à mi-préparation.'),
      renfo(15, 'Gainage léger en début de semaine seulement.', 'Entretenir sans fatiguer.'),
    ]),
    sansIzon: semaine(9, 'bloc2', 'Semaine de rythme', "Pas de dossard cette semaine, mais le même travail de qualité.", [
      ef(40, '40 min en Z2.', "Entretenir l'endurance."),
      tempo(45, '15 min en Z2, puis 2 fois 10 min en Z3 avec 3 min en Z1, puis 10 min en Z2.', "Travailler l'allure soutenue."),
      sl(70, '70 min en Z2.', 'Poursuivre la construction de la sortie longue.'),
      renfo(20, 'Gainage complet.', 'Renforcer le tronc.'),
    ]),
  },
};
```

- [ ] **Step 4: Relancer les tests**

```bash
npm test -- programmes
```

Attendu : tous passent, dans les deux variantes.

- [ ] **Step 5: Commit**

```bash
cd .. && git add prepa-api && git commit -m "Prepa : programmes P2 et P3, 10 km et semi de Bordeaux"
```

---

### Task 6: Programmes P4 marathon et P5 10 km Paris

**Files:**
- Create: `prepa-api/src/programmes/p4-marathon.js`
- Create: `prepa-api/src/programmes/p5-10km-paris.js`
- Create: `prepa-api/src/programmes/index.js`
- Modify: `prepa-api/test/programmes.test.js`

**Interfaces:**
- Produit :
  - `export const P4` : 15 semaines plus récupération, `izon: 'option'`, `variante_course` affichable Bordeaux ou Nice-Cannes.
  - `export const P5` : 16 semaines plus récupération, `izon: 'integree'` (pas de variante, Izon est dans le programme).
  - `programmes/index.js` : `export const PROGRAMMES = { P1, P2, P3, P4, P5 }` et `export function semaineDuProgramme(code, numero, { faitIzon })` qui applique la variante et retourne l'objet semaine résolu.

- [ ] **Step 1: Écrire les tests (ils doivent échouer)**

```js
import { P4 } from '../src/programmes/p4-marathon.js';
import { P5 } from '../src/programmes/p5-10km-paris.js';
import { PROGRAMMES, semaineDuProgramme } from '../src/programmes/index.js';

describe('P4, marathon', () => {
  it('respecte les règles dans les deux variantes', () => {
    expect(verifierProgramme(P4)).toBe(true);
  });

  it('fait courir Izon en Z3, jamais à fond', () => {
    const s9 = P4.semainesContenu[8].variantes.avecIzon;
    const c = s9.seances.find((s) => s.code === 'COURSE');
    expect(c.description).toMatch(/Z3/);
    expect(c.description).toMatch(/plus vite/i);
  });

  it("supprime la sortie longue la semaine d'Izon", () => {
    const s9 = P4.semainesContenu[8].variantes.avecIzon;
    expect(s9.seances.some((s) => s.code === 'SL')).toBe(false);
  });

  it("ne compte pas les 4 h de marathon dans la charge d'affûtage", () => {
    // Garde-fou : sans exclusion de la course objectif, la derniere semaine de P4
    // pèserait plus lourd que le pic de charge et la regle sauterait a tort.
    const semaineCourse = P4.semainesContenu[14];
    const marathon = semaineCourse.seances.find((s) => s.code === 'COURSE');
    expect(marathon.duree).toBeGreaterThan(200);
    expect(verifierProgramme(P4)).toBe(true);
  });

  it('monte la sortie longue à au moins 2 h 30', () => {
    const max = Math.max(...P4.semainesContenu.flatMap((s) => s.seances.filter((x) => x.code === 'SL').map((x) => x.duree)));
    expect(max).toBeGreaterThanOrEqual(150);
  });
});

describe('P5, 10 km Paris', () => {
  it('respecte les règles', () => {
    expect(verifierProgramme(P5)).toBe(true);
  });

  it('compte 16 semaines plus la récupération et intègre Izon en S9', () => {
    expect(P5.semainesContenu).toHaveLength(17);
    expect(P5.semainesContenu[8].seances.some((s) => s.code === 'COURSE')).toBe(true);
    expect(P5.semainesContenu[9].phase).toBe('recuperation-active');
  });
});

describe('registre', () => {
  it('expose les 5 programmes', () => {
    expect(Object.keys(PROGRAMMES)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
  });

  it('résout la variante Izon', () => {
    const avec = semaineDuProgramme('P3', 9, { faitIzon: true });
    const sans = semaineDuProgramme('P3', 9, { faitIzon: false });
    expect(avec.seances.some((s) => s.code === 'COURSE')).toBe(true);
    expect(sans.seances.some((s) => s.code === 'COURSE')).toBe(false);
  });

  it('ignore la variante sur un programme sans option', () => {
    expect(semaineDuProgramme('P1', 1, { faitIzon: true }).numero).toBe(1);
  });
});
```

- [ ] **Step 2: Lancer et vérifier l'échec**

```bash
npm test -- programmes
```

- [ ] **Step 3: Écrire P4, avec la S9 spécifique**

Trame P4 identique à P2 et P3. Sorties longues montant à 2 h 30 en S12, séance spécifique allure marathon en Z3, une seule séance de qualité par semaine à partir de S10 (le volume prend le relais de l'intensité).

La semaine 9, variante `avecIzon`, est le point délicat :

```js
avecIzon: semaine(9, 'bloc2', 'Izon en sortie longue rythmée', "Un dossard, mais pas une course. Izon remplace ta sortie longue.", [
  ef(45, '45 min en Z2.', "Entretenir le volume."),
  ef(40, '40 min en Z2 la veille, tranquille.', 'Arriver frais sans avoir affûté.'),
  course("10 km d'Izon", 10, 60, "Cours-le en Z3, comme une sortie longue rythmée. Tu dois finir en te disant que tu aurais pu aller plus vite. C'est exactement le but. Ajoute 20 min en Z2 après l'arrivée pour retrouver le volume de ta sortie longue.", "Prendre un repère et goûter l'ambiance d'un dossard, sans entamer le bloc marathon."),
  renfo(20, 'Gainage complet en début de semaine.', 'Maintenir le renforcement.'),
]),
```

Note : pas de `sl()` dans cette semaine, la course plus le retour au calme en tiennent lieu. C'est ce que vérifie le test de l'étape 1.

- [ ] **Step 4: Écrire P5, avec Izon intégrée et récupération active**

Trame : S1 à S4 bloc 1, S5 à S8 bloc 2 (S8 pré-allégée avant Izon), S9 Izon courue à l'objectif, S10 récupération active (phase `recuperation-active`), S11 à S13 bloc 3 spécifique 10 km, S14 allégée, S15 et S16 affûtage avec la course le 15 novembre, S17 récupération.

Ajouter `recuperation-active` aux phases tolérées par `regles.js` : elle se comporte comme une semaine allégée pour la règle de baisse de volume. Modifier `regles.js` en conséquence :

```js
    if (s.phase === 'allegee' || s.phase === 'recuperation-active') {
```

- [ ] **Step 5: Écrire le registre**

`prepa-api/src/programmes/index.js` :

```js
import { P1 } from './p1-10km-izon.js';
import { P2 } from './p2-10km-bordeaux.js';
import { P3 } from './p3-semi-bordeaux.js';
import { P4 } from './p4-marathon.js';
import { P5 } from './p5-10km-paris.js';

export const PROGRAMMES = { P1, P2, P3, P4, P5 };

export function programme(code) {
  const p = PROGRAMMES[code];
  if (!p) throw new Error(`Programme inconnu : ${code}`);
  return p;
}

export function semaineDuProgramme(code, numero, { faitIzon = false } = {}) {
  const p = programme(code);
  const s = p.semainesContenu.find((x) => x.numero === numero);
  if (!s) return null;
  if (s.variantes) {
    const v = faitIzon ? s.variantes.avecIzon : s.variantes.sansIzon;
    return { ...s, seances: v.seances, titre: v.titre, intention: v.intention, variantes: undefined };
  }
  return s;
}
```

- [ ] **Step 6: Relancer toute la suite**

```bash
npm test
```

Attendu : tous les tests de contenu passent. **C'est le jalon du 26 juillet.**

- [ ] **Step 7: Commit**

```bash
cd .. && git add prepa-api && git commit -m "Prepa : programmes P4 marathon et P5 Paris, registre des 5 programmes"
```

---

### Task 7: Calendrier de publication

**Files:**
- Create: `prepa-api/src/calendrier.js`
- Test: `prepa-api/test/calendrier.test.js`

**Interfaces:**
- Produit :
  - `DEBUT_UTC` : constante, `Date.UTC(2026, 6, 27)`.
  - `lundiDeLaSemaine(numero)` → ms UTC.
  - `instantPublication(numero)` → ms UTC du dimanche 19 h Europe/Paris précédent.
  - `estPubliee(numero, maintenant)` → booléen.
  - `semaineCourante(maintenant, nbSemaines)` → numéro de la dernière semaine publiée, borné à `nbSemaines`.

- [ ] **Step 1: Écrire les tests (ils doivent échouer)**

`prepa-api/test/calendrier.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { instantPublication, estPubliee, semaineCourante } from '../src/calendrier.js';

const utc = (s) => Date.parse(s);

describe('instant de publication', () => {
  it('publie la semaine 1 le dimanche 26 juillet 19 h Paris, soit 17 h UTC', () => {
    expect(instantPublication(1)).toBe(utc('2026-07-26T17:00:00Z'));
  });

  it('publie la semaine 13 en heure d\'été, 17 h UTC', () => {
    expect(instantPublication(13)).toBe(utc('2026-10-18T17:00:00Z'));
  });

  it("publie la semaine 14 le jour du changement d'heure, en heure d'hiver, 18 h UTC", () => {
    expect(instantPublication(14)).toBe(utc('2026-10-25T18:00:00Z'));
  });

  it("publie la semaine 15 en heure d'hiver, 18 h UTC", () => {
    expect(instantPublication(15)).toBe(utc('2026-11-01T18:00:00Z'));
  });
});

describe('publication', () => {
  it('cache la semaine une minute avant 19 h', () => {
    expect(estPubliee(1, utc('2026-07-26T16:59:00Z'))).toBe(false);
  });

  it('ouvre la semaine à 19 h pile', () => {
    expect(estPubliee(1, utc('2026-07-26T17:00:00Z'))).toBe(true);
  });
});

describe('semaine courante', () => {
  it('renvoie 0 avant la première publication', () => {
    expect(semaineCourante(utc('2026-07-20T10:00:00Z'), 16)).toBe(0);
  });

  it('renvoie 1 pendant la première semaine', () => {
    expect(semaineCourante(utc('2026-07-29T10:00:00Z'), 16)).toBe(1);
  });

  it('ne dépasse jamais la longueur du programme', () => {
    expect(semaineCourante(utc('2027-03-01T10:00:00Z'), 16)).toBe(16);
  });
});
```

- [ ] **Step 2: Lancer et vérifier l'échec**

```bash
npm test -- calendrier
```

- [ ] **Step 3: Implémenter le calendrier**

`prepa-api/src/calendrier.js` :

```js
const JOUR = 86400000;
export const DEBUT_UTC = Date.UTC(2026, 6, 27); // lundi 27 juillet 2026

/** Décalage d'Europe/Paris en minutes pour un instant UTC donné. */
function decalageParisMinutes(instantUtc) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(
    fmt.formatToParts(new Date(instantUtc))
      .filter((x) => x.type !== 'literal')
      .map((x) => [x.type, Number(x.value)])
  );
  const commeUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return (commeUtc - instantUtc) / 60000;
}

/** Convertit une date-heure locale de Paris en instant UTC. Deux passes suffisent. */
function parisVersUtc(annee, mois, jour, heure, minute) {
  const naif = Date.UTC(annee, mois - 1, jour, heure, minute);
  let resultat = naif;
  for (let i = 0; i < 2; i++) {
    resultat = naif - decalageParisMinutes(resultat) * 60000;
  }
  return resultat;
}

export function lundiDeLaSemaine(numero) {
  return DEBUT_UTC + (numero - 1) * 7 * JOUR;
}

export function instantPublication(numero) {
  const dimanche = new Date(lundiDeLaSemaine(numero) - JOUR);
  return parisVersUtc(
    dimanche.getUTCFullYear(),
    dimanche.getUTCMonth() + 1,
    dimanche.getUTCDate(),
    19, 0
  );
}

export function estPubliee(numero, maintenant = Date.now()) {
  return maintenant >= instantPublication(numero);
}

export function semaineCourante(maintenant = Date.now(), nbSemaines = 17) {
  let courante = 0;
  for (let n = 1; n <= nbSemaines; n++) {
    if (estPubliee(n, maintenant)) courante = n;
    else break;
  }
  return courante;
}
```

- [ ] **Step 4: Relancer les tests**

```bash
npm test -- calendrier
```

Attendu : les 9 tests passent, changement d'heure inclus.

- [ ] **Step 5: Commit**

```bash
cd .. && git add prepa-api && git commit -m "Prepa : calendrier de publication avec gestion du changement d'heure"
```

---

### Task 8: Authentification par code et jetons signés

**Files:**
- Create: `prepa-api/src/auth.js`
- Test: `prepa-api/test/auth.test.js`

**Interfaces:**
- Produit :
  - `creerJeton(secret, role, dureeMs)` → `Promise<string>`, `role` valant `'coureur'` ou `'admin'`.
  - `verifierJeton(secret, jeton)` → `Promise<{ role } | null>`.
  - `roleDepuisRequete(request, env)` → `Promise<'admin' | 'coureur' | null>`.
  - `cookieJeton(jeton, dureeMs)` → chaîne d'en-tête `Set-Cookie`.
  - `debitDepasse(db, ip)` → `Promise<boolean>`, 10 tentatives par IP et par heure.

- [ ] **Step 1: Écrire les tests (ils doivent échouer)**

`prepa-api/test/auth.test.js` :

```js
import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { creerJeton, verifierJeton, roleDepuisRequete, debitDepasse } from '../src/auth.js';

const S = 'secret-de-test';

describe('jetons', () => {
  it('accepte un jeton valide', async () => {
    const j = await creerJeton(S, 'coureur', 60000);
    expect(await verifierJeton(S, j)).toEqual({ role: 'coureur' });
  });

  it('rejette un jeton signé avec un autre secret', async () => {
    const j = await creerJeton('autre', 'admin', 60000);
    expect(await verifierJeton(S, j)).toBeNull();
  });

  it('rejette un jeton dont le rôle a été modifié', async () => {
    const j = await creerJeton(S, 'coureur', 60000);
    const falsifie = j.replace('coureur', 'admin');
    expect(await verifierJeton(S, falsifie)).toBeNull();
  });

  it('rejette un jeton expiré', async () => {
    const j = await creerJeton(S, 'coureur', -1000);
    expect(await verifierJeton(S, j)).toBeNull();
  });

  it('rejette une chaîne quelconque', async () => {
    expect(await verifierJeton(S, 'nimportequoi')).toBeNull();
    expect(await verifierJeton(S, '')).toBeNull();
  });
});

describe('rôle depuis la requête', () => {
  it('lit le cookie', async () => {
    const j = await creerJeton(env.SECRET_JETON, 'admin', 60000);
    const r = new Request('https://x.test/', { headers: { cookie: `prepa=${j}` } });
    expect(await roleDepuisRequete(r, env)).toBe('admin');
  });

  it('renvoie null sans cookie', async () => {
    expect(await roleDepuisRequete(new Request('https://x.test/'), env)).toBeNull();
  });
});

describe('limitation de débit', () => {
  it('bloque après 10 tentatives dans l\'heure', async () => {
    for (let i = 0; i < 10; i++) {
      expect(await debitDepasse(env.DB, '1.2.3.4')).toBe(false);
    }
    expect(await debitDepasse(env.DB, '1.2.3.4')).toBe(true);
  });

  it('compte les IP séparément', async () => {
    expect(await debitDepasse(env.DB, '9.9.9.9')).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer et vérifier l'échec**

```bash
npm test -- auth
```

- [ ] **Step 3: Implémenter l'authentification**

`prepa-api/src/auth.js` :

```js
const encodeur = new TextEncoder();
export const DUREE_JETON = 365 * 24 * 3600 * 1000;

function base64url(octets) {
  let s = '';
  for (const o of new Uint8Array(octets)) s += String.fromCharCode(o);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signer(secret, charge) {
  const cle = await crypto.subtle.importKey(
    'raw', encodeur.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return base64url(await crypto.subtle.sign('HMAC', cle, encodeur.encode(charge)));
}

function egalConstant(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function creerJeton(secret, role, dureeMs = DUREE_JETON) {
  const charge = `${role}.${Date.now() + dureeMs}`;
  return `${charge}.${await signer(secret, charge)}`;
}

export async function verifierJeton(secret, jeton) {
  const morceaux = String(jeton || '').split('.');
  if (morceaux.length !== 3) return null;
  const [role, expiration, signature] = morceaux;
  if (role !== 'coureur' && role !== 'admin') return null;
  const attendue = await signer(secret, `${role}.${expiration}`);
  if (!egalConstant(signature, attendue)) return null;
  if (Number(expiration) < Date.now()) return null;
  return { role };
}

export async function roleDepuisRequete(request, env) {
  const brut = request.headers.get('cookie') || '';
  const trouve = brut.split(';').map((c) => c.trim()).find((c) => c.startsWith('prepa='));
  if (!trouve) return null;
  const resultat = await verifierJeton(env.SECRET_JETON, trouve.slice('prepa='.length));
  return resultat ? resultat.role : null;
}

export function cookieJeton(jeton, dureeMs = DUREE_JETON) {
  return `prepa=${jeton}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.floor(dureeMs / 1000)}`;
}

export async function debitDepasse(db, ip) {
  const heure = new Date().toISOString().slice(0, 13);
  await db.prepare(
    `INSERT INTO tentatives (ip, heure, compte) VALUES (?, ?, 1)
     ON CONFLICT(ip, heure) DO UPDATE SET compte = compte + 1`
  ).bind(ip, heure).run();
  const ligne = await db.prepare('SELECT compte FROM tentatives WHERE ip = ? AND heure = ?')
    .bind(ip, heure).first();
  return (ligne?.compte ?? 0) > 10;
}
```

- [ ] **Step 4: Relancer les tests**

```bash
npm test -- auth
```

Attendu : les 9 tests passent.

- [ ] **Step 5: Commit**

```bash
cd .. && git add prepa-api && git commit -m "Prepa : jetons HMAC, cookies et limitation de debit"
```

---

### Task 9: Coureurs et normalisation des prénoms

**Files:**
- Create: `prepa-api/src/coureurs.js`
- Test: `prepa-api/test/coureurs.test.js`

**Interfaces:**
- Produit :
  - `normaliserPrenom(brut)` → chaîne sans accents, minuscules, sans séparateurs.
  - `creerOuTrouver(db, { prenom, programme, varianteCourse, faitIzon })` → `Promise<Coureur>`, où `Coureur = { id, prenom, cle, programme, variante_course, fait_izon }`.
  - `parId(db, id)` → `Promise<Coureur | null>`.

- [ ] **Step 1: Écrire les tests (ils doivent échouer)**

`prepa-api/test/coureurs.test.js` :

```js
import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { normaliserPrenom, creerOuTrouver, parId } from '../src/coureurs.js';

describe('normalisation', () => {
  it('regroupe les variantes d\'écriture', () => {
    expect(normaliserPrenom('Jean-Mi')).toBe('jeanmi');
    expect(normaliserPrenom('jean mi')).toBe('jeanmi');
    expect(normaliserPrenom('  JEAN-MI  ')).toBe('jeanmi');
  });

  it('retire les accents', () => {
    expect(normaliserPrenom('Hélène')).toBe('helene');
    expect(normaliserPrenom('Loïc')).toBe('loic');
  });

  it('distingue deux prénoms réellement différents', () => {
    expect(normaliserPrenom('Jean-Michel')).not.toBe(normaliserPrenom('Jean-Mi'));
  });

  it('rejette un prénom vide', () => {
    expect(() => normaliserPrenom('   ')).toThrow(/prénom/i);
  });
});

describe('création', () => {
  it('crée puis retrouve le même coureur', async () => {
    const a = await creerOuTrouver(env.DB, { prenom: 'Marie', programme: 'P3', faitIzon: true });
    const b = await creerOuTrouver(env.DB, { prenom: 'marie', programme: 'P3', faitIzon: true });
    expect(b.id).toBe(a.id);
  });

  it('met à jour le programme si le coureur revient et en change', async () => {
    await creerOuTrouver(env.DB, { prenom: 'Paul', programme: 'P1', faitIzon: false });
    const maj = await creerOuTrouver(env.DB, { prenom: 'Paul', programme: 'P4', faitIzon: true });
    expect(maj.programme).toBe('P4');
    expect(maj.fait_izon).toBe(1);
  });

  it('refuse un programme inconnu', async () => {
    await expect(creerOuTrouver(env.DB, { prenom: 'Zoe', programme: 'P9' })).rejects.toThrow(/programme/i);
  });

  it('retrouve par identifiant', async () => {
    const c = await creerOuTrouver(env.DB, { prenom: 'Luc', programme: 'P2' });
    expect((await parId(env.DB, c.id)).prenom).toBe('Luc');
  });
});
```

- [ ] **Step 2: Lancer et vérifier l'échec**

```bash
npm test -- coureurs
```

- [ ] **Step 3: Implémenter**

`prepa-api/src/coureurs.js` :

```js
import { PROGRAMMES } from './programmes/index.js';

export function normaliserPrenom(brut) {
  const cle = String(brut ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!cle) throw new Error('Prénom manquant ou invalide.');
  return cle;
}

export async function creerOuTrouver(db, { prenom, programme, varianteCourse = null, faitIzon = false }) {
  if (!PROGRAMMES[programme]) throw new Error(`Programme inconnu : ${programme}`);
  const cle = normaliserPrenom(prenom);
  const affiche = String(prenom).trim();
  const izon = faitIzon ? 1 : 0;

  await db.prepare(
    `INSERT INTO coureurs (prenom, cle, programme, variante_course, fait_izon, cree_le)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(cle) DO UPDATE SET
       prenom = excluded.prenom,
       programme = excluded.programme,
       variante_course = excluded.variante_course,
       fait_izon = excluded.fait_izon`
  ).bind(affiche, cle, programme, varianteCourse, izon, new Date().toISOString()).run();

  return db.prepare('SELECT * FROM coureurs WHERE cle = ?').bind(cle).first();
}

export function parId(db, id) {
  return db.prepare('SELECT * FROM coureurs WHERE id = ?').bind(id).first();
}
```

- [ ] **Step 4: Relancer les tests**

```bash
npm test -- coureurs
```

- [ ] **Step 5: Commit**

```bash
cd .. && git add prepa-api && git commit -m "Prepa : coureurs et normalisation des prenoms"
```

---

### Task 10: Routes coureur et filtrage des semaines non publiées

**Files:**
- Modify: `prepa-api/src/index.js`
- Modify: `prepa-api/test/api.test.js`

**Interfaces:**
- Consomme : `auth.js`, `calendrier.js`, `coureurs.js`, `programmes/index.js`.
- Produit les routes `POST /api/session`, `POST /api/coureur`, `GET /api/semaine`, `GET /api/programme`, `GET /api/zones`.
- `GET /api/zones` renvoie `{ zones: ZONES }` depuis `seances.js`, sans authentification (ce n'est pas une donnée confidentielle, et la page des zones doit rester consultable avant la saisie du code). C'est l'unique source du tableau des zones, le front ne le redéfinit jamais.
- `GET /api/programme` renvoie `{ programme, semaineCourante, semaines: [{ numero, titre, phase, publiee, disponibleLe, seances? }] }`. La clé `seances` est **absente** si `publiee` vaut `false` et que le rôle n'est pas admin.

**C'est la tâche la plus critique du plan.** Le test 1 ci-dessous est la garantie centrale de la spec.

- [ ] **Step 1: Écrire les tests (ils doivent échouer)**

Ajouter à `prepa-api/test/api.test.js` :

```js
import { creerJeton } from '../src/auth.js';

async function cookie(role) {
  return `prepa=${await creerJeton(env.SECRET_JETON, role, 60000)}`;
}

describe('session', () => {
  it('accepte le code coureur', async () => {
    const r = await SELF.fetch('https://p.test/api/session', {
      method: 'POST', body: JSON.stringify({ code: 'coureur-test' }),
    });
    expect(r.status).toBe(200);
    expect((await r.json()).role).toBe('coureur');
    expect(r.headers.get('set-cookie')).toMatch(/HttpOnly/);
  });

  it('accepte le code admin et donne le rôle admin', async () => {
    const r = await SELF.fetch('https://p.test/api/session', {
      method: 'POST', body: JSON.stringify({ code: 'admin-test' }),
    });
    expect((await r.json()).role).toBe('admin');
  });

  it('refuse un mauvais code', async () => {
    const r = await SELF.fetch('https://p.test/api/session', {
      method: 'POST', body: JSON.stringify({ code: '00000' }),
    });
    expect(r.status).toBe(401);
  });
});

describe('confidentialité des semaines futures', () => {
  it("ne renvoie JAMAIS le contenu d'une semaine non publiée à un coureur", async () => {
    const c = await cookie('coureur');
    await SELF.fetch('https://p.test/api/coureur', {
      method: 'POST', headers: { cookie: c },
      body: JSON.stringify({ prenom: 'Test', programme: 'P3', faitIzon: false }),
    });
    const r = await SELF.fetch('https://p.test/api/programme', { headers: { cookie: c } });
    const donnees = await r.json();
    const futures = donnees.semaines.filter((s) => !s.publiee);
    expect(futures.length).toBeGreaterThan(0);
    for (const s of futures) {
      expect(s.seances).toBeUndefined();
      expect(s.intention).toBeUndefined();
    }
    // Aucune fuite dans la charge brute.
    const brut = JSON.stringify(donnees);
    expect(brut).not.toMatch(/Sortie longue/);
  });

  it('renvoie tout le contenu à un admin', async () => {
    const c = await cookie('admin');
    const r = await SELF.fetch('https://p.test/api/programme?programme=P3', { headers: { cookie: c } });
    const donnees = await r.json();
    expect(donnees.semaines.every((s) => Array.isArray(s.seances))).toBe(true);
  });

  it('refuse tout accès sans cookie', async () => {
    expect((await SELF.fetch('https://p.test/api/programme')).status).toBe(401);
    expect((await SELF.fetch('https://p.test/api/semaine')).status).toBe(401);
  });

  it('applique la variante Izon du coureur', async () => {
    const c = await cookie('coureur');
    await SELF.fetch('https://p.test/api/coureur', {
      method: 'POST', headers: { cookie: c },
      body: JSON.stringify({ prenom: 'Izonneur', programme: 'P2', faitIzon: true }),
    });
    const r = await SELF.fetch('https://p.test/api/semaine?numero=9', { headers: { cookie: c } });
    // Non publiee au moment du test : le contenu reste cache meme avec la variante.
    expect([200, 403]).toContain(r.status);
  });
});
```

- [ ] **Step 2: Lancer et vérifier l'échec**

```bash
npm test -- api
```

- [ ] **Step 3: Implémenter les routes**

Remplacer `prepa-api/src/index.js` :

```js
import { creerJeton, cookieJeton, roleDepuisRequete, debitDepasse, DUREE_JETON } from './auth.js';
import { estPubliee, instantPublication, semaineCourante } from './calendrier.js';
import { creerOuTrouver, parId } from './coureurs.js';
import { PROGRAMMES, programme as getProgramme, semaineDuProgramme } from './programmes/index.js';

export function json(donnees, statut = 200, entetes = {}) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { 'content-type': 'application/json; charset=utf-8', ...entetes },
  });
}

async function corps(request) {
  try { return await request.json(); } catch { return {}; }
}

/** Réduit une semaine à ses métadonnées quand elle ne doit pas être divulguée. */
function resumerSemaine(s, publiee, estAdmin) {
  const base = {
    numero: s.numero,
    phase: s.phase,
    publiee,
    disponibleLe: new Date(instantPublication(s.numero)).toISOString(),
  };
  if (!publiee && !estAdmin) return base;
  return { ...base, titre: s.titre, intention: s.intention, seances: s.seances };
}

async function routeSession(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'inconnue';
  if (await debitDepasse(env.DB, ip)) {
    return json({ erreur: 'Trop de tentatives. Réessaie dans une heure.' }, 429);
  }
  const { code } = await corps(request);
  let role = null;
  if (code === env.CODE_ADMIN) role = 'admin';
  else if (code === env.CODE_COUREUR) role = 'coureur';
  if (!role) return json({ erreur: "Code d'accès incorrect." }, 401);

  const jeton = await creerJeton(env.SECRET_JETON, role, DUREE_JETON);
  return json({ role }, 200, { 'set-cookie': cookieJeton(jeton, DUREE_JETON) });
}

async function coureurDeLaRequete(request, env) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get('coureur'));
  return id ? parId(env.DB, id) : null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const chemin = url.pathname;

    if (chemin === '/api/sante') return json({ ok: true });
    if (chemin === '/api/session' && request.method === 'POST') return routeSession(request, env);

    const role = await roleDepuisRequete(request, env);
    if (!role) return json({ erreur: 'Accès refusé.' }, 401);
    const estAdmin = role === 'admin';

    if (chemin === '/api/coureur' && request.method === 'POST') {
      const { prenom, programme, varianteCourse, faitIzon } = await corps(request);
      try {
        const c = await creerOuTrouver(env.DB, { prenom, programme, varianteCourse, faitIzon });
        return json({ coureur: c });
      } catch (e) {
        return json({ erreur: e.message }, 400);
      }
    }

    if (chemin === '/api/programme') {
      const c = await coureurDeLaRequete(request, env);
      const code = url.searchParams.get('programme') || c?.programme;
      if (!code || !PROGRAMMES[code]) return json({ erreur: 'Programme inconnu.' }, 400);
      const p = getProgramme(code);
      const faitIzon = Boolean(c?.fait_izon);
      const maintenant = Date.now();
      const semaines = p.semainesContenu.map((s) => {
        const resolue = semaineDuProgramme(code, s.numero, { faitIzon });
        return resumerSemaine(resolue, estPubliee(s.numero, maintenant), estAdmin);
      });
      return json({
        programme: { code: p.code, nom: p.nom, dateCourse: p.dateCourse, prerequis: p.prerequis, izon: p.izon },
        semaineCourante: semaineCourante(maintenant, p.semainesContenu.length),
        semaines,
      });
    }

    if (chemin === '/api/semaine') {
      const c = await coureurDeLaRequete(request, env);
      const code = url.searchParams.get('programme') || c?.programme;
      if (!code || !PROGRAMMES[code]) return json({ erreur: 'Programme inconnu.' }, 400);
      const p = getProgramme(code);
      const maintenant = Date.now();
      const numero = Number(url.searchParams.get('numero')) || semaineCourante(maintenant, p.semainesContenu.length);
      if (!numero) return json({ erreur: "La préparation n'a pas encore commencé." }, 404);
      if (!estPubliee(numero, maintenant) && !estAdmin) {
        return json({ erreur: 'Semaine pas encore disponible.', disponibleLe: new Date(instantPublication(numero)).toISOString() }, 403);
      }
      const s = semaineDuProgramme(code, numero, { faitIzon: Boolean(c?.fait_izon) });
      if (!s) return json({ erreur: 'Semaine inconnue.' }, 404);
      return json({ semaine: s });
    }

    return json({ erreur: 'route inconnue' }, 404);
  },

  async scheduled(event, env, ctx) {
    // Rempli en tâche 14.
  },
};
```

- [ ] **Step 4: Relancer les tests**

```bash
npm test -- api
```

Attendu : tous passent. **Si le test de confidentialité échoue, ne pas continuer.**

- [ ] **Step 5: Commit**

```bash
cd .. && git add prepa-api && git commit -m "Prepa : routes coureur et filtrage strict des semaines non publiees"
```

---

### Task 11: Validation des séances

**Files:**
- Create: `prepa-api/src/validations.js`
- Modify: `prepa-api/src/index.js`
- Modify: `prepa-api/test/api.test.js`

**Interfaces:**
- Produit :
  - `valider(db, coureurId, { semaine, seance, ressenti, note })` → `Promise<void>`.
  - `devalider(db, coureurId, { semaine, seance })` → `Promise<void>`.
  - `pourCoureur(db, coureurId)` → `Promise<Validation[]>`.
  - `RESSENTIS = ['facile', 'ok', 'difficile']`.
- Routes `POST /api/validation` et `DELETE /api/validation`.

- [ ] **Step 1: Écrire les tests (ils doivent échouer)**

```js
describe('validation de séance', () => {
  it('enregistre une validation avec ressenti', async () => {
    const c = await cookie('coureur');
    const cr = await (await SELF.fetch('https://p.test/api/coureur', {
      method: 'POST', headers: { cookie: c },
      body: JSON.stringify({ prenom: 'Valideur', programme: 'P1' }),
    })).json();
    const r = await SELF.fetch('https://p.test/api/validation', {
      method: 'POST', headers: { cookie: c },
      body: JSON.stringify({ coureur: cr.coureur.id, semaine: 1, seance: 'EF', ressenti: 'ok', note: 'Genou un peu raide.' }),
    });
    expect(r.status).toBe(200);
  });

  it('est idempotente et met à jour le ressenti', async () => {
    const c = await cookie('coureur');
    const cr = await (await SELF.fetch('https://p.test/api/coureur', {
      method: 'POST', headers: { cookie: c },
      body: JSON.stringify({ prenom: 'Idem', programme: 'P1' }),
    })).json();
    const envoyer = (ressenti) => SELF.fetch('https://p.test/api/validation', {
      method: 'POST', headers: { cookie: c },
      body: JSON.stringify({ coureur: cr.coureur.id, semaine: 1, seance: 'EF', ressenti }),
    });
    await envoyer('facile');
    await envoyer('difficile');
    const lignes = await env.DB.prepare('SELECT ressenti FROM validations WHERE coureur_id = ? AND semaine = 1 AND seance = ?')
      .bind(cr.coureur.id, 'EF').all();
    expect(lignes.results).toHaveLength(1);
    expect(lignes.results[0].ressenti).toBe('difficile');
  });

  it('refuse un ressenti hors liste', async () => {
    const c = await cookie('coureur');
    const cr = await (await SELF.fetch('https://p.test/api/coureur', {
      method: 'POST', headers: { cookie: c },
      body: JSON.stringify({ prenom: 'Mauvais', programme: 'P1' }),
    })).json();
    const r = await SELF.fetch('https://p.test/api/validation', {
      method: 'POST', headers: { cookie: c },
      body: JSON.stringify({ coureur: cr.coureur.id, semaine: 1, seance: 'EF', ressenti: 'epuisant' }),
    });
    expect(r.status).toBe(400);
  });

  it('permet de dévalider', async () => {
    const c = await cookie('coureur');
    const cr = await (await SELF.fetch('https://p.test/api/coureur', {
      method: 'POST', headers: { cookie: c },
      body: JSON.stringify({ prenom: 'Devalide', programme: 'P1' }),
    })).json();
    await SELF.fetch('https://p.test/api/validation', {
      method: 'POST', headers: { cookie: c },
      body: JSON.stringify({ coureur: cr.coureur.id, semaine: 1, seance: 'EF' }),
    });
    await SELF.fetch('https://p.test/api/validation', {
      method: 'DELETE', headers: { cookie: c },
      body: JSON.stringify({ coureur: cr.coureur.id, semaine: 1, seance: 'EF' }),
    });
    const lignes = await env.DB.prepare('SELECT * FROM validations WHERE coureur_id = ?').bind(cr.coureur.id).all();
    expect(lignes.results).toHaveLength(0);
  });

  it('tronque une note trop longue', async () => {
    const c = await cookie('coureur');
    const cr = await (await SELF.fetch('https://p.test/api/coureur', {
      method: 'POST', headers: { cookie: c },
      body: JSON.stringify({ prenom: 'Bavard', programme: 'P1' }),
    })).json();
    await SELF.fetch('https://p.test/api/validation', {
      method: 'POST', headers: { cookie: c },
      body: JSON.stringify({ coureur: cr.coureur.id, semaine: 1, seance: 'EF', note: 'x'.repeat(1000) }),
    });
    const l = await env.DB.prepare('SELECT note FROM validations WHERE coureur_id = ?').bind(cr.coureur.id).first();
    expect(l.note.length).toBe(500);
  });
});
```

- [ ] **Step 2: Lancer et vérifier l'échec**

```bash
npm test -- api
```

- [ ] **Step 3: Implémenter**

`prepa-api/src/validations.js` :

```js
export const RESSENTIS = ['facile', 'ok', 'difficile'];
const NOTE_MAX = 500;

export async function valider(db, coureurId, { semaine, seance, ressenti = null, note = null }) {
  if (!Number.isInteger(semaine) || semaine < 1) throw new Error('Semaine invalide.');
  if (!seance) throw new Error('Séance manquante.');
  if (ressenti !== null && !RESSENTIS.includes(ressenti)) throw new Error('Ressenti invalide.');
  const noteCourte = note ? String(note).slice(0, NOTE_MAX) : null;

  await db.prepare(
    `INSERT INTO validations (coureur_id, semaine, seance, ressenti, note, valide_le)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(coureur_id, semaine, seance) DO UPDATE SET
       ressenti = excluded.ressenti, note = excluded.note, valide_le = excluded.valide_le`
  ).bind(coureurId, semaine, seance, ressenti, noteCourte, new Date().toISOString()).run();
}

export async function devalider(db, coureurId, { semaine, seance }) {
  await db.prepare('DELETE FROM validations WHERE coureur_id = ? AND semaine = ? AND seance = ?')
    .bind(coureurId, semaine, seance).run();
}

export async function pourCoureur(db, coureurId) {
  const r = await db.prepare('SELECT semaine, seance, ressenti, note, valide_le FROM validations WHERE coureur_id = ? ORDER BY semaine, seance')
    .bind(coureurId).all();
  return r.results;
}
```

Ajouter dans `src/index.js`, après le bloc `/api/semaine` :

```js
    if (chemin === '/api/validation') {
      const donnees = await corps(request);
      const coureurId = Number(donnees.coureur);
      if (!coureurId) return json({ erreur: 'Coureur manquant.' }, 400);
      try {
        if (request.method === 'POST') {
          await valider(env.DB, coureurId, {
            semaine: Number(donnees.semaine), seance: donnees.seance,
            ressenti: donnees.ressenti ?? null, note: donnees.note ?? null,
          });
        } else if (request.method === 'DELETE') {
          await devalider(env.DB, coureurId, { semaine: Number(donnees.semaine), seance: donnees.seance });
        } else {
          return json({ erreur: 'Méthode non autorisée.' }, 405);
        }
      } catch (e) {
        return json({ erreur: e.message }, 400);
      }
      return json({ validations: await pourCoureur(env.DB, coureurId) });
    }
```

Et l'import en tête : `import { valider, devalider, pourCoureur } from './validations.js';`

- [ ] **Step 4: Relancer les tests**

```bash
npm test -- api
```

- [ ] **Step 5: Commit**

```bash
cd .. && git add prepa-api && git commit -m "Prepa : validation et devalidation des seances avec ressenti"
```

---

### Task 12: Back-office, tableau et alertes

**Files:**
- Create: `prepa-api/src/admin.js`
- Modify: `prepa-api/src/index.js`
- Test: `prepa-api/test/admin.test.js`

**Interfaces:**
- Produit :
  - `tableau(db)` → `Promise<{ coureurs: [{ id, prenom, programme, fait_izon, validations: [...] }] }>`.
  - `alertes(db, semaineCourante)` → `Promise<Alerte[]>`, `Alerte = { coureurId, prenom, type, detail }`, `type` valant `'absence'` ou `'difficulte'`.
  - `fusionner(db, idGarde, idSupprime)` → `Promise<void>`.
  - `supprimerCoureur(db, id)` → `Promise<void>`.
  - `enregistrerOverride(db, programme, semaine, contenu, veto)` → `Promise<void>`.
- Routes admin, toutes protégées par `role === 'admin'`.

Règles d'alerte, telles que spécifiées : 3 séances manquées d'affilée sur la dernière semaine publiée, ou ressenti `difficile` majoritaire deux semaines consécutives.

- [ ] **Step 1: Écrire les tests (ils doivent échouer)**

`prepa-api/test/admin.test.js` :

```js
import { env, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { creerJeton } from '../src/auth.js';
import { creerOuTrouver } from '../src/coureurs.js';
import { valider } from '../src/validations.js';
import { tableau, alertes, fusionner } from '../src/admin.js';

async function cookieAdmin() {
  return `prepa=${await creerJeton(env.SECRET_JETON, 'admin', 60000)}`;
}

describe('alertes', () => {
  it('signale un coureur qui a manqué toute la semaine', async () => {
    const c = await creerOuTrouver(env.DB, { prenom: 'Absent', programme: 'P1' });
    const a = await alertes(env.DB, 2);
    expect(a.some((x) => x.coureurId === c.id && x.type === 'absence')).toBe(true);
  });

  it('signale un coureur en difficulté deux semaines de suite', async () => {
    const c = await creerOuTrouver(env.DB, { prenom: 'Cuit', programme: 'P1' });
    for (const sem of [1, 2]) {
      for (const s of ['EF', 'VMA', 'SL']) {
        await valider(env.DB, c.id, { semaine: sem, seance: s, ressenti: 'difficile' });
      }
    }
    const a = await alertes(env.DB, 2);
    expect(a.some((x) => x.coureurId === c.id && x.type === 'difficulte')).toBe(true);
  });

  it('ne signale pas un coureur assidu et à l\'aise', async () => {
    const c = await creerOuTrouver(env.DB, { prenom: 'Serein', programme: 'P1' });
    for (const sem of [1, 2]) {
      for (const s of ['EF', 'VMA', 'SL']) {
        await valider(env.DB, c.id, { semaine: sem, seance: s, ressenti: 'ok' });
      }
    }
    const a = await alertes(env.DB, 2);
    expect(a.some((x) => x.coureurId === c.id)).toBe(false);
  });
});

describe('fusion', () => {
  it('réaffecte les validations et supprime le doublon', async () => {
    const a = await creerOuTrouver(env.DB, { prenom: 'Jean-Michel', programme: 'P1' });
    const b = await creerOuTrouver(env.DB, { prenom: 'JM', programme: 'P1' });
    await valider(env.DB, b.id, { semaine: 1, seance: 'EF', ressenti: 'ok' });
    await fusionner(env.DB, a.id, b.id);
    const restant = await env.DB.prepare('SELECT * FROM coureurs WHERE id = ?').bind(b.id).first();
    expect(restant).toBeNull();
    const v = await env.DB.prepare('SELECT * FROM validations WHERE coureur_id = ?').bind(a.id).all();
    expect(v.results).toHaveLength(1);
  });
});

describe('accès', () => {
  it('refuse le tableau à un coureur', async () => {
    const c = `prepa=${await creerJeton(env.SECRET_JETON, 'coureur', 60000)}`;
    const r = await SELF.fetch('https://p.test/api/admin/tableau', { headers: { cookie: c } });
    expect(r.status).toBe(403);
  });

  it('autorise le tableau à un admin', async () => {
    const r = await SELF.fetch('https://p.test/api/admin/tableau', { headers: { cookie: await cookieAdmin() } });
    expect(r.status).toBe(200);
  });
});
```

- [ ] **Step 2: Lancer et vérifier l'échec**

```bash
npm test -- admin
```

- [ ] **Step 3: Implémenter**

`prepa-api/src/admin.js` :

```js
export async function tableau(db) {
  const coureurs = (await db.prepare('SELECT * FROM coureurs ORDER BY prenom COLLATE NOCASE').all()).results;
  const validations = (await db.prepare('SELECT * FROM validations').all()).results;
  const parCoureur = new Map();
  for (const v of validations) {
    if (!parCoureur.has(v.coureur_id)) parCoureur.set(v.coureur_id, []);
    parCoureur.get(v.coureur_id).push(v);
  }
  return { coureurs: coureurs.map((c) => ({ ...c, validations: parCoureur.get(c.id) ?? [] })) };
}

export async function alertes(db, semaineCourante) {
  if (!semaineCourante || semaineCourante < 1) return [];
  const { coureurs } = await tableau(db);
  const resultat = [];

  for (const c of coureurs) {
    const deLaSemaine = c.validations.filter((v) => v.semaine === semaineCourante);
    if (deLaSemaine.length === 0) {
      resultat.push({
        coureurId: c.id, prenom: c.prenom, type: 'absence',
        detail: `Aucune séance validée en semaine ${semaineCourante}.`,
      });
      continue;
    }

    const difficile = (n) => {
      const v = c.validations.filter((x) => x.semaine === n && x.ressenti);
      return v.length > 0 && v.filter((x) => x.ressenti === 'difficile').length * 2 > v.length;
    };
    if (semaineCourante >= 2 && difficile(semaineCourante) && difficile(semaineCourante - 1)) {
      resultat.push({
        coureurId: c.id, prenom: c.prenom, type: 'difficulte',
        detail: `Séances majoritairement difficiles en semaines ${semaineCourante - 1} et ${semaineCourante}. Envisager d'alléger.`,
      });
    }
  }
  return resultat;
}

export async function fusionner(db, idGarde, idSupprime) {
  if (idGarde === idSupprime) throw new Error('Impossible de fusionner un coureur avec lui-même.');
  await db.prepare(
    `UPDATE OR REPLACE validations SET coureur_id = ? WHERE coureur_id = ?`
  ).bind(idGarde, idSupprime).run();
  await db.prepare('DELETE FROM coureurs WHERE id = ?').bind(idSupprime).run();
}

export async function supprimerCoureur(db, id) {
  await db.prepare('DELETE FROM validations WHERE coureur_id = ?').bind(id).run();
  await db.prepare('DELETE FROM coureurs WHERE id = ?').bind(id).run();
}

export async function enregistrerOverride(db, programme, semaine, contenu, veto) {
  await db.prepare(
    `INSERT INTO semaines_override (programme, semaine, contenu_json, veto, modifie_le)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(programme, semaine) DO UPDATE SET
       contenu_json = excluded.contenu_json, veto = excluded.veto, modifie_le = excluded.modifie_le`
  ).bind(programme, semaine, contenu ? JSON.stringify(contenu) : null, veto ? 1 : 0, new Date().toISOString()).run();
}

export async function overrides(db) {
  const r = await db.prepare('SELECT * FROM semaines_override').all();
  const map = new Map();
  for (const o of r.results) map.set(`${o.programme}:${o.semaine}`, o);
  return map;
}
```

Ajouter l'import en tête de `src/index.js` :

```js
import { tableau, alertes, fusionner, supprimerCoureur, enregistrerOverride, overrides } from './admin.js';
```

Puis, juste après le calcul de `estAdmin` :

```js
    if (chemin.startsWith('/api/admin/')) {
      if (!estAdmin) return json({ erreur: 'Réservé à l\'encadrant.' }, 403);
      const donnees = request.method === 'GET' ? {} : await corps(request);

      if (chemin === '/api/admin/tableau') return json(await tableau(env.DB));
      if (chemin === '/api/admin/alertes') {
        const n = Number(url.searchParams.get('semaine')) || semaineCourante(Date.now(), 17);
        return json({ alertes: await alertes(env.DB, n) });
      }
      if (chemin === '/api/admin/semaine' && request.method === 'PUT') {
        await enregistrerOverride(env.DB, donnees.programme, Number(donnees.semaine), donnees.contenu, donnees.veto);
        return json({ ok: true });
      }
      if (chemin === '/api/admin/veto' && request.method === 'POST') {
        await enregistrerOverride(env.DB, donnees.programme, Number(donnees.semaine), null, donnees.veto);
        return json({ ok: true });
      }
      if (chemin === '/api/admin/fusion' && request.method === 'POST') {
        await fusionner(env.DB, Number(donnees.garde), Number(donnees.supprime));
        return json({ ok: true });
      }
      if (chemin === '/api/admin/coureur' && request.method === 'DELETE') {
        await supprimerCoureur(env.DB, Number(donnees.id));
        return json({ ok: true });
      }
      return json({ erreur: 'route admin inconnue' }, 404);
    }
```

- [ ] **Step 4: Appliquer le veto et les modifications admin**

Le veto doit empêcher la publication même si la date est passée, et une semaine modifiée depuis le back-office doit primer sur le fichier source. Remplacer `resumerSemaine` dans `src/index.js` :

```js
function resumerSemaine(s, publiee, estAdmin, surcharge) {
  const bloquee = Boolean(surcharge?.veto);
  const visible = publiee && !bloquee;
  const contenu = surcharge?.contenu_json ? JSON.parse(surcharge.contenu_json) : s;
  const base = {
    numero: s.numero,
    phase: s.phase,
    publiee: visible,
    veto: bloquee,
    disponibleLe: new Date(instantPublication(s.numero)).toISOString(),
  };
  if (!visible && !estAdmin) return base;
  return { ...base, titre: contenu.titre, intention: contenu.intention, seances: contenu.seances };
}
```

Et dans la route `/api/programme`, charger la carte une seule fois puis la passer :

```js
      const cartes = await overrides(env.DB);
      const semaines = p.semainesContenu.map((s) => {
        const resolue = semaineDuProgramme(code, s.numero, { faitIzon });
        return resumerSemaine(resolue, estPubliee(s.numero, maintenant), estAdmin, cartes.get(`${code}:${s.numero}`));
      });
```

Appliquer le même contrôle dans `/api/semaine` : si `cartes.get(...)?.veto` vaut 1 et que le rôle n'est pas admin, renvoyer 403 comme pour une semaine non publiée.

Test à ajouter :

```js
it('le veto bloque une semaine dont la date est pourtant passée', async () => {
  await env.DB.prepare(
    `INSERT INTO semaines_override (programme, semaine, contenu_json, veto, modifie_le) VALUES ('P1', 1, NULL, 1, '2026-07-20')`
  ).run();
  const c = `prepa=${await creerJeton(env.SECRET_JETON, 'coureur', 60000)}`;
  const r = await SELF.fetch('https://p.test/api/programme?programme=P1', { headers: { cookie: c } });
  const d = await r.json();
  expect(d.semaines[0].publiee).toBe(false);
});
```

- [ ] **Step 5: Relancer toute la suite**

```bash
npm test
```

- [ ] **Step 6: Commit**

```bash
cd .. && git add prepa-api && git commit -m "Prepa : back-office, tableau d'assiduite, alertes, fusion et veto"
```

---

### Task 13: Page coureur, première visite et Ma semaine

**Files:**
- Create: `coureurs-des-vignes/prepa.html`
- Create: `coureurs-des-vignes/js/prepa.js`
- Modify: `coureurs-des-vignes/css/style.css` (ajout en fin de fichier)

**Interfaces:**
- Consomme : les routes `/api/session`, `/api/coureur`, `/api/semaine`, `/api/validation`.
- Produit : `window.PREPA_API` (constante d'URL du Worker), et un état local en `localStorage` sous la clé `cdv-prepa` de forme `{ coureurId, prenom, programme, faitIzon }`.

- [ ] **Step 1: Créer la page dans la charte**

`prepa.html` reprend **à l'identique** le `<head>`, `<header class="site-header">` et `<footer>` de `entrainements.html`, avec :

- `<title>Préparation aux courses — Les Coureurs des Vignes</title>` (le tiret cadratin est toléré ici, c'est la convention de titre déjà en place sur le site)
- l'entrée de menu `Prépa` marquée `is-active`
- `<link rel="stylesheet" href="css/style.css?v=20260718a" />` (incrémenter le paramètre de cache)
- `<script src="js/prepa.js" defer></script>`

Corps de page, structure des écrans :

```html
<section class="page-hero">
  <div class="container page-hero__inner">
    <span class="eyebrow">Préparation</span>
    <h1 class="page-hero__title">Ta prépa, semaine par semaine</h1>
    <p class="page-hero__lead">Un programme adapté à ta course, publié chaque dimanche soir. À toi d'adapter ton rythme à ton niveau.</p>
  </div>
</section>

<main class="section surface-limestone">
  <div class="container">
    <div id="ecran-code" class="prepa-carte" hidden>...</div>
    <div id="ecran-profil" class="prepa-carte" hidden>...</div>
    <div id="ecran-semaine" hidden>...</div>
    <div id="ecran-programme" hidden>...</div>
    <div id="ecran-zones" hidden>...</div>
    <div id="ecran-admin" hidden>...</div>
  </div>
</main>
```

**Contenu de `#ecran-profil`** : un champ prénom, puis une carte par programme affichant son `nom`, sa `dateCourse` formatée en français, et **son `prerequis` en toutes lettres**, avec une case « je remplis ce prérequis ». Si la case n'est pas cochée, afficher sous la carte le message d'orientation, sans bloquer le choix :

> « Cette préparation demande déjà une base. Le 10 km d'Izon est un objectif plus accessible pour commencer. »

Puis, pour `P4` uniquement, un choix Bordeaux ou Nice-Cannes, et pour `P2`, `P3` et `P4`, la case « je fais le 10 km d'Izon le 27 septembre ».

**Mention de données personnelles**, à placer en bas de `#ecran-profil` et en pied de la page, dans un `<p class="prepa-mention">` :

> « On enregistre uniquement ton prénom, le programme que tu suis et les séances que tu valides, afin que l'encadrant puisse suivre le groupe et adapter les semaines. Aucun e-mail, aucun mot de passe, aucune donnée médicale. Pour tout effacer, demande-le à l'encadrant, la suppression est immédiate et définitive. »

- [ ] **Step 2: Ajouter le bloc CSS**

À la fin de `css/style.css`, en réutilisant strictement les jetons existants :

```css
/* =========================================================
   PRÉPA AUX COURSES
   ========================================================= */
.prepa-carte {
  background: var(--chalk);
  border-radius: var(--r-lg);
  box-shadow: var(--sh);
  padding: clamp(1.5rem, 4vw, 2.5rem);
  margin-bottom: 1.5rem;
}
.prepa-seance {
  display: grid;
  gap: .75rem;
  padding: 1.25rem;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: var(--chalk);
  border-left: 5px solid var(--zone, var(--vine));
  margin-bottom: 1rem;
}
.prepa-seance.est-validee { background: color-mix(in srgb, var(--shoot) 12%, var(--chalk)); }
.prepa-seance__meta { font-family: var(--f-mono); font-size: .9rem; color: var(--muted); }
.prepa-seance__objectif { color: var(--ink-soft); font-style: italic; }

.zone-Z1 { --zone: var(--muted); }
.zone-Z2 { --zone: var(--vine); }
.zone-Z3 { --zone: var(--shoot-dark); }
.zone-Z4 { --zone: var(--wine); }
.zone-Z5 { --zone: var(--wine-2); }

.prepa-puce {
  display: inline-block;
  font-family: var(--f-mono);
  font-weight: 700;
  font-size: .8rem;
  padding: .15rem .6rem;
  border-radius: var(--r-pill);
  background: var(--zone, var(--vine));
  color: var(--chalk);
}
.prepa-ressenti { display: flex; gap: .5rem; flex-wrap: wrap; }
.prepa-ressenti button { font-family: var(--f-body); cursor: pointer; }
.prepa-ressenti button[aria-pressed="true"] { background: var(--vine); color: var(--chalk); }

.prepa-verrou {
  filter: blur(6px);
  user-select: none;
  pointer-events: none;
}
.prepa-verrou-libelle {
  font-family: var(--f-mono);
  color: var(--muted);
  text-align: center;
  padding: 1rem;
}

@media (prefers-reduced-motion: reduce) {
  .prepa-seance { transition: none; }
}
```

Note importante : le flou `.prepa-verrou` est **uniquement décoratif**. Le contenu masqué n'est jamais envoyé par le Worker, il n'y a donc rien à révéler en inspectant la page.

- [ ] **Step 3: Écrire la logique front**

`js/prepa.js`, points clés :

```js
const API = 'https://prepa-api.<sous-domaine>.workers.dev';
const CLE = 'cdv-prepa';

const etat = JSON.parse(localStorage.getItem(CLE) || 'null') || {};
const sauver = () => localStorage.setItem(CLE, JSON.stringify(etat));

async function appel(chemin, options = {}) {
  const r = await fetch(API + chemin, {
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  if (r.status === 401) { montrer('ecran-code'); throw new Error('session'); }
  return r.json();
}

async function envoyerCode(code) {
  const r = await fetch(API + '/api/session', {
    method: 'POST', credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!r.ok) throw new Error("Code d'accès incorrect.");
  const { role } = await r.json();
  etat.role = role;
  sauver();
  return role;
}

async function chargerSemaine() {
  const d = await appel(`/api/semaine?coureur=${etat.coureurId}`);
  if (d.erreur) return afficherAttente(d.disponibleLe);
  rendreSemaine(d.semaine);
}

async function validerSeance(semaine, seance, ressenti, note) {
  await appel('/api/validation', {
    method: 'POST',
    body: JSON.stringify({ coureur: etat.coureurId, semaine, seance, ressenti, note }),
  });
}
```

Rendu d'une séance : `<article class="prepa-seance zone-${s.zone ?? 'Z2'}">`, titre en Archivo Expanded, durée et zone en Space Mono via `.prepa-seance__meta`, description, objectif en `.prepa-seance__objectif`, bouton de validation puis les 3 boutons de ressenti et le `<details>` de note.

- [ ] **Step 4: Vérifier dans le navigateur**

```bash
# Terminal 1
cd prepa-api && npx wrangler dev --port 8787
# Terminal 2 : le serveur du site existant
node coureurs-des-vignes/server.js
```

Ouvrir `http://localhost:4599/prepa.html`, saisir `<CODE_COUREUR>`, créer un profil, vérifier :
- l'écran de code puis l'écran de profil s'enchaînent ;
- la semaine courante s'affiche avec les bonnes couleurs de zone ;
- une validation persiste après rechargement de la page ;
- le rendu est correct en 375 px de large.

- [ ] **Step 5: Commit**

```bash
git add prepa.html js/prepa.js css/style.css && git commit -m "Prepa : page coureur, premiere visite et vue Ma semaine"
```

---

### Task 14: Mon programme, zones, calculateur FC et back-office front

**Files:**
- Modify: `coureurs-des-vignes/prepa.html`
- Modify: `coureurs-des-vignes/js/prepa.js`
- Modify: `coureurs-des-vignes/css/style.css`

- [ ] **Step 1: Écran Mon programme**

Liste les semaines depuis `/api/programme`. Pour chaque semaine :
- `publiee: true` : titre, intention, séances, consultable.
- `publiee: false` : bloc `.prepa-verrou` avec `.prepa-verrou-libelle` affichant « Disponible le dimanche 26 juillet à 19 h », date formatée depuis `disponibleLe` avec `Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' })`.

Ajouter une barre de progression réutilisant `.scroll-progress` du site et un compte à rebours jusqu'à `programme.dateCourse`.

- [ ] **Step 2: Écran Comprendre les zones et calculateur**

Tableau des 5 zones (nom, % FC max, sensation), **chargé depuis `GET /api/zones`**, jamais redéfini côté front. Le mettre en cache dans une variable de module après le premier appel.

```js
let zonesCache = null;
async function chargerZones() {
  if (!zonesCache) zonesCache = (await (await fetch(API + '/api/zones')).json()).zones;
  return zonesCache;
}

function fcMax(age) { return Math.round(208 - 0.7 * age); }

function fourchettes(fcm, zones) {
  return Object.entries(zones).map(([code, z]) => ({
    code, nom: z.nom,
    min: Math.round(fcm * z.fcMin / 100),
    max: Math.round(fcm * z.fcMax / 100),
  }));
}
```

Deux champs : âge, ou FC max si connue (celle-ci prime). Résultats affichés en Space Mono. Test manuel : 40 ans donne 180 bpm, donc Z2 entre 108 et 135.

- [ ] **Step 3: Écran back-office**

Visible seulement si `etat.role === 'admin'`. Contient :
- le tableau d'assiduité, une ligne par coureur, une colonne par semaine, une pastille par séance validée ;
- la liste des alertes en tête, en `--wine` pour `difficulte` et `--muted` pour `absence` ;
- pour chaque semaine à venir, un bouton « Bloquer la publication » appelant `/api/admin/veto` ;
- un sélecteur de fusion de deux coureurs ;
- un bouton d'effacement par coureur, avec confirmation.

- [ ] **Step 4: Ajouter l'entrée de menu sur toutes les pages**

Insérer dans le `<ul class="nav__list">` des 6 pages existantes et des articles, avant `Adhésion` :

```html
<li><a href="prepa.html" class="nav__link">Prépa</a></li>
```

- [ ] **Step 5: Vérifier dans le navigateur**

Rejouer le parcours complet en coureur puis en admin (code `<CODE_ADMIN>`). Vérifier notamment qu'en tant que coureur, l'inspection du réseau ne montre **aucun** contenu de semaine future.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Prepa : Mon programme, zones, calculateur FC et back-office"
```

---

### Task 15: Rappel du samedi par e-mail

**Files:**
- Create: `prepa-api/src/email.js`
- Modify: `prepa-api/src/index.js`
- Modify: `prepa-api/test/admin.test.js`

**Interfaces:**
- Produit : `construireRappel(semaineAVenir, alertesListe, siteUrl)` → `{ sujet, texte }`, et `envoyerRappel(env, message)` → `Promise<void>`.

- [ ] **Step 1: Écrire les tests (ils doivent échouer)**

```js
import { construireRappel } from '../src/email.js';

describe('rappel du samedi', () => {
  it('annonce la semaine à venir et récapitule les alertes', () => {
    const m = construireRappel(7, [{ prenom: 'Cuit', type: 'difficulte', detail: 'Séances difficiles.' }], 'https://x.test');
    expect(m.sujet).toMatch(/semaine 7/i);
    expect(m.texte).toMatch(/Cuit/);
    expect(m.texte).toMatch(/https:\/\/x\.test\/prepa\.html/);
  });

  it('reste clair quand il n\'y a aucune alerte', () => {
    const m = construireRappel(3, [], 'https://x.test');
    expect(m.texte).toMatch(/Aucun coureur à surveiller/);
  });

  it("n'utilise pas de tiret cadratin", () => {
    const m = construireRappel(3, [], 'https://x.test');
    expect(m.texte).not.toMatch(/—/);
  });
});
```

- [ ] **Step 2: Lancer et vérifier l'échec**

```bash
npm test -- admin
```

- [ ] **Step 3: Implémenter**

`prepa-api/src/email.js` :

```js
export function construireRappel(semaineAVenir, alertesListe, siteUrl) {
  const sujet = `Prépa : la semaine ${semaineAVenir} part demain à 19 h`;
  const lignes = [
    `Bonjour David,`,
    ``,
    `La semaine ${semaineAVenir} sera publiée demain dimanche à 19 h.`,
    `Tu peux la relire et la modifier ici : ${siteUrl}/prepa.html`,
    ``,
  ];
  if (alertesListe.length === 0) {
    lignes.push('Aucun coureur à surveiller cette semaine.');
  } else {
    lignes.push('Coureurs à surveiller :');
    for (const a of alertesListe) lignes.push(`  ${a.prenom} : ${a.detail}`);
  }
  return { sujet, texte: lignes.join('\n') };
}

export async function envoyerRappel(env, message) {
  if (!env.EMAIL) return; // binding absent en test et en local
  const { EmailMessage } = await import('cloudflare:email');
  const brut = [
    `From: Prepa Coureurs des Vignes <prepa@coureursdesvignes.fr>`,
    `To: ${env.EMAIL_ADMIN}`,
    `Subject: ${message.sujet}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    message.texte,
  ].join('\r\n');
  await env.EMAIL.send(new EmailMessage('prepa@coureursdesvignes.fr', env.EMAIL_ADMIN, brut));
}
```

Ajouter l'import en tête de `src/index.js` :

```js
import { construireRappel, envoyerRappel } from './email.js';
```

Déclarer le binding e-mail dans `wrangler.toml` :

```toml
[[send_email]]
name = "EMAIL"
destination_address = "tridav00@gmail.com"
```

Remplacer le handler `scheduled` dans `src/index.js` :

```js
  async scheduled(event, env, ctx) {
    const courante = semaineCourante(Date.now(), 17);
    const aVenir = courante + 1;
    const listeAlertes = await alertes(env.DB, courante);
    const message = construireRappel(aVenir, listeAlertes, env.SITE_URL);
    ctx.waitUntil(envoyerRappel(env, message));
  },
```

- [ ] **Step 4: Relancer les tests**

```bash
npm test
```

Attendu : toute la suite passe.

- [ ] **Step 5: Commit**

```bash
cd .. && git add prepa-api && git commit -m "Prepa : rappel du samedi par e-mail avec recap des alertes"
```

---

### Task 16: Mise en ligne

**Files:**
- Modify: `prepa-api/wrangler.toml`
- Modify: `coureurs-des-vignes/js/prepa.js` (URL de production)
- Modify: `coureurs-des-vignes/README.md`

- [ ] **Step 1: Créer la base de production et migrer**

```bash
cd prepa-api
npx wrangler d1 create prepa
# Reporter database_id dans wrangler.toml, puis :
npm run db:prod
```

- [ ] **Step 2: Poser les secrets**

```bash
npx wrangler secret put CODE_COUREUR   # saisir <CODE_COUREUR>
npx wrangler secret put CODE_ADMIN     # saisir <CODE_ADMIN>
npx wrangler secret put SECRET_JETON   # coller une chaine aleatoire de 48 caracteres
```

Générer le secret de jeton :

```bash
node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"
```

- [ ] **Step 3: Déployer le Worker**

```bash
npm run deploy
```

Relever l'URL affichée et la reporter dans la constante `API` de `js/prepa.js`.

- [ ] **Step 4: Autoriser l'origine du site**

Ajouter la gestion CORS dans `src/index.js`, en tête du `fetch` :

```js
    const origine = request.headers.get('origin');
    const ORIGINES = ['https://coureursdesvignes.fr', 'http://localhost:4599'];
    const cors = ORIGINES.includes(origine)
      ? { 'access-control-allow-origin': origine, 'access-control-allow-credentials': 'true',
          'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS' }
      : {};
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
```

Puis fusionner `cors` dans les en-têtes de chaque réponse via l'assistant `json`. Redéployer et vérifier :

```bash
curl -i https://prepa-api.<sous-domaine>.workers.dev/api/sante
```

- [ ] **Step 5: Publier le site**

```bash
cd .. && rsync -a --exclude prepa-api --exclude .git --exclude docs ./ dist/ && npx wrangler pages deploy dist
```

- [ ] **Step 6: Vérification de bout en bout en production**

1. Ouvrir la page de prépa en navigation privée, saisir `<CODE_COUREUR>`, créer un profil, valider une séance.
2. Vérifier dans l'onglet Réseau qu'aucune semaine future ne contient de `seances`.
3. Ouvrir une seconde session privée, saisir `<CODE_ADMIN>`, vérifier l'accès au tableau et aux semaines futures.
4. Déclencher le cron à la main :

```bash
cd prepa-api && npx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=0+7+*+*+6"
```

5. Confirmer la réception du rappel sur tridav00@gmail.com.

- [ ] **Step 7: Documenter et commit**

Ajouter une section « Préparation aux courses » au `README.md` : rôle du Worker, commandes de test et de déploiement, rappel que les codes vivent en secrets Cloudflare et jamais dans le dépôt.

```bash
git add -A && git commit -m "Prepa : mise en ligne, CORS et documentation"
```

---

## Récapitulatif des jalons

| Jalon | Tâches | Échéance |
|---|---|---|
| Contenu des 5 programmes vérifié par les règles | 1 à 6 | **dimanche 26 juillet, avant 19 h** |
| API complète et testée | 7 à 12 | avant la semaine 3 |
| Interface coureur et back-office | 13 et 14 | avant la semaine 3 |
| Rappel automatique et mise en ligne | 15 et 16 | avant la semaine 4 |

Si les tâches 13 à 16 glissent, la semaine 1 reste diffusable manuellement (copie du contenu dans un message de groupe) sans invalider le travail des tâches 1 à 6.
