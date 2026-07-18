import { describe, it, expect } from 'vitest';
import { ZONES, ef, sl, vma, seuil, recup, renfo, course, semaine, volume, volumeHorsCourse, zonesSecondairesDe, identifiantSeance, identifierSeances } from '../src/programmes/seances.js';
import { verifierProgramme } from '../src/programmes/regles.js';
import { P1 } from '../src/programmes/p1-10km-izon.js';
import { P2 } from '../src/programmes/p2-10km-bordeaux.js';
import { P3 } from '../src/programmes/p3-semi-bordeaux.js';
import { P4 } from '../src/programmes/p4-marathon.js';
import { P5 } from '../src/programmes/p5-10km-paris.js';
// P1 à P3 restent importés nommément pour les tests qui leur sont propres. Les
// contrôles transverses, eux, passent par le registre découvert plus bas : les
// imports de modules un par un ont disparu avec lui.

// Registre servi par le Worker (src/programmes/index.js). PROGRAMMES est
// aliasé : ce fichier déclare déjà plus bas sa propre constante PROGRAMMES,
// construite par découverte du dossier pour les contrôles transverses, et les
// deux ne doivent pas entrer en collision de nom.
import {
  PROGRAMMES as REGISTRE_PROGRAMMES,
  programme,
  semaineDuProgramme,
} from '../src/programmes/index.js';

describe('zones', () => {
  it('couvre Z1 à Z5 avec des fourchettes croissantes et jointives', () => {
    const codes = Object.keys(ZONES);
    expect(codes).toEqual(['Z1', 'Z2', 'Z3', 'Z4', 'Z5']);
    expect(ZONES.Z2.fcMin).toBe(ZONES.Z1.fcMax);
    expect(ZONES.Z5.fcMax).toBe(100);
  });
});

describe('fabriques de séances', () => {
  it('construit une endurance fondamentale en Z2', () => {
    const s = ef(40, '40 min de course souple.', "Construire l'endurance de base.");
    expect(s).toEqual({
      code: 'EF',
      titre: 'Endurance fondamentale',
      duree: 40,
      zone: 'Z2',
      description: '40 min de course souple.',
      objectif: "Construire l'endurance de base.",
    });
  });

  it('laisse le renfo hors zones', () => {
    expect(renfo(20, 'Gainage.', 'Renforcer.').zone).toBeNull();
  });

  it("refuse un texte contenant un tiret cadratin", () => {
    expect(() => ef(40, 'Un texte — fautif.', 'Objectif.')).toThrow(/cadratin/i);
  });
});

describe('volume', () => {
  it('somme les durées de course et ignore le renfo', () => {
    const s = semaine(1, 'bloc1', 'Prise de contact', 'Poser les bases.', [
      ef(30, 'a.', 'b.'), ef(35, 'a.', 'b.'), sl(50, 'a.', 'b.'), renfo(20, 'a.', 'b.'),
    ]);
    expect(volume(s)).toBe(115);
  });
});

describe('structure de semaine', () => {
  it('exige exactement 3 séances de course et 1 renfo', () => {
    expect(() => semaine(1, 'bloc1', 't', 'i', [ef(30, 'a.', 'b.'), renfo(20, 'a.', 'b.')]))
      .toThrow(/3 séances de course/);
  });
});

// Tests ajoutés en complément de l'extrait du brief : course() et
// volumeHorsCourse() sont des interfaces requises mais non couvertes par le
// snippet de test fourni. Le brief souligne explicitement le risque de les
// confondre avec volume() ; on verrouille donc leur comportement ici.
describe('course objectif', () => {
  it('construit une séance COURSE avec ses cinq arguments dans l\'ordre', () => {
    const c = course('Marathon de Bordeaux', 42.195, 240, 'Objectif de la saison.', 'Finir en forme.');
    expect(c).toEqual({
      code: 'COURSE',
      titre: 'Marathon de Bordeaux',
      distance: 42.195,
      duree: 240,
      zone: null,
      description: 'Objectif de la saison.',
      objectif: 'Finir en forme.',
    });
  });

  it('refuse un nom de course contenant un tiret cadratin', () => {
    expect(() => course('10 km — édition 2026', 10, 55, 'a.', 'b.')).toThrow(/cadratin/i);
  });
});

describe('volumeHorsCourse', () => {
  it('exclut le renfo et la course objectif, contrairement à volume()', () => {
    const s = semaine(4, 'bloc2', 'Semaine avec course objectif', 'Isoler la charge d\'entraînement.', [
      ef(30, 'a.', 'b.'),
      sl(40, 'a.', 'b.'),
      course('Marathon de Bordeaux', 42.195, 240, 'Objectif de la saison.', 'Finir en forme.'),
      renfo(20, 'a.', 'b.'),
    ]);
    expect(volume(s)).toBe(310);
    expect(volumeHorsCourse(s)).toBe(70);
  });
});

function prog(semainesContenu) {
  return { code: 'PX', nom: 'Test', dateCourse: '2026-09-27', prerequis: 'Aucun.', izon: 'aucune', semainesContenu };
}
const sem = (n, phase, d1, d2, d3) => semaine(n, phase, 'Titre', 'Intention.', [
  ef(d1, 'a.', 'b.'), ef(d2, 'a.', 'b.'), sl(d3, 'a.', 'b.'), renfo(20, 'a.', 'b.'),
]);
const semRecup = (n) => semaine(n, 'recuperation', 'Titre', 'Intention.', [
  recup(25, 'a.', 'b.'), recup(30, 'a.', 'b.'), recup(30, 'a.', 'b.'), renfo(15, 'a.', 'b.'),
]);
// Semaine contenant la course objectif (ex. une course-test comme le 10 km
// d'Izon) : d1 + d2 est le volume hors course (celui que verifierProgramme
// compare), dureeCourse est la durée de la course elle-même, exclue de ce
// volume.
const semAvecCourse = (n, phase, d1, d2, dureeCourse) => semaine(n, phase, 'Titre', 'Intention.', [
  ef(d1, 'a.', 'b.'),
  ef(d2, 'a.', 'b.'),
  course('Course test', 10, dureeCourse, 'Course test.', 'Se tester.'),
  renfo(20, 'a.', 'b.'),
]);

describe('règles de progression', () => {
  it('refuse une hausse de volume supérieure à 10 % entre deux semaines chargées', () => {
    const p = prog([sem(1, 'bloc1', 30, 30, 40), sem(2, 'bloc1', 40, 40, 50), semRecup(3)]);
    expect(() => verifierProgramme(p)).toThrow(/10 %/);
  });

  it('accepte une remontée de volume après une semaine allégée', () => {
    const p = prog([
      sem(1, 'bloc1', 30, 30, 40),
      sem(2, 'bloc1', 32, 32, 44),
      sem(3, 'allegee', 25, 25, 30),
      sem(4, 'bloc2', 34, 34, 46),
      sem(5, 'affutage', 30, 25, 30),
      sem(6, 'affutage', 25, 20, 20),
      semRecup(7),
    ]);
    expect(verifierProgramme(p)).toBe(true);
  });

  it("exige que la semaine allégée baisse d'au moins 15 %", () => {
    const p = prog([sem(1, 'bloc1', 40, 40, 50), sem(2, 'allegee', 40, 40, 48), semRecup(3)]);
    expect(() => verifierProgramme(p)).toThrow(/allégée/);
  });

  it('refuse un affûtage dont les 2 semaines précédant la récupération ne sont pas toutes en phase affûtage', () => {
    // Ce programme n'a qu'une seule vraie semaine d'affûtage (S2) : les 2
    // semaines précédant la récupération sont S1 (bloc1) et S2 (affutage), ce
    // qui viole le contrôle structurel de phase, pas le contrôle de
    // décroissance. La regex cible donc précisément le message du contrôle
    // structurel, pour ne pas passer pour la mauvaise raison (voir les deux
    // tests suivants pour la décroissance et le plafond des 65 % eux-mêmes).
    const p = prog([sem(1, 'bloc1', 40, 40, 50), sem(2, 'affutage', 40, 40, 50), semRecup(3)]);
    expect(() => verifierProgramme(p)).toThrow(/doivent être en phase affûtage/);
  });

  it('refuse un affûtage croissant en dernière position', () => {
    const p = prog([
      sem(1, 'bloc1', 40, 40, 50),
      sem(2, 'affutage', 20, 20, 20),
      sem(3, 'affutage', 25, 25, 30),
      semRecup(4),
    ]);
    expect(() => verifierProgramme(p)).toThrow(/doit décroître/);
  });

  it("refuse une dernière semaine d'affûtage à 70 % du pic", () => {
    const p = prog([
      sem(1, 'bloc1', 30, 30, 40),
      sem(2, 'affutage', 30, 30, 30),
      sem(3, 'affutage', 20, 20, 30),
      semRecup(4),
    ]);
    expect(() => verifierProgramme(p)).toThrow(/dépasse 65 %/);
  });

  it('exige une semaine de récupération finale sans intensité', () => {
    const p = prog([sem(1, 'bloc1', 40, 40, 50), sem(2, 'affutage', 35, 30, 40), sem(3, 'affutage', 25, 20, 25)]);
    expect(() => verifierProgramme(p)).toThrow(/récupération/);
  });

  it('refuse de la VMA dans la semaine de récupération', () => {
    const mauvaise = semaine(3, 'recuperation', 'T', 'I.', [
      recup(25, 'a.', 'b.'), vma(30, 'a.', 'b.'), recup(30, 'a.', 'b.'), renfo(15, 'a.', 'b.'),
    ]);
    const p = prog([sem(1, 'bloc1', 40, 40, 50), sem(2, 'affutage', 35, 30, 40), sem(3, 'affutage', 25, 20, 25), mauvaise]);
    expect(() => verifierProgramme(p)).toThrow(/intensité/);
  });

  it("refuse une semaine d'affûtage qui quadruple le pic de charge (plafond global)", () => {
    const p = prog([
      sem(1, 'bloc1', 30, 30, 40),
      sem(2, 'affutage', 150, 150, 100),
      sem(3, 'affutage', 20, 20, 24),
      semRecup(4),
    ]);
    expect(() => verifierProgramme(p)).toThrow(/pic d'entraînement/);
  });

  it('refuse une phase inconnue (faute de frappe)', () => {
    const p = prog([
      sem(1, 'bloc1', 30, 30, 40),
      sem(2, 'blco2', 200, 200, 100),
      sem(3, 'affutage', 30, 30, 40),
      sem(4, 'affutage', 20, 20, 25),
      semRecup(5),
    ]);
    expect(() => verifierProgramme(p)).toThrow(/phase inconnue/);
  });

  it('refuse la VMA dans une semaine de récupération active', () => {
    const recupActiveAvecVma = semaine(2, 'recuperation-active', 'T', 'I.', [
      recup(25, 'a.', 'b.'), vma(20, 'a.', 'b.'), recup(20, 'a.', 'b.'), renfo(15, 'a.', 'b.'),
    ]);
    const p = prog([
      sem(1, 'bloc1', 30, 30, 40),
      recupActiveAvecVma,
      sem(3, 'bloc2', 30, 30, 40),
      sem(4, 'affutage', 30, 30, 30),
      sem(5, 'affutage', 20, 20, 20),
      semRecup(6),
    ]);
    expect(() => verifierProgramme(p)).toThrow(/intensité interdite en semaine de récupération active/);
  });

  it('refuse le SEUIL dans une semaine de récupération active', () => {
    const recupActiveAvecSeuil = semaine(2, 'recuperation-active', 'T', 'I.', [
      recup(25, 'a.', 'b.'), seuil(20, 'a.', 'b.'), recup(20, 'a.', 'b.'), renfo(15, 'a.', 'b.'),
    ]);
    const p = prog([
      sem(1, 'bloc1', 30, 30, 40),
      recupActiveAvecSeuil,
      sem(3, 'bloc2', 30, 30, 40),
      sem(4, 'affutage', 30, 30, 30),
      sem(5, 'affutage', 20, 20, 20),
      semRecup(6),
    ]);
    expect(() => verifierProgramme(p)).toThrow(/intensité interdite en semaine de récupération active/);
  });

  it('accepte une semaine hors bloc dont le volume est exactement au plafond global (pic)', () => {
    const p = prog([
      sem(1, 'bloc1', 30, 30, 40),
      sem(2, 'affutage', 35, 35, 30),
      sem(3, 'affutage', 20, 20, 20),
      semRecup(4),
    ]);
    expect(verifierProgramme(p)).toBe(true);
  });

  it('refuse une semaine hors bloc dont le volume dépasse le plafond global d\'une minute', () => {
    const p = prog([
      sem(1, 'bloc1', 30, 30, 40),
      sem(2, 'affutage', 36, 35, 30),
      sem(3, 'affutage', 20, 20, 20),
      semRecup(4),
    ]);
    expect(() => verifierProgramme(p)).toThrow(/pic d'entraînement/);
  });

  it('accepte une semaine de récupération active suivant une semaine contenant la course objectif (cas P5)', () => {
    // La semaine précédente (S3) contient la course-test : son volume hors
    // course (55 min) est très inférieur à sa charge réelle, donc pas
    // utilisable tel quel comme référence. On remonte à la dernière semaine
    // sans course, S2 (allégée, 100 min), bornée par picBloc (150 min ici) :
    // min(100, 150) = 100. 80 ≤ 0,85 × 100 = 85.
    const p = prog([
      sem(1, 'bloc1', 50, 50, 50),
      sem(2, 'allegee', 30, 30, 40),
      semAvecCourse(3, 'allegee', 27, 28, 55),
      sem(4, 'recuperation-active', 25, 25, 30),
      sem(5, 'affutage', 30, 30, 30),
      sem(6, 'affutage', 20, 20, 20),
      semRecup(7),
    ]);
    expect(verifierProgramme(p)).toBe(true);
  });

  it("refuse une semaine de récupération active trop chargée quand le repli sur picBloc seul l'aurait acceptée à tort", () => {
    // Contre-exemple de relecture : S4 contient la course-test, donc S5 (une
    // vraie semaine de récupération active) ne peut pas se comparer à S4. Si
    // la référence de repli était picBloc seul (150 min, le maximum des
    // blocs S1/S2), 127 ≤ 0,85 × 150 = 127,5 accepterait S5 à tort alors
    // qu'elle est plus chargée que S3 (100) et que la charge réelle de S4
    // (60 + 55 de course = 115). La référence correcte est la dernière
    // semaine sans course, S3 (100 min), bornée par picBloc : 127 > 0,85 ×
    // 100 = 85, donc rejet attendu. S6-S8 complètent le programme (affûtage
    // puis récupération finale) uniquement pour satisfaire les contrôles
    // structurels antérieurs à la boucle de progression ; le rejet attendu
    // survient dès S5, avant que ces semaines ne soient examinées.
    const p = prog([
      sem(1, 'bloc1', 50, 50, 50),
      sem(2, 'bloc1', 50, 50, 50),
      sem(3, 'allegee', 30, 30, 40),
      semAvecCourse(4, 'allegee', 30, 30, 55),
      sem(5, 'recuperation-active', 42, 42, 43),
      sem(6, 'affutage', 20, 20, 30),
      sem(7, 'affutage', 15, 15, 20),
      semRecup(8),
    ]);
    expect(() => verifierProgramme(p)).toThrow(/pic = 100 min, S5 = 127 min/);
  });

  describe('plafond global différencié par phase (une semaine hors bloc ne peut pas devenir la plus chargée du programme)', () => {
    it('refuse une première semaine d\'affûtage plus chargée que le pic, deux semaines avant la course', () => {
      const p = prog([
        sem(1, 'bloc1', 30, 30, 40),
        sem(2, 'bloc2', 35, 35, 40),
        sem(3, 'affutage', 40, 40, 41),
        sem(4, 'affutage', 25, 25, 21),
        semRecup(5),
      ]);
      expect(() => verifierProgramme(p)).toThrow(/pic d'entraînement/);
    });

    it('refuse un affûtage de plus de deux semaines dont les premières dépassent le pic', () => {
      const p = prog([
        sem(1, 'bloc1', 30, 30, 40),
        sem(2, 'affutage', 40, 40, 30),
        sem(3, 'affutage', 40, 40, 30),
        sem(4, 'affutage', 40, 40, 30),
        sem(5, 'affutage', 20, 20, 25),
        semRecup(6),
      ]);
      expect(() => verifierProgramme(p)).toThrow(/pic d'entraînement/);
    });

    it('refuse une semaine de récupération intermédiaire qui dépasse le pic de charge', () => {
      const p = prog([
        sem(1, 'bloc1', 30, 30, 40),
        sem(2, 'recuperation', 40, 40, 30),
        sem(3, 'affutage', 30, 30, 30),
        sem(4, 'affutage', 24, 20, 20),
        semRecup(5),
      ]);
      expect(() => verifierProgramme(p)).toThrow(/pic d'entraînement/);
    });
  });

  it('accepte le barème de non-régression du programme P1 (course-test en avant-dernière semaine d\'affûtage)', () => {
    const p = prog([
      sem(1, 'bloc1', 35, 35, 40),
      sem(2, 'bloc1', 35, 40, 40),
      sem(3, 'bloc1', 40, 40, 45),
      sem(4, 'allegee', 30, 30, 40),
      sem(5, 'bloc2', 40, 45, 45),
      sem(6, 'bloc2', 45, 48, 50),
      sem(7, 'bloc2', 47, 50, 50),
      sem(8, 'affutage', 35, 40, 40),
      semAvecCourse(9, 'affutage', 25, 28, 55),
      semaine(10, 'recuperation', 'Titre', 'Intention.', [
        recup(30, 'a.', 'b.'), recup(30, 'a.', 'b.'), recup(30, 'a.', 'b.'), renfo(15, 'a.', 'b.'),
      ]),
    ]);
    expect(verifierProgramme(p)).toBe(true);
  });
});

describe("P1, 10 km d'Izon", () => {
  it('respecte les règles de progression', () => {
    expect(verifierProgramme(P1)).toBe(true);
  });

  it('compte 9 semaines de prépa plus une de récupération', () => {
    expect(P1.semainesContenu).toHaveLength(10);
    expect(P1.semainesContenu[8].phase).toBe('affutage');
    expect(P1.semainesContenu[9].phase).toBe('recuperation');
  });

  it('place la course en S9', () => {
    const s9 = P1.semainesContenu[8];
    expect(s9.seances.some((s) => s.code === 'COURSE')).toBe(true);
  });

  it("n'impose jamais d'allure en min/km", () => {
    const textes = P1.semainesContenu.flatMap((s) => s.seances.map((x) => x.description));
    expect(textes.join(' ')).not.toMatch(/min\/km/);
  });

  // Tests ajoutés en complément de l'extrait du brief : ils verrouillent
  // l'identité du programme, la trame de phases imposée et le barème de
  // volumes vérifié comme compatible avec le garde-fou.
  it("porte l'identité attendue du programme objectif d'Izon", () => {
    expect(P1.code).toBe('P1');
    expect(P1.dateCourse).toBe('2026-09-27');
    expect(P1.izon).toBe('objectif');
    expect(P1.nom).toBe("10 km d'Izon");
    expect(P1.prerequis).toMatch(/30 minutes/);
  });

  it('suit la trame de phases imposée, S1 à S3 bloc 1, S4 allégée, S5 à S7 bloc 2', () => {
    expect(P1.semainesContenu.map((s) => s.phase)).toEqual([
      'bloc1', 'bloc1', 'bloc1', 'allegee', 'bloc2', 'bloc2', 'bloc2', 'affutage', 'affutage', 'recuperation',
    ]);
    expect(P1.semainesContenu.map((s) => s.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('respecte le barème de volumes hors course et hors renfo', () => {
    // S6 est passée de 143 à 140 min sur décision de l'encadrant : à 143 la
    // hausse depuis S5 valait exactement +10,0 %, soit la limite du garde-fou,
    // et elle tombait sur la semaine qui introduit à la fois la 3e répétition
    // de seuil et la première heure de sortie longue. À 140, la marche vaut
    // +7,7 % et ne dépend plus d'une tolérance de virgule flottante.
    expect(P1.semainesContenu.map(volumeHorsCourse)).toEqual([110, 115, 125, 100, 130, 140, 147, 115, 53, 90]);
  });

  // Décision de l'encadrant : la Z3 est la marche intermédiaire entre
  // l'endurance en Z2 et le seuil en Z4. Ce test existe pour qu'une évolution
  // ultérieure ne la fasse pas disparaître silencieusement du programme.
  it('comporte au moins deux séances dédiées en Z3', () => {
    const seancesZ3 = P1.semainesContenu.flatMap((s) => s.seances).filter((x) => x.zone === 'Z3');
    expect(seancesZ3.length).toBeGreaterThanOrEqual(2);
    expect(seancesZ3.every((x) => x.code === 'TEMPO')).toBe(true);
  });

  it('place la Z3 avant le premier travail en Z4', () => {
    const numeroPremiereZone = (zone) =>
      P1.semainesContenu.find((s) => s.seances.some((x) => x.zone === zone))?.numero;
    expect(numeroPremiereZone('Z3')).toBeLessThan(numeroPremiereZone('Z4'));
  });

  // Décision de l'encadrant : sans lignes droites, un coureur passe six
  // semaines sans le moindre effort bref puis découvre la vitesse d'un coup en
  // S7. Elles arrivent à la fin du premier bloc, soit S3 pour P1, et jamais
  // avant. Le format est verrouillé ici pour que P2 à P5 s'alignent dessus.
  it('introduit des lignes droites en Z5 à la fin du bloc 1, puis les entretient', () => {
    const estLigneDroite = (x) =>
      /lignes droites/.test(x.description) && zonesSecondairesDe(x).includes('Z5');
    const semainesAvecLignes = P1.semainesContenu
      .filter((s) => s.seances.some(estLigneDroite))
      .map((s) => s.numero);

    // Le bloc 1 couvre S1 à S3 : introduction en S3, jamais avant.
    const finBloc1 = Math.max(
      ...P1.semainesContenu.filter((s) => s.phase === 'bloc1').map((s) => s.numero),
    );
    expect(finBloc1).toBe(3);
    expect(semainesAvecLignes[0]).toBe(finBloc1);
    expect(semainesAvecLignes.every((n) => n >= finBloc1)).toBe(true);

    // Entretenues ensuite, mais pas pendant la semaine de course.
    expect(semainesAvecLignes.length).toBeGreaterThanOrEqual(3);
    expect(semainesAvecLignes).not.toContain(9);

    // Toujours en fin d'endurance fondamentale, et au format prescrit :
    // 4 à 6 accélérations de 15 à 20 s, récupération en marchant.
    for (const s of P1.semainesContenu) {
      for (const seance of s.seances.filter(estLigneDroite)) {
        expect(seance.code).toBe('EF');
        expect(seance.description).toMatch(/[456] lignes droites de (15|20) s en Z5/);
        expect(seance.description).toMatch(/marche/);
      }
    }
  });

  it("n'emploie jamais de tiret cadratin dans les textes affichés", () => {
    const textes = P1.semainesContenu.flatMap((s) => [
      s.titre,
      s.intention,
      ...s.seances.flatMap((x) => [x.titre, x.description, x.objectif]),
    ]);
    expect(textes.join(' ')).not.toContain('—');
  });

  it('donne à chaque séance une description exécutable et un objectif rédigé', () => {
    for (const s of P1.semainesContenu) {
      for (const seance of s.seances) {
        expect(seance.description.length).toBeGreaterThan(30);
        expect(seance.objectif.length).toBeGreaterThan(15);
      }
    }
  });

  it('varie les textes, aucune description n\'est copiée d\'une semaine à l\'autre', () => {
    const descriptions = P1.semainesContenu.flatMap((s) => s.seances.map((x) => x.description));
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});

// ---------------------------------------------------------------------------
// Registre des programmes, découvert automatiquement.
// ---------------------------------------------------------------------------
// Les contrôles transverses (cohérence de zone, non-recopie d'un programme à
// l'autre) doivent couvrir tout programme du projet, P4 et P5 compris quand ils
// seront écrits, sans que personne ait à penser à les inscrire quelque part.
// Le registre est donc construit par découverte des modules du dossier et non
// par énumération : déposer un fichier p4-*.js suffit à le soumettre à ces
// tests. C'est exactement ce qui a manqué au filet précédent, une liste écrite
// à la main qui ne regardait que P1.
const MODULES_PROGRAMMES = import.meta.glob('../src/programmes/p*.js', { eager: true });

const PROGRAMMES = Object.values(MODULES_PROGRAMMES)
  .flatMap((m) => Object.values(m))
  .filter((p) => p && Array.isArray(p.semainesContenu))
  .sort((a, b) => a.code.localeCompare(b.code));

// Les semaines à variantes n'exposent par défaut que la variante sansIzon dans
// leur champ `seances` : la variante avecIzon échapperait donc aux contrôles.
// On la présente comme un contenu supplémentaire d'une seule semaine, pour que
// ses séances soient vérifiées comme les autres. `origine` retient le
// programme dont elle provient : deux variantes d'une même semaine d'un même
// programme ne sont pas deux programmes distincts.
const VARIANTES_AVEC_IZON = PROGRAMMES.flatMap((p) =>
  p.semainesContenu
    .filter((s) => s.variantes)
    .map((s) => ({
      code: `${p.code} (variante avecIzon)`,
      origine: p.code,
      semainesContenu: [s.variantes.avecIzon],
    })),
);

const TOUS_LES_CONTENUS = [...PROGRAMMES, ...VARIANTES_AVEC_IZON];

// ---------------------------------------------------------------------------
// Identité des séances dans la semaine
// ---------------------------------------------------------------------------
//
// Le code de type (EF, SL, VMA...) n'identifie pas une séance : 57 des 150
// semaines résolues du corpus en portent deux du même. C'est l'identifiant
// « code-rang » qui fait foi, et le balayage ci-dessous est le filet qui
// garantit qu'il ne se répète jamais dans une semaine, sur les cinq
// programmes et dans les deux variantes.

describe('identité des séances dans la semaine', () => {
  it('numérote chaque séance par son rang d\'occurrence de code, suffixe toujours posé', () => {
    const seances = identifierSeances([
      { code: 'EF' }, { code: 'EF' }, { code: 'SL' }, { code: 'RENFO' },
    ]);
    expect(seances.map((s) => s.id)).toEqual(['EF-1', 'EF-2', 'SL-1', 'RENFO-1']);
    // Le suffixe est posé même sur un code unique dans la semaine. Sans lui,
    // ajouter une seconde endurance forcerait l'unique « EF » à devenir
    // « EF-1 » et orphelinerait toutes les validations déjà posées.
    expect(identifierSeances([{ code: 'SL' }])[0].id).toBe('SL-1');
    expect(identifiantSeance('EF', 2)).toBe('EF-2');
  });

  it('ne mute pas les séances sources et recalcule un identifiant déjà posé', () => {
    const source = [{ code: 'EF', id: 'PERIME' }, { code: 'EF' }];
    const rendues = identifierSeances(source);
    expect(source[0].id).toBe('PERIME');
    expect(rendues.map((s) => s.id)).toEqual(['EF-1', 'EF-2']);
  });

  it('la semaine 1 de P1 distingue bien ses deux endurances fondamentales', () => {
    const s1 = semaineDuProgramme('P1', 1, { faitIzon: false });
    expect(s1.seances.map((s) => s.code)).toEqual(['EF', 'EF', 'SL', 'RENFO']);
    expect(s1.seances.map((s) => s.id)).toEqual(['EF-1', 'EF-2', 'SL-1', 'RENFO-1']);
    // Deux séances distinctes, pas une saisie en double : descriptions et
    // durées diffèrent.
    expect(s1.seances[0].description).not.toBe(s1.seances[1].description);
  });

  it('donne un identifiant unique à chaque séance des 150 semaines résolues, dans les deux variantes', () => {
    const collisions = [];
    let semainesBalayees = 0;
    let semainesAHomonymes = 0;
    let seancesBalayees = 0;

    for (const code of Object.keys(REGISTRE_PROGRAMMES)) {
      const nb = REGISTRE_PROGRAMMES[code].semainesContenu.length;
      for (const faitIzon of [false, true]) {
        for (let n = 1; n <= nb; n++) {
          const s = semaineDuProgramme(code, n, { faitIzon });
          semainesBalayees += 1;
          seancesBalayees += s.seances.length;

          const codes = s.seances.map((x) => x.code);
          if (new Set(codes).size !== codes.length) semainesAHomonymes += 1;

          const ids = s.seances.map((x) => x.id);
          for (const id of ids) {
            expect(typeof id).toBe('string');
            expect(id).toMatch(/^[A-Za-z0-9-]+-\d+$/);
          }
          if (new Set(ids).size !== ids.length) {
            collisions.push(`${code} S${n} (izon=${faitIzon}) : ${ids.join(', ')}`);
          }
        }
      }
    }

    // 150 résolutions : 75 semaines de plan sur les cinq programmes, chacune
    // lue dans ses deux variantes (avec et sans la course-test d'Izon). Le
    // compte de semaines à séances homonymes est asserté et non seulement
    // affiché : s'il tombait à zéro, ce test ne prouverait plus rien du
    // défaut qu'il couvre, et il faudrait s'en apercevoir.
    expect(semainesBalayees).toBe(150);
    expect(semainesAHomonymes).toBe(57);
    expect(seancesBalayees).toBe(600);
    expect(collisions).toEqual([]);
  });

  it('rend le même identifiant à chaque lecture, sans dépendre de l\'ordre des appels', () => {
    // La stabilité est l'exigence qui fait tenir la coche du coureur d'un
    // jour à l'autre et d'un déploiement à l'autre : l'identifiant ne dépend
    // que du contenu de la semaine, jamais d'un compteur ni d'une horloge.
    for (const code of Object.keys(REGISTRE_PROGRAMMES)) {
      for (const faitIzon of [false, true]) {
        const nb = REGISTRE_PROGRAMMES[code].semainesContenu.length;
        for (let n = 1; n <= nb; n++) {
          const a = semaineDuProgramme(code, n, { faitIzon }).seances.map((x) => x.id);
          const b = semaineDuProgramme(code, n, { faitIzon }).seances.map((x) => x.id);
          expect(b).toEqual(a);
        }
      }
    }
  });

  it('les deux variantes d\'une semaine à variantes numérotent chacune la sienne', () => {
    const sans = semaineDuProgramme('P2', 9, { faitIzon: false });
    const avec = semaineDuProgramme('P2', 9, { faitIzon: true });
    expect(new Set(sans.seances.map((s) => s.id)).size).toBe(sans.seances.length);
    expect(new Set(avec.seances.map((s) => s.id)).size).toBe(avec.seances.length);
    // La variante avec course porte un COURSE-1 que l'autre n'a pas.
    expect(avec.seances.some((s) => s.id === 'COURSE-1')).toBe(true);
    expect(sans.seances.some((s) => s.id === 'COURSE-1')).toBe(false);
  });
});

describe('registre des programmes', () => {
  it('se construit par découverte du dossier, sans liste écrite en dur', () => {
    // Un module de programme = un programme exporté. Si la découverte ramenait
    // moins de programmes que de fichiers, les contrôles transverses
    // passeraient en ne vérifiant rien, ce qui est le pire des cas.
    expect(PROGRAMMES.length).toBe(Object.keys(MODULES_PROGRAMMES).length);
    expect(PROGRAMMES.length).toBeGreaterThanOrEqual(3);

    // Les programmes importés nommément en tête de fichier doivent être
    // exactement les objets que la découverte trouve.
    for (const p of [P1, P2, P3, P4]) expect(PROGRAMMES).toContain(p);
    // Cette liste suit mécaniquement les programmes à double parcours : P4
    // ajoute sa propre variante de S9, elle doit apparaître ici sous peine que
    // les contrôles transverses la laissent hors de leur champ sans rien dire.
    expect(VARIANTES_AVEC_IZON.map((v) => v.code)).toEqual([
      'P2 (variante avecIzon)',
      'P3 (variante avecIzon)',
      'P4 (variante avecIzon)',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Filet anti-recopie d'un programme à l'autre.
// ---------------------------------------------------------------------------
// La recopie verbatim est le défaut récurrent de ce chantier : commise une
// première fois de P1 vers P2 et attrapée, puis une seconde fois de P2 vers P3
// et passée à travers. Le filet précédent avait trois angles morts qui
// expliquent exactement ce qui est passé : il ne comparait que les
// descriptions, uniquement contre P1, et jamais le champ `objectif`. Or c'est
// l'objectif, le « pourquoi » de la séance, qui fait la valeur de ces textes et
// qui est le plus tentant à recopier puisqu'il est le plus court.
//
// Ce filet-ci compare tous les programmes deux à deux, sur la description ET
// sur l'objectif, et s'appuie sur le registre découvert automatiquement : P4 et
// P5 seront couverts sans qu'on ait à toucher ce test.
//
// Pas de seuil de similarité. Deux textes ne sont en collision que s'ils sont
// rigoureusement identiques une fois la casse et les espaces normalisés. C'est
// le critère le plus étroit possible, et c'est délibéré : il ne peut pas crier
// au loup sur deux formulations seulement voisines, et il ne peut pas non plus
// laisser repasser une séance entière recopiée. Un seuil flou aurait ces deux
// défauts à la fois. La normalisation n'est pas une tolérance mais un
// durcissement : elle empêche de faire taire le test en changeant une majuscule
// ou en doublant une espace.
//
// Aucune exception n'est accordée aujourd'hui : les trois programmes écrits ne
// partagent légitimement aucun texte. Si un programme ultérieur avait un besoin
// réel de répéter une formulation très courte et purement fonctionnelle, la
// dérogation doit être nommée ici, emplacement par emplacement, et justifiée.
describe("non-recopie des textes d'un programme à l'autre", () => {
  const normaliser = (texte) => texte.replace(/\s+/g, ' ').trim().toLowerCase();
  const extrait = (texte) => (texte.length > 90 ? `${texte.slice(0, 90)}...` : texte);

  // Chaque texte affiché au coureur, repéré par son emplacement exact.
  // `programme` est le programme d'appartenance : les deux variantes de la S9
  // d'un même programme partagent ce champ, elles ne sont pas deux programmes.
  const emplacements = TOUS_LES_CONTENUS.flatMap((prg) =>
    prg.semainesContenu.flatMap((sem) =>
      sem.seances.flatMap((seance) =>
        ['description', 'objectif'].map((champ) => ({
          programme: prg.origine ?? prg.code,
          ou: `${prg.code} S${sem.numero} ${seance.code}`,
          champ,
          brut: seance[champ],
          texte: normaliser(seance[champ]),
        })),
      ),
    ),
  );

  it('ne partage aucune description ni aucun objectif entre deux programmes', () => {
    // Ancre de sécurité : si l'extraction se cassait, la comparaison serait
    // vide et le test passerait en ne vérifiant rien.
    expect(emplacements.length).toBeGreaterThan(200);
    expect(emplacements.some((e) => e.champ === 'objectif')).toBe(true);

    // Regroupement par couple (champ, texte normalisé). Comparer les groupes
    // revient à comparer tous les programmes deux à deux, en une seule passe.
    const parTexte = new Map();
    for (const e of emplacements) {
      const cle = `${e.champ} ${e.texte}`;
      if (!parTexte.has(cle)) parTexte.set(cle, []);
      parTexte.get(cle).push(e);
    }

    const collisions = [];
    for (const groupe of parTexte.values()) {
      if (groupe.length < 2) continue;
      for (let i = 0; i < groupe.length; i++) {
        for (let j = i + 1; j < groupe.length; j++) {
          const [a, b] = [groupe[i], groupe[j]];
          if (a.programme === b.programme) continue;
          collisions.push(
            `${a.ou} et ${b.ou} ont le même ${a.champ} : « ${extrait(a.brut)} »`,
          );
        }
      }
    }

    expect(
      collisions,
      collisions.length === 0
        ? ''
        : `Textes recopiés d'un programme à l'autre :\n  ${collisions.join('\n  ')}\n` +
          `Chaque séance doit expliquer sa propre charge et son propre enjeu : une fin de préparation de semi n'a ni la charge accumulée ni la fatigue d'une fin de préparation de 10 km.`,
    ).toEqual([]);
  });
});

// Verrou général contre l'incohérence de zone. Le bug d'origine : une séance
// construite avec vma(), donc estampillée Z5 par la fabrique, dont la
// description rédigée décrivait du 5 fois 1 min en Z4. L'application affiche la
// zone de l'objet à côté de la description : le coureur lisait deux intensités
// contradictoires pour une même séance. Ce test parcourt toutes les séances de
// tous les programmes exportés par le fichier, pour que le contrôle couvre
// aussi les programmes ajoutés plus tard.
describe('cohérence entre la zone portée par la séance et les zones citées dans sa description', () => {
  const ORDRE_ZONES = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'];
  const zonesCitees = (texte) => [...new Set(texte.match(/Z[1-5]/g) ?? [])];
  // La dérogation au plafond n'est plus accordée par fabrique mais séance par
  // séance : seule une séance qui a explicitement déclaré une zone secondaire
  // (4e argument des fabriques, voir seances.js) peut citer cette zone-là, et
  // elle seule. L'ancienne dérogation globale accordée à sl() dispensait du
  // contrôle toutes les sorties longues des cinq programmes alors qu'une seule
  // séance en avait besoin ; la sortie longue de S8 déclare désormais Z3 et
  // toutes les autres sont contrôlées normalement. Le plancher, lui, n'a
  // jamais de dérogation : une séance cite toujours sa propre zone.
  // Le registre est partagé et découvert automatiquement (voir plus haut).
  const programmes = TOUS_LES_CONTENUS;

  it('couvre tous les programmes écrits et leurs variantes de semaine 9', () => {
    // Volontairement sans liste de codes figée : un P4 ajouté demain doit être
    // contrôlé sans qu'on ait à modifier ce test.
    expect(programmes.length).toBe(PROGRAMMES.length + VARIANTES_AVEC_IZON.length);
    for (const p of PROGRAMMES) expect(programmes).toContain(p);
    expect(programmes.flatMap((prg) => prg.semainesContenu).length).toBeGreaterThan(0);
  });

  it('cite toujours la zone de la séance dans sa description', () => {
    for (const prg of programmes) {
      for (const sem of prg.semainesContenu) {
        for (const seance of sem.seances) {
          if (seance.zone === null) continue; // RENFO et COURSE ne portent pas de zone.
          const citees = zonesCitees(seance.description);
          expect(
            citees,
            `${prg.code} S${sem.numero} ${seance.code} : la séance affiche ${seance.zone} mais sa description cite ${citees.join(', ') || 'aucune zone'}.`,
          ).toContain(seance.zone);
        }
      }
    }
  });

  it("ne cite jamais une zone plus dure que celle affichée, sauf zone secondaire déclarée", () => {
    for (const prg of programmes) {
      for (const sem of prg.semainesContenu) {
        for (const seance of sem.seances) {
          if (seance.zone === null) continue;
          const plafond = ORDRE_ZONES.indexOf(seance.zone);
          const declarees = zonesSecondairesDe(seance);
          const plusDures = zonesCitees(seance.description)
            .filter((z) => ORDRE_ZONES.indexOf(z) > plafond)
            .filter((z) => !declarees.includes(z));
          expect(
            plusDures,
            `${prg.code} S${sem.numero} ${seance.code} : la séance affiche ${seance.zone} mais sa description monte jusqu'à ${plusDures.join(', ')} sans l'avoir déclaré en zone secondaire.`,
          ).toEqual([]);
        }
      }
    }
  });
});

// Le mécanisme de zone secondaire est la brique que réutiliseront P2 à P5. Ces
// tests verrouillent ses garde-fous : une déclaration doit être exacte, utile
// et honnête, sinon elle devient une dérogation globale déguisée.
describe('déclaration de zone secondaire', () => {
  it("expose la zone déclarée et la garde absente des séances qui n'en déclarent pas", () => {
    const avec = ef(35, '25 min en Z2 puis 6 lignes droites de 20 s en Z5.', 'Entretenir la foulée.', {
      zonesSecondaires: ['Z5'],
    });
    expect(avec.zonesSecondaires).toEqual(['Z5']);
    expect(zonesSecondairesDe(avec)).toEqual(['Z5']);

    const sans = ef(40, '40 min en Z2.', "Construire l'endurance.");
    expect(sans).not.toHaveProperty('zonesSecondaires');
    expect(zonesSecondairesDe(sans)).toEqual([]);
  });

  it('refuse une zone secondaire inconnue', () => {
    expect(() => ef(35, '35 min en Z2.', 'Objectif.', { zonesSecondaires: ['Z9'] })).toThrow(/inconnue/);
  });

  it('refuse une zone secondaire identique à la zone de la séance', () => {
    expect(() => ef(35, '35 min en Z2.', 'Objectif.', { zonesSecondaires: ['Z2'] })).toThrow(/déclaration inutile/);
  });

  it('refuse une zone secondaire déclarée mais jamais citée dans la description', () => {
    expect(() => ef(35, '35 min en Z2.', 'Objectif.', { zonesSecondaires: ['Z5'] })).toThrow(/jamais citée/);
  });

  it('refuse une zone secondaire sur une séance qui ne porte aucune zone', () => {
    expect(() => renfo(20, 'Gainage, puis Z5.', 'Objectif.', { zonesSecondaires: ['Z5'] })).toThrow(/sans zone/);
  });
});

// ---------------------------------------------------------------------------
// P2 et P3, 10 km et semi-marathon de Bordeaux, 15 semaines plus récupération.
// ---------------------------------------------------------------------------

// Reconstruit un programme en substituant, en semaine 9, la variante demandée.
// La phase est reprise en même temps que les séances : elle est propre à
// chaque variante, puisque ce sont deux semaines réellement différentes. En P2
// comme en P3, la variante sans dossard est la première marche d'un cycle
// progressif (bloc3) tandis que la variante avec dossard est une semaine
// allégée, le coureur courant pour de bon le dimanche.
const avecVariante = (p, nom) => ({
  ...p,
  semainesContenu: p.semainesContenu.map((s) =>
    s.numero === 9 && s.variantes
      ? { ...s, phase: s.variantes[nom].phase, seances: s.variantes[nom].seances }
      : s,
  ),
});

// Trame de phases attendue. P2 et P3 suivent désormais la même construction :
// trois semaines progressives puis une semaine plus douce, répétées, et un
// quatrième cycle réduit à la seule S13 qui porte le pic de charge. La liste
// blanche de regles.js ne connaissant que trois étiquettes de bloc, S13 est
// étiquetée bloc3 comme le cycle qu'elle relance.
const TRAME_CYCLES = [
  'bloc1', 'bloc1', 'bloc1', 'allegee',
  'bloc2', 'bloc2', 'bloc2', 'allegee',
  'bloc3', 'bloc3', 'bloc3', 'allegee',
  'bloc3',
  'affutage', 'affutage', 'recuperation',
];

describe.each([
  // [nom, programme, trame de phases, numéro de la semaine de pic de charge]
  // [nom, programme, trame, semaine de pic, plancher de sortie longue S5 à S13]
  ['P2', P2, TRAME_CYCLES, 13, 50],
  ['P3', P3, TRAME_CYCLES, 13, 75],
])('%s', (nom, p, trame, semainePic, plancherSL) => {
  it('respecte les règles de progression dans les deux variantes', () => {
    expect(verifierProgramme(p)).toBe(true);
    expect(verifierProgramme(avecVariante(p, 'sansIzon'))).toBe(true);
    expect(verifierProgramme(avecVariante(p, 'avecIzon'))).toBe(true);
  });

  it('compte 15 semaines plus la récupération', () => {
    expect(p.semainesContenu).toHaveLength(16);
  });

  it('propose les deux variantes en S9', () => {
    const s9 = p.semainesContenu[8];
    expect(s9.variantes.avecIzon.seances.some((s) => s.code === 'COURSE')).toBe(true);
    expect(s9.variantes.sansIzon.seances.some((s) => s.code === 'COURSE')).toBe(false);
  });

  it('expose par défaut la variante sansIzon en S9, phase comprise', () => {
    const s9 = p.semainesContenu[8];
    expect(s9.seances).toBe(s9.variantes.sansIzon.seances);
    expect(s9.phase).toBe(s9.variantes.sansIzon.phase);
  });

  it('place la course objectif en S15', () => {
    expect(p.semainesContenu[14].seances.some((s) => s.code === 'COURSE')).toBe(true);
  });

  it("laisse Izon en option et vise la date du 8 novembre", () => {
    expect(p.izon).toBe('option');
    expect(p.dateCourse).toBe('2026-11-08');
  });

  it('suit la trame de phases imposée', () => {
    expect(p.semainesContenu.map((s) => s.phase)).toEqual(trame);
    expect(p.semainesContenu.map((s) => s.numero)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    );
  });

  it(`atteint son pic de charge en S${semainePic} et nulle part ailleurs`, () => {
    const volumes = p.semainesContenu.map(volumeHorsCourse);
    const pic = volumes[semainePic - 1];
    expect(Math.max(...volumes)).toBe(pic);
    expect(volumes.filter((v) => v === pic)).toHaveLength(1);
  });

  it("n'impose jamais d'allure en min/km ni de vitesse chiffrée", () => {
    const textes = p.semainesContenu
      .flatMap((s) => [...s.seances, ...(s.variantes ? s.variantes.avecIzon.seances : [])])
      .map((x) => x.description)
      .join(' ');
    expect(textes).not.toMatch(/min\/km/);
    expect(textes).not.toMatch(/km\/h/);
  });

  it("n'emploie jamais de tiret cadratin dans les textes affichés", () => {
    const textes = p.semainesContenu.flatMap((s) => [
      s.titre,
      s.intention,
      ...[...s.seances, ...(s.variantes ? s.variantes.avecIzon.seances : [])].flatMap((x) => [
        x.titre,
        x.description,
        x.objectif,
      ]),
    ]);
    expect(textes.join(' ')).not.toContain('—');
  });

  it('donne à chaque séance une description exécutable et un objectif rédigé', () => {
    for (const s of p.semainesContenu) {
      for (const seance of [...s.seances, ...(s.variantes ? s.variantes.avecIzon.seances : [])]) {
        expect(seance.description.length).toBeGreaterThan(30);
        expect(seance.objectif.length).toBeGreaterThan(15);
      }
    }
  });

  it("varie les textes, aucune description n'est répétée d'une semaine à l'autre", () => {
    const descriptions = p.semainesContenu.flatMap((s) => s.seances.map((x) => x.description));
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('place la Z3 avant le premier travail en Z4', () => {
    const numeroPremiereZone = (zone) =>
      p.semainesContenu.find((s) => s.seances.some((x) => x.zone === zone))?.numero;
    expect(numeroPremiereZone('Z3')).toBeLessThan(numeroPremiereZone('Z4'));
  });

  it('ne programme jamais deux séances dures dans la même semaine', () => {
    const DURES = new Set(['TEMPO', 'SEUIL', 'VMA']);
    for (const s of p.semainesContenu) {
      for (const seances of [s.seances, s.variantes ? s.variantes.avecIzon.seances : []]) {
        expect(seances.filter((x) => DURES.has(x.code)).length).toBeLessThanOrEqual(1);
      }
    }
  });

  it("n'introduit les lignes droites en Z5 qu'à la fin du bloc 1, puis les entretient", () => {
    const estLigneDroite = (x) =>
      /lignes droites/.test(x.description) && zonesSecondairesDe(x).includes('Z5');
    const semainesAvecLignes = p.semainesContenu
      .filter((s) => s.seances.some(estLigneDroite))
      .map((s) => s.numero);

    const finBloc1 = Math.max(
      ...p.semainesContenu.filter((s) => s.phase === 'bloc1').map((s) => s.numero),
    );
    expect(finBloc1).toBe(3);
    expect(semainesAvecLignes[0]).toBe(finBloc1);
    expect(semainesAvecLignes.length).toBeGreaterThanOrEqual(4);

    // Jamais pendant une semaine allégée, ni pendant la semaine de course.
    const allegees = p.semainesContenu.filter((s) => s.phase === 'allegee').map((s) => s.numero);
    for (const n of allegees) expect(semainesAvecLignes).not.toContain(n);
    expect(semainesAvecLignes).not.toContain(15);

    // Toujours en fin d'endurance fondamentale, au format prescrit.
    for (const s of p.semainesContenu) {
      for (const seance of s.seances.filter(estLigneDroite)) {
        expect(seance.code).toBe('EF');
        expect(seance.description).toMatch(/[46] lignes droites de (15|20) s en Z5/);
        expect(seance.description).toMatch(/marche/);
      }
    }
  });

  it('réduit le renfo sur les deux semaines qui précèdent la course', () => {
    const dureeRenfo = (s) => s.seances.find((x) => x.code === 'RENFO').duree;
    const pic = Math.max(...p.semainesContenu.map(dureeRenfo));
    expect(dureeRenfo(p.semainesContenu[13])).toBeLessThan(pic);
    expect(dureeRenfo(p.semainesContenu[14])).toBeLessThan(dureeRenfo(p.semainesContenu[13]));
  });

  // Trame en cycles de trois semaines progressives plus une semaine plus
  // douce. Ces trois tests sont la traduction mécanique de la consigne de
  // l'encadrant : ils échoueraient si l'on réintroduisait un creux au milieu
  // de la préparation, comme le faisait l'ancienne trame.
  it('fait monter le volume sur chacune des trois semaines de chaque cycle', () => {
    const v = p.semainesContenu.map(volumeHorsCourse);
    for (const [a, b, c] of [[1, 2, 3], [5, 6, 7], [9, 10, 11]]) {
      expect(v[b - 1]).toBeGreaterThan(v[a - 1]);
      expect(v[c - 1]).toBeGreaterThan(v[b - 1]);
    }
    // S13 relance après la semaine douce de S12 et devient le pic.
    expect(v[12]).toBeGreaterThan(v[10]);
  });

  it("n'enchaîne jamais deux semaines plus douces et ne creuse pas la sortie longue", () => {
    // Parcours par défaut, celui du coureur qui ne prend pas de dossard à
    // Izon : aucune semaine allégée ne suit une semaine allégée.
    const phases = p.semainesContenu.map((s) => s.phase);
    expect(phases.filter((ph) => ph === 'allegee')).toHaveLength(3);
    phases.forEach((ph, i) => {
      if (ph === 'allegee') expect(phases[i + 1]).not.toBe('allegee');
    });

    // Parcours avec substitution avecIzon : il compte une exception, et une
    // seule. S8 est allégée et la S9 à dossard l'est aussi, puisque le coureur
    // court le dimanche. Cette exception est sportivement défendable parce que
    // S9 n'est pas une semaine passive : la charge n'y est pas retirée mais
    // remplacée par une course. Le test la nomme explicitement plutôt que de
    // relâcher la règle, pour qu'une seconde exception, elle, échoue.
    const phasesIzon = avecVariante(p, 'avecIzon').semainesContenu.map((s) => s.phase);
    const enchainees = phasesIzon
      .map((ph, i) => (ph === 'allegee' && phasesIzon[i + 1] === 'allegee' ? i + 1 : null))
      .filter((n) => n !== null);
    expect(enchainees).toEqual([8]); // S8 puis S9, et rien d'autre.

    const s9Izon = p.semainesContenu[8].variantes.avecIzon;
    expect(s9Izon.phase).toBe('allegee');
    expect(s9Izon.seances.some((x) => x.code === 'COURSE')).toBe(true);

    // La sortie longue ne retombe jamais sous son plancher entre S5 et S13 :
    // c'est le creux de l'ancienne trame (35 min en S9 pour P2, 52 min pour
    // P3) que la trame en cycles supprime.
    const longue = (n) => p.semainesContenu[n - 1].seances.find((x) => x.code === 'SL').duree;
    for (let n = 5; n <= 13; n++) expect(longue(n)).toBeGreaterThanOrEqual(plancherSL);
  });

  it('ne fait jamais reculer la sortie longue à l\'intérieur d\'un cycle', () => {
    const longue = (n) => p.semainesContenu[n - 1].seances.find((x) => x.code === 'SL').duree;
    for (const [a, b, c] of [[1, 2, 3], [5, 6, 7], [9, 10, 11]]) {
      expect(longue(b)).toBeGreaterThan(longue(a));
      expect(longue(c)).toBeGreaterThan(longue(b));
    }
  });

  it('donne à chaque variante de S9 sa propre phase, et les deux restent valides', () => {
    const s9 = p.semainesContenu[8];
    expect(s9.variantes.sansIzon.phase).toBe('bloc3');
    expect(s9.variantes.avecIzon.phase).toBe('allegee');
    expect(verifierProgramme(avecVariante(p, 'sansIzon'))).toBe(true);
    expect(verifierProgramme(avecVariante(p, 'avecIzon'))).toBe(true);
  });

  it("allège les deux jours qui précèdent la course-test dans la variante avecIzon", () => {
    const textes = p.semainesContenu[8].variantes.avecIzon.seances
      .filter((x) => x.code === 'EF')
      .map((x) => x.description)
      .join(' ');
    expect(textes).toMatch(/vendredi/i);
    expect(textes).toMatch(/la veille (du départ|de la course)/);
  });
});

describe('P2, 10 km de Bordeaux', () => {
  it("porte l'identité et le prérequis attendus", () => {
    expect(P2.code).toBe('P2');
    expect(P2.nom).toBe('10 km de Bordeaux');
    expect(P2.prerequis).toMatch(/30 minutes/);
  });

  it('respecte son barème de volumes hors course et hors renfo', () => {
    expect(P2.semainesContenu.map(volumeHorsCourse)).toEqual([
      100, 108, 117, 96, 126, 136, 147, 122, 132, 140, 151, 126, 162, 118, 55, 90,
    ]);
    expect(volumeHorsCourse(P2.semainesContenu[8].variantes.avecIzon)).toBe(55);
  });

  it('plafonne la sortie longue à 1 h 15', () => {
    const longues = P2.semainesContenu.flatMap((s) => s.seances.filter((x) => x.code === 'SL'));
    expect(Math.max(...longues.map((x) => x.duree))).toBe(75);
  });

  it('travaille majoritairement en Z4 et Z5', () => {
    const dures = P2.semainesContenu
      .flatMap((s) => s.seances)
      .filter((x) => ['TEMPO', 'SEUIL', 'VMA'].includes(x.code));
    const z4z5 = dures.filter((x) => x.zone === 'Z4' || x.zone === 'Z5');
    expect(z4z5.length).toBeGreaterThan(dures.length / 2);
  });

  it('comporte la séance de seuil de référence, 3 fois 8 min en Z4, en fin de préparation', () => {
    const s14 = P2.semainesContenu[13];
    const reference = s14.seances.find((x) => x.code === 'SEUIL');
    expect(reference.description).toMatch(/3 fois 8 min en Z4/);
  });

  it('court son objectif sur 10 km', () => {
    const objectif = P2.semainesContenu[14].seances.find((x) => x.code === 'COURSE');
    expect(objectif.distance).toBe(10);
    expect(objectif.titre).toBe('10 km de Bordeaux');
  });
});

describe('P3, semi-marathon de Bordeaux', () => {
  it("porte l'identité et le prérequis attendus", () => {
    expect(P3.code).toBe('P3');
    expect(P3.nom).toBe('Semi-marathon de Bordeaux');
    expect(P3.prerequis).toMatch(/20 km par semaine depuis 2 mois/);
  });

  it('respecte son barème de volumes hors course et hors renfo', () => {
    expect(P3.semainesContenu.map(volumeHorsCourse)).toEqual([
      130, 141, 152, 124, 160, 172, 185, 152, 165, 176, 188, 158, 200, 140, 61, 105,
    ]);
    expect(volumeHorsCourse(P3.semainesContenu[8].variantes.avecIzon)).toBe(70);
  });

  it('monte la sortie longue à 1 h 50 en S13, au pic de charge', () => {
    const s13 = P3.semainesContenu[12].seances.find((x) => x.code === 'SL');
    expect(s13.duree).toBe(110);
    const longues = P3.semainesContenu.flatMap((s) => s.seances.filter((x) => x.code === 'SL'));
    expect(Math.max(...longues.map((x) => x.duree))).toBe(110);
    expect(longues.filter((x) => x.duree === 110)).toHaveLength(1);
  });

  it('garde sa dominante en Z3 et Z4 malgré les séances de fractionné court', () => {
    const dures = P3.semainesContenu
      .flatMap((s) => s.seances)
      .filter((x) => ['TEMPO', 'SEUIL', 'VMA'].includes(x.code));
    const z3z4 = dures.filter((x) => x.zone === 'Z3' || x.zone === 'Z4');
    // La dominante n'est pas une simple majorité : elle doit rester écrasante.
    expect(z3z4.length).toBeGreaterThanOrEqual(dures.length - 3);
    expect(z3z4.length / dures.length).toBeGreaterThan(0.7);
  });

  // Décision de l'encadrant : P3 ne comportait aucun fractionné court, si bien
  // qu'un coureur enchaînant P1 puis P3 passait cinq mois sans jamais courir
  // vite. Deux séances de Z5 sont posées dans le deuxième cycle, une fois la
  // base installée et le seuil ouvert.
  it('comporte deux à trois séances de VMA, situées dans le deuxième cycle', () => {
    const semainesVma = P3.semainesContenu
      .filter((s) => s.seances.some((x) => x.code === 'VMA'))
      .map((s) => s.numero);
    expect(semainesVma.length).toBeGreaterThanOrEqual(2);
    expect(semainesVma.length).toBeLessThanOrEqual(3);
    // Deuxième cycle : S5 à S8. Jamais avant, jamais dans le bloc spécifique.
    for (const n of semainesVma) {
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(8);
    }
  });

  it('place la première VMA après le premier travail au seuil', () => {
    const premiere = (code) =>
      P3.semainesContenu.find((s) => s.seances.some((x) => x.code === code)).numero;
    expect(premiere('TEMPO')).toBeLessThan(premiere('SEUIL'));
    expect(premiere('SEUIL')).toBeLessThan(premiere('VMA'));
  });

  it("n'accompagne jamais une semaine de VMA de lignes droites", () => {
    for (const s of P3.semainesContenu) {
      if (!s.seances.some((x) => x.code === 'VMA')) continue;
      expect(s.seances.some((x) => /lignes droites/.test(x.description))).toBe(false);
    }
  });

  // La couverture de la VMA ne tenait qu'au décompte des séances : rendre à S7
  // son ancien seuil ne faisait échouer qu'un seul test. Celui-ci verrouille en
  // plus la progression entre les deux séances, qui est la raison d'être de la
  // paire. Répétitions deux fois plus longues la seconde semaine, donc moins
  // nombreuses, pour un volume rapide qui ne recule pas.
  it('fait progresser le format entre les deux séances de VMA', () => {
    const seancesVma = P3.semainesContenu
      .filter((s) => s.seances.some((x) => x.code === 'VMA'))
      .map((s) => ({ numero: s.numero, seance: s.seances.find((x) => x.code === 'VMA') }));
    expect(seancesVma.map((v) => v.numero)).toEqual([6, 7]);

    const format = ({ description }) => {
      const m = description.match(/(\d+) fois (\d+) min en Z5/);
      expect(m, `format de répétitions introuvable dans : ${description}`).not.toBeNull();
      return { repetitions: Number(m[1]), duree: Number(m[2]) };
    };
    const [premiere, seconde] = seancesVma.map((v) => format(v.seance));

    expect(seconde.duree).toBeGreaterThan(premiere.duree);
    expect(seconde.repetitions).toBeLessThan(premiere.repetitions);
    expect(seconde.repetitions * seconde.duree).toBeGreaterThanOrEqual(
      premiere.repetitions * premiere.duree,
    );
  });

  it('comporte la séance spécifique de référence, 2 fois 20 min en Z3, en fin de préparation', () => {
    const s14 = P3.semainesContenu[13];
    const reference = s14.seances.find((x) => x.code === 'TEMPO');
    expect(reference.description).toMatch(/2 fois 20 min en Z3/);
  });

  it('court son objectif sur 21,1 km', () => {
    const objectif = P3.semainesContenu[14].seances.find((x) => x.code === 'COURSE');
    expect(objectif.distance).toBe(21.1);
    expect(objectif.titre).toBe('Semi-marathon de Bordeaux');
  });
});

it('P3 comporte des sorties longues plus longues que P2', () => {
  const longue = (p) =>
    Math.max(
      ...p.semainesContenu.flatMap((s) => s.seances.filter((x) => x.code === 'SL').map((x) => x.duree)),
    );
  expect(longue(P3)).toBeGreaterThan(longue(P2));
});

it('P3 est plus chargé que P2 à chaque semaine de bloc', () => {
  const volumes = (p) => p.semainesContenu.map(volumeHorsCourse);
  const vP2 = volumes(P2);
  const vP3 = volumes(P3);
  P3.semainesContenu.forEach((s, i) => {
    if (s.phase.startsWith('bloc')) expect(vP3[i]).toBeGreaterThan(vP2[i]);
  });
});

// ---------------------------------------------------------------------------
// P4, marathon de Bordeaux ou de Nice-Cannes.
// ---------------------------------------------------------------------------
// La distance la plus exigeante du projet, et la seule dont une erreur de
// barème se paie en blessure plutôt qu'en contre-performance. Les contrôles
// transverses (non-recopie, cohérence de zone) couvrent déjà P4 par découverte
// du dossier ; ce bloc-ci verrouille ce qui lui est propre : le barème, le
// plafond de la sortie longue, la réconciliation des durées et surtout la
// semaine 9, où la consigne « Izon en Z3, pas à fond » est le seul garde-fou
// entre le coureur et un 10 km disputé six semaines avant son marathon.
describe('P4, marathon', () => {
  const s9 = P4.semainesContenu[8];
  const DURES = new Set(['TEMPO', 'SEUIL', 'VMA']);
  const toutesLesSeances = (p) =>
    p.semainesContenu.flatMap((s) => [
      ...s.seances,
      ...(s.variantes ? s.variantes.avecIzon.seances : []),
    ]);

  it('respecte les règles dans les deux variantes, chacune avec sa phase propre', () => {
    expect(verifierProgramme(P4)).toBe(true);
    expect(verifierProgramme(avecVariante(P4, 'sansIzon'))).toBe(true);
    expect(verifierProgramme(avecVariante(P4, 'avecIzon'))).toBe(true);
    expect(s9.variantes.sansIzon.phase).toBe('bloc3');
    expect(s9.variantes.avecIzon.phase).toBe('allegee');
    expect(s9.phase).toBe(s9.variantes.sansIzon.phase);
    expect(s9.seances).toBe(s9.variantes.sansIzon.seances);
  });

  it("porte l'identité, le prérequis et les deux libellés de course attendus", () => {
    expect(P4.code).toBe('P4');
    expect(P4.dateCourse).toBe('2026-11-08');
    expect(P4.izon).toBe('option');
    expect(P4.prerequis).toMatch(/30 km par semaine depuis 2 mois/);
    // Une seule date, un seul contenu, deux intitulés affichables.
    expect(P4.variantesCourse.map((v) => v.nom)).toEqual([
      'Marathon de Bordeaux',
      'Marathon de Nice-Cannes',
    ]);
  });

  it('compte 15 semaines plus la récupération et suit la trame en cycles', () => {
    expect(P4.semainesContenu).toHaveLength(16);
    expect(P4.semainesContenu.map((s) => s.phase)).toEqual(TRAME_CYCLES);
    expect(P4.semainesContenu.map((s) => s.numero)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    );
  });

  it('respecte son barème de volumes hors course et hors renfo', () => {
    expect(P4.semainesContenu.map(volumeHorsCourse)).toEqual([
      165, 178, 192, 160, 200, 215, 231, 190, 240, 248, 266, 220, 280, 200, 70, 120,
    ]);
    expect(volumeHorsCourse(s9.variantes.avecIzon)).toBe(90);
  });

  it('atteint son pic en S13, une seule fois, dans la fourchette voulue', () => {
    const volumes = P4.semainesContenu.map(volumeHorsCourse);
    const pic = volumes[12];
    expect(Math.max(...volumes)).toBe(pic);
    expect(volumes.filter((v) => v === pic)).toHaveLength(1);
    // Ordre de grandeur fixé par l'encadrant pour trois sorties par semaine.
    expect(pic).toBeGreaterThanOrEqual(260);
    expect(pic).toBeLessThanOrEqual(290);
  });

  it('monte la sortie longue à 2 h 30 en S13 et jamais au-delà', () => {
    const longues = P4.semainesContenu.flatMap((s) => s.seances.filter((x) => x.code === 'SL'));
    const max = Math.max(...longues.map((x) => x.duree));
    expect(max).toBe(150);
    expect(max).toBeGreaterThanOrEqual(150);
    expect(P4.semainesContenu[12].seances.find((x) => x.code === 'SL').duree).toBe(150);
    expect(longues.filter((x) => x.duree === 150)).toHaveLength(1);
  });

  it("ne fait jamais reculer la sortie longue à l'intérieur d'un cycle", () => {
    const longue = (n) => P4.semainesContenu[n - 1].seances.find((x) => x.code === 'SL').duree;
    for (const [a, b, c] of [[1, 2, 3], [5, 6, 7], [9, 10, 11]]) {
      expect(longue(b)).toBeGreaterThan(longue(a));
      expect(longue(c)).toBeGreaterThan(longue(b));
    }
  });

  it('fait monter le volume sur les trois semaines de chaque cycle', () => {
    const v = P4.semainesContenu.map(volumeHorsCourse);
    for (const [a, b, c] of [[1, 2, 3], [5, 6, 7], [9, 10, 11]]) {
      expect(v[b - 1]).toBeGreaterThan(v[a - 1]);
      expect(v[c - 1]).toBeGreaterThan(v[b - 1]);
    }
    expect(v[12]).toBeGreaterThan(v[10]);
  });

  // Consigne sportive impérative de l'encadrant. Sur marathon, un 10 km couru
  // à fond six semaines avant la course coûte plusieurs jours de récupération
  // et ampute le bloc spécifique. La consigne doit vivre dans la description
  // de la séance, celle que le coureur lit le matin du départ, et pas
  // seulement dans l'objectif que personne ne relit sur la ligne.
  it('fait courir Izon en Z3, jamais à fond, et le dit dans le texte de la séance', () => {
    const c = s9.variantes.avecIzon.seances.find((x) => x.code === 'COURSE');
    expect(c).toBeDefined();
    expect(c.description).toMatch(/Z3/);
    expect(c.description).toContain(
      "Cours-le en Z3, comme une sortie longue rythmée. Tu dois finir en te disant que tu aurais pu aller plus vite. C'est exactement le but.",
    );
    // Aucune consigne de fin de course à pleine intensité, contrairement à la
    // course-test de P2 et de P3 où le dossard est justement couru à fond.
    expect(c.description).not.toMatch(/lâche tout|à fond|tout donner/i);
    // Retour au calme après l'arrivée : la course remplace la sortie longue,
    // une partie du volume perdu doit être récupérée le jour même.
    expect(c.description).toMatch(/après l'arrivée/);
    expect(c.duree).toBeGreaterThan(55);
  });

  it("supprime la sortie longue la semaine d'Izon", () => {
    expect(s9.variantes.avecIzon.seances.some((x) => x.code === 'SL')).toBe(false);
    // La variante sans dossard, elle, en garde bien une.
    expect(s9.variantes.sansIzon.seances.some((x) => x.code === 'SL')).toBe(true);
  });

  it("ne compte pas les 4 h de marathon dans la charge d'affûtage", () => {
    const semaineCourse = P4.semainesContenu[14];
    const marathon = semaineCourse.seances.find((x) => x.code === 'COURSE');
    expect(marathon.duree).toBeGreaterThan(200);
    expect(marathon.distance).toBe(42.195);
    expect(volume(semaineCourse)).toBeGreaterThan(volumeHorsCourse(semaineCourse));
    expect(verifierProgramme(P4)).toBe(true);
  });

  it('ne programme jamais deux séances dures dans la même semaine', () => {
    for (const s of P4.semainesContenu) {
      for (const seances of [s.seances, s.variantes ? s.variantes.avecIzon.seances : []]) {
        expect(seances.filter((x) => DURES.has(x.code)).length).toBeLessThanOrEqual(1);
      }
    }
  });

  it("ne porte plus qu'une seule séance de qualité par semaine à partir de S9", () => {
    for (const s of P4.semainesContenu.slice(8)) {
      expect(s.seances.filter((x) => DURES.has(x.code)).length).toBeLessThanOrEqual(1);
    }
    // Le volume prend le relais : le bloc spécifique n'a plus de seuil du tout
    // après S9, tout le travail de qualité descend sur l'allure de course.
    const zonesDures = P4.semainesContenu
      .slice(9)
      .flatMap((s) => s.seances.filter((x) => DURES.has(x.code)).map((x) => x.zone));
    expect(zonesDures.every((z) => z === 'Z3')).toBe(true);
  });

  it('garde sa dominante en Z2 et Z3, le seuil restant minoritaire', () => {
    const dures = toutesLesSeances(P4).filter((x) => DURES.has(x.code));
    const z3 = dures.filter((x) => x.zone === 'Z3');
    expect(z3.length).toBeGreaterThan(dures.length / 2);
    // Aucun fractionné court sur une préparation marathon : la Z5 n'existe
    // qu'en lignes droites, jamais en séance à part entière.
    expect(dures.some((x) => x.code === 'VMA')).toBe(false);
  });

  it('place la Z3 avant le premier travail en Z4', () => {
    const numeroPremiereZone = (zone) =>
      P4.semainesContenu.find((s) => s.seances.some((x) => x.zone === zone))?.numero;
    expect(numeroPremiereZone('Z3')).toBeLessThan(numeroPremiereZone('Z4'));
  });

  // Réconciliation des durées : N répétitions donnent N-1 récupérations, et la
  // somme des segments décrits doit égaler exactement la durée déclarée. Le
  // test parse les descriptions plutôt que de recopier des nombres, pour qu'un
  // barème retouché sans retoucher le texte échoue.
  it('réconcilie exactement la durée déclarée avec les segments décrits', () => {
    const intervalles =
      /(\d+) min[^.]*?en Z2, puis (\d+) fois (\d+) min en Z[1-5] avec (\d+) min[^.]*?entre (?:chaque|les deux), puis (\d+) min/;
    const lignes =
      /(\d+) min en Z2, puis (\d+) lignes droites de (\d+) s en Z5 avec 1 min de marche[^.]*?entre chaque, soit (\d+) min, puis (\d+) min/;

    let verifiees = 0;
    for (const seance of toutesLesSeances(P4)) {
      const i = seance.description.match(intervalles);
      if (i) {
        const [, ech, n, duree, recuperation, retour] = i.map(Number);
        expect(
          Number(ech) + n * duree + (n - 1) * recuperation + Number(retour),
          `${seance.code} ${seance.duree} min : segments décrits incohérents dans « ${seance.description} »`,
        ).toBe(seance.duree);
        verifiees++;
        continue;
      }
      const l = seance.description.match(lignes);
      if (l) {
        const [, ech, n, secondes, bloc, retour] = l.map(Number);
        // Le bloc de lignes droites est logé À L'INTÉRIEUR de la durée
        // déclarée : il ne s'ajoute pas au footing, il en fait partie.
        expect((n * secondes) / 60 + (n - 1)).toBe(bloc);
        expect(
          Number(ech) + bloc + Number(retour),
          `${seance.code} ${seance.duree} min : lignes droites mal logées dans « ${seance.description} »`,
        ).toBe(seance.duree);
        verifiees++;
      }
    }
    // Ancre de sécurité : si le parsing cassait, la boucle ne vérifierait rien.
    expect(verifiees).toBe(16);
  });

  it("n'introduit les lignes droites qu'à la fin du bloc 1 et les tient hors des semaines de seuil", () => {
    const estLigneDroite = (x) =>
      /lignes droites/.test(x.description) && zonesSecondairesDe(x).includes('Z5');
    const semainesAvecLignes = P4.semainesContenu
      .filter((s) => s.seances.some(estLigneDroite))
      .map((s) => s.numero);

    expect(semainesAvecLignes).toEqual([3, 7, 10, 11, 14]);

    // Jamais dans une semaine plus douce, jamais au pic, jamais la semaine de
    // course, et jamais dans une semaine qui porte déjà une séance au seuil.
    const allegees = P4.semainesContenu.filter((s) => s.phase === 'allegee').map((s) => s.numero);
    for (const n of allegees) expect(semainesAvecLignes).not.toContain(n);
    expect(semainesAvecLignes).not.toContain(13);
    expect(semainesAvecLignes).not.toContain(15);
    const semainesDeSeuil = P4.semainesContenu
      .filter((s) => s.seances.some((x) => x.code === 'SEUIL'))
      .map((s) => s.numero);
    for (const n of semainesDeSeuil) expect(semainesAvecLignes).not.toContain(n);
    // La variante avec dossard n'en comporte pas non plus : on n'affûte pas la
    // foulée pour une course qui doit se courir en allure contenue.
    expect(s9.variantes.avecIzon.seances.some(estLigneDroite)).toBe(false);

    // Toujours en fin d'endurance fondamentale, au format prescrit.
    for (const s of P4.semainesContenu) {
      for (const seance of s.seances.filter(estLigneDroite)) {
        expect(seance.code).toBe('EF');
        expect(seance.description).toMatch(/[46] lignes droites de (15|20) s en Z5/);
        expect(seance.description).toMatch(/marche/);
      }
    }
  });

  it('réduit le renfo sur les deux semaines qui précèdent la course', () => {
    const dureeRenfo = (s) => s.seances.find((x) => x.code === 'RENFO').duree;
    const pic = Math.max(...P4.semainesContenu.map(dureeRenfo));
    expect(dureeRenfo(P4.semainesContenu[13])).toBeLessThan(pic);
    expect(dureeRenfo(P4.semainesContenu[14])).toBeLessThan(dureeRenfo(P4.semainesContenu[13]));
  });

  it("n'impose jamais d'allure en min/km ni de vitesse chiffrée", () => {
    const textes = toutesLesSeances(P4).map((x) => x.description).join(' ');
    expect(textes).not.toMatch(/min\/km/);
    expect(textes).not.toMatch(/km\/h/);
  });

  it("n'emploie jamais de tiret cadratin dans les textes affichés", () => {
    const textes = P4.semainesContenu.flatMap((s) => [
      s.titre,
      s.intention,
      ...(s.variantes ? [s.variantes.avecIzon.titre, s.variantes.avecIzon.intention] : []),
    ]);
    expect([...textes, ...toutesLesSeances(P4).flatMap((x) => [x.titre, x.description, x.objectif])]
      .join(' ')).not.toContain('—');
  });

  it('donne à chaque séance une description exécutable et un objectif rédigé', () => {
    for (const seance of toutesLesSeances(P4)) {
      expect(seance.description.length).toBeGreaterThan(30);
      expect(seance.objectif.length).toBeGreaterThan(15);
    }
  });

  it("varie les textes, aucune description ni aucun objectif n'est répété dans le programme", () => {
    const descriptions = toutesLesSeances(P4).map((x) => x.description);
    const objectifs = toutesLesSeances(P4).map((x) => x.objectif);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(new Set(objectifs).size).toBe(objectifs.length);
  });
});

it('P4 comporte des sorties longues et un pic de charge supérieurs à ceux de P3', () => {
  const longue = (p) =>
    Math.max(
      ...p.semainesContenu.flatMap((s) => s.seances.filter((x) => x.code === 'SL').map((x) => x.duree)),
    );
  const pic = (p) => Math.max(...p.semainesContenu.map(volumeHorsCourse));
  expect(longue(P4)).toBeGreaterThan(longue(P3));
  expect(pic(P4)).toBeGreaterThan(pic(P3));
});

// ---------------------------------------------------------------------------
// P5, 10 km HOKA de Paris.
// ---------------------------------------------------------------------------
// La seule des cinq préparations qui embarque une course dans son propre
// déroulé : le 10 km d'Izon du 27 septembre n'y est pas une option cochée mais
// une étape du plan, courue à l'objectif à sept semaines de Paris. Deux
// conséquences structurelles que ce bloc verrouille : P5 ne porte aucune
// variante, et sa semaine 10 est en récupération active, donc interdite de VMA
// comme de seuil. Les contrôles transverses (non-recopie, cohérence de zone)
// couvrent déjà P5 par découverte du dossier.
describe('P5, 10 km HOKA de Paris', () => {
  const DURES = new Set(['TEMPO', 'SEUIL', 'VMA']);
  const toutesLesSeances = () => P5.semainesContenu.flatMap((s) => s.seances);
  const longue = (n) => P5.semainesContenu[n - 1].seances.find((x) => x.code === 'SL').duree;

  it('respecte les règles de progression', () => {
    expect(verifierProgramme(P5)).toBe(true);
  });

  it("porte l'identité, la date et le prérequis attendus", () => {
    expect(P5.code).toBe('P5');
    expect(P5.nom).toBe('10 km HOKA de Paris');
    expect(P5.dateCourse).toBe('2026-11-15');
    expect(P5.izon).toBe('integree');
    expect(P5.prerequis).toMatch(/30 minutes/);
  });

  it('compte 16 semaines plus la récupération et suit sa trame propre', () => {
    expect(P5.semainesContenu).toHaveLength(17);
    expect(P5.semainesContenu.map((s) => s.phase)).toEqual([
      'bloc1', 'bloc1', 'bloc1', 'allegee',
      'bloc2', 'bloc2', 'bloc2', 'allegee',
      'allegee',
      'recuperation-active',
      'bloc3', 'bloc3', 'bloc3', 'allegee',
      'affutage', 'affutage', 'recuperation',
    ]);
    expect(P5.semainesContenu.map((s) => s.numero)).toEqual(
      Array.from({ length: 17 }, (_, i) => i + 1),
    );
  });

  // Le point qui distingue P5 des quatre autres programmes. Izon étant intégré,
  // il n'y a rien à choisir : aucune semaine n'a deux versions, et le registre
  // de variantes construit plus haut ne doit donc rien ramener pour P5.
  it("ne porte aucune variante, puisque le dossard d'Izon fait partie du plan", () => {
    for (const s of P5.semainesContenu) {
      expect(s, `S${s.numero} ne devrait pas porter de variantes`).not.toHaveProperty('variantes');
    }
    expect(VARIANTES_AVEC_IZON.some((v) => v.origine === 'P5')).toBe(false);
  });

  it("court le 10 km d'Izon en S9, à l'objectif, et le 10 km de Paris en S16", () => {
    const izon = P5.semainesContenu[8].seances.find((x) => x.code === 'COURSE');
    expect(izon).toBeDefined();
    expect(izon.titre).toBe("10 km d'Izon");
    expect(izon.distance).toBe(10);
    // Couru pour de bon, contrairement au dossard retenu en Z3 de P4 : la
    // consigne de fin de course à pleine intensité doit être dans le texte.
    expect(izon.description).toMatch(/Z4/);
    expect(izon.description).toMatch(/vide ce qu'il te reste/);

    const paris = P5.semainesContenu[15].seances.find((x) => x.code === 'COURSE');
    expect(paris).toBeDefined();
    expect(paris.titre).toBe('10 km HOKA de Paris');
    expect(paris.distance).toBe(10);
  });

  it("allège les deux jours qui précèdent Izon", () => {
    const textes = P5.semainesContenu[8].seances
      .filter((x) => x.code === 'EF')
      .map((x) => x.description)
      .join(' ');
    expect(textes).toMatch(/vendredi/i);
    expect(textes).toMatch(/samedi/i);
  });

  // Garde-fou de regles.js : une semaine de récupération active n'est pas une
  // semaine de travail. Le test ne se contente pas de constater que
  // verifierProgramme passe, il nomme la contrainte.
  it('place S10 en récupération active, sans VMA ni seuil', () => {
    const s10 = P5.semainesContenu[9];
    expect(s10.phase).toBe('recuperation-active');
    expect(s10.seances.some((x) => x.code === 'VMA')).toBe(false);
    expect(s10.seances.some((x) => x.code === 'SEUIL')).toBe(false);
    // Elle suit bien la semaine de course et rien d'autre.
    expect(P5.semainesContenu[8].seances.some((x) => x.code === 'COURSE')).toBe(true);
  });

  // Décision de l'encadrant : le coureur doit comprendre pourquoi le rythme
  // trois plus une s'interrompt en S9 et S10, sans quoi il prendra ce
  // décrochage pour une erreur de plan ou pour une invitation à en rajouter.
  it("explique dans l'intention de S9 et S10 pourquoi le rythme change", () => {
    expect(P5.semainesContenu[8].intention).toMatch(/rupture|exception/i);
    expect(P5.semainesContenu[9].intention).toMatch(/entorse|exception/i);
  });

  it('respecte son barème de volumes hors course et hors renfo', () => {
    expect(P5.semainesContenu.map(volumeHorsCourse)).toEqual([
      102, 111, 120, 98, 128, 138, 149, 120, 58, 88, 140, 150, 160, 124, 112, 56, 92,
    ]);
  });

  it('atteint son pic en S13, une seule fois, dans la fourchette voulue', () => {
    const volumes = P5.semainesContenu.map(volumeHorsCourse);
    const pic = volumes[12];
    expect(Math.max(...volumes)).toBe(pic);
    expect(volumes.filter((v) => v === pic)).toHaveLength(1);
    // Ordre de grandeur retenu pour un 10 km à trois sorties, comme P2.
    expect(pic).toBeGreaterThanOrEqual(150);
    expect(pic).toBeLessThanOrEqual(165);
  });

  it('plafonne la sortie longue à 1 h 15, atteinte une seule fois en S13', () => {
    const longues = P5.semainesContenu.flatMap((s) => s.seances.filter((x) => x.code === 'SL'));
    expect(Math.max(...longues.map((x) => x.duree))).toBe(75);
    expect(longues.filter((x) => x.duree === 75)).toHaveLength(1);
    expect(longue(13)).toBe(75);
  });

  it("ne fait jamais reculer la sortie longue à l'intérieur d'un cycle", () => {
    // Les trois cycles progressifs de P5. S9 et S10 n'en sont pas : elles ne
    // comportent volontairement aucune sortie longue.
    for (const [a, b, c] of [[1, 2, 3], [5, 6, 7], [11, 12, 13]]) {
      expect(longue(b)).toBeGreaterThan(longue(a));
      expect(longue(c)).toBeGreaterThan(longue(b));
    }
    for (const n of [9, 10, 16, 17]) {
      expect(P5.semainesContenu[n - 1].seances.some((x) => x.code === 'SL')).toBe(false);
    }
  });

  it('fait monter le volume sur les trois semaines de chaque cycle', () => {
    const v = P5.semainesContenu.map(volumeHorsCourse);
    for (const [a, b, c] of [[1, 2, 3], [5, 6, 7], [11, 12, 13]]) {
      expect(v[b - 1]).toBeGreaterThan(v[a - 1]);
      expect(v[c - 1]).toBeGreaterThan(v[b - 1]);
    }
  });

  it('ne programme jamais deux séances dures dans la même semaine', () => {
    for (const s of P5.semainesContenu) {
      expect(
        s.seances.filter((x) => DURES.has(x.code)).length,
        `S${s.numero} porte plusieurs séances dures`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it('place la Z3 avant le premier travail en Z4, et la Z4 avant la Z5', () => {
    const numeroPremiereZone = (zone) =>
      P5.semainesContenu.find((s) => s.seances.some((x) => x.zone === zone && DURES.has(x.code)))
        ?.numero;
    expect(numeroPremiereZone('Z3')).toBeLessThan(numeroPremiereZone('Z4'));
    expect(numeroPremiereZone('Z4')).toBeLessThan(numeroPremiereZone('Z5'));
  });

  it('garde sa dominante en Z4 et Z5, la Z3 ne servant que de marche d\'entrée', () => {
    const dures = toutesLesSeances().filter((x) => DURES.has(x.code));
    const z4z5 = dures.filter((x) => x.zone === 'Z4' || x.zone === 'Z5');
    expect(z4z5.length).toBeGreaterThan(dures.length / 2);
    // Les seules séances en Z3 sont dans le premier bloc.
    const semainesZ3 = P5.semainesContenu
      .filter((s) => s.seances.some((x) => x.code === 'TEMPO'))
      .map((s) => s.numero);
    expect(semainesZ3.every((n) => n <= 3)).toBe(true);
  });

  // Réconciliation des durées : N répétitions donnent N-1 récupérations, et la
  // somme des segments décrits doit égaler exactement la durée déclarée. Le
  // test parse les descriptions plutôt que de recopier des nombres, pour qu'un
  // barème retouché sans retoucher le texte échoue.
  it('réconcilie exactement la durée déclarée avec les segments décrits', () => {
    const intervalles =
      /(\d+) min[^.]*?en Z2, puis (\d+) fois (\d+) min en Z[1-5] avec (\d+) min[^.]*?entre (?:chaque|les deux), puis (\d+) min/;
    const lignes =
      /(\d+) min[^.]*? puis (\d+) lignes droites de (\d+) s en Z[45] avec 1 min de marche entre chaque, soit (\d+) min, puis (\d+) min/;

    let intervallesVerifies = 0;
    let lignesVerifiees = 0;
    for (const seance of toutesLesSeances()) {
      const i = seance.description.match(intervalles);
      if (i) {
        const [, ech, n, duree, recuperation, retour] = i.map(Number);
        expect(
          ech + n * duree + (n - 1) * recuperation + retour,
          `${seance.code} ${seance.duree} min : segments décrits incohérents dans « ${seance.description} »`,
        ).toBe(seance.duree);
        intervallesVerifies++;
        continue;
      }
      const l = seance.description.match(lignes);
      if (l) {
        const [, ech, n, secondes, bloc, retour] = l.map(Number);
        // Le bloc de lignes droites est logé À L'INTÉRIEUR de la durée
        // déclarée : il ne s'ajoute pas au footing, il en fait partie.
        expect((n * secondes) / 60 + (n - 1)).toBe(bloc);
        expect(
          ech + bloc + retour,
          `${seance.code} ${seance.duree} min : lignes droites mal logées dans « ${seance.description} »`,
        ).toBe(seance.duree);
        lignesVerifiees++;
      }
    }
    // Ancres de sécurité : si le parsing cassait, la boucle ne vérifierait rien.
    expect(intervallesVerifies).toBe(10);
    expect(lignesVerifiees).toBe(7);
  });

  it("n'introduit les lignes droites en Z5 qu'à la fin du bloc 1, puis les entretient", () => {
    const estLigneDroite = (x) =>
      /lignes droites/.test(x.description) && zonesSecondairesDe(x).includes('Z5');
    const semainesAvecLignes = P5.semainesContenu
      .filter((s) => s.seances.some(estLigneDroite))
      .map((s) => s.numero);

    expect(semainesAvecLignes).toEqual([3, 5, 6, 11, 12, 15]);

    const finBloc1 = Math.max(
      ...P5.semainesContenu.filter((s) => s.phase === 'bloc1').map((s) => s.numero),
    );
    expect(finBloc1).toBe(3);
    expect(semainesAvecLignes[0]).toBe(finBloc1);

    // Jamais dans une semaine plus douce, jamais dans une semaine de vitesse,
    // jamais en récupération active, jamais dans une des deux semaines de
    // course.
    for (const n of P5.semainesContenu.filter((s) => s.phase === 'allegee').map((s) => s.numero)) {
      expect(semainesAvecLignes).not.toContain(n);
    }
    for (const n of [7, 10, 13, 16]) expect(semainesAvecLignes).not.toContain(n);

    // Toujours en fin d'endurance fondamentale, au format prescrit.
    for (const s of P5.semainesContenu) {
      for (const seance of s.seances.filter(estLigneDroite)) {
        expect(seance.code).toBe('EF');
        expect(seance.description).toMatch(/[46] lignes droites de (15|20) s en Z5/);
        expect(seance.description).toMatch(/marche/);
      }
    }
  });

  // La veille d'Izon porte bien quatre accélérations, mais en Z4 : ce sont des
  // lignes droites de réveil, pas de travail, et elles sont déclarées comme
  // telles pour ne pas être comptées avec les autres.
  it('tient les lignes droites de la veille du dossard en Z4, jamais en Z5', () => {
    const veille = P5.semainesContenu[8].seances.find((x) => /lignes droites/.test(x.description));
    expect(veille.code).toBe('EF');
    expect(zonesSecondairesDe(veille)).toEqual(['Z4']);
    expect(veille.description).not.toMatch(/Z5/);
  });

  it('réduit le renfo sur les deux semaines qui précèdent la course', () => {
    const dureeRenfo = (s) => s.seances.find((x) => x.code === 'RENFO').duree;
    const pic = Math.max(...P5.semainesContenu.map(dureeRenfo));
    expect(dureeRenfo(P5.semainesContenu[14])).toBeLessThan(pic);
    expect(dureeRenfo(P5.semainesContenu[15])).toBeLessThan(dureeRenfo(P5.semainesContenu[14]));
  });

  it("n'impose jamais d'allure en min/km ni de vitesse chiffrée", () => {
    const textes = toutesLesSeances().map((x) => x.description).join(' ');
    expect(textes).not.toMatch(/min\/km/);
    expect(textes).not.toMatch(/km\/h/);
  });

  it("n'emploie jamais de tiret cadratin dans les textes affichés", () => {
    const textes = P5.semainesContenu.flatMap((s) => [
      s.titre,
      s.intention,
      ...s.seances.flatMap((x) => [x.titre, x.description, x.objectif]),
    ]);
    expect(textes.join(' ')).not.toContain('—');
  });

  it('donne à chaque séance une description exécutable et un objectif rédigé', () => {
    for (const seance of toutesLesSeances()) {
      expect(seance.description.length).toBeGreaterThan(30);
      expect(seance.objectif.length).toBeGreaterThan(15);
    }
  });

  it("varie les textes, aucune description ni aucun objectif n'est répété dans le programme", () => {
    const descriptions = toutesLesSeances().map((x) => x.description);
    const objectifs = toutesLesSeances().map((x) => x.objectif);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(new Set(objectifs).size).toBe(objectifs.length);
    // Les titres et intentions de semaine varient aussi.
    const titres = P5.semainesContenu.map((s) => s.titre);
    expect(new Set(titres).size).toBe(titres.length);
  });
});

it('P5 est la plus longue préparation du projet et reste au format 10 km de P2', () => {
  const pic = (p) => Math.max(...p.semainesContenu.map(volumeHorsCourse));
  const longue = (p) =>
    Math.max(
      ...p.semainesContenu.flatMap((s) => s.seances.filter((x) => x.code === 'SL').map((x) => x.duree)),
    );
  expect(P5.semainesContenu.length).toBeGreaterThan(P2.semainesContenu.length);
  // Même distance objectif, donc même plafond de sortie longue et même ordre de
  // grandeur de pic que P2, malgré une semaine de préparation de plus.
  expect(longue(P5)).toBe(longue(P2));
  expect(Math.abs(pic(P5) - pic(P2))).toBeLessThanOrEqual(15);
});

// ---------------------------------------------------------------------------
// Registre des programmes, prepa-api/src/programmes/index.js. C'est la pièce
// que le Worker interroge pour servir une semaine à un coureur : PROGRAMMES,
// programme(code) et semaineDuProgramme(code, numero, { faitIzon }).
// ---------------------------------------------------------------------------
describe('registre (src/programmes/index.js)', () => {
  it('expose les cinq programmes, dans l\'ordre P1 à P5', () => {
    expect(Object.keys(REGISTRE_PROGRAMMES)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
    expect(REGISTRE_PROGRAMMES).toEqual({ P1, P2, P3, P4, P5 });
  });

  it('programme() lève une erreur en français sur un code inconnu', () => {
    expect(() => programme('P9')).toThrow(/Programme inconnu/);
    expect(() => programme('P9')).toThrow(/P9/);
  });

  it('résout la variante avecIzon avec une séance COURSE, et sansIzon sans', () => {
    const avec = semaineDuProgramme('P3', 9, { faitIzon: true });
    const sans = semaineDuProgramme('P3', 9, { faitIzon: false });
    expect(avec.seances.some((s) => s.code === 'COURSE')).toBe(true);
    expect(sans.seances.some((s) => s.code === 'COURSE')).toBe(false);
  });

  // Verrou de la correction demandée par le brief. Chaque variante de S9 porte
  // sa propre phase : sansIzon est une semaine de bloc normale (bloc3),
  // avecIzon est une semaine allégée puisque le coureur court le dimanche
  // (allegee). La semaine porteuse, elle, n'expose par défaut que la phase de
  // sansIzon dans son propre champ `phase`. Une résolution qui recopierait ce
  // champ-là au lieu de celui de la variante réellement choisie renverrait,
  // pour faitIzon: true, une semaine allégée étiquetée comme une semaine de
  // bloc. C'est précisément le bug du code de départ du brief, qui ne
  // recopiait que seances, titre et intention.
  it('retourne la phase de la variante choisie, pas celle de la semaine porteuse', () => {
    const s9Brute = P3.semainesContenu.find((s) => s.numero === 9);
    expect(s9Brute.phase).toBe('bloc3'); // phase par défaut de la semaine porteuse
    expect(s9Brute.variantes.sansIzon.phase).toBe('bloc3');
    expect(s9Brute.variantes.avecIzon.phase).toBe('allegee');

    const avec = semaineDuProgramme('P3', 9, { faitIzon: true });
    const sans = semaineDuProgramme('P3', 9, { faitIzon: false });

    expect(avec.phase).toBe('allegee');
    expect(sans.phase).toBe('bloc3');

    // Preuve par mutation : si semaineDuProgramme reprenait la phase de la
    // semaine porteuse (s.phase) au lieu de celle de la variante (v.phase),
    // avec.phase vaudrait 'bloc3' comme s9Brute.phase, et cette assertion
    // échouerait alors qu'elle passe avec le code corrigé.
    expect(avec.phase).not.toBe(s9Brute.phase);
  });

  it('ne réexpose plus le champ variantes sur la semaine résolue', () => {
    const avec = semaineDuProgramme('P3', 9, { faitIzon: true });
    const sans = semaineDuProgramme('P3', 9, { faitIzon: false });
    expect(avec).not.toHaveProperty('variantes');
    expect(sans).not.toHaveProperty('variantes');
  });

  // Un objet semaine() ne porte que cinq champs : numero, phase, titre,
  // intention, seances (voir semaine() dans seances.js). Ce test énumère les
  // quatre qui viennent de la variante et vérifie qu'aucun n'est perdu ; le
  // cinquième, numero, est partagé par construction entre la semaine porteuse
  // et ses deux variantes, donc indifférent à la source.
  it('ne perd aucun champ de la variante à la résolution (numero, phase, titre, intention, seances)', () => {
    const s9Brute = P4.semainesContenu.find((s) => s.numero === 9);
    const avec = semaineDuProgramme('P4', 9, { faitIzon: true });
    expect(avec).toEqual({
      numero: s9Brute.numero,
      phase: s9Brute.variantes.avecIzon.phase,
      titre: s9Brute.variantes.avecIzon.titre,
      intention: s9Brute.variantes.avecIzon.intention,
      seances: s9Brute.variantes.avecIzon.seances,
    });
    expect(Object.keys(avec).sort()).toEqual(['intention', 'numero', 'phase', 'seances', 'titre']);
  });

  it("sur un programme sans variante (P1 ou P5), l'option faitIzon est sans effet", () => {
    const p1Avec = semaineDuProgramme('P1', 1, { faitIzon: true });
    const p1Sans = semaineDuProgramme('P1', 1, { faitIzon: false });
    expect(p1Avec).toEqual(p1Sans);
    expect(p1Avec.numero).toBe(1);
    expect(p1Avec).not.toHaveProperty('variantes');

    // P5 court Izon à l'objectif directement en S9, sans aucune variante : la
    // séance COURSE est déjà présente que faitIzon vaille true ou false.
    const p5Avec = semaineDuProgramme('P5', 9, { faitIzon: true });
    const p5Sans = semaineDuProgramme('P5', 9, { faitIzon: false });
    expect(p5Avec).toEqual(p5Sans);
    expect(p5Avec.seances.some((s) => s.code === 'COURSE')).toBe(true);
  });

  it('retourne null pour un numéro de semaine hors bornes', () => {
    expect(semaineDuProgramme('P1', 0)).toBeNull();
    expect(semaineDuProgramme('P1', 11)).toBeNull(); // P1 s'arrête à S10
    expect(semaineDuProgramme('P3', 17)).toBeNull(); // P3 s'arrête à S16
    expect(semaineDuProgramme('P5', 18)).toBeNull(); // P5 s'arrête à S17
  });
});
