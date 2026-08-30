/* ============================================================
   typewriter.js — Cycles through phrases on a [data-typewriter]
   element. Phrases are a JSON array in data-words. Types forward,
   pauses, deletes, then moves to the next. A blinking caret is
   provided by the sibling .tw-cursor (styled in CSS).
   Speeds: data-type-speed, data-delete-speed, data-hold (ms).
   Exposes: window.initTypewriter()
   ============================================================ */
(function () {
  "use strict";

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function run(el) {
    var words;
    try {
      words = JSON.parse(el.getAttribute("data-words") || "[]");
    } catch (e) {
      words = (el.getAttribute("data-words") || "").split("|");
    }
    if (!words.length) return;

    var typeSpeed = parseInt(el.getAttribute("data-type-speed"), 10) || 70;
    var delSpeed = parseInt(el.getAttribute("data-delete-speed"), 10) || 38;
    var hold = parseInt(el.getAttribute("data-hold"), 10) || 1500;

    var target = el.querySelector(".tw-text");
    if (!target) {
      target = document.createElement("span");
      target.className = "tw-text";
      el.insertBefore(target, el.firstChild);
    }

    if (reducedMotion()) {
      target.textContent = words[0];
      return;
    }

    var wi = 0, ci = 0, deleting = false;

    function tick() {
      var word = words[wi];
      if (!deleting) {
        ci++;
        target.textContent = word.slice(0, ci);
        if (ci === word.length) {
          deleting = true;
          return setTimeout(tick, hold);
        }
        return setTimeout(tick, typeSpeed + Math.random() * 40);
      } else {
        ci--;
        target.textContent = word.slice(0, ci);
        if (ci === 0) {
          deleting = false;
          wi = (wi + 1) % words.length;
          return setTimeout(tick, 360);
        }
        return setTimeout(tick, delSpeed);
      }
    }
    setTimeout(tick, 600);
  }

  window.initTypewriter = function () {
    document.querySelectorAll("[data-typewriter]").forEach(run);
  };
})();
