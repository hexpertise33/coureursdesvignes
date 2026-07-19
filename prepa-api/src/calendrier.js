const JOUR = 86400000;
export const DEBUT_UTC = Date.UTC(2026, 6, 27); // lundi 27 juillet 2026

/** Décalage d'Europe/Paris en minutes pour un instant UTC donné. */
function decalageParisMinutes(instantUtc) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(
    fmt.formatToParts(new Date(instantUtc))
      .filter((x) => x.type !== 'literal')
      .map((x) => [x.type, Number(x.value)])
  );
  const commeUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return (commeUtc - instantUtc) / 60000;
}

/**
 * Convertit une date-heure locale de Paris en instant UTC.
 *
 * Le point fixe (décalage(resultat) === décalage utilisé pour l'obtenir) est
 * trouvé en une itération pour la grande majorité des heures, y compris les
 * heures ambiguës du passage à l'heure d'hiver (ex. 25/10/2026 2 h 30, qui
 * existe deux fois) : les deux décalages testés convergent alors vers le
 * même résultat, de façon stable.
 *
 * Les heures inexistantes du passage à l'heure d'été (ex. 29/03/2026 2 h 30,
 * l'horloge saute de 2 h à 3 h) n'ont en revanche aucun point fixe : la
 * boucle oscillerait indéfiniment entre les deux décalages sans jamais se
 * stabiliser, et le résultat dépendrait arbitrairement du nombre d'itérations
 * choisi. Dans ce cas, on applique la convention habituelle des
 * bibliothèques de fuseaux horaires (ex. java.time) : l'heure inexistante est
 * reportée après le saut, ce qui revient à utiliser le décalage en vigueur
 * avant le saut (le plus petit des deux décalages rencontrés).
 *
 * Exportée uniquement pour permettre de verrouiller ce comportement par un
 * test direct : l'usage applicatif (toujours 19 h) passe par
 * instantPublication ci-dessous.
 */
export function parisVersUtc(annee, mois, jour, heure, minute) {
  const naif = Date.UTC(annee, mois - 1, jour, heure, minute);
  const decalage1 = decalageParisMinutes(naif);
  const candidat = naif - decalage1 * 60000;
  const decalage2 = decalageParisMinutes(candidat);
  if (decalage1 === decalage2) {
    return candidat;
  }
  // Heure locale inexistante : convention "reportée après le saut".
  return naif - Math.min(decalage1, decalage2) * 60000;
}

export function lundiDeLaSemaine(numero) {
  return DEBUT_UTC + (numero - 1) * 7 * JOUR;
}

export function instantPublication(numero) {
  const dimanche = new Date(lundiDeLaSemaine(numero) - JOUR);
  return parisVersUtc(
    dimanche.getUTCFullYear(),
    dimanche.getUTCMonth() + 1,
    dimanche.getUTCDate(),
    19, 0
  );
}

export function estPubliee(numero, maintenant = Date.now()) {
  return maintenant >= instantPublication(numero);
}

export function semaineCourante(maintenant = Date.now(), nbSemaines = 17) {
  let courante = 0;
  for (let n = 1; n <= nbSemaines; n++) {
    if (estPubliee(n, maintenant)) courante = n;
    else break;
  }
  return courante;
}
