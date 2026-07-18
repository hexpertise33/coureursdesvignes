export const ZONES = Object.freeze({
  Z1: { nom: 'Récupération', fcMin: 50, fcMax: 60, sensation: 'Conversation totale, effort quasi nul.' },
  Z2: { nom: 'Endurance fondamentale', fcMin: 60, fcMax: 75, sensation: 'On parle par phrases entières.' },
  Z3: { nom: 'Tempo', fcMin: 75, fcMax: 85, sensation: 'Phrases courtes, respiration marquée.' },
  Z4: { nom: 'Seuil', fcMin: 85, fcMax: 92, sensation: 'Trois ou quatre mots à la fois.' },
  Z5: { nom: 'VMA', fcMin: 92, fcMax: 100, sensation: 'Aucun mot possible.' },
});

const COURSE_CODES = new Set(['EF', 'SL', 'TEMPO', 'SEUIL', 'VMA', 'RECUP', 'COURSE']);

function verifierTexte(...textes) {
  for (const t of textes) {
    if (typeof t !== 'string' || t.trim() === '') throw new Error('Texte manquant.');
    if (t.includes('—')) throw new Error('Tiret cadratin interdit dans les textes affichés.');
  }
}

function fabrique(code, titre, zone) {
  return (duree, description, objectif) => {
    verifierTexte(description, objectif);
    if (!Number.isInteger(duree) || duree <= 0) throw new Error('Durée invalide.');
    return { code, titre, duree, zone, description, objectif };
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
  const courses = seances.filter((s) => COURSE_CODES.has(s.code));
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
