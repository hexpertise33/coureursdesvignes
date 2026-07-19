import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { normaliserPrenom, creerOuTrouver, parId, nomAffiche } from '../src/coureurs.js';

describe('normalisation', () => {
  it("regroupe les variantes d'écriture", () => {
    expect(normaliserPrenom('Jean-Mi')).toBe('jeanmi');
    expect(normaliserPrenom('jean mi')).toBe('jeanmi');
    expect(normaliserPrenom('  JEAN-MI  ')).toBe('jeanmi');
  });

  it('retire les accents', () => {
    expect(normaliserPrenom('Hélène')).toBe('helene');
    expect(normaliserPrenom('Loïc')).toBe('loic');
    expect(normaliserPrenom('Noël')).toBe('noel');
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

  it('refuse un prénom au-delà de la borne de longueur, accepte en dessous', () => {
    // Absence de toute borne, initialement traitée comme documentée et
    // acceptée (un prénom de 300 caractères passait). Un client pouvait
    // ainsi faire stocker un texte de taille arbitraire : une borne
    // raisonnable (40 caractères) est désormais appliquée et vérifiée dans
    // les deux sens, refus au-delà, acceptation en-deçà.
    const auDela = 'a'.repeat(41);
    expect(() => normaliserPrenom(auDela)).toThrow(/40 caractères/i);

    const surLaBorne = 'a'.repeat(40);
    expect(normaliserPrenom(surLaBorne)).toBe(surLaBorne);
    expect(normaliserPrenom(surLaBorne)).toHaveLength(40);

    const enDessous = 'a'.repeat(20);
    expect(normaliserPrenom(enDessous)).toBe(enDessous);
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

describe('identité prénom + initiale', () => {
  it("refuse une initiale absente", async () => {
    await expect(creerOuTrouver(env.DB, { prenom: 'Alex', programme: 'P1' })).rejects.toThrow(/initiale/i);
  });

  it('refuse une initiale vide ou uniquement faite d\'espaces', async () => {
    await expect(
      creerOuTrouver(env.DB, { prenom: 'Alex', initiale: '', programme: 'P1' }),
    ).rejects.toThrow(/initiale/i);
    await expect(
      creerOuTrouver(env.DB, { prenom: 'Alex', initiale: '   ', programme: 'P1' }),
    ).rejects.toThrow(/initiale/i);
  });

  it("refuse une initiale de plusieurs lettres", async () => {
    await expect(
      creerOuTrouver(env.DB, { prenom: 'Alex', initiale: 'Bo', programme: 'P1' }),
    ).rejects.toThrow(/initiale/i);
  });

  it("refuse une initiale qui n'est pas une lettre", async () => {
    await expect(
      creerOuTrouver(env.DB, { prenom: 'Alex', initiale: '7', programme: 'P1' }),
    ).rejects.toThrow(/initiale/i);
  });

  it("accepte une initiale suivie d'un point abréviatif, avec le même résultat que sans le point", async () => {
    const avecPoint = await creerOuTrouver(env.DB, { prenom: 'Igor', initiale: 'B.', programme: 'P1' });
    expect(avecPoint.initiale).toBe('B');
  });

  it("verrouille le cas des homonymes : même prénom, initiales différentes → deux coureurs distincts, sans écrasement", async () => {
    // C'est exactement le scénario constaté par l'encadrant : deux "Julien"
    // s'inscrivent. Sans initiale dans la clé, le second écrase le
    // programme, la variante de course et le statut Izon du premier.
    const julienB = await creerOuTrouver(env.DB, {
      prenom: 'Julien',
      initiale: 'B',
      programme: 'P1',
      faitIzon: true,
    });
    const julienM = await creerOuTrouver(env.DB, {
      prenom: 'Julien',
      initiale: 'M',
      programme: 'P4',
      varianteCourse: 'bordeaux',
      faitIzon: false,
    });

    // Deux identifiants distincts et deux clés distinctes.
    expect(julienM.id).not.toBe(julienB.id);
    expect(julienM.cle).not.toBe(julienB.cle);

    // Le second n'a rien écrasé du premier : en relisant le premier par son
    // identifiant, son programme, sa variante et son statut Izon d'origine
    // sont toujours ceux qu'il a lui-même choisis, pas ceux du second.
    const julienBRelu = await parId(env.DB, julienB.id);
    expect(julienBRelu.programme).toBe('P1');
    expect(julienBRelu.variante_course).toBeNull();
    expect(julienBRelu.fait_izon).toBe(1);
    expect(julienBRelu.initiale).toBe('B');

    const julienMRelu = await parId(env.DB, julienM.id);
    expect(julienMRelu.programme).toBe('P4');
    expect(julienMRelu.variante_course).toBe('bordeaux');
    expect(julienMRelu.fait_izon).toBe(0);
    expect(julienMRelu.initiale).toBe('M');

    // Une seule ligne par personne en base, pas une ligne mélangeant les
    // deux (le point qui manquait totalement avant l'initiale).
    const { results } = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM coureurs WHERE prenom = 'Julien'",
    ).all();
    expect(results[0].n).toBe(2);
  });

  it("julien b, Julien B. et JULIEN B donnent la même clé ; Julien B et Julien M en donnent deux différentes", async () => {
    const a = await creerOuTrouver(env.DB, { prenom: 'julien', initiale: 'b', programme: 'P1' });
    const b = await creerOuTrouver(env.DB, { prenom: 'Julien', initiale: 'B.', programme: 'P1' });
    const c = await creerOuTrouver(env.DB, { prenom: 'JULIEN', initiale: 'B', programme: 'P1' });
    expect(b.id).toBe(a.id);
    expect(c.id).toBe(a.id);
    expect(a.cle).toBe(b.cle);
    expect(a.cle).toBe(c.cle);

    const d = await creerOuTrouver(env.DB, { prenom: 'Julien', initiale: 'M', programme: 'P1' });
    expect(d.id).not.toBe(a.id);
    expect(d.cle).not.toBe(a.cle);
  });

  it("compose l'affichage prénom + initiale, casse et accents conservés", async () => {
    const c = await creerOuTrouver(env.DB, { prenom: 'Bérénice', initiale: 'D', programme: 'P2' });
    expect(nomAffiche(c)).toBe('Bérénice D.');
  });
});

describe('création', () => {
  it('crée puis retrouve le même coureur', async () => {
    const a = await creerOuTrouver(env.DB, { prenom: 'Marie', initiale: 'T', programme: 'P3', faitIzon: true });
    const b = await creerOuTrouver(env.DB, { prenom: 'marie', initiale: 't', programme: 'P3', faitIzon: true });
    expect(b.id).toBe(a.id);
  });

  it('met à jour le programme si le coureur revient et en change', async () => {
    await creerOuTrouver(env.DB, { prenom: 'Paul', initiale: 'R', programme: 'P1', faitIzon: false });
    const maj = await creerOuTrouver(env.DB, { prenom: 'Paul', initiale: 'R', programme: 'P4', faitIzon: true });
    expect(maj.programme).toBe('P4');
    expect(maj.fait_izon).toBe(1);
  });

  it('refuse un programme inconnu', async () => {
    await expect(
      creerOuTrouver(env.DB, { prenom: 'Zoe', initiale: 'K', programme: 'P9' }),
    ).rejects.toThrow(/programme/i);
  });

  it('retrouve par identifiant', async () => {
    const c = await creerOuTrouver(env.DB, { prenom: 'Luc', initiale: 'F', programme: 'P2' });
    const relu = await parId(env.DB, c.id);
    expect(relu.prenom).toBe('Luc');
    expect(relu.initiale).toBe('F');
  });

  // Cas limites non couverts par le brief.

  it('conserve la casse et les accents saisis dans le prénom affiché', async () => {
    const c = await creerOuTrouver(env.DB, { prenom: 'Bérénice', initiale: 'D', programme: 'P2' });
    expect(c.prenom).toBe('Bérénice');
    expect(c.cle).toBe('berenice_d');
  });

  it('refuse un prénom composé uniquement de ponctuation même avec un programme valide', async () => {
    await expect(
      creerOuTrouver(env.DB, { prenom: '   ...   ', initiale: 'A', programme: 'P1' }),
    ).rejects.toThrow(/prénom/i);
  });

  it('accepte un prénom à la borne de longueur et le retrouve intact', async () => {
    const surLaBorne = 'Jeanne' + 'x'.repeat(34); // 40 caractères exactement
    const c = await creerOuTrouver(env.DB, { prenom: surLaBorne, initiale: 'P', programme: 'P1' });
    expect((await parId(env.DB, c.id)).prenom).toBe(surLaBorne);
  });

  it('refuse un prénom au-delà de la borne de longueur', async () => {
    const auDela = 'Jeanne' + 'x'.repeat(250);
    await expect(
      creerOuTrouver(env.DB, { prenom: auDela, initiale: 'P', programme: 'P1' }),
    ).rejects.toThrow(/40 caractères/i);
  });

  it('accepte un prénom en caractères non latins', async () => {
    const c = await creerOuTrouver(env.DB, { prenom: 'Владимир', initiale: 'П', programme: 'P5' });
    expect(c.prenom).toBe('Владимир');
    expect(c.cle).toBe('владимир_п');
  });

  it('accepte une variante de course valide pour P4', async () => {
    const c = await creerOuTrouver(env.DB, { prenom: 'Karim', initiale: 'S', programme: 'P4', varianteCourse: 'bordeaux' });
    expect(c.variante_course).toBe('bordeaux');
  });

  it('refuse une variante de course inconnue pour P4', async () => {
    await expect(
      creerOuTrouver(env.DB, { prenom: 'Nadia', initiale: 'L', programme: 'P4', varianteCourse: 'lyon' }),
    ).rejects.toThrow(/variante/i);
  });

  it('ignore une variante de course fournie hors P4', async () => {
    const c = await creerOuTrouver(env.DB, { prenom: 'Farid', initiale: 'B', programme: 'P1', varianteCourse: 'bordeaux' });
    expect(c.variante_course).toBeNull();
  });

  it("deux créations concurrentes du même prénom et de la même initiale ne créent qu'un seul coureur", async () => {
    // Même scénario que la limitation de débit dans auth.js : sans upsert
    // atomique, des requêtes concurrentes pourraient toutes lire "aucune
    // ligne" avant qu'aucune n'ait écrit, et créer plusieurs coureurs pour
    // la même personne au lieu d'un seul.
    const resultats = await Promise.all(
      Array.from({ length: 15 }, () =>
        creerOuTrouver(env.DB, { prenom: 'Sophie', initiale: 'G', programme: 'P3', faitIzon: false }),
      ),
    );
    const idsDistincts = new Set(resultats.map((r) => r.id));
    expect(idsDistincts.size).toBe(1);

    const { results } = await env.DB.prepare('SELECT COUNT(*) AS n FROM coureurs WHERE cle = ?')
      .bind('sophie_g')
      .all();
    expect(results[0].n).toBe(1);
  });
});
