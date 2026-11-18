# Douglas Designer v1.0.0-rc1 (release candidate)

Laptop/desktop is leidend; de telefoon is een hulpmiddel om dingen door te geven.

## Nieuw
Meerdere projecten, materiaal- en zaaglijst per profiel, bouwdocument met aanzichten, delen via link/bestand, aanleveren van foto's en maten vanaf de telefoon, meten (M), reeks kopiëren, apparaat- en werkbladinstellingen, conflictcontrole.

## Gecontroleerd
- 146 unit-tests, 0 fouten.
- `node tools/e2e.js` in headless Chrome (desktop): alle scenario's PASS.

## Niet gecontroleerd / beperkingen
- Geen test op echte iPhone Safari (G5, niet blokkerend).
- Publieke Pages-versie en caches niet gecontroleerd (G7).
- Geen Push/Pull, vlak/rand-selectie of multi-select.
- Verbindingen/schroeven zijn een eenvoudige schatting.
- Geen constructeursvalidatie: alles is een **ontwerpraming**, geen uitspraak over draagkracht, hitte of ventilatie.
- Niet als productie bestempeld totdat de eigenaar het op de eigen laptop heeft gebruikt.
