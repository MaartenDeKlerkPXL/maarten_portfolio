/* ============================================================
   page-transition.js — Smooth fade between internal pages.
   On load: fades in from the curtain (removes body.is-loading).
   On internal link click: fades the curtain in, then navigates.
   Skips external links, new tabs, hashes, downloads, mail/tel,
   and modifier-clicks. Respects prefers-reduced-motion.
   Exposes: window.initPageTransition()
   ============================================================ */
(function () {
  "use strict";

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  window.initPageTransition = function () {
    // Same-session navigations get a quick 0.4s fade instead of the
    // full cinematic intro (the intro engine in main.js bails out
    // when mk_visited is already set).
    try {
      if (sessionStorage.getItem("mk_visited")) {
        var introEl = document.getElementById("mk-intro");
        if (introEl) {
          introEl.style.transition = "opacity 0.4s ease";
          introEl.style.opacity = "0";
          window.setTimeout(function () {
            if (introEl.parentNode) introEl.parentNode.removeChild(introEl);
            document.body.classList.add("intro-done");
            document.dispatchEvent(new CustomEvent("mk:intro-done"));
          }, 420);
        }
      } else {
        sessionStorage.setItem("mk_visited", "1");
      }
    } catch (e) {}

    var curtain = document.querySelector(".page-curtain");
    if (!curtain) {
      curtain = document.createElement("div");
      curtain.className = "page-curtain";
      document.body.appendChild(curtain);
    }

    // Reveal on load.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.body.classList.remove("is-loading");
      });
    });

    // Restore visibility if returning via the back/forward cache.
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) {
        curtain.classList.remove("is-active");
        document.body.classList.remove("is-loading");
      }
    });

    if (reducedMotion()) return; // Let the browser navigate normally.

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

      // Resolve and compare origin — only intercept same-origin docs.
      var url;
      try { url = new URL(href, window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return; // in-page anchor

      e.preventDefault();
      curtain.classList.add("is-active");
      window.setTimeout(function () {
        window.location.href = url.href;
      }, 320);
    });
  };
})();
