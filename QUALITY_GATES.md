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

## 4. Nulmeting op 25-10-2026 (geactualiseerd na v0.7.1-release)

- **Actuele `main`:** commit `ddf7c79aeae5592eb2b0bfe906422cf79412907e`. Releases [v0.7.0](https://github.com/eelbrethouwer-jpg/Douglas-designer/releases/tag/v0.7.0) en [v0.7.1](https://github.com/eelbrethouwer-jpg/Douglas-designer/releases/tag/v0.7.1) zijn gepubliceerd.
- **PR [#11](https://github.com/eelbrethouwer-jpg/Douglas-designer/pull/11) v0.7.1:** samengevoegd. [Laatste PR-CI 40185989055](https://github.com/eelbrethouwer-jpg/Douglas-designer/actions/runs/40185989055) geslaagd: **78 tests, 78 geslaagd, 0 mislukt**. [Main-push 40186162402](https://github.com/eelbrethouwer-jpg/Douglas-designer/actions/runs/40186162402) geslaagd.
- **Historisch incident (hersteld in CI):** eerdere [run 40185888759](https://github.com/eelbrethouwer-jpg/Douglas-designer/actions/runs/40185888759) had 4 van 78 falende tests: twee frame-selectie/DOM-tests, een materiaalkeuze-UI-test en een live ruimteafmetingen-test. Het verschil tussen die oude mislukking en de groene finale run is een relevante regressiegeschiedenis, **geen actuele open CI-blokkade**.
- **Nog niet aangetoond in deze beoordeling:** bediening op een echte iPhone Safari, Chrome desktop met volledige visuele test, 360° camerahoekcontrole en end-to-end import/export na foto→ruimte→ontwerp. De CI-score mag daarvoor niet in de plaats komen.
- **Actuele P0-actie:** aantoonbare gebruikersacceptatie van v0.7.1 op desktop en iPhone; als er daarbij functionele problemen blijken, nieuwe reproduceerbare bugfix met testcriteria.

## 5. Releaseprotocol
1. Maak per release/bugfix een eigen branch en draft PR, vanaf actuele `main`.
2. Koppel aan iedere functie minimaal één gedrags- en regressietest; breid de echte browserchecks uit bij UI-werk.
3. Gebruik CI en logs als diagnose; los alle falende checks op vóór mergen.
4. Laat de gebruiker gewijzigde UX op echte iPhone/desktop accepteren als die omgeving niet rechtstreeks testbaar is.
5. Publiceer pas na acceptatie. Controleer tag, GitHub Pages en nieuwe cache/zichtbare versie.
6. Werk roadmap en changelog bij met datum, SHA, bekende beperkingen en testbewijzen.

**Opleverrapport per release:** titel; doel; gerealiseerd; gewijzigde bestanden; tests met PASS/FAIL/NIET UITGEVOERD; regressies; resterende risico's; PR/link; publicatiestatus; release notes.

**Hard stop:** rode CI, dataverlies, foutieve zaaglengtes, defecte basissselectie of een mobiele editor zonder zichtbaar werkvlak. Geen productieclaim ondanks groene deelchecks.
