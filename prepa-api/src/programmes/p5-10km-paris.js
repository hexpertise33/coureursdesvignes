import { ef, sl, tempo, seuil, vma, recup, renfo, course, semaine } from './seances.js';

/**
 * P5, 10 km HOKA de Paris. Seize semaines de préparation plus une de
 * récupération, soit dix-sept entrées.
 *
 * C'est la plus longue des cinq préparations, et la seule qui embarque une
 * course dans son propre déroulé. Le public est celui du club, recalibré comme
 * P1 et P2 : des coureurs qui bouclent le 10 km en moins d'une heure et qui
 * sortent 1 h 15 le dimanche en terrain vallonné. La version précédente était
 * écrite pour quelqu'un capable de courir trente minutes d'affilée et proposait
 * des footings de 30 min et des dimanches de 38 min. Trois sorties
 * hebdomadaires, un renforcement, et l'intensité toujours exprimée en zones 1 à
 * 5, jamais en allure : le groupe part ensemble, chacun règle son curseur sur
 * sa propre respiration.
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
 * enchaîner derrière comme si rien ne s'était passé.
 *
 * Le travail de qualité, quatorze séances et pas un doublon
 * ---------------------------------------------------------
 * Correctif de l'encadrant qui a produit cette version : « ce ne sont pas des
 * débutants, donc varie les séquences ». L'ancienne trame montait par paliers,
 * Z3 puis Z4 puis Z5, et répétait le même bloc de seuil en changeant seulement
 * le nombre de répétitions. Cette progression prudente est abandonnée ici : la
 * semaine 1 travaille déjà en Z4 sur des demi-kilomètres, et aucune séance ne
 * ressemble à celle qui la précède.
 *
 *   S1  bloc1     6 fois 500 m en Z4 ;
 *   S2  bloc1     3 fois 7 min en Z3 ;
 *   S3  bloc1     4 séries de 3 fois 200 m en Z5 ;
 *   S4  allégée   6 montées de 2 min en côte, en Z4 ;
 *   S5  bloc2     2 séries de 4 fois 500 m en Z4 ;
 *   S6  bloc2     3 séries de 4 fois 400 m en Z5 ;
 *   S7  bloc2     10 fois 500 m en Z4, la séance qui prépare Izon ;
 *   S8  allégée   10 fois 200 m en Z5 ;
 *   S9  course    le 10 km d'Izon, couru à l'objectif ;
 *   S10 récup     aucune séance de qualité, et c'est le sujet de la semaine ;
 *   S11 bloc3     3 fois 1000 m puis 3 fois 500 m en Z4 ;
 *   S12 bloc3     4 fois 1000 m puis 4 fois 500 m en Z4 ;
 *   S13 bloc3     5 fois 1000 m puis 4 fois 500 m en Z4, le sommet ;
 *   S14 allégée   2 séries de 3 fois 400 m en Z5 ;
 *   S15 affûtage  2 fois 1000 m puis 4 fois 500 m en Z4 ;
 *   S16 affûtage  2 fois 1000 m en Z4, rappel de la semaine de course.
 *
 * Durée ou distance. Sur 10 km, l'essentiel du travail se repère en mètres, et
 * douze des quatorze séances sont écrites ainsi. Les deux exceptions sont les
 * formats qu'une distance décrirait mal : les blocs en Z3 de S2, et les montées
 * de S4 qu'une pente rend incomparables d'un coureur à l'autre. Les 1000 m,
 * séances reines, n'apparaissent qu'après Izon et occupent alors les six
 * dernières semaines de travail sans exception. Une distance n'est pas une
 * allure : chacun court son kilomètre dans la zone demandée, à son rythme, et
 * la règle « jamais d'allure en min/km ni de vitesse chiffrée » reste absolue.
 *
 * Repère de durée par répétition. La somme des segments décrits doit égaler
 * exactement la durée déclarée, or une distance ne dure pas le même temps pour
 * tout le monde. Chaque séance en distance donne donc son repère, qui sert à
 * faire retomber le calcul juste et à savoir combien de temps prévoir, jamais à
 * imposer un rythme. Repères retenus : environ 4 min pour 1000 m et 8 min 30
 * pour 2000 m en Z4, 2 min pour 500 m en Z4, 1 min 40 pour 400 m et 45 s pour
 * 200 m en Z5. Les douze séances concernées le redisent chacune dans leurs
 * propres mots : c'est une estimation de planification et jamais une allure à
 * tenir. Le coureur le plus lent du groupe ne doit à aucun moment se croire en
 * faute.
 *
 * Conséquence pratique : le format retenu est celui qui fait tomber le compte
 * juste. Les 4 min 15 de récupération des 2000 m, par exemple, ne sortent pas
 * d'un chapeau, c'est exactement la moitié de la répétition.
 *
 * Garde-fou de durée, décision de l'encadrant
 * -------------------------------------------
 *   toute séance de course d'une semaine normale (bloc1, bloc2, bloc3,
 *   allégée, affûtage hors semaine de course) fait au minimum 50 min ;
 *   la sortie longue tient entre 60 et 75 min, 1 h 15 étant l'habitude du
 *   dimanche et le plafond utile sur un 10 km ;
 *   les exceptions sont assumées et nommées dans le texte des semaines
 *   concernées : la semaine d'Izon (S9), la récupération active qui la suit
 *   (S10), la semaine de Paris (S16) et la récupération finale (S17), où des
 *   séances de 30 à 45 min sont le but recherché et non un oubli de saisie.
 *   Le renforcement, entre 12 et 25 min, n'est pas concerné.
 *
 * Barème de volumes, hors course objectif et hors renfo, en minutes :
 * S1 164, S2 176, S3 189, S4 160 (douce), S5 184, S6 197, S7 207,
 * S8 175 (douce), S9 70 (Izon), S10 108 (récupération active), S11 194,
 * S12 205, S13 216 (pic), S14 180 (douce), S15 174, S16 74, S17 106.
 *
 * Le plancher des 50 min contraint le barème par le bas : une semaine normale
 * ne peut pas descendre sous 50 + 50 + 60, soit 160 min, et une semaine plus
 * douce doit tomber à 85 % ou moins de la précédente. Toute semaine suivie
 * d'une semaine douce vaut donc au moins 189 min. C'est le couple S3 / S4 qui
 * est au plus serré, avec 189 puis 160 exactement au plancher.
 *
 * Comment le barème passe le garde-fou
 * ------------------------------------
 * S9 est étiquetée allegee : elle se compare à S8 (175 min) et doit tomber à
 * 148 min ou moins hors course. Ses 70 min y satisfont largement, ce qui est
 * logique puisque la charge de la semaine est portée par la course elle-même,
 * exclue du calcul.
 *
 * S10, en récupération active, suit une semaine qui contient la course
 * objectif. Le garde-fou ne compare donc pas S10 au volume hors course de S9,
 * qui sous-estime grossièrement la charge réelle de cette semaine-là : il
 * remonte à la dernière semaine sans course, S8, et la borne par le pic des
 * blocs atteint jusqu'ici. La référence vaut min(175, 207) = 175, et S10 doit
 * rester sous 148 min. Ses 108 min passent.
 *
 * S11 ouvre le bloc spécifique après deux semaines hors bloc. Sa référence
 * n'est pas S10 mais le pic des blocs accumulé, soit les 207 min de S7 : la
 * remontée à 194 min est une reprise sous le niveau déjà atteint, pas un bond.
 * Le cycle repart de là et monte à 205 puis 216.
 *
 * S8 est le point de tension du barème : elle doit être assez basse pour
 * alléger avant le dossard, et assez haute pour servir de référence tenable à
 * S9 comme à S10. À 175 min, soit une baisse d'un sixième depuis S7, elle
 * remplit les deux rôles.
 *
 * Lignes droites
 * --------------
 * Accélérations de 15 à 20 s en Z5 en fin de footing facile, récupération
 * complète en marchant, logées à l'intérieur de la durée déclarée et jamais
 * ajoutées par-dessus. Introduites à la fin du premier bloc, donc en S3, puis
 * entretenues en S5, S6, S11, S12 et S15. Elles sont écartées des semaines
 * plus douces (S4, S8, S14), de la semaine du pic (S13), de la récupération
 * active (S10) et des deux semaines de course (S9 et S16). La veille d'Izon
 * comporte bien quatre accélérations, mais tenues en Z4 : ce sont des lignes
 * droites de réveil, elles ne comptent pas comme du travail et sont déclarées
 * comme telles.
 *
 * Réconciliation des durées
 * -------------------------
 * Pour N répétitions, N-1 récupérations, celles qui tombent entre deux
 * répétitions. Une séance en séries compte les récupérations courtes à
 * l'intérieur de chaque série, plus une récupération longue entre deux séries.
 * Échauffement plus répétitions plus récupérations plus retour au calme égale
 * exactement la durée déclarée, la répétition étant comptée à son repère.
 * Même arithmétique pour les lignes droites : 4 accélérations de 15 s avec
 * 1 min de marche entre chaque font 4 min, 6 accélérations de 20 s avec 1 min
 * de marche entre chaque font 7 min.
 *
 * Échauffement progressif
 * -----------------------
 * Barème appliqué aux séances TEMPO, SEUIL et VMA, selon leur durée déclarée :
 *   40 min et moins   12 min d'échauffement,  7 min de retour au calme ;
 *   41 à 50 min       15 min d'échauffement,  8 min de retour au calme ;
 *   plus de 50 min    20 min d'échauffement, 10 min de retour au calme.
 * Onze des quatorze séances de qualité dépassent 50 min et tombent sur le
 * 20/10 qui est le standard de l'encadrant. Les trois autres sont les séances
 * volontairement mesurées du programme : l'entrée en matière de S1, les blocs
 * en Z3 de S2 et la côte de S4 sont à 50 min pile, donc au palier 15/8, et le
 * rappel de la semaine de course tombe à 31 min, donc au palier 12/7. Les
 * séances EF, SL, RECUP et RENFO n'ont pas d'échauffement séparé et ne sont pas
 * concernées.
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
  prerequis:
    "Sortir déjà 1 h 15 le dimanche en terrain vallonné et passer sous l'heure sur un 10 km.",
  semainesContenu: [
    semaine(
      1,
      'bloc1',
      "L'allure de course dès le premier jour",
      "Seize semaines, c'est long, et c'est une chance. Ce n'est pas une raison pour passer le premier mois à trottiner : la préparation s'ouvre directement sur des demi-kilomètres en Z4, une dose modeste et des récupérations larges, pour que la zone qui décidera du chrono cesse d'être une inconnue dès la première semaine.",
      [
        ef(
          54,
          "54 min en Z2 sur terrain plat. Le repère est ta voix : tant que tu peux répondre à une question par une vraie phrase, tu es dans la bonne zone.",
          "Fixer dès la première sortie la sensation de la Z2, puisque c'est elle qui portera les trois quarts des seize semaines à venir.",
        ),
        seuil(
          50,
          "15 min d'échauffement en Z2, puis 6 fois 500 m en Z4, en comptant environ 2 min par 500 m, avec 3 min de trottinement en Z1 entre chaque, puis 8 min de retour au calme en Z2. Ces 2 min sont une estimation de planification et jamais une allure à tenir : ce qui fait foi, c'est la Z4, c'est-à-dire trois ou quatre mots à la fois et pas une phrase entière. Récupérations plus longues que l'effort, exprès, pour cette première fois.",
          "Mettre l'intensité de la course dans les jambes dès la semaine d'ouverture, sur des morceaux courts et largement espacés, parce qu'une zone qu'on découvre en semaine 8 se paie ensuite en semaines perdues.",
        ),
        sl(
          60,
          "1 h en Z2 sans interruption. Les dix premières minutes doivent te sembler ridiculement lentes, sinon tu es parti trop vite.",
          "Reprendre le dimanche là où ton habitude le laisse, sans l'allonger, puisqu'il montera par petites marches jusqu'à 1 h 15 en fin de préparation.",
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
      'Trois blocs pour apprendre à durer',
      "Changement complet de terrain. La semaine passée hachait l'effort en morceaux de deux minutes, celle-ci le tient sept minutes d'affilée, mais un cran plus bas. La Z3 se travaille sans crispation : soutenue, présente dans la respiration, jamais douloureuse.",
      [
        ef(
          62,
          "1 h 02 en Z2, à placer à distance de la séance de qualité. Ni la veille, ni le lendemain si tu peux l'éviter.",
          "Apprendre dès la deuxième semaine à espacer les sorties, un réflexe de calendrier qui évitera bien des séances ratées plus tard.",
        ),
        tempo(
          50,
          "15 min d'échauffement en Z2, puis 3 fois 7 min en Z3 avec 3 min de trottinement en Z1 entre chaque, puis 8 min de retour au calme en Z2. En Z3 tu parles encore, mais par bouts de phrase et on entend ton souffle. Le troisième bloc doit ressembler au premier, sinon c'est le premier qui était trop rapide.",
          "Installer une intensité intermédiaire qu'on tient longtemps, celle qui manque à un coureur habitué à n'avoir que deux vitesses, la promenade et la bagarre.",
        ),
        sl(
          64,
          "1 h 04 en Z2. Quatre minutes de plus que la semaine dernière, c'est tout ce qu'on ajoute : le dimanche se construit par répétition, pas par exploit.",
          "Faire progresser la durée de course continue par des marches assez petites pour que le corps ne les remarque pas.",
        ),
        renfo(
          20,
          "Reprends la séance de la semaine 1, et ajoute 2 séries de 30 s de pont fessier, allongé sur le dos, bassin décollé, talons ancrés au sol.",
          "Répéter un enchaînement déjà connu en y greffant les fessiers, moteur de la propulsion que le coureur oublie systématiquement.",
        ),
      ],
    ),

    semaine(
      3,
      'bloc1',
      'Clôture du premier bloc',
      "Semaine la plus chargée des quatre premières, et celle qui fait entrer la vitesse pure. Douze fractions de 200 m coupées en quatre séries : c'est court, c'est vif, et c'est le seul moment du programme où l'on court aussi vite. Les lignes droites entrent en fin de footing dans la foulée.",
      [
        ef(
          68,
          "57 min en Z2 en démarrant très doucement, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 7 min en Z2. Une ligne droite se construit en montant progressivement en vitesse, et se relâche avant la fin : tu ne dois jamais terminer en apnée.",
          "Introduire de la vitesse par des efforts trop brefs pour fatiguer quoi que ce soit, ce qui prépare le terrain nerveux des blocs suivants.",
          { zonesSecondaires: ['Z5'] },
        ),
        vma(
          53,
          "20 min d'échauffement en Z2, puis 4 séries de 3 fois 200 m en Z5, en comptant environ 45 s par 200 m, avec 1 min de trottinement en Z1 entre chaque et 2 min entre les séries, puis 10 min de retour au calme en Z2. Ce repère de 45 s est une estimation de planification et jamais une allure à tenir : sur 200 m, le seul indicateur valable est qu'aucun mot ne sorte à l'arrivée.",
          "Découper la vitesse maximale en très petites séries pour qu'elle reste propre du début à la fin, une foulée qui se déforme n'apprend rien à personne.",
        ),
        sl(
          68,
          "1 h 08 en Z2 d'une seule traite. Repère à l'avance une boucle que tu peux raccourcir en cours de route si la journée tourne mal.",
          "Pousser le dimanche à son plus haut niveau du premier cycle, dernier palier avant la première semaine plus douce.",
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
      "Un cinquième de volume en moins, et un seul exercice dur : six montées de deux minutes. Les trois sorties gardent leurs cinquante minutes, on ne raccourcit pas les séances, on retire la fatigue. Tu vas la trouver trop facile, c'est exactement ce qu'on cherche : les progrès des trois semaines écoulées se fixent maintenant.",
      [
        ef(
          50,
          "50 min en Z2, sans montre si tu t'en sens capable. Cours à la sensation, uniquement, et rentre avant d'en avoir envie.",
          "Débrancher le réflexe de mesurer, parce qu'une semaine plus douce se juge à la fraîcheur du lundi suivant et à rien d'autre.",
        ),
        seuil(
          50,
          "15 min d'échauffement en Z2 jusqu'au pied de la côte, puis 6 montées de 2 min en côte en Z4, avec 3 min de descente en marchant entre chaque, puis 8 min de retour au calme en Z2. Cherche une pente régulière et roulante plutôt qu'un mur, et redescends au pas sans jamais courir la descente. Douze minutes de montée en tout, pas une de plus.",
          "Faire travailler la poussée sur le relief que ces coureurs pratiquent tous les dimanches, la pente imposant d'elle-même la retenue qu'une semaine de respiration exige.",
        ),
        sl(
          60,
          "1 h en Z2, un quart d'heure de moins que ton dimanche habituel et volontairement. Termine avec la sensation nette d'avoir de la réserve.",
          "Garder le rendez-vous hebdomadaire du dimanche tout en coupant réellement dans la charge, ce qui n'est pas contradictoire.",
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
      'Le seuil en deux séries',
      "Deuxième cycle. On revient au demi-kilomètre de la semaine 1, mais il y en a deux fois plus, et la récupération a fondu de moitié. Le découpage en deux séries est ce qui rend la dose possible : la coupure du milieu n'est pas un aveu de faiblesse, c'est l'outil qui permet de tenir huit fractions propres.",
      [
        ef(
          61,
          "50 min en Z2, à placer le surlendemain du seuil et jamais la veille, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 4 min en Z2.",
          "Produire du volume utile un jour où le corps digère encore la séance dure, tout en gardant le pied vif après la semaine calme.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          58,
          "20 min d'échauffement en Z2, puis 2 séries de 4 fois 500 m en Z4, en comptant environ 2 min par 500 m, avec 1 min 30 de trottinement en Z1 entre chaque et 3 min entre les deux séries, puis 10 min de retour au calme en Z2. Ces 2 min sont une estimation de planification et jamais une allure à tenir. La seconde série doit sortir exactement comme la première, c'est le seul jugement à porter sur la séance.",
          "Multiplier par deux le nombre de fractions au seuil tout en raccourcissant le repos, la manière la plus économique d'augmenter la charge sans toucher à l'intensité.",
        ),
        sl(
          65,
          "1 h 05 en Z2 sur un parcours légèrement vallonné. Dans les montées, garde le souffle sous contrôle quitte à ralentir beaucoup, la pente n'est pas un adversaire.",
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
      'Ouvrir le plafond de vitesse',
      "La seule semaine du deuxième cycle qui monte en Z5, et elle le fait sur 400 m, deux fois plus long que les fractions de la semaine 3. Douze répétitions rangées en trois séries : on cherche l'ouverture de la foulée et la fréquence d'appui, jamais l'épuisement.",
      [
        ef(
          62,
          "51 min en Z2 sur un parcours que tu connais par cœur, pour n'avoir à réfléchir ni à l'itinéraire ni au dénivelé, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 7 min en Z2.",
          "Ajouter du volume facile dans une semaine qui monte déjà, en entretenant la fréquence d'appui sans coûter la moindre fraîcheur.",
          { zonesSecondaires: ['Z5'] },
        ),
        vma(
          65,
          "20 min d'échauffement en Z2, puis 3 séries de 4 fois 400 m en Z5, en comptant environ 1 min 40 par 400 m, avec 1 min de trottinement en Z1 entre chaque et 3 min entre les séries, puis 10 min de retour au calme en Z2. Ce 1 min 40 est une estimation de planification et jamais une allure à tenir. Une minute de récupération seulement à l'intérieur d'une série : c'est court, et c'est ce qui fait le prix de la séance.",
          "Porter la vitesse haute sur des fractions assez longues pour que la foulée doive tenir, et assez groupées pour que le souffle ne redescende jamais tout à fait.",
        ),
        sl(
          70,
          "1 h 10 en Z2. Emporte de quoi boire et prends quelques gorgées vers la trentième minute, même sans soif, pour installer l'habitude.",
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
      'Cinq kilomètres au seuil, avant Izon',
      "Semaine la plus lourde depuis le début et la plus spécifique du premier tiers : cinq kilomètres à l'allure du dossard, en dix fractions de 500 m. C'est la séance qui te dira, deux semaines avant Izon, si l'objectif que tu vises est raisonnable.",
      [
        ef(
          65,
          "1 h 05 en Z2, sans aucune ligne droite cette semaine : la séance au seuil demande toute la fraîcheur disponible. Si tu te sens émoussé, descends la sortie entière en Z1, c'est sans conséquence.",
          "Absorber la semaine la plus dure du deuxième bloc sans y greffer le moindre effort supplémentaire.",
        ),
        seuil(
          68,
          "20 min d'échauffement en Z2, puis 10 fois 500 m en Z4, en comptant environ 2 min par 500 m, avec 2 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ce repère de 2 min est une estimation de planification et jamais une allure à tenir. Dix fractions, c'est long : la dixième doit sortir comme la deuxième, sinon tu as ouvert trop fort.",
          "Accumuler pour la première fois la moitié de la distance de course à son intensité, en gardant des coupures assez fréquentes pour que la forme ne s'effondre pas.",
        ),
        sl(
          74,
          "1 h 14 en Z2. Choisis un jour où tu n'as rien de prévu derrière et pars sans heure de retour en tête.",
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
      "Le volume baisse d'un sixième et la séance de qualité se réduit à sept minutes et demie de travail réel. Cette semaine n'est pas une pause ordinaire : elle prépare directement le 10 km d'Izon de dimanche prochain. Arriver frais à un dossard se décide neuf jours avant, pas la veille.",
      [
        ef(
          61,
          "1 h 01 en Z2 très souple. Aucune bosse cherchée exprès, aucune accélération, aucun objectif autre que de te sentir bien en rentrant.",
          "Laisser souffler le système nerveux, qui fatigue plus vite que les muscles sur les semaines chargées en intensité.",
        ),
        vma(
          51,
          "20 min d'échauffement en Z2, puis 10 fois 200 m en Z5, en comptant environ 45 s par 200 m, avec 1 min 30 de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ce repère de 45 s est une estimation de planification et jamais une allure à tenir. Sept minutes et demie de travail au total : tu dois rentrer en te disant que ce n'était pas grand-chose, c'est le but de la semaine.",
          "Garder le pied réveillé à dose homéopathique la semaine qui précède un dossard, puisque tout ce qu'on ajoute maintenant se retrouvera dans les jambes dimanche prochain.",
        ),
        sl(
          63,
          "1 h 03 en Z2, la seule séance un peu longue de la semaine. Facile de bout en bout : si tu accélères sur la fin, tu as manqué l'objectif de la semaine.",
          "Conserver le fond d'endurance pendant une semaine sans charge, il ne se garde qu'en le pratiquant régulièrement.",
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
      "Rupture assumée du rythme trois plus une : dimanche 27 septembre, tu cours le 10 km d'Izon, et il fait partie de ta préparation, pas de tes loisirs. Les deux sorties de la semaine font 40 et 30 min là où tu tournes à une heure depuis deux mois. Ce n'est pas une erreur de saisie, c'est voulu : la charge de la semaine est déplacée sur la course elle-même.",
      [
        ef(
          40,
          "40 min en Z2 lundi ou mardi, pas plus tard. Aucune accélération, aucune côte, aucune envie de tester tes jambes avant dimanche. Séance volontairement courte, tout ce qui dépasse cette dose sert la fatigue et pas le chrono.",
          "Rester en mouvement après le week-end sans entamer la fraîcheur qui doit être entière au départ, cinq jours plus tard.",
        ),
        ef(
          30,
          "Vendredi, tu ne fais rien : ni course, ni renfo, ni sortie de compensation. Samedi, 23 min en Z2, puis 4 lignes droites de 15 s en Z4 avec 1 min de marche entre chaque, soit 4 min, puis 3 min en Z2. On reste en Z4 et pas au-dessus, ces accélérations réveillent la foulée sans jamais l'entamer.",
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
      "Deuxième et dernière entorse au rythme trois plus une, et elle découle directement de la première. Tu viens de courir 10 km à fond : un dossard couru à l'objectif coûte plusieurs jours, que tu les prennes ou non. Trois sorties de 30 à 45 min, aucune séance de qualité, et c'est le sujet même de la semaine, pas un trou dans le plan.",
      [
        recup(
          30,
          "30 min en Z1, deux ou trois jours après Izon. Si les jambes restent raides, remplace par 35 min de marche, le bénéfice circulatoire est identique.",
          "Faire circuler le sang dans des jambes qui viennent de vider leurs réserves, ce qui nettoie l'effort bien plus vite que trois jours d'immobilité.",
        ),
        recup(
          33,
          "33 min en Z1 en milieu de semaine. Les sensations vont revenir et tu vas avoir envie d'accélérer : ne le fais pas, la semaine prochaine est là pour ça.",
          "Résister à la tentation de relancer trop tôt, seule erreur capable de transformer une bonne course en trois semaines gâchées.",
        ),
        ef(
          45,
          "45 min en Z2 en fin de semaine, une fois les courbatures parties. C'est la seule sortie de la semaine qui remonte au-dessus de la Z1, et elle reste facile. Trois quarts d'heure au lieu de l'heure et quart habituelle, encore une fois à dessein.",
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
      'Le kilomètre entre en scène',
      "Retour au rythme normal, et cette fois tout le travail regarde vers Paris. Le kilomètre devient l'unité de mesure et ne la quittera plus jusqu'à la course. Le chrono d'Izon te donne une référence concrète : la Z4 n'est plus une abstraction, tu sais désormais à quoi elle ressemble avec un dossard sur le ventre.",
      [
        ef(
          65,
          "54 min en Z2, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 7 min en Z2. Quatre suffisent : la séance de seuil de la semaine est longue, inutile d'en rajouter.",
          "Remettre de la vivacité dans une foulée qui sort d'une semaine de récupération, au moment précis où le bloc spécifique la redemande.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          63,
          "20 min d'échauffement en Z2, puis 3 fois 1000 m puis 3 fois 500 m en Z4, en comptant environ 4 min par 1000 m et 2 min par 500 m, avec 3 min de trottinement en Z1 entre chaque bloc, puis 10 min de retour au calme en Z2. Ces deux repères sont une estimation de planification et jamais une allure à tenir. Les 500 m de la fin doivent être les morceaux les plus faciles de la séance, sinon les kilomètres du début étaient trop rapides.",
          "Aborder la distance de référence par un enchaînement descendant, pour que le bloc spécifique s'ouvre sur une réussite plutôt que sur une lutte.",
        ),
        sl(
          66,
          "1 h 06 en Z2, sur un parcours roulant. Aucun bloc rapide, aucune accélération finale : le dimanche du bloc spécifique sert de contrepoids aux séances au kilomètre.",
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
      'Un kilomètre de plus de chaque côté',
      "Deuxième marche du cycle, et la séance de la semaine passée grandit des deux bouts : un kilomètre de plus devant, un demi-kilomètre de plus derrière, et la récupération raccourcie d'une minute. Six kilomètres à l'allure de course en tout, c'est la semaine où cette allure cesse d'être menaçante pour devenir familière.",
      [
        ef(
          67,
          "56 min en Z2 sur terrain plat, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 4 min en Z2. Deux jours au moins doivent séparer cette sortie de la séance de seuil.",
          "Entretenir la vitesse de foulée dans une semaine dense, sans jamais entamer la fraîcheur dont les huit blocs de seuil ont besoin.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          68,
          "20 min d'échauffement en Z2, puis 4 fois 1000 m puis 4 fois 500 m en Z4, en comptant environ 4 min par 1000 m et 2 min par 500 m, avec 2 min de trottinement en Z1 entre chaque bloc, puis 10 min de retour au calme en Z2. Ces deux repères sont une estimation de planification et jamais une allure à tenir. Huit coupures de deux minutes seulement : ce qui augmente ici, c'est le nombre de relances, pas l'intensité.",
          "Réduire la récupération plutôt que d'augmenter l'allure, ce qui rapproche la séance des conditions réelles d'une course continue sans jamais franchir la zone.",
        ),
        sl(
          70,
          "1 h 10 en Z2 en terrain varié. Si la sortie est matinale, mange quelque chose deux heures avant plutôt que de partir à jeun.",
          "Approcher le plafond du dimanche par une marche mesurée, en gardant une semaine de marge avant le sommet.",
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
      "La semaine la plus lourde des seize : le plus gros volume, le dimanche au plafond, et sept kilomètres passés à l'allure de Paris. Cinq kilomètres réguliers puis quatre demi-kilomètres sur des jambes déjà chargées, exactement ce que sera la fin de la course. Si tu la finis debout, le 15 novembre est largement à ta portée. À partir de lundi prochain, tout redescend.",
      [
        ef(
          67,
          "1 h 07 en Z2, sans lignes droites : la séance au seuil couvre déjà tout le besoin cette semaine. Cours-la lentement, elle sert de tampon entre les deux plus grosses séances du programme.",
          "Fournir du volume neutre au milieu de la semaine la plus exigeante, sans rien y ajouter qui ressemble à un effort.",
        ),
        seuil(
          74,
          "20 min d'échauffement en Z2, puis 5 fois 1000 m puis 4 fois 500 m en Z4, en comptant environ 4 min par 1000 m et 2 min par 500 m, avec 2 min de trottinement en Z1 entre chaque bloc, puis 10 min de retour au calme en Z2. Ces deux repères sont une estimation de planification et jamais une allure à tenir. Les quatre derniers morceaux arrivent après cinq kilomètres au seuil : c'est là, et nulle part ailleurs, que la séance a de la valeur.",
          "Passer sept kilomètres à l'intensité du dossard en réservant les fractions courtes à la fatigue de fin de séance, seule façon de répéter à l'entraînement ce qui se passe réellement après le huitième kilomètre.",
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
      "Quatrième et dernière semaine plus douce. Le volume tombe d'un sixième et le travail spécifique disparaît complètement : six fractions de 400 m, rien de plus. Ce n'est pas encore l'affûtage, c'est la respiration qui le rend possible, on n'affûte pas des jambes qui n'ont pas d'abord récupéré.",
      [
        ef(
          66,
          "1 h 06 en Z2 tranquilles. Si une gêne traîne depuis le bloc spécifique, c'est cette semaine qu'il faut la traiter, pas dans dix jours.",
          "Ouvrir une fenêtre pour régler les petits pépins pendant qu'il reste du temps pour les régler sans toucher au plan.",
        ),
        vma(
          52,
          "20 min d'échauffement en Z2, puis 2 séries de 3 fois 400 m en Z5, en comptant environ 1 min 40 par 400 m, avec 2 min de trottinement en Z1 entre chaque et 4 min entre les deux séries, puis 10 min de retour au calme en Z2. Ce 1 min 40 est une estimation de planification et jamais une allure à tenir. Dix minutes de travail réparties sur une heure : la séance doit paraître dérisoire.",
          "Réveiller la foulée sans toucher au seuil, à un moment où la seule chose qui doive encore progresser est la fraîcheur.",
        ),
        sl(
          62,
          "1 h 02 en Z2, treize minutes de moins qu'au sommet. Termine avec l'envie très nette d'y retourner le lendemain.",
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
      'Quatre kilomètres qui disent tout',
      "L'affûtage commence. Le volume baisse encore, mais la séance de seuil atteint son format le plus abouti : deux kilomètres puis quatre demi-kilomètres, avec une minute de récupération à peine entre les blocs. Quatre kilomètres à l'allure exacte de Paris, presque sans coupure. Elle te dira, mieux qu'aucune montre, où tu en es à dix jours de la course.",
      [
        ef(
          63,
          "52 min en Z2, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 7 min en Z2. En début de semaine, et surtout pas la veille du seuil.",
          "Rappeler la vitesse aux jambes en quantité volontairement réduite, quatre accélérations suffisent largement en période d'affûtage.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          51,
          "20 min d'échauffement en Z2, puis 2 fois 1000 m puis 4 fois 500 m en Z4, en comptant environ 4 min par 1000 m et 2 min par 500 m, avec 1 min de trottinement en Z1 entre chaque bloc, puis 10 min de retour au calme en Z2. Ces deux repères sont une estimation de planification et jamais une allure à tenir. Une minute de coupure seulement : c'est presque de la course continue, et c'est exactement l'intention.",
          "Vérifier que l'allure visée tient sur quatre kilomètres quasiment enchaînés, à un moment où il reste le temps de récupérer mais plus celui de progresser.",
        ),
        sl(
          60,
          "1 h en Z2 seulement. Après les semaines à 1 h 15 tu vas trouver ça court, et c'est précisément le but recherché.",
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
      "Le volume d'entraînement est divisé par deux et les deux séances tombent à 43 et 31 min, très loin de tes habitudes des seize dernières semaines. C'est volontaire et c'est la seule chose à faire. Dimanche 15 novembre, tu cours le 10 km HOKA de Paris : cette semaine n'a plus qu'une fonction, te déposer sur la ligne de départ frais, reposé et sûr de ton allure.",
      [
        ef(
          43,
          "43 min en Z2 lundi ou mardi, souples, sans rien chercher. Aucune ligne droite cette semaine, la course s'occupera de la vitesse. Séance courte à dessein, ce qui dépasse cette dose ne te rapporte plus rien.",
          "Garder le geste de course vivant en évacuant les dernières traces de l'affûtage, sans créer un gramme de fatigue.",
        ),
        seuil(
          31,
          "12 min d'échauffement en Z2, puis 2 fois 1000 m en Z4, en comptant environ 4 min par 1000 m, avec 4 min de trottinement en Z1 entre chaque, puis 7 min de retour au calme en Z2. Ces 4 min sont une estimation de planification et jamais une allure à tenir. À faire mercredi au plus tard, jamais après : deux kilomètres, c'est un rappel et pas un entraînement.",
          "Remettre en jambes l'intensité de dimanche sur la distance de référence du programme, en quantité trop faible pour coûter quoi que ce soit en récupération.",
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
      "Aucune intensité, aucun chrono, aucune comparaison avec qui que ce soit. Des sorties de 32 à 39 min, soit la moitié de ce que tu fais d'ordinaire : cette brièveté est voulue, elle est la séance elle-même et non un reliquat du programme. Sauter cette semaine, c'est démarrer la prochaine préparation déjà fatigué.",
      [
        recup(
          32,
          "32 min en Z1, deux ou trois jours après Paris. Terrain plat, allure de promenade courue, et arrêt immédiat si quoi que ce soit tire.",
          "Relancer la circulation dans des jambes qui viennent de tout donner, ce qui accélère nettement le retour des sensations.",
        ),
        recup(
          35,
          "35 min en Z1 en milieu de semaine. Le corps va te dire qu'il est prêt à repartir : il se trompe, il te dit seulement qu'il n'a plus mal.",
          "Distinguer la disparition des courbatures de la vraie récupération, deux choses que les jambes confondent systématiquement.",
        ),
        recup(
          39,
          "39 min en Z1 sur terrain souple, en fin de semaine. Choisis le parcours pour le paysage et laisse la montre à la maison.",
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
