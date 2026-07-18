// Horloge maîtrisée, partagée par les suites de tests.
//
// Le produit tout entier repose sur une date : chaque dimanche à 19 h une
// semaine s'ouvre, et pas avant. Une suite qui interroge l'API à l'heure où
// on la joue ne mesure donc pas le produit, elle mesure le calendrier. En
// juillet 2026 aucune semaine n'est encore parue, `publiee` vaut faux
// partout, et l'expression `publiee || estAdmin` se réduit à `estAdmin` :
// on peut supprimer la moitié de la règle sans qu'un seul test bronche.
// En décembre 2026 c'est l'inverse, tout est paru, et des assertions
// écrites pour l'été virent au rouge sans le moindre défaut de code.
//
// D'où l'outillage ci-dessous : « exécute cette requête comme si nous
// étions à tel instant ». Le Worker est appelé directement (worker.fetch)
// plutôt que par SELF.fetch, parce que c'est ce qui le fait tourner dans le
// même isolat que le test, donc sous le même Date.now.
//
// Ce module était à l'origine écrit dans test/api.test.js. Il en a été
// extrait à la tâche 12 pour que la suite du back-office s'en serve telle
// quelle : les alertes et le veto ne prouvent rien s'ils sont mesurés à la
// date du jour, et une seconde copie de ces utilitaires aurait fini par
// diverger de la première.

import { env } from 'cloudflare:test';

import worker from '../src/index.js';
import { creerJeton, DUREE_JETON } from '../src/auth.js';
import { instantPublication } from '../src/calendrier.js';

export const SECONDE = 1000;
export const JOUR = 86400000;

/** Exécute une action en faisant croire au code appelé qu'il est `instant`. */
export async function commeSi(instant, action) {
  const horlogeReelle = Date.now;
  Date.now = () => instant;
  try {
    return await action();
  } finally {
    Date.now = horlogeReelle;
  }
}

/**
 * Exécute une requête HTTP comme si nous étions à `instant`.
 *
 * Le cookie de session est fabriqué sous la même horloge que la requête :
 * un jeton daté de l'heure réelle serait déjà expiré, ou pas encore émis,
 * selon la frontière visée.
 */
export async function requeteA(instant, chemin, options = {}) {
  const { role = null, ip = '203.0.113.9', headers = {}, ...reste } = options;
  return commeSi(instant, async () => {
    const entetesFinaux = { 'cf-connecting-ip': ip, ...headers };
    if (role) {
      entetesFinaux.cookie = `prepa=${await creerJeton(env.SECRET_JETON, role, DUREE_JETON)}`;
    }
    const requete = new Request(`https://p.test${chemin}`, { ...reste, headers: entetesFinaux });
    return worker.fetch(requete, env);
  });
}

/** Idem, en décodant la charge JSON. */
export async function jsonA(instant, chemin, options = {}) {
  const reponse = await requeteA(instant, chemin, options);
  return { statut: reponse.status, donnees: await reponse.json(), reponse };
}

// Instants de référence des suites. Tout test dont le résultat dépend de la
// date s'accroche à l'un d'eux, jamais à Date.now().
//
//   AVANT_TOUT   une seconde avant l'ouverture de la semaine 1, rien n'est paru
//   MI_PARCOURS  à l'ouverture de la semaine 8, les 1 à 8 sont parues, pas la 9
//   APRES_TOUT   un jour après l'ouverture de la dernière semaine, tout est paru
export const AVANT_TOUT = instantPublication(1) - SECONDE;
export const MI_PARCOURS = instantPublication(8);
export const APRES_TOUT = instantPublication(17) + JOUR;
