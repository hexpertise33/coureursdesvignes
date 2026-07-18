import { describe, it, expect } from 'vitest';
import { ZONES, ef, sl, vma, seuil, recup, renfo, course, semaine, volume, volumeHorsCourse } from '../src/programmes/seances.js';
import { verifierProgramme } from '../src/programmes/regles.js';
import { P1 } from '../src/programmes/p1-10km-izon.js';

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
    expect(P1.semainesContenu.map(volumeHorsCourse)).toEqual([110, 115, 125, 100, 130, 143, 147, 115, 53, 90]);
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
