/* ============================================================
   animations.js — Orchestrates the scroll/interaction animations
   defined in /claude skills/ (reveal, tilt, magnetic, counter,
   typewriter) plus the IntersectionObserver-driven progress bars
   on the About page. Called once from main.js via initAnimations().
   ============================================================ */
(function () {
  "use strict";

  function safe(fn) {
    if (typeof fn === "function") {
      try { fn(); } catch (e) { /* keep the page alive */ }
    }
  }

  function initProgressBars() {
    var bars = document.querySelectorAll(".progress");
    if (!bars.length) return;

    if (!("IntersectionObserver" in window)) {
      bars.forEach(function (b) { b.classList.add("is-filled"); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-filled");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    bars.forEach(function (b) { io.observe(b); });
  }

  window.initAnimations = function () {
    safe(window.initReveal);
    safe(window.initTilt);
    safe(window.initMagnetic);
    safe(window.initCounter);
    safe(window.initTypewriter);
    initProgressBars();
  };

  /* ---------- Hero heading: letter-by-letter split (home pages) ---------- */
  function splitHeroText() {
    document.querySelectorAll(".hero-split").forEach(function (el) {
      if (el.dataset.split) return; // idempotent — never split twice
      el.dataset.split = "1";
      var text = el.textContent;
      el.textContent = "";
      /* Screenreaders lezen de volledige naam uit de sr-only span; de losse
         letter-spans zijn puur visueel (aria-label op een span is niet
         betrouwbaar, letters apart voorlezen wel een reëel risico). */
      var srName = document.createElement("span");
      srName.className = "sr-only";
      srName.textContent = text;
      el.appendChild(srName);
      text.split("").forEach(function (ch, i) {
        var span = document.createElement("span");
        span.setAttribute("aria-hidden", "true");
        span.textContent = ch === " " ? " " : ch;
        span.style.display = "inline-block";
        span.style.opacity = "0";
        span.style.transform = "translateY(40px) rotate(-4deg)";
        span.style.transition = "opacity 0.5s var(--ease), transform 0.5s var(--ease)";
        span.style.transitionDelay = (0.05 + i * 0.04) + "s";
        el.appendChild(span);
      });
    });
  }
  function activateHeroSplit() {
    document.querySelectorAll(".hero-split span[aria-hidden]").forEach(function (s) {
      s.style.opacity = "1";
      s.style.transform = "translateY(0) rotate(0)";
    });
  }
  function runHeroSplit() {
    splitHeroText();
    requestAnimationFrame(function () {
      requestAnimationFrame(activateHeroSplit);
    });
  }
  document.addEventListener("mk:intro-done", runHeroSplit);
  // Fallback if the page has no intro (or it was already dismissed):
  // only fire once the page is actually revealed.
  window.addEventListener("load", function () {
    setTimeout(function () {
      if (document.body.classList.contains("intro-done")) runHeroSplit();
    }, 450);
  });
})();
