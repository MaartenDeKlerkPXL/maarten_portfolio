/* ============================================================
   cursor.js — Custom cursor: a filled dot that tracks the mouse
   exactly and an outer ring that follows with lerp lag. The ring
   grows over interactive elements. Disabled on touch devices.
   Exposes: window.initCursor()
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

  window.initCursor = function () {
    if (isTouch()) return;

    var dot = document.createElement("div");
    var ring = document.createElement("div");
    dot.className = "cursor-dot";
    ring.className = "cursor-ring";
    document.body.appendChild(ring);
    document.body.appendChild(dot);
    document.body.classList.add("has-custom-cursor");

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var ringX = mouseX;
    var ringY = mouseY;

    window.addEventListener(
      "mousemove",
      function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        dot.style.transform =
          "translate3d(" + mouseX + "px," + mouseY + "px,0) translate(-50%,-50%)";
      },
      { passive: true }
    );

    function render() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform =
        "translate3d(" + ringX + "px," + ringY + "px,0) translate(-50%,-50%)";
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    // Interactive hover state via event delegation.
    var interactiveSel =
      'a, button, input, textarea, select, label, [data-magnetic], [data-tilt], .filter-btn, .project-card';
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest(interactiveSel)) {
        ring.classList.add("is-hover");
        dot.classList.add("is-hover");
      }
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest(interactiveSel)) {
        ring.classList.remove("is-hover");
        dot.classList.remove("is-hover");
      }
    });

    // Hide when leaving the window, show on return.
    document.addEventListener("mouseleave", function () {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    });
    document.addEventListener("mouseenter", function () {
      dot.style.opacity = "";
      ring.style.opacity = "";
    });
  };
})();
