# Douglas Designer

Een Nederlandstalige **Douglas buitenkeuken-ontwerper** met een nauwkeurige 2D-werkwijze, interactieve 3D-controle en een gekoppelde zaaglijst. De interface is geïnspireerd op de eenvoudige ontwerpflow van Floorplanner, maar gespecialiseerd in maatwerk houten constructies.

> **Status:** ontwikkelfase, v0.6.0 Studio **releasekandidaat**. Niet alle roadmapfuncties zijn gebouwd of getest op een fysieke iPhone. Op GitHub Pages staat uitsluitend wat in de \`main\`-branch is samengevoegd en succesvol gedeployed.


## v0.7.0 Room Studio — aparte releasekandidaat

Op de branch `feature/v0.7.0-room-studio` ([concept-PR #10](https://github.com/eelbrethouwer-jpg/Douglas-designer/pull/10)) wordt een eerste **foto-ondersteunde 3D-ruimteworkflow** ontwikkeld. Dit is **niet** de publieke versie op GitHub Pages.

Nieuw in deze kandidaat: foto toevoegen en vier vloerhoeken markeren, echte ruimtematen invullen, vloer en wanden in 3D tonen, complete keuken draaien en plaatsen, waarschuwingen bij afmetingen en een ingebouwde catalogus met 66 generieke varianten. Fotopreview is indicatief. Voor hoogwaardige echte PBR-materialen, fabrikantmodellen, automatische fotoherkenning en verdere bouwkundige controles zijn nog afzonderlijke ontwikkelstappen nodig.

Zie [release notes v0.7.0](RELEASE_NOTES_v0.7.0.md) voor de gebouwde functies, beperkingen en acceptatiecriteria. **Pas na groene CI én fysieke Safari-/desktoptest mergen.**

## Documentatie

- [Roadmap en releasevolgorde](ROADMAP.md)
- [Product- en interactiespecificatie](PRODUCT_SPEC.md)
- [Release notes v0.6.0](RELEASE_NOTES_v0.6.0.md)
- [Historische wijzigingen](CHANGELOG.md)

## Openen

Publieke versie: **https://eelbrethouwer-jpg.github.io/Douglas-designer/**

De releasekandidaat staat in [PR #7](https://github.com/eelbrethouwer-jpg/Douglas-designer/pull/7); hij bouwt voort op [PR #6](https://github.com/eelbrethouwer-jpg/Douglas-designer/pull/6). Die branches zijn niet automatisch publieke releases.

Ook lokaal te draaien door de map op een statische webserver te hosten. Je kunt dan \`index.html\` openen; geen serverdatabase of account nodig. Tijdens ontwikkeling zijn \`node\` en een moderne browser voldoende.

## Wat werkt in de Studio-releasekandidaat

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
