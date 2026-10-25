# Douglas Designer v0.7.2 RC — Sketch Studio Foundation

**Releasekandidaat op eigen GitHub-branch. Niet gemerged of gepubliceerd.**

## P0: zichtbare functionaliteit herstellen
De centrale `commit(fn)` functie stuurde het actuele project niet als argument mee. Room Studio en de materiaalkeuzefuncties verwachtten dat projectargument wel, waardoor foto-upload en ruimte-/materiaalupdates in een echte browser konden falen ondanks groene geisoleerde module-tests. v0.7.2 geeft `commit` nu het live project mee en heeft een nieuwe regressietest voor het volledige app-controllerpad.

## Nieuwe SketchUp-geïnspireerde omgeving
- **3D-grondraster** van geometrisch correcte vierhoeken, met dunne lijnen en hoofdlijnen iedere vijf rasterstappen.
- Optioneel **verticaal raster** op de binnenzijde van achterwand en linkerwand.
- Duidelijke assen: **X rood**, **diepte (interne Z) groen**, **hoogte (interne Y) blauw**.
- Rastermaat in **50 / 100 / 250 / 500 mm**, met automatische reductie van lijnendichtheid voor grote ruimtes.
- Knoppen voor **Raster aan/uit, XYZ aan/uit, wandraster aan/uit, perspectief/parallel**.
- Bestaande camerastanden **3D (iso), voor, zij, boven en onder** en orbit/pan/zoom blijven beschikbaar.
- Parallelle projectie in zowel GPU als Canvas-overlay, inclusief dieptecorrecte selectie.
- Grijs neutraal tekenvlak als basis, passend bij de aangeleverde SketchUp-visuele referentie.
- Instellingen voor het raster worden onafhankelijk van het bouwproject lokaal bewaard.

## Bestaande functies behouden
- Parametrische keukenmodules, losse Douglas balken, automatische frameleden en overruled frameposities.
- Zaaglijst, prijsraming, projectopslag, import/export en undo/redo.
- Room Capture (foto kiezen of camera openen), handmatig vier vloerpunten markeren, 3D-ruimte en materiaalkleuren.

## Expliciete beperkingen
- Geen automatische betrouwbare maatvoering uit één foto, geen AI-fotogrammetrie.
- Geen volledige SketchUp 3D-geometry editor, Push/Pull of vrije driedimensionale vlakteconstructie.
- Materialen zijn voorlopig kleurreferenties, geen fotorealistische PBR-structuren.
- De 3D-achtergrondlijnen zijn hulpmiddelen, geen onderdelen voor de zaaglijst.

## Acceptatiecriteria
- [ ] Alle GitHub Actions Node-/regressietests groen.
- [ ] Desktop Chrome: foto-opener, JPEG/PNG, foto's zichtbaar, ruimtematen en materiaalwissel zichtbaar.
- [ ] iPhone Safari: foto uit bibliotheek/camera, 3D-workspace en rasterbediening.
- [ ] Rasterlijnen zichtbaar vanuit iso/top/front/side; geen weergave dwars door volle objecten.
- [ ] Parallel en perspectief wisselen zonder verkeerde hit-tests.
- [ ] Eerder opgeslagen projecten zonder migratieproblemen.

**Publiceren pas na browseracceptatie.**
