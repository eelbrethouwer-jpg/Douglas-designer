# Douglas Designer v0.5.1 RC — Framebewerking & 3D-dieptecorrectie

## Nieuw
- Selecteer ook **automatisch aangemaakte framebalken**: staanders, liggers en dwarsregels.
- Bewerk positie en lengte met slepen, de groene uiteinden, 5-mm verplaatsing of exacte maatvelden.
- Open **Balken → Automatisch frame bewerken** voor de complete lijst (standaard ingeklapt).
- Verberg een framebalk, maak een losse kopie of herstel één onderdeel / het complete frame.
- Aangepaste framebalken worden bewaard in het projectbestand en meegerekend in de zaaglijst; undo/redo blijft werken.

## Verbeterd
- De WebGL-renderer gebruikt perspectiefcorrecte dieptewaarden, zodat grote werkbladvlakken beter worden afgedekt vanuit schuine camera's.
- Een visuele speling van 1 mm voorkomt een exact samenvallende onderkant van het blad en bovenste regels.
- Caching bijgewerkt om nieuwe bronbestanden te laden.

## Teststatus
- GitHub Actions succesvol op de releasekandidaat.
- Nieuwe regressietests voor frame-identiteit, opslag, frameherstel, uitschakelen, ongedaan maken, zaaglijst en projectaanpassing.
- Renderer-tests voor perspectiefcorrecte diepteberekening.
- **Nog niet visueel bevestigd in een echte browser/iPhone:** kwaliteit van het bovenblad vanuit alle camerahoeken en touch-bewerking.

## Belangrijke beperkingen
De app geeft geometrische maten, maar controleert geen sterkte van draagconstructies, bevestigingen, kamado-hitteafstanden of koelkastventilatie. Handmatige aanpassingen aan framebalken vereisen extra bouwkundige controle.

**Status:** releasekandidaat in concept-PR; niet gepubliceerd als GitHub-release.
