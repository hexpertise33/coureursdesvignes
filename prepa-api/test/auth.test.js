import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { creerJeton, verifierJeton, roleDepuisRequete, debitDepasse, cookieJeton, DUREE_JETON } from '../src/auth.js';
import { instantPublication, lundiDeLaSemaine } from '../src/calendrier.js';
import { NB_SEMAINES_MAX } from '../src/admin.js';

const S = 'secret-de-test';

// Fabrique un jeton "role.expiration.signature" signé exactement comme
// creerJeton l'aurait fait, mais avec une expiration écrite à la main : sert
// à injecter des représentations d'expiration que creerJeton ne produit
// jamais lui-même (non numérique, hexadécimale, avec espace, etc.), pour
// vérifier que verifierJeton les rejette bien plutôt que de les accepter
// via Number().
async function jetonBrut(secret, role, expiration) {
  const charge = `${role}.${expiration}`;
  const cle = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBrute = await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(charge));
  let s = '';
  for (const o of new Uint8Array(signatureBrute)) s += String.fromCharCode(o);
  const signature = btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${charge}.${signature}`;
}

describe('jetons', () => {
  it('accepte un jeton valide', async () => {
    const j = await creerJeton(S, 'coureur', 60000);
    expect(await verifierJeton(S, j)).toEqual({ role: 'coureur' });
  });

  it('rejette un jeton signé avec un autre secret', async () => {
    const j = await creerJeton('autre', 'admin', 60000);
    expect(await verifierJeton(S, j)).toBeNull();
  });

  it('rejette un jeton dont le rôle a été modifié', async () => {
    const j = await creerJeton(S, 'coureur', 60000);
    const falsifie = j.replace('coureur', 'admin');
    expect(await verifierJeton(S, falsifie)).toBeNull();
  });

  it('rejette un jeton expiré', async () => {
    const j = await creerJeton(S, 'coureur', -1000);
    expect(await verifierJeton(S, j)).toBeNull();
  });

  it('rejette une chaîne quelconque', async () => {
    expect(await verifierJeton(S, 'nimportequoi')).toBeNull();
    expect(await verifierJeton(S, '')).toBeNull();
  });

  it('rejette un rôle hors liste fermée même correctement signé', async () => {
    // On fabrique un jeton avec un rôle arbitraire, signé exactement comme
    // creerJeton l'aurait fait, pour vérifier que la liste de rôles autorisés
    // est bien fermée à 'coureur' et 'admin' et ne dépend pas que de la signature.
    const jeton = await jetonBrut(S, 'super-admin', Date.now() + 60000);
    expect(await verifierJeton(S, jeton)).toBeNull();
  });

  it('creerJeton refuse de signer un rôle hors liste', async () => {
    await expect(creerJeton(S, 'super-admin', 60000)).rejects.toThrow();
  });

  describe('canonicalisation de l\'expiration', () => {
    // Number('pasunnombre') vaut NaN, et NaN < Date.now() est toujours faux :
    // sans garde-fou, ces jetons seraient acceptés indéfiniment (jeton
    // perpétuel). Chacun est signé correctement avec jetonBrut, donc seule
    // la validation de l'expiration est en cause.
    it.each([
      ['non numérique', 'pasunnombre'],
      ['Infinity', 'Infinity'],
      ['notation hexadécimale', '0x7fffffffffff'],
      ['espace en tête', ' 99999999999999'],
      ['suffixe non numérique', '99999999999999abc'],
    ])('rejette une expiration %s', async (_libelle, expiration) => {
      const jeton = await jetonBrut(S, 'admin', expiration);
      expect(await verifierJeton(S, jeton)).toBeNull();
    });

    it('rejette un jeton créé avec une durée non numérique (NaN)', async () => {
      // Date.now() + NaN vaut NaN : creerJeton ne valide que le rôle, pas la
      // durée, donc c'est verifierJeton qui doit intercepter ce cas.
      const j = await creerJeton(S, 'admin', NaN);
      expect(await verifierJeton(S, j)).toBeNull();
    });

    it('accepte toujours une expiration canonique valide', async () => {
      const j = await creerJeton(S, 'admin', 60000);
      expect(await verifierJeton(S, j)).toEqual({ role: 'admin' });
    });
  });
});

// La durée de session est une décision de David, pas un réglage technique :
// 120 jours, après quoi il faut ressaisir le code. Elle est verrouillée ici
// parce qu'une constante nue se rallonge sans que personne ne s'en aperçoive,
// et qu'une session qui survivrait à la saison viderait de son sens le fait
// même d'avoir un code d'accès.
describe('durée de session', () => {
  const JOUR = 24 * 3600 * 1000;

  it('vaut 120 jours', () => {
    expect(DUREE_JETON).toBe(120 * JOUR);
  });

  // Le calage annoncé en commentaire de DUREE_JETON. Les deux bornes sont
  // calculées depuis le calendrier réel, pas écrites en dur : si la saison
  // se décale ou si un programme s'allonge, c'est ici que ça se verra.
  it('couvre la saison entière sans la déborder de plus d\'une semaine', () => {
    const ouverture = instantPublication(1);
    // La dernière semaine du plus long programme (P5, 17 semaines) commence
    // ce lundi-là et se termine sept jours plus tard.
    const finDeSaison = lundiDeLaSemaine(NB_SEMAINES_MAX) + 7 * JOUR;
    const expiration = ouverture + DUREE_JETON;

    // Un coureur connecté à la parution de la semaine 1 ne doit pas être
    // déconnecté avant la fin de sa préparation.
    expect(expiration).toBeGreaterThanOrEqual(finDeSaison);
    // Et sa session ne doit pas traîner longtemps après.
    expect(expiration - finDeSaison).toBeLessThanOrEqual(7 * JOUR);
  });

  it('produit un jeton encore valide la veille du terme et périmé le lendemain', async () => {
    const jeton = await creerJeton(S, 'coureur', DUREE_JETON);
    const horlogeReelle = Date.now;
    try {
      const emission = horlogeReelle();
      Date.now = () => emission + DUREE_JETON - 24 * 3600 * 1000;
      expect(await verifierJeton(S, jeton)).toEqual({ role: 'coureur' });
      Date.now = () => emission + DUREE_JETON + 24 * 3600 * 1000;
      expect(await verifierJeton(S, jeton)).toBeNull();
    } finally {
      Date.now = horlogeReelle;
    }
  });
});

// Un Worker fraichement deploye existe avant que ses secrets ne soient poses,
// puisque wrangler secret put exige que le Worker existe deja. Pendant cette
// fenetre, SECRET_JETON est absent. Sans garde, TextEncoder.encode(undefined)
// encode la chaine « undefined » et rend une cle HMAC valide et devinable :
// un jeton admin devient forgeable, sans que rien ne paraisse casse.
describe('secret de signature absent', () => {
  it('refuse de creer un jeton plutot que de signer avec une cle vide', async () => {
    for (const mauvais of [undefined, null, '', 0]) {
      await expect(creerJeton(mauvais, 'admin', 60000)).rejects.toThrow(/SECRET_JETON/);
    }
  });

  it('refuse tout jeton a la verification, y compris un jeton bien forme', async () => {
    // Le jeton est fabrique avec un vrai secret, puis presente a une
    // verification qui n'en a plus : elle doit refuser, pas s'ouvrir.
    const bon = await creerJeton(S, 'admin', 60000);
    for (const mauvais of [undefined, null, '']) {
      expect(await verifierJeton(mauvais, bon)).toBeNull();
    }
  });

  it('ne laisse pas forger un jeton signe avec la cle « undefined »', async () => {
    // Ce que fabriquerait un attaquant qui a devine que le secret manque.
    const forge = await creerJeton('undefined', 'admin', 60000);
    expect(await verifierJeton(undefined, forge)).toBeNull();
  });
});

describe('cookie du jeton', () => {
  it('pose HttpOnly, Secure, SameSite=Lax, Path=/ et le Max-Age calculé', () => {
    const cookie = cookieJeton('role.exp.sig', 3600000);
    expect(cookie).toContain('prepa=role.exp.sig');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=3600');
  });
});

describe('rôle depuis la requête', () => {
  it('lit le cookie', async () => {
    const j = await creerJeton(env.SECRET_JETON, 'admin', 60000);
    const r = new Request('https://x.test/', { headers: { cookie: `prepa=${j}` } });
    expect(await roleDepuisRequete(r, env)).toBe('admin');
  });

  it('renvoie null sans cookie', async () => {
    expect(await roleDepuisRequete(new Request('https://x.test/'), env)).toBeNull();
  });

  it('ignore un cookie "prepa" invalide injecté avant le vrai (cookie tossing)', async () => {
    const j = await creerJeton(env.SECRET_JETON, 'admin', 60000);
    // Un attaquant maîtrisant un sous-domaine peut poser un second cookie
    // "prepa" qui arrive en tête ; il ne doit pas neutraliser la session.
    const r = new Request('https://x.test/', {
      headers: { cookie: `prepa=jeton-invalide; prepa=${j}` },
    });
    expect(await roleDepuisRequete(r, env)).toBe('admin');
  });
});

describe('limitation de débit', () => {
  it('bloque après 10 tentatives dans l\'heure', async () => {
    for (let i = 0; i < 10; i++) {
      expect(await debitDepasse(env.DB, '1.2.3.4')).toBe(false);
    }
    expect(await debitDepasse(env.DB, '1.2.3.4')).toBe(true);
  });

  it('compte les IP séparément', async () => {
    expect(await debitDepasse(env.DB, '9.9.9.9')).toBe(false);
  });

  it('20 appels concurrents sur la même IP produisent exactement 10 false et 10 true', async () => {
    // Sans requête atomique, l'incrément et la lecture sont deux
    // allers-retours D1 distincts : des appels concurrents peuvent lire le
    // même compteur avant qu'aucun n'ait écrit, et laisser passer plus de
    // 10 tentatives (ou, entrelacement inverse, en bloquer à tort moins de
    // 10). L'ordre des résultats est indifférent, seul le compte importe.
    const resultats = await Promise.all(
      Array.from({ length: 20 }, () => debitDepasse(env.DB, '7.7.7.7'))
    );
    expect(resultats.filter((r) => r === false)).toHaveLength(10);
    expect(resultats.filter((r) => r === true)).toHaveLength(10);
  });
});
