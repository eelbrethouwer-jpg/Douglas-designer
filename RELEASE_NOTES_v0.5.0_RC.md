# Douglas Designer v0.5.0 — GPU 3D-rendering (releasekandidaat)

## Waarom deze update?
De oorspronkelijke Canvas 2D-scène gebruikte gemiddelde vlakdiepte. Daardoor konden delen van werkblad en frame vanuit bepaalde camerahoeken visueel door elkaar heen tekenen. Het verkleinen van vlakken bleek geen betrouwbare structurele oplossing.

## Veranderingen
- WebGL-gebaseerde 3D-vlakken met hardwaredieptebuffer: het voorste vlak wordt zichtbaar ongeacht de tekenvolgorde.
- Oude 2D-canvas blijft behouden als interactieve laag voor maatlijnen, selectie, snap/tekenhandvatten en balkbewerking.
- Objectselectie berekent zichtbare diepte en houdt rekening met afdekkende oppervlakken.
- PNG-export combineert 3D-laag en de tekenlaag.
- Geen afhankelijkheid van externe CDN of JavaScript-framework.
- Bij ontbrekende WebGL-ondersteuning blijft de bestaande Canvas 2D-weergave beschikbaar.

## Tests en nog te valideren
- Alle bestaande regressietests blijven beschikbaar.
- Nieuwe tests controleren o.a. afdekking van onderdelen door werkblad, dieptepicking, driehoeken en fallback.
- Visuele rendering moet nog daadwerkelijk worden gecontroleerd in Safari op iPhone en desktopbrowser. De beschikbare lokale browser stelde geen WebGL-context beschikbaar.

## Buiten scope
- Geen nieuwe verbindingen, draagkrachtberekeningen of exacte merk-/apparaatgeometrie.
- De bestaande zaaglijst blijft een indicatieve berekening.
- Deze feature-branch verandert de publieke live-versie niet totdat de PR bewust wordt samengevoegd.