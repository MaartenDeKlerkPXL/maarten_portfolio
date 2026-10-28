/* ============================================================
   silk-glow.js — Rustig glooiende "zijde"-golven achter kaarten.

   Elk element met .float-glow krijgt een <canvas> met een kleine
   WebGL-fragmentshader: een paar lagen golven in de groentinten van
   de huisstijl, elk met een heldere kam, een korte gradient naar
   donker en subtiele lijntjes erin. Transparant, zodat de kaart en
   de tekst erdoorheen leesbaar blijven.

   - Animeert alleen als de kaart in beeld is en het tabblad zichtbaar.
   - prefers-reduced-motion: één stilstaand beeld, geen animatie.
   - Geen WebGL: niets aan de hand, de CSS-gloed (.float-glow::after)
     blijft dan gewoon staan.
   Exposes: window.initSilkGlow()
   ============================================================ */
(function () {
  "use strict";

  var VERT = [
    "attribute vec2 aPos;",
    "void main() { gl_Position = vec4(aPos, 0.0, 1.0); }"
  ].join("\n");

  var FRAG = [
    "precision mediump float;",
    "uniform vec2 uRes;",
    "uniform float uTime;",
    "uniform float uAlpha;",
    "uniform vec3 uDeep;",
    "uniform vec3 uMid;",
    "uniform vec3 uLight;",
    "",
    "// Eén golflaag: alles onder de golflijn is 'stof'. Helder bij de kam,",
    "// donkerder naar beneden (korte overgang), met een dunne glanslijn op",
    "// de kam en fijne lijntjes die de golf volgen.",
    "vec4 layer(vec2 p, float base, float amp, float f1, float f2, float sp, float ph, vec3 col) {",
    "  float y = base",
    "    + amp * sin(p.x * f1 + uTime * sp + ph)",
    "    + amp * 0.55 * sin(p.x * f2 - uTime * sp * 0.73 + ph * 1.7);",
    "  float d = y - p.y;                       // > 0: onder de kam",
    "  float aa = 1.5 / uRes.y;",
    "  float inside = smoothstep(-aa, aa, d);",
    "  float shade = exp(-d * 7.0);             // korte gradient naar donker",
    "  float crest = exp(-d * 140.0);           // glanslijn op de kam",
    "  float lines = smoothstep(0.82, 1.0, sin(d * 160.0 + p.x * 3.0)) * 0.22 * exp(-d * 3.5);",
    "  vec3 c = col * (0.30 + 0.85 * shade) + col * crest * 0.9 + col * lines;",
    "  float a = inside * clamp(0.18 + 0.82 * shade + crest + lines, 0.0, 1.0);",
    "  return vec4(c, a);",
    "}",
    "",
    "vec4 over(vec4 top, vec4 under) {",
    "  float a = top.a + under.a * (1.0 - top.a);",
    "  vec3 c = (top.rgb * top.a + under.rgb * under.a * (1.0 - top.a)) / max(a, 0.0001);",
    "  return vec4(c, a);",
    "}",
    "",
    "void main() {",
    "  vec2 uv = gl_FragCoord.xy / uRes;",
    "  float aspect = uRes.x / uRes.y;",
    "  vec2 p = vec2(uv.x * aspect, uv.y);",
    "  vec4 col = vec4(0.0);",
    "  // achter → voor",
    "  col = over(layer(p, 0.70, 0.075, 1.6, 2.9, 0.32, 0.0, uDeep), col);",
    "  col = over(layer(p, 0.50, 0.090, 1.2, 2.3, 0.26, 2.1, uMid), col);",
    "  col = over(layer(p, 0.30, 0.080, 1.9, 3.4, 0.38, 4.2, uLight), col);",
    "  // Rand van de kaart zacht laten uitlopen",
    "  float vign = smoothstep(0.0, 0.18, uv.x) * smoothstep(1.0, 0.82, uv.x);",
    "  gl_FragColor = vec4(col.rgb, col.a * uAlpha * mix(0.55, 1.0, vign));",
    "}"
  ].join("\n");

  // Kleuren per thema (0..1). Donker: diep-, merk- en lichtgroen.
  var THEMES = {
    dark:  { deep: [0.07, 0.36, 0.07], mid: [0.196, 0.804, 0.196], light: [0.48, 0.88, 0.48], alpha: 0.42 },
    light: { deep: [0.12, 0.48, 0.12], mid: [0.196, 0.804, 0.196], light: [0.55, 0.90, 0.55], alpha: 0.30 }
  };

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(log);
    }
    return sh;
  }

  function setup(host, reduce) {
    var canvas = document.createElement("canvas");
    canvas.className = "float-glow__canvas";
    canvas.setAttribute("aria-hidden", "true");
    var gl = canvas.getContext("webgl", { premultipliedAlpha: false, alpha: true, antialias: false })
          || canvas.getContext("experimental-webgl");
    if (!gl) return null;

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    // Eén tekenbeurt over een lege buffer: geen blending nodig (rechte alpha)

    var U = {
      res: gl.getUniformLocation(prog, "uRes"),
      time: gl.getUniformLocation(prog, "uTime"),
      alpha: gl.getUniformLocation(prog, "uAlpha"),
      deep: gl.getUniformLocation(prog, "uDeep"),
      mid: gl.getUniformLocation(prog, "uMid"),
      light: gl.getUniformLocation(prog, "uLight")
    };

    host.insertBefore(canvas, host.firstChild);
    host.classList.add("has-silk");

    // Iets lagere resolutie: de golven zijn zacht, dat scheelt veel rekenwerk
    var scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.75;
    function resize() {
      var w = Math.max(1, Math.round(host.clientWidth * scale));
      var h = Math.max(1, Math.round(host.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    var start = performance.now() - Math.random() * 20000; // elke kaart een eigen fase
    function draw(now) {
      resize();
      var t = THEMES[document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"];
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.time, reduce ? 6.0 : (now - start) / 1000);
      gl.uniform1f(U.alpha, t.alpha);
      gl.uniform3fv(U.deep, t.deep);
      gl.uniform3fv(U.mid, t.mid);
      gl.uniform3fv(U.light, t.light);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    return { host: host, draw: draw, visible: false };
  }

  window.initSilkGlow = function () {
    var hosts = document.querySelectorAll(".float-glow");
    if (!hosts.length) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var items = [];
    hosts.forEach(function (host) {
      try {
        var it = setup(host, reduce);
        if (it) items.push(it);
      } catch (e) {
        /* Shader of context faalt: CSS-gloed blijft staan */
      }
    });
    if (!items.length) return;

    if (reduce) {
      // Eén stilstaand beeld per kaart, opnieuw bij resize of themawissel
      var still = function () { items.forEach(function (it) { it.draw(0); }); };
      still();
      window.addEventListener("resize", still);
      new MutationObserver(still).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return;
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          items.forEach(function (it) { if (it.host === e.target) it.visible = e.isIntersecting; });
        });
      }, { rootMargin: "100px" });
      items.forEach(function (it) { io.observe(it.host); });
    } else {
      items.forEach(function (it) { it.visible = true; });
    }

    function loop(now) {
      if (!document.hidden) {
        items.forEach(function (it) { if (it.visible) it.draw(now); });
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.initSilkGlow);
  } else {
    window.initSilkGlow();
  }
})();
