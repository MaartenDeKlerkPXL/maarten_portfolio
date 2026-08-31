/* ============================================================
   projects.js — Filter tabs on the Projects page. Buttons carry
   data-filter; each card wrapper carries data-category. Matching
   cards fade/scale in, others fade out and collapse from the grid.
   Exposes: window.initProjectFilter()
   ============================================================ */
(function () {
  "use strict";

  window.initProjectFilter = function () {
    var filterWrap = document.querySelector("[data-filters]");
    var grid = document.querySelector("[data-project-grid]");
    if (!filterWrap || !grid) return;

    var buttons = Array.prototype.slice.call(filterWrap.querySelectorAll(".filter-btn"));
    var items = Array.prototype.slice.call(grid.querySelectorAll(".reveal-wrap"));
    var timers = new WeakMap();

    function apply(filter) {
      items.forEach(function (item) {
        var cats = (item.getAttribute("data-category") || "").split(/\s+/);
        var match = filter === "all" || cats.indexOf(filter) !== -1;
        var pending = timers.get(item);
        if (pending) { clearTimeout(pending); timers.delete(item); }

        if (match) {
          item.style.display = "";
          // Next frame: drop the leaving state so it animates back in.
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { item.classList.remove("is-leaving"); });
          });
        } else {
          item.classList.add("is-leaving");
          var t = window.setTimeout(function () {
            item.style.display = "none";
            timers.delete(item);
          }, 360);
          timers.set(item, t);
        }
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.classList.contains("is-active")) return;
        buttons.forEach(function (b) {
          b.classList.remove("is-active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed", "true");
        apply(btn.getAttribute("data-filter") || "all");
      });
    });
  };
})();
