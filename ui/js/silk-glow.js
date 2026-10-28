/* ============================================================
   silk-glow.js — Rustig glooiende gradient achter kaarten.

   Elk element met .float-glow krijgt een <canvas> met een kleine
   WebGL-fragmentshader: één vloeiende gradient in de groentinten van
   de huisstijl, met grote zachte plooien (domain warping), een smalle
   overgang licht/donker en een zachte glans waar de plooi omslaat.
   Transparant, zodat de kaart en de tekst leesbaar blijven.

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
    "void main() {",
    "  vec2 uv = gl_FragCoord.xy / uRes;",
    "  float aspect = uRes.x / uRes.y;",
    "  // Schaal naar de lange zijde (begrensd): ook een hoge, smalle kaart",
    "  // krijgt zo altijd zowel een lichte als een donkere plooi",
    "  vec2 p = vec2(uv.x * aspect, uv.y) / max(aspect, 1.0) * min(max(aspect, 1.0 / aspect) * 1.15, 2.4);",
    "  float t = uTime * 0.11;",
    "",
    "  // Domain warping: het vlak buigt zacht in zichzelf, als zijde",
    "  vec2 q = vec2(",
    "    sin(p.y * 1.25 + t * 1.6 + sin(p.x * 0.9 - t)),",
    "    sin(p.x * 1.05 - t * 1.25 + sin(p.y * 1.3 + t * 0.8))",
    "  );",
    "  vec2 r = p + 0.62 * q;",
    "  float v = 0.5 + 0.5 * sin(r.x * 1.35 + r.y * 1.05 + t * 1.9);",
    "  v = mix(v, 0.5 + 0.5 * sin(r.y * 1.9 - r.x * 0.6 - t * 1.4), 0.32);",
    "",
    "  // Minder gespreid: de overgang licht/donker zit in een smalle band",
    "  float fold = smoothstep(0.40, 0.70, v);",
    "  // Tweede, tegengestelde plooi: zo is er altijd ergens licht in de kaart",
    "  float v2 = 0.5 + 0.5 * sin(r.x * 1.1 - r.y * 1.4 - t * 1.2 + 3.14159);",
    "  fold = max(fold, smoothstep(0.45, 0.78, v2) * 0.7);",
    "  // Zijdeglans: een zachte heldere rand waar de plooi omslaat",
    "  float sheen = pow(1.0 - abs(v * 2.0 - 1.2), 8.0);",
    "",
    "  vec3 col = mix(uDeep, uMid, fold);",
    "  col = mix(col, uLight, clamp(sheen * 0.95 + fold * fold * 0.30, 0.0, 1.0));",
    "  float a = clamp(0.06 + 0.85 * fold + 0.60 * sheen, 0.0, 1.0);",
    "",
    "  // Randen zacht laten uitlopen zodat het in de kaart 'zweeft'",
    "  float vign = smoothstep(0.0, 0.22, uv.x) * smoothstep(1.0, 0.78, uv.x)",
    "             * smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.85, uv.y);",
    "  gl_FragColor = vec4(col, a * uAlpha * mix(0.35, 1.0, vign));",
    "}"
  ].join("\n");

  // Kleuren per thema (0..1). Donker: diep-, merk- en lichtgroen.
  var THEMES = {
    dark:  { deep: [0.02, 0.12, 0.03], mid: [0.15, 0.66, 0.15], light: [0.62, 0.96, 0.62], alpha: 0.40 },
    light: { deep: [0.60, 0.88, 0.60], mid: [0.196, 0.804, 0.196], light: [0.85, 0.98, 0.85], alpha: 0.24 }
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
