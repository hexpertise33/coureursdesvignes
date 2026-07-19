import { ef, sl, tempo, seuil, vma, recup, renfo, course, semaine } from './seances.js';

/**
 * P2, 10 km de Bordeaux. Quinze semaines de préparation plus une de
 * récupération, soit seize entrées.
 *
 * Programme recalibré sur le niveau réel du groupe, comme P1 avant lui.
 * Correctif de l'encadrant : ses coureurs passent tous sous l'heure au 10 km et
 * sortent déjà 1 h 15 le dimanche en terrain vallonné. Le calibrage précédent,
 * écrit pour quelqu'un qui tient trente minutes de course continue, alignait
 * des footings de 28 et 30 min et une sortie longue de 38 min : personne dans
 * ce club ne s'entraîne comme ça. Trois séances de course par semaine, une
 * séance de renforcement, aucune allure chiffrée, l'intensité se lit en zones 1
 * à 5 et chacun règle son curseur sur sa propre respiration.
 *
 * Ce qui change vraiment par rapport à la version pour débutants
 * -------------------------------------------------------------
 * Le volume, d'abord : 165 min en semaine 1 au lieu de 100, 215 min au pic au
 * lieu de 162. La forme du travail de qualité, ensuite, et c'est le second
 * correctif de l'encadrant : « ce ne sont pas des débutants, donc varie les
 * séquences ». L'ancienne trame montait par paliers d'intensité, deux semaines
 * de Z3 puis deux de Z4 puis la Z5, et répétait trois fois le même bloc de
 * seuil en changeant seulement le nombre de répétitions. Cette prudence-là
 * s'adresse à un coureur qui découvre l'intensité. Le groupe court à l'année :
 * la règle « Z3 avant Z4 avant Z5 » ne commande plus rien ici, et la semaine 1
 * s'ouvre directement sur des fractions de 200 m.
 *
 * Le menu, semaine par semaine, quinze séances et pas un doublon :
 *   S1  bloc1     3 séries de 4 fois 200 m en Z5 ;
 *   S2  bloc1     2 fois 12 min en Z3, effort soutenu en durée ;
 *   S3  bloc1     9 fois 400 m en Z5 ;
 *   S4  allégée   10 montées de 45 s en côte, entre Z4 et Z5 ;
 *   S5  bloc2     8 fois 500 m en Z4, entrée dans l'allure de course ;
 *   S6  bloc2     2 fois 2000 m puis 2 fois 500 m en Z4 ;
 *   S7  bloc2     30 min en Z3 d'un seul tenant ;
 *   S8  allégée   2 séries de 5 fois 200 m en Z5 ;
 *   S9  bloc3     4 fois 1000 m en Z4, ou la course-test à Izon ;
 *   S10 bloc3     2 séries de 3 fois 1000 m en Z4 ;
 *   S11 bloc3     2 fois 2000 m puis 4 fois 500 m en Z4 ;
 *   S12 allégée   6 fois 400 m en Z5 ;
 *   S13 bloc3     7 fois 1000 m en Z4, la séance reine du pic ;
 *   S14 affûtage  3 fois 1000 m puis 2 fois 500 m en Z4 ;
 *   S15 affûtage  4 fois 500 m en Z4, rappel de la semaine de course.
 *
 * Durée ou distance
 * -----------------
 * Sur 10 km, l'essentiel du travail de qualité se repère en mètres, et le
 * programme s'y tient : douze séances sur quinze sont écrites en distance. Les
 * trois exceptions sont les formats qu'une distance décrirait mal, les deux
 * blocs en Z3 de S2, le tempo continu de S7 et les montées de S4, qu'une pente
 * rend incomparables d'un coureur à l'autre. Les 1000 m, séances reines d'une
 * prépa 10 km, sont volontairement massés dans la seconde moitié : rien avant
 * S9, puis cinq séances sur les sept dernières. Une distance n'est pas une
 * allure : chacun court son 1000 m dans la zone demandée, à son rythme, et la
 * règle « jamais d'allure en min/km ni de vitesse chiffrée » reste absolue.
 *
 * Repère de durée par répétition. Le projet impose que la somme des segments
 * décrits égale exactement la durée déclarée de la séance. Une distance, elle,
 * ne dure pas le même temps pour tout le monde. Chaque séance en distance donne
 * donc un repère par répétition, qui sert à deux choses et à deux seulement :
 * faire retomber le calcul juste, et permettre au coureur de savoir combien de
 * temps prévoir. Repères retenus, cohérents avec un groupe qui passe sous
 * l'heure au 10 km : environ 4 min pour 1000 m et 8 min 30 pour 2000 m en Z4,
 * 2 min pour 500 m en Z4, 1 min 40 pour 400 m et 45 s pour 200 m en Z5. Chacune
 * des douze séances en distance redit, dans ses propres mots, que ce repère est
 * une estimation de planification et jamais une allure à tenir.
 *
 * Corollaire : le format retenu est celui qui fait tomber le compte juste. Les
 * séries de S1, S8 et S10 ne sont pas décoratives, elles sont ce qui rend la
 * séance calculable à la minute près, et elles ont par ailleurs du sens à
 * l'entraînement. Même remarque pour les 2 min 10 de descente de la côte de S4.
 *
 * Garde-fou de durée, décision de l'encadrant
 * -------------------------------------------
 *   toute séance de course d'une semaine normale (bloc1, bloc2, bloc3,
 *   allégée, et par extension le premier palier d'affûtage) fait au minimum
 *   50 min ;
 *   la sortie longue tient dans la fourchette 60 à 75 min, 1 h 15 étant leur
 *   habitude du dimanche et le plafond utile sur un 10 km ;
 *   deux exceptions assumées, la semaine de course (S15, et S9 pour qui prend
 *   le dossard d'Izon) et la semaine de récupération (S16), où des séances de
 *   30 à 45 min sont le but recherché et non un oubli. Les textes de ces
 *   semaines-là le disent explicitement, pour qu'un coureur habitué à une heure
 *   ne croie pas à une erreur de saisie.
 *   Le renforcement, lui, reste entre 12 et 25 min et n'est pas concerné.
 *
 * Trame en cycles de trois plus une, inchangée :
 *
 *   S1 S2 S3 progressives, S4 plus douce
 *   S5 S6 S7 progressives, S8 plus douce
 *   S9 S10 S11 progressives, S12 plus douce
 *   S13 progressive, pic de charge
 *   S14 S15 affûtage, course le dernier jour de S15
 *   S16 récupération
 *
 * La liste blanche des phases ne connaît que trois étiquettes de bloc. Le
 * quatrième cycle, réduit à la seule S13, est donc étiqueté bloc3 lui aussi :
 * c'est le sommet du bloc spécifique, relancé après la respiration de S12.
 *
 * La course a lieu le dimanche 8 novembre 2026, dernier jour de la semaine 15.
 * La semaine 9 tombe exactement sur le week-end du 10 km d'Izon, le 27
 * septembre : c'est ce qui rend la double variante possible.
 *
 * Barème de volumes, hors course objectif et hors renfo, en minutes :
 * S1 165, S2 178, S3 190, S4 160, S5 185, S6 196, S7 205, S8 172,
 * S9 190 sans Izon et 70 avec Izon, S10 202, S11 212, S12 175,
 * S13 215 (pic), S14 170, S15 75, S16 120.
 *
 * Le plancher des 50 min contraint le barème par le bas : une semaine normale
 * ne peut pas descendre sous 50 + 50 + 60, soit 160 min. Comme une semaine
 * allégée doit tomber à 85 % ou moins de la précédente, aucune semaine qui en
 * précède une plus douce ne peut valoir moins de 160 / 0,85, soit 189 min. S3
 * est donc à 190 et S4 exactement au plancher : c'est le point le plus serré du
 * programme, et c'est lui qui fixe la côte de S4 à 50 min tout rond.
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
 * référence est le pic des blocs atteint jusque-là (205 min en S7), et S10 se
 * compare ensuite à S9. Avec Izon, S9 est allégée et se compare à S8 : 70 min
 * pèsent bien moins que les 146 autorisés. S10, qui est un bloc précédé d'une
 * semaine hors bloc, repart lui aussi du pic des blocs. La règle des 10 % ne
 * compare donc jamais S10 au volume hors course d'une semaine qui contient la
 * course-test.
 *
 * Lignes droites, décision de l'encadrant. Des accélérations de 15 à 20 s en
 * Z5 sont placées en fin d'endurance à partir de la fin du bloc 1, donc en S3,
 * puis entretenues en S5, S6, S9, S10, S11 et S14. Elles sont écartées des
 * semaines plus douces (S4, S8, S12), de la semaine du pic (S13) et de la
 * semaine de course (S15). La variante avec Izon de la semaine 9 fait exception
 * avec quatre lignes droites la veille de la course, tenues en Z4 et non en
 * Z5 : ce sont des lignes droites de réveil, pas de travail.
 *
 * Convention de calcul des séances à intervalles : pour N répétitions, N-1
 * récupérations, celles qui tombent entre deux répétitions. Une séance en
 * séries compte les récupérations courtes à l'intérieur de chaque série, plus
 * une récupération longue entre deux séries. Échauffement plus répétitions plus
 * récupérations plus retour au calme égale exactement la durée déclarée. Même
 * règle pour les lignes droites, qui se logent à l'intérieur de la durée de
 * l'endurance et ne s'y ajoutent pas : 4 lignes de 15 s avec 1 min de marche
 * entre chaque font 4 min, 6 lignes de 20 s avec 1 min de marche entre chaque
 * font 7 min. Pour une séance en distance, la répétition est comptée à son
 * repère de durée.
 *
 * Échauffement progressif, décision de l'encadrant. Barème appliqué aux séances
 * TEMPO, SEUIL et VMA, en fonction de leur durée déclarée :
 *   40 min et moins   12 min d'échauffement,  7 min de retour au calme ;
 *   41 à 50 min       15 min d'échauffement,  8 min de retour au calme ;
 *   plus de 50 min    20 min d'échauffement, 10 min de retour au calme.
 * Treize des quinze séances de qualité dépassent 50 min et tombent donc sur le
 * 20/10 qui est le standard de l'encadrant. Les deux autres sont les deux
 * séances volontairement courtes du programme, la côte de la semaine allégée
 * (50 min, palier 15/8) et le rappel de la semaine de course (33 min, palier
 * 12/7). Les séances EF, SL, RECUP et RENFO n'ont pas d'échauffement séparé et
 * ne sont pas concernées.
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
  "Pas de dossard cette semaine : le troisième cycle démarre tout de suite. Trois semaines qui montent devant toi, celle-ci en est la première marche, et le travail de qualité entre enfin sur la distance de référence d'une prépa 10 km, le kilomètre.",
  [
    ef(
      66,
      "55 min en Z2 sur un parcours sans difficulté, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 7 min en Z2. Les lignes droites reviennent après la semaine plus douce, garde-les vives mais brèves.",
      "Remettre de la fréquence d'appui dans une foulée qui sort d'une semaine calme, au moment précis où le bloc spécifique redemande du pied.",
      { zonesSecondaires: ['Z5'] },
    ),
    seuil(
      58,
      "20 min d'échauffement en Z2, puis 4 fois 1000 m en Z4, en comptant environ 4 min par 1000 m, avec 4 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ces 4 min sont une estimation de planification et jamais une allure à tenir : si ton kilomètre sort en 4 min 30, tu es exactement où il faut du moment que tu es en Z4, c'est-à-dire à trois ou quatre mots à la fois.",
      "Poser le kilomètre comme unité de travail avec des récupérations encore longues, pour que les quatre répétitions se ressemblent toutes et qu'aucune ne se subisse.",
    ),
    sl(
      66,
      "1 h 06 en Z2, sur un parcours roulant. Cours-la entièrement facile : elle sert de contrepoids au kilomètre, pas de rallonge.",
      "Relancer le dimanche dès l'ouverture du cycle, pour qu'il atteigne son plafond sans à-coup quatre semaines plus tard.",
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
  'Course test à Izon',
  "Tu as un dossard dimanche 27 septembre sur le 10 km d'Izon. La semaine est réellement allégée, et c'est logique : tu cours pour de bon le dimanche. Deux sorties de 40 et 30 min là où tu tournes à une heure depuis deux mois, ce n'est pas un oubli de programmation, c'est le seul moyen d'arriver frais.",
  [
    ef(
      40,
      "40 min en Z2 en début de semaine, lundi ou mardi au plus tard. Aucune accélération, aucune bosse cherchée exprès. Séance volontairement courte : cette semaine, ce qui dépasse trois quarts d'heure ne te rapporte plus rien.",
      "Rester en mouvement après le week-end précédent sans entamer la fraîcheur qui doit être intacte dimanche.",
    ),
    ef(
      30,
      "Vendredi, rien du tout : ni course, ni renfo, ni sortie de compensation. Samedi, la veille de la course, 23 min en Z2, puis 4 lignes droites de 15 s en Z4 avec 1 min de marche entre chaque, soit 4 min, puis 3 min en Z2 pour rentrer. On reste en Z4, pas au-delà : ces lignes droites réveillent la foulée, elles ne l'entament pas.",
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
  prerequis:
    "Tenir déjà 1 h 15 de course le dimanche en terrain vallonné, et viser moins d'une heure sur 10 km.",
  semainesContenu: [
    semaine(
      1,
      'bloc1',
      'Vite tout de suite',
      "Quinze semaines devant toi, et aucune raison de passer les trois premières à tourner en rond. La préparation s'ouvre sur les fractions les plus courtes du programme, des 200 m, parce que c'est exactement ce qui manque à un coureur qui sort trois fois par semaine sans jamais quitter son allure de confort.",
      [
        ef(
          51,
          "51 min en Z2, sur du plat. Le test est simple : si tu ne peux pas raconter ta journée à quelqu'un en courant, tu vas trop vite.",
          "Installer le repère d'intensité qui servira de référence à tout le reste du programme.",
        ),
        vma(
          54,
          "20 min d'échauffement progressif en Z2, puis 3 séries de 4 fois 200 m en Z5, en comptant environ 45 s par 200 m, avec 1 min de trottinement en Z1 entre chaque et 3 min entre les séries, puis 10 min de retour au calme en Z2. Ces 45 s sont une estimation de planification et jamais une allure à tenir : le seul repère qui compte ici est la sensation, tu dois finir chaque 200 m sans pouvoir prononcer un mot.",
          "Ouvrir la préparation par de la vitesse pure plutôt que de la réserver au dernier tiers : sur 200 m, la foulée se rouvre en une séance là où trois mois de Z2 ne la débloqueraient jamais.",
        ),
        sl(
          60,
          "1 h en Z2 sans t'arrêter. Pars franchement plus lentement que ton allure spontanée sur les 10 premières minutes.",
          "Repartir de la sortie du dimanche que tu tiens déjà, sans l'allonger tout de suite, pour que le premier cycle s'installe sur du connu.",
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
      'Deux blocs sans respirer',
      "Changement complet de séquence. Après les fractions les plus brèves du programme, deux efforts longs coupés d'une seule récupération. Deux semaines, deux exercices qui n'ont rien à voir : c'est la règle du jeu jusqu'au bout.",
      [
        ef(
          56,
          "56 min en Z2. Surveille ta respiration plutôt que ta montre, elle doit rester ample et silencieuse d'un bout à l'autre.",
          "Fournir du volume facile autour de la séance dure, le corps progresse pendant ces sorties-là autant que pendant l'autre.",
        ),
        tempo(
          58,
          "20 min d'échauffement en Z2, puis 2 fois 12 min en Z3 avec 4 min de trottinement en Z1 entre les deux, puis 10 min de retour au calme en Z2. En Z3, tu parles encore, mais par phrases courtes et on entend nettement ton souffle. Les deux blocs doivent se ressembler : si le second est nettement plus dur, tu as lancé le premier trop vite.",
          "Opposer aux fractions de la semaine passée un effort qui dure douze minutes sans coupure, seul format qui apprenne à répartir sa dépense au lieu de la subir.",
        ),
        sl(
          64,
          "1 h 04 en Z2. Choisis un parcours avec deux ou trois bosses franches et passe-les sans jamais accélérer, quitte à raccourcir beaucoup la foulée.",
          "Allonger le dimanche de quelques minutes seulement, en gardant le relief qui fait déjà partie de ton ordinaire.",
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
      'Le premier palier',
      "Semaine la plus chargée des quatre premières, et la plus serrée du programme : c'est elle qui fixe le plancher de la semaine plus douce qui suit. Les fractions passent de 200 à 400 m, même zone mais deux fois plus longues, et les lignes droites entrent en fin de footing facile.",
      [
        ef(
          65,
          "54 min en Z2 en démarrant très progressivement, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 7 min de retour au calme en Z2. La marche de récupération est complète, on ne trottine pas. Une ligne droite se lance en montant progressivement en vitesse et se relâche avant la fin, tu ne dois jamais finir en dette de souffle.",
          "Rappeler à la foulée qu'elle sait s'ouvrir, sur des efforts trop brefs pour fatiguer. Ce n'est pas une séance de vitesse, c'est un footing qui se termine bien.",
          { zonesSecondaires: ['Z5'] },
        ),
        vma(
          57,
          "20 min d'échauffement en Z2, puis 9 fois 400 m en Z5, en comptant environ 1 min 40 par 400 m, avec 1 min 30 de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ce 1 min 40 est une estimation de planification et jamais une allure à tenir, il sert uniquement à savoir combien de temps prévoir sur ton créneau.",
          "Doubler la longueur des fractions de la semaine 1 sans changer de zone : c'est sur 400 m que la foulée commence à se déformer, donc là qu'on apprend à la tenir jusqu'au bout.",
        ),
        sl(
          68,
          "1 h 08 en Z2 d'une traite. Si la sortie tombe en fin de matinée, emporte de quoi boire.",
          "Approcher par le bas le plafond utile du dimanche pour un 10 km, dernier palier avant la semaine de repos relatif.",
        ),
        renfo(
          20,
          "2 séries de : 40 s de planche ventrale, 20 fentes marchées, 15 squats, 30 s de pont fessier allongé sur le dos bassin décollé. 90 s de pause entre les séries.",
          "Réveiller les fessiers, moteur de la propulsion et maillon faible dès que le volume hebdomadaire monte.",
        ),
      ],
    ),

    semaine(
      4,
      'allegee',
      'On lève le pied, pas le rythme',
      "Semaine plus douce volontaire, 30 min de moins que la précédente. La charge tombe, la vivacité reste : la séance de qualité est la plus courte des quinze, dix montées de côte et rien d'autre. Les trois sorties gardent leurs cinquante minutes, on ne coupe pas les séances, on coupe la fatigue.",
      [
        ef(
          50,
          "50 min en Z2, sans montre si tu en es capable. Tu cours à la sensation, uniquement, et tu rentres avec l'impression de n'avoir presque rien fait.",
          "Rompre avec le réflexe de mesurer, une semaine de repos relatif se juge à la fraîcheur du lundi suivant.",
        ),
        vma(
          50,
          "15 min d'échauffement en Z2 jusqu'au pied de la côte, puis 10 montées de 45 s en côte, entre Z4 et Z5 selon la pente, avec 2 min 10 de descente en marchant entre chaque, puis 8 min de retour au calme en Z2. Cherche une pente régulière et roulante, pas un mur : tu dois pouvoir courir les dix montées de la même façon, la dernière comme la première. La descente se fait au pas, complètement.",
          "Utiliser le relief que ces coureurs pratiquent tous les dimanches comme séance à part entière : sept minutes et demie de travail seulement, assez pour muscler la poussée, trop peu pour entamer une semaine de respiration.",
        ),
        sl(
          60,
          "1 h en Z2, un quart d'heure de moins que ton dimanche habituel. Termine en te disant que tu aurais pu continuer longtemps.",
          "Maintenir le rendez-vous du dimanche tout en coupant franchement la charge, c'est cette semaine-là qui fixe les progrès du cycle précédent.",
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
      "Le demi-kilomètre, porte d'entrée du seuil",
      "Deuxième cycle, nouvelle zone. Après trois semaines de vitesse et de tempo, on entre dans la Z4, l'allure que tu chercheras le 8 novembre, et on y entre par des fractions de 500 m assez courtes pour que la séance se termine bien.",
      [
        ef(
          59,
          "48 min en Z2 le surlendemain du seuil, jamais la veille, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 7 min de retour au calme en Z2.",
          "Faire du volume utile un jour où le corps digère encore la séance dure, et garder le pied vif pendant que le cycle travaille l'allure de course.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          60,
          "20 min d'échauffement en Z2, puis 8 fois 500 m en Z4, en comptant environ 2 min par 500 m, avec 2 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ces 2 min sont une estimation de planification et jamais une allure à tenir. En Z4 tu ne places plus que trois ou quatre mots à la fois, c'est nettement au-dessus des blocs en Z3 de la semaine 2.",
          "Faire connaissance avec l'intensité qui décidera du chrono, sur des morceaux assez courts pour que la forme de la foulée ne se dégrade à aucun moment.",
        ),
        sl(
          66,
          "1 h 06 en Z2 sur un parcours franchement vallonné. Monte les côtes en gardant le souffle sous contrôle, quitte à ralentir beaucoup.",
          "Durcir le dimanche par le relief plutôt que par la durée, puisque la durée, elle, ne bougera presque plus d'ici la course.",
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
      'On commence par le plus long',
      "Même zone que la semaine passée, séquence renversée. On ouvre au-dessus de la distance de course, avec deux blocs de 2000 m, et on redescend sur des 500 m. C'est la seule séance du programme qui attaque par le morceau le plus long, et c'est ce qui la rend particulière.",
      [
        ef(
          66,
          "52 min en Z2 sur un parcours que tu connais par cœur, pour n'avoir rien à décider en courant, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 7 min en Z2 pour rentrer.",
          "Ajouter du volume facile dans une semaine dense, avec des accélérations assez brèves pour ne rien retirer ni au seuil ni au dimanche.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          60,
          "20 min d'échauffement en Z2, puis 2 fois 2000 m puis 2 fois 500 m en Z4, en comptant environ 8 min 30 par 2000 m et 2 min par 500 m, avec 3 min de trottinement en Z1 entre chaque bloc, puis 10 min de retour au calme en Z2. Chacun de ces deux repères est une estimation de planification et jamais une allure à tenir. La descente est voulue : les deux 500 m de la fin doivent être les plus faciles à courir de la séance.",
          "Commencer l'effort spécifique au-delà de la distance de course pour que tout le reste paraisse court ensuite, seul moment du programme où la fraction arrive en récompense et non en épreuve.",
        ),
        sl(
          70,
          "1 h 10 en Z2. Bois quelques gorgées vers la 30e minute, même sans soif, pour prendre l'habitude de t'alimenter en courant sans casser ta foulée.",
          "Franchir l'heure et dix sur un terrain calme, une semaine avant la plus lourde du cycle.",
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
      'Une demi-heure sans coupure',
      "Semaine la plus lourde depuis le début, et la seule qui demande trente minutes d'effort continu. Aucune récupération derrière laquelle s'abriter, aucune fraction pour découper la difficulté : c'est un exercice de patience autant que de jambes.",
      [
        ef(
          67,
          "1 h 07 en Z2, sans lignes droites cette semaine : le tempo demande déjà de la fraîcheur. Si tu te sens émoussé au lendemain, descends la sortie entière en Z1, c'est sans la moindre conséquence.",
          "Absorber la semaine la plus lourde du deuxième cycle en gardant du volume facile, seul moyen d'encaisser le tempo sans creuser la fatigue.",
        ),
        tempo(
          64,
          "20 min d'échauffement en Z2, puis 30 min en Z3 d'un seul tenant, sans jamais couper, puis 4 min de trottinement en Z1 pour redescendre, puis 10 min de retour au calme en Z2. Trente minutes, c'est plus long que ta course : la Z3 est justement la seule zone où cette durée reste tenable du début à la fin.",
          "Passer une demi-heure pleine au-dessus du confort, pour que la partie centrale du 10 km, celle où personne ne relance et où tout se joue, cesse de faire peur.",
        ),
        sl(
          74,
          "1 h 14 en Z2. Choisis un jour où tu n'as rien de prévu derrière, et pars sans horaire de retour en tête.",
          "Construire le fond d'endurance qui portera le dernier tiers de la course, quand la lucidité baisse avant les jambes.",
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 24 fentes marchées, 20 squats, 40 s de pont fessier jambes fléchies. Termine par 5 min d'étirements des mollets et des ischios.",
          "Amener le travail musculaire à son plus haut avant la respiration de la semaine prochaine, où il redescendra franchement.",
        ),
      ],
    ),

    semaine(
      8,
      'allegee',
      'Deuxième respiration',
      "Le volume baisse d'un sixième et la séance de qualité devient minuscule : dix fractions de 200 m en deux séries, six minutes et demie de travail en tout. Sept semaines viennent de passer, il en reste sept, et c'est le moment de faire le point sur les sensations plutôt que sur les chiffres.",
      [
        ef(
          56,
          "56 min en Z2 très souples. Aucune ligne droite, aucune bosse, aucun objectif autre que de bien te sentir en rentrant.",
          "Laisser le système nerveux récupérer, c'est lui qui fatigue le plus vite sur les semaines à intensité.",
        ),
        vma(
          52,
          "20 min d'échauffement en Z2, puis 2 séries de 5 fois 200 m en Z5, en comptant environ 45 s par 200 m, avec 1 min 30 de trottinement en Z1 entre chaque et 2 min 30 entre les deux séries, puis 10 min de retour au calme en Z2. Ce repère de 45 s est une estimation de planification et jamais une allure à tenir. Récupérations volontairement généreuses : chaque 200 m doit être aussi vif que le premier.",
          "Entretenir la vitesse pure avec une dose ridiculement basse, parce qu'une semaine de respiration se joue sur ce qu'on retire et pas sur ce qu'on ajoute.",
        ),
        sl(
          64,
          "1 h 04 en Z2, la seule séance un peu longue de la semaine. Elle reste facile de bout en bout : si tu accélères sur la fin, tu as raté l'objectif.",
          "Conserver l'acquis d'endurance pendant une semaine sans charge, le fond ne se garde qu'en le pratiquant.",
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
      'Six kilomètres, mais en deux fois',
      "Deuxième marche du cycle. Le volume au seuil passe de quatre à six kilomètres d'un coup, ce qui serait beaucoup d'une traite : on le coupe donc en deux séries, avec une vraie pause au milieu. Le découpage n'est pas une facilité, c'est ce qui rend la dose possible.",
      [
        ef(
          65,
          "51 min en Z2, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 7 min en Z2. À placer à distance de la séance de seuil, jamais la veille.",
          "Fournir du volume facile un jour où le corps digère encore les six kilomètres au seuil, tout en gardant le pied vif.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          67,
          "20 min d'échauffement en Z2, puis 2 séries de 3 fois 1000 m en Z4, en comptant environ 4 min par 1000 m, avec 2 min de trottinement en Z1 entre chaque et 5 min entre les deux séries, puis 10 min de retour au calme en Z2. Ces 4 min restent une estimation de planification et jamais une allure à tenir. Le vrai test est la seconde série : elle doit sortir comme la première.",
          "Doubler le kilométrage au seuil en le découpant, parce qu'un coureur qui n'a jamais tenu six kilomètres rapides les tient d'abord en deux morceaux avant de les tenir d'un seul.",
        ),
        sl(
          70,
          "1 h 10 en Z2. Aucun bloc rapide, aucune accélération finale : le dimanche du bloc spécifique sert de contrepoids aux séances au kilomètre.",
          "Tenir la sortie longue à un niveau élevé sans jamais y ajouter d'intensité, pour que toute la fraîcheur disponible aille au travail spécifique.",
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
      'Long puis court, sans temps mort',
      "Troisième et dernière marche du cycle, la plus chargée des trois. On repart du 2000 m, mais cette fois la descente est plus longue : quatre 500 m derrière, à enchaîner alors que les jambes sont déjà chargées. C'est la semaine où l'allure de course commence à devenir familière plutôt que menaçante.",
      [
        ef(
          68,
          "57 min en Z2, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 4 min en Z2. À placer à distance de la séance de seuil, jamais la veille.",
          "Entretenir la vitesse de foulée dans une semaine dense, sans jamais entamer la fraîcheur dont la longue séance de seuil a besoin.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          70,
          "20 min d'échauffement en Z2, puis 2 fois 2000 m puis 4 fois 500 m en Z4, en comptant environ 8 min 30 par 2000 m et 2 min par 500 m, avec 3 min de trottinement en Z1 entre chaque bloc, puis 10 min de retour au calme en Z2. Ces deux repères sont une estimation de planification et jamais une allure à tenir. Les quatre 500 m arrivent sur des jambes déjà lourdes, et c'est tout leur intérêt.",
          "Placer les fractions courtes après les longues plutôt qu'avant, pour reproduire ce que sont réellement les trois derniers kilomètres d'un dossard couru à fond.",
        ),
        sl(
          74,
          "1 h 14 en Z2, en terrain varié. Mange quelque chose deux heures avant si la sortie est matinale.",
          "Rapprocher le dimanche de son plafond sans jamais dépasser ce dont un coureur de 10 km a besoin.",
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
      "Troisième semaine plus douce du programme, et la dernière avant le point haut. Le volume tombe d'environ 17 % et le travail se réduit à six fractions de 400 m. Une semaine de respiration juste avant la semaine la plus lourde n'est pas une contradiction : c'est précisément ce qui la rend tenable.",
      [
        ef(
          56,
          "56 min en Z2, tranquilles. Si une douleur traîne depuis les trois semaines au kilomètre, c'est maintenant qu'il faut la traiter, pas dans quinze jours.",
          "Ouvrir une fenêtre pour régler les petits pépins pendant qu'il reste du temps pour les régler.",
        ),
        vma(
          55,
          "20 min d'échauffement en Z2, puis 6 fois 400 m en Z5, en comptant environ 1 min 40 par 400 m, avec 3 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ce 1 min 40 est une estimation de planification et jamais une allure à tenir. Trois minutes de récupération pour 400 m, c'est énorme, et c'est fait exprès.",
          "Rappeler la vitesse haute une dernière fois avant le pic, avec des récupérations si longues que la séance ne coûte presque rien en fatigue.",
        ),
        sl(
          64,
          "1 h 04 en Z2, dix minutes de moins que la semaine passée. Termine avec la sensation nette d'avoir de la marge, et surtout l'envie d'y retourner.",
          "Laisser le fond reculer d'un cran pour aborder la semaine sommet avec des jambes qui ont vraiment récupéré.",
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
      'Sept kilomètres au seuil',
      "Semaine la plus lourde des quinze et séance reine du programme : sept fois mille mètres à l'allure du dossard, avec des récupérations volontairement courtes. Elle arrive juste après une semaine douce, c'est ce qui te permet de l'encaisser. Si tu la termines proprement, le 8 novembre est déjà largement à ta portée. Ensuite, tout redescend.",
      [
        ef(
          70,
          "1 h 10 en Z2, sans lignes droites : la séance au kilomètre demande toute la fraîcheur disponible cette semaine. Si les jambes sont lourdes au lendemain, fais-la entièrement en Z1.",
          "Fournir du volume neutre entre les deux séances les plus exigeantes du programme, sans rien y ajouter.",
        ),
        seuil(
          70,
          "20 min d'échauffement en Z2, puis 7 fois 1000 m en Z4, en comptant environ 4 min par 1000 m, avec 2 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ce repère de 4 min reste une estimation de planification et jamais une allure à tenir. Le septième kilomètre doit sortir dans le même temps que le premier : c'est le seul indicateur qui compte, et si tu perds nettement à la fin, tu as lancé le début trop fort.",
          "Dépasser d'un kilomètre la distance de la course sur des récupérations trop brèves pour souffler complètement : c'est la séance qui dit si l'objectif est tenu.",
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
      'La séance de vérité',
      "Début de l'affûtage. Le volume baisse d'un cinquième, mais la séance de qualité devient la plus spécifique du programme : trois kilomètres à l'allure exacte du dossard, puis deux 500 m pour finir vite, le tout avec deux minutes de récupération à peine. Elle te dira, mieux qu'aucune montre, où tu en es.",
      [
        ef(
          54,
          "42 min en Z2 sans chercher à compenser la baisse de volume, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 8 min de retour au calme en Z2. En début de semaine, jamais la veille du seuil.",
          "Garder les trois rendez-vous hebdomadaires sans compenser la baisse de charge, et entretenir le pied avec la dose la plus faible du programme.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          54,
          "20 min d'échauffement en Z2, puis 3 fois 1000 m puis 2 fois 500 m en Z4, en comptant environ 4 min par 1000 m et 2 min par 500 m, avec 2 min de trottinement en Z1 entre chaque bloc, puis 10 min de retour au calme en Z2. Ces deux repères sont une estimation de planification et jamais une allure à tenir. Si les cinq morceaux se ressemblent, tu es prêt, et il n'y a plus rien à prouver d'ici dimanche prochain.",
          "Reproduire en modèle réduit le déroulé de la course, trois kilomètres réguliers puis une fin plus vive, dix jours avant, quand il reste le temps de récupérer mais plus celui de progresser.",
        ),
        sl(
          62,
          "1 h 02 en Z2 seulement. Tu vas trouver ça court après les semaines à 1 h 15, c'est exactement le but.",
          "Couper franchement dans le dimanche pour que la fraîcheur remonte, l'endurance acquise ne se perd pas en dix jours.",
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
      "Dimanche 8 novembre, tu cours le 10 km de Bordeaux. Les deux séances de la semaine sont volontairement courtes, 42 et 33 min là où tu tournes à une heure depuis trois mois : ce n'est pas un oubli de programmation, c'est le seul moyen d'arriver frais. Tout ce qui dépasse cette dose sert la fatigue et pas le chrono.",
      [
        ef(
          42,
          "42 min en Z2 en début de semaine, lundi ou mardi. Souple, sans rien chercher, et aucune ligne droite cette semaine. Séance courte à dessein : ce qui dépasse trois quarts d'heure ne te rapporte plus rien maintenant.",
          "Évacuer les dernières traces d'affûtage et garder le geste de course sans créer un gramme de fatigue.",
        ),
        seuil(
          33,
          "12 min d'échauffement en Z2, puis 4 fois 500 m en Z4, en comptant environ 2 min par 500 m, avec 2 min de trottinement en Z1 entre chaque, puis 7 min de retour au calme en Z2. Ces 2 min sont une estimation de planification et jamais une allure à tenir. À placer mercredi au plus tard : quatre demi-kilomètres, c'est un rappel et pas un entraînement.",
          "Faire retrouver aux jambes le rythme du dossard trois jours avant, sur une dose assez faible pour ne rien coûter et assez juste pour que rien ne surprenne au départ.",
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
      "Aucune intensité, aucun chrono, aucune comparaison. Des sorties de 35 à 45 min seulement : après quinze semaines à une heure et plus, cette brièveté est la séance elle-même, pas un reliquat du programme. Sauter cette semaine, c'est démarrer la prochaine préparation déjà fatigué.",
      [
        recup(
          35,
          "35 min en Z1, deux ou trois jours après la course. Si les jambes sont encore raides, remplace par 40 min de marche, le bénéfice est le même.",
          "Faire circuler le sang dans des jambes qui viennent de vider leurs réserves sur un 10 km couru à fond, ce qui nettoie l'effort bien plus vite que trois jours de canapé.",
        ),
        recup(
          40,
          "40 min en Z1 en milieu de semaine. Tu vas avoir envie d'accélérer parce que les sensations reviennent : ne le fais pas.",
          "Laisser le retour des sensations se faire tout seul, sans le provoquer.",
        ),
        recup(
          45,
          "45 min en Z1 sur terrain souple, en fin de semaine. Trois quarts d'heure au lieu de l'heure et quart habituelle, et c'est le but : cette sortie referme le cycle, elle ne le prolonge pas. Choisis un parcours pour le paysage, laisse la montre à la maison.",
          "Refermer la préparation sur une note agréable, ce qui compte autant que le reste pour repartir motivé.",
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
