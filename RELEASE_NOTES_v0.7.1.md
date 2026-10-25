# Douglas Designer v0.7.1 RC — Sketch Studio: Room & Materials Fix

## Probleem
Bij de mobiele weergave werd het werkelijke 3D-canvas verborgen zodra **Ruimte** was gekozen. Daardoor leek het alsof wijzigen van afmetingen en materialen niets deed. De uploadactie was bovendien onduidelijk doordat de mobiele fotokiezer standaard naar de camera stuurde.

## Gebouwd
- 3D-canvas blijft altijd zichtbaar in de mobiele schermen **Ruimte** en **Stijlen**.
- Compact, sticky 3D-canvas op de telefoon terwijl je instellingen daaronder kunt wijzigen.
- Live 2D-bovenaanzicht met de juiste ruimteafmetingen, wandkeuzes en de getransformeerde keukenpositie.
- Directe navigatie naar **Stijlen** via de mobiele onderbalk.
- Afzonderlijke acties **Bestaande foto kiezen** en **Camera openen** (geen geforceerde camera bij bibliotheekkeuze).
- Begrijpelijke voortgang/waarschuwing in de fotodialoog, ook als het fotoformaat niet kan worden geopend.
- Automatische verkleining/compressie van afbeeldingen om lokale opslag te beperken.
- Uitdrukkelijke **Bekijk 3D**-knoppen bij ruimtematen en materialen.
- Visuele aanduiding van het actuele 3D-ruimtemodel in de werkomgeving.
- SketchUp-achtige besturing op desktop: slepen om de camera te draaien, **Shift + slepen** of middelste muisknop om te verschuiven, scrollen om te zoomen.
- Vernieuwde HTML/PWA-cacheversie, zodat de opgeloste scripts geladen worden.
- Extra UI-integratie- en regressietests voor foto-upload, materiaalkeuze en live-plattegrond.

## Beperkingen
Dit is een gerichte bruikbaarheids- en bugfixrelease, nog geen volledige SketchUp-kloon. Het tekenen van muren met push/pull, uitgebreide assen-gizmo's, fotogrammetrie en hoogwaardige PBR-materialen zijn geen onderdeel van deze patch. De Room Capture-fotopreview blijft een schematische projectie, geen maatvaste fotoreconstructie.

## Acceptatiecriteria
- [ ] GitHub Actions Node-unit-, syntax- en regressietests groen
- [ ] Desktop Chrome: materiaal aanklikken verandert de 3D-kleur
- [ ] Mobiel Safari: Ruimte en Stijlen openen met **zichtbaar** 3D-werkvlak
- [ ] Mobiel Safari: foto kiezen opent de galerij; camera opent de camera
- [ ] Na wijziging van afmetingen verandert de plattegrond én de 3D-ruimte
- [ ] Bestaande projecten, automatisch frame en zaaglijst ongewijzigd

**Status:** concept-release; niet samenvoegen of publiceren vóór acceptatie.
