# Douglas Designer — actuele technische architectuur

**Codebasis:** `main` op 25 oktober 2026, commit `f5dd47bfb7c1ebe9e3cfb65ac9bb962b97cbdf7f`. Dit document beschrijft aangetroffen code, niet de ideale toekomstige architectuur.

## Uitvoering en deployment
- **Statische browserapp:** HTML/CSS/vanilla JavaScript zonder backend, database of npm-installatie in de repositoryroot.
- **Hosting:** GitHub Pages via `.github/workflows/pages.yml`, met tests bij PR en push op `main`; uitrol alleen buiten PR's na geslaagde test-job.
- **Offline:** `manifest.webmanifest` en `sw.js` (cache-/assetversies moeten exact overeenkomen met de pagina).
- **Teststack:** Node 22 met `node --check` en ingebouwde `node --test tests/*.test.js` in Actions. De testset gebruikt ook gemockte DOM-/canvasobjecten; dit is geen vervanging van een echte browser.

## Kernmodules en verantwoordelijkheden
| Bestand | Huidige rol | Wijzigingsrisico |
|---|---|---|
| `model.js` | Projectnormalisatie, modules, unieke balken, automatische framegeneratie en overrides, geometrie, zaagplan en waarschuwingen | **Hoog:** raakt model, export en bestaande projecten |
| `drafting.js` | Rasterstappen, magneetankers, tekenhulpen en maatlabels | Middel: precisie en snapgedrag |
| `room-space.js` | Ruimtestaat, kleurcatalogus, 90-graden-plaatsing en fotohoek-projectie | Hoog: ruimte-invoer, validatie, metrische consistentie |
| `render3d.js` | WebGL-wereldprojectie, driehoeken, dieptebuffer, picking | **Hoog:** zichtbaarheid, selectie en transparantie |
| `app.js` | Centrale editorstatus, canvas, touch/muis, undo/redo, lokale opslag, zaaglijstpresentatie en export | **Hoog:** breed gekoppelde UI; regressierisico |
| `room-studio.js` | Room Capture UI, foto-import, preview, ruimtevelden en materiaalbediening | Hoog: mobiel, uploads, live terugkoppeling |
| `index.html` + CSS | Werkruimte, toolbars, zijpanelen, canvas en responsive weergave | Middel/hoog: mobiele bereikbaarheid |
| `sw.js` | Serviceworker met offline assetcache | Hoog: oude UI kan blijven verschijnen na uitrol |
| `tests/` | Unit-, smoke-, model-, renderer-, UI- en regressietests | Essentieel, maar nog geen echte end-to-end browsertests |

## Gegevensstroom
```text
Gebruikersactie (pointer / knop / invoer)
    → app.js of room-studio.js
    → projectnormalisatie en modelregels (model.js / room-space.js)
    → commit + undo-stack + localStorage
    → render(): modelgeometrie → 3D/WebGL en Canvas2D-overlay
    → materiaal-/zaagoverzicht uit hetzelfde projectmodel
```

### Maatvoering en objectidentiteit
- Alle constructiematen in **mm**; assen **X = breedte, Y = hoogte, Z = diepte**.
- `model.js` genereert automatische frames uit modules. Handmatige afwijkingen staan apart in `frameEdits` en moeten stabiel blijven bij elke wijziging.
- `DouglasRoom` beheert de omgeving en plaatsing van de **hele** keuken; verplaatsen/draaien in de ruimte mag de zaaglengtes niet veranderen.
- Ruimtefoto's worden in het project als begrensde JPEG-data-URL opgeslagen; vier genormaliseerde vloerhoeken plus handmatig ingevoerde echte maten ondersteunen alleen een **indicatieve** foto-overlay.
- Kleuren/varianten worden als IDs genormaliseerd; labels in de catalogus zijn generieke referenties, geen geverifieerde merkonderdelen.

### Rendering en interactie
- `app.js` genereert vormen; `render3d.js` tekent waar mogelijk met WebGL en echte depth-buffering; Canvas2D biedt overlay én fallback.
- Selectie, handvatten en lijnen hebben een eigen Canvas2D-interactielaag. De gebruiker hoort geen verschillend resultaat tussen rendering en picking te krijgen.
- Camerastanden: 3D, voor, zij, boven, onder; touch/muis zijn eigen inputpaden.
- Huidige kritieke kwaliteitscontrole: gesloten werkblad, geen gaten/doorzichtigheid bij draaien, directe zichtbaarheid op mobiel bij wisselen van paneel.

### Bewaren/export
- Browser-`localStorage`-sleutel `douglas-designer-v1` blijft behouden voor achterwaartse compatibiliteit.
- JSON-projectexport/import en PNG-export worden vanuit de client gedaan.
- Undo/redo is in `app.js` een begrensde geschiedenis; geen volledige per-project revisiedatabase.
- `boardPlan` uit `model.js` genereert een **indicatief** balkenzaagplan (first-fit decreasing), geen bewezen globaal optimum of lijst van alle materialen.

## Technische schuld / aandachtspunten
1. `app.js` combineert veel state, UI, tekenen, opslag en exports: verdere wijzigingen bij voorkeur isoleren en pure functies naar losse, geteste modules verplaatsen.
2. Branch `fix/v0.7.1-sketchup-room-usability` (PR #11) bevat oplossingen voor zichtbare Room-weergave, foto-invoer en mobiele materiaalnavigatie, maar was bij nulmeting **niet gemerged** en heeft **rode tests**. Dit zijn geen bewezen werkende productfuncties.
3. Oude README-/roadmapteksten liepen achter op de samengevoegde v0.7.0; release en daadwerkelijke acceptatie blijven apart gerapporteerd.
4. Geen geautomatiseerde screenshot-/echte Safari-test aangetroffen; CI-succes verifieert geen fotorealisme, WebGL-weergave of touchergonomie.
5. Geen uitvoerbare constructieberekening; materiaalmaten of hitte-/ventilatiewaarschuwingen niet promoten tot veiligheidsbewijs.

## Veranderregels
- **Modelwijziging:** versiecompatibiliteit + golden fixtures + zaagplan + JSON import/export toetsen.
- **Rendererwijziging:** automatische geometrie/picktests **én** visuele cameramatrix in browser.
- **Room/UI-wijziging:** upload, dimensies, live preview, materiaalkeuze, desktop + iPhone toetsen.
- **Cachewijziging:** exacte assetverwijzingen, versie-upgrade en offline/online herlaadscenario controleren.

Zie [QUALITY_GATES.md](QUALITY_GATES.md) en [PRODUCT_SPEC.md](PRODUCT_SPEC.md).
