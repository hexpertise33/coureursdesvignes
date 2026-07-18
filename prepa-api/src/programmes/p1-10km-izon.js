import { ef, sl, seuil, vma, recup, renfo, course, semaine } from './seances.js';

/**
 * P1, 10 km d'Izon. Neuf semaines de préparation plus une de récupération.
 *
 * Programme d'entrée du club, pensé pour un coureur qui tient déjà 30 minutes
 * sans s'arrêter et qui n'a jamais suivi de plan structuré. Trois séances de
 * course par semaine, une séance de renforcement, aucune allure chiffrée :
 * l'intensité se lit uniquement en zones 1 à 5, chacun règle son rythme sur
 * ses propres sensations. C'est ce qui permet au groupe de courir ensemble
 * quel que soit le niveau.
 *
 * Barème de volumes, hors course objectif et hors renfo, en minutes :
 * S1 110, S2 115, S3 125, S4 100, S5 130, S6 143, S7 147 (pic), S8 115,
 * S9 53, S10 90.
 */
export const P1 = {
  code: 'P1',
  nom: "10 km d'Izon",
  dateCourse: '2026-09-27',
  izon: 'objectif',
  prerequis: "Savoir courir 30 minutes d'affilée sans s'arrêter.",
  semainesContenu: [
    semaine(
      1,
      'bloc1',
      'Poser les fondations',
      "On installe l'habitude de courir 3 fois par semaine, sans jamais forcer. Cette semaine ne doit laisser aucune fatigue.",
      [
        ef(
          30,
          '30 min en Z2, sur du plat. Tu dois pouvoir tenir une conversation en courant : si tu cherches ton souffle, ralentis, même si ça te paraît lent.',
          "Vérifier que tu sais courir vraiment doucement, c'est la compétence la plus utile des 9 semaines.",
        ),
        ef(
          35,
          '35 min en Z2, sur terrain souple si tu en as un à proximité (chemin de vigne, sous-bois, stabilisé).',
          "Construire la base aérobie tout en épargnant les articulations qui découvrent la régularité.",
        ),
        sl(
          45,
          "45 min en Z2, d'une seule traite. Pars 5 min plus lentement que ton allure habituelle, tu finiras plus facilement.",
          "Habituer le corps à un effort long et continu, c'est ce qui portera le dernier tiers de la course.",
        ),
        renfo(
          20,
          "Gainage et jambes, sans matériel : 3 séries de 30 s de planche ventrale, 30 s de planche sur chaque côté, puis 10 fentes avant par jambe. 1 min de pause entre les séries.",
          "Protéger le bas du dos et les hanches, qui encaissent tous les impacts de la foulée.",
        ),
      ],
    ),

    semaine(
      2,
      'bloc1',
      'Un peu de rythme',
      "La routine est prise, on ajoute la première touche d'intensité. Elle est très courte : l'objectif est de découvrir la sensation, pas de se faire mal.",
      [
        ef(
          32,
          "32 min en Z2. Reste attentif à ta respiration : elle doit rester ample et régulière du début à la fin.",
          "Entretenir l'endurance entre deux séances plus exigeantes.",
        ),
        vma(
          35,
          "12 min d'échauffement en Z2, puis 8 fois 30 s en Z5 avec 1 min de marche ou de trottinement en Z1 entre chaque, puis 11 min de retour au calme en Z2.",
          "Réveiller la vitesse et la coordination de la foulée sans casser les jambes.",
        ),
        sl(
          48,
          "48 min en Z2. Si tu peux, choisis un parcours avec une ou deux bosses douces et passe-les sans accélérer.",
          "Allonger la sortie longue de quelques minutes seulement, la progression se joue sur la patience.",
        ),
        renfo(
          20,
          "Même gainage qu'en semaine 1, plus 2 séries de 15 squats au poids du corps, pieds écartés à la largeur des épaules, descente lente.",
          "Répéter le même travail pour que le corps l'assimile, la nouveauté n'apporte rien à ce stade.",
        ),
      ],
    ),

    semaine(
      3,
      'bloc1',
      'Premier palier',
      "Semaine la plus chargée du premier bloc. Tout monte un peu : la durée, le nombre de répétitions, la sortie longue.",
      [
        ef(
          35,
          "35 min en Z2, départ très progressif sur les 10 premières minutes.",
          "Servir de séance de fond, celle qui fait le volume sans coûter de fraîcheur.",
        ),
        vma(
          38,
          "12 min en Z2, puis 10 fois 30 s en Z5 avec 1 min en Z1 entre chaque, puis 11 min en Z2. Les 30 s doivent toutes se ressembler : si la dernière est nettement plus lente, tu es parti trop fort.",
          "Apprendre à répartir son effort sur une série, compétence directement utile le jour de la course.",
        ),
        sl(
          52,
          "52 min en Z2 sans interruption. Emporte de l'eau si la sortie est en fin de matinée.",
          "Franchir la barre symbolique des 50 minutes de course continue.",
        ),
        renfo(
          20,
          "2 séries de : 40 s de planche ventrale, 20 fentes marchées, 15 squats, 30 s de pont fessier (allongé sur le dos, bassin décollé). 90 s de pause entre les séries.",
          "Renforcer les fessiers, moteur principal de la propulsion, souvent le maillon faible chez le débutant.",
        ),
      ],
    ),

    semaine(
      4,
      'allegee',
      'On lève le pied',
      "Semaine allégée volontaire, environ 20 % de volume en moins et aucune intensité. C'est pendant ces semaines-là que les progrès des trois précédentes se fixent.",
      [
        ef(
          30,
          "30 min en Z2 très tranquilles. Aucune montre à consulter : tu cours à la sensation.",
          "Laisser les jambes se vider de la fatigue accumulée sur le premier bloc.",
        ),
        ef(
          30,
          "30 min en Z2, si possible en groupe ou avec quelqu'un : la séance doit rester conversationnelle du début à la fin.",
          "Entretenir la routine des trois sorties hebdomadaires sans ajouter de charge.",
        ),
        sl(
          40,
          "40 min en Z2, plus courte que les semaines précédentes. Terminer avec l'impression de pouvoir continuer encore longtemps.",
          "Maintenir l'habitude de la sortie longue tout en réduisant nettement la charge.",
        ),
        renfo(
          20,
          "Séance courte et facile : 2 séries de 30 s de planche, 10 squats, 10 fentes par jambe, puis 5 min d'étirements doux des mollets et des cuisses.",
          "Rester actif sur le renforcement sans créer de courbatures pendant une semaine de repos relatif.",
        ),
      ],
    ),

    semaine(
      5,
      'bloc2',
      'Le travail au seuil',
      "Deuxième bloc, nouvelle intensité. On remplace les sprints très courts par des efforts plus longs en Z4, l'allure que tu tiendras le jour du 10 km.",
      [
        ef(
          35,
          "35 min en Z2, la veille ou le surlendemain de la séance de seuil, jamais juste avant.",
          "Récupérer activement tout en gardant du volume dans la semaine.",
        ),
        seuil(
          40,
          "15 min d'échauffement en Z2, puis 2 fois 6 min en Z4 avec 3 min de trottinement en Z1 entre les deux, puis 10 min en Z2. En Z4, tu ne dis plus que trois ou quatre mots à la fois.",
          "Découvrir l'allure soutenue mais tenable, celle qui déterminera ton chrono à Izon.",
        ),
        sl(
          55,
          "55 min en Z2. Choisis un parcours vallonné et monte les côtes en gardant la respiration sous contrôle, quitte à finir presque en marchant.",
          "Passer le cap des 55 minutes, soit à peu près la durée de ta course objectif.",
        ),
        renfo(
          25,
          "3 séries de : 45 s de planche ventrale, 30 s de planche sur chaque côté, 15 squats, 12 fentes par jambe. 1 min de pause entre les séries.",
          "Monter d'un cran sur le renforcement maintenant que le corps supporte bien la charge de course.",
        ),
      ],
    ),

    semaine(
      6,
      'bloc2',
      'On tient plus longtemps',
      "Même séance de seuil qu'en semaine 5, mais avec une répétition de plus et une sortie longue d'une heure. Semaine exigeante, dors bien.",
      [
        ef(
          38,
          "38 min en Z2, sur un parcours que tu connais pour ne pas avoir à réfléchir à ton itinéraire.",
          "Ajouter du volume facile, c'est lui qui construit l'endurance de fond.",
        ),
        seuil(
          45,
          "13 min en Z2, puis 3 fois 6 min en Z4 avec 3 min en Z1 entre chaque bloc, puis 8 min en Z2. Le troisième bloc doit être aussi rapide que le premier.",
          "Augmenter le temps passé à l'allure de course, sans toucher à l'intensité elle-même.",
        ),
        sl(
          60,
          "1 h en Z2. Bois quelques gorgées vers la 30e minute pour prendre l'habitude de t'alimenter en courant.",
          "Franchir l'heure de course continue, un vrai marqueur de confiance avant la course.",
        ),
        renfo(
          25,
          "Séance en côte : trouve une pente régulière et monte-la 8 fois en marchant vite ou en trottinant, redescente en marchant. Termine par 3 fois 45 s de planche.",
          "Muscler les jambes en situation de course, plus efficace qu'un exercice au sol pour la foulée.",
        ),
      ],
    ),

    semaine(
      7,
      'bloc2',
      'Le pic de charge',
      "Semaine la plus lourde des neuf. Si tu la termines, la course est déjà largement à ta portée. À partir de là, tout redescend.",
      [
        ef(
          40,
          "40 min en Z2. Si tu te sens émoussé, transforme cette séance en 40 min de Z1, c'est sans conséquence.",
          "Absorber la charge des séances dures sans ajouter de fatigue supplémentaire.",
        ),
        vma(
          45,
          "15 min en Z2, puis 12 fois 30 s en Z5 avec 1 min en Z1 entre chaque, puis 12 min en Z2. Fais les 4 dernières répétitions en te concentrant sur des appuis rapides plutôt que sur de grandes foulées.",
          "Retrouver de la vitesse pure après un mois de travail au seuil, pour que l'allure de course paraisse plus facile.",
        ),
        sl(
          62,
          "1 h 02 en Z2, la sortie la plus longue du programme. Prévois-la un jour où tu n'es pas pressé.",
          "Atteindre le maximum d'endurance utile pour un 10 km, il n'y aura pas plus long ensuite.",
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 20 fentes marchées, 20 squats, 40 s de pont fessier. Étirements des mollets pour finir.",
          "Verrouiller le gainage avant de réduire le renforcement pendant l'affûtage.",
        ),
      ],
    ),

    semaine(
      8,
      'affutage',
      "Début de l'affûtage",
      "Le volume baisse d'un quart, l'intensité reste. Tu vas te sentir bizarrement frais et avoir envie d'en faire plus : ne cède pas, c'est exactement le but.",
      [
        ef(
          32,
          "32 min en Z2, sans chercher à compenser la baisse de volume.",
          "Garder le rythme des trois sorties tout en réduisant réellement la charge.",
        ),
        seuil(
          38,
          "12 min en Z2, puis 2 fois 6 min en Z4 avec 3 min en Z1 entre les deux, puis 11 min en Z2. Tu retrouves la séance de la semaine 5 : elle doit te paraître plus facile.",
          "Rappeler l'allure de course aux jambes en réduisant le volume de travail.",
        ),
        sl(
          45,
          "45 min en Z2. Termine par 4 fois 20 s un peu plus vite, en Z3, avec 1 min de trot entre chaque, juste pour délier.",
          "Conserver l'habitude de la sortie longue sans entamer la fraîcheur qui se construit.",
        ),
        renfo(
          18,
          "2 séries de : 40 s de planche, 12 squats, 10 fentes par jambe. On s'arrête là, pas de côtes cette semaine.",
          "Entretenir le gainage sans provoquer la moindre courbature à 10 jours de la course.",
        ),
      ],
    ),

    semaine(
      9,
      'affutage',
      'Semaine de course',
      "Volume réduit de plus de moitié. Dimanche 27 septembre, tu cours le 10 km d'Izon. Cette semaine ne sert qu'à arriver frais sur la ligne de départ.",
      [
        ef(
          25,
          "25 min en Z2 en début de semaine, très souple. Rien de plus.",
          "Rester en mouvement et dénouer les jambes sans créer de fatigue.",
        ),
        vma(
          28,
          "10 min en Z2, puis 5 fois 1 min en Z4 avec 1 min en Z1 entre chaque, puis 8 min en Z2. À placer au plus tard le mercredi.",
          "Garder la vivacité et les sensations d'allure sans creuser le moindre déficit de récupération.",
        ),
        course(
          "10 km d'Izon",
          10,
          55,
          "Ta course. Échauffe-toi 10 min en Z2 avant le départ. Pars prudemment sur les 2 premiers kilomètres, en Z3, même si tout le monde te double : c'est le piège classique. Passe en Z4 du 3e au 8e kilomètre. Sur les 2 derniers, tu donnes ce qu'il te reste.",
          "L'objectif de ces neuf semaines, et la première ligne d'arrivée d'une longue série.",
        ),
        renfo(
          12,
          "Une seule séance très légère en début de semaine : 2 séries de 30 s de planche ventrale et quelques mouvements de mobilité des hanches. Rien après le mercredi.",
          "Entretenir sans fatiguer, le travail de fond est déjà fait depuis longtemps.",
        ),
      ],
    ),

    semaine(
      10,
      'recuperation',
      'On récupère',
      "La semaine la plus importante et la plus négligée. Aucune intensité, aucun chrono : on laisse le corps encaisser ce qu'il vient de faire.",
      [
        recup(
          25,
          "25 min en Z1, deux ou trois jours après la course. Si les jambes sont encore lourdes, remplace par 30 min de marche, c'est aussi efficace.",
          "Relancer la circulation pour évacuer les courbatures plus vite qu'en restant assis.",
        ),
        recup(
          30,
          "30 min en Z1, en montant doucement vers le bas de la Z2 sur la fin si tout va bien.",
          "Reprendre en douceur en laissant les sensations décider du rythme.",
        ),
        recup(
          35,
          "35 min en Z2, sur terrain souple. C'est la sortie qui referme le cycle : profite du parcours, sans montre si tu veux.",
          "Retrouver des sensations normales et l'envie d'enchaîner sur un prochain objectif.",
        ),
        renfo(
          15,
          "Étirements doux et mobilité : 15 min de travail des hanches, des mollets et du dos, en respirant lentement sur chaque position.",
          "Redonner de la souplesse aux muscles raidis par neuf semaines d'entraînement.",
        ),
      ],
    ),
  ],
};
