# Douglas Designer — Product- en interactiespecificatie

**Versie van dit document:** 25 oktober 2026 · ontwerpdoel voor v1.0  
**Status:** producteisen en acceptatiecriteria, niet allemaal geïmplementeerd.

## 1. Visie

Douglas Designer is een Nederlandstalige, laagdrempelige ontwerptool voor Douglas buitenkeukens en andere maatwerkconstructies. De gebruiker ontwerpt zelf een constructie in een rustige **2D-tekenmodus** en bekijkt of controleert die in **echte 3D**. De constructie, visuele objecten en materiaaluitvoer vormen altijd **één en hetzelfde model**.

Referentie voor gebruiksgemak: Floorplanner (https://floorplanner.com/nl). Niet kopiëren van merkidentiteit of broncode: wel de principes *snel starten, direct manipuleren, exact meten, direct naar 3D kunnen schakelen*.

### Leidende principes
1. **2D om nauwkeurig te ontwerpen; 3D om te begrijpen en te controleren.**
2. Elke aanraking heeft een voorspelbaar resultaat, ook na de tweede, derde of tiende bewerking.
3. Metingen zijn zichtbaar en in **millimeters**; UI-verfraaiing verandert de maatdata nooit.
4. Wat niet bouwkundig doorgerekend is, wordt niet als veilig gepresenteerd.
5. Minder knoppen tegelijk, maar wel directe toegang tot een uitgebreid eigenschappenpaneel.
6. Niet-destructieve bewerking: autosave, undo/redo, project-export en herstel.
7. Alle gereedschappen werken met muis én aanraking; mobiele navigatie mag het ontwerp niet afdekken.

## 2. Hoofdreis van een gebruiker

1. **Start** → keuze *Leeg ontwerp*, *Start met modules*, *Voorbeeld*, of *Open project*.
2. **Maten instellen** → breedte, hoogte, diepte in mm; werkblad optioneel, standaard profiel duidelijk.
3. **Tekenen in 2D** → balktype kiezen; tik/sleep begin-naar-eind; live maat; snap op bestaand hout/raster.
4. **Selecteren** → balk krijgt contour, twee lengtehandvatten, maatlabel en eigenschappenpaneel.
5. **Bewerken** → verslepen, uiteinde trekken, afmeting typen, dupliceren, spiegelen of verwijderen (deels roadmap).
6. **Aansluiten** → "passend maken" op de echte vrije afstand tussen geschikte steunvlakken; expliciet te bevestigen als doelruimte ambigu is (roadmap).
7. **3D bekijken** → volledig orbitten boven/onder, zoomen, fit-to-screen; geen rare gaten of transparante vlakken.
8. **Controleren** → waarschuwingen voor overlap, ontbrekende oplegging, te lange balken, toestel-afstanden.
9. **Materialen** → herleidbare onderdelenlijst, plaatindeling, zaagverlies, handelslengtes, accessoires (gefaseerd).
10. **Bewaren & delen** → projectnamen, JSON-back-up, print-/PDF-tekeningen, afbeeldingen (gefaseerd).

## 3. Editorinteractie

### 3.1 Gereedschapsstanden

| Stand | Klik / tik op leeg vlak | Slepen leeg vlak | Klik/tik op balk | Slepen balk | Slepen uiteinde |
|---|---|---|---|---|---|
| Selecteren in 2D | Deselecteren | Pannen | Selecteren | Verplaatsen | Lengte aanpassen |
| Balk tekenen in 2D | Startpunt | Begin→eind tekenen | Snap naar eindpunt | Volgende balk tekenen | n.v.t. |
| Bekijken in 3D | Deselecteren | Orbitten | Selecteren | Verplaatsen via geprojecteerde as (beperkt) | Bij voorkeur orthografisch aanpassen |

**Ingebouwde bescherming:** tijdens tekenen of het trekken aan een handvat mag de camera nooit onverwacht draaien. Tweevingergebaren voor pannen/zoomen moeten separaat werken. Bij een niet-eenduidige 3D-projectie geen onbetrouwbare maat invoeren; verwijs naar voor-/zij-/bovenaanzicht.

### 3.2 Raster, magneet en maatvoering

- Rasterstappen: **5, 10, 25, 50 mm**; de gekozen stap is zichtbaar.
- Magnetische aansluiting op begin/eind van **alle** balken, ook automatisch gegenereerde frames; later ook profielvlakken, middelpunten en hulplijnen.
- Een magneetpunt toont een visueel merkteken. Magneet tijdelijk uitzetten met **S ingedrukt**; UI-knop voor aan/uit.
- De maat bij tekenen en verlengen wordt direct zichtbaar (in mm); negatieve lengtes kunnen niet ontstaan.
- Normaal slepen verandert positie; uiteindegreep verandert lengte. Het tegenoverliggende uiteinde blijft vast.
- Achteraf invulbare exacte waarden voor x/y/z, lengte en balkprofiel.
- 'Passend maken' toont de gemeten doelruimte; niet automatisch als er meerdere evenwaardige aansluitingen zijn (nog te bouwen).

### 3.3 Selectie en objecten

- Een aanraking selecteert exact één **zichtbaar** object; het werkblad blokkeert onderdelen die er echt achter liggen.
- Objecttypes: vrije balk, automatische framebalk, module, werkblad, apparaat, platen, verbindingen (laatste types roadmap).
- Elk object heeft een stabiele ID; wijzigen mag de ID niet vervangen.
- Contextuele acties afhankelijk van type: eigenschappen, dupliceren, uitschakelen, herstel, passend maken, verwijderen.
- Verwijderen van een frameonderdeel moet expliciet zichtbaar zijn en herstelbaar.
- Het selectiepaneel toont bronstatus: 'automatisch', 'handmatig aangepast', 'vrij onderdeel'.
- Groepen en vergrendelen zijn voor later: verplaatsing van modules mag bestaande handmatige overrides niet stilzwijgend negeren.

### 3.4 Sneltoetsen (huidige Studio-basis)
- V selecteren; B balk tekenen; 1 t/m 5 camerastand; S ingedrukt magneet tijdelijk uit; Esc stoppen; Ctrl/Cmd+Z ongedaan.
- **Niet gebruiken** wanneer focus in invoervelden/keuzelijsten staat.
- Sneltoetsen zijn optioneel: alle primaire functies blijven bereikbaar via zichtbare knoppen.

## 4. Parametrische constructie

### 4.1 Balken en profielen
- Een balk bevat minstens: id, naam, profielbreedte, profielhoogte, as/orientatie, beginpositie, lengte, moduleherkomst en bewerkingsstatus.
- Initiale profielen zijn Douglas **50 × 100 mm**; latere bibliotheek met andere maten.
- Profielwijziging werkt consistent door in 3D, passing, botsingscontrole én materialen.
- As X = breedte, Y = hoogte, Z = diepte; schuine schoren/rotaties zijn aparte toekomstige types.

### 4.2 Automatisch frame
- Basismodule genereert staanders, dwarsregels, boven-/onderregels uit projectmaten.
- Iedere automatisch gegenereerde balk krijgt een **stabiele ID op basis van zijn rol en positie**.
- Handmatige overrides (lengte, positie, verborgen) blijven bewaard in \`frameEdits\` en in JSON-export.
- 'Origineel herstellen' herstelt één balk; 'Herstel automatisch frame' herstelt alle overrides.
- Bij verandering van module-aantal/volgorde moeten rol-ID's opnieuw worden gemapt of conflicten expliciet worden vermeld (niet stilzwijgend wegschrijven).

### 4.3 Aansluitingen en verbindingen
- Geometrische **oplegging** is niet automatisch voldoende voor draagkracht.
- Onderscheid kopse aansluiting, oplegging, hoekverbinding, gedeeltelijke uitsparing en bevestigers.
- Snappen op echte buitenvlakken; nooit zaaglengtes van 50×100 standaardprofiel blind afleiden uit visuele rasterpunten.
- Later controle op unsupported beams, paal-overlap, materiaalruimte en conflict van elementen.
- Geen automatische goedkeuring op doorbuiging, kamado-hitte, draagkracht of verankering zonder gevalideerde rekenmethode.

## 5. Werkblad en apparaten

### 5.1 Werkblad als gesloten object
- Top, onderkant en zijkanten vormen één gesloten solide mesh; geometrie en renderer delen dezelfde afmetingen.
- Een uitsparing komt alleen voor als gebruiker die toevoegt; geen gaten door verborgen balken of sorteerfouten.
- Bewerkbaar: hoogte, dikte, voor-/zijoverstek, materiaal, segmenten en expliciete uitsparingen.
- Rondom het model orbitten mag **geen doorzichtig, flikkerend of weggeknipt blad** veroorzaken.
- Werkbladmaterialen en uitsparingen komen later in de platen-/werkbladstaat, gescheiden van balkhout.

### 5.2 Apparaten en modules
- Ladekast: aantal lades, geleiders, frontdikte, sluitruimte.
- Koelkast: apparaatbreedte/diepte/hoogte en lucht- en servicetoegang, **fabrikant-specifiek**.
- Kamado: diameter, luchttoevoer, uitrol- of draagplateau en hittebescherming, **fabrikant-specifiek**.
- Deuren/open vakken: beslag, sluitrichting, plankpositie en materiaaldikte.
- Te bekijken in 3D als duidelijke placeholders; exacte maten alleen bij expliciete invoer/vertrouwde datasheet.

## 6. Materiaallijst, zaagplan en documenten

- Eén **materialenmodel** dat gekoppeld is aan geometrie. Geen schatting die los raakt van wijzigingen.
- Balkhout: unieke stuklijst met ID, naam, lengte, profiel, aantallen en plaats in project.
- Zaagoptimalisatie: handelslengtes, kerf, reststukpercentages, onmogelijk lange stukken, handmatig controleren.
- Platen: afmetingen, materiaaldikte, zaagplan, nesting/zaagverlies (roadmap).
- Werkblad en uitsparingen: aantal m² / snijmaten (roadmap).
- Bevestigers en beslag: hoeveelheden op basis van gekozen verbindingen (roadmap).
- Prijzen zijn invoerwaarden of bronvermelde actuele winkelprijzen; altijd duidelijk label.
- Export: JSON project, PNG aanzicht, CSV stuklijst, PDF maatblad en totaal bouwdocument (gefaseerd).
- Print/PDF bevat revisie, datum, gebruikte eenheden en controlepunten.

## 7. Projecten, veiligheid en migratie

- Lokale opslag blijft intact tijdens v0.1–v0.6 migraties; import van oudere projecten blijft mogelijk.
- Bij breaking changes: expliciete projectdataversie en migratie, geen stille reconstructie.
- Risicovolle acties (nieuw project, herstellen, verwijderen) geven hersteloptie of bevestiging.
- JSON-export is niet versleuteld; geen gevoelige clouddata vereist.
- Geplande multi-projectlijst met favorieten, kopie, projectinstellingen en revisiegeschiedenis.
- Offline installatie moet **nieuwe versies betrouwbaar tonen** en lokale ontwerpen niet overschrijven.
- Gebruiker ziet wanneer de gegevens lokaal zijn opgeslagen versus wanneer publicatie/caches bijwerken.

## 8. Interfacenormen

- Desktop: duidelijk tekenvlak als grootste paneel, rustige linker onderdelenbibliotheek, rechts contextueel bewerken.
- Mobiel: een werkbaar groot ontwerpvlak, compacte vaste navigatie, editor-sheet alleen indien nodig.
- Aanraakdoelen minimaal circa 44 × 44 px voor primaire knoppen; kleine precisiehandvatten visueel groter bij touch.
- WCAG-gericht: knoppen met echte labels/ARIA, contrast, toetsenbordfocus, geen kleur als enige statusindicator.
- Hoofdhandelingen in maximaal circa drie logische stappen zonder verborgen menu's.
- Voortgangs- en foutmeldingen kort en helder; geen onterechte 'gelukt'-meldingen.
- Performance-doel: vlot roteren/pannen bij tientallen en later honderden balken; meten op echte apparaten, niet aannemen.
- Geen lokale browser- of netwerkfouten laten verdwijnen achter stilzwijgende fallbacks; meld naar gebruiker als WebGL ontbreekt.

## 9. Acceptatie- en regressiematrix

| Scenario | Moet worden gecontroleerd |
|---|---|
| S1 Leeg ontwerp | Geen automatisch frame of blad; herladen blijft leeg |
| S2 Balk tekenen | X/Y/Z, raster 5/10/25/50, eindpuntmagneet, zaaglijst |
| S3 Herhaald bewerken | 10× verslepen/verlengen, inclusief undo/redo en nieuwe passing |
| S4 Automatisch frame | Selectie, verplaatsing, resize, verwijderen, herstel, JSON |
| S5 Modules | Toevoegen/verwijderen/volgorde/breedte met voorspelbare frame-updates |
| S6 Werkblad | Geen gaten bij boven/onder/achter/360° vrije orbit, inclusief schuin |
| S7 2D/3D | Identieke maatgeometrie, goed pannen, zoomen, resetten, correct selecteren |
| S8 Materialen | Alle getekende onderdelen precies eenmaal, juiste lengtes |
| S9 Projectopslag | Refresh, import/export, oude data, geen duplicaten of verlies |
| S10 Mobiel | iPhone Safari, touch, pinch, scroll, select/drag, offline, schermrotatie |
| S11 Browser | Chrome desktop, Safari iPhone, zo mogelijk Firefox + WebGL fallback |
| S12 Documenten | Print/PDF, PNG en nog toe te voegen CSV met overeenkomende maatwaarden |
| S13 Veiligheid | Geen ongetoetste claims over houtverbindingen/hitte/ventilatie |

De automatische Node- en CI-tests bewijzen model- en interfacecodepaden, niet dat 3D visueel foutloos is. Visuele tests moeten expliciet worden afgerond voordat een render-release als stabiel wordt vrijgegeven.

## 10. Releaseproces

1. Actuele GitHub-code als basis, acceptatiecriteria vooraf.
2. Per afgebakende mijlpaal een featurebranch en concept-PR.
3. Modulaire code voor geometrie, renderer, tekenhulpmiddelen, applicatie en export.
4. Syntax-, unit-, regressie- en waar mogelijk browser/beeldtests, samen met echte touch-controle.
5. Alleen na aantoonbare validatie: PR samenvoegen, tag/releasen en GitHub Pages-uitrol bevestigen.
6. Roadmap, productdocumentatie en changelog bijwerken; beperkingen duidelijk tonen.

## 11. Planningsoverzicht

Zie [ROADMAP.md](ROADMAP.md) voor de versievolgorde. Dit document beschrijft het gewenste gedrag, niet de claim dat het al bestaat. De gepubliceerde codebasis is **v0.7.2**; de **leidende concept-PR #14** bevat de v0.7.3-bugfix voor Room Capture op iPhone, callbackcompatibiliteit en safe-areas. Voor deze bugfix zijn 91/91 automatische tests geslaagd (voor integratie van PR #12-documentatie); daadwerkelijke iPhone- en desktop-bediening is nog niet volledig geverifieerd. De historische v0.7.1-nulmeting uit PR #12 (78/78 tests) staat in [QUALITY_GATES.md](QUALITY_GATES.md). Verbindingstypen, uitgebreide apparaten, platenzaagplan, multi-projectbeheer en bouwdocumenten zijn toekomstige fases. Zie [PROJECT_VISION.md](PROJECT_VISION.md), [ARCHITECTURE.md](ARCHITECTURE.md) en [QUALITY_GATES.md](QUALITY_GATES.md) voor productvisie, feitelijke implementatie en releasevoorwaarden.
