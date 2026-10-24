# Release notes

## v0.2.0 — Intuïtiever ontwerpen (24 oktober 2026)

- Welkomstscherm en snelle toevoegen-knoppen.
- Correcte balkrichting: omhoog slepen in 3D/voor/zij verhoogt Y; bovenaanzicht wijzigt Z.
- Automatisch selecteren en verslepen van balken; op mobiel eerst compacte selectie en pas daarna bewerkpaneel.
- Dupliceren, 5 mm verplaatsen, tabletbediening en cache-update.
- Bestaande JSON-projecten en lokale opslag blijven behouden.

**Tests:** 12/12 Node-tests geslaagd, Chromium-interacties op desktop, tablet en mobiel geslaagd. Echte iPhone/Safari-validatie open.

**Beperkingen:** zaagplan voorlopig, inbouw- en veiligheidseisen nog niet gevalideerd; modules nog niet vrij in 3D te verslepen.

## v0.1.0 — Eerste ontwerpstudio (releasekandidaat)

- Interactief 3D-ontwerp met front-, zij- en bovenaanzicht.
- Vijf keukenmodules: laden, koelkast, kamado, deuren en open vak.
- Handmatige Douglas balken met XYZ-positionering en slepen op canvas.
- Automatisch gegenereerde frameconstructie op basis van modulebreedtes.
- Materiaaloverzicht, zaagoptimalisatie en indicatieve balkprijs.
- JSON import/export, PNG-weergave, print/PDF, lokaal bewaren en undo/redo.
- Responsive interface en PWA-bestanden voor HTTPS-hosting.

**Risico's:** aannames bij inbouwmaten, profielen, verbindingen, draagkracht en hitteafstanden; zaaglijst nog niet bouwgereed. Browser- en touchscreenvalidatie nog open.

**Tests:** 9/9 geautomatiseerd geslaagd; volledige browserrendering nog niet geverifieerd.
