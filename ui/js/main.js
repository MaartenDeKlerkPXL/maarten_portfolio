/* ============================================================
   ANIMATION 1 — Video-intro (eerste bezoek in een sessie).
   Speelt een korte intro-video met alpha (dark of light variant,
   HEVC voor Safari, WebM VP9 voor de rest). Rond 2,65 s veegt een
   groene balk in de video alles weg; dan wordt de stage transparant
   zodat de wipe de pagina eronder onthult. Bij 'ended' verdwijnt de
   intro meteen (de video heeft zijn eigen exit). Klik, Enter of
   spatie slaat over. Bij vervolgbezoeken in dezelfde sessie bailt
   deze engine en doet de slash-loader (page-transition.js) de reveal.
   Dispatcht `mk:intro-done` en zet body.intro-done.
   ============================================================ */
(function mkIntro() {
  var intro = document.getElementById("mk-intro");
  if (!intro) { document.body.classList.add("intro-done"); return; }

  // Vervolgbezoek in dezelfde sessie: de loader regelt de reveal.
  try { if (sessionStorage.getItem("mk_visited")) return; } catch (e) {}

  var video = intro.querySelector(".mk-intro__video");
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var WIPE_AT = 2.65; // seconden: moment waarop de groene balk wegveegt
  var gone = false;
  var safety = null;

  function finish() {
    if (intro.parentNode) intro.parentNode.removeChild(intro);
    document.documentElement.classList.remove("no-scroll");
    document.body.classList.add("intro-done");
    document.dispatchEvent(new CustomEvent("mk:intro-done"));
  }

  // instant: na 'ended' of bij reduced motion meteen weg (geen leave-animatie)
  function dismiss(instant) {
    if (gone) return;
    gone = true;
    clearTimeout(safety);
    document.removeEventListener("keydown", onKey);
    if (video) { try { video.pause(); } catch (e) {} }
    if (instant === true) { finish(); return; }
    intro.classList.add("is-leaving");
    setTimeout(finish, 900);
  }

  function onKey(e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dismiss(); }
  }

  // Geen video bij reduced motion (of als het element ontbreekt): meteen door
  if (REDUCE || !video) { dismiss(true); return; }

  document.documentElement.classList.add("no-scroll");
  intro.addEventListener("click", function () { dismiss(); }, { once: true });
  document.addEventListener("keydown", onKey);

  // Bron kiezen: thema (dark/light) en Safari (HEVC) of de rest (WebM)
  var light = document.documentElement.getAttribute("data-theme") === "light";
  var safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  var base = "../assets/intro/mk-intro" + (light ? "-light" : "");
  video.src = base + (safari ? "-hevc.mov" : ".webm");

  // Wipe-moment exact volgen (timeupdate vuurt maar ~4x per seconde)
  function watchWipe() {
    if (gone) return;
    if (video.currentTime >= WIPE_AT) { intro.classList.add("is-wiping"); return; }
    requestAnimationFrame(watchWipe);
  }

  video.addEventListener("ended", function () { dismiss(true); }, { once: true });
  video.addEventListener("error", function () { dismiss(true); }, { once: true });
  var played = video.play();
  if (played && typeof played.then === "function") {
    played.then(function () { requestAnimationFrame(watchWipe); }).catch(function () { dismiss(true); });
  } else {
    requestAnimationFrame(watchWipe);
  }
  safety = setTimeout(function () { dismiss(true); }, 6000); // vangnet
})();

/* ============================================================
   main.js — Boot file. Wires the navbar scroll state, mobile
   overlay menu, footer year, and kicks off every module
   (theme, cursor, page transitions, Three.js, animations,
   project filter). Loaded last on every page.
   ============================================================ */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function safe(fn) {
    if (typeof fn === "function") {
      try { fn(); } catch (e) { /* never break the page */ }
    }
  }

  /* ---------- Navbar frosted-glass on scroll ---------- */
  function initNav() {
    var nav = document.querySelector(".nav");
    if (!nav) return;
    var onScroll = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile overlay menu ---------- */
  function initMobileMenu() {
    var toggle = document.querySelector("[data-menu-toggle]");
    var menu = document.querySelector(".mobile-menu");
    if (!toggle || !menu) return;

    var links = menu.querySelectorAll(".mobile-menu__link");
    links.forEach(function (l, i) { l.style.setProperty("--i", i); });

    function close() {
      document.body.classList.remove("menu-open");
      document.documentElement.classList.remove("no-scroll");
      toggle.setAttribute("aria-expanded", "false");
    }
    function open() {
      document.body.classList.add("menu-open");
      document.documentElement.classList.add("no-scroll");
      toggle.setAttribute("aria-expanded", "true");
    }

    toggle.addEventListener("click", function () {
      if (document.body.classList.contains("menu-open")) close();
      else open();
    });
    links.forEach(function (l) { l.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  /* ---------- Footer year ---------- */
  function initYear() {
    var y = new Date().getFullYear();
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = y;
    });
  }

  /* ---------- Contact form: live validation + submit states ---------- */
  function initContactForm() {
    var form = document.querySelector("[data-contact-form]");
    if (!form) return;

    var isEN = (document.documentElement.lang || "nl").toLowerCase().indexOf("en") === 0;
    var T = isEN
      ? {
          name: "Please enter your name.",
          email: "Please enter a valid email address.",
          subject: "Please enter a subject.",
          message: "Your message needs at least 10 characters.",
          ok: "Thanks! Your message has been sent. I usually reply within 24 hours.",
          fail: "Sending didn't work. Please email me directly at ",
        }
      : {
          name: "Vul je naam in.",
          email: "Vul een geldig e-mailadres in.",
          subject: "Vul een onderwerp in.",
          message: "Je bericht heeft minstens 10 tekens nodig.",
          ok: "Bedankt! Je bericht is verstuurd. Ik reageer meestal binnen 24 uur.",
          fail: "Versturen lukte niet. Mail me gerust rechtstreeks op ",
        };

    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var fields = Array.prototype.slice.call(form.querySelectorAll(".field"));

    function validateField(field) {
      var input = field.querySelector("input, textarea");
      if (!input) return true;
      var name = input.name;
      var val = input.value.trim();
      var ok = true;
      if (name === "email") ok = emailRe.test(val);
      else if (name === "message") ok = val.length >= 10;
      else ok = val.length >= 2;

      var err = field.querySelector(".field__error");
      if (val === "" && !field.classList.contains("touched")) {
        field.classList.remove("is-valid", "is-invalid");
        return false;
      }
      field.classList.toggle("is-valid", ok);
      field.classList.toggle("is-invalid", !ok);
      if (err) err.textContent = ok ? "" : T[name] || "";
      return ok;
    }

    fields.forEach(function (field) {
      var input = field.querySelector("input, textarea");
      if (!input) return;
      input.addEventListener("input", function () { validateField(field); });
      input.addEventListener("blur", function () {
        field.classList.add("touched");
        validateField(field);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var allOk = true;
      var firstBad = null;
      fields.forEach(function (field) {
        field.classList.add("touched");
        var ok = validateField(field);
        if (!ok) { allOk = false; if (!firstBad) firstBad = field; }
      });
      if (!allOk) {
        if (firstBad) {
          var input = firstBad.querySelector("input, textarea");
          if (input) input.focus();
        }
        return;
      }

      var btn = form.querySelector(".form__submit");
      var status = form.querySelector(".form__status");
      var to = form.getAttribute("data-mailto") || "maartendeklerk2002@gmail.com";
      var val = function (n) {
        var el = form.querySelector('[name="' + n + '"]');
        return el ? el.value.trim() : "";
      };

      function showStatus(ok) {
        if (!status) return;
        status.classList.toggle("error", !ok);
        if (ok) {
          status.textContent = T.ok;
        } else {
          // Foutmelding met het adres als klikbare link (geen innerHTML met invoer)
          status.textContent = T.fail;
          var a = document.createElement("a");
          a.href = "mailto:" + to;
          a.textContent = to;
          status.appendChild(a);
          status.appendChild(document.createTextNode("."));
        }
        status.classList.add("show");
      }

      // Honeypot: echte bezoekers zien dit veld niet; bots vullen het wel in
      if (val("_honey")) {
        showStatus(true);
        form.reset();
        return;
      }

      if (btn) { btn.classList.add("is-loading"); btn.disabled = true; }
      if (status) status.classList.remove("show", "error");

      // Verzenden via FormSubmit (statische site, geen eigen server). De
      // eerste inzending ooit stuurt FormSubmit een activatiemail naar het
      // adres; pas na die bevestiging komen berichten echt binnen.
      // FormData i.p.v. JSON: een "simpel" verzoek zonder CORS-preflight
      var data = new FormData();
      data.append("name", val("name"));
      data.append("email", val("email"));
      data.append("_replyto", val("email"));
      data.append("_subject", "Portfolio: " + val("subject"));
      data.append("subject", val("subject"));
      data.append("message", val("message"));
      data.append("_template", "table");
      data.append("_captcha", "false");
      fetch("https://formsubmit.co/ajax/" + encodeURIComponent(to), {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: data
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            var ok = res.ok && (data.success === true || data.success === "true");
            if (!ok) throw new Error((data && data.message) || ("HTTP " + res.status));
          });
        })
        .then(function () {
          if (btn) { btn.classList.remove("is-loading"); btn.classList.add("is-success"); }
          showStatus(true);
          form.reset();
          fields.forEach(function (f) { f.classList.remove("is-valid", "is-invalid", "touched"); });
          window.setTimeout(function () {
            if (btn) { btn.classList.remove("is-success"); btn.disabled = false; }
          }, 4000);
        })
        .catch(function (err) {
          if (window.console) console.warn("Contactformulier:", err && err.message);
          if (btn) { btn.classList.remove("is-loading"); btn.disabled = false; }
          showStatus(false);
        });
    });
  }
  window.initContactForm = initContactForm;

  /* ---------- Anchor scroll with nav offset ---------- */
  function initAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: top, behavior: "smooth" });
      });
    });
  }

  /* ---------- Scroll-to-top button with ring progress ---------- */
  function initScrollTop() {
    var btn = document.getElementById("scrollTop");
    var fill = document.getElementById("scrollRingFill");
    if (!btn) return;
    window.addEventListener("scroll", function () {
      var y = window.pageYOffset;
      btn.classList.toggle("is-visible", y > window.innerHeight * 0.6);
      if (fill) {
        var total = document.documentElement.scrollHeight - window.innerHeight;
        var prog = total > 0 ? y / total : 0;
        fill.style.strokeDashoffset = (152 - 152 * prog).toFixed(2);
      }
    }, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  ready(function () {
    safe(window.initThemeToggle);
    initNav();
    initMobileMenu();
    initYear();
    initAnchors();
    initScrollTop();
    safe(window.initPageTransition);
    safe(window.initCursor);
    safe(window.initThreeScenes);
    safe(window.initHeroCards);
    safe(window.initLiveStats);
    safe(window.initAnimations);
    safe(window.initProjectFilter);
    safe(window.initProjectDetails);
    safe(window.initVideoLightbox);
    safe(window.initContactForm);
  });
})();

/* ============================================================
   STARFIELD — alleen op de over/about-pagina (#stars-canvas)
   ============================================================ */
(function initStars() {
  var canvas = document.getElementById("stars-canvas");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var W = 0, H = 0;
  var stars = [];
  var STAR_COUNT = 280;
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function generateStars() {
    stars = [];
    for (var i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.1 + 0.2,
        opacity: Math.random() * 0.5 + 0.25,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.018 + 0.004,
        angle: Math.random() * Math.PI * 2
      });
    }
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    generateStars();
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  var t = 0;
  function drawStars() {
    ctx.clearRect(0, 0, W, H);
    var isDark = document.documentElement.getAttribute("data-theme") !== "light";

    stars.forEach(function (s) {
      s.x += Math.cos(s.angle) * s.speed;
      s.y += Math.sin(s.angle) * s.speed;
      if (s.x < -2)   s.x = W + 2;
      if (s.x > W + 2) s.x = -2;
      if (s.y < -2)   s.y = H + 2;
      if (s.y > H + 2) s.y = -2;

      var twinkle = Math.sin(t * 0.6 + s.phase) * 0.18;
      var alpha = Math.max(0.05, Math.min(0.9, s.opacity + twinkle));

      var starColor = isDark
        ? "rgba(200, 220, 255, " + alpha + ")"
        : "rgba(30, 60, 140, " + alpha * 0.55 + ")";

      if (s.r > 0.9 && isDark) {
        starColor = "rgba(168, 235, 168, " + alpha + ")";
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = starColor;
      ctx.fill();

      if (s.r > 0.9 && isDark) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(123, 224, 123, " + alpha * 0.12 + ")";
        ctx.fill();
      }
    });

    t += 0.016;
  }

  function loop() {
    requestAnimationFrame(loop);
    if (!REDUCE) {
      drawStars();
    } else if (t === 0) {
      drawStars();
      t = 1;
    }
  }
  loop();
})();
