## Ongepubliceerd — kaderselectie en foto-achtergrond

- Kaderselectie: sleep op lege ruimte in een 2D-aanzicht (of Ctrl/Cmd+slepen in elk aanzicht) om meerdere balken te selecteren; links→rechts = volledig binnen, rechts→links = ook rakend; Shift voegt toe. Groep samen verslepen, numeriek verplaatsen, kopiëren, verwijderen (undo-stap per actie). In 2D pan je nu met Shift+slepen of de middelste muisknop.
- Foto-achtergrond (knop 🖼 Foto): foto kiezen/maken als achtergrond in Voor/Zij/Boven-aanzicht, schaal instellen met twee punten en een bekende afstand, verslepen, zichtbaarheid. Geen perspectiefcorrectie; foto blijft lokaal en gaat niet mee in deel-links.

## v1.0.0-rc1 — release candidate

- Meerdere projecten (aanmaken, dupliceren, hernoemen, prullenbak, back-up/herstel); oude opslag blijft ongemoeid als back-up.
- Zaaglijst en materiaallijst per balkprofiel; instelbare aannames en eigen prijzen; CSV-export.
- Werkblad-instellingen, apparaatmaten met pasvorm-waarschuwingen, conflictcontrole (overlap, niet-ondersteunde balken).
- Bouwdocument: onderdelenlijst met codes, aanzichten (voor/zij/boven) met maatlijnen, printbaar, CSV.
- Delen zonder server: link of `.douglas.json` (laptop → telefoon); aanleveren van foto's en maten (telefoon → laptop), met validatie van binnenkomende data.
- Meten-tool (M) en reeks kopiëren.
- `tools/browser-check.js` en `tools/e2e.js`: echte-browsertests (Chrome headless).
- Bekende beperkingen: geen iPhone-test, geen Push/Pull of multi-select, eenvoudige verbindingstypen, geen constructeursvalidatie.

## Ongepubliceerd — materiaallijst (voorstel voor roadmap fase 6)

- Nieuw `materials.js`: berekent uit het model een materiaallijst naast het zaagplan: RVS-schroeven (uit het aantal verbindingen/contactpunten tussen balken), werkblad en frontpanelen (m²), scharnieren en ladegeleiders, apparatuur (alleen telbaar) en olie/beits.
- Aantallen die niet uit de geometrie komen (schroeven per verbinding, scharnieren per deurenkast, dekking olie, reserve) zijn zichtbare, instelbare aannames in het project (`project.materials`).
- Prijzen zijn uitsluitend eigen invoer per regel; geen live prijzen. Totaal telt alleen regels met ingevulde prijs. Balkprijs blijft uit de zaaginstellingen komen.
- Export: lijst kopiëren en CSV (puntkomma, decimale komma) voor Excel.
- Oude projectbestanden zonder `materials` laden met standaardwaarden. Service worker-cache `rc2`.
- 11 nieuwe tests (108 totaal). Nog niet gecontroleerd op iPhone Safari/PWA of met een echte handmatige narekening van een bouwproject.

## v0.3.0 — 3D camera, balkenpalet en passend maken

- Vrij orbitten boven en onder, onderaanzicht.
- Typen balken slepen of aantikken en plaatsen op het canvas.
- Automatisch geometrisch passend maken met terugval naar instelbare lengte.
- 20 automatische tests, geen fysieke iPhone-test voltooid.

# Release notes

## v0.1.0 — Eerste ontwerpstudio (releasekandidaat)

- Interactief 3D-ontwerp met front-, zij- en bovenaanzicht.
- Vijf keukenmodules: laden, koelkast, kamado, deuren en open vak.
- Handmatige Douglas balken met XYZ-positionering en slepen op canvas.
- Automatisch gegenereerde frameconstructie op basis van modulebreedtes.
- Materiaaloverzicht, zaagoptimalisatie en indicatieve balkprijs.
- JSON import/export, PNG-weergave, print/PDF, lokaal bewaren en undo/redo.
- Responsive interface en PWA-bestanden voor HTTPS-hosting.

**Risico's:** aannames bij inbouwmaten, profielen, verbindingen, draagkracht en hitteafstanden; zaaglijst nog niet bouwgereed. Browser- en touchscreenvalidatie nog open.

**Tests:** 9/9 geautomatiseerd geslaagd; volledige browserrendering nog niet geverifieerd.

## v0.4.0 (releasekandidaat)
- Leeg canvas / vrije orthografische tekenmodus, direct trekken van balken en groene lengtehandvatten.
- Bovenliggers met geometrische oplegging op staanders; 28 automatische tests.