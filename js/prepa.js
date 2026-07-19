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
  var ECRANS = ['ecran-code', 'ecran-profil', 'ecran-semaine', 'ecran-programme', 'ecran-zones', 'ecran-admin'];

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
    { code: 'P1', nom: "10 km d'Izon", date: 'dimanche 27 septembre', duree: '9 semaines',
      prerequis: "Courir déjà environ 1 h 15 le dimanche sur terrain vallonné et viser moins d'une heure au 10 km.", izon: false },
    { code: 'P2', nom: '10 km de Bordeaux', date: 'dimanche 8 novembre', duree: '15 semaines',
      prerequis: "Savoir courir 30 minutes d'affilée sans s'arrêter.", izon: true },
    { code: 'P3', nom: 'Semi-marathon de Bordeaux', date: 'dimanche 8 novembre', duree: '15 semaines',
      prerequis: 'Courir déjà environ 20 km par semaine depuis 2 mois.', izon: true },
    { code: 'P4', nom: 'Marathon', date: 'dimanche 8 novembre', duree: '15 semaines',
      prerequis: 'Courir déjà environ 30 km par semaine depuis 2 mois.', izon: true, variante: true },
    { code: 'P5', nom: '10 km HOKA de Paris', date: 'dimanche 15 novembre', duree: '16 semaines',
      prerequis: "Savoir courir 30 minutes d'affilée sans s'arrêter. Le 10 km d'Izon fait partie du programme.", izon: false },
    // P6 se court le même jour que le 10 km d'Izon : aucune course-test ne peut
    // s'y ajouter, d'où izon: false et l'absence de variante de course.
    { code: 'P6', nom: "16 km d'Andernos", date: 'dimanche 27 septembre', duree: '9 semaines',
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
    sauver();
    voirSemaine();
  });

  /* ---------- Séances ---------- */

  function rendreSeance(s, semaine, validation) {
    var faite = !!validation;
    var zone = s.zone || 'Z2';
    return '<article class="prepa-seance zone-' + echapper(zone) + (faite ? ' est-validee' : '') + '" data-seance="' + echapper(s.id) + '">' +
      '<header class="prepa-seance__tete">' +
        '<span class="prepa-puce">' + echapper(s.zone || (s.code === 'RENFO' ? 'RENFO' : 'COURSE')) + '</span>' +
        '<h4>' + echapper(s.titre) + '</h4>' +
        '<span class="prepa-seance__meta">' + echapper(s.duree) + ' min</span>' +
      '</header>' +
      '<p class="prepa-seance__desc">' + echapper(s.description) + '</p>' +
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

  /* ---------- Écran 3 : ma semaine ---------- */

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

    el.innerHTML =
      (apercu ? '<div class="prepa-message">Aperçu encadrant. Cette semaine n\'est pas encore visible par les coureurs, elle paraîtra ' + echapper(quandDisponible(s.disponibleLe || new Date().toISOString())).replace('Disponible ', '') + '.</div>' : '') +
      '<div class="prepa-entete">' +
        '<div>' +
          '<span class="eyebrow">Semaine ' + s.numero + ' · ' + echapper(PHASES[s.phase] || s.phase) + '</span>' +
          '<h2>' + echapper(s.titre) + '</h2>' +
          '<p class="prepa-intention">' + echapper(s.intention) + '</p>' +
        '</div>' +
        '<div class="prepa-compteur"><strong>' + faites + '</strong><span>sur ' + total + ' séances</span></div>' +
      '</div>' +
      s.seances.map(function (x) { return rendreSeance(x, s.numero, validations[x.id]); }).join('');
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

  function onglet(nom) {
    Array.prototype.forEach.call(document.querySelectorAll('.prepa-onglet'), function (b) {
      b.classList.toggle('is-active', b.dataset.vue === nom);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.prepa-onglet'), function (b) {
    b.addEventListener('click', function () {
      dire('');
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
