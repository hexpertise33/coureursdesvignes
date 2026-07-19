/* =========================================================
   PRÉPA AUX COURSES — logique de la page
   ========================================================= */
(function () {
  'use strict';

  var API = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:8787'
    : 'https://prepa-api.hexpertise33.workers.dev';

  var CLE = 'cdv-prepa';
  var etat = {};
  try { etat = JSON.parse(localStorage.getItem(CLE) || '{}') || {}; } catch (e) { etat = {}; }
  function sauver() { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) {} }

  var $ = function (id) { return document.getElementById(id); };
  var ECRANS = ['ecran-code', 'ecran-profil', 'ecran-presentation', 'ecran-semaine', 'ecran-programme', 'ecran-zones', 'ecran-admin'];

  function montrer(id) {
    ECRANS.forEach(function (e) { $(e).hidden = e !== id; });
    var connecte = id !== 'ecran-code' && id !== 'ecran-profil';
    $('onglets').hidden = !connecte;
    $('onglet-admin').hidden = etat.role !== 'admin';
  }

  function dire(texte, type) {
    var m = $('message');
    if (!texte) { m.hidden = true; return; }
    m.textContent = texte;
    m.className = 'prepa-message' + (type ? ' prepa-message--' + type : '');
    m.hidden = false;
  }

  function echapper(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  async function appel(chemin, options) {
    options = options || {};
    var reponse = await fetch(API + chemin, {
      method: options.method || 'GET',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    if (reponse.status === 401) { etat.role = null; sauver(); montrer('ecran-code'); throw new Error('session'); }
    var donnees = await reponse.json().catch(function () { return {}; });
    donnees.__statut = reponse.status;
    return donnees;
  }

  /* ---------- Dates et libellés ---------- */

  var fmtLong = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long'
  });
  var fmtHeure = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit'
  });

  function quandDisponible(iso) {
    var d = new Date(iso);
    return 'Disponible ' + fmtLong.format(d) + ' à ' + fmtHeure.format(d).replace(':', ' h ');
  }

  var PHASES = {
    bloc1: 'Bloc 1', bloc2: 'Bloc 2', bloc3: 'Bloc 3',
    allegee: 'Semaine allégée', 'recuperation-active': 'Récupération active',
    affutage: 'Affûtage', recuperation: 'Récupération'
  };

  /* ---------- Écran 1 : code ---------- */

  $('form-code').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    dire('');
    var code = $('champ-code').value.trim();
    try {
      var r = await appel('/api/session', { method: 'POST', body: { code: code } });
      if (r.__statut !== 200) { dire(r.erreur || "Code d'accès incorrect.", 'erreur'); return; }
      etat.role = r.role;
      sauver();
      $('champ-code').value = '';
      demarrer();
    } catch (e) { dire('Connexion impossible. Réessaie dans un instant.', 'erreur'); }
  });

  /* ---------- Écran 2 : profil ---------- */

  var PROGRAMMES = [
    { code: 'P1', nom: "10 km d'Izon", date: 'dimanche 27 septembre', dateISO: '2026-09-27', duree: '9 semaines',
      prerequis: "Courir déjà environ 1 h 15 le dimanche sur terrain vallonné et viser moins d'une heure au 10 km.", izon: false },
    { code: 'P2', nom: '10 km de Bordeaux', date: 'dimanche 8 novembre', dateISO: '2026-11-08', duree: '15 semaines',
      prerequis: "Tenir déjà 1 h 15 de course le dimanche en terrain vallonné, et viser moins d'une heure sur 10 km.", izon: true },
    { code: 'P3', nom: 'Semi-marathon de Bordeaux', date: 'dimanche 8 novembre', dateISO: '2026-11-08', duree: '15 semaines',
      prerequis: "Sortir déjà 1 h 15 le dimanche en terrain vallonné et boucler le 10 km en moins d'une heure. Le semi demande en plus d'accepter de monter jusqu'à 1 h 45 de course d'une traite.", izon: true },
    { code: 'P4', nom: 'Marathon', date: 'dimanche 8 novembre', dateISO: '2026-11-08', duree: '15 semaines',
      prerequis: "Tenir déjà 1 h 15 le dimanche sur terrain vallonné et courir le 10 km en moins d'une heure. Le marathon demande en plus d'encaisser cinq heures de course par semaine au plus fort de la préparation, sortie de 2 h 30 comprise.", izon: true, variante: true },
    { code: 'P5', nom: '10 km HOKA de Paris', date: 'dimanche 15 novembre', dateISO: '2026-11-15', duree: '16 semaines',
      prerequis: "Sortir déjà 1 h 15 le dimanche en terrain vallonné et passer sous l'heure sur un 10 km. Le 10 km d'Izon fait partie du programme.", izon: false },
    // P6 se court le même jour que le 10 km d'Izon : aucune course-test ne peut
    // s'y ajouter, d'où izon: false et l'absence de variante de course.
    { code: 'P6', nom: "16 km d'Andernos", date: 'dimanche 27 septembre', dateISO: '2026-09-27', duree: '9 semaines',
      prerequis: "Courir déjà environ 1 h 15 le dimanche sur terrain vallonné et viser les 16 km d'une traite.", izon: false }
  ];

  function rendreChoixProgrammes() {
    $('choix-programmes').innerHTML = PROGRAMMES.map(function (p) {
      return '<label class="prepa-programme">' +
        '<input type="radio" name="programme" value="' + p.code + '" />' +
        '<span class="prepa-programme__corps">' +
          '<span class="prepa-programme__nom">' + echapper(p.nom) + '</span>' +
          '<span class="prepa-programme__meta">' + echapper(p.date) + ' · ' + echapper(p.duree) + '</span>' +
          '<span class="prepa-programme__prerequis">' + echapper(p.prerequis) + '</span>' +
        '</span></label>';
    }).join('');

    $('choix-programmes').addEventListener('change', function () {
      var code = (document.querySelector('input[name=programme]:checked') || {}).value;
      var p = PROGRAMMES.filter(function (x) { return x.code === code; })[0];
      $('bloc-variante').hidden = !(p && p.variante);
      $('bloc-izon').hidden = !(p && p.izon);
    });
  }

  $('form-profil').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    dire('');
    var choisi = document.querySelector('input[name=programme]:checked');
    if (!choisi) { dire('Choisis la course que tu prépares.', 'erreur'); return; }
    var variante = document.querySelector('input[name=variante]:checked');
    var corps = {
      prenom: $('champ-prenom').value.trim(),
      initiale: $('champ-initiale').value.trim(),
      programme: choisi.value,
      varianteCourse: $('bloc-variante').hidden ? null : (variante ? variante.value : null),
      faitIzon: !$('bloc-izon').hidden && $('champ-izon').checked
    };
    var r = await appel('/api/coureur', { method: 'POST', body: corps });
    if (r.__statut !== 200) { dire(r.erreur || 'Saisie incorrecte.', 'erreur'); return; }
    // L'identifiant sert à l'encadrant, que l'API reconnaît par son numéro et
    // non par son prénom. Un coureur, lui, s'identifie par prénom et initiale.
    // On envoie les deux, chaque rôle utilise ce qui le concerne.
    etat.coureurId = (r.coureur || {}).id;
    etat.prenom = corps.prenom;
    etat.initiale = corps.initiale;
    etat.programme = corps.programme;
    etat.faitIzon = corps.faitIzon;

    // Les repères sont facultatifs : on ne garde que ce qui a été saisi, et on
    // ignore en silence une valeur aberrante plutôt que de bloquer l'inscription.
    var t10 = parserTemps($('champ-temps10').value);
    var obj = parserTemps($('champ-objectif').value);
    var vma = Number($('champ-vma').value);
    var age = Number($('champ-age').value);
    var fcm = Number($('champ-fcmax').value);
    if (t10 >= 1500 && t10 <= 6000) etat.temps10km = t10;
    if (obj > 600 && obj < 25000) etat.objectif = obj;
    if (vma >= 8 && vma <= 25) etat.vma = vma;
    if (age >= 10 && age <= 99) etat.age = age;
    if (fcm >= 120 && fcm <= 230) etat.fcMax = fcm;

    sauver();
    // On arrive sur la présentation de la prépa, pas directement dans la
    // semaine : le coureur découvre d'abord sa course, sa structure et ses
    // zones, puis il entre quand il est prêt.
    voirPresentation();
    window.scrollTo(0, 0);
  });

  /* ---------- Glyphes de séance ----------
     Chaque type de séance a son tracé, dessiné dans le même trait que les
     parcours du site. La forme dit l'effort avant même qu'on lise le titre :
     une ondulation douce pour l'endurance, un dénivelé pour la côte, une
     dent de scie pour le fractionné. */

  var GLYPHES = {
    EF: '<path d="M2 16c4 0 4-5 8-5s4 5 8 5 4-5 8-5"/>',
    SL: '<path d="M2 20c5 0 6-9 12-9s7 9 12 9"/><circle cx="22" cy="7" r="3.2" fill="currentColor" stroke="none" opacity=".55"/>',
    TEMPO: '<path d="M4 22V15"/><path d="M11 22V11"/><path d="M18 22V7"/><path d="M25 22V13"/>',
    SEUIL: '<path d="M2 21c6 0 8-3 11-9s5-6 13-6"/><path d="M2 14h24" stroke-dasharray="3 3" opacity=".45"/>',
    VMA: '<path d="M3 20l5-11 5 8 5-13 5 16 4-7"/>',
    RECUP: '<path d="M2 15h6l3-4 4 8 3-4h8"/>',
    RENFO: '<rect x="3" y="11" width="5" height="8" rx="1.6"/><rect x="20" y="11" width="5" height="8" rx="1.6"/><path d="M8 15h12"/>',
    COURSE: '<rect x="5" y="5" width="18" height="18" rx="2.5"/><path d="M10 12h8M10 17h5"/>'
  };

  function glyphe(code) {
    var d = GLYPHES[code] || GLYPHES.EF;
    return '<span class="prepa-glyphe" aria-hidden="true">' +
      '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + d + '</svg></span>';
  }

  /** Anneau de progression : la part de séances faites dans la semaine. */
  function anneau(faites, total) {
    var r = 46;
    var circonference = 2 * Math.PI * r;
    var part = total ? faites / total : 0;
    return '<div class="prepa-anneau">' +
      '<svg viewBox="0 0 108 108" aria-hidden="true">' +
        '<circle class="prepa-anneau__fond" cx="54" cy="54" r="' + r + '"/>' +
        '<circle class="prepa-anneau__arc" cx="54" cy="54" r="' + r + '" ' +
          'stroke-dasharray="' + (part * circonference).toFixed(1) + ' ' + circonference.toFixed(1) + '"/>' +
      '</svg>' +
      '<span class="prepa-anneau__texte"><strong>' + faites + '</strong>' +
        '<span>sur ' + total + '</span></span>' +
    '</div>';
  }

  /* ---------- Séances ---------- */

  /**
   * Traduit les zones citées par une séance en allures propres au coureur.
   * On lit les zones dans le texte de la séance, pas seulement sa zone
   * principale : une endurance qui contient des lignes droites en Z5 doit
   * donner les deux repères.
   */
  function allurePourSeance(s) {
    var a = alluresPersonnelles();
    if (!a) return '';

    var citees = {};
    if (s.zone) citees[s.zone] = true;
    (s.zonesSecondaires || []).forEach(function (z) { citees[z] = true; });
    var trouvees = String(s.description || '').match(/Z[1-5]/g) || [];
    trouvees.forEach(function (z) { citees[z] = true; });

    var ordre = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].filter(function (z) { return citees[z]; });
    if (!ordre.length) return '';

    return '<p class="prepa-seance__allure">' +
      '<span class="prepa-seance__allure-titre">Pour toi</span> ' +
      ordre.map(function (z) {
        return '<span class="prepa-allure"><span class="prepa-puce zone-' + z + '">' + z + '</span> ' +
          '<span class="prepa-chiffre">' + allureLisible(z) + '</span></span>';
      }).join('') +
    '</p>';
  }

  function rendreSeance(s, semaine, validation) {
    var faite = !!validation;
    var zone = s.zone || 'Z2';
    return '<article class="prepa-seance zone-' + echapper(zone) + (faite ? ' est-validee' : '') + '" data-seance="' + echapper(s.id) + '">' +
      '<header class="prepa-seance__tete">' +
        glyphe(s.code) +
        '<span class="prepa-puce">' + echapper(s.zone || (s.code === 'RENFO' ? 'RENFO' : 'COURSE')) + '</span>' +
        '<h4>' + echapper(s.titre) + '</h4>' +
        '<span class="prepa-seance__meta">' + echapper(s.duree) + ' min</span>' +
      '</header>' +
      '<p class="prepa-seance__desc">' + echapper(s.description) + '</p>' +
      allurePourSeance(s) +
      '<p class="prepa-seance__objectif">' + echapper(s.objectif) + '</p>' +
      '<div class="prepa-seance__actions">' +
        '<button class="btn ' + (faite ? 'btn--outline-vine' : 'btn--vine') + ' prepa-valider" data-semaine="' + semaine + '" data-seance="' + echapper(s.id) + '">' +
          (faite ? 'Annuler' : 'J\'ai fait cette séance') + '</button>' +
        (faite ? rendreRessenti(semaine, s.id, validation.ressenti) : '') +
      '</div>' +
      (faite ? rendreNote(semaine, s.id, validation.note) : '') +
    '</article>';
  }

  function rendreRessenti(semaine, seanceId, actuel) {
    var choix = [['facile', 'Facile'], ['ok', 'Ok'], ['difficile', 'Difficile']];
    return '<div class="prepa-ressenti">' + choix.map(function (c) {
      return '<button class="prepa-ressenti__btn" data-semaine="' + semaine + '" data-seance="' + echapper(seanceId) + '" data-ressenti="' + c[0] + '" aria-pressed="' + (actuel === c[0]) + '">' + c[1] + '</button>';
    }).join('') + '</div>';
  }

  function rendreNote(semaine, seanceId, note) {
    return '<details class="prepa-note"' + (note ? ' open' : '') + '>' +
      '<summary>Ajouter une note</summary>' +
      '<textarea maxlength="500" rows="2" placeholder="Une douleur, une sensation, un imprévu..." data-semaine="' + semaine + '" data-seance="' + echapper(seanceId) + '">' + echapper(note || '') + '</textarea>' +
      '<button class="btn btn--outline-vine prepa-note__ok" data-semaine="' + semaine + '" data-seance="' + echapper(seanceId) + '">Enregistrer</button>' +
    '</details>';
  }

  /* ---------- Fiches de course et de programme ----------
     Ces descriptions sont pour l'instant tenues côté page. Elles devraient à
     terme vivre avec le programme, côté serveur, pour n'avoir qu'une source.
     Les détails de parcours sont à faire relire par l'encadrant, qui connaît
     les courses. */

  var FICHES = {
    P1: {
      lieu: "Izon, en bord de Dordogne", distance: '10 km',
      profil: "Plat et roulant, sur route. Aucune difficulté de terrain, c'est un parcours à chrono.",
      structure: '9 semaines', pic: 'environ 3 h 30 de course sur la semaine la plus chargée',
      sortieLongue: "jusqu'à 1 h 15",
      resume: "Une préparation courte et dense. Le travail rapide arrive dès la première semaine, puis les 1000 m prennent le relais au plus près de la course."
    },
    P2: {
      lieu: 'Bordeaux', distance: '10 km',
      profil: 'Urbain et plat, sur bitume.',
      structure: '15 semaines', pic: 'environ 3 h 35 de course sur la semaine la plus chargée',
      sortieLongue: "jusqu'à 1 h 15",
      resume: "Quinze semaines pour construire large avant de spécialiser. Le 10 km d'Izon, fin septembre, peut servir de course-test à mi-parcours."
    },
    P3: {
      lieu: 'Bordeaux', distance: '21,1 km',
      profil: 'Urbain et plat, sur bitume.',
      structure: '15 semaines', pic: 'environ 4 h 10 de course sur la semaine la plus chargée',
      sortieLongue: "jusqu'à 1 h 45",
      resume: "L'endurance passe devant la vitesse. Les blocs à l'allure du semi s'allongent jusqu'à deux fois vingt minutes, et la sortie longue monte à 1 h 45."
    },
    P4: {
      lieu: 'Bordeaux ou Nice-Cannes', distance: '42,2 km',
      profil: "Bordeaux est plat et urbain. Nice-Cannes longe la mer, avec quelques bosses dans la seconde moitié.",
      structure: '15 semaines', pic: 'environ 5 h de course sur la semaine la plus chargée',
      sortieLongue: "jusqu'à 2 h 30",
      resume: "Le volume prend le pas sur l'intensité. Le seuil disparaît après la mi-parcours au profit de longs blocs à l'allure de course, jusqu'à trois fois vingt minutes."
    },
    P5: {
      lieu: 'Paris', distance: '10 km',
      profil: 'Urbain, sur bitume.',
      structure: '16 semaines', pic: 'environ 3 h 35 de course sur la semaine la plus chargée',
      sortieLongue: "jusqu'à 1 h 15",
      resume: "Le 10 km d'Izon fait partie du programme, couru à l'objectif fin septembre, suivi d'une semaine de récupération active avant le bloc final."
    },
    P6: {
      lieu: 'Andernos-les-Bains, sur le bassin d\'Arcachon', distance: '16 km',
      profil: 'Plat, en bord de bassin.',
      structure: '9 semaines', pic: 'environ 3 h 45 de course sur la semaine la plus chargée',
      sortieLongue: "jusqu'à 1 h 30",
      resume: "Entre le 10 km et le semi. Les répétitions s'allongent jusqu'au 3000 m, parce que sur seize kilomètres c'est la capacité à tenir l'allure qui décide."
    }
  };

  var TYPES_SEANCE = [
    ['EF', 'Endurance fondamentale', 'Z2', "La base. Tu dois pouvoir tenir une conversation du début à la fin."],
    ['SL', 'Sortie longue', 'Z2', "La séance du dimanche. C'est la durée qui compte, jamais la vitesse."],
    ['TEMPO', 'Tempo', 'Z3', "Effort soutenu mais tenable. L'allure de course sur les longues distances."],
    ['SEUIL', 'Seuil', 'Z4', "Le travail qui fait progresser sur 10 et 16 km. Trois ou quatre mots à la fois."],
    ['VMA', 'Fractionné court', 'Z5', "Répétitions brèves et rapides, pour la foulée et la cylindrée."],
    ['RENFO', 'Renforcement', '', "Gainage et jambes, sans matériel. Facultatif, mais c'est ce qui protège des blessures."]
  ];

  /* ---------- Bandeau de course et zones ---------- */

  // Les zones sont servies par l'API, jamais redéfinies ici : une fourchette
  // corrigée côté serveur doit changer partout d'un coup.
  var zonesCache = null;
  async function chargerZones() {
    if (!zonesCache) {
      var r = await appel('/api/zones');
      zonesCache = r.zones || {};
    }
    return zonesCache;
  }

  function programmeCourant() {
    return PROGRAMMES.filter(function (p) { return p.code === etat.programme; })[0] || {};
  }

  /** Nombre de jours qui séparent aujourd'hui du jour de course. */
  function joursAvant(iso) {
    var jour = 86400000;
    var course = new Date(iso + 'T00:00:00+02:00').getTime();
    var aujourdhui = new Date();
    var minuit = Date.UTC(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
    return Math.round((course - minuit) / jour);
  }

  function bandeauCourse() {
    var p = programmeCourant();
    if (!p.code) return '';
    var j = p.dateISO ? joursAvant(p.dateISO) : null;
    var compte = j === null ? '' : j > 1 ? 'J moins ' + j
      : j === 1 ? "C'est demain" : j === 0 ? "C'est aujourd'hui" : 'Course passée';
    return '<section class="prepa-course">' +
      '<span class="eyebrow">Ton objectif</span>' +
      '<h2 class="prepa-course__nom">' + echapper(p.nom) + '</h2>' +
      '<p class="prepa-course__date">' + echapper(p.date) + ' 2026' +
        (compte ? ' <strong class="prepa-course__compte">' + echapper(compte) + '</strong>' : '') + '</p>' +
    '</section>';
  }

  /* ---------- Allures personnelles ----------
     Le principe du projet reste entier : les séances sont écrites en zones, et
     c'est la sensation qui gouverne. Mais quand un coureur nous donne son temps
     sur 10 km, on peut lui traduire chaque zone dans SES allures à lui. La
     préparation reste la même pour tout le monde, seul le repère change. */

  // Rapports de vitesse par rapport à l'allure sur 10 km, bornes basse et haute.
  // Une valeur inférieure à 1 veut dire plus rapide que l'allure 10 km.
  var RAPPORTS = {
    Z1: [1.33, 1.54],
    Z2: [1.18, 1.33],
    Z3: [1.04, 1.09],
    Z4: [0.98, 1.02],
    Z5: [0.93, 0.95]
  };

  // Distance réelle de chaque course objectif, pour convertir un temps visé en
  // équivalent 10 km.
  var KM = { P1: 10, P2: 10, P3: 21.0975, P4: 42.195, P5: 10, P6: 16 };

  /**
   * Formule de Riegel : un temps sur une distance prédit celui sur une autre.
   * L'exposant 1,06 est la valeur usuelle, elle tient bien du 5 km au marathon.
   */
  function equivalent10km(tempsSec, distanceKm) {
    if (!tempsSec || !distanceKm) return 0;
    return tempsSec * Math.pow(10 / distanceKm, 1.06);
  }

  /** Accepte "48:30", "48", "0:48:30" ou "1:02:15". Renvoie des secondes. */
  function parserTemps(brut) {
    var t = String(brut || '').trim().replace(/\s/g, '').replace(/[hH]/g, ':').replace(/,/g, ':');
    if (!t) return 0;
    var parts = t.split(':').filter(function (x) { return x !== ''; }).map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 1) return parts[0] * 60;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  function formaterAllure(secondesParKm) {
    var s = Math.round(secondesParKm);
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  /**
   * Allure de référence, en secondes par kilomètre, sur 10 km.
   *
   * Trois sources possibles, par ordre de fiabilité décroissante :
   *   la VMA, quand le coureur la connaît, car c'est une mesure ;
   *   un temps déjà réalisé sur 10 km, qui est une performance constatée ;
   *   le temps qu'il vise sur sa course, converti en équivalent 10 km, qui
   *   n'est qu'une intention mais vaut mieux que rien pour qui débute.
   *
   * Le facteur d'ajustement traduit les retours du coureur : s'il trouve tout
   * facile depuis plusieurs semaines, il resserre ; si tout est difficile, il
   * relâche. Il n'est jamais appliqué sans que le coureur l'ait accepté.
   */
  function referenceAllure() {
    var ajust = Number(etat.ajustement) || 1;
    // Une VMA de 15 km/h donne une allure 10 km autour de 90 % de la VMA, ce
    // qui est le rapport observé sur ce niveau de pratique.
    if (etat.vma) {
      var v = Number(etat.vma);
      if (v >= 8 && v <= 25) return { base: (3600 / (v * 0.90)) * ajust, source: 'vma' };
    }
    var t = Number(etat.temps10km) || 0;
    if (t >= 1500 && t <= 6000) return { base: (t / 10) * ajust, source: 'temps10' };
    var o = Number(etat.objectif) || 0;
    if (o) {
      var eq = equivalent10km(o, KM[etat.programme] || 10);
      if (eq >= 1500 && eq <= 6000) return { base: (eq / 10) * ajust, source: 'objectif' };
    }
    return null;
  }

  /** Allures par zone, en secondes par kilomètre, ou null si on ne sait pas. */
  function alluresPersonnelles() {
    var ref = referenceAllure();
    if (!ref) return null;
    var out = {};
    Object.keys(RAPPORTS).forEach(function (z) {
      out[z] = { rapide: ref.base * RAPPORTS[z][0], lent: ref.base * RAPPORTS[z][1] };
    });
    out.__base = ref.base;
    out.__source = ref.source;
    return out;
  }

  /** Allure visée sur la course objectif, si le coureur a donné un temps cible. */
  function allureObjectif() {
    var o = Number(etat.objectif) || 0;
    var km = KM[etat.programme] || 0;
    if (!o || !km) return null;
    return { parKm: o / km, total: o, km: km };
  }

  function formaterDuree(sec) {
    var s = Math.round(sec);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var r = s % 60;
    if (h) return h + ' h ' + (m < 10 ? '0' : '') + m;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  /**
   * Lit les ressentis des dernières semaines et dit s'il faut proposer de
   * revoir les allures. On ne touche jamais aux repères tout seul : on propose.
   */
  function verdictRessentis(validations, semaineCourante) {
    var recents = (validations || []).filter(function (v) {
      return v.ressenti && v.semaine >= semaineCourante - 2 && v.semaine <= semaineCourante;
    });
    // Quatre, c'est une semaine complète de retours : en dessous, le signal
    // serait trop mince pour proposer de toucher aux allures.
    if (recents.length < 4) return null;
    var faciles = recents.filter(function (v) { return v.ressenti === 'facile'; }).length;
    var difficiles = recents.filter(function (v) { return v.ressenti === 'difficile'; }).length;
    if (faciles / recents.length >= 0.7) return { sens: 'resserrer', nb: recents.length };
    if (difficiles / recents.length >= 0.6) return { sens: 'assouplir', nb: recents.length };
    return null;
  }

  function banniereAdaptation(verdict) {
    if (!verdict || !alluresPersonnelles()) return '';
    if (verdict.sens === 'resserrer') {
      return '<div class="prepa-adapt prepa-adapt--vite">' +
        '<p><strong>Tes séances te paraissent faciles.</strong> Sur tes ' + verdict.nb + ' dernières séances notées, la plupart sont passées sans difficulté. Tes allures de référence sont peut-être trop prudentes.</p>' +
        '<button class="btn btn--vine" id="resserrer-allures">Resserrer mes allures de 1 %</button>' +
      '</div>';
    }
    return '<div class="prepa-adapt prepa-adapt--dur">' +
      '<p><strong>Tes séances te paraissent difficiles.</strong> Sur tes ' + verdict.nb + ' dernières séances notées, la plupart t\'ont coûté. Mieux vaut relâcher les allures que forcer et se blesser.</p>' +
      '<button class="btn btn--outline-vine" id="assouplir-allures">Assouplir mes allures de 1 %</button>' +
    '</div>';
  }

  function allureLisible(zone) {
    var a = alluresPersonnelles();
    if (!a || !a[zone]) return '';
    return formaterAllure(a[zone].rapide) + ' à ' + formaterAllure(a[zone].lent) + ' par km';
  }

  /** FC max retenue : celle saisie par le coureur, sinon estimée par l'âge. */
  function fcMaxRetenue() {
    if (etat.fcMax) return Number(etat.fcMax);
    if (etat.age) return Math.round(208 - 0.7 * Number(etat.age));
    return 0;
  }

  function legendeZones(zones) {
    var fcm = fcMaxRetenue();
    var allures = alluresPersonnelles();

    var lignes = Object.keys(zones).map(function (k) {
      var z = zones[k];
      var bpm = fcm
        ? '<td class="prepa-chiffre prepa-zone__bpm">' + Math.round(fcm * z.fcMin / 100) + ' à ' + Math.round(fcm * z.fcMax / 100) + ' bpm</td>'
        : '';
      var allure = allures
        ? '<td class="prepa-chiffre prepa-zone__allure">' + allureLisible(k) + '</td>'
        : '';
      return '<tr>' +
        '<td><span class="prepa-puce zone-' + k + '">' + k + '</span></td>' +
        '<td class="prepa-zone__nom">' + echapper(z.nom) + '</td>' +
        '<td class="prepa-chiffre">' + z.fcMin + ' à ' + z.fcMax + ' %</td>' +
        bpm + allure +
        '<td class="prepa-zone__sensation">' + echapper(z.sensation) + '</td>' +
      '</tr>';
    }).join('');

    var connus = [];
    if (fcm) connus.push('FC max <strong class="prepa-chiffre">' + fcm + ' bpm</strong>');
    if (etat.vma) connus.push('VMA <strong class="prepa-chiffre">' + Number(etat.vma) + ' km/h</strong>');
    if (etat.temps10km) connus.push('10 km en <strong class="prepa-chiffre">' + formaterDuree(Number(etat.temps10km)) + '</strong>');
    if (etat.objectif) connus.push('objectif <strong class="prepa-chiffre">' + formaterDuree(Number(etat.objectif)) + '</strong>');
    var ajust = Number(etat.ajustement) || 1;
    if (Math.abs(ajust - 1) > 0.001) {
      connus.push('ajustées de <strong class="prepa-chiffre">' + (ajust < 1 ? '' : '+') + Math.round((ajust - 1) * 100) + ' %</strong> selon tes ressentis');
    }

    return '<details class="prepa-carte prepa-zones" open>' +
      '<summary><strong>Tes zones, tes fréquences, tes allures</strong></summary>' +
      '<p class="prepa-zones__intro">Les séances sont écrites en zones, jamais en allure imposée : c\'est ce qui permet à tout le groupe de suivre le même programme. Donne-nous tes repères et on traduit chaque zone dans <em>tes</em> chiffres à toi.</p>' +
      '<table class="prepa-table"><tbody>' + lignes + '</tbody></table>' +
      (allures
        ? '<p class="prepa-zones__avert">Ces allures sont calculées depuis ton temps sur 10 km. Ce sont des repères, pas des consignes : le jour où tu es fatigué ou qu\'il fait 30 degrés, c\'est la zone et la sensation qui commandent, pas le chrono.</p>'
        : '') +
      (connus.length
        ? '<p class="prepa-zones__fcm">Calculé sur : ' + connus.join(' · ') + '. <button class="prepa-lien" id="changer-fcm">Modifier mes repères</button></p>'
        : '') +
      (fcm && allures ? '' :
        '<div class="prepa-zones__saisie">' +
          (fcm ? '' :
            '<label class="prepa-champ prepa-champ--court"><span>Ton âge</span><input type="number" id="champ-age-rapide" min="10" max="99" /></label>' +
            '<label class="prepa-champ prepa-champ--court"><span>Ou ta FC max</span><input type="number" id="champ-fcmax-rapide" min="120" max="230" placeholder="si connue" /></label>') +
          (allures ? '' :
            '<label class="prepa-champ prepa-champ--moyen"><span>Ton temps sur 10 km</span><input type="text" id="champ-temps10-rapide" placeholder="52:30" inputmode="numeric" /></label>' +
            '<label class="prepa-champ prepa-champ--court"><span>Ta VMA</span><input type="number" id="champ-vma-rapide" step="0.1" min="8" max="25" placeholder="km/h" /></label>' +
            '<label class="prepa-champ prepa-champ--moyen"><span>Ton objectif</span><input type="text" id="champ-objectif-rapide" placeholder="1:25:00" inputmode="numeric" /></label>') +
          '<button class="btn btn--outline-vine" id="calculer-fcm">Calculer mes repères</button>' +
        '</div>') +
    '</details>';
  }

  /* ---------- Écran 3 : présentation de la prépa ---------- */

  async function voirPresentation() {
    onglet('presentation');
    montrer('ecran-presentation');
    var el = $('ecran-presentation');
    el.innerHTML = '<div class="prepa-carte"><p>Chargement...</p></div>';

    var p = programmeCourant();
    var f = FICHES[p.code] || {};
    var zones = await chargerZones();

    el.innerHTML =
      bandeauCourse() +

      '<div class="prepa-duo">' +
        '<div class="prepa-carte">' +
          '<span class="eyebrow">La course</span>' +
          '<h3>' + echapper(f.distance || '') + ' à ' + echapper(f.lieu || '') + '</h3>' +
          '<p>' + echapper(f.profil || '') + '</p>' +
        '</div>' +
        '<div class="prepa-carte">' +
          '<span class="eyebrow">Ta préparation</span>' +
          '<h3>' + echapper(f.structure || '') + '</h3>' +
          '<p>' + echapper(f.resume || '') + '</p>' +
        '</div>' +
      '</div>' +

      (function () {
        var o = allureObjectif();
        if (!o) return '';
        return '<div class="prepa-carte prepa-objectif">' +
          '<span class="eyebrow">Ton objectif de temps</span>' +
          '<h3>' + echapper(formaterDuree(o.total)) + ' sur ' + echapper(String(o.km).replace('.', ',')) + ' km</h3>' +
          '<p>Soit une allure de course de <strong class="prepa-chiffre">' + formaterAllure(o.parKm) + ' par kilomètre</strong>, à tenir du départ à l\'arrivée. C\'est ce rythme que les séances en Z3 et Z4 préparent.</p>' +
        '</div>';
      })() +

      '<div class="prepa-carte">' +
        '<span class="eyebrow">Comment ça marche</span>' +
        '<h3>Trois séances de course par semaine, plus une de renforcement</h3>' +
        '<ul class="prepa-points">' +
          '<li><strong>Des blocs de 3 semaines qui montent, puis une semaine plus douce</strong>, et on recommence. C\'est cette respiration qui fait progresser sans casser.</li>' +
          '<li><strong>Une nouvelle semaine paraît chaque dimanche à 19 h.</strong> Tu ne vois pas les suivantes avant, c\'est voulu : on suit la semaine en cours, pas le programme entier.</li>' +
          '<li><strong>' + echapper(f.pic || '') + '</strong>, sortie longue ' + echapper(f.sortieLongue || '') + '.</li>' +
          '<li><strong>Les deux dernières semaines sont un affûtage</strong> : le volume descend fortement, l\'intensité reste. C\'est ce qui te fait arriver frais.</li>' +
          '<li><strong>Tu coches chaque séance faite</strong> et tu dis si c\'était facile, ok ou difficile. C\'est ce qui permet d\'alléger ta semaine suivante si tu forces trop.</li>' +
        '</ul>' +
      '</div>' +

      '<div class="prepa-carte">' +
        '<span class="eyebrow">Les types de séance</span>' +
        '<h3>Ce que tu vas trouver dans ta semaine</h3>' +
        '<table class="prepa-table"><tbody>' +
        TYPES_SEANCE.map(function (t) {
          return '<tr>' +
            '<td>' + (t[2] ? '<span class="prepa-puce zone-' + t[2] + '">' + t[2] + '</span>' : '<span class="prepa-puce prepa-puce--neutre">·</span>') + '</td>' +
            '<td class="prepa-zone__nom">' + echapper(t[1]) + '</td>' +
            '<td class="prepa-zone__sensation">' + echapper(t[3]) + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table>' +
      '</div>' +

      legendeZones(zones) +

      '<div class="prepa-depart">' +
        '<button class="btn btn--shoot prepa-depart__btn" id="on-y-va">On y va !' +
          '<svg class="btn__arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
        '</button>' +
        '<p class="prepa-depart__note">Tu peux revenir sur cette page à tout moment par l\'onglet « Ma prépa ».</p>' +
      '</div>';
  }

  /* ---------- Écran 4 : ma semaine ---------- */

  async function voirSemaine() {
    onglet('semaine');
    montrer('ecran-semaine');
    var el = $('ecran-semaine');
    el.innerHTML = '<div class="prepa-carte"><p>Chargement...</p></div>';

    var base = '/api/semaine?programme=' + encodeURIComponent(etat.programme) + '&izon=' + (etat.faitIzon ? 1 : 0);
    var r = await appel(base);
    var apercu = false;

    // Avant la première parution, l'encadrant voit quand même la semaine 1 :
    // c'est exactement ce dont il a besoin le samedi pour relire avant que
    // ça ne parte. Un coureur, lui, ne voit rien, et c'est voulu.
    if (r.__statut === 404 && etat.role === 'admin') {
      r = await appel(base + '&numero=1');
      apercu = true;
    }

    if (r.__statut === 404) {
      el.innerHTML = '<div class="prepa-carte"><h2>La préparation n\'a pas encore commencé</h2>' +
        '<p>La première semaine paraît le dimanche 26 juillet à 19 h. Rendez-vous ici à ce moment-là.</p></div>';
      return;
    }
    if (r.__statut === 403) {
      el.innerHTML = '<div class="prepa-carte"><h2>Pas encore disponible</h2><p>' + echapper(quandDisponible(r.disponibleLe)) + '.</p></div>';
      return;
    }
    if (!r.semaine) { el.innerHTML = '<div class="prepa-carte"><p>' + echapper(r.erreur || 'Rien à afficher.') + '</p></div>'; return; }

    var s = r.semaine;

    // Les coches vivent à part : la semaine décrit le programme, la lecture des
    // validations dit ce que ce coureur en a fait.
    var suivi = await appel('/api/validation?coureur=' + encodeURIComponent(etat.coureurId || '') +
      '&prenom=' + encodeURIComponent(etat.prenom || '') +
      '&initiale=' + encodeURIComponent(etat.initiale || ''));
    var validations = {};
    (suivi.validations || []).forEach(function (v) {
      if (v.semaine === s.numero) validations[v.seanceId] = v;
    });

    var faites = s.seances.filter(function (x) { return x.code !== 'RENFO' && validations[x.id]; }).length;
    var total = s.seances.filter(function (x) { return x.code !== 'RENFO'; }).length;
    var zones = await chargerZones();

    var verdict = verdictRessentis(suivi.validations, s.numero);

    el.innerHTML =
      bandeauCourse() +
      banniereAdaptation(verdict) +
      (apercu ? '<div class="prepa-message">Aperçu encadrant. Cette semaine n\'est pas encore visible par les coureurs, elle paraîtra ' + echapper(quandDisponible(s.disponibleLe || new Date().toISOString())).replace('Disponible ', '') + '.</div>' : '') +
      '<div class="prepa-entete phase-' + echapper(s.phase) + '">' +
        '<div>' +
          '<span class="eyebrow">Semaine ' + s.numero + ' · ' + echapper(PHASES[s.phase] || s.phase) + '</span>' +
          '<h2>' + echapper(s.titre) + '</h2>' +
          '<p class="prepa-intention">' + echapper(s.intention) + '</p>' +
        '</div>' +
        anneau(faites, total) +
      '</div>' +
      s.seances.map(function (x) { return rendreSeance(x, s.numero, validations[x.id]); }).join('') +
      legendeZones(zones);
  }

  /* ---------- Actions de validation ---------- */

  document.addEventListener('click', async function (ev) {
    var b = ev.target.closest ? ev.target.closest('button') : null;
    if (!b) return;

    if (b.classList.contains('prepa-valider')) {
      var deja = b.textContent.indexOf('Annuler') !== -1;
      await appel('/api/validation', {
        method: deja ? 'DELETE' : 'POST',
        body: {
          coureur: etat.coureurId, prenom: etat.prenom, initiale: etat.initiale,
          semaine: Number(b.dataset.semaine), seanceId: b.dataset.seance
        }
      });
      voirSemaine();
    }

    if (b.classList.contains('prepa-ressenti__btn')) {
      await appel('/api/validation', {
        method: 'POST',
        body: {
          coureur: etat.coureurId, prenom: etat.prenom, initiale: etat.initiale,
          semaine: Number(b.dataset.semaine), seanceId: b.dataset.seance,
          ressenti: b.dataset.ressenti
        }
      });
      voirSemaine();
    }

    if (b.id === 'on-y-va') { voirSemaine(); window.scrollTo(0, 0); return; }

    if (b.id === 'calculer-fcm') {
      var age = Number(($('champ-age-rapide') || {}).value);
      var fcm = Number(($('champ-fcmax-rapide') || {}).value);
      var t10 = parserTemps(($('champ-temps10-rapide') || {}).value);
      var vma = Number(($('champ-vma-rapide') || {}).value);
      var obj = parserTemps(($('champ-objectif-rapide') || {}).value);
      if (!age && !fcm && !t10 && !vma && !obj) {
        dire('Saisis au moins un repère.', 'erreur');
        return;
      }
      if (t10 && (t10 < 1500 || t10 > 6000)) {
        dire('Ce temps sur 10 km paraît hors du plausible. Saisis-le sous la forme 52:30.', 'erreur');
        return;
      }
      if (vma && (vma < 8 || vma > 25)) { dire('Une VMA se situe entre 8 et 25 km/h.', 'erreur'); return; }
      if (age) etat.age = age;
      if (fcm) etat.fcMax = fcm;
      if (t10) etat.temps10km = t10;
      if (vma) etat.vma = vma;
      if (obj) etat.objectif = obj;
      sauver();
      dire('');
      rafraichir();
      return;
    }

    if (b.id === 'changer-fcm') {
      etat.age = null;
      etat.fcMax = null;
      etat.temps10km = null;
      etat.vma = null;
      etat.objectif = null;
      etat.ajustement = 1;
      sauver();
      rafraichir();
      return;
    }

    if (b.id === 'resserrer-allures' || b.id === 'assouplir-allures') {
      var f = b.id === 'resserrer-allures' ? 0.99 : 1.01;
      // Borné à plus ou moins 10 % : au-delà, ce n'est plus un ajustement, c'est
      // que le repère de départ était faux et il faut le ressaisir.
      var nouveau = Math.min(1.1, Math.max(0.9, (Number(etat.ajustement) || 1) * f));
      etat.ajustement = nouveau;
      sauver();
      dire(b.id === 'resserrer-allures'
        ? 'Allures resserrées. Si les séances restent faciles la semaine prochaine, tu pourras recommencer.'
        : 'Allures assouplies. Mieux vaut courir un peu trop lentement que se blesser.', 'ok');
      rafraichir();
      return;
    }

    if (b.classList.contains('prepa-note__ok')) {
      var zone = b.parentNode.querySelector('textarea');
      await appel('/api/validation', {
        method: 'POST',
        body: {
          coureur: etat.coureurId, prenom: etat.prenom, initiale: etat.initiale,
          semaine: Number(b.dataset.semaine), seanceId: b.dataset.seance,
          note: zone.value
        }
      });
      dire('Note enregistrée.', 'ok');
      setTimeout(function () { dire(''); }, 2500);
    }
  });

  /* ---------- Écran 4 : mon programme ---------- */

  async function voirProgramme() {
    onglet('programme');
    montrer('ecran-programme');
    var el = $('ecran-programme');
    el.innerHTML = '<div class="prepa-carte"><p>Chargement...</p></div>';

    var r = await appel('/api/programme?programme=' + encodeURIComponent(etat.programme) + '&izon=' + (etat.faitIzon ? 1 : 0));
    if (!r.semaines) { el.innerHTML = '<div class="prepa-carte"><p>' + echapper(r.erreur || 'Rien à afficher.') + '</p></div>'; return; }

    var total = r.semaines.length;
    var faites = r.semaineCourante || 0;

    el.innerHTML =
      bandeauCourse() +
      '<div class="prepa-carte">' +
        '<span class="eyebrow">' + echapper(r.programme.nom) + '</span>' +
        '<h2>' + total + ' semaines</h2>' +
        '<div class="prepa-jauge"><span style="width:' + Math.round(faites / total * 100) + '%"></span></div>' +
        '<p class="prepa-seance__meta">Semaine ' + faites + ' sur ' + total + '</p>' +
      '</div>' +
      r.semaines.map(function (s) {
        // On se fie à la présence du contenu, pas au statut de parution :
        // l'encadrant reçoit les semaines à venir en clair et doit pouvoir les
        // relire, un coureur ne reçoit rien et n'a donc rien à flouter.
        if (!s.seances) {
          return '<article class="prepa-carte prepa-carte--verrou">' +
            '<div class="prepa-verrou"><h3>Semaine ' + s.numero + '</h3><p>Contenu masqué jusqu\'à sa parution.</p></div>' +
            '<p class="prepa-verrou-libelle">' + echapper(quandDisponible(s.disponibleLe)) + '</p></article>';
        }
        return '<article class="prepa-carte">' +
          '<span class="eyebrow">Semaine ' + s.numero + ' · ' + echapper(PHASES[s.phase] || s.phase) +
            (s.publiee ? '' : ' · <span class="prepa-apercu">pas encore parue</span>') + '</span>' +
          '<h3>' + echapper(s.titre) + '</h3>' +
          '<p class="prepa-intention">' + echapper(s.intention) + '</p>' +
          '<ul class="prepa-liste">' + s.seances.map(function (x) {
            return '<li><span class="prepa-puce zone-' + echapper(x.zone || 'Z2') + '">' + echapper(x.zone || '·') + '</span> ' +
              echapper(x.titre) + ' <span class="prepa-seance__meta">' + echapper(x.duree) + ' min</span></li>';
          }).join('') + '</ul></article>';
      }).join('');
  }

  /* ---------- Écran 5 : les zones ---------- */

  async function voirZones() {
    onglet('zones');
    montrer('ecran-zones');
    var el = $('ecran-zones');
    var r = await appel('/api/zones');
    var zones = r.zones || {};

    el.innerHTML =
      '<div class="prepa-carte">' +
        '<h2>Comprendre les zones</h2>' +
        '<p>Toutes les séances sont écrites en zones, jamais en allure. C\'est ce qui permet à tout le monde de suivre le même programme : chacun court à son rythme, dans la bonne zone.</p>' +
        '<table class="prepa-table"><thead><tr><th>Zone</th><th>Nom</th><th>% FC max</th><th>Sensation</th></tr></thead><tbody>' +
        Object.keys(zones).map(function (k) {
          var z = zones[k];
          return '<tr><td><span class="prepa-puce zone-' + k + '">' + k + '</span></td>' +
            '<td>' + echapper(z.nom) + '</td>' +
            '<td class="prepa-chiffre">' + z.fcMin + ' à ' + z.fcMax + ' %</td>' +
            '<td>' + echapper(z.sensation) + '</td></tr>';
        }).join('') + '</tbody></table>' +
      '</div>' +
      '<div class="prepa-carte">' +
        '<h3>Tes fourchettes personnelles</h3>' +
        '<p>Saisis ton âge, ou ta fréquence cardiaque maximale si tu la connais (elle prime).</p>' +
        '<div class="prepa-ligne">' +
          '<label class="prepa-champ prepa-champ--court"><span>Âge</span><input type="number" id="champ-age" min="10" max="99" /></label>' +
          '<label class="prepa-champ prepa-champ--court"><span>FC max</span><input type="number" id="champ-fcmax" min="120" max="230" placeholder="si connue" /></label>' +
        '</div>' +
        '<div id="resultat-fc"></div>' +
      '</div>';

    function calculer() {
      var age = Number($('champ-age').value);
      var fcm = Number($('champ-fcmax').value) || (age ? Math.round(208 - 0.7 * age) : 0);
      if (!fcm) { $('resultat-fc').innerHTML = ''; return; }
      $('resultat-fc').innerHTML =
        '<p class="prepa-seance__meta">FC max retenue : <strong class="prepa-chiffre">' + fcm + ' bpm</strong></p>' +
        '<table class="prepa-table"><tbody>' + Object.keys(zones).map(function (k) {
          var z = zones[k];
          return '<tr><td><span class="prepa-puce zone-' + k + '">' + k + '</span></td><td>' + echapper(z.nom) + '</td>' +
            '<td class="prepa-chiffre">' + Math.round(fcm * z.fcMin / 100) + ' à ' + Math.round(fcm * z.fcMax / 100) + ' bpm</td></tr>';
        }).join('') + '</tbody></table>';
    }
    $('champ-age').addEventListener('input', calculer);
    $('champ-fcmax').addEventListener('input', calculer);
  }

  /* ---------- Écran 6 : encadrant ---------- */

  async function voirAdmin() {
    onglet('admin');
    montrer('ecran-admin');
    var el = $('ecran-admin');
    el.innerHTML = '<div class="prepa-carte"><p>Chargement...</p></div>';

    var alertes = await appel('/api/admin/alertes');
    var tableau = await appel('/api/admin/tableau');
    var coureurs = tableau.coureurs || [];

    el.innerHTML =
      '<div class="prepa-carte">' +
        '<span class="eyebrow">Encadrant</span><h2>À surveiller</h2>' +
        ((alertes.alertes || []).length === 0
          ? '<p>Aucun coureur à surveiller cette semaine.</p>'
          : '<ul class="prepa-liste">' + alertes.alertes.map(function (a) {
              return '<li class="prepa-alerte prepa-alerte--' + echapper(a.type) + '"><strong>' + echapper(a.prenom || a.nom) + '</strong> ' + echapper(a.detail) + '</li>';
            }).join('') + '</ul>') +
      '</div>' +
      '<div class="prepa-carte">' +
        '<h2>Assiduité</h2>' +
        (coureurs.length === 0 ? '<p>Personne n\'est encore inscrit.</p>' :
        '<table class="prepa-table"><thead><tr><th>Coureur</th><th>Programme</th><th>Izon</th><th>Séances validées</th></tr></thead><tbody>' +
        coureurs.map(function (c) {
          return '<tr><td>' + echapper(c.nom || c.prenom) + '</td>' +
            '<td>' + echapper(c.programme) + '</td>' +
            '<td>' + (c.fait_izon ? 'oui' : '') + '</td>' +
            '<td class="prepa-chiffre">' + ((c.validations || []).length) + '</td></tr>';
        }).join('') + '</tbody></table>') +
      '</div>';
  }

  /* ---------- Onglets ---------- */

  /** Redessine l'écran actuellement affiché, sans changer de vue. */
  function rafraichir() {
    if (!$('ecran-presentation').hidden) return voirPresentation();
    if (!$('ecran-programme').hidden) return voirProgramme();
    if (!$('ecran-zones').hidden) return voirZones();
    return voirSemaine();
  }

  function onglet(nom) {
    Array.prototype.forEach.call(document.querySelectorAll('.prepa-onglet'), function (b) {
      b.classList.toggle('is-active', b.dataset.vue === nom);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.prepa-onglet'), function (b) {
    b.addEventListener('click', function () {
      dire('');
      if (b.dataset.vue === 'presentation') voirPresentation();
      if (b.dataset.vue === 'semaine') voirSemaine();
      if (b.dataset.vue === 'programme') voirProgramme();
      if (b.dataset.vue === 'zones') voirZones();
      if (b.dataset.vue === 'admin') voirAdmin();
    });
  });

  /* ---------- Démarrage ---------- */

  function demarrer() {
    if (!etat.role) { montrer('ecran-code'); return; }
    // L'encadrant passe par le même écran : il court lui aussi, et le choix
    // d'un programme lui permet de relire n'importe quelle semaine en aperçu.
    if (!etat.prenom || !etat.programme) { rendreChoixProgrammes(); montrer('ecran-profil'); return; }
    voirSemaine();
  }

  rendreChoixProgrammes();
  demarrer();
})();
