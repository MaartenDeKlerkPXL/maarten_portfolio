/* ============================================================
   hero-cards.js — Floating glassmorphism cards behind the hero
   text. Each card parallaxes opposite to the cursor (background-
   layer depth illusion), lerped toward its target like the ring
   in cursor.js so it feels soft rather than 1:1. Vanilla JS, no
   dependency on Three.js — runs alongside #hero-canvas, not in
   place of it. Disabled on touch devices, under
   prefers-reduced-motion, and while the tab is hidden.
   Exposes: window.initHeroCards()
   ============================================================ */
(function () {
  "use strict";

  function isTouch() {
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches
    );
  }
  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  window.initHeroCards = function () {
    var wrap = document.querySelector(".hero__cards");
    if (!wrap || isTouch() || reducedMotion()) return;

    var cards = Array.prototype.slice.call(wrap.querySelectorAll(".hero-card"));
    if (!cards.length) return;

    var items = cards.map(function (el) {
      return {
        el: el,
        depth: parseFloat(el.getAttribute("data-depth")) || 0.6,
        x: 0,
        y: 0
      };
    });

    var pointerX = 0, pointerY = 0; // normalized -1..1, 0 = viewport center
    var running = true;

    function onMove(e) {
      pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("mousemove", onMove, { passive: true });

    // Background layer drifts opposite the cursor — furthest cards (higher
    // depth) move the most, giving a soft sense of parallax depth.
    var AMPLITUDE_X = 22, AMPLITUDE_Y = 16, LERP = 0.06;

    function loop() {
      if (!running) return;
      items.forEach(function (item) {
        var tx = -pointerX * item.depth * AMPLITUDE_X;
        var ty = -pointerY * item.depth * AMPLITUDE_Y;
        item.x += (tx - item.x) * LERP;
        item.y += (ty - item.y) * LERP;
        item.el.style.transform =
          "translate3d(" + item.x.toFixed(2) + "px," + item.y.toFixed(2) + "px,0)";
      });
      requestAnimationFrame(loop);
    }

    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
      if (running) loop();
    });

    loop();
  };
})();
