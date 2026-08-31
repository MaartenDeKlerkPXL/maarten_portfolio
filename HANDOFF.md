# HANDOFF — Website Maarten de Klerk

**Laatst bijgewerkt:** 2026-08-31 (avond)

## Laatste sessie-aanvulling
- **Sticky-release gefixt**: de JS-pin (checkLaptopStop/is-stopped) is volledig vervallen. Oorzaak van de verspringing: `margin-bottom: -100vh` op `.s-laptop-stage` maakte de marge-box 0 hoog waardoor CSS-sticky nooit losliet; die marge is verhuisd naar `margin-top: -100vh` op `.s-beats-wrap` (layout-equivalent) zodat de browser de sticky nu zelf vloeiend loslaat na beat 06. Extra lift-fase (88–98%) in de timeline blendt de snelheidsovergang.
- **NL-copy verbeterd** (door Erik aangevinkt): "Aan de slag." (was "Laten we bouwen."), "Waar ik goed in ben" (was "Wat ik op tafel leg"), "animaties op maat", "Laten we kennismaken.", "heats boeken", "Ontwerp én development onder één dak", "nergens aan vast". Kop "Jouw project hier?" bewust behouden. EN-pagina's ongewijzigd (Engels is de bron).

## Wat dit is
Statische portfolio-website voor Maarten de Klerk (UI/UX-designer & webdeveloper, student Hogeschool PXL). Vanilla HTML/CSS/JS, geen build-stap, geen git-repo. Tweetalig: NL onder `nl/` (default), EN onder `en/`. Gedeelde CSS in `ui/css/`, JS in `ui/js/` en `claude skills/`, media in `assets/`. Beoogd domein: **maartendeklerk.nl** (resolveert nog niet; hosting nog niet ingericht).

## Stand van zaken (sessie 2026-08-31)
Grote onderhoudsronde afgerond:

1. **Laptop-scrollanimatie** (`ui/js/s-story.js`, over/about-pagina) volledig herwerkt: één scroll-timeline (openen zodra de pasfoto in beeld komt → 360°-draai 5–70% → sluiten 72–86%), per-frame damping in de renderloop (onScroll zet alleen doelwaarden). Stage ontpint zodra beat 06 volledig in beeld is (`[data-beat="6"]`-check) zodat de skills-sectie laptop-vrij is. GSAP vervallen en verwijderd uit de heads.
2. **3D-assets lokaal**: `assets/mac-noUv.glb` + `assets/keyboard-overlay.png` (voorheen hotlink naar ksenia-k.com).
3. **Video's**: `assets/music-match.mp4` en `assets/blender-render-3d.mp4` (hernoemd vanaf de originele bestandsnamen), beide geremuxt met `+faststart`. Lightbox (`claude skills/video-lightbox.js`) heeft nu Enter/spatie-activatie en een focus-trap; de kaarten zijn `div[role=button][tabindex=0]` (geldige HTML).
4. **SEO**: canonical + hreflang (nl/en/x-default) + OG/Twitter-meta op alle 8 pagina's, `sitemap.xml`, `robots.txt` met Sitemap-regel, root-`index.html` met taalredirect (noindex). Alles gebaseerd op domein maartendeklerk.nl — **aanpassen als de site elders komt te staan**.
5. **Bugfixes**: Campus Karting-kaarten op beide homepages linkten naar Einklang → nu naar de juiste Figma-proto's; theme-toggle aria-label taalafhankelijk; theme-color-meta wisselt mee met het thema; dubbele rAF-loop-race gefixt in `ui/js/three-scene.js` en `claude skills/hero-cards.js`; dode `about-canvas`-scene verwijderd; filterknoppen van tabs-ARIA naar `aria-pressed`; hero-naam screenreader-proof (sr-only + aria-hidden letters); Three.js-scripts nu `defer`; 3 ongebruikte scripts van de contactpagina's af; 4 zware PNG-fallbacks vervangen door JPEG (PNG's verwijderd; webp blijft primair).
6. Placeholder-beschrijvingen Music Match / Blender Render 3D vervangen door echte tekst (NL+EN) — **check even bij Maarten of die kloppen**.

## Lokaal testen
- Preview-server: `maarten-site` in `.claude/launch.json` (python http.server, poort 7795) — **speelt geen video af** (geen Range-support). Voor video's: node-rangeserver in de sessie-scratchpad gebruiken of even `npx http-server`. Productie-hosting heeft hier geen last van.
- Browser-pane-screenshots kunnen zwart zijn als de pane hidden is; Chrome-tabs stellen video-laden en reveal-animaties uit zolang de tab niet zichtbaar is (geen site-bug).

## Open punten
- Hosting + DNS voor maartendeklerk.nl inrichten; daarna canonical/OG-URL's verifiëren.
- Beschrijvingen videokaarten laten bevestigen door Maarten.
- Nog uit de audit, laag prio: unpkg/cdnjs-scripts eventueel self-hosten; og:image is nu de pasfoto (700×641) — een echte 1200×630-banner zou mooier zijn.

## Eerste bericht volgende sessie
"Lees 'Website Maarten de Klerk/HANDOFF.md' en ga verder."
