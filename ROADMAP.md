# Douglas Designer — ontwikkelroadmap

> **Levend productplan | bijgewerkt 25 oktober 2026.** Dit is de beoogde volgorde, geen belofte over release-data of definitieve scope. Elke versie volgt pas op de vorige als de acceptatiecriteria zijn gecontroleerd.

## Productdoel

Een intuïtieve, Nederlandstalige 2D/3D-ontwerper voor Douglas buitenkeukens en andere Douglas constructies. De gebruiker moet eenvoudig kunnen **tekenen → aanpassen → constructie controleren → materialen berekenen → zaaglijst/export maken**.

**Ontwerpprincipe:** het gemak van een 2D-planner combineren met een betrouwbare 3D-controle. Geen visuele trucs die afwijken van de maten of de zaaglijst.

## Actuele stand (gecontroleerd op 25-10-2026)

- **Op `main`:** de wijzigingen uit [PR #6](https://github.com/eelbrethouwer-jpg/Douglas-designer/pull/6) en [PR #7](https://github.com/eelbrethouwer-jpg/Douglas-designer/pull/7) zijn inmiddels samengevoegd. Automatische framebalken zijn bewerkbaar; er is een wereldruimte-WebGL-renderer met rasteropties, magnetische aansluitpunten, 2D pannen en Studio-sneltoetsen.
- **Extra kwaliteitsborging in concept:** [PR #9](https://github.com/eelbrethouwer-jpg/Douglas-designer/pull/9): productspecificatie, extra 3D- en assettests en expliciete PWA-cachecorrecties. Deze wijzigingen zijn nog niet publiek vrijgegeven.
- **Bekende tekortkoming:** het werkblad vertoont vanuit sommige kijkhoeken gaten of overliggende vormen; 3D-weergave moet betrouwbaarder.
- **Nog geen bouwgereed CAD-systeem:** draagkracht, verbindingsterkte, hitteafstanden en apparaatventilatie worden niet bewezen door de huidige visualisatie.

## Roadmap in volgorde

| Fase | Beoogde versie | Onderwerp | Prioriteit | Status |
|---|---|---|---|---|
| 1 | v0.5.1 | Bestaande automatische frames selecteren, verplaatsen, verlengen, herstellen | P0 | Code samengevoegd; fysieke iPhone-acceptatie open |
| 2 | v0.6.x | Betrouwbaar gesloten werkblad, dieptebuffer en 3D in alle camerahoeken | P0 | Renderer technisch vernieuwd; visueel nog niet geverifieerd |
| 3 | v0.6.0 RC | Studio-basis: 2D pannen, raster, magneet, toetsen en nieuwe GPU-geometrie | P1 | Code samengevoegd; volledige visuele acceptatie open |
| 4 | v0.7.0 RC | Room Capture, ruimteplaatsing, foto-preview en kleurbibliotheek | P1 | Concept-PR #10, acceptatie open |
| 5 | v0.8.0 | Volledige 3D-materialen, apparaatmodellen en constructieve verbindingen | P1 | Gepland |
| 6 | v0.9.0 | Materiaallijst, geoptimaliseerde zaaglijst en bouwdocumenten | P1 | Gepland |
| 7 | v0.10.0 | Multi-projectbeheer, sterke mobiele UX en PWA-updates | P1 | Gepland |
| 8 | v1.0.0 | Stabiele eerste productieversie + complete acceptatietest | P1 | Gepland |

### Fase 1 — Bewerkbare frames (v0.5.1, PR #6)

**Waarom:** de gebruiker moet automatische stijlen/regels even eenvoudig kunnen bewerken als toegevoegde balken.

- Selecteren via 3D én via een compacte lijst in het linkermenu.
- Verplaatsen in X/Y/Z; verlengen/inkorten met handvatten of exacte millimeters.
- Dupliceren, uitschakelen, één balk of volledig frame herstellen.
- Aangepaste onderdelen blijven geïdentificeerd en opgeslagen na herladen.
- Wijzigingen worden doorgerekend in de zaaglijst; undo/redo werkt.
- Expliciete waarschuwing dat gewijzigde frames niet automatisch constructief gevalideerd zijn.

**Acceptatie:** een bestaande framebalk minimaal tweemaal wijzigen, herladen, exporteren/importeren, undo/redo, correct resultaat in 3D en zaaglijst; ook testen in mobiele Safari. Bij verandering van modulebreedtes expliciet testen hoe handmatige frame-afwijkingen zich gedragen.

### Fase 2 — 3D-weergave herstellen (v0.5.x; harde blokkade)

**Waarom:** open vlakken, transparante werkbladen en verkeerde dieptevolgorde ondermijnen het vertrouwen.

- Werkblad als één logisch gesloten 3D-object met boven-/ondervlak en zijkanten.
- Geen ongewenste uitsparingen; later alleen expliciete kamado- of spoelbakopeningen.
- Correcte dieptebuffer, winding/culling, transparantie en camera-projectie.
- Geen doorkijkende bovenregels/apparaten; visueel correcte opleggingen.
- Juiste selectie van zichtbare balken, ook bij overlappende geometrie.
- Screenshots/regressiebeelden vanuit voor, achter, links, rechts, boven, onder en meerdere vrije 3D-hoeken.
- WebGL én een duidelijk degradeerpad voor apparaten zonder WebGL. PNG-export moet kloppen.

**Acceptatie:** geen gaten, flikkeringen of doorschijnende onderdelen bij volledig rondom draaien; dezelfde maten/zaaglijst voor en na renderwijziging; gecontroleerd in Chrome desktop en Safari iPhone.

### Fase 3 — Tekenervaring (v0.6.0)

- Start met **Leeg project** of **Moduleproject**, zonder ongevraagd frame.
- 2D tekenen met beginpunt → eindpunt, live lengte, raster/snapping en Escape/annuleren.
- Selecteren, verplaatsen, verlengen, inkorten, kopiëren, verwijderen, groeperen.
- Herkenbare handvatten, precisie-invoer, instelbare rasterstappen (bijv. 5/10/50 mm).
- Vastzetten op eindpunten, hulplijnen en zichtbaar verschil tussen vrij/nabij passend/precies passend.
- Één-finger tekenen en selecteren, twee-finger navigeren/zoomen op mobiel; voorspelbare orbit op desktop.
- Object kunnen isoleren of tijdelijk verbergen voor nauwkeurig werken.

**Acceptatie:** tien balken achter elkaar tekenen en bewerken zonder onbedoeld draaien of verspringen; verplaatsen en passend maken blijft na elke bewerking mogelijk.

### Fase 4A — Room Studio (v0.7.0, PR #10)

De productprioriteit is op 25 oktober gewijzigd: foto-ondersteund ontwerpen in een herkenbare ruimte gaat vóór uitgebreidere bouwkundige verbindingen.

- Een JPEG-foto lokaal importeren en vier vloerhoeken handmatig markeren.
- Ruimtebreedte, -diepte en -hoogte **handmatig bevestigd**, onafhankelijk van de foto.
- Vloer/achterwand/zijwand in 3D; keuken in X/Z verplaatsen en per 90 graden draaien.
- Overlapwaarschuwingen; plaatsing verandert niet de onderdelen en zaaglengtes.
- Kleurcatalogus en eenvoudige front-/ladevarianten, 66 generieke referenties.
- Schematische foto-overlay (niet bouwmaatvast en niet fotorealistisch).
- Projecten met foto blijven in eigen JSON-back-up bewaarbaar; andere v0.6-functies blijven werken.

**Release-gates:** volledige regressieset, Chrome desktop, Safari op echte iPhone, alle camera-hoeken, export/import, geen dataverlies. Productversie pas na acceptatie.

**Niet inbegrepen in deze eerste RC:** automatische AI-3D-reconstructie, PBR en echte 3D-merkenbibliotheek. Die blijven vervolgwerk.

### Fase 4B — Houtconstructie en verbindingen (doorgeschoven naar v0.8.0)

- Per balk instelbare doorsnede en oriëntatie (standaard 50 × 100 mm, later andere Douglas profielen).
- Eenduidige werkelijke 3D-maatvoering; geen renderpositie die afwijkt van zaagmaat.
- Oplegging op stijlen, tussen twee balken, dwarsregels en schoren als **expliciete** constructieregels.
- Visuele conflictcontrole: overlap, ontbrekende steunpunten, balken buiten het ontwerp.
- Verbindingstypen als aparte ontwerpkeuze, met waarschuwingen waar technische validatie ontbreekt.
- Veranderingen in automatische modules mogen handmatige balkbewerkingen niet stilzwijgend wissen.

**Acceptatie:** elk getekend onderdeel heeft traceerbare profiel-, positie- en lengtedata; wijziging in de constructie geeft reproduceerbare waarschuwingen en materiaaluitvoer.

### Fase 5 — Buitenkeukenmodules (v0.8.0)

- Instelbare ladekast, deuren, open vak, koelkast- en kamadovak.
- Werkblad als bewerkbaar object: overstek, hoogte, dikte, materiaal en **bewust gekozen** uitsparingen.
- Apparaten met werkelijk in te voeren fabrikantmaten en zichtbaar onderscheid tussen voorbeeld en echte gegevens.
- Koelkastventilatie / servicetoegang en kamado-hitteafstand als expliciete te controleren eisen.
- Uitrolplateau kamado, losse lades/deuren en optioneel uitklapbaar werkblad.

**Acceptatie:** het voorbeeldontwerp is volledig te configureren zonder dat panelen, draagbalken of uitsparingen visueel conflicteren. Er worden geen veilige afstanden verzonnen.

### Fase 6 — Materiaallijst en bouwen (v0.9.0)

- Onderdelenlijst met uniek ID, naam, profiel, lengte, aantallen en plaats in ontwerp.
- Zaagplan per handelslengte met instelbare zaagsnede, aantallen, reststukken en controle op te lange delen.
- Douglas balken, panelen/platen, werkblad, beslag en bevestiging **apart** opgenomen.
- Materiaalprijzen als eigen invoer, inclusief expliciete aannames; geen fictieve prijs als live prijs presenteren.
- Maattekeningen: voor, zij, boven, detail en onderdelenlijst; PDF/print en CSV als exports.
- Wijzig je een balk, dan zijn model en uitvoer altijd synchroon.

**Acceptatie:** controle van meerdere handmatig nagerekende voorbeeldconstructies; geen ontbrekende of dubbele zaagstukken; duidelijk label 'ontwerpraming' zolang structurele validatie ontbreekt.

### Fase 7 — Projecten en mobiele afwerking (v0.10.0)

- Meerdere projecten met eigen naam en overzicht in plaats van één lokaal actief ontwerp.
- Veilig opslaan, import/export, terugzetten, versiemigratie en back-up vóór destructieve acties.
- Zichtbare 'opgeslagen'-status en betrouwbare cache-update met herkenbare app-versie.
- Vaste, compacte mobiele bediening zonder overlapping van canvas, werkbalken en eigenschappenpaneel.
- iPhone Safari-test op touch, pinch, schermrotatie, installatie op beginscherm en offline modus.
- Prestatiecontrole voor kleine én grote ontwerpen.

**Acceptatie:** wisselen tussen twee projecten zonder gegevensverlies; bestaande v0.1–v0.5-projecten blijven importeerbaar; updates tonen niet langdurig een oude app-versie.

### Fase 8 — Eerste stabiele release (v1.0.0)

- Volledige end-to-end tests: leeg → tekenen → bewerken → opslaan → heropenen → lijst → export.
- Meerdere echte voorbeeldbouwprojecten met gecontroleerde maatvoering.
- Documentatie, duidelijke waarschuwingen, mobiel/desktop acceptatietest en heldere GitHub release notes.
- Geen bekende kritieke 3D- of opslagbugs.

**Let op:** v1.0 betekent betrouwbare **ontwerpsoftware**, geen automatisch door een constructeur goedgekeurd bouwplan.

## Later, niet vóór stabiele basis

- Bibliotheek met balkprofielen, houtsoorten, afwerkingen, bevestigingsmiddelen en herbruikbare constructieblokken.
- Vrije schuine balken, complexere houtverbindingen en echte CNC-/CAD-export.
- Foto/referentie als onderlegger, meetgereedschap en optioneel 3D-import.
- Optionele cloudopslag en projectsynchronisatie tussen telefoon en computer.
- Eventuele constructieve controles uitsluitend met gevalideerde berekeningen en duidelijk afgebakende verantwoordelijkheid.

## Altijd geldende release-eisen

1. De actuele `main`-branch is bron van waarheid; elke release in een **eigen branch/PR**.
2. Eerst acceptatiecriteria; dan implementatie; daarna model- en UI-regressietests.
3. Bestaande projecten, opslag, zaaglijst en undo/redo behouden of expliciet migreren.
4. Controleer wijzigingen in 2D, 3D, mobiel en desktop; verklaar wat niet is getest.
5. **GitHub Actions groen is nodig, maar niet voldoende** voor een UX-release; kritieke bediening en visuele fouten vragen handmatige acceptatie.
6. Geen automatisch mergen/publiceren van releasekandidaten zonder acceptatie.
7. Geen ongeverifieerde claims over draagkracht, hitteveiligheid, ventilatie, of exacte materiaalkosten.

## Werkproces

- Eén afgebakende release, bugfix of feature per chat; dit bestand is de centrale roadmap.
- Nieuwe ideeën bij de juiste fase plaatsen; P0-render-, opslag- en dataverliesbugs komen vóór nieuwe functies.
- Na iedere afgeronde release: dit document bijwerken (status, ontdekte regressies, volgende acceptatiecriteria).
