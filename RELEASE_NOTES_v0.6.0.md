# Douglas Designer v0.6.0 RC — Studio: betrouwbaar tekenen in 2D en controleren in 3D

**Status:** gestapelde concept-releasekandidaat, gebouwd bovenop de nog openstaande v0.5.1 RC. Niet gepubliceerd.

## Opgeleverd in deze stap
- **3D-engine opnieuw opgebouwd:** wereldcoördinaten gaan rechtstreeks naar WebGL, met een cameratransformatie en dieptebuffer op de GPU. De diepteberekening gebruikt dus niet langer vooraf naar 2D geprojecteerde vlakken. Dat is een architecturale verbetering, maar het bovenblad moet nog visueel vanuit alle hoeken getest worden.
- **Echte 2D-navigatie:** slepen op leeg tekenvlak verschuift het beeld in voor-/zij-/bovenaanzicht. Slepen in 3D draait het model.
- **Nauwkeuriger tekenen:** instelbaar raster (5 / 10 / 25 / 50 mm), een optionele magneet op bestaande balkuiteinden (ook automatische framebalken) en een zichtbare snap-indicator.
- **Sneltoetsen:** V selecteren, B balk tekenen, 1–5 camerastanden, S vasthouden om magneet tijdelijk uit te schakelen, Esc stoppen, Ctrl/Cmd+Z ongedaan.
- **Compacte Studio-werkbalk** en een korte toegankelijke sneltoetsengids. De bestaande zaaglijst, opslag en modulefuncties blijven behouden.

## Test- en acceptatieplan
- Geautomatiseerde regressies voor 3D-cameraprojectie, occlusie, rasterstappen, snap-punten en behoud van bestaande functies.
- Vergelijk 2D-overlay met 3D-model bij draaien, pannen en zoomen.
- Test werkblad vanuit meerdere vrije camerahoeken en boven/onder bij echte WebGL-rendering.
- Test balk tekenen, selecteren, framebalk bewerken, verlengen, undo/redo, export/import, herladen en zaaglijst op Chrome én fysieke iPhone Safari.
- Test fallback zonder WebGL.

**Nog niet beweerd:** een volledig visueel gevalideerde, stabiele professionele release, constructief goedgekeurde verbindingen of complete materiaallijsten. De overige roadmapfasen blijven open.

## Referentie
De interactie is geïnspireerd op Floorplanner: doelgericht 2D tekenen, direct selecteren/aanpassen en wisselen naar 3D voor controle. Douglas Designer heeft zijn eigen code, componenten en visuele identiteit.
