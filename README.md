# Douglas Designer — Bouwbare buitenkeukens ontwerpen

**v0.4.0 releasekandidaat** · Floorplanner-geïnspireerde vrije tekenmodus, naast de bestaande module-editor.

## Vrij tekenen (nieuw in v0.4)

1. Open **Projecten → Vrij tekenen — leeg canvas**; je begint met een leeg orthografisch vooraanzicht zonder frame of werkblad.
2. Met **✎ Teken balk** sleep je tussen een beginpunt en een eindpunt. De richting wordt automatisch X (breedte) of Y (hoogte) in het vooraanzicht.
3. Druk op **Boven** om een dieptebalk (Z-richting) te tekenen. In **Zij** kun je hoogte/diepte tekenen.
4. Selecteer de balk: aan beide uiteinden verschijnt een **groen rond handvat**; versleep een handvat om de lengte aan te passen. Het andere uiteinde blijft staan.
5. **Undo/redo** en de **zaaglijst** blijven gekoppeld aan de geometrische wijzigingen.

Bestaande projecten met modules blijven laden zonder conversie. Kies je een leeg project, dan wordt `modules: []` als geldige situatie opgeslagen. Je kunt modules later nog toevoegen.

### Geometrische bovenregels
De standaard moduleconstructie tekent nu de bovenste X-liggers met 25 mm oplegging op elke staander; bovenste Z-regels met 50 mm geometrische overlap. Dit is uitsluitend een visuele/maatkundige oplossing, **geen constructieve sterkteberekening, garantie voor veilige oplegging of goedgekeurde verbinding**. De benodigde sterkte, houtverbindingen, bevestigers, kamado-hitteafstanden en ventilatie blijven te controleren vóór bouw.

### Wat nog ontbreekt
- Echt vrij tekenen van schuine balken, kantelen van profielen en per balk kiezen uit meerdere doorsneden.
- Volledig geavanceerde 3D-bewerktools zoals in professionele CAD-apps.
- Validatie op een fysieke iPhone in Safari; browsernavigatie tijdens de ontwikkeling was in deze omgeving niet toegankelijk.

## Publicatie
GitHub Pages met de bestaande workflow op `main`. Deze versie wordt via een feature branch en pull request aangeleverd en blijft een **releasekandidaat** totdat CI én gebruiker de bediening hebben bevestigd.

# Douglas Designer — Buitenkeuken Studio

**Versie:** v0.1.0 · prototype / releasekandidaat · 24 oktober 2026

Een mobiele en desktopvriendelijke ontwerper voor Douglas buitenkeukens. Geen externe JavaScript-bibliotheken of account nodig.

## Direct starten

- **Snel proberen:** open `Douglas-Designer.html` (losse versie, in de bovenliggende downloadmap) in een moderne browser. Je kunt het bestand ook rechtstreeks uit het ZIP-archief halen.
- **Alle projectbestanden:** open `index.html` uit deze map. Met een statische webserver, HTTPS en `manifest.webmanifest` is dit ook als startscherm-webapp te gebruiken.
- **iPhone:** publiceer deze map op een HTTPS-website, bijvoorbeeld GitHub Pages. Open daarna de URL in Safari, tik op Delen → Zet op beginscherm. Lokaal HTML openen via de Bestanden-preview kan JavaScript of opslag beperken.
- **Opslaan:** het ontwerp wordt (waar beschikbaar) automatisch bewaard in de browser via localStorage. Gebruik `Project exporteren` voor een overdraagbare back-up (`.json`); importeer die later terug.

## Wat werkt

- Draaibare 3D-visualisatie met zoom, weergaven voor / zij / boven / 3D.
- Voorbeeldontwerp met ladekast, koelkast en kamado.
- Complete modules toevoegen, verwijderen, ordenen en in breedte/type aanpassen. Buitenbreedte wordt exact herberekend, rekening houdend met stijlen van 50 mm.
- Vrije 50 × 100 mm balken toevoegen, lengte/as/XYZ in millimeters aanpassen en via `Verplaats balk op canvas` verslepen.
- Automatisch opgebouwd frame, indicatief werkblad en schematische apparatuur.
- Zaaglijst, zaagoptimalisatie volgens first-fit decreasing, indicatie aantal handelsbalken, zaagverlies en materiaalprijs voor **uitsluitend balkhout**.
- Uitvoer naar JSON, PNG en afdruk / PDF via browserprint.
- Ongedaan maken / opnieuw, offline cache na eerste HTTPS-bezoek en lokale opslag.

## Voorbeeld — aannames, niet als bestelling gebruiken

De voorbeeldkeuken staat op **1875 × 870 × 950 mm** (buitenmaten), met openingen van **520, 600 en 555 mm**. Dit zijn eerder besproken gegevens en modelaannames die **nog niet opnieuw zijn gecontroleerd**. Voorbeeldbalkprofiel **50 × 100 mm**, handelslengte **2800 mm**, zaagsnede **3 mm**, fictieve prijs **€ 16,95/balk**. Balkprijs is geen live winkelprijs.

Het voorbeeld genereert 28 frame-onderdelen en bij de ingestelde zaagheuristiek 8 handelsbalken. Dit is een **voorlopige materiaalschatting, niet een constructief goedgekeurd bouwplan**.

## Niet inbegrepen / veiligheidsbeperkingen

- Geen constructeurberekening van doorbuiging, draagkracht, verbindingen, windbelasting of fundering.
- Kamado-getoonde afmetingen zijn schematisch. Hitteafstanden en brandbescherming niet doorgerekend: volg fabrikantvoorschriften.
- Inbouwmaten, ventilatie en onderhoudstoegang van de koelkast ontbreken.
- Paneelmaten, werkbladen, schroeven, beslag, laden, poten, apparaten en afwerking komen nog **niet** in de materialenlijst.
- Zaagplan is een heuristiek, niet gegarandeerd optimaal; zaagkerf wordt gemodelleerd tussen stukken op één balk, niet altijd voor de laatste afkorting.
- Balkverbindingen zijn illustratief; bevestigings-/verbindingsdetails nog uit te werken.
- Geen synchronisatie tussen apparaten, cloudaccounts, samenwerking of multi-projectbeheer.
- Geen permanente GitHub-publicatie gemaakt; alle bestanden worden hier als download aangeleverd.

## Ontwerparchitectuur

- `model.js`: rekenmodel, afmetingen, frameonderdelen, zaagplan en waarschuwingen.
- `app.js`: browserinterface, eigen interactieve Canvas 3D-projectie, lokale opslag, bestands- en aanrakingsevents.
- `styles.css`: responsive desktop / tablet / mobiel.
- `index.html`: interface.
- `manifest.webmanifest`, `sw.js`, `app-icon-*.png`: installeerbare webapp vanaf HTTPS.
- `tests/`: Node-berekenings- en smoke-tests.

## Testen

```bash
node --test tests/*.test.js
```

**Teststatus:** 9 geautomatiseerde tests geslaagd (model en gesimuleerde DOM-interactie). JS-syntax gecontroleerd met `node --check`. Een volledige rendering- en multitouch-test in Safari/Chrome kon in deze omgeving niet afgerond worden: de beschikbare headless browser bleef ook op een lege HTML-pagina hangen. De app is daarom een **releasekandidaat**, niet een bewezen stabiele productieversie.


## GitHub Pages lanceren

Een gecontroleerde CI/deploy-workflow is toegevoegd in `.github/workflows/pages.yml`.
De workflow controleert JavaScript-syntax en voert de tests uit vóór publicatie.
Zie [`GITHUB_LANCERING.md`](GITHUB_LANCERING.md) voor de eenmalige stappen,
waaronder het activeren van **GitHub Actions** als Pages-bron.

## Acceptatiecriteria voor v0.2

1. Werkelijke maatvoering van koelkast en kamado verwerken en visueel controleren.
2. Constructieverbindingen, hittebescherming en ventilatie beoordelen.
3. Paneel-/werkblad-/beslagmateriaallijst toevoegen.
4. iPhone Safari en desktop Chrome handmatig doorlopen en bugs verhelpen.
5. GitHub-repo aanmaken en release/webapp publiceren zodra dat gewenst is.


## v0.3.0 — vrije camera en balkenpalet

- Draai in 3D het ontwerp ook naar een hoog/laag camerastandpunt, of kies het aparte **Onder**-aanzicht.
- Open links **Balken** voor horizontale regels, staanders en dieptebalken. Sleep ze naar het ontwerp; op mobiel kun je ook een type aantikken en vervolgens op de bestemming tikken.
- Bij een passende plek tussen twee rechthoekige steunvlakken stelt het programma de lengte automatisch in. Via het eigenschappenpaneel kun je een al geplaatste balk opnieuw **Passend maken**.
- Alleen **geometrisch** passend: verbindingen, sterkte, en installatieruimte moet je zelf controleren.

De projectdata zijn backwards compatible met v0.2.0; exporteer je project voordat je grote ontwerpwijzigingen maakt.