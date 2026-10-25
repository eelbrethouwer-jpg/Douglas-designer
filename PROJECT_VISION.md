# Douglas Designer — projectvisie en productafspraken

**Vastgesteld als werkbasis:** 25 oktober 2026. **Status:** ambitie/ontwerpeisen; geen verklaring dat alle functies al bestaan.

## Missie
Een Nederlandstalige, mobile-first ontwerper voor Douglas buitenkeukens en later andere houtconstructies: **ruimte inmeten → tekenen of modules plaatsen → direct aanpassen → in 3D controleren → materialen en zaagstukken afleiden → project bewaren/exporteren**.

De interactie is geïnspireerd op SketchUp (objecten direct manipuleren) en Floorplanner (laagdrempelig ruimtelijk ontwerpen). Niet hun broncode, interface of merkidentiteit nabouwen.

## Productbeloften
1. **Één bron van waarheid:** exacte maten in millimeters bepalen de 2D-/3D-geometrie én de materiaal-/zaaguitvoer.
2. **Zichtbare terugkoppeling:** elke geldige aanpassing van maat, positie, oriëntatie, selectie of materiaal levert meteen een zichtbaar resultaat op. Bij een ongeldige actie verschijnt een specifieke uitleg.
3. **Direct tekenen en bewerken:** selecteren, slepen, verlengen, inkorten, kopiëren en herstellen zonder onverwachte cameranavigatie. Ook automatisch gegenereerde framebalken blijven bewerkbaar.
4. **Een grote werkruimte:** desktop met compacte tools en contextuele eigenschappen; iPhone/tablet met zichtbaar tekenvlak en primaire acties binnen handbereik, niet verstopt onder lange formulieren.
5. **Niet-destructief:** undo/redo, lokale opslag, JSON-back-up, controle op import van oudere projecten en bevestiging bij risicovolle acties.
6. **Eerlijk bouwadvies:** technische waarschuwingen zijn nuttig, maar geen claim van doorgerekende draagkracht, veilige kamado-afstand, ventilatie of conforme constructie.
7. **Geen schijnfunctionaliteit:** een bedieningsknop geldt pas als gerealiseerd na aantoonbaar correct gedrag voor normale en foutscenario's.

## Belangrijkste gebruikersroutes
- **A. Leeg beginnen:** leeg canvas → nauwkeurig balken tekenen → bewerken → zaaglijst.
- **B. Snel met modules:** indeling kiezen → frames en modules aanpassen → materialen → zaaglijst.
- **C. Ontwerpen in eigen ruimte:** foto toevoegen (optioneel) → vier vloerpunten markeren → **zelf** gemeten ruimtematen invullen → keuken plaatsen → ruimtewaarschuwingen controleren → bewaren.
- **D. Ontwerp voortzetten:** bestaand ontwerp laden/importeren → meerdere wijzigingen → na herladen dezelfde maten, objecten en materiaalkeuzes.
- **E. Van ontwerp naar werkplaats:** onderdelen per ID herleidbaar tot objecten, zaagplanning en uiteindelijk maatbladen en een materialenlijst.

## Uitdrukkelijke beperkingen
- Eén foto alleen geeft **geen betrouwbare 3D-reconstructie of maatvoering**; de huidige Photo Match is een schematische projectie.
- De huidige kleurcatalogus is geen bibliotheek met echte PBR-texturen of fabrikant-gevalideerde modellen.
- De bestaande zaaglijst betreft voornamelijk Douglas-balkhout; niet automatisch een complete boodschappenlijst voor panelen, apparaten en beslag.
- Het ontwerp is niet constructief of thermisch gecertificeerd.
- Multi-project/cloudfunctionaliteit is een toekomstdoel en mag niet als bestaand worden gepresenteerd.

## Kwaliteitsvolgorde en beslisregels
**P0:** dataverlies, gebroken basisinteracties, onjuiste maatvoering/zaaglijst, onbruikbare mobiele editor, kritieke rendererfouten, rode CI voor een release.
**P1:** intuïtieve tekenworkflow, nauwkeurige 3D-ruimte, foto-onboarding, consistente materialen.
**P2:** geavanceerde objectbibliotheken, fotorealisme, verdere export, UX-verfijning nadat de basis stabiel is.

De voorkeur is **kleine, volledig gevalideerde releases** boven grote releases vol half werkende functies. Een ambitieuze productroadmap mag wel groot zijn.

## Samenwerken met ChatGPT
- Elke nieuwe release/bugfix krijgt een eigen chat en een afgebakende scope.
- Begin met de actuele `main` en open PR's, niet alleen eerdere gesprekken.
- Formuleer vóór het bouwen: gebruikersscenario, meetbare acceptatiecriteria, afhankelijkheden, risico's en niet-doelen.
- Verander code in een branch met een (concept-)PR. Niet automatisch mergen/publiceren.
- Rapporteer feitelijke testresultaten, plus expliciet niet-uitgevoerde browser-, iPhone- en visuele tests.
- Werk na acceptatie de status en eventuele wijzigingen in visie/roadmap bij.

**Gerelateerde documenten:** [productspecificatie](PRODUCT_SPEC.md), [architectuur](ARCHITECTURE.md), [roadmap](ROADMAP.md), [kwaliteits- en releaseprotocol](QUALITY_GATES.md).
