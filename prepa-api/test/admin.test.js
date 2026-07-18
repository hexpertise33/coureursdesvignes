// Back-office de l'encadrant : tableau d'assiduité, alertes, édition et veto
// d'une semaine, fusion et effacement d'un coureur.
//
// Deux exigences structurent cette suite.
//
//   1. Horloge fixée. Les alertes se calculent sur « la dernière semaine
//      publiée » et le veto se mesure contre une date de parution : joués à
//      la date du jour, ces tests ne prouveraient rien (en juillet 2026 rien
//      n'est paru, en décembre tout l'est). Tout ce qui dépend de la date
//      passe donc par les instants de test/horloge.js.
//   2. Fermeture route par route. Une seule assertion « le coureur n'a pas
//      accès au back-office » ne couvre pas la route ajoutée demain : chaque
//      route admin est donc éprouvée individuellement, sous les trois rôles
//      possibles (anonyme, coureur, encadrant).

import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

import { creerOuTrouver } from '../src/coureurs.js';
import { valider } from '../src/validations.js';
import { instantPublication } from '../src/calendrier.js';
import { PROGRAMMES, semaineDuProgramme } from '../src/programmes/index.js';
import {
  tableau,
  alertes,
  fusionner,
  supprimerCoureur,
  enregistrerOverride,
  poserVeto,
  overrides,
  contenuSurcharge,
} from '../src/admin.js';
import { requeteA, jsonA, AVANT_TOUT, MI_PARCOURS } from './horloge.js';

// Aucun code d'accès réel ici : ce sont les valeurs factices de vitest.config.js.
const CADRATIN = '—';

/** Compteur de prénoms, pour que deux tests ne se disputent jamais une fiche. */
let compteur = 0;
function prenomUnique(base) {
  compteur += 1;
  return `${base}${compteur}`;
}

async function coureur(base, programme = 'P1') {
  return creerOuTrouver(env.DB, { prenom: prenomUnique(base), initiale: 'T', programme });
}

/**
 * Codes de séance distincts d'une semaine réelle du programme.
 *
 * Le dédoublonnage n'est pas cosmétique. Cinquante-sept des cent cinquante
 * semaines résolues du corpus portent deux séances de même code (deux
 * endurances fondamentales, toutes deux « EF »), alors que la table des
 * validations impose UNIQUE(coureur_id, semaine, seance) : la seconde
 * validation écrase silencieusement la première. Une boucle sur les codes
 * bruts croirait donc écrire trois lignes et n'en écrirait que deux, et un
 * test de majorité de ressentis se retrouverait à mesurer autre chose que ce
 * qu'il annonce. Ce défaut est antérieur à cette tâche et lui survit : il est
 * décrit dans le rapport, il se corrige par une migration qui donne une
 * identité propre à chaque séance de la semaine.
 */
function codesSeances(programme, numero) {
  const codes = semaineDuProgramme(programme, numero, { faitIzon: false }).seances.map((s) => s.code);
  return [...new Set(codes)];
}

/** Un contenu de semaine bien formé, tel que l'encadrant en saisirait un. */
function contenuValide(marqueur) {
  return {
    titre: `Semaine remaniee ${marqueur}`,
    intention: `Alleger la charge, ${marqueur}.`,
    seances: [
      {
        code: 'EF',
        titre: 'Endurance fondamentale',
        duree: 40,
        zone: 'Z2',
        description: `40 min en Z2, tranquille, ${marqueur}.`,
        objectif: 'Recuperer sans perdre le rythme.',
      },
      {
        code: 'RENFO',
        titre: 'Renforcement',
        duree: 20,
        zone: null,
        description: 'Gainage et fentes, 20 min.',
        objectif: 'Entretenir la solidite.',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tableau d'assiduité
// ---------------------------------------------------------------------------

describe('tableau d\'assiduité', () => {
  it('restitue les validations semaine par semaine, coureur par coureur', async () => {
    const c = await coureur('Assidu');
    const [premiere, seconde] = codesSeances('P1', 1);
    await valider(env.DB, c.id, { semaine: 1, seance: premiere, ressenti: 'ok', note: 'RAS' });
    await valider(env.DB, c.id, { semaine: 2, seance: seconde, ressenti: 'facile' });

    const { coureurs } = await tableau(env.DB);
    const ligne = coureurs.find((x) => x.id === c.id);
    expect(ligne.nomAffiche).toBe(`${c.prenom} T.`);
    expect(ligne.programme).toBe('P1');
    expect(ligne.validations).toHaveLength(2);
    expect(ligne.validations[0]).toEqual({
      semaine: 1, seance: premiere, ressenti: 'ok', note: 'RAS', valideLe: expect.any(String),
    });
  });

  it("n'expose aucune colonne interne de la base", async () => {
    const c = await coureur('Discret');
    await valider(env.DB, c.id, { semaine: 1, seance: codesSeances('P1', 1)[0], ressenti: 'ok' });

    const { coureurs } = await tableau(env.DB);
    const ligne = coureurs.find((x) => x.id === c.id);
    expect(Object.keys(ligne).sort()).toEqual(
      ['faitIzon', 'id', 'initiale', 'nomAffiche', 'prenom', 'programme', 'validations', 'varianteCourse'].sort(),
    );
    const brut = JSON.stringify(coureurs);
    expect(brut).not.toMatch(/"cle"/);
    expect(brut).not.toMatch(/cree_le/);
    expect(brut).not.toMatch(/fait_izon/);
    expect(brut).not.toMatch(/coureur_id/);
    expect(brut).not.toMatch(/valide_le/);
  });
});

// ---------------------------------------------------------------------------
// Alertes
// ---------------------------------------------------------------------------

describe('alertes', () => {
  it("signale un coureur qui n'a validé aucune séance de la dernière semaine publiée", async () => {
    const c = await coureur('Absent');
    const liste = await alertes(env.DB, 2);
    const sienne = liste.filter((a) => a.coureurId === c.id);
    expect(sienne).toHaveLength(1);
    expect(sienne[0].type).toBe('absence');
    expect(sienne[0].detail).toContain('2');
  });

  it('signale un coureur majoritairement en difficulté deux semaines de suite', async () => {
    const c = await coureur('Cuit');
    for (const semaine of [1, 2]) {
      for (const seance of codesSeances('P1', semaine)) {
        await valider(env.DB, c.id, { semaine, seance, ressenti: 'difficile' });
      }
    }
    const liste = await alertes(env.DB, 2);
    const sienne = liste.filter((a) => a.coureurId === c.id);
    expect(sienne).toHaveLength(1);
    expect(sienne[0].type).toBe('difficulte');
    expect(sienne[0].detail).toMatch(/allég/i);
  });

  it("ne signale pas un coureur assidu et à l'aise", async () => {
    const c = await coureur('Serein');
    for (const semaine of [1, 2]) {
      for (const seance of codesSeances('P1', semaine)) {
        await valider(env.DB, c.id, { semaine, seance, ressenti: 'ok' });
      }
    }
    const liste = await alertes(env.DB, 2);
    expect(liste.some((a) => a.coureurId === c.id)).toBe(false);
  });

  it('ne signale pas une seule semaine difficile isolée', async () => {
    const c = await coureur('Ponctuel');
    for (const seance of codesSeances('P1', 1)) {
      await valider(env.DB, c.id, { semaine: 1, seance, ressenti: 'ok' });
    }
    for (const seance of codesSeances('P1', 2)) {
      await valider(env.DB, c.id, { semaine: 2, seance, ressenti: 'difficile' });
    }
    const liste = await alertes(env.DB, 2);
    expect(liste.some((a) => a.coureurId === c.id)).toBe(false);
  });

  it("ne prend pas une minorité de séances difficiles pour une majorité", async () => {
    const c = await coureur('Limite');
    for (const semaine of [1, 2]) {
      const [a, b, d] = codesSeances('P1', semaine);
      await valider(env.DB, c.id, { semaine, seance: a, ressenti: 'difficile' });
      await valider(env.DB, c.id, { semaine, seance: b, ressenti: 'ok' });
      await valider(env.DB, c.id, { semaine, seance: d, ressenti: 'facile' });
    }
    const liste = await alertes(env.DB, 2);
    expect(liste.some((a) => a.coureurId === c.id)).toBe(false);
  });

  it('borne la semaine de référence à la longueur du programme du coureur', async () => {
    // P1 ne compte que 10 semaines. Interrogé sur la semaine 17 (longueur de
    // P5), un coureur de P1 ne doit pas être signalé absent d'une semaine
    // qui n'existe pas chez lui : c'est sa semaine 10 qui fait foi.
    const nbP1 = PROGRAMMES.P1.semainesContenu.length;
    expect(nbP1).toBeLessThan(17);
    const c = await coureur('Court', 'P1');
    for (const seance of codesSeances('P1', nbP1)) {
      await valider(env.DB, c.id, { semaine: nbP1, seance, ressenti: 'ok' });
    }
    const liste = await alertes(env.DB, 17);
    expect(liste.some((a) => a.coureurId === c.id)).toBe(false);
  });

  it('ne signale rien avant la première semaine publiée', async () => {
    await coureur('Precoce');
    expect(await alertes(env.DB, 0)).toEqual([]);
    expect(await alertes(env.DB, -1)).toEqual([]);
  });

  it('rédige ses messages en français, sans tiret cadratin', async () => {
    const c = await coureur('Muet');
    const liste = await alertes(env.DB, 2);
    const sienne = liste.find((a) => a.coureurId === c.id);
    expect(sienne.detail).not.toContain(CADRATIN);
  });
});

describe('alertes servies par la route, à horloge fixée', () => {
  it('retient la dernière semaine publiée au moment de la demande', async () => {
    // MI_PARCOURS : les semaines 1 à 8 sont parues, la 9 non. Un coureur qui
    // n'a rien validé en semaine 8 doit remonter, et le détail doit citer 8.
    const c = await coureur('Decroche');
    const { statut, donnees } = await jsonA(MI_PARCOURS, '/api/admin/alertes', { role: 'admin' });
    expect(statut).toBe(200);
    expect(donnees.semaine).toBe(8);
    const sienne = donnees.alertes.find((a) => a.coureurId === c.id);
    expect(sienne.type).toBe('absence');
    expect(sienne.detail).toContain('8');
  });

  it("ne signale personne avant la première parution", async () => {
    await coureur('Attentiste');
    const { statut, donnees } = await jsonA(AVANT_TOUT, '/api/admin/alertes', { role: 'admin' });
    expect(statut).toBe(200);
    expect(donnees.semaine).toBe(0);
    expect(donnees.alertes).toEqual([]);
  });

  it('fait remonter les coureurs à surveiller en tête du tableau', async () => {
    const surveille = await coureur('Zzzabsent');
    const tranquille = await coureur('Aaaassidu');
    for (const seance of codesSeances('P1', 8)) {
      await valider(env.DB, tranquille.id, { semaine: 8, seance, ressenti: 'ok' });
    }
    const { donnees } = await jsonA(MI_PARCOURS, '/api/admin/tableau', { role: 'admin' });
    const rangSurveille = donnees.coureurs.findIndex((x) => x.id === surveille.id);
    const rangTranquille = donnees.coureurs.findIndex((x) => x.id === tranquille.id);
    // Le prénom du coureur à surveiller est pourtant le dernier par ordre
    // alphabétique : seule l'alerte peut le faire passer devant.
    expect(rangSurveille).toBeLessThan(rangTranquille);
    expect(donnees.coureurs[rangSurveille].alertes[0].type).toBe('absence');
    expect(donnees.coureurs[rangTranquille].alertes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Fusion et effacement
// ---------------------------------------------------------------------------

describe('fusion de deux coureurs', () => {
  it('réaffecte les validations et supprime la fiche en double', async () => {
    const garde = await coureur('JeanMichel');
    const double = await coureur('JeanMi');
    const [a, b] = codesSeances('P1', 1);
    await valider(env.DB, garde.id, { semaine: 1, seance: a, ressenti: 'ok' });
    await valider(env.DB, double.id, { semaine: 1, seance: b, ressenti: 'facile' });

    await fusionner(env.DB, garde.id, double.id);

    const restant = await env.DB.prepare('SELECT * FROM coureurs WHERE id = ?').bind(double.id).first();
    expect(restant).toBeNull();
    const v = await env.DB.prepare('SELECT seance FROM validations WHERE coureur_id = ? ORDER BY seance')
      .bind(garde.id).all();
    expect(v.results.map((x) => x.seance).sort()).toEqual([a, b].sort());
  });

  // Les horodatages sont posés explicitement en base plutôt que fabriqués en
  // décalant l'horloge. commeSi() ne remplace que Date.now, or valider()
  // écrit `new Date().toISOString()`, qui lit l'horloge système sans passer
  // par Date.now : les deux validations retomberaient sur la même
  // milliseconde et l'arbitrage testé serait celui de l'égalité, pas celui
  // de l'antériorité. Poser les dates à la main est à la fois honnête et
  // déterministe.
  async function horodater(coureurId, quand) {
    await env.DB.prepare('UPDATE validations SET valide_le = ? WHERE coureur_id = ?')
      .bind(quand, coureurId).run();
  }

  it('en cas de doublon sur la même séance, garde la validation la plus récente', async () => {
    // Décision : la fusion recolle deux orthographes d'une seule personne.
    // Quand les deux fiches portent la même séance, il n'y a pas deux
    // séances mais deux saisies successives de la même. On applique donc la
    // règle déjà en vigueur dans valider() : la dernière saisie remplace la
    // précédente, ressenti et note compris, et elles voyagent ensemble.
    const garde = await coureur('Ancien');
    const double = await coureur('Recent');
    const seance = codesSeances('P1', 1)[0];

    await valider(env.DB, garde.id, { semaine: 1, seance, ressenti: 'facile', note: 'saisie ancienne' });
    await valider(env.DB, double.id, { semaine: 1, seance, ressenti: 'difficile', note: 'saisie recente' });
    await horodater(garde.id, '2026-09-01T10:00:00.000Z');
    await horodater(double.id, '2026-09-02T10:00:00.000Z');

    await fusionner(env.DB, garde.id, double.id);

    const lignes = await env.DB.prepare('SELECT ressenti, note FROM validations WHERE coureur_id = ?')
      .bind(garde.id).all();
    expect(lignes.results).toHaveLength(1);
    expect(lignes.results[0].ressenti).toBe('difficile');
    expect(lignes.results[0].note).toBe('saisie recente');
  });

  it("conserve la saisie du coureur gardé si c'est elle la plus récente", async () => {
    const garde = await coureur('Frais');
    const double = await coureur('Perime');
    const seance = codesSeances('P1', 1)[0];

    await valider(env.DB, double.id, { semaine: 1, seance, ressenti: 'facile', note: 'vieille saisie' });
    await valider(env.DB, garde.id, { semaine: 1, seance, ressenti: 'difficile', note: 'saisie gardee' });
    await horodater(double.id, '2026-09-01T10:00:00.000Z');
    await horodater(garde.id, '2026-09-02T10:00:00.000Z');

    await fusionner(env.DB, garde.id, double.id);

    const lignes = await env.DB.prepare('SELECT ressenti, note FROM validations WHERE coureur_id = ?')
      .bind(garde.id).all();
    expect(lignes.results).toHaveLength(1);
    expect(lignes.results[0].note).toBe('saisie gardee');
  });

  it('départage de façon déterministe deux saisies au même horodatage', async () => {
    // Deux validations à la milliseconde près ne sont pas une hypothèse
    // d'école : valider() horodate avec new Date(), et deux appels enchaînés
    // tombent couramment sur la même milliseconde. La fiche conservée
    // l'emporte, faute de quoi le résultat dépendrait de l'ordre de
    // parcours de la base.
    const garde = await coureur('Exaequoa');
    const double = await coureur('Exaequob');
    const seance = codesSeances('P1', 1)[0];

    await valider(env.DB, garde.id, { semaine: 1, seance, ressenti: 'ok', note: 'fiche gardee' });
    await valider(env.DB, double.id, { semaine: 1, seance, ressenti: 'difficile', note: 'fiche absorbee' });
    await horodater(garde.id, '2026-09-01T10:00:00.000Z');
    await horodater(double.id, '2026-09-01T10:00:00.000Z');

    await fusionner(env.DB, garde.id, double.id);

    const lignes = await env.DB.prepare('SELECT note FROM validations WHERE coureur_id = ?')
      .bind(garde.id).all();
    expect(lignes.results).toHaveLength(1);
    expect(lignes.results[0].note).toBe('fiche gardee');
  });

  it('ne laisse aucune validation orpheline derrière elle', async () => {
    const garde = await coureur('Proprea');
    const double = await coureur('Propreb');
    for (const seance of codesSeances('P1', 1)) {
      await valider(env.DB, garde.id, { semaine: 1, seance, ressenti: 'ok' });
      await valider(env.DB, double.id, { semaine: 1, seance, ressenti: 'difficile' });
    }
    await fusionner(env.DB, garde.id, double.id);

    const orphelines = await env.DB.prepare('SELECT COUNT(*) AS n FROM validations WHERE coureur_id = ?')
      .bind(double.id).first();
    expect(orphelines.n).toBe(0);
  });

  it('refuse de fusionner un coureur avec lui-même', async () => {
    const c = await coureur('Solitaire');
    await expect(fusionner(env.DB, c.id, c.id)).rejects.toThrow(/lui-même/);
    const encore = await env.DB.prepare('SELECT id FROM coureurs WHERE id = ?').bind(c.id).first();
    expect(encore).not.toBeNull();
  });

  it('refuse un identifiant inconnu ou mal formé', async () => {
    const c = await coureur('Seul');
    await expect(fusionner(env.DB, c.id, 999999)).rejects.toThrow();
    await expect(fusionner(env.DB, c.id, 0)).rejects.toThrow();
    await expect(fusionner(env.DB, c.id, 'abc')).rejects.toThrow();
  });
});

describe('effacement d\'un coureur', () => {
  it('efface la fiche et toutes ses validations', async () => {
    const c = await coureur('Efface');
    for (const seance of codesSeances('P1', 1)) {
      await valider(env.DB, c.id, { semaine: 1, seance, ressenti: 'ok' });
    }
    await supprimerCoureur(env.DB, c.id);

    expect(await env.DB.prepare('SELECT id FROM coureurs WHERE id = ?').bind(c.id).first()).toBeNull();
    const restantes = await env.DB.prepare('SELECT COUNT(*) AS n FROM validations WHERE coureur_id = ?')
      .bind(c.id).first();
    expect(restantes.n).toBe(0);
  });

  it('refuse un identifiant inconnu ou mal formé', async () => {
    await expect(supprimerCoureur(env.DB, 999999)).rejects.toThrow();
    await expect(supprimerCoureur(env.DB, -1)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Édition d'une semaine
// ---------------------------------------------------------------------------

describe('édition d\'une semaine depuis le back-office', () => {
  it('prime sur le fichier source, sur /api/programme comme sur /api/semaine', async () => {
    const contenu = contenuValide('primaute');
    await enregistrerOverride(env.DB, 'P1', 1, contenu, false);
    const source = semaineDuProgramme('P1', 1, { faitIzon: false });

    const parSemaine = await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=1', { role: 'coureur' });
    expect(parSemaine.statut).toBe(200);
    expect(parSemaine.donnees.semaine.titre).toBe(contenu.titre);
    expect(parSemaine.donnees.semaine.intention).toBe(contenu.intention);
    expect(parSemaine.donnees.semaine.seances).toHaveLength(2);
    expect(JSON.stringify(parSemaine.donnees)).not.toContain(source.titre);

    const parProgramme = await jsonA(MI_PARCOURS, '/api/programme?programme=P1', { role: 'coureur' });
    const semaine1 = parProgramme.donnees.semaines.find((s) => s.numero === 1);
    expect(semaine1.titre).toBe(contenu.titre);
    expect(JSON.stringify(semaine1)).not.toContain(source.titre);
  });

  it('les séances modifiées sont celles que /api/validation accepte', async () => {
    await enregistrerOverride(env.DB, 'P1', 1, contenuValide('validation'), false);
    const c = await coureur('Modifie');
    const ancienCode = codesSeances('P1', 1).find((code) => code !== 'EF' && code !== 'RENFO');
    expect(ancienCode).toBeTruthy();

    const accepte = await jsonA(MI_PARCOURS, '/api/validation', {
      role: 'coureur', method: 'POST',
      body: JSON.stringify({ prenom: c.prenom, initiale: 'T', semaine: 1, seance: 'EF', ressenti: 'ok' }),
    });
    expect(accepte.statut).toBe(200);

    const refuse = await jsonA(MI_PARCOURS, '/api/validation', {
      role: 'coureur', method: 'POST',
      body: JSON.stringify({ prenom: c.prenom, initiale: 'T', semaine: 1, seance: ancienCode }),
    });
    expect(refuse.statut).toBe(400);
  });

  it('ne divulgue pas une semaine modifiée mais non encore parue', async () => {
    const contenu = contenuValide('confidentiel');
    await enregistrerOverride(env.DB, 'P1', 10, contenu, false);
    const { statut, donnees } = await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=10', {
      role: 'coureur',
    });
    expect(statut).toBe(403);
    expect(JSON.stringify(donnees)).not.toContain(contenu.titre);
  });

  it('efface la modification et revient au fichier source quand le contenu est vidé', async () => {
    const contenu = contenuValide('effacable');
    await enregistrerOverride(env.DB, 'P1', 1, contenu, false);
    const modifiee = await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=1', { role: 'coureur' });
    expect(modifiee.donnees.semaine.titre).toBe(contenu.titre);

    await enregistrerOverride(env.DB, 'P1', 1, null, false);
    const revenue = await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=1', { role: 'coureur' });
    expect(revenue.donnees.semaine.titre).toBe(semaineDuProgramme('P1', 1, { faitIzon: false }).titre);
  });

  it('refuse un contenu malformé et n\'écrit rien', async () => {
    const malformes = [
      'du texte',
      [],
      { titre: 'Sans intention', seances: [] },
      { titre: '', intention: 'vide', seances: [{ code: 'EF' }] },
      { titre: 'T', intention: 'I', seances: 'pas un tableau' },
      { titre: 'T', intention: 'I', seances: [{ code: 'EF', titre: 'x', duree: 0, description: 'd', objectif: 'o' }] },
      { titre: 'T', intention: 'I', seances: [{ code: 'EF', titre: 'x', duree: 30, zone: 'Z9', description: 'd', objectif: 'o' }] },
    ];
    for (const contenu of malformes) {
      await expect(enregistrerOverride(env.DB, 'P1', 3, contenu, false)).rejects.toThrow();
    }
    const carte = await overrides(env.DB);
    expect(carte.get('P1:3')).toBeUndefined();
  });

  it('refuse le tiret cadratin dans un texte saisi par l\'encadrant', async () => {
    const contenu = contenuValide('cadratin');
    contenu.intention = `Alleger la charge ${CADRATIN} beaucoup.`;
    await expect(enregistrerOverride(env.DB, 'P1', 4, contenu, false)).rejects.toThrow(/cadratin/i);
  });

  it('refuse un programme ou une semaine hors bornes', async () => {
    const contenu = contenuValide('bornes');
    await expect(enregistrerOverride(env.DB, 'P9', 1, contenu, false)).rejects.toThrow();
    await expect(enregistrerOverride(env.DB, '__proto__', 1, contenu, false)).rejects.toThrow();
    await expect(enregistrerOverride(env.DB, 'P1', 0, contenu, false)).rejects.toThrow();
    await expect(enregistrerOverride(env.DB, 'P1', 999, contenu, false)).rejects.toThrow();
  });

  it('ne recopie que les champs autorisés du contenu saisi', async () => {
    const contenu = contenuValide('listeblanche');
    contenu.secret = 'ne doit jamais ressortir';
    contenu.seances[0].secret = 'non plus';
    await enregistrerOverride(env.DB, 'P1', 1, contenu, false);

    const ligne = await env.DB.prepare('SELECT contenu_json FROM semaines_override WHERE programme = ? AND semaine = ?')
      .bind('P1', 1).first();
    expect(ligne.contenu_json).not.toContain('ne doit jamais ressortir');
    expect(ligne.contenu_json).not.toContain('non plus');

    const { donnees } = await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=1', { role: 'coureur' });
    expect(JSON.stringify(donnees)).not.toContain('ne doit jamais ressortir');
  });

  it('retombe sur le fichier source si le contenu stocké est illisible', async () => {
    // Écriture directe en base, en contournant la validation : c'est le seul
    // chemin par lequel un contenu cassé peut exister. Le coureur doit alors
    // voir la semaine d'origine, jamais une réponse en erreur ni une semaine
    // vide de séances.
    await env.DB.prepare(
      `INSERT INTO semaines_override (programme, semaine, contenu_json, veto, modifie_le)
       VALUES ('P2', 1, '{ceci n''est pas du json', 0, '2026-08-01')`,
    ).run();
    expect(contenuSurcharge({ contenu_json: '{ceci nest pas du json' })).toBeNull();

    const source = semaineDuProgramme('P2', 1, { faitIzon: false });
    const { statut, donnees } = await jsonA(MI_PARCOURS, '/api/semaine?programme=P2&numero=1', {
      role: 'coureur',
    });
    expect(statut).toBe(200);
    expect(donnees.semaine.titre).toBe(source.titre);
    expect(donnees.semaine.seances).toHaveLength(source.seances.length);
  });

  it('retombe aussi sur la source si le contenu stocké est bien du JSON mais mal formé', async () => {
    await env.DB.prepare(
      `INSERT INTO semaines_override (programme, semaine, contenu_json, veto, modifie_le)
       VALUES ('P2', 2, '{"titre":"","seances":42}', 0, '2026-08-01')`,
    ).run();
    const source = semaineDuProgramme('P2', 2, { faitIzon: false });
    const { statut, donnees } = await jsonA(MI_PARCOURS, '/api/semaine?programme=P2&numero=2', {
      role: 'coureur',
    });
    expect(statut).toBe(200);
    expect(donnees.semaine.titre).toBe(source.titre);
  });
});

// ---------------------------------------------------------------------------
// Veto de publication
// ---------------------------------------------------------------------------

describe('veto de publication', () => {
  // Le coeur du sujet : la semaine 1 est parue depuis longtemps à
  // MI_PARCOURS. Le veto doit malgré tout la refermer, partout.
  const CHEMINS_DE_CONTENU = [
    '/api/programme?programme=P1',
    '/api/semaine?programme=P1&numero=1',
    '/api/semaine?programme=P1', // sans numéro : la semaine en cours
  ];

  it("aucune route ne sert à un coureur une semaine vetoée dont la date est pourtant passée", async () => {
    expect(instantPublication(1)).toBeLessThan(MI_PARCOURS);
    await poserVeto(env.DB, 'P1', 1, true);
    const source = semaineDuProgramme('P1', 1, { faitIzon: false });

    const fuites = [];
    for (const chemin of CHEMINS_DE_CONTENU) {
      const r = await requeteA(MI_PARCOURS, chemin, { role: 'coureur' });
      const brut = await r.text();
      if (brut.includes(source.titre)) fuites.push(`${chemin} : titre`);
      if (brut.includes(source.intention)) fuites.push(`${chemin} : intention`);
      for (const s of source.seances) {
        if (brut.includes(s.description)) fuites.push(`${chemin} : ${s.code}`);
      }
    }
    expect(fuites).toEqual([]);
  });

  it('/api/programme annonce la semaine vetoée comme non publiée', async () => {
    await poserVeto(env.DB, 'P1', 1, true);
    const { donnees } = await jsonA(MI_PARCOURS, '/api/programme?programme=P1', { role: 'coureur' });
    const semaine1 = donnees.semaines.find((s) => s.numero === 1);
    expect(semaine1.publiee).toBe(false);
    expect(semaine1.titre).toBeUndefined();
    expect(semaine1.seances).toBeUndefined();
    // Le coureur n'a pas à savoir qu'une décision a été prise : pour lui,
    // une semaine bloquée a exactement la forme d'une semaine non parue.
    expect(Object.keys(semaine1).sort()).toEqual(['disponibleLe', 'numero', 'phase', 'publiee']);
  });

  it('/api/semaine refuse la semaine vetoée sans se distinguer d\'une semaine non parue', async () => {
    await poserVeto(env.DB, 'P1', 1, true);
    const vetoee = await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=1', { role: 'coureur' });
    const aVenir = await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=10', { role: 'coureur' });
    expect(vetoee.statut).toBe(403);
    expect(Object.keys(vetoee.donnees).sort()).toEqual(Object.keys(aVenir.donnees).sort());
    expect(vetoee.donnees.erreur).toBe(aVenir.donnees.erreur);
    expect(vetoee.donnees.erreur).not.toContain(CADRATIN);
  });

  it('/api/validation refuse de valider une séance d\'une semaine vetoée', async () => {
    const c = await coureur('Bloque');
    const seance = codesSeances('P1', 1)[0];
    await poserVeto(env.DB, 'P1', 1, true);

    const { statut, donnees } = await jsonA(MI_PARCOURS, '/api/validation', {
      role: 'coureur', method: 'POST',
      body: JSON.stringify({ prenom: c.prenom, initiale: 'T', semaine: 1, seance, ressenti: 'ok' }),
    });
    expect(statut).toBe(403);
    expect(Object.keys(donnees).sort()).toEqual(['disponibleLe', 'erreur', 'numero']);
    const lignes = await env.DB.prepare('SELECT * FROM validations WHERE coureur_id = ?').bind(c.id).all();
    expect(lignes.results).toHaveLength(0);
  });

  it('ne déborde pas sur les autres semaines ni sur les autres programmes', async () => {
    await poserVeto(env.DB, 'P1', 1, true);
    const sur2 = await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=2', { role: 'coureur' });
    expect(sur2.statut).toBe(200);
    const surP2 = await jsonA(MI_PARCOURS, '/api/semaine?programme=P2&numero=1', { role: 'coureur' });
    expect(surP2.statut).toBe(200);
  });

  it("l'encadrant continue de tout voir, et sait que la semaine est bloquée", async () => {
    await poserVeto(env.DB, 'P1', 1, true);
    const source = semaineDuProgramme('P1', 1, { faitIzon: false });
    const { statut, donnees } = await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=1', {
      role: 'admin',
    });
    expect(statut).toBe(200);
    expect(donnees.semaine.titre).toBe(source.titre);
    expect(donnees.semaine.publiee).toBe(false);
    expect(donnees.semaine.veto).toBe(true);
  });

  it('lever le veto rouvre la semaine', async () => {
    await poserVeto(env.DB, 'P1', 1, true);
    expect((await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=1', { role: 'coureur' })).statut).toBe(403);
    await poserVeto(env.DB, 'P1', 1, false);
    const rouverte = await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=1', { role: 'coureur' });
    expect(rouverte.statut).toBe(200);
    expect(rouverte.donnees.semaine.titre).toBe(semaineDuProgramme('P1', 1, { faitIzon: false }).titre);
  });

  it('poser un veto ne détruit pas la semaine déjà modifiée', async () => {
    // Un veto est une décision de publication, pas une remise à zéro du
    // travail d'édition : le contenu remanié doit survivre au blocage et
    // reparaître tel quel une fois le veto levé.
    const contenu = contenuValide('survie');
    await enregistrerOverride(env.DB, 'P1', 1, contenu, false);
    await poserVeto(env.DB, 'P1', 1, true);
    await poserVeto(env.DB, 'P1', 1, false);

    const { donnees } = await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=1', { role: 'coureur' });
    expect(donnees.semaine.titre).toBe(contenu.titre);
  });

  it('éditer une semaine bloquée ne la publie pas par mégarde', async () => {
    await poserVeto(env.DB, 'P1', 1, true);
    await enregistrerOverride(env.DB, 'P1', 1, contenuValide('edition'), undefined);
    const { statut } = await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=1', { role: 'coureur' });
    expect(statut).toBe(403);
  });

  it('abaisse la semaine courante annoncée quand la dernière parue est bloquée', async () => {
    await poserVeto(env.DB, 'P1', 8, true);
    const { donnees } = await jsonA(MI_PARCOURS, '/api/programme?programme=P1', { role: 'coureur' });
    expect(donnees.semaineCourante).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// Routes du back-office : forme et fermeture
// ---------------------------------------------------------------------------

// Chaque route admin, avec la méthode qu'elle attend et un corps recevable.
// La liste sert à la fois aux tests de fermeture et aux tests de méthode :
// une route ajoutée ici est automatiquement éprouvée sous les trois rôles.
const ROUTES_ADMIN = [
  { chemin: '/api/admin/tableau', method: 'GET' },
  { chemin: '/api/admin/alertes', method: 'GET' },
  { chemin: '/api/admin/semaine', method: 'PUT', corps: () => ({ programme: 'P1', semaine: 2, contenu: contenuValide('route') }) },
  { chemin: '/api/admin/veto', method: 'POST', corps: () => ({ programme: 'P1', semaine: 2, veto: true }) },
  { chemin: '/api/admin/fusion', method: 'POST', corps: (ids) => ({ garde: ids.garde, supprime: ids.supprime }) },
  { chemin: '/api/admin/coureur', method: 'DELETE', corps: (ids) => ({ id: ids.supprime }) },
];

async function deuxCoureurs() {
  const garde = await coureur('Routea');
  const supprime = await coureur('Routeb');
  return { garde: garde.id, supprime: supprime.id };
}

describe('fermeture du back-office', () => {
  for (const { chemin, method, corps } of ROUTES_ADMIN) {
    it(`${method} ${chemin} est refusée à un coureur`, async () => {
      const ids = await deuxCoureurs();
      const body = corps ? JSON.stringify(corps(ids)) : undefined;
      const { statut, donnees } = await jsonA(MI_PARCOURS, chemin, { role: 'coureur', method, body });
      expect(statut).toBe(403);
      expect(Object.keys(donnees)).toEqual(['erreur']);
      expect(donnees.erreur).not.toContain(CADRATIN);
      // Aucun effet de bord : ni fusion, ni effacement, ni écriture.
      expect(await env.DB.prepare('SELECT id FROM coureurs WHERE id = ?').bind(ids.supprime).first()).not.toBeNull();
      expect((await overrides(env.DB)).get('P1:2')).toBeUndefined();
    });

    it(`${method} ${chemin} est refusée sans session`, async () => {
      const ids = await deuxCoureurs();
      const body = corps ? JSON.stringify(corps(ids)) : undefined;
      const r = await requeteA(MI_PARCOURS, chemin, { method, body });
      expect(r.status).toBe(401);
      expect(await env.DB.prepare('SELECT id FROM coureurs WHERE id = ?').bind(ids.supprime).first()).not.toBeNull();
    });

    it(`${method} ${chemin} est ouverte à l'encadrant`, async () => {
      const ids = await deuxCoureurs();
      const body = corps ? JSON.stringify(corps(ids)) : undefined;
      const r = await requeteA(MI_PARCOURS, chemin, { role: 'admin', method, body });
      expect(r.status).toBe(200);
    });

    it(`${method} ${chemin} n'accepte pas une autre méthode`, async () => {
      const autre = method === 'GET' ? 'POST' : 'GET';
      const r = await requeteA(MI_PARCOURS, chemin, { role: 'admin', method: autre });
      expect(r.status).toBe(405);
    });

    it(`${chemin} porte les en-têtes privés`, async () => {
      const ids = await deuxCoureurs();
      const body = corps ? JSON.stringify(corps(ids)) : undefined;
      const r = await requeteA(MI_PARCOURS, chemin, { role: 'admin', method, body });
      expect(r.headers.get('cache-control')).toBe('no-store');
      expect(r.headers.get('vary')).toBe('Cookie');
    });
  }

  it('une route admin inexistante répond 404, avec ou sans session', async () => {
    for (const role of [null, 'coureur', 'admin']) {
      const options = role ? { role } : {};
      const r = await requeteA(MI_PARCOURS, '/api/admin/nimporte-quoi', options);
      expect(r.status).toBe(404);
    }
  });

  it('HEAD est accepté là où GET l\'est', async () => {
    const parGet = await requeteA(MI_PARCOURS, '/api/admin/tableau', { role: 'admin' });
    const parHead = await requeteA(MI_PARCOURS, '/api/admin/tableau', { role: 'admin', method: 'HEAD' });
    expect(parHead.status).toBe(parGet.status);
    expect(await parHead.text()).toBe('');
  });

  it('HEAD reste refusé au coureur sur une route admin', async () => {
    const r = await requeteA(MI_PARCOURS, '/api/admin/tableau', { role: 'coureur', method: 'HEAD' });
    expect(r.status).toBe(403);
  });
});

describe('routes du back-office : effets', () => {
  it('PUT /api/admin/semaine enregistre le contenu et le sert au coureur', async () => {
    const contenu = contenuValide('parlaroute');
    const { statut } = await jsonA(MI_PARCOURS, '/api/admin/semaine', {
      role: 'admin', method: 'PUT',
      body: JSON.stringify({ programme: 'P1', semaine: 1, contenu }),
    });
    expect(statut).toBe(200);
    const { donnees } = await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=1', { role: 'coureur' });
    expect(donnees.semaine.titre).toBe(contenu.titre);
  });

  it('PUT /api/admin/semaine refuse un contenu malformé en 400', async () => {
    const { statut, donnees } = await jsonA(MI_PARCOURS, '/api/admin/semaine', {
      role: 'admin', method: 'PUT',
      body: JSON.stringify({ programme: 'P1', semaine: 1, contenu: { titre: 'seul' } }),
    });
    expect(statut).toBe(400);
    expect(Object.keys(donnees)).toEqual(['erreur']);
    expect(donnees.erreur).not.toContain(CADRATIN);
  });

  it('POST /api/admin/veto bloque puis débloque la semaine', async () => {
    const bloquer = await jsonA(MI_PARCOURS, '/api/admin/veto', {
      role: 'admin', method: 'POST',
      body: JSON.stringify({ programme: 'P1', semaine: 1, veto: true }),
    });
    expect(bloquer.statut).toBe(200);
    expect((await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=1', { role: 'coureur' })).statut).toBe(403);

    await jsonA(MI_PARCOURS, '/api/admin/veto', {
      role: 'admin', method: 'POST',
      body: JSON.stringify({ programme: 'P1', semaine: 1, veto: false }),
    });
    expect((await jsonA(MI_PARCOURS, '/api/semaine?programme=P1&numero=1', { role: 'coureur' })).statut).toBe(200);
  });

  it('POST /api/admin/fusion recolle deux fiches', async () => {
    const garde = await coureur('Fusiona');
    const double = await coureur('Fusionb');
    await valider(env.DB, double.id, { semaine: 1, seance: codesSeances('P1', 1)[0], ressenti: 'ok' });

    const { statut } = await jsonA(MI_PARCOURS, '/api/admin/fusion', {
      role: 'admin', method: 'POST',
      body: JSON.stringify({ garde: garde.id, supprime: double.id }),
    });
    expect(statut).toBe(200);
    expect(await env.DB.prepare('SELECT id FROM coureurs WHERE id = ?').bind(double.id).first()).toBeNull();
    const v = await env.DB.prepare('SELECT COUNT(*) AS n FROM validations WHERE coureur_id = ?')
      .bind(garde.id).first();
    expect(v.n).toBe(1);
  });

  it('POST /api/admin/fusion refuse une fiche avec elle-même en 400', async () => {
    const c = await coureur('Memefiche');
    const { statut, donnees } = await jsonA(MI_PARCOURS, '/api/admin/fusion', {
      role: 'admin', method: 'POST',
      body: JSON.stringify({ garde: c.id, supprime: c.id }),
    });
    expect(statut).toBe(400);
    expect(Object.keys(donnees)).toEqual(['erreur']);
  });

  it('DELETE /api/admin/coureur efface la fiche et ses validations', async () => {
    const c = await coureur('Oubli');
    await valider(env.DB, c.id, { semaine: 1, seance: codesSeances('P1', 1)[0], ressenti: 'ok' });
    const { statut } = await jsonA(MI_PARCOURS, '/api/admin/coureur', {
      role: 'admin', method: 'DELETE', body: JSON.stringify({ id: c.id }),
    });
    expect(statut).toBe(200);
    expect(await env.DB.prepare('SELECT id FROM coureurs WHERE id = ?').bind(c.id).first()).toBeNull();
    const v = await env.DB.prepare('SELECT COUNT(*) AS n FROM validations WHERE coureur_id = ?')
      .bind(c.id).first();
    expect(v.n).toBe(0);
  });

  it('GET /api/admin/tableau ne laisse filtrer aucune colonne interne', async () => {
    const c = await coureur('Colonne');
    await valider(env.DB, c.id, { semaine: 1, seance: codesSeances('P1', 1)[0], ressenti: 'ok' });
    const r = await requeteA(MI_PARCOURS, '/api/admin/tableau', { role: 'admin' });
    const brut = await r.text();
    expect(brut).not.toMatch(/"cle"/);
    expect(brut).not.toMatch(/cree_le/);
    expect(brut).not.toMatch(/coureur_id/);
    expect(brut).not.toMatch(/contenu_json/);
  });
});
