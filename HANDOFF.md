# HANDOFF — Website Maarten de Klerk

**Laatst bijgewerkt:** 2026-10-09

## Sessie-aanvulling 2026-10-09
- **Agro Tycoon 2.0** toegevoegd bovenaan de projecten (NL + EN), met uitklappaneel (Idee, Spel, Techniek), link naar https://agro.mdeklerk.online/ en screenshot `assets/agro-tycoon.(webp|jpg)` (headless Chrome, 1440 px breed, uitleg overgeslagen, verkleind naar 1100 px). Eigen project; de paneeltekst is door Claude geschreven op basis van de README van `MaartenDeKlerkPXL/agro-tycoon2.0` en de game zelf.
- **Verwijderd**: Einklang, T-Dakwerken, Klein Genot, Autogarage en BarberMo (kaarten en afbeeldingen). Er staan nu 15 projecten; de vaste terugvalwaarde van de projectteller staat op 15.
- **Uitklappanelen**: bij sluiten van een verschoven middenkaart klapt eerst het paneel in, daarna wordt het achter de kaart geparkeerd en pas dan schuift de kaart terug. Zo steekt het paneel nooit tijdelijk buiten de grid.


## Sessie-aanvulling 2026-10-04: uitklappanelen op de projectenpagina
- **Wat**: tien projectkaarten (Mr. Cookies, Furnilux, JPJ Fotografie, Spirithorses, Zeecontainers Concept, Rijschool Will, Campus Karting App, Campus Karting Website, IBE Motion, BrightNews) hebben een uitgebreide beschrijving in een paneel, plus een nieuwe korte kaarttekst. Teksten letterlijk van Maarten, NL en EN. De overige kaarten zijn ongewijzigd. Klikken op de kaart opent nog steeds de live site of het Figma-prototype; onderaan het paneel staat een link met dezelfde tekst als de overlay.
- **Bestanden**: `nl/projecten.html` en `en/projects.html` (per kaart: `.reveal-wrap.has-details` > `.project-unit` met kaartlink + `.project-details`-paneel, en daarbuiten de knop `.project-details__toggle`), `ui/css/components.css` (blok "Uitklappanelen" direct na `.project-card__tags`), nieuw script `ui/js/project-details.js` (geladen op beide projectenpagina's, gestart via `initProjectDetails` in `ui/js/main.js`), en `claude skills/tilt.js` (pauzeert via `.is-tilt-paused` en reset via het event `tilt:reset`).
- **Kolompositie**: bij elke opening opnieuw bepaald uit `getBoundingClientRect` van de kaart ten opzichte van de grid, met het aantal kolommen uit de berekende `grid-template-columns`. Nooit `nth-child`, dus het klopt ook na filteren en bij elke schermbreedte. Vanaf drie kolommen is het paneel twee kaarten breed (`--details-span: 2`, tekst dan in twee kolommen), bij twee kolommen één kaart. Linkerkolom: paneel naar rechts. Rechterkolom: paneel naar links. Middenkolom: de kaart schuift één kolom naar links (`.is-shifted`) en het paneel klapt daarna naar rechts uit. Het paneel is minstens even hoog als de kaart en groeit mee met de tekst, zodat alles altijd leesbaar is zonder te scrollen; het begint 14 px onder de kaart, zodat kaart en paneel naadloos in elkaar overlopen. Dicht ligt het paneel exact achter de kaart, zodat er nooit horizontale scroll ontstaat. Hover-delay 120 ms in, 200 ms uit; er is steeds maar één paneel open. Een filterklik of resize sluit direct.
- **Toegankelijkheid**: paneel opent bij zichtbare toetsenbordfocus, Escape sluit en laat de focus op de kaart. De beschrijving staat altijd in de DOM en hangt via `aria-describedby` aan de kaartlink.
- **Touch en één kolom**: bij `(hover: none)` of één kolom krijgt de grid `.is-details-accordion`. Dan staat onder elke kaart de knop "Lees meer" / "Read more" (buiten de `<a>`), die het paneel als accordeon onder de kaart openklapt.
- **Reduced motion**: er schuift niets. De middenkolom klapt dan één kaart breed naar links uit in plaats van te verschuiven, en het paneel verschijnt met alleen een fade van 0,15 s.

## Eerdere sessie-aanvulling (2026-08-31)
- **Sticky-release gefixt**: de JS-pin (checkLaptopStop/is-stopped) is volledig vervallen. Oorzaak van de verspringing: `margin-bottom: -100vh` op `.s-laptop-stage` maakte de marge-box 0 hoog waardoor CSS-sticky nooit losliet; die marge is verhuisd naar `margin-top: -100vh` op `.s-beats-wrap` (layout-equivalent) zodat de browser de sticky nu zelf vloeiend loslaat na beat 06. Extra lift-fase (88–98%) in de timeline blendt de snelheidsovergang.
- **NL-copy verbeterd** (door Erik aangevinkt): "Aan de slag." (was "Laten we bouwen."), "Waar ik goed in ben" (was "Wat ik op tafel leg"), "animaties op maat", "Laten we kennismaken.", "heats boeken", "Ontwerp én development onder één dak", "nergens aan vast". Kop "Jouw project hier?" bewust behouden. EN-pagina's ongewijzigd (Engels is de bron).

## Wat dit is
Statische portfolio-website voor Maarten de Klerk (UI/UX-designer & webdeveloper, student Digitale Vormgeving aan Hogeschool PXL). Vanilla HTML/CSS/JS, geen build-stap. Git-repo: `MaartenDeKlerkPXL/maarten_portfolio` (pushen als dat GitHub-account). Tweetalig: NL onder `nl/` (default), EN onder `en/`. Gedeelde CSS in `ui/css/`, JS in `ui/js/` en `claude skills/`, media in `assets/`. Domein: **mdeklerk.online**, live via GitHub Pages (CNAME in de repo).

## Stand van zaken (sessie 2026-08-31)
Grote onderhoudsronde afgerond:

1. **Laptop-scrollanimatie** (`ui/js/s-story.js`, over/about-pagina) volledig herwerkt: één scroll-timeline (openen zodra de pasfoto in beeld komt → 360°-draai 5–70% → sluiten 72–86%), per-frame damping in de renderloop (onScroll zet alleen doelwaarden). Stage ontpint zodra beat 06 volledig in beeld is (`[data-beat="6"]`-check) zodat de skills-sectie laptop-vrij is. GSAP vervallen en verwijderd uit de heads.
2. **3D-assets lokaal**: `assets/mac-noUv.glb` + `assets/keyboard-overlay.png` (voorheen hotlink naar ksenia-k.com).
3. **Video's**: `assets/music-match.mp4` en `assets/blender-render-3d.mp4` (hernoemd vanaf de originele bestandsnamen), beide geremuxt met `+faststart`. Lightbox (`claude skills/video-lightbox.js`) heeft nu Enter/spatie-activatie en een focus-trap; de kaarten zijn `div[role=button][tabindex=0]` (geldige HTML).
4. **SEO**: canonical + hreflang (nl/en/x-default) + OG/Twitter-meta op alle 8 pagina's, `sitemap.xml`, `robots.txt` met Sitemap-regel, root-`index.html` met taalredirect (noindex). Alles gebaseerd op domein mdeklerk.online — **aanpassen als de site elders komt te staan**.
5. **Bugfixes**: Campus Karting-kaarten op beide homepages linkten naar Einklang → nu naar de juiste Figma-proto's; theme-toggle aria-label taalafhankelijk; theme-color-meta wisselt mee met het thema; dubbele rAF-loop-race gefixt in `ui/js/three-scene.js` en `claude skills/hero-cards.js`; dode `about-canvas`-scene verwijderd; filterknoppen van tabs-ARIA naar `aria-pressed`; hero-naam screenreader-proof (sr-only + aria-hidden letters); Three.js-scripts nu `defer`; 3 ongebruikte scripts van de contactpagina's af; 4 zware PNG-fallbacks vervangen door JPEG (PNG's verwijderd; webp blijft primair).
6. Placeholder-beschrijvingen Music Match / Blender Render 3D vervangen door echte tekst (NL+EN) — **check even bij Maarten of die kloppen**.

## Lokaal testen
- Preview-server: `maarten-site` in `.claude/launch.json` (python http.server, poort 7795) — **speelt geen video af** (geen Range-support). Voor video's: node-rangeserver in de sessie-scratchpad gebruiken of even `npx http-server`. Productie-hosting heeft hier geen last van.
- Browser-pane-screenshots kunnen zwart zijn als de pane hidden is; Chrome-tabs stellen video-laden en reveal-animaties uit zolang de tab niet zichtbaar is (geen site-bug).

## Open punten
- Bij Spirithorses, Zeecontainers, Rijschool Will, IBE Motion, BrightNews en Agro Tycoon ontbreekt nog een "Volgende keer". Maarten levert die eventueel aan.
- Maarten checkt de door Claude geschreven paneeltekst van Agro Tycoon.
- De BrightNews-kaart linkt naar een binnenkort-pagina tot de lancering.
- Maarten checkt nog of Rijschool Will een klant is geworden. Zo ja, dan gaat "demo" uit de tekst.
- Maarten checkt zijn rol bij de Campus Karting-website.
- Bij twee kolommen (ca. 700–1000 px breed) is het paneel maar één kaart breed en wordt het dus flink hoger dan de kaart. Kortere teksten zouden dat compacter maken.
- Beschrijvingen videokaarten laten bevestigen door Maarten.
- Laag prio: unpkg/cdnjs-scripts (Three.js) eventueel self-hosten.
- (Afgerond: de site staat live op mdeklerk.online via GitHub Pages, en de og:image is een echte 1200×630-banner.)

## Eerste bericht volgende sessie
"Lees 'Website Maarten de Klerk/HANDOFF.md' en ga verder."
