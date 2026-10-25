# Douglas Designer v0.4.1 — Werkblad en balkenpassing

- Werkblad rendert consistenter bij het draaien van de 3D-camera, door grote vlakken in kleine diepte-gesorteerde vlakken op te delen.
- Geselecteerde balk blijft bij meerdere sleepacties beter te pakken, ook als een framebalk eroverheen valt.
- Bij **iedere** verplaatsing wordt opnieuw gekeken of de balk exact tussen twee bestaande balken past. Positie en zaaglengte worden in één undo-stap vastgelegd.
- Huidige modules, vrije tekenmodus, zaaglijst, JSON-opslag en eerdere camerapresets blijven behouden.

## Teststatus en beperkingen
- Geautomatiseerde model-, UI- en renderregressietests; visuele browsertest in Chromium.
- Nog niet gevalideerd op fysieke iPhone/Safari.
- De passing is geometrisch, geen constructieve beoordeling van houtverbindingen.