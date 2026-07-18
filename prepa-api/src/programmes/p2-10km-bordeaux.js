import { ef, sl, tempo, seuil, vma, recup, renfo, course, semaine } from './seances.js';

/**
 * P2, 10 km de Bordeaux. Quinze semaines de préparation plus une de
 * récupération, soit seize entrées.
 *
 * Programme destiné au coureur qui tient déjà une demi-heure de course
 * continue et qui veut, cette fois, chercher un chrono sur 10 km plutôt que
 * simplement terminer. Trois sorties par semaine, un renforcement, et toujours
 * aucune allure chiffrée : l'intensité se lit en zones 1 à 5, chacun place son
 * curseur là où sa respiration le lui dit. Quinze semaines, c'est long : la
 * trame ménage donc trois semaines allégées et une respiration complète à
 * mi-parcours, sans quoi personne ne tiendrait la distance.
 *
 * La course a lieu le dimanche 8 novembre 2026, dernier jour de la semaine 15.
 * La semaine 9 tombe exactement sur le week-end du 10 km d'Izon, le 27
 * septembre : c'est ce qui rend la double variante possible.
 *
 * Barème de volumes, hors course objectif et hors renfo, en minutes :
 * S1 100, S2 108, S3 117, S4 96, S5 126, S6 136, S7 147, S8 122,
 * S9 100 sans Izon et 55 avec Izon, S10 140, S11 151, S12 162 (pic),
 * S13 132, S14 118, S15 55, S16 90.
 *
 * Phase de la semaine 9. Elle est déclarée allégée, et non bloc, pour une
 * raison de fond : ses deux variantes n'ont pas du tout la même charge (100
 * min sans dossard, 55 min avec). Une semaine de bloc sert de référence à la
 * semaine de bloc suivante, ce qui plafonnerait la reprise du bloc 3 à la
 * valeur de la variante la plus légère et rendrait le programme incohérent
 * selon la case cochée par le coureur. Allégée, elle se compare à la semaine
 * précédente et laisse le bloc 3 repartir du pic du bloc 2, à l'identique dans
 * les deux variantes. Sportivement, l'étiquette est juste : avec dossard c'est
 * un mini-affûtage, sans dossard c'est une semaine de rythme volontairement
 * plus légère qui permet à tout le groupe d'attaquer le bloc spécifique dans
 * le même état de fraîcheur.
 *
 * Progression des intensités. S1 rien, S2 et S3 Z3 pour apprendre l'effort
 * soutenu, S4 rien, S5 et S6 Z4 pour installer l'allure de course, S7 Z5 pour
 * la vitesse pure, S8 rien, S9 Z3 (ou la course-test), S10 et S11 Z4 sur des
 * blocs plus longs, S12 Z5 au pic de charge, S13 rien, S14 la séance de
 * référence du programme (3 fois 8 min en Z4), S15 un rappel très court avant
 * la course. Une seule séance dure par semaine, toujours entourée de facile.
 * Le dosage est volontairement orienté Z4 et Z5 : sur 10 km, c'est là que se
 * joue le chrono.
 *
 * Lignes droites, décision de l'encadrant. Des accélérations de 15 à 20 s en
 * Z5 sont placées en fin d'endurance à partir de la fin du bloc 1, donc en S3,
 * puis entretenues en S5, S6, S10, S11 et S14. Elles sont écartées des
 * semaines allégées (S4, S8, S13), des semaines qui portent déjà une séance de
 * vitesse (S7 et S12) et de la semaine de course (S15). La variante avec Izon
 * de la semaine 9 fait exception avec quatre lignes droites la veille de la
 * course, tenues en Z4 et non en Z5 : ce sont des lignes droites de réveil,
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
 * Sortie longue plafonnée à 1 h 15, atteinte une seule fois en S12. Au-delà,
 * un coureur de 10 km accumule de la fatigue sans rien gagner sur sa course.
 *
 * Toute séance dont la description cite une zone plus dure que celle de sa
 * fabrique la déclare via { zonesSecondaires: [...] } : les sept endurances à
 * lignes droites, et aucune autre.
 */

const s9SansIzon = semaine(
  9,
  'allegee',
  'Semaine de rythme',
  "Pas de dossard cette semaine, mais du travail de qualité quand même. Le volume redescend volontairement : ce creux au milieu des quinze semaines n'est pas une perte de temps, c'est ce qui rendra le bloc spécifique digeste.",
  [
    ef(
      25,
      "25 min en Z2, sans chercher à rattraper le volume des semaines précédentes. Le compteur redescend, c'est prévu.",
      "Maintenir la mécanique de course pendant une semaine où le corps a surtout besoin de digérer huit semaines de travail.",
    ),
    tempo(
      40,
      "12 min d'échauffement en Z2, puis 2 fois 8 min en Z3 avec 3 min de trottinement en Z1 entre les deux, puis 9 min de retour au calme en Z2. Le deuxième bloc se court exactement comme le premier, pas plus vite.",
      "Occuper la place laissée libre par la course-test et vérifier, sans dossard, que l'effort soutenu est devenu confortable.",
    ),
    sl(
      35,
      "35 min en Z2, nettement plus courte que d'habitude. Prends le parcours qui te fait plaisir plutôt que celui qui te fait progresser.",
      "Raccourcir franchement la sortie longue une fois dans la préparation, pour que les jambes repartent neuves sur le bloc spécifique.",
    ),
    renfo(
      18,
      "2 séries de : 45 s de planche ventrale, 12 fentes par jambe, 15 squats, 30 s de chaise contre un mur. 1 min de pause entre les séries.",
      "Garder le tronc actif pendant une semaine creuse, sans installer de courbatures qui gêneraient la reprise.",
    ),
  ],
);

const s9AvecIzon = semaine(
  9,
  'allegee',
  "Course test à Izon",
  "Tu as un dossard dimanche 27 septembre sur le 10 km d'Izon. La semaine est entièrement organisée autour de lui : deux sorties courtes, rien d'autre, et un vrai repère chronométré à la clé.",
  [
    ef(
      30,
      "30 min en Z2 en début de semaine, lundi ou mardi au plus tard. Aucune accélération, aucune bosse cherchée exprès.",
      "Rester en mouvement après le week-end précédent sans entamer la fraîcheur qui doit être intacte dimanche.",
    ),
    ef(
      25,
      "18 min en Z2 la veille de la course, puis 4 lignes droites de 15 s en Z4 avec 1 min de marche entre chaque, soit 4 min, et 3 min en Z2 pour rentrer. On reste en Z4, pas au-delà : ces lignes droites réveillent la foulée, elles ne l'entament pas.",
      "Déverrouiller les jambes la veille, une sortie très courte laisse toujours de meilleures sensations au départ qu'un repos complet.",
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
          32,
          "32 min en Z2 sur terrain souple si tu en as un. Change de parcours par rapport à l'autre sortie de la semaine.",
          "Entretenir la routine des trois sorties en variant les appuis, ce qui répartit la contrainte sur des muscles différents.",
        ),
        sl(
          60,
          "1 h en Z2, la seule séance un peu longue de la semaine. Elle reste facile de bout en bout : si tu accélères sur la fin, tu as raté l'objectif.",
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
      phase: 'allegee',
      titre: 'Course test ou semaine de rythme',
      intention:
        "Un repère à mi-parcours, avec ou sans dossard. Les coureurs inscrits au 10 km d'Izon du 27 septembre suivent la variante avec course, les autres la variante sans. Dans les deux cas la semaine est plus légère que celles qui l'encadrent, et c'est voulu.",
      variantes: {
        avecIzon: s9AvecIzon,
        sansIzon: s9SansIzon,
      },
      seances: s9SansIzon.seances,
    },

    semaine(
      10,
      'bloc3',
      'Bloc spécifique, premier jalon',
      "Le bloc 3 est celui qui ressemble le plus à la course. Les blocs en Z4 s'allongent, la sortie longue reprend sa progression, et tout ce qui n'est pas utile au 10 km disparaît du programme.",
      [
        ef(
          35,
          "26 min en Z2, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 5 min en Z2. Les lignes droites reviennent après deux semaines d'absence, garde-les vraiment courtes.",
          "Relancer le volume facile après la respiration de mi-parcours, et remettre un peu de vivacité dans une foulée qui vient de passer deux semaines au ralenti.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          45,
          "13 min en Z2, puis 3 fois 7 min en Z4 avec 3 min en Z1 entre chaque, puis 5 min en Z2. Les blocs passent de 6 à 7 min : la différence paraît minuscule sur le papier, elle ne l'est pas dans les jambes.",
          "Reprendre le travail au seuil là où le bloc 2 l'avait laissé, avec une répétition allongée plutôt qu'ajoutée.",
        ),
        sl(
          60,
          "1 h en Z2. Aucun bloc rapide, aucune accélération finale : la sortie longue du bloc 3 sert de contrepoids aux séances de seuil.",
          "Remonter la sortie longue à l'heure, en gardant cette séance entièrement facile pour préserver la qualité du seuil.",
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
      "On passe de trois à quatre répétitions, avec des récupérations volontairement raccourcies. C'est la semaine où l'allure de course commence à devenir familière plutôt que menaçante.",
      [
        ef(
          36,
          "24 min en Z2, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 5 min en Z2. À placer à distance de la séance de seuil, jamais la veille.",
          "Entretenir la vitesse de foulée dans une semaine dense, sans jamais entamer la fraîcheur nécessaire aux quatre blocs de seuil.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          47,
          "12 min en Z2, puis 4 fois 6 min en Z4 avec seulement 2 min en Z1 entre chaque, puis 5 min en Z2. La récupération raccourcie est le vrai enjeu : le quatrième bloc doit rester propre.",
          "Réduire le temps de récupération plutôt que d'augmenter l'intensité, ce qui rapproche la séance des conditions réelles de la course.",
        ),
        sl(
          68,
          "1 h 08 en Z2, en terrain varié. Mange quelque chose deux heures avant si la sortie est matinale.",
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
      'bloc3',
      'Le pic de charge',
      "Semaine la plus lourde des quinze : le plus gros volume, la sortie longue plafond, et le retour de la Z5. Si tu la termines debout, le 8 novembre est déjà largement à ta portée. Ensuite, tout redescend.",
      [
        ef(
          38,
          "38 min en Z2, sans lignes droites : la séance de fractionné couvre déjà largement le besoin de vitesse cette semaine.",
          "Fournir du volume neutre entre les deux séances les plus exigeantes du programme, sans rien y ajouter.",
        ),
        vma(
          49,
          "14 min en Z2, puis 10 fois 1 min en Z5 avec 1 min de trottinement en Z1 entre chaque, puis 16 min de retour au calme en Z2. Deux répétitions de plus qu'en semaine 7, à la même intensité exactement.",
          "Amener la vitesse maximale à son point haut du programme, six semaines avant que ce travail ne paye sur la course.",
        ),
        sl(
          75,
          "1 h 15 en Z2, la plus longue sortie du programme et la seule à ce niveau. Elle reste facile intégralement : le but est la durée, pas l'effort.",
          "Atteindre le plafond d'endurance utile pour un 10 km, au-delà on accumule de la fatigue sans gagner sur la course.",
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 20 squats, 20 fentes marchées, 45 s de pont fessier sur une jambe alternée. Étirements complets pour terminer, sans forcer.",
          "Boucler le renforcement à son point haut avant de le réduire pour les trois dernières semaines.",
        ),
      ],
    ),

    semaine(
      13,
      'allegee',
      'On coupe avant la fin',
      "Le volume tombe de près de 20 % et l'intensité disparaît complètement pendant sept jours. C'est la dernière vraie coupure avant l'affûtage, et c'est elle qui transforme le travail du bloc 3 en forme.",
      [
        ef(
          34,
          "34 min en Z2, tranquilles. Si tu ressens la moindre douleur qui traîne depuis le pic de charge, c'est cette semaine qu'il faut la traiter, pas la semaine prochaine.",
          "Ouvrir une fenêtre pour régler les petits pépins pendant qu'il reste du temps pour les régler.",
        ),
        ef(
          36,
          "36 min en Z2, sur un parcours plat. Aucune accélération, aucune côte, aucune ligne droite.",
          "Réduire la sollicitation nerveuse après une semaine qui a compté à la fois du fractionné et 1 h 15 de sortie longue.",
        ),
        sl(
          62,
          "1 h 02 en Z2, soit un quart d'heure de moins qu'au pic. Termine avec la sensation nette d'avoir de la marge.",
          "Entretenir le fond sans en rajouter, la forme se construit maintenant par soustraction.",
        ),
        renfo(
          18,
          "2 séries de : 40 s de planche, 15 squats, 10 fentes par jambe. Puis 8 min de mobilité des hanches et des chevilles.",
          "Passer du renforcement à l'entretien, l'objectif n'est plus de gagner de la force mais de la conserver.",
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
