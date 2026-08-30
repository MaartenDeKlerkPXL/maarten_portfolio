/* ============================================================
   live-stats.js — Keeps two numbers honest instead of hardcoded:

   - "Years experience": computed from a fixed start date (no
     manual updates needed, ticks over automatically).
   - "Projects": read from the real projects page — fetches it,
     counts the actual .reveal-wrap cards in the project grid, and
     writes that number into every [data-live-stat="projects"]
     element on the current page. The count can never drift from
     what's actually on the projects page, since it IS that count.

   Skills stays a plain hardcoded number in the HTML — that's a
   fact the user gave directly, not something derivable from the
   DOM, so it's left alone here.

   Needs an HTTP(S) origin: fetch() does not work on file://, so
   this silently no-ops there and the static fallback number
   already in the HTML (accurate as of when it was last edited)
   stays on screen.
   Exposes: window.initLiveStats()
   ============================================================ */
(function () {
  "use strict";

  var START_YEAR = 2021;
  var START_MONTH = 8; // 0-based: September

  function yearsOfExperience() {
    var now = new Date();
    var years = now.getFullYear() - START_YEAR;
    if (now.getMonth() < START_MONTH) years -= 1;
    return Math.max(years, 0);
  }

  // Elements either belong to an existing counter system (home's
  // counter.js, or the about page's s-story.js) via [data-target], in
  // which case we just correct that target and let the system's own
  // animation + suffix handling render it — or they're a plain static
  // span (page-hero__stat-n) with no other owner, so we write the full
  // text, "+" included, ourselves.
  function applyStat(selector, value) {
    document.querySelectorAll('[data-live-stat="' + selector + '"]').forEach(function (el) {
      if (el.hasAttribute("data-target")) {
        el.setAttribute("data-target", String(value));
      } else {
        el.textContent = value + "+";
      }
    });
  }

  function fetchProjectCount() {
    var isEN = (document.documentElement.lang || "nl").toLowerCase().indexOf("en") === 0;
    var url = isEN ? "projects.html" : "projecten.html";

    fetch(url)
      .then(function (res) { return res.ok ? res.text() : null; })
      .then(function (html) {
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, "text/html");
        var grid = doc.querySelector("[data-project-grid]");
        var count = grid ? grid.querySelectorAll(".reveal-wrap").length : 0;
        if (count > 0) applyStat("projects", count);
      })
      .catch(function () {
        /* file://, offline, or the request failed — leave the static
           fallback that's already in the HTML. */
      });
  }

  window.initLiveStats = function () {
    applyStat("years", yearsOfExperience());
    fetchProjectCount();
  };
})();
