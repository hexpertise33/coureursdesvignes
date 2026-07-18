import { ef, sl, tempo, seuil, recup, renfo, course, semaine } from './seances.js';

/**
 * P4, marathon. Quinze semaines de préparation plus une de récupération, soit
 * seize entrées. Le même contenu sert deux courses qui tombent le même jour,
 * le marathon de Bordeaux et celui de Nice-Cannes : seul le libellé affiché
 * change, la préparation est rigoureusement la même. Les deux intitulés sont
 * listés dans `variantesCourse`, `nom` porte la formulation neutre.
 *
 * C'est la distance la plus exigeante du projet, et le programme s'adresse à
 * un coureur qui a déjà du volume derrière lui : environ 30 km de course par
 * semaine depuis deux mois. Ce prérequis n'est pas décoratif. Un marathon
 * préparé sans base préalable se paie en blessures pendant la préparation,
 * pas le jour de la course. Trois sorties hebdomadaires, un renforcement, et
 * comme partout ailleurs dans le projet aucune allure chiffrée : l'intensité
 * se lit en zones 1 à 5, le groupe est hétérogène et chacun place son curseur
 * sur ses propres sensations.
 *
 * Trame en cycles de trois plus une, décision de l'encadrant, identique à
 * celle de P2 et de P3 :
 *
 *   S1 S2 S3 progressives, S4 plus douce
 *   S5 S6 S7 progressives, S8 plus douce
 *   S9 S10 S11 progressives, S12 plus douce
 *   S13 progressive, pic de charge
 *   S14 S15 affûtage, marathon le dernier jour de S15
 *   S16 récupération
 *
 * La liste blanche des phases de regles.js ne reconnaît que trois étiquettes
 * de bloc. Le quatrième cycle, réduit à la seule S13, porte donc bloc3 comme
 * le cycle qu'il relance après la respiration de S12.
 *
 * La course a lieu le dimanche 8 novembre 2026, dernier jour de la semaine 15.
 *
 * Barème de volumes, hors course objectif et hors renfo, en minutes :
 * S1 165, S2 178, S3 192, S4 160, S5 200, S6 215, S7 231, S8 190,
 * S9 240 sans Izon et 90 avec Izon, S10 248, S11 266, S12 220,
 * S13 280 (pic), S14 200, S15 70, S16 120.
 *
 * Le pic se tient à 280 min hors course et hors renfo, soit un peu moins de
 * cinq heures de course sur la semaine. C'est la fourchette haute de ce qu'un
 * coureur de club encaisse sans y laisser sa vie de famille, et c'est
 * suffisant pour terminer un marathon dans de bonnes conditions. Monter plus
 * haut supposerait une quatrième sortie hebdomadaire, que ce projet n'a jamais
 * proposée.
 *
 * Semaine 9, le point délicat du programme. Le 10 km d'Izon tombe le dimanche
 * 27 septembre, dernier jour de la semaine, à six semaines du marathon. La
 * semaine porte deux variantes, et chacune a sa propre phase, parce que ce
 * sont deux semaines qui n'ont ni la même charge ni le même but. Sans dossard,
 * S9 ouvre le troisième cycle progressif et vaut bloc3. Avec dossard, elle est
 * réellement délestée puisque l'effort du dimanche remplace la charge de la
 * semaine, et vaut allegee.
 *
 * Consigne sportive de l'encadrant sur cette variante, et elle n'est pas
 * négociable. Sur une préparation marathon, Izon remplace la sortie longue de
 * la semaine : il n'y a donc aucune séance sl() dans la variante avecIzon, la
 * course et son retour au calme en tiennent lieu. Et Izon se court en Z3, à
 * allure contenue, pas à fond. Un 10 km disputé à pleine intensité six
 * semaines avant un marathon coûte plusieurs jours de récupération réelle et
 * ampute le bloc spécifique qui suit, celui qui contient les deux plus longues
 * sorties de la préparation. La consigne est écrite en toutes lettres dans la
 * description de la séance, et pas seulement dans son objectif, parce que se
 * laisser emporter par le peloton au coup de pistolet est la règle et non
 * l'exception. La séance de course déclare 95 min : un quart d'heure
 * d'échauffement en Z2, le 10 km lui-même, puis 25 min en Z2 après l'arrivée
 * pour récupérer une partie du volume de sortie longue perdu ce jour-là.
 *
 * Charge et garde-fou dans les deux variantes. Sans Izon, S9 est un bloc qui
 * succède à une semaine plus douce : sa référence est le pic des blocs atteint
 * jusque-là, 231 min en S7, et S10 se compare ensuite à S9. Avec Izon, S9 est
 * allégée et se mesure à S8 ; S10, bloc précédé d'une semaine hors bloc,
 * repart du pic des blocs, soit 231 min toujours. C'est ce second chemin qui
 * est le plus contraint : les 248 min de S10 laissent 2,4 % de marge sous le
 * plafond des 10 %, marge volontairement conservée pour que le barème ne
 * dépende pas d'un arrondi.
 *
 * Progression des intensités. S1 rien, la semaine sert à ranger l'existant.
 * S2 et S3 en Z3 pour identifier l'allure spécifique. S4 rien. S5 et S6 au
 * seuil en Z4, pour repousser le plafond une fois la base posée. S7 revient en
 * Z3 sur des blocs longs, c'est le sommet du travail général. S8 rien. S9 au
 * seuil, ou la course-test. S10 et S11 en Z3 sur des blocs de plus en plus
 * longs. S12 rien. S13 ne porte aucune séance de qualité au sens strict :
 * c'est la sortie longue de 2 h 30 avec ses trois blocs en Z3 qui fait toute
 * la semaine. S14 la séance de référence du programme, 2 fois 16 min en Z3.
 * S15 un rappel très court en Z3 avant le départ. Jamais deux séances dures
 * dans la même semaine, et à partir de S9 jamais plus d'une par semaine : sur
 * marathon c'est le volume qui construit la performance, l'intensité n'est
 * qu'un adjuvant.
 *
 * Le dosage assume sa dominante : sept séances en Z3 contre trois en Z4, plus
 * la sortie longue spécifique de S13. L'allure d'un marathon se situe pour la
 * plupart des coureurs autour de la Z3 basse, c'est donc cette zone qu'il faut
 * apprendre à tenir très longtemps. La Z4 sert uniquement à rendre cette
 * allure moins coûteuse, en quantité modérée, et disparaît complètement du
 * bloc spécifique après S9. Aucune séance de fractionné court : sur quinze
 * semaines de marathon, le temps passé en Z5 rapporte moins que le même temps
 * passé en Z2, et coûte davantage en récupération.
 *
 * Lignes droites, décision de l'encadrant. Accélérations de 15 à 20 s en Z5 en
 * fin de footing facile, récupération complète en marchant, logées à
 * l'intérieur de la durée déjà déclarée de la séance. Introduites à la fin du
 * premier bloc, donc en S3, puis entretenues en S7, S10, S11 et S14. La règle
 * d'exclusion est simple à énoncer sur ce programme : elles accompagnent les
 * semaines dont la qualité est en Z3, jamais celles qui portent une séance au
 * seuil (S5, S6, S9, S15), jamais les semaines plus douces (S4, S8, S12), et
 * jamais la semaine du pic (S13) dont la sortie longue est déjà spécifique.
 * La variante avecIzon n'en comporte pas non plus, et c'est délibéré : on
 * n'affûte pas la foulée pour une course qu'on va courir en Z3.
 *
 * Convention de calcul des séances à intervalles : pour N répétitions, N-1
 * récupérations, et échauffement plus répétitions plus récupérations plus
 * retour au calme égale exactement la durée déclarée. Même règle pour les
 * lignes droites : 4 lignes de 15 s avec 1 min de marche entre chaque font
 * 4 min, 6 lignes de 20 s avec 1 min de marche entre chaque font 7 min. Les
 * deux séances de course, Izon et le marathon, échappent seules à ce calcul :
 * leur durée est une estimation de temps passé, elle dépend du coureur.
 *
 * Échauffement progressif, décision de l'encadrant. Le standard visé est
 * 20 min d'échauffement et 10 min de retour au calme, mais on n'impose pas
 * 20 min d'échauffement pour 5 min de travail : l'échauffement grandit avec la
 * séance, donc avec le coureur. Barème appliqué aux séances TEMPO, SEUIL et
 * VMA, selon leur durée déclarée :
 *   40 min et moins   12 min d'échauffement,  7 min de retour au calme ;
 *   41 à 50 min       15 min d'échauffement,  8 min de retour au calme ;
 *   plus de 50 min    20 min d'échauffement, 10 min de retour au calme.
 * Toutes les séances de qualité de P4 dépassent 50 min : elles sont donc au
 * palier haut, 20 et 10, ce qui est exactement l'intention de l'encadrant pour
 * un coureur de marathon. Les durées déclarées ne bougent pas, donc le barème
 * de volumes ci-dessus est inchangé : c'est le corps de séance qui absorbe la
 * différence. Les séances EF, SL, RECUP et RENFO n'ont pas d'échauffement
 * séparé et ne sont pas concernées, pas plus que le rappel d'allure de la
 * semaine de course, volontairement court.
 *
 * Sortie longue. Elle monte par paliers jusqu'à 2 h 30 en S13 et ne va jamais
 * au-delà, quelle que soit l'envie du moment. Au-dessus de deux heures et
 * demie, le coût en récupération augmente beaucoup plus vite que le bénéfice,
 * et un coureur qui a déjà tenu 2 h 30 à l'entraînement a tout ce qu'il faut
 * pour terminer 42 km. À l'intérieur d'un cycle elle ne recule jamais : 75,
 * 82 puis 90 min ; 95, 105 puis 115 ; 120, 128 puis 138 ; et 150 au pic.
 *
 * Zones secondaires déclarées : les cinq endurances à lignes droites, qui
 * citent la Z5, et la sortie longue spécifique de S13, qui cite la Z3.
 */

const s9SansIzon = semaine(
  9,
  'bloc3',
  'Le bloc spécifique commence',
  "Aucun dossard cette semaine, le troisième cycle démarre donc tout de suite. Trois semaines qui montent, dont les deux plus longues sorties de ta préparation, et une dernière visite au seuil avant que le programme ne bascule entièrement sur l'allure du marathon.",
  [
    ef(
      55,
      '55 min en Z2, à placer deux jours au moins avant la séance de seuil. Rien à chercher sur cette sortie sinon du temps de course confortable.',
      "Fournir le socle de volume facile qui rend la semaine la plus chargée du programme jusqu'ici absorbable sans casse.",
    ),
    seuil(
      65,
      "20 min d'échauffement en Z2, puis 2 fois 15 min en Z4 avec 5 min de trottinement en Z1 entre les deux, puis 10 min de retour au calme en Z2. Trente minutes au seuil sur une seule séance, et tenues en deux blocs seulement : c'est le format le plus lourd du programme dans cette zone.",
      "Relever une dernière fois le plafond avant que tout le travail de qualité ne descende définitivement sur l'allure du marathon, qui se situe bien en dessous.",
    ),
    sl(
      120,
      "2 h en Z2, entièrement facile. Premier passage à deux heures : mange un vrai repas trois heures avant, et emporte de quoi boire même si le temps est frais.",
      "Franchir la barre des deux heures dès l'ouverture du cycle, pour que la sortie longue atteigne 2 h 30 en quatre paliers réguliers plutôt que d'un bond.",
    ),
    renfo(
      25,
      "3 séries de : 12 fentes bulgares par jambe, pied arrière posé sur une chaise, 15 montées de bassin sur une jambe allongé sur le dos, 45 s de planche ventrale. 90 s de pause entre les séries.",
      "Charger la chaîne postérieure jambe par jambe, puisque c'est elle qui pousse et qu'elle décroche bien avant les quadriceps sur un effort de plusieurs heures.",
    ),
  ],
);

const s9AvecIzon = semaine(
  9,
  'allegee',
  'Izon à la place de la sortie longue',
  "Tu as un dossard dimanche 27 septembre sur le 10 km d'Izon. Sur une préparation marathon, cette course ne s'ajoute pas au programme : elle remplace la sortie longue de la semaine, et elle se court en allure contenue. La semaine est donc courte, avec une seule vraie sortie en début de semaine.",
  [
    ef(
      55,
      '55 min en Z2 lundi ou mardi, sur ton parcours habituel. Seule sortie consistante des sept jours, elle reste facile du premier au dernier pas.',
      "Conserver un vrai volume d'endurance dans une semaine par ailleurs vidée, sans toucher à la fraîcheur nécessaire dimanche.",
    ),
    ef(
      35,
      '35 min en Z2 le jeudi. Vendredi et samedi, plus rien du tout, pas même un footing de déblocage. Aucune ligne droite non plus cette semaine : on ne réveille pas la vitesse pour une course qui va se courir en allure retenue.',
      "Poser deux jours de coupure franche avant le dossard, ce qui donne de bien meilleures sensations au départ qu'une sortie de dernière minute censée rassurer.",
    ),
    course(
      "10 km d'Izon",
      10,
      95,
      "Échauffe-toi 15 min en Z2 avant le départ, sans chercher à te chauffer davantage. Cours-le en Z3, comme une sortie longue rythmée. Tu dois finir en te disant que tu aurais pu aller plus vite. C'est exactement le but. Enfin, sans traîner après l'arrivée et le ravitaillement passé, repars 25 min en Z2 pour retrouver une partie du volume de la sortie longue que cette course remplace.",
      "Prendre un repère d'allure et l'ambiance d'un dossard sans entamer le bloc spécifique : un 10 km couru à fond ici, ce sont plusieurs jours de récupération volés aux deux plus longues sorties de la préparation.",
    ),
    renfo(
      15,
      "Lundi uniquement : 2 séries de 40 s de planche ventrale, 25 s de gainage latéral par côté, 10 montées de bassin. Puis 5 min de mobilité des hanches. Plus rien ensuite jusqu'à dimanche.",
      "Entretenir le gainage en début de semaine seulement, pour arriver au départ sans la moindre raideur dans les jambes.",
    ),
  ],
);

export const P4 = {
  code: 'P4',
  nom: 'Marathon de Bordeaux ou de Nice-Cannes',
  // Deux courses, une seule date et un seul contenu : l'application affiche
  // l'intitulé que le coureur a choisi, la préparation ne change pas d'une
  // ligne. Le titre de la séance de course reprend la formulation neutre.
  variantesCourse: Object.freeze([
    Object.freeze({ cle: 'bordeaux', nom: 'Marathon de Bordeaux' }),
    Object.freeze({ cle: 'nice-cannes', nom: 'Marathon de Nice-Cannes' }),
  ]),
  dateCourse: '2026-11-08',
  izon: 'option',
  prerequis: 'Courir déjà environ 30 km par semaine depuis 2 mois.',
  semainesContenu: [
    semaine(
      1,
      'bloc1',
      'Poser la charpente',
      "Tu arrives avec du volume, l'objectif de cette semaine n'est donc pas d'en ajouter mais de lui donner une forme : deux sorties d'entretien nettement séparées et une sortie longue identifiée comme telle, au même jour chaque semaine pendant quinze semaines.",
      [
        ef(
          42,
          "42 min en Z2. Si tu cours d'habitude toutes tes sorties au même rythme, celle-ci doit te sembler trop lente. C'est le signe que tu es au bon endroit.",
          "Distinguer une bonne fois le facile du soutenu, faute de quoi tout le reste du programme se courra à une seule et même intensité moyenne, la moins utile de toutes.",
        ),
        ef(
          48,
          '48 min en Z2 sur terrain souple si tu en trouves un. Choisis un parcours différent de ton autre sortie facile, même de peu.',
          "Étaler la contrainte mécanique sur plusieurs surfaces dès le départ, à un moment où le volume hebdomadaire va encore augmenter de 70 % avant le pic.",
        ),
        sl(
          75,
          "1 h 15 en Z2 d'une traite. Pars franchement lentement sur le premier quart d'heure, tu récupéreras du temps sur la fin sans rien forcer.",
          "Fixer le point de départ de la sortie longue, celle qui va gagner une dizaine de minutes par palier jusqu'à 2 h 30.",
        ),
        renfo(
          20,
          '3 séries de : 40 s de planche ventrale, 25 s de planche sur chaque côté, 14 fentes avant par jambe. 1 min de récupération entre les séries.',
          "Installer le socle de gainage qui tiendra ta posture dans la quatrième heure de course, celle où la foulée se déforme sans que le coureur s'en rende compte.",
        ),
      ],
    ),

    semaine(
      2,
      'bloc1',
      "Première touche d'allure spécifique",
      "On ouvre le travail de qualité par la Z3, qui sera l'allure du marathon pour la plupart d'entre vous. Les blocs sont courts : à ce stade, l'enjeu est de reconnaître la sensation, pas encore de la tenir.",
      [
        ef(
          44,
          '44 min en Z2, la veille de rien et le lendemain de rien. Respiration ample et régulière du départ à l\'arrivée, y compris dans les montées.',
          'Encadrer la première séance de qualité par du volume facile, car la progression se fabrique pendant ces sorties-là et pas pendant la séance elle-même.',
        ),
        tempo(
          52,
          "20 min d'échauffement en Z2, puis 3 fois 6 min en Z3 avec 2 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. En Z3 tu parles par phrases courtes et on entend ton souffle : rien de plus, tu es très loin du seuil.",
          "Repérer précisément la sensation de la Z3, seule zone que tu auras à tenir pendant plusieurs heures le 8 novembre, et donc la plus rentable à connaître par cœur.",
        ),
        sl(
          82,
          "1 h 22 en Z2. Sept minutes de plus que la semaine dernière, et pas une de plus même si la forme est là.",
          "Allonger la sortie longue par petits paliers, parce que les tendons et les fascias progressent bien plus lentement que le muscle et le souffle.",
        ),
        renfo(
          20,
          "Reprends la séance de la semaine 1 et ajoute 2 séries de 20 squats au poids du corps, descente lente en trois temps, remontée franche.",
          "Répéter un contenu déjà connu jusqu'à ce que le geste devienne automatique, ce qui vaut mieux à ce stade que de découvrir un nouvel exercice chaque semaine.",
        ),
      ],
    ),

    semaine(
      3,
      'bloc1',
      'Fin du premier cycle',
      "Semaine la plus chargée des quatre premières. Les blocs en Z3 s'allongent, et les lignes droites apparaissent : quelques secondes de vitesse en fin de footing facile, la seule Z5 que ce programme contiendra jamais.",
      [
        ef(
          48,
          '37 min en Z2, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche complète entre chaque, soit 4 min, puis 7 min de retour au calme en Z2. Une ligne droite se lance progressivement et se relâche avant la fin : tu ne dois jamais finir en dette de souffle.',
          "Garder à la foulée sa capacité à s'ouvrir, sur des efforts trop brefs pour fatiguer quoi que ce soit. Ce n'est pas une séance de vitesse, c'est un footing qui se termine bien.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          54,
          '20 min d\'échauffement en Z2, puis 2 fois 10 min en Z3 avec 4 min de trottinement en Z1 entre les deux, puis 10 min de retour au calme en Z2. Les deux blocs doivent se ressembler comme deux gouttes d\'eau. Si le second est laborieux, le premier est parti trop vite.',
          "Apprendre à distribuer un effort rigoureusement identique sur plusieurs blocs, ce qui est le problème central du marathon posé en miniature.",
        ),
        sl(
          90,
          "1 h 30 en Z2. À partir de cette durée, emporte systématiquement de l'eau, et teste dès maintenant la ceinture ou le sac que tu comptes utiliser en novembre.",
          "Passer l'heure et demie et transformer le portage de la boisson en habitude, parce que le jour de la course rien de tout cela ne s'improvise.",
        ),
        renfo(
          22,
          '2 séries de : 45 s de planche ventrale, 20 fentes marchées, 20 squats, 45 s de pont fessier allongé sur le dos, bassin décollé. 90 s de pause entre les séries.',
          "Réveiller les fessiers, premier moteur de la propulsion et premier groupe musculaire à lâcher quand la course dépasse trois heures.",
        ),
      ],
    ),

    semaine(
      4,
      'allegee',
      'Première respiration',
      "Le volume recule de 17 % et l'intensité disparaît complètement. La semaine va te sembler creuse, c'est normal : c'est pendant celle-ci que le travail des trois précédentes se transforme en forme.",
      [
        ef(
          44,
          "44 min en Z2, sans montre si tu en es capable, uniquement à la sensation.",
          "Rompre le réflexe de mesurer, parce qu'une semaine allégée se juge à la fraîcheur du lundi suivant et à rien d'autre.",
        ),
        ef(
          46,
          '46 min en Z2, idéalement accompagné. La sortie doit rester conversationnelle du premier au dernier pas, sans une seule exception.',
          "Profiter d'une semaine sans exigence pour courir en groupe, ce qui reste la raison d'être du club en dehors de toute considération d'entraînement.",
        ),
        sl(
          70,
          '1 h 10 en Z2, plus courte que les trois précédentes. Termine avec la nette impression que tu aurais pu en refaire autant.',
          "Maintenir le rendez-vous hebdomadaire de la sortie longue tout en coupant réellement dans la charge, les deux ne sont pas contradictoires.",
        ),
        renfo(
          18,
          "2 séries de : 35 s de planche, 15 squats, 10 fentes par jambe, puis 8 min d'étirements lents des mollets, des ischios et des fessiers.",
          "Garder des appuis toniques alors que la sortie longue commence à peser sur les hanches, sans rien ajouter à une semaine dont le rôle est précisément de retirer de la fatigue.",
        ),
      ],
    ),

    semaine(
      5,
      'bloc2',
      'Ouverture du seuil',
      "Deuxième cycle, et le travail passe en Z4, un bon cran au-dessus de ton allure de marathon. Ce n'est pas l'allure de dimanche 8 novembre : c'est ce qui va rendre celle de dimanche 8 novembre confortable.",
      [
        ef(
          50,
          '50 min en Z2, le surlendemain de la séance de seuil et jamais la veille. Aucune ligne droite pendant les deux semaines de seuil qui viennent.',
          "Produire du volume utile un jour où le corps digère encore la séance dure, en lui épargnant tout stimulus supplémentaire.",
        ),
        seuil(
          55,
          "20 min d'échauffement en Z2, puis 3 fois 7 min en Z4 avec 2 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. En Z4 tu ne places plus que trois ou quatre mots à la fois, c'est nettement au-dessus des blocs en Z3 des semaines 2 et 3.",
          "Relever le plafond au-dessus de l'allure du marathon, ce qui fait mécaniquement descendre le coût énergétique de cette allure sans avoir eu à la travailler directement.",
        ),
        sl(
          95,
          "1 h 35 en Z2 sur parcours légèrement vallonné. Passe les côtes en gardant le souffle sous contrôle, quitte à ralentir beaucoup plus que tu ne le voudrais.",
          "Habituer les jambes à produire de l'effort sur terrain irrégulier, après quoi le plat devient nettement plus économique.",
        ),
        renfo(
          25,
          '3 séries de : 50 s de planche ventrale, 30 s de planche sur chaque côté, 20 squats, 16 fentes par jambe. 1 min de pause entre les séries.',
          "Monter d'un cran maintenant que la charge de course est bien encaissée, la structure musculaire doit suivre la progression du volume et non la subir.",
        ),
      ],
    ),

    semaine(
      6,
      'bloc2',
      'Des blocs de seuil qui doublent',
      "Deuxième et dernière semaine de seuil du programme. Les répétitions passent de huit à douze minutes : la difficulté n'est plus de trouver l'intensité mais de la maintenir sans dériver vers le haut.",
      [
        ef(
          52,
          "52 min en Z2. Si les jambes sont émoussées au départ, descends la sortie entière en Z1, cela ne coûte strictement rien à la préparation.",
          "Encaisser une semaine de seuil sans y ajouter le moindre effort superflu, la séance dure suffit largement à l'exigence des sept jours.",
        ),
        seuil(
          58,
          "20 min d'échauffement en Z2, puis 2 fois 12 min en Z4 avec 4 min de trottinement en Z1 entre les deux, puis 10 min de retour au calme en Z2. Douze minutes d'affilée au seuil, c'est long : découpe mentalement en trois fois quatre minutes.",
          "Allonger l'effort au seuil pour travailler la tolérance à l'essoufflement, dernière brique générale avant que tout ne se recentre sur le spécifique.",
        ),
        sl(
          105,
          "1 h 45 en Z2. Teste ce que tu comptes manger en course, gel, pâte de fruits ou autre, dès cette sortie et pas trois semaines avant le départ.",
          "Dépasser l'heure trois quarts et commencer à régler le ravitaillement, qui décide de la fin d'un marathon aussi sûrement que l'entraînement.",
        ),
        renfo(
          25,
          "Séance en pente : trouve une côte régulière et monte-la 12 fois en trottinant ou en marchant vite, redescente en marchant, sans chronomètre. Termine par 3 fois 50 s de planche ventrale.",
          "Muscler les jambes dans le geste de course lui-même, ce qui se transfère bien mieux à la foulée qu'un exercice réalisé au sol.",
        ),
      ],
    ),

    semaine(
      7,
      'bloc2',
      'Sommet du deuxième cycle',
      "Semaine la plus lourde depuis le début, et elle repart en Z3 : trente-six minutes à l'allure du marathon plus une sortie longue de près de deux heures. C'est le point haut du travail général, ensuite tout devient spécifique.",
      [
        ef(
          48,
          '34 min en Z2, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 7 min en Z2. Les lignes droites reviennent après trois semaines de seuil, six suffisent.',
          "Rendre un peu de fréquence d'appui à une foulée qui sort de deux semaines passées entre Z2 et Z4, sans rien prélever sur la séance spécifique.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          68,
          "20 min d'échauffement en Z2, puis 3 fois 10 min en Z3 avec 4 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Trente minutes en Z3 sur une séance : c'est ta première vraie dose d'allure marathon.",
          "Installer l'allure de course sur un volume qui commence à compter, à un moment de la préparation où il reste largement le temps de s'y habituer.",
        ),
        sl(
          115,
          "1 h 55 en Z2, la plus longue jusqu'ici. Programme-la un jour sans obligation derrière, et prends un vrai repas deux à trois heures avant le départ.",
          "Approcher les deux heures, durée à partir de laquelle l'organisme apprend réellement à épargner son carburant plutôt qu'à le brûler.",
        ),
        renfo(
          25,
          "3 séries de : 25 relevés sur la pointe des pieds sur une marche, talons descendus sous le niveau de la marche, 1 min de planche ventrale, 20 fentes marchées. 90 s de pause.",
          "Renforcer le mollet et le tendon d'Achille en amplitude complète, la structure la plus sollicitée et la plus souvent blessée sur une préparation longue.",
        ),
      ],
    ),

    semaine(
      8,
      'allegee',
      'Deuxième respiration',
      "Le volume recule de 18 %, l'intensité disparaît. Sept semaines derrière, sept devant : c'est le moment de faire le point sur les petites douleurs et sur l'état des chaussures, pendant qu'il reste le temps d'agir.",
      [
        ef(
          45,
          '45 min en Z2 très souples. Pas de côte, pas de ligne droite, pas de terrain technique, aucun objectif sinon de rentrer en te sentant bien.',
          "Laisser le système nerveux souffler, car c'est lui qui sature en premier après deux semaines de seuil suivies d'une semaine de blocs spécifiques.",
        ),
        ef(
          50,
          "50 min en Z2 sur terrain souple. Regarde l'usure de tes semelles pendant que tu y penses : si la paire approche des 700 km, il faut en roder une autre dès maintenant.",
          "Utiliser une semaine calme pour régler la logistique, parce que changer de chaussures dans le dernier mois est la meilleure façon de gâcher quinze semaines de travail.",
        ),
        sl(
          95,
          "1 h 35 en Z2, vingt minutes de moins qu'au sommet du cycle. Entièrement facile : si tu accélères sur la fin, tu as manqué l'intérêt de la semaine.",
          "Tenir le pilier de la préparation à charge réduite, car l'habitude de courir longtemps se perd beaucoup plus vite qu'elle ne se construit.",
        ),
        renfo(
          18,
          '2 séries de : 45 s de planche, 15 squats, 12 fentes par jambe, 30 s de pont fessier. Aucune côte et aucun travail excentrique cette semaine.',
          "Conserver le tonus à charge réduite, en cohérence avec une semaine dont tout le contenu est allégé.",
        ),
      ],
    ),

    {
      numero: 9,
      // La phase appartient à la variante, pas à la semaine : bloc3 sans
      // dossard, allegee avec. L'entrée principale porte celle de la variante
      // sans dossard, la seule dont elle expose les séances par défaut.
      // Substituer une variante, c'est reprendre sa phase avec ses séances.
      phase: s9SansIzon.phase,
      titre: "Ouverture du bloc spécifique, ou course-test à Izon",
      intention:
        "Deux semaines très différentes selon que tu as pris un dossard ou non. Les inscrits au 10 km d'Izon du 27 septembre suivent la variante avec course : elle est franchement délestée et la course y remplace la sortie longue, courue en allure contenue. Les autres entrent directement dans le troisième cycle, sans creux artificiel.",
      variantes: {
        avecIzon: s9AvecIzon,
        sansIzon: s9SansIzon,
      },
      seances: s9SansIzon.seances,
    },

    semaine(
      10,
      'bloc3',
      "Deux fois vingt minutes d'allure marathon",
      "Deuxième marche du cycle spécifique. Le seuil est rangé pour de bon, tout le travail de qualité se fait désormais à l'allure exacte du 8 novembre, sur des blocs assez longs pour que la question devienne la patience et non le souffle.",
      [
        ef(
          52,
          '41 min en Z2, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 7 min en Z2. À placer loin de la séance spécifique, jamais la veille.',
          "Ajouter du volume facile dans une semaine dense tout en gardant la foulée vive, sans jamais mordre sur la fraîcheur qu'exigent les blocs en Z3.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          68,
          "20 min d'échauffement en Z2, puis 2 fois 17 min en Z3 avec 4 min de trottinement en Z1 entre les deux, puis 10 min de retour au calme en Z2. Dix-sept minutes d'affilée : la difficulté n'est plus l'intensité, c'est de ne pas dériver vers le haut sans t'en apercevoir.",
          "Tenir l'allure de course sur des blocs assez longs pour que la dérive devienne visible, seul défaut qui transforme un marathon réussi en marche forcée.",
        ),
        sl(
          128,
          "2 h 08 en Z2, sans le moindre bloc rapide ni accélération finale. Dans ce cycle, la sortie longue soutient la séance spécifique, elle ne la double pas.",
          "Reprendre la progression de la sortie longue exactement là où le cycle l'avait laissée, en la gardant entièrement facile pour préserver la qualité des blocs en Z3.",
        ),
        renfo(
          25,
          '3 séries de : 1 min de planche ventrale, 30 s de gainage latéral par côté, 20 montées sur une marche par jambe, 20 squats. 1 min de pause.',
          "Travailler la chaîne d'appui une jambe après l'autre, puisque c'est ainsi qu'elle fonctionne en course et jamais autrement.",
        ),
      ],
    ),

    semaine(
      11,
      'bloc3',
      'La semaine la plus longue avant le pic',
      "Troisième et dernière marche du cycle, et la plus chargée des trois. Quarante-cinq minutes en Z3 sur la séance spécifique et une sortie longue qui frôle les 2 h 20. À partir d'ici, ton allure de marathon n'est plus une hypothèse.",
      [
        ef(
          50,
          '37 min en Z2, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 6 min en Z2. Sur terrain souple de préférence, la semaine est lourde.',
          "Entretenir la vivacité de la foulée dans la semaine la plus chargée du cycle spécifique, sans rien retirer aux trois blocs en Z3 qui suivent.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          78,
          "20 min d'échauffement en Z2, puis 3 fois 14 min en Z3 avec 3 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Quarante-deux minutes à l'allure de course, sur des jambes qui portent déjà dix semaines de préparation.",
          "Vérifier concrètement que l'allure visée tient sur une durée qui commence à compter, ce qu'aucune table de correspondance ne remplacera jamais.",
        ),
        sl(
          138,
          "2 h 18 en Z2 sur terrain varié. Bois régulièrement et mange en course selon le protocole que tu as testé en semaine 6, sans rien changer au dernier moment.",
          "Passer les deux heures et quart dans une semaine qui porte déjà trois quarts d'heure d'allure spécifique, ce qui la rend plus exigeante que le pic ne le sera en intensité.",
        ),
        renfo(
          25,
          '2 séries de : 1 min de planche ventrale, 45 s de gainage latéral par côté, 45 s de chaise contre un mur, 24 squats, 20 fentes marchées. Fais la deuxième série sans pause complète.',
          "Solliciter la tenue posturale dans un état de fatigue installée, parce que c'est elle qui cède la première après trois heures de course et pas la force des jambes.",
        ),
      ],
    ),

    semaine(
      12,
      'allegee',
      'Respirer avant le sommet',
      "Dernière semaine plus douce du programme. Le volume tombe de 17 % et toute intensité disparaît sept jours durant. Placer une semaine calme juste avant la plus lourde des quinze n'est pas une incohérence, c'est ce qui rend la semaine 13 possible.",
      [
        ef(
          48,
          "48 min en Z2, tranquilles. Si une gêne traîne depuis le cycle spécifique, c'est cette semaine qu'il faut la traiter, pas dans quinze jours.",
          "Utiliser une semaine sans exigence pour éteindre les petites alertes, tant qu'il reste assez de temps devant pour le faire sans perdre de forme.",
        ),
        ef(
          52,
          '52 min en Z2 sur parcours plat. Ni côte, ni accélération, ni ligne droite : cette semaine ne contient rien de dur, et c\'est entièrement volontaire.',
          "Réduire la sollicitation nerveuse après trois semaines qui ont toutes porté une séance de qualité et deux sorties de plus de deux heures.",
        ),
        sl(
          120,
          '2 h en Z2, dix-huit minutes de moins que la semaine passée. Termine avec la sensation nette d\'avoir gardé de la marge sous le pied.',
          "Laisser le fond reculer d'un cran pour aborder la sortie de 2 h 30 avec des jambes qui ont réellement récupéré, et non avec l'envie d'y arriver.",
        ),
        renfo(
          20,
          "2 séries de : 45 s de planche ventrale, 30 s de gainage latéral par côté, 16 squats, 12 fentes par jambe. Puis 8 min de mobilité des hanches et des chevilles.",
          "Maintenir le tonus à charge réduite sans installer la moindre courbature avant la semaine la plus lourde de la préparation.",
        ),
      ],
    ),

    semaine(
      13,
      'bloc3',
      'Le pic de charge',
      "Semaine la plus lourde des quinze, et tout tient dans une seule séance : 2 h 30 avec trois blocs à l'allure de course dans la deuxième moitié. Elle arrive juste après une semaine douce, c'est ce qui la rend faisable. Les deux autres sorties sont donc entièrement faciles.",
      [
        ef(
          55,
          "55 min en Z2, sans la moindre accélération et sans lignes droites. C'est une sortie de transport, rien d'autre.",
          "Fournir du volume neutre dans une semaine dont toute la difficulté est concentrée sur un seul rendez-vous.",
        ),
        ef(
          75,
          "1 h 15 en Z2, à placer au moins trois jours avant la sortie longue. Si les jambes sont lourdes, descends-la en Z1 sans état d'âme.",
          "Construire le pic hebdomadaire avec de l'endurance facile plutôt qu'avec de l'intensité, ce qui est la seule façon de le rendre absorbable.",
        ),
        sl(
          150,
          "2 h 30, la plus longue du programme et le plafond absolu. 100 min en Z2, puis 3 fois 12 min en Z3 avec 4 min en Z2 entre chaque, puis 6 min en Z2 pour rentrer. Les blocs arrivent sur des jambes déjà entamées : c'est très exactement la sensation du 30e kilomètre.",
          "Répéter en conditions réelles ce qui décide d'un marathon, c'est-à-dire tenir l'allure de course alors que la fatigue est déjà là, sans jamais dépasser 2 h 30 dont le coût en récupération serait disproportionné.",
          { zonesSecondaires: ['Z3'] },
        ),
        renfo(
          25,
          '3 séries de : 1 min de planche ventrale, 24 squats, 20 fentes marchées, 45 s de pont fessier sur une jambe en alternant. Étirements complets pour finir, sans jamais forcer sur une position.',
          "Refermer le renforcement à son point haut avant de le réduire nettement pour les trois dernières semaines.",
        ),
      ],
    ),

    semaine(
      14,
      'affutage',
      'La séance de référence',
      "L'affûtage commence. Le volume recule de 29 % d'un coup, et la séance spécifique se resserre autour de son échauffement complet, 2 fois 16 min en Z3. C'est la répétition générale de ton allure, et la dernière occasion de la valider.",
      [
        ef(
          42,
          '31 min en Z2, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 7 min en Z2. En début de semaine, jamais la veille de la séance spécifique.',
          "Rappeler la vitesse aux jambes en quantité volontairement faible, quatre lignes droites suffisent largement en période d'affûtage.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          68,
          "20 min d'échauffement en Z2, puis 2 fois 16 min en Z3 avec 6 min de trottinement en Z1 entre les deux, puis 10 min de retour au calme en Z2. Trente-deux minutes à l'allure de course. Si les deux blocs se ressemblent et que tu finis sans forcer, ton allure du 8 novembre est la bonne.",
          "Valider l'allure de course sur un volume représentatif, à un moment où il reste le temps de récupérer mais où il est trop tard pour progresser.",
        ),
        sl(
          90,
          "1 h 30 en Z2 seulement. Après deux mois passés entre deux heures et deux heures et demie, tu vas la trouver ridiculement courte : c'est précisément l'effet recherché.",
          "Couper franchement dans la sortie longue pour laisser la fraîcheur remonter, l'endurance construite en quatorze semaines ne se perd pas en quinze jours.",
        ),
        renfo(
          15,
          '2 séries de : 40 s de planche ventrale, 25 s de gainage latéral par côté, 14 squats lents. Puis 6 min d\'étirements doux.',
          "Rappeler le gainage qui tiendra le buste droit dans la dernière heure de course, sans rien réclamer à un corps qui sort de quatorze semaines de sorties longues.",
        ),
      ],
    ),

    semaine(
      15,
      'affutage',
      'Semaine du marathon',
      "Le volume d'entraînement est divisé par près de trois. Dimanche 8 novembre, tu cours ton marathon. Cette semaine n'a plus qu'une fonction, te déposer frais et confiant sur la ligne de départ, et absolument rien de ce que tu feras d'ici là ne peut plus te rendre plus fort.",
      [
        ef(
          40,
          '40 min en Z2 lundi ou mardi. Souple, sans rien chercher, sans lignes droites et sans côte.',
          "Garder le geste de course et évacuer les dernières traces de l'affûtage sans créer la moindre fatigue supplémentaire.",
        ),
        tempo(
          30,
          "10 min d'échauffement en Z2, puis 2 fois 5 min en Z3 avec 3 min de trottinement en Z1 entre les deux, puis 7 min de retour au calme en Z2. Mercredi au plus tard, jamais après.",
          "Retrouver la sensation exacte de l'allure de dimanche à dose minuscule, pour que le corps la reconnaisse dès les premiers kilomètres au lieu de la chercher.",
        ),
        course(
          'Marathon de Bordeaux ou de Nice-Cannes',
          42.195,
          240,
          "Ta course. Échauffement de 10 min en Z2 au maximum, la distance se chargera du reste. Pars en Z2 haute sur les 5 premiers kilomètres, le départ groupé pousse toujours trop vite et chaque seconde grattée là se paiera au double après le 30e. Installe-toi ensuite en Z3 basse et n'en bouge plus jusqu'au 32e. Sur les dix derniers, tu tiens ce que tu peux : rester en Z3 jusqu'au bout est déjà une très belle course. Bois à chaque ravitaillement sans exception, et mange selon le protocole que tu as répété à l'entraînement, sans jamais goûter quelque chose de nouveau.",
          "Concrétiser quinze semaines de préparation sur la distance qui ne pardonne aucune approximation de gestion, et rentrer avec l'envie d'y retourner.",
        ),
        renfo(
          10,
          "Lundi uniquement : 6 min de mobilité des hanches, des chevilles et du haut du dos, puis 2 séries de 20 s de gainage ventral. Ensuite plus rien du tout jusqu'à dimanche.",
          "Dérouiller sans solliciter un corps qui n'a plus rien à gagner, la seule variable qui puisse encore bouger d'ici dimanche s'appelle la fraîcheur.",
        ),
      ],
    ),

    semaine(
      16,
      'recuperation',
      'La semaine qui ne se négocie pas',
      "Aucune intensité, aucun chrono, aucune comparaison. Un marathon laisse des dégâts musculaires qui mettent trois semaines à disparaître complètement, même quand les sensations reviennent au bout de cinq jours. Ces sept jours ne sont pas une récompense, ce sont les fondations de ta prochaine préparation.",
      [
        recup(
          30,
          '30 min en Z1, quatre à cinq jours après la course et pas un jour avant. Si les quadriceps sont encore douloureux dans les escaliers, remplace par 45 min de marche, le bénéfice est le même.',
          "Relancer la circulation pour évacuer les déchets musculaires plus vite qu'en restant assis, sans rien demander à des fibres encore abîmées.",
        ),
        recup(
          40,
          "40 min en Z1 en fin de semaine. Les sensations vont revenir avant les muscles et tu vas avoir envie d'accélérer : ne le fais pas, c'est exactement là que se prennent les blessures d'après-course.",
          "Laisser le retour de la forme se faire tout seul plutôt que d'aller le chercher, seule erreur vraiment coûteuse de cette semaine.",
        ),
        recup(
          50,
          "50 min en Z1 sur terrain souple, la semaine suivante si tu préfères l'étaler. Choisis le parcours pour le paysage et laisse la montre à la maison.",
          "Refermer le cycle sur une sortie agréable, ce qui compte autant que le reste pour avoir envie de reprendre un dossard.",
        ),
        renfo(
          15,
          "15 min d'étirements et de mobilité : hanches, mollets, ischios, quadriceps et bas du dos. Respire lentement, tiens chaque position sans jamais chercher l'amplitude maximale.",
          "Rendre de la souplesse à des muscles raidis par quinze semaines de course et par quatre heures d'effort continu, en douceur et sans forcer sur des tissus fragilisés.",
        ),
      ],
    ),
  ],
};
