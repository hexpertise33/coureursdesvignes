import { ef, sl, tempo, seuil, vma, recup, renfo, course, semaine } from './seances.js';

/**
 * P5, 10 km HOKA de Paris. Seize semaines de préparation plus une de
 * récupération, soit dix-sept entrées.
 *
 * C'est la plus longue des cinq préparations, et la seule qui embarque une
 * course dans son propre déroulé. Le coureur visé est le même qu'en P2 : il
 * tient déjà une demi-heure de course continue et il vient chercher un chrono,
 * pas seulement une ligne d'arrivée. Trois sorties hebdomadaires, un
 * renforcement, et l'intensité toujours exprimée en zones 1 à 5, jamais en
 * allure : le groupe part ensemble, chacun règle son curseur sur sa propre
 * respiration.
 *
 * Ce qui distingue P5 des quatre autres programmes
 * ------------------------------------------------
 * Le 10 km d'Izon du dimanche 27 septembre n'y est pas une option cochée dans
 * un formulaire, il est écrit dans le plan. Le coureur qui choisit P5 choisit
 * du même coup de prendre ce dossard. Conséquence directe sur la structure du
 * fichier : il n'existe aucun champ `variantes` ici, et aucune semaine n'a
 * deux versions. Un seul chemin, du premier au dernier jour.
 *
 * Izon tombe le dernier jour de la semaine 9, à sept semaines de Paris. Cette
 * distance dans le calendrier est ce qui autorise à le courir pour de vrai, à
 * l'objectif, là où la préparation marathon impose au contraire de le retenir
 * en Z3. Sept semaines suffisent largement à digérer un 10 km disputé, et le
 * chrono relevé ce jour-là devient le repère auquel toute la fin de
 * préparation se réfère.
 *
 * Trame
 * -----
 * Le principe posé par l'encadrant est simple : trois semaines qui montent,
 * une semaine plus douce, et on recommence.
 *
 *   S1 S2 S3 progressives, S4 plus douce
 *   S5 S6 S7 progressives, S8 plus douce, pré-allègement avant le dossard
 *   S9 le 10 km d'Izon, couru à l'objectif le dimanche
 *   S10 récupération active
 *   S11 S12 S13 progressives, bloc spécifique 10 km
 *   S14 plus douce
 *   S15 S16 affûtage, le 10 km HOKA de Paris le dernier jour de S16
 *   S17 récupération
 *
 * Les semaines 9 et 10 sont l'exception assumée à ce principe, et la seule.
 * Elles ne suivent pas le rythme trois plus une parce qu'une course réelle
 * s'intercale : on ne peut ni la préparer avec une semaine chargée, ni
 * enchaîner derrière comme si rien ne s'était passé. L'intention rédigée de
 * ces deux semaines le dit noir sur blanc au coureur, pour qu'il ne prenne pas
 * ce décrochage pour une erreur de plan ou pour une invitation à en rajouter.
 *
 * Barème de volumes, hors course objectif et hors renfo, en minutes :
 * S1 102, S2 111, S3 120, S4 98 (douce), S5 128, S6 138, S7 149,
 * S8 120 (douce), S9 58 (Izon), S10 88 (récupération active), S11 140,
 * S12 150, S13 160 (pic), S14 124 (douce), S15 112, S16 56, S17 92.
 *
 * Le pic tombe en S13 à 160 min, dans la fourchette de 150 à 165 min retenue
 * pour une préparation de 10 km à trois sorties. La sortie longue plafonne à
 * 1 h 15, atteinte une seule fois, en S13 elle aussi.
 *
 * Comment le barème passe le garde-fou
 * ------------------------------------
 * Trois passages méritent d'être explicités, ce sont ceux où un chiffre choisi
 * au hasard aurait fait sauter la règle.
 *
 * S9 est étiquetée allegee : elle se compare donc à S8 (120 min) et doit
 * tomber à 102 min ou moins hors course. Ses 58 min y satisfont largement, ce
 * qui est logique puisque la charge de la semaine est portée par la course
 * elle-même, exclue du calcul.
 *
 * S10, en récupération active, suit une semaine qui contient la course
 * objectif. Le garde-fou ne compare donc pas S10 au volume hors course de S9,
 * qui sous-estime grossièrement la charge réelle de cette semaine-là : il
 * remonte à la dernière semaine sans course, S8, et la borne par le pic des
 * blocs atteint jusqu'ici. La référence vaut min(120, 149) = 120, et S10 doit
 * rester sous 102 min. Ses 88 min passent.
 *
 * S11 ouvre le bloc spécifique après deux semaines hors bloc. Sa référence
 * n'est pas S10 mais le pic des blocs accumulé, soit les 149 min de S7 :
 * la remontée à 140 min est donc une reprise sous le niveau déjà atteint,
 * pas un bond. Le cycle repart de là et monte à 150 puis 160.
 *
 * S8 est le point de tension du barème : elle doit être assez basse pour
 * alléger avant le dossard, et assez haute pour servir de référence tenable à
 * S9 comme à S10. À 120 min, soit une baisse d'un cinquième depuis S7, elle
 * remplit les deux rôles.
 *
 * Progression des intensités
 * --------------------------
 * S1 rien, le temps de caler trois créneaux. S2 et S3 en Z3, la zone
 * d'apprentissage. S4 rien. S5 et S6 en Z4, l'allure du 15 novembre. S7 en Z5,
 * pour ouvrir le plafond de vitesse avant l'échéance d'Izon. S8 rien, S9 la
 * course, S10 rien. S11 et S12 en Z4 sur des formats qui se resserrent, S13 en
 * Z5 au pic, S15 la séance de référence du programme (3 fois 8 min en Z4),
 * S16 un simple rappel d'allure avant Paris. Jamais deux séances dures dans la
 * même semaine, et jamais de Z4 avant que la Z3 ait été installée.
 *
 * La dominante finale est bien Z4 et Z5 : huit des dix séances de qualité du
 * programme s'y situent, les deux séances en Z3 servant uniquement de marche
 * d'entrée au tout début.
 *
 * Lignes droites
 * --------------
 * Accélérations de 15 à 20 s en Z5 en fin de footing facile, récupération
 * complète en marchant, logées à l'intérieur de la durée déclarée et jamais
 * ajoutées par-dessus. Introduites à la fin du premier bloc, donc en S3, puis
 * entretenues en S5, S6, S11, S12 et S15. Elles sont écartées des semaines
 * plus douces (S4, S8, S14), des semaines qui portent déjà une séance de
 * vitesse (S7 et S13), de la semaine de récupération active (S10) et des deux
 * semaines de course (S9 et S16). La veille d'Izon comporte bien quatre
 * accélérations, mais tenues en Z4 : ce sont des lignes droites de réveil,
 * elles ne comptent pas comme du travail et sont déclarées comme telles.
 *
 * Réconciliation des durées
 * -------------------------
 * Pour N répétitions, N-1 récupérations, celles qui tombent entre deux
 * répétitions. Échauffement plus répétitions plus récupérations plus retour au
 * calme égale exactement la durée déclarée. Même arithmétique pour les lignes
 * droites : 4 accélérations de 15 s avec 1 min de marche entre chaque font
 * 4 min, 6 accélérations de 20 s avec 1 min de marche entre chaque font 7 min.
 *
 * Toute séance dont la description cite une zone plus dure que celle de sa
 * fabrique la déclare via { zonesSecondaires: [...] } : les six endurances à
 * lignes droites en Z5, l'endurance de veille de dossard qui monte en Z4, et
 * aucune autre.
 */
export const P5 = {
  code: 'P5',
  nom: '10 km HOKA de Paris',
  dateCourse: '2026-11-15',
  izon: 'integree',
  prerequis: "Savoir courir 30 minutes d'affilée sans s'arrêter.",
  semainesContenu: [
    semaine(
      1,
      'bloc1',
      'Trois rendez-vous par semaine',
      "Seize semaines, c'est long, et c'est une chance : rien de ce que tu feras cette semaine ne décidera de ton chrono à Paris. La seule chose qui compte pour l'instant est de trouver trois créneaux qui tiennent la distance dans ton agenda.",
      [
        ef(
          30,
          "30 min en Z2 sur terrain plat. Le repère est ta voix : tant que tu peux répondre à une question par une vraie phrase, tu es dans la bonne zone.",
          "Fixer dès la première sortie la sensation de la Z2, puisque c'est elle qui portera les trois quarts des seize semaines à venir.",
        ),
        ef(
          32,
          "32 min en Z2. Si tu as accès à un chemin, un parc ou un bord de rivière, prends-le plutôt que le bitume.",
          "Commencer tout de suite à varier les surfaces, parce que les tendons encaissent la répétition bien mieux quand le sol change.",
        ),
        sl(
          40,
          "40 min en Z2 sans interruption. Les dix premières minutes doivent te sembler ridiculement lentes, sinon tu es parti trop vite.",
          "Poser le socle de la sortie longue, celle qui montera par petites marches jusqu'à 1 h 15 en fin de préparation.",
        ),
        renfo(
          20,
          "3 séries de : 30 s de planche ventrale, 20 s de planche sur chaque côté, 12 fentes avant par jambe, 12 squats. 1 min de repos entre les séries.",
          "Réveiller la ceinture abdominale et les hanches avant que le volume de course ne monte, elles encaissent chaque appui.",
        ),
      ],
    ),

    semaine(
      2,
      'bloc1',
      'Première marche vers le soutenu',
      "La routine tient, on ouvre l'intensité par son échelon le plus bas. La Z3 se travaille sans crispation : soutenue, présente dans la respiration, mais jamais douloureuse.",
      [
        ef(
          31,
          "31 min en Z2, à placer à distance de la séance de qualité. Ni la veille, ni le lendemain si tu peux l'éviter.",
          "Apprendre dès la deuxième semaine à espacer les sorties, un réflexe de calendrier qui évitera bien des séances ratées plus tard.",
        ),
        tempo(
          38,
          "12 min d'échauffement en Z2, puis 3 fois 4 min en Z3 avec 2 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. En Z3 tu parles encore, mais par bouts de phrase et on entend ton souffle.",
          "Découvrir un effort qui dure sans faire mal, et surtout apprendre à le quitter avant qu'il ne devienne pénible.",
        ),
        sl(
          42,
          "42 min en Z2. Deux minutes de plus que la semaine dernière, c'est tout ce qu'on ajoute : la sortie longue se construit par répétition, pas par exploit.",
          "Faire progresser la durée de course continue par des marches assez petites pour que le corps ne les remarque pas.",
        ),
        renfo(
          20,
          "Reprends la séance de la semaine 1, et ajoute 2 séries de 30 s de pont fessier, allongé sur le dos, bassin décollé, talons ancrés au sol.",
          "Répéter un enchaînement déjà connu en y greffant les fessiers, moteur de la propulsion que le débutant oublie systématiquement.",
        ),
      ],
    ),

    semaine(
      3,
      'bloc1',
      'Clôture du premier bloc',
      "Semaine la plus chargée des quatre premières, et celle qui fait entrer les lignes droites dans le programme. Quelques secondes de vitesse en fin de footing suffisent à rappeler aux jambes qu'elles savent s'ouvrir.",
      [
        ef(
          34,
          "25 min en Z2 en démarrant très doucement, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 5 min en Z2. Une ligne droite se construit en montant progressivement en vitesse, et se relâche avant la fin : tu ne dois jamais terminer en apnée.",
          "Introduire de la vitesse par des efforts trop brefs pour fatiguer quoi que ce soit, ce qui prépare le terrain nerveux des blocs suivants.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          41,
          "12 min en Z2, puis 3 fois 5 min en Z3 avec 2 min de trottinement en Z1 entre chaque, puis 10 min en Z2. Une minute de plus par bloc que la semaine passée, à intensité rigoureusement identique.",
          "Allonger la répétition plutôt que d'en ajouter une, la façon la plus sûre de progresser sans changer de contrainte.",
        ),
        sl(
          45,
          "45 min en Z2 d'une seule traite. Repère à l'avance une boucle que tu peux raccourcir en cours de route si la journée tourne mal.",
          "Franchir les trois quarts d'heure de course continue, dernier palier avant la première semaine plus douce.",
        ),
        renfo(
          22,
          "2 séries de : 45 s de planche ventrale, 20 fentes marchées, 15 squats, 30 s de pont fessier, 20 montées sur la pointe des pieds. 90 s de pause entre les séries.",
          "Boucler le premier bloc avec un peu plus de volume musculaire, mollets compris, avant de lever le pied la semaine prochaine.",
        ),
      ],
    ),

    semaine(
      4,
      'allegee',
      'Première semaine plus douce',
      "Un cinquième de volume en moins et aucune intensité pendant sept jours. Tu vas la trouver trop facile, c'est exactement ce qu'on cherche : les progrès des trois semaines écoulées se fixent maintenant, pas pendant qu'on les provoque.",
      [
        ef(
          28,
          "28 min en Z2, sans montre si tu t'en sens capable. Cours à la sensation, uniquement, et rentre avant d'en avoir envie.",
          "Débrancher le réflexe de mesurer, parce qu'une semaine plus douce se juge à la fraîcheur du lundi suivant et à rien d'autre.",
        ),
        ef(
          32,
          "32 min en Z2, si possible avec quelqu'un du club. La sortie doit rester conversationnelle du premier au dernier pas, sans exception.",
          "Profiter d'une semaine sans exigence pour courir accompagné, ce qui est aussi la raison d'être d'une préparation collective.",
        ),
        sl(
          38,
          "38 min en Z2, plus courte que les trois précédentes et volontairement. Termine avec la sensation nette d'avoir de la réserve.",
          "Garder le rendez-vous hebdomadaire de la sortie longue tout en coupant réellement dans la charge, ce qui n'est pas contradictoire.",
        ),
        renfo(
          18,
          "2 séries de : 30 s de planche, 12 squats lents, 10 fentes par jambe. Puis 6 min d'étirements tenus sur les mollets, les ischios et les fessiers.",
          "Rester actif sans créer la moindre courbature pendant la semaine censée effacer la fatigue accumulée.",
        ),
      ],
    ),

    semaine(
      5,
      'bloc2',
      "L'allure de course entre en scène",
      "Deuxième bloc, et changement d'échelon : on passe en Z4. C'est l'intensité que tu chercheras à tenir le 15 novembre, et il te reste onze semaines pour la rendre familière.",
      [
        ef(
          34,
          "23 min en Z2, à placer le surlendemain du seuil et jamais la veille, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 7 min en Z2.",
          "Produire du volume utile un jour où le corps digère encore la séance dure, tout en gardant le pied vif après la semaine calme.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          44,
          "14 min d'échauffement en Z2, puis 2 fois 6 min en Z4 avec 3 min de trottinement en Z1 entre les deux, puis 15 min de retour au calme en Z2. En Z4 tu ne places plus que trois ou quatre mots à la fois, c'est nettement au-dessus des blocs en Z3 des semaines 2 et 3.",
          "Faire connaissance avec l'intensité qui décidera du chrono, sur une quantité assez modeste pour que la séance se termine bien.",
        ),
        sl(
          50,
          "50 min en Z2 sur un parcours légèrement vallonné. Dans les montées, garde le souffle sous contrôle quitte à ralentir beaucoup, la pente n'est pas un adversaire.",
          "Habituer le corps à produire de l'effort sur terrain irrégulier, ce qui rend ensuite le plat étonnamment facile.",
        ),
        renfo(
          25,
          "3 séries de : 45 s de planche ventrale, 30 s de gainage latéral par côté, 16 squats, 14 fentes arrière par jambe, 30 s de chaise contre un mur. 1 min de pause.",
          "Monter d'un cran maintenant que le corps encaisse bien la charge de course, la structure musculaire doit avancer au même rythme.",
        ),
      ],
    ),

    semaine(
      6,
      'bloc2',
      'Plus de temps passé au seuil',
      "Même intensité que la semaine passée, mais un bloc de plus et une sortie longue rallongée. On ajoute du temps à l'allure de course, on ne touche pas à l'allure elle-même.",
      [
        ef(
          36,
          "24 min en Z2 sur un parcours que tu connais par coeur, pour n'avoir à réfléchir ni à l'itinéraire ni au dénivelé, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 5 min en Z2.",
          "Ajouter du volume facile dans une semaine qui monte déjà, en entretenant la fréquence d'appui sans coûter la moindre fraîcheur.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          46,
          "13 min en Z2, puis 3 fois 6 min en Z4 avec 3 min de trottinement en Z1 entre chaque, puis 9 min en Z2. Le troisième bloc doit ressembler au premier : s'il est nettement plus lent, c'est le premier qui était trop rapide.",
          "Augmenter le temps total passé en Z4 sans y ajouter d'intensité, c'est ce dosage-là qui construit la capacité à tenir.",
        ),
        sl(
          56,
          "56 min en Z2. Emporte de quoi boire et prends quelques gorgées vers la trentième minute, même sans soif, pour installer l'habitude.",
          "Dépasser franchement la durée probable de ta course, pour que les 10 km de Paris te paraissent courts le jour venu.",
        ),
        renfo(
          25,
          "Séance en côte : repère une pente régulière et monte-la 8 fois en trottinant, redescente en marchant, sans chronomètre. Termine par 3 fois 45 s de planche ventrale.",
          "Muscler les jambes dans le geste de course lui-même, ce qu'aucun exercice au sol ne reproduit vraiment.",
        ),
      ],
    ),

    semaine(
      7,
      'bloc2',
      'Ouvrir le plafond de vitesse',
      "Semaine la plus lourde depuis le début et la première qui monte en Z5. Les répétitions sont volontairement courtes : on cherche l'ouverture de la foulée, pas l'épuisement.",
      [
        ef(
          38,
          "38 min en Z2, sans aucune ligne droite cette semaine : la séance de fractionné couvre déjà tout le besoin de vitesse. Si tu te sens émoussé, descends la sortie entière en Z1, c'est sans conséquence.",
          "Absorber la semaine la plus dure du deuxième bloc sans y greffer le moindre effort supplémentaire.",
        ),
        vma(
          46,
          "15 min en Z2, puis 6 fois 2 min en Z5 avec 2 min de trottinement en Z1 entre chaque, puis 9 min en Z2. Cherche des appuis rapides et légers plutôt que de grandes foulées, la fréquence prime sur l'amplitude.",
          "Élargir le plafond de vitesse une fois la base posée, pour que l'allure du 10 km paraisse plus confortable dans le bloc spécifique.",
        ),
        sl(
          65,
          "1 h 05 en Z2. Choisis un jour où tu n'as rien de prévu derrière et pars sans heure de retour en tête.",
          "Construire le fond qui portera le dernier tiers de la course, celui où la lucidité baisse avant les jambes.",
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 24 fentes marchées, 20 squats, 40 s de pont fessier jambes fléchies, 15 montées de genou par jambe sur une marche. Étirements des mollets pour finir.",
          "Verrouiller le gainage avant la semaine plus douce, pendant laquelle le renforcement va nettement redescendre.",
        ),
      ],
    ),

    semaine(
      8,
      'allegee',
      'On dégonfle avant le dossard',
      "Le volume baisse d'un cinquième et toute intensité disparaît. Cette semaine n'est pas une pause ordinaire : elle prépare directement le 10 km d'Izon de dimanche prochain. Arriver frais à un dossard se décide neuf jours avant, pas la veille.",
      [
        ef(
          30,
          "30 min en Z2 très souples. Aucune bosse cherchée exprès, aucune accélération, aucun objectif autre que de te sentir bien en rentrant.",
          "Laisser souffler le système nerveux, qui fatigue plus vite que les muscles sur les semaines chargées en intensité.",
        ),
        ef(
          34,
          "34 min en Z2 sur terrain souple si tu en as un à portée. Change de parcours par rapport à l'autre sortie de la semaine.",
          "Tenir les trois rendez-vous hebdomadaires même en semaine calme, en changeant de sol pour solliciter d'autres muscles que d'habitude.",
        ),
        sl(
          56,
          "56 min en Z2, la seule séance un peu longue de la semaine. Facile de bout en bout : si tu accélères sur la fin, tu as manqué l'objectif de la semaine.",
          "Conserver le fond d'endurance pendant une semaine sans intensité, il ne se garde qu'en le pratiquant régulièrement.",
        ),
        renfo(
          18,
          "2 séries de : 45 s de planche, 12 squats, 12 fentes par jambe, 30 s de pont fessier. On s'arrête là, pas de côtes ni de sauts cette semaine.",
          "Maintenir le tonus à charge réduite, en cohérence avec une semaine qui doit se terminer avec des jambes intactes.",
        ),
      ],
    ),

    semaine(
      9,
      'allegee',
      "Le 10 km d'Izon, dimanche",
      "Rupture assumée du rythme trois plus une : dimanche 27 septembre, tu cours le 10 km d'Izon, et il fait partie de ta préparation, pas de tes loisirs. La semaine paraît vide parce que la charge est déplacée sur la course elle-même. Une sortie en début de semaine, une toute petite la veille, rien entre les deux.",
      [
        ef(
          32,
          "32 min en Z2 lundi ou mardi, pas plus tard. Aucune accélération, aucune côte, aucune envie de tester tes jambes avant dimanche.",
          "Rester en mouvement après le week-end sans entamer la fraîcheur qui doit être entière au départ, cinq jours plus tard.",
        ),
        ef(
          26,
          "Vendredi, tu ne fais rien : ni course, ni renfo, ni sortie de compensation. Samedi, 20 min en Z2, puis 4 lignes droites de 15 s en Z4 avec 1 min de marche entre chaque, soit 4 min, puis 2 min en Z2. On reste en Z4 et pas au-dessus, ces accélérations réveillent la foulée sans jamais l'entamer.",
          "Délester complètement les deux jours qui précèdent le dossard, un repos total puis une sortie minuscule valent mieux que n'importe quel entraînement de dernière minute.",
          { zonesSecondaires: ['Z4'] },
        ),
        course(
          "10 km d'Izon",
          10,
          55,
          "Ta course, et tu la cours pour de bon. Échauffe-toi 12 min en Z2 puis quelques lignes droites, en terminant 10 min avant le départ. Pars en Z3 sur les 2 premiers kilomètres sans regarder qui te double, bascule en Z4 du 3e au 8e, et vide ce qu'il te reste sur les 2 derniers. Note ton temps et tes sensations le soir même.",
          "Obtenir un repère chronométré fiable en conditions réelles, à sept semaines de Paris, quand il reste tout le temps de corriger ce que la course aura révélé.",
        ),
        renfo(
          15,
          "Une seule séance, lundi ou mardi : 2 séries de 40 s de planche ventrale, 20 s de gainage sur chaque côté, puis 5 min de mobilité des hanches. Plus rien à partir de mercredi.",
          "Entretenir le gainage sans laisser la moindre courbature dans les cuisses le matin du dossard.",
        ),
      ],
    ),

    semaine(
      10,
      'recuperation-active',
      'On encaisse la course',
      "Deuxième et dernière entorse au rythme trois plus une, et elle découle directement de la première. Tu viens de courir 10 km à fond : un dossard couru à l'objectif coûte plusieurs jours, que tu les prennes ou non. Cette semaine te les donne pendant qu'ils servent encore à quelque chose. Aucune séance de qualité, et c'est volontaire.",
      [
        recup(
          26,
          "26 min en Z1, deux ou trois jours après Izon. Si les jambes restent raides, remplace par 35 min de marche, le bénéfice circulatoire est identique.",
          "Faire circuler le sang dans des jambes qui viennent de vider leurs réserves, ce qui nettoie l'effort bien plus vite que trois jours d'immobilité.",
        ),
        recup(
          30,
          "30 min en Z1 en milieu de semaine. Les sensations vont revenir et tu vas avoir envie d'accélérer : ne le fais pas, la semaine prochaine est là pour ça.",
          "Résister à la tentation de relancer trop tôt, seule erreur capable de transformer une bonne course en trois semaines gâchées.",
        ),
        ef(
          32,
          "32 min en Z2 en fin de semaine, une fois les courbatures parties. C'est la seule sortie de la semaine qui remonte au-dessus de la Z1, et elle reste facile.",
          "Rouvrir doucement le robinet du volume, pour que le bloc spécifique démarre lundi sur des jambes déjà réveillées.",
        ),
        renfo(
          15,
          "15 min de mobilité plutôt que de force : rotations de hanches, ouverture des chevilles, dos rond dos creux au sol, étirements tenus sans forcer sur les ischios et les mollets.",
          "Rendre de l'amplitude aux articulations raidies par la course, sans ajouter la moindre contrainte musculaire.",
        ),
      ],
    ),

    semaine(
      11,
      'bloc3',
      'Ouverture du bloc spécifique',
      "Retour au rythme normal, et cette fois tout le travail regarde vers Paris. Le chrono d'Izon te donne une référence concrète : la Z4 n'est plus une abstraction, tu sais désormais à quoi elle ressemble avec un dossard sur le ventre.",
      [
        ef(
          32,
          "23 min en Z2, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 5 min en Z2. Quatre suffisent : la séance de seuil de la semaine est longue, inutile d'en rajouter.",
          "Remettre de la vivacité dans une foulée qui sort d'une semaine de récupération, au moment précis où le bloc spécifique la redemande.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          46,
          "12 min en Z2, puis 2 fois 10 min en Z4 avec 4 min de trottinement en Z1 entre les deux, puis 10 min en Z2. La difficulté n'est plus l'intensité mais la durée pendant laquelle tu la tiens : le vrai test est de finir le second bloc aussi propre que le premier.",
          "Passer du format court au format long, celui qui ressemble le plus à ce que tu vivras entre le 3e et le 8e kilomètre à Paris.",
        ),
        sl(
          62,
          "1 h 02 en Z2, sur un parcours roulant. Aucun bloc rapide, aucune accélération finale : la sortie longue du bloc spécifique sert de contrepoids aux séances de seuil.",
          "Relancer la sortie longue dès l'ouverture du cycle, pour qu'elle atteigne son plafond sans à-coup deux semaines plus tard.",
        ),
        renfo(
          25,
          "3 séries de : 50 s de planche ventrale, 30 s de gainage latéral par côté, 18 squats, 14 fentes arrière par jambe, 40 s de pont fessier sur une jambe alternée. 1 min de pause.",
          "Remonter le renforcement au niveau du bloc spécifique, le tronc doit être solide avant que la charge de course n'atteigne son maximum.",
        ),
      ],
    ),

    semaine(
      12,
      'bloc3',
      'On resserre les récupérations',
      "Deuxième marche du cycle. Le temps total passé en Z4 ne change presque pas, mais le repos entre les blocs fond : c'est la semaine où l'allure de course cesse d'être menaçante pour devenir simplement familière.",
      [
        ef(
          34,
          "22 min en Z2 sur terrain plat, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 5 min en Z2. Deux jours au moins doivent séparer cette sortie de la séance de seuil.",
          "Entretenir la vitesse de foulée dans une semaine dense, sans jamais entamer la fraîcheur dont les quatre blocs de seuil ont besoin.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          48,
          "13 min en Z2, puis 4 fois 6 min en Z4 avec 2 min seulement de trottinement en Z1 entre chaque, puis 5 min en Z2. Même temps total en Z4 que la semaine passée, avec bien moins de repos pour l'encaisser.",
          "Réduire la récupération plutôt que d'augmenter l'intensité, ce qui rapproche la séance des conditions réelles d'une course continue.",
        ),
        sl(
          68,
          "1 h 08 en Z2 en terrain varié. Si la sortie est matinale, mange quelque chose deux heures avant plutôt que de partir à jeun.",
          "Approcher le plafond de la sortie longue par une marche mesurée, en gardant une semaine de marge avant le sommet.",
        ),
        renfo(
          25,
          "2 séries de : 1 min de planche ventrale, 45 s de gainage latéral par côté, 20 squats, 40 s de chaise contre un mur, 20 fentes marchées, 25 montées sur la pointe des pieds.",
          "Travailler la tenue posturale en état de fatigue, puisque c'est elle qui cède la première sur les derniers kilomètres.",
        ),
      ],
    ),

    semaine(
      13,
      'bloc3',
      'Le sommet de la préparation',
      "La semaine la plus lourde des seize : le plus gros volume, la sortie longue au plafond, et le retour de la Z5. Si tu la finis debout, le 15 novembre est déjà largement à ta portée. À partir de lundi prochain, tout redescend.",
      [
        ef(
          36,
          "36 min en Z2, sans lignes droites : le fractionné de la semaine couvre déjà largement le besoin de vitesse. Cours-la lentement, elle sert de tampon entre les deux plus grosses séances du programme.",
          "Fournir du volume neutre au milieu de la semaine la plus exigeante, sans rien y ajouter qui ressemble à un effort.",
        ),
        vma(
          49,
          "14 min en Z2, puis 12 fois 1 min en Z5 avec 1 min de trottinement en Z1 entre chaque, puis 12 min en Z2. Douze répétitions courtes plutôt que six longues : la différence avec la semaine 7 est le nombre, pas l'intensité.",
          "Porter la vitesse maximale à son point haut, assez tôt pour que ce travail se transforme en aisance d'ici la course.",
        ),
        sl(
          75,
          "1 h 15 en Z2, la plus longue sortie du programme et la seule à ce niveau. Entièrement facile : ce qui compte ici est la durée, jamais l'effort.",
          "Toucher le plafond d'endurance utile pour un 10 km, au-delà duquel on accumule de la fatigue sans rien gagner sur la course.",
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 20 squats, 20 fentes marchées, 45 s de pont fessier une jambe, 30 s de gainage latéral par côté. Étirements complets pour terminer, sans jamais forcer.",
          "Clore le renforcement à son point haut avant de le réduire nettement sur les trois dernières semaines.",
        ),
      ],
    ),

    semaine(
      14,
      'allegee',
      'Dernière respiration',
      "Quatrième et dernière semaine plus douce. Le volume tombe d'environ un quart et l'intensité disparaît complètement. Ce n'est pas encore l'affûtage, c'est la respiration qui le rend possible : on ne peut pas affûter des jambes qui n'ont pas d'abord récupéré.",
      [
        ef(
          32,
          "32 min en Z2 tranquilles. Si une gêne traîne depuis le bloc spécifique, c'est cette semaine qu'il faut la traiter, pas dans dix jours.",
          "Ouvrir une fenêtre pour régler les petits pépins pendant qu'il reste du temps pour les régler sans toucher au plan.",
        ),
        ef(
          36,
          "36 min en Z2 sur parcours plat. Aucune côte, aucune accélération, aucune ligne droite : cette semaine ne contient rien de dur, et c'est délibéré.",
          "Faire retomber la sollicitation nerveuse après trois semaines qui ont toutes compté une séance de qualité.",
        ),
        sl(
          56,
          "56 min en Z2, une vingtaine de minutes de moins qu'au sommet. Termine avec l'envie très nette d'y retourner le lendemain.",
          "Laisser reculer le fond d'un cran pour aborder l'affûtage avec des jambes qui ont vraiment déchargé.",
        ),
        renfo(
          18,
          "2 séries de : 40 s de planche, 15 squats, 10 fentes par jambe. Puis 8 min de mobilité des hanches et des chevilles, sans recherche de force.",
          "Basculer du renforcement vers l'entretien, l'enjeu de la semaine n'est plus de gagner de la force mais d'arriver frais.",
        ),
      ],
    ),

    semaine(
      15,
      'affutage',
      'La séance de vérité',
      "L'affûtage commence. Le volume baisse encore, mais la séance de seuil atteint au contraire son format le plus abouti. Elle te dira, mieux qu'aucune montre, où tu en es réellement à dix jours de Paris.",
      [
        ef(
          30,
          "22 min en Z2, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 4 min en Z2. En début de semaine, et surtout pas la veille du seuil.",
          "Rappeler la vitesse aux jambes en quantité volontairement réduite, quatre accélérations suffisent largement en période d'affûtage.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          46,
          "11 min en Z2, puis 3 fois 8 min en Z4 avec 3 min de trottinement en Z1 entre chaque, puis 5 min en Z2. C'est la séance la plus spécifique du programme : 24 min à l'allure exacte que tu chercheras à Paris. Si les trois blocs se ressemblent, tu es prêt.",
          "Valider l'allure de course sur un volume proche de celui de l'épreuve, à un moment où il reste le temps de récupérer mais plus celui de progresser.",
        ),
        sl(
          36,
          "36 min en Z2 seulement. Après les semaines à plus d'une heure tu vas trouver ça dérisoire, et c'est précisément le but recherché.",
          "Couper franchement dans la sortie longue pour faire remonter la fraîcheur, l'endurance acquise ne se perd pas en dix jours.",
        ),
        renfo(
          15,
          "2 séries de : 30 s de planche ventrale, 20 s de gainage sur chaque côté, 10 squats lents. Puis 5 min d'étirements doux, sans chercher l'amplitude maximale.",
          "Entretenir la posture sans provoquer la moindre courbature à moins de deux semaines de l'échéance.",
        ),
      ],
    ),

    semaine(
      16,
      'affutage',
      'Paris, dimanche',
      "Le volume d'entraînement est divisé par deux. Dimanche 15 novembre, tu cours le 10 km HOKA de Paris. Cette semaine n'a plus qu'une fonction : te déposer sur la ligne de départ frais, reposé et sûr de ton allure.",
      [
        ef(
          30,
          "30 min en Z2 lundi ou mardi, souples, sans rien chercher. Aucune ligne droite cette semaine, la course s'occupera de la vitesse.",
          "Garder le geste de course vivant en évacuant les dernières traces de l'affûtage, sans créer un gramme de fatigue.",
        ),
        seuil(
          26,
          "10 min en Z2, puis 5 fois 1 min en Z4 avec 1 min de trottinement en Z1 entre chaque, puis 7 min en Z2. À faire mercredi au plus tard, jamais après.",
          "Rappeler aux jambes l'allure de dimanche sur une quantité trop faible pour coûter quoi que ce soit en récupération.",
        ),
        course(
          '10 km HOKA de Paris',
          10,
          55,
          "Le jour dit. Échauffe-toi 12 min en Z2 puis 3 ou 4 lignes droites, en finissant 10 min avant le coup de pistolet. Pars en Z3 sur les 2 premiers kilomètres, la foule et le bruit poussent à partir beaucoup trop vite. Bascule en Z4 du 3e au 8e, en te servant du chrono d'Izon comme repère. Sur les 2 derniers, tu vides tout ce qui reste.",
          "Transformer seize semaines de travail en un chrono, avec cette fois un repère de septembre pour partir au bon rythme plutôt qu'à l'aveugle.",
        ),
        renfo(
          12,
          "Une seule séance lundi : 2 séries de 30 s de planche ventrale et 5 min de mobilité des hanches et des chevilles. Plus rien du tout ensuite.",
          "Garder le corps réveillé sans rien lui demander, le travail de fond est terminé depuis des semaines.",
        ),
      ],
    ),

    semaine(
      17,
      'recuperation',
      'Sept jours qui comptent autant que les autres',
      "Aucune intensité, aucun chrono, aucune comparaison avec qui que ce soit. Seize semaines viennent de passer et le corps a besoin d'une semaine pleine pour les digérer. Sauter celle-ci, c'est démarrer la prochaine préparation déjà fatigué.",
      [
        recup(
          26,
          "26 min en Z1, deux ou trois jours après Paris. Terrain plat, allure de promenade courue, et arrêt immédiat si quoi que ce soit tire.",
          "Relancer la circulation dans des jambes qui viennent de tout donner, ce qui accélère nettement le retour des sensations.",
        ),
        recup(
          31,
          "31 min en Z1 en milieu de semaine. Le corps va te dire qu'il est prêt à repartir : il se trompe, il te dit seulement qu'il n'a plus mal.",
          "Distinguer la disparition des courbatures de la vraie récupération, deux choses que les jambes confondent systématiquement.",
        ),
        recup(
          35,
          "35 min en Z1 sur terrain souple, en fin de semaine. Choisis le parcours pour le paysage et laisse la montre à la maison.",
          "Refermer la préparation sur une sortie agréable, ce qui compte autant que le reste pour avoir envie de recommencer.",
        ),
        renfo(
          15,
          "15 min d'étirements et de mobilité : hanches, mollets, ischios, dos, épaules. Respire lentement et tiens chaque position sans jamais chercher la douleur.",
          "Rendre de la souplesse aux chaînes musculaires raidies par seize semaines de course à pied.",
        ),
      ],
    ),
  ],
};
