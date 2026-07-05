# Les Coureurs des Vignes — Site web

Site statique (HTML / CSS / JavaScript, sans outil de build) pour l'association
sportive **Les Coureurs des Vignes** — course à pied à Montagne Saint-Émilion.

Design ancré dans le terroir de Saint-Émilion (calcaire · vigne · vin), avec une
identité forte : illustrations **SVG** (aucune image lourde à charger),
animations légères natives, et un **tracé de parcours** qui se dessine et sert de
fil conducteur. Le site est superbe **même sans photos**.

## 📁 Structure

```
coureurs-des-vignes/
├── index.html                 → Accueil
├── entrainements.html         → Sortie du dimanche, déroulé, équipement
├── evenements.html            → Le Trail des Vignes + galerie souvenirs
├── adhesion.html              → Avantages, formules, étapes, bulletin
├── contact.html               → Coordonnées + formulaire
├── blog.html                  → Liste des articles du blog
├── article-*.html             → Un fichier par article de blog
├── css/style.css              → Design system complet (couleurs dans :root)
├── js/main.js                 → Menu, animations, compteurs, formulaires
├── assets/                    → Logo, photos, affiche du trail
└── server.js                  → Serveur d'aperçu local (facultatif)
```

## ✍️ Ajouter un article de blog

1. **Dupliquez** un article existant (par ex. `article-bienvenue.html`) et
   renommez la copie, par ex. `article-mon-sujet.html` (minuscules, tirets, pas
   d'espaces ni d'accents dans le nom de fichier).
2. Dans ce fichier, modifiez : le `<title>`, la date/catégorie (`article__meta`),
   le titre (`article__title`), l'image de couverture (`article__cover`) et le
   texte (`article__body`). Utilisez `<h2>` pour les sous-titres, `<p>` pour les
   paragraphes, `<ul><li>` pour les listes.
3. Dans **`blog.html`**, copiez une carte `<article class="article-card">…</article>`
   et pointez son lien vers votre nouveau fichier, avec sa vignette, sa catégorie,
   sa date, son titre et son accroche.

## 🎨 Identité

- **Couleurs** (modifiables en haut de `css/style.css`, bloc `:root`) : pierre
  calcaire `#e7e4d8`, craie `#faf8f1`, vert vigne profond `#14331e`, vert vigne
  `#2e6b3e`, vert pousse `#a9ce3c` (accent), bordeaux `#6e1a2a` (vin).
- **Typographies** (Google Fonts, chargement optimisé) : *Archivo Expanded*
  (titres), *Instrument Sans* (texte), *Space Mono* (données : distances,
  dénivelé, étiquettes).

## 🖼️ 1. Logo

Le logo du club (`assets/logo.png`, 256 px, optimisé) est en place partout :
en-tête, pied de page et icône d'onglet (favicon), sur toutes les pages.
Un logo SVG de repli (`assets/logo.svg`) s'affiche automatiquement si jamais le
PNG venait à manquer.

> Pour changer de logo : remplacez `assets/logo.png` par un nouveau fichier du
> même nom (idéalement carré, fond transparent, nom en minuscules).

## 📸 2. Photos

Le site est déjà **livré avec 5 photos** de vignobles de Saint-Émilion issues de
Wikimedia Commons (licence **CC BY-SA 4.0**), créditées dans le pied de page
(Pascal Moulin & Lauchantoiseau) :

| Fichier                        | Où elle apparaît                     |
|--------------------------------|---------------------------------------|
| `photo-groupe.jpg`             | Accueil (section « Le club »)         |
| `photo-entrainement.jpg`       | Entraînements (section équipement)    |
| `event-1.jpg` … `event-3.jpg`  | Événements (galerie)                  |

**Pour les remplacer par vos propres photos** : écrasez simplement ces fichiers
dans `assets/` en gardant les mêmes noms. Si vous remplacez **toutes** les
photos par les vôtres, vous pouvez retirer la mention « Photos vignes © … » du
pied de page (elle est dans chaque fichier `.html`, dans `.footer__bottom`).

> Si un fichier est supprimé, une illustration SVG de repli s'affiche à la
> place : rien ne casse.

**RGPD / droit à l'image** : pour vos propres photos, privilégiez des photos de
groupe / d'ambiance et récoltez l'accord des personnes reconnaissables. Une case
de consentement est prévue dans le bulletin d'adhésion.

## ✉️ 3. Formulaires (contact & adhésion)

Les deux formulaires sont prêts pour **[Formspree](https://formspree.io)** : une
fois activé, chaque demande arrive **directement dans la boîte mail du club**
(gratuit jusqu'à 50 envois/mois), sans dépendre du logiciel de messagerie du
visiteur.

**Pour activer la réception directe :**

1. Créez un compte sur https://formspree.io avec l'adresse
   **coureursdesvignes@gmail.com**.
2. Créez un formulaire (« New form ») : Formspree fournit un identifiant du type
   `xdkwabcd` (adresse `https://formspree.io/f/xdkwabcd`).
3. Dans **`adhesion.html`** *et* **`contact.html`**, remplacez `VOTRE_ID_FORMSPREE`
   par cet identifiant, dans `action="https://formspree.io/f/VOTRE_ID_FORMSPREE"`.
4. Faites un premier envoi test : Formspree envoie un mail de confirmation à
   l'adresse du club (à valider une seule fois).

> **Repli automatique** : tant que `VOTRE_ID_FORMSPREE` n'est pas remplacé — ou en
> cas de coupure réseau — les formulaires ouvrent le logiciel de messagerie du
> visiteur (« mailto »). Le site reste donc fonctionnel en attendant l'activation.

**Changer l'adresse de repli mailto** : modifiez `data-mailto="..."` dans les deux
fichiers.

## 🌐 4. Mettre en ligne (gratuit)

- **Netlify** : glissez-déposez le dossier sur https://app.netlify.com/drop
- **GitHub Pages** : poussez le dossier dans un dépôt puis activez Pages
- **Hébergeur classique (OVH, Ionos…)** : envoyez les fichiers par FTP

> `server.js` sert uniquement à prévisualiser en local (`node server.js`, puis
> http://localhost:4599). Inutile pour l'hébergement.

## ✅ À personnaliser avant la mise en ligne

- [ ] Adresse e-mail réelle (rechercher `contact@coureursdesvignes.fr`)
- [ ] Numéro de téléphone (rechercher `06 00 00 00 00`)
- [ ] Liens Facebook / Instagram (rechercher `href="#"` dans les `.social`)
- [ ] Tarifs et formules d'adhésion
- [ ] Dates et détails des événements
- [ ] Horaires et lieux d'entraînement
- [ ] Mentions légales (obligatoires pour une association loi 1901)
