import { ef, sl, tempo, seuil, vma, recup, renfo, course, semaine } from './seances.js';

/**
 * P6, 16 km d'Andernos. Neuf semaines de préparation plus une de récupération,
 * soit dix entrées.
 *
 * La course a lieu le dimanche 27 septembre 2026, dernier jour de la semaine 9,
 * exactement comme le 10 km d'Izon. C'est la conséquence la plus structurante
 * du programme : Andernos et Izon tombent le même jour, personne ne peut courir
 * les deux. Il n'existe donc aucune variante de semaine 9 ici, aucun champ
 * `variantes` nulle part dans le fichier, et le champ `izon` vaut 'aucune' et
 * non 'option'. Un coureur qui choisit P6 renonce mécaniquement à la course
 * test : la question ne lui est pas posée, et l'option Izon n'est pas proposée
 * dans le formulaire d'inscription. `semaineDuProgramme` traverse ce programme
 * sans jamais entrer dans sa branche de résolution de variante, comme pour P1 et
 * P5, et l'option faitIzon y est sans effet quelle que soit sa valeur.
 *
 * Le public est celui du club, le même que celui de P1 et de P3 : tout le monde
 * boucle le 10 km en moins d'une heure et sort déjà 1 h 15 le dimanche sur
 * terrain vallonné. Ce ne sont pas des débutants. Trois séances de course par
 * semaine, une séance de renforcement, aucune allure chiffrée : l'intensité se
 * lit uniquement en zones 1 à 5 et chacun règle son curseur sur sa propre
 * respiration, ce qui permet au groupe de partir ensemble quel que soit le
 * niveau.
 *
 * Où se situe un 16 km
 * --------------------
 * Entre le 10 km et le semi, et le calibrage le dit chiffre par chiffre. Sur
 * les sept semaines de bloc, P6 est partout strictement au-dessus de P1 et
 * strictement en dessous de P3 :
 *
 *   semaine     S1    S2    S3    S4    S5    S6    S7
 *   P1  10 km   165   175   190   160   192   200   208
 *   P6  16 km   175   185   200   170   202   215   225
 *   P3  semi    185   195   207   175   210   222   233
 *
 * La sortie longue suit la même logique : 65 min au départ, 1 h 30 au plafond,
 * entre les 1 h 15 d'une prépa 10 km et les 1 h 45 d'une prépa semi. Au-delà
 * d'une heure et demie, l'endurance gagnée ne sert plus un 16 km, elle coûte
 * seulement de la récupération.
 *
 * Barème de volumes, hors course objectif et hors renfo, en minutes :
 * S1 175, S2 185, S3 200, S4 170, S5 202, S6 215, S7 225 (pic), S8 178,
 * S9 80, S10 125.
 *
 * Sortie longue, semaine par semaine : 65, 70, 75 puis 65 ; 80, 85, 90 puis 68.
 * Elle grimpe à l'intérieur de chaque cycle et ne redescend qu'au passage d'une
 * semaine plus douce ou de l'affûtage.
 *
 * Trame, celle de P1 :
 *
 *   S1 S2 S3 progressives, S4 plus douce
 *   S5 S6 S7 progressives, S7 au pic de charge
 *   S8 S9 affûtage, la course le dernier jour de S9
 *   S10 récupération
 *
 * Garde-fou de durée, décision de l'encadrant :
 *   toute séance de course d'une semaine normale (bloc1, bloc2, allégée et le
 *   premier palier d'affûtage) fait au minimum 50 minutes ;
 *   la sortie longue tient dans la fourchette 65 à 90 min et ne recule jamais à
 *   l'intérieur d'un cycle ;
 *   deux exceptions assumées, la semaine de course (S9) et la semaine de
 *   récupération (S10), où des séances de 37 à 48 min sont le but recherché et
 *   non un oubli de programmation. Les textes de ces deux semaines le disent
 *   noir sur blanc, pour qu'un coureur habitué à une heure ne croie pas à une
 *   erreur de saisie.
 *   Le renforcement reste entre 15 et 25 min et n'est pas concerné.
 *
 * Le point le plus serré du barème est le couple S3 / S4. Une semaine allégée
 * doit tomber à 85 % ou moins de la précédente : 200 fois 0,85 fait exactement
 * 170, et S4 vaut 170 tout rond. C'est ce plafond, et lui seul, qui fixe la
 * séance de côte à 55 min et l'endurance de la semaine à 50 min pile.
 *
 * Le menu, semaine par semaine, neuf formats et pas un doublon :
 *   S1  bloc1     2 séries de 8 fois 200 m en Z5 ;
 *   S2  bloc1     2 fois 14 min en Z3, l'allure du dossard dès le premier bloc ;
 *   S3  bloc1     4 fois 1000 m puis 4 fois 500 m en Z4 ;
 *   S4  allégée   9 montées de 1 min en côte, entre Z4 et Z5 ;
 *   S5  bloc2     2 fois 2000 m puis 5 fois 500 m en Z4 ;
 *   S6  bloc2     2 séries de 6 fois 400 m en Z5 ;
 *   S7  bloc2     2 fois 3000 m puis 2 fois 500 m en Z4, la séance reine ;
 *   S8  affûtage  2 fois 11 min en Z3, répétition générale ;
 *   S9  affûtage  2 fois 1000 m puis 2 fois 500 m en Z4, rappel avant le départ.
 *
 * Une séance de qualité par semaine, dès la première. La règle « Z3 avant Z4
 * avant Z5 » ne s'applique pas à ce groupe, qui court toute l'année : le
 * travail rapide arrive en semaine 1, sur les fractions les plus courtes du
 * programme, et les trois zones de travail sont déjà toutes employées à la fin
 * du premier bloc.
 *
 * Fractionné en distance, adapté à 16 km
 * ---------------------------------------
 * Six des neuf séances de qualité se comptent en mètres et la longueur des
 * répétitions suit la distance préparée : le 1000 m, le 2000 m et le 3000 m
 * portent le travail au seuil, le 400 m et le 200 m ne servent qu'à garder le
 * pied vif, le 500 m sert de finisseur derrière un bloc long et de rappel la
 * semaine de course. Les deux séances en minutes sont les deux blocs en Z3 :
 * un effort tenu à l'allure spécifique ne se pense pas en mètres, il se pense
 * en durée, et cette allure-là pèse bien plus lourd sur 16 km que sur 10, où le
 * seuil suffit à tout expliquer. La neuvième exception est la côte de S4, qu'une
 * pente rend incomparable d'un coureur à l'autre. Une distance n'est pas une
 * allure : chacun court son 2000 m dans la zone demandée, à son propre rythme,
 * et la règle « jamais d'allure en min/km ni de vitesse chiffrée » reste
 * absolue.
 *
 * Repère de durée par répétition. Le projet impose que la somme des segments
 * décrits égale exactement la durée déclarée de la séance. Une distance, elle,
 * ne dure pas le même temps pour tout le monde. Chaque séance en distance donne
 * donc un repère par répétition, qui sert à deux choses et à deux seulement :
 * faire retomber le calcul juste, et permettre au coureur de savoir combien de
 * temps bloquer sur son créneau. Repères retenus, cohérents avec un groupe qui
 * passe sous l'heure au 10 km : environ 4 min pour 1000 m, 8 min 30 pour 2000 m
 * et 13 min pour 3000 m en Z4, 2 min pour 500 m en Z4, 1 min 40 pour 400 m et
 * 45 s pour 200 m en Z5. Chacune des six séances en distance redit, dans ses
 * propres mots et au moins une fois, que ce repère est une estimation de
 * planification et jamais une allure à tenir : le coureur le plus lent du
 * groupe ne doit à aucun moment se croire en faute.
 *
 * Lignes droites, décision de l'encadrant. Des accélérations de 15 à 20 s en Z5
 * sont placées en fin d'endurance fondamentale à partir de la fin du premier
 * bloc, donc en S3, puis entretenues en S5, S6 et S8. Récupération en marchant,
 * complète, et quelques minutes de travail rapide au total. Elles sont écartées
 * des semaines qui n'en ont pas besoin : S1 et S2, avant leur introduction à la
 * fin du premier bloc ; S4, où la côte fait déjà tout le travail de vivacité ;
 * S7, la semaine au pic de charge, à laquelle on n'ajoute rien ; et S9, la
 * semaine de course, où l'on ne cherche plus qu'à arriver frais.
 *
 * Convention de calcul des séances à intervalles (tempo, seuil, vma) : pour N
 * répétitions, la description ne compte que N-1 récupérations, celles qui
 * tombent entre deux répétitions. Une séance en deux séries compte donc les
 * récupérations courtes à l'intérieur de chaque série, plus une récupération
 * entre les deux séries. La somme échauffement + répétitions + récupérations +
 * retour au calme est toujours strictement égale à la durée déclarée en premier
 * argument. Même règle pour les lignes droites, logées à l'intérieur de la durée
 * de l'endurance et non ajoutées par-dessus : 4 lignes de 15 s avec 1 min de
 * marche entre chaque font 4 min, 6 lignes de 20 s en font 7.
 *
 * Échauffement progressif, barème appliqué aux séances TEMPO, SEUIL et VMA
 * selon leur durée déclarée :
 *   40 min et moins   12 min d'échauffement,  7 min de retour au calme ;
 *   41 à 50 min       15 min d'échauffement,  8 min de retour au calme ;
 *   plus de 50 min    20 min d'échauffement, 10 min de retour au calme.
 * Huit des neuf séances de qualité dépassent 50 min et tombent sur le 20/10 qui
 * est le standard de l'encadrant. La neuvième est le rappel de la semaine de
 * course, 37 min, volontairement court, au palier 12/7. Les séances EF, SL,
 * RECUP et RENFO n'ont pas d'échauffement séparé (une sortie en Z2 est son
 * propre échauffement) et ne sont pas concernées.
 *
 * Toute séance dont la description cite une zone plus dure que celle de sa
 * fabrique la déclare via { zonesSecondaires: [...] } : les quatre endurances à
 * lignes droites, qui déclarent Z5, et aucune autre. Les sorties longues sont
 * toutes entièrement en Z2. La séance de côte de S4 n'a rien à déclarer : elle
 * porte Z5, sa zone haute, et ne cite Z4 que comme plancher.
 */
export const P6 = {
  code: 'P6',
  nom: "16 km d'Andernos",
  dateCourse: '2026-09-27',
  izon: 'aucune',
  prerequis:
    "Courir déjà environ 1 h 15 le dimanche sur terrain vallonné et viser les 16 km d'une traite.",
  semainesContenu: [
    semaine(
      1,
      'bloc1',
      'Seize kilomètres commencent par du 200 m',
      "Personne n'attend trois semaines de mise en jambes pour avoir le droit d'accélérer. La préparation s'ouvre au contraire sur les fractions les plus brèves des neuf semaines, seize fois deux cents mètres, un clin d'œil à la distance et surtout la piqûre de rappel qui manque à un groupe qui court toute l'année sans jamais quitter son allure de sortie.",
      [
        ef(
          50,
          "50 min en Z2 sur terrain roulant. Le seul contrôle valable est la parole : tu dois pouvoir répondre à une question par une phrase entière, du premier au dernier kilomètre, et rien d'autre ne compte cette semaine.",
          "Vérifier avant tout le reste que ton allure facile en est vraiment une, puisque c'est elle qui va porter les huit semaines à venir.",
        ),
        vma(
          60,
          "20 min d'échauffement progressif en Z2, puis 2 séries de 8 fois 200 m en Z5, en comptant environ 45 s par 200 m, avec 1 min de trottinement en Z1 entre chaque et 4 min entre les deux séries, puis 10 min de retour au calme en Z2. Ces 45 s sont une estimation de planification et jamais une allure à tenir : sur 200 m, le repère est la sensation, tu dois franchir chaque ligne sans pouvoir prononcer un mot.",
          "Ouvrir la préparation par ce qui manque le plus à un groupe habitué à sortir toujours au même rythme, des fractions assez brèves pour rouvrir la foulée sans laisser la moindre trace de fatigue derrière elles.",
        ),
        sl(
          65,
          "1 h 05 en Z2 d'une seule traite, sur ton parcours vallonné du dimanche. Pars franchement plus lentement que d'habitude sur le premier quart d'heure, tu finiras beaucoup plus solide.",
          "Repartir de la sortie que tu tiens déjà sans chercher à l'allonger tout de suite, pour que le premier cycle s'installe sur une base connue.",
        ),
        renfo(
          20,
          "Gainage et jambes, sans matériel : 3 séries de 40 s de planche ventrale, 25 s de planche sur chaque côté, puis 12 fentes avant par jambe. 1 min de pause entre les séries.",
          "Protéger le bassin et le bas du dos, qui encaissent chaque impact de la foulée et lâchent les premiers quand le volume monte.",
        ),
      ],
    ),

    semaine(
      2,
      'bloc1',
      "L'allure du dossard, tout de suite",
      "Sur seize kilomètres, ce n'est pas la vitesse pure qui décide, c'est la capacité à tenir une allure soutenue longtemps. Autant s'y mettre maintenant : deux blocs de quatorze minutes en Z3, séparés par une vraie coupure, c'est la première dose d'allure spécifique et il y en aura d'autres.",
      [
        ef(
          52,
          "52 min en Z2, régulier de bout en bout. Surveille ta respiration plutôt que ta montre : elle doit rester ample et silencieuse jusqu'à la dernière minute.",
          "Encadrer la première séance soutenue de la préparation par du volume facile, seul moyen de la digérer sans creuser de dette.",
        ),
        tempo(
          63,
          "20 min d'échauffement en Z2, puis 2 fois 14 min en Z3, avec 5 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. En Z3 tu parles encore, par phrases courtes, et la respiration s'entend nettement. Le second bloc doit ressembler au premier : s'il te coûte beaucoup plus cher, c'est que tu as ouvert trop fort.",
          "Poser dès le premier cycle l'allure que tu tiendras réellement le 27 septembre, parce que sur cette distance c'est cette zone-là qui fait le résultat, bien avant la vitesse.",
        ),
        sl(
          70,
          "1 h 10 en Z2. Choisis un parcours avec trois ou quatre bosses franches et passe-les sans jamais accélérer, quitte à raccourcir énormément la foulée dans la pente.",
          "Rallonger le dimanche de quelques minutes en gardant le relief, qui fait déjà partie des habitudes du groupe et qu'on ne cherche pas à fuir.",
        ),
        renfo(
          20,
          "Reprends le gainage de la semaine passée et ajoute 2 séries de 18 squats au poids du corps, pieds à la largeur des épaules, descente lente et remontée franche.",
          "Répéter presque à l'identique pour que le corps assimile, la nouveauté n'apporte rien d'utile à ce stade.",
        ),
      ],
    ),

    semaine(
      3,
      'bloc1',
      'Du kilomètre au demi-kilomètre',
      "Semaine la plus chargée du premier cycle, et celle qui fixe le plafond de la suivante. La séance descend en format au fil de la séance, quatre kilomètres puis quatre demi-kilomètres, pour finir en accélérant. Les premières lignes droites arrivent en fin de footing facile.",
      [
        ef(
          57,
          "47 min en Z2, départ très progressif sur le premier quart d'heure, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 3 min de retour au calme en Z2. Une ligne droite se lance sur les premiers appuis et se relâche avant la fin : tu ne dois jamais terminer en dette de souffle.",
          "Glisser quelques secondes de vitesse pure à la fin d'un footing facile, sur des efforts trop courts pour laisser la moindre trace, maintenant que le premier cycle se termine.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          68,
          "20 min d'échauffement en Z2, puis 4 fois 1000 m puis 4 fois 500 m en Z4, en comptant environ 4 min par 1000 m et 2 min par 500 m, avec 2 min de trottinement en Z1 entre chaque bloc, puis 10 min de retour au calme en Z2. Ces deux repères sont une estimation de planification et jamais une allure à tenir : si ton kilomètre sort en 4 min 40, tu es exactement où il faut du moment que tu tiens la Z4, c'est-à-dire trois ou quatre mots à la fois.",
          "Faire connaissance avec le seuil par une descente de format, du kilomètre au demi-kilomètre, pour que la fin de séance arrive comme une délivrance et non comme une punition.",
        ),
        sl(
          75,
          "1 h 15 en Z2 sans interruption, sur le parcours vallonné du dimanche. C'est ta référence habituelle, elle ne sera plus jamais le plafond de ce programme.",
          "Passer par la durée que tout le monde connaît déjà avant de la dépasser franchement dans le second cycle, pour que la montée se fasse par marches et non d'un bond.",
        ),
        renfo(
          22,
          "2 séries de : 45 s de planche ventrale, 20 fentes marchées, 18 squats, 40 s de pont fessier (allongé sur le dos, bassin décollé, appuis sur les talons). 90 s de pause entre les séries.",
          "Charger les fessiers, moteur de la propulsion et premier maillon à céder dès que la charge hebdomadaire augmente.",
        ),
      ],
    ),

    semaine(
      4,
      'allegee',
      'On coupe la fatigue, pas les sorties',
      "Semaine volontairement plus douce, trente minutes de moins que la précédente, et pas une minute de plus n'est possible : la règle du club veut qu'une semaine allégée tombe à 85 % au maximum de celle qui la précède, et 170 min, c'est exactement ce plafond. Les trois sorties gardent leurs cinquante minutes et plus, la vivacité reste, c'est la fatigue qui part.",
      [
        ef(
          50,
          "50 min en Z2 très tranquilles, sans montre si tu en es capable. Tu cours à la sensation et tu rentres avec l'impression de n'avoir presque rien fait de ta journée.",
          "Laisser les jambes se vider de ce que les trois premières semaines y ont déposé, sans pour autant perdre le rendez-vous du footing.",
        ),
        vma(
          55,
          "20 min d'échauffement en Z2 jusqu'au pied de la côte, puis 9 montées de 1 min en côte, entre Z4 et Z5 selon la pente, avec 2 min de descente en marchant entre chaque, puis 10 min de retour au calme en Z2. Cherche une pente régulière et roulante plutôt qu'un mur : la neuvième montée doit se courir comme la première, c'est le seul critère.",
          "Transformer le relief que ce groupe pratique tous les dimanches en séance à part entière, neuf minutes de poussée suffisant à muscler l'appui sans entamer une semaine délestée.",
        ),
        sl(
          65,
          "1 h 05 en Z2, soit dix minutes de moins que dimanche dernier. Termine en te disant que tu aurais pu repartir pour autant, c'est le signe que la semaine a fait son travail.",
          "Garder le rendez-vous du dimanche tout en coupant franchement la charge, parce que c'est pendant cette semaine-là que les gains du cycle précédent se fixent.",
        ),
        renfo(
          18,
          "Séance courte et facile : 2 séries de 30 s de planche, 12 squats, 10 fentes par jambe, puis 6 min d'étirements doux des mollets, des cuisses et des hanches.",
          "Rester actif sans provoquer la moindre courbature pendant une semaine dont tout l'intérêt est le repos relatif.",
        ),
      ],
    ),

    semaine(
      5,
      'bloc2',
      'On passe au-dessus',
      "Deuxième cycle, et changement d'échelle. La séance ouvre sur deux blocs de deux kilomètres, au-delà de tout ce qui a été fait jusqu'ici d'un seul tenant au seuil, puis fragmente en demi-kilomètres. Le dimanche, lui, dépasse pour la première fois l'heure et quart habituelle.",
      [
        ef(
          53,
          "43 min en Z2 sur un parcours que tu connais par cœur, à placer le surlendemain du seuil et jamais la veille, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 3 min de retour au calme en Z2.",
          "Récupérer activement de la séance dure tout en conservant du volume, et rappeler aux jambes ce qu'est une accélération pendant que le cycle travaille surtout l'endurance.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          69,
          "20 min d'échauffement en Z2, puis 2 fois 2000 m puis 5 fois 500 m en Z4, en comptant environ 8 min 30 par 2000 m et 2 min par 500 m, avec 2 min de trottinement en Z1 entre chaque bloc, puis 10 min de retour au calme en Z2. Chacun de ces deux repères est une estimation de planification et jamais une allure à tenir. Les cinq derniers blocs doivent être les plus faciles de la séance, sinon les deux premiers ont été lancés trop vite.",
          "Passer au-dessus de la distance de travail habituelle avant de fragmenter, pour apprendre à relancer une fois que la lassitude s'est installée dans la foulée.",
        ),
        sl(
          80,
          "1 h 20 en Z2 sur un parcours franchement vallonné. Monte les côtes en gardant la respiration sous contrôle, quitte à finir presque au pas dans les plus raides.",
          "Franchir pour la première fois l'heure et quart, en douceur et avec du relief, puisque c'est cette durée-là qui différencie une prépa 16 km d'une prépa 10 km.",
        ),
        renfo(
          25,
          "3 séries de : 50 s de gainage ventral, 30 s de gainage sur chaque côté, 20 squats, 12 fentes bulgares par jambe, pied arrière posé sur une chaise. 1 min de pause entre les séries.",
          "Monter d'un cran maintenant que le corps encaisse bien la charge de course, avant que l'affûtage ne fasse tout redescendre.",
        ),
      ],
    ),

    semaine(
      6,
      'bloc2',
      'On réveille les jambes',
      "Deux semaines de seuil et de Z3 laissent une foulée efficace mais lourde. Cette semaine remet du 400 m en Z5, douze répétitions en deux séries, pour rappeler au système nerveux qu'il existe autre chose que l'allure spécifique. La sortie longue, elle, continue de grimper.",
      [
        ef(
          56,
          "46 min en Z2 sur terrain souple si tu en trouves, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 3 min en Z2 pour rentrer. Rien de cette séance ne doit se sentir le lendemain.",
          "Ajouter du volume facile au cœur de la semaine la plus dense du deuxième cycle, avec des accélérations assez brèves pour ne rien prélever sur le dimanche.",
          { zonesSecondaires: ['Z5'] },
        ),
        vma(
          74,
          "20 min d'échauffement en Z2, puis 2 séries de 6 fois 400 m en Z5, en comptant environ 1 min 40 par 400 m, avec 2 min de trottinement en Z1 entre chaque et 4 min entre les deux séries, puis 10 min de retour au calme en Z2. Ce 1 min 40 est une estimation de planification et jamais une allure à tenir, il ne sert qu'à savoir combien de temps réserver sur ton créneau.",
          "Rendre de la vivacité au milieu d'un cycle entièrement tourné vers le soutenu, sur des efforts trop courts pour peser sur les deux séances qui les encadrent.",
        ),
        sl(
          85,
          "1 h 25 en Z2. Bois quelques gorgées vers la cinquantième minute et prends l'habitude de le faire sans casser ta foulée : à seize kilomètres, tu passeras une table de ravitaillement.",
          "Approcher le plafond du programme une semaine avant de l'atteindre, dans des conditions calmes et sans aucune intensité ajoutée.",
        ),
        renfo(
          25,
          "Séance en côte : trouve une pente régulière et monte-la 10 fois en marchant vite ou en trottinant, redescente en marchant tranquillement. Termine par 3 fois 50 s de planche.",
          "Muscler la jambe en situation réelle de propulsion, ce qu'aucun exercice au sol ne reproduit vraiment.",
        ),
      ],
    ),

    semaine(
      7,
      'bloc2',
      'Le pic de charge',
      "Semaine la plus lourde des neuf, et séance reine du programme : deux blocs de trois kilomètres au seuil, la plus longue répétition de toute la préparation, suivis de deux demi-kilomètres pour finir vite. Le dimanche atteint son plafond, une heure et demie. Si tu passes cette semaine proprement, Andernos est à ta portée.",
      [
        ef(
          66,
          "66 min en Z2, sans lignes droites cette semaine : rien ne s'ajoute à la charge la plus lourde du programme. Si tu te sens émoussé au lendemain du seuil, fais-la entièrement en Z1, cela n'enlèvera rien à la préparation.",
          "Absorber la semaine la plus dure en gardant du volume facile, seule façon d'encaisser la séance reine sans accumuler de retard de récupération.",
        ),
        seuil(
          69,
          "20 min d'échauffement en Z2, puis 2 fois 3000 m puis 2 fois 500 m en Z4, en comptant environ 13 min par 3000 m et 2 min par 500 m, avec 3 min de trottinement en Z1 entre chaque bloc, puis 10 min de retour au calme en Z2. Ces repères sont une estimation de planification et jamais une allure à tenir. Le second bloc de 3000 m doit sortir dans le même temps que le premier : c'est le seul indicateur qui compte ici.",
          "Enchaîner deux répétitions très longues au moment où la fatigue hebdomadaire est maximale, parce que c'est exactement l'état dans lequel tu aborderas le dixième kilomètre à Andernos.",
        ),
        sl(
          90,
          "1 h 30 en Z2, la sortie la plus longue du programme et le plafond utile pour seize kilomètres. Prévois-la un jour où rien ne te presse ensuite, et rentre en Z1 sur les dix dernières minutes si les jambes le demandent.",
          "Atteindre la durée maximale qui serve encore cette distance, sachant qu'au-delà d'une heure et demie le gain d'endurance ne se paie plus qu'en récupération.",
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 24 fentes marchées, 22 squats, 45 s de pont fessier. Termine par des étirements longs des mollets et des ischio-jambiers.",
          "Verrouiller le gainage juste avant de réduire le renforcement pour toute la durée de l'affûtage.",
        ),
      ],
    ),

    semaine(
      8,
      'affutage',
      "L'affûtage commence",
      "Le volume tombe de plus de quarante minutes et la séance change de nature : on quitte les longues répétitions au seuil pour une répétition générale à l'allure de dimanche prochain, deux blocs de onze minutes. Tu vas te sentir étonnamment frais et avoir envie d'en rajouter. N'en fais rien, c'est précisément le but.",
      [
        ef(
          53,
          "45 min en Z2 sans chercher à compenser la baisse de volume, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 4 min de retour au calme en Z2. À placer en début de semaine, jamais la veille de la séance de qualité.",
          "Tenir les trois rendez-vous de la semaine tout en réduisant la charge pour de bon, et rappeler la vitesse aux appuis en quantité volontairement minuscule.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          57,
          "20 min d'échauffement en Z2, puis 2 fois 11 min en Z3, avec 5 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Cours ces deux blocs exactement comme tu comptes courir dimanche prochain, ni plus vite ni plus lentement : c'est une répétition générale, pas un test de forme.",
          "Rejouer en grandeur nature le rythme du jour J une fois la charge retombée, pour que la sensation soit familière au départ et non découverte au coup de pistolet.",
        ),
        sl(
          68,
          "1 h 08 en Z2, intégralement facile, vingt minutes de moins que la semaine dernière. Résiste à l'envie d'accélérer sur la fin, cette envie est le symptôme de l'affûtage et non un feu vert.",
          "Conserver le rendez-vous du dimanche en le raccourcissant nettement, pour que la fraîcheur monte pendant que l'endurance acquise, elle, ne bouge plus.",
        ),
        renfo(
          18,
          "2 séries de : 40 s de planche, 15 squats, 10 fentes par jambe. On s'arrête là, aucune côte et aucune charge supplémentaire cette semaine.",
          "Entretenir le gainage sans risquer la moindre courbature à une semaine du départ.",
        ),
      ],
    ),

    semaine(
      9,
      'affutage',
      'Semaine de course',
      "Dimanche 27 septembre, tu cours les 16 km d'Andernos. Les deux séances de la semaine durent 43 et 37 min là où tu tournes à plus d'une heure depuis deux mois : ce n'est pas un oubli de programmation, c'est exactement ce qu'il faut pour arriver frais. Tout ce qui dépasse cette dose alimente la fatigue et rien d'autre.",
      [
        ef(
          43,
          "43 min en Z2 en début de semaine, très souple, sur terrain plat de préférence. Séance volontairement courte : cette semaine, chaque minute au-delà de trois quarts d'heure se paie dimanche et ne rapporte rien.",
          "Rester en mouvement et dénouer les jambes sans rien construire, le travail de fond étant terminé depuis une bonne dizaine de jours.",
        ),
        seuil(
          37,
          "12 min d'échauffement en Z2, puis 2 fois 1000 m puis 2 fois 500 m en Z4, en comptant environ 4 min par 1000 m et 2 min par 500 m, avec 2 min de trottinement en Z1 entre chaque bloc, puis 7 min de retour au calme en Z2. Ces repères sont une estimation de planification et jamais une allure à tenir. À placer au plus tard le mercredi : trois kilomètres rapides en tout, c'est un rappel et pas un entraînement.",
          "Remettre en bouche l'allure de dimanche à dose minuscule, assez pour que les jambes la reconnaissent au départ, trop peu pour prélever quoi que ce soit sur la fraîcheur.",
        ),
        course(
          "16 km d'Andernos",
          16,
          85,
          "Ta course. Échauffe-toi 15 min en Z2 avant le départ, avec deux ou trois lignes droites. Pars contenu sur les 3 premiers kilomètres, en Z2 haute, même si le peloton part devant : c'est le piège classique du 16 km, où la distance pardonne beaucoup moins qu'un 10. Installe-toi en Z3 jusqu'au 12e kilomètre, l'allure que tu as répétée en semaines 2 et 8. Sur les 4 derniers, tu passes en Z4 et tu donnes ce qu'il te reste.",
          "L'aboutissement de ces neuf semaines, avec la préparation qu'il faut pour tenir la distance sans jamais subir les cinq derniers kilomètres.",
        ),
        renfo(
          15,
          "Une seule séance très légère en début de semaine : 2 séries de 30 s de planche ventrale et quelques minutes de mobilité des hanches et des chevilles. Plus rien à partir du mercredi.",
          "Entretenir sans fatiguer, tout le travail utile ayant été fait depuis longtemps.",
        ),
      ],
    ),

    semaine(
      10,
      'recuperation',
      'On récupère pour de bon',
      "La semaine la plus importante du programme et la plus souvent bâclée. Aucune intensité, aucun chrono, et des sorties de 38 à 48 min seulement : après neuf semaines passées largement au-dessus de l'heure, cette brièveté est la séance elle-même et non un reste de programme qu'on aurait oublié de remplir.",
      [
        recup(
          38,
          "38 min en Z1, deux ou trois jours après la course. Si les jambes restent lourdes, remplace sans hésiter par 45 min de marche, l'effet est le même.",
          "Relancer la circulation pour évacuer les courbatures nettement plus vite qu'en restant immobile.",
        ),
        recup(
          42,
          "42 min en Z1 en milieu de semaine. Si tu te surprends à accélérer parce que les sensations reviennent, lève le pied : le corps répare encore, même quand il ne le dit plus.",
          "Reprendre en douceur en laissant les sensations commander, sans aucun objectif de durée ni de parcours.",
        ),
        recup(
          45,
          "45 min en Z1 sur terrain souple, sans montre si tu veux. Trois quarts d'heure au lieu de l'heure et demie du dimanche précédent, et c'est le but : cette sortie referme le cycle, elle ne le prolonge pas.",
          "Retrouver des sensations normales et l'envie de choisir un prochain dossard, ce qui est le vrai signe que la récupération est faite.",
        ),
        renfo(
          15,
          "Étirements doux et mobilité : 15 min de travail des hanches, des mollets, des ischio-jambiers et du haut du dos, en respirant lentement sur chaque position.",
          "Redonner de la souplesse à des muscles raidis par neuf semaines de charge continue.",
        ),
      ],
    ),
  ],
};
