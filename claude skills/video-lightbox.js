/* ============================================================
   video-lightbox.js — Click a [data-video-src] project card to
   play its video in a centered modal instead of navigating away.
   Used by motion pieces that have no external link (e.g. Music
   Match, Blender Render 3D on the projects page).
   Closes on Escape, backdrop click, or the close button, and
   returns focus to the trigger that opened it.
   Exposes: window.initVideoLightbox()
   ============================================================ */
(function () {
  "use strict";

  window.initVideoLightbox = function () {
    var triggers = document.querySelectorAll("[data-video-src]");
    if (!triggers.length) return;

    var modal = document.createElement("div");
    modal.className = "video-lightbox";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML =
      '<div class="video-lightbox__panel">' +
      '<button type="button" class="video-lightbox__close" aria-label="Close">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      "</button>" +
      '<video class="video-lightbox__video" controls playsinline></video>' +
      "</div>";
    document.body.appendChild(modal);

    var video = modal.querySelector(".video-lightbox__video");
    var closeBtn = modal.querySelector(".video-lightbox__close");
    var lastFocused = null;

    function close() {
      if (!modal.classList.contains("is-open")) return;
      modal.classList.remove("is-open");
      video.pause();
      video.removeAttribute("src");
      video.load();
      document.documentElement.classList.remove("no-scroll");
      if (lastFocused) lastFocused.focus();
    }

    function open(src, title, trigger) {
      lastFocused = trigger;
      // Assigning the .src property (not setAttribute) reliably restarts the
      // media element's load algorithm, including right after close()'s
      // removeAttribute+load() reset — setAttribute alone can leave some
      // browsers stuck on the old (empty) source.
      video.src = src;
      video.load();
      modal.setAttribute("aria-label", title || "Video");
      modal.classList.add("is-open");
      document.documentElement.classList.add("no-scroll");
      closeBtn.focus();
      var playPromise = video.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(function (err) {
          // Autoplay blocked or the source failed to load — controls stay
          // usable either way, but log it so a real failure isn't silent.
          console.warn("video-lightbox: play() failed —", err);
        });
      }
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        var src = trigger.getAttribute("data-video-src");
        if (!src) return;
        open(src, trigger.getAttribute("data-video-title"), trigger);
      });
    });

    closeBtn.addEventListener("click", close);
    modal.addEventListener("click", function (e) {
      if (e.target === modal) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  };
})();
