# Douglas Designer

Een Nederlandstalige **Douglas buitenkeuken-ontwerper** met een nauwkeurige 2D-werkwijze, interactieve 3D-controle en een gekoppelde zaaglijst. De interface is geïnspireerd op de eenvoudige ontwerpflow van Floorplanner, maar gespecialiseerd in maatwerk houten constructies.

> **Actuele status op 25 oktober 2026:** `main` bevat v0.7.2; **PR #14 (v0.7.3 Room Capture iPhone-fix) is de leidende conceptrelease**. De automatische PR-checks zijn geslaagd (91/91 vóór documentintegratie). Echte iPhone-Safari/PWA- en desktopacceptatie staan nog open. Publicatie volgt pas na review en samenvoegen.


## v0.7.3 Room Capture iPhone-fix — leidende concept-PR

[PR #14](https://github.com/eelbrethouwer-jpg/Douglas-designer/pull/14) bevat de compatibiliteitsoplossing voor foto-upload en ruimte-/materiaalacties bij oudere PWA-scripts, verbeterde iPhone-safe-areas en consistente assetcacheversies. De regressietest reproduceert specifiek de fout `undefined is not an object (evaluating 'p.room')`.

**Van PR #12 overgenomen:** de projectvisie, technische nulmeting, kwaliteits- en releasevoorwaarden. Deze documenten wijzigen **geen** v0.7.3-appcode. De historische v0.7.1-nulmeting in PR #12 wordt onderscheiden van de actuele v0.7.3-status. Zie [Projectvisie](PROJECT_VISION.md), [Architectuur](ARCHITECTURE.md) en [Quality Gates](QUALITY_GATES.md).

## v0.7.2 Sketch Studio Foundation — gepubliceerd

De eerdere Sketch Studio-basis is uitgewerkt in [PR #13](https://github.com/eelbrethouwer-jpg/Douglas-designer/pull/13) en opgenomen in `main` als v0.7.2. Het blijft noodzakelijk de werking van foto/3D op fysieke apparaten te controleren.

**P0-bugfix:** de centrale app-projectmutatie geeft nu het actieve project aan de foto-, ruimte- en materiaal-UI door. Daardoor slaan die acties wijzigingen op in de werkelijke app-state; voorheen verwachtten ze een argument dat niet geleverd werd.

**Nieuw:** 3D-grondraster en raster op de binnenwanden, opvallende rode breedte-/groene diepte-/blauwe hoogte-as, rastermaat 50/100/250/500 mm, assen/raster/wandraster aan-uit, perspectief/parallelle projectie. Het canvas krijgt een rustige grijze achtergrond. Oude frames/zaaglijsten blijven ongewijzigd.

Gedetailleerde scope en grenzen: [Sketch Studio-specificatie](SKETCH_STUDIO_SPEC.md) en [release notes v0.7.2](RELEASE_NOTES_v0.7.2.md). De v0.7.2-code is gepubliceerd; de **visuele Chrome/Safari-acceptatie** is daarmee nog niet afgerond.

## v0.7.0 Room Studio — historie

De foto-ondersteunde basis is via [PR #10](https://github.com/eelbrethouwer-jpg/Douglas-designer/pull/10) in `main` opgenomen en als v0.7.0 gepubliceerd. De daadwerkelijke bediening op iPhone bleef een open acceptatiepunt.

Geïntroduceerd in die release: foto toevoegen en vier vloerhoeken markeren, echte ruimtematen invullen, vloer en wanden in 3D tonen, complete keuken draaien en plaatsen, waarschuwingen bij afmetingen en een ingebouwde catalogus met 66 generieke varianten. Fotopreview is indicatief. Voor hoogwaardige echte PBR-materialen, fabrikantmodellen, automatische fotoherkenning en verdere bouwkundige controles zijn nog afzonderlijke ontwikkelstappen nodig.

Zie [release notes v0.7.0](RELEASE_NOTES_v0.7.0.md) voor functies en beperkingen. De huidige bugfix wordt in PR #14 afgerond, niet in de historische PR.

## Documentatie

- [Projectvisie en ontwerpafspraken](PROJECT_VISION.md)
- [Technische architectuur en historische nulmeting](ARCHITECTURE.md)
- [Kwaliteitscontrole, testmatrix en releasevoorwaarden](QUALITY_GATES.md)
- [Roadmap en releasevolgorde](ROADMAP.md)
- [Product- en interactiespecificatie](PRODUCT_SPEC.md)
- [Release notes v0.6.0](RELEASE_NOTES_v0.6.0.md)
- [Historische wijzigingen](CHANGELOG.md)

## Openen

Publieke versie: **https://eelbrethouwer-jpg.github.io/Douglas-designer/**

De eerdere Studio-PR's [#6](https://github.com/eelbrethouwer-jpg/Douglas-designer/pull/6) en [#7](https://github.com/eelbrethouwer-jpg/Douglas-designer/pull/7) zijn al verwerkt. De actuele nog niet gepubliceerde bugfix staat in [PR #14](https://github.com/eelbrethouwer-jpg/Douglas-designer/pull/14).

Ook lokaal te draaien door de map op een statische webserver te hosten. Je kunt dan \`index.html\` openen; geen serverdatabase of account nodig. Tijdens ontwikkeling zijn \`node\` en een moderne browser voldoende.

## Bestaande functionaliteit van de ontwerpstudio

- Basis- en voorbeeldkeuken met modules: laden, deuren, koelkast, kamado en open vak.
- **Vrij beginnen op een leeg tekenvlak** zonder geforceerd startframe.
- Balk van startpunt naar eindpunt tekenen in voor-/zij-/bovenaanzicht.
- Balk of automatische framebalk selecteren; lengte/positie bewerken via handvat, slepen, 5-mm nudge en exact invullen.
- Rasterstappen **5 / 10 / 25 / 50 mm**; optionele magneet op bestaande balkuiteinden.
- **In 2D pannen**, in 3D om het ontwerp draaien; extra camerastanden van boven en onder.
- WebGL-renderer met wereldcoördinaten, een echte dieptebuffer en Canvas2D-fallback.
- Projecten lokaal bewaren, JSON import/export, undo/redo en een indicatief zaagplan voor het Douglas balkhout.
- Modulebreedtes en automatische framegeneratie; handmatige frameoverrides zijn afzonderlijk herstelbaar.

De screenshot-, iPhone- en WebGL-weergave zijn **nog niet volledig end-to-end gevalideerd**. Met name het werkblad moet vanuit alle hoeken nog gecontroleerd worden voordat de versie stabiel genoemd kan worden.

## Sneltoetsen

| Toets | Functie |
|---|---|
| \`V\` | Selecteren |
| \`B\` | Balk tekenen |
| \`1–5\` | 3D / Voor / Zij / Boven / Onder |
| \`S\` vasthouden | Magneet tijdelijk uit |
| \`Esc\` | Stoppen / deselecteren |
| \`Ctrl/Cmd+Z\` | Ongedaan maken |

Sneltoetsen werken niet als je in een invoerveld typt. Alle belangrijkste acties blijven zichtbaar op het scherm.

## Architectuur

| Bestand | Verantwoordelijkheid |
|---|---|
| \`model.js\` | Constructiegeometrie, modules, balk-ID's, zaaglengtes en waarschuwingen |
| \`drafting.js\` | Raster, magneten en onafhankelijke snappingberekeningen |
| \`render3d.js\` | World-space WebGL-tekening met depth-buffering |
| \`app.js\` | Editorstatus, canvasinteractie, opslag, export en handvatten |
| \`index.html\` / \`studio.css\` / \`ux.css\` / \`styles.css\` | Werkruimte en responsive presentatie |
| \`sw.js\` / \`manifest.webmanifest\` | PWA en offline bestanden |
| \`tests/\` | Node-unit-, smoke-, regressie- en assets-tests |
| \`.github/workflows/pages.yml\` | Controles op pull requests en publicatie via \`main\` |

## Ontwikkelchecks

\`\`\`bash
node --check render3d.js
node --check drafting.js
node --check app.js
node --check model.js
node --check sw.js
node --test tests/*.test.js
\`\`\`

GitHub Actions draait de testset bij pull requests gericht op \`main\`. **Groene tests bewijzen niet dat een 3D-beeld op elk apparaat visueel juist is.** Visuele regressietests en fysieke Safari-bediening zijn aparte acceptatiecriteria.

## Opslag, afmetingen en veiligheid

- Projecten worden lokaal opgeslagen onder dezelfde opslag-sleutel als eerdere versies. Exporteren als JSON wordt sterk aangeraden vóór experimenten.
- Het standaardvoorbeeld is een **concept** met buitenmaten rond 1875 × 870 × 950 mm; controleer iedere maat voor gebruik.
- Standaard Douglas profiel is 50 × 100 mm, handelslengte 2800 mm, prijs een **handmatig ingestelde indicatie**.
- Zaagoptimalisatie gebruikt een benadering; een echte bouw- en zaagcontrole blijft nodig.
- De software berekent **geen** aantoonbare draagkracht, veilige houtverbindingen, brandveiligheid of koelkastventilatie. Fabrikantgegevens en zo nodig een constructeur blijven leidend.

## Roadmap

Zie [ROADMAP.md](ROADMAP.md) voor werkblad-/renderkwaliteit, naadloze tekenervaring, houtverbindingen, apparaten, plaatzaagplan, volledige boodschappenlijst, technische tekeningen, multi-projectbeheer en een eerste stabiele productieversie.
