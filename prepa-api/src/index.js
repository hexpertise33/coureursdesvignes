// Routes HTTP de l'application de préparation.
//
// Règle non négociable du produit : le contenu d'une semaine non publiée ne
// quitte jamais le serveur. Ce n'est pas un masquage d'affichage. Chaque
// dimanche à 19 h la semaine suivante s'ouvre, et jusque-là personne ne peut
// la lire, pas même en inspectant les échanges réseau. Seul l'encadrant
// (rôle admin) voit tout, tout le temps, puisque c'est lui qui relit et
// corrige le programme avant sa parution.
//
// Deux principes de mise en oeuvre, appliqués partout dans ce fichier :
//
//   1. Filtrage à la source. Le tri se fait au moment de construire la
//      réponse, jamais après coup et jamais côté client. Une semaine non
//      divulguée n'est pas vidée de ses séances, elle n'est tout simplement
//      jamais recopiée dans l'objet sérialisé.
//   2. Liste blanche de champs. Les vues ci-dessous (vueProgramme,
//      vueSemaine, vueSeance, vueCoureur) énumèrent les champs à publier au
//      lieu d'énumérer les champs à retirer. Un champ ajouté demain à un
//      programme, à une séance ou à une colonne de la base ne peut donc pas
//      se retrouver dans une réponse par simple oubli : il faudra l'ajouter
//      ici explicitement.

import { creerJeton, cookieJeton, roleDepuisRequete, debitDepasse, DUREE_JETON } from './auth.js';
import { estPubliee, instantPublication, semaineCourante } from './calendrier.js';
import { creerOuTrouver, parId, nomAffiche } from './coureurs.js';
import { PROGRAMMES, semaineDuProgramme } from './programmes/index.js';
import { ZONES, zonesSecondairesDe } from './programmes/seances.js';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

// Nombre de codes erronés tolérés par adresse IP et par heure. La limite est
// décidée ici plutôt que dans auth.js parce que c'est cette route qui sait
// distinguer un échec d'un succès.
const LIMITE_TENTATIVES = 10;

// Routes qui exigent une session. Elles sont listées pour que le contrôle du
// cookie n'intercepte pas les chemins inconnus : une URL qui n'existe pas
// doit répondre 404, avec ou sans session.
const ROUTES_PROTEGEES = new Set(['/api/coureur', '/api/programme', '/api/semaine']);

export function json(donnees, statut = 200, entetes = {}) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { ...JSON_HEADERS, ...entetes },
  });
}

function methodeRefusee() {
  return json({ erreur: 'Méthode non autorisée.' }, 405);
}

async function corps(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function iso(instant) {
  return new Date(instant).toISOString();
}

/** Lecture d'un paramètre booléen d'URL, tolérante aux écritures usuelles. */
function paramVrai(valeur) {
  return valeur === '1' || valeur === 'true' || valeur === 'oui';
}

// ---------------------------------------------------------------------------
// Vues : liste blanche des champs publiés
// ---------------------------------------------------------------------------

function vueSeance(s) {
  const vue = {
    code: s.code,
    titre: s.titre,
    duree: s.duree,
    zone: s.zone,
    description: s.description,
    objectif: s.objectif,
  };
  // La distance n'existe que sur la course objectif, les zones secondaires
  // que sur les séances qui en déclarent : on ne fabrique pas de champ vide.
  if (s.distance != null) vue.distance = s.distance;
  const secondaires = zonesSecondairesDe(s);
  if (secondaires.length > 0) vue.zonesSecondaires = [...secondaires];
  return vue;
}

/**
 * Vue d'une semaine. `divulgue` commande seul l'inclusion du contenu : titre,
 * intention et séances n'existent dans l'objet renvoyé que s'il vaut vrai.
 *
 * Le numéro, la phase et la date de disponibilité restent visibles dans tous
 * les cas : ils ne disent rien de l'entraînement à venir, ils permettent
 * simplement à l'application d'afficher le calendrier de parution et le
 * compte à rebours de la prochaine ouverture.
 */
function vueSemaine(s, publiee, divulgue) {
  const base = {
    numero: s.numero,
    phase: s.phase,
    publiee,
    disponibleLe: iso(instantPublication(s.numero)),
  };
  if (!divulgue) return base;
  return {
    ...base,
    titre: s.titre,
    intention: s.intention,
    seances: s.seances.map(vueSeance),
  };
}

function vueProgramme(p) {
  const vue = {
    code: p.code,
    nom: p.nom,
    dateCourse: p.dateCourse,
    izon: p.izon,
    prerequis: p.prerequis,
    nbSemaines: p.semainesContenu.length,
  };
  if (p.variantesCourse) {
    vue.variantesCourse = p.variantesCourse.map((v) => ({ cle: v.cle, nom: v.nom }));
  }
  return vue;
}

/**
 * Vue d'un coureur. La clé normalisée et la date de création restent en base :
 * la première est un détail technique de déduplication, la seconde n'a aucun
 * usage dans l'application du coureur.
 */
function vueCoureur(c) {
  return {
    id: c.id,
    prenom: c.prenom,
    initiale: c.initiale,
    nomAffiche: nomAffiche(c),
    programme: c.programme,
    varianteCourse: c.variante_course,
    faitIzon: c.fait_izon === 1,
  };
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/**
 * Compte les tentatives déjà enregistrées pour cette IP dans l'heure en
 * cours, sans rien incrémenter.
 *
 * debitDepasse() compte tous les appels, réussis comme ratés (voir son
 * commentaire dans auth.js) : l'appeler d'emblée à chaque connexion
 * bloquerait au bout de dix visites un adhérent qui tape pourtant le bon
 * code. On sépare donc les deux gestes : cette lecture décide si l'IP est
 * déjà bloquée, et debitDepasse() n'est appelée qu'après un échec avéré.
 *
 * L'ordre compte. La lecture précède la comparaison du code, sinon une IP
 * bloquée continuerait à faire évaluer ses codes et la limite ne freinerait
 * plus la force brute.
 */
async function tentativesRecentes(db, ip) {
  const heure = new Date().toISOString().slice(0, 13);
  const ligne = await db
    .prepare('SELECT compte FROM tentatives WHERE ip = ? AND heure = ?')
    .bind(ip, heure)
    .first();
  return ligne?.compte ?? 0;
}

function roleDuCode(code, env) {
  // Le test de type n'est pas décoratif : sans lui, une requête sans champ
  // "code" comparerait undefined à une variable d'environnement absente et
  // les deux seraient égales, ce qui ouvrirait une session à qui n'a rien
  // fourni si un binding venait à manquer en production.
  if (typeof code !== 'string' || code.length === 0) return null;
  if (env.CODE_ADMIN && code === env.CODE_ADMIN) return 'admin';
  if (env.CODE_COUREUR && code === env.CODE_COUREUR) return 'coureur';
  return null;
}

async function routeSession(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'inconnue';
  const trop = json({ erreur: 'Trop de tentatives. Réessaie dans une heure.' }, 429);

  if ((await tentativesRecentes(env.DB, ip)) >= LIMITE_TENTATIVES) return trop;

  const { code } = await corps(request);
  const role = roleDuCode(code, env);
  if (!role) {
    // Seuls les échecs alimentent le compteur.
    const bloque = await debitDepasse(env.DB, ip);
    return bloque ? trop : json({ erreur: "Code d'accès incorrect." }, 401);
  }

  const jeton = await creerJeton(env.SECRET_JETON, role, DUREE_JETON);
  return json({ role }, 200, { 'set-cookie': cookieJeton(jeton, DUREE_JETON) });
}

// ---------------------------------------------------------------------------
// Contexte de lecture : quel programme, quelle variante
// ---------------------------------------------------------------------------

/**
 * Détermine le programme à servir et la variante Izon à appliquer.
 *
 * Le paramètre `coureur` n'est honoré que pour l'encadrant. Tous les
 * adhérents partagent un seul code d'accès : si un identifiant numéroté
 * suffisait à charger les préférences d'une fiche, n'importe quel membre
 * pourrait parcourir les identifiants et découvrir le programme suivi et le
 * choix Izon de chacun de ses camarades. Le coureur, lui, décrit sa propre
 * vue avec `programme` et `izon`, deux choix qu'il a faits lui-même et qui ne
 * lui apprennent donc rien qu'il ne sache déjà. L'encadrant garde l'accès par
 * identifiant, dont il a besoin pour suivre ses coureurs.
 *
 * Le contenu d'un programme n'est pas un secret entre adhérents : les cinq
 * préparations sont proposées à tout le club derrière le même code. Ce qui
 * est confidentiel, c'est la date d'ouverture de chaque semaine, et ce
 * filtrage-là s'applique quel que soit le programme demandé.
 */
async function contexteLecture(url, env, estAdmin) {
  let coureur = null;
  if (estAdmin) {
    const id = Number(url.searchParams.get('coureur'));
    if (Number.isSafeInteger(id) && id > 0) coureur = await parId(env.DB, id);
  }

  const code = url.searchParams.get('programme') || coureur?.programme || null;
  const p = code ? PROGRAMMES[code] : null;
  if (!p) return { erreur: 'Programme inconnu.' };

  const faitIzon = coureur ? coureur.fait_izon === 1 : paramVrai(url.searchParams.get('izon'));
  return { p, faitIzon };
}

// ---------------------------------------------------------------------------
// Routes de contenu
// ---------------------------------------------------------------------------

async function routeProgramme(url, env, estAdmin) {
  const ctx = await contexteLecture(url, env, estAdmin);
  if (ctx.erreur) return json({ erreur: ctx.erreur }, 400);

  const maintenant = Date.now();
  const semaines = ctx.p.semainesContenu.map((s) => {
    const publiee = estPubliee(s.numero, maintenant);
    // La semaine n'est résolue que pour sa phase, qui dépend de la variante ;
    // vueSemaine ne recopiera son contenu que si divulgue vaut vrai.
    const resolue = semaineDuProgramme(ctx.p.code, s.numero, { faitIzon: ctx.faitIzon });
    return vueSemaine(resolue, publiee, publiee || estAdmin);
  });

  return json({
    programme: vueProgramme(ctx.p),
    semaineCourante: semaineCourante(maintenant, ctx.p.semainesContenu.length),
    semaines,
  });
}

/**
 * Lit le numéro de semaine demandé. Renvoie soit { numero }, soit { erreur }
 * accompagnée de son statut.
 *
 * La comparaison String(numero) !== brut refuse les écritures qui ne sont pas
 * la forme canonique d'un entier : "01", " 1", "1.0", "1e1", "+1". Sans elle,
 * Number() les accepterait toutes et une même semaine aurait une dizaine
 * d'URL différentes. Un numéro absent ou vide n'est pas une erreur : il
 * désigne la semaine en cours.
 */
function numeroDemande(url, nbSemaines, maintenant) {
  const brut = url.searchParams.get('numero');

  if (brut === null || brut === '') {
    const courante = semaineCourante(maintenant, nbSemaines);
    if (courante === 0) {
      return {
        erreur: "La préparation n'a pas encore commencé.",
        statut: 404,
      };
    }
    return { numero: courante };
  }

  const numero = Number(brut);
  if (!Number.isSafeInteger(numero) || String(numero) !== brut) {
    return { erreur: 'Numéro de semaine invalide.', statut: 400 };
  }
  // Hors bornes : on répond la même chose qu'à un numéro inexistant, sans
  // laisser entendre si la semaine existe mais reste fermée.
  if (numero < 1 || numero > nbSemaines) {
    return { erreur: 'Semaine inconnue.', statut: 404 };
  }
  return { numero };
}

async function routeSemaine(url, env, estAdmin) {
  const ctx = await contexteLecture(url, env, estAdmin);
  if (ctx.erreur) return json({ erreur: ctx.erreur }, 400);

  const maintenant = Date.now();
  const nb = ctx.p.semainesContenu.length;
  const demande = numeroDemande(url, nb, maintenant);
  if (demande.erreur) return json({ erreur: demande.erreur }, demande.statut);

  const { numero } = demande;
  const publiee = estPubliee(numero, maintenant);
  if (!publiee && !estAdmin) {
    // Le refus ne porte que le numéro et la date d'ouverture : de quoi
    // afficher un compte à rebours, rien de l'entraînement lui-même.
    return json(
      {
        erreur: 'Semaine pas encore disponible.',
        numero,
        disponibleLe: iso(instantPublication(numero)),
      },
      403,
    );
  }

  const s = semaineDuProgramme(ctx.p.code, numero, { faitIzon: ctx.faitIzon });
  if (!s) return json({ erreur: 'Semaine inconnue.' }, 404);

  return json({
    programme: ctx.p.code,
    semaine: vueSemaine(s, publiee, true),
  });
}

async function routeCoureur(request, env) {
  const { prenom, initiale, programme, varianteCourse, faitIzon } = await corps(request);
  try {
    const c = await creerOuTrouver(env.DB, { prenom, initiale, programme, varianteCourse, faitIzon });
    return json({ coureur: vueCoureur(c) });
  } catch (e) {
    // Les erreurs de creerOuTrouver et de programme() sont des messages de
    // validation rédigés pour être lus par le coureur, ils ne parlent que de
    // la saisie et ne citent aucun contenu d'entraînement.
    return json({ erreur: e.message }, 400);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const chemin = url.pathname;
    const methode = request.method;

    if (chemin === '/api/sante') return json({ ok: true });

    // Les zones d'intensité sont la seule ressource publique : la page qui
    // les explique doit rester consultable avant la saisie du code, et elles
    // ne disent rien du programme de qui que ce soit. C'est aussi leur unique
    // source, le front ne les redéfinit jamais de son côté.
    if (chemin === '/api/zones') {
      if (methode !== 'GET') return methodeRefusee();
      return json({ zones: ZONES });
    }

    if (chemin === '/api/session') {
      if (methode !== 'POST') return methodeRefusee();
      return routeSession(request, env);
    }

    if (!ROUTES_PROTEGEES.has(chemin)) return json({ erreur: 'route inconnue' }, 404);

    const role = await roleDepuisRequete(request, env);
    if (!role) return json({ erreur: 'Accès refusé.' }, 401);
    const estAdmin = role === 'admin';

    if (chemin === '/api/coureur') {
      if (methode !== 'POST') return methodeRefusee();
      return routeCoureur(request, env);
    }

    if (methode !== 'GET') return methodeRefusee();
    if (chemin === '/api/programme') return routeProgramme(url, env, estAdmin);
    return routeSemaine(url, env, estAdmin);
  },

  async scheduled(event, env, ctx) {
    // Rempli en tâche 14.
  },
};
