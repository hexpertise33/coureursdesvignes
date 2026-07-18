// Gestion des coureurs. Pas de compte ni de mot de passe : un coureur se
// fait reconnaître d'une visite à l'autre par une forme normalisée de son
// prénom et de l'initiale de son nom (la "clé"), stockée avec un index
// unique en base. « Jean-Mi B », « jean mi b » et « JEAN-MI B » doivent
// tomber sur le même coureur sans qu'il ait à gérer quoi que ce soit ;
// « Jean-Michel B » doit en revanche rester une personne distincte, tout
// comme « Jean-Mi M » doit rester distinct de « Jean-Mi B ».
//
// Identité prénom + initiale (décision de l'encadrant du 18/07). Avec le
// seul prénom, deux adhérents homonymes (deux « Julien » par exemple)
// s'écrasaient silencieusement : le second remplaçait le programme, la
// variante de course et le statut Izon du premier, et l'historique de
// validations continuait de s'empiler sur une seule ligne mélangeant deux
// personnes, sans rien pour le détecter ni le défaire. Dans un club d'une
// trentaine d'adhérents aux prénoms français courants, la probabilité
// qu'au moins une paire d'homonymes existe est estimée entre 20 et 40 %.
// L'initiale du nom est donc désormais demandée d'emblée, au même titre que
// le prénom, et fait partie de la clé normalisée.

import { programme as resoudreProgramme } from './programmes/index.js';

// Tout ce qui n'est ni lettre ni chiffre (espace, tiret, apostrophe,
// ponctuation...) est un séparateur et disparaît de la clé. \p{L} et \p{N}
// couvrent aussi les alphabets qui n'ont pas d'accents à décomposer
// (cyrillique, idéogrammes...) : un prénom qui ne s'écrit pas avec des
// lettres latines reste un prénom valide, il ne doit pas être vidé par une
// normalisation qui ne connaîtrait que a-z0-9 et rejeté avec le même
// message qu'un champ réellement vide.
//
// Cette même expression suffit à retirer les accents une fois le texte
// décomposé en NFD : un caractère accentué comme "é" devient alors "e" suivi
// d'une marque diacritique combinante (U+0301), et cette marque est de
// catégorie Unicode Mn, donc déjà exclue par \p{L} comme par \p{N}. Une
// étape séparée dédiée aux marques diacritiques serait redondante ; vérifié
// empiriquement (avec et sans cette étape) sur "Hélène" → "helene", "Loïc" →
// "loic", "Noël" → "noel", "Владимир" → "владимир" et "李雷" → "李雷" :
// résultat strictement identique dans les deux cas.
const SEPARATEURS = /[^\p{L}\p{N}]/gu;

// Borne arbitraire mais raisonnable : rien dans le métier ne justifie un
// prénom de plusieurs centaines de caractères, et l'absence de toute borne
// permettait à un client de faire stocker un texte de taille arbitraire.
const LONGUEUR_MAX_PRENOM = 40;

// Coeur de la normalisation, partagé par le prénom et par l'initiale :
// décompose les accents (NFD), passe en minuscules, puis retire tout ce qui
// n'est ni lettre ni chiffre (y compris les marques diacritiques laissées
// par la décomposition, cf. commentaire de SEPARATEURS ci-dessus).
function cleDe(texte) {
  return texte.normalize('NFD').toLowerCase().replace(SEPARATEURS, '');
}

/**
 * Réduit un prénom saisi librement à sa forme normalisée : minuscules, sans
 * accents, sans espaces ni ponctuation. C'est cette forme qui contribue à la
 * clé technique qui sert à reconnaître un coureur d'une visite à l'autre.
 *
 * Lève une erreur si le prénom dépasse la longueur maximale raisonnable, ou
 * si le résultat normalisé est vide, c'est-à-dire si le prénom fourni était
 * vide, uniquement fait d'espaces, ou uniquement fait de ponctuation.
 */
export function normaliserPrenom(brut) {
  const texte = String(brut ?? '').trim();
  if (texte.length > LONGUEUR_MAX_PRENOM) {
    throw new Error(`Le prénom ne peut pas dépasser ${LONGUEUR_MAX_PRENOM} caractères.`);
  }

  const cle = cleDe(texte);
  if (!cle) {
    throw new Error('Le prénom est manquant ou ne contient aucune lettre exploitable.');
  }
  return cle;
}

/**
 * Valide l'initiale du nom et retourne la lettre seule, casse conservée. Un
 * point final ("B.") est une abréviation usuelle de l'initiale, pas un
 * caractère supplémentaire : il est retiré avant de vérifier qu'il ne reste
 * bien qu'une seule lettre. Toute autre longueur (absente, vide, plusieurs
 * caractères) ou tout caractère qui n'est pas une lettre est refusé.
 */
function validerInitiale(brut) {
  const texte = String(brut ?? '').trim();
  if (!texte) {
    throw new Error("L'initiale du nom est manquante.");
  }

  const sansPoint = texte.endsWith('.') ? texte.slice(0, -1) : texte;
  if ([...sansPoint].length !== 1 || !/^\p{L}$/u.test(sansPoint)) {
    throw new Error("L'initiale du nom doit être une seule lettre.");
  }
  return sansPoint;
}

/**
 * Compose la forme d'affichage d'un coureur à partir de son prénom et de son
 * initiale, casse et accents conservés tels que saisis : "Julien" + "B" →
 * "Julien B.".
 *
 * @param {{ prenom: string, initiale: string }} coureur
 * @returns {string}
 */
export function nomAffiche({ prenom, initiale }) {
  return `${prenom} ${initiale}.`;
}

/**
 * Crée le coureur s'il n'existe pas encore (selon la clé normalisée de son
 * prénom et de l'initiale de son nom), ou met à jour son programme, sa
 * variante de course et son choix Izon s'il revient. Ne le fait jamais
 * apparaître deux fois : la clé normalisée est unique en base, donc un même
 * prénom et une même initiale (sous quelque forme qu'ils aient été retapés)
 * retombent toujours sur la même ligne. À l'inverse, deux coureurs de même
 * prénom mais d'initiales différentes obtiennent deux clés distinctes et
 * n'interfèrent jamais l'un avec l'autre.
 *
 * @param {D1Database} db
 * @param {{ prenom: string, initiale: string, programme: string, varianteCourse?: string|null, faitIzon?: boolean }} entree
 * @returns {Promise<{ id: number, prenom: string, initiale: string, cle: string, programme: string, variante_course: string|null, fait_izon: number, cree_le: string }>}
 */
export async function creerOuTrouver(db, { prenom, initiale, programme, varianteCourse = null, faitIzon = false } = {}) {
  const prog = resoudreProgramme(programme);

  const clePrenom = normaliserPrenom(prenom);
  const initialeAffichee = validerInitiale(initiale);
  // Concaténation directe, sans risque de collision : la contribution de
  // l'initiale à la clé fait toujours exactement un caractère (un seul
  // point de code après décomposition/normalisation, cf. validerInitiale et
  // cleDe), donc deux couples (prénom, initiale) distincts ne peuvent
  // jamais produire la même clé. Le séparateur "_" n'est donc pas
  // nécessaire à l'unicité ; il est conservé pour la lisibilité de la
  // colonne "cle" en base (utile notamment pour l'administration).
  const cle = `${clePrenom}_${cleDe(initialeAffichee)}`;

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
  // Si deux requêtes créent le même prénom/initiale en même temps, la
  // contrainte d'unicité sur "cle" tranche : l'une des deux insère la
  // ligne, l'autre bascule automatiquement sur la branche UPDATE et relit
  // cette même ligne. Aucune des deux ne peut créer un second coureur pour
  // la même personne, et aucun aller-retour supplémentaire (un SELECT
  // séparé après coup) ne laisse de fenêtre où un tiers pourrait
  // s'intercaler entre l'écriture et la lecture.
  return db
    .prepare(
      `INSERT INTO coureurs (prenom, initiale, cle, programme, variante_course, fait_izon, cree_le)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(cle) DO UPDATE SET
         prenom = excluded.prenom,
         initiale = excluded.initiale,
         programme = excluded.programme,
         variante_course = excluded.variante_course,
         fait_izon = excluded.fait_izon
       RETURNING *`,
    )
    .bind(affiche, initialeAffichee, cle, programme, variante, izon, new Date().toISOString())
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
