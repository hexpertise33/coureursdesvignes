# Application de préparation aux courses : où on en est

Document de passation, mis à jour le 19 juillet 2026. À lire en premier par
toute session qui reprend ce chantier.

## En une phrase

Une application web qui donne à chaque adhérent du club son programme
d'entraînement, une semaine à la fois, publiée automatiquement le dimanche à
19 h, avec suivi des séances pour l'encadrant. **Elle fonctionne en local, elle
n'est pas déployée.**

## Où est le code

- **Branche `prepa-courses`**, non fusionnée dans `main` et non poussée sur
  GitHub. La branche est propre.
- **Front** : `prepa.html`, `js/prepa.js`, et un bloc « PRÉPA » à la fin de
  `css/style.css`.
- **Serveur** : `prepa-api/`, un Worker Cloudflare avec base D1.
- **576 tests** passent (`cd prepa-api && npm test`).

## Comment le lancer

Deux serveurs, tous deux déclarés dans `.claude/launch.json` du dossier parent :

```
prepa-api             port 8787   le Worker
coureurs-des-vignes   port 4599   le site
```

Puis ouvrir `http://localhost:4599/prepa.html`.

Codes d'accès en local (dans `prepa-api/.dev.vars`, ignoré par git) :
code coureur et code admin, à demander à David. **Aucun code réel ne doit
jamais être écrit dans un fichier versionné**, y compris les tests, qui
utilisent `coureur-test` et `admin-test`, ni dans un fichier de mémoire.

Les deux codes ont été changés le 19 juillet. Le code coureur valait
jusque-là le code postal de Montagne, qui est affiché dans le pied de page
des dix-sept pages du site, prepa.html comprise : le secret était imprimé à
côté de la serrure. **Ne jamais reprendre comme code une donnée que le site
publie.** Les deux codes n'ont par ailleurs plus aucun rapport arithmétique
entre eux : un moment où ils étaient consécutifs mettait tout adhérent à un
incrément du back-office encadrant.

## Ce qui est fait

**Six programmes d'entraînement**, tous démarrant le lundi 27 juillet 2026 :

| Code | Course | Date | Durée | Pic hebdo |
|---|---|---|---|---|
| P1 | 10 km d'Izon | 27/09 | 9 sem. | 208 min |
| P2 | 10 km de Bordeaux | 08/11 | 15 sem. | 215 min |
| P3 | Semi de Bordeaux | 08/11 | 15 sem. | 250 min |
| P4 | Marathon Bordeaux ou Nice-Cannes | 08/11 | 15 sem. | 300 min |
| P5 | 10 km HOKA Paris | 15/11 | 16 sem. | 216 min |
| P6 | 16 km d'Andernos | 27/09 | 9 sem. | 225 min |

**Le serveur** : publication à la date, verrou sur les semaines futures,
authentification par deux codes partagés, validation des séances avec ressenti,
back-office encadrant (assiduité, alertes, veto, fusion, effacement).

**Le front** : catalogue des courses, inscription, page de présentation de la
prépa, semaine avec allures personnelles, validation et ressenti, programme
complet, zones, vue encadrant.

**Le parcours d'entrée**, refait le 19 juillet. L'onglet Prépa ouvre sur les
six courses, sans code : date, distance, lieu, durée, résumé et prérequis,
triées par date de course et groupées par jour. Le coureur clique sur sa
course, et c'est seulement là que le code est demandé, puis son prénom et son
initiale. La course choisie est retenue avant la saisie du code, pour qu'elle
survive à un aller-retour de dix minutes.

**La déconnexion**, dans une barre sous les onglets qui dit aussi qui est
connecté. Elle passe par `POST /api/deconnexion` : le cookie est HttpOnly,
donc seul le serveur peut le fermer. La route est ouverte sans session, parce
que celui dont le jeton vient d'expirer est précisément celui qui a un cookie
mort dont il ne peut pas se débarrasser.

**L'encadrant lit les six prépas** depuis un sélecteur dans cette même barre.
Il pilote les vues sans jamais toucher à sa fiche : consulter le marathon ne
réinscrit pas au marathon.

**Le déroulé des séances**, ajouté le 19 juillet. Chaque séance s'affiche en
tableau, une ligne par étape : durée, zone, ce que tu fais. Le serveur découpe
la description, personne n'a réécrit de contenu. La durée du bloc de
fractionné, seul segment écrit en distance, se déduit du total déclaré moins
les étapes lisibles. Voir `decouperDeroule()` dans `seances.js`.

**Le rappel du samedi**, écrit et branché sur le handler `scheduled`. Il
annonce la semaine qui part le lendemain et nomme les coureurs à surveiller.
Le binding `send_email` reste commenté dans `wrangler.toml` : il exige que
tridav00@gmail.com soit vérifiée dans Email Routing, et il fait échouer le
déploiement tant que ce n'est pas fait. Sans lui le code est inoffensif,
`envoyerRappel` rend `sans-binding` et le cron se termine normalement.

**La base D1 de production** est créée (`prepa`, région WEUR) et les trois
migrations y sont appliquées. Son identifiant est dans `wrangler.toml`.

## Les décisions à ne pas défaire

Elles ont toutes été prises par David, qui est expert du bâtiment mais aussi
coureur et encadrant du club. Elles sont le produit.

1. **Le contenu d'une semaine non publiée ne quitte jamais le serveur.** Ce
   n'est pas un masquage d'affichage. Une relecture a validé le verrou par
   2 870 requêtes adversariales sans une seule fuite. C'est la promesse
   centrale : ne pas la casser.
2. **Les séances sont écrites en zones 1 à 5, jamais en allure imposée.** La
   préparation est collective, chacun adapte son rythme. Les allures
   personnelles calculées depuis le temps sur 10 km, la VMA ou l'objectif sont
   des **repères**, jamais des consignes, et le texte le dit.
3. **Pas de tiret cadratin** dans les textes rédigés. `seances.js` lève une
   erreur si on en met un. Seule exception, la balise `<title>`.
4. **Trois séances de course par semaine plus une de renforcement**, sur les
   six programmes.
5. **Blocs de 3 semaines progressives puis une semaine plus douce**, et on
   recommence. Deux semaines d'affûtage avant la course, une de récupération
   après.
6. **Le public n'est pas débutant.** Tous courent le 10 km en moins d'une heure
   et sortent 1 h 15 le dimanche en vallonné. Aucune séance de semaine normale
   ne descend sous 50 minutes.
7. **L'identité d'un coureur est prénom plus initiale du nom**, parce que deux
   homonymes s'écraseraient sinon silencieusement.
8. **Le catalogue des courses est public, le contenu des séances ne l'est
   jamais.** Ce qui sort sans code tient en une phrase : ce que le club
   prépare, quand, et pour qui. Aucune séance, aucune semaine, aucun nom de
   coureur. Décision de David du 19 juillet, prise en connaissance de
   l'alternative.
9. **La couleur encode l'intensité** : Z1 sauge, Z2 vert vigne, Z3 or, Z4 terre
   cuite, Z5 bordeaux. C'est la vigne qui tourne entre juillet et novembre.
10. **Le déroulé est déduit de la description, jamais saisi à la main.** Sa
   justesse tient à ce que le corpus reste écrit dans la forme sur laquelle le
   découpage s'appuie : première phrase le déroulé, étapes séparées par
   « puis », durée en tête d'étape. Un test balaie les 340 séances et vérifie
   que la somme des étapes égale la durée déclarée de la séance. Il vérifie
   d'un coup le découpage et le contenu : une étape mal détachée déplace du
   temps d'une ligne à l'autre et fait tomber le total à côté.
11. **Une session dure 120 jours**, calés sur la saison. Ouverte à la parution
   de la semaine 1 le 26 juillet, elle expire le 23 novembre, le lendemain de
   la fin de la dernière semaine du plus long programme. Aucun coureur n'est
   déconnecté pendant sa préparation, aucune session ne survit à celle-ci. Un
   test recalcule les deux bornes depuis le calendrier réel : si la saison se
   décale, c'est lui qui préviendra.

## L'application est en ligne

**https://coureursdesvignes.fr/prepa**, depuis le 19 juillet 2026.

- Le Worker est déployé et sert l'API sur `coureursdesvignes.fr/api/*`, par une
  route posée sur la zone. **Pas sur workers.dev**, et ce n'est pas un détail :
  le cookie de session est `SameSite=Lax` et un navigateur ne l'envoie jamais
  sur une requête inter-sites. Servir l'API depuis un autre domaine donnerait
  200 à la connexion puis 401 partout ensuite.
- La base D1 de production existe, migrée. Le projet Pages sert le site, la
  branche de production est `main`.
- Les trois valeurs d'accès sont posées **en Secret**. `GET /api/sante` renvoie
  `{ ok, configure }` ; `configure` à faux signale qu'il en manque une.

### Déployer une modification

```
cd prepa-api && npm test && npx wrangler deploy     # le Worker d'abord
cd .. && cp *.html dist/ && cp -R css js assets dist/
npx wrangler pages deploy dist --project-name coureurs-des-vignes --branch main
```

Trois pièges, tous rencontrés :

1. **Le Worker avant la page.** Le déroulé des séances se replie sur l'ancien
   paragraphe si le Worker déployé ne le connaît pas encore ; l'inverse
   donnerait une page cassée.
2. **Incrémenter les numéros de version** de `css/style.css?v=` et
   `js/prepa.js?v=` dans `prepa.html`. Sans cela un navigateur qui a déjà vu la
   page réutilise l'ancien script et ne voit aucun changement.
3. **Jamais de Variable pour un code d'accès**, toujours un Secret :
   `wrangler deploy` remplace les variables du Worker par celles de
   `wrangler.toml` et efface les autres. Le cas s'est produit, l'accès
   encadrant a disparu sans un message.

### Le développement en local

La page est sur le port 4599 et l'API sur 8787, donc deux origines, alors qu'en
production tout est en même origine. Le cookie ne se comporte pas pareil et la
connexion échoue dans un navigateur. Pour un test de bout en bout, passer par un
relais qui sert le site et transmet `/api/*` au Worker depuis un seul port.

Penser aussi à `npx wrangler d1 migrations apply prepa --local` : la base locale
de Miniflare est indexée sur le `database_id`, et celui-ci a changé quand la
base de production a été créée.

## Ce qui reste à faire

**Le rappel du samedi**, seul point en attente et non bloquant. Le code est
écrit, testé et déployé, mais inerte : `envoyerRappel` rend `sans-binding` et le
cron se termine normalement. Pour l'activer, vérifier tridav00@gmail.com dans
Cloudflare Email Routing (lien de confirmation à cliquer par David), puis
décommenter le bloc `[[send_email]]` de `wrangler.toml` et redéployer.

## Les points ouverts, à trancher par David

- **Les profils de course de la page de présentation sont écrits par moi et
  non vérifiés.** David connaît ces parcours, pas moi. Ils sont dans la
  constante `FICHES` de `js/prepa.js` et devraient à terme vivre côté serveur
  avec les programmes.
- **Le grand héros de la page mange le premier écran** une fois le coureur
  connecté. À réduire ou supprimer, c'est le plus gros gain d'ergonomie
  restant.
- **Le marathon monte à 300 min hebdomadaires sur trois sorties.** Une
  quatrième sortie facile étalerait la charge.
- Quelques données de la page de présentation (durée, charge du pic, sortie
  longue) sont écrites à la main dans `js/prepa.js` au lieu d'être calculées
  depuis les programmes. Ça peut se désynchroniser.

## L'échéance

**La semaine 1 se publie le dimanche 26 juillet à 19 h.** Si la mise en ligne
n'est pas faite d'ici là, le contenu existe et reste diffusable à la main.

## Comment travailler sur ce projet

David juge sur ce qui marche à l'écran, pas sur le processus. Sortir un écran
tôt, le montrer, itérer. Garder la machinerie lourde (sous-agents, relecture
systématique) pour ce qui est réellement critique : la sécurité, les données,
et le contenu d'entraînement qui peut blesser quelqu'un.

Les spécifications et le plan d'origine sont dans `docs/superpowers/`, mais ils
ont été largement dépassés par les décisions prises en cours de route. **Ce
document fait foi.**
