# Douglas Designer v0.7.0 RC — Room Studio

**Status: releasekandidaat op aparte branch, niet gepubliceerd op main.**

## In deze kandidaat gebouwd

- Extra navigatie **Ruimte** met afmetingen, vloervlak, achterwand en optionele zijwand.
- Upload van een eigen foto op desktop of iPhone; lokaal naar een verkleinde JPEG omgezet.
- Vier handmatig aan te wijzen vloerhoekpunten (voor-links → voor-rechts → achter-rechts → achter-links).
- Begeleide workflow om een 3D-ruimte te maken en bij te stellen met ingevoerde, echte maten.
- Een keuken als geheel plaatsen in de ruimte met X/Z-coördinaten, 0/90/180/270 graden, centreren of bij de achterwand.
- Geometrische buitenruimte- en hoogtewaarschuwingen; plaatsingswijzigingen veranderen **geen** balkmaten of zaagstukken.
- **Fotopreview (conceptprojectie):** keukenvolume schematisch op de originele foto, expliciet niet fotorealistisch of maatvast.
- Catalogus met 66 generieke kleur- en componentvarianten: 32 kleurreferenties (hout, werkblad, kastfront en kamado) en 34 componentopties (deuren, lades, grepen en accessoires).
- Kleuren in bestaande 3D-renderer zichtbaar; eenvoudige variatie in deur- en lade-indelingen.
- Opslaan, undo/redo, project JSON-export met optionele foto; bestaande projecten krijgen standaard een uitgeschakelde ruimte en blijven importeerbaar.
- Responsieve Room Capture-interface en een knop **Ruimte** op de mobiele navigatie.

## Technische aanpak

- Bestaand `model.js`, `drafting.js` en GPU-renderer zijn behouden.
- `room-space.js` is een aparte toetsbare geometrie-/catalogusmodule.
- `room-studio.js` biedt de interacties; `room-studio.css` is responsief.
- Alle ontwerpafmetingen blijven in millimeters; kamerpositie wordt als afzonderlijke transformatie toegepast.
- De foto wordt verkleind en in het lokale JSON-project opgeslagen. Dit kan opslagruimte kosten. Meldingen blijven zichtbaar wanneer opslag niet lukt.

## Expliciet nog niet aanwezig

- Geen automatische AI-foto-naar-3D-reconstructie, LiDAR, echte camerapose of exacte fotogrammetrie.
- Geen Three.js, echte PBR-texturen, import van fabrikant-3D-modellen of fotorealistische rendering. De catalogus bestaat voorlopig uit generieke kleurreferenties en instellingen.
- Accessoires en alle frontvarianten zijn nog niet als afzonderlijke complete geometrische 3D-objecten beschikbaar.
- Geen automatische bouwkundige goedkeuring: let op hitte, draagvermogen en koelkastventilatie.
- Geen volledige iPhone-Safari-visuele test of handmatig bevestigde fotopreview. Merge pas na acceptatie.

## Acceptatie / releasepoorten

- `node --check` op alle JS-bestanden.
- `node --test tests/*.test.js`, inclusief toekomstige browser-smoke-test.
- Project import/export met en zonder ruimtefoto.
- Keuken op vier rotaties binnen/buiten ruimte met controle van meldingen.
- 3D van alle kanten: geen doorzichtige platen, geen selectie- of cameraproblemen.
- Chrome desktop + Safari iPhone: upload, tikken van vier hoeken, navigatie, model, undo/redo, bestandsexport.
- Test bestaand ontwerp volledig: frame-overrides, balken, maatvoering, zaaglijst.
- Publicatie alleen na groene CI én handmatige acceptatie.

## Risico's

- Groot project met foto kan browseropslaglimiet bereiken; maak JSON-back-ups.
- Enkelvoudige foto plus vier vloerpunten geeft geen volledige 3D-meetgegevens.
- Huidige WebGL1-renderer blijft beperkt tot ingekleurde geometrie; realistische texturen zijn een volgende technische tranche.

**Releasekandidaat, geen productierijpe volledige Room Capture.**
