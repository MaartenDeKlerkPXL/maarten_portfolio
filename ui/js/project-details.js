/* ============================================================
   project-details.js — Uitklappanelen met een uitgebreide
   projectbeschrijving op de projectenpagina.

   Elke .reveal-wrap.has-details bevat een .project-unit (kaartlink +
   absoluut gepositioneerd .project-details-paneel) en een
   "Lees meer"-knop buiten de link.

   Hover-modus (muis én minstens twee kolommen): bij elke opening wordt
   de kolom van de kaart opnieuw bepaald uit getBoundingClientRect, nooit
   uit nth-child, omdat het aantal kolommen wisselt met de schermbreedte
   en met het filter.
     linkerkolom   → paneel klapt naar rechts uit
     rechterkolom  → paneel klapt naar links uit
     middenkolom   → kaart schuift één kolom naar links, paneel klapt
                     daarna naar rechts uit op de oude plek
                     (bij reduced motion: paneel naar links, niets schuift)
   Accordeonmodus (touch of één kolom): de knop klapt het paneel onder
   de kaart open.
   Exposes: window.initProjectDetails()
   ============================================================ */
(function () {
  "use strict";

  var OPEN_DELAY = 120;
  var CLOSE_DELAY = 200;
  var DURATION = 350; // gelijk aan --details-dur in de CSS

  window.initProjectDetails = function () {
    var grid = document.querySelector("[data-project-grid]");
    if (!grid) return;
    var wraps = Array.prototype.slice.call(grid.querySelectorAll(".reveal-wrap.has-details"));
    if (!wraps.length) return;

    var hoverQuery = window.matchMedia("(hover: hover)");
    var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    var current = null;   // de wrap waarvan het paneel open staat
    var hoverMode = false;

    function parts(wrap) {
      return {
        card: wrap.querySelector(".project-card"),
        panel: wrap.querySelector("[data-details]"),
        body: wrap.querySelector(".project-details__body"),
        toggle: wrap.querySelector(".project-details__toggle")
      };
    }

    function gridMetrics() {
      var cs = getComputedStyle(grid);
      var cols = cs.gridTemplateColumns.split(" ").filter(function (v) { return v && v !== "none"; }).length || 1;
      var gap = parseFloat(cs.columnGap) || 0;
      return { cols: cols, gap: gap };
    }

    /* Kolom van de kaart in zijn rij, uit de werkelijke positie */
    function layoutFor(wrap) {
      var m = gridMetrics();
      var g = grid.getBoundingClientRect();
      var r = wrap.getBoundingClientRect();
      var colW = (g.width - m.gap * (m.cols - 1)) / m.cols;
      var col = Math.round((r.left + r.width / 2 - g.left - colW / 2) / (colW + m.gap));
      col = Math.max(0, Math.min(m.cols - 1, col));
      var dir = "right", shifted = false;
      if (col === m.cols - 1) dir = "left";
      else if (col > 0) {
        if (reduceQuery.matches) dir = "left";
        else shifted = true;
      }
      return { dir: dir, shifted: shifted, gap: m.gap };
    }

    function setTiltPaused(card, paused) {
      if (!card) return;
      card.classList.toggle("is-tilt-paused", paused);
      if (paused) card.dispatchEvent(new CustomEvent("tilt:reset"));
    }

    function markOverflow(p) {
      var over = p.body.scrollHeight > p.body.clientHeight + 1;
      p.panel.classList.toggle("is-overflowing", over);
      // Scrollbaar deel ook met het toetsenbord bereikbaar maken
      if (over) p.body.setAttribute("tabindex", "0");
      else p.body.removeAttribute("tabindex");
    }

    function clearTimers(wrap) {
      clearTimeout(wrap._detailsOpenT);
      clearTimeout(wrap._detailsCloseT);
      clearTimeout(wrap._detailsEndT);
    }

    function open(wrap) {
      if (!hoverMode) return;
      clearTimers(wrap);
      if (current === wrap) return;
      if (current) close(current);
      var p = parts(wrap);
      var lay = layoutFor(wrap);
      wrap.style.setProperty("--details-gap", lay.gap + "px");
      wrap.classList.remove("is-details-closing");
      p.panel.setAttribute("data-dir", lay.dir);
      p.card.setAttribute("data-dir", lay.dir);
      wrap.classList.toggle("is-shifted", lay.shifted);
      setTiltPaused(p.card, true);
      // Reflow zodat de startpositie (dicht) eerst wordt toegepast
      void p.panel.offsetWidth;
      wrap.classList.add("is-details-open");
      current = wrap;
      markOverflow(p);
    }

    function close(wrap, instant) {
      clearTimers(wrap);
      if (!wrap.classList.contains("is-details-open") && !wrap.classList.contains("is-details-closing")) return;
      var p = parts(wrap);
      var wasShifted = wrap.classList.contains("is-shifted");
      if (instant) wrap.classList.add("no-details-anim");
      wrap.classList.remove("is-details-open", "is-shifted");
      if (current === wrap) current = null;
      setTiltPaused(p.card, false);

      function finish() {
        wrap.classList.remove("is-details-closing", "no-details-anim");
        p.panel.removeAttribute("data-dir");
        p.card.removeAttribute("data-dir");
        p.panel.classList.remove("is-overflowing");
      }
      if (instant || reduceQuery.matches) {
        void wrap.offsetWidth;
        finish();
        return;
      }
      // Panel klapt eerst in; een verschoven kaart schuift daarna terug
      wrap.classList.add("is-details-closing");
      wrap._detailsEndT = setTimeout(finish, wasShifted ? DURATION * 2 : DURATION);
    }

    function closeAllInstant() {
      wraps.forEach(function (w) { close(w, true); });
      current = null;
    }

    function focusVisibleInside(wrap) {
      var el = document.activeElement;
      if (!el || !wrap.contains(el)) return false;
      try { return el.matches(":focus-visible"); } catch (e) { return true; }
    }

    /* ---------- Accordeon (touch of één kolom) ---------- */
    function setExpanded(wrap, expanded) {
      var p = parts(wrap);
      wrap.classList.toggle("is-expanded", expanded);
      p.toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      p.toggle.textContent = expanded ? p.toggle.getAttribute("data-less") : p.toggle.getAttribute("data-more");
    }

    function updateMode() {
      var cols = gridMetrics().cols;
      var nextHover = hoverQuery.matches && cols > 1;
      if (nextHover === hoverMode && grid.classList.contains("is-details-ready")) return;
      hoverMode = nextHover;
      closeAllInstant();
      grid.classList.toggle("is-details-accordion", !hoverMode);
      grid.classList.add("is-details-ready");
      wraps.forEach(function (w) {
        var p = parts(w);
        setExpanded(w, false);
        p.toggle.hidden = hoverMode;
      });
    }

    wraps.forEach(function (wrap) {
      var p = parts(wrap);

      wrap.addEventListener("mouseenter", function () {
        if (!hoverMode) return;
        clearTimeout(wrap._detailsCloseT);
        if (current === wrap) return;
        clearTimeout(wrap._detailsOpenT);
        wrap._detailsOpenT = setTimeout(function () { open(wrap); }, OPEN_DELAY);
      });

      wrap.addEventListener("mouseleave", function () {
        if (!hoverMode) return;
        clearTimeout(wrap._detailsOpenT);
        if (current !== wrap || focusVisibleInside(wrap)) return;
        wrap._detailsCloseT = setTimeout(function () { close(wrap); }, CLOSE_DELAY);
      });

      // Toetsenbord: openen bij focus op de kaart (alleen zichtbare focus,
      // dus niet na een muisklik), sluiten zodra de focus de kaart verlaat
      wrap.addEventListener("focusin", function (e) {
        if (!hoverMode) return;
        var visible = true;
        try { visible = e.target.matches(":focus-visible"); } catch (err) {}
        if (visible) open(wrap);
      });
      wrap.addEventListener("focusout", function (e) {
        if (!hoverMode || current !== wrap) return;
        if (e.relatedTarget && wrap.contains(e.relatedTarget)) return;
        if (wrap.matches(":hover")) return;
        close(wrap);
      });

      p.toggle.addEventListener("click", function () {
        if (hoverMode) return;
        setExpanded(wrap, p.toggle.getAttribute("aria-expanded") !== "true");
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !current) return;
      var wrap = current;
      var hadFocus = wrap.contains(document.activeElement);
      close(wrap);
      if (hadFocus) parts(wrap).card.focus();
    });

    // Filter: open paneel direct sluiten; posities worden bij de volgende
    // opening opnieuw bepaald
    var filters = document.querySelector("[data-filters]");
    if (filters) {
      filters.addEventListener("click", function (e) {
        if (e.target.closest(".filter-btn")) closeAllInstant();
      });
    }

    var resizeT = null;
    window.addEventListener("resize", function () {
      if (current) closeAllInstant();
      clearTimeout(resizeT);
      resizeT = setTimeout(updateMode, 150);
    });
    function onQueryChange() { updateMode(); }
    if (hoverQuery.addEventListener) hoverQuery.addEventListener("change", onQueryChange);
    if (reduceQuery.addEventListener) reduceQuery.addEventListener("change", closeAllInstant);

    updateMode();
  };
})();
