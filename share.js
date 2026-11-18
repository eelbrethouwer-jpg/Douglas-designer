/* Douglas Designer — delen en aanleveren zonder server.
   Laptop → telefoon: deellink (project in de URL-hash, zonder foto's) of bestand.
   Telefoon → laptop: "aanlevering" (maten, opmerkingen, foto's) als bestand of link (zonder foto's).
   Alles wat binnenkomt is ONBETROUWBARE invoer: het wordt gevalideerd, begrensd en nooit automatisch
   toegepast. Pure functies; compressie gebruikt CompressionStream/DecompressionStream waar beschikbaar. */
(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DouglasShare = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const FORMAT = 'douglas-designer-share';
  const VERSION = 1;
  const LIMITS = {
    hash: 120000,          // maximale lengte van het deel na #share=
    inflated: 3 * 1024 * 1024, // maximale grootte na uitpakken (zip-bomb-bescherming)
    file: 8 * 1024 * 1024, // maximale bestandsgrootte voor een aanlevering
    photos: 4, photoChars: 450000, notes: 2000, name: 80
  };
  const JPEG = /^data:image\/jpeg;base64,[a-z0-9+/=]+$/i;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const num = (v) => Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : null;
  const text = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);

  // ---- base64url ----
  function toB64Url(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64Url(s) {
    if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('Ongeldige link');
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const hasStreams = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function' && typeof Response === 'function';
  async function deflate(bytes) {
    const cs = new CompressionStream('deflate-raw'), w = cs.writable.getWriter();
    w.write(bytes); w.close();
    return new Uint8Array(await new Response(cs.readable).arrayBuffer());
  }
  async function inflateLimited(bytes, max) {
    const ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter();
    w.write(bytes).catch(() => {}); w.close().catch(() => {});
    const reader = ds.readable.getReader(), chunks = [];
    let total = 0;
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      total += value.length;
      if (total > max) { reader.cancel().catch(() => {}); throw new Error('Link is te groot'); }
      chunks.push(value);
    }
    const out = new Uint8Array(total);
    let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.length; }
    return out;
  }

  // ---- links: "z." = gecomprimeerd, "u." = ongecomprimeerd (als de browser geen streams heeft) ----
  async function encodeLinkData(payload) {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    if (hasStreams()) return 'z.' + toB64Url(await deflate(bytes));
    return 'u.' + toB64Url(bytes);
  }
  async function decodeLinkData(str) {
    const s = String(str || '');
    if (s.length > LIMITS.hash) throw new Error('Link is te lang');
    const kind = s.slice(0, 2), body = s.slice(2);
    let bytes;
    if (kind === 'z.') {
      if (!hasStreams()) throw new Error('Deze browser kan de link niet uitpakken');
      bytes = await inflateLimited(fromB64Url(body), LIMITS.inflated);
    } else if (kind === 'u.') {
      bytes = fromB64Url(body);
      if (bytes.length > LIMITS.inflated) throw new Error('Link is te groot');
    } else throw new Error('Onbekend linkformaat');
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  const linkFor = (base, data) => String(base).replace(/#.*$/, '') + '#share=' + data;
  const dataFromHash = (hash) => { const m = /^#share=([A-Za-z0-9._-]+)$/.exec(String(hash || '')); return m ? m[1] : null; };

  // ---- payloads maken ----
  // Project: zonder foto's (die passen niet in een link en zijn privacygevoelig).
  function buildProjectPayload(project, now = Date.now()) {
    const p = JSON.parse(JSON.stringify(project));
    if (p.room) { p.room.photo = null; p.room.corners = []; }
    delete p.reference;
    delete p.backdrop;
    delete p.scan;
    return {format: FORMAT, v: VERSION, t: 'project', at: now, project: p};
  }
  function buildDeliveryPayload(d, now = Date.now()) {
    return {format: FORMAT, v: VERSION, t: 'aanlevering', at: now, ...sanitizeDelivery(d, {lenient: true})};
  }

  // ---- ontvangen: strikte validatie ----
  function sanitizePhotos(list) {
    if (!Array.isArray(list)) return {photos: [], dropped: 0};
    const photos = [];
    let dropped = 0;
    for (const p of list) {
      if (typeof p === 'string' && p.length <= LIMITS.photoChars && JPEG.test(p) && photos.length < LIMITS.photos) photos.push(p);
      else dropped++;
    }
    return {photos, dropped};
  }
  // Maten in mm; ontbrekende of ongeldige maten worden null (= niet meegeven), nooit geraden.
  function sanitizeDelivery(d, opts = {}) {
    const src = d && typeof d === 'object' ? d : {};
    const room = src.room && typeof src.room === 'object' ? src.room : {};
    const dim = (v, lo, hi) => { const n = num(v); return n === null ? null : clamp(Math.round(n), lo, hi); };
    const ph = sanitizePhotos(src.photos);
    return {
      name: text(src.name, LIMITS.name),
      room: {width: dim(room.width, 1200, 20000), depth: dim(room.depth, 1200, 20000), height: dim(room.height, 1200, 6500)},
      notes: text(src.notes, LIMITS.notes),
      photos: ph.photos, droppedPhotos: opts.lenient ? 0 : ph.dropped
    };
  }
  // Geeft {ok, type, payload, summary} of {ok:false, error}. Projecten worden pas door de app genormaliseerd.
  function validate(parsed) {
    if (!parsed || typeof parsed !== 'object' || parsed.format !== FORMAT) return {ok: false, error: 'Geen Douglas Designer-bestand of -link'};
    if (parsed.v !== VERSION) return {ok: false, error: 'Onbekende versie van dit bestand (' + text(parsed.v, 10) + ')'};
    if (parsed.t === 'project') {
      const p = parsed.project;
      if (!p || typeof p !== 'object' || !Array.isArray(p.modules)) return {ok: false, error: 'Het project in dit bestand is onvolledig'};
      return {ok: true, type: 'project', payload: {...parsed}, summary: {name: text(p.name, LIMITS.name) || 'Project', modules: p.modules.length, beams: Array.isArray(p.beams) ? p.beams.length : 0}};
    }
    if (parsed.t === 'aanlevering') {
      const d = sanitizeDelivery(parsed);
      if (!d.photos.length && !d.notes && d.room.width === null && d.room.depth === null && d.room.height === null)
        return {ok: false, error: 'De aanlevering bevat geen maten, opmerkingen of foto\'s'};
      return {ok: true, type: 'aanlevering', payload: {...parsed, ...d}, summary: {name: d.name || 'Aanlevering', room: d.room, notes: d.notes, photos: d.photos.length, droppedPhotos: d.droppedPhotos}};
    }
    return {ok: false, error: 'Onbekend type: ' + text(parsed.t, 20)};
  }

  // Past een (gevalideerde) aanlevering toe op projectgegevens; geeft nieuwe project-JSON terug, muteert niets.
  // Ruimtematen worden alleen overgenomen als ze zijn aangeleverd. De eerste foto wordt ruimtefoto
  // (hoeken opnieuw markeren); alle foto's en de opmerkingen komen in project.reference.
  function applyDelivery(project, d) {
    const p = JSON.parse(JSON.stringify(project));
    const room = {...(p.room || {})};
    if (d.room.width !== null) room.width = d.room.width;
    if (d.room.depth !== null) room.depth = d.room.depth;
    if (d.room.height !== null) room.height = d.room.height;
    if (d.room.width !== null || d.room.depth !== null || d.room.height !== null) room.enabled = true;
    if (d.photos.length) { room.photo = d.photos[0]; room.corners = []; }
    p.room = room;
    const old = p.reference && typeof p.reference === 'object' ? p.reference : {notes: '', photos: []};
    const notes = [old.notes, d.notes ? (d.name ? d.name + ': ' : '') + d.notes : ''].filter(Boolean).join('\n\n').slice(0, LIMITS.notes);
    p.reference = {notes, photos: [...(old.photos || []), ...d.photos].slice(-LIMITS.photos)};
    return p;
  }

  function deliverySummaryText(s) {
    const r = s.room, dims = [r.width, r.depth, r.height].every(v => v === null) ? 'geen maten' :
      `ruimte ${r.width ?? '?'} × ${r.depth ?? '?'} × ${r.height ?? '?'} mm (b × d × h)`;
    return `${dims}, ${s.photos} foto${s.photos === 1 ? '' : "'s"}${s.notes ? ', met opmerking' : ''}`;
  }

  return {FORMAT, VERSION, LIMITS, JPEG, hasStreams, encodeLinkData, decodeLinkData, linkFor, dataFromHash,
    buildProjectPayload, buildDeliveryPayload, sanitizeDelivery, sanitizePhotos, validate, applyDelivery, deliverySummaryText, toB64Url, fromB64Url};
});
