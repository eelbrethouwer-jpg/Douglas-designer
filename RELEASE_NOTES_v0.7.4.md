# Douglas Designer v0.7.4 RC — Vloerpunten vrij verplaatsen

**Status: concept-PR, nog niet gemerged of gepubliceerd.**

## Oorzaak
In v0.7.3 werd een `pointerdown` genegeerd zodra `room.corners.length >= 4`. Daardoor waren bestaande punten in de foto **niet meer te corrigeren**. De gebruiker zag wel vier verbonden punten, maar tikken/slepen op iPhone leverde geen verandering op.

## Aanpassingen
- **Elk van de vier punten opnieuw verslepen** met muis of iPhone-vinger, inclusief pointer capture, en direct de polygon bijwerken.
- **Tik-op-punt-en-dan-op-nieuwe-plek** om ook nauwkeurig te corrigeren zonder lang te slepen.
- **Punt 1–4-knoppen** onder de foto als alternatief voor kleine touch-handvatten, ook voor punten vlak bij de rand.
- Grotere, gemarkeerde actieve handvatten en een korte duidelijke toelichting op de vloerhoekvolgorde.
- De huidige foto, overige punten en constructie/zaaglijst blijven behouden.
- Wijzigingen worden pas bij loslaten in projectopslag/undo opgeslagen; geen lokale opslagspam tijdens iedere dragbeweging.
- Onbedoelde annulering via `pointercancel` zet het punt terug; nieuwe plaatsingen buiten de foto worden tot de rand begrensd.
- Eigen iPhone touch-optimalisatie (`touch-action:none` op de fotocanvas, zonder scrolling in de rest van de dialoog uit te schakelen).
- HTML, PWA-service-worker, Room Studio JS/CSS op v0.7.4; geen oude fotocanvascode na release.
- Uitgebreide automatische UI-tests: bestaande hoek slepen, nieuwe positie tikken, expliciete puntselectie, `pointercancel`, opslag en onveranderde zaaglijst.

## Acceptatie
- [ ] Alle GitHub Actions-checks geslaagd, inclusief `Validate` verplicht bij beschermd `main`.
- [ ] Fysieke iPhone Safari/PWA: voeg een foto toe, tik vier punten en versleep daarna alle vier onafhankelijk.
- [ ] Scherm laat ook bij een lange/verticale foto de vier punten zien en je kunt ze bij de randen aanwijzen.
- [ ] Druk Punt 1–4 en tik op een nieuwe plek; de gekozen hoek verplaatst.
- [ ] Sluit/open Room Capture: hoeken staan nog op de juiste plaats.
- [ ] Oude ontwerpen, materiaalkleuren, frame-overrides en zaaglijst blijven behouden.

**Grenzen:** 4 vloerhoekpunten vormen een handmatige perspectiefindicatie. Dit is geen automatische of maatvaste 3D-reconstructie. De werkelijke ruimtematen moeten afzonderlijk worden ingevoerd.
