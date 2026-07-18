import { describe, it, expect } from 'vitest';
import { ZONES, ef, sl, vma, seuil, recup, renfo, course, semaine, volume, volumeHorsCourse, zonesSecondairesDe } from '../src/programmes/seances.js';
import { verifierProgramme } from '../src/programmes/regles.js';
import { P1 } from '../src/programmes/p1-10km-izon.js';
import { P2 } from '../src/programmes/p2-10km-bordeaux.js';
import { P3 } from '../src/programmes/p3-semi-bordeaux.js';
import * as programmesIzon from '../src/programmes/p1-10km-izon.js';
import * as programmes10kmBordeaux from '../src/programmes/p2-10km-bordeaux.js';
import * as programmesSemiBordeaux from '../src/programmes/p3-semi-bordeaux.js';

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
  // Registre des programmes soumis au contrôle. Tout module de programme
  // ajouté au projet doit être listé ici, sans quoi son contenu échapperait
  // silencieusement au test.
  const modules = [programmesIzon, programmes10kmBordeaux, programmesSemiBordeaux];
  const exportes = modules
    .flatMap((m) => Object.values(m))
    .filter((p) => p && Array.isArray(p.semainesContenu));

  // Les semaines à variantes n'exposent par défaut que la variante sansIzon
  // dans leur champ `seances` : la variante avecIzon serait donc invisible du
  // contrôle. On l'ajoute au registre sous la forme d'un programme fictif
  // d'une seule semaine, pour que ses séances soient vérifiées comme les
  // autres.
  const variantesAvecIzon = exportes.flatMap((p) =>
    p.semainesContenu
      .filter((s) => s.variantes)
      .map((s) => ({ code: `${p.code} (variante avecIzon)`, semainesContenu: [s.variantes.avecIzon] })),
  );

  const programmes = [...exportes, ...variantesAvecIzon];

  it('couvre les trois programmes écrits et leurs variantes de semaine 9', () => {
    expect(exportes.map((p) => p.code)).toEqual(['P1', 'P2', 'P3']);
    expect(variantesAvecIzon.map((p) => p.code)).toEqual([
      'P2 (variante avecIzon)',
      'P3 (variante avecIzon)',
    ]);
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

// Reconstruit un programme en substituant, en semaine 9, les séances de la
// variante demandée. Le champ `phase` de la semaine reste celui de l'entrée
// principale : les deux variantes partagent la même phase, seule leur charge
// diffère.
const avecVariante = (p, nom) => ({
  ...p,
  semainesContenu: p.semainesContenu.map((s) =>
    s.numero === 9 && s.variantes ? { ...s, seances: s.variantes[nom].seances } : s,
  ),
});

describe.each([
  ['P2', P2],
  ['P3', P3],
])('%s', (nom, p) => {
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

  it('expose par défaut la variante sansIzon en S9', () => {
    const s9 = p.semainesContenu[8];
    expect(s9.seances).toBe(s9.variantes.sansIzon.seances);
  });

  it('place la course objectif en S15', () => {
    expect(p.semainesContenu[14].seances.some((s) => s.code === 'COURSE')).toBe(true);
  });

  it("laisse Izon en option et vise la date du 8 novembre", () => {
    expect(p.izon).toBe('option');
    expect(p.dateCourse).toBe('2026-11-08');
  });

  it('suit la trame de phases imposée', () => {
    expect(p.semainesContenu.map((s) => s.phase)).toEqual([
      'bloc1', 'bloc1', 'bloc1', 'allegee',
      'bloc2', 'bloc2', 'bloc2', 'allegee',
      'allegee',
      'bloc3', 'bloc3', 'bloc3', 'allegee',
      'affutage', 'affutage', 'recuperation',
    ]);
    expect(p.semainesContenu.map((s) => s.numero)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    );
  });

  it('atteint son pic de charge en S12 et nulle part ailleurs', () => {
    const volumes = p.semainesContenu.map(volumeHorsCourse);
    expect(Math.max(...volumes)).toBe(volumes[11]);
    expect(volumes.filter((v) => v === volumes[11])).toHaveLength(1);
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

  it("ne reprend aucune description telle quelle à P1", () => {
    const deP1 = new Set(P1.semainesContenu.flatMap((s) => s.seances.map((x) => x.description)));
    const communes = p.semainesContenu
      .flatMap((s) => s.seances.map((x) => x.description))
      .filter((d) => deP1.has(d));
    expect(communes).toEqual([]);
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
});

describe('P2, 10 km de Bordeaux', () => {
  it("porte l'identité et le prérequis attendus", () => {
    expect(P2.code).toBe('P2');
    expect(P2.nom).toBe('10 km de Bordeaux');
    expect(P2.prerequis).toMatch(/30 minutes/);
  });

  it('respecte son barème de volumes hors course et hors renfo', () => {
    expect(P2.semainesContenu.map(volumeHorsCourse)).toEqual([
      100, 108, 117, 96, 126, 136, 147, 122, 100, 140, 151, 162, 132, 118, 55, 90,
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
      130, 141, 152, 124, 160, 172, 185, 152, 126, 172, 186, 200, 165, 140, 61, 105,
    ]);
    expect(volumeHorsCourse(P3.semainesContenu[8].variantes.avecIzon)).toBe(70);
  });

  it('monte la sortie longue à 1 h 50 en S12', () => {
    const s12 = P3.semainesContenu[11].seances.find((x) => x.code === 'SL');
    expect(s12.duree).toBe(110);
    const longues = P3.semainesContenu.flatMap((s) => s.seances.filter((x) => x.code === 'SL'));
    expect(Math.max(...longues.map((x) => x.duree))).toBe(110);
  });

  it('travaille majoritairement en Z3 et Z4', () => {
    const dures = P3.semainesContenu
      .flatMap((s) => s.seances)
      .filter((x) => ['TEMPO', 'SEUIL', 'VMA'].includes(x.code));
    expect(dures.every((x) => x.zone === 'Z3' || x.zone === 'Z4')).toBe(true);
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
