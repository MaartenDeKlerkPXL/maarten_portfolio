/* ============================================================
   ui/js/s-story.js — S-curve scroll + echte GLB MacBook
   Gewoon script (geen ES module) — werkt via file:// en http://.
   Vereist dat THREE, THREE.GLTFLoader, THREE.RoomEnvironment en
   THREE.RectAreaLightUniformsLib al geladen zijn via <script> tags.
   ============================================================ */
(function () {
  "use strict";

  /* Wacht tot THREE geladen is — veiligheidscheck */
  if (typeof THREE === "undefined") {
    console.warn("s-story.js: THREE is niet geladen. Voeg three.min.js toe vóór s-story.js.");
    return;
  }
  if (typeof THREE.GLTFLoader === "undefined") {
    console.warn("s-story.js: THREE.GLTFLoader ontbreekt. Voeg GLTFLoader.js toe.");
    return;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return document.querySelectorAll(sel); }

  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var section = qs("#sStory");
  var svgPath = qs("#sPath");
  var cards   = qsa("[data-card]");
  var canvas  = qs("#s-laptop-canvas");
  if (!section || !canvas) return;

  /* ===========================================================
     KLEUR-THEMA
     =========================================================== */
  function isDarkMode() {
    return document.documentElement.getAttribute("data-theme") !== "light";
  }

  var COLOURS = {
    dark: {
      body: 0x122550, bodyRough: 0.14, bodyMetal: 0.95,
      bodyEmit: 0x0a1a40, bodyEmitInt: 0.05,
      screenEmit: 0x1d4ed8, logo: 0x2563eb, logoEmit: 0x3b82f6, logoInt: 0.8,
      keyboard: 0x0a1428, inner: 0x091020
    },
    light: {
      body: 0x4a90d9, bodyRough: 0.18, bodyMetal: 0.88,
      bodyEmit: 0x2563eb, bodyEmitInt: 0.04,
      screenEmit: 0x2563eb, logo: 0x60a5fa, logoEmit: 0x93c5fd, logoInt: 0.6,
      keyboard: 0x1a3a70, inner: 0x122558
    }
  };
  function getPalette() { return isDarkMode() ? COLOURS.dark : COLOURS.light; }

  /* ===========================================================
     SCENE
     =========================================================== */
  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 1, 500);
  camera.position.set(0, 8, 65);
  camera.lookAt(0, 2, 0);

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  /* r128 gebruikt ACESFilmicToneMapping en sRGBEncoding */
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputEncoding = THREE.sRGBEncoding;

  function fitRenderer() {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (w < 1 || h < 1) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* Meerdere passes zodat canvas zeker op maat gezet is */
  fitRenderer();
  if (document.readyState !== "complete") {
    window.addEventListener("load", function () {
      fitRenderer();
      requestAnimationFrame(fitRenderer);
    }, { once: true });
  } else {
    requestAnimationFrame(function () { requestAnimationFrame(fitRenderer); });
  }
  window.addEventListener("resize", fitRenderer, { passive: true });

  /* ---- Licht ---- */
  /* RectAreaLightUniformsLib initialiseren (r128 manier) */
  if (THREE.RectAreaLightUniformsLib) {
    THREE.RectAreaLightUniformsLib.init();
  }

  scene.add(new THREE.AmbientLight(0xccddff, 0.35));

  var keyLight = new THREE.DirectionalLight(0xe8f0ff, 2.0);
  keyLight.position.set(4, 12, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  scene.add(keyLight);

  var fillLight = new THREE.DirectionalLight(0x93c5fd, 0.7);
  fillLight.position.set(-6, 4, 3);
  scene.add(fillLight);

  var rimLight = new THREE.DirectionalLight(0x2563eb, 1.1);
  rimLight.position.set(-3, 5, -8);
  scene.add(rimLight);

  var screenLight = new THREE.RectAreaLight(0x1d4ed8, 1.8, 29.4, 20);
  screenLight.intensity = 0; /* uit tot de scroll-intro het scherm laat oplichten */

  /* ---- Environment map (RoomEnvironment via globaal THREE object) ---- */
  if (THREE.RoomEnvironment && THREE.PMREMGenerator) {
    try {
      var pmrem = new THREE.PMREMGenerator(renderer);
      var roomEnv = new THREE.RoomEnvironment();
      scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
      pmrem.dispose();
    } catch (e) {
      /* RoomEnvironment niet beschikbaar — geen env map, alleen directe lichten */
      console.info("s-story.js: RoomEnvironment niet beschikbaar, directe lichten gebruikt.");
    }
  }

  /* ===========================================================
     MATERIALEN
     =========================================================== */
  var c = getPalette();

  var bodyMat = new THREE.MeshPhysicalMaterial({
    color: c.body,
    roughness: c.bodyRough,
    metalness: c.bodyMetal,
    clearcoat: 0.3,
    clearcoatRoughness: 0.15,
    emissive: new THREE.Color(c.bodyEmit),
    emissiveIntensity: c.bodyEmitInt,
    envMapIntensity: 1.3
  });

  var darkInnerMat = new THREE.MeshStandardMaterial({
    color: c.inner, roughness: 0.8, metalness: 0.6
  });

  var keyboardMat = new THREE.MeshStandardMaterial({
    color: c.keyboard, roughness: 0.75, metalness: 0.7
  });

  var logoMat = new THREE.MeshPhysicalMaterial({
    color: c.logo,
    emissive: new THREE.Color(c.logoEmit),
    emissiveIntensity: c.logoInt,
    metalness: 0.3,
    roughness: 0.2,
    clearcoat: 1.0
  });

  var cameraDotMat = new THREE.MeshStandardMaterial({
    color: 0x050810,
    emissive: new THREE.Color(0x2563eb),
    emissiveIntensity: 0.2
  });

  /* ---- Scherm-inhoud: blauwe portfolio-mockup op canvas ---- */
  var screenCanvas = document.createElement("canvas");
  screenCanvas.width = 1470;
  screenCanvas.height = 1000;
  var sCtx = screenCanvas.getContext("2d");

  function roundRect(x, y, w, h, r) {
    if (sCtx.roundRect) {
      sCtx.beginPath();
      sCtx.roundRect(x, y, w, h, r);
      return;
    }
    sCtx.beginPath();
    sCtx.moveTo(x + r, y);
    sCtx.arcTo(x + w, y, x + w, y + h, r);
    sCtx.arcTo(x + w, y + h, x, y + h, r);
    sCtx.arcTo(x, y + h, x, y, r);
    sCtx.arcTo(x, y, x + w, y, r);
    sCtx.closePath();
  }

  function drawScreenContent() {
    var dark = isDarkMode();
    sCtx.fillStyle = dark ? "#050A18" : "#0A1830";
    sCtx.fillRect(0, 0, 1470, 1000);

    var grd = sCtx.createRadialGradient(735, 0, 0, 735, 0, 700);
    grd.addColorStop(0, dark ? "rgba(37,99,235,0.55)" : "rgba(74,144,217,0.5)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    sCtx.fillStyle = grd;
    sCtx.fillRect(0, 0, 1470, 1000);

    sCtx.fillStyle = dark ? "#0A1428" : "#122558";
    sCtx.fillRect(0, 0, 1470, 72);

    ["#EF4444", "#F59E0B", "#22C55E"].forEach(function (col, i) {
      sCtx.fillStyle = col;
      sCtx.beginPath();
      sCtx.arc(44 + i * 46, 36, 12, 0, Math.PI * 2);
      sCtx.fill();
    });

    sCtx.fillStyle = dark ? "#1A2E58" : "#1D4ED8";
    roundRect(400, 16, 670, 40, 8);
    sCtx.fill();
    sCtx.fillStyle = "rgba(255,255,255,0.5)";
    sCtx.font = "22px Inter, sans-serif";
    sCtx.textAlign = "center";
    sCtx.fillText("maartendeklerk.nl", 735, 42);

    sCtx.fillStyle = "rgba(255,255,255,0.85)";
    sCtx.font = "bold 96px Inter, sans-serif";
    sCtx.textAlign = "left";
    sCtx.fillText("Maarten de Klerk", 80, 250);

    sCtx.fillStyle = dark ? "#60A5FA" : "#93C5FD";
    sCtx.font = "42px Inter, sans-serif";
    sCtx.fillText("UI/UX Designer & Web Developer", 80, 330);

    sCtx.fillStyle = "rgba(255,255,255,0.35)";
    for (var li = 0; li < 4; li++) {
      sCtx.fillRect(80, 400 + li * 56, 600 + Math.random() * 200, 16);
    }

    [0, 1, 2].forEach(function (i) {
      var x = 80 + i * 460;
      sCtx.fillStyle = dark ? "rgba(30,60,120,0.6)" : "rgba(74,144,217,0.3)";
      roundRect(x, 600, 420, 260, 12);
      sCtx.fill();
      sCtx.fillStyle = dark ? "#2563EB" : "#3B82F6";
      roundRect(x + 20, 700, 100, 28, 14);
      sCtx.fill();
    });
  }
  drawScreenContent();

  var screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.flipY = false;

  var screenMeshMat = new THREE.MeshBasicMaterial({
    map: screenTex,
    transparent: true,
    opacity: 0,
    side: THREE.BackSide
  });

  /* ---- Thema-wisseling live toepassen ---- */
  function applyThemeColours() {
    var p = getPalette();
    bodyMat.color.setHex(p.body);
    bodyMat.roughness = p.bodyRough;
    bodyMat.metalness = p.bodyMetal;
    bodyMat.emissive.setHex(p.bodyEmit);
    bodyMat.emissiveIntensity = p.bodyEmitInt;
    bodyMat.needsUpdate = true;

    darkInnerMat.color.setHex(p.inner);
    darkInnerMat.needsUpdate = true;

    keyboardMat.color.setHex(p.keyboard);
    keyboardMat.needsUpdate = true;

    logoMat.color.setHex(p.logo);
    logoMat.emissive.setHex(p.logoEmit);
    logoMat.emissiveIntensity = p.logoInt;
    logoMat.needsUpdate = true;

    screenLight.color.setHex(isDarkMode() ? 0x1d4ed8 : 0x2563eb);

    drawScreenContent();
    screenTex.needsUpdate = true;
  }

  var themeObserver = new MutationObserver(applyThemeColours);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });

  /* ===========================================================
     GLB MACBOOK LADEN
     =========================================================== */
  var macGroup    = new THREE.Group();
  var lidGroup    = new THREE.Group();
  var bottomGroup = new THREE.Group();
  macGroup.add(lidGroup);
  macGroup.add(bottomGroup);

  /* Iets compacter dan het bronmodel (~13% kleiner), puur het model zelf —
     canvas, halo en sectiehoogte blijven ongemoeid. */
  macGroup.scale.setScalar(0.87);

  /* Startpositie: deksel dicht, hoog in het canvas (= CLOSED_POS_Y hieronder) */
  macGroup.position.set(0, 26, 0);
  macGroup.rotation.set(0.45 * Math.PI, (-0.1 * Math.PI) - (2 * Math.PI), 0);
  lidGroup.rotation.x = 0.5 * Math.PI;
  scene.add(macGroup);

  /* Animatie-constanten — de volledige timeline (openen → ronddraaien →
     sluiten) is gekoppeld aan de scrollprogressie over de hele sectie */
  /* De stage is sticky en hangt vóór het docken nog laag in de viewport;
     de laptop start daarom hóóg in het canvas (wereld-y +26) zodat hij al
     zichtbaar is terwijl de sectie binnenschuift, en daalt mee naar zijn
     open eindpositie zodra de stage bovenaan vastklikt. */
  var CLOSED_POS_Y = 26,   OPEN_POS_Y = -8;
  var CLOSED_ROT_X = 0.45 * Math.PI, OPEN_ROT_X = 0.05 * Math.PI;
  var CLOSED_ROT_Y = -0.1 * Math.PI, OPEN_ROT_Y = -0.1 * Math.PI;
  var CLOSED_LID_X = 0.5 * Math.PI,  OPEN_LID_X = -0.20 * Math.PI;
  var END_LID_X    = 0.48 * Math.PI; /* dichtgeklapt aan het eind van de sectie */

  /* Doelwaarden (gezet door onScroll) + huidige waarden (gedempt in de
     renderloop naar het doel toe, zodat elke beweging vloeiend verloopt). */
  var animTarget = { posY: CLOSED_POS_Y, rotX: CLOSED_ROT_X, rotY: CLOSED_ROT_Y, lidX: CLOSED_LID_X, screen: 0 };
  var animState  = { posY: CLOSED_POS_Y, rotX: CLOSED_ROT_X, rotY: CLOSED_ROT_Y, lidX: CLOSED_LID_X, screen: 0 };

  var loader = new THREE.GLTFLoader();
  loader.load(
    "../assets/mac-noUv.glb",
    function (glb) {

      /* Parseer het model — identiek aan origineel */
      glb.scene.children.slice().forEach(function (child) {
        if (child.name === "_top") {
          lidGroup.add(child);
          child.children.forEach(function (mesh) {
            if      (mesh.name === "lid")          { mesh.material = bodyMat; mesh.castShadow = true; }
            else if (mesh.name === "logo")         { mesh.material = logoMat; }
            else if (mesh.name === "screen-frame") { mesh.material = darkInnerMat; }
            else if (mesh.name === "camera")       { mesh.material = cameraDotMat; }
          });
        } else if (child.name === "_bottom") {
          bottomGroup.add(child);
          child.children.forEach(function (mesh) {
            if      (mesh.name === "base")     { mesh.material = bodyMat; mesh.castShadow = true; mesh.receiveShadow = true; }
            else if (mesh.name === "legs")     { mesh.material = darkInnerMat; }
            else if (mesh.name === "keyboard") { mesh.material = keyboardMat; }
            else if (mesh.name === "inner")    { mesh.material = darkInnerMat; }
          });
        }
      });

      /* Scherm-plane */
      var screenMeshObj = new THREE.Mesh(
        new THREE.PlaneGeometry(29.4, 20),
        screenMeshMat
      );
      screenMeshObj.position.set(0, 10.5, -0.11);
      screenMeshObj.rotation.set(Math.PI, 0, 0);
      lidGroup.add(screenMeshObj);

      /* Scherm-licht */
      screenLight.position.set(0, 10.5, 0);
      screenLight.rotation.set(Math.PI, 0, 0);
      lidGroup.add(screenLight);

      /* Keyboard overlay texture */
      var texLoader = new THREE.TextureLoader();
      texLoader.load(
        "../assets/keyboard-overlay.png",
        function (kTex) {
          var keyOverlay = new THREE.Mesh(
            new THREE.PlaneGeometry(27.7, 11.6),
            new THREE.MeshBasicMaterial({
              alphaMap: kTex,
              transparent: true,
              color: isDarkMode() ? 0x3b82f6 : 0x60a5fa,
              opacity: 0.35
            })
          );
          keyOverlay.rotation.set(-0.5 * Math.PI, 0, 0);
          keyOverlay.position.set(0, 0.045, 7.21);
          bottomGroup.add(keyOverlay);
        }
      );

      if (REDUCE) {
        /* Reduced motion: direct volledig open, geen scroll-gekoppelde animatie */
        macGroup.position.set(0, OPEN_POS_Y, 0);
        macGroup.rotation.set(OPEN_ROT_X, OPEN_ROT_Y, 0);
        lidGroup.rotation.x = OPEN_LID_X;
        screenMeshMat.opacity = 0.96;
        screenLight.intensity = 1.8;
      } else {
        /* Model is er nu pas — sync meteen met de huidige scrollpositie en
           snap de gedempte waarden erop (geen inhaal-animatie bij laden). */
        onScroll();
        animState.posY = animTarget.posY;
        animState.rotX = animTarget.rotX;
        animState.rotY = animTarget.rotY;
        animState.lidX = animTarget.lidX;
        animState.screen = animTarget.screen;
      }
    },
    undefined,
    function (err) {
      console.warn("s-story.js: MacBook GLB kon niet laden.", err);
    }
  );

  /* ---- Ambient deeltjes ---- */
  var PARTICLE_COUNT = 200;
  var pPos = new Float32Array(PARTICLE_COUNT * 3);
  var pVel = new Float32Array(PARTICLE_COUNT * 3);
  for (var pi = 0; pi < PARTICLE_COUNT; pi++) {
    pPos[pi * 3]     = (Math.random() - 0.5) * 110;
    pPos[pi * 3 + 1] = (Math.random() - 0.5) * 80;
    pPos[pi * 3 + 2] = (Math.random() - 0.5) * 90;
    pVel[pi * 3]     = (Math.random() - 0.5) * 0.04;
    pVel[pi * 3 + 1] = (Math.random() - 0.5) * 0.03;
    pVel[pi * 3 + 2] = (Math.random() - 0.5) * 0.04;
  }
  var pBufGeo = new THREE.BufferGeometry();
  pBufGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  scene.add(new THREE.Points(pBufGeo, new THREE.PointsMaterial({
    color: 0x3b82f6,
    size: 0.38,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })));

  /* Geen JS-pin meer voor het einde van de sectie: de sticky stage laat
     de browser zelf los zodra de container eindigt (vlak na beat 06).
     Dat is per definitie vloeiend in beide scrollrichtingen; de
     lift-fase in de timeline hieronder blendt de snelheidsovergang. */

  /* ===========================================================
     SCROLL — SVG pad + kaart-reveals + laptop open/dicht-intro
     =========================================================== */
  var pathLength = 0;
  if (svgPath) {
    pathLength = svgPath.getTotalLength ? svgPath.getTotalLength() : 5500;
    svgPath.setAttribute("stroke-dasharray", pathLength);
    svgPath.setAttribute("stroke-dashoffset", pathLength);
  }

  function runCounter(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    var target   = parseInt(el.dataset.target, 10);
    var suffix   = el.dataset.suffix || "";
    var duration = 1600;
    var start    = null;
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      el.textContent = Math.floor(ease(p) * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(step);
  }

  function onScroll() {
    var rect    = section.getBoundingClientRect();
    var total   = section.offsetHeight - window.innerHeight;
    var scrolled = clamp(-rect.top, 0, total);
    var scrollProg = total > 0 ? scrolled / total : 0;

    /* SVG-pad tekenen */
    if (svgPath && pathLength > 0) {
      svgPath.setAttribute("stroke-dashoffset", pathLength - pathLength * scrollProg);
    }

    /* ---- Laptop-timeline in drie overlappende fases:
         openen  — start zodra de sectie (en dus de pasfoto) in beeld
                   schuift, nog vóórdat de sectietop de viewport-top raakt;
                   volledig open net na het vastklikken van de sticky stage
         draaien (5% → 70% van de sectie)  volledige 360°-rotatie
         sluiten (72% → 86%)  deksel dicht, scherm dooft
         lift    (88% → 98%)  laptop drijft alvast zachtjes omhoog, zodat
                   de overgang naar de natuurlijke sticky-release (waarna
                   hij met de pagina mee omhoog scrolt) niet abrupt voelt
       onScroll zet alleen de dóelwaarden; de renderloop dempt de huidige
       waarden er per frame naartoe, zodat alles boterzacht beweegt — ook
       bij schokkerig scrollen of terugscrollen. ---- */
    if (!REDUCE) {
      var vh = window.innerHeight;
      var openRaw = clamp((vh * 0.85 - rect.top) / (vh * 0.9), 0, 1);
      var openT   = smoothstep(openRaw);
      var spinT  = smoothstep(clamp((scrollProg - 0.05) / 0.65, 0, 1));
      var closeT = smoothstep(clamp((scrollProg - 0.72) / 0.14, 0, 1));
      var liftT  = smoothstep(clamp((scrollProg - 0.88) / 0.10, 0, 1));

      /* posY volgt openRaw lineair: zo compenseert de daling vrijwel exact
         het omhoogschuiven van de sticky stage en blijft de laptop tijdens
         het hele openklappen in beeld (de demping strijkt het glad) */
      animTarget.posY = lerp(CLOSED_POS_Y, OPEN_POS_Y, openRaw) + liftT * 8;
      animTarget.rotX = lerp(CLOSED_ROT_X, OPEN_ROT_X, openT);
      animTarget.rotY = lerp(CLOSED_ROT_Y, OPEN_ROT_Y, openT) + spinT * Math.PI * 2;
      animTarget.lidX = lerp(lerp(CLOSED_LID_X, OPEN_LID_X, openT), END_LID_X, closeT);
      /* Scherm licht pas op als het deksel grotendeels open staat, en dooft
         weer zodra het sluiten begint */
      var screenT = clamp((openT - 0.6) / 0.4, 0, 1) * (1 - closeT);
      animTarget.screen = 0.96 * screenT;
    }

    /* Kaart-reveals */
    cards.forEach(function (card) {
      var beat = card.closest(".s-beat");
      if (!beat) return;
      if (beat.getBoundingClientRect().top < window.innerHeight * 0.82) {
        card.classList.add("is-visible");
        card.querySelectorAll("[data-counter]").forEach(runCounter);
      }
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ===========================================================
     RENDER LOOP
     =========================================================== */
  var clock   = new THREE.Clock();
  var pBufPos = pBufGeo.attributes.position.array;
  var lastT   = 0;

  function render() {
    requestAnimationFrame(render);
    var t  = clock.getElapsedTime();
    var dt = Math.min(t - lastT, 0.05);
    lastT = t;

    /* Gedempte beweging naar de scroll-doelwaarden — framerate-onafhankelijk */
    if (!REDUCE) {
      var damp = 1 - Math.exp(-7 * dt);
      animState.posY   = lerp(animState.posY,   animTarget.posY,   damp);
      animState.rotX   = lerp(animState.rotX,   animTarget.rotX,   damp);
      animState.rotY   = lerp(animState.rotY,   animTarget.rotY,   damp);
      animState.lidX   = lerp(animState.lidX,   animTarget.lidX,   damp);
      animState.screen = lerp(animState.screen, animTarget.screen, damp);

      macGroup.position.y   = animState.posY;
      macGroup.rotation.x   = animState.rotX;
      macGroup.rotation.y   = animState.rotY;
      lidGroup.rotation.x   = animState.lidX;
      screenMeshMat.opacity = animState.screen;
    }

    /* Logo pulse */
    logoMat.emissiveIntensity = getPalette().logoInt * (0.8 + Math.sin(t * 1.1) * 0.2);

    /* Scherm-licht schaalt mee met de schermhelderheid, met zachte puls */
    if (!REDUCE) {
      screenLight.intensity = (screenMeshMat.opacity / 0.96) * (1.6 + Math.sin(t * 0.7) * 0.3);
    } else if (screenMeshMat.opacity > 0) {
      screenLight.intensity = 1.6 + Math.sin(t * 0.7) * 0.3;
    }

    /* Deeltjes driften */
    if (!REDUCE) {
      for (var k = 0; k < PARTICLE_COUNT; k++) {
        pBufPos[k * 3]     += pVel[k * 3];
        pBufPos[k * 3 + 1] += pVel[k * 3 + 1];
        pBufPos[k * 3 + 2] += pVel[k * 3 + 2];
        if (Math.abs(pBufPos[k * 3])     > 55) pVel[k * 3]     *= -1;
        if (Math.abs(pBufPos[k * 3 + 1]) > 40) pVel[k * 3 + 1] *= -1;
        if (Math.abs(pBufPos[k * 3 + 2]) > 45) pVel[k * 3 + 2] *= -1;
      }
      pBufGeo.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }
  render();

})();
