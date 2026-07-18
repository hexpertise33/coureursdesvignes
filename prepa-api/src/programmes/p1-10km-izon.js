import { ef, sl, tempo, seuil, vma, recup, renfo, course, semaine } from './seances.js';

/**
 * P1, 10 km d'Izon. Neuf semaines de préparation plus une de récupération.
 *
 * Programme objectif du club, recalibré sur le niveau réel du groupe. Correctif
 * de l'encadrant : ses coureurs bouclent tous le 10 km en moins d'une heure et
 * ont déjà l'habitude de courir 1 h 15 le dimanche sur terrain vallonné. Le
 * calibrage précédent, écrit pour des débutants, alignait des séances de 30 et
 * 35 min qui n'ont aucun sens pour ce public. Trois séances de course par
 * semaine, une séance de renforcement, aucune allure chiffrée : l'intensité se
 * lit uniquement en zones 1 à 5, chacun règle son rythme sur ses sensations.
 * C'est ce qui permet au groupe de courir ensemble quel que soit le niveau.
 *
 * Garde-fou de durée, décision de l'encadrant :
 *   toute séance de course d'une semaine normale (bloc1, bloc2, allegee, et
 *   par extension le premier palier d'affûtage) fait au minimum 50 min ;
 *   la sortie longue tient dans la fourchette 60 à 75 min, 1 h 15 étant leur
 *   habitude du dimanche et le plafond utile sur un 10 km ;
 *   deux exceptions assumées, la semaine de course (S9) et la semaine de
 *   récupération (S10), où des séances de 30 à 45 min sont le but recherché et
 *   non un oubli. Les textes de ces deux semaines le disent explicitement, pour
 *   qu'un coureur habitué à 1 h ne croie pas à une erreur de saisie.
 *   Le renforcement, lui, reste entre 15 et 25 min et n'est pas concerné.
 *
 * Barème de volumes, hors course objectif et hors renfo, en minutes :
 * S1 165, S2 175, S3 190, S4 160, S5 192, S6 200, S7 208 (pic), S8 165,
 * S9 75, S10 120.
 *
 * Le plancher des 50 min contraint le barème par le bas : une semaine normale
 * ne peut pas descendre sous 50 + 50 + 60, soit 160 min. Comme la semaine
 * allégée doit tomber à 85 % ou moins de la précédente, S3 ne pouvait pas
 * valoir moins de 160 / 0,85, soit 189 min. S3 est donc à 190 et S4 à 160,
 * exactement au plancher : c'est le point le plus serré du programme.
 *
 * Progression des intensités, du plus facile au plus spécifique :
 * S1 rien, S2 et S3 Z3 (effort soutenu sur blocs longs), S4 rien, S5 et S6 Z4
 * (allure de course), S7 Z5 (vitesse pure), S8 et S9 rappel de Z4 raccourci.
 * Une seule séance dure par semaine, toujours encadrée par deux séances
 * faciles.
 *
 * Lignes droites, décision de l'encadrant. Des accélérations de 15 à 20 s en
 * Z5 sont placées en fin d'endurance fondamentale à partir de la fin du
 * premier bloc, donc en S3 pour ce programme, puis entretenues en S5, S6 et
 * S8. Elles évitent qu'un coureur passe six semaines sans le moindre effort
 * bref et découvre la vitesse d'un coup en S7. Ce ne sont pas des séances de
 * vitesse : la récupération se fait en marchant, complète, et le volume total
 * de travail rapide reste de quelques minutes. Elles ne sont jamais placées la
 * veille d'une séance dure, ni en S4 (semaine allégée, sans intensité), ni en
 * S7 (la séance de VMA couvre déjà le besoin, la semaine est au pic de
 * charge), ni en S9 (semaine de course, on ne cherche plus qu'à arriver
 * frais).
 *
 * Convention de calcul des séances à intervalles (tempo, seuil, vma) : pour N
 * répétitions, la description ne compte que N-1 récupérations, celles qui
 * tombent entre deux répétitions. La somme échauffement + répétitions +
 * récupérations + retour au calme doit toujours être strictement égale à la
 * durée déclarée en premier argument de la séance.
 *
 * Échauffement progressif, décision de l'encadrant. Barème appliqué à toutes
 * les séances à intensité (TEMPO, SEUIL, VMA), en fonction de la durée
 * déclarée :
 *   40 min et moins   12 min d'échauffement,  7 min de retour au calme ;
 *   41 à 50 min       15 min d'échauffement,  8 min de retour au calme ;
 *   plus de 50 min    20 min d'échauffement, 10 min de retour au calme.
 * Les séances de qualité passant toutes au-dessus de 50 min sauf le rappel de
 * la semaine de course, elles tombent désormais sur le 20/10 qui est le
 * standard de l'encadrant. Le temps ainsi libéré n'a pas servi à gonfler
 * l'échauffement autour du même travail : les corps de séance ont grandi avec
 * les durées (3 fois 7 min puis 2 fois 13 min en Z3, 3 fois 9 min puis 4 fois
 * 8 min en Z4, 10 fois 2 min en Z5). Les séances EF, SL, RECUP et RENFO n'ont
 * pas d'échauffement séparé (une sortie en Z2 est son propre échauffement) et
 * ne sont pas concernées.
 *
 * Cette convention vaut aussi pour les lignes droites, qui se logent à
 * l'intérieur de la durée déjà déclarée de l'endurance : elles remplacent du
 * footing facile, elles ne s'y ajoutent pas, et le barème de volumes est donc
 * inchangé. Les deux formats retenus tombent sur des minutes entières :
 * 4 lignes de 15 s avec 1 min de marche entre chaque font 4 min, 6 lignes de
 * 20 s avec 1 min de marche entre chaque font 7 min.
 *
 * Toute séance dont la description cite une zone plus dure que celle de sa
 * fabrique doit la déclarer explicitement via { zonesSecondaires: [...] }
 * (voir le commentaire de seances.js). C'est le cas des quatre endurances à
 * lignes droites, qui déclarent Z5, et de la sortie longue de S8, qui déclare
 * Z3.
 */
export const P1 = {
  code: 'P1',
  nom: "10 km d'Izon",
  dateCourse: '2026-09-27',
  izon: 'objectif',
  prerequis:
    "Courir déjà environ 1 h 15 le dimanche sur terrain vallonné et viser moins d'une heure au 10 km.",
  semainesContenu: [
    semaine(
      1,
      'bloc1',
      'Reprendre la trame',
      "On repart de ce que tu tiens déjà, trois sorties par semaine et le long du dimanche, sans rien forcer. Cette semaine sert de point de départ mesuré, elle ne doit laisser aucune fatigue.",
      [
        ef(
          50,
          "50 min en Z2 sur terrain roulant. Tu dois pouvoir tenir une conversation complète du début à la fin : c'est le seul repère de la séance, le chrono n'en est pas un.",
          "Vérifier que ton allure d'endurance en est vraiment une, c'est elle qui portera les huit semaines suivantes.",
        ),
        ef(
          52,
          "52 min en Z2, sur terrain souple si tu en as un à proximité, chemin de vigne, sous-bois ou stabilisé.",
          "Construire du volume aérobie en épargnant des articulations qui vont encaisser trois sorties par semaine pendant neuf semaines.",
        ),
        sl(
          63,
          "1 h 03 en Z2 d'une seule traite, sur ton parcours vallonné habituel du dimanche. Pars 5 min plus lentement que d'ordinaire, tu finiras nettement plus solide.",
          "Repartir de la sortie longue que tu tiens déjà sans l'allonger tout de suite, pour que le premier bloc s'installe sur une base connue.",
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
      'La première touche de rythme',
      "Le volume monte légèrement et la première séance de qualité arrive. Ce sera la Z3, un effort soutenu mais raisonnable, sur des blocs assez longs pour compter vraiment.",
      [
        ef(
          55,
          "55 min en Z2, régulier. Surveille ta respiration plutôt que ta montre : elle doit rester ample et silencieuse jusqu'au bout.",
          "Entretenir le volume facile qui encadre la première séance de rythme de la préparation.",
        ),
        tempo(
          55,
          "20 min d'échauffement progressif en Z2, puis 3 fois 7 min en Z3 avec 2 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. En Z3, tu parles encore, mais par phrases courtes et la respiration s'entend nettement.",
          "Réinstaller l'effort soutenu sur des blocs de sept minutes, assez longs pour que la gestion compte, trois semaines avant l'arrivée du seuil.",
        ),
        sl(
          65,
          "1 h 05 en Z2. Choisis un parcours avec deux ou trois bosses franches et passe-les sans jamais accélérer, quitte à raccourcir nettement la foulée.",
          "Allonger le dimanche de quelques minutes seulement, en gardant le relief qui fait déjà partie de ton habitude de course.",
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
      "Semaine la plus chargée du premier bloc, et la plus serrée du programme : c'est elle qui fixe le plancher de la semaine allégée qui suit. Les blocs en Z3 passent à treize minutes et les premières lignes droites arrivent en fin de footing facile.",
      [
        ef(
          60,
          "50 min en Z2, départ très progressif sur les 10 premières minutes, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 3 min de retour au calme en Z2. Une ligne droite se lance progressivement sur les premiers appuis et se relâche avant la fin : tu ne dois jamais terminer en dette de souffle.",
          "Poser les premières lignes droites en fin de footing facile : quelques secondes de vitesse pure suffisent à entretenir la foulée, sur des efforts trop courts pour laisser la moindre fatigue.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          60,
          "20 min en Z2, puis 2 fois 13 min en Z3 avec 4 min de trottinement en Z1 entre les deux, puis 10 min en Z2. Les deux blocs doivent se ressembler : si le second est nettement plus laborieux, c'est que tu as lancé le premier trop vite.",
          "Tenir l'effort soutenu sur des blocs longs et apprendre à répartir sa dépense, exactement ce que demandera le milieu de course à Izon.",
        ),
        sl(
          70,
          "1 h 10 en Z2 sans interruption, sur le parcours vallonné du dimanche. Emporte de l'eau si tu pars en fin de matinée.",
          "Approcher par le bas le plafond utile de la sortie longue pour un 10 km, en gardant le relief plutôt qu'en allongeant indéfiniment.",
        ),
        renfo(
          20,
          "2 séries de : 40 s de planche ventrale, 20 fentes marchées, 15 squats, 30 s de pont fessier (allongé sur le dos, bassin décollé). 90 s de pause entre les séries.",
          "Renforcer les fessiers, moteur principal de la propulsion et maillon faible dès que le volume hebdomadaire monte.",
        ),
      ],
    ),

    semaine(
      4,
      'allegee',
      'On lève le pied',
      "Semaine allégée volontaire, 30 min de moins que la précédente et aucune intensité. Les trois séances restent à cinquante minutes et plus, on ne coupe pas les sorties, on coupe la difficulté.",
      [
        ef(
          50,
          "50 min en Z2 très tranquilles, sans montre si tu peux. Tu cours à la sensation et tu rentres avec l'impression de n'avoir presque rien fait.",
          "Laisser les jambes se vider de la fatigue accumulée sur les trois semaines du premier bloc.",
        ),
        ef(
          50,
          "50 min en Z2, de préférence en groupe : la sortie doit rester conversationnelle du premier au dernier kilomètre, sans exception.",
          "Garder le rythme des trois sorties hebdomadaires sans ajouter la moindre charge nouvelle.",
        ),
        sl(
          60,
          "1 h en Z2, soit un quart d'heure de moins que ton dimanche habituel. Termine en te disant que tu aurais pu continuer longtemps.",
          "Maintenir le rendez-vous de la sortie longue tout en coupant franchement la charge : c'est cette semaine-là qui fixe les progrès du bloc précédent.",
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
      "Deuxième bloc, nouvelle intensité. Après deux semaines d'effort soutenu en Z3, on monte d'une marche vers la Z4, l'allure que tu tiendras le jour du 10 km, et on l'attaque d'emblée sur des blocs de neuf minutes.",
      [
        ef(
          55,
          "45 min en Z2, à placer le surlendemain du seuil et jamais la veille, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 3 min de retour au calme en Z2.",
          "Récupérer activement du seuil tout en gardant du volume, et garder le pied vif pendant que le deuxième bloc travaille l'allure de course.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          65,
          "20 min d'échauffement en Z2, puis 3 fois 9 min en Z4 avec 4 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. En Z4, tu ne places plus que trois ou quatre mots à la fois, c'est un cran au-dessus des blocs en Z3 des semaines 2 et 3.",
          "Installer d'emblée l'allure du 10 km sur des blocs de neuf minutes, la durée à partir de laquelle le seuil cesse d'être confortable.",
        ),
        sl(
          72,
          "1 h 12 en Z2 sur un parcours franchement vallonné. Monte les côtes en gardant la respiration sous contrôle, quitte à finir presque au pas.",
          "Utiliser le relief pour durcir la sortie longue sans toucher à l'intensité, puisque sa durée, elle, ne bougera presque plus d'ici la course.",
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
      "Même intensité qu'en semaine 5, mais une répétition de plus et des récupérations raccourcies. C'est la semaine où le temps passé à l'allure de course fait un vrai saut. Dors bien.",
      [
        ef(
          58,
          "48 min en Z2 sur un parcours que tu connais par cœur, pour n'avoir rien à décider en courant, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 3 min en Z2 pour rentrer.",
          "Ajouter du volume facile dans la semaine la plus dense du deuxième bloc, avec des accélérations assez brèves pour ne rien retirer ni au seuil ni au dimanche.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          68,
          "20 min en Z2, puis 4 fois 8 min en Z4 avec 2 min de trottinement en Z1 entre chaque, puis 10 min en Z2. Le quatrième bloc doit sortir à la même intensité que le premier, c'est le seul indicateur qui compte sur cette séance.",
          "Porter à trente-deux minutes le temps passé à l'allure de course, avec des récupérations volontairement courtes pour que le seuil ne redescende jamais complètement.",
        ),
        sl(
          74,
          "1 h 14 en Z2. Bois quelques gorgées vers la 40e minute pour prendre l'habitude de t'alimenter en courant sans casser ta foulée.",
          "Toucher la durée plafond de la préparation dans des conditions calmes, une semaine avant le pic de charge.",
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
      "Semaine la plus lourde des neuf, et la seule qui monte jusqu'en Z5. Si tu la termines, la course est déjà largement à ta portée. À partir de là, tout redescend.",
      [
        ef(
          65,
          "1 h 05 en Z2. Si tu te sens émoussé au lendemain de la VMA, fais-la entièrement en Z1, c'est sans la moindre conséquence sur la préparation.",
          "Absorber la semaine la plus lourde des neuf en gardant du volume facile, seul moyen d'encaisser la VMA sans creuser la fatigue.",
        ),
        vma(
          68,
          "20 min d'échauffement en Z2, puis 10 fois 2 min en Z5 avec 2 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Deux minutes paraissent courtes sur le papier, beaucoup moins à la huitième : cherche des appuis rapides plutôt que de grandes foulées.",
          "Aller chercher de la vitesse pure une fois la base et le seuil installés, pour que l'allure de course paraisse nettement plus confortable les trois dernières semaines.",
        ),
        sl(
          75,
          "1 h 15 en Z2, la sortie la plus longue du programme et le plafond utile sur un 10 km. Prévois-la un jour où tu n'es pressé par rien.",
          "Atteindre le maximum d'endurance qui serve encore un 10 km, il n'y aura rien de plus long ensuite.",
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
      "affutage",
      "Début de l'affûtage",
      "Le volume baisse d'un cinquième, l'intensité reste. Les séances gardent leur format long, seul le temps passé en Z4 est divisé par deux. Tu vas te sentir bizarrement frais et avoir envie d'en faire plus : ne cède pas, c'est exactement le but.",
      [
        ef(
          50,
          "43 min en Z2 sans chercher à compenser la baisse de volume, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 3 min de retour au calme en Z2. À placer en début de semaine, jamais la veille du seuil.",
          "Tenir les trois sorties tout en réduisant réellement la charge, et rappeler la vitesse aux jambes en quantité volontairement minuscule.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          55,
          "20 min en Z2, puis 4 fois 4 min en Z4 avec 3 min de trottinement en Z1 entre chaque, puis 10 min en Z2. Blocs plus courts qu'en semaine 6 et récupérations plus longues : à dix jours de la course, c'est la fraîcheur qui doit progresser, pas le volume.",
          "Garder la sensation exacte de l'allure de course en divisant par deux le temps passé dessus.",
        ),
        sl(
          60,
          "1 h en Z2. Sur le dernier quart d'heure, place 3 blocs de 2 min en Z3 séparés de 3 min faciles, puis rentre tranquillement. La sortie reste une sortie facile, ces blocs ne servent qu'à délier.",
          "Conserver le rendez-vous du dimanche et réveiller la sensation d'effort soutenu, sans entamer la fraîcheur qui se construit.",
          { zonesSecondaires: ['Z3'] },
        ),
        renfo(
          18,
          "2 séries de : 40 s de planche, 12 squats, 10 fentes par jambe. On s'arrête là, pas de côtes cette semaine.",
          "Entretenir le gainage sans provoquer la moindre courbature à dix jours de la course.",
        ),
      ],
    ),

    semaine(
      9,
      'affutage',
      'Semaine de course',
      "Dimanche 27 septembre, tu cours le 10 km d'Izon. Les deux séances de la semaine sont volontairement courtes, 35 et 40 min là où tu tournes à une heure depuis deux mois : ce n'est pas un oubli de programmation, c'est le seul moyen d'arriver frais. Tout ce qui dépasse cette dose sert la fatigue et pas le chrono.",
      [
        ef(
          35,
          "35 min en Z2 en début de semaine, très souple. Séance courte à dessein : cette semaine, ce qui dépasse trois quarts d'heure ne te rapporte plus rien.",
          "Rester en mouvement et dénouer les jambes sans rien construire, le travail de fond est terminé depuis dix jours.",
        ),
        seuil(
          40,
          "12 min d'échauffement en Z2, puis 4 fois 3 min en Z4 avec 3 min de trottinement en Z1 entre chaque, puis 7 min de retour au calme en Z2. À placer au plus tard le mercredi. Séance deux fois plus courte que celle de la semaine 6, et c'est voulu : c'est un rappel, pas un entraînement.",
          "Rappeler aux jambes l'allure exacte de dimanche sans creuser le moindre déficit de récupération.",
        ),
        course(
          "10 km d'Izon",
          10,
          55,
          "Ta course. Échauffe-toi 15 min en Z2 avant le départ, deux ou trois lignes droites comprises. Pars contenu sur les 2 premiers kilomètres, en Z3, même si tout le monde te double : c'est le piège classique. Passe en Z4 du 3e au 8e kilomètre. Sur les 2 derniers, tu donnes ce qu'il te reste.",
          "L'objectif de ces neuf semaines, avec la préparation qu'il faut pour passer la ligne sous l'heure.",
        ),
        renfo(
          15,
          "Une seule séance très légère en début de semaine : 2 séries de 30 s de planche ventrale et quelques mouvements de mobilité des hanches. Rien après le mercredi.",
          "Entretenir sans fatiguer, le travail de fond est déjà fait depuis longtemps.",
        ),
      ],
    ),

    semaine(
      10,
      'recuperation',
      'On récupère',
      "La semaine la plus importante et la plus négligée. Aucune intensité, aucun chrono, et des sorties de 35 à 45 min seulement : après neuf semaines à une heure et plus, cette brièveté est la séance elle-même, pas un reliquat du programme.",
      [
        recup(
          35,
          "35 min en Z1, deux ou trois jours après la course. Si les jambes sont encore lourdes, remplace par 40 min de marche, c'est aussi efficace.",
          "Relancer la circulation pour évacuer les courbatures plus vite qu'en restant assis.",
        ),
        recup(
          40,
          "40 min en Z1 en milieu de semaine. Si tu te surprends à accélérer parce que les jambes reviennent, ralentis : ce n'est pas encore le moment.",
          "Reprendre en douceur en laissant les sensations décider du rythme.",
        ),
        recup(
          45,
          "45 min en Z1 sur terrain souple, sans montre si tu veux. Trois quarts d'heure au lieu de l'heure et quart du dimanche, et c'est exactement le but : cette sortie referme le cycle, elle ne le prolonge pas.",
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
