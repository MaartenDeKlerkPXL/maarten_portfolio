/* ============================================================
   counter.js — Animated number counters. On elements with
   [data-counter="true"] and data-target="N", counts from 0 to N
   when scrolled into view, using ease-out-cubic. Optional
   data-suffix (e.g. "+") and data-duration (ms, default 1800).
   Exposes: window.initCounter()
   ============================================================ */
(function () {
  "use strict";

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animate(el) {
    var target = parseFloat(el.getAttribute("data-target")) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    var prefix = el.getAttribute("data-prefix") || "";
    var duration = parseInt(el.getAttribute("data-duration"), 10) || 1800;
    var decimals = (String(target).split(".")[1] || "").length;

    if (reducedMotion()) {
      el.textContent = prefix + target.toFixed(decimals) + suffix;
      return;
    }

    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / duration, 1);
      var val = target * easeOutCubic(p);
      el.textContent = prefix + val.toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = prefix + target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(frame);
  }

  window.initCounter = function () {
    var els = document.querySelectorAll('[data-counter="true"]');
    if (!els.length) return;

    if (!("IntersectionObserver" in window)) {
      els.forEach(animate);
      return;
    }

    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animate(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );
    els.forEach(function (el) { io.observe(el); });
  };
})();
