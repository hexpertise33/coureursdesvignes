import { describe, it, expect } from 'vitest';
import { instantPublication, estPubliee, semaineCourante } from '../src/calendrier.js';

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
});
