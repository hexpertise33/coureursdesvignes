// Authentification par code partagé : deux codes (coureur, admin) donnent
// un rôle, encapsulé dans un jeton signé en HMAC-SHA256 et posé en cookie.
// Aucune dépendance externe : uniquement l'API Web Crypto du runtime Workers.

const encodeur = new TextEncoder();

// Durée de vie par défaut du jeton : 120 jours, puis il faut ressaisir le
// code. La durée est écrite en jours pleins et non en mois, parce qu'un
// « mois » n'est pas une durée fixe et qu'une expiration signée doit être un
// nombre, pas une intention.
//
// C'est un compromis, et il se décide dans ce sens plutôt que dans l'autre.
// Trop court, le coureur ressaisit le code sans arrêt et finit par l'écrire
// quelque part, ce qui affaiblit le seul secret qui protège la prépa. Trop
// long, une session ouverte sur un téléphone prêté ou revendu ne se referme
// jamais.
//
// 120 jours est calé sur la saison. La semaine 1 paraît le 26 juillet 2026 et
// la dernière semaine du dernier programme (P5, 17 semaines) se termine le
// 22 novembre. Une session ouverte à la parution de la semaine 1 expire donc
// le 23 novembre, le lendemain de la fin de saison : aucun coureur n'est
// déconnecté pendant sa préparation, et aucune session ne survit à celle-ci.
//
// Ce calage se vérifie dans test/auth.test.js. Si les dates de la saison
// changent, c'est ce test qui préviendra que la durée n'est plus la bonne.
export const DUREE_JETON = 120 * 24 * 3600 * 1000;

// Liste fermée des rôles acceptés. Un jeton correctement signé mais portant
// un rôle en dehors de cette liste doit être rejeté.
const ROLES_VALIDES = new Set(['coureur', 'admin']);

function base64url(octets) {
  let s = '';
  for (const o of new Uint8Array(octets)) s += String.fromCharCode(o);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Un secret de signature absent n'est pas un secret vide, c'est une panne.
 *
 * TextEncoder.encode(undefined) n'échoue pas : il encode la chaîne
 * « undefined » et rend une clé HMAC parfaitement valide, connue de
 * quiconque devine que le binding manque. Un jeton admin devient alors
 * forgeable sans rien casser d'apparent, et l'application se comporte
 * normalement pendant ce temps.
 *
 * Le cas n'est pas théorique : un Worker fraîchement déployé existe avant que
 * ses secrets ne soient posés, puisque wrangler secret put exige que le
 * Worker existe déjà. Cette fenêtre est courte mais réelle, et elle se
 * rouvrira à chaque environnement neuf.
 *
 * On refuse donc de signer. Les appelants traitent l'absence de jeton
 * valide comme un refus d'accès, ce qui fait échouer l'authentification en se
 * fermant plutôt qu'en s'ouvrant.
 */
function secretUtilisable(secret) {
  return typeof secret === 'string' && secret.length > 0;
}

async function signer(secret, charge) {
  if (!secretUtilisable(secret)) {
    throw new Error('SECRET_JETON absent ou vide : refus de signer un jeton.');
  }
  const cle = await crypto.subtle.importKey(
    'raw', encodeur.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return base64url(await crypto.subtle.sign('HMAC', cle, encodeur.encode(charge)));
}

// Comparaison à temps constant, pour ne pas laisser fuiter d'information sur
// la validité par la durée de l'opération. Sert aux signatures de jeton comme
// aux codes d'accès : le code d'accès est le vrai secret visé par une force
// brute, il n'y avait aucune raison de le comparer avec === pendant qu'on
// prenait ce soin pour les signatures.
export function egalConstant(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Crée un jeton signé "role.expiration.signature". La signature couvre le
// rôle et l'expiration ensemble : toute modification de l'un ou l'autre
// invalide la signature, ce qui empêche un coureur de se faire passer pour
// un admin en substituant simplement le rôle dans son cookie. Le rôle est
// validé ici aussi, pas seulement à la vérification : sans ce garde-fou
// symétrique, on pourrait signer un jeton "super-admin" que verifierJeton
// rejettera plus tard, un échec silencieux et tardif au lieu d'immédiat.
export async function creerJeton(secret, role, dureeMs = DUREE_JETON) {
  if (!ROLES_VALIDES.has(role)) {
    throw new Error(`rôle invalide : ${role}`);
  }
  const charge = `${role}.${Date.now() + dureeMs}`;
  return `${charge}.${await signer(secret, charge)}`;
}

// Vérifie un jeton. Ne lève jamais d'exception : toute entrée mal formée,
// vide, ou invalide renvoie simplement null.
export async function verifierJeton(secret, jeton) {
  try {
    const morceaux = String(jeton || '').split('.');
    if (morceaux.length !== 3) return null;
    const [role, expiration, signature] = morceaux;
    if (!ROLES_VALIDES.has(role)) return null;
    const attendue = await signer(secret, `${role}.${expiration}`);
    if (!egalConstant(signature, attendue)) return null;
    // Number('pasunnombre') vaut NaN, et NaN < x est toujours faux : sans le
    // garde-fou Number.isSafeInteger, un jeton à l'expiration non numérique
    // passerait pour toujours valide (jeton perpétuel). La comparaison
    // String(exp) !== expiration rejette en plus les représentations
    // exotiques d'un même nombre (hexadécimal, espace en tête, suffixe
    // parasite) qui survivraient à Number() sans être l'écriture canonique
    // produite par creerJeton.
    const exp = Number(expiration);
    if (!Number.isSafeInteger(exp) || String(exp) !== expiration || exp < Date.now()) return null;
    return { role };
  } catch {
    return null;
  }
}

// Extrait le rôle du cookie "prepa" porté par la requête, en vérifiant le
// jeton avec le secret de l'environnement. Renvoie null en l'absence de
// cookie ou si aucun jeton "prepa" n'est valide. Un attaquant maîtrisant un
// sous-domaine peut injecter un second cookie "prepa" (cookie tossing) : on
// ne s'arrête donc pas au premier candidat, on cherche le premier qui
// vérifie réellement, pour ne pas laisser un cookie invalide neutraliser la
// session de l'encadrant.
export async function roleDepuisRequete(request, env) {
  const brut = request.headers.get('cookie') || '';
  const candidats = brut.split(';').map((c) => c.trim()).filter((c) => c.startsWith('prepa='));
  for (const candidat of candidats) {
    const resultat = await verifierJeton(env.SECRET_JETON, candidat.slice('prepa='.length));
    if (resultat) return resultat.role;
  }
  return null;
}

// Construit l'en-tête Set-Cookie du jeton. HttpOnly et Secure empêchent tout
// accès ou fuite côté client, SameSite=Lax limite l'envoi sur requêtes
// cross-site, Path=/ couvre toute l'application.
export function cookieJeton(jeton, dureeMs = DUREE_JETON) {
  return `prepa=${jeton}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.floor(dureeMs / 1000)}`;
}

// Nombre de tentatives tolérées par adresse IP et par heure sur la saisie du
// code. Seuil unique du projet : index.js et les tests l'importent d'ici au
// lieu d'en garder une copie, deux copies finissant tôt ou tard par diverger.
export const LIMITE_TENTATIVES = 10;

/** Clé de compteur : l'heure UTC en cours, au format "AAAA-MM-JJTHH". */
function heureCourante() {
  return new Date().toISOString().slice(0, 13);
}

// Limitation de débit sur la saisie du code : au plus LIMITE_TENTATIVES
// tentatives par adresse IP et par heure, pour empêcher de deviner le code
// admin par force brute. S'appuie sur la table "tentatives" (ip, heure,
// compte) créée par la migration 0001_init.sql.
//
// À appeler AVANT la comparaison du code, et sans lecture préalable : cette
// fonction compte et décide en une seule requête atomique. C'est tout l'objet
// du INSERT ... ON CONFLICT ... RETURNING ci-dessous, et c'est ce qui interdit
// de la remplacer par un « je lis le compteur, je compare, j'écris plus loin ».
//
// Elle compte donc tous les appels, réussis comme ratés. Pour qu'un adhérent
// qui tape le bon code ne se bloque pas lui-même, c'est le succès qui se
// décompte après coup, via oublierTentative() : voir routeSession dans
// index.js.
export async function debitDepasse(db, ip) {
  const heure = heureCourante();
  // Purge des heures révolues à chaque appel : pas de tâche de purge séparée
  // à orchestrer, et la table ne conserve jamais plus que l'heure courante
  // (et l'heure qu'elle est en train de remplacer).
  await db.prepare('DELETE FROM tentatives WHERE heure < ?').bind(heure).run();
  // Requête atomique unique (INSERT ... ON CONFLICT ... RETURNING) : lire
  // puis incrémenter en deux allers-retours séparés laisse une fenêtre où
  // des appels concurrents pour la même IP lisent tous le même compteur
  // avant qu'aucun n'ait écrit, ce qui laisse passer plus de 10 tentatives
  // (ou, entrelacement inverse, en rejette à tort en dessous de la limite).
  const ligne = await db.prepare(
    `INSERT INTO tentatives (ip, heure, compte) VALUES (?, ?, 1)
     ON CONFLICT(ip, heure) DO UPDATE SET compte = compte + 1
     RETURNING compte`
  ).bind(ip, heure).first();
  return (ligne?.compte ?? 0) > LIMITE_TENTATIVES;
}

/**
 * Retire du compteur la tentative qui vient d'aboutir. Une connexion réussie
 * ne doit rien coûter à l'adhérent : sans ce décompte, dix visites légitimes
 * dans l'heure le bloqueraient comme une force brute.
 *
 * Une seule requête, elle aussi : le décrément est calculé par la base, jamais
 * par une lecture suivie d'une écriture.
 */
export async function oublierTentative(db, ip) {
  await db
    .prepare('UPDATE tentatives SET compte = compte - 1 WHERE ip = ? AND heure = ? AND compte > 0')
    .bind(ip, heureCourante())
    .run();
}
