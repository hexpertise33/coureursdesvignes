import { ef, sl, tempo, seuil, vma, recup, renfo, course, semaine } from './seances.js';

/**
 * P3, semi-marathon de Bordeaux. Quinze semaines de préparation plus une de
 * récupération, soit seize entrées.
 *
 * Programme recalibré sur le niveau réel du groupe, après P1, P2 et P5.
 * Correctif de l'encadrant : ses coureurs bouclent tous le 10 km en moins d'une
 * heure et sortent déjà 1 h 15 le dimanche sur terrain vallonné. Le calibrage
 * précédent, écrit pour un coureur qui aligne 20 km par semaine et découvre la
 * distance, ouvrait à 130 min avec des footings de 35 min et une sortie longue
 * d'une heure : personne ne s'entraîne comme ça ici. Trois séances de course
 * par semaine, une séance de renforcement, aucune allure chiffrée, l'intensité
 * se lit en zones 1 à 5 et chacun règle son curseur sur sa propre respiration.
 *
 * Ce qui change par rapport à la version précédente
 * -------------------------------------------------
 * Le volume : 185 min en semaine 1 au lieu de 130, 250 min au pic au lieu de
 * 200. La sortie longue : elle part de 1 h 15, l'habitude du dimanche, et monte
 * à 1 h 45, plafond utile pour un semi. Et surtout la forme du travail de
 * qualité. L'ancienne trame montait par paliers d'intensité, Z3 d'abord, Z4
 * ensuite, Z5 tout à la fin, et laissait quatre semaines entières sans la
 * moindre séance de qualité. Cette prudence s'adresse à quelqu'un qui découvre
 * l'intensité. Le groupe court à l'année : la règle « Z3 avant Z4 avant Z5 »
 * est abandonnée, la semaine 1 s'ouvre sur des 400 m, et chacune des quinze
 * semaines porte sa séance de qualité.
 *
 * Le menu, semaine par semaine, quinze formats et pas un doublon :
 *   S1  bloc1     3 séries de 3 fois 400 m en Z5 ;
 *   S2  bloc1     5 fois 1000 m en Z4 ;
 *   S3  bloc1     2 fois 12 min en Z3, première dose d'allure de course ;
 *   S4  allégée   8 montées de 1 min en côte, entre Z4 et Z5 ;
 *   S5  bloc2     3 fois 2000 m en Z4 ;
 *   S6  bloc2     4 séries de 3 fois 200 m en Z5 ;
 *   S7  bloc2     2 fois 3000 m en Z4, le plus long format au seuil ;
 *   S8  allégée   10 fois 200 m en Z5 ;
 *   S9  bloc3     2 fois 2000 m puis 3 fois 1000 m en Z4, ou la course-test ;
 *   S10 bloc3     3 fois 12 min en Z3 ;
 *   S11 bloc3     2 fois 2000 m puis 4 fois 1000 m en Z4 ;
 *   S12 allégée   6 fois 500 m en Z4 ;
 *   S13 bloc3     2 fois 20 min en Z3, la séance reine du pic ;
 *   S14 affûtage  2 fois 15 min en Z3, répétition générale ;
 *   S15 affûtage  5 fois 500 m en Z4, rappel de la semaine de course.
 *
 * Fractionné en distance, adapté au semi
 * --------------------------------------
 * Dix des quinze séances de qualité se comptent en mètres, et la longueur des
 * répétitions suit la distance préparée : le 1000 m, le 2000 m et le 3000 m
 * portent l'essentiel du travail au seuil, le 200 m et le 400 m ne servent qu'à
 * garder le pied vif. Quatre séances restent en minutes, ce sont les quatre
 * blocs à l'allure du semi : un effort tenu en Z3 ne se pense pas en mètres, il
 * se pense en durée, et sa place grandit de S3 à S13. La cinquième exception
 * est la côte de S4, qu'une pente rend incomparable d'un coureur à l'autre. Une
 * distance n'est pas une allure : chacun court son 2000 m dans la zone
 * demandée, à son rythme, et la règle « jamais d'allure en min/km ni de vitesse
 * chiffrée » reste absolue.
 *
 * Repère de durée par répétition. Le projet impose que la somme des segments
 * décrits égale exactement la durée déclarée. Une distance, elle, ne dure pas le
 * même temps pour tout le monde. Chaque séance en distance donne donc un repère
 * par répétition, qui sert à deux choses et à deux seulement : faire retomber le
 * calcul juste, et permettre de savoir combien de temps bloquer sur son créneau.
 * Repères retenus : environ 4 min pour 1000 m, 8 min 30 pour 2000 m et 13 min
 * pour 3000 m en Z4, 2 min pour 500 m en Z4, 1 min 40 pour 400 m et 45 s pour
 * 200 m en Z5. Chacune des dix séances en distance redit, dans ses propres
 * mots, que ce repère est une estimation de planification et jamais une allure
 * à tenir.
 *
 * Garde-fou de durée, décision de l'encadrant
 * -------------------------------------------
 *   toute séance de course d'une semaine normale (bloc1, bloc2, bloc3, allégée
 *   et le premier palier d'affûtage) fait au minimum 50 min ;
 *   la sortie longue tient dans la fourchette 65 à 105 min, 1 h 45 étant le
 *   plafond utile sur un semi, et elle ne recule jamais à l'intérieur d'un
 *   cycle ;
 *   deux exceptions assumées, la semaine de course (S15, et S9 pour qui prend
 *   le dossard d'Izon) et la semaine de récupération (S16), où des séances de
 *   30 à 48 min sont le but recherché et non un oubli. Les textes de ces
 *   semaines-là le disent explicitement, pour qu'un coureur habitué à une heure
 *   et demie ne croie pas à une erreur de saisie.
 *   Le renforcement reste entre 12 et 25 min et n'est pas concerné.
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
 * quatrième cycle, réduit à la seule S13, porte donc bloc3 lui aussi.
 *
 * La course a lieu le dimanche 8 novembre 2026, dernier jour de la semaine 15.
 * La semaine 9 tombe sur le week-end du 10 km d'Izon, le 27 septembre : d'où la
 * double variante.
 *
 * Barème de volumes, hors course objectif et hors renfo, en minutes :
 * S1 185, S2 195, S3 207, S4 175, S5 210, S6 222, S7 233, S8 196,
 * S9 222 sans Izon et 70 avec Izon, S10 230, S11 240, S12 202,
 * S13 250 (pic), S14 180, S15 78, S16 125.
 *
 * Sortie longue, palier par palier : 75, 80, 85 puis 70 ; 85, 90, 95 puis 80 ;
 * 90, 97, 102 puis 85 ; 105 au pic ; 65 en affûtage. Elle grimpe à l'intérieur
 * de chaque cycle et ne redescend qu'au passage d'une semaine plus douce.
 *
 * Le plancher des 50 min contraint le barème par le bas : une semaine normale
 * ne peut pas descendre sous 50 + 50 + sa sortie longue. C'est la semaine 4 qui
 * est le point le plus serré, à 175 min contre 175,95 autorisés par la règle
 * des 15 % de baisse : c'est elle qui fixe la côte à 52 min tout rond.
 *
 * Phase de la semaine 9 : elle appartient à la variante, pas à la semaine. Sans
 * dossard, S9 ouvre le troisième cycle progressif et vaut bloc3. Avec dossard,
 * elle est réellement délestée puisque la course se court le dimanche, et vaut
 * allegee, les deux jours qui précèdent le départ étant explicitement vidés.
 * L'entrée principale reprend la phase de la variante sans dossard, la seule
 * dont elle expose les séances par défaut.
 *
 * Les deux variantes franchissent le garde-fou par des chemins distincts. Sans
 * Izon, S9 est un bloc qui succède à une semaine plus douce : sa référence est
 * le pic des blocs atteint jusque-là (233 min en S7), et S10 se compare ensuite
 * à S9. Avec Izon, S9 est allégée et se mesure à S8 ; S10, bloc précédé d'une
 * semaine hors bloc, repart lui aussi du pic des blocs. La règle des 10 % ne
 * compare donc jamais S10 au volume hors course d'une semaine qui contient la
 * course-test.
 *
 * Lignes droites, décision de l'encadrant. Accélérations de 15 à 20 s en Z5 en
 * fin d'endurance, introduites à la fin du bloc 1, donc en S3, puis entretenues
 * en S5, S9, S10 et S14. Écartées des semaines plus douces (S4, S8, S12), des
 * semaines qui portent déjà une séance rapide (S1, S6), des deux semaines les
 * plus chargées du bloc spécifique (S7, S11, S13) et de la semaine de course.
 * La variante avec Izon fait exception avec quatre lignes droites la veille du
 * dossard, tenues en Z4 et non en Z5.
 *
 * Convention de calcul des séances à intervalles : pour N répétitions, N-1
 * récupérations. Une séance en séries compte les récupérations courtes à
 * l'intérieur de chaque série, plus une récupération longue entre deux séries.
 * Échauffement plus répétitions plus récupérations plus retour au calme égale
 * exactement la durée déclarée. Même règle pour les lignes droites, logées à
 * l'intérieur de la durée de l'endurance : 4 lignes de 15 s avec 1 min de
 * marche entre chaque font 4 min, 6 lignes de 20 s en font 7. Pour une séance
 * en distance, la répétition est comptée à son repère de durée.
 *
 * Échauffement progressif, barème appliqué aux séances TEMPO, SEUIL et VMA
 * selon leur durée déclarée :
 *   40 min et moins   12 min d'échauffement,  7 min de retour au calme ;
 *   41 à 50 min       15 min d'échauffement,  8 min de retour au calme ;
 *   plus de 50 min    20 min d'échauffement, 10 min de retour au calme.
 * Quatorze des quinze séances de qualité dépassent 50 min et tombent donc sur
 * le 20/10 standard. La quinzième est le rappel de la semaine de course,
 * 38 min, volontairement court, au palier 12/7. Les séances EF, SL, RECUP et
 * RENFO n'ont pas d'échauffement séparé et ne sont pas concernées.
 *
 * Toute séance dont la description cite une zone plus dure que celle de sa
 * fabrique la déclare via { zonesSecondaires: [...] } : les cinq endurances à
 * lignes droites en Z5, l'endurance de veille de course-test qui monte en Z4,
 * et aucune autre. Les sorties longues sont toutes entièrement en Z2.
 */

const s9SansIzon = semaine(
  9,
  'bloc3',
  'Ouverture du bloc spécifique',
  "Pas de dossard cette semaine, le troisième cycle démarre sans attendre. Trois semaines qui montent devant toi, celle-ci en est la première marche, et le travail au seuil prend sa forme la plus complète : des blocs longs suivis de kilomètres, sept kilomètres rapides sur une seule séance.",
  [
    ef(
      64,
      "53 min en Z2 sur un parcours roulant, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 7 min en Z2 pour rentrer. Les lignes droites reviennent après la semaine calme, quatre suffisent pour cette reprise.",
      "Rendre de la fréquence d'appui à une foulée qui sort d'une semaine sans intensité, juste au moment où le bloc spécifique se remet à en demander.",
      { zonesSecondaires: ['Z5'] },
    ),
    seuil(
      68,
      "20 min d'échauffement en Z2, puis 2 fois 2000 m puis 3 fois 1000 m en Z4, en comptant environ 8 min 30 par 2000 m et 4 min par 1000 m, avec 2 min 15 de trottinement en Z1 entre chaque bloc, puis 10 min de retour au calme en Z2. Ces deux repères sont une estimation de planification et jamais une allure à tenir : si ton kilomètre sort en 4 min 40, tu es au bon endroit du moment que tu tiens la Z4, c'est-à-dire trois ou quatre mots à la fois.",
      "Attaquer par le plus long pour que les kilomètres de la fin arrivent en récompense, seule construction qui permette d'enchaîner sept kilomètres rapides sans exploser en route.",
    ),
    sl(
      90,
      "1 h 30 en Z2, intégralement facile. Elle sert d'assise à la séance au seuil et non de rallonge : si tu accélères sur la fin, tu prends sur la semaine suivante.",
      "Relancer le dimanche dès l'ouverture du cycle pour qu'il atteigne son plafond par paliers réguliers plutôt que d'un bond en quatre semaines.",
    ),
    renfo(
      25,
      "3 séries de : 20 montées sur une marche par jambe, 45 s de planche ventrale avec un pied décollé du sol en alternant, 10 fentes bulgares par jambe pied arrière posé sur une chaise. 90 s de pause entre les séries.",
      "Charger la jambe d'appui isolément, puisque c'est elle qui encaisse seule chaque foulée pendant les deux heures que dure un semi.",
    ),
  ],
);

const s9AvecIzon = semaine(
  9,
  'allegee',
  'Course test à Izon',
  "Tu as un dossard dimanche 27 septembre sur le 10 km d'Izon. La semaine est franchement délestée, et c'est cohérent : le vrai effort, tu le fournis dimanche. Deux sorties de 40 et 30 min là où tu tournes à une heure et demie depuis deux mois, ce n'est pas un oubli de programmation, c'est le seul moyen d'arriver frais.",
  [
    ef(
      40,
      "40 min en Z2 en début de semaine, lundi ou mardi. C'est la seule sortie un peu consistante des sept jours, elle reste facile de bout en bout. Séance courte à dessein : cette semaine, ce qui dépasse trois quarts d'heure ne te rapporte plus rien.",
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
  prerequis:
    "Sortir déjà 1 h 15 le dimanche en terrain vallonné et boucler le 10 km en moins d'une heure. Le semi demande en plus d'accepter de monter jusqu'à 1 h 45 de course d'une traite.",
  semainesContenu: [
    semaine(
      1,
      'bloc1',
      'Vite dès la première semaine',
      "Quinze semaines devant toi, et aucune raison de commencer par trois semaines de mise en jambes. La préparation s'ouvre sur les fractions les plus courtes du programme, des 400 m, parce que c'est exactement ce qui manque à un coureur qui sort trois fois par semaine sans jamais quitter son allure de confort.",
      [
        ef(
          55,
          "55 min en Z2 sur terrain roulant. Le test tient en une phrase : si tu ne peux pas raconter ta journée à quelqu'un en courant, tu vas trop vite.",
          "Installer le repère d'intensité facile qui servira de référence aux quinze semaines, et qui décide de la qualité de tout le reste.",
        ),
        vma(
          55,
          "20 min d'échauffement progressif en Z2, puis 3 séries de 3 fois 400 m en Z5, en comptant environ 1 min 40 par 400 m, avec 1 min de trottinement en Z1 entre chaque et 2 min entre les séries, puis 10 min de retour au calme en Z2. Ce 1 min 40 est une estimation de planification et jamais une allure à tenir : le seul repère qui compte est la sensation, tu dois finir chaque 400 m sans pouvoir prononcer un mot.",
          "Ouvrir la préparation par des fractions courtes plutôt que de les réserver à la fin : c'est sur 400 m que la foulée retrouve de l'amplitude, et cette amplitude servira ensuite pendant deux heures de course.",
        ),
        sl(
          75,
          "1 h 15 en Z2 d'une seule traite, sur ton parcours vallonné du dimanche. Pars franchement plus lentement que ton allure spontanée sur le premier quart d'heure.",
          "Repartir du dimanche que tu tiens déjà sans l'allonger tout de suite, pour que le premier cycle s'installe sur du connu.",
        ),
        renfo(
          20,
          "3 séries de : 40 s de planche ventrale, 30 s de planche sur chaque côté, 12 fentes avant par jambe. 1 min de récupération entre les séries.",
          "Poser le socle de gainage qui tiendra la posture sur la deuxième heure de course, là où la foulée se déforme sans qu'on s'en aperçoive.",
        ),
      ],
    ),

    semaine(
      2,
      'bloc1',
      'Le kilomètre entre en scène',
      "Changement complet de séquence. Après les fractions les plus brèves du programme, on passe directement à l'unité qui reviendra le plus souvent d'ici novembre : le kilomètre couru au seuil, avec des récupérations encore confortables.",
      [
        ef(
          55,
          "55 min en Z2, régulier. Surveille ta respiration plutôt que ta montre : elle doit rester ample et silencieuse jusqu'au dernier pas.",
          "Fournir le volume facile qui encadre la première séance au seuil, car l'organisme assimile pendant ces sorties-là autant que pendant l'autre.",
        ),
        seuil(
          60,
          "20 min d'échauffement en Z2, puis 5 fois 1000 m en Z4, en comptant environ 4 min par 1000 m, avec 2 min 30 de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ces 4 min sont une estimation de planification et jamais une allure à tenir : peu importe le chrono du kilomètre du moment que tu es en Z4, c'est-à-dire à trois ou quatre mots à la fois.",
          "Poser dès la deuxième semaine l'unité de travail qui reviendra le plus souvent, avec des récupérations assez longues pour que les cinq répétitions se ressemblent toutes.",
        ),
        sl(
          80,
          "1 h 20 en Z2. Cinq minutes de plus que la semaine dernière, pas davantage, même si la forme est là.",
          "Allonger le dimanche par petits paliers, parce que les tendons et les fascias progressent bien plus lentement que le muscle et le souffle.",
        ),
        renfo(
          20,
          "Reprends la séance de la semaine 1 en ajoutant 2 séries de 18 squats au poids du corps, descente lente sur trois secondes et remontée franche.",
          "Répéter un contenu déjà connu pour que le mouvement devienne automatique, ce qui compte davantage que la variété à ce stade.",
        ),
      ],
    ),

    semaine(
      3,
      'bloc1',
      "Première dose d'allure de course",
      "Semaine la plus chargée des quatre premières. Troisième format en trois semaines : après la vitesse pure et le seuil, on touche enfin l'allure du semi, celle que tu tiendras deux heures le 8 novembre. Les lignes droites entrent aussi en fin de footing facile.",
      [
        ef(
          64,
          "50 min en Z2 en démarrant très progressivement, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 7 min de retour au calme en Z2. La marche de récupération est complète, on ne trottine pas. Une ligne droite monte en vitesse sur les premiers appuis et se relâche avant la fin : tu ne finis jamais en dette de souffle.",
          "Rappeler à la foulée qu'elle sait s'ouvrir, sur des efforts trop brefs pour laisser la moindre fatigue. Ce n'est pas une séance de vitesse, c'est un footing qui se termine bien.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          58,
          "20 min d'échauffement en Z2, puis 2 fois 12 min en Z3 avec 4 min de trottinement en Z1 entre les deux, puis 10 min de retour au calme en Z2. En Z3 tu parles encore, par phrases courtes, et on entend nettement ton souffle. Les deux blocs doivent se ressembler : si le second est laborieux, le premier est parti trop vite.",
          "Découvrir l'allure du semi sur des blocs assez longs pour qu'elle cesse d'être une idée abstraite, et assez courts pour qu'aucun des deux ne se subisse.",
        ),
        sl(
          85,
          "1 h 25 en Z2. À partir de cette durée, emporte de l'eau systématiquement, même par temps frais, et teste dès maintenant la ceinture ou le sac que tu comptes utiliser en novembre.",
          "Passer l'heure et demie de course et transformer le portage de la boisson en habitude, parce que le jour du dossard rien de tout cela ne s'improvise.",
        ),
        renfo(
          22,
          "2 séries de : 45 s de planche ventrale, 20 fentes marchées, 18 squats, 40 s de pont fessier allongé sur le dos bassin décollé. 90 s de pause entre les séries.",
          "Réveiller les fessiers, premier moteur de la propulsion et premier groupe musculaire à décrocher quand l'effort dépasse l'heure et demie.",
        ),
      ],
    ),

    semaine(
      4,
      'allegee',
      'On lève le pied, pas le rythme',
      "Semaine plus douce volontaire, une trentaine de minutes de moins que la précédente. La charge tombe, la vivacité reste : la séance de qualité est la plus courte des quinze, huit montées de côte et rien d'autre. Les trois sorties gardent leurs cinquante minutes, on ne coupe pas les séances, on coupe la fatigue.",
      [
        ef(
          53,
          "53 min en Z2, sans montre si tu en es capable. Tu cours à la sensation, uniquement, et tu rentres avec l'impression de n'avoir presque rien fait.",
          "Casser le réflexe de mesurer, une semaine de repos relatif se juge à la fraîcheur du lundi suivant et à rien d'autre.",
        ),
        vma(
          52,
          "20 min d'échauffement en Z2 jusqu'au pied de la côte, puis 8 montées de 1 min en côte, entre Z4 et Z5 selon la pente, avec 2 min de descente en marchant entre chaque, puis 10 min de retour au calme en Z2. Cherche une pente régulière et roulante, pas un mur : tu dois pouvoir courir les huit montées de la même façon, la dernière comme la première. La descente se fait au pas, complètement.",
          "Utiliser le relief que ce groupe pratique tous les dimanches comme séance à part entière : huit minutes de poussée musculaire coûtent bien moins cher qu'un fractionné sur le plat pendant une semaine de respiration.",
        ),
        sl(
          70,
          "1 h 10 en Z2, un quart d'heure de moins que la semaine passée. Termine en te disant que tu aurais pu continuer longtemps.",
          "Maintenir le rendez-vous du dimanche tout en coupant franchement la charge, c'est cette semaine-là qui transforme le travail du cycle en forme.",
        ),
        renfo(
          18,
          "2 séries de : 35 s de planche, 12 squats, 10 fentes par jambe, puis 7 min d'étirements lents des mollets, des ischios et des fessiers.",
          "Entretenir les appuis sans provoquer la moindre raideur pendant les sept jours dont le seul rôle est de vider les jambes.",
        ),
      ],
    ),

    semaine(
      5,
      'bloc2',
      'On double la longueur des blocs',
      "Deuxième cycle. Le seuil revient, mais les répétitions passent du kilomètre au double : des 2000 m, presque neuf minutes d'affilée. C'est au-delà de la huitième minute que la séance change de nature, et c'est exactement ce qu'on vient chercher.",
      [
        ef(
          63,
          "49 min en Z2 le surlendemain du seuil, jamais la veille, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 7 min de retour au calme en Z2.",
          "Faire du volume utile un jour où le corps digère encore la séance dure, tout en gardant le pied vif pendant que le cycle travaille l'intensité.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          62,
          "20 min d'échauffement en Z2, puis 3 fois 2000 m en Z4, en comptant environ 8 min 30 par 2000 m, avec 3 min 15 de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ce 8 min 30 est une estimation de planification et jamais une allure à tenir, il sert uniquement à savoir combien de temps bloquer sur ton créneau.",
          "Doubler d'un coup la longueur des répétitions au seuil, parce que c'est passé la huitième minute que le corps apprend à évacuer plutôt qu'à accumuler.",
        ),
        sl(
          85,
          "1 h 25 en Z2 sur parcours franchement vallonné. Passe les côtes en gardant le souffle sous contrôle, quitte à ralentir beaucoup plus que tu ne le voudrais.",
          "Durcir le dimanche par le relief plutôt que par la durée, ce qui rend ensuite le plat nettement plus économique.",
        ),
        renfo(
          25,
          "3 séries de : 50 s de planche ventrale, 30 s de planche sur chaque côté, 18 squats, 14 fentes par jambe. 1 min de pause entre les séries.",
          "Épaissir le renforcement au moment où les répétitions doublent de longueur, le tissu musculaire doit progresser au même rythme que le souffle.",
        ),
      ],
    ),

    semaine(
      6,
      'bloc2',
      'Une parenthèse de vitesse pure',
      "Rupture assumée au milieu du deuxième cycle : douze fractions de 200 m, découpées en quatre séries. Un semi ne se gagne pas en Z5, mais un coureur qui n'y va jamais laisse sa foulée se tasser sans s'en rendre compte. Six minutes de travail rapide en tout, et la semaine reste la deuxième plus lourde du cycle.",
      [
        ef(
          74,
          "1 h 14 en Z2 d'une seule traite, sur un parcours que tu connais par cœur pour n'avoir à penser ni à l'itinéraire ni au dénivelé. Aucune ligne droite cette semaine, la séance rapide couvre déjà largement ce besoin.",
          "Fournir un gros volume facile autour de la seule séance vraiment rapide du cycle, c'est pendant ces sorties que le corps range le travail de la veille.",
        ),
        vma(
          58,
          "20 min d'échauffement en Z2, puis 4 séries de 3 fois 200 m en Z5, en comptant environ 45 s par 200 m, avec 1 min 15 de trottinement en Z1 entre chaque et 3 min entre les séries, puis 10 min de retour au calme en Z2. Ces 45 s sont une estimation de planification et jamais une allure à tenir. Découpage en quatre séries volontaire : chaque 200 m doit être aussi vif que le premier, et la coupure est ce qui le permet.",
          "Replacer de la vitesse pure au milieu d'un bloc entièrement tourné vers l'endurance, sur des fractions trop brèves pour fatiguer et assez vives pour empêcher la foulée de se tasser.",
        ),
        sl(
          90,
          "1 h 30 en Z2. Bois quelques gorgées toutes les vingt minutes, même sans soif, et teste dès cette sortie ce que tu comptes emporter en novembre.",
          "Franchir l'heure et demie et transformer le ravitaillement en automatisme plutôt qu'en improvisation le jour J.",
        ),
        renfo(
          25,
          "Séance en côte : trouve une pente régulière et monte-la 10 fois en trottinant ou en marchant vite, redescente en marchant, sans chronomètre. Termine par 3 fois 50 s de planche.",
          "Faire travailler la poussée debout et en mouvement, position dans laquelle elle sert réellement, plutôt qu'allongé sur un tapis.",
        ),
      ],
    ),

    semaine(
      7,
      'bloc2',
      'Treize minutes au seuil, deux fois',
      "Sommet du deuxième cycle et format le plus long du programme dans cette zone : deux fois 3000 m, soit deux fois treize minutes en Z4. Après ça, l'allure du semi te paraîtra modeste, ce qui est exactement le but de l'exercice.",
      [
        ef(
          76,
          "1 h 16 en Z2. Si tu te sens émoussé au lendemain du seuil, descends la sortie entière en Z1, c'est sans la moindre conséquence sur la préparation.",
          "Absorber la semaine la plus lourde du deuxième cycle en gardant du volume facile, seul moyen d'encaisser deux blocs de treize minutes sans creuser la fatigue.",
        ),
        seuil(
          62,
          "20 min d'échauffement en Z2, puis 2 fois 3000 m en Z4, en comptant environ 13 min par 3000 m, avec 6 min de trottinement en Z1 entre les deux, puis 10 min de retour au calme en Z2. Ces 13 min sont une estimation de planification et jamais une allure à tenir. Le second bloc doit sortir comme le premier : s'il s'effondre, tu as lancé le début trop fort.",
          "Tenir treize minutes d'affilée au seuil, format le plus long du programme dans cette zone, pour que l'allure visée en novembre paraisse ensuite presque confortable.",
        ),
        sl(
          95,
          "1 h 35 en Z2, la plus longue jusqu'ici. Programme-la un jour où tu n'as rien derrière, et prends un vrai repas deux à trois heures avant.",
          "Approcher l'heure trois quarts, durée à partir de laquelle l'organisme apprend réellement à épargner son carburant plutôt qu'à le brûler.",
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 20 fentes marchées, 22 squats, 45 s de pont fessier. Étirements des mollets et des ischios pour finir.",
          "Amener le travail musculaire à son point haut avant la respiration de la semaine prochaine, où il redescendra franchement.",
        ),
      ],
    ),

    semaine(
      8,
      'allegee',
      'Deuxième respiration',
      "Le volume recule d'un sixième et la séance de qualité devient minuscule : dix fractions de 200 m, sept minutes et demie de travail en tout. Sept semaines viennent de passer, il en reste sept, et c'est le moment de faire le point sur les sensations et sur l'état des chaussures.",
      [
        ef(
          65,
          "1 h 05 en Z2 très souples. Aucune ligne droite, aucune côte, aucun objectif sinon de rentrer en te sentant bien. Profites-en pour vérifier l'usure de tes semelles : si la paire approche des 700 km, il faut en roder une autre dès maintenant.",
          "Laisser le système nerveux souffler et régler la logistique pendant qu'il reste du temps, changer de chaussures dans le dernier mois gâche une préparation entière.",
        ),
        vma(
          51,
          "20 min d'échauffement en Z2, puis 10 fois 200 m en Z5, en comptant environ 45 s par 200 m, avec 1 min 30 de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ce repère de 45 s est une estimation de planification et jamais une allure à tenir. D'une traite cette fois, sans série, avec des récupérations généreuses : la séance doit coûter le moins possible.",
          "Entretenir le pied avec la dose la plus faible du programme, parce qu'une semaine de respiration se juge sur ce qu'on retire et non sur ce qu'on ajoute.",
        ),
        sl(
          80,
          "1 h 20 en Z2, un quart d'heure de moins qu'au sommet du cycle. Elle reste facile intégralement : si tu accélères sur la fin, tu as manqué l'intérêt de la semaine.",
          "Tenir le pilier de la préparation à charge réduite, car sur semi l'habitude de courir longtemps se perd beaucoup plus vite qu'elle ne se construit.",
        ),
        renfo(
          18,
          "2 séries de : 45 s de planche, 15 squats, 12 fentes par jambe, 30 s de pont fessier. Pas de côtes cette semaine.",
          "Garder du tonus musculaire pendant que le reste de la semaine se met en veille, sans jamais réveiller de courbature.",
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
      "Trente-six minutes à l'allure de course",
      "Deuxième marche du cycle spécifique. Le travail quitte le seuil pour l'allure du semi elle-même, et il passe de deux blocs à trois : la question n'est plus le souffle, c'est de ne pas dériver vers le haut sans t'en apercevoir.",
      [
        ef(
          61,
          "47 min en Z2, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 7 min en Z2. À placer à distance de la séance de qualité, jamais la veille.",
          "Ajouter du volume facile dans une semaine dense et garder la foulée vive, sans jamais mordre sur la fraîcheur qu'exigent les trois blocs en Z3.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          72,
          "20 min d'échauffement en Z2, puis 3 fois 12 min en Z3 avec 3 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Trois minutes de récupération pour douze minutes d'effort, c'est court, et c'est fait exprès : le troisième bloc doit se courir sur des jambes qui n'ont pas complètement récupéré.",
          "Répéter trois fois l'allure de course au lieu de deux, pour que la difficulté devienne la patience et non le souffle.",
        ),
        sl(
          97,
          "1 h 37 en Z2, sans le moindre bloc rapide ni accélération finale. Dans ce cycle, la sortie longue soutient la séance de qualité, elle ne la double pas.",
          "Reprendre la progression du dimanche exactement là où le deuxième cycle l'avait laissée, en la gardant entièrement facile pour préserver la qualité des blocs en Z3.",
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
      'Six kilomètres au seuil',
      "Troisième et dernière marche du cycle, la plus chargée des trois. On repart du 2000 m, mais cette fois la descente est plus longue : quatre kilomètres derrière, à enchaîner alors que les jambes sont déjà lourdes. C'est la semaine où l'allure du semi cesse d'être une hypothèse.",
      [
        ef(
          65,
          "1 h 05 en Z2 sur terrain souple de préférence, sans la moindre accélération. La semaine est déjà lourde, cette sortie n'a rien à prouver.",
          "Entretenir le volume dans la semaine la plus chargée du cycle spécifique, sans rien retirer aux six kilomètres rapides qui l'accompagnent.",
        ),
        seuil(
          73,
          "20 min d'échauffement en Z2, puis 2 fois 2000 m puis 4 fois 1000 m en Z4, en comptant environ 8 min 30 par 2000 m et 4 min par 1000 m, avec 2 min de trottinement en Z1 entre chaque bloc, puis 10 min de retour au calme en Z2. Ces deux repères sont une estimation de planification et jamais une allure à tenir. Les quatre kilomètres de la fin arrivent sur des jambes déjà chargées, et c'est tout leur intérêt.",
          "Placer les kilomètres derrière les blocs longs plutôt que devant, ce qui reproduit assez fidèlement l'état de jambes du dix-septième kilomètre.",
        ),
        sl(
          102,
          "1 h 42 en Z2 sur terrain varié. Mange deux à trois heures avant si la sortie est matinale, et applique le protocole de boisson que tu as réglé en semaine 6.",
          "Approcher le plafond du dimanche dans une semaine qui porte déjà six kilomètres rapides, ce qui la rend plus exigeante que le pic ne le sera en intensité.",
        ),
        renfo(
          25,
          "2 séries de : 1 min de planche ventrale, 45 s de gainage latéral par côté, 22 squats, 40 s de chaise contre un mur, 20 fentes marchées.",
          "Travailler la tenue posturale en état de fatigue installée, car c'est elle qui lâche la première après la deuxième heure de course.",
        ),
      ],
    ),

    semaine(
      12,
      'allegee',
      'Respirer juste avant le sommet',
      "Troisième et dernière semaine plus douce du programme. Le volume tombe de 16 % et le travail se réduit à six demi-kilomètres. Placer une semaine calme juste avant la plus lourde des quinze n'est pas une contradiction, c'est exactement ce qui la rend faisable.",
      [
        ef(
          65,
          "1 h 05 en Z2, tranquilles. Si une gêne traîne depuis les trois semaines du bloc spécifique, c'est maintenant qu'il faut la traiter, pas dans quinze jours.",
          "Ouvrir une fenêtre pour éteindre les petites alertes tant qu'il reste assez de temps devant pour le faire sans perdre de forme.",
        ),
        seuil(
          52,
          "20 min d'échauffement en Z2, puis 6 fois 500 m en Z4, en comptant environ 2 min par 500 m, avec 2 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ce repère de 2 min est une estimation de planification et jamais une allure à tenir. Autant de récupération que d'effort : la séance ne doit rien coûter.",
          "Rappeler l'intensité en demi-kilomètres, format assez bref pour ne rien prélever sur la fraîcheur juste avant la semaine la plus lourde des quinze.",
        ),
        sl(
          85,
          "1 h 25 en Z2, un quart d'heure de moins que la semaine passée. Termine avec la sensation nette d'avoir de la marge et l'envie d'y retourner.",
          "Laisser le fond reculer d'un cran pour aborder la semaine sommet avec des jambes qui ont réellement récupéré, et non avec l'envie d'y arriver.",
        ),
        renfo(
          20,
          "2 séries de : 45 s de planche ventrale, 30 s de gainage latéral par côté, 15 squats, 12 fentes par jambe. Puis 6 min de mobilité des hanches et des chevilles.",
          "Passer momentanément du renforcement à l'entretien, l'enjeu de la semaine n'est pas de gagner de la force mais d'arriver frais.",
        ),
      ],
    ),

    semaine(
      13,
      'bloc3',
      'Le pic de charge',
      "Semaine la plus lourde des quinze, et séance reine du programme : deux fois vingt minutes à l'allure du dossard, soit près de la moitié du semi. Elle arrive juste après une semaine douce, c'est ce qui te permet de l'encaisser. Si tu la termines proprement, le 8 novembre est déjà largement à ta portée.",
      [
        ef(
          70,
          "1 h 10 en Z2, sans lignes droites : la séance à l'allure de course réclame toute la fraîcheur disponible cette semaine. Si les jambes sont lourdes au lendemain, fais-la entièrement en Z1.",
          "Fournir du volume neutre entre les deux rendez-vous les plus exigeants du programme, sans rien y ajouter.",
        ),
        tempo(
          75,
          "20 min d'échauffement en Z2, puis 2 fois 20 min en Z3 avec 5 min de trottinement en Z1 entre les deux, puis 10 min de retour au calme en Z2. Vingt minutes d'affilée à l'allure visée, deux fois : si les deux blocs se ressemblent, ton allure de dimanche est la bonne et il n'y a plus rien à prouver.",
          "Valider quarante minutes à l'allure visée, soit près de la moitié du semi, au moment précis où la charge est à son maximum et où la réponse compte vraiment.",
        ),
        sl(
          105,
          "1 h 45 en Z2, la plus longue du programme et le plafond utile sur un semi. Elle reste facile intégralement : le but est la durée, pas l'effort. Prévois-la un jour où rien ne te presse.",
          "Atteindre le maximum d'endurance qui serve encore un semi, au-delà on accumule de la fatigue sans rien gagner sur la course.",
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 22 squats, 20 fentes marchées, 45 s de pont fessier sur une jambe en alternant. Étirements complets pour finir, sans forcer.",
          "Boucler le renforcement à son point haut avant de le réduire nettement pour les trois dernières semaines.",
        ),
      ],
    ),

    semaine(
      14,
      'affutage',
      'La répétition générale',
      "Début de l'affûtage. Le volume recule de 28 % d'un coup, et la séance de qualité reprend le format de la semaine dernière en plus court : deux fois quinze minutes à l'allure du dossard. Tu vas te sentir bizarrement frais et avoir envie d'en faire plus, ne cède pas, c'est exactement le but.",
      [
        ef(
          52,
          "41 min en Z2, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 7 min en Z2. En début de semaine, jamais la veille de la séance de qualité.",
          "Garder les trois rendez-vous hebdomadaires sans compenser la baisse de charge, et rappeler la vitesse aux jambes en quantité volontairement minuscule.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          63,
          "20 min d'échauffement en Z2, puis 2 fois 15 min en Z3 avec 3 min de trottinement en Z1 entre les deux, puis 10 min de retour au calme en Z2. Cinq minutes de moins par bloc qu'au pic, et une récupération plus courte : la dose baisse, la sensation reste identique.",
          "Refaire le geste de la course une dernière fois à dose réduite, quand il reste le temps de récupérer mais plus celui de gagner de la forme.",
        ),
        sl(
          65,
          "1 h 05 en Z2 seulement. Après plusieurs semaines à une heure et demie et plus, tu vas trouver ça ridiculement court : c'est précisément l'effet recherché.",
          "Couper franchement dans le dimanche pour laisser la fraîcheur remonter, l'endurance construite en treize semaines ne se perd pas en quinze jours.",
        ),
        renfo(
          15,
          "2 séries de : 40 s de planche ventrale, 25 s de gainage latéral par côté, 12 squats lents. Puis 5 min d'étirements doux.",
          "Rappeler le gainage qui tiendra le buste droit dans la deuxième heure de course, sans rien réclamer à un corps qui sort de treize semaines de sorties longues.",
        ),
      ],
    ),

    semaine(
      15,
      'affutage',
      'Semaine de course',
      "Dimanche 8 novembre, tu cours le semi-marathon de Bordeaux. Les deux séances de la semaine sont volontairement courtes, 40 et 38 min là où tu tournes à une heure et plus depuis trois mois : ce n'est pas un oubli de programmation, c'est le seul moyen d'arriver frais. Tout ce qui dépasse cette dose sert la fatigue et pas le chrono.",
      [
        ef(
          40,
          "40 min en Z2 en début de semaine, lundi ou mardi. Souple, sans rien chercher, et aucune ligne droite. Séance courte à dessein : ce qui dépasse trois quarts d'heure ne te rapporte plus rien maintenant.",
          "Évacuer les dernières traces d'affûtage et garder le geste de course sans créer un gramme de fatigue supplémentaire.",
        ),
        seuil(
          38,
          "12 min d'échauffement en Z2, puis 5 fois 500 m en Z4, en comptant environ 2 min par 500 m, avec 2 min 15 de trottinement en Z1 entre chaque, puis 7 min de retour au calme en Z2. Ces 2 min sont une estimation de planification et jamais une allure à tenir. À placer mercredi au plus tard : cinq demi-kilomètres, c'est un rappel et pas un entraînement.",
          "Remettre en bouche une intensité supérieure à celle de dimanche, en quantité si faible qu'elle ne creuse aucun déficit avant le départ.",
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
      "Aucune intensité, aucun chrono, aucune comparaison. Des sorties de 35 à 48 min seulement : après quinze semaines à une heure et plus, cette brièveté est la séance elle-même et non un reliquat du programme. Un semi laisse des traces plus profondes qu'un 10 km, ces sept jours sont les fondations de ta prochaine préparation.",
      [
        recup(
          35,
          "35 min en Z1, trois à quatre jours après la course, pas avant. Si les jambes sont encore raides, remplace par 45 min de marche, le bénéfice est identique.",
          "Relancer la circulation pour évacuer les courbatures plus vite qu'en restant immobile.",
        ),
        recup(
          42,
          "42 min en Z1 en milieu de semaine. Tu vas avoir envie d'accélérer parce que les sensations reviennent : ne le fais pas, elles reviennent toujours trop tôt.",
          "Laisser le retour des sensations se faire de lui-même plutôt que de le provoquer.",
        ),
        recup(
          48,
          "48 min en Z1 sur terrain souple, en fin de semaine. Trois quarts d'heure au lieu de l'heure trois quarts du dimanche, et c'est le but : cette sortie referme le cycle, elle ne le prolonge pas. Choisis le parcours pour le paysage et laisse la montre à la maison.",
          "Refermer la préparation sur une note agréable, ce qui compte autant que le reste pour avoir envie de recommencer.",
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
