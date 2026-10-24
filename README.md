# Douglas Designer — Buitenkeuken Studio

**Versie:** v0.1.0 · releasekandidaat

Een interactieve ontwerper voor buitenkeukens van Douglas. In de browser kun je complete kastmodules toevoegen, losse 50 × 100 mm Douglas balken bewerken, het ontwerp draaien in 3D en een indicatieve zaaglijst genereren.

## Open de app

Na succesvolle GitHub Pages-publicatie: **https://eelbrethouwer-jpg.github.io/Douglas-designer/**

Open via Safari op iPhone en kies **Deel > Zet op beginscherm** om een snelkoppeling te maken. De huidige versie is een zelfstandige HTML-app zonder cloudaccount; automatische opslag gebeurt in de browser. Exporteer ontwerpen regelmatig als JSON.

## Functies

- Live 3D-canvas met voor-, zij-, boven- en 3D-aanzicht en zoom.
- Complete modules: ladekast, koelkast, kamado, deurenkast en open vak.
- Losse Douglas balken positioneren met mm-nauwkeurige X/Y/Z-velden.
- Buitenmaten wijzigen; openingen en frame worden opnieuw berekend.
- Automatische frame-opbouw en voorlopige optimalisatie van zaaglengtes.
- Project-JSON importeren/exporteren, ontwerpafbeelding downloaden, afdrukken/PDF.
- Ongedaan maken/opnieuw en lokale opslag.

## Voorbeeldafmetingen (AANNAME)

1875 × 870 × 950 mm; modules 520, 600 en 555 mm; Douglas balken 50 × 100 mm; handelslengte 2800 mm. Deze maten zijn **niet opnieuw op locatie geverifieerd**. De prijs per balk in de demo is fictief.

**LET OP:** Dit programma geeft nog geen constructieve goedkeuring en controleert geen kamado-hitteafstanden, koelkastventilatie, schroefverbindingen of draagkracht. Behandel de zaaglijst als indicatief en controleer alle maten vóór bestelling en bouw.

## GitHub Pages

1. Open **Settings → Pages**.
2. Kies bij **Build and deployment → Source**: **GitHub Actions**.
3. Controleer of de workflow **Test and publish Douglas Designer** succesvol is (onder **Actions**).
4. Bezoek vervolgens de projectwebsite hierboven.

De workflow controleert JavaScript-syntax en voert automatische modeltests uit vóór iedere deployment. Voorlopig is de distributie **één zelfstandige index.html** (geen build-tool nodig). De opgesplitste bronbestanden zijn beschikbaar in de project-ZIP die bij de eerste oplevering is geleverd.

## Status

- Zelfstandige prototype-app: beschikbaar.
- Geautomatiseerde modeltests: aanwezig.
- Safari/iPhone handmatig end-to-end testen: **nog niet uitgevoerd**.
- GitHub Pages online: pas te bevestigen na geslaagde workflow/deploy.
