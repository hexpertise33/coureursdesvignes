export const ZONES = Object.freeze({
  Z1: { nom: 'Récupération', fcMin: 50, fcMax: 60, sensation: 'Conversation totale, effort quasi nul.' },
  Z2: { nom: 'Endurance fondamentale', fcMin: 60, fcMax: 75, sensation: 'On parle par phrases entières.' },
  Z3: { nom: 'Tempo', fcMin: 75, fcMax: 85, sensation: 'Phrases courtes, respiration marquée.' },
  Z4: { nom: 'Seuil', fcMin: 85, fcMax: 92, sensation: 'Trois ou quatre mots à la fois.' },
  Z5: { nom: 'VMA', fcMin: 92, fcMax: 100, sensation: 'Aucun mot possible.' },
});

// Toutes les seances de course a pied, renfo exclu. Ne pas confondre avec le
// code 'COURSE', qui designe la seule course objectif et n'est qu'un membre.
const CODES_HORS_RENFO = new Set(['EF', 'SL', 'TEMPO', 'SEUIL', 'VMA', 'RECUP', 'COURSE']);

function verifierTexte(...textes) {
  for (const t of textes) {
    if (typeof t !== 'string' || t.trim() === '') throw new Error('Texte manquant.');
    if (t.includes('—')) throw new Error('Tiret cadratin interdit dans les textes affichés.');
  }
}

/**
 * Zones secondaires déclarées. Mécanisme commun aux cinq programmes.
 *
 * Une séance porte une zone unique, celle de sa fabrique : ef() donne Z2,
 * seuil() donne Z4, vma() donne Z5. C'est cette zone que l'application affiche
 * à côté de la description, et un test de cohérence vérifie que la description
 * cite bien cette zone et ne cite jamais de zone plus dure. Ce test n'est pas
 * décoratif : il a débusqué trois incohérences réelles de contenu dans P1.
 *
 * Certaines séances contiennent pourtant, volontairement, un court passage
 * dans une zone plus dure : des lignes droites en Z5 en fin d'endurance
 * fondamentale, quelques blocs en Z3 en fin de sortie longue. Dispenser la
 * fabrique entière du contrôle reviendrait à désactiver le test sur toutes les
 * endurances du projet. La séance déclare donc elle-même, une par une, la ou
 * les zones secondaires qu'elle contient, via un 4e argument optionnel :
 *
 *   ef(
 *     35,
 *     '25 min en Z2, puis 6 lignes droites de 20 s en Z5 ... puis 3 min en Z2.',
 *     'Entretenir la foulée sans fatiguer.',
 *     { zonesSecondaires: ['Z5'] },
 *   )
 *
 * Le test de cohérence accepte alors cette zone-là et elle seule. Une séance
 * qui cite une zone plus dure sans l'avoir déclarée échoue toujours.
 *
 * La déclaration est vérifiée à la construction : une zone secondaire doit
 * être une zone connue, différente de la zone principale, non répétée, et
 * réellement citée dans la description. Une déclaration décorative, posée
 * par précaution sur une séance qui n'en a pas besoin, est donc impossible :
 * elle lève une erreur au chargement du module.
 *
 * Le champ n'apparaît sur l'objet séance que s'il est non vide. Une séance
 * ordinaire garde exactement la forme qu'elle avait auparavant. Pour lire la
 * valeur sans se soucier de son absence, utiliser zonesSecondairesDe().
 */
function verifierZonesSecondaires(declarees, zonePrincipale, description) {
  if (declarees === undefined) return [];
  if (!Array.isArray(declarees)) {
    throw new Error('zonesSecondaires doit être un tableau de codes de zone.');
  }
  if (declarees.length === 0) return [];
  if (zonePrincipale === null) {
    throw new Error("Une séance sans zone ne peut pas déclarer de zone secondaire.");
  }
  const vues = new Set();
  for (const z of declarees) {
    if (!Object.prototype.hasOwnProperty.call(ZONES, z)) {
      throw new Error(
        `Zone secondaire inconnue : "${z}" (zones valides : ${Object.keys(ZONES).join(', ')}).`,
      );
    }
    if (z === zonePrincipale) {
      throw new Error(`Zone secondaire "${z}" identique à la zone de la séance, déclaration inutile.`);
    }
    if (vues.has(z)) {
      throw new Error(`Zone secondaire "${z}" déclarée deux fois.`);
    }
    vues.add(z);
    if (!description.includes(z)) {
      throw new Error(`Zone secondaire "${z}" déclarée mais jamais citée dans la description.`);
    }
  }
  return [...declarees];
}

/** Zones secondaires d'une séance, tableau vide si elle n'en déclare aucune. */
export function zonesSecondairesDe(seance) {
  return seance.zonesSecondaires ?? [];
}

function fabrique(code, titre, zone) {
  return (duree, description, objectif, options = {}) => {
    verifierTexte(description, objectif);
    if (!Number.isInteger(duree) || duree <= 0) throw new Error('Durée invalide.');
    const zonesSecondaires = verifierZonesSecondaires(options.zonesSecondaires, zone, description);
    const seance = { code, titre, duree, zone, description, objectif };
    if (zonesSecondaires.length > 0) seance.zonesSecondaires = Object.freeze(zonesSecondaires);
    return seance;
  };
}

export const ef = fabrique('EF', 'Endurance fondamentale', 'Z2');
export const sl = fabrique('SL', 'Sortie longue', 'Z2');
export const tempo = fabrique('TEMPO', 'Tempo', 'Z3');
export const seuil = fabrique('SEUIL', 'Seuil', 'Z4');
export const vma = fabrique('VMA', 'Fractionné court', 'Z5');
export const recup = fabrique('RECUP', 'Footing de récupération', 'Z1');
export const renfo = fabrique('RENFO', 'Renforcement', null);

export function course(nom, distance, duree, description, objectif) {
  verifierTexte(nom, description, objectif);
  if (!Number.isInteger(duree) || duree <= 0) throw new Error('Durée invalide.');
  return { code: 'COURSE', titre: nom, distance, duree, zone: null, description, objectif };
}

export function semaine(numero, phase, titre, intention, seances) {
  verifierTexte(titre, intention);
  const courses = seances.filter((s) => CODES_HORS_RENFO.has(s.code));
  const renfos = seances.filter((s) => s.code === 'RENFO');
  if (courses.length !== 3) {
    throw new Error(`Semaine ${numero} : 3 séances de course attendues, ${courses.length} trouvées.`);
  }
  if (renfos.length !== 1) {
    throw new Error(`Semaine ${numero} : 1 renfo attendu, ${renfos.length} trouvé(s).`);
  }
  return { numero, phase, titre, intention, seances };
}

export function volume(semaineObj) {
  return semaineObj.seances
    .filter((s) => s.code !== 'RENFO')
    .reduce((total, s) => total + s.duree, 0);
}

/**
 * Volume d'entraînement seul. La course objectif est exclue : elle dure 55 min
 * pour un 10 km et près de 4 h pour un marathon, ce qui rendrait toute
 * comparaison de charge entre semaines et entre programmes absurde.
 */
export function volumeHorsCourse(semaineObj) {
  return semaineObj.seances
    .filter((s) => s.code !== 'RENFO' && s.code !== 'COURSE')
    .reduce((total, s) => total + s.duree, 0);
}
