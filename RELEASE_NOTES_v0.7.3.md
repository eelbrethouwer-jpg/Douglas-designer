# Douglas Designer v0.7.3 RC — Room Capture iPhone Fix

**Status:** concept-release op `fix/v0.7.3-room-capture-ios`, nog niet samengevoegd of gepubliceerd.

## Aanleiding
Gebruiker meldt op iPhone na "Bestaande foto kiezen" exact:

`Foto verwerken mislukt: undefined is not an object (evaluating 'p.room')`

Daarbij overlapt de Room Capture-kop de iPhone-statusbalk/dynamic island.

## Diagnose
Op `main` stond v0.7.2 met een gecorrigeerde `commit(fn)`, maar de fout komt overeen met een **niet-compatibele combinatie van nieuwe Room Studio-code en een oude gecachete app-controller** die `fn()` zonder projectobject uitvoert. Dat is een waarschijnlijke PWA-cacheversieconflictverklaring, niet bewezen uit alleen de screenshot.

## Oplossing
- Room Studio gebruikt `currentProject(maybeProject)`: kiest het expliciete live project of leest de actieve projectreferentie rechtstreeks uit `getProject()`.
- `patchRoom`, materiaalkleuren en componentselecties gebruiken dezelfde compatibele mutatieroute. Daarmee werkt het ook als een oude geïnstalleerde PWA `fn()` zonder argument aanroept.
- Afzonderlijke regressietest bootst de exacte verouderde callback na en controleert upload, kamermaat, houtkleur en onveranderde zaaglijst.
- Room Capture laat een nuttigere foutmelding zien bij opslagproblemen en toont de variant `v0.7.3`.
- Modal-top respecteert `safe-area-inset-top`; de scrollbare modal-body respecteert de home-indicator onderin. iOS statusbalkmodus wordt op standaard gezet.
- HTML-scripts, CSS, app-controller/service-worker-URL en PWA-cache krijgen allemaal een nieuwe `0.7.3` bestandsversie.
- PWA-scriptmix blijft afgevangen, ook als Safari nog een oudere controller heeft geladen.

## Acceptatie
- [ ] GitHub Actions volledig groen inclusief regressie exact gemelde `p.room`-error.
- [ ] Echte iPhone Safari/PWA: foto uit galerij kiezen en daarna een zichtbare preview.
- [ ] Echte iPhone Safari/PWA: camerafoto verwerken.
- [ ] Ruimtemaat wijzigen en duidelijk zichtbaar model, kamerhoekpunten en materiaal aanpassen.
- [ ] Modal-kop blijft volledig onder tijd/wifi/batterij in portret en landschap.
- [ ] Oude projecten blijven openen, frames/zaaglijst blijven intact.

**Belangrijk:** er is geen automatische 3D-fotoreconstructie in deze bugfix; foto wordt gebruikt voor een handmatig te kalibreren schematische preview. Voorkom claims over exacte maatvoering uit één foto.

## Na publicatie
Heropen de geïnstalleerde PWA of laad de webversie opnieuw. Controleer bovenaan de fotodialoog dat **v0.7.3** staat voordat je de nieuwe test uitvoert. Als de webapp op het beginscherm blijft hangen in een oude versie, open eerst de publieke web-URL in Safari en vernieuw die pagina (project-JSON veiligstellen vóór gegevens wissen of app verwijderen).
