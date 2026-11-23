/* Douglas Designer — materiaallijst (bevestiging, platen, beslag, afwerking).
   Pure berekening op basis van het model; geen UI. Afmetingen in millimeters.
   Alle aantallen die niet uit de geometrie komen zijn instelbare AANNAMES (project.materials)
   en prijzen zijn eigen invoer van de gebruiker, nooit live prijzen. */
(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DouglasMaterials = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const ceil1 = (v) => Math.ceil(v * 10 - 1e-9) / 10; // naar boven op 0,1
  const parseNumber = (v) => Number(String(v).replace(',', '.'));

  // Een verbinding = een paar balken dat elkaar raakt (zie model.beamContacts); elk paar telt één keer.
  function connections(p, M) {
    let n = 0;
    for (const set of M.beamContacts(p).values()) n += set.size;
    return n / 2;
  }

  function build(p, M) {
    const m = M.normalizeMaterials(p.materials);
    const waste = 1 + m.wastePct / 100;
    const plan = M.boardPlan(p);
    const joints = connections(p, M);
    const beams = M.allBeams(p);
    const groups = [];
    const line = (id, label, qty, unit, detail, fixedPrice) => ({
      id, label, qty, unit, detail,
      price: fixedPrice !== undefined ? fixedPrice : (m.prices[id] ?? 0),
      priceEditable: fixedPrice === undefined,
      total: qty * (fixedPrice !== undefined ? fixedPrice : (m.prices[id] ?? 0))
    });

    // 1. Douglas balken — uit het zaagplan, één regel per profiel. Standaardprofiel: prijs uit de
    //    zaaginstellingen; andere profielen: eigen prijsinvoer.
    groups.push({title: 'Douglas balken', lines: plan.byProfile.filter(x=>!x.rafters && x.count).map(x => {
      const isDefault = x.profile === M.DEFAULT_PROFILE;
      return line(isDefault ? 'balken-' + x.profile : 'balk-' + x.profile,
        `Douglas ${x.label.replace(' (standaard)', '').replace(' (rachel)', '')} × ${p.stockLength} mm`, x.count, 'st',
        `${x.cutCount} zaagstukken, zaagsnede ${p.kerf} mm`,
        isDefault ? p.beamPrice : undefined);
    })});

    // 2. Bevestiging — uit het aantal verbindingen in het ontwerp.
    const screws = Math.ceil(joints * m.screwsPerJoint * waste);
    const fasteners = [];
    if (screws > 0) fasteners.push(line('schroeven', `RVS constructieschroeven (doos à ${m.screwBox})`,
      Math.ceil(screws / m.screwBox), 'doos',
      `${joints} verbindingen × ${m.screwsPerJoint} schroeven + ${m.wastePct}% reserve = ${screws} stuks`));
    if (fasteners.length) groups.push({title: 'Bevestiging', lines: fasteners});

    // 3. Platen en werkblad.
    const panels = [];
    if (p.countertop && p.modules.length) {
      const ct = M.countertopBox(p); // gelijk aan de 3D-weergave (overstek en dikte uit het project)
      panels.push(line('werkblad', `Werkblad ${ct.h} mm dik (m², incl. overstek)`, ceil1(ct.w * ct.d / 1e6 * waste), 'm²',
        `${ct.w} × ${ct.d} mm + ${m.wastePct}% verlies`));
    }
    const frontMods = p.modules.filter(x => x.kind === 'doors' || x.kind === 'drawers');
    const openingHeight = Math.max(0, p.height - 325); // tussen onder- en bovenligger
    if (frontMods.length && openingHeight > 0) {
      const area = frontMods.reduce((s, x) => s + x.width * openingHeight, 0) / 1e6;
      panels.push(line('fronten', 'Frontpanelen deuren/lades (m²)', ceil1(area * waste), 'm²',
        `${frontMods.length} kast(en) × opening × ${openingHeight} mm hoog, indicatief`));
    }
    const wallPanels = (p.panels || []).filter(x => x.kind === 'cladding'), doorPanels = (p.panels || []).filter(x => x.kind === 'door');
    const roofPanels = (p.panels || []).filter(x => x.kind === 'roof'), rafterPanels = (p.panels || []).filter(x => x.kind === 'rafter');
    // lengte langs de helling (schuine lengte) en gemiddelde hoogte van een paneel met schuine boven-/onderzijde
    const run = x => x.slope ? (x.slope.axis === 'x' ? x.w : x.d) : Math.max(x.w, x.d);
    const slantLen = x => x.slope ? Math.hypot(run(x), x.slope.y2 - x.y) : run(x);
    const avgH = x => x.slope ? (x.h + x.slope.h2) / 2 : x.h;
    if (wallPanels.length) {
      // Oppervlak = zichtvlak per paneel (lengte × gemiddelde hoogte); de dunne zijde telt niet mee.
      const area = wallPanels.reduce((s, x) => s + (run(x) * avgH(x)), 0) / 1e6;
      panels.push(line('bekleding', 'Gevelbekleding / rabatdelen (m²)', ceil1(area * waste), 'm²',
        `${wallPanels.length} wandvlak(ken), ${ceil1(area)} m² + ${m.wastePct}% verlies`));
    }
    if (doorPanels.length) panels.push(line('deuren', 'Buitendeur(en) (st)', doorPanels.length, 'st', doorPanels.map(x => `${Math.max(x.w, x.d)} × ${x.h} mm`).join(', ')));
    if (roofPanels.length) {
      // Dakplaat: schuine lengte × breedte (dwars op de helling).
      const area = roofPanels.reduce((s, x) => s + slantLen(x) * (x.slope ? (x.slope.axis === 'x' ? x.d : x.w) : Math.min(x.w, x.d)), 0) / 1e6;
      panels.push(line('dakbeplating', 'Dakbeplating / dakplaat (m²)', ceil1(area * waste), 'm²',
        `${roofPanels.length} dakvlak(ken), schuin gemeten ${ceil1(area)} m² + ${m.wastePct}% verlies (overstek niet inbegrepen)`));
    }
    if (panels.length) groups.push({title: 'Platen & werkblad', lines: panels});
    if (rafterPanels.length) {
      const timber=plan.byProfile.find(x=>x.rafters);
      if(timber.count)groups.push({title:'Dak',lines:[line('daksparren', `Daksparren 50 × 150 × ${p.stockLength} mm`,timber.count,'st',
        `${timber.cutCount} ingeplande sparren, schuine zaagmaat inclusief 50 mm afkortmarge`)]});

    }

    // 4. Beslag.
    const hardware = [];
    const doorMods = p.modules.filter(x => x.kind === 'doors').length;
    const drawerMods = p.modules.filter(x => x.kind === 'drawers').length;
    if (doorMods && m.hingesPerDoorModule) hardware.push(line('scharnieren', 'Scharnieren',
      doorMods * m.hingesPerDoorModule, 'st', `${doorMods} deurenkast(en) × ${m.hingesPerDoorModule} (aanname)`));
    if (drawerMods && m.drawerSetsPerModule) hardware.push(line('ladegeleiders', 'Ladegeleiders (set)',
      drawerMods * m.drawerSetsPerModule, 'set', `${drawerMods} ladekast(en) × ${m.drawerSetsPerModule} (aanname)`));
    if (hardware.length) groups.push({title: 'Beslag', lines: hardware});

    // 5. Apparatuur — alleen telbaar, prijs altijd eigen invoer.
    const appliances = [];
    const fridges = p.modules.filter(x => x.kind === 'fridge').length;
    const kamados = p.modules.filter(x => x.kind === 'kamado').length;
    if (fridges) appliances.push(line('koelkast', 'Koelkast (zelf invullen)', fridges, 'st', 'afmeting en ventilatie controleren'));
    if (kamados) appliances.push(line('kamado', 'Kamado (zelf invullen)', kamados, 'st', 'hitteafstand volgens fabrikant'));
    if (appliances.length) groups.push({title: 'Apparatuur', lines: appliances});

    // 6. Afwerking — oppervlak van alle balken (omtrek 2 × (50 + 100) mm × lengte).
    const surface = beams.reduce((s, b) => s + 300 * b.length, 0) / 1e6;
    if (surface > 0) groups.push({title: 'Afwerking', lines: [
      line('olie', 'Olie/beits (liter)', ceil1(surface * m.oilCoats / m.oilCoverage), 'L',
        `${surface.toFixed(1).replace('.', ',')} m² hout × ${m.oilCoats} lagen ÷ ${m.oilCoverage} m²/L`)
    ]});

    const total = groups.reduce((s, g) => s + g.lines.reduce((t, l) => t + l.total, 0), 0);
    return {groups, total, joints, screws, settings: m, stockWarning:M.stockWarning(plan,p.stockLength)};
  }

  // Past één instelling of prijs toe; geeft nieuwe, genormaliseerde materials terug.
  // key: "setting:screwsPerJoint" of "price:schroeven". Een leeg prijsveld wist de prijs.
  function applyInput(materials, key, value, M) {
    const next = JSON.parse(JSON.stringify(M.normalizeMaterials(materials)));
    const [kind, name] = String(key).split(':');
    if (kind === 'setting') {
      const v = parseNumber(value);
      if (Object.hasOwn(next, name) && name !== 'prices' && Number.isFinite(v)) next[name] = v;
    } else if (kind === 'price') {
      if (String(value).trim() === '') delete next.prices[name];
      else {const v = parseNumber(value); if (Number.isFinite(v)) next.prices[name] = v;}
    }
    return M.normalizeMaterials(next);
  }

  const nl = (n, d = 2) => n.toLocaleString('nl-NL', {minimumFractionDigits: d, maximumFractionDigits: d});
  function toText(list, name) {
    const out = [`Materiaallijst — ${name} (ontwerpraming)`];
    if(list.stockWarning)out.push(list.stockWarning);
    for (const g of list.groups) {
      out.push('', g.title.toUpperCase());
      for (const l of g.lines) out.push(`- ${nl(l.qty, Number.isInteger(l.qty) ? 0 : 1)} ${l.unit}  ${l.label}${l.price ? `  (€ ${nl(l.price)} p/${l.unit} = € ${nl(l.total)})` : ''}`);
    }
    out.push('', `Totaal: € ${nl(list.total)} (alleen regels met ingevulde prijs)`);
    return out.join('\n');
  }
  // CSV met puntkomma en decimale komma, direct te openen in Nederlandse Excel.
  function toCSV(list) {
    const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [['Groep', 'Materiaal', 'Aantal', 'Eenheid', 'Prijs per eenheid', 'Totaal', 'Toelichting'].map(cell).join(';')];
    for (const g of list.groups) for (const l of g.lines)
      rows.push([cell(g.title), cell(l.label), nl(l.qty, Number.isInteger(l.qty) ? 0 : 1), cell(l.unit), nl(l.price), nl(l.total), cell(l.detail || '')].join(';'));
    if(list.stockWarning)rows.push([cell('Controle'),cell(list.stockWarning),'','','','',''].join(';'));
    rows.push(['', cell('Totaal'), '', '', '', nl(list.total), ''].join(';'));
    return '﻿' + rows.join('\r\n');
  }

  return {build, connections, applyInput, toText, toCSV};
});
