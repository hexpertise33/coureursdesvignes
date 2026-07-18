// Authentification par code partagé : deux codes (coureur, admin) donnent
// un rôle, encapsulé dans un jeton signé en HMAC-SHA256 et posé en cookie.
// Aucune dépendance externe : uniquement l'API Web Crypto du runtime Workers.

const encodeur = new TextEncoder();

// Durée de vie par défaut du jeton : un an, pour éviter de resaisir le code
// à chaque visite.
export const DUREE_JETON = 365 * 24 * 3600 * 1000;

// Liste fermée des rôles acceptés. Un jeton correctement signé mais portant
// un rôle en dehors de cette liste doit être rejeté.
const ROLES_VALIDES = new Set(['coureur', 'admin']);

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

// Comparaison à temps constant des signatures, pour ne pas laisser fuiter
// d'information sur la validité par la durée de l'opération.
function egalConstant(a, b) {
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

// Limitation de débit sur la saisie du code : au plus 10 tentatives par
// adresse IP et par heure, pour empêcher de deviner le code admin par force
// brute. S'appuie sur la table "tentatives" (ip, heure, compte) créée par la
// migration 0001_init.sql.
//
// À appeler avant la comparaison du code, dans l'endpoint de connexion à
// écrire ensuite. Pour l'instant elle incrémente à chaque appel sans
// distinguer succès et échec ; idéalement il faudra ne comptabiliser que les
// échecs, faute de quoi un adhérent qui enchaîne dix connexions réussies se
// bloquerait lui-même.
export async function debitDepasse(db, ip) {
  const heure = new Date().toISOString().slice(0, 13);
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
  return (ligne?.compte ?? 0) > 10;
}
