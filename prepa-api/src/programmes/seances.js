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

/**
 * Identité d'une séance dans sa semaine : "EF-1", "EF-2", "SL-1", "RENFO-1".
 *
 * Le code seul ne peut pas servir d'identité. Cinquante-sept des cent
 * cinquante semaines résolues du corpus portent deux séances de même code :
 * la semaine 1 de P1 aligne EF, EF, SL, RENFO, deux endurances fondamentales
 * qui sont deux séances distinctes, à deux jours différents, avec deux
 * descriptions différentes. Tant que la validation était clavetée sur le
 * code, le coureur qui faisait ses deux footings n'en enregistrait qu'un, le
 * second écrasant le premier avec son ressenti et sa note, et le tableau
 * d'assiduité de l'encadrant sous-comptait sur plus d'un tiers des semaines.
 *
 * La forme retenue est le code suivi du rang d'occurrence de ce code dans la
 * liste des séances de la semaine. Elle satisfait les quatre exigences :
 *
 *   unique      deux séances de même code ont deux rangs différents ;
 *   stable      elle ne dépend que du contenu de la semaine, qui ne change
 *               pas entre deux lectures ni entre deux déploiements ;
 *   lisible     "EF-2" se lit dans un tableau et dans un message d'erreur,
 *               contrairement à une empreinte ou à un identifiant de ligne ;
 *   déterministe  elle se recalcule à la volée des deux côtés, aucune table
 *               de correspondance à stocker ni à migrer.
 *
 * Le rang est posé même quand le code est unique dans la semaine : "SL-1" et
 * non "SL". Ce n'est pas de la symétrie décorative. Si le suffixe
 * n'apparaissait qu'en cas de collision, le jour où l'encadrant ajoute une
 * seconde endurance à une semaine, l'unique "EF" devrait devenir "EF-1" et
 * toutes les validations déjà posées sous "EF" pointeraient dans le vide.
 * Avec le suffixe systématique, l'arrivée d'une deuxième séance ne touche
 * jamais à l'identité de la première.
 *
 * Le rang est un entier décimal sans séparateur, et il est toujours en
 * dernière position : le dernier tiret de l'identifiant sépare donc sans
 * ambiguïté le code du rang, y compris pour un code contenant lui-même des
 * tirets (un code "EF-1" saisi depuis le back-office donne "EF-1-1", jamais
 * confondu avec le "EF-1" de la fabrique ef).
 */
export function identifiantSeance(code, rang) {
  return `${code}-${rang}`;
}

/**
 * Pose l'identifiant de chaque séance d'une liste, dans l'ordre de la liste.
 *
 * Rend un nouveau tableau de nouveaux objets : les séances sources ne sont
 * jamais mutées, et une séance déjà identifiée voit son identifiant
 * recalculé, ce qui garantit qu'un contenu relu depuis la base est numéroté
 * exactement comme un contenu fraîchement saisi.
 *
 * Le contrôle d'unicité est théoriquement superflu (le couple code + rang est
 * unique par construction). Il est là pour que l'invariant soit vérifié et
 * non seulement affirmé : c'est précisément l'invariant dont l'absence a
 * cassé le suivi d'assiduité.
 */
export function identifierSeances(seances) {
  const rangs = new Map();
  const vus = new Set();
  return seances.map((s) => {
    const rang = (rangs.get(s.code) ?? 0) + 1;
    rangs.set(s.code, rang);
    const id = identifiantSeance(s.code, rang);
    if (vus.has(id)) {
      throw new Error(`Identifiant de séance en double dans la semaine : ${id}.`);
    }
    vus.add(id);
    return { ...s, id };
  });
}

/**
 * Le déroulé d'une séance, étape par étape.
 *
 * La description d'une séance est un paragraphe rédigé. Elle se lit bien assise
 * au calme, beaucoup moins bien en tenue devant sa montre, au moment où le
 * coureur cherche une seule chose : combien de temps, dans quelle zone, et
 * qu'est-ce qui vient après. Le déroulé rend cette lecture-là possible sans
 * réécrire une ligne du contenu, qui est validé et sur lequel on ne revient pas.
 *
 * Le découpage s'appuie sur trois régularités du corpus, vérifiées sur les
 * 340 séances des six programmes :
 *
 *   1. La première phrase est le déroulé, les suivantes sont le conseil.
 *      « 20 min d'échauffement en Z2, puis 5 fois 1000 m en Z4 [...], puis
 *      10 min de retour au calme en Z2. Ces 4 min sont une estimation de
 *      planification et jamais une allure à tenir [...] »
 *   2. Les étapes de cette phrase sont séparées par « puis ».
 *   3. Une étape porte sa durée en tête, sa zone dans son texte, et range
 *      derrière une virgule ses deux compléments habituels : le repère de
 *      durée (« en comptant environ 4 min par 1000 m ») et la récupération
 *      (« avec 4 min de trottinement en Z1 entre chaque »).
 *
 * Les durées retombent juste parce que le projet impose déjà que la somme des
 * segments égale la durée déclarée (voir la convention de calcul en tête des
 * fichiers de programme). Cette contrainte donne mieux qu'une vérification :
 * elle donne la durée du bloc de fractionné, qui est le seul segment écrit en
 * distance et donc le seul dont la durée ne se lit pas. Quand une étape et une
 * seule n'affiche pas la sienne, elle vaut exactement le reste. Sur les 340
 * séances, 336 se chiffrent ainsi entièrement, et aucune ne tombe à côté de sa
 * durée déclarée. Les 4 autres sont des renforcements à deux blocs non
 * chronométrés : elles gardent leurs étapes sans durée plutôt que d'en inventer.
 *
 * Le cas de la course objectif est différent et traité à part. Sa description
 * s'ouvre sur « Ta course. », et la suite se découpe non pas en « puis » mais
 * en phrases, une par portion du parcours, repérées en kilomètres et non en
 * minutes. C'est un déroulé tout aussi réel, il se lit simplement autrement.
 */
const SEPARATEUR_ETAPES = /,?\s+puis\s+/;
const PHRASE_SUIVANTE = /^(.*?[.!?])\s+(?=[A-ZÉÈÀÇ«])/s;

function zoneCitee(texte) {
  const m = texte.match(/Z[1-5]/);
  return m ? m[0] : null;
}

/**
 * Durée en minutes lue en tête d'étape, null si l'étape n'en annonce pas.
 *
 * Une étape peut s'ouvrir sur une ou plusieurs courtes incises avant
 * d'annoncer sa durée, « Samedi, la veille de la course, 23 min en Z2 ». Une
 * incise n'est franchie qu'à deux conditions : être brève, et ne contenir
 * aucun chiffre. Sans cette seconde garde, « 2 séries de 6 fois 200 m en Z5,
 * en comptant environ 45 s » verrait le 45 lu comme la durée de l'étape.
 */
function dureeEnTete(texte) {
  const sansIncise = texte.replace(/^(?:[^,\d]{1,25},\s*)+/, '');
  const heures = sansIncise.match(/^(\d+)\s*h\s*(\d{1,2})?/);
  if (heures) return Number(heures[1]) * 60 + Number(heures[2] || 0);
  const minutes = sansIncise.match(/^(\d+)\s*min\b/);
  if (minutes) return Number(minutes[1]);
  return null;
}

/** Coupe la description en deux : la première phrase, puis tout le reste. */
function premierePhrase(description) {
  const m = description.match(PHRASE_SUIVANTE);
  if (!m) return [description.trim(), ''];
  return [m[1].trim(), description.slice(m[0].length).trim()];
}

/**
 * Une phrase ressemble-t-elle à un déroulé de séance ?
 *
 * Sert uniquement à repérer les préambules, voir isolerPreambule(). Le critère
 * est délibérément étroit : une phrase enchaîne des étapes par « puis », ou
 * bien elle annonce à la fois une durée en tête et une zone. Une consigne de
 * renforcement (« Gainage et jambes, sans matériel : 3 séries de [...] ») ne
 * remplit ni l'un ni l'autre si on la lit seule, et c'est voulu : ce n'est pas
 * elle qu'on cherche à reconnaître, c'est la phrase qui suit un préambule.
 */
function ressembleAUnDeroule(phrase) {
  if (/\bpuis\b/.test(phrase)) return true;
  return zoneCitee(phrase) !== null && dureeEnTete(phrase) !== null;
}

/**
 * Détache les phrases d'introduction qui précèdent le vrai déroulé.
 *
 * Une séance du corpus s'ouvre sur une consigne de repos avant d'énoncer sa
 * séance : « Vendredi, tu ne fais rien : ni course, ni renfo, ni sortie de
 * compensation. Samedi, 23 min en Z2, puis 4 lignes droites [...] ». Prendre
 * la première phrase pour le déroulé y produisait une étape unique portant
 * « tu ne fais rien » et créditée, par déduction du reste, des 30 minutes de
 * la séance. Le découpage ne se contentait pas d'être pauvre, il affirmait
 * quelque chose de faux.
 *
 * La règle ne se déclenche que sur une phrase qui n'annonce ni zone ni durée
 * en tête, et seulement si une phrase plus loin, elle, ressemble à un déroulé.
 * Faute de quoi on retombe sur le comportement ordinaire, première phrase en
 * déroulé, qui est le bon pour les 339 autres séances.
 */
function isolerPreambule(description) {
  const toutes = phrases(description);
  let i = 0;
  while (
    i < toutes.length - 1 &&
    !zoneCitee(toutes[i]) &&
    dureeEnTete(toutes[i]) === null &&
    toutes.slice(i + 1).some(ressembleAUnDeroule)
  ) {
    i += 1;
  }
  if (i === 0) return ['', description];
  return [toutes.slice(0, i).join(' '), toutes.slice(i).join(' ')];
}

/** Toutes les phrases d'un texte, dans l'ordre. */
function phrases(texte) {
  const out = [];
  let reste = texte.trim();
  for (;;) {
    const m = reste.match(PHRASE_SUIVANTE);
    if (!m) { if (reste) out.push(reste); return out; }
    out.push(m[1].trim());
    reste = reste.slice(m[0].length);
  }
}

/**
 * Recolle les segments qui ne portent pas de zone au segment suivant.
 *
 * Une séance zonée dont un segment ne cite aucune zone n'a pas deux étapes :
 * c'est un bloc unique coupé en son milieu par un « puis » interne. Le cas est
 * celui de la pyramide du seuil, « 2 fois 2000 m puis 2 fois 1000 m en Z4 »,
 * dont la première moitié se retrouverait sinon seule sur une ligne, sans
 * zone et sans durée, ce qui ne veut rien dire.
 *
 * La règle ne s'applique qu'aux séances qui citent au moins une zone. Le
 * renforcement n'en cite aucune : lui appliquer le recollage écraserait tous
 * ses blocs en une seule étape.
 */
function recollerBlocsCoupes(segments, deroule) {
  if (!zoneCitee(deroule)) return segments;
  const out = [];
  for (const s of segments) {
    if (out.length > 0 && !zoneCitee(out[out.length - 1])) {
      out[out.length - 1] += ' puis ' + s;
    } else {
      out.push(s);
    }
  }
  return out;
}

/** Détache d'une étape ses deux compléments habituels, repère et récupération. */
function detacherComplements(segment) {
  let texte = segment;
  let recuperation = '';
  let repere = '';
  const avec = texte.match(/,\s*(avec\s+.*)$/);
  if (avec) {
    recuperation = avec[1];
    texte = texte.slice(0, avec.index);
  }
  const comptant = texte.match(/,\s*(en comptant\s+.*)$/);
  if (comptant) {
    repere = comptant[1];
    texte = texte.slice(0, comptant.index);
  }
  return { texte: texte.trim(), repere, recuperation };
}

function etape(segment) {
  const { texte, repere, recuperation } = detacherComplements(segment);
  const e = {
    duree: dureeEnTete(segment),
    zone: zoneCitee(texte) || zoneCitee(segment),
    texte,
  };
  if (repere) e.repere = repere;
  if (recuperation) e.recuperation = recuperation;
  return e;
}

/**
 * Attribue au seul segment non chiffré le temps qui manque pour atteindre la
 * durée déclarée. Ne fait rien si deux segments ou plus sont non chiffrés :
 * le reste serait alors à répartir, et rien ne dit comment.
 */
function deduireDureeManquante(etapes, dureeTotale) {
  const sans = etapes.filter((e) => e.duree === null);
  if (sans.length !== 1) return;
  const reste = dureeTotale - etapes.reduce((total, e) => total + (e.duree || 0), 0);
  if (reste > 0) {
    sans[0].duree = reste;
    sans[0].dureeDeduite = true;
  }
}

export function decouperDeroule(description, dureeTotale, code) {
  // La course objectif se découpe en phrases, une par portion du parcours.
  if (code === 'COURSE') {
    const [ouverture, suite] = premierePhrase(description);
    const etapes = phrases(suite).map((p) => ({
      duree: dureeEnTete(p),
      zone: zoneCitee(p),
      texte: p.replace(/[.]$/, ''),
    }));
    // Une description qui ne tiendrait qu'en une phrase reste une étape.
    if (etapes.length === 0) return { etapes: [{ duree: dureeTotale, zone: null, texte: ouverture.replace(/[.]$/, '') }], conseil: '' };
    return { etapes, conseil: '' };
  }

  const [preambule, corps] = isolerPreambule(description);
  const [deroule, conseil] = premierePhrase(corps);
  const segments = recollerBlocsCoupes(
    deroule.split(SEPARATEUR_ETAPES).map((s) => s.trim().replace(/[.,]$/, '')).filter(Boolean),
    deroule,
  );
  if (segments.length === 0) throw new Error('Déroulé vide : la description ne produit aucune étape.');
  const etapes = segments.map(etape);
  deduireDureeManquante(etapes, dureeTotale);
  return { etapes, conseil, preambule };
}

/**
 * Pose le déroulé sur une séance et rend la séance.
 *
 * Appelée depuis les fabriques pour les séances des fichiers source, et depuis
 * validerContenuSemaine pour celles que l'encadrant saisit au back-office. Les
 * deux chemins passent par ici pour la même raison qui fait passer les deux par
 * identifierSeances : une semaine remaniée doit avoir exactement la forme d'une
 * semaine du plan, sinon la vue du coureur dépend de qui a écrit la séance.
 */
export function poserDeroule(seance) {
  const { etapes, conseil, preambule } = decouperDeroule(seance.description, seance.duree, seance.code);
  seance.deroule = Object.freeze(etapes.map((e) => Object.freeze(e)));
  // Conseil et préambule n'existent que sur les séances qui en portent un,
  // comme distance et zonesSecondaires : pas de champ vide sur les autres.
  if (preambule) seance.preambule = preambule;
  if (conseil) seance.conseil = conseil;
  return seance;
}

function fabrique(code, titre, zone) {
  return (duree, description, objectif, options = {}) => {
    verifierTexte(description, objectif);
    if (!Number.isInteger(duree) || duree <= 0) throw new Error('Durée invalide.');
    const zonesSecondaires = verifierZonesSecondaires(options.zonesSecondaires, zone, description);
    const seance = { code, titre, duree, zone, description, objectif };
    if (zonesSecondaires.length > 0) seance.zonesSecondaires = Object.freeze(zonesSecondaires);
    return poserDeroule(seance);
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
  return poserDeroule({ code: 'COURSE', titre: nom, distance, duree, zone: null, description, objectif });
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
  // Les identifiants sont posés ici, au seul endroit par lequel une semaine
  // des fichiers source est construite. Les semaines à variantes (P2, P3 et
  // P4 en semaine 9) réutilisent le tableau de séances d'une semaine déjà
  // construite par cette fonction, elles héritent donc des identifiants sans
  // rien faire de particulier.
  return { numero, phase, titre, intention, seances: identifierSeances(seances) };
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
