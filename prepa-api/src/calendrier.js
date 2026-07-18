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

/** Convertit une date-heure locale de Paris en instant UTC. Deux passes suffisent. */
function parisVersUtc(annee, mois, jour, heure, minute) {
  const naif = Date.UTC(annee, mois - 1, jour, heure, minute);
  let resultat = naif;
  for (let i = 0; i < 2; i++) {
    resultat = naif - decalageParisMinutes(resultat) * 60000;
  }
  return resultat;
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
