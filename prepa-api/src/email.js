// Rappel du samedi.
//
// Le contenu d'une semaine se publie tout seul le dimanche à 19 h. Personne
// ne relit rien entre-temps, et une semaine part donc telle qu'elle a été
// écrite, y compris quand le tableau d'assiduité montrait depuis plusieurs
// jours qu'un coureur décrochait. Ce rappel est la seule occasion donnée à
// l'encadrant d'intervenir avant la parution : il arrive la veille, il dit
// quelle semaine va partir, et il nomme les coureurs à regarder.
//
// Il ne décide de rien. La publication n'attend pas sa lecture, et une panne
// d'envoi ne doit donc jamais empêcher une semaine de paraître.

import { estPubliee } from './calendrier.js';
import { NB_SEMAINES_MAX } from './admin.js';

/**
 * La semaine que le rappel doit annoncer, ou null s'il n'y a rien à annoncer.
 *
 * C'est la première semaine non encore parue. Écrite ainsi plutôt qu'en
 * « semaine courante plus une », qui donne le même résultat au milieu de la
 * saison mais se trompe aux deux bouts : avant l'ouverture, semaineCourante()
 * vaut 0 et la formule tombe juste par accident ; après la dernière parution
 * elle vaut NB_SEMAINES_MAX et la formule annonce une semaine 18 qui n'existe
 * pas, tous les samedis suivants, indéfiniment.
 *
 * Rendre null plutôt que de laisser passer un numéro hors bornes met la
 * décision « faut-il envoyer quelque chose » ici, à l'endroit où on sait y
 * répondre, plutôt que dans le handler qui se contente d'obéir.
 */
export function semaineDuRappel(maintenant = Date.now()) {
  for (let n = 1; n <= NB_SEMAINES_MAX; n++) {
    if (!estPubliee(n, maintenant)) return n;
  }
  return null;
}

/**
 * Corps du rappel. Fonction pure : elle ne lit ni l'heure ni la base, ce qui
 * la rend vérifiable sans monter d'environnement.
 *
 * Pas de tiret cadratin, comme partout ailleurs dans le projet.
 */
export function construireRappel(semaineAVenir, alertesListe, siteUrl) {
  const sujet = `Prépa : la semaine ${semaineAVenir} part demain à 19 h`;

  const lignes = [
    'Bonjour David,',
    '',
    `La semaine ${semaineAVenir} sera publiée demain dimanche à 19 h.`,
    `Tu peux la relire et la modifier ici : ${siteUrl}/prepa.html`,
    '',
  ];

  if (alertesListe.length === 0) {
    lignes.push('Aucun coureur à surveiller cette semaine.');
  } else {
    const n = alertesListe.length;
    lignes.push(`${n} coureur${n > 1 ? 's' : ''} à surveiller :`);
    lignes.push('');
    for (const a of alertesListe) lignes.push(`  ${a.prenom} : ${a.detail}`);
  }

  lignes.push('');
  lignes.push("Si tu ne fais rien, la semaine part telle quelle. C'est le cas normal.");

  return { sujet, texte: lignes.join('\n') };
}

/**
 * Encode un en-tête non ASCII selon la RFC 2047.
 *
 * Le sujet contient « Prépa » et les détails d'alerte citent des prénoms
 * accentués. Un octet non ASCII posé tel quel dans un en-tête n'est pas
 * transportable : selon le serveur, le sujet arrive en mojibake ou le message
 * est rejeté. Le corps, lui, n'a pas ce problème, il déclare son charset.
 */
function enteteEncodee(valeur) {
  if (/^[\x20-\x7E]*$/.test(valeur)) return valeur;
  const octets = new TextEncoder().encode(valeur);
  let binaire = '';
  for (const o of octets) binaire += String.fromCharCode(o);
  return `=?UTF-8?B?${btoa(binaire)}?=`;
}

/**
 * Le message au format RFC 5322, prêt à être remis au binding.
 *
 * Sorti en fonction pure et exporté pour être vérifiable sans binding : c'est
 * la seule partie de l'envoi qui puisse être fausse de façon intéressante,
 * l'appel au binding lui-même n'étant qu'un passe-plat.
 *
 * Les en-têtes se séparent en CRLF et une ligne vide les sépare du corps. Un
 * LF seul passe chez les serveurs indulgents et se fait rejeter par les autres.
 */
export function messageBrut({ expediteur, destinataire, sujet, texte }) {
  return [
    `From: ${enteteEncodee('Prépa Coureurs des Vignes')} <${expediteur}>`,
    `To: ${destinataire}`,
    `Subject: ${enteteEncodee(sujet)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    texte,
  ].join('\r\n');
}

/**
 * Envoie le rappel par le binding send_email de Cloudflare.
 *
 * Ne lève jamais, et rend ce qui s'est passé plutôt que rien :
 *
 *   'sans-binding'  le binding n'est pas déclaré, cas du local et des tests ;
 *   'sans-adresse'  aucun destinataire configuré ;
 *   'envoye'        remis au binding ;
 *   'echec'         le binding a refusé, ou le module n'a pas pu être chargé.
 *
 * Le rappel n'est pas la fonction du produit. La publication d'une semaine ne
 * l'attend pas, et une adresse mal configurée ou un service indisponible ne
 * doivent pas faire échouer l'exécution du cron. Le statut rendu est ce qui
 * permet au handler de tracer la cause dans les logs du Worker, seul endroit
 * où l'on pourra constater qu'un rappel ne part pas.
 */
export async function envoyerRappel(env, message) {
  if (!env.EMAIL) return 'sans-binding';
  if (!env.EMAIL_ADMIN) return 'sans-adresse';

  const expediteur = env.EMAIL_EXPEDITEUR || 'prepa@coureursdesvignes.fr';
  const destinataire = env.EMAIL_ADMIN;
  const brut = messageBrut({ expediteur, destinataire, sujet: message.sujet, texte: message.texte });

  try {
    // Import dynamique et non statique : le module cloudflare:email n'existe
    // que si un binding send_email est déclaré. Un import en tête de fichier
    // ferait échouer le chargement du module entier partout ailleurs, et donc
    // le Worker complet, pour une fonction annexe.
    const { EmailMessage } = await import('cloudflare:email');
    await env.EMAIL.send(new EmailMessage(expediteur, destinataire, brut));
    return 'envoye';
  } catch (erreur) {
    console.error('Rappel du samedi non envoyé :', erreur?.message ?? erreur);
    return 'echec';
  }
}
