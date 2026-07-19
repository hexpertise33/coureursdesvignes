import { ef, sl, tempo, seuil, vma, recup, renfo, course, semaine } from './seances.js';

/**
 * P4, marathon. Quinze semaines de préparation plus une de récupération, soit
 * seize entrées. Le même contenu sert deux courses qui tombent le même jour, le
 * marathon de Bordeaux et celui de Nice-Cannes : seul le libellé affiché change,
 * la préparation est rigoureusement la même. Les deux intitulés sont listés dans
 * `variantesCourse`, `nom` porte la formulation neutre.
 *
 * Programme recalibré sur le niveau réel du groupe, dernier des cinq à passer
 * sur le nouveau calibrage. Correctif de l'encadrant : ses coureurs passent tous
 * sous l'heure au 10 km et sortent déjà 1 h 15 le dimanche en terrain vallonné.
 * Le calibrage précédent ouvrait à 165 min avec des footings de 42 min : c'est
 * le volume d'une préparation de 10 km, pas d'un marathon. Trois séances de
 * course par semaine, une séance de renforcement, aucune allure chiffrée,
 * l'intensité se lit en zones 1 à 5 et chacun place son curseur sur ses propres
 * sensations.
 *
 * Ce qui change par rapport à la version précédente
 * -------------------------------------------------
 * Le volume : 200 min en semaine 1 au lieu de 165, 300 min au pic au lieu de
 * 280, soit cinq heures de course sur la semaine du sommet. C'est la fourchette
 * haute de ce qu'un coureur de club encaisse sans y laisser sa vie de famille,
 * et c'est assez pour terminer un marathon dans de bonnes conditions. Monter
 * plus haut supposerait une quatrième sortie hebdomadaire, que ce projet n'a
 * jamais proposée. Et surtout la forme du travail : l'ancienne trame montait par
 * paliers d'intensité et laissait quatre semaines sans séance de qualité. Ici
 * chacune des quinze semaines en porte une, quinze formats différents, et la
 * semaine 1 s'ouvre sur des 400 m.
 *
 * Le menu, semaine par semaine, quinze formats et pas un doublon :
 *   S1  bloc1     2 séries de 5 fois 400 m en Z5 ;
 *   S2  bloc1     4 fois 1000 m puis 2 fois 500 m en Z4 ;
 *   S3  bloc1     3 fois 10 min en Z3, première allure marathon ;
 *   S4  allégée   10 montées de 1 min en côte, entre Z4 et Z5 ;
 *   S5  bloc2     6 fois 1000 m en Z4 ;
 *   S6  bloc2     2 fois 3000 m puis 2 fois 1000 m en Z4 ;
 *   S7  bloc2     3 fois 14 min en Z3 ;
 *   S8  allégée   2 séries de 4 fois 200 m en Z5 ;
 *   S9  bloc3     4 fois 2000 m en Z4, ou la course-test à Izon ;
 *   S10 bloc3     3 fois 15 min en Z3 ;
 *   S11 bloc3     2 fois 25 min en Z3 ;
 *   S12 allégée   2 fois 10 min en Z3 ;
 *   S13 bloc3     3 fois 20 min en Z3, une heure d'allure de course ;
 *   S14 affûtage  2 fois 16 min en Z3, répétition générale ;
 *   S15 affûtage  2 fois 8 min en Z3, rappel de la semaine de course.
 *
 * Fractionné en distance, adapté au marathon
 * ------------------------------------------
 * Sept séances sur quinze se comptent en mètres, et la longueur des répétitions
 * suit la distance préparée : le 1000 m, le 2000 m et le 3000 m portent tout le
 * travail au seuil, le 200 m et le 400 m ne servent qu'à empêcher la foulée de
 * se tasser. Les sept autres se comptent en minutes, ce sont les sept blocs à
 * l'allure du marathon : un effort tenu en Z3 se pense en durée et pas en
 * mètres, et sa place grandit sans cesse, de 30 min en S3 à 60 min en S13. La
 * quinzième est la côte de S4, qu'une pente rend incomparable d'un coureur à
 * l'autre. Le seuil disparaît complètement après S9 : sur marathon, c'est le
 * volume qui construit la performance, l'intensité n'est qu'un adjuvant.
 *
 * Repère de durée par répétition. Le projet impose que la somme des segments
 * décrits égale exactement la durée déclarée, et une distance ne dure pas le
 * même temps pour tout le monde. Chaque séance en distance donne donc un repère
 * par répétition, qui sert à deux choses : faire retomber le calcul juste, et
 * permettre de savoir combien de temps bloquer sur son créneau. Repères
 * retenus : environ 4 min pour 1000 m, 8 min 30 pour 2000 m et 13 min pour
 * 3000 m en Z4, 2 min pour 500 m en Z4, 1 min 40 pour 400 m et 45 s pour 200 m
 * en Z5. Chacune des sept séances en distance redit, dans ses propres mots, que
 * ce repère est une estimation de planification et jamais une allure à tenir.
 *
 * Garde-fou de durée, décision de l'encadrant
 * -------------------------------------------
 *   toute séance de course d'une semaine normale (bloc1, bloc2, bloc3, allégée
 *   et le premier palier d'affûtage) fait au minimum 50 min ;
 *   la sortie longue tient dans la fourchette 85 à 150 min, 2 h 30 étant le
 *   plafond absolu et jamais dépassé quelle que soit l'envie du moment, et elle
 *   ne recule jamais à l'intérieur d'un cycle ;
 *   deux exceptions assumées, la semaine de course (S15, et S9 pour qui prend
 *   le dossard d'Izon) et la semaine de récupération (S16), où des séances
 *   courtes sont le but recherché et non un oubli. Les textes de ces
 *   semaines-là le disent explicitement, pour qu'un coureur habitué à deux
 *   heures ne croie pas à une erreur de saisie.
 *   Le renforcement reste entre 10 et 25 min et n'est pas concerné.
 *
 * Trame en cycles de trois plus une, identique à celle de P2 et de P3 :
 *
 *   S1 S2 S3 progressives, S4 plus douce
 *   S5 S6 S7 progressives, S8 plus douce
 *   S9 S10 S11 progressives, S12 plus douce
 *   S13 progressive, pic de charge
 *   S14 S15 affûtage, marathon le dernier jour de S15
 *   S16 récupération
 *
 * La liste blanche des phases de regles.js ne reconnaît que trois étiquettes de
 * bloc. Le quatrième cycle, réduit à la seule S13, porte donc bloc3 comme le
 * cycle qu'il relance après la respiration de S12.
 *
 * La course a lieu le dimanche 8 novembre 2026, dernier jour de la semaine 15.
 *
 * Barème de volumes, hors course objectif et hors renfo, en minutes :
 * S1 200, S2 213, S3 225, S4 190, S5 232, S6 250, S7 268, S8 225,
 * S9 262 sans Izon et 95 avec Izon, S10 275, S11 288, S12 240,
 * S13 300 (pic), S14 205, S15 88, S16 135.
 *
 * Sortie longue, palier par palier : 90, 97, 105 puis 85 ; 105, 115, 125 puis
 * 100 ; 120, 132, 142 puis 115 ; 150 au pic ; 90 en affûtage. Au-dessus de deux
 * heures et demie, le coût en récupération augmente beaucoup plus vite que le
 * bénéfice, et un coureur qui a déjà tenu 2 h 30 à l'entraînement a tout ce
 * qu'il faut pour terminer 42 km.
 *
 * Semaine 9, le point délicat du programme. Le 10 km d'Izon tombe le dimanche
 * 27 septembre, dernier jour de la semaine, à six semaines du marathon. La
 * semaine porte deux variantes, chacune avec sa propre phase. Sans dossard, S9
 * ouvre le troisième cycle progressif et vaut bloc3. Avec dossard, elle est
 * réellement délestée puisque l'effort du dimanche remplace la charge de la
 * semaine, et vaut allegee.
 *
 * Consigne sportive de l'encadrant sur cette variante, et elle n'est pas
 * négociable. Sur une préparation marathon, Izon remplace la sortie longue de la
 * semaine : il n'y a donc aucune séance sl() dans la variante avecIzon, la course
 * et son retour au calme en tiennent lieu. Et Izon se court en Z3, à allure
 * contenue, pas à fond. Un 10 km disputé à pleine intensité six semaines avant
 * un marathon coûte plusieurs jours de récupération réelle et ampute le bloc
 * spécifique qui suit, celui qui contient les deux plus longues sorties de la
 * préparation. La consigne est écrite en toutes lettres dans la description de
 * la séance, et pas seulement dans son objectif, parce que se laisser emporter
 * par le peloton au coup de pistolet est la règle et non l'exception. La séance
 * de course déclare 95 min : un quart d'heure d'échauffement en Z2, le 10 km
 * lui-même, puis 25 min en Z2 après l'arrivée pour récupérer une partie du
 * volume de sortie longue perdu ce jour-là.
 *
 * Charge et garde-fou dans les deux variantes. Sans Izon, S9 est un bloc qui
 * succède à une semaine plus douce : sa référence est le pic des blocs atteint
 * jusque-là, 268 min en S7, et S10 se compare ensuite à S9. Avec Izon, S9 est
 * allégée et se mesure à S8 ; S10, bloc précédé d'une semaine hors bloc, repart
 * du pic des blocs, soit 268 min toujours. C'est ce second chemin qui est le
 * plus contraint : les 275 min de S10 laissent 6,7 % de marge sous le plafond
 * des 10 %, marge volontairement conservée pour que le barème ne dépende pas
 * d'un arrondi.
 *
 * Lignes droites, décision de l'encadrant. Accélérations de 15 à 20 s en Z5 en
 * fin de footing facile, récupération complète en marchant, logées à l'intérieur
 * de la durée déjà déclarée de la séance. Introduites à la fin du premier bloc,
 * donc en S3, puis entretenues en S7, S10, S11 et S14. La règle d'exclusion est
 * simple : elles accompagnent les semaines dont la qualité est en Z3, jamais
 * celles qui portent une séance au seuil ou une séance rapide (S1, S2, S5, S6,
 * S8, S9), jamais les semaines plus douces (S4, S12), jamais le pic (S13) ni la
 * semaine de course. La variante avecIzon n'en comporte pas non plus : on
 * n'affûte pas la foulée pour une course qu'on va courir en Z3.
 *
 * Convention de calcul des séances à intervalles : pour N répétitions, N-1
 * récupérations, et échauffement plus répétitions plus récupérations plus retour
 * au calme égale exactement la durée déclarée. Une séance en séries compte les
 * récupérations courtes à l'intérieur de chaque série, plus une récupération
 * longue entre deux séries. Même règle pour les lignes droites : 4 lignes de
 * 15 s avec 1 min de marche entre chaque font 4 min, 6 lignes de 20 s en font 7.
 * Les deux séances de course, Izon et le marathon, échappent seules à ce calcul :
 * leur durée est une estimation de temps passé, elle dépend du coureur.
 *
 * Échauffement progressif, barème appliqué aux séances TEMPO, SEUIL et VMA selon
 * leur durée déclarée :
 *   40 min et moins   12 min d'échauffement,  7 min de retour au calme ;
 *   41 à 50 min       15 min d'échauffement,  8 min de retour au calme ;
 *   plus de 50 min    20 min d'échauffement, 10 min de retour au calme.
 * Quatorze des quinze séances de qualité dépassent 50 min et tombent donc sur le
 * 20/10, ce qui est exactement l'intention de l'encadrant pour un coureur de
 * marathon. La quinzième est le rappel de la semaine de course, 40 min, au
 * palier 12/7. Les séances EF, SL, RECUP et RENFO n'ont pas d'échauffement
 * séparé et ne sont pas concernées.
 *
 * Zones secondaires déclarées : les cinq endurances à lignes droites, qui citent
 * la Z5, et aucune autre. Toutes les sorties longues sont entièrement en Z2, y
 * compris celle du pic.
 */

const s9SansIzon = semaine(
  9,
  'bloc3',
  'Le bloc spécifique commence',
  "Aucun dossard cette semaine, le troisième cycle démarre tout de suite. Trois semaines qui montent, dont les deux plus longues sorties de ta préparation, et une dernière visite au seuil avant que le programme ne bascule entièrement sur l'allure du marathon.",
  [
    ef(
      72,
      "1 h 12 en Z2, à placer deux jours au moins avant la séance au seuil. Rien à chercher sur cette sortie sinon du temps de course confortable.",
      "Fournir le socle de volume facile qui rend absorbable la semaine la plus chargée du programme jusqu'ici.",
    ),
    seuil(
      70,
      "20 min d'échauffement en Z2, puis 4 fois 2000 m en Z4, en comptant environ 8 min 30 par 2000 m, avec 2 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ces 8 min 30 sont une estimation de planification et jamais une allure à tenir : huit kilomètres au seuil, sur des récupérations trop courtes pour souffler complètement, et c'est la dernière fois du programme.",
      "Relever une dernière fois le plafond avant que tout le travail de qualité ne descende définitivement sur l'allure du marathon, qui se situe bien en dessous.",
    ),
    sl(
      120,
      "2 h en Z2, entièrement facile. Premier passage à deux heures : mange un vrai repas trois heures avant, et emporte de quoi boire même si le temps est frais.",
      "Franchir la barre des deux heures dès l'ouverture du cycle, pour que le dimanche atteigne 2 h 30 en paliers réguliers plutôt que d'un bond.",
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
  "Tu as un dossard dimanche 27 septembre sur le 10 km d'Izon. Sur une préparation marathon, cette course ne s'ajoute pas au programme : elle remplace la sortie longue de la semaine, et elle se court en allure contenue. La semaine est donc volontairement courte, avec une seule vraie sortie en début de semaine.",
  [
    ef(
      55,
      "55 min en Z2 lundi ou mardi, sur ton parcours habituel. Seule sortie consistante des sept jours, elle reste facile du premier au dernier pas.",
      "Conserver un vrai volume d'endurance dans une semaine par ailleurs vidée, sans toucher à la fraîcheur nécessaire dimanche.",
    ),
    ef(
      40,
      "40 min en Z2 le jeudi. Vendredi et samedi, plus rien du tout, pas même un footing de déblocage. Aucune ligne droite non plus cette semaine : on ne réveille pas la vitesse pour une course qui va se courir en allure retenue.",
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
  prerequis:
    "Tenir déjà 1 h 15 le dimanche sur terrain vallonné et courir le 10 km en moins d'une heure. Le marathon demande en plus d'encaisser cinq heures de course par semaine au plus fort de la préparation, sortie de 2 h 30 comprise.",
  semainesContenu: [
    semaine(
      1,
      'bloc1',
      'Poser la charpente, vite',
      "Tu arrives avec du volume, l'objectif de cette semaine n'est donc pas d'en ajouter mais de lui donner une forme : deux sorties nettement séparées, une sortie longue identifiée au même jour pendant quinze semaines, et tout de suite du travail rapide, parce qu'un marathonien qui ne court jamais vite perd sa foulée bien avant de manquer d'endurance.",
      [
        ef(
          50,
          "50 min en Z2. Si tu cours d'habitude toutes tes sorties au même rythme, celle-ci doit te sembler trop lente. C'est le signe que tu es au bon endroit.",
          "Distinguer une bonne fois le facile du soutenu, faute de quoi tout le reste du programme se courra à une seule et même intensité moyenne, la moins utile de toutes.",
        ),
        vma(
          60,
          "20 min d'échauffement progressif en Z2, puis 2 séries de 5 fois 400 m en Z5, en comptant environ 1 min 40 par 400 m, avec 1 min 20 de trottinement en Z1 entre chaque et 2 min 40 entre les deux séries, puis 10 min de retour au calme en Z2. Ce 1 min 40 est une estimation de planification et jamais une allure à tenir : la seule consigne est de finir chaque 400 m sans pouvoir prononcer un mot.",
          "Ouvrir quinze semaines de fond par la seule chose que le fond ne construira jamais, une foulée ample et rapide, tant qu'il reste du temps pour l'installer.",
        ),
        sl(
          90,
          "1 h 30 en Z2 d'une traite. Pars franchement lentement sur le premier quart d'heure, tu récupéreras du temps sur la fin sans rien forcer.",
          "Fixer le point de départ du dimanche, celui qui va gagner une dizaine de minutes par palier jusqu'à 2 h 30.",
        ),
        renfo(
          20,
          "3 séries de : 40 s de planche ventrale, 25 s de planche sur chaque côté, 14 fentes avant par jambe. 1 min de récupération entre les séries.",
          "Installer le socle de gainage qui tiendra ta posture dans la quatrième heure de course, celle où la foulée se déforme sans que le coureur s'en rende compte.",
        ),
      ],
    ),

    semaine(
      2,
      'bloc1',
      'Kilomètres puis demi-kilomètres',
      "Changement complet de séquence. Après la vitesse pure, on entre au seuil par une séance descendante : quatre kilomètres d'abord, puis deux demi-kilomètres qui doivent être les morceaux les plus faciles de la séance.",
      [
        ef(
          56,
          "56 min en Z2, la veille de rien et le lendemain de rien. Respiration ample et régulière du départ à l'arrivée, y compris dans les montées.",
          "Encadrer la première séance au seuil par du volume facile, car la progression se fabrique pendant ces sorties-là et pas pendant la séance elle-même.",
        ),
        seuil(
          60,
          "20 min d'échauffement en Z2, puis 4 fois 1000 m puis 2 fois 500 m en Z4, en comptant environ 4 min par 1000 m et 2 min par 500 m, avec 2 min de trottinement en Z1 entre chaque bloc, puis 10 min de retour au calme en Z2. Ces deux repères sont une estimation de planification et jamais une allure à tenir. En Z4 tu ne places plus que trois ou quatre mots à la fois, et la descente est voulue : les deux 500 m de la fin doivent être les plus faciles à courir.",
          "Entrer au seuil par une séquence qui se termine plus court qu'elle n'a commencé, seul moment du programme où la fraction arrive en récompense et non en épreuve.",
        ),
        sl(
          97,
          "1 h 37 en Z2. Sept minutes de plus que la semaine dernière, et pas une de plus même si la forme est là.",
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
      "Première touche d'allure marathon",
      "Semaine la plus chargée des quatre premières. Troisième format en trois semaines : après la vitesse et le seuil, la Z3, celle que tu tiendras pendant des heures le 8 novembre. Les lignes droites apparaissent aussi en fin de footing facile.",
      [
        ef(
          56,
          "42 min en Z2, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 7 min de retour au calme en Z2. Une ligne droite se lance progressivement et se relâche avant la fin : tu ne dois jamais finir en dette de souffle, et la récupération se fait au pas, complètement.",
          "Garder à la foulée sa capacité à s'ouvrir, sur des efforts trop brefs pour fatiguer quoi que ce soit. Ce n'est pas une séance de vitesse, c'est un footing qui se termine bien.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          64,
          "20 min d'échauffement en Z2, puis 3 fois 10 min en Z3 avec 2 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. En Z3 tu parles par phrases courtes et on entend ton souffle : rien de plus, tu es très loin du seuil. Les trois blocs doivent se ressembler comme trois gouttes d'eau.",
          "Apprendre à distribuer un effort rigoureusement identique sur plusieurs blocs, ce qui est le problème central du marathon posé en miniature.",
        ),
        sl(
          105,
          "1 h 45 en Z2. À partir de cette durée, emporte systématiquement de l'eau, et teste dès maintenant la ceinture ou le sac que tu comptes utiliser en novembre.",
          "Passer l'heure trois quarts et transformer le portage de la boisson en habitude, parce que le jour de la course rien de tout cela ne s'improvise.",
        ),
        renfo(
          22,
          "2 séries de : 45 s de planche ventrale, 20 fentes marchées, 20 squats, 45 s de pont fessier allongé sur le dos, bassin décollé. 90 s de pause entre les séries.",
          "Réveiller les fessiers, premier moteur de la propulsion et premier groupe musculaire à lâcher quand la course dépasse trois heures.",
        ),
      ],
    ),

    semaine(
      4,
      'allegee',
      'Première respiration',
      "Le volume recule de 16 % et le travail se réduit à dix montées de côte. La semaine va te sembler creuse, c'est normal : c'est pendant celle-ci que le travail des trois précédentes se transforme en forme. Les trois sorties gardent leurs cinquante minutes, on ne coupe pas les séances, on coupe la fatigue.",
      [
        ef(
          53,
          "53 min en Z2, sans montre si tu en es capable, uniquement à la sensation.",
          "Rompre le réflexe de mesurer, parce qu'une semaine allégée se juge à la fraîcheur du lundi suivant et à rien d'autre.",
        ),
        vma(
          52,
          "20 min d'échauffement en Z2 jusqu'au pied de la côte, puis 10 montées de 1 min en côte, entre Z4 et Z5 selon la pente, avec 1 min 20 de descente en marchant entre chaque, puis 10 min de retour au calme en Z2. Cherche une pente régulière et roulante, pas un mur : la dixième montée doit se courir comme la première, sinon la pente est trop raide.",
          "Muscler la poussée sur le relief que ce groupe pratique tous les dimanches, dix minutes de travail en côte remplaçant avantageusement une séance sur le plat pendant une semaine sans exigence.",
        ),
        sl(
          85,
          "1 h 25 en Z2, vingt minutes de moins que la semaine passée. Termine avec la nette impression que tu aurais pu en refaire autant.",
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
      'Six kilomètres au seuil',
      "Deuxième cycle, et le travail remonte en Z4, un bon cran au-dessus de ton allure du 8 novembre. Ce n'est pas l'allure de dimanche : c'est ce qui va rendre celle de dimanche confortable. Six kilomètres rapides d'un coup, sur des récupérations franches.",
      [
        ef(
          63,
          "1 h 03 en Z2, le surlendemain de la séance au seuil et jamais la veille. Aucune ligne droite pendant les deux semaines de seuil qui viennent.",
          "Produire du volume utile un jour où le corps digère encore la séance dure, en lui épargnant tout stimulus supplémentaire.",
        ),
        seuil(
          64,
          "20 min d'échauffement en Z2, puis 6 fois 1000 m en Z4, en comptant environ 4 min par 1000 m, avec 2 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Ce repère de 4 min est une estimation de planification et jamais une allure à tenir. Le sixième kilomètre doit sortir dans le même temps que le premier : c'est le seul indicateur qui compte ici.",
          "Porter à six kilomètres le temps passé au-dessus de l'allure de course, sur des récupérations trop brèves pour que le souffle redescende complètement.",
        ),
        sl(
          105,
          "1 h 45 en Z2 sur parcours légèrement vallonné. Passe les côtes en gardant le souffle sous contrôle, quitte à ralentir beaucoup plus que tu ne le voudrais.",
          "Habituer les jambes à produire de l'effort sur terrain irrégulier, après quoi le plat devient nettement plus économique.",
        ),
        renfo(
          25,
          "3 séries de : 50 s de planche ventrale, 30 s de planche sur chaque côté, 20 squats, 16 fentes par jambe. 1 min de pause entre les séries.",
          "Monter d'un cran maintenant que la charge de course est bien encaissée, la structure musculaire doit suivre la progression du volume et non la subir.",
        ),
      ],
    ),

    semaine(
      6,
      'bloc2',
      'On commence par le plus long',
      "Deuxième et dernière semaine de seuil du deuxième cycle, et séquence renversée : on ouvre sur des 3000 m, treize minutes d'affilée, avant de redescendre au kilomètre. C'est la seule séance du programme qui attaque par le morceau le plus long.",
      [
        ef(
          65,
          "1 h 05 en Z2. Si les jambes sont émoussées au départ, descends la sortie entière en Z1, cela ne coûte strictement rien à la préparation.",
          "Encaisser une semaine de seuil sans y ajouter le moindre effort superflu, la séance dure suffit largement à l'exigence des sept jours.",
        ),
        seuil(
          70,
          "20 min d'échauffement en Z2, puis 2 fois 3000 m puis 2 fois 1000 m en Z4, en comptant environ 13 min par 3000 m et 4 min par 1000 m, avec 2 min de trottinement en Z1 entre chaque bloc, puis 10 min de retour au calme en Z2. Chacun de ces deux repères est une estimation de planification et jamais une allure à tenir. Treize minutes d'affilée, c'est long : découpe mentalement en trois fois quatre minutes.",
          "Commencer l'effort par le morceau le plus long pour que tout le reste paraisse court ensuite, ce qui est très exactement la gestion mentale que réclamera le 8 novembre.",
        ),
        sl(
          115,
          "1 h 55 en Z2. Teste ce que tu comptes manger en course, gel, pâte de fruits ou autre, dès cette sortie et pas trois semaines avant le départ.",
          "Approcher les deux heures et commencer à régler le ravitaillement, qui décide de la fin d'un marathon aussi sûrement que l'entraînement.",
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
      "Semaine la plus lourde depuis le début, et elle repart en Z3 : quarante-deux minutes à l'allure du marathon plus une sortie longue de plus de deux heures. C'est le point haut du travail général, ensuite tout devient spécifique.",
      [
        ef(
          65,
          "51 min en Z2, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 7 min en Z2. Les lignes droites reviennent après deux semaines de seuil, six suffisent.",
          "Rendre un peu de fréquence d'appui à une foulée qui sort de deux semaines passées entre Z2 et Z4, sans rien prélever sur la séance spécifique.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          78,
          "20 min d'échauffement en Z2, puis 3 fois 14 min en Z3 avec 3 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Quatorze minutes d'affilée, trois fois : la difficulté n'est plus l'intensité, c'est de ne pas dériver vers le haut sans t'en apercevoir.",
          "Faire connaissance pour de bon avec l'intensité qui décidera du 8 novembre, sur une dose encore raisonnable et à une distance du départ qui laisse tout le temps de s'y accoutumer.",
        ),
        sl(
          125,
          "2 h 05 en Z2, la plus longue jusqu'ici. Programme-la un jour sans obligation derrière, et prends un vrai repas deux à trois heures avant le départ.",
          "Dépasser les deux heures, durée à partir de laquelle l'organisme apprend réellement à épargner son carburant plutôt qu'à le brûler.",
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
      "Le volume recule de 16 % et la séance de qualité devient minuscule : huit fractions de 200 m, six minutes de travail en tout. Sept semaines derrière, sept devant, c'est le moment de faire le point sur les petites douleurs et sur l'état des chaussures, pendant qu'il reste le temps d'agir.",
      [
        ef(
          73,
          "1 h 13 en Z2 très souples. Pas de côte, pas de ligne droite, pas de terrain technique. Regarde l'usure de tes semelles pendant que tu y penses : si la paire approche des 700 km, il faut en roder une autre dès maintenant.",
          "Laisser le système nerveux souffler et régler la logistique, parce que changer de chaussures dans le dernier mois est la meilleure façon de gâcher quinze semaines de travail.",
        ),
        vma(
          52,
          "20 min d'échauffement en Z2, puis 2 séries de 4 fois 200 m en Z5, en comptant environ 45 s par 200 m, avec 2 min de trottinement en Z1 entre chaque et 4 min entre les deux séries, puis 10 min de retour au calme en Z2. Ce repère de 45 s est une estimation de planification et jamais une allure à tenir. Récupérations volontairement énormes : chaque 200 m doit être aussi vif que le premier, la fatigue n'a rien à faire ici.",
          "Réveiller le haut de la palette avec une dose ridiculement basse, unique moyen d'empêcher la foulée de s'engourdir pendant une semaine dont le rôle est de retirer et non d'ajouter.",
        ),
        sl(
          100,
          "1 h 40 en Z2, vingt-cinq minutes de moins qu'au sommet du cycle. Entièrement facile : si tu accélères sur la fin, tu as manqué l'intérêt de la semaine.",
          "Tenir le pilier de la préparation à charge réduite, car l'habitude de courir longtemps se perd beaucoup plus vite qu'elle ne se construit.",
        ),
        renfo(
          18,
          "2 séries de : 45 s de planche, 15 squats, 12 fentes par jambe, 30 s de pont fessier. Aucune côte et aucun travail excentrique cette semaine.",
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
      "Trois quarts d'heure à l'allure du 8 novembre",
      "Deuxième marche du cycle spécifique. Le seuil est rangé pour de bon, tout le travail de qualité se fait désormais à l'allure exacte du marathon, et les blocs passent à quinze minutes. La sortie longue franchit les deux heures et quart.",
      [
        ef(
          62,
          "48 min en Z2, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 7 min en Z2. À placer loin de la séance spécifique, jamais la veille.",
          "Ajouter du volume facile dans une semaine dense tout en gardant la foulée vive, sans jamais mordre sur la fraîcheur qu'exigent les blocs en Z3.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          81,
          "20 min d'échauffement en Z2, puis 3 fois 15 min en Z3 avec 3 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Quarante-cinq minutes à l'allure de course sur une seule séance : le troisième bloc arrive sur des jambes qui n'ont pas complètement récupéré, et c'est tout son intérêt.",
          "Tenir l'allure de course sur des blocs assez longs pour que la dérive devienne visible, seul défaut qui transforme un marathon réussi en marche forcée.",
        ),
        sl(
          132,
          "2 h 12 en Z2, sans le moindre bloc rapide ni accélération finale. Dans ce cycle, la sortie longue soutient la séance spécifique, elle ne la double pas.",
          "Reprendre la progression du dimanche exactement là où le cycle précédent l'avait laissée, en la gardant entièrement facile pour préserver la qualité des blocs en Z3.",
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 30 s de gainage latéral par côté, 20 montées sur une marche par jambe, 20 squats. 1 min de pause.",
          "Travailler la chaîne d'appui une jambe après l'autre, puisque c'est ainsi qu'elle fonctionne en course et jamais autrement.",
        ),
      ],
    ),

    semaine(
      11,
      'bloc3',
      'Cinquante minutes en deux morceaux',
      "Troisième et dernière marche du cycle, et la plus chargée des trois. Deux blocs de vingt-cinq minutes à l'allure du marathon, et une sortie longue qui frôle les 2 h 20. À partir d'ici, ton allure n'est plus une hypothèse.",
      [
        ef(
          61,
          "47 min en Z2, puis 6 lignes droites de 20 s en Z5 avec 1 min de marche entre chaque, soit 7 min, puis 7 min en Z2. Sur terrain souple de préférence, la semaine est lourde.",
          "Entretenir la vivacité de la foulée dans la semaine la plus chargée du cycle spécifique, sans rien retirer aux deux blocs en Z3 qui suivent.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          85,
          "20 min d'échauffement en Z2, puis 2 fois 25 min en Z3 avec 5 min de trottinement en Z1 entre les deux, puis 10 min de retour au calme en Z2. Vingt-cinq minutes d'un seul tenant, c'est plus long que tout ce que tu as fait à cette allure : le second bloc dira si le premier est parti juste.",
          "Vérifier concrètement que l'allure visée tient sur une durée qui commence à compter, ce qu'aucune table de correspondance ne remplacera jamais.",
        ),
        sl(
          142,
          "2 h 22 en Z2 sur terrain varié. Bois régulièrement et mange en course selon le protocole que tu as testé en semaine 6, sans rien changer au dernier moment.",
          "Passer les deux heures et quart dans une semaine qui porte déjà cinquante minutes d'allure spécifique, ce qui la rend plus exigeante en fatigue que le pic ne le sera en intensité.",
        ),
        renfo(
          25,
          "2 séries de : 1 min de planche ventrale, 45 s de gainage latéral par côté, 45 s de chaise contre un mur, 24 squats, 20 fentes marchées. Fais la deuxième série sans pause complète.",
          "Solliciter la tenue posturale dans un état de fatigue installée, parce que c'est elle qui cède la première après trois heures de course et pas la force des jambes.",
        ),
      ],
    ),

    semaine(
      12,
      'allegee',
      'Respirer avant le sommet',
      "Dernière semaine plus douce du programme. Le volume tombe de 17 % et la séance de qualité se réduit à deux blocs de dix minutes. Placer une semaine calme juste avant la plus lourde des quinze n'est pas une incohérence, c'est ce qui rend la semaine 13 possible.",
      [
        ef(
          72,
          "1 h 12 en Z2, tranquilles. Si une gêne traîne depuis le cycle spécifique, c'est cette semaine qu'il faut la traiter, pas dans quinze jours.",
          "Utiliser une semaine sans exigence pour éteindre les petites alertes, tant qu'il reste assez de temps devant pour le faire sans perdre de forme.",
        ),
        tempo(
          53,
          "20 min d'échauffement en Z2, puis 2 fois 10 min en Z3 avec 3 min de trottinement en Z1 entre les deux, puis 10 min de retour au calme en Z2. Vingt minutes à l'allure de course, soit un tiers de la dose de la semaine passée : tu dois rentrer avec l'impression très nette de ne rien avoir fait.",
          "Garder le contact avec l'allure visée à dose divisée par deux, parce qu'une semaine de respiration doit retirer de la fatigue sans laisser la sensation s'effacer.",
        ),
        sl(
          115,
          "1 h 55 en Z2, une demi-heure de moins que la semaine passée. Termine avec la sensation nette d'avoir gardé de la marge sous le pied.",
          "Laisser le fond reculer d'un cran pour aborder la sortie de 2 h 30 avec des jambes qui ont réellement récupéré, et non avec la seule envie d'y arriver.",
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
      "Semaine la plus lourde des quinze : cinq heures de course, dont une heure entière à l'allure du 8 novembre et la sortie de 2 h 30. Elle arrive juste après une semaine douce, c'est ce qui la rend faisable. Si tu la termines proprement, le marathon est à ta portée.",
      [
        ef(
          54,
          "54 min en Z2, sans la moindre accélération et sans lignes droites. C'est une sortie de transport, rien d'autre, à placer entre les deux gros rendez-vous.",
          "Fournir du volume neutre dans une semaine dont toute la difficulté est concentrée sur deux séances, sans rien y ajouter.",
        ),
        tempo(
          96,
          "20 min d'échauffement en Z2, puis 3 fois 20 min en Z3 avec 3 min de trottinement en Z1 entre chaque, puis 10 min de retour au calme en Z2. Une heure pleine à l'allure de course, avec des récupérations si brèves qu'elles ne servent qu'à boire. C'est la séance la plus longue du programme et la seule à ce niveau.",
          "Passer soixante minutes à l'allure visée dans une seule séance, dose au-delà de laquelle le corps cesse de découvrir cette allure et commence à la considérer comme normale.",
        ),
        sl(
          150,
          "2 h 30 en Z2, la plus longue du programme et le plafond absolu. Entièrement facile : le but est la durée, pas l'effort. Applique le protocole de boisson et d'alimentation exactement comme le 8 novembre, c'est la dernière répétition.",
          "Toucher une bonne fois les deux heures et demie, durée au-delà de laquelle le coût en récupération augmente beaucoup plus vite que le bénéfice pour un coureur de club.",
        ),
        renfo(
          25,
          "3 séries de : 1 min de planche ventrale, 24 squats, 20 fentes marchées, 45 s de pont fessier sur une jambe en alternant. Étirements complets pour finir, sans jamais forcer sur une position.",
          "Refermer le renforcement à son point haut avant de le réduire nettement pour les trois dernières semaines.",
        ),
      ],
    ),

    semaine(
      14,
      'affutage',
      'La répétition générale',
      "L'affûtage commence. Le volume recule de 32 % d'un coup, et la séance spécifique se resserre à deux blocs de seize minutes. C'est la dernière occasion de valider ton allure, et la première semaine où tu vas te sentir bizarrement frais. Ne cède pas à l'envie d'en faire plus.",
      [
        ef(
          50,
          "39 min en Z2, puis 4 lignes droites de 15 s en Z5 avec 1 min de marche entre chaque, soit 4 min, puis 7 min en Z2. En début de semaine, jamais la veille de la séance spécifique.",
          "Rappeler la vitesse aux jambes en quantité volontairement faible, quatre lignes droites suffisent largement en période d'affûtage.",
          { zonesSecondaires: ['Z5'] },
        ),
        tempo(
          65,
          "20 min d'échauffement en Z2, puis 2 fois 16 min en Z3 avec 3 min de trottinement en Z1 entre les deux, puis 10 min de retour au calme en Z2. Trente-deux minutes à l'allure de course, soit un peu plus de la moitié de la dose du pic. Si les deux blocs se ressemblent et que tu finis sans forcer, ton allure du 8 novembre est la bonne.",
          "Valider l'allure de course sur un volume représentatif, à un moment où il reste le temps de récupérer mais où il est trop tard pour progresser.",
        ),
        sl(
          90,
          "1 h 30 en Z2 seulement. Après deux mois passés entre deux heures et deux heures et demie, tu vas la trouver ridiculement courte : c'est précisément l'effet recherché.",
          "Couper franchement dans la sortie longue pour laisser la fraîcheur remonter, l'endurance construite en quatorze semaines ne se perd pas en quinze jours.",
        ),
        renfo(
          15,
          "2 séries de : 40 s de planche ventrale, 25 s de gainage latéral par côté, 14 squats lents. Puis 6 min d'étirements doux.",
          "Rappeler le gainage qui tiendra le buste droit dans la dernière heure de course, sans rien réclamer à un corps qui sort de quatorze semaines de sorties longues.",
        ),
      ],
    ),

    semaine(
      15,
      'affutage',
      'Semaine du marathon',
      "Le volume d'entraînement est divisé par plus de trois. Dimanche 8 novembre, tu cours ton marathon. Les deux séances de la semaine sont volontairement courtes, 48 et 40 min là où tu tournes à deux heures depuis trois mois : ce n'est pas un oubli de programmation, c'est le seul moyen d'arriver frais. Absolument rien de ce que tu feras d'ici là ne peut plus te rendre plus fort.",
      [
        ef(
          48,
          "48 min en Z2 lundi ou mardi. Souple, sans rien chercher, sans lignes droites et sans côte. Séance courte à dessein : ce qui dépasse trois quarts d'heure ne te rapporte plus rien maintenant.",
          "Garder le geste de course et évacuer les dernières traces de l'affûtage sans créer la moindre fatigue supplémentaire.",
        ),
        tempo(
          40,
          "12 min d'échauffement en Z2, puis 2 fois 8 min en Z3 avec 5 min de trottinement en Z1 entre les deux, puis 7 min de retour au calme en Z2. Mercredi au plus tard, jamais après. Seize minutes d'allure de course, c'est un rappel et pas un entraînement.",
          "Faire retrouver au corps la sensation exacte de dimanche à dose minuscule, pour qu'il la reconnaisse dès les premiers kilomètres au lieu de la chercher.",
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
      "Aucune intensité, aucun chrono, aucune comparaison. Des sorties de 35 à 55 min seulement, et c'est le but : après quinze semaines à deux heures et plus, cette brièveté est la séance elle-même. Un marathon laisse des dégâts musculaires qui mettent trois semaines à disparaître, même quand les sensations reviennent au bout de cinq jours.",
      [
        recup(
          35,
          "35 min en Z1, quatre à cinq jours après la course et pas un jour avant. Si les quadriceps sont encore douloureux dans les escaliers, remplace par 45 min de marche, le bénéfice est le même.",
          "Relancer la circulation pour évacuer les déchets musculaires plus vite qu'en restant assis, sans rien demander à des fibres encore abîmées.",
        ),
        recup(
          45,
          "45 min en Z1 en fin de semaine. Les sensations vont revenir avant les muscles et tu vas avoir envie d'accélérer : ne le fais pas, c'est exactement là que se prennent les blessures d'après-course.",
          "Laisser le retour de la forme se faire tout seul plutôt que d'aller le chercher, seule erreur vraiment coûteuse de cette semaine.",
        ),
        recup(
          55,
          "55 min en Z1 sur terrain souple, la semaine suivante si tu préfères l'étaler. Choisis le parcours pour le paysage et laisse la montre à la maison.",
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
