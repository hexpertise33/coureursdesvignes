// Validation des séances par le coureur : cocher une séance comme faite,
// avec un ressenti facultatif parmi trois valeurs et une note libre bornée
// en longueur, ou revenir sur une case cochée par erreur.
//
// Ce module ne connaît que la table "validations" : il écrit et relit une
// ligne. La politique d'accès (qui a le droit de valider pour qui, si une
// séance appartient réellement à la semaine désignée, si cette semaine est
// publiée) est tranchée par la route dans index.js, avant d'appeler les
// fonctions ci-dessous. Les mêler ici rendrait ce module dépendant des
// programmes et du calendrier pour ce qui n'est, au fond, qu'un CRUD.

export const RESSENTIS = ['facile', 'ok', 'difficile'];

// Borne arbitraire mais raisonnable, même logique que LONGUEUR_MAX_PRENOM
// dans coureurs.js : sans borne, un client peut faire stocker un texte de
// taille arbitraire dans une colonne prévue pour une courte remarque.
const NOTE_MAX = 500;

/**
 * Enregistre ou met à jour la validation d'une séance.
 *
 * Idempotent : valider deux fois la même séance (même coureur, même
 * semaine, même code de séance) ne crée jamais deux lignes, la contrainte
 * d'unicité UNIQUE(coureur_id, semaine, seance) de la migration 0001 le
 * garantit via ON CONFLICT. Le second appel remplace intégralement le
 * ressenti et la note du premier (et l'horodatage), il ne les fusionne pas :
 * c'est la dernière saisie du coureur qui compte, pas un empilement.
 *
 * @param {D1Database} db
 * @param {number} coureurId
 * @param {{ semaine: number, seance: string, ressenti?: string|null, note?: string|null }} entree
 * @returns {Promise<void>}
 */
export async function valider(db, coureurId, { semaine, seance, ressenti = null, note = null }) {
  if (!Number.isInteger(semaine) || semaine < 1) {
    throw new Error('Semaine invalide.');
  }
  if (typeof seance !== 'string' || seance.trim() === '') {
    throw new Error('Séance manquante.');
  }
  if (ressenti !== null && !RESSENTIS.includes(ressenti)) {
    throw new Error(`Ressenti invalide, attendu l'une des valeurs suivantes : ${RESSENTIS.join(', ')}.`);
  }
  const noteBornee = note ? String(note).slice(0, NOTE_MAX) : null;

  await db
    .prepare(
      `INSERT INTO validations (coureur_id, semaine, seance, ressenti, note, valide_le)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(coureur_id, semaine, seance) DO UPDATE SET
         ressenti = excluded.ressenti,
         note = excluded.note,
         valide_le = excluded.valide_le`,
    )
    .bind(coureurId, semaine, seance, ressenti, noteBornee, new Date().toISOString())
    .run();
}

/**
 * Retire la validation d'une séance.
 *
 * Idempotent elle aussi : dévalider une séance qui n'a jamais été validée
 * (ou déjà dévalidée) ne lève pas d'erreur. Un coureur qui décoche une case
 * par erreur, ou qui appuie deux fois de suite, ne doit jamais se heurter à
 * un message d'échec incompréhensible pour une action qui, de son point de
 * vue, a réussi : la séance n'est plus validée, ce qui est exactement ce
 * qu'il voulait.
 *
 * @param {D1Database} db
 * @param {number} coureurId
 * @param {{ semaine: number, seance: string }} cible
 * @returns {Promise<void>}
 */
export async function devalider(db, coureurId, { semaine, seance }) {
  await db
    .prepare('DELETE FROM validations WHERE coureur_id = ? AND semaine = ? AND seance = ?')
    .bind(coureurId, semaine, seance)
    .run();
}

/**
 * Liste les validations d'un coureur, triées par semaine puis séance.
 *
 * Ne renvoie que les colonnes utiles au suivi : ni l'identifiant de ligne ni
 * coureur_id, qui n'ont aucun usage une fois qu'on sait déjà de quel coureur
 * il s'agit.
 *
 * @param {D1Database} db
 * @param {number} coureurId
 * @returns {Promise<Array<{ semaine: number, seance: string, ressenti: string|null, note: string|null, valide_le: string }>>}
 */
export async function pourCoureur(db, coureurId) {
  const r = await db
    .prepare(
      'SELECT semaine, seance, ressenti, note, valide_le FROM validations WHERE coureur_id = ? ORDER BY semaine, seance',
    )
    .bind(coureurId)
    .all();
  return r.results;
}
