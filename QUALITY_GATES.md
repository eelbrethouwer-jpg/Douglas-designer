# Douglas Designer — Definition of Done, testmatrix en releaseprotocol

**Ingangsdatum:** 25 oktober 2026. Een groene build is noodzakelijk, maar nooit voldoende om de gebruikerservaring als getest te beschouwen.

## 1. Elke opdracht begint met een korte feature-brief
```text
Versie / onderwerp:
Huidige main-SHA en relevante open PR's:
Gebruikersprobleem (wat doet het nu / wat verwacht je?):
Scope (must have / buiten scope):
Testbare acceptatiecriteria (Given / When / Then):
Mogelijke impact (model, 3D, UI, opslag, zaaglijst, PWA):
Risico's en AANNAMES (expliciet):
Testplan inclusief echte browser/iPhone:
```

**Voorbeeld acceptatiecriterium:** “Gegeven een ingeschakelde ruimte van 4500 mm breed, wanneer ik de breedte naar 6100 mm verander, dan laat het zichtbare bovenaanzicht onmiddellijk 6100 mm zien, wordt de ruimtegeometrie groter en blijven bestaande balklengtes/zaaglijst gelijk.”

## 2. Quality gates
| Gate | Bewijs | Stopvoorwaarde |
|---|---|---|
| G0 — Bron van waarheid | `main`-SHA, open PR's, versie, wijzigingen en bestaande tests bekeken | Onbekende starttoestand |
| G1 — Specificatie | Reproduceerbare gebruikersroute, positief/negatief scenario, expliciete beperkingen | Alleen “knop toevoegen” zonder meetbaar effect |
| G2 — Statische checks | Node-syntax op alle relevante JS en `node --test tests/*.test.js` | Een falende test of ontbrekende relevante check |
| G3 — Model/regressie | Maatconsistentie, balk-ID's, frame-overrides, zaaglijst, undo/redo, JSON en oudere projectdata | Onjuist onderdeel of dataverlies |
| G4 — Browser-UX | Echte Chrome desktop: upload, stappen, zichtbare wijziging, selectie, muis/scroll/zoom | Niet zichtbare of niet bedienbare functie |
| G5 — Mobiel | Echte iPhone Safari: ruimtefoto, selecteren, pinchen, toetsenbord, knoppen, opslag en viewport | Werkvlak verborgen, knoppen buiten bereik of touch-breuk |
| G6 — Rendering | Screenshots vanuit voor/achter/links/rechts/boven/onder + schuin orbitten, ook materiaalvarianten | Gaten, flikkering, wegvallend werkblad of foutieve picking |
| G7 — Deployment | PR gereviewd, na acceptatie gemerged, Actions `main` groen en publieke Pages-versie/caches gecontroleerd | Onbekende publieke versie |

**Statusvelden:** `PASS`, `FAIL`, `NIET UITGEVOERD`, `N.V.T.`. “Code aanwezig” is geen teststatus. Ontbrekende testmiddelen worden benoemd en niet stilzwijgend als groen geteld.

## 3. Verplichte regressiescenario's
- Leeg ontwerp; geen onverwachte automatische elementen.
- Modulestart; modules toevoegen/wijzigen/verwijderen, framedelen selecteren/aanpassen/herstellen.
- Vrij tekenen; balk plaatsen, tweemaal aanpassen, exact maat invoeren, undo/redo en snappen.
- 2D/3D; camerastanden, orbit, zoom, pannen, overlappende objecten en selectie.
- Room Studio; JPEG/PNG van galerij en camera, ongeldig bestand, vier punten, eigen maatwaarden, keukenplaatsing, foto-overlaygrenzen.
- Materiaalkeuze; zichtbaar ander resultaat, gekozen waarde blijft na refresh en import behouden.
- Zaaglijst; geen dubbele/ontbrekende stukken, dezelfde lengtes na ruimterotatie, waarschuwing bij te lange balk.
- Opslag; localStorage, export/import, terugzetten van bestaande projectversie, geen stille reset.
- Mobiel; iPhone portrait/landscape, werkvlak niet verborgen door paneel, touch en zoom.
- PWA; online eerste bezoek, update van bestaande installatie, cache legen/migreren zonder ontwerpverlies.

## 4. Nulmeting op 25-10-2026
- `main`: commit `f5dd47bfb7c1ebe9e3cfb65ac9bb962b97cbdf7f`, release `v0.7.0` gepubliceerd. Push-workflow `40184686866` **geslaagd**. Dit bewijst niet dat Room Studio op de iPhone visueel werkt.
- Concept-PR [#11](https://github.com/eelbrethouwer-jpg/Douglas-designer/pull/11), `fix/v0.7.1-sketchup-room-usability`: **niet samengevoegd**. Recente PR-run [40185888759](https://github.com/eelbrethouwer-jpg/Douglas-designer/actions/runs/40185888759) **mislukt**.
- Bij die run **78 tests, 74 geslaagd, 4 mislukt**:
  - `editable-frames.test.js`: twee UI-/selectietests falen met `$(...).forEach is not a function`.
  - `room-studio-ui.test.js`: test na materiaalkeuze verwacht visueel actieve stijl, maar de gegenereerde HTML markeert de oude stijl nog als actief.
  - `room-studio-ui.test.js`: na maatwijziging bevat het live overzicht nog de oude tekst `4.500 × 3.200 mm`, in plaats van de nieuwe breedte `6.100 mm`.
- Mogelijk is bij delen sprake van onvolledige DOM-mocks, maar dat is **niet aangetoond**. Testdefecten mogen niet blind worden weggefilterd: eerst werkelijke oorzaak reproduceren en herstellen.
- Echte Safari-/Chrome-test, 360° visuele controle en end-to-end import/export **niet door deze documentatiewijziging uitgevoerd**.

## 5. Releaseprotocol
1. Maak per release/bugfix een eigen branch en draft PR, vanaf actuele `main`.
2. Koppel aan iedere functie minimaal één gedrags- en regressietest; breid de echte browserchecks uit bij UI-werk.
3. Gebruik CI en logs als diagnose; los alle falende checks op vóór mergen.
4. Laat de gebruiker gewijzigde UX op echte iPhone/desktop accepteren als die omgeving niet rechtstreeks testbaar is.
5. Publiceer pas na acceptatie. Controleer tag, GitHub Pages en nieuwe cache/zichtbare versie.
6. Werk roadmap en changelog bij met datum, SHA, bekende beperkingen en testbewijzen.

**Opleverrapport per release:** titel; doel; gerealiseerd; gewijzigde bestanden; tests met PASS/FAIL/NIET UITGEVOERD; regressies; resterende risico's; PR/link; publicatiestatus; release notes.

**Hard stop:** rode CI, dataverlies, foutieve zaaglengtes, defecte basissselectie of een mobiele editor zonder zichtbaar werkvlak. Geen productieclaim ondanks groene deelchecks.
