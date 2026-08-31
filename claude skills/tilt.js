/* ============================================================
   tilt.js — 3D tilt for [data-tilt] elements based on cursor
   position, with a moving glare highlight. Resets smoothly on
   leave. Strength via data-tilt-max="10" (degrees, default 9).
   Exposes: window.initTilt()
   ============================================================ */
(function () {
  "use strict";

  function isTouch() {
    return "ontouchstart" in window || window.matchMedia("(pointer: coarse)").matches;
  }
  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function bind(el) {
    var max = parseFloat(el.getAttribute("data-tilt-max")) || 9;

    // Ensure a glare layer exists.
    var glare = el.querySelector(".tilt__glare");
    if (!glare) {
      glare = document.createElement("span");
      glare.className = "tilt__glare";
      el.appendChild(glare);
    }
    el.classList.add("tilt");

    var raf = null;
    var tgX = 0, tgY = 0, curX = 0, curY = 0;

    function animate() {
      curX += (tgX - curX) * 0.15;
      curY += (tgY - curY) * 0.15;
      el.style.transform =
        "perspective(900px) rotateX(" + curY.toFixed(2) + "deg) rotateY(" + curX.toFixed(2) + "deg)";
      if (Math.abs(tgX - curX) > 0.05 || Math.abs(tgY - curY) > 0.05) {
        raf = requestAnimationFrame(animate);
      } else {
        raf = null;
      }
    }
    function kick() { if (!raf) raf = requestAnimationFrame(animate); }

    el.addEventListener("mousemove", function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;   // 0..1
      var py = (e.clientY - r.top) / r.height;   // 0..1
      tgX = (px - 0.5) * 2 * max;                // rotateY
      tgY = -(py - 0.5) * 2 * max;               // rotateX
      glare.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
      glare.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
      kick();
    });

    el.addEventListener("mouseenter", function () {
      el.classList.add("is-tilting");
    });

    el.addEventListener("mouseleave", function () {
      tgX = 0; tgY = 0;
      el.classList.remove("is-tilting");
      kick();
    });
  }

  window.initTilt = function () {
    if (isTouch() || reducedMotion()) return;
    document.querySelectorAll("[data-tilt]").forEach(bind);
  };
})();
