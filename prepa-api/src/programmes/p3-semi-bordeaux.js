import { ef, sl, tempo, seuil, vma, recup, renfo, course, semaine } from './seances.js';

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
 * Trame en cycles de trois plus une, décision de l'encadrant. Trois semaines
 * qui montent, une semaine plus douce, et on repart :
 *
 *   S1 S2 S3 progressives, S4 plus douce
 *   S5 S6 S7 progressives, S8 plus douce
 *   S9 S10 S11 progressives, S12 plus douce
 *   S13 progressive, pic de charge
 *   S14 S15 affûtage, course le dernier jour de S15
 *   S16 récupération
 *
 * Ce découpage remplace la trame précédente, qui posait deux semaines légères
 * l'une derrière l'autre en S8 et S9 et ouvrait un creux en plein milieu des
 * quinze semaines, sortie longue retombée à 52 min comprise. Sur le parcours
 * par défaut, celui du coureur qui ne prend pas de dossard à Izon, deux
 * semaines allégées ne se suivent plus jamais.
 *
 * Le parcours avec Izon fait exception, et c'est la seule : S8 est allégée, et
 * la S9 en variante avecIzon l'est aussi, puisque le coureur court le 10 km
 * d'Izon le dimanche 27 septembre. Ces deux semaines-là s'enchaînent bel et
 * bien. La différence avec l'ancienne trame est qu'ici la charge n'est pas
 * retirée mais remplacée : S9 est une semaine de course-test, pas une semaine
 * passive, et sur une préparation de semi un 10 km couru à fond est un
 * excellent repère d'allure à mi-parcours.
 *
 * La liste blanche des phases ne connaît que trois étiquettes de bloc. Le
 * quatrième cycle, réduit à la seule S13, porte donc l'étiquette bloc3 lui
 * aussi : c'est le sommet du bloc spécifique, relancé après la respiration de
 * S12, et non un quatrième bloc autonome.
 *
 * La course a lieu le dimanche 8 novembre 2026, dernier jour de la semaine 15.
 * La semaine 9 tombe exactement sur le week-end du 10 km d'Izon, le 27
 * septembre : d'où la double variante.
 *
 * Barème de volumes, hors course objectif et hors renfo, en minutes :
 * S1 130, S2 141, S3 152, S4 124, S5 160, S6 172, S7 185, S8 152,
 * S9 165 sans Izon et 70 avec Izon, S10 176, S11 188, S12 158,
 * S13 200 (pic), S14 140, S15 61, S16 105.
 *
 * Phase de la semaine 9 : elle appartient à la variante, pas à la semaine. Ce
 * sont deux semaines qui n'ont ni la même charge ni le même but, rien ne
 * justifie de leur coller la même étiquette. Sans dossard, la semaine 9 ouvre
 * le troisième cycle progressif et vaut donc bloc3. Avec dossard, elle est
 * réellement délestée puisque la course se court le dimanche, et vaut donc
 * allegee, les deux jours qui précèdent le départ étant explicitement vidés.
 * L'entrée principale du programme reprend la phase de la variante sans
 * dossard, la seule dont elle expose les séances par défaut ; substituer une
 * variante, c'est reprendre sa phase en même temps que ses séances.
 *
 * Les deux variantes franchissent le garde-fou de charge par des chemins
 * distincts. Sans Izon, S9 est un bloc qui succède à une semaine plus douce :
 * sa référence est le pic des blocs atteint jusque-là (185 min en S7), et S10
 * se compare ensuite à S9. Avec Izon, S9 est allégée et se mesure à S8 ; S10,
 * bloc précédé d'une semaine hors bloc, repart lui aussi du pic des blocs. La
 * règle des 10 % ne compare donc jamais S10 au volume hors course d'une
 * semaine qui contient la course-test.
 *
 * Progression des intensités. S1 rien, S2 et S3 Z3 pour apprendre l'effort
 * soutenu, S4 rien, S5 Z4 pour ouvrir le seuil, S6 et S7 Z5 en fractionné
 * court, S8 rien, S9 Z4 sur blocs longs (ou la course-test), S10 et S11 Z3 sur
 * blocs de plus en plus longs, S12 rien, S13 la sortie longue spécifique avec
 * ses blocs en Z3, S14 la séance de référence du programme (2 fois 20 min en
 * Z3), S15 un rappel très court en Z4 avant la course. Une seule séance dure
 * par semaine, jamais deux.
 *
 * Fractionné court, décision de l'encadrant. Le programme comptait auparavant
 * zéro séance de VMA : un coureur qui enchaînait P1 puis P3 passait cinq mois
 * sans jamais courir vite. Deux séances de Z5 sont donc posées dans le
 * deuxième cycle, en S6 et S7, une fois la base d'endurance installée et le
 * seuil ouvert. Elles forment une courte parenthèse de vitesse générale au
 * milieu de la préparation, après quoi le troisième cycle redevient
 * entièrement spécifique. Le dosage reste franchement orienté Z3 et Z4, qui
 * représentent huit des dix séances de qualité : sur un semi, l'allure de
 * course se situe autour de la Z3 pour un coureur moyen, c'est donc cette
 * zone-là qu'il faut apprendre à tenir longtemps, et la Z4 sert à repousser le
 * plafond au-dessus.
 *
 * Lignes droites, décision de l'encadrant. Accélérations de 15 à 20 s en Z5 en
 * fin d'endurance, introduites à la fin du bloc 1, donc en S3, puis
 * entretenues en S5, S9, S10, S11 et S14. Écartées des semaines plus douces
 * (S4, S8, S12), des semaines qui portent déjà une séance rapide (S6 et S7),
 * de la semaine du pic de charge (S13, dont la sortie longue est déjà
 * spécifique) et de la semaine de course (S15). La variante avec Izon de la
 * semaine 9 fait exception avec quatre lignes droites la veille de la course,
 * tenues en Z4 et non en Z5.
 *
 * Convention de calcul des séances à intervalles : pour N répétitions, N-1
 * récupérations. Échauffement plus répétitions plus récupérations plus retour
 * au calme égale exactement la durée déclarée. Même règle pour les lignes
 * droites, logées à l'intérieur de la durée de l'endurance : 4 lignes de 15 s
 * avec 1 min de marche entre chaque font 4 min, 6 lignes de 20 s avec 1 min de
 * marche entre chaque font 7 min.
 *
 * Sortie longue : elle monte par paliers jusqu'à 1 h 50 en S13, ce qui
 * représente à peu près la durée de course visée par la majorité du groupe.
 * On ne va pas au-delà : le semi se prépare en temps passé, pas en kilomètres
 * affichés. À l'intérieur d'un cycle elle ne recule jamais.
 *
 * Toute séance dont la description cite une zone plus dure que celle de sa
 * fabrique la déclare via { zonesSecondaires: [...] } : les six endurances à
 * lignes droites, l'endurance de veille de course-test qui monte en Z4, et la
 * sortie longue spécifique de S13 qui déclare Z3.
 */

const s9SansIzon = semaine(
  9,
  'bloc3',
  'Ouverture du bloc spécifique',
  "Pas de dossard cette semaine, le troisième cycle démarre donc sans attendre. Trois semaines qui montent devant toi, celle-ci en est la première marche, et le travail de qualité revient au seuil sur des blocs plus longs que tout ce que tu as fait jusqu'ici.",
  [
    ef(
      32,
      "21 min en Z2 sur un parcours sans difficulté, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 7 min en Z2. Les lignes droites reprennent après trois semaines d'absence, quatre suffisent pour cette reprise.",
      "Rendre de la fréquence d'appui à une foulée qui sort d'une semaine calme, au moment précis où le bloc spécifique se remet à demander de l'intensité.",
      { zonesSecondaires: ['Z5'] },
    ),
    seuil(
      48,
      "13 min d'échauffement en Z2, puis 2 fois 10 min en Z4 avec 4 min de trottinement en Z1 entre les deux, puis 11 min de retour au calme en Z2. Dix minutes d'affilée au seuil, c'est le format le plus long du programme dans cette zone.",
      "Repousser le plafond une dernière fois avant que tout le travail de qualité ne bascule sur l'allure du semi elle-même.",
    ),
    sl(
      85,
      "1 h 25 en Z2, intégralement facile. Elle sert d'assise à la séance de seuil, pas de rallonge : si tu accélères sur la fin, tu prends sur la semaine suivante.",
      "Relancer la sortie longue dès l'ouverture du cycle, pour qu'elle atteigne 1 h 50 par paliers réguliers quatre semaines plus tard.",
    ),
    renfo(
      25,
      "3 séries de : 20 montées sur une marche par jambe, 45 s de planche ventrale avec un pied décollé du sol en alternant, 10 fentes bulgares par jambe pied arrière posé sur une chaise. 90 s de pause entre les séries.",
      "Charger la jambe d'appui isolément, puisque c'est elle qui encaisse seule chaque foulée pendant les deux heures de course.",
    ),
  ],
);

const s9AvecIzon = semaine(
  9,
  'allegee',
  "Course test à Izon",
  "Tu as un dossard dimanche 27 septembre sur le 10 km d'Izon. La semaine est franchement délestée, et c'est cohérent : le vrai effort, tu le fournis dimanche. Une sortie consistante en début de semaine, plus rien le vendredi, et une sortie minuscule la veille du départ.",
  [
    ef(
      40,
      "40 min en Z2 en début de semaine, lundi ou mardi. C'est la seule sortie un peu consistante des sept jours, elle reste facile de bout en bout.",
      "Garder un minimum de volume dans une semaine par ailleurs très allégée, sans rien prélever sur la fraîcheur de dimanche.",
    ),
    ef(
      30,
      "Le vendredi ne comporte aucune séance, pas même un footing de déblocage. Samedi, la veille du départ, 23 min en Z2, puis 4 lignes droites de 15 s en Z4 avec 1 min de marche entre chaque, soit 4 min, puis 3 min en Z2 pour rentrer. On monte en Z4 et pas plus haut : ces lignes droites réveillent la foulée, elles ne la fatiguent pas.",
      "Vider les deux jours qui précèdent le dossard, un jour de repos complet puis une sortie très courte donnent de bien meilleures sensations au départ qu'un entraînement de dernière minute.",
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
          "Garder des appuis toniques alors que la sortie longue commence déjà à peser sur les hanches, sans rien ajouter à une semaine dont le rôle est de retirer de la fatigue.",
        ),
      ],
    ),

    semaine(
      5,
      'bloc2',
      'Ouverture du seuil',
      "Deuxième cycle. On monte en Z4, un cran au-dessus de l'allure du semi. Ce n'est pas l'allure de ta course : c'est ce qui va rendre l'allure de ta course confortable.",
      [
        ef(
          38,
          "26 min en Z2, le surlendemain du seuil et jamais la veille. Puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, et 5 min de retour au calme en Z2.",
          "Faire du volume utile un jour où le corps digère encore la séance dure, et garder la foulée vive pendant que le cycle travaille l'intensité.",
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
      'Une parenthèse de vitesse',
      "La base est posée et le seuil est ouvert : on s'autorise deux semaines de fractionné court, les seules du programme. Un semi ne se gagne pas en Z5, mais un coureur qui n'y va jamais perd sa foulée sans s'en apercevoir.",
      [
        ef(
          44,
          "44 min en Z2 d'une seule traite, sur un parcours que tu connais par cœur pour n'avoir à penser ni à l'itinéraire ni au dénivelé. Aucune ligne droite cette semaine, la séance de fractionné couvre déjà le besoin de vitesse.",
          "Fournir le volume facile qui entoure la première séance rapide, c'est pendant ces sorties que le corps range le travail de la veille.",
        ),
        vma(
          48,
          "15 min d'échauffement en Z2, puis 8 fois 1 min en Z5 avec 2 min de trottinement en Z1 entre chaque, puis 11 min de retour au calme en Z2. Récupération volontairement longue pour une première : cherche des appuis rapides et légers plutôt que de grandes foulées.",
          "Réveiller le haut de la palette après cinq semaines passées entre Z2 et Z4, ce qui rend ensuite l'allure du semi mécaniquement moins coûteuse.",
        ),
        sl(
          80,
          "1 h 20 en Z2. Bois quelques gorgées régulièrement, même sans soif, et teste dès maintenant ce que tu comptes emporter en novembre.",
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
      'Sommet du deuxième cycle',
      "Semaine la plus lourde depuis le début : des répétitions rapides deux fois plus longues que la semaine passée et une sortie longue d'une heure et demie. C'est le point haut du travail général, ensuite tout se recentre sur l'allure du semi.",
      [
        ef(
          42,
          "42 min en Z2. Si tu te sens émoussé au départ, descends la sortie entière en Z1, c'est sans conséquence sur la préparation.",
          "Absorber la charge de la semaine la plus dure du deuxième cycle sans y ajouter le moindre effort superflu.",
        ),
        vma(
          53,
          "15 min en Z2, puis 6 fois 2 min en Z5 avec 3 min de trottinement en Z1 entre chaque, puis 11 min en Z2. Les répétitions doublent de durée par rapport à la semaine passée : la dernière doit ressembler à la première, sinon tu es parti trop fort.",
          "Allonger l'effort rapide pour travailler la tolérance à l'essoufflement, dernière brique générale avant de tout réorienter vers le spécifique.",
        ),
        sl(
          90,
          "1 h 30 en Z2, la plus longue jusqu'ici. Prévois-la un jour où tu n'as rien derrière, et mange un vrai repas deux à trois heures avant.",
          "Franchir la barre de l'heure et demie, seuil à partir duquel le corps apprend vraiment à économiser son carburant.",
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 20 fentes marchées, 22 squats, 45 s de pont fessier. Étirements des mollets et des ischios pour finir.",
          "Verrouiller le gainage avant la semaine plus douce, pendant laquelle le renforcement va nettement baisser.",
        ),
      ],
    ),

    semaine(
      8,
      'allegee',
      'Deuxième respiration',
      "Le volume recule de près d'un cinquième et l'intensité disparaît. Sept semaines de faites, sept à venir : c'est le bon moment pour faire le point sur les sensations et sur l'état des chaussures.",
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
          "1 h 20 en Z2, dix minutes de moins qu'au sommet du cycle. Elle reste facile intégralement : si tu accélères sur la fin, tu as manqué l'objectif.",
          "Tenir le pilier du programme : sur semi, l'habitude de courir longtemps se perd bien plus vite qu'elle ne se construit, et une semaine plus douce n'est pas une raison de l'interrompre.",
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
      // La phase suit la variante : bloc3 sans dossard, allegee avec. L'entrée
      // principale porte celle de la variante sans dossard, la seule dont elle
      // expose les séances par défaut. Substituer une variante, c'est donc
      // reprendre à la fois ses séances et sa phase.
      phase: s9SansIzon.phase,
      titre: 'Course test ou ouverture du bloc spécifique',
      intention:
        "Deux semaines qui n'ont plus grand-chose en commun selon la case que tu coches. Les coureurs inscrits au 10 km d'Izon du 27 septembre suivent la variante avec course : elle est franchement délestée, puisqu'ils courent dimanche. Les autres entrent directement dans le troisième cycle progressif, sans creux inutile.",
      variantes: {
        avecIzon: s9AvecIzon,
        sansIzon: s9SansIzon,
      },
      seances: s9SansIzon.seances,
    },

    semaine(
      10,
      'bloc3',
      'Deux fois douze minutes',
      "Deuxième marche du cycle spécifique. Le travail de qualité quitte le seuil pour l'allure de course elle-même, sur des blocs assez longs pour que la question ne soit plus le souffle mais la patience.",
      [
        ef(
          34,
          "23 min en Z2, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 4 min en Z2. À placer à distance de la séance de qualité, jamais la veille.",
          "Ajouter du volume facile dans une semaine dense et garder la foulée vive, sans jamais entamer la fraîcheur nécessaire aux blocs en Z3.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          50,
          "14 min en Z2, puis 2 fois 12 min en Z3 avec 4 min de trottinement en Z1 entre les deux, puis 8 min en Z2. Douze minutes d'affilée : la difficulté n'est plus l'intensité, c'est de ne pas dériver vers le haut sans t'en apercevoir.",
          "Installer l'allure de course sur des durées qui commencent à ressembler à la réalité du semi, où elle devra tenir près de deux heures.",
        ),
        sl(
          92,
          "1 h 32 en Z2, sans le moindre bloc rapide et sans accélération finale. Dans ce cycle, la sortie longue sert d'assise au travail de qualité, elle ne le double pas.",
          "Reprendre la sortie longue là où le deuxième cycle l'avait laissée, en la gardant entièrement facile pour préserver la qualité des blocs en Z3.",
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
      "Trente minutes à l'allure de course",
      "Troisième et dernière marche du cycle, la plus chargée des trois. Les blocs passent à quinze minutes et la sortie longue franchit l'heure quarante : c'est la semaine où l'allure du semi cesse d'être une hypothèse.",
      [
        ef(
          34,
          "27 min en Z2 sur terrain souple, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 3 min en Z2. Quatre lignes droites seulement, la semaine est déjà lourde.",
          "Entretenir la vivacité en quantité réduite dans la semaine la plus chargée du cycle, sans rien prélever sur les deux blocs longs.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          54,
          "14 min en Z2, puis 2 fois 15 min en Z3 avec 5 min de trottinement en Z1 entre les deux, puis 5 min en Z2. Trente minutes en Z3 sur la séance : c'est le quart de ta course, à l'allure de ta course.",
          "Vérifier concrètement que l'allure visée est tenable sur des durées longues, ce qu'aucun calcul théorique ne peut remplacer.",
        ),
        sl(
          100,
          "1 h 40 en Z2 sur terrain varié. Mange deux à trois heures avant si la sortie est matinale, et emporte de quoi boire.",
          "Franchir l'heure quarante dans une semaine qui porte déjà trente minutes de Z3, ce qui la rend plus exigeante que l'heure et demie du deuxième cycle.",
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
      'allegee',
      'Respirer juste avant le sommet',
      "Troisième et dernière semaine plus douce du programme. Le volume tombe de 16 % et toute intensité disparaît sept jours durant. Placer une semaine calme juste avant la plus lourde des quinze n'est pas une contradiction, c'est exactement ce qui la rend faisable.",
      [
        ef(
          36,
          "36 min en Z2, tranquilles. Si une gêne traîne depuis les trois semaines de qualité, c'est maintenant qu'il faut la traiter, pas dans quinze jours.",
          "Profiter d'une semaine sans exigence pour éteindre les petites alertes, tant qu'il reste des semaines pour le faire.",
        ),
        ef(
          38,
          "38 min en Z2 sur parcours plat. Ni côte, ni accélération, ni ligne droite : cette semaine ne contient rien de dur, et c'est délibéré.",
          "Réduire la sollicitation nerveuse après trois semaines qui ont toutes porté une séance de qualité.",
        ),
        sl(
          84,
          "1 h 24 en Z2, un quart d'heure de moins que la semaine passée. Termine avec la sensation nette d'avoir de la marge et l'envie d'y retourner.",
          "Laisser le fond reculer d'un cran pour aborder la semaine sommet avec des jambes qui ont réellement récupéré.",
        ),
        renfo(
          20,
          "2 séries de : 45 s de planche ventrale, 30 s de gainage latéral par côté, 15 squats, 12 fentes par jambe. Puis 6 min de mobilité des hanches et des chevilles.",
          "Garder le tonus à charge réduite, sans installer la moindre courbature avant la semaine la plus lourde du programme.",
        ),
      ],
    ),

    semaine(
      13,
      'bloc3',
      'Le pic de charge',
      "Semaine la plus lourde des quinze, et elle tient dans une seule séance : la sortie longue de 1 h 50 avec deux blocs à l'allure de course. Elle arrive juste après une semaine douce, c'est ce qui te permet de l'encaisser. Les deux autres sorties sont donc entièrement faciles.",
      [
        ef(
          38,
          "38 min en Z2, sans la moindre accélération et sans lignes droites. C'est une sortie de transport, rien de plus.",
          "Fournir du volume neutre dans une semaine dont la charge repose intégralement sur la sortie longue.",
        ),
        ef(
          52,
          "52 min en Z2, à placer au moins deux jours avant la sortie longue. Si les jambes sont lourdes, descends-la en Z1 sans hésiter.",
          "Constituer le volume du pic par de l'endurance facile plutôt que par de l'intensité, ce qui le rend absorbable.",
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
      14,
      'affutage',
      'La séance de référence',
      "Début de l'affûtage. Le volume recule de 30 % d'un coup, mais la séance de qualité atteint son format le plus abouti : 2 fois 20 min en Z3. C'est la répétition générale de ton allure de course.",
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
          "50 min en Z2 seulement. Après plusieurs semaines à une heure et demie et plus, tu vas trouver ça ridiculement court : c'est exactement l'effet recherché.",
          "Couper franchement dans la sortie longue pour laisser la fraîcheur remonter, l'endurance acquise ne se perd pas en deux semaines.",
        ),
        renfo(
          15,
          "2 séries de : 40 s de planche ventrale, 25 s de gainage latéral par côté, 12 squats lents. Puis 5 min d'étirements doux.",
          "Rappeler le gainage qui tiendra le buste droit dans la deuxième heure de course, quand la posture lâche avant les jambes, sans rien réclamer à un corps qui porte déjà treize semaines de sorties longues.",
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
          "Lundi seulement : 6 min de mobilité des hanches, des chevilles et du haut du dos, puis 2 séries de 20 s de gainage ventral. Ensuite plus rien du tout jusqu'à dimanche.",
          "Dérouiller sans le solliciter un corps qui sort de quinze semaines de sorties longues, la seule chose qui puisse encore changer d'ici dimanche est le niveau de fraîcheur.",
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
