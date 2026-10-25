# Douglas Designer v0.3.0 — Vrij orbitten, balkenpalet en automatisch passend maken

## Nieuw

- **Vrijer 3D-draaien**: camera kan zowel boven als onder de constructie draaien. Extra knop **Onder**, naast 3D / Voor / Zij / Boven.
- **Balkenpalet aan de zijkant** met drie typen: horizontale regel (X), staander (Y) en dieptebalk (Z).
- **Direct plaatsen**: sleep een balk vanuit het palet naar het canvas (pointer) of tik een type aan en kies daarna de plek. Geen onverwachte middenpositie meer.
- **Plaatsvoorbeeld** op het canvas met aanduiding van de gekozen balk en, wanneer mogelijk, berekende lengte.
- **Passend maken tussen balken**: vrije afstand tussen twee werkelijk overlappende steunvlakken wordt berekend; lengte en startpositie passen zich aan. Ook handmatig via de knop in het eigenschappenpaneel.
- **Aanraakbediening**: bij slepen op kleinere schermen wordt het tekenvlak getoond zonder de oorspronkelijke balkenknop direct te verwijderen.
- Zaaglijst werkt door op basis van het aangepaste individuele balkonderdeel.

## Behouden

- Bestaande ontwerpopslag (`douglas-designer-v1`), export/import, undo/redo, modules, 3D-aanzichten, afmetingen en zaaglijst.

## Teststatus

- 20/20 automatische Node.js tests geslaagd, waaronder 7 nieuwe tests voor passing en 1 nieuwe UI-smoketest voor plaatsing.
- JavaScript-syntaxchecks geslaagd.
- Handmatig volledig browser-/Safari-/iPhone-testen kon hier niet worden afgerond doordat de browseromgeving lokale navigatie blokkeert. Op een echte iPhone controleren vóór definitieve productierelease.

## Grenzen en veiligheid

De passing betreft **alleen geometrische raakvlakken** van rechthoekige 50 × 100 mm balken in het model. Er wordt geen verbindingsdetail, bevestigingssterkte, bouwkundige draagkracht, uitzettingsruimte, hittebescherming of koelkastventilatie gevalideerd. Als er geen twee steunvlakken gevonden worden, plaatst de app een instelbare standaardbalk en toont een melding. De zaaglijst is nog indicatief.