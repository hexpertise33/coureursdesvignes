import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { normaliserPrenom, creerOuTrouver, parId } from '../src/coureurs.js';

describe('normalisation', () => {
  it("regroupe les variantes d'écriture", () => {
    expect(normaliserPrenom('Jean-Mi')).toBe('jeanmi');
    expect(normaliserPrenom('jean mi')).toBe('jeanmi');
    expect(normaliserPrenom('  JEAN-MI  ')).toBe('jeanmi');
  });

  it('retire les accents', () => {
    expect(normaliserPrenom('Hélène')).toBe('helene');
    expect(normaliserPrenom('Loïc')).toBe('loic');
  });

  it('distingue deux prénoms réellement différents', () => {
    expect(normaliserPrenom('Jean-Michel')).not.toBe(normaliserPrenom('Jean-Mi'));
  });

  it('rejette un prénom vide', () => {
    expect(() => normaliserPrenom('   ')).toThrow(/prénom/i);
  });

  // Cas limites non couverts par le brief.

  it('rejette un prénom composé uniquement de ponctuation', () => {
    expect(() => normaliserPrenom('!!! - ... , ;')).toThrow(/prénom/i);
  });

  it("n'échoue pas sur un prénom très long et conserve toutes ses lettres", () => {
    const long = 'a'.repeat(300);
    expect(normaliserPrenom(long)).toBe(long);
    expect(normaliserPrenom(long)).toHaveLength(300);
  });

  it('conserve les lettres accentuées non latines plutôt que de vider la clé', () => {
    // Le club n'est pas composé exclusivement de prénoms français : un
    // prénom cyrillique ou en idéogrammes est un prénom réel, pas une
    // chaîne "vide ou ponctuation seulement". Une normalisation qui ne
    // garderait que a-z0-9 viderait entièrement ces prénoms et les
    // rejetterait à tort avec le même message qu'un champ non renseigné.
    expect(normaliserPrenom('Владимир')).toBe('владимир');
    expect(() => normaliserPrenom('李雷')).not.toThrow();
    expect(normaliserPrenom('李雷')).toBe('李雷');
  });
});

describe('création', () => {
  it('crée puis retrouve le même coureur', async () => {
    const a = await creerOuTrouver(env.DB, { prenom: 'Marie', programme: 'P3', faitIzon: true });
    const b = await creerOuTrouver(env.DB, { prenom: 'marie', programme: 'P3', faitIzon: true });
    expect(b.id).toBe(a.id);
  });

  it('met à jour le programme si le coureur revient et en change', async () => {
    await creerOuTrouver(env.DB, { prenom: 'Paul', programme: 'P1', faitIzon: false });
    const maj = await creerOuTrouver(env.DB, { prenom: 'Paul', programme: 'P4', faitIzon: true });
    expect(maj.programme).toBe('P4');
    expect(maj.fait_izon).toBe(1);
  });

  it('refuse un programme inconnu', async () => {
    await expect(creerOuTrouver(env.DB, { prenom: 'Zoe', programme: 'P9' })).rejects.toThrow(/programme/i);
  });

  it('retrouve par identifiant', async () => {
    const c = await creerOuTrouver(env.DB, { prenom: 'Luc', programme: 'P2' });
    expect((await parId(env.DB, c.id)).prenom).toBe('Luc');
  });

  // Cas limites non couverts par le brief.

  it('conserve la casse et les accents saisis dans le prénom affiché', async () => {
    const c = await creerOuTrouver(env.DB, { prenom: 'Bérénice', programme: 'P2' });
    expect(c.prenom).toBe('Bérénice');
    expect(c.cle).toBe('berenice');
  });

  it('refuse un prénom composé uniquement de ponctuation même avec un programme valide', async () => {
    await expect(creerOuTrouver(env.DB, { prenom: '   ...   ', programme: 'P1' })).rejects.toThrow(/prénom/i);
  });

  it('accepte un prénom très long et le retrouve intact', async () => {
    const long = 'Jeanne' + 'x'.repeat(250);
    const c = await creerOuTrouver(env.DB, { prenom: long, programme: 'P1' });
    expect((await parId(env.DB, c.id)).prenom).toBe(long);
  });

  it('accepte un prénom en caractères non latins', async () => {
    const c = await creerOuTrouver(env.DB, { prenom: 'Владимир', programme: 'P5' });
    expect(c.prenom).toBe('Владимир');
    expect(c.cle).toBe('владимир');
  });

  it('accepte une variante de course valide pour P4', async () => {
    const c = await creerOuTrouver(env.DB, { prenom: 'Karim', programme: 'P4', varianteCourse: 'bordeaux' });
    expect(c.variante_course).toBe('bordeaux');
  });

  it('refuse une variante de course inconnue pour P4', async () => {
    await expect(
      creerOuTrouver(env.DB, { prenom: 'Nadia', programme: 'P4', varianteCourse: 'lyon' }),
    ).rejects.toThrow(/variante/i);
  });

  it('ignore une variante de course fournie hors P4', async () => {
    const c = await creerOuTrouver(env.DB, { prenom: 'Farid', programme: 'P1', varianteCourse: 'bordeaux' });
    expect(c.variante_course).toBeNull();
  });

  it('deux créations concurrentes du même prénom ne créent qu\'un seul coureur', async () => {
    // Même scénario que la limitation de débit dans auth.js : sans upsert
    // atomique, des requêtes concurrentes pourraient toutes lire "aucune
    // ligne" avant qu'aucune n'ait écrit, et créer plusieurs coureurs pour
    // la même personne au lieu d'un seul.
    const resultats = await Promise.all(
      Array.from({ length: 15 }, () =>
        creerOuTrouver(env.DB, { prenom: 'Sophie', programme: 'P3', faitIzon: false }),
      ),
    );
    const idsDistincts = new Set(resultats.map((r) => r.id));
    expect(idsDistincts.size).toBe(1);

    const { results } = await env.DB.prepare('SELECT COUNT(*) AS n FROM coureurs WHERE cle = ?')
      .bind('sophie')
      .all();
    expect(results[0].n).toBe(1);
  });
});
