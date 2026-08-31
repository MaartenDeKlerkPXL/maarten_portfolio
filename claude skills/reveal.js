/* ============================================================
   reveal.js — IntersectionObserver scroll reveals for elements
   with [data-reveal]. Adds .is-revealed once when in view.
   Supports a stagger via data-delay="200" (ms). Variants are
   styled in animations.css: fade-up / fade-left / fade-right /
   scale-in / fade-down / blur-in.
   Exposes: window.initReveal()
   ============================================================ */
(function () {
  "use strict";

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  window.initReveal = function () {
    var els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;

    if (reducedMotion() || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-revealed"); });
      return;
    }

    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var delay = parseInt(el.getAttribute("data-delay"), 10) || 0;
          if (delay) el.style.transitionDelay = delay + "ms";
          el.classList.add("is-revealed");
          // Clear the delay afterward so hover transitions stay snappy.
          window.setTimeout(function () { el.style.transitionDelay = ""; }, delay + 850);
          obs.unobserve(el);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );

    els.forEach(function (el) { io.observe(el); });
  };
})();
