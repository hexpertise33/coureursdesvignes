import { volumeHorsCourse as volume } from './seances.js';

// Toutes les comparaisons de charge se font hors course objectif : la course
// dure 55 min pour un 10 km et pres de 4 h pour un marathon. Si on l'incluait
// dans le volume, la derniere semaine d'un programme marathon peserait plus
// lourd que son pic d'entrainement et la regle d'affutage rejetterait a tort
// un programme pourtant correct (voir la note de volumeHorsCourse dans
// seances.js). Ne jamais utiliser volume() dans ce fichier.

const INTENSITE = new Set(['VMA', 'SEUIL', 'TEMPO']);

const HAUSSE_MAX = 1.1; // +10 % de volume maximum entre deux semaines chargees.
const TOLERANCE = 1.0001; // marge pour les imprecisions de calcul flottant.
const BAISSE_ALLEGEE = 0.85; // une semaine allegee/recuperation active doit tomber a 85 % ou moins.
const PLAFOND_AFFUTAGE = 0.65; // la derniere semaine d'affutage plafonne a 65 % du pic de charge.

/**
 * Verifie mecaniquement qu'un programme d'entrainement est sain :
 * progression de volume plafonnee, semaines allegees reellement allegees,
 * affutage decroissant avant la course, semaine de recuperation finale sans
 * intensite. Leve une Error detaillee (programme, semaine, valeur fautive)
 * au premier probleme trouve, ou retourne true si le programme est valide.
 */
export function verifierProgramme(prog) {
  const sems = prog.semainesContenu;
  if (!sems || sems.length === 0) {
    throw new Error(`${prog.code} : programme vide, aucune semaine definie.`);
  }

  // La derniere semaine doit etre une semaine de recuperation sans intensite.
  // Ce controle passe avant la numerotation : une semaine finale invalide est
  // le probleme le plus grave, il doit remonter en premier.
  const derniere = sems[sems.length - 1];
  if (derniere.phase !== 'recuperation') {
    throw new Error(
      `${prog.code} S${derniere.numero} : la derniere semaine doit etre en phase de récupération ` +
        `(phase trouvée : "${derniere.phase}").`,
    );
  }
  for (const s of derniere.seances) {
    if (INTENSITE.has(s.code)) {
      throw new Error(
        `${prog.code} S${derniere.numero} : intensité interdite en semaine de récupération ` +
          `(séance ${s.code}, ${s.duree} min).`,
      );
    }
  }

  // Numerotation continue a partir de 1.
  sems.forEach((s, i) => {
    if (s.numero !== i + 1) {
      throw new Error(
        `${prog.code} : numérotation cassée à la position ${i + 1} ` +
          `(numéro trouvé : ${s.numero}, attendu : ${i + 1}).`,
      );
    }
  });

  // Progression de volume semaine par semaine, hors renfo et hors course
  // objectif. picBloc retient le plus haut volume atteint sur une semaine de
  // bloc : il sert de reference pour la remontee autorisee apres une semaine
  // allegee, de recuperation active ou d'affutage.
  let picBloc = 0;
  for (let i = 0; i < sems.length; i++) {
    const s = sems[i];
    const v = volume(s);
    const precedente = i > 0 ? sems[i - 1] : null;

    if (s.phase === 'allegee' || s.phase === 'recuperation-active') {
      if (precedente && v > volume(precedente) * BAISSE_ALLEGEE) {
        const libelle = s.phase === 'allegee' ? 'allégée' : 'de récupération active';
        throw new Error(
          `${prog.code} S${s.numero} : semaine ${libelle}, baisse d'au moins 15 % attendue ` +
            `(S${precedente.numero} = ${volume(precedente)} min, S${s.numero} = ${v} min).`,
        );
      }
    } else if (s.phase.startsWith('bloc')) {
      const reference = precedente && precedente.phase.startsWith('bloc') ? volume(precedente) : picBloc;
      if (reference && v > reference * HAUSSE_MAX * TOLERANCE) {
        throw new Error(
          `${prog.code} S${s.numero} : hausse de volume supérieure à 10 % ` +
            `(S${precedente ? precedente.numero : '?'} = ${reference} min, S${s.numero} = ${v} min).`,
        );
      }
      picBloc = Math.max(picBloc, v);
    }
  }

  // Les deux semaines precedant la recuperation doivent former un affutage
  // strictement decroissant.
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

  // La derniere semaine d'affutage ne doit pas depasser 65 % du pic de charge
  // atteint sur les semaines de bloc.
  const blocs = sems.filter((s) => s.phase.startsWith('bloc'));
  if (blocs.length === 0) {
    throw new Error(`${prog.code} : aucune semaine de bloc trouvée, impossible de calculer le pic de charge.`);
  }
  const pic = Math.max(...blocs.map(volume));
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
