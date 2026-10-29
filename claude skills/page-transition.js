/* ============================================================
   page-transition.js — Slash-loader tussen pagina's.

   De loader (#mk-loader) staat als markup bovenaan <body> en zijn
   kritieke CSS inline in <head>. Een klein inline script zet
   html.mk-loading als dit een vervolgbezoek in de sessie is
   (sessionStorage mk_visited), zodat de loader al bij de eerste
   paint dicht staat, nog voordat er JS geladen is.

   Inkomend:  wacht op window load + document.fonts.ready (minimaal
              350 ms zichtbaar, maximaal 4 s), veeg dan naar rechts
              weg en dispatch mk:intro-done.
   Uitgaand:  klik op een interne link → balk veegt in ~0,45 s van
              links naar rechts dicht, logo verschijnt, dan navigeren.
   bfcache:   bij terug/vooruit (pageshow persisted) direct verbergen.
   Eerste bezoek: de intro-video (main.js) doet de reveal; dan zet
   dit script alleen mk_visited.
   Reduced motion: geen sweep; de CSS maakt er een korte fade van en
   uitgaande klikken navigeren gewoon.
   Exposes: window.initPageTransition()
   ============================================================ */
(function () {
  "use strict";

  var MIN_VISIBLE = 350;   // ms dat de loader minimaal te zien is
  var MAX_WAIT = 4000;     // ms: daarna altijd onthullen
  var COVER_MS = 450;      // uitgaand dichtvegen
  var LOGO_MS = 240;       // logo volledig laten verschijnen voor navigeren
  var REVEAL_MS = 600;     // inkomend wegvegen (gelijk aan de CSS)

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // Loader terug naar de onzichtbare beginstand, zonder animatie
  function resetLoader(loader) {
    var html = document.documentElement;
    loader.classList.add("no-anim");
    loader.classList.remove("is-covering", "is-covered", "is-revealing");
    html.classList.remove("mk-loading");
    void loader.offsetWidth; // reflow: beginstand eerst toepassen
    loader.classList.remove("no-anim");
  }

  function revealPage(loader) {
    var html = document.documentElement;
    if (!html.classList.contains("mk-loading")) return;

    // Het intro-element is bij een vervolgbezoek overbodig
    var introEl = document.getElementById("mk-intro");
    if (introEl && introEl.parentNode) introEl.parentNode.removeChild(introEl);

    loader.classList.add("is-revealing");
    window.setTimeout(function () {
      resetLoader(loader);
      document.body.classList.add("intro-done");
      document.dispatchEvent(new CustomEvent("mk:intro-done"));
    }, reducedMotion() ? 260 : REVEAL_MS + 20);
  }

  function whenPageReady(cb) {
    var loaded = new Promise(function (resolve) {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", resolve, { once: true });
    });
    var fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.all([loaded, fonts]).then(cb, cb);
  }

  window.initPageTransition = function () {
    var html = document.documentElement;
    var loader = document.getElementById("mk-loader");

    // Eerste bezoek: markeren; de intro-video regelt de reveal.
    try {
      if (!sessionStorage.getItem("mk_visited")) sessionStorage.setItem("mk_visited", "1");
    } catch (e) {}

    if (!loader) return;

    // ---------- Inkomend: loader staat al dicht (html.mk-loading) ----------
    if (html.classList.contains("mk-loading")) {
      var shownAt = typeof window.__mkLoaderAt === "number" ? window.__mkLoaderAt : 0;
      var done = false;
      var go = function () {
        if (done) return;
        done = true;
        revealPage(loader);
      };
      whenPageReady(function () {
        var wait = Math.max(0, MIN_VISIBLE - (performance.now() - shownAt));
        window.setTimeout(go, wait);
      });
      window.setTimeout(go, Math.max(0, MAX_WAIT - (performance.now() - shownAt)));
    }

    // ---------- Terug/vooruit via bfcache: direct verbergen ----------
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) {
        resetLoader(loader);
        document.body.classList.add("intro-done");
      }
    });

    if (reducedMotion()) return; // gewoon navigeren, geen sweep

    // ---------- Uitgaand: interne link → dichtvegen, dan navigeren ----------
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var a = e.target.closest && e.target.closest("a");
      if (!a) return;

      var href = a.getAttribute("href");
      if (!href) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;
      if (a.dataset.noTransition !== undefined) return;
      if (/^(mailto:|tel:|#|javascript:)/i.test(href)) return;

      // Alleen documenten op dezelfde origin onderscheppen
      var url;
      try { url = new URL(href, window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return; // anker op dezelfde pagina

      e.preventDefault();
      resetLoader(loader);
      loader.classList.add("is-covering");
      window.setTimeout(function () {
        loader.classList.add("is-covered");
        window.setTimeout(function () {
          window.location.href = url.href;
        }, LOGO_MS);
      }, COVER_MS);
    });
  };
})();
