import { describe, it, expect, vi } from 'vitest';
import { instantPublication, estPubliee, semaineCourante, parisVersUtc } from '../src/calendrier.js';

const utc = (s) => Date.parse(s);

describe('instant de publication', () => {
  it('publie la semaine 1 le dimanche 26 juillet 19 h Paris, soit 17 h UTC', () => {
    expect(instantPublication(1)).toBe(utc('2026-07-26T17:00:00Z'));
  });

  it('publie la semaine 13 en heure d\'été, 17 h UTC', () => {
    expect(instantPublication(13)).toBe(utc('2026-10-18T17:00:00Z'));
  });

  it("publie la semaine 14 le jour du changement d'heure, en heure d'hiver, 18 h UTC", () => {
    expect(instantPublication(14)).toBe(utc('2026-10-25T18:00:00Z'));
  });

  it("publie la semaine 15 en heure d'hiver, 18 h UTC", () => {
    expect(instantPublication(15)).toBe(utc('2026-11-01T18:00:00Z'));
  });
});

describe('publication', () => {
  it('cache la semaine une minute avant 19 h', () => {
    expect(estPubliee(1, utc('2026-07-26T16:59:00Z'))).toBe(false);
  });

  it('ouvre la semaine à 19 h pile', () => {
    expect(estPubliee(1, utc('2026-07-26T17:00:00Z'))).toBe(true);
  });
});

describe('semaine courante', () => {
  it('renvoie 0 avant la première publication', () => {
    expect(semaineCourante(utc('2026-07-20T10:00:00Z'), 16)).toBe(0);
  });

  it('renvoie 1 pendant la première semaine', () => {
    expect(semaineCourante(utc('2026-07-29T10:00:00Z'), 16)).toBe(1);
  });

  it('ne dépasse jamais la longueur du programme', () => {
    expect(semaineCourante(utc('2027-03-01T10:00:00Z'), 16)).toBe(16);
  });

  it("l'instant de publication est strictement croissant de la semaine 1 à 17 (propriété dont dépend le break)", () => {
    for (let n = 1; n < 17; n++) {
      expect(instantPublication(n + 1)).toBeGreaterThan(instantPublication(n));
    }
  });

  it("s'arrête dès la première semaine non publiée au lieu de balayer tout le programme (verrouille le break)", () => {
    // decalageParisMinutes construit un Intl.DateTimeFormat à chaque appel :
    // compter ces constructions revient à compter le nombre de semaines
    // effectivement examinées par la boucle. Avec le `break`, seules la
    // semaine publiée et la première semaine non publiée sont examinées
    // (2 semaines x 2 constructions par instantPublication = 4). Si `break`
    // devenait `continue`, les 17 semaines seraient examinées (34
    // constructions) : ce test échouerait alors, sans avoir à connaître par
    // avance le nombre exact de semaines publiées.
    const ConstructeurOriginal = Intl.DateTimeFormat;
    const espion = vi
      .spyOn(Intl, 'DateTimeFormat')
      .mockImplementation((...args) => new ConstructeurOriginal(...args));

    const resultat = semaineCourante(utc('2026-07-29T10:00:00Z'), 17);

    expect(resultat).toBe(1);
    expect(espion).toHaveBeenCalledTimes(4);
    espion.mockRestore();
  });
});

describe("heure locale inexistante (passage à l'heure d'été)", () => {
  it('reporte le 29/03/2026 2 h 30 (inexistante, l\'horloge saute de 2 h à 3 h) après le saut, à 1 h 30 UTC', () => {
    // Convention retenue : une heure locale inexistante est reportée après
    // le saut (comme la plupart des bibliothèques de fuseaux horaires, ex.
    // java.time). 2 h 30 + 1 h de saut = 3 h 30 heure d'été (UTC+2) = 1 h 30 UTC.
    expect(parisVersUtc(2026, 3, 29, 2, 30)).toBe(utc('2026-03-29T01:30:00Z'));
  });

  it('reste stable sur une heure ambiguë du passage à l\'heure d\'hiver (25/10/2026 2 h 30, qui existe deux fois)', () => {
    expect(parisVersUtc(2026, 10, 25, 2, 30)).toBe(utc('2026-10-25T01:30:00Z'));
  });
});
