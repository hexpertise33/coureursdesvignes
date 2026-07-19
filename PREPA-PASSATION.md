# Application de préparation aux courses : où on en est

Document de passation, 18 juillet 2026. À lire en premier par toute session
qui reprend ce chantier.

## En une phrase

Une application web qui donne à chaque adhérent du club son programme
d'entraînement, une semaine à la fois, publiée automatiquement le dimanche à
19 h, avec suivi des séances pour l'encadrant. **Elle fonctionne en local, elle
n'est pas déployée.**

## Où est le code

- **Branche `prepa-courses`**, 48 commits, non fusionnée dans `main` et non
  poussée sur GitHub. La branche est propre.
- **Front** : `prepa.html`, `js/prepa.js`, et un bloc « PRÉPA » à la fin de
  `css/style.css`.
- **Serveur** : `prepa-api/`, un Worker Cloudflare avec base D1.
- **541 tests** passent (`cd prepa-api && npm test`).

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
utilisent `coureur-test` et `admin-test`.

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

**Le front** : inscription, page de présentation de la prépa, semaine avec
allures personnelles, validation et ressenti, programme complet, zones,
vue encadrant.

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
8. **La couleur encode l'intensité** : Z1 sauge, Z2 vert vigne, Z3 or, Z4 terre
   cuite, Z5 bordeaux. C'est la vigne qui tourne entre juillet et novembre.

## Ce qui reste à faire

1. **La mise en ligne.** Créer la base D1 de production, poser les deux codes
   en secrets Cloudflare, déployer le Worker, publier la page, reporter l'URL
   du Worker dans la constante `API` de `js/prepa.js`. Compte une demi-heure.
2. **Le rappel du samedi par e-mail** vers tridav00@gmail.com, prévu au plan,
   pas branché. Le handler `scheduled` du Worker est encore vide.
3. **Fusionner `prepa-courses` dans `main`** et pousser.

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
