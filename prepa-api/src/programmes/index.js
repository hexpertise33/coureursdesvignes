import { P1 } from './p1-10km-izon.js';
import { P2 } from './p2-10km-bordeaux.js';
import { P3 } from './p3-semi-bordeaux.js';
import { P4 } from './p4-marathon.js';
import { P5 } from './p5-10km-paris.js';

/**
 * Registre des cinq programmes, clés P1 à P5 dans cet ordre. C'est le point
 * d'entrée que le Worker interroge pour servir une semaine à un coureur.
 */
export const PROGRAMMES = { P1, P2, P3, P4, P5 };

/**
 * Retourne le programme demandé, ou lève une erreur explicite si le code est
 * inconnu. Le message est en français : il finit potentiellement dans une
 * réponse HTTP lue par le coureur ou l'équipe d'encadrement.
 */
export function programme(code) {
  const p = PROGRAMMES[code];
  if (!p) throw new Error(`Programme inconnu : ${code}`);
  return p;
}

/**
 * Retourne la semaine numero d'un programme, avec la variante appliquée si la
 * semaine en porte une, ou null si ce numéro n'existe pas dans le programme.
 *
 * Résolution de variante. P2, P3 et P4 portent sur leur semaine 9 un champ
 * `variantes: { avecIzon, sansIzon }`, parce que le 10 km d'Izon du 27
 * septembre y est optionnel. Chaque variante est elle-même un objet semaine
 * complet, construit par semaine() dans seances.js, avec ses propres numero,
 * phase, titre, intention et seances. Les deux variantes n'ont ni la même
 * charge ni le même but : sansIzon est une semaine de bloc normale, avecIzon
 * est une semaine allégée puisque le coureur court le dimanche. La phase leur
 * est donc propre, exactement comme le titre, l'intention et les séances, et
 * doit être reprise avec le reste au moment de la résolution. Une résolution
 * qui ne recopierait que seances, titre et intention laisserait la phase de
 * la semaine porteuse (celle de la variante sansIzon, exposée par défaut dans
 * le champ `seances` de la semaine) coller à tort sur la variante avecIzon,
 * ce qui étiquetterait une semaine allégée comme une semaine de bloc.
 *
 * La semaine résolue n'expose plus le champ `variantes` : le coureur ne voit
 * que la version qui le concerne, et cette donnée est destinée à une réponse
 * réseau.
 */
export function semaineDuProgramme(code, numero, { faitIzon = false } = {}) {
  const p = programme(code);
  const s = p.semainesContenu.find((x) => x.numero === numero);
  if (!s) return null;
  if (!s.variantes) return s;

  const v = faitIzon ? s.variantes.avecIzon : s.variantes.sansIzon;
  // Reconstruit la semaine résolue à partir de la semaine porteuse, sans son
  // champ `variantes`, puis lui superpose les quatre champs propres à la
  // variante choisie : phase, titre, intention et seances. `numero` n'a pas
  // besoin d'être repris depuis la variante, il est identique des deux côtés
  // par construction (les deux variantes sont créées avec le même numéro que
  // la semaine qui les porte).
  const { variantes, ...semaineSansVariantes } = s;
  return {
    ...semaineSansVariantes,
    phase: v.phase,
    titre: v.titre,
    intention: v.intention,
    seances: v.seances,
  };
}
