// Gestion des coureurs. Pas de compte ni de mot de passe : un coureur se
// fait reconnaître d'une visite à l'autre uniquement par une forme
// normalisée de son prénom (la "clé"), stockée avec un index unique en
// base. « Jean-Mi », « jean mi » et « JEAN-MI » doivent tomber sur le même
// coureur sans qu'il ait à gérer quoi que ce soit ; « Jean-Michel » doit en
// revanche rester une personne distincte.

import { PROGRAMMES } from './programmes/index.js';

// Marques diacritiques combinantes (accents, tréma, cédille détachée...)
// telles que produites par la décomposition NFD : bloc unicode U+0300 à
// U+036F. On les retire après décomposition pour effacer l'accent sans
// toucher à la lettre de base ("é" → "e" + U+0301 → "e").
const MARQUES_DIACRITIQUES = /[\u0300-\u036f]/g;

// Tout ce qui n'est ni lettre ni chiffre (espace, tiret, apostrophe,
// ponctuation...) est un séparateur et disparaît de la clé. \p{L} et \p{N}
// couvrent aussi les alphabets qui n'ont pas d'accents à décomposer
// (cyrillique, idéogrammes...) : un prénom qui ne s'écrit pas avec des
// lettres latines reste un prénom valide, il ne doit pas être vidé par une
// normalisation qui ne connaîtrait que a-z0-9 et rejeté avec le même
// message qu'un champ réellement vide.
const SEPARATEURS = /[^\p{L}\p{N}]/gu;

/**
 * Réduit un prénom saisi librement à sa forme normalisée : minuscules, sans
 * accents, sans espaces ni ponctuation. C'est cette forme qui sert de clé
 * technique pour reconnaître un coureur d'une visite à l'autre.
 *
 * Lève une erreur si le résultat est vide, c'est-à-dire si le prénom fourni
 * était vide, uniquement fait d'espaces, ou uniquement fait de ponctuation.
 */
export function normaliserPrenom(brut) {
  const cle = String(brut ?? '')
    .normalize('NFD')
    .replace(MARQUES_DIACRITIQUES, '')
    .toLowerCase()
    .replace(SEPARATEURS, '');
  if (!cle) {
    throw new Error('Le prénom est manquant ou ne contient aucune lettre exploitable.');
  }
  return cle;
}

/**
 * Crée le coureur s'il n'existe pas encore (selon la clé normalisée de son
 * prénom), ou met à jour son programme, sa variante de course et son choix
 * Izon s'il revient. Ne le fait jamais apparaître deux fois : la clé
 * normalisée est unique en base, donc un même prénom (sous quelque forme
 * qu'il ait été retapé) retombe toujours sur la même ligne.
 *
 * @param {D1Database} db
 * @param {{ prenom: string, programme: string, varianteCourse?: string|null, faitIzon?: boolean }} entree
 * @returns {Promise<{ id: number, prenom: string, cle: string, programme: string, variante_course: string|null, fait_izon: number, cree_le: string }>}
 */
export async function creerOuTrouver(db, { prenom, programme, varianteCourse = null, faitIzon = false } = {}) {
  const prog = PROGRAMMES[programme];
  if (!prog) {
    throw new Error(`Programme inconnu : ${programme}`);
  }

  const cle = normaliserPrenom(prenom);
  // Le prénom affiché garde la casse et les accents tels que saisis, seule
  // la clé est normalisée : "Hélène" doit s'afficher "Hélène", pas "helene".
  const affiche = String(prenom).trim();

  // variante_course n'a de sens que pour P4 (marathon de Bordeaux ou de
  // Nice-Cannes) : pour tout autre programme la valeur fournie est ignorée
  // et forcée à null, pour ne pas laisser une donnée sans signification
  // s'installer en base. Pour P4, une variante fournie doit être l'une des
  // deux proposées par le programme.
  let variante = null;
  if (prog.variantesCourse) {
    if (varianteCourse != null) {
      const connue = prog.variantesCourse.some((v) => v.cle === varianteCourse);
      if (!connue) {
        throw new Error(`Variante de course inconnue pour ${programme} : ${varianteCourse}`);
      }
      variante = varianteCourse;
    }
  }

  const izon = faitIzon ? 1 : 0;

  // INSERT ... ON CONFLICT ... RETURNING en une seule requête atomique.
  // Si deux requêtes créent le même prénom en même temps, la contrainte
  // d'unicité sur "cle" tranche : l'une des deux insère la ligne, l'autre
  // bascule automatiquement sur la branche UPDATE et relit cette même
  // ligne. Aucune des deux ne peut créer un second coureur pour la même
  // personne, et aucun aller-retour supplémentaire (un SELECT séparé après
  // coup) ne laisse de fenêtre où un tiers pourrait s'intercaler entre
  // l'écriture et la lecture.
  return db
    .prepare(
      `INSERT INTO coureurs (prenom, cle, programme, variante_course, fait_izon, cree_le)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(cle) DO UPDATE SET
         prenom = excluded.prenom,
         programme = excluded.programme,
         variante_course = excluded.variante_course,
         fait_izon = excluded.fait_izon
       RETURNING *`,
    )
    .bind(affiche, cle, programme, variante, izon, new Date().toISOString())
    .first();
}

/**
 * Retrouve un coureur par son identifiant, ou null s'il n'existe pas.
 *
 * @param {D1Database} db
 * @param {number} id
 * @returns {Promise<object|null>}
 */
export function parId(db, id) {
  return db.prepare('SELECT * FROM coureurs WHERE id = ?').bind(id).first();
}
