import { env, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

import { creerJeton, egalConstant, LIMITE_TENTATIVES } from '../src/auth.js';
import { estPubliee, instantPublication } from '../src/calendrier.js';
import { PROGRAMMES, semaineDuProgramme } from '../src/programmes/index.js';
import { ZONES } from '../src/programmes/seances.js';
import { RESSENTIS } from '../src/validations.js';
// Horloge maîtrisée : voir test/horloge.js. Ces utilitaires y ont été
// extraits pour être partagés avec la suite du back-office (test/admin.test.js).
import { SECONDE, requeteA, jsonA, AVANT_TOUT, MI_PARCOURS, APRES_TOUT } from './horloge.js';

// Fabrique un cookie de session valide sans passer par la route de session :
// les tests de contenu n'ont pas à dépendre du code d'accès.
async function cookie(role) {
  return `prepa=${await creerJeton(env.SECRET_JETON, role, 60000)}`;
}

// En-têtes d'une requête authentifiée, avec une IP propre à chaque appelant
// pour que la limitation de débit d'un test ne déborde pas sur un autre.
function entetes(c, ip = '203.0.113.1') {
  return { cookie: c, 'cf-connecting-ip': ip };
}

async function creerCoureur(c, corps) {
  const r = await SELF.fetch('https://p.test/api/coureur', {
    method: 'POST',
    headers: entetes(c),
    body: JSON.stringify(corps),
  });
  return { statut: r.status, donnees: await r.json() };
}

const CODES_PROGRAMMES = Object.keys(PROGRAMMES);

/** Crée (ou retrouve) un coureur à un instant donné, sous un rôle donné. */
async function creerCoureurA(instant, role, corps) {
  return jsonA(instant, '/api/coureur', { method: 'POST', role, body: JSON.stringify(corps) });
}

/** Valide une séance à un instant donné, sous un rôle donné. */
async function validerA(instant, role, corps) {
  return jsonA(instant, '/api/validation', { method: 'POST', role, body: JSON.stringify(corps) });
}

/** Dévalide une séance à un instant donné, sous un rôle donné. */
async function devaliderA(instant, role, corps) {
  return jsonA(instant, '/api/validation', { method: 'DELETE', role, body: JSON.stringify(corps) });
}

describe('Worker', () => {
  it('répond sur /api/sante', async () => {
    const r = await SELF.fetch('https://prepa.test/api/sante');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });

  it('renvoie 404 sur une route inconnue', async () => {
    const r = await SELF.fetch('https://prepa.test/api/nimporte-quoi');
    expect(r.status).toBe(404);
  });
});

describe('zones', () => {
  it('sert les zones sans authentification', async () => {
    const r = await SELF.fetch('https://p.test/api/zones');
    expect(r.status).toBe(200);
    const donnees = await r.json();
    expect(donnees).toEqual({ zones: ZONES });
    expect(Object.keys(donnees.zones)).toEqual(['Z1', 'Z2', 'Z3', 'Z4', 'Z5']);
  });

  it("n'expose que la clé zones", async () => {
    const r = await SELF.fetch('https://p.test/api/zones');
    expect(Object.keys(await r.json())).toEqual(['zones']);
  });

  it('refuse une autre méthode que GET', async () => {
    const r = await SELF.fetch('https://p.test/api/zones', { method: 'POST' });
    expect(r.status).toBe(405);
  });
});

describe('session', () => {
  it('accepte le code coureur', async () => {
    const r = await SELF.fetch('https://p.test/api/session', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '198.51.100.1' },
      body: JSON.stringify({ code: 'coureur-test' }),
    });
    expect(r.status).toBe(200);
    expect((await r.json()).role).toBe('coureur');
    expect(r.headers.get('set-cookie')).toMatch(/HttpOnly/);
    expect(r.headers.get('set-cookie')).toMatch(/Secure/);
    expect(r.headers.get('set-cookie')).toMatch(/SameSite=Lax/);
  });

  it('accepte le code admin et donne le rôle admin', async () => {
    const r = await SELF.fetch('https://p.test/api/session', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '198.51.100.2' },
      body: JSON.stringify({ code: 'admin-test' }),
    });
    expect((await r.json()).role).toBe('admin');
  });

  it('refuse un mauvais code', async () => {
    const r = await SELF.fetch('https://p.test/api/session', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '198.51.100.3' },
      body: JSON.stringify({ code: '00000' }),
    });
    expect(r.status).toBe(401);
  });

  it('refuse un corps sans code, sans jamais confondre absent et vide', async () => {
    for (const corps of ['{}', '{"code":""}', '{"code":null}', '{"code":123}', 'pas du json']) {
      const r = await SELF.fetch('https://p.test/api/session', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '198.51.100.4' },
        body: corps,
      });
      expect(r.status).toBe(401);
      expect(r.headers.get('set-cookie')).toBeNull();
    }
  });

  it('refuse une autre méthode que POST', async () => {
    const r = await SELF.fetch('https://p.test/api/session');
    expect(r.status).toBe(405);
  });

  it('le cookie émis ouvre réellement les routes protégées', async () => {
    const r = await SELF.fetch('https://p.test/api/session', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '198.51.100.5' },
      body: JSON.stringify({ code: 'coureur-test' }),
    });
    const brut = r.headers.get('set-cookie').split(';')[0];
    const suite = await SELF.fetch('https://p.test/api/programme?programme=P1', {
      headers: { cookie: brut },
    });
    expect(suite.status).toBe(200);
  });

  it("ne bloque pas un adhérent qui enchaîne douze connexions réussies", async () => {
    for (let i = 0; i < 12; i++) {
      const r = await SELF.fetch('https://p.test/api/session', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '198.51.100.6' },
        body: JSON.stringify({ code: 'coureur-test' }),
      });
      expect(r.status).toBe(200);
    }
  });

  it('bloque la force brute après dix codes erronés', async () => {
    const tenter = (code) =>
      SELF.fetch('https://p.test/api/session', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '198.51.100.7' },
        body: JSON.stringify({ code }),
      });

    for (let i = 0; i < 10; i++) {
      expect((await tenter(`faux-${i}`)).status).toBe(401);
    }
    expect((await tenter('faux-10')).status).toBe(429);
    // Une fois bloquée, l'IP n'obtient plus de session même avec le bon code :
    // sans cela, la limite ne freinerait pas la force brute.
    expect((await tenter('coureur-test')).status).toBe(429);
  });

  it('ne fait pas déborder le compteur d\'une IP sur une autre', async () => {
    for (let i = 0; i < 11; i++) {
      await SELF.fetch('https://p.test/api/session', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '198.51.100.8' },
        body: JSON.stringify({ code: 'faux' }),
      });
    }
    const r = await SELF.fetch('https://p.test/api/session', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '198.51.100.9' },
      body: JSON.stringify({ code: 'coureur-test' }),
    });
    expect(r.status).toBe(200);
  });
});

describe('coureur', () => {
  it('refuse sans cookie', async () => {
    const r = await SELF.fetch('https://p.test/api/coureur', {
      method: 'POST',
      body: JSON.stringify({ prenom: 'Test', initiale: 'B', programme: 'P3' }),
    });
    expect(r.status).toBe(401);
  });

  it('crée un coureur avec prénom et initiale', async () => {
    const c = await cookie('coureur');
    const { statut, donnees } = await creerCoureur(c, {
      prenom: 'Julien', initiale: 'B', programme: 'P3', faitIzon: false,
    });
    expect(statut).toBe(200);
    expect(donnees.coureur.id).toBeGreaterThan(0);
    expect(donnees.coureur.prenom).toBe('Julien');
    expect(donnees.coureur.initiale).toBe('B');
    expect(donnees.coureur.nomAffiche).toBe('Julien B.');
    expect(donnees.coureur.programme).toBe('P3');
    expect(donnees.coureur.faitIzon).toBe(false);
  });

  it("n'expose aucune colonne interne de la base", async () => {
    const c = await cookie('coureur');
    const { donnees } = await creerCoureur(c, { prenom: 'Hélène', initiale: 'M', programme: 'P2' });
    expect(Object.keys(donnees.coureur).sort()).toEqual(
      ['faitIzon', 'id', 'initiale', 'nomAffiche', 'prenom', 'programme', 'varianteCourse'].sort(),
    );
    expect(JSON.stringify(donnees)).not.toMatch(/"cle"/);
    expect(JSON.stringify(donnees)).not.toMatch(/cree_le/);
    expect(JSON.stringify(donnees)).not.toMatch(/fait_izon/);
  });

  it("refuse l'absence d'initiale", async () => {
    const c = await cookie('coureur');
    const { statut, donnees } = await creerCoureur(c, { prenom: 'Julien', programme: 'P3' });
    expect(statut).toBe(400);
    expect(donnees.erreur).toMatch(/initiale/i);
    expect(donnees.erreur).not.toMatch(/\u2014/) // aucun tiret cadratin dans les messages;
  });

  it('refuse un prénom vide et un programme inconnu', async () => {
    const c = await cookie('coureur');
    expect((await creerCoureur(c, { prenom: '  ', initiale: 'B', programme: 'P3' })).statut).toBe(400);
    expect((await creerCoureur(c, { prenom: 'Julien', initiale: 'B', programme: 'P9' })).statut).toBe(400);
    expect((await creerCoureur(c, {})).statut).toBe(400);
  });

  it('distingue deux homonymes par leur initiale', async () => {
    const c = await cookie('coureur');
    const a = await creerCoureur(c, { prenom: 'Julien', initiale: 'B', programme: 'P3' });
    const b = await creerCoureur(c, { prenom: 'Julien', initiale: 'M', programme: 'P4' });
    const encore = await creerCoureur(c, { prenom: 'JULIEN', initiale: 'b.', programme: 'P3' });
    expect(b.donnees.coureur.id).not.toBe(a.donnees.coureur.id);
    expect(encore.donnees.coureur.id).toBe(a.donnees.coureur.id);
  });

  it('refuse une autre méthode que POST', async () => {
    const c = await cookie('coureur');
    const r = await SELF.fetch('https://p.test/api/coureur', { headers: entetes(c) });
    expect(r.status).toBe(405);
  });
});

describe('programme', () => {
  it('refuse sans cookie', async () => {
    expect((await SELF.fetch('https://p.test/api/programme?programme=P3')).status).toBe(401);
  });

  it('décrit toutes les semaines, avec leur date de disponibilité', async () => {
    const { statut, donnees } = await jsonA(MI_PARCOURS, '/api/programme?programme=P3', {
      role: 'coureur',
    });
    expect(statut).toBe(200);
    expect(donnees.programme.code).toBe('P3');
    expect(donnees.semaines).toHaveLength(PROGRAMMES.P3.semainesContenu.length);
    // Valeur en dur, et non semaineCourante(Date.now(), ...) : une assertion
    // qui recalcule l'attendu avec la même fonction que le code testé passe
    // quoi qu'il arrive.
    expect(donnees.semaineCourante).toBe(8);
    for (const s of donnees.semaines) {
      expect(typeof s.numero).toBe('number');
      expect(typeof s.phase).toBe('string');
      expect(typeof s.publiee).toBe('boolean');
      expect(s.disponibleLe).toBe(new Date(instantPublication(s.numero)).toISOString());
    }
  });

  it("n'expose pas le contenu brut du programme", async () => {
    const c = await cookie('coureur');
    const r = await SELF.fetch('https://p.test/api/programme?programme=P4', { headers: entetes(c) });
    const donnees = await r.json();
    expect(donnees.programme.semainesContenu).toBeUndefined();
    expect(JSON.stringify(donnees)).not.toMatch(/semainesContenu/);
    expect(JSON.stringify(donnees)).not.toMatch(/"variantes"/);
  });

  it('refuse un programme inconnu sans rien dire du contenu', async () => {
    const c = await cookie('coureur');
    const r = await SELF.fetch('https://p.test/api/programme?programme=P42', { headers: entetes(c) });
    expect(r.status).toBe(400);
    const donnees = await r.json();
    expect(Object.keys(donnees)).toEqual(['erreur']);
    expect(donnees.erreur).not.toMatch(/\u2014/) // aucun tiret cadratin dans les messages;
  });

  it('refuse quand aucun programme n\'est précisé', async () => {
    const c = await cookie('coureur');
    const r = await SELF.fetch('https://p.test/api/programme', { headers: entetes(c) });
    expect(r.status).toBe(400);
    expect((await r.json()).semaines).toBeUndefined();
  });
});

describe('semaine', () => {
  it('refuse sans cookie', async () => {
    expect((await SELF.fetch('https://p.test/api/semaine?programme=P3&numero=1')).status).toBe(401);
  });

  it('refuse une semaine non publiée en annonçant seulement sa date', async () => {
    const { statut, donnees } = await jsonA(AVANT_TOUT, '/api/semaine?programme=P3&numero=1', {
      role: 'coureur',
    });
    expect(statut).toBe(403);
    expect(Object.keys(donnees).sort()).toEqual(['disponibleLe', 'erreur', 'numero']);
    expect(donnees.disponibleLe).toBe(new Date(instantPublication(1)).toISOString());
    expect(donnees.erreur).not.toMatch(/\u2014/) // aucun tiret cadratin dans les messages;
  });

  it('rejette un numéro mal formé sans jamais servir de contenu', async () => {
    for (const numero of ['abc', '1.5', '1e1', ' 1', '01', '-3', 'NaN', 'Infinity', '9999999999999999999']) {
      // À MI_PARCOURS les semaines 1 à 8 sont bel et bien ouvertes : si une
      // écriture exotique du numéro était acceptée, elle servirait du contenu.
      const { statut, donnees } = await jsonA(
        MI_PARCOURS,
        `/api/semaine?programme=P3&numero=${encodeURIComponent(numero)}`,
        { role: 'coureur' },
      );
      expect([400, 404]).toContain(statut);
      expect(donnees.semaine).toBeUndefined();
      expect(Object.keys(donnees)).toEqual(['erreur']);
    }
  });

  it('rejette un numéro hors bornes, y compris pour un admin', async () => {
    const nb = PROGRAMMES.P3.semainesContenu.length;
    for (const role of ['coureur', 'admin']) {
      for (const numero of [0, -1, nb + 1, 999]) {
        const { statut, donnees } = await jsonA(
          MI_PARCOURS,
          `/api/semaine?programme=P3&numero=${numero}`,
          { role },
        );
        expect([400, 404]).toContain(statut);
        expect(donnees.semaine).toBeUndefined();
      }
    }
  });

  it("sans numéro, répond que la préparation n'a pas commencé tant qu'aucune semaine n'est publiée", async () => {
    const { statut, donnees } = await jsonA(AVANT_TOUT, '/api/semaine?programme=P3', {
      role: 'coureur',
    });
    expect(statut).toBe(404);
    expect(donnees.semaine).toBeUndefined();
  });

  it('sans numéro, sert la semaine en cours dès que la préparation a commencé', async () => {
    const { statut, donnees } = await jsonA(MI_PARCOURS, '/api/semaine?programme=P3', {
      role: 'coureur',
    });
    expect(statut).toBe(200);
    expect(donnees.semaine.numero).toBe(8);
    expect(donnees.semaine.titre).toBe(semaineDuProgramme('P3', 8, { faitIzon: false }).titre);
  });

  it("sert le contenu complet à l'encadrant, variante résolue et sans champ variantes", async () => {
    // AVANT_TOUT : l'encadrant relit le programme avant sa parution, c'est
    // exactement le moment où il doit déjà tout voir.
    const { statut, donnees } = await jsonA(
      AVANT_TOUT,
      '/api/semaine?programme=P3&numero=9&izon=1',
      { role: 'admin' },
    );
    expect(statut).toBe(200);
    const { semaine } = donnees;
    expect(semaine.numero).toBe(9);
    expect(Array.isArray(semaine.seances)).toBe(true);
    expect(semaine.publiee).toBe(false);
    expect(semaine.variantes).toBeUndefined();
    expect(semaine.phase).toBe(semaineDuProgramme('P3', 9, { faitIzon: true }).phase);
  });

  it('applique la variante Izon demandée pour un admin', async () => {
    const { donnees: avec } = await jsonA(
      AVANT_TOUT, '/api/semaine?programme=P3&numero=9&izon=1', { role: 'admin' },
    );
    const { donnees: sans } = await jsonA(
      AVANT_TOUT, '/api/semaine?programme=P3&numero=9&izon=0', { role: 'admin' },
    );
    expect(avec.semaine.titre).not.toBe(sans.semaine.titre);
    expect(avec.semaine.titre).toBe(semaineDuProgramme('P3', 9, { faitIzon: true }).titre);
    expect(sans.semaine.titre).toBe(semaineDuProgramme('P3', 9, { faitIzon: false }).titre);
  });

  it('refuse une autre méthode que GET', async () => {
    const c = await cookie('coureur');
    const r = await SELF.fetch('https://p.test/api/semaine?programme=P3&numero=1', {
      method: 'POST', headers: entetes(c), body: '{}',
    });
    expect(r.status).toBe(405);
  });
});

// ---------------------------------------------------------------------------
// La parution hebdomadaire, prise des deux côtés
// ---------------------------------------------------------------------------
//
// La confidentialité des semaines à venir était déjà bien verrouillée. Le
// versant opposé ne l'était pas : rien n'affirmait qu'une semaine parue
// arrive réellement jusqu'au coureur. Or c'est la promesse même du produit.
// Un Worker qui ne servirait plus jamais aucune semaine à personne (par
// exemple `vueSemaine(resolue, publiee, estAdmin)` au lieu de
// `publiee || estAdmin`, ou `if (!estAdmin)` au lieu de
// `if (!publiee && !estAdmin)`) est un produit mort, et il passait la suite
// au vert tant qu'elle était jouée avant la première parution.
//
// D'où ces frontières, prises à un instant fixé où la semaine N est parue et
// la semaine N+1 ne l'est pas.
describe('parution hebdomadaire, aux frontières', () => {
  // Première publication, une semaine du milieu, l'avant-dernière et la
  // dernière semaine, sur des programmes de longueurs différentes.
  const FRONTIERES = [
    { code: 'P3', numero: 1, quoi: 'la toute première publication' },
    { code: 'P3', numero: 8, quoi: 'une semaine du milieu' },
    { code: 'P3', numero: 9, quoi: 'la semaine à variante Izon' },
    { code: 'P3', numero: 15, quoi: "l'avant-dernière semaine" },
    { code: 'P3', numero: 16, quoi: 'la dernière semaine du programme' },
    { code: 'P1', numero: 10, quoi: 'la dernière semaine du programme le plus court' },
    { code: 'P5', numero: 17, quoi: 'la dernière semaine du programme le plus long' },
  ];

  for (const { code, numero, quoi } of FRONTIERES) {
    const instant = instantPublication(numero);
    const nb = PROGRAMMES[code].semainesContenu.length;
    const attendue = semaineDuProgramme(code, numero, { faitIzon: false });

    it(`/api/semaine sert la semaine ${numero} de ${code} dès sa parution (${quoi})`, async () => {
      const { statut, donnees } = await jsonA(
        instant, `/api/semaine?programme=${code}&izon=0&numero=${numero}`, { role: 'coureur' },
      );
      expect(statut).toBe(200);
      expect(donnees.semaine.numero).toBe(numero);
      expect(donnees.semaine.publiee).toBe(true);
      expect(donnees.semaine.titre).toBe(attendue.titre);
      expect(donnees.semaine.intention).toBe(attendue.intention);
      expect(donnees.semaine.seances).toHaveLength(attendue.seances.length);
      expect(donnees.semaine.seances.map((s) => s.titre)).toEqual(
        attendue.seances.map((s) => s.titre),
      );
    });

    it(`/api/programme divulgue la semaine ${numero} de ${code} et retient la suivante`, async () => {
      const { statut, donnees } = await jsonA(
        instant, `/api/programme?programme=${code}&izon=0`, { role: 'coureur' },
      );
      expect(statut).toBe(200);
      expect(donnees.semaineCourante).toBe(numero);

      // Le volet qui manquait : le coureur reçoit bien le contenu paru.
      const parue = donnees.semaines.find((s) => s.numero === numero);
      expect(parue.publiee).toBe(true);
      expect(parue.titre).toBe(attendue.titre);
      expect(parue.intention).toBe(attendue.intention);
      expect(parue.seances).toHaveLength(attendue.seances.length);

      // Toutes les précédentes aussi, sans exception.
      for (const s of donnees.semaines.filter((x) => x.numero <= numero)) {
        const ref = semaineDuProgramme(code, s.numero, { faitIzon: false });
        expect(s.publiee).toBe(true);
        expect(s.titre).toBe(ref.titre);
      }

      // Et le volet déjà couvert : rien de la suivante ne transparaît.
      const suivante = donnees.semaines.find((s) => s.numero === numero + 1);
      if (numero < nb) {
        const refSuivante = semaineDuProgramme(code, numero + 1, { faitIzon: false });
        expect(suivante.publiee).toBe(false);
        expect(suivante.titre).toBeUndefined();
        expect(suivante.intention).toBeUndefined();
        expect(suivante.seances).toBeUndefined();
        expect(JSON.stringify(donnees)).not.toContain(refSuivante.titre);
        expect(JSON.stringify(donnees)).not.toContain(refSuivante.intention);
      } else {
        // Dernière semaine du programme : il n'y a pas de suivante, et le
        // programme entier est alors ouvert.
        expect(suivante).toBeUndefined();
        expect(donnees.semaines.every((s) => s.publiee)).toBe(true);
      }
    });

    if (numero < nb) {
      it(`/api/semaine refuse encore la semaine ${numero + 1} de ${code} à cet instant`, async () => {
        const { statut, donnees } = await jsonA(
          instant, `/api/semaine?programme=${code}&izon=0&numero=${numero + 1}`, { role: 'coureur' },
        );
        expect(statut).toBe(403);
        expect(donnees.semaine).toBeUndefined();
        const refSuivante = semaineDuProgramme(code, numero + 1, { faitIzon: false });
        expect(JSON.stringify(donnees)).not.toContain(refSuivante.titre);
      });
    }

    it(`la semaine ${numero} de ${code} bascule à la seconde près`, async () => {
      const avant = await jsonA(
        instant - SECONDE, `/api/semaine?programme=${code}&izon=0&numero=${numero}`,
        { role: 'coureur' },
      );
      expect(avant.statut).toBe(403);
      expect(avant.donnees.semaine).toBeUndefined();
      expect(JSON.stringify(avant.donnees)).not.toContain(attendue.titre);

      const apres = await jsonA(
        instant + SECONDE, `/api/semaine?programme=${code}&izon=0&numero=${numero}`,
        { role: 'coureur' },
      );
      expect(apres.statut).toBe(200);
      expect(apres.donnees.semaine.titre).toBe(attendue.titre);
    });
  }

  it('la variante Izon de la semaine 9 est servie au coureur qui la suit, dès sa parution', async () => {
    const instant = instantPublication(9);
    const avec = semaineDuProgramme('P3', 9, { faitIzon: true });
    const sans = semaineDuProgramme('P3', 9, { faitIzon: false });
    expect(avec.titre).not.toBe(sans.titre);

    const a = await jsonA(instant, '/api/semaine?programme=P3&numero=9&izon=1', { role: 'coureur' });
    expect(a.statut).toBe(200);
    expect(a.donnees.semaine.titre).toBe(avec.titre);
    expect(a.donnees.semaine.phase).toBe(avec.phase);

    const b = await jsonA(instant, '/api/semaine?programme=P3&numero=9&izon=0', { role: 'coureur' });
    expect(b.donnees.semaine.titre).toBe(sans.titre);
  });

  it('une fois le programme terminé, le coureur a bien reçu chacune des semaines', async () => {
    const { statut, donnees } = await jsonA(APRES_TOUT, '/api/programme?programme=P5', {
      role: 'coureur',
    });
    expect(statut).toBe(200);
    expect(donnees.semaines).toHaveLength(17);
    expect(donnees.semaineCourante).toBe(17);
    for (const s of donnees.semaines) {
      const ref = semaineDuProgramme('P5', s.numero, { faitIzon: false });
      expect(s.publiee).toBe(true);
      expect(s.titre).toBe(ref.titre);
      expect(s.intention).toBe(ref.intention);
      expect(s.seances).toHaveLength(ref.seances.length);
    }
  });

  it("avant la première parution, le coureur ne reçoit rien et l'encadrant reçoit tout", async () => {
    const coureur = await jsonA(AVANT_TOUT, '/api/programme?programme=P3', { role: 'coureur' });
    expect(coureur.donnees.semaineCourante).toBe(0);
    expect(coureur.donnees.semaines.every((s) => s.titre === undefined)).toBe(true);

    const admin = await jsonA(AVANT_TOUT, '/api/programme?programme=P3', { role: 'admin' });
    expect(admin.donnees.semaines.every((s) => typeof s.titre === 'string')).toBe(true);
  });
});

describe('confidentialité des semaines futures', () => {
  it("ne renvoie JAMAIS le contenu d'une semaine non publiée à un coureur", async () => {
    const c = await cookie('coureur');
    await creerCoureur(c, { prenom: 'Test', initiale: 'C', programme: 'P3', faitIzon: false });
    // MI_PARCOURS : les semaines 9 à 16 sont encore fermées. Sans cette date
    // fixée, la liste des futures se viderait à partir du 8 novembre 2026 et
    // la boucle ci-dessous n'assertirait plus rien.
    const { donnees } = await jsonA(MI_PARCOURS, '/api/programme?programme=P3', {
      role: 'coureur',
    });
    const futures = donnees.semaines.filter((s) => !s.publiee);
    expect(futures.map((s) => s.numero)).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
    for (const s of futures) {
      expect(s.seances).toBeUndefined();
      expect(s.intention).toBeUndefined();
      expect(s.titre).toBeUndefined();
      expect(Object.keys(s).sort()).toEqual(['disponibleLe', 'numero', 'phase', 'publiee']);
    }
    // Aucune fuite dans la charge brute. « Sortie longue » ne prouvait rien :
    // ce libellé apparaît dans toutes les semaines, y compris les huit déjà
    // parues, et l'assertion ne passait que parce que rien n'était publié le
    // jour où elle a été écrite. On cherche désormais les textes réellement
    // confidentiels à cet instant, ceux de la semaine 9.
    const brut = JSON.stringify(donnees);
    const secrete = semaineDuProgramme('P3', 9, { faitIzon: false });
    expect(brut).not.toContain(secrete.titre);
    expect(brut).not.toContain(secrete.intention);
    for (const s of secrete.seances) expect(brut).not.toContain(s.description);
  });

  it('renvoie tout le contenu à un admin', async () => {
    // AVANT_TOUT : aucune semaine n'est parue, et l'encadrant les voit toutes.
    const { donnees } = await jsonA(AVANT_TOUT, '/api/programme?programme=P3', { role: 'admin' });
    expect(donnees.semaines.every((s) => s.publiee === false)).toBe(true);
    expect(donnees.semaines.every((s) => Array.isArray(s.seances))).toBe(true);
    expect(donnees.semaines.every((s) => typeof s.titre === 'string')).toBe(true);
  });

  it('refuse tout accès sans cookie', async () => {
    expect((await SELF.fetch('https://p.test/api/programme')).status).toBe(401);
    expect((await SELF.fetch('https://p.test/api/semaine')).status).toBe(401);
    expect((await SELF.fetch('https://p.test/api/coureur', { method: 'POST' })).status).toBe(401);
  });

  it('refuse un jeton signé avec un autre secret', async () => {
    const faux = `prepa=${await creerJeton('mauvais-secret', 'admin', 60000)}`;
    const r = await SELF.fetch('https://p.test/api/programme?programme=P3', { headers: { cookie: faux } });
    expect(r.status).toBe(401);
  });

  it('applique la variante Izon sans jamais lever le voile sur la semaine 9', async () => {
    const c = await cookie('coureur');
    await creerCoureur(c, { prenom: 'Izonneur', initiale: 'I', programme: 'P2', faitIzon: true });
    // MI_PARCOURS : la semaine 9 n'est pas encore ouverte, le refus est donc
    // le seul comportement admissible. Plus de branche selon la date du jour,
    // qui rendait le test muet une fois la semaine 9 parue.
    const { statut, donnees } = await jsonA(
      MI_PARCOURS, '/api/semaine?programme=P2&numero=9&izon=1', { role: 'coureur' },
    );
    expect(statut).toBe(403);
    expect(donnees.semaine).toBeUndefined();
    expect(JSON.stringify(donnees)).not.toMatch(/Izon/i);
  });

  it("ignore le paramètre coureur pour un non-admin : pas de lecture du voisin", async () => {
    const admin = await cookie('admin');
    const { donnees } = await creerCoureur(admin, {
      prenom: 'Voisin', initiale: 'V', programme: 'P4', faitIzon: true,
    });
    const idVoisin = donnees.coureur.id;

    const c = await cookie('coureur');
    // Sans programme explicite, l'identifiant d'un tiers ne doit rien ouvrir.
    const r = await SELF.fetch(`https://p.test/api/programme?coureur=${idVoisin}`, {
      headers: entetes(c),
    });
    expect(r.status).toBe(400);
    const refus = await r.json();
    expect(refus.semaines).toBeUndefined();
    expect(JSON.stringify(refus)).not.toMatch(/Voisin|P4/);

    // Avec un programme explicite, le paramètre coureur reste sans effet :
    // le programme servi est celui demandé, pas celui du voisin.
    const r2 = await SELF.fetch(
      `https://p.test/api/programme?programme=P1&coureur=${idVoisin}`,
      { headers: entetes(c) },
    );
    expect((await r2.json()).programme.code).toBe('P1');
  });

  it("ne divulgue jamais l'identité d'un autre coureur", async () => {
    const admin = await cookie('admin');
    const { donnees } = await creerCoureur(admin, {
      prenom: 'Secrete', initiale: 'S', programme: 'P5', faitIzon: true,
    });
    const c = await cookie('coureur');
    for (const chemin of [
      `/api/programme?programme=P5&coureur=${donnees.coureur.id}`,
      `/api/semaine?programme=P5&numero=1&coureur=${donnees.coureur.id}`,
      `/api/programme?programme=P5&coureur=999999`,
      `/api/programme?programme=P5&coureur=abc`,
    ]) {
      const r = await SELF.fetch(`https://p.test${chemin}`, { headers: entetes(c) });
      const brut = JSON.stringify(await r.json());
      expect(brut).not.toMatch(/Secrete/);
      expect(brut).not.toMatch(/initiale/);
      expect(brut).not.toMatch(/"cle"/);
    }
  });

  it("l'encadrant, lui, peut consulter un coureur par son identifiant", async () => {
    const admin = await cookie('admin');
    const { donnees } = await creerCoureur(admin, {
      prenom: 'Suivi', initiale: 'S', programme: 'P4', faitIzon: true,
    });
    const r = await SELF.fetch(`https://p.test/api/programme?coureur=${donnees.coureur.id}`, {
      headers: entetes(admin),
    });
    expect(r.status).toBe(200);
    const vue = await r.json();
    expect(vue.programme.code).toBe('P4');
    expect(vue.semaines.find((s) => s.numero === 9).phase).toBe(
      semaineDuProgramme('P4', 9, { faitIzon: true }).phase,
    );
  });

  // Le filet : aucun texte appartenant à une semaine non publiée ne doit
  // apparaître dans une quelconque réponse servie à un coureur, quelle que
  // soit la route, le programme, la variante ou le numéro demandé.
  it('aucune route servie à un coureur ne laisse passer un texte non publié', async () => {
    // Le filet est tendu à MI_PARCOURS : la moitié du corpus est ouverte,
    // l'autre non. Joué à la date du jour, il se serait vidé de sa substance
    // le 8 novembre 2026 (plus rien de confidentiel) et l'assertion sur la
    // taille du corpus aurait viré au rouge sans le moindre défaut de code.
    const maintenant = MI_PARCOURS;
    const publies = new Set();
    const confidentiels = new Set();

    for (const code of CODES_PROGRAMMES) {
      for (const s of PROGRAMMES[code].semainesContenu) {
        for (const faitIzon of [false, true]) {
          const resolue = semaineDuProgramme(code, s.numero, { faitIzon });
          // Le déroulé, le préambule et le conseil sont du contenu de séance
          // au même titre que la description dont ils sont tirés, et ils sont
          // publiés séparément d'elle. Les collecter ici n'est pas une
          // précaution de principe : sans eux, une vue qui laisserait passer
          // les étapes d'une semaine à venir sans laisser passer sa
          // description traverserait ce filet sans être vue.
          //
          // Les textes courts sont écartés. La comparaison se fait par
          // inclusion de chaîne, et une étape comme « 3 min en Z2 » est une
          // sous-chaîne de « 13 min en Z2 » : elle produirait des fuites
          // imaginaires. Ce sont de toute façon les textes longs qui portent
          // le contenu qu'on protège.
          const etapes = resolue.seances.flatMap((x) => [
            ...x.deroule.flatMap((e) => [e.texte, e.repere, e.recuperation]),
            x.preambule,
            x.conseil,
          ]);
          const textes = [
            resolue.titre,
            resolue.intention,
            ...resolue.seances.flatMap((x) => [x.description, x.objectif]),
            ...etapes.filter((t) => typeof t === 'string' && t.length >= 30),
          ];
          const cible = estPubliee(s.numero, maintenant) ? publies : confidentiels;
          for (const t of textes) cible.add(t);
        }
      }
    }
    // Un texte qui apparaît aussi dans une semaine déjà publiée n'est plus
    // confidentiel : il ne prouverait rien.
    for (const t of publies) confidentiels.delete(t);
    expect(confidentiels.size).toBeGreaterThan(100);

    const c = await cookie('coureur');
    const { donnees: cree } = await creerCoureur(c, {
      prenom: 'Filet', initiale: 'F', programme: 'P3', faitIzon: true,
    });

    const chemins = ['/api/sante', '/api/zones', '/api/session', '/api/coureur', '/api/programme', '/api/semaine'];
    for (const code of CODES_PROGRAMMES) {
      for (const izon of ['0', '1']) {
        chemins.push(`/api/programme?programme=${code}&izon=${izon}`);
        chemins.push(`/api/programme?programme=${code}&izon=${izon}&coureur=${cree.coureur.id}`);
        chemins.push(`/api/semaine?programme=${code}&izon=${izon}`);
        for (let n = 0; n <= PROGRAMMES[code].semainesContenu.length + 1; n++) {
          chemins.push(`/api/semaine?programme=${code}&izon=${izon}&numero=${n}`);
        }
      }
    }

    const fuites = [];
    for (const chemin of chemins) {
      const r = await requeteA(maintenant, chemin, { role: 'coureur' });
      const brut = await r.text();
      for (const texte of confidentiels) {
        if (brut.includes(texte)) fuites.push(`${chemin} : ${texte.slice(0, 60)}`);
      }
    }
    expect(fuites).toEqual([]);
  });

  // Le filet symétrique : à MI_PARCOURS, ce qui est paru doit bel et bien
  // arriver jusqu'au coureur. Sans lui, un Worker qui ne servirait plus
  // jamais aucune semaine passerait la batterie précédente sans broncher.
  it('toutes les routes servent bien au coureur les textes déjà parus', async () => {
    const attendus = [];
    for (const code of CODES_PROGRAMMES) {
      const nb = PROGRAMMES[code].semainesContenu.length;
      for (let n = 1; n <= nb; n++) {
        if (!estPubliee(n, MI_PARCOURS)) continue;
        const s = semaineDuProgramme(code, n, { faitIzon: false });
        attendus.push({ code, numero: n, titre: s.titre, intention: s.intention });
      }
    }
    expect(attendus.length).toBeGreaterThan(0);

    const manquants = [];
    for (const { code, numero, titre, intention } of attendus) {
      const parSemaine = await requeteA(
        MI_PARCOURS, `/api/semaine?programme=${code}&izon=0&numero=${numero}`, { role: 'coureur' },
      );
      const brutSemaine = await parSemaine.text();
      if (parSemaine.status !== 200) manquants.push(`${code}/${numero} : statut ${parSemaine.status}`);
      if (!brutSemaine.includes(titre)) manquants.push(`${code}/${numero} : titre absent de /api/semaine`);
      if (!brutSemaine.includes(intention)) manquants.push(`${code}/${numero} : intention absente de /api/semaine`);

      const parProgramme = await requeteA(
        MI_PARCOURS, `/api/programme?programme=${code}&izon=0`, { role: 'coureur' },
      );
      const brutProgramme = await parProgramme.text();
      if (!brutProgramme.includes(titre)) manquants.push(`${code}/${numero} : titre absent de /api/programme`);
      if (!brutProgramme.includes(intention)) manquants.push(`${code}/${numero} : intention absente de /api/programme`);
    }
    expect(manquants).toEqual([]);
  });

  it('aucun message d\'erreur ne cite un titre ou une séance à venir', async () => {
    const titres = new Set();
    for (const code of CODES_PROGRAMMES) {
      for (const s of PROGRAMMES[code].semainesContenu) {
        if (!estPubliee(s.numero, AVANT_TOUT)) titres.add(s.titre);
      }
    }
    // AVANT_TOUT : aucune semaine n'est parue, donc tous les titres sont
    // confidentiels. Joué à la date du jour, l'ensemble se serait vidé après
    // le 8 novembre 2026 et la boucle n'aurait plus rien vérifié du tout.
    expect(titres.size).toBeGreaterThan(50);
    for (const chemin of [
      '/api/programme?programme=P42',
      '/api/semaine?programme=P42&numero=1',
      '/api/semaine?programme=P3&numero=abc',
      '/api/semaine?programme=P3&numero=999',
      '/api/semaine?programme=P3&numero=1',
    ]) {
      const brut = await (await requeteA(AVANT_TOUT, chemin, { role: 'coureur' })).text();
      for (const titre of titres) expect(brut).not.toContain(titre);
    }
  });
});

// ---------------------------------------------------------------------------
// Correctifs de sécurité du commit 1d03167
// ---------------------------------------------------------------------------

// Clés héritées d'Object.prototype. PROGRAMMES[code] les résout en fonctions,
// donc en valeurs truthy : un simple garde de nullité les laissait passer, et
// la suite appelait .semainesContenu.map sur une fonction, soit un 500. Pire,
// "__proto__" pouvait être enregistré durablement sur une fiche de coureur, et
// toute lecture ultérieure de cette fiche par l'encadrant plantait.
const CLES_HERITEES = ['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty'];

describe('clés héritées du prototype', () => {
  for (const cle of CLES_HERITEES) {
    it(`/api/programme?programme=${cle} répond 400 et non 500`, async () => {
      const { statut, donnees } = await jsonA(
        MI_PARCOURS, `/api/programme?programme=${encodeURIComponent(cle)}`, { role: 'coureur' },
      );
      expect(statut).toBe(400);
      expect(Object.keys(donnees)).toEqual(['erreur']);
      expect(donnees.semaines).toBeUndefined();
    });

    it(`/api/semaine?programme=${cle} répond 400 et non 500`, async () => {
      const { statut, donnees } = await jsonA(
        MI_PARCOURS, `/api/semaine?programme=${encodeURIComponent(cle)}&numero=1`, { role: 'coureur' },
      );
      expect(statut).toBe(400);
      expect(Object.keys(donnees)).toEqual(['erreur']);
      expect(donnees.semaine).toBeUndefined();
    });

    it(`POST /api/coureur refuse programme=${cle}`, async () => {
      const c = await cookie('coureur');
      const { statut, donnees } = await creerCoureur(c, {
        prenom: 'Proto', initiale: 'P', programme: cle,
      });
      expect(statut).toBe(400);
      expect(donnees.coureur).toBeUndefined();
      expect(typeof donnees.erreur).toBe('string');
    });
  }

  it("aucune fiche empoisonnée n'a pu s'installer en base", async () => {
    // Le vrai dégât de la clé héritée n'était pas le 500 du moment mais la
    // donnée durable : si une seule fiche avait pu être créée avec
    // programme = "__proto__", l'encadrant la relirait en 500 pour toujours.
    const admin = await cookie('admin');
    const { donnees } = await creerCoureur(admin, {
      prenom: 'Proto', initiale: 'P', programme: 'P3',
    });
    const r = await requeteA(MI_PARCOURS, `/api/programme?coureur=${donnees.coureur.id}`, {
      role: 'admin',
    });
    expect(r.status).toBe(200);
  });
});

describe('en-têtes de cache', () => {
  const ROUTES_PRIVEES = [
    '/api/sante',
    '/api/programme?programme=P3',
    '/api/semaine?programme=P3&numero=1',
    '/api/programme?programme=P42',
    '/api/semaine?programme=P3&numero=16',
  ];

  for (const chemin of ROUTES_PRIVEES) {
    it(`${chemin} interdit toute mise en cache`, async () => {
      const r = await requeteA(MI_PARCOURS, chemin, { role: 'coureur' });
      expect(r.headers.get('cache-control')).toBe('no-store');
      expect(r.headers.get('vary')).toMatch(/\bCookie\b/);
    });
  }

  it('une réponse refusée porte aussi les en-têtes privés', async () => {
    for (const r of [
      await requeteA(MI_PARCOURS, '/api/programme?programme=P3'), // 401, pas de cookie
      await requeteA(MI_PARCOURS, '/api/semaine?programme=P3&numero=16', { role: 'coureur' }), // 403
      await requeteA(MI_PARCOURS, '/api/inconnue', { role: 'coureur' }), // 404
    ]) {
      expect(r.headers.get('cache-control')).toBe('no-store');
      expect(r.headers.get('vary')).toMatch(/\bCookie\b/);
    }
  });

  it('POST /api/coureur et POST /api/session ne sont pas cachables', async () => {
    const c = await cookie('coureur');
    const r = await SELF.fetch('https://p.test/api/coureur', {
      method: 'POST',
      headers: entetes(c, '203.0.113.30'),
      body: JSON.stringify({ prenom: 'Cache', initiale: 'C', programme: 'P3' }),
    });
    expect(r.headers.get('cache-control')).toBe('no-store');

    const s = await SELF.fetch('https://p.test/api/session', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '203.0.113.31' },
      body: JSON.stringify({ code: 'coureur-test' }),
    });
    expect(s.headers.get('cache-control')).toBe('no-store');
    expect(s.headers.get('vary')).toMatch(/\bCookie\b/);
  });

  it('les zones, seule ressource publique, restent cachables sans varier sur le cookie', async () => {
    const r = await SELF.fetch('https://p.test/api/zones');
    expect(r.headers.get('cache-control')).toBe('public, max-age=3600');
    expect(r.headers.get('vary')).toMatch(/\bAccept-Encoding\b/);
  });

  it("la même URL ne sert pas la réponse de l'encadrant au coureur", async () => {
    // La démonstration de l'utilité de Vary: Cookie. Même URL, deux charges
    // radicalement différentes selon le seul cookie.
    const chemin = '/api/programme?programme=P3';
    const coureur = await (await requeteA(MI_PARCOURS, chemin, { role: 'coureur' })).text();
    const admin = await (await requeteA(MI_PARCOURS, chemin, { role: 'admin' })).text();
    expect(admin.length).toBeGreaterThan(coureur.length);
    const secrete = semaineDuProgramme('P3', 16, { faitIzon: false }).titre;
    expect(admin).toContain(secrete);
    expect(coureur).not.toContain(secrete);
  });
});

describe('limitation de débit atomique', () => {
  it('50 requêtes simultanées de la même IP ne produisent pas plus de 10 évaluations', async () => {
    const ip = '198.51.100.50';
    // Lancées ensemble, sans await intermédiaire : c'est l'entrelacement que
    // le INSERT ... ON CONFLICT ... RETURNING doit encaisser. Un compteur lu
    // puis incrémenté en deux allers-retours laisserait ici les 50 requêtes
    // lire la même valeur et faire toutes évaluer leur code.
    const reponses = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        SELF.fetch('https://p.test/api/session', {
          method: 'POST',
          headers: { 'cf-connecting-ip': ip },
          body: JSON.stringify({ code: `faux-${i}` }),
        }),
      ),
    );
    const statuts = reponses.map((r) => r.status);
    // Un 401 signifie que le code a réellement été comparé : c'est ce qu'une
    // force brute cherche à obtenir en masse.
    const evaluations = statuts.filter((s) => s === 401).length;
    const bloquees = statuts.filter((s) => s === 429).length;

    expect(evaluations).toBeLessThanOrEqual(LIMITE_TENTATIVES);
    expect(evaluations + bloquees).toBe(50);
    expect(bloquees).toBeGreaterThan(0);
    // Aucune session ouverte, évidemment.
    expect(reponses.some((r) => r.headers.get('set-cookie'))).toBe(false);
  });

  it('un adhérent qui tape le bon code ne se bloque jamais, même en concurrence', async () => {
    const ip = '198.51.100.51';
    const reponses = await Promise.all(
      Array.from({ length: 12 }, () =>
        SELF.fetch('https://p.test/api/session', {
          method: 'POST',
          headers: { 'cf-connecting-ip': ip },
          body: JSON.stringify({ code: 'coureur-test' }),
        }),
      ),
    );
    expect(reponses.map((r) => r.status)).toEqual(Array(12).fill(200));
  });

  it('douze connexions réussies de suite laissent le compteur à zéro', async () => {
    const ip = '198.51.100.52';
    const ouvrir = (code) =>
      SELF.fetch('https://p.test/api/session', {
        method: 'POST',
        headers: { 'cf-connecting-ip': ip },
        body: JSON.stringify({ code }),
      });

    for (let i = 0; i < 12; i++) {
      expect((await ouvrir('coureur-test')).status).toBe(200);
    }
    // Le compteur ayant été décompté à chaque succès, il reste dix échecs
    // disponibles avant blocage : les connexions réussies n'ont rien coûté.
    for (let i = 0; i < 10; i++) {
      expect((await ouvrir(`faux-${i}`)).status).toBe(401);
    }
    expect((await ouvrir('faux-11')).status).toBe(429);
  });
});

describe('comparaison à temps constant', () => {
  it('egalConstant ne se laisse pas abuser par une longueur ni par un préfixe', () => {
    expect(egalConstant('coureur-test', 'coureur-test')).toBe(true);
    expect(egalConstant('coureur-test', 'coureur-tesT')).toBe(false);
    expect(egalConstant('coureur-test', 'coureur')).toBe(false);
    expect(egalConstant('coureur-test', 'coureur-test ')).toBe(false);
    expect(egalConstant('', '')).toBe(true);
  });

  it('un préfixe ou une variante de casse du bon code est refusé', async () => {
    let ip = 60;
    for (const code of ['coureur-tes', 'coureur-testx', 'Coureur-Test', 'admin-tes', 'ADMIN-TEST']) {
      const r = await SELF.fetch('https://p.test/api/session', {
        method: 'POST',
        headers: { 'cf-connecting-ip': `198.51.100.${ip++}` },
        body: JSON.stringify({ code }),
      });
      expect(r.status).toBe(401);
      expect(r.headers.get('set-cookie')).toBeNull();
    }
  });
});

describe('méthode HEAD', () => {
  const LECTURES = [
    { chemin: '/api/sante', role: null },
    { chemin: '/api/zones', role: null },
    { chemin: '/api/programme?programme=P3', role: 'coureur' },
    { chemin: '/api/semaine?programme=P3&numero=1', role: 'coureur' },
    { chemin: '/api/semaine?programme=P3&numero=16', role: 'coureur' }, // 403
    { chemin: '/api/programme?programme=P42', role: 'coureur' }, // 400
    { chemin: '/api/inconnue', role: 'coureur' }, // 404
    { chemin: '/api/programme?programme=P3', role: null }, // 401
  ];

  for (const { chemin, role } of LECTURES) {
    it(`HEAD ${chemin} répond comme GET (rôle ${role ?? 'anonyme'})`, async () => {
      const options = role ? { role } : {};
      const parGet = await requeteA(MI_PARCOURS, chemin, options);
      const parHead = await requeteA(MI_PARCOURS, chemin, { ...options, method: 'HEAD' });

      expect(parHead.status).toBe(parGet.status);
      expect(parHead.headers.get('content-type')).toBe(parGet.headers.get('content-type'));
      expect(parHead.headers.get('cache-control')).toBe(parGet.headers.get('cache-control'));
      // Même statut et mêmes en-têtes, mais jamais de corps.
      expect(await parHead.text()).toBe('');
      expect((await parGet.text()).length).toBeGreaterThan(0);
    });
  }

  it("HEAD n'ouvre pas de porte dérobée sur une semaine non publiée", async () => {
    const r = await requeteA(MI_PARCOURS, '/api/semaine?programme=P3&numero=16', {
      role: 'coureur', method: 'HEAD',
    });
    expect(r.status).toBe(403);
    expect(await r.text()).toBe('');
  });

  it('HEAD reste refusé là où GET est refusé', async () => {
    const r = await requeteA(MI_PARCOURS, '/api/session', { method: 'HEAD' });
    expect(r.status).toBe(405);
  });
});

// ---------------------------------------------------------------------------
// Validation des séances
// ---------------------------------------------------------------------------
//
// Un coureur valide une séance de sa semaine : il peut y joindre un ressenti
// (facile / ok / difficile) et une note libre facultative, ou dévalider une
// séance cochée par erreur. C'est le signal qui permettra plus tard à
// l'encadrant de repérer qui sur-cuisine et d'alléger sa semaine suivante.
//
// Deux décisions de conception, non écrites dans le brief d'origine, sont
// verrouillées par les tests ci-dessous :
//
//   1. Identité par prénom + initiale, jamais par identifiant numérique,
//      pour un coureur (rôle non admin). Le rôle "coureur" est un code
//      partagé par tout le club, et les identifiants sont de petits entiers
//      séquentiels triviaux à deviner un par un : les honorer aurait permis
//      à n'importe quel adhérent de valider des séances au nom d'un autre,
//      ou de lire tout son suivi, en changeant simplement ce nombre. Seul
//      l'encadrant, qui a un usage légitime à cibler un coureur précis,
//      continue de le faire par identifiant (cf. contexteLecture ci-dessus).
//   2. Une semaine non publiée reste totalement fermée à la validation pour
//      un coureur, y compris pour distinguer un code de séance réel d'un
//      code inventé : sans ça, tâtonner sur /api/validation deviendrait un
//      second canal pour deviner le contenu d'une semaine à venir, après que
//      /api/semaine et /api/programme l'ont déjà fermé.
describe('validation de séance', () => {
  it('enregistre une validation avec ressenti et note, et la restitue', async () => {
    await creerCoureurA(MI_PARCOURS, 'coureur', { prenom: 'Valideur', initiale: 'V', programme: 'P3' });
    const idSeance = semaineDuProgramme('P3', 1, { faitIzon: false }).seances[0].id;

    const { statut, donnees } = await validerA(MI_PARCOURS, 'coureur', {
      prenom: 'Valideur', initiale: 'V', semaine: 1, seanceId: idSeance,
      ressenti: 'ok', note: 'Genou un peu raide.',
    });

    expect(statut).toBe(200);
    expect(donnees.validations).toHaveLength(1);
    expect(donnees.validations[0]).toMatchObject({
      semaine: 1, seanceId: idSeance, ressenti: 'ok', note: 'Genou un peu raide.',
    });
    expect(typeof donnees.validations[0].valideLe).toBe('string');
    // Aucune colonne interne (id de ligne, coureur_id, valide_le brut).
    expect(Object.keys(donnees.validations[0]).sort()).toEqual(
      ['note', 'ressenti', 'seanceId', 'semaine', 'valideLe'].sort(),
    );
  });

  it('est idempotente et met à jour le ressenti sans créer de seconde ligne', async () => {
    const { donnees: c } = await creerCoureurA(MI_PARCOURS, 'coureur', {
      prenom: 'Idem', initiale: 'I', programme: 'P3',
    });
    const idSeance = semaineDuProgramme('P3', 1, { faitIzon: false }).seances[0].id;
    const corps = (ressenti) => ({ prenom: 'Idem', initiale: 'I', semaine: 1, seanceId: idSeance, ressenti });

    await validerA(MI_PARCOURS, 'coureur', corps('facile'));
    const { statut, donnees } = await validerA(MI_PARCOURS, 'coureur', corps('difficile'));

    expect(statut).toBe(200);
    expect(donnees.validations).toHaveLength(1);
    expect(donnees.validations[0].ressenti).toBe('difficile');

    const lignes = await env.DB.prepare(
      'SELECT ressenti FROM validations WHERE coureur_id = ? AND semaine = 1 AND seance_id = ?',
    ).bind(c.coureur.id, idSeance).all();
    expect(lignes.results).toHaveLength(1);
    expect(lignes.results[0].ressenti).toBe('difficile');
  });

  it('refuse un ressenti hors liste', async () => {
    await creerCoureurA(MI_PARCOURS, 'coureur', { prenom: 'Mauvais', initiale: 'M', programme: 'P3' });
    const idSeance = semaineDuProgramme('P3', 1, { faitIzon: false }).seances[0].id;
    expect(RESSENTIS).not.toContain('epuisant');

    const { statut, donnees } = await validerA(MI_PARCOURS, 'coureur', {
      prenom: 'Mauvais', initiale: 'M', semaine: 1, seanceId: idSeance, ressenti: 'epuisant',
    });
    expect(statut).toBe(400);
    expect(donnees.erreur).not.toMatch(/—/) // aucun tiret cadratin dans les messages;
  });

  it('permet de dévalider une séance cochée par erreur', async () => {
    const { donnees: c } = await creerCoureurA(MI_PARCOURS, 'coureur', {
      prenom: 'Devalide', initiale: 'D', programme: 'P3',
    });
    const idSeance = semaineDuProgramme('P3', 1, { faitIzon: false }).seances[0].id;
    const identite = { prenom: 'Devalide', initiale: 'D', semaine: 1, seanceId: idSeance };

    await validerA(MI_PARCOURS, 'coureur', identite);
    const { statut, donnees } = await devaliderA(MI_PARCOURS, 'coureur', identite);

    expect(statut).toBe(200);
    expect(donnees.validations).toHaveLength(0);
    const lignes = await env.DB.prepare('SELECT * FROM validations WHERE coureur_id = ?')
      .bind(c.coureur.id).all();
    expect(lignes.results).toHaveLength(0);
  });

  it('dévalider une séance jamais validée ne lève pas d\'erreur (idempotent)', async () => {
    await creerCoureurA(MI_PARCOURS, 'coureur', { prenom: 'Jamais', initiale: 'J', programme: 'P3' });
    const idSeance = semaineDuProgramme('P3', 1, { faitIzon: false }).seances[0].id;
    const { statut, donnees } = await devaliderA(MI_PARCOURS, 'coureur', {
      prenom: 'Jamais', initiale: 'J', semaine: 1, seanceId: idSeance,
    });
    expect(statut).toBe(200);
    expect(donnees.validations).toHaveLength(0);
  });

  it('tronque une note trop longue à 500 caractères', async () => {
    const { donnees: c } = await creerCoureurA(MI_PARCOURS, 'coureur', {
      prenom: 'Bavard', initiale: 'B', programme: 'P3',
    });
    const idSeance = semaineDuProgramme('P3', 1, { faitIzon: false }).seances[0].id;
    await validerA(MI_PARCOURS, 'coureur', {
      prenom: 'Bavard', initiale: 'B', semaine: 1, seanceId: idSeance, note: 'x'.repeat(1000),
    });
    const l = await env.DB.prepare('SELECT note FROM validations WHERE coureur_id = ?')
      .bind(c.coureur.id).first();
    expect(l.note.length).toBe(500);
  });

  it("refuse un code de séance qui n'existe pas dans la semaine, une fois celle-ci publiée", async () => {
    await creerCoureurA(MI_PARCOURS, 'coureur', { prenom: 'Farceur', initiale: 'F', programme: 'P3' });
    const { statut, donnees } = await validerA(MI_PARCOURS, 'coureur', {
      prenom: 'Farceur', initiale: 'F', semaine: 1, seanceId: 'IDENTIFIANT-INVENTE',
    });
    expect(statut).toBe(400);
    expect(donnees.erreur).toMatch(/séance/i);
    expect(donnees.erreur).not.toMatch(/—/) // aucun tiret cadratin dans les messages;
  });

  it('refuse une semaine mal formée (non entière, négative ou absente)', async () => {
    await creerCoureurA(MI_PARCOURS, 'coureur', { prenom: 'Flottant', initiale: 'F', programme: 'P3' });
    const idSeance = semaineDuProgramme('P3', 1, { faitIzon: false }).seances[0].id;
    for (const semaine of ['1', 1.5, -1, 0, null, undefined]) {
      const { statut } = await validerA(MI_PARCOURS, 'coureur', {
        prenom: 'Flottant', initiale: 'F', semaine, seanceId: idSeance,
      });
      expect(statut).toBe(400);
    }
  });

  it('refuse une semaine hors bornes du programme', async () => {
    await creerCoureurA(MI_PARCOURS, 'coureur', { prenom: 'Hors', initiale: 'B', programme: 'P3' });
    const { statut } = await validerA(MI_PARCOURS, 'coureur', {
      prenom: 'Hors', initiale: 'B', semaine: 999, seanceId: 'EF-1',
    });
    expect(statut).toBe(404);
  });

  it('refuse sans cookie', async () => {
    const r = await requeteA(MI_PARCOURS, '/api/validation', {
      method: 'POST', headers: {}, body: JSON.stringify({ semaine: 1, seanceId: 'EF-1' }),
    });
    expect(r.status).toBe(401);
  });

  it('refuse une autre méthode que GET, POST ou DELETE', async () => {
    for (const method of ['PUT', 'PATCH']) {
      const r = await requeteA(MI_PARCOURS, '/api/validation', { role: 'coureur', method });
      expect(r.status).toBe(405);
    }
  });

  it('accepte GET, qui sert à réafficher les coches au chargement', async () => {
    // Sans coureur désigné la lecture échoue en 400, pas en 405 : la méthode
    // est bien acceptée, c'est la désignation qui manque.
    const r = await requeteA(MI_PARCOURS, '/api/validation', { role: 'coureur', method: 'GET' });
    expect(r.status).toBe(400);
  });

  it('ne laisse pas un coureur lire le suivi d\'un autre par son identifiant', async () => {
    const r = await requeteA(MI_PARCOURS, '/api/validation?coureur=1', { role: 'coureur', method: 'GET' });
    expect(r.status).toBe(400);
    const corps = await r.json();
    expect(corps.validations).toBeUndefined();
  });
});

describe('validation de séance : semaine non publiée', () => {
  it("refuse de valider une séance d'une semaine non encore publiée, sans rien révéler de son contenu", async () => {
    const { donnees: c } = await creerCoureurA(AVANT_TOUT, 'coureur', {
      prenom: 'Impatient', initiale: 'I', programme: 'P3',
    });
    const secrete = semaineDuProgramme('P3', 1, { faitIzon: false });

    const { statut, donnees } = await validerA(AVANT_TOUT, 'coureur', {
      prenom: 'Impatient', initiale: 'I', semaine: 1, seanceId: secrete.seances[0].id, ressenti: 'ok',
    });

    expect(statut).toBe(403);
    expect(Object.keys(donnees).sort()).toEqual(['disponibleLe', 'erreur', 'numero']);
    expect(donnees.disponibleLe).toBe(new Date(instantPublication(1)).toISOString());
    expect(donnees.erreur).not.toMatch(/—/) // aucun tiret cadratin dans les messages;
    expect(JSON.stringify(donnees)).not.toContain(secrete.titre);

    const lignes = await env.DB.prepare('SELECT * FROM validations WHERE coureur_id = ?')
      .bind(c.coureur.id).all();
    expect(lignes.results).toHaveLength(0);
  });

  it("ne laisse pas deviner par tâtonnement les codes de séance d'une semaine non publiée", async () => {
    // Un code réel et un code inventé doivent produire exactement la même
    // réponse : sinon, la différence entre les deux devient un second canal
    // pour reconstituer le contenu d'une semaine à venir, séance par séance.
    await creerCoureurA(AVANT_TOUT, 'coureur', { prenom: 'Curieux', initiale: 'C', programme: 'P3' });
    const identifiantReel = semaineDuProgramme('P3', 1, { faitIzon: false }).seances[0].id;

    const avecIdentifiantReel = await validerA(AVANT_TOUT, 'coureur', {
      prenom: 'Curieux', initiale: 'C', semaine: 1, seanceId: identifiantReel,
    });
    const avecIdentifiantInvente = await validerA(AVANT_TOUT, 'coureur', {
      prenom: 'Curieux', initiale: 'C', semaine: 1, seanceId: 'IDENTIFIANT-INVENTE',
    });

    expect(avecIdentifiantReel.statut).toBe(403);
    expect(avecIdentifiantInvente.statut).toBe(403);
    expect(avecIdentifiantReel.donnees).toEqual(avecIdentifiantInvente.donnees);
  });

  it("dévalider une semaine non publiée est refusé de la même façon", async () => {
    await creerCoureurA(AVANT_TOUT, 'coureur', { prenom: 'Presse', initiale: 'P', programme: 'P3' });
    const { statut, donnees } = await devaliderA(AVANT_TOUT, 'coureur', {
      prenom: 'Presse', initiale: 'P', semaine: 1, seanceId: 'EF-1',
    });
    expect(statut).toBe(403);
    expect(donnees.validations).toBeUndefined();
  });

  it("l'encadrant, lui, peut valider pour le compte d'un coureur même avant la parution", async () => {
    const { donnees: c } = await creerCoureurA(AVANT_TOUT, 'admin', {
      prenom: 'Suivi', initiale: 'S', programme: 'P3',
    });
    const idSeance = semaineDuProgramme('P3', 1, { faitIzon: false }).seances[0].id;

    const { statut, donnees } = await validerA(AVANT_TOUT, 'admin', {
      coureur: c.coureur.id, semaine: 1, seanceId: idSeance, ressenti: 'ok',
    });

    expect(statut).toBe(200);
    expect(donnees.validations).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Deux séances de même code dans une semaine
// ---------------------------------------------------------------------------
//
// Le défaut que l'identifiant de séance corrige. La semaine 10 de P1 aligne
// RECUP, RECUP, RECUP, RENFO : trois footings de récupération, trois jours
// différents, trois descriptions différentes. Tant que la validation était
// clavetée sur le code, cocher le second effaçait le premier, avec son
// ressenti et sa note.

describe('séances homonymes dans une semaine', () => {
  // Ces trois tests se lisent à APRES_TOUT et non à MI_PARCOURS : la semaine
  // 10 de P1 n'est pas encore parue à la huitième semaine du calendrier.
  it('enregistre séparément les trois footings de la semaine 10 de P1', async () => {
    await creerCoureurA(APRES_TOUT, 'coureur', { prenom: 'Doublon', initiale: 'D', programme: 'P1' });
    const s10 = semaineDuProgramme('P1', 10, { faitIzon: false });
    expect(s10.seances.filter((x) => x.code === 'RECUP')).toHaveLength(3);

    await validerA(APRES_TOUT, 'coureur', {
      prenom: 'Doublon', initiale: 'D', semaine: 10, seanceId: 'RECUP-1',
      ressenti: 'facile', note: 'footing du mardi, tranquille',
    });
    const { statut, donnees } = await validerA(APRES_TOUT, 'coureur', {
      prenom: 'Doublon', initiale: 'D', semaine: 10, seanceId: 'RECUP-2',
      ressenti: 'difficile', note: 'footing du jeudi, jambes lourdes',
    });

    expect(statut).toBe(200);
    // Deux lignes, et chacune a gardé son propre ressenti et sa propre note.
    expect(donnees.validations).toHaveLength(2);
    const parId = new Map(donnees.validations.map((v) => [v.seanceId, v]));
    expect(parId.get('RECUP-1')).toMatchObject({
      semaine: 10, ressenti: 'facile', note: 'footing du mardi, tranquille',
    });
    expect(parId.get('RECUP-2')).toMatchObject({
      semaine: 10, ressenti: 'difficile', note: 'footing du jeudi, jambes lourdes',
    });
  });

  it('dévalider un des trois footings laisse les autres en place', async () => {
    await creerCoureurA(APRES_TOUT, 'coureur', { prenom: 'Decoche', initiale: 'D', programme: 'P1' });
    const identite = { prenom: 'Decoche', initiale: 'D', semaine: 10 };
    await validerA(APRES_TOUT, 'coureur', { ...identite, seanceId: 'RECUP-1', ressenti: 'ok' });
    await validerA(APRES_TOUT, 'coureur', { ...identite, seanceId: 'RECUP-2', ressenti: 'difficile' });

    const { donnees } = await devaliderA(APRES_TOUT, 'coureur', { ...identite, seanceId: 'RECUP-1' });
    expect(donnees.validations).toHaveLength(1);
    expect(donnees.validations[0].seanceId).toBe('RECUP-2');
    expect(donnees.validations[0].ressenti).toBe('difficile');
  });

  it("publie l'identifiant de chaque séance à côté de son code", async () => {
    const { donnees } = await jsonA(APRES_TOUT, '/api/semaine?programme=P1&numero=10', { role: 'coureur' });
    expect(donnees.semaine.seances.map((x) => x.id)).toEqual(['RECUP-1', 'RECUP-2', 'RECUP-3', 'RENFO-1']);
    expect(donnees.semaine.seances.map((x) => x.code)).toEqual(['RECUP', 'RECUP', 'RECUP', 'RENFO']);
  });

  it("refuse un identifiant de séance qui n'existe pas dans la semaine", async () => {
    await creerCoureurA(MI_PARCOURS, 'coureur', { prenom: 'Trop', initiale: 'T', programme: 'P1' });
    // La semaine 1 de P1 n'a qu'une endurance : EF-2 n'existe pas, et le
    // code nu « EF » n'est plus une identité valable.
    for (const seanceId of ['EF-2', 'EF', 'SL-2']) {
      const { statut } = await validerA(MI_PARCOURS, 'coureur', {
        prenom: 'Trop', initiale: 'T', semaine: 1, seanceId,
      });
      expect(statut).toBe(400);
    }
  });
});

describe('validation de séance : sécurité de l\'identifiant coureur', () => {
  it("le paramètre coureur est ignoré pour un non-admin : ni écriture ni lecture au nom d'un autre", async () => {
    const { donnees: victime } = await creerCoureurA(MI_PARCOURS, 'admin', {
      prenom: 'Victime', initiale: 'V', programme: 'P3',
    });
    const { donnees: attaquant } = await creerCoureurA(MI_PARCOURS, 'admin', {
      prenom: 'Attaquant', initiale: 'A', programme: 'P3',
    });
    const idSeance = semaineDuProgramme('P3', 1, { faitIzon: false }).seances[0].id;

    // La victime valide légitimement sa propre séance.
    await validerA(MI_PARCOURS, 'coureur', {
      prenom: 'Victime', initiale: 'V', semaine: 1, seanceId: idSeance,
      ressenti: 'difficile', note: 'douleur au genou',
    });

    // L'attaquant, authentifié comme coureur (code partagé par tout le
    // club), fournit l'identifiant numérique de la victime tout en
    // s'identifiant lui-même par son propre prénom et sa propre initiale.
    const { statut, donnees } = await validerA(MI_PARCOURS, 'coureur', {
      coureur: victime.coureur.id, // tentative de vol d'identité
      prenom: 'Attaquant', initiale: 'A',
      semaine: 1, seanceId: idSeance, ressenti: 'facile', note: 'usurpation',
    });

    expect(statut).toBe(200);
    // La réponse ne contient que le suivi de l'attaquant, jamais celui de
    // la victime : aucune trace de son ressenti ni de sa note.
    expect(donnees.validations).toHaveLength(1);
    expect(donnees.validations[0].ressenti).toBe('facile');
    expect(JSON.stringify(donnees)).not.toMatch(/genou/);
    expect(JSON.stringify(donnees)).not.toMatch(/difficile/);

    // Vérification directe en base : la ligne de la victime n'a pas bougé,
    // l'écriture de l'attaquant est bien allée sur SA propre fiche.
    const ligneVictime = await env.DB.prepare(
      'SELECT ressenti, note FROM validations WHERE coureur_id = ? AND semaine = 1 AND seance_id = ?',
    ).bind(victime.coureur.id, idSeance).first();
    expect(ligneVictime.ressenti).toBe('difficile');
    expect(ligneVictime.note).toBe('douleur au genou');

    const ligneAttaquant = await env.DB.prepare(
      'SELECT ressenti, note FROM validations WHERE coureur_id = ? AND semaine = 1 AND seance_id = ?',
    ).bind(attaquant.coureur.id, idSeance).first();
    expect(ligneAttaquant.ressenti).toBe('facile');
    expect(ligneAttaquant.note).toBe('usurpation');
  });

  it("sans prénom ni initiale, un coureur ne peut valider pour personne, même avec un identifiant valide", async () => {
    const { donnees: cible } = await creerCoureurA(MI_PARCOURS, 'admin', {
      prenom: 'Cible', initiale: 'C', programme: 'P3',
    });
    const idSeance = semaineDuProgramme('P3', 1, { faitIzon: false }).seances[0].id;

    const { statut, donnees } = await validerA(MI_PARCOURS, 'coureur', {
      coureur: cible.coureur.id, semaine: 1, seanceId: idSeance, ressenti: 'ok',
    });

    expect(statut).toBe(400);
    expect(donnees.validations).toBeUndefined();
    const lignes = await env.DB.prepare('SELECT * FROM validations WHERE coureur_id = ?')
      .bind(cible.coureur.id).all();
    expect(lignes.results).toHaveLength(0);
  });

  it("ne divulgue jamais le suivi d'un autre coureur, même en devinant son identifiant", async () => {
    const { donnees: secrete } = await creerCoureurA(MI_PARCOURS, 'admin', {
      prenom: 'Discrete', initiale: 'D', programme: 'P3',
    });
    const idSeance = semaineDuProgramme('P3', 1, { faitIzon: false }).seances[0].id;
    await validerA(MI_PARCOURS, 'admin', {
      coureur: secrete.coureur.id, semaine: 1, seanceId: idSeance,
      ressenti: 'difficile', note: 'information confidentielle',
    });

    await creerCoureurA(MI_PARCOURS, 'coureur', { prenom: 'Fouineur', initiale: 'F', programme: 'P3' });
    const { donnees } = await validerA(MI_PARCOURS, 'coureur', {
      coureur: secrete.coureur.id,
      prenom: 'Fouineur', initiale: 'F', semaine: 1, seanceId: idSeance, ressenti: 'ok',
    });

    expect(JSON.stringify(donnees)).not.toMatch(/information confidentielle/);
    expect(JSON.stringify(donnees)).not.toMatch(/Discrete/);
  });

  it("l'encadrant, lui, peut cibler un coureur précis par son identifiant", async () => {
    const { donnees: c } = await creerCoureurA(MI_PARCOURS, 'admin', {
      prenom: 'CibleAdmin', initiale: 'C', programme: 'P3',
    });
    const idSeance = semaineDuProgramme('P3', 1, { faitIzon: false }).seances[0].id;
    const { statut, donnees } = await validerA(MI_PARCOURS, 'admin', {
      coureur: c.coureur.id, semaine: 1, seanceId: idSeance, ressenti: 'ok',
    });
    expect(statut).toBe(200);
    expect(donnees.validations).toHaveLength(1);
  });

  it('refuse un identifiant coureur absent ou invalide pour un admin', async () => {
    for (const coureur of [undefined, 0, -1, 'abc', 999999]) {
      const { statut } = await validerA(MI_PARCOURS, 'admin', {
        coureur, semaine: 1, seanceId: 'EF-1', ressenti: 'ok',
      });
      expect(statut).toBe(400);
    }
  });
});
