/* =========================================================
   Les Coureurs des Vignes — Interactions
   Zéro dépendance. Respecte prefers-reduced-motion.
   ========================================================= */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- Menu mobile --- */
  var toggle = document.querySelector(".menu-toggle");
  var menu = document.querySelector(".nav__list");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* --- En-tête : état « défilé » + barre de progression --- */
  var header = document.querySelector(".site-header");
  var progress = document.querySelector(".scroll-progress");
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle("is-scrolled", y > 24);
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* --- Révélation au scroll + compteurs --- */
  var revealEls = document.querySelectorAll(".reveal");
  var counters = document.querySelectorAll("[data-count]");

  function runCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var decimals = (el.getAttribute("data-count").split(".")[1] || "").length;
    if (reduced) { el.textContent = target.toLocaleString("fr-FR") + suffix; return; }
    var start = null, dur = 1400;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      el.textContent = val.toLocaleString("fr-FR", {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals
      }) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString("fr-FR", {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals
      }) + suffix;
    }
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-visible");
        if (e.target.hasAttribute("data-count")) runCounter(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
    counters.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    counters.forEach(runCounter);
  }

  /* --- Tracé du parcours : longueur exacte pour l'animation --- */
  document.querySelectorAll(".trace-draw").forEach(function (path) {
    try {
      var len = path.getTotalLength();
      path.style.setProperty("--len", Math.ceil(len));
    } catch (e) {}
  });

  /* --- Formulaires (contact & adhésion) ---
     Envoi direct via Formspree si le formulaire a un action="https://formspree.io/f/VOTRE_ID"
     configuré. Tant que l'identifiant n'est pas renseigné (ou en cas d'échec réseau),
     repli automatique sur « mailto » : le logiciel de messagerie s'ouvre. Voir README § 3. */
  document.querySelectorAll("form[data-mailto]").forEach(function (form) {
    var dest = form.getAttribute("data-mailto") || "coureursdesvignes@gmail.com";
    var action = form.getAttribute("action") || "";
    var alertBox = form.parentNode.querySelector(".alert");
    var successMsg = alertBox ? alertBox.textContent.trim() : "Merci ! Votre demande a bien été envoyée.";
    var submitBtn = form.querySelector("button[type='submit'], button:not([type])");
    var btnHTML = submitBtn ? submitBtn.innerHTML : "";
    var formspreeReady = action.indexOf("formspree") !== -1 && action.indexOf("VOTRE_ID") === -1;

    function showAlert(msg, isError) {
      if (!alertBox) return;
      alertBox.textContent = msg;
      alertBox.classList.toggle("alert--error", !!isError);
      alertBox.classList.remove("hidden");
    }

    function sendByMail() {
      var d = new FormData(form);
      var g = function (k) { return (d.get(k) || "").toString().trim(); };
      var body =
        "Nom : " + g("nom") + "\n" +
        "E-mail : " + g("email") + "\n" +
        (g("telephone") ? "Téléphone : " + g("telephone") + "\n" : "") +
        (g("sujet") ? "Sujet : " + g("sujet") + "\n" : "") +
        "\n" + g("message") + "\n";
      window.location.href =
        "mailto:" + dest +
        "?subject=" + encodeURIComponent("[Site] " + (g("sujet") || "Message")) +
        "&body=" + encodeURIComponent(body);
      showAlert("Votre logiciel de messagerie va s'ouvrir pour finaliser l'envoi. Merci !", false);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.checkValidity && !form.checkValidity()) { form.reportValidity(); return; }

      // Formspree non configuré → repli mailto (le site reste fonctionnel).
      if (!formspreeReady) { sendByMail(); return; }

      // Envoi via Formspree, sans quitter la page.
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Envoi en cours…"; }
      fetch(action, {
        method: "POST",
        body: new FormData(form),
        headers: { "Accept": "application/json" }
      })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          form.reset();
          showAlert(successMsg, false);
        })
        .catch(function () {
          showAlert(
            "L'envoi automatique n'a pas fonctionné. Merci de réessayer, ou écrivez-nous directement à " + dest + ".",
            true
          );
        })
        .then(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = btnHTML; }
        });
    });
  });

  /* --- Année automatique --- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
