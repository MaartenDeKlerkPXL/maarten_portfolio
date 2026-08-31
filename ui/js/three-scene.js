/* ============================================================
   three-scene.js — Three.js canvases.
   Scene  #projects-canvas : very subtle drifting particle field.
   All transparent, responsive, paused when the tab is hidden, and
   reduced to a single static frame under prefers-reduced-motion.
   Exposes: window.initThreeScenes()
   ============================================================ */
(function () {
  "use strict";

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  window.initThreeScenes = function () {
    if (typeof THREE === "undefined") return;

    var scenes = [];
    var reduced = reducedMotion();

    function makeContext(canvas) {
      var renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      var w = canvas.clientWidth || canvas.parentElement.clientWidth || 300;
      var h = canvas.clientHeight || canvas.parentElement.clientHeight || 300;
      renderer.setSize(w, h, false);
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
      camera.position.z = 5;
      return { renderer: renderer, scene: scene, camera: camera, canvas: canvas };
    }

    function particleField(count, spread, size, opacity) {
      var geo = new THREE.BufferGeometry();
      var pos = new Float32Array(count * 3);
      for (var i = 0; i < count * 3; i++) {
        pos[i] = (Math.random() - 0.5) * spread;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      var mat = new THREE.PointsMaterial({
        color: 0x60a5fa,
        size: size,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      return new THREE.Points(geo, mat);
    }

    /* ---------------- Scene: projects ---------------- */
    function buildProjects(canvas) {
      var ctx = makeContext(canvas);
      var dots = particleField(260, 16, 0.05, 0.32);
      var dots2 = particleField(180, 12, 0.035, 0.22);
      ctx.scene.add(dots, dots2);
      ctx.update = function (t) {
        dots.rotation.y = t * 0.025;
        dots.rotation.x = t * 0.012;
        dots2.rotation.y = -t * 0.018;
        ctx.camera.position.x = Math.sin(t * 0.1) * 0.4;
        ctx.camera.lookAt(0, 0, 0);
      };
      return ctx;
    }

    var builders = {
      "projects-canvas": buildProjects,
    };

    Object.keys(builders).forEach(function (id) {
      var canvas = document.getElementById(id);
      if (canvas) {
        try { scenes.push(builders[id](canvas)); } catch (e) { /* ignore */ }
      }
    });

    if (!scenes.length) return;

    function resize() {
      scenes.forEach(function (ctx) {
        var w = ctx.canvas.clientWidth || ctx.canvas.parentElement.clientWidth;
        var h = ctx.canvas.clientHeight || ctx.canvas.parentElement.clientHeight;
        if (!w || !h) return;
        ctx.camera.aspect = w / h;
        ctx.camera.updateProjectionMatrix();
        ctx.renderer.setSize(w, h, false);
      });
    }
    window.addEventListener("resize", resize);

    var clock = new THREE.Clock();
    var running = true;
    var rafId = 0;
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
      if (running && !reduced) {
        /* Annuleer een eventueel nog geplande frame vóór herstart, anders
           lopen er na snel tab-wisselen twee renderloops naast elkaar */
        cancelAnimationFrame(rafId);
        loop();
      }
    });

    function renderAll(t) {
      scenes.forEach(function (ctx) {
        if (ctx.update) ctx.update(t);
        ctx.renderer.render(ctx.scene, ctx.camera);
      });
    }

    function loop() {
      if (!running) return;
      var t = clock.getElapsedTime();
      renderAll(t);
      if (!reduced) rafId = requestAnimationFrame(loop);
    }

    // Initial sizing pass after layout settles, then run.
    resize();
    requestAnimationFrame(resize);
    window.addEventListener("load", resize);
    if (reduced) {
      renderAll(0.4); // single static frame
    } else {
      loop();
    }
  };

  /* ----------------------------------------------------------
     MK.initAmbient(canvas, colorA, colorB)
     Standalone ambient particle cloud (used by the cinematic
     intro). Transparent, responsive, and self-terminating: the
     loop stops and disposes once the canvas leaves the DOM.
     ---------------------------------------------------------- */
  window.MK = window.MK || {};
  window.MK.initAmbient = function (canvas, colorA, colorB) {
    if (typeof THREE === "undefined" || !canvas) return;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, 1, 0.1, 60);
    camera.position.z = 7;

    function fit() {
      var w = canvas.clientWidth || 1;
      var h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", fit);
    fit();

    function cloud(count, spread, size, color, opacity) {
      var geo = new THREE.BufferGeometry();
      var pos = new Float32Array(count * 3);
      for (var i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * spread;
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      var mat = new THREE.PointsMaterial({
        color: color,
        size: size,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      var pts = new THREE.Points(geo, mat);
      scene.add(pts);
      return pts;
    }

    var c1 = cloud(280, 20, 0.05, colorA || 0x2563eb, 0.55);
    var c2 = cloud(180, 14, 0.035, colorB || 0x60a5fa, 0.4);
    var ico = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3.4, 1),
      new THREE.MeshBasicMaterial({ color: colorA || 0x2563eb, wireframe: true, transparent: true, opacity: 0.1 })
    );
    scene.add(ico);

    var clock = new THREE.Clock();
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function loop() {
      if (!canvas.isConnected) {
        window.removeEventListener("resize", fit);
        renderer.dispose();
        return;
      }
      var t = clock.getElapsedTime();
      c1.rotation.y = t * 0.03;
      c2.rotation.y = -t * 0.02;
      ico.rotation.x = t * 0.05;
      ico.rotation.y = t * 0.07;
      renderer.render(scene, camera);
      if (!reduced) requestAnimationFrame(loop);
    }
    if (reduced) { renderer.render(scene, camera); } else { loop(); }
  };
})();
