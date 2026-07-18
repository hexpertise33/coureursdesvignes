import { env, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

import { creerJeton } from '../src/auth.js';
import { estPubliee, instantPublication, semaineCourante } from '../src/calendrier.js';
import { PROGRAMMES, semaineDuProgramme } from '../src/programmes/index.js';
import { ZONES } from '../src/programmes/seances.js';

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
    const c = await cookie('coureur');
    const r = await SELF.fetch('https://p.test/api/programme?programme=P3', { headers: entetes(c) });
    expect(r.status).toBe(200);
    const donnees = await r.json();
    expect(donnees.programme.code).toBe('P3');
    expect(donnees.semaines).toHaveLength(PROGRAMMES.P3.semainesContenu.length);
    expect(donnees.semaineCourante).toBe(
      semaineCourante(Date.now(), PROGRAMMES.P3.semainesContenu.length),
    );
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
    const c = await cookie('coureur');
    const r = await SELF.fetch('https://p.test/api/semaine?programme=P3&numero=1', {
      headers: entetes(c),
    });
    expect(r.status).toBe(403);
    const donnees = await r.json();
    expect(Object.keys(donnees).sort()).toEqual(['disponibleLe', 'erreur', 'numero']);
    expect(donnees.disponibleLe).toBe(new Date(instantPublication(1)).toISOString());
    expect(donnees.erreur).not.toMatch(/\u2014/) // aucun tiret cadratin dans les messages;
  });

  it('rejette un numéro mal formé sans jamais servir de contenu', async () => {
    const c = await cookie('coureur');
    for (const numero of ['abc', '1.5', '1e1', ' 1', '01', '-3', 'NaN', 'Infinity', '9999999999999999999']) {
      const r = await SELF.fetch(
        `https://p.test/api/semaine?programme=P3&numero=${encodeURIComponent(numero)}`,
        { headers: entetes(c) },
      );
      expect([400, 404]).toContain(r.status);
      const donnees = await r.json();
      expect(donnees.semaine).toBeUndefined();
      expect(Object.keys(donnees)).toEqual(['erreur']);
    }
  });

  it('rejette un numéro hors bornes, y compris pour un admin', async () => {
    const nb = PROGRAMMES.P3.semainesContenu.length;
    for (const role of ['coureur', 'admin']) {
      const c = await cookie(role);
      for (const numero of [0, -1, nb + 1, 999]) {
        const r = await SELF.fetch(`https://p.test/api/semaine?programme=P3&numero=${numero}`, {
          headers: entetes(c),
        });
        expect([400, 404]).toContain(r.status);
        expect((await r.json()).semaine).toBeUndefined();
      }
    }
  });

  it("sans numéro, répond que la préparation n'a pas commencé tant qu'aucune semaine n'est publiée", async () => {
    const c = await cookie('coureur');
    const r = await SELF.fetch('https://p.test/api/semaine?programme=P3', { headers: entetes(c) });
    const courante = semaineCourante(Date.now(), PROGRAMMES.P3.semainesContenu.length);
    if (courante === 0) {
      expect(r.status).toBe(404);
      expect((await r.json()).semaine).toBeUndefined();
    } else {
      expect(r.status).toBe(200);
      expect((await r.json()).semaine.numero).toBe(courante);
    }
  });

  it("sert le contenu complet à l'encadrant, variante résolue et sans champ variantes", async () => {
    const c = await cookie('admin');
    const r = await SELF.fetch('https://p.test/api/semaine?programme=P3&numero=9&izon=1', {
      headers: entetes(c),
    });
    expect(r.status).toBe(200);
    const { semaine } = await r.json();
    expect(semaine.numero).toBe(9);
    expect(Array.isArray(semaine.seances)).toBe(true);
    expect(semaine.variantes).toBeUndefined();
    expect(semaine.phase).toBe(semaineDuProgramme('P3', 9, { faitIzon: true }).phase);
  });

  it('applique la variante Izon demandée pour un admin', async () => {
    const c = await cookie('admin');
    const avec = await (
      await SELF.fetch('https://p.test/api/semaine?programme=P3&numero=9&izon=1', { headers: entetes(c) })
    ).json();
    const sans = await (
      await SELF.fetch('https://p.test/api/semaine?programme=P3&numero=9&izon=0', { headers: entetes(c) })
    ).json();
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

describe('confidentialité des semaines futures', () => {
  it("ne renvoie JAMAIS le contenu d'une semaine non publiée à un coureur", async () => {
    const c = await cookie('coureur');
    await creerCoureur(c, { prenom: 'Test', initiale: 'C', programme: 'P3', faitIzon: false });
    const r = await SELF.fetch('https://p.test/api/programme?programme=P3', { headers: entetes(c) });
    const donnees = await r.json();
    const futures = donnees.semaines.filter((s) => !s.publiee);
    expect(futures.length).toBeGreaterThan(0);
    for (const s of futures) {
      expect(s.seances).toBeUndefined();
      expect(s.intention).toBeUndefined();
      expect(s.titre).toBeUndefined();
      expect(Object.keys(s).sort()).toEqual(['disponibleLe', 'numero', 'phase', 'publiee']);
    }
    // Aucune fuite dans la charge brute.
    const brut = JSON.stringify(donnees);
    expect(brut).not.toMatch(/Sortie longue/);
  });

  it('renvoie tout le contenu à un admin', async () => {
    const c = await cookie('admin');
    const r = await SELF.fetch('https://p.test/api/programme?programme=P3', { headers: entetes(c) });
    const donnees = await r.json();
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
    const r = await SELF.fetch('https://p.test/api/semaine?programme=P2&numero=9&izon=1', {
      headers: entetes(c),
    });
    expect([200, 403]).toContain(r.status);
    const donnees = await r.json();
    if (r.status === 403) {
      expect(donnees.semaine).toBeUndefined();
      expect(JSON.stringify(donnees)).not.toMatch(/Izon/i);
    } else {
      expect(estPubliee(9)).toBe(true);
    }
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
    const maintenant = Date.now();
    const publies = new Set();
    const confidentiels = new Set();

    for (const code of CODES_PROGRAMMES) {
      for (const s of PROGRAMMES[code].semainesContenu) {
        for (const faitIzon of [false, true]) {
          const resolue = semaineDuProgramme(code, s.numero, { faitIzon });
          const textes = [
            resolue.titre,
            resolue.intention,
            ...resolue.seances.flatMap((x) => [x.description, x.objectif]),
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
      const r = await SELF.fetch(`https://p.test${chemin}`, { headers: entetes(c) });
      const brut = await r.text();
      for (const texte of confidentiels) {
        if (brut.includes(texte)) fuites.push(`${chemin} : ${texte.slice(0, 60)}`);
      }
    }
    expect(fuites).toEqual([]);
  });

  it('aucun message d\'erreur ne cite un titre ou une séance à venir', async () => {
    const c = await cookie('coureur');
    const titres = new Set();
    for (const code of CODES_PROGRAMMES) {
      for (const s of PROGRAMMES[code].semainesContenu) {
        if (!estPubliee(s.numero)) titres.add(s.titre);
      }
    }
    for (const chemin of [
      '/api/programme?programme=P42',
      '/api/semaine?programme=P42&numero=1',
      '/api/semaine?programme=P3&numero=abc',
      '/api/semaine?programme=P3&numero=999',
      '/api/semaine?programme=P3&numero=1',
    ]) {
      const brut = await (await SELF.fetch(`https://p.test${chemin}`, { headers: entetes(c) })).text();
      for (const titre of titres) expect(brut).not.toContain(titre);
    }
  });
});
