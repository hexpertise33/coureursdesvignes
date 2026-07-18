import { ef, sl, tempo, seuil, recup, renfo, course, semaine } from './seances.js';

/**
 * P3, semi-marathon de Bordeaux. Quinze semaines de préparation plus une de
 * récupération, soit seize entrées.
 *
 * Programme pour le coureur qui a déjà une base : environ 20 km de course par
 * semaine depuis deux mois, ou l'équivalent en durée. Ce n'est pas un
 * programme d'initiation, c'est celui d'un coureur régulier qui veut passer de
 * la distance confortable au premier vrai objectif long. Trois sorties par
 * semaine, un renforcement, et toujours aucune allure chiffrée : l'intensité
 * se lit en zones 1 à 5, chacun règle son curseur sur ses propres sensations.
 *
 * La course a lieu le dimanche 8 novembre 2026, dernier jour de la semaine 15.
 * La semaine 9 tombe exactement sur le week-end du 10 km d'Izon, le 27
 * septembre : d'où la double variante.
 *
 * Barème de volumes, hors course objectif et hors renfo, en minutes :
 * S1 130, S2 141, S3 152, S4 124, S5 160, S6 172, S7 185, S8 152,
 * S9 126 sans Izon et 70 avec Izon, S10 172, S11 186, S12 200 (pic),
 * S13 165, S14 140, S15 61, S16 105.
 *
 * Phase de la semaine 9. Elle est déclarée allégée, et non bloc, pour la même
 * raison que dans P2 : ses deux variantes n'ont pas la même charge (126 min
 * sans dossard, 70 min avec). Si elle était une semaine de bloc, elle
 * servirait de plafond à la semaine de bloc suivante et le bloc 3 repartirait
 * à une hauteur différente selon la case cochée par le coureur. Déclarée
 * allégée, elle se compare à la semaine qui la précède et laisse le bloc 3
 * repartir du pic du bloc 2, identique dans les deux cas. Sportivement,
 * l'étiquette est exacte : avec dossard c'est un mini-affûtage autour d'un
 * 10 km couru vite, sans dossard c'est une semaine de rythme allégée qui
 * remet tout le groupe au même niveau de fraîcheur avant le bloc spécifique.
 *
 * Progression des intensités. S1 rien, S2 et S3 Z3, S4 rien, S5 Z4, S6 Z3 sur
 * blocs longs, S7 Z4 sur trois répétitions, S8 rien, S9 Z3 (ou la
 * course-test), S10 Z4, S11 Z3 sur 2 fois 15 min, S12 la sortie longue
 * spécifique avec ses blocs en Z3, S13 rien, S14 la séance de référence du
 * programme (2 fois 20 min en Z3), S15 un rappel très court en Z4 avant la
 * course. Une seule séance dure par semaine, jamais deux.
 *
 * Le dosage est volontairement orienté Z3 et Z4, à l'inverse d'un plan 10 km.
 * Sur un semi, l'allure de course se situe autour de la Z3 pour un coureur
 * moyen : c'est donc cette zone-là qu'il faut apprendre à tenir longtemps, et
 * la Z4 sert à repousser le plafond au-dessus. Il n'y a aucune séance de
 * fractionné court dans ce programme : la seule Z5 du plan vient des lignes
 * droites, en quantité de quelques minutes, ce qui suffit à entretenir la
 * foulée sans voler du temps au travail spécifique.
 *
 * Lignes droites, décision de l'encadrant. Accélérations de 15 à 20 s en Z5 en
 * fin d'endurance, introduites à la fin du bloc 1, donc en S3, puis
 * entretenues en S5, S6, S10, S11 et S14. Écartées des semaines allégées (S4,
 * S8, S13), de la semaine du pic de charge (S12, dont la sortie longue est
 * déjà spécifique), de S7 (semaine la plus lourde du bloc 2) et de la semaine
 * de course (S15). La variante avec Izon de la semaine 9 fait exception avec
 * quatre lignes droites la veille de la course, tenues en Z4 et non en Z5.
 *
 * Convention de calcul des séances à intervalles : pour N répétitions, N-1
 * récupérations. Échauffement plus répétitions plus récupérations plus retour
 * au calme égale exactement la durée déclarée. Même règle pour les lignes
 * droites, logées à l'intérieur de la durée de l'endurance : 4 lignes de 15 s
 * avec 1 min de marche entre chaque font 4 min, 6 lignes de 20 s avec 1 min de
 * marche entre chaque font 7 min.
 *
 * Sortie longue : elle monte par paliers jusqu'à 1 h 50 en S12, ce qui
 * représente à peu près la durée de course visée par la majorité du groupe.
 * On ne va pas au-delà : le semi se prépare en temps passé, pas en kilomètres
 * affichés.
 *
 * Toute séance dont la description cite une zone plus dure que celle de sa
 * fabrique la déclare via { zonesSecondaires: [...] } : les sept endurances à
 * lignes droites, et la sortie longue spécifique de S12 qui déclare Z3.
 */

const s9SansIzon = semaine(
  9,
  'allegee',
  'Semaine de rythme',
  "Pas de dossard, mais une vraie séance de qualité et un volume qui redescend nettement. Ce creux au milieu des quinze semaines est planifié : il n'y en aura pas d'autre avant l'affûtage.",
  [
    ef(
      30,
      "30 min en Z2, sans chercher à compenser le volume manquant ailleurs dans la semaine. Le compteur baisse, c'est le plan.",
      "Accepter une semaine légère à mi-parcours, c'est ce qui permet d'attaquer le bloc spécifique sans traîner huit semaines de fatigue.",
    ),
    tempo(
      44,
      "12 min d'échauffement en Z2, puis 2 fois 10 min en Z3 avec 4 min de trottinement en Z1 entre les deux, puis 8 min de retour au calme en Z2. Les deux blocs se courent au même rythme, et ce rythme doit rester tenable.",
      "Prendre la place de la course-test avec le format qui préfigure le mieux l'allure du semi, sans le coût nerveux d'un dossard.",
    ),
    sl(
      52,
      "52 min en Z2, soit une bonne demi-heure de moins que d'habitude. Pars sans itinéraire précis, cette sortie n'a rien à prouver.",
      "Raccourcir franchement la sortie longue une fois dans la préparation, pour que le bloc spécifique parte sur des jambes neuves.",
    ),
    renfo(
      20,
      "2 séries de : 50 s de planche ventrale, 30 s de gainage latéral par côté, 15 squats, 12 fentes par jambe. 1 min de pause entre les séries.",
      "Maintenir la tenue du bassin pendant une semaine creuse, sans installer de courbatures qui gêneraient la reprise.",
    ),
  ],
);

const s9AvecIzon = semaine(
  9,
  'allegee',
  "Course test à Izon",
  "Tu as un dossard dimanche 27 septembre sur le 10 km d'Izon. Un 10 km couru vite au milieu d'une préparation de semi est un excellent test : assez court pour ne rien casser, assez dur pour dire la vérité sur ta forme.",
  [
    ef(
      40,
      "40 min en Z2 en début de semaine, lundi ou mardi. C'est la seule sortie un peu consistante des sept jours, elle reste facile de bout en bout.",
      "Garder un minimum de volume dans une semaine par ailleurs très allégée, sans rien prélever sur la fraîcheur de dimanche.",
    ),
    ef(
      30,
      "23 min en Z2 la veille de la course, puis 4 lignes droites de 15 s en Z4 avec 1 min de marche entre chaque, soit 4 min, puis 3 min en Z2 pour rentrer. On monte en Z4 et pas plus haut : ces lignes droites réveillent la foulée, elles ne la fatiguent pas.",
      "Déverrouiller les jambes la veille, une sortie très courte donne toujours de meilleures sensations au départ qu'un repos complet.",
      { zonesSecondaires: ['Z4'] },
    ),
    course(
      "10 km d'Izon",
      10,
      55,
      "Ta course-test. Échauffe-toi 15 min en Z2 puis quelques lignes droites. Pars en Z3 sur les 2 premiers kilomètres, puis installe-toi en Z4 jusqu'au 8e, et lâche tout sur les 2 derniers. Attention : cette allure est plus rapide que celle de ton semi, ne cherche pas à la retrouver en novembre.",
      "Mesurer le niveau réel à mi-préparation sur une distance courte, ce qui coûte bien moins cher en récupération qu'un test long.",
    ),
    renfo(
      15,
      "Une seule séance en début de semaine : 2 séries de 45 s de planche ventrale, 20 s de gainage latéral par côté, puis 5 min de mobilité des hanches. Rien après le mercredi.",
      "Entretenir le gainage sans laisser la moindre raideur dans les jambes le jour du dossard.",
    ),
  ],
);

export const P3 = {
  code: 'P3',
  nom: 'Semi-marathon de Bordeaux',
  dateCourse: '2026-11-08',
  izon: 'option',
  prerequis: 'Courir déjà environ 20 km par semaine depuis 2 mois.',
  semainesContenu: [
    semaine(
      1,
      'bloc1',
      'Structurer ce que tu fais déjà',
      "Tu cours déjà régulièrement. Cette semaine ne cherche pas à augmenter ton volume mais à lui donner une forme : deux sorties d'entretien et une sortie longue clairement identifiée.",
      [
        ef(
          35,
          "35 min en Z2. Si tu as l'habitude de courir toutes tes sorties au même rythme, c'est ici que ça change : celle-ci doit être franchement plus lente que ce que tu fais spontanément.",
          "Séparer nettement le facile du soutenu, distinction que la plupart des coureurs autodidactes n'ont jamais faite et qui conditionne tout le reste.",
        ),
        ef(
          35,
          "35 min en Z2 sur terrain souple si tu en as un à proximité. Change de parcours par rapport à l'autre sortie facile.",
          "Répartir la contrainte mécanique sur des surfaces différentes, à un volume hebdomadaire qui va beaucoup augmenter dans les semaines qui viennent.",
        ),
        sl(
          60,
          "1 h en Z2 d'une seule traite. Pars volontairement lentement sur le premier quart d'heure, tu finiras bien plus facilement.",
          "Poser la référence de la sortie longue, celle qui va progresser de dix minutes en dix minutes jusqu'à 1 h 50.",
        ),
        renfo(
          20,
          "3 séries de : 40 s de planche ventrale, 30 s de planche sur chaque côté, 12 fentes avant par jambe. 1 min de récupération entre les séries.",
          "Installer le socle de gainage qui tiendra la posture sur les deux dernières heures de course, là où la foulée se déforme.",
        ),
      ],
    ),

    semaine(
      2,
      'bloc1',
      'Première touche de Z3',
      "On ouvre le travail de qualité par la Z3, qui sera l'allure de référence de ton semi. Les blocs sont courts pour l'instant : l'enjeu est d'identifier la sensation, pas de la tenir longtemps.",
      [
        ef(
          36,
          "36 min en Z2. Ta respiration doit rester régulière et ample du départ à l'arrivée, sans jamais s'emballer dans une côte.",
          "Fournir le volume facile qui entoure la séance de qualité, c'est pendant ces sorties que l'organisme assimile.",
        ),
        tempo(
          40,
          "14 min d'échauffement en Z2, puis 3 fois 5 min en Z3 avec 3 min de trottinement en Z1 entre chaque, puis 5 min de retour au calme en Z2. En Z3 tu parles par phrases courtes et on entend ton souffle, c'est tout.",
          "Repérer précisément la sensation de la Z3, qui sera l'allure visée le jour du semi et donc la plus utile à connaître par cœur.",
        ),
        sl(
          65,
          "1 h 05 en Z2. Cinq minutes de plus que la semaine dernière, pas davantage.",
          "Allonger la sortie longue par paliers courts, seul moyen de laisser les tendons suivre le rythme des muscles.",
        ),
        renfo(
          20,
          "Reprends la séance de la semaine 1 en ajoutant 2 séries de 18 squats au poids du corps, descente lente sur trois secondes et remontée franche.",
          "Répéter un contenu déjà connu pour que le mouvement devienne automatique, ce qui compte plus que la variété à ce stade.",
        ),
      ],
    ),

    semaine(
      3,
      'bloc1',
      'Fin du premier bloc',
      "Semaine la plus chargée des quatre premières. Les blocs en Z3 s'allongent d'une minute et les lignes droites font leur apparition, quelques secondes de vitesse en fin de footing facile.",
      [
        ef(
          38,
          "27 min en Z2, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche complète entre chaque, soit 4 min, puis 7 min de retour au calme en Z2. Une ligne droite monte progressivement en vitesse sur les premiers appuis et se relâche avant la fin : tu ne finis jamais en dette de souffle.",
          "Entretenir la capacité de la foulée à s'ouvrir, sur des efforts trop brefs pour créer de la fatigue. Ce n'est pas une séance de vitesse, c'est un footing qui se termine bien.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          44,
          "14 min en Z2, puis 3 fois 6 min en Z3 avec 3 min en Z1 entre chaque, puis 6 min en Z2. Les trois blocs doivent se ressembler : si le troisième est laborieux, tu as lancé le premier trop vite.",
          "Apprendre à répartir un effort identique sur plusieurs blocs, ce qui est exactement le problème posé par les 21 km.",
        ),
        sl(
          70,
          "1 h 10 en Z2. À partir de cette durée, emporte de l'eau systématiquement, même par temps frais.",
          "Franchir la première heure et quart et installer les réflexes d'hydratation, qui ne s'improvisent pas le jour de la course.",
        ),
        renfo(
          20,
          "2 séries de : 45 s de planche ventrale, 20 fentes marchées, 18 squats, 40 s de pont fessier allongé sur le dos bassin décollé. 90 s de pause entre les séries.",
          "Réveiller les fessiers, moteur principal de la propulsion et premier muscle à décrocher sur un effort long.",
        ),
      ],
    ),

    semaine(
      4,
      'allegee',
      'Première respiration',
      "Environ 18 % de volume en moins, aucune intensité. La semaine va te sembler vide : c'est pendant celle-ci que le travail des trois précédentes devient de la forme.",
      [
        ef(
          32,
          "32 min en Z2, sans montre si tu en es capable. Tu cours à la sensation, uniquement.",
          "Casser le réflexe de mesurer, une semaine de repos relatif se juge à la fraîcheur du lundi suivant et à rien d'autre.",
        ),
        ef(
          34,
          "34 min en Z2, idéalement à plusieurs. La séance doit rester conversationnelle du premier au dernier pas, sans exception.",
          "Utiliser une semaine sans exigence pour courir en groupe, ce qui est aussi la raison d'être du club.",
        ),
        sl(
          58,
          "58 min en Z2, plus courte que les trois dernières. Termine en te sentant capable d'en refaire autant.",
          "Garder le rendez-vous hebdomadaire de la sortie longue tout en coupant réellement dans la charge.",
        ),
        renfo(
          18,
          "2 séries de : 35 s de planche, 12 squats, 10 fentes par jambe, puis 7 min d'étirements lents des mollets, des ischios et des fessiers.",
          "Rester actif sans créer la moindre courbature pendant la semaine censée effacer la fatigue.",
        ),
      ],
    ),

    semaine(
      5,
      'bloc2',
      'Ouverture du seuil',
      "Deuxième bloc. On monte en Z4, un cran au-dessus de l'allure du semi. Ce n'est pas l'allure de ta course : c'est ce qui va rendre l'allure de ta course confortable.",
      [
        ef(
          38,
          "26 min en Z2, le surlendemain du seuil et jamais la veille. Puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, et 5 min de retour au calme en Z2.",
          "Faire du volume utile un jour où le corps digère encore la séance dure, et garder la foulée vive pendant que le bloc 2 travaille l'intensité.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          47,
          "15 min d'échauffement en Z2, puis 2 fois 8 min en Z4 avec 4 min de trottinement en Z1 entre les deux, puis 12 min de retour au calme en Z2. En Z4 tu ne places plus que trois ou quatre mots à la fois, nettement au-dessus des blocs en Z3 des semaines 2 et 3.",
          "Repousser le plafond au-dessus de l'allure du semi, ce qui fait mécaniquement descendre le coût de cette allure.",
        ),
        sl(
          75,
          "1 h 15 en Z2 sur parcours légèrement vallonné. Passe les côtes en gardant le souffle sous contrôle, quitte à ralentir beaucoup.",
          "Habituer le corps à produire de l'effort sur terrain irrégulier, ce qui rend ensuite le plat nettement plus économique.",
        ),
        renfo(
          25,
          "3 séries de : 50 s de planche ventrale, 30 s de planche sur chaque côté, 18 squats, 14 fentes par jambe. 1 min de pause entre les séries.",
          "Monter d'un cran maintenant que le corps encaisse bien la charge, la structure musculaire doit suivre la progression du volume.",
        ),
      ],
    ),

    semaine(
      6,
      'bloc2',
      'Des blocs qui durent',
      "Retour en Z3, mais avec des blocs deux fois plus longs qu'en semaine 3. C'est le vrai travail du semi : tenir une allure soutenue pendant des durées inconfortablement longues.",
      [
        ef(
          40,
          "28 min en Z2 sur un parcours connu, pour n'avoir à penser ni à l'itinéraire ni au dénivelé. Puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, et 5 min en Z2 pour finir.",
          "Ajouter du volume facile dans une semaine qui monte en charge, et entretenir la vitesse de foulée sans coûter la moindre fraîcheur.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          52,
          "15 min en Z2, puis 2 fois 12 min en Z3 avec 4 min en Z1 entre les deux, puis 9 min en Z2. Douze minutes, c'est long : la difficulté n'est plus l'intensité mais la patience.",
          "Passer de la découverte de la Z3 à sa tenue prolongée, seule façon de préparer une course qui durera près de deux heures dans cette zone.",
        ),
        sl(
          80,
          "1 h 20 en Z2. Bois quelques gorgées toutes les 20 min environ, même sans soif, et teste dès maintenant ce que tu comptes emporter en novembre.",
          "Dépasser les 80 minutes et transformer le ravitaillement en automatisme plutôt qu'en improvisation le jour J.",
        ),
        renfo(
          25,
          "Séance en côte : trouve une pente régulière et monte-la 10 fois en trottinant ou en marchant vite, redescente en marchant, sans chronomètre. Termine par 3 fois 50 s de planche.",
          "Muscler les jambes dans le geste de course, plus transférable à la foulée qu'un exercice réalisé au sol.",
        ),
      ],
    ),

    semaine(
      7,
      'bloc2',
      'Sommet du deuxième bloc',
      "Semaine la plus lourde depuis le début, avec trois répétitions en Z4 et une sortie longue d'une heure et demie. Aucune ligne droite cette semaine, la charge est déjà suffisante.",
      [
        ef(
          42,
          "42 min en Z2. Si tu te sens émoussé au départ, descends la sortie entière en Z1, c'est sans conséquence sur la préparation.",
          "Absorber la charge de la semaine la plus dure du bloc 2 sans y ajouter le moindre effort superflu.",
        ),
        seuil(
          53,
          "15 min en Z2, puis 3 fois 8 min en Z4 avec 4 min en Z1 entre chaque bloc, puis 6 min en Z2. Le troisième bloc doit être aussi rapide que le premier : c'est le seul critère de réussite de cette séance.",
          "Porter le volume passé au-dessus de l'allure de course à son point haut du bloc 2, avant de tout réorienter vers le spécifique.",
        ),
        sl(
          90,
          "1 h 30 en Z2, la plus longue jusqu'ici. Prévois-la un jour où tu n'as rien derrière, et mange un vrai repas deux à trois heures avant.",
          "Franchir la barre de l'heure et demie, seuil à partir duquel le corps apprend vraiment à économiser son carburant.",
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 20 fentes marchées, 22 squats, 45 s de pont fessier. Étirements des mollets et des ischios pour finir.",
          "Verrouiller le gainage avant la semaine allégée, pendant laquelle le renforcement va nettement baisser.",
        ),
      ],
    ),

    semaine(
      8,
      'allegee',
      'Deuxième respiration',
      "Le volume baisse d'un cinquième et l'intensité disparaît. Sept semaines de faites, sept à venir : c'est le bon moment pour faire le point sur les sensations et sur l'état des chaussures.",
      [
        ef(
          35,
          "35 min en Z2 très souples. Aucune ligne droite, aucune côte, aucun objectif sinon de rentrer en te sentant bien.",
          "Laisser le système nerveux récupérer, c'est lui qui sature en premier sur les semaines à intensité répétée.",
        ),
        ef(
          37,
          "37 min en Z2 sur terrain souple. Profites-en pour vérifier l'usure de tes semelles : si elles ont plus de 700 km, il est temps d'en roder une nouvelle paire.",
          "Utiliser une semaine calme pour régler la logistique, changer de chaussures trois semaines avant la course est une très mauvaise idée.",
        ),
        sl(
          80,
          "1 h 20 en Z2, dix minutes de moins qu'au sommet du bloc. Elle reste facile intégralement : si tu accélères sur la fin, tu as manqué l'objectif.",
          "Conserver l'acquis d'endurance pendant une semaine sans intensité, le fond ne se garde qu'en le pratiquant.",
        ),
        renfo(
          18,
          "2 séries de : 45 s de planche, 15 squats, 12 fentes par jambe, 30 s de pont fessier. Pas de côtes cette semaine.",
          "Maintenir le tonus à charge réduite, en cohérence avec le reste de la semaine.",
        ),
      ],
    ),

    {
      numero: 9,
      phase: 'allegee',
      titre: 'Course test ou semaine de rythme',
      intention:
        "Un repère à mi-parcours, avec ou sans dossard. Les coureurs inscrits au 10 km d'Izon du 27 septembre suivent la variante avec course, les autres la variante sans. Dans les deux cas la semaine est nettement plus légère que celles qui l'encadrent.",
      variantes: {
        avecIzon: s9AvecIzon,
        sansIzon: s9SansIzon,
      },
      seances: s9SansIzon.seances,
    },

    semaine(
      10,
      'bloc3',
      'Bloc spécifique, reprise en charge',
      "Le bloc 3 est celui qui ressemble au semi. Le volume remonte d'un coup après la respiration de mi-parcours, et tout ce qui n'est pas utile aux 21 km sort du programme.",
      [
        ef(
          40,
          "29 min en Z2, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 4 min en Z2. Les lignes droites reviennent après deux semaines d'absence.",
          "Relancer le volume facile après la semaine creuse, et remettre de la vivacité dans une foulée qui vient de tourner au ralenti.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          50,
          "12 min en Z2, puis 4 fois 6 min en Z4 avec 3 min en Z1 entre chaque, puis 5 min en Z2. Quatre répétitions plus courtes plutôt que trois longues : la reprise se fait par le nombre, pas par la durée.",
          "Reprendre l'intensité après une semaine allégée par un format volontairement fractionné, plus facile à réussir qu'un bloc long sur des jambes qui redémarrent.",
        ),
        sl(
          82,
          "1 h 22 en Z2, entièrement facile. Aucun bloc rapide, aucune accélération finale : dans ce bloc, la sortie longue sert de contrepoids aux séances dures.",
          "Remonter la sortie longue là où le bloc 2 l'avait laissée, sans y ajouter d'intensité tant que la séance de seuil occupe déjà ce rôle.",
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 30 s de gainage latéral par côté, 20 squats, 15 montées sur une marche par jambe. 1 min de pause.",
          "Renforcer la chaîne d'appui unilatérale, celle qui travaille réellement en course, à un moment où le corps est prêt à l'encaisser.",
        ),
      ],
    ),

    semaine(
      11,
      'bloc3',
      "Deux fois quinze minutes",
      "La séance de qualité passe à deux blocs de quinze minutes en Z3. Ce format est le vrai laboratoire de ta course : c'est là que tu découvres à quoi ressemble ton allure de semi quand elle dure.",
      [
        ef(
          42,
          "31 min en Z2, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 4 min en Z2. À placer à distance de la séance de qualité, jamais la veille.",
          "Entretenir la vitesse de foulée dans une semaine dense, sans jamais entamer la fraîcheur nécessaire aux deux blocs longs.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          54,
          "14 min en Z2, puis 2 fois 15 min en Z3 avec 5 min de trottinement en Z1 entre les deux, puis 5 min en Z2. Trente minutes en Z3 sur la séance : c'est le quart de ta course, à l'allure de ta course.",
          "Vérifier concrètement que l'allure visée est tenable sur des durées longues, ce qu'aucun calcul théorique ne peut remplacer.",
        ),
        sl(
          90,
          "1 h 30 en Z2 sur terrain varié. Mange deux à trois heures avant si la sortie est matinale, et emporte de quoi boire.",
          "Retrouver l'heure et demie dans un contexte où la semaine porte déjà trente minutes de Z3, ce qui la rend plus exigeante qu'en semaine 7.",
        ),
        renfo(
          25,
          "2 séries de : 1 min de planche ventrale, 45 s de gainage latéral par côté, 22 squats, 40 s de chaise contre un mur, 20 fentes marchées.",
          "Travailler la tenue posturale en état de fatigue, car c'est elle qui lâche la première après la deuxième heure de course.",
        ),
      ],
    ),

    semaine(
      12,
      'bloc3',
      'Le pic de charge',
      "Semaine la plus lourde des quinze, construite autour d'une seule séance : la sortie longue de 1 h 50 avec deux blocs à l'allure de course. Elle vaut à elle seule tout le travail de qualité de la semaine, les deux autres sorties sont donc entièrement faciles.",
      [
        ef(
          38,
          "38 min en Z2, sans la moindre accélération et sans lignes droites. C'est une sortie de transport, rien de plus.",
          "Fournir du volume neutre dans une semaine dont la charge repose intégralement sur la sortie longue.",
        ),
        ef(
          52,
          "52 min en Z2, à placer au moins deux jours avant la sortie longue. Si les jambes sont lourdes, descends-la en Z1 sans hésiter.",
          "Constituer le volume de la semaine de pic par de l'endurance facile plutôt que par de l'intensité, ce qui la rend absorbable.",
        ),
        sl(
          110,
          "1 h 50, la plus longue du programme. 80 min en Z2, puis 2 fois 10 min en Z3 avec 5 min en Z2 entre les deux, puis 5 min en Z2 pour rentrer. Les blocs en Z3 arrivent sur des jambes déjà fatiguées : c'est précisément la sensation du 15e kilomètre.",
          "Répéter en conditions réelles ce qui décide d'un semi, c'est-à-dire tenir l'allure de course alors que la fatigue est déjà installée.",
          { zonesSecondaires: ['Z3'] },
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 22 squats, 20 fentes marchées, 45 s de pont fessier sur une jambe en alternant. Étirements complets pour finir, sans forcer.",
          "Boucler le renforcement à son point haut avant de le réduire pour les trois dernières semaines.",
        ),
      ],
    ),

    semaine(
      13,
      'allegee',
      'On coupe avant la fin',
      "Le volume tombe de 17 % et l'intensité disparaît sept jours durant. C'est la dernière vraie coupure avant l'affûtage, celle qui convertit le bloc 3 en fraîcheur.",
      [
        ef(
          38,
          "38 min en Z2, tranquilles. Si une douleur traîne depuis le pic de charge, c'est cette semaine qu'il faut la traiter, pas la suivante.",
          "Ouvrir une fenêtre pour régler les petits pépins pendant qu'il reste du temps pour les régler.",
        ),
        ef(
          42,
          "42 min en Z2 sur parcours plat. Aucune côte, aucune accélération, aucune ligne droite.",
          "Réduire la sollicitation nerveuse après une semaine qui a compté 1 h 50 de sortie longue et vingt minutes de Z3.",
        ),
        sl(
          85,
          "1 h 25 en Z2, vingt-cinq minutes de moins qu'au pic, et entièrement facile. Termine avec la sensation nette d'avoir de la marge.",
          "Entretenir le fond sans en rajouter, la forme se construit désormais par soustraction.",
        ),
        renfo(
          18,
          "2 séries de : 45 s de planche, 15 squats, 12 fentes par jambe. Puis 8 min de mobilité des hanches et des chevilles.",
          "Passer du renforcement à l'entretien, l'objectif n'est plus de gagner de la force mais de la conserver.",
        ),
      ],
    ),

    semaine(
      14,
      'affutage',
      'La séance de référence',
      "Début de l'affûtage. Le volume baisse encore d'un cinquième, mais la séance de qualité atteint son format le plus abouti : 2 fois 20 min en Z3. C'est la répétition générale de ton allure de course.",
      [
        ef(
          32,
          "24 min en Z2, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 4 min en Z2. En début de semaine, jamais la veille de la séance de qualité.",
          "Rappeler la vitesse aux jambes en quantité volontairement réduite, quatre lignes droites suffisent en période d'affûtage.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          58,
          "8 min en Z2, puis 2 fois 20 min en Z3 avec 5 min de trottinement en Z1 entre les deux, puis 5 min en Z2. Quarante minutes à l'allure de course, soit un bon tiers du semi. Si les deux blocs se ressemblent, ton allure de dimanche est la bonne.",
          "Valider l'allure de course sur un volume représentatif, à un moment où il reste le temps de récupérer mais plus celui de progresser.",
        ),
        sl(
          50,
          "50 min en Z2 seulement. Après plusieurs semaines à une heure et demie, tu vas trouver ça ridiculement court : c'est exactement l'effet recherché.",
          "Couper franchement dans la sortie longue pour laisser la fraîcheur remonter, l'endurance acquise ne se perd pas en deux semaines.",
        ),
        renfo(
          15,
          "2 séries de : 40 s de planche ventrale, 25 s de gainage latéral par côté, 12 squats lents. Puis 5 min d'étirements doux.",
          "Entretenir la posture sans provoquer la moindre courbature à moins de deux semaines de la course.",
        ),
      ],
    ),

    semaine(
      15,
      'affutage',
      'Semaine de course',
      "Le volume d'entraînement est divisé par plus de deux. Dimanche 8 novembre, tu cours le semi-marathon de Bordeaux. Cette semaine n'a plus qu'une fonction : te déposer frais et confiant sur la ligne.",
      [
        ef(
          35,
          "35 min en Z2 en début de semaine, lundi ou mardi. Souple, sans rien chercher, sans lignes droites.",
          "Garder le geste de course et évacuer les dernières traces de l'affûtage sans créer la moindre fatigue.",
        ),
        seuil(
          26,
          "10 min en Z2, puis 5 fois 1 min en Z4 avec 1 min de trottinement en Z1 entre chaque, puis 7 min en Z2. Mercredi au plus tard, jamais après.",
          "Réveiller la mécanique avec de très courts efforts au-dessus de l'allure de course, ce qui rend la Z3 de dimanche plus facile à trouver.",
        ),
        course(
          'Semi-marathon de Bordeaux',
          21.1,
          115,
          "Ta course. Échauffe-toi 10 min en Z2 seulement, la distance fera le reste. Pars en Z2 haute sur les 3 premiers kilomètres, le départ groupé et la foule poussent toujours trop vite. Installe-toi ensuite en Z3 jusqu'au 17e. Sur les 4 derniers, tu montes en Z4 si les sensations le permettent, sinon tu tiens la Z3 jusqu'au bout, ce qui est déjà une belle course. Bois à chaque ravitaillement, même sans soif.",
          "Concrétiser quinze semaines de travail sur la distance qui fait basculer un coureur régulier dans une autre catégorie d'objectifs.",
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
      "Aucune intensité, aucun chrono, aucune comparaison. Un semi laisse des traces plus profondes qu'un 10 km : sept jours de vraie récupération ne sont pas un luxe, ce sont les fondations de ta prochaine préparation.",
      [
        recup(
          30,
          "30 min en Z1, trois à quatre jours après la course, pas avant. Si les jambes sont encore raides, remplace par 40 min de marche, le bénéfice est identique.",
          "Relancer la circulation pour évacuer les courbatures plus vite qu'en restant immobile.",
        ),
        recup(
          35,
          "35 min en Z1 en milieu de semaine. Tu vas avoir envie d'accélérer parce que les sensations reviennent : ne le fais pas, elles reviennent toujours trop tôt.",
          "Laisser le retour des sensations se faire de lui-même plutôt que de le provoquer.",
        ),
        recup(
          40,
          "40 min en Z1 sur terrain souple, en fin de semaine. Choisis le parcours pour le paysage et laisse la montre à la maison.",
          "Refermer le cycle sur une note agréable, ce qui compte autant que le reste pour avoir envie de recommencer.",
        ),
        renfo(
          15,
          "15 min d'étirements et de mobilité : hanches, mollets, ischios, quadriceps et bas du dos. Respire lentement et tiens chaque position sans jamais forcer.",
          "Rendre de la souplesse aux muscles raidis par quinze semaines de course et par deux heures d'effort continu.",
        ),
      ],
    ),
  ],
};
