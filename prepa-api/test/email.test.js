import { describe, it, expect } from 'vitest';

import { construireRappel, semaineDuRappel, envoyerRappel, messageBrut } from '../src/email.js';
import { instantPublication } from '../src/calendrier.js';
import { NB_SEMAINES_MAX } from '../src/admin.js';

const JOUR = 86400000;
const SITE = 'https://x.test';

const alerte = (prenom, type, detail) => ({
  coureurId: 1, prenom, nomAffiche: `${prenom} T.`, programme: 'P1', semaine: 7, type, detail,
});

describe('rappel du samedi', () => {
  it('annonce la semaine à venir et récapitule les alertes', () => {
    const m = construireRappel(7, [alerte('Cuit', 'difficulte', 'Séances difficiles.')], SITE);
    expect(m.sujet).toMatch(/semaine 7/i);
    expect(m.texte).toMatch(/Cuit/);
    expect(m.texte).toMatch(/Séances difficiles\./);
    expect(m.texte).toMatch(/https:\/\/x\.test\/prepa\.html/);
  });

  it("reste clair quand il n'y a aucune alerte", () => {
    const m = construireRappel(3, [], SITE);
    expect(m.texte).toMatch(/Aucun coureur à surveiller/);
  });

  // Règle du projet, valable pour tout texte rédigé, y compris le corps d'un
  // e-mail. seances.js la fait respecter mécaniquement sur les séances ; ce
  // test est son équivalent pour le seul autre texte que le projet rédige.
  it("n'utilise pas de tiret cadratin", () => {
    const m = construireRappel(3, [alerte('Ana', 'absence', 'Aucune séance validée.')], SITE);
    expect(m.sujet).not.toMatch(/—/);
    expect(m.texte).not.toMatch(/—/);
  });

  it('nomme chaque coureur à surveiller, sans en oublier', () => {
    const liste = [
      alerte('Ana', 'absence', 'Aucune séance validée en semaine 6.'),
      alerte('Bruno', 'difficulte', 'Séances majoritairement difficiles.'),
      alerte('Chloé', 'absence', 'Aucune séance validée en semaine 6.'),
    ];
    const m = construireRappel(7, liste, SITE);
    for (const a of liste) expect(m.texte).toContain(a.prenom);
    expect(m.texte).toMatch(/3 coureurs/);
  });

  it('accorde le singulier sur un seul coureur', () => {
    const m = construireRappel(7, [alerte('Ana', 'absence', 'Rien de validé.')], SITE);
    expect(m.texte).toMatch(/1 coureur à surveiller/);
    expect(m.texte).not.toMatch(/1 coureurs/);
  });
});

// Quelle semaine le rappel annonce, en fonction du moment où le cron tombe.
// C'est la partie qui décide s'il faut envoyer quoi que ce soit, et le plan
// d'origine ne la prévoyait pas : il calculait semaineCourante() + 1 sans
// borne haute, ce qui aurait annoncé une semaine 18 inexistante tous les
// samedis suivant la fin de la saison, indéfiniment.
describe('semaine annoncée par le rappel', () => {
  it('annonce la semaine 1 le samedi qui précède son ouverture', () => {
    const veille = instantPublication(1) - JOUR;
    expect(semaineDuRappel(veille)).toBe(1);
  });

  it('annonce la semaine suivante en cours de saison', () => {
    const veille = instantPublication(7) - JOUR;
    expect(semaineDuRappel(veille)).toBe(7);
  });

  it('annonce la dernière semaine la veille de sa parution', () => {
    const veille = instantPublication(NB_SEMAINES_MAX) - JOUR;
    expect(semaineDuRappel(veille)).toBe(NB_SEMAINES_MAX);
  });

  // Le cas que le plan ratait.
  it("n'annonce plus rien une fois la dernière semaine parue", () => {
    const apres = instantPublication(NB_SEMAINES_MAX) + JOUR;
    expect(semaineDuRappel(apres)).toBeNull();
    expect(semaineDuRappel(apres + 400 * JOUR)).toBeNull();
  });
});

// L'envoi lui-même n'est qu'un passe-plat vers le binding, et le module
// cloudflare:email n'existe pas hors d'un Worker qui déclare send_email : le
// chemin nominal n'est donc pas exerçable ici, il se vérifie en production en
// déclenchant le cron. Ce qui se vérifie ici, et qui est ce qui compte, c'est
// qu'aucune de ces situations ne fasse échouer le cron.
describe('envoi du rappel', () => {
  const message = { sujet: 'Prépa : la semaine 7 part demain', texte: 'Corps.' };

  it('signale l\'absence de binding sans lever', async () => {
    await expect(envoyerRappel({ EMAIL_ADMIN: 'x@y.test' }, message)).resolves.toBe('sans-binding');
  });

  it("signale l'absence de destinataire sans lever", async () => {
    const env = { EMAIL: { send: async () => {} } };
    await expect(envoyerRappel(env, message)).resolves.toBe('sans-adresse');
  });

  it('rattrape un échec du binding au lieu de le laisser remonter', async () => {
    const env = {
      EMAIL: { send: async () => { throw new Error('service indisponible'); } },
      EMAIL_ADMIN: 'x@y.test',
    };
    await expect(envoyerRappel(env, message)).resolves.toBe('echec');
  });

  it('construit bien le message avant de tenter l\'envoi', () => {
    // Ce que le binding recevrait, vérifié sur la fonction pure qui le produit.
    const m = messageBrut({
      expediteur: 'prepa@exemple.test', destinataire: 'x@y.test',
      sujet: message.sujet, texte: message.texte,
    });
    expect(m).toContain('To: x@y.test');
    expect(m).toContain('Corps.');
  });
});

describe('message au format RFC 5322', () => {
  const brut = (sujet = 'Sujet simple', texte = 'Corps du rappel.') =>
    messageBrut({ expediteur: 'prepa@exemple.test', destinataire: 'david@exemple.test', sujet, texte });

  it('porte expéditeur, destinataire, type de contenu et corps', () => {
    const m = brut();
    expect(m).toContain('prepa@exemple.test');
    expect(m).toContain('To: david@exemple.test');
    expect(m).toContain('Content-Type: text/plain; charset=utf-8');
    expect(m).toContain('Corps du rappel.');
  });

  it('sépare les en-têtes du corps par une ligne vide en CRLF', () => {
    const m = brut();
    // Un LF seul passe chez les serveurs indulgents et se fait rejeter par
    // les autres : la séparation doit être un vrai CRLFCRLF.
    expect(m).toContain('\r\n\r\n');
    const [entetes, corps] = m.split('\r\n\r\n');
    expect(corps).toBe('Corps du rappel.');
    expect(entetes.split('\r\n').every((l) => l.includes(': '))).toBe(true);
  });

  // Un octet non ASCII posé tel quel dans un en-tête n'est pas transportable :
  // selon le serveur, le sujet arrive en mojibake ou le message est rejeté.
  // Le sujet du rappel contient « Prépa », le cas se présente à chaque envoi.
  it("encode un sujet accentué au lieu de le poser brut dans l'en-tête", () => {
    const m = brut('Prépa : la semaine 7 part demain');
    const ligne = m.split('\r\n').find((l) => l.startsWith('Subject:'));
    expect(ligne).toMatch(/^Subject: =\?UTF-8\?B\?/);

    const encode = ligne.replace(/^Subject: =\?UTF-8\?B\?/, '').replace(/\?=$/, '');
    expect(new TextDecoder().decode(Uint8Array.from(atob(encode), (c) => c.charCodeAt(0))))
      .toBe('Prépa : la semaine 7 part demain');
  });

  it('laisse un sujet purement ASCII lisible tel quel', () => {
    expect(brut('Semaine 7')).toContain('Subject: Semaine 7');
  });

  it("n'a aucun octet non ASCII dans ses en-têtes", () => {
    const entetes = brut('Prépa : semaine 7', 'Corps accentué : é à ç.').split('\r\n\r\n')[0];
    expect(/^[\x20-\x7E\r\n]*$/.test(entetes)).toBe(true);
  });
});
