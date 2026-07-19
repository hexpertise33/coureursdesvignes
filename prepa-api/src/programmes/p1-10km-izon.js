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
 * Une séance de qualité par semaine, et neuf séances différentes. Second
 * correctif de l'encadrant, celui qui a produit la version actuelle : « ce ne
 * sont pas des débutants, donc varie les séquences ». Le programme montait
 * jusque-là par paliers d'intensité, Z3 d'abord, Z4 ensuite, Z5 en dernier, et
 * ne connaissait que deux formats sur ses trois premières semaines, dont deux
 * semaines entières sans la moindre séance de qualité. Cette prudence est celle
 * qu'on doit à un coureur qui découvre l'intensité. Le groupe court toute
 * l'année : la règle « Z3 avant Z4 avant Z5 » est abandonnée pour ce programme,
 * et le travail rapide arrive dès la semaine 1.
 *
 * Le menu, semaine par semaine, neuf formats et pas un doublon :
 *   S1  bloc 1     12 fois 200 m en Z5, récupération en trottinant ;
 *   S2  bloc 1     tempo continu, 20 min en Z3 d'un seul tenant ;
 *   S3  bloc 1     10 fois 400 m en Z5 ;
 *   S4  allégée    8 fois 45 s en côte, entre Z4 et Z5, descente en marchant ;
 *   S5  bloc 2     5 fois 1000 m en Z4 ;
 *   S6  bloc 2     2 fois 2000 m puis 2 fois 1000 m en Z4, pyramide descendante ;
 *   S7  bloc 2     6 fois 1000 m en Z4, la séance reine du pic ;
 *   S8  affûtage   8 fois 400 m en Z5, court et vif, peu fatigant ;
 *   S9  affûtage   5 fois 500 m en Z4, rappel avant la course.
 *
 * La séance de côte de la semaine 4 est délibérée. Les coureurs s'entraînent
 * sur terrain vallonné, le format leur parle sans explication, et il casse la
 * routine sans coûter cher : huit fois quarante-cinq secondes font six minutes
 * de travail, la semaine reste allégée pour de bon.
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
 * S9 75, S10 120. Il n'a pas bougé d'une minute avec la nouvelle trame de
 * séances : c'est l'endurance fondamentale de chaque semaine qui absorbe les
 * écarts de durée d'une séance de qualité à l'autre, jamais la sortie longue,
 * qui garde exactement les durées validées (63, 65, 70, 60, 72, 74, 75, 60).
 *
 * Le plancher des 50 min contraint le barème par le bas : une semaine normale
 * ne peut pas descendre sous 50 + 50 + 60, soit 160 min. Comme la semaine
 * allégée doit tomber à 85 % ou moins de la précédente, S3 ne pouvait pas
 * valoir moins de 160 / 0,85, soit 189 min. S3 est donc à 190 et S4 à 160,
 * exactement au plancher : c'est le point le plus serré du programme, et c'est
 * lui qui fixe la durée de la séance de côte à 50 min tout rond.
 *
 * Les semaines 1 et 4 n'avaient aucune séance de qualité. Elles en ont une
 * désormais : leur troisième séance de course, qui était un second footing,
 * est devenue la séance de la semaine. Le nombre de séances par semaine, lui,
 * n'a pas changé.
 *
 * Durée ou distance. Sur un 10 km, l'essentiel du travail de qualité se repère
 * en mètres, et le programme s'y tient : sept séances sur neuf sont écrites en
 * distance. Les deux exceptions sont les deux formats qu'une distance
 * décrirait mal, le tempo continu de S2 (personne ne court un « 3800 m en
 * Z3 ») et les montées de S4, qu'une pente rend incomparables d'un coureur à
 * l'autre. Une distance n'est pas une allure : chacun court son 1000 m dans la
 * zone demandée, à son propre rythme, et la règle « jamais d'allure en min/km
 * ni de vitesse chiffrée » reste absolue.
 *
 * Repère de durée par répétition, et pourquoi il est là. Le projet impose que
 * la somme des segments décrits égale exactement la durée déclarée de la
 * séance (voir la convention de calcul plus bas). Une distance, elle, ne dure
 * pas le même temps pour tout le monde. Chaque séance en distance donne donc
 * un repère de durée par répétition, qui sert à deux choses et à deux
 * seulement : faire retomber le calcul juste, et permettre au coureur de
 * savoir combien de temps prévoir. Repères retenus, cohérents avec un groupe
 * qui passe sous l'heure au 10 km : environ 4 min pour 1000 m et 8 min 30 pour
 * 2000 m en Z4, 2 min pour 500 m en Z4, 1 min 40 pour 400 m et 45 s pour
 * 200 m en Z5. Chacune des sept séances en distance redit, dans ses propres
 * mots, que ce repère est une estimation de planification et jamais une allure
 * à tenir : le coureur le plus lent du groupe ne doit à aucun moment se croire
 * en faute.
 *
 * Corollaire de cette convention : le format retenu est celui qui fait tomber
 * le compte juste. Les 200 m de S1 et les 400 m de S3 sont écrits en deux
 * séries, avec une récupération plus longue entre les séries : à 45 s et à
 * 1 min 40 la répétition, aucune récupération unique en minutes entières ne
 * permet à ces deux séances d'atteindre à la fois le plancher de 50 min et un
 * total juste. La coupure n'est donc pas décorative, elle est ce qui rend la
 * séance calculable, et elle a par ailleurs du sens à l'entraînement.
 *
 * Lignes droites, décision de l'encadrant. Des accélérations de 15 à 20 s en
 * Z5 sont placées en fin d'endurance fondamentale à partir de la fin du
 * premier bloc, donc en S3, puis entretenues en S5, S6 et S8. Elles gardent le
 * pied vif les semaines où la séance de qualité travaille l'allure de course
 * et non la vitesse. Ce ne sont pas des séances de vitesse : la récupération
 * se fait en marchant, complète, et le volume total de travail rapide reste de
 * quelques minutes. Elles ne sont jamais placées la veille d'une séance dure,
 * ni en S4 (semaine allégée, la côte suffit largement), ni en S7 (la semaine
 * est au pic de charge), ni en S9 (semaine de course, on ne cherche plus qu'à
 * arriver frais).
 *
 * Convention de calcul des séances à intervalles (tempo, seuil, vma) : pour N
 * répétitions, la description ne compte que N-1 récupérations, celles qui
 * tombent entre deux répétitions. Une séance en deux séries compte donc N-2
 * récupérations courtes plus une récupération entre les séries. La somme
 * échauffement + répétitions + récupérations + retour au calme doit toujours
 * être strictement égale à la durée déclarée en premier argument de la séance.
 * Pour une séance en distance, la répétition est comptée à son repère de
 * durée : 5 fois 1000 m à environ 4 min font 20 min de travail, ni plus ni
 * moins dans le calcul.
 *
 * Échauffement progressif, décision de l'encadrant. Barème appliqué à toutes
 * les séances à intensité (TEMPO, SEUIL, VMA), en fonction de la durée
 * déclarée :
 *   40 min et moins   12 min d'échauffement,  7 min de retour au calme ;
 *   41 à 50 min       15 min d'échauffement,  8 min de retour au calme ;
 *   plus de 50 min    20 min d'échauffement, 10 min de retour au calme.
 * Sept des neuf séances de qualité dépassent 50 min et tombent donc sur le
 * 20/10 qui est le standard de l'encadrant. Les deux autres sont les deux
 * séances volontairement courtes du programme, la côte de la semaine allégée
 * (50 min, palier 15/8) et le rappel de la semaine de course (37 min, palier
 * 12/7). Les séances EF, SL, RECUP et RENFO n'ont pas d'échauffement séparé
 * (une sortie en Z2 est son propre échauffement) et ne sont pas concernées.
 *
 * Toute séance dont la description cite une zone plus dure que celle de sa
 * fabrique doit la déclarer explicitement via { zonesSecondaires: [...] }
 * (voir le commentaire de seances.js). C'est le cas des quatre endurances à
 * lignes droites, qui déclarent Z5, et de la sortie longue de S8, qui déclare
 * Z3. La séance de côte de S4, elle, n'a rien à déclarer : elle porte Z5, sa
 * zone haute, et ne cite Z4 que comme plancher.
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
      'Vite dès la première semaine',
      "Pas de mise en jambes de trois semaines avant d'avoir le droit d'accélérer. La préparation s'ouvre sur les fractions les plus courtes des neuf semaines, des 200 m, parce que c'est exactement ce qui manque à un groupe qui court à l'année sans jamais sortir de son allure de sortie.",
      [
        ef(
          50,
          "50 min en Z2 sur terrain roulant. Tu dois pouvoir tenir une conversation complète du début à la fin : c'est le seul repère de la séance, le chrono n'en est pas un.",
          "Vérifier que ton allure d'endurance en est vraiment une, c'est elle qui portera les huit semaines suivantes.",
        ),
        vma(
          52,
          "20 min d'échauffement progressif en Z2, puis 2 séries de 6 fois 200 m en Z5, en comptant environ 45 s par 200 m, avec 1 min de trottinement en Z1 entre chaque et 3 min entre les deux séries, puis 10 min de retour au calme en Z2. Ces 45 s sont une estimation de planification et jamais une allure à tenir : le repère de la séance est la sensation, tu dois finir chaque 200 m sans pouvoir prononcer un mot.",
          "Ouvrir la préparation par de la vitesse pure au lieu de la garder pour la fin : sur des fractions de 200 m, la foulée se rouvre en une séance là où deux mois de Z2 ne la débloqueraient jamais.",
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
      'Vingt minutes sans couper',
      "Changement complet de séquence. Après les fractions les plus courtes du programme, l'effort le plus long d'un seul tenant : vingt minutes en Z3, sans une seule récupération derrière laquelle s'abriter. Deux semaines, deux exercices qui n'ont rien à voir.",
      [
        ef(
          55,
          "55 min en Z2, régulier. Surveille ta respiration plutôt que ta montre : elle doit rester ample et silencieuse jusqu'au bout.",
          "Entretenir le volume facile qui encadre la première séance continue de la préparation.",
        ),
        tempo(
          55,
          "20 min d'échauffement progressif en Z2, puis 20 min en Z3 d'un seul tenant, sans jamais couper, puis 5 min de trottinement en Z1 pour redescendre, puis 10 min de retour au calme en Z2. En Z3 tu parles encore, par phrases courtes, et la respiration s'entend nettement du début à la fin.",
          "Opposer au fractionné de la semaine précédente un effort continu et sans répit : c'est le seul format qui apprenne à répartir sa dépense sur vingt minutes pleines, ce que demandera le milieu de course à Izon.",
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
      "Semaine la plus chargée du premier bloc, et la plus serrée du programme : c'est elle qui fixe le plancher de la semaine allégée qui suit. Les fractions passent de 200 à 400 m, même zone mais deux fois plus longues, et les premières lignes droites arrivent en fin de footing facile.",
      [
        ef(
          56,
          "46 min en Z2, départ très progressif sur les 10 premières minutes, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 3 min de retour au calme en Z2. Une ligne droite se lance progressivement sur les premiers appuis et se relâche avant la fin : tu ne dois jamais terminer en dette de souffle.",
          "Poser les premières lignes droites en fin de footing facile : quelques secondes de vitesse pure suffisent à entretenir la foulée, sur des efforts trop courts pour laisser la moindre fatigue.",
          { zonesSecondaires: ['Z5'] },
        ),
        vma(
          64,
          "20 min d'échauffement en Z2, puis 2 séries de 5 fois 400 m en Z5, en comptant environ 1 min 40 par 400 m, avec 1 min 40 de trottinement en Z1 entre chaque et 4 min entre les deux séries, puis 10 min de retour au calme en Z2. Ce 1 min 40 est une estimation de planification et jamais une allure à tenir, il sert seulement à savoir combien de temps prévoir.",
          "Doubler la longueur des fractions de la semaine 1 sans changer de zone : c'est sur 400 m que la foulée commence à se déformer, et donc là qu'on apprend à la tenir jusqu'au bout.",
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
      'On lève le pied, pas le rythme',
      "Semaine allégée volontaire, 30 min de moins que la précédente. La charge tombe, la vivacité reste : la séance de qualité est la plus courte des neuf, huit montées de côte et rien d'autre. Les trois séances gardent leurs cinquante minutes, on ne coupe pas les sorties, on coupe la fatigue.",
      [
        ef(
          50,
          "50 min en Z2 très tranquilles, sans montre si tu peux. Tu cours à la sensation et tu rentres avec l'impression de n'avoir presque rien fait.",
          "Laisser les jambes se vider de la fatigue accumulée sur les trois semaines du premier bloc.",
        ),
        vma(
          50,
          "15 min d'échauffement en Z2 jusqu'au pied de la côte, puis 8 montées de 45 s en côte, entre Z4 et Z5 selon la pente, avec 3 min de descente en marchant entre chaque, puis 8 min de retour au calme en Z2. Cherche une pente régulière et roulante, pas un mur : tu dois pouvoir courir les huit montées de la même façon, la dernière comme la première.",
          "Utiliser le relief que ces coureurs pratiquent tous les dimanches comme séance à part entière : six minutes de travail seulement, assez pour muscler la poussée et casser la routine, trop peu pour entamer une semaine allégée.",
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
      'Les premiers 1000 m',
      "Deuxième bloc, nouveau terrain de jeu. Après trois formats courts ou continus, on entre dans la distance de la course elle-même : des 1000 m en Z4, l'allure que tu tiendras le jour du 10 km, avec des récupérations encore confortables.",
      [
        ef(
          54,
          "44 min en Z2, à placer le surlendemain du seuil et jamais la veille, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 3 min de retour au calme en Z2.",
          "Récupérer activement du seuil tout en gardant du volume, et garder le pied vif pendant que le deuxième bloc travaille l'allure de course.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          66,
          "20 min d'échauffement en Z2, puis 5 fois 1000 m en Z4, en comptant environ 4 min par 1000 m, avec 4 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ces 4 min sont une estimation de planification et jamais une allure à tenir : si tes 1000 m sortent en 4 min 30 ou en 5 min, tu es exactement où il faut du moment que tu es en Z4, c'est-à-dire à trois ou quatre mots à la fois.",
          "Installer l'allure du dossard sur la distance de référence d'une prépa 10 km, avec des récupérations assez longues pour que les cinq répétitions se ressemblent toutes.",
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
      'La pyramide descendante',
      "Même zone qu'en semaine 5, séquence renversée. On commence au-dessus de la distance de course, avec deux blocs de 2000 m, puis on redescend sur des 1000 m. C'est la seule séance du programme qui attaque par le plus long, et c'est ce qui la rend particulière.",
      [
        ef(
          59,
          "49 min en Z2 sur un parcours que tu connais par cœur, pour n'avoir rien à décider en courant, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 3 min en Z2 pour rentrer.",
          "Ajouter du volume facile dans une semaine dense du deuxième bloc, avec des accélérations assez brèves pour ne rien retirer ni au seuil ni au dimanche.",
          { zonesSecondaires: ['Z5'] },
        ),
        seuil(
          67,
          "20 min d'échauffement en Z2, puis 2 fois 2000 m puis 2 fois 1000 m en Z4, en comptant environ 8 min 30 par 2000 m et 4 min par 1000 m, avec 4 min de trottinement en Z1 entre chaque bloc, puis 10 min de retour au calme en Z2. Chacun de ces deux repères est une estimation de planification et jamais une allure à tenir. La pyramide descend pour une raison : les deux 1000 m de la fin doivent être les plus faciles à courir de la séance.",
          "Commencer l'effort spécifique au-delà de la distance de course pour que la distance de course paraisse courte ensuite : c'est le seul moment du programme où le 1000 m arrive en récompense et non en épreuve.",
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
      "Semaine la plus lourde des neuf et séance reine du programme : six kilomètres à l'allure du dossard, avec des récupérations volontairement courtes. Si tu la termines proprement, la course est déjà largement à ta portée. À partir de là, tout redescend.",
      [
        ef(
          64,
          "64 min en Z2. Si tu te sens émoussé au lendemain du seuil, fais-la entièrement en Z1, c'est sans la moindre conséquence sur la préparation.",
          "Absorber la semaine la plus lourde des neuf en gardant du volume facile, seul moyen d'encaisser la séance reine sans creuser la fatigue.",
        ),
        seuil(
          69,
          "20 min d'échauffement en Z2, puis 6 fois 1000 m en Z4, en comptant environ 4 min par 1000 m, avec 3 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ce repère de 4 min reste une estimation de planification et jamais une allure à tenir. Le sixième 1000 m doit sortir dans le même temps que le premier : c'est le seul indicateur qui compte ici, et si tu perds nettement à la fin, tu as lancé le début trop fort.",
          "Porter à six kilomètres le temps passé à l'allure de course, sur des récupérations trop courtes pour que le seuil redescende complètement : c'est la séance qui dit si l'objectif est tenu.",
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
      "Le volume baisse d'un cinquième et le format change du tout au tout : on quitte les longs blocs au seuil pour des 400 m vifs, courts et peu coûteux. Tu vas te sentir bizarrement frais et avoir envie d'en faire plus : ne cède pas, c'est exactement le but.",
      [
        ef(
          50,
          "43 min en Z2 sans chercher à compenser la baisse de volume, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 3 min de retour au calme en Z2. À placer en début de semaine, jamais la veille de la séance de qualité.",
          "Tenir les trois sorties tout en réduisant réellement la charge, et rappeler la vitesse aux jambes en quantité volontairement minuscule.",
          { zonesSecondaires: ['Z5'] },
        ),
        vma(
          55,
          "20 min d'échauffement en Z2, puis 8 fois 400 m en Z5, en comptant environ 1 min 40 par 400 m, avec 1 min 40 de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ce repère de 1 min 40 est une estimation de planification et jamais une allure à tenir. Tu dois rentrer avec l'impression d'en avoir gardé sous le pied : c'est la définition même de l'affûtage.",
          "Réveiller le système nerveux sur des fractions trop courtes pour fatiguer, à dix jours de la course : c'est la fraîcheur qui doit progresser maintenant, pas le volume.",
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
      "Dimanche 27 septembre, tu cours le 10 km d'Izon. Les deux séances de la semaine sont volontairement courtes, 38 et 37 min là où tu tournes à une heure depuis deux mois : ce n'est pas un oubli de programmation, c'est le seul moyen d'arriver frais. Tout ce qui dépasse cette dose sert la fatigue et pas le chrono.",
      [
        ef(
          38,
          "38 min en Z2 en début de semaine, très souple. Séance courte à dessein : cette semaine, ce qui dépasse trois quarts d'heure ne te rapporte plus rien.",
          "Rester en mouvement et dénouer les jambes sans rien construire, le travail de fond est terminé depuis dix jours.",
        ),
        seuil(
          37,
          "12 min d'échauffement en Z2, puis 5 fois 500 m en Z4, en comptant environ 2 min par 500 m, avec 2 min de trottinement en Z1 entre chaque, puis 7 min de retour au calme en Z2. Ces 2 min sont une estimation de planification et jamais une allure à tenir. À placer au plus tard le mercredi : des demi-kilomètres pour retrouver la sensation en deux fois moins de mètres, c'est un rappel et pas un entraînement.",
          "Remettre en bouche l'allure exacte de dimanche, assez pour que le corps la reconnaisse au coup de pistolet, assez peu pour ne creuser aucun déficit de récupération.",
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
