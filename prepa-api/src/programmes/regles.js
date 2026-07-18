import { volumeHorsCourse as volume } from './seances.js';

// Toutes les comparaisons de charge se font hors course objectif : la course
// dure 55 min pour un 10 km et pres de 4 h pour un marathon. Si on l'incluait
// dans le volume, la derniere semaine d'un programme marathon peserait plus
// lourd que son pic d'entrainement et la regle d'affutage rejetterait a tort
// un programme pourtant correct (voir la note de volumeHorsCourse dans
// seances.js). Ne jamais utiliser volume() dans ce fichier.

// Liste blanche stricte des phases reconnues. Toute phase hors de cette liste
// (faute de frappe comprise, ex. "blco2") est une erreur de contenu qu'il
// faut rejeter explicitement : une phase inconnue ne tombe dans aucune
// branche des controles de charge ci-dessous et echapperait sinon,
// silencieusement, a toute verification.
const PHASES = new Set(['bloc1', 'bloc2', 'bloc3', 'allegee', 'recuperation-active', 'affutage', 'recuperation']);

const INTENSITE = new Set(['VMA', 'SEUIL', 'TEMPO']);
// Une semaine de recuperation active suit une seance intense (ex. la
// course-test d'Izon) : c'est une semaine de repos actif, pas une semaine de
// travail. VMA et SEUIL y sont interdits (a la difference de la semaine de
// recuperation finale, le TEMPO n'est pas concerne par cette regle-ci).
const INTENSITE_INTERDITE_RECUP_ACTIVE = new Set(['VMA', 'SEUIL']);

// +10 % de volume maximum entre deux semaines chargees. Une seule constante,
// 1.1001 au lieu de 1.1, inclut deja une marge de 0,01 % pour absorber les
// imprecisions de calcul flottant : ne pas la recombiner avec un facteur
// de tolerance separe.
const HAUSSE_MAX = 1.1001;
const BAISSE_ALLEGEE = 0.85; // une semaine allegee/recuperation active doit tomber a 85 % ou moins.
const PLAFOND_AFFUTAGE = 0.65; // la derniere semaine d'affutage plafonne a 65 % du pic de charge.

/**
 * Verifie mecaniquement qu'un programme d'entrainement est sain :
 * - phases reconnues uniquement (liste blanche) ;
 * - derniere semaine de recuperation, sans intensite ;
 * - numerotation continue ;
 * - aucune semaine, quelle que soit sa phase, ne depasse le pic de charge + 10 % ;
 * - progression de volume plafonnee entre semaines de bloc (+10 %) ;
 * - semaines allegees/recuperation active reellement allegees (-15 % min) ;
 * - semaine de recuperation active sans VMA ni SEUIL ;
 * - affutage decroissant avant la course, plafonne a 65 % du pic.
 * Leve une Error detaillee (programme, semaine, valeur fautive) au premier
 * probleme trouve, ou retourne true si le programme est valide.
 */
export function verifierProgramme(prog) {
  const sems = prog.semainesContenu;
  if (!sems || sems.length === 0) {
    throw new Error(`${prog.code} : programme vide, aucune semaine définie.`);
  }

  // Liste blanche des phases, en premier : une phase mal orthographiee est le
  // mode de defaillance le plus probable et le plus silencieux (elle ne tombe
  // dans aucune branche des controles plus loin). La numerotation n'est pas
  // encore garantie fiable ici : chaque semaine est nommee par sa position
  // (i + 1), pas par son numero declare.
  sems.forEach((s, i) => {
    if (!PHASES.has(s.phase)) {
      throw new Error(
        `${prog.code} S${i + 1} : phase inconnue "${s.phase}" ` +
          `(phases valides : ${[...PHASES].join(', ')}).`,
      );
    }
  });

  // La derniere semaine doit être une semaine de récupération sans intensité.
  // Ce contrôle passe avant la numérotation : une semaine finale invalide est
  // le problème le plus grave, il doit remonter en premier. On nomme cette
  // semaine par sa position (sems.length), car son numéro déclaré n'est pas
  // encore garanti fiable à ce stade.
  const derniere = sems[sems.length - 1];
  const positionDerniere = sems.length;
  if (derniere.phase !== 'recuperation') {
    throw new Error(
      `${prog.code} S${positionDerniere} : la dernière semaine doit être en phase de récupération ` +
        `(phase trouvée : "${derniere.phase}").`,
    );
  }
  for (const s of derniere.seances) {
    if (INTENSITE.has(s.code)) {
      throw new Error(
        `${prog.code} S${positionDerniere} : intensité interdite en semaine de récupération ` +
          `(séance ${s.code}, ${s.duree} min).`,
      );
    }
  }

  // Numérotation continue à partir de 1.
  sems.forEach((s, i) => {
    if (s.numero !== i + 1) {
      throw new Error(
        `${prog.code} : numérotation cassée à la position ${i + 1} ` +
          `(numéro trouvé : ${s.numero}, attendu : ${i + 1}).`,
      );
    }
  });

  // Pic de charge : le plus haut volume atteint sur une semaine de bloc.
  // Sert de référence au plafond global ci-dessous et au plafond des 65 % en
  // fin d'affûtage plus loin. Calculé une fois la liste blanche des phases
  // validée, donc uniquement à partir de vraies semaines de bloc.
  const blocs = sems.filter((s) => s.phase.startsWith('bloc'));
  if (blocs.length === 0) {
    throw new Error(`${prog.code} : aucune semaine de bloc trouvée, impossible de calculer le pic de charge.`);
  }
  const pic = Math.max(...blocs.map(volume));

  // Plafond global : aucune semaine, quelle que soit sa phase, ne peut
  // dépasser le pic de charge + 10 %. Ce contrôle attrape en particulier les
  // semaines d'affûtage et de récupération, qui ne passent par aucune autre
  // comparaison de charge dans la boucle de progression ci-dessous (sans lui,
  // une semaine d'affûtage pourrait par exemple quadrupler le pic sans être
  // détectée).
  sems.forEach((s) => {
    const v = volume(s);
    const plafond = pic * HAUSSE_MAX;
    if (v > plafond) {
      throw new Error(
        `${prog.code} S${s.numero} : volume de ${v} min supérieur au pic d'entraînement + 10 % ` +
          `(pic = ${pic} min, plafond = ${Math.round(plafond)} min).`,
      );
    }
  });

  // Progression de volume semaine par semaine, hors renfo et hors course
  // objectif. picBloc retient le plus haut volume atteint jusqu'ici sur une
  // semaine de bloc : il sert de référence pour la remontée autorisée après
  // une semaine allégée, de récupération active ou d'affûtage.
  let picBloc = 0;
  for (let i = 0; i < sems.length; i++) {
    const s = sems[i];
    const v = volume(s);
    const precedente = i > 0 ? sems[i - 1] : null;

    if (s.phase === 'allegee' || s.phase === 'recuperation-active') {
      // Si la toute première semaine du programme est déjà allégée ou en
      // récupération active, il n'existe pas de semaine précédente à
      // comparer : le contrôle des -15 % ne peut alors pas s'appliquer (cas
      // sans conséquence pratique, un programme commence normalement par un
      // bloc, mais rendu explicite ici plutôt que de passer inaperçu).
      if (precedente && v > volume(precedente) * BAISSE_ALLEGEE) {
        const libelle = s.phase === 'allegee' ? 'allégée' : 'de récupération active';
        throw new Error(
          `${prog.code} S${s.numero} : semaine ${libelle}, baisse d'au moins 15 % attendue ` +
            `(S${precedente.numero} = ${volume(precedente)} min, S${s.numero} = ${v} min).`,
        );
      }
      if (s.phase === 'recuperation-active') {
        // Décision de conception : une semaine de récupération active (par
        // exemple après la course-test d'Izon en P5) n'est pas une semaine de
        // travail. VMA et SEUIL y sont interdits, quel que soit le volume.
        for (const seance of s.seances) {
          if (INTENSITE_INTERDITE_RECUP_ACTIVE.has(seance.code)) {
            throw new Error(
              `${prog.code} S${s.numero} : intensité interdite en semaine de récupération active ` +
                `(séance ${seance.code}, ${seance.duree} min).`,
            );
          }
        }
      }
    } else if (s.phase.startsWith('bloc')) {
      const precedenteEstBloc = precedente && precedente.phase.startsWith('bloc');
      const reference = precedenteEstBloc ? volume(precedente) : picBloc;
      if (reference && v > reference * HAUSSE_MAX) {
        // Le libellé de la référence ne doit jamais afficher le pic sous un
        // numéro de semaine : si la semaine précédente n'est pas un bloc, la
        // référence est le pic accumulé jusqu'ici (picBloc), pas le volume de
        // cette semaine précédente.
        const libelleReference = precedenteEstBloc
          ? `S${precedente.numero} = ${reference} min`
          : `pic = ${reference} min`;
        throw new Error(
          `${prog.code} S${s.numero} : hausse de volume supérieure à 10 % ` +
            `(${libelleReference}, S${s.numero} = ${v} min).`,
        );
      }
      picBloc = Math.max(picBloc, v);
    }
  }

  // Les deux semaines précédant la récupération doivent former un affûtage
  // strictement décroissant.
  const affutage = sems.slice(-3, -1);
  if (affutage.length !== 2) {
    throw new Error(
      `${prog.code} : programme trop court, 2 semaines d'affûtage sont attendues avant la récupération.`,
    );
  }
  if (affutage.some((s) => s.phase !== 'affutage')) {
    const trouve = affutage.map((s) => `S${s.numero} (${s.phase})`).join(', ');
    throw new Error(
      `${prog.code} : les 2 semaines précédant la récupération doivent être en phase affûtage ` +
        `(trouvé : ${trouve}).`,
    );
  }
  const [avantDerniereAffutage, derniereAffutage] = affutage;
  if (volume(derniereAffutage) >= volume(avantDerniereAffutage)) {
    throw new Error(
      `${prog.code} S${derniereAffutage.numero} : le volume d'affûtage doit décroître jusqu'à la course ` +
        `(S${avantDerniereAffutage.numero} = ${volume(avantDerniereAffutage)} min, ` +
        `S${derniereAffutage.numero} = ${volume(derniereAffutage)} min).`,
    );
  }

  // La dernière semaine d'affûtage ne doit pas dépasser 65 % du pic de charge
  // atteint sur les semaines de bloc.
  const seuilAffutage = pic * PLAFOND_AFFUTAGE;
  if (volume(derniereAffutage) > seuilAffutage) {
    throw new Error(
      `${prog.code} S${derniereAffutage.numero} : la dernière semaine d'affûtage ` +
        `(${volume(derniereAffutage)} min) dépasse 65 % du pic de charge ` +
        `(pic = ${pic} min, seuil = ${Math.round(seuilAffutage)} min).`,
    );
  }

  return true;
}
