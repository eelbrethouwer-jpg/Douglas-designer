/* Douglas Designer — bouwdocumenten: onderdelenlijst (stuklijst), CSV en maattekeningen (SVG).
   Pure functies op basis van het model; geen DOM. Afmetingen in millimeters.
   Alles wat hier staat is een ONTWERPRAMING: geen constructieve goedkeuring. */
(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DouglasDocuments = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const nl = (n) => Math.round(n).toLocaleString('nl-NL');
  const nl2 = (n) => n.toLocaleString('nl-NL', {minimumFractionDigits: 2, maximumFractionDigits: 2});

  // Leesbare plaatsaanduiding voor automatische framebalken, afgeleid uit hun stabiele ID.
  function placeOf(id) {
    let m = /^frame-post-(\d+)-(front|back)$/.exec(id);
    if (m) return `Staander ${+m[1] + 1}, ${m[2] === 'front' ? 'voor' : 'achter'}`;
    m = /^frame-cross-(\d+)-(top|bottom)$/.exec(id);
    if (m) return `Dwarsregel ${+m[1] + 1}, ${m[2] === 'top' ? 'boven' : 'onder'}`;
    m = /^frame-rail-(\d+)-(top|bottom)-(front|back)$/.exec(id);
    if (m) return `Ligger vak ${+m[1] + 1}, ${m[2] === 'top' ? 'boven' : 'onder'}, ${m[3] === 'front' ? 'voor' : 'achter'}`;
    return '';
  }

  // Onderdelenlijst: elk fysiek stuk precies één keer, met stabiel ID en vaste, oplopende code.
  function partsList(p, M) {
    const frame = M.framePieces(p), free = p.beams;
    const rows = [];
    for (const b of frame) rows.push({id: b.id, name: b.name, group: 'Frame', profile: M.profileOf(b).id, length: b.length,
      axis: b.axis, x: b.x, y: b.y, z: b.z, place: placeOf(b.id), status: p.frameEdits && p.frameEdits[b.id] ? 'handmatig aangepast' : 'automatisch'});
    for (const b of free) rows.push({id: b.id, name: b.name, group: 'Losse balken', profile: M.profileOf(b).id, length: b.length,
      axis: b.axis, x: b.x, y: b.y, z: b.z, place: '', status: 'vrij onderdeel'});
    for(const cut of M.rafterCuts(p))rows.push({...cut,place:'Dak',status:'schuine zaagmaat incl. 50 mm afkortmarge'});
    rows.forEach((r, i) => { r.code = 'D-' + String(i + 1).padStart(3, '0'); });
    return rows;
  }

  // CSV: puntkomma, BOM en decimale komma zodat Nederlandse Excel het direct opent.
  // Cellen die met = + - @ beginnen worden voorafgegaan door ' om formule-injectie te voorkomen.
  function csvCell(v) {
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function partsCSV(rows) {
    const out = [['Code', 'ID', 'Onderdeel', 'Groep', 'Profiel', 'Lengte (mm)', 'Richting', 'X (mm)', 'Y (mm)', 'Z (mm)', 'Plaats', 'Status'].map(csvCell).join(';')];
    for (const r of rows) out.push([csvCell(r.code), csvCell(r.id), csvCell(r.name), csvCell(r.group), csvCell(r.profile), r.length,
      csvCell(r.axis.toUpperCase()), r.x, r.y, r.z, csvCell(r.place), csvCell(r.status)].join(';'));
    return '﻿' + out.join('\r\n');
  }

  // Maattekening als SVG-tekst. view: 'front' (x/y), 'side' (z/y) of 'top' (x/z). Boven: voorzijde onderaan.
  const VIEWS = {
    front: {h: 'x', v: 'y', hw: 'w', vw: 'h', title: 'Vooraanzicht'},
    side: {h: 'z', v: 'y', hw: 'd', vw: 'h', title: 'Zijaanzicht'},
    top: {h: 'x', v: 'z', hw: 'w', vw: 'd', title: 'Bovenaanzicht'}
  };
  function drawingSVG(p, M, view) {
    const V = VIEWS[view];
    if (!V) throw new Error('Onbekend aanzicht: ' + view);
    const dims = {x: p.width, y: p.height, z: p.depth};
    const W = dims[V.h], H = dims[V.v];
    const ML = 70, MR = 70, MT = 50, MB = 80, AW = 800;
    const scale = Math.min((AW - ML - MR) / W, 380 / H);
    const dw = W * scale, dh = H * scale, total = Math.round(dh + MT + MB);
    const X = (u) => +(ML + u * scale).toFixed(1);
    const Y = (v) => +(MT + dh - v * scale).toFixed(1); // v omhoog; in het bovenaanzicht ligt z=0 (voorzijde) onderaan
    const rect = (u, v, w, h, cls, extra = '') => {
      const x = X(u), y = Y(v + h), ww = +(w * scale).toFixed(1), hh = +(h * scale).toFixed(1);
      return `<rect x="${x}" y="${y}" width="${ww}" height="${hh}" class="${cls}" ${extra}/>`;
    };
    const parts = [];
    const beams = M.allBeams(p);
    // volgorde: achterste eerst zodat de voorste balken bovenop liggen
    const depthKey = view === 'front' ? 'z' : view === 'side' ? 'x' : 'y';
    const ordered = beams.map(b => ({b, box: M.beamBox(b)})).sort((a, c) => c.box[depthKey] - a.box[depthKey]);
    for (const {b, box} of ordered) {
      parts.push(rect(box[V.h], box[V.v], box[V.hw], box[V.vw], b.group === 'Losse balken' ? 'bm free' : 'bm', `data-id="${esc(b.id)}"`));
    }
    if (p.countertop && p.modules.length) {
      const c = M.countertopBox(p);
      parts.push(rect(c[V.h], c[V.v], c[V.hw], c[V.vw], 'ct'));
    }
    // overall dimensions
    const dimLine = (x1, y1, x2, y2, label, vertical) => {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const text = vertical
        ? `<text x="${mx + 14}" y="${my}" transform="rotate(-90 ${mx + 14} ${my})" text-anchor="middle" class="dt">${label}</text>`
        : `<text x="${mx}" y="${my - 5}" text-anchor="middle" class="dt">${label}</text>`;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="dl"/>${text}`;
    };
    const dimParts = [];
    dimParts.push(dimLine(X(0), MT + dh + 52, X(W), MT + dh + 52, `${nl(W)} mm`, false));
    dimParts.push(dimLine(ML + dw + 40, Y(0), ML + dw + 40, Y(H), `${nl(H)} mm`, true));
    if (view === 'front' && p.modules.length) {
      const {sections} = M.boundaries(p);
      for (const s of sections) dimParts.push(dimLine(X(s.left), MT + dh + 24, X(s.right), MT + dh + 24, `${nl(s.module.width)}`, false));
    }
    const label = `${VIEWS[view].title} — ${esc(p.name)}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${AW} ${total}" role="img" aria-label="${label}" class="dd-drawing">` +
      `<style>.bm{fill:#d8b48a;stroke:#6b4a2b;stroke-width:1}.bm.free{fill:#ecd2ad}.ct{fill:none;stroke:#444;stroke-width:1.2;stroke-dasharray:6 3}` +
      `.dl{stroke:#2d6c59;stroke-width:1}.dt{font:11px sans-serif;fill:#1f3d33}.tt{font:600 13px sans-serif;fill:#25302e}</style>` +
      `<text x="${ML}" y="26" class="tt">${label}</text>${parts.join('')}${dimParts.join('')}</svg>`;
  }

  // Volledig bouwdocument als HTML-fragment (voor in de modal; print/PDF via de browser).
  function documentHTML(p, M, MAT, opts = {}) {
    const date = opts.date || new Date().toLocaleDateString('nl-NL');
    const version = opts.version || '';
    const rows = partsList(p, M), plan = M.boardPlan(p), warnings = M.warnings(p);
    const list = MAT ? MAT.build(p, M) : null;
    let h = `<div class="dd-doc"><h3 style="margin:0 0 4px">Bouwdocument — ${esc(p.name)}</h3>` +
      `<div class="notice-small" style="margin-top:6px"><strong>ONTWERPRAMING</strong> · revisie ${esc(date)}${version ? ' · app ' + esc(version) : ''} · alle maten in mm · ` +
      `geen constructieve goedkeuring: draagkracht, verbindingen, ventilatie en hitteafstand zelf of via een constructeur controleren.</div>`;
    h += `<h4 class="cut-section">MAATTEKENINGEN</h4>`;
    for (const v of ['front', 'side', 'top']) h += `<div style="margin:8px 0;break-inside:avoid">${drawingSVG(p, M, v)}</div>`;
    h += `<h4 class="cut-section">ONDERDELENLIJST (${rows.length} STUKS)</h4><table class="cuttable"><thead><tr><th>Code</th><th>Onderdeel</th><th>Profiel</th><th>Lengte</th><th>Positie X / Y / Z</th><th>Status</th></tr></thead><tbody>`;
    for (const r of rows) h += `<tr><td>${esc(r.code)}</td><td>${esc(r.name)}${r.place ? `<br><small style="color:#8a968d">${esc(r.place)}</small>` : ''}</td><td>${esc(r.profile.replace('x', ' × '))}</td><td>${nl(r.length)}</td><td>${r.x} / ${r.y} / ${r.z}</td><td>${esc(r.status)}</td></tr>`;
    h += `</tbody></table>`;
    h += `<h4 class="cut-section">ZAAGPLAN (HANDELSLENGTE ${nl(p.stockLength)} MM, ZAAGSNEDE ${p.kerf} MM)</h4><table class="cuttable"><thead><tr><th>Balk</th><th>Profiel</th><th>Zaagstukken (mm)</th><th>Rest</th></tr></thead><tbody>`;
    plan.boards.forEach((b, i) => { h += `<tr><td>${i + 1}</td><td>${esc(b.profile.replace('x', ' × '))}</td><td>${b.cuts.map(c => nl(c.length)).join(' + ')}</td><td>${nl(p.stockLength - b.used)}</td></tr>`; });
    h += `</tbody></table>`;
    if (plan.impossible.length) h += `<div class="warning">${plan.impossible.length} onderdeel/onderdelen zijn langer dan de handelslengte en staan niet in het zaagplan.</div>`;
    if (list) {
      h += `<h4 class="cut-section">MATERIAALLIJST</h4><table class="cuttable"><thead><tr><th>Materiaal</th><th>Aantal</th><th>Prijs p/e.</th><th>Totaal</th></tr></thead><tbody>`;
      for (const g of list.groups) {
        h += `<tr><td colspan="4"><strong>${esc(g.title)}</strong></td></tr>`;
        for (const l of g.lines) h += `<tr><td>${esc(l.label)}<br><small style="color:#8a968d">${esc(l.detail || '')}</small></td><td>${Number.isInteger(l.qty) ? l.qty : l.qty.toFixed(1).replace('.', ',')} ${esc(l.unit)}</td><td>${l.price ? '€ ' + nl2(l.price) : '—'}</td><td>${l.total ? '€ ' + nl2(l.total) : '—'}</td></tr>`;
      }
      h += `</tbody></table><p><strong>Totaal ontwerpraming (regels met ingevulde prijs): € ${nl2(list.total)}</strong></p>`;
    }
    h += `<h4 class="cut-section">CONTROLEPUNTEN</h4>`;
    h += warnings.length ? warnings.map(w => `<div class="warning">${esc(w)}</div>`).join('') : '<p>Geen automatische waarschuwingen. Controleer maten en verbindingen altijd zelf.</p>';
    return h + '</div>';
  }

  return {partsList, partsCSV, drawingSVG, documentHTML, placeOf};
});
