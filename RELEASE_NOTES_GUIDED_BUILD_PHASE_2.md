# Guided Build fase 2 — Start & Ruimte

- **Start** toont het actieve project, andere lokale projecten en de drie bewerkbare templates op één scherm. Een bestaand project opent direct in Ontwerp. Een nieuw basisontwerp, leeg tekenvlak of template opent in Ruimte. Het voorbeeld blijft direct te bekijken.
- **Ruimte** laat breedte, diepte en hoogte per millimeter instellen. Voeg rechthoekige obstakels toe met een eigen naam, afmetingen en positie vanaf de linker voorhoek. Bewerk of verwijder ze in hetzelfde paneel. Het bovenaanzicht toont de obstakels altijd. Schakel **3D-ruimte tonen** in om ze ook in 3D te zien.
- **Naar ontwerp** opent de bestaande editor. Foto en vloerhoeken, keukenplaatsing, stijlen, plattegrond, scan, tekenfuncties, controle en zaaglijst blijven bereikbaar.
- Ruimtematen en obstakels horen bij het bestaande lokale project en gaan mee in project-JSON en volledige back-ups. Opslagsleutels blijven gelijk. Obstakels zijn referentieblokken buiten de zaag- en materiaallijst. Een blok dat na het meten buiten de ruimte valt, krijgt een melding.
- De PWA vernieuwt de app-cache naar `douglas-designer-v1.0.0-rc3.guided2`.

## Validatie

De automatische suite omvat een browserroute op 390, 768 en 1400 px, hervatten na herladen, obstakels toevoegen, wijzigen en verwijderen, undo/redo, bestaande ontwerpgereedschappen en een PWA-upgrade met offline herladen. De bredere Chrome-regressie controleert onder meer projectmigratie, import en export, zaaglijsten, fotoaanlevering en tekenfuncties.

Fysieke iPhone-validatie in Safari en in de geïnstalleerde PWA staat open. Obstakels hebben rechthoekige vormen en dienen als visuele referentie voor het ontwerp.
