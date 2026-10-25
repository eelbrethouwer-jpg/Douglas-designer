# v0.4.0 — Vrij tekenen & Direct balken op maat

### Nieuw
- Vrije tekenmodus op een leeg canvas, geïnspireerd op de werkwijze van Floorplanner.
- Sleep van begin- naar eindpunt in voor-, zij- of bovenaanzicht om een balk te tekenen.
- Automatische askeuze, 5 mm maatstappen en magnetische aansluiting nabij bestaande losse-balkuiteinden.
- Selectiehandvatten aan beide balkuiteinden: verlengen/inkorten door te slepen.
- Nieuwe lege projecten bewaren/herstellen zonder dat het frame terugkomt.

### Verbeterd
- Bovenste liggers en dwarsregels krijgen geometrische oplegging op de staanders.
- Geometrie, zaaglijst, undo/redo en project-JSON blijven synchroon.
- Rustiger tekenvlak met duidelijke Selecteren/Tekenen-bediening.

### Tests
- **28 Node-model/UI-tests geslaagd**; syntaxcontrole van app.js, model.js en sw.js geslaagd.
- Webbrowser/echte iPhone niet end-to-end getest wegens geblokkeerde browsernavigatie.

### Risico's
- Geen technische constructieberekening of validatie van hitte/ventilatie.
- Tekenmodus is voorlopig as-georiënteerd (X/Y/Z); geen diagonale balken.
- Opleggingsmaten zijn visueel, niet constructief gevalideerd.