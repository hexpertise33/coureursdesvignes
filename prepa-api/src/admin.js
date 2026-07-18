// Back-office de l'encadrant.
//
// C'est l'écran d'en face : le coureur coche ses séances, l'encadrant lit ce
// que ça donne. Il y voit qui suit, qui décroche, qui souffre, et il peut
// reprendre ou bloquer une semaine avant qu'elle ne paraisse.
//
// Ce module ne connaît ni le HTTP ni les cookies : il ne fait que lire et
// écrire la base, et rendre des objets déjà projetés. La politique d'accès
// (le back-office est fermé à un coureur) est tranchée par le routeur dans
// index.js, comme pour validations.js.
//
// Deux principes repris de index.js, parce qu'ils valent ici aussi :
//
//   1. Liste blanche de champs. Les fonctions ci-dessous énumèrent les
//      champs qu'elles publient au lieu d'énumérer ceux qu'elles retirent.
//      SELECT * suivi d'un `{ ...ligne }` aurait fait passer « cle » et
//      « cree_le » dans la réponse, et y ferait passer demain toute colonne
//      nouvelle par simple oubli.
//   2. Liste blanche à l'écriture aussi. Le contenu d'une semaine saisi
//      depuis le back-office est validé puis recopié champ par champ avant
//      d'être stocké : ce qui entre en base est déjà exactement ce que le
//      coureur pourra lire, et rien d'autre.

import { PROGRAMMES } from './programmes/index.js';
import { ZONES } from './programmes/seances.js';
import { nomAffiche } from './coureurs.js';

/** Longueur du plus long programme : borne haute d'une semaine de référence. */
export const NB_SEMAINES_MAX = Math.max(
  ...Object.values(PROGRAMMES).map((p) => p.semainesContenu.length),
);

// ---------------------------------------------------------------------------
// Tableau d'assiduité
// ---------------------------------------------------------------------------

/**
 * Tableau d'assiduité : tous les coureurs, tous programmes confondus, avec
 * leurs validations.
 *
 * Deux requêtes, pas une par coureur : le club compte quelques dizaines
 * d'adhérents et quelques centaines de validations, une jointure applicative
 * en mémoire coûte moins qu'une rafale d'allers-retours vers D1. Le tri se
 * fait en SQL (COLLATE NOCASE) pour que « alice » et « Alice » se rangent au
 * même endroit.
 *
 * @param {D1Database} db
 * @returns {Promise<{ coureurs: Array<object> }>}
 */
export async function tableau(db) {
  const coureurs = (
    await db
      .prepare(
        `SELECT id, prenom, initiale, programme, variante_course, fait_izon
           FROM coureurs
          ORDER BY prenom COLLATE NOCASE, initiale COLLATE NOCASE, id`,
      )
      .all()
  ).results;

  const validations = (
    await db
      .prepare(
        `SELECT coureur_id, semaine, seance, ressenti, note, valide_le
           FROM validations
          ORDER BY semaine, seance`,
      )
      .all()
  ).results;

  const parCoureur = new Map();
  for (const v of validations) {
    if (!parCoureur.has(v.coureur_id)) parCoureur.set(v.coureur_id, []);
    // valide_le (colonne brute) devient valideLe, convention camelCase du
    // reste de l'API ; coureur_id n'est pas recopié, il est déjà porté par
    // la fiche qui contient la liste.
    parCoureur.get(v.coureur_id).push({
      semaine: v.semaine,
      seance: v.seance,
      ressenti: v.ressenti,
      note: v.note,
      valideLe: v.valide_le,
    });
  }

  return {
    coureurs: coureurs.map((c) => ({
      id: c.id,
      prenom: c.prenom,
      initiale: c.initiale,
      nomAffiche: nomAffiche(c),
      programme: c.programme,
      varianteCourse: c.variante_course,
      faitIzon: c.fait_izon === 1,
      validations: parCoureur.get(c.id) ?? [],
    })),
  };
}

// ---------------------------------------------------------------------------
// Alertes
// ---------------------------------------------------------------------------

/**
 * Les séances d'une semaine sont-elles majoritairement difficiles ?
 *
 * Seules les validations portant un ressenti comptent : le ressenti est
 * facultatif, et une semaine entièrement validée sans le renseigner ne dit
 * rien de la charge ressentie. Sans ce filtre, trois séances cochées à la
 * hâte donneraient un dénominateur de trois pour un numérateur de zéro, ce
 * qui est correct ici mais deviendrait faux dès qu'on inverserait le test.
 *
 * `dures * 2 > total` est la majorité stricte : deux difficiles sur trois
 * déclenchent, une sur deux ne déclenche pas.
 */
function majoritairementDifficile(validations, semaine) {
  const exprimees = validations.filter((v) => v.semaine === semaine && v.ressenti);
  if (exprimees.length === 0) return false;
  const dures = exprimees.filter((v) => v.ressenti === 'difficile').length;
  return dures * 2 > exprimees.length;
}

/**
 * Coureurs à surveiller, selon les deux motifs retenus par l'encadrant.
 *
 *   'absence'    aucune séance validée sur la dernière semaine publiée. Le
 *                coureur a décroché, ou il a cessé de cocher : dans les deux
 *                cas l'encadrant veut le savoir.
 *   'difficulte' séances majoritairement difficiles deux semaines de suite.
 *                C'est le signal qui justifie toute la fonctionnalité :
 *                quelqu'un qui sur-cuisine, et dont on peut alléger la
 *                semaine suivante avant la blessure. Deux semaines et non
 *                une seule, parce qu'une semaine dure isolée est le
 *                fonctionnement normal d'un plan (semaine de choc, retour de
 *                coupure) et noierait l'encadrant sous les faux positifs.
 *
 * La semaine de référence est bornée à la longueur du programme de chaque
 * coureur. Sans ce plafond, un adhérent de P1 (dix semaines) serait signalé
 * absent des semaines 11 à 17 dès que le calendrier les aurait ouvertes pour
 * les autres programmes : une alerte permanente, pour une semaine qui
 * n'existe pas chez lui.
 *
 * Un coureur absent n'est jamais signalé en plus pour difficulté : sans
 * aucune validation sur la semaine, il n'y a pas de ressenti à interpréter.
 *
 * @param {D1Database} db
 * @param {number} semaineReference dernière semaine publiée du calendrier
 * @returns {Promise<Array<{ coureurId: number, prenom: string, nomAffiche: string, programme: string, semaine: number, type: 'absence'|'difficulte', detail: string }>>}
 */
export async function alertes(db, semaineReference) {
  if (!Number.isInteger(semaineReference) || semaineReference < 1) return [];

  const { coureurs } = await tableau(db);
  const resultat = [];

  for (const c of coureurs) {
    // Object.hasOwn et non PROGRAMMES[c.programme] : une fiche portant
    // « constructor » ou « toString » remonterait une fonction héritée
    // d'Object.prototype, et la lecture de .semainesContenu ferait tomber
    // tout le tableau d'assiduité en 500. Voir programmes/index.js.
    const p = Object.hasOwn(PROGRAMMES, c.programme) ? PROGRAMMES[c.programme] : null;
    if (!p) continue;

    const n = Math.min(semaineReference, p.semainesContenu.length);
    if (n < 1) continue;

    const commun = {
      coureurId: c.id,
      prenom: c.prenom,
      nomAffiche: c.nomAffiche,
      programme: c.programme,
      semaine: n,
    };

    if (!c.validations.some((v) => v.semaine === n)) {
      resultat.push({
        ...commun,
        type: 'absence',
        detail: `Aucune séance validée en semaine ${n}.`,
      });
      continue;
    }

    if (n >= 2 && majoritairementDifficile(c.validations, n) && majoritairementDifficile(c.validations, n - 1)) {
      resultat.push({
        ...commun,
        type: 'difficulte',
        detail: `Séances majoritairement difficiles en semaines ${n - 1} et ${n}. Envisager d'alléger la semaine suivante.`,
      });
    }
  }

  return resultat;
}

// ---------------------------------------------------------------------------
// Fusion et effacement
// ---------------------------------------------------------------------------

function identifiantValide(id) {
  return Number.isSafeInteger(id) && id > 0;
}

async function exige(db, id, quoi) {
  if (!identifiantValide(id)) throw new Error(`Identifiant de coureur invalide : ${quoi}.`);
  const ligne = await db.prepare('SELECT id FROM coureurs WHERE id = ?').bind(id).first();
  if (!ligne) throw new Error(`Coureur introuvable : ${quoi}.`);
}

/**
 * Fusionne deux fiches qui désignent la même personne, par exemple « Jean-Mi
 * B » et « Jean-Michel B », que la clé normalisée distingue à juste titre
 * mais que l'encadrant sait être un seul coureur. Les validations de la fiche
 * supprimée rejoignent la fiche gardée, puis la fiche supprimée disparaît.
 *
 * Le doublon, c'est-à-dire le cas où les deux fiches portent la même séance
 * de la même semaine, ne peut pas être conservé tel quel : la contrainte
 * UNIQUE(coureur_id, semaine, seance) de la migration 0001 l'interdit. Il
 * faut donc trancher, et la règle retenue est celle qui s'applique déjà
 * quand un coureur revalide une séance (voir validations.js) : la saisie la
 * plus récente remplace l'autre, ressenti et note compris.
 *
 * Justification. Après fusion, les deux fiches sont une seule personne : ces
 * deux lignes ne sont donc pas deux séances différentes, ce sont deux
 * saisies successives de la même séance par le même coureur, exactement ce
 * que valider() traite déjà en gardant la dernière. Garder arbitrairement la
 * ligne de la fiche conservée reviendrait à faire dépendre le ressenti final
 * d'un choix d'interface (laquelle des deux fiches l'encadrant a désignée
 * comme « à garder »), ce qui n'a aucun sens médical ni sportif. Et le
 * ressenti ne se fusionne pas champ par champ avec la note : « difficile »
 * accompagné de « genou douloureux » forme un tout, mélanger le ressenti de
 * l'un avec la note de l'autre fabriquerait un témoignage que personne n'a
 * écrit. À horodatage strictement égal, la ligne de la fiche gardée reste :
 * il faut bien un départage déterministe.
 *
 * Les quatre écritures partent en un seul batch, donc dans une seule
 * transaction : une fusion à moitié faite laisserait des validations
 * rattachées à une fiche effacée, ou une fiche vidée mais toujours là.
 *
 * @param {D1Database} db
 * @param {number} idGarde fiche conservée
 * @param {number} idSupprime fiche absorbée puis effacée
 * @returns {Promise<void>}
 */
export async function fusionner(db, idGarde, idSupprime) {
  if (idGarde === idSupprime) {
    throw new Error('Impossible de fusionner un coureur avec lui-même.');
  }
  await exige(db, idGarde, 'fiche à conserver');
  await exige(db, idSupprime, 'fiche à absorber');

  await db.batch([
    // 1. Chez la fiche gardée, on retire les lignes qu'une saisie plus
    //    récente de la fiche absorbée doit remplacer. Elles seules libèrent
    //    la place, les autres restent et gagnent l'arbitrage.
    db
      .prepare(
        `DELETE FROM validations
          WHERE coureur_id = ?
            AND EXISTS (
              SELECT 1 FROM validations AS autre
               WHERE autre.coureur_id = ?
                 AND autre.semaine = validations.semaine
                 AND autre.seance = validations.seance
                 AND autre.valide_le > validations.valide_le
            )`,
      )
      .bind(idGarde, idSupprime),
    // 2. Tout ce qui ne heurte plus la contrainte d'unicité change de fiche.
    //    OR IGNORE plutôt que OR REPLACE : les lignes qui heurtent encore
    //    sont celles qui ont perdu l'arbitrage de l'étape 1, elles doivent
    //    rester en place pour être effacées à l'étape 3, pas écraser la
    //    saisie plus récente qu'on vient justement de préserver.
    db.prepare('UPDATE OR IGNORE validations SET coureur_id = ? WHERE coureur_id = ?').bind(idGarde, idSupprime),
    // 3. Les perdantes de l'arbitrage, encore rattachées à la fiche absorbée.
    db.prepare('DELETE FROM validations WHERE coureur_id = ?').bind(idSupprime),
    // 4. La fiche elle-même.
    db.prepare('DELETE FROM coureurs WHERE id = ?').bind(idSupprime),
  ]);
}

/**
 * Efface un coureur et tout ce qui s'y rattache. C'est la mise en oeuvre du
 * droit à l'effacement : après cet appel, plus une ligne de la base ne parle
 * de cette personne.
 *
 * Les validations sont supprimées explicitement alors que la clé étrangère
 * de la migration 0001 porte déjà ON DELETE CASCADE. Ce n'est pas une
 * redondance inutile : SQLite n'applique les clés étrangères que si
 * `PRAGMA foreign_keys` est actif sur la connexion, réglage qui ne se décide
 * pas depuis ce module et qui peut différer entre la base simulée des tests
 * et le D1 de production. Faire reposer un droit sur un réglage de
 * connexion, c'est accepter de découvrir un jour des validations orphelines
 * portant les ressentis et les notes d'une personne qui a demandé son
 * effacement.
 *
 * @param {D1Database} db
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function supprimerCoureur(db, id) {
  await exige(db, id, 'fiche à effacer');
  await db.batch([
    db.prepare('DELETE FROM validations WHERE coureur_id = ?').bind(id),
    db.prepare('DELETE FROM coureurs WHERE id = ?').bind(id),
  ]);
}

// ---------------------------------------------------------------------------
// Édition d'une semaine : validation du contenu saisi
// ---------------------------------------------------------------------------

// Bornes de longueur, dans le même esprit que LONGUEUR_MAX_PRENOM et
// NOTE_MAX ailleurs dans le projet : sans borne, le back-office devient un
// moyen de faire stocker puis servir un texte de taille arbitraire.
const LONGUEURS = {
  titre: 120,
  intention: 500,
  seanceTitre: 80,
  description: 1500,
  objectif: 300,
  code: 20,
};

const MAX_SEANCES = 12;
const DUREE_MAX = 600;

// Un code de séance sert de clé dans l'application du coureur et voyage en
// clair dans les corps de requête de /api/validation : on le restreint à
// l'alphabet strict des codes existants (EF, SL, VMA, RENFO, COURSE...).
const CODE_SEANCE = /^[A-Za-z0-9-]+$/;

/**
 * Lit un champ texte du contenu saisi et le rend nettoyé, ou lève une erreur
 * rédigée en français à l'intention de l'encadrant.
 *
 * Object.hasOwn, et non un simple accès : une charge JSON peut porter
 * « __proto__ » ou « constructor », qui remonteraient une valeur héritée
 * d'Object.prototype au lieu de l'absence attendue.
 *
 * Le tiret cadratin est refusé, comme dans verifierTexte() de seances.js :
 * la règle vaut pour tous les textes affichés du projet, et le back-office
 * est précisément le seul endroit par lequel un texte non relu peut entrer.
 */
function texteObligatoire(objet, champ, max) {
  const brut = Object.hasOwn(objet, champ) ? objet[champ] : null;
  if (typeof brut !== 'string') {
    throw new Error(`Champ « ${champ} » : un texte est attendu.`);
  }
  const t = brut.trim();
  if (t === '') throw new Error(`Champ « ${champ} » : le texte est vide.`);
  if (t.length > max) throw new Error(`Champ « ${champ} » : ${max} caractères au maximum.`);
  if (t.includes('—')) {
    throw new Error(`Champ « ${champ} » : le tiret cadratin est proscrit, utiliser une virgule ou une parenthèse.`);
  }
  return t;
}

function zoneValide(brut) {
  if (brut === null || brut === undefined) return null;
  if (typeof brut !== 'string' || !Object.hasOwn(ZONES, brut)) {
    throw new Error(`Zone inconnue : ${brut}. Zones valides : ${Object.keys(ZONES).join(', ')}.`);
  }
  return brut;
}

/**
 * Valide un contenu de semaine saisi depuis le back-office et le rend
 * réduit à ses champs autorisés.
 *
 * Cette fonction répond à la question « une semaine modifiée peut-elle
 * contenir n'importe quoi ? ». Non, et pour deux raisons distinctes.
 *
 *   1. Ce que voit le coureur. Le contenu enregistré est servi tel quel par
 *      /api/semaine et /api/programme, et ses codes de séance deviennent la
 *      liste des codes que /api/validation accepte. Un contenu sans tableau
 *      `seances` ferait tomber vueSemaine (s.seances.map) en 500 sur la
 *      route du coureur, un dimanche soir, pour tout le club. Une séance
 *      sans `code` rendrait la validation impossible sans aucun message
 *      exploitable.
 *   2. Ce qui entre en base. Le résultat est recopié champ par champ : une
 *      clé inattendue posée dans la charge JSON ne se retrouve ni stockée ni
 *      servie, même si une vue future venait à recopier l'objet entier.
 *
 * La validation est donc faite à l'écriture (l'encadrant reçoit un 400 et un
 * message qui dit quel champ ne va pas) et refaite à la lecture, dans
 * contenuSurcharge() : une ligne écrite directement en base, hors de cette
 * route, ne doit pas pouvoir casser l'application du coureur.
 *
 * @param {unknown} brut
 * @returns {{ titre: string, intention: string, seances: Array<object> }}
 */
export function validerContenuSemaine(brut) {
  if (brut === null || typeof brut !== 'object' || Array.isArray(brut)) {
    throw new Error('Contenu de semaine invalide : un objet est attendu.');
  }

  const titre = texteObligatoire(brut, 'titre', LONGUEURS.titre);
  const intention = texteObligatoire(brut, 'intention', LONGUEURS.intention);

  const brutes = Object.hasOwn(brut, 'seances') ? brut.seances : null;
  if (!Array.isArray(brutes) || brutes.length === 0) {
    throw new Error('Une semaine doit comporter au moins une séance.');
  }
  if (brutes.length > MAX_SEANCES) {
    throw new Error(`Une semaine ne peut pas comporter plus de ${MAX_SEANCES} séances.`);
  }

  const vus = new Set();
  const seances = brutes.map((s) => {
    if (s === null || typeof s !== 'object' || Array.isArray(s)) {
      throw new Error('Séance invalide : un objet est attendu.');
    }

    const code = texteObligatoire(s, 'code', LONGUEURS.code);
    if (!CODE_SEANCE.test(code)) {
      throw new Error(`Code de séance invalide : ${code}. Lettres, chiffres et tirets seulement.`);
    }
    if (vus.has(code)) {
      throw new Error(`Code de séance en double dans la semaine : ${code}.`);
    }
    vus.add(code);

    const duree = Object.hasOwn(s, 'duree') ? s.duree : null;
    if (!Number.isInteger(duree) || duree <= 0 || duree > DUREE_MAX) {
      throw new Error(`Durée invalide pour la séance ${code} : un entier de 1 à ${DUREE_MAX} minutes est attendu.`);
    }

    const vue = {
      code,
      titre: texteObligatoire(s, 'titre', LONGUEURS.seanceTitre),
      duree,
      zone: zoneValide(Object.hasOwn(s, 'zone') ? s.zone : null),
      description: texteObligatoire(s, 'description', LONGUEURS.description),
      objectif: texteObligatoire(s, 'objectif', LONGUEURS.objectif),
    };

    // Champs facultatifs, absents de l'objet plutôt que posés à null : c'est
    // la convention de vueSeance dans index.js, qui ne fabrique pas de champ
    // vide sur une séance qui n'en porte pas.
    const distance = Object.hasOwn(s, 'distance') ? s.distance : null;
    if (distance !== null && distance !== undefined) {
      if (typeof distance !== 'number' || !Number.isFinite(distance) || distance <= 0) {
        throw new Error(`Distance invalide pour la séance ${code}.`);
      }
      vue.distance = distance;
    }

    const secondaires = Object.hasOwn(s, 'zonesSecondaires') ? s.zonesSecondaires : null;
    if (secondaires !== null && secondaires !== undefined) {
      if (!Array.isArray(secondaires)) {
        throw new Error(`zonesSecondaires doit être un tableau pour la séance ${code}.`);
      }
      const propres = secondaires.map((z) => zoneValide(z));
      if (propres.length > 0) vue.zonesSecondaires = propres;
    }

    return vue;
  });

  return { titre, intention, seances };
}

// ---------------------------------------------------------------------------
// Surcharges de semaine : édition et veto
// ---------------------------------------------------------------------------

function programmeValide(code) {
  if (typeof code !== 'string' || !Object.hasOwn(PROGRAMMES, code)) {
    throw new Error('Programme inconnu.');
  }
  return PROGRAMMES[code];
}

function semaineValide(p, numero) {
  const nb = p.semainesContenu.length;
  if (!Number.isInteger(numero) || numero < 1 || numero > nb) {
    throw new Error('Semaine inconnue.');
  }
  return numero;
}

/**
 * Enregistre le contenu remanié d'une semaine.
 *
 * `veto` laissé à undefined conserve le veto déjà posé, au lieu de le lever.
 * Ce n'est pas un détail : l'encadrant qui bloque une semaine puis la
 * reprend le fait dans cet ordre, et un formulaire d'édition qui n'aurait
 * pas de case « veto » à cocher aurait sinon publié la semaine au moment
 * même où il la corrigeait, c'est-à-dire exactement quand elle n'était pas
 * prête. Lever un veto est une décision, elle passe par poserVeto().
 *
 * `contenu` à null efface la modification et fait revenir au fichier source.
 *
 * @param {D1Database} db
 * @param {string} programme
 * @param {number} semaine
 * @param {object|null} contenu
 * @param {boolean|undefined} veto
 * @returns {Promise<void>}
 */
export async function enregistrerOverride(db, programme, semaine, contenu, veto) {
  const p = programmeValide(programme);
  const numero = semaineValide(p, semaine);
  const valide = contenu === null || contenu === undefined ? null : validerContenuSemaine(contenu);
  const json = valide ? JSON.stringify(valide) : null;
  const maintenant = new Date().toISOString();

  if (veto === undefined) {
    await db
      .prepare(
        `INSERT INTO semaines_override (programme, semaine, contenu_json, veto, modifie_le)
         VALUES (?, ?, ?, 0, ?)
         ON CONFLICT(programme, semaine) DO UPDATE SET
           contenu_json = excluded.contenu_json,
           modifie_le = excluded.modifie_le`,
      )
      .bind(programme, numero, json, maintenant)
      .run();
    return;
  }

  await db
    .prepare(
      `INSERT INTO semaines_override (programme, semaine, contenu_json, veto, modifie_le)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(programme, semaine) DO UPDATE SET
         contenu_json = excluded.contenu_json,
         veto = excluded.veto,
         modifie_le = excluded.modifie_le`,
    )
    .bind(programme, numero, json, veto ? 1 : 0, maintenant)
    .run();
}

/**
 * Pose ou lève le veto de publication sur une semaine, sans toucher au
 * contenu déjà remanié.
 *
 * Le contenu est délibérément absent de cette requête : un veto est une
 * décision de publication, pas une remise à zéro du travail d'édition. Une
 * seule fonction qui écrirait les deux (comme le faisait le brief) effacerait
 * la semaine reprise à la main dès que l'encadrant la bloquerait, et il
 * découvrirait la perte au moment de la débloquer.
 *
 * @param {D1Database} db
 * @param {string} programme
 * @param {number} semaine
 * @param {boolean} veto
 * @returns {Promise<void>}
 */
export async function poserVeto(db, programme, semaine, veto) {
  const p = programmeValide(programme);
  const numero = semaineValide(p, semaine);

  await db
    .prepare(
      `INSERT INTO semaines_override (programme, semaine, contenu_json, veto, modifie_le)
       VALUES (?, ?, NULL, ?, ?)
       ON CONFLICT(programme, semaine) DO UPDATE SET
         veto = excluded.veto,
         modifie_le = excluded.modifie_le`,
    )
    .bind(programme, numero, veto ? 1 : 0, new Date().toISOString())
    .run();
}

/**
 * Toutes les surcharges, indexées par « programme:semaine ».
 *
 * Une seule lecture par requête HTTP : les routes de contenu parcourent
 * jusqu'à dix-sept semaines, une requête par semaine multiplierait les
 * allers-retours vers D1 pour une table qui compte au plus quelques lignes.
 *
 * @param {D1Database} db
 * @returns {Promise<Map<string, object>>}
 */
export async function overrides(db) {
  const r = await db
    .prepare('SELECT programme, semaine, contenu_json, veto, modifie_le FROM semaines_override')
    .all();
  const carte = new Map();
  for (const o of r.results) carte.set(`${o.programme}:${o.semaine}`, o);
  return carte;
}

/** Vue publiable d'une surcharge : jamais le contenu brut, seulement son état. */
export function vueOverride(o) {
  return {
    programme: o.programme,
    semaine: o.semaine,
    modifiee: o.contenu_json !== null,
    veto: o.veto === 1,
    modifieLe: o.modifie_le,
  };
}

/**
 * Contenu remanié d'une semaine, ou null s'il n'y en a pas ou s'il est
 * inexploitable.
 *
 * La revalidation à la lecture n'est pas une paranoïa gratuite. Une ligne de
 * semaines_override peut avoir été écrite hors de la route admin (migration,
 * console D1, restauration de sauvegarde d'une version antérieure du
 * format). Sans ce garde-fou, un JSON tronqué ferait lever JSON.parse dans
 * la route du coureur, un objet sans `seances` ferait lever
 * `s.seances.map`, et dans les deux cas le coureur recevrait un 500 sur sa
 * semaine en cours. On préfère retomber silencieusement sur le fichier
 * source : le contenu servi est alors peut-être périmé, mais il est cohérent
 * et il arrive.
 *
 * @param {object|undefined} surcharge ligne de semaines_override
 * @returns {{ titre: string, intention: string, seances: Array<object> }|null}
 */
export function contenuSurcharge(surcharge) {
  if (!surcharge || !surcharge.contenu_json) return null;
  try {
    return validerContenuSemaine(JSON.parse(surcharge.contenu_json));
  } catch {
    return null;
  }
}

/**
 * Applique la surcharge à une semaine résolue depuis les fichiers source.
 *
 * Seuls le titre, l'intention et les séances sont remplaçables. Le numéro et
 * la phase restent ceux du programme : le numéro est l'identité de la
 * semaine dans le calendrier de parution, et la phase est une étiquette de
 * structure (« bloc », « affûtage ») que l'encadrant ne remanie pas séance
 * par séance.
 *
 * @param {object} source semaine résolue par semaineDuProgramme
 * @param {object|undefined} surcharge ligne de semaines_override
 */
export function semaineEffective(source, surcharge) {
  const contenu = contenuSurcharge(surcharge);
  if (!contenu) return source;
  return { ...source, titre: contenu.titre, intention: contenu.intention, seances: contenu.seances };
}

/** Une semaine est-elle bloquée par un veto de l'encadrant ? */
export function estBloquee(surcharge) {
  return surcharge?.veto === 1;
}
