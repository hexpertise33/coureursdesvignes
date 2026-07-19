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

import {
  creerJeton,
  cookieJeton,
  roleDepuisRequete,
  debitDepasse,
  oublierTentative,
  egalConstant,
  DUREE_JETON,
} from './auth.js';
import { estPubliee, instantPublication, semaineCourante } from './calendrier.js';
import { creerOuTrouver, parId, parCle, nomAffiche } from './coureurs.js';
import { PROGRAMMES, semaineDuProgramme } from './programmes/index.js';
import { ZONES, zonesSecondairesDe } from './programmes/seances.js';
import { valider, devalider, pourCoureur } from './validations.js';
import { construireRappel, envoyerRappel, semaineDuRappel } from './email.js';
import {
  tableau,
  alertes,
  fusionner,
  supprimerCoureur,
  enregistrerOverride,
  poserVeto,
  overrides,
  vueOverride,
  semaineEffective,
  estBloquee,
  NB_SEMAINES_MAX,
} from './admin.js';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

// En-têtes de cache par défaut. La charge d'une route authentifiée dépend du
// rôle porté par le cookie : la même URL renvoie seize semaines complètes à
// l'encadrant et le seul calendrier de parution à un coureur. Sans le dire
// explicitement, un cache mutualisé en amont, ou une règle de cache Cloudflare
// posée un jour sur /api/*, pourrait resservir la réponse de l'encadrant au
// premier coureur venu. Le fichier _headers du site ne couvre pas ce Worker,
// c'est donc ici que ça se joue. no-store plutôt que private : rien de ce que
// sert cette API ne gagne à être conservé, ni en amont ni dans le navigateur.
const ENTETES_PRIVES = { 'cache-control': 'no-store', vary: 'Cookie' };

// Seule exception, la ressource publique : les zones d'intensité sont les
// mêmes pour tout le monde et ne dépendent d'aucun cookie.
const ENTETES_PUBLICS = { 'cache-control': 'public, max-age=3600', vary: 'Accept-Encoding' };

// Routes qui exigent une session. Elles sont listées pour que le contrôle du
// cookie n'intercepte pas les chemins inconnus : une URL qui n'existe pas
// doit répondre 404, avec ou sans session.
const ROUTES_PROTEGEES = new Set(['/api/coureur', '/api/programme', '/api/semaine', '/api/validation']);

// Routes du back-office, réservées à l'encadrant. Elles sont énumérées, et
// non reconnues par un préfixe /api/admin/ : un préfixe aurait répondu 403 à
// un coureur sur n'importe quel chemin imaginaire commençant par /api/admin/,
// ce qui lui apprend que le back-office existe et lui permet d'en deviner
// les routes par tâtonnement. Une URL qui n'existe pas répond 404, ici comme
// ailleurs, quel que soit le rôle.
const ROUTES_ADMIN = new Set([
  '/api/admin/tableau',
  '/api/admin/alertes',
  '/api/admin/semaine',
  '/api/admin/veto',
  '/api/admin/fusion',
  '/api/admin/coureur',
]);

export function json(donnees, statut = 200, entetes = {}) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { ...JSON_HEADERS, ...ENTETES_PRIVES, ...entetes },
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
    // `id` identifie la séance dans sa semaine ("EF-1", "EF-2", "SL-1") et
    // c'est lui que le client renvoie à /api/validation. `code` reste publié
    // à côté : il porte le type de séance, dont l'affichage a besoin pour
    // choisir une icône ou grouper, et il n'est plus une identité.
    id: s.id,
    code: s.code,
    titre: s.titre,
    duree: s.duree,
    zone: s.zone,
    description: s.description,
    objectif: s.objectif,
  };
  // Le déroulé est la même information que la description, découpée en étapes
  // pour être lisible en tenue devant sa montre. Il est donc publié au même
  // titre et sous la même garde : vueSeance n'est appelée que depuis une
  // semaine divulguée, une semaine non parue n'en laisse rien passer.
  vue.deroule = s.deroule.map((e) => ({ ...e }));
  if (s.conseil) vue.conseil = s.conseil;
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
 *
 * `veto` n'est renseigné que pour l'encadrant, et reste à null pour un
 * coureur, auquel cas la clé n'apparaît pas du tout. Une semaine bloquée
 * doit avoir, vue du coureur, exactement la forme d'une semaine pas encore
 * parue : sinon le drapeau devient un canal qui expose les décisions
 * d'encadrement (« la semaine était prête et elle a été retenue »), et il
 * permet de distinguer les deux situations que le refus de routeSemaine
 * prend justement soin de rendre indiscernables.
 */
function vueSemaine(s, publiee, divulgue, veto = null) {
  const base = {
    numero: s.numero,
    phase: s.phase,
    publiee,
    disponibleLe: iso(instantPublication(s.numero)),
  };
  if (veto !== null) base.veto = veto;
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

/**
 * Vue d'une validation de séance. valide_le et seance_id (colonnes brutes)
 * deviennent valideLe et seanceId (convention camelCase du reste de l'API) ;
 * l'identifiant de ligne et coureur_id ne sont jamais recopiés, ils n'ont
 * aucun usage côté client, qui sait déjà de quel coureur il s'agit.
 *
 * seanceId porte l'identité de la séance dans sa semaine, pas son code de
 * type : deux endurances fondamentales d'une même semaine sont "EF-1" et
 * "EF-2", et sont deux validations distinctes.
 */
function vueValidation(v) {
  return {
    semaine: v.semaine,
    seanceId: v.seance_id,
    ressenti: v.ressenti,
    note: v.note,
    valideLe: v.valide_le,
  };
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

function roleDuCode(code, env) {
  // Le test de type n'est pas décoratif : sans lui, une requête sans champ
  // "code" comparerait undefined à une variable d'environnement absente et
  // les deux seraient égales, ce qui ouvrirait une session à qui n'a rien
  // fourni si un binding venait à manquer en production.
  if (typeof code !== 'string' || code.length === 0) return null;
  // Comparaison à temps constant, comme pour les signatures de jeton : c'est
  // le code d'accès que cherche une force brute.
  if (env.CODE_ADMIN && egalConstant(code, env.CODE_ADMIN)) return 'admin';
  if (env.CODE_COUREUR && egalConstant(code, env.CODE_COUREUR)) return 'coureur';
  return null;
}

/**
 * Ouvre une session contre un code d'accès.
 *
 * Le contrôle de débit tient en une seule requête atomique, posée avant toute
 * comparaison de code. Deux propriétés en dépendent, dans cet ordre :
 *
 *   1. Atomicité. debitDepasse() compte et décide d'un seul coup. Lire le
 *      compteur ici puis l'incrémenter quelques instructions plus loin
 *      ouvrirait entre les deux une fenêtre où N requêtes concurrentes de la
 *      même IP liraient toutes le même compteur et feraient toutes évaluer
 *      leur code. Le D1 local sérialise et masque cette fenêtre ; le D1 de
 *      production, réparti sur plusieurs isolats, ne la masquera pas.
 *   2. Antériorité. Le comptage précède la comparaison du code, sinon une IP
 *      déjà bloquée continuerait à faire évaluer ses codes et la limite ne
 *      freinerait plus rien.
 *
 * Un adhérent légitime n'est pour autant jamais bloqué : sa tentative est bien
 * comptée comme les autres, puis décomptée dès qu'elle aboutit. C'est le
 * succès qui ne coûte rien, pas la tentative qui échappe au compteur.
 */
async function routeSession(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'inconnue';

  if (await debitDepasse(env.DB, ip)) {
    return json({ erreur: 'Trop de tentatives. Réessaie dans une heure.' }, 429);
  }

  const { code } = await corps(request);
  const role = roleDuCode(code, env);
  if (!role) return json({ erreur: "Code d'accès incorrect." }, 401);

  await oublierTentative(env.DB, ip);
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
  // Object.hasOwn et non PROGRAMMES[code] : "constructor", "__proto__",
  // "toString", "valueOf" ou "hasOwnProperty" remontent une fonction héritée
  // d'Object.prototype, que le garde de nullité laisserait passer. La suite
  // appellerait alors .semainesContenu.map sur elle et répondrait 500 au lieu
  // du 400 attendu.
  const p = code && Object.hasOwn(PROGRAMMES, code) ? PROGRAMMES[code] : null;
  if (!p) return { erreur: 'Programme inconnu.' };

  const faitIzon = coureur ? coureur.fait_izon === 1 : paramVrai(url.searchParams.get('izon'));
  return { p, faitIzon };
}

// ---------------------------------------------------------------------------
// Routes de contenu
// ---------------------------------------------------------------------------

/**
 * Une semaine est-elle réellement ouverte au coureur ?
 *
 * Deux conditions, et non une seule : la date de parution doit être passée
 * ET l'encadrant ne doit pas avoir posé son veto. Le veto l'emporte sur le
 * calendrier, y compris pour une semaine dont la date est passée depuis
 * longtemps : c'est tout son intérêt. Une semaine partie avec une erreur se
 * referme d'un clic, sans attendre le dimanche suivant.
 */
function ouverte(numero, maintenant, surcharge) {
  return estPubliee(numero, maintenant) && !estBloquee(surcharge);
}

async function routeProgramme(url, env, estAdmin) {
  const ctx = await contexteLecture(url, env, estAdmin);
  if (ctx.erreur) return json({ erreur: ctx.erreur }, 400);

  const maintenant = Date.now();
  // Une seule lecture de la table des surcharges pour tout le programme.
  const cartes = await overrides(env.DB);

  const semaines = ctx.p.semainesContenu.map((s) => {
    const surcharge = cartes.get(`${ctx.p.code}:${s.numero}`);
    const publiee = ouverte(s.numero, maintenant, surcharge);
    // La semaine est résolue pour sa phase, qui dépend de la variante, puis
    // le contenu remanié depuis le back-office prend le pas sur le fichier
    // source. vueSemaine ne recopiera ce contenu que si divulgue vaut vrai.
    const resolue = semaineDuProgramme(ctx.p.code, s.numero, { faitIzon: ctx.faitIzon });
    const effective = semaineEffective(resolue, surcharge);
    return vueSemaine(effective, publiee, publiee || estAdmin, estAdmin ? estBloquee(surcharge) : null);
  });

  // semaineCourante est recalculée depuis les semaines réellement ouvertes,
  // et non demandée au calendrier seul : sans veto les deux coïncident
  // toujours (les semaines parues forment un préfixe continu), mais une
  // semaine bloquée doit cesser d'être annoncée comme celle du moment.
  const ouvertes = semaines.filter((s) => s.publiee).map((s) => s.numero);

  return json({
    programme: vueProgramme(ctx.p),
    semaineCourante: ouvertes.length > 0 ? Math.max(...ouvertes) : 0,
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
 * désigne la semaine en cours, dont le calcul est fourni par l'appelant
 * (`courante`) parce qu'il dépend des vetos, que cette fonction n'a pas à
 * connaître.
 */
function numeroDemande(url, nbSemaines, courante) {
  const brut = url.searchParams.get('numero');

  if (brut === null || brut === '') {
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
  const cartes = await overrides(env.DB);

  // La semaine « en cours » est la dernière réellement ouverte : si la
  // dernière parue est sous veto, c'est la précédente qui fait foi, sinon
  // une requête sans numéro se verrait refuser la semaine qu'elle vient
  // elle-même de désigner.
  let courante = 0;
  for (let n = 1; n <= nb; n++) {
    if (ouverte(n, maintenant, cartes.get(`${ctx.p.code}:${n}`))) courante = n;
  }

  const demande = numeroDemande(url, nb, courante);
  if (demande.erreur) return json({ erreur: demande.erreur }, demande.statut);

  const { numero } = demande;
  const surcharge = cartes.get(`${ctx.p.code}:${numero}`);
  const publiee = ouverte(numero, maintenant, surcharge);
  if (!publiee && !estAdmin) {
    // Le refus ne porte que le numéro et la date d'ouverture : de quoi
    // afficher un compte à rebours, rien de l'entraînement lui-même. Il est
    // volontairement identique pour une semaine pas encore parue et pour une
    // semaine bloquée : le coureur n'a pas à savoir laquelle des deux
    // situations le concerne, et l'encadrant n'a pas à voir ses arbitrages
    // de dernière minute lisibles depuis l'application.
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
    semaine: vueSemaine(semaineEffective(s, surcharge), publiee, true, estAdmin ? estBloquee(surcharge) : null),
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

// ---------------------------------------------------------------------------
// Validation des séances
// ---------------------------------------------------------------------------

/**
 * Détermine la fiche coureur concernée par une validation, sur le même
 * principe que contexteLecture ci-dessus, appliqué cette fois à l'écriture.
 *
 * Le champ "coureur" (un identifiant numérique) n'est honoré que pour
 * l'encadrant. Les identifiants sont de petits entiers séquentiels,
 * triviaux à parcourir un par un, et le rôle "coureur" est un code partagé
 * par tout le club : les honorer pour un coureur aurait permis à n'importe
 * quel adhérent de valider des séances au nom d'un autre, ou de lire tout
 * son suivi (ressentis, notes), en changeant simplement ce nombre dans sa
 * requête.
 *
 * Un coureur ne désigne donc jamais sa fiche par identifiant : il la
 * désigne, comme à sa création, par son prénom et l'initiale de son nom
 * (parCle, cf. coureurs.js). C'est une identité qu'il connaît de lui-même et
 * qu'un tiers ne peut pas reconstituer en faisant défiler un compteur.
 */
async function coureurCible(donnees, env, estAdmin) {
  if (estAdmin) {
    const id = Number(donnees.coureur);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    return parId(env.DB, id);
  }
  return parCle(env.DB, { prenom: donnees.prenom, initiale: donnees.initiale });
}

/**
 * Traite POST /api/validation (valider une séance) et DELETE /api/validation
 * (la dévalider).
 *
 * Une semaine non publiée reste fermée à la validation pour un coureur,
 * exactement comme elle l'est à la lecture dans routeSemaine : sans ce
 * refus, /api/validation deviendrait un second canal pour deviner le
 * contenu d'une semaine à venir, en tâtonnant sur les codes de séance et en
 * observant lesquels sont acceptés. C'est pourquoi la publication est
 * vérifiée avant la validité du code de séance, et pourquoi le refus a
 * exactement la même forme (numéro et date d'ouverture seuls) que celui de
 * routeSemaine, qu'il s'agisse d'un code réel ou inventé. L'encadrant, qui
 * voit tout en permanence, n'est pas soumis à ce refus.
 */
/**
 * GET /api/validation : renvoie les validations du coureur désigné.
 *
 * Le coureur se désigne comme partout ailleurs, par prénom et initiale ; seul
 * l'encadrant peut viser un identifiant, ce qui l'empêche de lire le suivi
 * d'un camarade en changeant un paramètre.
 */
async function routeValidationsLire(url, env, estAdmin) {
  const donnees = {
    coureur: url.searchParams.get('coureur'),
    prenom: url.searchParams.get('prenom'),
    initiale: url.searchParams.get('initiale'),
  };

  let coureur;
  try {
    coureur = await coureurCible(donnees, env, estAdmin);
  } catch (e) {
    return json({ erreur: e.message }, 400);
  }
  if (!coureur) return json({ erreur: 'Coureur introuvable.' }, 400);

  return json({ validations: (await pourCoureur(env.DB, coureur.id)).map(vueValidation) });
}

async function routeValidation(request, env, methode, estAdmin) {
  const donnees = await corps(request);

  let coureur;
  try {
    coureur = await coureurCible(donnees, env, estAdmin);
  } catch (e) {
    return json({ erreur: e.message }, 400);
  }
  if (!coureur) return json({ erreur: 'Coureur introuvable.' }, 400);

  const numero = donnees.semaine;
  if (!Number.isInteger(numero) || numero < 1) {
    return json({ erreur: 'Semaine invalide.' }, 400);
  }

  const source = semaineDuProgramme(coureur.programme, numero, { faitIzon: coureur.fait_izon === 1 });
  if (!source) return json({ erreur: 'Semaine inconnue.' }, 404);

  const surcharge = (await overrides(env.DB)).get(`${coureur.programme}:${numero}`);

  if (!ouverte(numero, Date.now(), surcharge) && !estAdmin) {
    // Même forme que le refus de routeSemaine : le numéro et la date
    // d'ouverture seuls, jamais le contenu ni la liste des séances réelles.
    // Le veto compte ici au même titre que la date, sans quoi une semaine
    // bloquée resterait ouverte à la validation, et le jeu des codes de
    // séance acceptés ou refusés en dévoilerait le contenu séance par
    // séance, exactement ce que ce refus est censé empêcher.
    return json(
      {
        erreur: 'Semaine pas encore disponible.',
        numero,
        disponibleLe: iso(instantPublication(numero)),
      },
      403,
    );
  }

  // Les identifiants acceptés sont ceux de la semaine effectivement servie.
  // Sans cela, l'encadrant qui remanie une semaine depuis le back-office la
  // ferait afficher au coureur avec des séances que /api/validation
  // refuserait de cocher, et laisserait cocher des séances qui ne
  // s'affichent plus.
  //
  // C'est l'identifiant de séance ("EF-1") qui est attendu du client, et non
  // le code de type ("EF"). Le code ne distingue pas les deux endurances
  // fondamentales que 57 des 150 semaines du corpus contiennent : sur ces
  // semaines-là, la seconde validation écrasait la première, avec son
  // ressenti et sa note, et le coureur voyait une case se décocher en en
  // cochant une autre.
  const s = semaineEffective(source, surcharge);
  const identifiantsValides = new Set(s.seances.map((x) => x.id));
  if (!identifiantsValides.has(donnees.seanceId)) {
    return json({ erreur: 'Séance inconnue.' }, 400);
  }

  try {
    if (methode === 'POST') {
      await valider(env.DB, coureur.id, {
        semaine: numero,
        seanceId: donnees.seanceId,
        ressenti: donnees.ressenti ?? null,
        note: donnees.note ?? null,
      });
    } else {
      await devalider(env.DB, coureur.id, { semaine: numero, seanceId: donnees.seanceId });
    }
  } catch (e) {
    return json({ erreur: e.message }, 400);
  }

  const validations = (await pourCoureur(env.DB, coureur.id)).map(vueValidation);
  return json({ validations });
}

// ---------------------------------------------------------------------------
// Back-office de l'encadrant
// ---------------------------------------------------------------------------

/**
 * Routes du back-office. Le contrôle du rôle est fait par l'appelant, une
 * fois pour toutes : aucune des fonctions ci-dessous ne doit être joignable
 * autrement, et aucune ne refait le test pour son compte, ce qui laisserait
 * la porte ouverte le jour où l'une d'elles oublierait de le refaire.
 *
 * Les réponses suivent la même discipline que le reste du fichier : ce qui
 * part vers l'encadrant est projeté sur une liste blanche par admin.js
 * (tableau, alertes, vueOverride), jamais recopié depuis une ligne de base.
 * L'encadrant a le droit de tout voir du contenu d'entraînement, il n'a pas
 * pour autant besoin de la clé de déduplication ni des horodatages internes.
 */
async function routeAdmin(request, env, url, chemin, methode) {
  const maintenant = Date.now();

  if (chemin === '/api/admin/tableau') {
    if (methode !== 'GET') return methodeRefusee();
    const semaine = semaineCourante(maintenant, NB_SEMAINES_MAX);
    // Le tableau est lu une fois et repassé aux alertes, qui s'en servent
    // au lieu de le relire : les deux se calculent sur les mêmes comptes
    // d'assiduité, et un second balayage de table ne pourrait qu'en donner
    // une version décalée dans le temps.
    const [lecture, cartes] = await Promise.all([tableau(env.DB), overrides(env.DB)]);
    const { coureurs } = lecture;
    const liste = await alertes(env.DB, semaine, lecture);

    const parCoureur = new Map();
    for (const a of liste) {
      if (!parCoureur.has(a.coureurId)) parCoureur.set(a.coureurId, []);
      parCoureur.get(a.coureurId).push(a);
    }

    // Les coureurs à surveiller remontent en tête : c'est la raison d'être de
    // l'écran. À égalité d'alerte, l'ordre alphabétique de tableau() est
    // conservé, pour que la liste reste stable d'une consultation à l'autre.
    const avecAlertes = coureurs.map((c) => ({ ...c, alertes: parCoureur.get(c.id) ?? [] }));
    avecAlertes.sort((a, b) => (b.alertes.length > 0) - (a.alertes.length > 0));

    return json({
      semaineCourante: semaine,
      coureurs: avecAlertes,
      semainesModifiees: [...cartes.values()].map(vueOverride),
    });
  }

  if (chemin === '/api/admin/alertes') {
    if (methode !== 'GET') return methodeRefusee();
    // ?semaine= permet de rejouer les alertes sur une semaine passée, par
    // exemple pour relire ce qui aurait dû être vu. Une valeur absente ou
    // mal formée retombe sur la dernière semaine publiée, elle n'est pas une
    // erreur : c'est le cas d'usage courant.
    const brut = Number(url.searchParams.get('semaine'));
    const semaine = Number.isInteger(brut) && brut >= 1 && brut <= NB_SEMAINES_MAX
      ? brut
      : semaineCourante(maintenant, NB_SEMAINES_MAX);
    return json({ semaine, alertes: await alertes(env.DB, semaine) });
  }

  const donnees = await corps(request);
  const lire = (cle) => (Object.hasOwn(donnees, cle) ? donnees[cle] : undefined);

  try {
    if (chemin === '/api/admin/semaine') {
      if (methode !== 'PUT') return methodeRefusee();
      await enregistrerOverride(env.DB, lire('programme'), lire('semaine'), lire('contenu') ?? null, lire('veto'));
      return json({ ok: true });
    }

    if (chemin === '/api/admin/veto') {
      if (methode !== 'POST') return methodeRefusee();
      await poserVeto(env.DB, lire('programme'), lire('semaine'), Boolean(lire('veto')));
      return json({ ok: true });
    }

    if (chemin === '/api/admin/fusion') {
      if (methode !== 'POST') return methodeRefusee();
      await fusionner(env.DB, lire('garde'), lire('supprime'));
      return json({ ok: true });
    }

    if (chemin === '/api/admin/coureur') {
      if (methode !== 'DELETE') return methodeRefusee();
      await supprimerCoureur(env.DB, lire('id'));
      return json({ ok: true });
    }
  } catch (e) {
    // Les erreurs d'admin.js sont des messages de validation rédigés pour
    // l'encadrant : ils nomment le champ fautif et ne citent aucun contenu
    // d'entraînement.
    return json({ erreur: e.message }, 400);
  }

  return json({ erreur: 'route inconnue' }, 404);
}

/**
 * Aiguillage des routes. `methode` vaut déjà GET pour une requête HEAD (voir
 * fetch ci-dessous), une route de lecture n'a donc pas à connaître HEAD.
 */
async function router(request, env, methode) {
  const url = new URL(request.url);
  const chemin = url.pathname;

  if (chemin === '/api/sante') return json({ ok: true });

  // Les zones d'intensité sont la seule ressource publique : la page qui
  // les explique doit rester consultable avant la saisie du code, et elles
  // ne disent rien du programme de qui que ce soit. C'est aussi leur unique
  // source, le front ne les redéfinit jamais de son côté.
  if (chemin === '/api/zones') {
    if (methode !== 'GET') return methodeRefusee();
    return json({ zones: ZONES }, 200, ENTETES_PUBLICS);
  }

  if (chemin === '/api/session') {
    if (methode !== 'POST') return methodeRefusee();
    return routeSession(request, env);
  }

  if (!ROUTES_PROTEGEES.has(chemin) && !ROUTES_ADMIN.has(chemin)) {
    return json({ erreur: 'route inconnue' }, 404);
  }

  const role = await roleDepuisRequete(request, env);
  if (!role) return json({ erreur: 'Accès refusé.' }, 401);
  const estAdmin = role === 'admin';

  if (ROUTES_ADMIN.has(chemin)) {
    if (!estAdmin) return json({ erreur: "Réservé à l'encadrant." }, 403);
    return routeAdmin(request, env, url, chemin, methode);
  }

  if (chemin === '/api/coureur') {
    if (methode !== 'POST') return methodeRefusee();
    return routeCoureur(request, env);
  }

  if (chemin === '/api/validation') {
    // La lecture sert à réafficher les coches au chargement de la page. Elle
    // ne divulgue que les validations du coureur désigné, jamais de contenu
    // de séance : une validation ne porte qu'un identifiant, un ressenti et
    // une note écrite par le coureur lui-même.
    if (methode === 'GET') return routeValidationsLire(url, env, estAdmin);
    if (methode !== 'POST' && methode !== 'DELETE') return methodeRefusee();
    return routeValidation(request, env, methode, estAdmin);
  }

  if (methode !== 'GET') return methodeRefusee();
  if (chemin === '/api/programme') return routeProgramme(url, env, estAdmin);
  return routeSemaine(url, env, estAdmin);
}

// Origines autorisées à appeler l'API depuis un navigateur. La liste est
// fermée et non paramétrable par la requête : le cookie de session étant
// envoyé avec les appels (credentials), renvoyer l'origine demandée sans la
// vérifier laisserait n'importe quel site lire la prépa d'un adhérent connecté.
const ORIGINES = new Set([
  'https://coureursdesvignes.fr',
  'https://www.coureursdesvignes.fr',
  'http://localhost:4599',
  'http://127.0.0.1:4599',
]);

function entetesCors(request) {
  const origine = request.headers.get('origin');
  if (!origine || !ORIGINES.has(origine)) return {};
  return {
    'access-control-allow-origin': origine,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-max-age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const cors = entetesCors(request);

    // Requête préparatoire du navigateur avant un POST ou un DELETE.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...cors, vary: 'Origin' } });
    }

    // HTTP demande que HEAD soit accepté partout où GET l'est, avec les mêmes
    // en-têtes et sans corps. La requête est donc traitée comme un GET, puis
    // le corps est retiré de la réponse. Sans cela une sonde de supervision,
    // qui interroge volontiers en HEAD, signalerait l'API comme cassée.
    const estHead = request.method === 'HEAD';
    const brute = await router(request, env, estHead ? 'GET' : request.method);

    // Le Vary porte déjà Cookie sur les routes protégées : on y ajoute Origin,
    // sans quoi un cache pourrait resservir une réponse portant l'en-tête CORS
    // d'une autre origine.
    const entetes = new Headers(brute.headers);
    for (const [cle, valeur] of Object.entries(cors)) entetes.set(cle, valeur);
    const vary = entetes.get('vary');
    entetes.set('vary', vary ? `${vary}, Origin` : 'Origin');

    return new Response(estHead ? null : brute.body, { status: brute.status, headers: entetes });
  },

  /**
   * Cron du samedi matin : prévenir l'encadrant de ce qui part demain.
   *
   * Le contenu d'une semaine se publie tout seul le dimanche à 19 h, sans que
   * personne ne l'ait relu entre-temps. C'est la seule occasion donnée à
   * l'encadrant d'intervenir avant la parution, et elle ne vaut que s'il sait
   * aussi quels coureurs regarder : les alertes voyagent donc avec le rappel.
   *
   * Rien ici ne conditionne la publication. Un envoi qui échoue laisse la
   * semaine paraître normalement, et c'est voulu : le produit ne doit pas
   * dépendre de la bonne santé d'un service d'e-mail.
   */
  async scheduled(event, env, ctx) {
    const semaine = semaineDuRappel(Date.now());

    // Hors saison, il n'y a rien à annoncer. Le cron continue de se déclencher
    // tous les samedis, et sans cette sortie il enverrait indéfiniment un
    // rappel pour une semaine qui n'existe pas.
    if (semaine === null) return;

    // Les alertes se lisent sur la dernière semaine parue, la seule sur
    // laquelle des séances ont pu être validées. Avant l'ouverture de la
    // semaine 1, il n'y en a aucune et alertes() rend une liste vide.
    const listeAlertes = await alertes(env.DB, semaine - 1);
    const message = construireRappel(semaine, listeAlertes, env.SITE_URL);

    // waitUntil et non await : le handler rend la main tout de suite, et
    // l'envoi dispose quand même du temps d'exécution nécessaire.
    ctx.waitUntil(envoyerRappel(env, message));
  },
};
