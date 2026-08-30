/* ============================================================
   theme-toggle.js — Dark / light theme with localStorage.
   Default: dark. Toggles data-theme on <html>, animates icon.
   Exposes: window.initThemeToggle()
   A tiny inline snippet in each page <head> applies the saved
   theme before paint to prevent a flash; this wires the button.
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "theme";

  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function store(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var btns = document.querySelectorAll("[data-theme-toggle]");
    btns.forEach(function (b) {
      b.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
      b.setAttribute("aria-label", theme === "light" ? "Schakel naar donker thema" : "Schakel naar licht thema");
    });
  }

  function current() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  window.initThemeToggle = function () {
    // Ensure an explicit theme is set (default dark).
    var saved = getStored();
    applyTheme(saved === "light" ? "light" : "dark");

    var btns = document.querySelectorAll("[data-theme-toggle]");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = current() === "light" ? "dark" : "light";
        applyTheme(next);
        store(next);
      });
    });
  };
})();
