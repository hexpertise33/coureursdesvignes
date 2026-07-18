import { ef, sl, tempo, seuil, vma, recup, renfo, course, semaine } from './seances.js';

/**
 * P2, 10 km de Bordeaux. Quinze semaines de préparation plus une de
 * récupération, soit seize entrées.
 *
 * Programme destiné au coureur qui tient déjà une demi-heure de course
 * continue et qui veut, cette fois, chercher un chrono sur 10 km plutôt que
 * simplement terminer. Trois sorties par semaine, un renforcement, et toujours
 * aucune allure chiffrée : l'intensité se lit en zones 1 à 5, chacun place son
 * curseur là où sa respiration le lui dit.
 *
 * Trame en cycles de trois plus une, décision de l'encadrant. Trois semaines
 * qui montent, une semaine plus douce, et on recommence :
 *
 *   S1 S2 S3 progressives, S4 plus douce
 *   S5 S6 S7 progressives, S8 plus douce
 *   S9 S10 S11 progressives, S12 plus douce
 *   S13 progressive, pic de charge
 *   S14 S15 affûtage, course le dernier jour de S15
 *   S16 récupération
 *
 * Ce découpage remplace l'ancienne trame, qui enchaînait deux semaines légères
 * consécutives en S8 et S9 et creusait la charge en plein milieu de la
 * préparation, sortie longue redescendue à 35 min comprise. Le coureur ne
 * passe plus jamais plus d'une semaine d'affilée en dessous de sa charge de
 * travail.
 *
 * La liste blanche des phases ne connaît que trois étiquettes de bloc. Le
 * quatrième cycle, réduit à la seule S13, est donc étiqueté bloc3 lui aussi :
 * c'est le sommet du bloc spécifique, relancé après la respiration de S12, et
 * non un quatrième bloc distinct.
 *
 * La course a lieu le dimanche 8 novembre 2026, dernier jour de la semaine 15.
 * La semaine 9 tombe exactement sur le week-end du 10 km d'Izon, le 27
 * septembre : c'est ce qui rend la double variante possible.
 *
 * Barème de volumes, hors course objectif et hors renfo, en minutes :
 * S1 100, S2 108, S3 117, S4 96, S5 126, S6 136, S7 147, S8 122,
 * S9 132 sans Izon et 55 avec Izon, S10 140, S11 151, S12 126,
 * S13 162 (pic), S14 118, S15 55, S16 90.
 *
 * Phase de la semaine 9 : propre à chaque variante. Ce sont deux semaines
 * réellement différentes, elles n'ont aucune raison de porter la même
 * étiquette. Sans dossard, c'est la première marche du troisième cycle
 * progressif, donc bloc3. Avec dossard, c'est une semaine réellement allégée
 * puisque le coureur court le dimanche, donc allegee, avec les deux jours qui
 * précèdent la course volontairement délestés. L'entrée principale du
 * programme porte la phase de la variante sans dossard, celle qu'elle expose
 * par défaut dans son champ `seances` ; chaque variante porte la sienne et
 * c'est celle-là que la vérification lit quand on substitue la variante.
 *
 * Les deux variantes passent le garde-fou de charge, chacune par un chemin
 * différent. Sans Izon, S9 est un bloc qui suit une semaine plus douce : sa
 * référence est le pic des blocs atteint jusque-là (147 min en S7), et S10 se
 * compare ensuite à S9. Avec Izon, S9 est allégée et se compare à S8 ; S10,
 * qui est un bloc précédé d'une semaine hors bloc, repart lui aussi du pic des
 * blocs. La règle des 10 % ne bloque donc rien : elle ne compare jamais S10 au
 * volume hors course d'une semaine qui contient la course-test.
 *
 * Progression des intensités. S1 rien, S2 et S3 Z3 pour apprendre l'effort
 * soutenu, S4 rien, S5 et S6 Z4 pour installer l'allure de course, S7 Z5 pour
 * la vitesse pure, S8 rien, S9 Z4 sur blocs longs (ou la course-test), S10 et
 * S11 Z4 en resserrant le format, S12 rien, S13 Z5 au pic de charge, S14 la
 * séance de référence du programme (3 fois 8 min en Z4), S15 un rappel très
 * court avant la course. Une seule séance dure par semaine, toujours entourée
 * de facile. Le dosage est volontairement orienté Z4 et Z5 : sur 10 km, c'est
 * là que se joue le chrono.
 *
 * Lignes droites, décision de l'encadrant. Des accélérations de 15 à 20 s en
 * Z5 sont placées en fin d'endurance à partir de la fin du bloc 1, donc en S3,
 * puis entretenues en S5, S6, S9, S10, S11 et S14. Elles sont écartées des
 * semaines plus douces (S4, S8, S12), des semaines qui portent déjà une séance
 * de vitesse (S7 et S13) et de la semaine de course (S15). La variante avec
 * Izon de la semaine 9 fait exception avec quatre lignes droites la veille de
 * la course, tenues en Z4 et non en Z5 : ce sont des lignes droites de réveil,
 * pas de travail.
 *
 * Convention de calcul des séances à intervalles : pour N répétitions, N-1
 * récupérations, celles qui tombent entre deux répétitions. Échauffement plus
 * répétitions plus récupérations plus retour au calme égale exactement la
 * durée déclarée. Même règle pour les lignes droites, qui se logent à
 * l'intérieur de la durée de l'endurance et ne s'y ajoutent pas : 4 lignes de
 * 15 s avec 1 min de marche entre chaque font 4 min, 6 lignes de 20 s avec
 * 1 min de marche entre chaque font 7 min.
 *
 * Sortie longue plafonnée à 1 h 15, atteinte une seule fois en S13. Au-delà,
 * un coureur de 10 km accumule de la fatigue sans rien gagner sur sa course.
 *
 * Toute séance dont la description cite une zone plus dure que celle de sa
 * fabrique la déclare via { zonesSecondaires: [...] } : les sept endurances à
 * lignes droites en Z5, l'endurance de veille de course-test qui monte en Z4,
 * et aucune autre.
 */

const s9SansIzon = semaine(
  9,
  'bloc3',
  'Ouverture du bloc spécifique',
  "Pas de dossard cette semaine : le troisième cycle démarre tout de suite. Trois semaines qui montent devant toi, celle-ci en est la première marche, et le travail au seuil change de format en passant à des blocs longs.",
  [
    ef(
      29,
      "20 min en Z2 sur un parcours sans difficulté, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 5 min en Z2. Les lignes droites reviennent après la semaine plus douce, garde-les vives mais brèves.",
      "Remettre de la vivacité dans une foulée qui sort d'une semaine calme, au moment précis où le bloc spécifique demande à nouveau de la fréquence d'appui.",
      { zonesSecondaires: ['Z5'] },
    ),
    seuil(
      45,
      "13 min d'échauffement en Z2, puis 3 fois 7 min en Z4 avec 3 min de trottinement en Z1 entre chaque, puis 5 min de retour au calme en Z2. Les blocs du bloc 2 duraient 6 min, ceux-ci en durent 7 : la minute supplémentaire paraît dérisoire sur le papier, elle ne l'est pas dans les jambes.",
      "Reprendre le travail au seuil exactement là où le bloc 2 l'avait laissé, en allongeant la répétition plutôt qu'en en ajoutant une.",
    ),
    sl(
      58,
      "58 min en Z2, sur un parcours roulant. Cours-la entièrement facile : elle sert de contrepoids à la séance de seuil, pas de rallonge.",
      "Relancer la sortie longue dès l'ouverture du cycle, pour qu'elle atteigne son plafond sans à-coup quatre semaines plus tard.",
    ),
    renfo(
      25,
      "3 séries de : 45 s de planche ventrale, 30 s de gainage latéral par côté, 18 squats, 14 fentes arrière par jambe, 40 s de pont fessier. 1 min de pause entre les séries.",
      "Remonter le renforcement au niveau du bloc spécifique, le tronc doit être prêt avant que la charge de course n'atteigne son maximum.",
    ),
  ],
);

const s9AvecIzon = semaine(
  9,
  'allegee',
  "Course test à Izon",
  "Tu as un dossard dimanche 27 septembre sur le 10 km d'Izon. La semaine est réellement allégée, et c'est logique : tu cours pour de bon le dimanche. Une sortie en début de semaine, une très courte la veille, et les deux jours qui précèdent la course volontairement délestés.",
  [
    ef(
      30,
      "30 min en Z2 en début de semaine, lundi ou mardi au plus tard. Aucune accélération, aucune bosse cherchée exprès.",
      "Rester en mouvement après le week-end précédent sans entamer la fraîcheur qui doit être intacte dimanche.",
    ),
    ef(
      25,
      "Vendredi, rien du tout : ni course, ni renfo, ni sortie de compensation. Samedi, la veille de la course, 18 min en Z2, puis 4 lignes droites de 15 s en Z4 avec 1 min de marche entre chaque, soit 4 min, et 3 min en Z2 pour rentrer. On reste en Z4, pas au-delà : ces lignes droites réveillent la foulée, elles ne l'entament pas.",
      "Alléger franchement les deux jours qui précèdent le dossard, un repos la veille de la veille et une sortie minuscule la veille laissent de meilleures sensations au départ que n'importe quel entraînement de dernière minute.",
      { zonesSecondaires: ['Z4'] },
    ),
    course(
      "10 km d'Izon",
      10,
      55,
      "Ta course-test. Échauffe-toi 12 min en Z2, puis quelques lignes droites. Pars en Z3 sur les 2 premiers kilomètres, sans regarder qui te double. Passe en Z4 du 3e au 8e, et donne ce qui reste sur les 2 derniers. Note tes sensations le soir même, tu t'en serviras à Bordeaux.",
      "Prendre un repère chronométré fiable à mi-préparation, en conditions réelles de dossard, de départ groupé et de ravitaillement.",
    ),
    renfo(
      15,
      "Une seule séance en début de semaine : 2 séries de 40 s de planche ventrale, 20 s de planche sur chaque côté, et 5 min de mobilité des hanches. Rien après le mercredi.",
      "Entretenir le gainage sans laisser la moindre courbature dans les jambes le jour du dossard.",
    ),
  ],
);

export const P2 = {
  code: 'P2',
  nom: '10 km de Bordeaux',
  dateCourse: '2026-11-08',
  izon: 'option',
  prerequis: "Savoir courir 30 minutes d'affilée sans s'arrêter.",
  semainesContenu: [
    semaine(
      1,
      'bloc1',
      'Prendre le rythme des trois sorties',
      "Quinze semaines devant toi, aucune raison de te presser. Cette première semaine sert seulement à caler trois créneaux dans ton agenda et à t'y tenir.",
      [
        ef(
          30,
          "30 min en Z2, sur du plat. Le test est simple : si tu ne peux pas raconter ta journée à quelqu'un en courant, tu vas trop vite.",
          "Installer le repère d'intensité qui servira de référence à tout le reste du programme.",
        ),
        ef(
          30,
          "30 min en Z2, de préférence sur chemin ou en sous-bois. Un terrain souple absorbe une partie des chocs, tes tendons te remercieront en novembre.",
          "Répartir la charge sur des surfaces variées dès le début, plutôt que d'attendre la première douleur pour y penser.",
        ),
        sl(
          40,
          "40 min en Z2 sans t'arrêter. Pars franchement plus lentement que ton allure spontanée sur les 10 premières minutes.",
          "Poser le plancher de la sortie longue, à partir duquel tout le programme va construire.",
        ),
        renfo(
          20,
          "3 séries de : 30 s de planche ventrale, 30 s de planche sur chaque côté, 10 fentes avant par jambe. 1 min de récupération entre les séries.",
          "Solidifier la ceinture abdominale et les hanches, qui encaissent chaque appui bien avant les cuisses.",
        ),
      ],
    ),

    semaine(
      2,
      'bloc1',
      "L'effort soutenu, première approche",
      "La routine est prise, on ouvre le chapitre de l'intensité par le bas de l'échelle. La Z3 est une zone d'apprentissage : soutenue, mais jamais douloureuse.",
      [
        ef(
          30,
          "30 min en Z2. Surveille ta respiration plutôt que ta montre, elle doit rester ample et silencieuse d'un bout à l'autre.",
          "Fournir du volume facile autour de la première séance de qualité, le corps progresse pendant ces sorties-là.",
        ),
        tempo(
          36,
          "12 min d'échauffement en Z2, puis 3 fois 4 min en Z3 avec 2 min de trottinement en Z1 entre chaque, puis 8 min de retour au calme en Z2. En Z3, tu parles encore, mais par phrases courtes et on entend ton souffle.",
          "Découvrir une intensité tenable et apprendre à la quitter au bon moment, avant que la sensation ne devienne pénible.",
        ),
        sl(
          42,
          "42 min en Z2. Deux minutes de plus que la semaine dernière, pas davantage : la progression se joue sur la répétition, pas sur les grands sauts.",
          "Allonger la sortie longue par petites marches, la seule méthode qui n'expose pas les tendons.",
        ),
        renfo(
          20,
          "Reprends la séance de la semaine 1 et ajoute 2 séries de 15 squats au poids du corps, pieds à la largeur des épaules, descente lente et remontée franche.",
          "Répéter un contenu déjà connu pour que le geste s'automatise, la nouveauté n'apporte rien à ce stade.",
        ),
      ],
    ),

    semaine(
      3,
      'bloc1',
      'Fin du premier bloc',
      "Semaine la plus chargée des quatre premières. On en profite pour introduire les lignes droites, quelques secondes de vitesse en fin de footing facile, histoire que les jambes n'oublient pas complètement comment aller vite.",
      [
        ef(
          33,
          "24 min en Z2 en démarrant très progressivement, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche complète entre chaque, soit 4 min, puis 5 min de retour au calme en Z2. Une ligne droite se lance en montant progressivement en vitesse et se relâche avant la fin, tu ne dois jamais finir en dette de souffle.",
          "Rappeler à la foulée qu'elle sait s'ouvrir, sur des efforts trop brefs pour fatiguer. Ce n'est pas une séance de vitesse, c'est un footing qui se termine bien.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          39,
          "12 min en Z2, puis 3 fois 5 min en Z3 avec 2 min en Z1 entre chaque, puis 8 min en Z2. Les trois blocs doivent se ressembler : si le dernier est nettement plus dur, tu as lancé le premier trop vite.",
          "Apprendre à répartir un effort sur plusieurs blocs, exactement ce qu'il faudra faire sur les kilomètres du 10 km.",
        ),
        sl(
          45,
          "45 min en Z2 d'une traite. Si la sortie tombe en fin de matinée, emporte de quoi boire.",
          "Franchir les trois quarts d'heure de course continue, dernier palier avant la semaine de repos relatif.",
        ),
        renfo(
          20,
          "2 séries de : 40 s de planche ventrale, 20 fentes marchées, 15 squats, 30 s de pont fessier allongé sur le dos bassin décollé. 90 s de pause entre les séries.",
          "Réveiller les fessiers, moteur de la propulsion et grand oublié du coureur qui débute.",
        ),
      ],
    ),

    semaine(
      4,
      'allegee',
      'Première respiration',
      "Environ 20 % de volume en moins et aucune intensité. Tu vas trouver la semaine trop facile : c'est le signe qu'elle est bien dosée. Les progrès des trois semaines précédentes se fixent maintenant.",
      [
        ef(
          28,
          "28 min en Z2, sans montre si tu en es capable. Tu cours à la sensation, uniquement.",
          "Rompre avec le réflexe de mesurer, une semaine de repos relatif se juge à la fraîcheur du lundi suivant.",
        ),
        ef(
          30,
          "30 min en Z2, idéalement accompagné. La séance doit rester conversationnelle du premier au dernier pas.",
          "Profiter d'une semaine sans exigence pour courir en groupe, ce qui est aussi la raison d'être du club.",
        ),
        sl(
          38,
          "38 min en Z2, plus courte que les deux dernières. Termine en te disant que tu aurais pu continuer une demi-heure de plus.",
          "Conserver le rendez-vous de la sortie longue tout en coupant réellement dans la charge.",
        ),
        renfo(
          18,
          "2 séries de : 30 s de planche, 10 squats, 10 fentes par jambe, puis 6 min d'étirements lents des mollets, des ischios et des fessiers.",
          "Rester actif sans créer la moindre courbature pendant la semaine censée effacer la fatigue.",
        ),
      ],
    ),

    semaine(
      5,
      'bloc2',
      'On monte au seuil',
      "Deuxième bloc, nouvelle marche. Après deux semaines à apprivoiser la Z3, on passe en Z4 : c'est l'allure que tu tiendras le 8 novembre, et il te reste dix semaines pour l'apprivoiser.",
      [
        ef(
          34,
          "22 min en Z2 le surlendemain du seuil, jamais la veille. Enchaîne 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 5 min de retour au calme en Z2.",
          "Faire du volume utile un jour où le corps digère encore la séance dure, et garder le pied vif pendant que le bloc 2 travaille l'endurance de vitesse.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          42,
          "15 min d'échauffement en Z2, puis 2 fois 6 min en Z4 avec 3 min de trottinement en Z1 entre les deux, puis 12 min de retour au calme en Z2. En Z4 tu ne places plus que trois ou quatre mots à la fois, c'est nettement au-dessus des blocs en Z3 des semaines 2 et 3.",
          "Faire connaissance avec l'allure qui décidera de ton chrono, en quantité assez faible pour que la séance reste réussie.",
        ),
        sl(
          50,
          "50 min en Z2 sur un parcours légèrement vallonné. Monte les côtes en gardant le souffle sous contrôle, quitte à ralentir beaucoup.",
          "Habituer le corps à produire de l'effort sur terrain irrégulier, ce qui rend le plat plus facile ensuite.",
        ),
        renfo(
          25,
          "3 séries de : 45 s de planche ventrale, 30 s de gainage sur chaque côté, 16 squats, 12 fentes arrière par jambe, 30 s de chaise contre un mur. 1 min de pause entre les séries.",
          "Monter d'un cran maintenant que le corps encaisse bien la charge de course, l'ossature musculaire doit suivre le rythme.",
        ),
      ],
    ),

    semaine(
      6,
      'bloc2',
      'Plus de temps en Z4',
      "Même intensité que la semaine passée, mais une répétition de plus et une sortie longue rallongée. On ajoute du temps passé à l'allure de course, jamais de la vitesse en plus.",
      [
        ef(
          36,
          "25 min en Z2 sur un parcours connu, pour n'avoir à réfléchir ni à l'itinéraire ni au dénivelé. Puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, et 4 min en Z2 pour finir.",
          "Ajouter du volume facile dans une semaine qui monte déjà en charge, et entretenir la vitesse de foulée sans coûter la moindre fraîcheur.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          45,
          "14 min en Z2, puis 3 fois 6 min en Z4 avec 3 min en Z1 entre chaque bloc, puis 7 min en Z2. Le troisième bloc doit être aussi rapide que le premier, sinon tu es parti trop fort.",
          "Augmenter le temps total passé à l'allure de course sans toucher à l'intensité, c'est ce dosage qui construit la tenue.",
        ),
        sl(
          55,
          "55 min en Z2. Bois quelques gorgées vers la 30e minute, même sans soif, pour prendre l'habitude de t'alimenter en courant.",
          "Dépasser la durée probable de ta course, pour que le 8 novembre te paraisse court.",
        ),
        renfo(
          25,
          "Séance en côte : trouve une pente régulière et monte-la 8 fois en trottinant ou en marchant vite, redescente en marchant, sans chronomètre. Termine par 3 fois 45 s de planche.",
          "Muscler les jambes dans le geste de course, plus utile pour la foulée qu'un exercice au sol.",
        ),
      ],
    ),

    semaine(
      7,
      'bloc2',
      'Le premier passage en Z5',
      "Semaine la plus lourde depuis le début, et la première qui monte jusqu'en Z5. Les efforts sont très courts par choix : on cherche la fréquence d'appui, pas l'épuisement.",
      [
        ef(
          38,
          "38 min en Z2, sans lignes droites cette semaine : la séance de vitesse s'en charge déjà. Si tu te sens émoussé, descends la sortie entière en Z1, c'est sans conséquence.",
          "Absorber la charge de la semaine la plus dure du bloc 2 sans y ajouter le moindre effort superflu.",
        ),
        vma(
          44,
          "15 min en Z2, puis 8 fois 1 min en Z5 avec 1 min de trottinement en Z1 entre chaque, puis 14 min de retour au calme en Z2. Concentre-toi sur des appuis rapides et légers plutôt que sur de grandes foulées.",
          "Élargir le plafond de vitesse une fois la base construite, pour que l'allure du 10 km paraisse plus confortable dans le bloc suivant.",
        ),
        sl(
          65,
          "1 h 05 en Z2. Choisis un jour où tu n'as rien de prévu derrière, et pars sans horaire de retour en tête.",
          "Construire le fond d'endurance qui portera le dernier tiers de la course, quand la lucidité baisse.",
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 24 fentes marchées, 20 squats, 40 s de pont fessier jambes fléchies. Termine par 5 min d'étirements des mollets et des ischios.",
          "Verrouiller le gainage avant la semaine allégée, pendant laquelle le renforcement va nettement baisser.",
        ),
      ],
    ),

    semaine(
      8,
      'allegee',
      'Deuxième respiration',
      "Le volume baisse d'un sixième et toute intensité disparaît. Sept semaines de travail viennent de passer, il en reste sept : c'est le moment de faire le point sur les sensations plutôt que sur les chiffres.",
      [
        ef(
          30,
          "30 min en Z2 très souples. Aucune ligne droite, aucune bosse, aucun objectif autre que de bien te sentir en rentrant.",
          "Laisser le système nerveux récupérer, c'est lui qui fatigue le plus vite sur les semaines à intensité.",
        ),
        ef(
          36,
          "36 min en Z2 sur terrain souple si tu en as un. Change de parcours par rapport à l'autre sortie de la semaine.",
          "Entretenir la routine des trois sorties en variant les appuis, ce qui répartit la contrainte sur des muscles différents.",
        ),
        sl(
          56,
          "56 min en Z2, la seule séance un peu longue de la semaine et volontairement raccourcie. Elle reste facile de bout en bout : si tu accélères sur la fin, tu as raté l'objectif.",
          "Conserver l'acquis d'endurance pendant une semaine sans intensité, le fond ne se garde qu'en le pratiquant.",
        ),
        renfo(
          18,
          "2 séries de : 45 s de planche, 12 squats, 12 fentes par jambe, 30 s de pont fessier. On s'arrête là, pas de côtes cette semaine.",
          "Maintenir le tonus musculaire à charge réduite, en cohérence avec le reste de la semaine.",
        ),
      ],
    ),

    {
      numero: 9,
      // La phase suit la variante : bloc3 sans dossard, allegee avec. L'entrée
      // principale porte celle de la variante sans dossard, la seule dont elle
      // expose les séances par défaut. Substituer une variante, c'est donc
      // reprendre à la fois ses séances et sa phase.
      phase: s9SansIzon.phase,
      titre: 'Course test ou ouverture du bloc spécifique',
      intention:
        "Deux semaines franchement différentes selon ta case cochée. Les coureurs inscrits au 10 km d'Izon du 27 septembre suivent la variante avec course : elle est réellement allégée, puisqu'ils courent dimanche. Les autres attaquent directement le troisième cycle progressif, sans creux artificiel.",
      variantes: {
        avecIzon: s9AvecIzon,
        sansIzon: s9SansIzon,
      },
      seances: s9SansIzon.seances,
    },

    semaine(
      10,
      'bloc3',
      'Deuxième marche, les blocs s\'allongent',
      "Deuxième semaine du cycle, et le travail au seuil change de forme : moins de répétitions, mais nettement plus longues. C'est le format qui ressemble le plus à ce que tu vivras le 8 novembre.",
      [
        ef(
          31,
          "22 min en Z2, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 5 min en Z2. Quatre suffisent cette semaine : la séance de seuil est longue, inutile d'en rajouter.",
          "Fournir du volume facile un jour où le corps digère encore les blocs de 12 min, tout en gardant le pied vif.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          45,
          "10 min en Z2, puis 2 fois 12 min en Z4 avec 4 min de trottinement en Z1 entre les deux, puis 7 min en Z2. La difficulté n'est plus l'intensité, c'est la durée pendant laquelle tu la tiens : le vrai test est de finir le deuxième bloc aussi propre que le premier.",
          "Apprendre à ne pas céder au milieu d'un effort long, ce qui se joue dans la tête bien plus que dans les jambes.",
        ),
        sl(
          64,
          "1 h 04 en Z2. Aucun bloc rapide, aucune accélération finale : la sortie longue du bloc spécifique sert de contrepoids aux séances de seuil.",
          "Faire passer la sortie longue au-dessus de l'heure, en la gardant entièrement facile pour préserver la qualité du seuil.",
        ),
        renfo(
          25,
          "3 séries de : 50 s de planche ventrale, 30 s de planche sur chaque côté, 18 squats, 12 fentes sautées par jambe si les genoux le permettent, sinon 15 fentes classiques. 1 min de pause.",
          "Introduire un peu d'explosivité dans le renforcement, à un moment où le corps est prêt à l'encaisser.",
        ),
      ],
    ),

    semaine(
      11,
      'bloc3',
      'Quatre blocs au seuil',
      "Troisième et dernière marche du cycle, la plus chargée des trois. On quitte les blocs longs pour quatre répétitions plus courtes, avec des récupérations volontairement raccourcies. C'est la semaine où l'allure de course commence à devenir familière plutôt que menaçante.",
      [
        ef(
          34,
          "22 min en Z2, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 5 min en Z2. À placer à distance de la séance de seuil, jamais la veille.",
          "Entretenir la vitesse de foulée dans une semaine dense, sans jamais entamer la fraîcheur nécessaire aux quatre blocs de seuil.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          47,
          "12 min en Z2, puis 4 fois 6 min en Z4 avec seulement 2 min en Z1 entre chaque, puis 5 min en Z2. Même temps total en Z4 que la semaine passée, mais bien moins de repos pour l'encaisser : le quatrième bloc doit rester propre.",
          "Réduire le temps de récupération plutôt que d'augmenter l'intensité, ce qui rapproche la séance des conditions réelles de la course.",
        ),
        sl(
          70,
          "1 h 10 en Z2, en terrain varié. Mange quelque chose deux heures avant si la sortie est matinale.",
          "Rapprocher progressivement la sortie longue de son plafond, sans jamais dépasser ce dont un coureur de 10 km a besoin.",
        ),
        renfo(
          25,
          "2 séries de : 1 min de planche ventrale, 45 s de gainage latéral par côté, 20 squats, 30 s de chaise contre un mur, 15 montées de genoux par jambe sur une marche.",
          "Travailler la tenue posturale en fatigue, c'est elle qui lâche en premier sur les derniers kilomètres.",
        ),
      ],
    ),

    semaine(
      12,
      'allegee',
      'Respirer avant le sommet',
      "Troisième semaine plus douce du programme, et la dernière avant le point haut. Le volume tombe d'environ 17 % et l'intensité disparaît complètement pendant sept jours. Une semaine allégée juste avant la semaine la plus lourde n'est pas une contradiction : c'est précisément ce qui la rend tenable.",
      [
        ef(
          34,
          "34 min en Z2, tranquilles. Si une douleur traîne depuis les trois semaines de seuil, c'est maintenant qu'il faut la traiter, pas dans quinze jours.",
          "Ouvrir une fenêtre pour régler les petits pépins pendant qu'il reste du temps pour les régler.",
        ),
        ef(
          36,
          "36 min en Z2, sur un parcours plat. Aucune accélération, aucune côte, aucune ligne droite : cette semaine ne contient rien de dur, et c'est délibéré.",
          "Réduire la sollicitation nerveuse après trois semaines qui ont toutes compté du travail en Z4.",
        ),
        sl(
          56,
          "56 min en Z2, un quart d'heure de moins que la semaine passée. Termine avec la sensation nette d'avoir de la marge, et surtout l'envie d'y retourner.",
          "Entretenir le fond en le laissant reculer d'un cran, pour aborder la semaine sommet avec des jambes qui ont vraiment récupéré.",
        ),
        renfo(
          18,
          "2 séries de : 40 s de planche, 15 squats, 10 fentes par jambe. Puis 8 min de mobilité des hanches et des chevilles.",
          "Passer momentanément du renforcement à l'entretien, l'objectif de la semaine n'est pas de gagner de la force mais d'arriver frais.",
        ),
      ],
    ),

    semaine(
      13,
      'bloc3',
      'Le pic de charge',
      "Semaine la plus lourde des quinze : le plus gros volume, la sortie longue plafond, et le retour de la Z5. Elle arrive juste après une semaine douce, c'est ce qui te permet de l'encaisser. Si tu la termines debout, le 8 novembre est déjà largement à ta portée. Ensuite, tout redescend.",
      [
        ef(
          38,
          "38 min en Z2, sans lignes droites : la séance de fractionné couvre déjà largement le besoin de vitesse cette semaine.",
          "Fournir du volume neutre entre les deux séances les plus exigeantes du programme, sans rien y ajouter.",
        ),
        vma(
          49,
          "14 min en Z2, puis 10 fois 1 min en Z5 avec 1 min de trottinement en Z1 entre chaque, puis 16 min de retour au calme en Z2. Deux répétitions de plus qu'en semaine 7, à la même intensité exactement.",
          "Amener la vitesse maximale à son point haut du programme, assez tôt pour que ce travail ait le temps de se transformer en aisance le jour de la course.",
        ),
        sl(
          75,
          "1 h 15 en Z2, la plus longue sortie du programme et la seule à ce niveau. Elle reste facile intégralement : le but est la durée, pas l'effort.",
          "Atteindre le plafond d'endurance utile pour un 10 km, au-delà on accumule de la fatigue sans gagner sur la course.",
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 20 squats, 20 fentes marchées, 45 s de pont fessier sur une jambe alternée. Étirements complets pour terminer, sans forcer.",
          "Boucler le renforcement à son point haut avant de le réduire pour les deux dernières semaines.",
        ),
      ],
    ),

    semaine(
      14,
      'affutage',
      'La séance de référence',
      "Début de l'affûtage. Le volume baisse encore, mais la séance de seuil, elle, atteint son format le plus abouti : 3 fois 8 min en Z4. C'est la séance qui te dira, mieux qu'aucune montre, où tu en es.",
      [
        ef(
          28,
          "20 min en Z2, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 4 min en Z2. En début de semaine, jamais la veille du seuil.",
          "Rappeler la vitesse aux jambes en quantité volontairement réduite, quatre lignes droites suffisent largement en période d'affûtage.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          45,
          "10 min en Z2, puis 3 fois 8 min en Z4 avec 3 min en Z1 entre chaque, puis 5 min en Z2. C'est la séance la plus spécifique du programme : 24 min passées à l'allure exacte que tu chercheras à Bordeaux. Si les trois blocs se ressemblent, tu es prêt.",
          "Valider l'allure de course sur un volume proche de celui du 10 km, dix jours avant, quand il reste le temps de récupérer mais plus celui de progresser.",
        ),
        sl(
          45,
          "45 min en Z2 seulement. Tu vas trouver ça court après les semaines à plus d'une heure, c'est exactement le but.",
          "Couper franchement dans la sortie longue pour que la fraîcheur remonte, l'endurance acquise ne se perd pas en dix jours.",
        ),
        renfo(
          15,
          "2 séries de : 30 s de planche ventrale, 20 s de planche sur chaque côté, 10 squats lents. Puis 5 min d'étirements doux.",
          "Entretenir la posture sans provoquer la moindre courbature à moins de deux semaines de la course.",
        ),
      ],
    ),

    semaine(
      15,
      'affutage',
      'Semaine de course',
      "Le volume d'entraînement est divisé par deux. Dimanche 8 novembre, tu cours le 10 km de Bordeaux. Cette semaine n'a plus qu'une fonction : te déposer sur la ligne de départ frais et confiant.",
      [
        ef(
          30,
          "30 min en Z2 en début de semaine, lundi ou mardi. Souple, sans rien chercher. Aucune ligne droite cette semaine.",
          "Évacuer les dernières traces d'affûtage et garder le geste de course sans créer de fatigue.",
        ),
        seuil(
          25,
          "10 min en Z2, puis 4 fois 1 min en Z4 avec 1 min de trottinement en Z1 entre chaque, puis 8 min en Z2. À faire mercredi au plus tard, pas après.",
          "Rappeler l'allure de dimanche aux jambes sur un volume trop petit pour coûter quoi que ce soit en récupération.",
        ),
        course(
          '10 km de Bordeaux',
          10,
          55,
          "Ta course. Échauffe-toi 12 min en Z2 puis 3 ou 4 lignes droites, en finissant 10 min avant le départ. Pars en Z3 sur les 2 premiers kilomètres, sur un parcours urbain et roulant la tentation de partir vite est maximale. Bascule en Z4 du 3e au 8e. Sur les 2 derniers, tu vides ce qu'il reste.",
          "Concrétiser quinze semaines de travail, et repartir avec un chrono de référence pour la saison qui suit.",
        ),
        renfo(
          12,
          "Une seule séance en début de semaine : 2 séries de 30 s de planche ventrale et 5 min de mobilité des hanches et des chevilles. Rien à partir du mercredi.",
          "Garder le corps réveillé sans rien lui demander, le travail de fond est terminé depuis longtemps.",
        ),
      ],
    ),

    semaine(
      16,
      'recuperation',
      'La semaine que personne ne respecte',
      "Aucune intensité, aucun chrono, aucune comparaison. Quinze semaines viennent de passer, le corps a besoin de sept jours pour encaisser vraiment. Sauter cette semaine, c'est démarrer la prochaine préparation déjà fatigué.",
      [
        recup(
          25,
          "25 min en Z1, deux ou trois jours après la course. Si les jambes sont encore raides, remplace par 30 min de marche, le bénéfice est le même.",
          "Relancer la circulation pour évacuer les courbatures plus vite qu'en restant assis.",
        ),
        recup(
          30,
          "30 min en Z1 en milieu de semaine. Tu vas avoir envie d'accélérer parce que les sensations reviennent : ne le fais pas.",
          "Laisser le retour des sensations se faire tout seul, sans le provoquer.",
        ),
        recup(
          35,
          "35 min en Z1 sur terrain souple, en fin de semaine. Choisis un parcours pour le paysage, laisse la montre à la maison.",
          "Refermer le cycle sur une note agréable, ce qui compte autant que le reste pour repartir motivé.",
        ),
        renfo(
          15,
          "15 min d'étirements et de mobilité : hanches, mollets, ischios, dos. Respire lentement et tiens chaque position sans forcer.",
          "Rendre de la souplesse aux muscles raidis par quinze semaines de course.",
        ),
      ],
    ),
  ],
};
