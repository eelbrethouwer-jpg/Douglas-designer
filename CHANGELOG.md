## Ongepubliceerd — Fase 2: lessenaarsdak in 3D

- Elk blok (open of gesloten, niet pergola) kan een **lessenaarsdak** krijgen: kies in het zijpaneel *Dak → achter/voor/links/rechts hoog* en vul de hoogte van de lage rand in. In de schets wijst een pijl naar de lage kant; het zijpaneel toont de helling in graden.
- In 3D: bovenliggers alleen langs de hoge en lage rand, **daksparren 50 × 150 h.o.h. ≤ 600 mm** (schuin) en een **dakplaat**; staanders en wanden volgen de helling (wanden langs de helling krijgen een schuine bovenzijde).
- Nieuw paneeltype met helling (`slope`) en soorten *Dakspar* en *Dakbeplating*; limiet nu 160 panelen.
- Materiaallijst: *Dakbeplating* (m², schuin gemeten, overstek niet inbegrepen) en *Daksparren* (aantal stokken, schuine lengte + zaagmarge).
- Voorbeeld Kapschuur: berging met lessenaarsdak 2,55 m (achter) naar 2,30 m (voor). Aanname: de PDF vermeldt de helling niet.
- Nog niet: zadeldak/kap (nok 3,30 m) voor het zitgedeelte, dakoverstek, kilgoot/dakbedekking.

## Ongepubliceerd — Fase 1: plattegrond schetsen in 2D

- Knop 📐 Plattegrond opent nu een schetsvenster in SketchUp-stijl: **Blok** (B) en **Lijn** (L) tekenen door te slepen, **Selecteren** (V) om te klikken, te verplaatsen en met de vierkante grepen groter/kleiner te maken. Raster (50–500 mm), magneet naar andere randen, live maten, scrollen = zoomen, Shift+slepen = verschuiven, pijltjes = verplaatsen, Delete = verwijderen, Ctrl+Z/Y.
- Zijpaneel voor naam, soort, maten, hoogte, wanden en deur; de schets wordt automatisch bewaard als concept.
- Fase 2: **Naar 3D →** maakt een nieuw project van de schets. Lijnen worden wanden (staanders, bovenligger, bekleding).
- Nieuwe module `plan-editor.js` met pure, geteste logica (snappen, resize, hit-test).

## Ongepubliceerd — wanden, deur en bekleding (kapschuur)

- Plattegrond-zones krijgen wanden (achter/voor/links/rechts) en een deur (900 × 2050 mm, positie instelbaar). Gevelbekleding wordt een wandpaneel rond het frame; de deuropening krijgt twee stijlen en een bovendorpel, regels worden vrijgehouden.
- Nieuw: panelen (`project.panels`): dunne platen zonder constructiefunctie; selecteerbaar, aanpasbaar en te verwijderen. Materiaallijst telt gevelbekleding (m², met verlies) en buitendeuren.
- In het plan ligt de achterzijde op Z=0; het model spiegelt dat zodat de voorzijde bij de 3D-weergave klopt (pergola voor, berging met deur rechts naast het zitgedeelte).

## Ongepubliceerd — start vanuit plattegrond

- Knop 📐 Plattegrond: definieer zones (open overkapping, gesloten ruimte, pergola) met buitenmaten en hoogte, en maak er een nieuw 3D-project van losse balken van (staanders 100×100, bovenliggers 50×150, regels, pergola-latten). Gedeelde wanden tussen zones, geen overlappende balken (getest), buitencontour klopt. Voorbeelden: kapschuur uit de PDF en variant met houthok.
- Projecten met een plattegrond mogen groter zijn (tot 12 × 12 m, 4 m hoog). Dak niet inbegrepen (balken zijn recht).

## Ongepubliceerd — 3D-scan importeren

- Knop 🧊 Scan: importeer een 3D-scan van de ruimte (.glb, .gltf met ingebedde data, .obj) als referentiemodel; kleuren en texturen worden overgenomen, zware modellen vereenvoudigd tot max. 45.000 driehoeken. Zichtbaar in 3D en alle 2D-aanzichten achter het ontwerp.
- Schaal instellen met twee punten (2D-aanzicht) of numeriek, draaien, Z-omhoog, op de vloer zetten, midden op de keuken, zichtbaarheid.
- Scan telt niet mee in zaaglijst/materiaal; blijft lokaal (IndexedDB), niet in deel-links of exportbestanden. Niet ondersteund: Draco/meshopt-compressie, extern .bin, sparse accessors.
- Nieuwe module `mesh-import.js` met 9 tests.

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