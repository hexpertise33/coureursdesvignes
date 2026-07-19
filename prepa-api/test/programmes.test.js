import { describe, it, expect } from 'vitest';
import { ZONES, ef, sl, vma, seuil, recup, renfo, course, semaine, volume, volumeHorsCourse, zonesSecondairesDe, identifiantSeance, identifierSeances } from '../src/programmes/seances.js';
import { verifierProgramme } from '../src/programmes/regles.js';
import { P1 } from '../src/programmes/p1-10km-izon.js';
import { P2 } from '../src/programmes/p2-10km-bordeaux.js';
import { P3 } from '../src/programmes/p3-semi-bordeaux.js';
import { P4 } from '../src/programmes/p4-marathon.js';
import { P5 } from '../src/programmes/p5-10km-paris.js';
import { P6 } from '../src/programmes/p6-16km-andernos.js';
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
    // Reproduit le barème réel de P1 après recalibrage (165, 175, 190, 160,
    // 192, 200, 208, 165, 75, 120). Le couple S3 / S4 y est volontairement au
    // plus serré que le garde-fou autorise : 160 vaut 84,2 % de 190, juste
    // sous la limite des -15 %.
    const p = prog([
      sem(1, 'bloc1', 50, 52, 63),
      sem(2, 'bloc1', 55, 55, 65),
      sem(3, 'bloc1', 60, 60, 70),
      sem(4, 'allegee', 50, 50, 60),
      sem(5, 'bloc2', 55, 65, 72),
      sem(6, 'bloc2', 58, 68, 74),
      sem(7, 'bloc2', 65, 68, 75),
      sem(8, 'affutage', 50, 55, 60),
      semAvecCourse(9, 'affutage', 35, 40, 55),
      semaine(10, 'recuperation', 'Titre', 'Intention.', [
        recup(35, 'a.', 'b.'), recup(40, 'a.', 'b.'), recup(45, 'a.', 'b.'), renfo(15, 'a.', 'b.'),
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
    // Prérequis recalibré : le public du club n'est pas débutant. « Savoir
    // courir 30 minutes d'affilée » décrivait un coureur qui n'existe pas dans
    // ce groupe, où tout le monde court le 10 km en moins d'une heure et sort
    // déjà 1 h 15 le dimanche.
    expect(P1.prerequis).toMatch(/1 h 15/);
    expect(P1.prerequis).toMatch(/moins d'une heure/);
    expect(P1.prerequis).not.toMatch(/30 minutes/);
  });

  it('suit la trame de phases imposée, S1 à S3 bloc 1, S4 allégée, S5 à S7 bloc 2', () => {
    expect(P1.semainesContenu.map((s) => s.phase)).toEqual([
      'bloc1', 'bloc1', 'bloc1', 'allegee', 'bloc2', 'bloc2', 'bloc2', 'affutage', 'affutage', 'recuperation',
    ]);
    expect(P1.semainesContenu.map((s) => s.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('respecte le barème de volumes hors course et hors renfo', () => {
    // Barème recalibré sur le niveau réel du club (tous sous l'heure au 10 km,
    // 1 h 15 le dimanche). L'ancien barème (110, 115, 125, 100, 130, 140, 147,
    // 115, 53, 90) était celui d'un plan pour débutants et alignait des séances
    // de 30 et 35 min sans objet pour ce public.
    //
    // Le point serré est le couple S3 / S4 : une semaine normale ne peut pas
    // descendre sous 50 + 50 + 60 = 160 min (plancher de 50 min par séance,
    // sortie longue à 60 min minimum), et la semaine allégée doit tomber à
    // 85 % ou moins de la précédente. S3 ne pouvait donc pas valoir moins de
    // 160 / 0,85 = 189 min. D'où S3 à 190 et S4 exactement au plancher.
    expect(P1.semainesContenu.map(volumeHorsCourse)).toEqual([165, 175, 190, 160, 192, 200, 208, 165, 75, 120]);
  });

  // Garde-fou de durée demandé par l'encadrant : « on ne peut pas faire de
  // séances de 35 min, on doit faire des séances de 50 min minimum, à 1 h 15
  // pour la sortie longue ». Les deux seules exceptions sont assumées et
  // portées par le texte des séances : la semaine de course et la semaine de
  // récupération, où la brièveté est le but recherché.
  it('tient le plancher de 50 min hors semaine de course et de récupération', () => {
    const EXCEPTIONS = new Set([9, 10]);
    let verifiees = 0;
    for (const s of P1.semainesContenu) {
      if (EXCEPTIONS.has(s.numero)) continue;
      for (const seance of s.seances.filter((x) => x.code !== 'RENFO')) {
        expect(
          seance.duree,
          `P1 S${s.numero} ${seance.id} : ${seance.duree} min, sous le plancher de 50 min.`,
        ).toBeGreaterThanOrEqual(50);
        verifiees++;
      }
    }
    expect(verifiees).toBe(24); // 8 semaines normales x 3 séances de course.
  });

  it('tient la sortie longue entre 60 et 75 min', () => {
    const longues = P1.semainesContenu.flatMap((s) => s.seances).filter((x) => x.code === 'SL');
    expect(longues.map((x) => x.duree)).toEqual([63, 65, 70, 60, 72, 74, 75, 60]);
    for (const x of longues) {
      expect(x.duree).toBeGreaterThanOrEqual(60);
      expect(x.duree).toBeLessThanOrEqual(75);
    }
  });

  // Les séances courtes de S9 et S10 ne sont pas un oubli de calibrage. Elles
  // doivent le dire au coureur, qui vient de passer huit semaines à une heure
  // et plus et lirait sinon une erreur de saisie.
  it('assume par écrit la brièveté des séances de la semaine de course et de la récupération', () => {
    for (const numero of [9, 10]) {
      const s = P1.semainesContenu[numero - 1];
      const textes = [s.intention, ...s.seances.map((x) => x.description)].join(' ');
      expect(
        /but|voulu|dessein|exactement|pas un oubli|volontairement/i.test(textes),
        `P1 S${numero} : rien n'explique au coureur pourquoi les séances sont courtes.`,
      ).toBe(true);
    }
  });

  // Barème d'échauffement de l'encadrant, fondé sur la durée déclarée :
  // 40 min et moins 12/7, 41 à 50 min 15/8, plus de 50 min 20/10. Sept des
  // neuf séances de qualité dépassent 50 min et tombent sur le 20/10 qui est
  // son standard ; les deux autres sont les deux séances volontairement
  // courtes du programme, la côte de la semaine allégée et le rappel de la
  // semaine de course.
  //
  // Le retour au calme est repéré par son libellé complet et non par le
  // dernier « puis N min » de la phrase : la séance de tempo continu de S2
  // compte un segment de trottinement en Z1 entre l'effort et le retour au
  // calme, et un repérage positionnel lirait ce segment-là.
  it("applique le barème d'échauffement à toutes les séances de qualité", () => {
    const palier = (duree) => (duree <= 40 ? [12, 7] : duree <= 50 ? [15, 8] : [20, 10]);
    const QUALITE = new Set(['TEMPO', 'SEUIL', 'VMA']);
    const observees = [];
    for (const s of P1.semainesContenu) {
      for (const seance of s.seances.filter((x) => QUALITE.has(x.code))) {
        const m = seance.description.match(
          /^(\d+) min[^.]*?en Z2[^.]*?, puis .*?, puis (\d+) min de retour au calme/,
        );
        expect(m, `P1 S${s.numero} ${seance.code} : échauffement illisible.`).not.toBeNull();
        expect(
          [Number(m[1]), Number(m[2])],
          `P1 S${s.numero} ${seance.code} (${seance.duree} min) : palier d'échauffement hors barème.`,
        ).toEqual(palier(seance.duree));
        observees.push(seance.duree);
      }
    }
    // Neuf séances de qualité, une par semaine de préparation. Les durées ne
    // sont pas rondes par hasard : chacune est la seule qui loge à la fois son
    // échauffement au barème, son travail, ses récupérations et son retour au
    // calme (voir le test de réconciliation juste en dessous). L'endurance
    // fondamentale de chaque semaine absorbe l'écart, le barème de volumes est
    // inchangé et vérifié plus haut.
    expect(observees).toEqual([52, 55, 64, 50, 66, 67, 69, 55, 37]);
  });

  // Convention impérative : N répétitions donnent N-1 récupérations, et la
  // somme des segments décrits égale exactement la durée déclarée. Même
  // contrôle que sur P4 et P5.
  //
  // Le fractionné en distance ne desserre pas cette règle, il la rend
  // seulement moins évidente : un 1000 m ne dure pas le même temps pour tout
  // le monde. La séance donne donc un repère de durée par répétition, et c'est
  // ce repère qui est compté ici. Le calcul se fait en secondes pour absorber
  // les repères du type « 1 min 40 » sans arrondi : un repère qui ne
  // retomberait pas sur un compte juste (10 fois 400 m à 1 min 40, soit
  // 16 min 40 s) fait échouer ce test, et c'est voulu, c'est ce qui force le
  // choix du nombre de répétitions.
  it('réconcilie exactement la durée déclarée avec les segments décrits', () => {
    // Un repère de durée s'écrit « 4 min », « 8 min 30 », « 1 min 40 » ou
    // « 45 s ». Tout est ramené en secondes : un format qui ne retomberait pas
    // sur un compte juste (10 fois 400 m à 1 min 40 enchaînés d'une traite)
    // fait échouer ce test, et c'est voulu, c'est ce qui force le choix du
    // découpage.
    const REPERE = String.raw`\d+ min(?: \d+)?|\d+ s`;
    const enSecondes = (texte) => {
      const m = texte.trim().match(/^(?:(\d+) min(?: (\d+))?|(\d+) s)$/);
      expect(m, `Repère de durée illisible : « ${texte} »`).not.toBeNull();
      return m[3] !== undefined ? Number(m[3]) : Number(m[1]) * 60 + Number(m[2] ?? 0);
    };

    // La distance est reprise par référence arrière dans le repère : une
    // séance ne peut pas annoncer des 1000 m et chiffrer des 400 m.
    const series = new RegExp(
      String.raw`^(\d+) min[^.]*?en Z2, puis 2 séries de (\d+) fois (\d+) m en Z[1-5], ` +
        String.raw`en comptant environ (${REPERE}) par \3 m, avec (${REPERE}) de trottinement en Z1 ` +
        String.raw`entre chaque et (\d+) min entre les deux séries, puis (\d+) min de retour au calme`,
    );
    const pyramide = new RegExp(
      String.raw`^(\d+) min[^.]*?en Z2, puis (\d+) fois (\d+) m puis (\d+) fois (\d+) m en Z[1-5], ` +
        String.raw`en comptant environ (${REPERE}) par \3 m et (${REPERE}) par \5 m, ` +
        String.raw`avec (\d+) min de trottinement en Z1 entre chaque bloc, puis (\d+) min de retour au calme`,
    );
    const distances = new RegExp(
      String.raw`^(\d+) min[^.]*?en Z2, puis (\d+) fois (\d+) m en Z[1-5], ` +
        String.raw`en comptant environ (${REPERE}) par \3 m, avec (${REPERE}) de trottinement en Z1 ` +
        String.raw`entre chaque, puis (\d+) min de retour au calme`,
    );
    const continu =
      /^(\d+) min[^.]*?en Z2, puis (\d+) min en Z3 [^.]*?, puis (\d+) min de trottinement en Z1[^.]*?, puis (\d+) min de retour au calme/;
    const cotes =
      /^(\d+) min[^.]*?en Z2[^.]*?, puis (\d+) montées de (\d+) s en côte[^.]*?, avec (\d+) min de descente en marchant entre chaque, puis (\d+) min de retour au calme/;
    const lignes =
      /(\d+) min[^.]*? puis (\d+) lignes droites de (\d+) s en Z[45] avec 1 min de marche entre chaque, soit (\d+) min, puis (\d+) min/;

    const comptes = { series: 0, pyramide: 0, distances: 0, continu: 0, cotes: 0, lignes: 0 };
    const exact = (secondes, seance) =>
      expect(
        secondes,
        `${seance.code} ${seance.duree} min : segments décrits incohérents dans « ${seance.description} »`,
      ).toBe(seance.duree * 60);

    for (const seance of P1.semainesContenu.flatMap((s) => s.seances)) {
      // Deux séries de N répétitions : N-1 récupérations courtes de chaque
      // côté de la coupure ne feraient que 2N-2 alors qu'il n'y en a que
      // 2(N-1) entre deux répétitions d'une même série, plus une entre séries.
      const s = seance.description.match(series);
      if (s) {
        const n = Number(s[2]);
        exact(
          Number(s[1]) * 60 +
            2 * n * enSecondes(s[4]) +
            2 * (n - 1) * enSecondes(s[5]) +
            Number(s[6]) * 60 +
            Number(s[7]) * 60,
          seance,
        );
        comptes.series++;
        continue;
      }
      const p = seance.description.match(pyramide);
      if (p) {
        const total = Number(p[2]) + Number(p[4]);
        exact(
          Number(p[1]) * 60 +
            Number(p[2]) * enSecondes(p[6]) +
            Number(p[4]) * enSecondes(p[7]) +
            (total - 1) * Number(p[8]) * 60 +
            Number(p[9]) * 60,
          seance,
        );
        comptes.pyramide++;
        continue;
      }
      const d = seance.description.match(distances);
      if (d) {
        const n = Number(d[2]);
        exact(
          Number(d[1]) * 60 + n * enSecondes(d[4]) + (n - 1) * enSecondes(d[5]) + Number(d[6]) * 60,
          seance,
        );
        comptes.distances++;
        continue;
      }
      const c = seance.description.match(continu);
      if (c) {
        exact((Number(c[1]) + Number(c[2]) + Number(c[3]) + Number(c[4])) * 60, seance);
        comptes.continu++;
        continue;
      }
      const k = seance.description.match(cotes);
      if (k) {
        const n = Number(k[2]);
        exact(
          Number(k[1]) * 60 + n * Number(k[3]) + (n - 1) * Number(k[4]) * 60 + Number(k[5]) * 60,
          seance,
        );
        comptes.cotes++;
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
        comptes.lignes++;
      }
    }

    // Ancres de sécurité : si le parsing cassait, la boucle ne vérifierait
    // rien. Les 9 séances de qualité se répartissent en 2 séances en deux
    // séries (les 200 m de S1 et les 400 m de S3), 1 pyramide (S6), 4 blocs
    // uniques en distance (S5, S7, S8, S9), 1 tempo continu (S2) et 1 séance
    // de côte (S4).
    expect(comptes).toEqual({
      series: 2, pyramide: 1, distances: 4, continu: 1, cotes: 1, lignes: 4,
    });
    expect(comptes.series + comptes.pyramide + comptes.distances + comptes.continu + comptes.cotes).toBe(
      P1.semainesContenu.flatMap((s) => s.seances).filter((x) => ['TEMPO', 'SEUIL', 'VMA'].includes(x.code)).length,
    );
  });

  // Manque signalé par l'encadrant : le programme ne connaissait que le
  // fractionné en durée alors que, sur 10 km, l'essentiel du travail de
  // qualité se repère en mètres (« l'équivalent des 5 fois 1000, 6 fois 1000,
  // 10 fois 400 m, 12 fois 200 m »). Ces tests verrouillent le partage retenu
  // pour qu'une réécriture ultérieure ne ramène pas tout en minutes.
  describe('fractionné en distance', () => {
    const QUALITE = new Set(['TEMPO', 'SEUIL', 'VMA']);
    const seancesQualite = P1.semainesContenu.flatMap((s) =>
      s.seances.filter((x) => QUALITE.has(x.code)).map((x) => ({ semaine: s.numero, phase: s.phase, seance: x })),
    );
    const enDistance = ({ seance }) => /\d+ fois \d+ m en Z[1-5]/.test(seance.description);
    const repetitions = (description) => {
      const m = description.match(/(\d+) fois (\d+) m en Z([1-5])/);
      return m ? { n: Number(m[1]), metres: Number(m[2]), zone: `Z${m[3]}` } : null;
    };

    it('travaille bien en distance et pas seulement en durée', () => {
      const distance = seancesQualite.filter(enDistance);
      expect(
        distance.length,
        'Aucune séance de qualité en distance : le manque signalé par l\'encadrant est revenu.',
      ).toBeGreaterThanOrEqual(4);
      // Le travail soutenu en Z3 reste en minutes : un bloc de tempo ne se
      // pense pas en mètres.
      for (const { seance } of seancesQualite.filter((q) => q.seance.zone === 'Z3')) {
        expect(
          enDistance({ seance }),
          `P1 ${seance.code} : le travail en Z3 doit rester en durée, pas en distance.`,
        ).toBe(false);
      }
    });

    it('place les séances de 1000 m en Z4 dans le second bloc, jamais avant', () => {
      const mille = seancesQualite.filter((q) => repetitions(q.seance.description)?.metres === 1000);
      // Séances reines d'une prépa 10 km : les trois semaines du second bloc
      // en portent chacune une, et aucune semaine du premier bloc.
      expect(mille.map((q) => q.semaine)).toEqual([5, 6, 7]);
      for (const { semaine, phase, seance } of mille) {
        expect(seance.zone, `P1 S${semaine} : un 1000 m se court en Z4.`).toBe('Z4');
        expect(
          ['bloc2', 'affutage'].includes(phase),
          `P1 S${semaine} : séance de 1000 m en phase "${phase}", elle doit tomber dans le second bloc ou après.`,
        ).toBe(true);
      }
      const premierBloc2 = Math.min(
        ...P1.semainesContenu.filter((s) => s.phase === 'bloc2').map((s) => s.numero),
      );
      expect(Math.min(...mille.map((q) => q.semaine))).toBe(premierBloc2);
      // Les trois séances au kilomètre sont trois séquences différentes : 5
      // fois 1000 m, puis une pyramide descendante qui entre par le 2000 m,
      // puis 6 fois 1000 m. Aucune n'est la précédente à laquelle on aurait
      // ajouté une répétition.
      expect(mille.map((q) => q.seance.description.match(/puis ([^,]+) en Z4/)[1])).toEqual([
        '5 fois 1000 m',
        '2 fois 2000 m puis 2 fois 1000 m',
        '6 fois 1000 m',
      ]);
    });

    it('travaille le Z5 en fractions courtes, en distance ou en côte', () => {
      const rapides = seancesQualite.filter((q) => q.seance.zone === 'Z5');
      // Quatre semaines de travail rapide, dont la toute première : la règle
      // « Z3 avant Z4 avant Z5 » ne s'applique plus à ce programme.
      expect(rapides.map((q) => q.semaine)).toEqual([1, 3, 4, 8]);
      for (const q of rapides) {
        const r = repetitions(q.seance.description);
        if (r) {
          expect(r.zone).toBe('Z5');
          expect(r.metres).toBeLessThanOrEqual(400);
          continue;
        }
        // Seule exception assumée : la côte de la semaine allégée. Une pente
        // ne se décrit pas en mètres, elle ne dure pas le même temps ni ne
        // coûte le même effort d'un coureur et d'un profil à l'autre.
        expect(
          q.semaine,
          `P1 S${q.semaine} : une séance en Z5 doit être décrite en distance, sauf la côte de S4.`,
        ).toBe(4);
        expect(q.seance.description).toMatch(/\d+ montées de \d+ s en côte/);
        expect(q.seance.description).toMatch(/descente en marchant/);
      }
    });

    it('présente le repère de durée comme une estimation et jamais comme une allure imposée', () => {
      const distance = seancesQualite.filter(enDistance);
      expect(distance.map((q) => q.semaine)).toEqual([1, 3, 5, 6, 7, 8, 9]);
      for (const { semaine, seance } of distance) {
        // Chaque séance en distance porte son repère, sinon le calcul de durée
        // ne tomberait pas juste. Le repère s'écrit en minutes ou en secondes :
        // les 200 m de S1 se comptent en secondes.
        expect(
          seance.description,
          `P1 S${semaine} : séance en distance sans repère de durée par répétition.`,
        ).toMatch(/en comptant environ (?:\d+ min(?: \d+)?|\d+ s) par \d+ m/);
        // Et chacune le dit noir sur blanc, pas seulement la première du
        // programme : un coureur ne lit que la séance du jour, et le plus lent
        // du groupe ne doit à aucun moment se croire en faute.
        expect(
          seance.description,
          `P1 S${semaine} : le repère de durée n'est pas présenté comme une estimation.`,
        ).toMatch(/estimation de planification/);
        expect(
          seance.description,
          `P1 S${semaine} : le repère de durée n'est pas démenti comme allure à tenir.`,
        ).toMatch(/jamais une allure à tenir/);
      }
      // La règle absolue du projet tient toujours.
      const textes = distance.map((q) => q.seance.description).join(' ');
      expect(textes).not.toMatch(/min\/km/);
      expect(textes).not.toMatch(/km\/h/);
    });
  });

  // ---------------------------------------------------------------------
  // Variété des séances de qualité
  // ---------------------------------------------------------------------
  //
  // Ces tests remplacent ceux qui verrouillaient l'ancienne progression
  // d'intensités (« au moins deux séances dédiées en Z3 », « place la Z3 avant
  // le premier travail en Z4 »). Correctif de l'encadrant : « ce ne sont pas
  // des débutants, donc varie les séquences ». Le programme montait par
  // paliers, Z3 puis Z4 puis Z5, et ne connaissait que deux formats sur ses
  // trois premières semaines, dont deux semaines sans aucune séance de
  // qualité. Cette règle est abandonnée pour P1 : le groupe court à l'année,
  // le travail rapide arrive dès la semaine 1, et l'exigence qui la remplace
  // est celle de la variété.
  //
  // Menu arrêté par l'encadrant, semaine par semaine. La forme attendue est
  // citée littéralement : c'est elle qui distingue une séance d'une autre, et
  // c'est elle qu'une réécriture distraite ramènerait vers un format déjà vu.
  const MENU_QUALITE = [
    { semaine: 1, phase: 'bloc1', code: 'VMA', zone: 'Z5', duree: 52, forme: '2 séries de 6 fois 200 m en Z5' },
    { semaine: 2, phase: 'bloc1', code: 'TEMPO', zone: 'Z3', duree: 55, forme: "20 min en Z3 d'un seul tenant" },
    { semaine: 3, phase: 'bloc1', code: 'VMA', zone: 'Z5', duree: 64, forme: '2 séries de 5 fois 400 m en Z5' },
    { semaine: 4, phase: 'allegee', code: 'VMA', zone: 'Z5', duree: 50, forme: '8 montées de 45 s en côte' },
    { semaine: 5, phase: 'bloc2', code: 'SEUIL', zone: 'Z4', duree: 66, forme: '5 fois 1000 m en Z4' },
    { semaine: 6, phase: 'bloc2', code: 'SEUIL', zone: 'Z4', duree: 67, forme: '2 fois 2000 m puis 2 fois 1000 m en Z4' },
    { semaine: 7, phase: 'bloc2', code: 'SEUIL', zone: 'Z4', duree: 69, forme: '6 fois 1000 m en Z4' },
    { semaine: 8, phase: 'affutage', code: 'VMA', zone: 'Z5', duree: 55, forme: '8 fois 400 m en Z5' },
    { semaine: 9, phase: 'affutage', code: 'SEUIL', zone: 'Z4', duree: 37, forme: '5 fois 500 m en Z4' },
  ];
  const QUALITE = new Set(['TEMPO', 'SEUIL', 'VMA']);
  const qualiteDe = (s) => s.seances.filter((x) => QUALITE.has(x.code));

  it('programme une séance de qualité par semaine, de la première à la dernière', () => {
    // Neuf semaines de préparation, neuf séances. S1 et S4 n'en avaient
    // aucune : leur troisième séance de course était un second footing.
    for (const s of P1.semainesContenu.slice(0, 9)) {
      expect(
        qualiteDe(s).length,
        `P1 S${s.numero} : ${qualiteDe(s).length} séance(s) de qualité, il en faut exactement une.`,
      ).toBe(1);
    }
    // Et une seule, jamais deux : la semaine de récupération n'en porte
    // aucune, c'est le garde-fou de regles.js qui l'impose.
    expect(qualiteDe(P1.semainesContenu[9])).toEqual([]);
  });

  it('aligne neuf séances de qualité, neuf formats distincts, sans jamais répéter une séquence', () => {
    const observees = P1.semainesContenu.slice(0, 9).map((s) => {
      const [seance] = qualiteDe(s);
      return { semaine: s.numero, phase: s.phase, code: seance.code, zone: seance.zone, duree: seance.duree };
    });
    expect(observees).toEqual(MENU_QUALITE.map(({ forme, ...reste }) => reste));

    for (const attendue of MENU_QUALITE) {
      const [seance] = qualiteDe(P1.semainesContenu[attendue.semaine - 1]);
      expect(
        seance.description,
        `P1 S${attendue.semaine} : la séance ne décrit pas la séquence attendue « ${attendue.forme} ».`,
      ).toContain(attendue.forme);
    }
    // Neuf formes, neuf textes : aucune séance de qualité n'est la variante
    // d'une autre.
    expect(new Set(MENU_QUALITE.map((q) => q.forme)).size).toBe(9);
    const descriptions = P1.semainesContenu.slice(0, 9).map((s) => qualiteDe(s)[0].description);
    expect(new Set(descriptions).size).toBe(9);
    // Trois zones de travail, et chacune revient dans plusieurs phases : la
    // trame n'est plus un escalier d'intensités.
    expect(new Set(MENU_QUALITE.map((q) => q.zone))).toEqual(new Set(['Z3', 'Z4', 'Z5']));
  });

  it("abandonne la progression Z3 avant Z4 avant Z5 : la vitesse arrive dès la semaine 1", () => {
    const numeroPremiereZone = (zone) =>
      P1.semainesContenu.find((s) => s.seances.some((x) => QUALITE.has(x.code) && x.zone === zone))?.numero;
    expect(numeroPremiereZone('Z5')).toBe(1);
    // L'ordre d'apparition est exactement l'inverse de l'ancien.
    expect(numeroPremiereZone('Z5')).toBeLessThan(numeroPremiereZone('Z3'));
    expect(numeroPremiereZone('Z3')).toBeLessThan(numeroPremiereZone('Z4'));
    // Le premier bloc à lui seul emploie deux zones de travail et trois
    // formats, là où il n'en connaissait qu'un.
    const bloc1 = P1.semainesContenu.filter((s) => s.phase === 'bloc1').flatMap(qualiteDe);
    expect(new Set(bloc1.map((x) => x.zone))).toEqual(new Set(['Z3', 'Z5']));
  });

  it('donne à chaque séance de qualité un objectif qui lui est propre', () => {
    // Neuf séances différentes veulent dire neuf raisons d'exister, pas neuf
    // variations d'une même phrase. Le contrôle porte sur les mots pleins :
    // deux objectifs peuvent partager « la » et « de », pas leur substance.
    const objectifs = P1.semainesContenu.slice(0, 9).map((s) => qualiteDe(s)[0].objectif);
    expect(new Set(objectifs).size).toBe(9);
    const motsPleins = (texte) =>
      new Set(
        texte
          .toLowerCase()
          .split(/[^a-zà-öø-ÿ0-9]+/)
          .filter((mot) => mot.length > 5),
      );
    for (let i = 0; i < objectifs.length; i++) {
      for (let j = i + 1; j < objectifs.length; j++) {
        const [a, b] = [motsPleins(objectifs[i]), motsPleins(objectifs[j])];
        const communs = [...a].filter((mot) => b.has(mot));
        const recouvrement = communs.length / Math.min(a.size, b.size);
        expect(
          recouvrement,
          `P1 S${i + 1} et S${j + 1} : objectifs trop proches (${communs.join(', ')}).`,
        ).toBeLessThan(0.5);
      }
    }
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

  // La semaine 1 de P1 alignait deux endurances fondamentales avant que sa
  // troisième séance de course ne devienne une séance de qualité. Le cas des
  // séances homonymes est désormais porté, dans ce programme, par la semaine
  // de récupération et ses trois footings.
  it('la semaine 10 de P1 distingue bien ses trois footings de récupération', () => {
    const s10 = semaineDuProgramme('P1', 10, { faitIzon: false });
    expect(s10.seances.map((s) => s.code)).toEqual(['RECUP', 'RECUP', 'RECUP', 'RENFO']);
    expect(s10.seances.map((s) => s.id)).toEqual(['RECUP-1', 'RECUP-2', 'RECUP-3', 'RENFO-1']);
    // Trois séances distinctes, pas une saisie en triple : descriptions et
    // durées diffèrent.
    expect(new Set(s10.seances.map((s) => s.description)).size).toBe(4);
    expect(s10.seances.slice(0, 3).map((s) => s.duree)).toEqual([35, 40, 45]);
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
    // défaut qu'il couvre, et il faudrait s'en apercevoir. Il est passé de 57
    // à 53 quand les semaines 1 et 4 de P1 ont troqué leur second footing
    // contre une séance de qualité, puis de 53 à 37 au recalibrage de P2 et de
    // P5 : chacun des deux y a perdu quatre semaines à double footing (S1, S4,
    // S8 et S12 pour P2, S1, S4, S8 et S14 pour P5), désormais pourvues d'une
    // séance de qualité, et chaque semaine est lue deux fois. Il est enfin
    // tombé de 37 à 17 au recalibrage de P3 et de P4 : chacun y a perdu cinq
    // semaines à double footing (S1, S4, S8, S12 et S13), qui portent
    // désormais toutes une séance de qualité. Ne restent que les trois
    // semaines de récupération finale à trois footings (P1, P3, P4 pour ce qui
    // les concerne, plus P2 et P5), lues deux fois chacune, et les deux
    // variantes à dossard de P3 et P4, lues une seule fois.
    //
    // L'arrivée de P6 ajoute 10 semaines de plan, soit 20 résolutions et 80
    // séances de plus. P6 n'ayant aucune semaine à variante, ses dix semaines
    // sont simplement lues deux fois à l'identique. Une seule d'entre elles
    // porte des séances homonymes, sa récupération finale à trois footings,
    // d'où deux résolutions supplémentaires à homonymes : toutes ses semaines
    // de préparation alignent une endurance, une séance de qualité, une sortie
    // longue et un renfo, quatre codes distincts.
    expect(semainesBalayees).toBe(170);
    expect(semainesAHomonymes).toBe(19);
    expect(seancesBalayees).toBe(680);
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
    for (const p of [P1, P2, P3, P4, P5, P6]) expect(PROGRAMMES).toContain(p);
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
// Réconciliation des durées, moteur partagé par P2 et P5.
// ---------------------------------------------------------------------------
//
// Convention impérative du projet : N répétitions donnent N-1 récupérations, et
// la somme des segments décrits égale exactement la durée déclarée en premier
// argument de la séance. P1 porte déjà sa propre version de ce contrôle, écrite
// pour ses formats à lui. P2 et P5 partagent celle-ci parce qu'ils partagent la
// même grammaire de séance depuis leur recalibrage.
//
// Le fractionné en distance ne desserre pas la règle, il la rend seulement
// moins évidente : un 1000 m ne dure pas le même temps pour tout le monde. La
// séance donne donc un repère de durée par répétition, et c'est ce repère qui
// est compté ici. Tout est ramené en secondes pour absorber les « 1 min 40 » et
// les « 2 min 10 » sans arrondi : un format qui ne retomberait pas sur un compte
// juste fait échouer ce test, et c'est voulu, c'est ce qui force le choix du
// nombre de répétitions et de la récupération.
const REPERE_DUREE = String.raw`\d+ min(?: \d+)?|\d+ s`;

function secondesDuRepere(texte) {
  const m = texte.trim().match(/^(?:(\d+) min(?: (\d+))?|(\d+) s)$/);
  expect(m, `Repère de durée illisible : « ${texte} »`).not.toBeNull();
  return m[3] !== undefined ? Number(m[3]) : Number(m[1]) * 60 + Number(m[2] ?? 0);
}

// Les six grammaires employées par P2 et P5, plus les lignes droites. La
// distance est reprise par référence arrière dans le repère : une séance ne peut
// pas annoncer des 1000 m et chiffrer des 400 m.
const GRAMMAIRES = {
  // K séries de N répétitions : K(N-1) récupérations courtes, plus K-1 longues.
  series: new RegExp(
    String.raw`^(\d+) min[^.]*?en Z2, puis (\d+) séries de (\d+) fois (\d+) m en Z[1-5], ` +
      String.raw`en comptant environ (${REPERE_DUREE}) par \4 m, avec (${REPERE_DUREE}) de trottinement ` +
      String.raw`en Z1 entre chaque et (${REPERE_DUREE}) entre les (?:deux )?séries, ` +
      String.raw`puis (\d+) min de retour au calme`,
  ),
  // A répétitions d'une distance puis B d'une autre, récupération unique.
  mixte: new RegExp(
    String.raw`^(\d+) min[^.]*?en Z2, puis (\d+) fois (\d+) m puis (\d+) fois (\d+) m en Z[1-5], ` +
      String.raw`en comptant environ (${REPERE_DUREE}) par \3 m et (${REPERE_DUREE}) par \5 m, ` +
      String.raw`avec (${REPERE_DUREE}) de trottinement en Z1 entre chaque bloc, ` +
      String.raw`puis (\d+) min de retour au calme`,
  ),
  // « entre les deux » est accepté au même titre que « entre chaque » : une
  // séance à deux répétitions seulement (les 2 fois 3000 m de P3) ne peut pas
  // s'écrire autrement en français correct. La convention de calcul, elle, ne
  // bouge pas : N répétitions, N-1 récupérations.
  simple: new RegExp(
    String.raw`^(\d+) min[^.]*?en Z2, puis (\d+) fois (\d+) m en Z[1-5], ` +
      String.raw`en comptant environ (${REPERE_DUREE}) par \3 m, avec (${REPERE_DUREE}) de trottinement ` +
      String.raw`en Z1 entre (?:chaque|les deux), puis (\d+) min de retour au calme`,
  ),
  continu:
    /^(\d+) min[^.]*?en Z2, puis (\d+) min en Z3 [^.]*?, puis (\d+) min de trottinement en Z1[^.]*?, puis (\d+) min de retour au calme/,
  duree:
    /^(\d+) min[^.]*?en Z2, puis (\d+) fois (\d+) min en Z3 avec (\d+) min de trottinement en Z1 entre (?:chaque|les deux), puis (\d+) min de retour au calme/,
  cotes: new RegExp(
    String.raw`^(\d+) min[^.]*?en Z2[^.]*?, puis (\d+) montées de (${REPERE_DUREE}) en côte[^.]*?, ` +
      String.raw`avec (${REPERE_DUREE}) de descente en marchant entre chaque, ` +
      String.raw`puis (\d+) min de retour au calme`,
  ),
  lignes:
    /(\d+) min[^.]*? puis (\d+) lignes droites de (\d+) s en Z[45] avec 1 min de marche entre chaque, soit (\d+) min, puis (\d+) min/,
};

/**
 * Vérifie la réconciliation de toutes les séances passées et rend le décompte
 * par grammaire. Le décompte est asserté par l'appelant : sans lui, un parsing
 * cassé ferait passer le test en ne vérifiant rien.
 */
function reconcilier(seances, etiquette) {
  const comptes = { series: 0, mixte: 0, simple: 0, continu: 0, duree: 0, cotes: 0, lignes: 0 };
  const exact = (secondes, seance) =>
    expect(
      secondes,
      `${etiquette} ${seance.code} ${seance.duree} min : segments décrits incohérents dans « ${seance.description} »`,
    ).toBe(seance.duree * 60);

  for (const seance of seances) {
    const s = seance.description.match(GRAMMAIRES.series);
    if (s) {
      const [k, n] = [Number(s[2]), Number(s[3])];
      exact(
        Number(s[1]) * 60 +
          k * n * secondesDuRepere(s[5]) +
          k * (n - 1) * secondesDuRepere(s[6]) +
          (k - 1) * secondesDuRepere(s[7]) +
          Number(s[8]) * 60,
        seance,
      );
      comptes.series++;
      continue;
    }
    const m = seance.description.match(GRAMMAIRES.mixte);
    if (m) {
      const [a, b] = [Number(m[2]), Number(m[4])];
      exact(
        Number(m[1]) * 60 +
          a * secondesDuRepere(m[6]) +
          b * secondesDuRepere(m[7]) +
          (a + b - 1) * secondesDuRepere(m[8]) +
          Number(m[9]) * 60,
        seance,
      );
      comptes.mixte++;
      continue;
    }
    const d = seance.description.match(GRAMMAIRES.simple);
    if (d) {
      const n = Number(d[2]);
      exact(
        Number(d[1]) * 60 +
          n * secondesDuRepere(d[4]) +
          (n - 1) * secondesDuRepere(d[5]) +
          Number(d[6]) * 60,
        seance,
      );
      comptes.simple++;
      continue;
    }
    const c = seance.description.match(GRAMMAIRES.continu);
    if (c) {
      exact((Number(c[1]) + Number(c[2]) + Number(c[3]) + Number(c[4])) * 60, seance);
      comptes.continu++;
      continue;
    }
    const t = seance.description.match(GRAMMAIRES.duree);
    if (t) {
      const n = Number(t[2]);
      exact(
        (Number(t[1]) + n * Number(t[3]) + (n - 1) * Number(t[4]) + Number(t[5])) * 60,
        seance,
      );
      comptes.duree++;
      continue;
    }
    const k = seance.description.match(GRAMMAIRES.cotes);
    if (k) {
      const n = Number(k[2]);
      exact(
        Number(k[1]) * 60 +
          n * secondesDuRepere(k[3]) +
          (n - 1) * secondesDuRepere(k[4]) +
          Number(k[5]) * 60,
        seance,
      );
      comptes.cotes++;
      continue;
    }
    const l = seance.description.match(GRAMMAIRES.lignes);
    if (l) {
      const [, ech, n, secondes, bloc, retour] = l.map(Number);
      // Le bloc de lignes droites est logé À L'INTÉRIEUR de la durée déclarée :
      // il ne s'ajoute pas au footing, il en fait partie.
      expect((n * secondes) / 60 + (n - 1)).toBe(bloc);
      expect(
        ech + bloc + retour,
        `${etiquette} ${seance.code} ${seance.duree} min : lignes droites mal logées dans « ${seance.description} »`,
      ).toBe(seance.duree);
      comptes.lignes++;
    }
  }
  return comptes;
}

/**
 * Barème d'échauffement de l'encadrant, fondé sur la durée déclarée :
 * 40 min et moins 12/7, 41 à 50 min 15/8, plus de 50 min 20/10. Le retour au
 * calme est repéré par son libellé complet et non par le dernier « puis N min »
 * de la phrase : un tempo continu compte un segment de trottinement en Z1 entre
 * l'effort et le retour au calme, et un repérage positionnel lirait celui-là.
 */
function verifierPaliersEchauffement(programme, etiquette) {
  const palier = (duree) => (duree <= 40 ? [12, 7] : duree <= 50 ? [15, 8] : [20, 10]);
  const QUALITE = new Set(['TEMPO', 'SEUIL', 'VMA']);
  const observees = [];
  for (const sem of programme.semainesContenu) {
    const seances = [...sem.seances, ...(sem.variantes ? sem.variantes.avecIzon.seances : [])];
    for (const seance of seances.filter((x) => QUALITE.has(x.code))) {
      const m = seance.description.match(
        /^(\d+) min[^.]*?en Z2[^.]*?, puis .*?, puis (\d+) min de retour au calme/,
      );
      expect(m, `${etiquette} S${sem.numero} ${seance.code} : échauffement illisible.`).not.toBeNull();
      expect(
        [Number(m[1]), Number(m[2])],
        `${etiquette} S${sem.numero} ${seance.code} (${seance.duree} min) : palier d'échauffement hors barème.`,
      ).toEqual(palier(seance.duree));
      observees.push(seance.duree);
    }
  }
  return observees;
}

/**
 * Objectifs réellement distincts. Le contrôle porte sur les mots pleins : deux
 * objectifs peuvent partager « la » et « de », pas leur substance. Une
 * trentaine de séances de qualité veut dire une trentaine de raisons d'exister,
 * pas trente variations d'une même phrase.
 */
function verifierObjectifsDistincts(objectifs, etiquette, reperes) {
  expect(new Set(objectifs).size).toBe(objectifs.length);
  const motsPleins = (texte) =>
    new Set(
      texte
        .toLowerCase()
        .split(/[^a-zà-öø-ÿ0-9]+/)
        .filter((mot) => mot.length > 5),
    );
  for (let i = 0; i < objectifs.length; i++) {
    for (let j = i + 1; j < objectifs.length; j++) {
      const [a, b] = [motsPleins(objectifs[i]), motsPleins(objectifs[j])];
      const communs = [...a].filter((mot) => b.has(mot));
      expect(
        communs.length / Math.min(a.size, b.size),
        `${etiquette} ${reperes[i]} et ${reperes[j]} : objectifs trop proches (${communs.join(', ')}).`,
      ).toBeLessThan(0.5);
    }
  }
}

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
  // Le plancher de P2 est passé de 50 à 60 min avec son recalibrage : la
  // fourchette de sortie longue de l'encadrant est 60 à 75 min, 1 h 15 étant
  // l'habitude du dimanche de ce groupe et le plafond utile sur un 10 km.
  // Le plancher de P3 est passé de 75 à 80 min avec son recalibrage : sa
  // sortie longue part de 1 h 15, l'habitude du dimanche de ce groupe, et monte
  // jusqu'à 1 h 45, plafond utile sur un semi.
  ['P2', P2, TRAME_CYCLES, 13, 60],
  ['P3', P3, TRAME_CYCLES, 13, 80],
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
  const QUALITE = new Set(['TEMPO', 'SEUIL', 'VMA']);
  const qualiteDe = (s) => s.seances.filter((x) => QUALITE.has(x.code));
  const toutesLesSeances = () =>
    P2.semainesContenu.flatMap((s) => [
      ...s.seances,
      ...(s.variantes ? s.variantes.avecIzon.seances : []),
    ]);

  // Menu arrêté par l'encadrant après recalibrage, semaine par semaine. La forme
  // attendue est citée littéralement : c'est elle qui distingue une séance d'une
  // autre, et c'est elle qu'une réécriture distraite ramènerait vers un format
  // déjà vu. Les quinze formes sont distinctes entre elles, et distinctes de
  // celles de P1 et de P5.
  const MENU_QUALITE = [
    { semaine: 1, phase: 'bloc1', code: 'VMA', zone: 'Z5', duree: 54, forme: '3 séries de 4 fois 200 m en Z5' },
    { semaine: 2, phase: 'bloc1', code: 'TEMPO', zone: 'Z3', duree: 58, forme: '2 fois 12 min en Z3' },
    { semaine: 3, phase: 'bloc1', code: 'VMA', zone: 'Z5', duree: 57, forme: '9 fois 400 m en Z5' },
    { semaine: 4, phase: 'allegee', code: 'VMA', zone: 'Z5', duree: 50, forme: '10 montées de 45 s en côte' },
    { semaine: 5, phase: 'bloc2', code: 'SEUIL', zone: 'Z4', duree: 60, forme: '8 fois 500 m en Z4' },
    { semaine: 6, phase: 'bloc2', code: 'SEUIL', zone: 'Z4', duree: 60, forme: '2 fois 2000 m puis 2 fois 500 m en Z4' },
    { semaine: 7, phase: 'bloc2', code: 'TEMPO', zone: 'Z3', duree: 64, forme: "30 min en Z3 d'un seul tenant" },
    { semaine: 8, phase: 'allegee', code: 'VMA', zone: 'Z5', duree: 52, forme: '2 séries de 5 fois 200 m en Z5' },
    { semaine: 9, phase: 'bloc3', code: 'SEUIL', zone: 'Z4', duree: 58, forme: '4 fois 1000 m en Z4' },
    { semaine: 10, phase: 'bloc3', code: 'SEUIL', zone: 'Z4', duree: 67, forme: '2 séries de 3 fois 1000 m en Z4' },
    { semaine: 11, phase: 'bloc3', code: 'SEUIL', zone: 'Z4', duree: 70, forme: '2 fois 2000 m puis 4 fois 500 m en Z4' },
    { semaine: 12, phase: 'allegee', code: 'VMA', zone: 'Z5', duree: 55, forme: '6 fois 400 m en Z5' },
    { semaine: 13, phase: 'bloc3', code: 'SEUIL', zone: 'Z4', duree: 70, forme: '7 fois 1000 m en Z4' },
    { semaine: 14, phase: 'affutage', code: 'SEUIL', zone: 'Z4', duree: 54, forme: '3 fois 1000 m puis 2 fois 500 m en Z4' },
    { semaine: 15, phase: 'affutage', code: 'SEUIL', zone: 'Z4', duree: 33, forme: '4 fois 500 m en Z4' },
  ];

  it("porte l'identité et le prérequis attendus", () => {
    expect(P2.code).toBe('P2');
    expect(P2.nom).toBe('10 km de Bordeaux');
    // Prérequis recalibré. « Savoir courir 30 minutes d'affilée » décrivait un
    // coureur qui n'existe pas dans ce club, où tout le monde passe sous
    // l'heure au 10 km et sort déjà 1 h 15 le dimanche.
    expect(P2.prerequis).toMatch(/1 h 15/);
    expect(P2.prerequis).toMatch(/moins d'une heure/);
    expect(P2.prerequis).not.toMatch(/30 minutes/);
  });

  it('respecte son barème de volumes hors course et hors renfo', () => {
    // Barème recalibré sur le niveau réel du club. L'ancien (100, 108, 117, 96,
    // 126, 136, 147, 122, 132, 140, 151, 126, 162, 118, 55, 90) était celui
    // d'un plan pour débutants : il ouvrait à 100 min et alignait des footings
    // de 28 et 30 min sans objet pour ce public.
    //
    // Point serré : une semaine normale ne peut pas descendre sous
    // 50 + 50 + 60 = 160 min, et une semaine plus douce doit tomber à 85 % ou
    // moins de la précédente. Toute semaine qui en précède une plus douce vaut
    // donc au moins 160 / 0,85 = 189 min. D'où S3 à 190 et S4 au plancher.
    expect(P2.semainesContenu.map(volumeHorsCourse)).toEqual([
      165, 178, 190, 160, 185, 196, 205, 172, 190, 202, 212, 175, 215, 170, 75, 120,
    ]);
    expect(volumeHorsCourse(P2.semainesContenu[8].variantes.avecIzon)).toBe(70);
  });

  // Garde-fou de durée demandé par l'encadrant : « on ne peut pas faire de
  // séances de 35 min, on doit faire des séances de 50 min minimum, à 1 h 15
  // pour la sortie longue ». Les exceptions sont assumées et portées par le
  // texte : la semaine de course et la semaine de récupération, où la brièveté
  // est le but recherché.
  it('tient le plancher de 50 min hors semaine de course et de récupération', () => {
    const EXCEPTIONS = new Set([15, 16]);
    let verifiees = 0;
    for (const s of P2.semainesContenu) {
      if (EXCEPTIONS.has(s.numero)) continue;
      for (const seance of s.seances.filter((x) => x.code !== 'RENFO')) {
        expect(
          seance.duree,
          `P2 S${s.numero} ${seance.id} : ${seance.duree} min, sous le plancher de 50 min.`,
        ).toBeGreaterThanOrEqual(50);
        verifiees++;
      }
    }
    expect(verifiees).toBe(42); // 14 semaines normales x 3 séances de course.
  });

  it('tient la sortie longue entre 60 et 75 min', () => {
    const longues = P2.semainesContenu.flatMap((s) => s.seances).filter((x) => x.code === 'SL');
    expect(longues.map((x) => x.duree)).toEqual([60, 64, 68, 60, 66, 70, 74, 64, 66, 70, 74, 64, 75, 62]);
    for (const x of longues) {
      expect(x.duree).toBeGreaterThanOrEqual(60);
      expect(x.duree).toBeLessThanOrEqual(75);
    }
    expect(Math.max(...longues.map((x) => x.duree))).toBe(75);
  });

  // Les séances courtes de la semaine de course, de la variante à dossard et de
  // la récupération ne sont pas un oubli de calibrage. Elles doivent le dire au
  // coureur, qui vient de passer des mois à une heure et plus et lirait sinon
  // une erreur de saisie.
  it('assume par écrit la brièveté des semaines de course et de récupération', () => {
    const contenus = [
      P2.semainesContenu[14],
      P2.semainesContenu[15],
      P2.semainesContenu[8].variantes.avecIzon,
    ];
    for (const s of contenus) {
      const textes = [s.intention, ...s.seances.map((x) => x.description)].join(' ');
      expect(
        /but|voulu|dessein|exactement|pas un oubli|volontairement/i.test(textes),
        `P2 S${s.numero} : rien n'explique au coureur pourquoi les séances sont courtes.`,
      ).toBe(true);
    }
  });

  it("applique le barème d'échauffement à toutes les séances de qualité", () => {
    // Quinze séances de qualité, une par semaine de préparation. Treize passent
    // 50 min et tombent sur le 20/10 standard ; la côte de la semaine plus
    // douce (50 min) et le rappel de la semaine de course (33 min) prennent les
    // paliers inférieurs.
    expect(verifierPaliersEchauffement(P2, 'P2')).toEqual([
      54, 58, 57, 50, 60, 60, 64, 52, 58, 67, 70, 55, 70, 54, 33,
    ]);
  });

  it('réconcilie exactement la durée déclarée avec les segments décrits', () => {
    const comptes = reconcilier(toutesLesSeances(), 'P2');
    // Ancre de sécurité : si le parsing cassait, la boucle ne vérifierait rien.
    // Les 15 séances de qualité se répartissent en 3 séances en séries, 3
    // enchaînements de deux distances, 6 blocs uniques en distance, 1 tempo
    // continu, 1 tempo en durée et 1 séance de côte. Les 8 blocs de lignes
    // droites comptent les 7 endurances en Z5 plus celle de la veille du
    // dossard, tenue en Z4.
    expect(comptes).toEqual({
      series: 3, mixte: 3, simple: 6, continu: 1, duree: 1, cotes: 1, lignes: 8,
    });
    expect(comptes.series + comptes.mixte + comptes.simple + comptes.continu + comptes.duree + comptes.cotes)
      .toBe(toutesLesSeances().filter((x) => QUALITE.has(x.code)).length);
  });

  it('travaille majoritairement en Z4 et Z5', () => {
    const dures = P2.semainesContenu
      .flatMap((s) => s.seances)
      .filter((x) => QUALITE.has(x.code));
    const z4z5 = dures.filter((x) => x.zone === 'Z4' || x.zone === 'Z5');
    expect(z4z5.length).toBeGreaterThan(dures.length / 2);
  });

  it('programme une séance de qualité par semaine, de la première à la dernière', () => {
    for (const s of P2.semainesContenu.slice(0, 15)) {
      expect(
        qualiteDe(s).length,
        `P2 S${s.numero} : ${qualiteDe(s).length} séance(s) de qualité, il en faut exactement une.`,
      ).toBe(1);
    }
    // La semaine de récupération n'en porte aucune, c'est le garde-fou de
    // regles.js qui l'impose. La variante à dossard non plus : la course tient
    // ce rôle.
    expect(qualiteDe(P2.semainesContenu[15])).toEqual([]);
    expect(qualiteDe(P2.semainesContenu[8].variantes.avecIzon)).toEqual([]);
  });

  it('aligne quinze séances de qualité, quinze formats distincts, sans jamais répéter une séquence', () => {
    const observees = P2.semainesContenu.slice(0, 15).map((s) => {
      const [seance] = qualiteDe(s);
      return { semaine: s.numero, phase: s.phase, code: seance.code, zone: seance.zone, duree: seance.duree };
    });
    expect(observees).toEqual(MENU_QUALITE.map(({ forme, ...reste }) => reste));

    for (const attendue of MENU_QUALITE) {
      const [seance] = qualiteDe(P2.semainesContenu[attendue.semaine - 1]);
      expect(
        seance.description,
        `P2 S${attendue.semaine} : la séance ne décrit pas la séquence attendue « ${attendue.forme} ».`,
      ).toContain(attendue.forme);
    }
    expect(new Set(MENU_QUALITE.map((q) => q.forme)).size).toBe(15);
    const descriptions = P2.semainesContenu.slice(0, 15).map((s) => qualiteDe(s)[0].description);
    expect(new Set(descriptions).size).toBe(15);
    expect(new Set(MENU_QUALITE.map((q) => q.zone))).toEqual(new Set(['Z3', 'Z4', 'Z5']));
  });

  // Correctif de l'encadrant : « ce ne sont pas des débutants, donc varie les
  // séquences ». La montée par paliers d'intensité, deux semaines de Z3 puis la
  // Z4 puis la Z5, est abandonnée pour P2.
  it("abandonne la progression Z3 avant Z4 avant Z5 : la vitesse ouvre la semaine 1", () => {
    const numeroPremiereZone = (zone) =>
      P2.semainesContenu.find((s) => s.seances.some((x) => QUALITE.has(x.code) && x.zone === zone))?.numero;
    expect(numeroPremiereZone('Z5')).toBe(1);
    expect(numeroPremiereZone('Z5')).toBeLessThan(numeroPremiereZone('Z3'));
    // Le premier cycle emploie à lui seul deux zones de travail et trois
    // formats, là où l'ancienne trame n'y mettait que de la Z3.
    const bloc1 = P2.semainesContenu.filter((s) => s.phase === 'bloc1').flatMap(qualiteDe);
    expect(new Set(bloc1.map((x) => x.zone))).toEqual(new Set(['Z3', 'Z5']));
  });

  // Manque signalé par l'encadrant : le programme ne connaissait que le
  // fractionné en durée alors que, sur 10 km, l'essentiel du travail de qualité
  // se repère en mètres.
  describe('fractionné en distance', () => {
    const seancesQualite = P2.semainesContenu
      .slice(0, 15)
      .map((s) => ({ semaine: s.numero, phase: s.phase, seance: qualiteDe(s)[0] }));
    const enDistance = ({ seance }) => /\d+ fois \d+ m en Z[1-5]/.test(seance.description);

    it('travaille bien en distance et pas seulement en durée', () => {
      const distance = seancesQualite.filter(enDistance);
      expect(distance.map((q) => q.semaine)).toEqual([1, 3, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15]);
      // Le travail soutenu en Z3 reste en minutes : un bloc de tempo ne se
      // pense pas en mètres.
      for (const q of seancesQualite.filter((x) => x.seance.zone === 'Z3')) {
        expect(
          enDistance(q),
          `P2 S${q.semaine} : le travail en Z3 doit rester en durée, pas en distance.`,
        ).toBe(false);
      }
    });

    it('réserve les séances de 1000 m à la seconde moitié, au plus près de la course', () => {
      const mille = seancesQualite.filter((q) => /\d+ fois 1000 m/.test(q.seance.description));
      expect(mille.map((q) => q.semaine)).toEqual([9, 10, 13, 14]);
      // Aucune séance au kilomètre avant l'ouverture du bloc spécifique, et le
      // premier cycle du bloc en porte deux sur trois : S11 travaille au-dessus
      // de la distance de course, sur 2000 m.
      expect(Math.min(...mille.map((q) => q.semaine))).toBe(9);
      for (const q of mille) {
        expect(q.seance.zone, `P2 S${q.semaine} : un 1000 m se court en Z4.`).toBe('Z4');
      }
      // Quatre séances au kilomètre, quatre séquences différentes : aucune
      // n'est la précédente à laquelle on aurait ajouté une répétition.
      expect(mille.map((q) => q.seance.description.match(/puis ([^,]+) en Z4/)[1])).toEqual([
        '4 fois 1000 m',
        '2 séries de 3 fois 1000 m',
        '7 fois 1000 m',
        '3 fois 1000 m puis 2 fois 500 m',
      ]);
    });

    it('travaille le Z5 en fractions courtes, en distance ou en côte', () => {
      const rapides = seancesQualite.filter((q) => q.seance.zone === 'Z5');
      expect(rapides.map((q) => q.semaine)).toEqual([1, 3, 4, 8, 12]);
      for (const q of rapides) {
        const m = q.seance.description.match(/(\d+) fois (\d+) m en Z5/);
        if (m) {
          expect(Number(m[2])).toBeLessThanOrEqual(400);
          continue;
        }
        // Seule exception assumée : la côte de la semaine plus douce. Une pente
        // ne se décrit pas en mètres, elle ne coûte pas le même effort d'un
        // profil à l'autre.
        expect(
          q.semaine,
          `P2 S${q.semaine} : une séance en Z5 doit être décrite en distance, sauf la côte de S4.`,
        ).toBe(4);
        expect(q.seance.description).toMatch(/\d+ montées de \d+ s en côte/);
        expect(q.seance.description).toMatch(/descente en marchant/);
      }
    });

    it('présente le repère de durée comme une estimation et jamais comme une allure imposée', () => {
      const distance = seancesQualite.filter(enDistance);
      for (const { semaine, seance } of distance) {
        expect(
          seance.description,
          `P2 S${semaine} : séance en distance sans repère de durée par répétition.`,
        ).toMatch(/en comptant environ (?:\d+ min(?: \d+)?|\d+ s) par \d+ m/);
        // Et chacune le dit noir sur blanc, pas seulement la première du
        // programme : un coureur ne lit que la séance du jour, et le plus lent
        // du groupe ne doit à aucun moment se croire en faute.
        expect(
          seance.description,
          `P2 S${semaine} : le repère de durée n'est pas présenté comme une estimation.`,
        ).toMatch(/estimation de planification/);
        expect(
          seance.description,
          `P2 S${semaine} : le repère de durée n'est pas démenti comme allure à tenir.`,
        ).toMatch(/jamais une allure à tenir/);
      }
      const textes = distance.map((q) => q.seance.description).join(' ');
      expect(textes).not.toMatch(/min\/km/);
      expect(textes).not.toMatch(/km\/h/);
    });
  });

  it('donne à chaque séance de qualité un objectif qui lui est propre', () => {
    const seances = P2.semainesContenu.slice(0, 15).map((s) => qualiteDe(s)[0]);
    verifierObjectifsDistincts(
      seances.map((x) => x.objectif),
      'P2',
      P2.semainesContenu.slice(0, 15).map((s) => `S${s.numero}`),
    );
  });

  it("varie les textes, aucun objectif n'est répété dans le programme", () => {
    const objectifs = toutesLesSeances().map((x) => x.objectif);
    expect(new Set(objectifs).size).toBe(objectifs.length);
  });

  it('court son objectif sur 10 km', () => {
    const objectif = P2.semainesContenu[14].seances.find((x) => x.code === 'COURSE');
    expect(objectif.distance).toBe(10);
    expect(objectif.titre).toBe('10 km de Bordeaux');
  });
});

describe('P3, semi-marathon de Bordeaux', () => {
  const QUALITE = new Set(['TEMPO', 'SEUIL', 'VMA']);
  const qualiteDe = (s) => s.seances.filter((x) => QUALITE.has(x.code));
  const toutesLesSeances = () =>
    P3.semainesContenu.flatMap((s) => [
      ...s.seances,
      ...(s.variantes ? s.variantes.avecIzon.seances : []),
    ]);

  // Menu arrêté par l'encadrant après recalibrage, semaine par semaine. La
  // forme attendue est citée littéralement : c'est elle qui distingue une
  // séance d'une autre, et c'est elle qu'une réécriture distraite ramènerait
  // vers un format déjà vu. Les répétitions longues (1000, 2000 et 3000 m)
  // portent le travail au seuil, les blocs en Z3 se comptent en minutes et
  // grandissent de S3 à S13, et le court et vif ne sert qu'à garder le pied.
  const MENU_QUALITE = [
    { semaine: 1, phase: 'bloc1', code: 'VMA', zone: 'Z5', duree: 55, forme: '3 séries de 3 fois 400 m en Z5' },
    { semaine: 2, phase: 'bloc1', code: 'SEUIL', zone: 'Z4', duree: 60, forme: '5 fois 1000 m en Z4' },
    { semaine: 3, phase: 'bloc1', code: 'TEMPO', zone: 'Z3', duree: 58, forme: '2 fois 12 min en Z3' },
    { semaine: 4, phase: 'allegee', code: 'VMA', zone: 'Z5', duree: 52, forme: '8 montées de 1 min en côte' },
    { semaine: 5, phase: 'bloc2', code: 'SEUIL', zone: 'Z4', duree: 62, forme: '3 fois 2000 m en Z4' },
    { semaine: 6, phase: 'bloc2', code: 'VMA', zone: 'Z5', duree: 58, forme: '4 séries de 3 fois 200 m en Z5' },
    { semaine: 7, phase: 'bloc2', code: 'SEUIL', zone: 'Z4', duree: 62, forme: '2 fois 3000 m en Z4' },
    { semaine: 8, phase: 'allegee', code: 'VMA', zone: 'Z5', duree: 51, forme: '10 fois 200 m en Z5' },
    { semaine: 9, phase: 'bloc3', code: 'SEUIL', zone: 'Z4', duree: 68, forme: '2 fois 2000 m puis 3 fois 1000 m en Z4' },
    { semaine: 10, phase: 'bloc3', code: 'TEMPO', zone: 'Z3', duree: 72, forme: '3 fois 12 min en Z3' },
    { semaine: 11, phase: 'bloc3', code: 'SEUIL', zone: 'Z4', duree: 73, forme: '2 fois 2000 m puis 4 fois 1000 m en Z4' },
    { semaine: 12, phase: 'allegee', code: 'SEUIL', zone: 'Z4', duree: 52, forme: '6 fois 500 m en Z4' },
    { semaine: 13, phase: 'bloc3', code: 'TEMPO', zone: 'Z3', duree: 75, forme: '2 fois 20 min en Z3' },
    { semaine: 14, phase: 'affutage', code: 'TEMPO', zone: 'Z3', duree: 63, forme: '2 fois 15 min en Z3' },
    { semaine: 15, phase: 'affutage', code: 'SEUIL', zone: 'Z4', duree: 38, forme: '5 fois 500 m en Z4' },
  ];

  it("porte l'identité et le prérequis attendus", () => {
    expect(P3.code).toBe('P3');
    expect(P3.nom).toBe('Semi-marathon de Bordeaux');
    // Prérequis recalibré. « Courir 20 km par semaine depuis 2 mois »
    // décrivait un coureur qui n'existe pas dans ce club, où tout le monde
    // passe sous l'heure au 10 km et sort déjà 1 h 15 le dimanche. Il reste
    // honnête sur ce que la distance ajoute : la sortie de 1 h 45.
    expect(P3.prerequis).toMatch(/1 h 15/);
    expect(P3.prerequis).toMatch(/moins d'une heure/);
    expect(P3.prerequis).toMatch(/1 h 45/);
    expect(P3.prerequis).not.toMatch(/20 km par semaine/);
  });

  it('respecte son barème de volumes hors course et hors renfo', () => {
    // Barème recalibré sur le niveau réel du club. L'ancien (130, 141, 152,
    // 124, 160, 172, 185, 152, 165, 176, 188, 158, 200, 140, 61, 105) était
    // celui d'un plan écrit pour des débutants : il ouvrait à 130 min et
    // alignait des footings de 35 min sans objet pour ce public.
    //
    // Point serré : la semaine 4, à 175 min contre 175,95 autorisés par la
    // règle des 15 % de baisse. C'est elle qui fixe la côte à 52 min tout rond.
    expect(P3.semainesContenu.map(volumeHorsCourse)).toEqual([
      185, 195, 207, 175, 210, 222, 233, 196, 222, 230, 240, 202, 250, 180, 78, 125,
    ]);
    expect(volumeHorsCourse(P3.semainesContenu[8].variantes.avecIzon)).toBe(70);
  });

  it('monte la sortie longue à 1 h 45 en S13, au pic de charge', () => {
    const s13 = P3.semainesContenu[12].seances.find((x) => x.code === 'SL');
    expect(s13.duree).toBe(105);
    const longues = P3.semainesContenu.flatMap((s) => s.seances.filter((x) => x.code === 'SL'));
    expect(longues.map((x) => x.duree)).toEqual([
      75, 80, 85, 70, 85, 90, 95, 80, 90, 97, 102, 85, 105, 65,
    ]);
    expect(Math.max(...longues.map((x) => x.duree))).toBe(105);
    expect(longues.filter((x) => x.duree === 105)).toHaveLength(1);
    // Fourchette de l'encadrant pour un semi : 1 h 15 de départ, 1 h 45 de
    // plafond, et rien en dessous de 1 h 05 même en affûtage.
    for (const x of longues) {
      expect(x.duree).toBeGreaterThanOrEqual(65);
      expect(x.duree).toBeLessThanOrEqual(105);
    }
  });

  // Garde-fou de durée demandé par l'encadrant : « on ne peut pas faire de
  // séances de 35 min, on doit faire des séances de 50 min minimum ». Les
  // exceptions sont assumées et portées par le texte : la semaine de course et
  // la semaine de récupération, où la brièveté est le but recherché.
  it('tient le plancher de 50 min hors semaine de course et de récupération', () => {
    const EXCEPTIONS = new Set([15, 16]);
    let verifiees = 0;
    for (const s of P3.semainesContenu) {
      if (EXCEPTIONS.has(s.numero)) continue;
      for (const seance of s.seances.filter((x) => x.code !== 'RENFO')) {
        expect(
          seance.duree,
          `P3 S${s.numero} ${seance.id} : ${seance.duree} min, sous le plancher de 50 min.`,
        ).toBeGreaterThanOrEqual(50);
        verifiees++;
      }
    }
    expect(verifiees).toBe(42); // 14 semaines normales x 3 séances de course.
  });

  it('assume par écrit la brièveté des semaines de course et de récupération', () => {
    const contenus = [
      P3.semainesContenu[14],
      P3.semainesContenu[15],
      P3.semainesContenu[8].variantes.avecIzon,
    ];
    for (const s of contenus) {
      const textes = [s.intention, ...s.seances.map((x) => x.description)].join(' ');
      expect(
        /but|voulu|dessein|exactement|pas un oubli|volontairement/i.test(textes),
        `P3 S${s.numero} : rien n'explique au coureur pourquoi les séances sont courtes.`,
      ).toBe(true);
    }
  });

  it("applique le barème d'échauffement à toutes les séances de qualité", () => {
    // Quinze séances de qualité, une par semaine de préparation. Quatorze
    // passent 50 min et tombent sur le 20/10 standard ; seul le rappel de la
    // semaine de course (38 min) prend le palier 12/7.
    expect(verifierPaliersEchauffement(P3, 'P3')).toEqual([
      55, 60, 58, 52, 62, 58, 62, 51, 68, 72, 73, 52, 75, 63, 38,
    ]);
  });

  it('réconcilie exactement la durée déclarée avec les segments décrits', () => {
    const comptes = reconcilier(toutesLesSeances(), 'P3');
    // Ancre de sécurité : si le parsing cassait, la boucle ne vérifierait rien.
    // Les 15 séances de qualité se répartissent en 2 séances en séries, 2
    // enchaînements de deux distances, 6 blocs uniques en distance, 4 séances
    // en durée (les blocs en Z3) et 1 séance de côte. Les 6 blocs de lignes
    // droites comptent les 5 endurances en Z5 plus celle de la veille du
    // dossard, tenue en Z4.
    expect(comptes).toEqual({
      series: 2, mixte: 2, simple: 6, continu: 0, duree: 4, cotes: 1, lignes: 6,
    });
    expect(comptes.series + comptes.mixte + comptes.simple + comptes.continu + comptes.duree + comptes.cotes)
      .toBe(toutesLesSeances().filter((x) => QUALITE.has(x.code)).length);
  });

  it('garde sa dominante en Z3 et Z4, le fractionné court restant une minorité', () => {
    const dures = P3.semainesContenu
      .flatMap((s) => s.seances)
      .filter((x) => QUALITE.has(x.code));
    const z3z4 = dures.filter((x) => x.zone === 'Z3' || x.zone === 'Z4');
    // Sur un semi, l'allure de course se situe autour de la Z3 et la Z4 sert à
    // repousser le plafond au-dessus : ces deux zones doivent rester nettement
    // majoritaires malgré les quatre séances rapides.
    expect(z3z4.length).toBe(11);
    expect(z3z4.length / dures.length).toBeGreaterThan(0.7);
    expect(dures.filter((x) => x.zone === 'Z5')).toHaveLength(4);
  });

  it('programme une séance de qualité par semaine, de la première à la dernière', () => {
    for (const s of P3.semainesContenu.slice(0, 15)) {
      expect(
        qualiteDe(s).length,
        `P3 S${s.numero} : ${qualiteDe(s).length} séance(s) de qualité, il en faut exactement une.`,
      ).toBe(1);
    }
    // La semaine de récupération n'en porte aucune, c'est le garde-fou de
    // regles.js qui l'impose. La variante à dossard non plus : la course-test
    // tient ce rôle.
    expect(qualiteDe(P3.semainesContenu[15])).toEqual([]);
    expect(qualiteDe(P3.semainesContenu[8].variantes.avecIzon)).toEqual([]);
  });

  it('aligne quinze séances de qualité, quinze formats distincts, sans jamais répéter une séquence', () => {
    const observees = P3.semainesContenu.slice(0, 15).map((s) => {
      const [seance] = qualiteDe(s);
      return { semaine: s.numero, phase: s.phase, code: seance.code, zone: seance.zone, duree: seance.duree };
    });
    expect(observees).toEqual(MENU_QUALITE.map(({ forme, ...reste }) => reste));

    for (const attendue of MENU_QUALITE) {
      const [seance] = qualiteDe(P3.semainesContenu[attendue.semaine - 1]);
      expect(
        seance.description,
        `P3 S${attendue.semaine} : la séance ne décrit pas la séquence attendue « ${attendue.forme} ».`,
      ).toContain(attendue.forme);
    }
    expect(new Set(MENU_QUALITE.map((q) => q.forme)).size).toBe(15);
    const descriptions = P3.semainesContenu.slice(0, 15).map((s) => qualiteDe(s)[0].description);
    expect(new Set(descriptions).size).toBe(15);
    expect(new Set(MENU_QUALITE.map((q) => q.zone))).toEqual(new Set(['Z3', 'Z4', 'Z5']));
  });

  // Correctif de l'encadrant : « ce ne sont pas des débutants, donc varie les
  // séquences ». La montée par paliers d'intensité, Z3 puis Z4 puis Z5, est
  // abandonnée pour P3 comme elle l'a été pour P2.
  it('abandonne la progression Z3 avant Z4 avant Z5 : la vitesse ouvre la semaine 1', () => {
    const numeroPremiereZone = (zone) =>
      P3.semainesContenu.find((s) => s.seances.some((x) => QUALITE.has(x.code) && x.zone === zone))?.numero;
    expect(numeroPremiereZone('Z5')).toBe(1);
    expect(numeroPremiereZone('Z5')).toBeLessThan(numeroPremiereZone('Z4'));
    expect(numeroPremiereZone('Z4')).toBeLessThan(numeroPremiereZone('Z3'));
    // Le premier cycle emploie à lui seul les trois zones de travail et trois
    // formats, là où l'ancienne trame n'y mettait que de la Z3.
    const bloc1 = P3.semainesContenu.filter((s) => s.phase === 'bloc1').flatMap(qualiteDe);
    expect(new Set(bloc1.map((x) => x.zone))).toEqual(new Set(['Z3', 'Z4', 'Z5']));
  });

  // Le travail à l'allure du semi, en Z3, doit prendre une place croissante :
  // c'est la seule zone que le coureur aura à tenir pendant deux heures.
  it("fait grandir la dose d'allure spécifique de S3 au pic", () => {
    const minutesZ3 = (n) => {
      const [seance] = qualiteDe(P3.semainesContenu[n - 1]);
      if (seance.zone !== 'Z3') return null;
      const m = seance.description.match(/(\d+) fois (\d+) min en Z3/);
      expect(m, `P3 S${n} : format en Z3 illisible.`).not.toBeNull();
      return Number(m[1]) * Number(m[2]);
    };
    const semainesZ3 = P3.semainesContenu
      .slice(0, 15)
      .filter((s) => qualiteDe(s)[0].zone === 'Z3')
      .map((s) => s.numero);
    expect(semainesZ3).toEqual([3, 10, 13, 14]);
    expect(minutesZ3(3)).toBe(24);
    expect(minutesZ3(10)).toBe(36);
    expect(minutesZ3(13)).toBe(40);
    // L'affûtage redescend, c'est le seul recul autorisé.
    expect(minutesZ3(14)).toBe(30);
    expect(minutesZ3(14)).toBeLessThan(minutesZ3(13));
  });

  // Manque signalé par l'encadrant : le programme ne connaissait que le
  // fractionné en durée. Sur un semi le fractionné se compte aussi en mètres,
  // mais avec des répétitions longues, contrairement aux 10 km de P1, P2 et P5.
  describe('fractionné en distance', () => {
    const seancesQualite = P3.semainesContenu
      .slice(0, 15)
      .map((s) => ({ semaine: s.numero, phase: s.phase, seance: qualiteDe(s)[0] }));
    const enDistance = ({ seance }) => /\d+ fois \d+ m en Z[1-5]/.test(seance.description);

    it('travaille en distance sur dix séances, les cinq autres se comptant en durée', () => {
      const distance = seancesQualite.filter(enDistance);
      expect(distance.map((q) => q.semaine)).toEqual([1, 2, 5, 6, 7, 8, 9, 11, 12, 15]);
      // Le travail à l'allure du semi reste en minutes : un bloc en Z3 ne se
      // pense pas en mètres. La côte de S4 non plus, une pente ne coûtant pas
      // le même effort d'un profil à l'autre.
      for (const q of seancesQualite.filter((x) => x.seance.zone === 'Z3')) {
        expect(
          enDistance(q),
          `P3 S${q.semaine} : le travail en Z3 doit rester en durée, pas en distance.`,
        ).toBe(false);
      }
      expect(seancesQualite.filter((q) => !enDistance(q)).map((q) => q.semaine)).toEqual([
        3, 4, 10, 13, 14,
      ]);
    });

    it('fait dominer les répétitions longues, adaptées à la distance préparée', () => {
      const longues = seancesQualite.filter((q) =>
        /\d+ fois (1000|2000|3000) m/.test(q.seance.description),
      );
      expect(longues.map((q) => q.semaine)).toEqual([2, 5, 7, 9, 11]);
      for (const q of longues) {
        expect(q.seance.zone, `P3 S${q.semaine} : une répétition longue se court en Z4.`).toBe('Z4');
      }
      // Cinq séances au long, cinq séquences différentes : aucune n'est la
      // précédente à laquelle on aurait ajouté une répétition.
      expect(longues.map((q) => q.seance.description.match(/puis ([^,]+) en Z4/)[1])).toEqual([
        '5 fois 1000 m',
        '3 fois 2000 m',
        '2 fois 3000 m',
        '2 fois 2000 m puis 3 fois 1000 m',
        '2 fois 2000 m puis 4 fois 1000 m',
      ]);
      // Le 3000 m, plus long format au seuil du programme, n'arrive qu'une
      // fois la base posée.
      expect(seancesQualite.filter((q) => /3000 m/.test(q.seance.description)).map((q) => q.semaine))
        .toEqual([7]);
    });

    it('garde du court et vif, en distance ou en côte, sans jamais en faire une dominante', () => {
      const rapides = seancesQualite.filter((q) => q.seance.zone === 'Z5');
      expect(rapides.map((q) => q.semaine)).toEqual([1, 4, 6, 8]);
      for (const q of rapides) {
        const m = q.seance.description.match(/(\d+) fois (\d+) m en Z5/);
        if (m) {
          expect(Number(m[2])).toBeLessThanOrEqual(400);
          continue;
        }
        // Seule exception assumée : la côte de la semaine plus douce. Les
        // coureurs s'entraînent en vallonné, le format leur parle sans
        // explication, et une pente ne se décrit pas en mètres.
        expect(
          q.semaine,
          `P3 S${q.semaine} : une séance en Z5 doit être décrite en distance, sauf la côte de S4.`,
        ).toBe(4);
        expect(q.seance.description).toMatch(/\d+ montées de \d+ min en côte/);
        expect(q.seance.description).toMatch(/descente en marchant/);
      }
    });

    it('présente le repère de durée comme une estimation et jamais comme une allure imposée', () => {
      const distance = seancesQualite.filter(enDistance);
      for (const { semaine, seance } of distance) {
        expect(
          seance.description,
          `P3 S${semaine} : séance en distance sans repère de durée par répétition.`,
        ).toMatch(/en comptant environ (?:\d+ min(?: \d+)?|\d+ s) par \d+ m/);
        // Et chacune le dit noir sur blanc, pas seulement la première du
        // programme : un coureur ne lit que la séance du jour, et le plus lent
        // du groupe ne doit à aucun moment se croire en faute.
        expect(
          seance.description,
          `P3 S${semaine} : le repère de durée n'est pas présenté comme une estimation.`,
        ).toMatch(/estimation de planification/);
        expect(
          seance.description,
          `P3 S${semaine} : le repère de durée n'est pas démenti comme allure à tenir.`,
        ).toMatch(/jamais une allure à tenir/);
      }
      const textes = distance.map((q) => q.seance.description).join(' ');
      expect(textes).not.toMatch(/min\/km/);
      expect(textes).not.toMatch(/km\/h/);
    });
  });

  it("n'accompagne jamais une semaine de fractionné court de lignes droites", () => {
    for (const s of P3.semainesContenu) {
      if (!s.seances.some((x) => x.code === 'VMA')) continue;
      expect(s.seances.some((x) => /lignes droites/.test(x.description))).toBe(false);
    }
  });

  it('donne à chaque séance de qualité un objectif qui lui est propre', () => {
    const seances = P3.semainesContenu.slice(0, 15).map((s) => qualiteDe(s)[0]);
    verifierObjectifsDistincts(
      seances.map((x) => x.objectif),
      'P3',
      P3.semainesContenu.slice(0, 15).map((s) => `S${s.numero}`),
    );
  });

  it("varie les textes, aucun objectif n'est répété dans le programme", () => {
    const objectifs = toutesLesSeances().map((x) => x.objectif);
    expect(new Set(objectifs).size).toBe(objectifs.length);
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

// Comparaison de charge rétablie. Elle avait été temporairement réécrite en
// « P3 se distingue de P2 par sa sortie longue, pas par son volume » : P2 était
// alors recalibré sur le niveau réel du club (165 min en S1, 215 au pic) tandis
// que P3 portait encore le barème pour débutants (130 en S1, 200 au pic), et
// comparer les deux revenait à comparer deux calibrages plutôt que deux
// distances. Les cinq programmes sont maintenant sur le même calibrage : la
// comparaison redevient franche, et elle porte sur les semaines de bloc, les
// seules dont la charge soit comparable d'un programme à l'autre.
//
// L'ordre attendu est celui des distances préparées. Une semaine de bloc d'une
// préparation de semi pèse plus lourd que la semaine de même rang d'une
// préparation de 10 km, et une semaine de marathon plus lourd encore.
const SEMAINES_DE_BLOC = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13];

it('P3 est plus chargé que P2 sur chacune de ses semaines de bloc', () => {
  for (const n of SEMAINES_DE_BLOC) {
    const [a, b] = [P3, P2].map((p) => volumeHorsCourse(p.semainesContenu[n - 1]));
    expect(
      a,
      `S${n} : P3 (${a} min) devrait peser plus lourd que P2 (${b} min).`,
    ).toBeGreaterThan(b);
  }
  // Et la distinction ne tient pas qu'au volume : la sortie longue dépasse
  // largement le plafond de 1 h 15 utile sur 10 km, et la Z3 y prend plus de
  // place puisque c'est l'allure de course d'un semi.
  const longue = (p) =>
    Math.max(
      ...p.semainesContenu.flatMap((s) => s.seances.filter((x) => x.code === 'SL').map((x) => x.duree)),
    );
  expect(longue(P3)).toBeGreaterThan(longue(P2) + 25);

  const partZ3 = (p) => {
    const dures = p.semainesContenu
      .flatMap((s) => s.seances)
      .filter((x) => ['TEMPO', 'SEUIL', 'VMA'].includes(x.code));
    return dures.filter((x) => x.zone === 'Z3').length / dures.length;
  };
  expect(partZ3(P3)).toBeGreaterThan(partZ3(P2));
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
    // Prérequis recalibré comme ceux de P1 à P3. « Courir 30 km par semaine
    // depuis 2 mois » ne décrivait pas ce groupe, où tout le monde passe sous
    // l'heure au 10 km. Il reste honnête sur ce que la distance ajoute : cinq
    // heures de course hebdomadaires au pic, sortie de 2 h 30 comprise.
    expect(P4.prerequis).toMatch(/1 h 15/);
    expect(P4.prerequis).toMatch(/moins d'une heure/);
    expect(P4.prerequis).toMatch(/2 h 30/);
    expect(P4.prerequis).not.toMatch(/30 km par semaine/);
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
    // Barème recalibré sur le niveau réel du club. L'ancien (165, 178, 192,
    // 160, 200, 215, 231, 190, 240, 248, 266, 220, 280, 200, 70, 120) ouvrait
    // à 165 min avec des footings de 42 min, ce qui est le volume d'une
    // préparation de 10 km et non d'un marathon.
    expect(P4.semainesContenu.map(volumeHorsCourse)).toEqual([
      200, 213, 225, 190, 232, 250, 268, 225, 262, 275, 288, 240, 300, 205, 88, 135,
    ]);
    expect(volumeHorsCourse(s9.variantes.avecIzon)).toBe(95);
  });

  it('atteint son pic en S13, une seule fois, dans la fourchette voulue', () => {
    const volumes = P4.semainesContenu.map(volumeHorsCourse);
    const pic = volumes[12];
    expect(Math.max(...volumes)).toBe(pic);
    expect(volumes.filter((v) => v === pic)).toHaveLength(1);
    // Ordre de grandeur fixé par l'encadrant pour trois sorties par semaine :
    // cinq heures de course sur la semaine du sommet, fourchette haute de ce
    // qu'un coureur de club encaisse sans y laisser sa vie de famille. Monter
    // plus haut supposerait une quatrième sortie hebdomadaire.
    expect(pic).toBeGreaterThanOrEqual(285);
    expect(pic).toBeLessThanOrEqual(320);
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

  it('garde sa dominante en Z3, le seuil et le court restant minoritaires', () => {
    const dures = toutesLesSeances(P4).filter((x) => DURES.has(x.code));
    const z3 = dures.filter((x) => x.zone === 'Z3');
    expect(z3.length).toBeGreaterThan(dures.length / 2);
    expect(z3.length).toBe(8);
    // L'allure d'un marathon se situe pour la plupart des coureurs autour de
    // la Z3 basse : le seuil ne sert qu'à rendre cette allure moins coûteuse.
    expect(dures.filter((x) => x.zone === 'Z4')).toHaveLength(4);
    // Le court et vif reste une minorité assumée. L'ancienne version n'en
    // comportait aucun, ce qui laissait la foulée se tasser sur quinze
    // semaines ; trois séances suffisent à l'éviter sans coûter en
    // récupération.
    expect(dures.filter((x) => x.zone === 'Z5')).toHaveLength(3);
  });

  // Correctif de l'encadrant : « ce ne sont pas des débutants, donc varie les
  // séquences ». Même abandon qu'en P2 et P3 de la montée par paliers
  // d'intensité, y compris sur la distance la plus longue du projet.
  it('abandonne la progression Z3 avant Z4 avant Z5 : la vitesse ouvre la semaine 1', () => {
    const numeroPremiereZone = (zone) =>
      P4.semainesContenu.find((s) => s.seances.some((x) => DURES.has(x.code) && x.zone === zone))
        ?.numero;
    expect(numeroPremiereZone('Z5')).toBe(1);
    expect(numeroPremiereZone('Z5')).toBeLessThan(numeroPremiereZone('Z4'));
    expect(numeroPremiereZone('Z4')).toBeLessThan(numeroPremiereZone('Z3'));
    const bloc1 = P4.semainesContenu
      .filter((s) => s.phase === 'bloc1')
      .flatMap((s) => s.seances.filter((x) => DURES.has(x.code)));
    expect(new Set(bloc1.map((x) => x.zone))).toEqual(new Set(['Z3', 'Z4', 'Z5']));
  });

  it('tient le plancher de 50 min hors semaine de course et de récupération', () => {
    const EXCEPTIONS = new Set([15, 16]);
    let verifiees = 0;
    for (const s of P4.semainesContenu) {
      if (EXCEPTIONS.has(s.numero)) continue;
      for (const seance of s.seances.filter((x) => x.code !== 'RENFO')) {
        expect(
          seance.duree,
          `P4 S${s.numero} ${seance.id} : ${seance.duree} min, sous le plancher de 50 min.`,
        ).toBeGreaterThanOrEqual(50);
        verifiees++;
      }
    }
    expect(verifiees).toBe(42); // 14 semaines normales x 3 séances de course.
  });

  it('assume par écrit la brièveté des semaines de course et de récupération', () => {
    for (const s of [P4.semainesContenu[14], P4.semainesContenu[15], s9.variantes.avecIzon]) {
      const textes = [s.intention, ...s.seances.map((x) => x.description)].join(' ');
      expect(
        /but|voulu|dessein|exactement|pas un oubli|volontairement/i.test(textes),
        `P4 S${s.numero} : rien n'explique au coureur pourquoi les séances sont courtes.`,
      ).toBe(true);
    }
  });

  it("applique le barème d'échauffement à toutes les séances de qualité", () => {
    // Quinze séances de qualité, une par semaine de préparation. Quatorze
    // passent 50 min et tombent sur le 20/10, ce qui est l'intention de
    // l'encadrant pour un coureur de marathon ; seul le rappel de la semaine
    // de course (40 min) prend le palier 12/7.
    expect(verifierPaliersEchauffement(P4, 'P4')).toEqual([
      60, 60, 64, 52, 64, 70, 78, 52, 70, 81, 85, 53, 96, 65, 40,
    ]);
  });

  it('tient la sortie longue entre 85 et 150 min', () => {
    const longues = P4.semainesContenu.flatMap((s) => s.seances.filter((x) => x.code === 'SL'));
    expect(longues.map((x) => x.duree)).toEqual([
      90, 97, 105, 85, 105, 115, 125, 100, 120, 132, 142, 115, 150, 90,
    ]);
    for (const x of longues) {
      expect(x.duree).toBeGreaterThanOrEqual(85);
      expect(x.duree).toBeLessThanOrEqual(150);
    }
  });

  it("fait grandir la dose d'allure marathon jusqu'au pic", () => {
    const minutesZ3 = (n) => {
      const seance = P4.semainesContenu[n - 1].seances.find((x) => x.code === 'TEMPO');
      const m = seance.description.match(/(\d+) fois (\d+) min en Z3/);
      expect(m, `P4 S${n} : format en Z3 illisible.`).not.toBeNull();
      return Number(m[1]) * Number(m[2]);
    };
    // Le seuil disparaît après S9 : à partir de là, tout le travail de qualité
    // se fait à l'allure du 8 novembre, et la dose ne cesse de monter.
    expect([3, 7, 10, 11, 13].map(minutesZ3)).toEqual([30, 42, 45, 50, 60]);
    // S12 est une semaine plus douce et S14 et S15 sont l'affûtage : ce sont
    // les trois seuls reculs, et ils sont voulus.
    expect(minutesZ3(12)).toBe(20);
    expect(minutesZ3(14)).toBe(32);
    expect(minutesZ3(15)).toBe(16);
  });

  it('travaille le seuil en répétitions longues, adaptées à la distance préparée', () => {
    const seuils = P4.semainesContenu
      .flatMap((s) => s.seances.filter((x) => x.code === 'SEUIL').map((x) => ({ n: s.numero, x })));
    expect(seuils.map((q) => q.n)).toEqual([2, 5, 6, 9]);
    // Quatre séquences différentes, toutes construites sur le kilomètre et
    // au-delà : sur marathon on ne travaille pas le seuil en 200 m.
    expect(seuils.map((q) => q.x.description.match(/puis ([^,]+) en Z4/)[1])).toEqual([
      '4 fois 1000 m puis 2 fois 500 m',
      '6 fois 1000 m',
      '2 fois 3000 m puis 2 fois 1000 m',
      '4 fois 2000 m',
    ]);
    for (const { n, x } of seuils) {
      expect(
        x.description,
        `P4 S${n} : le repère de durée n'est pas présenté comme une estimation.`,
      ).toMatch(/estimation de planification/);
      expect(
        x.description,
        `P4 S${n} : le repère de durée n'est pas démenti comme allure à tenir.`,
      ).toMatch(/jamais une allure à tenir/);
    }
  });

  it('garde du court et vif, en distance ou en côte, sans en faire une dominante', () => {
    const rapides = P4.semainesContenu
      .flatMap((s) => s.seances.filter((x) => x.code === 'VMA').map((x) => ({ n: s.numero, x })));
    expect(rapides.map((q) => q.n)).toEqual([1, 4, 8]);
    for (const { n, x } of rapides) {
      const m = x.description.match(/(\d+) fois (\d+) m en Z5/);
      if (m) {
        expect(Number(m[2])).toBeLessThanOrEqual(400);
        expect(x.description).toMatch(/estimation de planification/);
        continue;
      }
      // Seule exception assumée : la côte de la semaine plus douce. Ces
      // coureurs s'entraînent en vallonné, et une pente ne se décrit pas en
      // mètres.
      expect(n, `P4 S${n} : une séance en Z5 doit être en distance, sauf la côte de S4.`).toBe(4);
      expect(x.description).toMatch(/\d+ montées de \d+ min en côte/);
      expect(x.description).toMatch(/descente en marchant/);
    }
  });

  it('donne à chaque séance de qualité un objectif qui lui est propre', () => {
    const seances = P4.semainesContenu
      .slice(0, 15)
      .map((s) => s.seances.find((x) => DURES.has(x.code)));
    verifierObjectifsDistincts(
      seances.map((x) => x.objectif),
      'P4',
      P4.semainesContenu.slice(0, 15).map((s) => `S${s.numero}`),
    );
  });

  // Réconciliation des durées : N répétitions donnent N-1 récupérations, et la
  // somme des segments décrits doit égaler exactement la durée déclarée. Le
  // test parse les descriptions plutôt que de recopier des nombres, pour qu'un
  // barème retouché sans retoucher le texte échoue.
  // Depuis le recalibrage, P4 emploie la même grammaire de séance que P2, P3 et
  // P5 : il passe donc par le contrôle partagé plutôt que par une paire
  // d'expressions écrites pour lui seul, qui ne savaient pas lire le fractionné
  // en distance.
  it('réconcilie exactement la durée déclarée avec les segments décrits', () => {
    const comptes = reconcilier(toutesLesSeances(P4), 'P4');
    // Ancre de sécurité : si le parsing cassait, la boucle ne vérifierait rien.
    // Les 15 séances de qualité se répartissent en 2 séances en séries, 2
    // enchaînements de deux distances, 2 blocs uniques en distance, 8 séances
    // en durée (les blocs à l'allure du marathon) et 1 séance de côte. Les 5
    // blocs de lignes droites sont les 5 endurances qui déclarent la Z5 : la
    // variante à dossard n'en porte aucune.
    expect(comptes).toEqual({
      series: 2, mixte: 2, simple: 2, continu: 0, duree: 8, cotes: 1, lignes: 5,
    });
    expect(comptes.series + comptes.mixte + comptes.simple + comptes.continu + comptes.duree + comptes.cotes)
      .toBe(toutesLesSeances(P4).filter((x) => DURES.has(x.code)).length);
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

it('P4 est plus chargé que P3 sur chacune de ses semaines de bloc', () => {
  for (const n of SEMAINES_DE_BLOC) {
    const [a, b] = [P4, P3].map((p) => volumeHorsCourse(p.semainesContenu[n - 1]));
    expect(
      a,
      `S${n} : P4 (${a} min) devrait peser plus lourd que P3 (${b} min).`,
    ).toBeGreaterThan(b);
  }
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
    // Prérequis recalibré comme celui de P1 et de P2 : le public du club sort
    // déjà 1 h 15 le dimanche et passe sous l'heure au 10 km.
    expect(P5.prerequis).toMatch(/1 h 15/);
    expect(P5.prerequis).toMatch(/sous l'heure/);
    expect(P5.prerequis).not.toMatch(/30 minutes/);
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
    // Barème recalibré sur le niveau réel du club. L'ancien (102, 111, 120, 98,
    // 128, 138, 149, 120, 58, 88, 140, 150, 160, 124, 112, 56, 92) était celui
    // d'un plan pour débutants et alignait des footings de 30 min sans objet
    // pour ce public.
    //
    // Point serré : une semaine normale ne peut pas descendre sous
    // 50 + 50 + 60 = 160 min, et une semaine plus douce doit tomber à 85 % ou
    // moins de la précédente, ce qui impose 189 min minimum à toute semaine qui
    // en précède une plus douce. D'où le couple S3 / S4 à 189 puis 160.
    expect(P5.semainesContenu.map(volumeHorsCourse)).toEqual([
      164, 176, 189, 160, 184, 197, 207, 175, 70, 108, 194, 205, 216, 180, 174, 74, 106,
    ]);
  });

  it('atteint son pic en S13, une seule fois, dans la fourchette voulue', () => {
    const volumes = P5.semainesContenu.map(volumeHorsCourse);
    const pic = volumes[12];
    expect(Math.max(...volumes)).toBe(pic);
    expect(volumes.filter((v) => v === pic)).toHaveLength(1);
    // Ordre de grandeur retenu pour un 10 km à trois sorties, comme P2.
    expect(pic).toBeGreaterThanOrEqual(205);
    expect(pic).toBeLessThanOrEqual(225);
  });

  // Garde-fou de durée demandé par l'encadrant. Les exceptions sont nommées et
  // assumées : la semaine d'Izon, la récupération active qui la suit, la
  // semaine de Paris et la récupération finale.
  it('tient le plancher de 50 min hors semaines de course et de récupération', () => {
    const EXCEPTIONS = new Set([9, 10, 16, 17]);
    let verifiees = 0;
    for (const s of P5.semainesContenu) {
      if (EXCEPTIONS.has(s.numero)) continue;
      for (const seance of s.seances.filter((x) => x.code !== 'RENFO')) {
        expect(
          seance.duree,
          `P5 S${s.numero} ${seance.id} : ${seance.duree} min, sous le plancher de 50 min.`,
        ).toBeGreaterThanOrEqual(50);
        verifiees++;
      }
    }
    expect(verifiees).toBe(39); // 13 semaines normales x 3 séances de course.
  });

  it('assume par écrit la brièveté des quatre semaines qui font exception', () => {
    for (const numero of [9, 10, 16, 17]) {
      const s = P5.semainesContenu[numero - 1];
      const textes = [s.intention, ...s.seances.map((x) => x.description)].join(' ');
      expect(
        /but|voulu|dessein|à dessein|exactement|pas un oubli|volontairement/i.test(textes),
        `P5 S${numero} : rien n'explique au coureur pourquoi les séances sont courtes.`,
      ).toBe(true);
    }
  });

  it("applique le barème d'échauffement à toutes les séances de qualité", () => {
    // Quatorze séances de qualité. Onze passent 50 min et tombent sur le 20/10
    // standard ; l'entrée en matière de S1, les blocs en Z3 de S2 et la côte de
    // S4 sont à 50 min pile donc au palier 15/8, et le rappel de la semaine de
    // course tombe à 31 min donc au palier 12/7.
    expect(verifierPaliersEchauffement(P5, 'P5')).toEqual([
      50, 50, 53, 50, 58, 65, 68, 51, 63, 68, 74, 52, 51, 31,
    ]);
  });

  it('tient la sortie longue entre 60 et 75 min, le plafond étant atteint une seule fois en S13', () => {
    const longues = P5.semainesContenu.flatMap((s) => s.seances.filter((x) => x.code === 'SL'));
    expect(longues.map((x) => x.duree)).toEqual([60, 64, 68, 60, 65, 70, 74, 63, 66, 70, 75, 62, 60]);
    for (const x of longues) {
      expect(x.duree).toBeGreaterThanOrEqual(60);
      expect(x.duree).toBeLessThanOrEqual(75);
    }
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

  // Correctif de l'encadrant : « ce ne sont pas des débutants, donc varie les
  // séquences ». L'escalier d'intensités qui verrouillait ce programme, Z3
  // d'abord, Z4 ensuite, Z5 en dernier, est abandonné. Ce test-ci remplace
  // celui qui l'imposait, et il échouerait si on le réintroduisait.
  it("abandonne la progression Z3 avant Z4 avant Z5 : la semaine 1 travaille déjà l'allure de course", () => {
    const numeroPremiereZone = (zone) =>
      P5.semainesContenu.find((s) => s.seances.some((x) => x.zone === zone && DURES.has(x.code)))
        ?.numero;
    expect(numeroPremiereZone('Z4')).toBe(1);
    expect(numeroPremiereZone('Z4')).toBeLessThan(numeroPremiereZone('Z3'));
    // Le premier cycle emploie à lui seul les trois zones de travail, là où
    // l'ancienne trame n'y mettait que de la Z3.
    const bloc1 = P5.semainesContenu
      .filter((s) => s.phase === 'bloc1')
      .flatMap((s) => s.seances.filter((x) => DURES.has(x.code)));
    expect(new Set(bloc1.map((x) => x.zone))).toEqual(new Set(['Z3', 'Z4', 'Z5']));
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
    const comptes = reconcilier(toutesLesSeances(), 'P5');
    // Ancre de sécurité : si le parsing cassait, la boucle ne vérifierait rien.
    // Les 14 séances de qualité se répartissent en 4 séances en séries, 4
    // enchaînements de deux distances, 4 blocs uniques en distance, 1 tempo en
    // durée et 1 séance de côte. Les 7 blocs de lignes droites comptent les 6
    // endurances en Z5 plus celle de la veille d'Izon, tenue en Z4.
    expect(comptes).toEqual({
      series: 4, mixte: 4, simple: 4, continu: 0, duree: 1, cotes: 1, lignes: 7,
    });
    expect(comptes.series + comptes.mixte + comptes.simple + comptes.continu + comptes.duree + comptes.cotes)
      .toBe(toutesLesSeances().filter((x) => DURES.has(x.code)).length);
  });

  // Menu arrêté par l'encadrant après recalibrage. La forme attendue est citée
  // littéralement : c'est elle qui distingue une séance d'une autre, et c'est
  // elle qu'une réécriture distraite ramènerait vers un format déjà vu. Les
  // quatorze formes sont distinctes entre elles, et distinctes de celles de P1
  // et de P2.
  const MENU_QUALITE = [
    { semaine: 1, phase: 'bloc1', code: 'SEUIL', zone: 'Z4', duree: 50, forme: '6 fois 500 m en Z4' },
    { semaine: 2, phase: 'bloc1', code: 'TEMPO', zone: 'Z3', duree: 50, forme: '3 fois 7 min en Z3' },
    { semaine: 3, phase: 'bloc1', code: 'VMA', zone: 'Z5', duree: 53, forme: '4 séries de 3 fois 200 m en Z5' },
    { semaine: 4, phase: 'allegee', code: 'SEUIL', zone: 'Z4', duree: 50, forme: '6 montées de 2 min en côte en Z4' },
    { semaine: 5, phase: 'bloc2', code: 'SEUIL', zone: 'Z4', duree: 58, forme: '2 séries de 4 fois 500 m en Z4' },
    { semaine: 6, phase: 'bloc2', code: 'VMA', zone: 'Z5', duree: 65, forme: '3 séries de 4 fois 400 m en Z5' },
    { semaine: 7, phase: 'bloc2', code: 'SEUIL', zone: 'Z4', duree: 68, forme: '10 fois 500 m en Z4' },
    { semaine: 8, phase: 'allegee', code: 'VMA', zone: 'Z5', duree: 51, forme: '10 fois 200 m en Z5' },
    { semaine: 11, phase: 'bloc3', code: 'SEUIL', zone: 'Z4', duree: 63, forme: '3 fois 1000 m puis 3 fois 500 m en Z4' },
    { semaine: 12, phase: 'bloc3', code: 'SEUIL', zone: 'Z4', duree: 68, forme: '4 fois 1000 m puis 4 fois 500 m en Z4' },
    { semaine: 13, phase: 'bloc3', code: 'SEUIL', zone: 'Z4', duree: 74, forme: '5 fois 1000 m puis 4 fois 500 m en Z4' },
    { semaine: 14, phase: 'allegee', code: 'VMA', zone: 'Z5', duree: 52, forme: '2 séries de 3 fois 400 m en Z5' },
    { semaine: 15, phase: 'affutage', code: 'SEUIL', zone: 'Z4', duree: 51, forme: '2 fois 1000 m puis 4 fois 500 m en Z4' },
    { semaine: 16, phase: 'affutage', code: 'SEUIL', zone: 'Z4', duree: 31, forme: '2 fois 1000 m en Z4' },
  ];
  const qualiteDe = (s) => s.seances.filter((x) => DURES.has(x.code));

  it('programme une séance de qualité par semaine, sauf autour de la course-test', () => {
    // Quatorze semaines de travail sur seize. Les deux exceptions sont S9, où
    // la course tient ce rôle, et S10, où le garde-fou de regles.js interdit
    // toute intensité.
    for (const s of P5.semainesContenu) {
      const attendu = [9, 10, 17].includes(s.numero) ? 0 : 1;
      expect(
        qualiteDe(s).length,
        `P5 S${s.numero} : ${qualiteDe(s).length} séance(s) de qualité, il en faut ${attendu}.`,
      ).toBe(attendu);
    }
  });

  it('aligne quatorze séances de qualité, quatorze formats distincts, sans jamais répéter une séquence', () => {
    const observees = P5.semainesContenu
      .filter((s) => qualiteDe(s).length === 1)
      .map((s) => {
        const [seance] = qualiteDe(s);
        return { semaine: s.numero, phase: s.phase, code: seance.code, zone: seance.zone, duree: seance.duree };
      });
    expect(observees).toEqual(MENU_QUALITE.map(({ forme, ...reste }) => reste));

    for (const attendue of MENU_QUALITE) {
      const [seance] = qualiteDe(P5.semainesContenu[attendue.semaine - 1]);
      expect(
        seance.description,
        `P5 S${attendue.semaine} : la séance ne décrit pas la séquence attendue « ${attendue.forme} ».`,
      ).toContain(attendue.forme);
    }
    expect(new Set(MENU_QUALITE.map((q) => q.forme)).size).toBe(14);
    const descriptions = MENU_QUALITE.map(
      (q) => qualiteDe(P5.semainesContenu[q.semaine - 1])[0].description,
    );
    expect(new Set(descriptions).size).toBe(14);
    expect(new Set(MENU_QUALITE.map((q) => q.zone))).toEqual(new Set(['Z3', 'Z4', 'Z5']));
  });

  describe('fractionné en distance', () => {
    const seancesQualite = P5.semainesContenu
      .filter((s) => qualiteDe(s).length === 1)
      .map((s) => ({ semaine: s.numero, phase: s.phase, seance: qualiteDe(s)[0] }));
    const enDistance = ({ seance }) => /\d+ fois \d+ m en Z[1-5]/.test(seance.description);

    it('travaille bien en distance et pas seulement en durée', () => {
      const distance = seancesQualite.filter(enDistance);
      expect(distance.map((q) => q.semaine)).toEqual([1, 3, 5, 6, 7, 8, 11, 12, 13, 14, 15, 16]);
      for (const q of seancesQualite.filter((x) => x.seance.zone === 'Z3')) {
        expect(
          enDistance(q),
          `P5 S${q.semaine} : le travail en Z3 doit rester en durée, pas en distance.`,
        ).toBe(false);
      }
    });

    it("réserve les séances de 1000 m à l'après-Izon, au plus près de Paris", () => {
      const mille = seancesQualite.filter((q) => /\d+ fois 1000 m/.test(q.seance.description));
      // Six semaines de travail restent après la course-test, et cinq portent
      // une séance au kilomètre. Aucune avant. La sixième, S14, est la semaine
      // plus douce : elle repasse volontairement sur 400 m.
      expect(mille.map((q) => q.semaine)).toEqual([11, 12, 13, 15, 16]);
      const izon = P5.semainesContenu[8].numero;
      expect(Math.min(...mille.map((q) => q.semaine))).toBeGreaterThan(izon);
      for (const q of mille) {
        expect(q.seance.zone, `P5 S${q.semaine} : un 1000 m se court en Z4.`).toBe('Z4');
      }
      // Cinq séances au kilomètre, cinq séquences différentes.
      expect(mille.map((q) => q.seance.description.match(/puis ([^,]+) en Z4/)[1])).toEqual([
        '3 fois 1000 m puis 3 fois 500 m',
        '4 fois 1000 m puis 4 fois 500 m',
        '5 fois 1000 m puis 4 fois 500 m',
        '2 fois 1000 m puis 4 fois 500 m',
        '2 fois 1000 m',
      ]);
    });

    it('travaille le Z5 en fractions courtes, jamais au-delà de 400 m', () => {
      const rapides = seancesQualite.filter((q) => q.seance.zone === 'Z5');
      expect(rapides.map((q) => q.semaine)).toEqual([3, 6, 8, 14]);
      for (const q of rapides) {
        const m = q.seance.description.match(/(\d+) fois (\d+) m en Z5/);
        expect(m, `P5 S${q.semaine} : une séance en Z5 doit être décrite en distance.`).not.toBeNull();
        expect(Number(m[2])).toBeLessThanOrEqual(400);
      }
      // La seule séance de côte du programme se court en Z4, pas en Z5 : des
      // montées de deux minutes ne sont pas un exercice de vitesse.
      const cote = seancesQualite.find((q) => /montées de/.test(q.seance.description));
      expect(cote.semaine).toBe(4);
      expect(cote.seance.zone).toBe('Z4');
      expect(cote.seance.description).toMatch(/descente en marchant/);
    });

    it('présente le repère de durée comme une estimation et jamais comme une allure imposée', () => {
      const distance = seancesQualite.filter(enDistance);
      for (const { semaine, seance } of distance) {
        expect(
          seance.description,
          `P5 S${semaine} : séance en distance sans repère de durée par répétition.`,
        ).toMatch(/en comptant environ (?:\d+ min(?: \d+)?|\d+ s) par \d+ m/);
        expect(
          seance.description,
          `P5 S${semaine} : le repère de durée n'est pas présenté comme une estimation.`,
        ).toMatch(/estimation de planification/);
        expect(
          seance.description,
          `P5 S${semaine} : le repère de durée n'est pas démenti comme allure à tenir.`,
        ).toMatch(/jamais une allure à tenir/);
      }
      const textes = distance.map((q) => q.seance.description).join(' ');
      expect(textes).not.toMatch(/min\/km/);
      expect(textes).not.toMatch(/km\/h/);
    });
  });

  it('donne à chaque séance de qualité un objectif qui lui est propre', () => {
    const avecQualite = P5.semainesContenu.filter((s) => qualiteDe(s).length === 1);
    verifierObjectifsDistincts(
      avecQualite.map((s) => qualiteDe(s)[0].objectif),
      'P5',
      avecQualite.map((s) => `S${s.numero}`),
    );
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
// ---------------------------------------------------------------------------
// P6, 16 km d'Andernos
// ---------------------------------------------------------------------------
//
// Sixième programme, et le seul qui entre en collision de calendrier avec le
// 10 km d'Izon : les deux courses tombent le dimanche 27 septembre. C'est ce
// qui explique l'absence totale de variante de semaine 9 et le champ `izon` à
// 'aucune' plutôt qu'à 'option'. Le reste de la trame est celle de P1, mais le
// calibrage vise une distance intermédiaire, entre le 10 km et le semi.
describe("P6, 16 km d'Andernos", () => {
  const QUALITE = new Set(['TEMPO', 'SEUIL', 'VMA']);
  const qualiteDe = (s) => s.seances.filter((x) => QUALITE.has(x.code));

  it('respecte les règles de progression', () => {
    expect(verifierProgramme(P6)).toBe(true);
  });

  it('compte 9 semaines de prépa plus une de récupération', () => {
    expect(P6.semainesContenu).toHaveLength(10);
    expect(P6.semainesContenu[8].phase).toBe('affutage');
    expect(P6.semainesContenu[9].phase).toBe('recuperation');
  });

  it('place la course le dernier jour de S9, comme le 10 km d\'Izon', () => {
    const s9 = P6.semainesContenu[8];
    expect(s9.seances.some((s) => s.code === 'COURSE')).toBe(true);
    expect(P6.dateCourse).toBe(P1.dateCourse); // même dimanche, d'où l'absence de variante.
  });

  it("porte l'identité attendue et n'ouvre aucune option Izon", () => {
    expect(P6.code).toBe('P6');
    expect(P6.nom).toBe("16 km d'Andernos");
    expect(P6.dateCourse).toBe('2026-09-27');
    // Ni 'objectif' (P1), ni 'integree' (P5), ni 'option' (P2 à P4) : sur P6, la
    // question d'Izon ne se pose pas, la course a lieu le même jour.
    expect(P6.izon).toBe('aucune');
    expect(P6.prerequis).toMatch(/1 h 15/);
    expect(P6.prerequis).toMatch(/16 km/);
    expect(P6.prerequis).not.toMatch(/30 minutes/);
  });

  it('suit la trame de P1, S1 à S3 bloc 1, S4 allégée, S5 à S7 bloc 2', () => {
    expect(P6.semainesContenu.map((s) => s.phase)).toEqual([
      'bloc1', 'bloc1', 'bloc1', 'allegee', 'bloc2', 'bloc2', 'bloc2', 'affutage', 'affutage', 'recuperation',
    ]);
    expect(P6.semainesContenu.map((s) => s.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('respecte le barème de volumes hors course et hors renfo', () => {
    // Le point serré est le couple S3 / S4 : une semaine allégée doit tomber à
    // 85 % ou moins de la précédente, et 200 x 0,85 fait exactement 170. S4
    // vaut donc 170 tout rond, ce qui fixe à lui seul la côte à 55 min et
    // l'endurance de la semaine à 50 min pile.
    expect(P6.semainesContenu.map(volumeHorsCourse)).toEqual([175, 185, 200, 170, 202, 215, 225, 178, 80, 125]);
    expect(Math.max(...P6.semainesContenu.map(volumeHorsCourse))).toBe(225); // pic en S7.
  });

  // Le calibrage demandé : 16 km, c'est entre le 10 km et le semi. Le contrôle
  // porte sur les sept semaines de bloc, les seules comparables d'un programme
  // à l'autre (les semaines d'affûtage et de récupération dépendent de la
  // longueur totale de la prépa, qui n'est pas la même).
  it('se situe partout entre P1 (10 km) et P3 (semi) sur les semaines de bloc', () => {
    const septPremieres = (p) => p.semainesContenu.slice(0, 7).map(volumeHorsCourse);
    const [dix, seize, semi] = [septPremieres(P1), septPremieres(P6), septPremieres(P3)];
    expect(dix).toEqual([165, 175, 190, 160, 192, 200, 208]);
    expect(seize).toEqual([175, 185, 200, 170, 202, 215, 225]);
    expect(semi).toEqual([185, 195, 207, 175, 210, 222, 233]);
    for (let i = 0; i < 7; i++) {
      expect(seize[i], `S${i + 1} : P6 doit peser plus qu'une prépa 10 km.`).toBeGreaterThan(dix[i]);
      expect(seize[i], `S${i + 1} : P6 doit peser moins qu'une prépa semi.`).toBeLessThan(semi[i]);
    }
  });

  it('tient le plancher de 50 min hors semaine de course et de récupération', () => {
    const EXCEPTIONS = new Set([9, 10]);
    let verifiees = 0;
    for (const s of P6.semainesContenu) {
      if (EXCEPTIONS.has(s.numero)) continue;
      for (const seance of s.seances.filter((x) => x.code !== 'RENFO')) {
        expect(
          seance.duree,
          `P6 S${s.numero} ${seance.id} : ${seance.duree} min, sous le plancher de 50 min.`,
        ).toBeGreaterThanOrEqual(50);
        verifiees++;
      }
    }
    expect(verifiees).toBe(24); // 8 semaines normales x 3 séances de course.
  });

  it('tient la sortie longue entre 65 et 90 min, sans jamais reculer dans un cycle', () => {
    const longues = P6.semainesContenu.flatMap((s) => s.seances).filter((x) => x.code === 'SL');
    expect(longues.map((x) => x.duree)).toEqual([65, 70, 75, 65, 80, 85, 90, 68]);
    for (const x of longues) {
      expect(x.duree).toBeGreaterThanOrEqual(65);
      expect(x.duree).toBeLessThanOrEqual(90); // 1 h 30, plafond utile sur 16 km.
    }
    // Elle grimpe à l'intérieur de chaque cycle et ne redescend qu'au passage
    // d'une semaine plus douce (S4) ou de l'affûtage (S8).
    const CYCLES = [[0, 1, 2], [4, 5, 6]];
    for (const cycle of CYCLES) {
      for (let i = 1; i < cycle.length; i++) {
        expect(longues[cycle[i]].duree).toBeGreaterThan(longues[cycle[i - 1]].duree);
      }
    }
    // Bornes réelles : elle part de l'habitude du dimanche et finit à 1 h 30.
    expect(longues[0].duree).toBe(65);
    expect(Math.max(...longues.map((x) => x.duree))).toBe(90);
  });

  it('assume par écrit la brièveté des séances de la semaine de course et de la récupération', () => {
    for (const numero of [9, 10]) {
      const s = P6.semainesContenu[numero - 1];
      const textes = [s.intention, ...s.seances.map((x) => x.description)].join(' ');
      expect(
        /but|voulu|dessein|exactement|pas un oubli|volontairement/i.test(textes),
        `P6 S${numero} : rien n'explique au coureur pourquoi les séances sont courtes.`,
      ).toBe(true);
    }
  });

  it("applique le barème d'échauffement à toutes les séances de qualité", () => {
    const palier = (duree) => (duree <= 40 ? [12, 7] : duree <= 50 ? [15, 8] : [20, 10]);
    const observees = [];
    for (const s of P6.semainesContenu) {
      for (const seance of qualiteDe(s)) {
        const m = seance.description.match(
          /^(\d+) min[^.]*?en Z2[^.]*?, puis .*?, puis (\d+) min de retour au calme/,
        );
        expect(m, `P6 S${s.numero} ${seance.code} : échauffement illisible.`).not.toBeNull();
        expect(
          [Number(m[1]), Number(m[2])],
          `P6 S${s.numero} ${seance.code} (${seance.duree} min) : palier d'échauffement hors barème.`,
        ).toEqual(palier(seance.duree));
        observees.push(seance.duree);
      }
    }
    // Huit des neuf séances passent 50 min et tombent sur le 20/10 standard ;
    // la neuvième est le rappel de la semaine de course, au palier 12/7.
    expect(observees).toEqual([60, 63, 68, 55, 69, 74, 69, 57, 37]);
  });

  // Convention impérative du projet : N répétitions donnent N-1 récupérations,
  // et la somme des segments décrits égale exactement la durée déclarée. Le
  // calcul se fait en secondes pour absorber les repères du type « 1 min 40 »
  // et « 8 min 30 » sans arrondi.
  it('réconcilie exactement la durée déclarée avec les segments décrits', () => {
    const REPERE = String.raw`\d+ min(?: \d+)?|\d+ s`;
    const enSecondes = (texte) => {
      const m = texte.trim().match(/^(?:(\d+) min(?: (\d+))?|(\d+) s)$/);
      expect(m, `Repère de durée illisible : « ${texte} »`).not.toBeNull();
      return m[3] !== undefined ? Number(m[3]) : Number(m[1]) * 60 + Number(m[2] ?? 0);
    };

    // La distance est reprise par référence arrière dans le repère : une séance
    // ne peut pas annoncer des 2000 m et chiffrer des 400 m.
    const series = new RegExp(
      String.raw`^(\d+) min[^.]*?en Z2, puis 2 séries de (\d+) fois (\d+) m en Z[1-5], ` +
        String.raw`en comptant environ (${REPERE}) par \3 m, avec (${REPERE}) de trottinement en Z1 ` +
        String.raw`entre chaque et (\d+) min entre les deux séries, puis (\d+) min de retour au calme`,
    );
    const mixte = new RegExp(
      String.raw`^(\d+) min[^.]*?en Z2, puis (\d+) fois (\d+) m puis (\d+) fois (\d+) m en Z[1-5], ` +
        String.raw`en comptant environ (${REPERE}) par \3 m et (${REPERE}) par \5 m, ` +
        String.raw`avec (\d+) min de trottinement en Z1 entre chaque bloc, puis (\d+) min de retour au calme`,
    );
    const blocsZ3 = new RegExp(
      String.raw`^(\d+) min[^.]*?en Z2, puis (\d+) fois (\d+) min en Z3, ` +
        String.raw`avec (\d+) min de trottinement en Z1 entre chaque, puis (\d+) min de retour au calme`,
    );
    const cotes =
      /^(\d+) min[^.]*?en Z2[^.]*?, puis (\d+) montées de (\d+) min en côte[^.]*?, avec (\d+) min de descente en marchant entre chaque, puis (\d+) min de retour au calme/;
    const lignes =
      /(\d+) min[^.]*? puis (\d+) lignes droites de (\d+) s en Z[45] avec 1 min de marche entre chaque, soit (\d+) min, puis (\d+) min/;

    const comptes = { series: 0, mixte: 0, blocsZ3: 0, cotes: 0, lignes: 0 };
    const exact = (secondes, seance) =>
      expect(
        secondes,
        `${seance.code} ${seance.duree} min : segments décrits incohérents dans « ${seance.description} »`,
      ).toBe(seance.duree * 60);

    for (const seance of P6.semainesContenu.flatMap((s) => s.seances)) {
      // Deux séries de N répétitions : 2(N-1) récupérations courtes, plus une
      // seule récupération longue entre les deux séries.
      const s = seance.description.match(series);
      if (s) {
        const n = Number(s[2]);
        exact(
          Number(s[1]) * 60 +
            2 * n * enSecondes(s[4]) +
            2 * (n - 1) * enSecondes(s[5]) +
            Number(s[6]) * 60 +
            Number(s[7]) * 60,
          seance,
        );
        comptes.series++;
        continue;
      }
      const p = seance.description.match(mixte);
      if (p) {
        const total = Number(p[2]) + Number(p[4]);
        exact(
          Number(p[1]) * 60 +
            Number(p[2]) * enSecondes(p[6]) +
            Number(p[4]) * enSecondes(p[7]) +
            (total - 1) * Number(p[8]) * 60 +
            Number(p[9]) * 60,
          seance,
        );
        comptes.mixte++;
        continue;
      }
      const b = seance.description.match(blocsZ3);
      if (b) {
        const n = Number(b[2]);
        exact(
          (Number(b[1]) + n * Number(b[3]) + (n - 1) * Number(b[4]) + Number(b[5])) * 60,
          seance,
        );
        comptes.blocsZ3++;
        continue;
      }
      const k = seance.description.match(cotes);
      if (k) {
        const n = Number(k[2]);
        exact(
          (Number(k[1]) + n * Number(k[3]) + (n - 1) * Number(k[4]) + Number(k[5])) * 60,
          seance,
        );
        comptes.cotes++;
        continue;
      }
      const l = seance.description.match(lignes);
      if (l) {
        const [, ech, n, secondes, bloc, retour] = l.map(Number);
        // Le bloc de lignes droites est logé À L'INTÉRIEUR de la durée déclarée.
        expect((n * secondes) / 60 + (n - 1)).toBe(bloc);
        expect(
          ech + bloc + retour,
          `${seance.code} ${seance.duree} min : lignes droites mal logées dans « ${seance.description} »`,
        ).toBe(seance.duree);
        comptes.lignes++;
      }
    }

    // Ancres de sécurité : si le parsing cassait, la boucle ne vérifierait
    // rien. Les 9 séances de qualité se répartissent en 2 séances en deux
    // séries (S1 et S6), 4 blocs mixtes en distance (S3, S5, S7, S9), 2 séances
    // de blocs en Z3 (S2, S8) et 1 séance de côte (S4).
    expect(comptes).toEqual({ series: 2, mixte: 4, blocsZ3: 2, cotes: 1, lignes: 4 });
    expect(comptes.series + comptes.mixte + comptes.blocsZ3 + comptes.cotes).toBe(
      P6.semainesContenu.flatMap((s) => s.seances).filter((x) => QUALITE.has(x.code)).length,
    );
  });

  describe('fractionné en distance', () => {
    const seancesQualite = P6.semainesContenu.flatMap((s) =>
      s.seances.filter((x) => QUALITE.has(x.code)).map((x) => ({ semaine: s.numero, phase: s.phase, seance: x })),
    );
    const enDistance = ({ seance }) => /\d+ fois \d+ m en Z[1-5]/.test(seance.description);
    const distancesCitees = (description) =>
      [...description.matchAll(/(\d+) fois (\d+) m/g)].map((m) => Number(m[2]));

    it('fait dominer le fractionné en distance sur le fractionné en durée', () => {
      const distance = seancesQualite.filter(enDistance);
      expect(distance.map((q) => q.semaine)).toEqual([1, 3, 5, 6, 7, 9]);
      expect(distance.length).toBeGreaterThan(seancesQualite.length - distance.length);
      // Le travail à l'allure spécifique reste en minutes : un bloc tenu en Z3
      // ne se pense pas en mètres.
      for (const { seance } of seancesQualite.filter((q) => q.seance.zone === 'Z3')) {
        expect(
          enDistance({ seance }),
          `P6 ${seance.code} : le travail en Z3 doit rester en durée, pas en distance.`,
        ).toBe(false);
      }
    });

    it('porte le seuil sur 1000, 2000 et 3000 m, et garde 200 et 400 m pour la vivacité', () => {
      const parSemaine = new Map(seancesQualite.map((q) => [q.semaine, q]));
      // Les longues répétitions au seuil, adaptées à 16 km : le 3000 m arrive
      // au pic de charge, jamais avant.
      const auSeuil = seancesQualite.filter((q) => q.seance.zone === 'Z4');
      expect(auSeuil.map((q) => q.semaine)).toEqual([3, 5, 7, 9]);
      for (const q of auSeuil) {
        for (const metres of distancesCitees(q.seance.description)) {
          expect([500, 1000, 2000, 3000]).toContain(metres);
        }
      }
      expect(distancesCitees(parSemaine.get(7).seance.description)).toContain(3000);
      expect(distancesCitees(parSemaine.get(5).seance.description)).toContain(2000);
      expect(distancesCitees(parSemaine.get(3).seance.description)).toContain(1000);

      // Le travail rapide reste court : 200 m et 400 m, jamais au-delà.
      const rapides = seancesQualite.filter((q) => q.seance.zone === 'Z5');
      expect(rapides.map((q) => q.semaine)).toEqual([1, 4, 6]);
      for (const q of rapides) {
        const metres = distancesCitees(q.seance.description);
        if (metres.length > 0) {
          for (const m of metres) expect(m).toBeLessThanOrEqual(400);
          continue;
        }
        // Seule exception assumée : la côte de la semaine allégée. Une pente ne
        // se décrit pas en mètres, elle ne coûte pas le même effort d'un
        // coureur et d'un profil à l'autre.
        expect(
          q.semaine,
          `P6 S${q.semaine} : une séance en Z5 doit être décrite en distance, sauf la côte de S4.`,
        ).toBe(4);
        expect(q.seance.description).toMatch(/\d+ montées de \d+ min en côte/);
        expect(q.seance.description).toMatch(/descente en marchant/);
      }
    });

    it("travaille l'allure spécifique en blocs de Z3, ce que 16 km demande plus que 10", () => {
      const enZ3 = seancesQualite.filter((q) => q.seance.zone === 'Z3');
      expect(enZ3.map((q) => q.semaine)).toEqual([2, 8]);
      for (const q of enZ3) {
        expect(q.seance.description).toMatch(/\d+ fois \d+ min en Z3/);
      }
      // Deux séances de Z3 sur neuf là où P1 n'en compte qu'une sur neuf :
      // c'est la différence de nature entre les deux distances.
      const z3DeP1 = P1.semainesContenu
        .flatMap((s) => s.seances)
        .filter((x) => QUALITE.has(x.code) && x.zone === 'Z3');
      expect(enZ3.length).toBeGreaterThan(z3DeP1.length);
    });

    it('présente le repère de durée comme une estimation et jamais comme une allure imposée', () => {
      const distance = seancesQualite.filter(enDistance);
      expect(distance.map((q) => q.semaine)).toEqual([1, 3, 5, 6, 7, 9]);
      for (const { semaine, seance } of distance) {
        expect(
          seance.description,
          `P6 S${semaine} : séance en distance sans repère de durée par répétition.`,
        ).toMatch(/en comptant environ (?:\d+ min(?: \d+)?|\d+ s) par \d+ m/);
        expect(
          seance.description,
          `P6 S${semaine} : le repère de durée n'est pas présenté comme une estimation.`,
        ).toMatch(/estimation de planification/);
        expect(
          seance.description,
          `P6 S${semaine} : le repère de durée n'est pas démenti comme allure à tenir.`,
        ).toMatch(/jamais une allure à tenir/);
      }
      // Les repères employés sont exactement ceux du référentiel du projet.
      const REFERENCE = { 200: '45 s', 400: '1 min 40', 500: '2 min', 1000: '4 min', 2000: '8 min 30', 3000: '13 min' };
      for (const { semaine, seance } of distance) {
        for (const [, repere, metres] of seance.description.matchAll(
          /environ (\d+ min(?: \d+)?|\d+ s) par (\d+) m/g,
        )) {
          expect(
            repere,
            `P6 S${semaine} : repère hors référentiel pour ${metres} m.`,
          ).toBe(REFERENCE[metres]);
        }
      }
      const textes = distance.map((q) => q.seance.description).join(' ');
      expect(textes).not.toMatch(/min\/km/);
      expect(textes).not.toMatch(/km\/h/);
    });
  });

  // -------------------------------------------------------------------------
  // Variété des séances de qualité
  // -------------------------------------------------------------------------
  const MENU_QUALITE = [
    { semaine: 1, phase: 'bloc1', code: 'VMA', zone: 'Z5', duree: 60, forme: '2 séries de 8 fois 200 m en Z5' },
    { semaine: 2, phase: 'bloc1', code: 'TEMPO', zone: 'Z3', duree: 63, forme: '2 fois 14 min en Z3' },
    { semaine: 3, phase: 'bloc1', code: 'SEUIL', zone: 'Z4', duree: 68, forme: '4 fois 1000 m puis 4 fois 500 m en Z4' },
    { semaine: 4, phase: 'allegee', code: 'VMA', zone: 'Z5', duree: 55, forme: '9 montées de 1 min en côte' },
    { semaine: 5, phase: 'bloc2', code: 'SEUIL', zone: 'Z4', duree: 69, forme: '2 fois 2000 m puis 5 fois 500 m en Z4' },
    { semaine: 6, phase: 'bloc2', code: 'VMA', zone: 'Z5', duree: 74, forme: '2 séries de 6 fois 400 m en Z5' },
    { semaine: 7, phase: 'bloc2', code: 'SEUIL', zone: 'Z4', duree: 69, forme: '2 fois 3000 m puis 2 fois 500 m en Z4' },
    { semaine: 8, phase: 'affutage', code: 'TEMPO', zone: 'Z3', duree: 57, forme: '2 fois 11 min en Z3' },
    { semaine: 9, phase: 'affutage', code: 'SEUIL', zone: 'Z4', duree: 37, forme: '2 fois 1000 m puis 2 fois 500 m en Z4' },
  ];

  it('programme une séance de qualité par semaine, de la première à la dernière', () => {
    for (const s of P6.semainesContenu.slice(0, 9)) {
      expect(
        qualiteDe(s).length,
        `P6 S${s.numero} : ${qualiteDe(s).length} séance(s) de qualité, il en faut exactement une.`,
      ).toBe(1);
    }
    expect(qualiteDe(P6.semainesContenu[9])).toEqual([]);
  });

  it('aligne neuf séances de qualité, neuf formats distincts, sans jamais répéter une séquence', () => {
    const observees = P6.semainesContenu.slice(0, 9).map((s) => {
      const [seance] = qualiteDe(s);
      return { semaine: s.numero, phase: s.phase, code: seance.code, zone: seance.zone, duree: seance.duree };
    });
    expect(observees).toEqual(MENU_QUALITE.map(({ forme, ...reste }) => reste));

    for (const attendue of MENU_QUALITE) {
      const [seance] = qualiteDe(P6.semainesContenu[attendue.semaine - 1]);
      expect(
        seance.description,
        `P6 S${attendue.semaine} : la séance ne décrit pas la séquence attendue « ${attendue.forme} ».`,
      ).toContain(attendue.forme);
    }
    expect(new Set(MENU_QUALITE.map((q) => q.forme)).size).toBe(9);
    const descriptions = P6.semainesContenu.slice(0, 9).map((s) => qualiteDe(s)[0].description);
    expect(new Set(descriptions).size).toBe(9);
    expect(new Set(MENU_QUALITE.map((q) => q.zone))).toEqual(new Set(['Z3', 'Z4', 'Z5']));
  });

  it("n'attend pas pour employer le travail rapide : la Z5 arrive dès la semaine 1", () => {
    const numeroPremiereZone = (zone) =>
      P6.semainesContenu.find((s) => s.seances.some((x) => QUALITE.has(x.code) && x.zone === zone))?.numero;
    expect(numeroPremiereZone('Z5')).toBe(1);
    expect(numeroPremiereZone('Z5')).toBeLessThan(numeroPremiereZone('Z3'));
    expect(numeroPremiereZone('Z3')).toBeLessThan(numeroPremiereZone('Z4'));
    // Le premier bloc emploie à lui seul les trois zones de travail.
    const bloc1 = P6.semainesContenu.filter((s) => s.phase === 'bloc1').flatMap(qualiteDe);
    expect(new Set(bloc1.map((x) => x.zone))).toEqual(new Set(['Z3', 'Z4', 'Z5']));
  });

  it('donne à chaque séance de qualité un objectif qui lui est propre', () => {
    const objectifs = P6.semainesContenu.slice(0, 9).map((s) => qualiteDe(s)[0].objectif);
    expect(new Set(objectifs).size).toBe(9);
    const motsPleins = (texte) =>
      new Set(
        texte
          .toLowerCase()
          .split(/[^a-zà-öø-ÿ0-9]+/)
          .filter((mot) => mot.length > 5),
      );
    for (let i = 0; i < objectifs.length; i++) {
      for (let j = i + 1; j < objectifs.length; j++) {
        const [a, b] = [motsPleins(objectifs[i]), motsPleins(objectifs[j])];
        const communs = [...a].filter((mot) => b.has(mot));
        const recouvrement = communs.length / Math.min(a.size, b.size);
        expect(
          recouvrement,
          `P6 S${i + 1} et S${j + 1} : objectifs trop proches (${communs.join(', ')}).`,
        ).toBeLessThan(0.5);
      }
    }
  });

  it('introduit des lignes droites en Z5 à la fin du bloc 1, puis les entretient', () => {
    const estLigneDroite = (x) =>
      /lignes droites/.test(x.description) && zonesSecondairesDe(x).includes('Z5');
    const semainesAvecLignes = P6.semainesContenu
      .filter((s) => s.seances.some(estLigneDroite))
      .map((s) => s.numero);

    const finBloc1 = Math.max(
      ...P6.semainesContenu.filter((s) => s.phase === 'bloc1').map((s) => s.numero),
    );
    expect(finBloc1).toBe(3);
    expect(semainesAvecLignes).toEqual([3, 5, 6, 8]);
    expect(semainesAvecLignes.every((n) => n >= finBloc1)).toBe(true);
    expect(semainesAvecLignes).not.toContain(9); // jamais la semaine de course.
    expect(semainesAvecLignes).not.toContain(7); // ni la semaine au pic de charge.

    for (const s of P6.semainesContenu) {
      for (const seance of s.seances.filter(estLigneDroite)) {
        expect(seance.code).toBe('EF');
        expect(seance.description).toMatch(/[456] lignes droites de (15|20) s en Z5/);
        expect(seance.description).toMatch(/marche/);
      }
    }
  });

  it("n'emploie jamais de tiret cadratin ni d'allure chiffrée dans les textes affichés", () => {
    const textes = P6.semainesContenu.flatMap((s) => [
      s.titre,
      s.intention,
      ...s.seances.flatMap((x) => [x.titre, x.description, x.objectif]),
    ]);
    expect(textes.join(' ')).not.toContain('—');
    expect(textes.join(' ')).not.toMatch(/min\/km/);
    expect(textes.join(' ')).not.toMatch(/km\/h/);
  });

  it('donne à chaque séance une description exécutable et un objectif rédigé', () => {
    for (const s of P6.semainesContenu) {
      for (const seance of s.seances) {
        expect(seance.description.length).toBeGreaterThan(30);
        expect(seance.objectif.length).toBeGreaterThan(15);
      }
    }
  });

  it("varie les textes, aucune description n'est copiée d'une semaine à l'autre", () => {
    const descriptions = P6.semainesContenu.flatMap((s) => s.seances.map((x) => x.description));
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});

describe('registre (src/programmes/index.js)', () => {
  it('expose les six programmes, dans l\'ordre P1 à P6', () => {
    expect(Object.keys(REGISTRE_PROGRAMMES)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
    expect(REGISTRE_PROGRAMMES).toEqual({ P1, P2, P3, P4, P5, P6 });
  });

  // P6 est servi par le registre exactement comme les cinq autres : c'est la
  // seule voie par laquelle le Worker lit un contenu, et un programme qui n'y
  // serait pas inscrit resterait invisible du coureur même si son fichier est
  // parfaitement écrit.
  it('sert P6 par le registre, de la première à la dernière semaine', () => {
    expect(programme('P6')).toBe(P6);
    const s1 = semaineDuProgramme('P6', 1, {});
    expect(s1).not.toBeNull();
    expect(s1.numero).toBe(1);
    expect(s1.phase).toBe('bloc1');
    expect(s1.seances).toHaveLength(4);
    for (let n = 1; n <= 10; n++) {
      expect(semaineDuProgramme('P6', n, {}), `P6 S${n} : semaine absente du registre.`).not.toBeNull();
    }
    expect(semaineDuProgramme('P6', 11, {})).toBeNull();
  });

  it("sur P6, l'option faitIzon est sans effet : Andernos tombe le jour d'Izon", () => {
    expect(P6.izon).toBe('aucune');
    for (let n = 1; n <= 10; n++) {
      expect(semaineDuProgramme('P6', n, { faitIzon: true })).toEqual(
        semaineDuProgramme('P6', n, { faitIzon: false }),
      );
    }
    // Aucune semaine ne porte de variante, et la seule séance COURSE du
    // programme est celle d'Andernos, en S9.
    expect(P6.semainesContenu.some((s) => s.variantes)).toBe(false);
    const courses = P6.semainesContenu.flatMap((s) =>
      s.seances.filter((x) => x.code === 'COURSE').map((x) => ({ semaine: s.numero, titre: x.titre })),
    );
    expect(courses).toEqual([{ semaine: 9, titre: "16 km d'Andernos" }]);
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
