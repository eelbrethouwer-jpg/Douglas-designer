# Sketch Studio — product- en ontwerpspecificatie

Datum: 25 oktober 2026. Bronnen van waarheid: `main` van Douglas Designer plus de eerstvolgende releasekandidaat v0.7.2.

## Visuele referentie en ontwerpprincipe

Referentie: door gebruiker aangeleverde SketchUp-afbeelding van een L-vormige verrijdbare Douglas buitenkeuken met donkere keramische kamado, werkbladen, zichtbare kantlijnen, een neutraal grijs canvas en duidelijke rood/groen/blauwe wereldassen.

**Leidend:** minimaal 65–75% van de beschikbare desktopbreedte voelt als een vrij 3D-werkvlak, geen formulier. Een gebruiker kan de buitenkeuken tekenen en bewerken zonder het model uit beeld te verliezen. Op mobiel blijft het 3D-canvas zichtbaar boven de uitklapbare instellingen.

De referentie is géén bestaande Douglas Designer-scène of een licentie voor het overnemen van SketchUp-code, iconen of modellen. We imiteren de beproefde bediening en visuele hiërarchie met eigen componenten.

## Geometrie en assen

- Eenheden zijn **millimeters**, in project- en zaagmodel.
- Intern bestaand model: `x` is breedte, `y` is hoogte, `z` is diepte.
- Gebruikersvoorbeeld SketchUp: **rood** = horizontale breedte, **groen** = horizontale diepte, **blauw** = verticale hoogte. Dit is **niet** de gebruikelijke SketchUp-lettertoewijzing (SketchUp gebruikt z voor hoogte), maar de huidige Douglas Designer-geometrie wordt niet in deze bugfix gemigreerd. Voor een volgende modelleringrelease moeten labels en wereldassen als API-stabiele abstractie worden gemaakt.
- Het nulpunt is `(0,0,0)` vóór links onderin de ontwerpruimte.
- De 3D-rasterlijnen zijn **niet selecteerbaar** en horen **niet** bij de zaaglijst.
- Rastermaat: 50, 100, 250 of 500 mm. Iedere vijfde rasterlijn is donkerder.
- Grondvlak: lijnen langs X en diepte (intern Z), zowel perspectivisch als in bovenaanzicht.
- Wanden (optioneel): verticale rasterlijnen op de **binnenzijde** van achterwand en linkerwand. Geen doorglurende grid als basis achter massieve objecten.
- Assen: rood X, groen diepte, blauw hoogte; als afzonderlijke zichtbare 3D-hulplijnen.
- Voor zeer grote ruimtes schaalvergroting van het zichtbare grid om de hoeveelheid GPU-geometrie te begrenzen.

## Camera en directe interactie

| Actie | Desktop | Mobiel | v0.7.2 |
|---|---|---|---|
| Orbit / draaien | slepen over leeg 3D-canvas | één vinger slepen | Ja (bestaand) |
| Pan / verschuiven | Shift+slepen of middelste muisknop | later expliciete tool | Desktop ja |
| Zoom | muiswiel / +/- | pinch | Ja (bestaand) |
| Camerapreset | 3D, voor, zij, boven, onder | dezelfde knoppen | Ja |
| Parallel / perspectief | zwevende schakelaar | zwevende schakelaar | Ja |
| Raster & XYZ | aan/uit en stapgrootte | aan/uit en stapgrootte | Ja |
| Maatvaste assenvergrendeling | Shift of pijltoetsen | toolgebaar | Gepland, niet RC |
| Push/Pull van willekeurige vlakken | click-drag + maat | gebaar of veld | Gepland, niet RC |

Bij camera-wissels veranderen alleen weergave/transformaties, nooit productmaten, frame-overrides of zaaglengtes. Parallelle projectie gebruikt de originele world-space geometrie met een lineaire dieptevolgorde in GPU-rendering en selectie.

## 3D canvas en technische keuzes

- Bestaande renderer `render3d.js` blijft; PBR en externe glTF-modellen horen in een aparte rework-release.
- `sketch-grid.js` genereert zuivere wereldcoördinaatgeometrie, zonder DOM of mutaties aan de keuken.
- Het raster wordt naar GPU / Canvas2D-fallback gerenderd via dezelfde scène en depth ordering als kasten, wanden, frame en kamado.
- Geen screenshot als faux-grid en geen overlay die op volle constructie-elementen hoort te liggen.
- De achtergrond heeft een rustig middengrijs. Materialen blijven vooral kleurreferenties; nadrukkelijke object-outline en houttextuur kunnen later worden ontworpen zonder het tekenraster te slopen.

## Room Capture — kritische gebruikersflow

1. Open **Ruimte**: de scène blijft zichtbaar, met live afmetingen/bovenaanzicht.
2. Druk **Bestaande foto kiezen** of **Camera openen** (afzonderlijke besturing).
3. Na de keuze worden een uploadstatus en de foto in de Room Capture-dialog zichtbaar; bij bestands-/decoderfouten ziet de gebruiker een begrijpelijke foutmelding.
4. De JPEG-preview wordt gecomprimeerd voor projectopslag. Als browseropslag faalt, verschijnt een waarschuwing, niet de onterechte status 'opgeslagen'.
5. Klik optioneel vier vloerhoekpunten: voor-links, voor-rechts, achter-rechts, achter-links.
6. Geef **echte, handmatig gecontroleerde** breedte/diepte/hoogte op.
7. Activeer 3D-ruimte; vloer/wanden verschijnen en veranderen bij maatinput direct.
8. Keuken blijft als één object in de ruimte verplaats- en roteerbaar, zonder wijzigingen aan de onderliggende zaaglijst.
9. Fotopreview is een **schematische projectie**; één enkele foto kan geen betrouwbare volledige 3D-reconstructie opleveren.

## Materialen en objectbibliotheek

- Stijlen-tab staat direct in de mobiele navigatie.
- Een klik op een kleurenstaal past projectstijl aan, roept de centrale `commit` met **live projectobject** aan, maakt een undo-stap en hertekent de 3D-geometrie.
- De selectiestatus van de swatch volgt de projectstaat ook na undo/redo en opnieuw openen.
- V1 catalogus: 66 generieke varianten, niet 66 gevalideerde merk-3D-modellen.
- 3D-worktop, kastfront en kamado reageren direct waar het generieke model dat ondersteunt. Een productnaam op zichzelf is niet automatisch een op schaal nagemaakt apparaat.

## Beveiligings-/dataconsistentie-eisen

- Oude `localStorage`-sleutel `douglas-designer-v1` wordt niet veranderd.
- Nieuw rasterbeleid wordt onder `douglas-designer-sketch-grid-v1` apart opgeslagen.
- Projecten zonder `room` of `style` krijgen geldige standaarden. De ruimte staat dan uit.
- Cameraweergave, rasterlijnen en asopties wijzigen nooit de lijst fysieke zaagstukken.
- Browseropslagquotalimiet mag niet stilzwijgend uploadstatus 'succes' teruggeven.
- Alle lokale CSS/JS, inclusief service-worker assetlijst, krijgen een versie-gematchte laadreferentie.

## Releasebeslissing

Een CI-groene PR heet **releasekandidaat**, geen publieke release. De definitieve versie wordt pas gemerged na:
1. desktop Chrome: werkende foto-keuze + canvas, ruimte en materiaalwijzigingen;
2. iPhone Safari: touch, camera, bibliotheekfoto, compact werkvlak;
3. camerastanden: raster zichtbaar en wereldassen volgen rotatie;
4. geen blokkering van automatische framebewerking en zaaglijst;
5. GPU en Canvas2D fallback houden het werkblad ondoorzichtig.

## Vervolg: v0.8.0 Sketch Modeling

Eerst solide modelbediening, dan extra functievolume: direct selecteren van randen/hoekpunten, 3D-assenvergrendeling, lijn/rectangle/Push-Pull, hulplijnen, magneten, uitlijnen en associatieve afmetingen. Pas daarna uitgebreide glTF-assetbibliotheek, PBR/realistische houtnerf, hang- en sluitwerk, prefab-objecten en nauwkeurige room capture via meerdere referenties of LiDAR. Per nieuwe tool dezelfde regressie-eisen als de bestaande balk-/frame-editor.
