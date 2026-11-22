/* Douglas Designer — projectopslag (meerdere projecten, migratie, prullenbak, back-up).
   Pure logica rond een localStorage-achtig object (getItem/setItem/removeItem/key/length); geen DOM.
   Principes: nooit een bestaand project stil overschrijven of wissen; het oorspronkelijke enkelvoudige
   opslagitem (legacy) blijft na migratie onaangeroerd staan als back-up; mislukte opslag wordt gemeld. */
(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DouglasProjects = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const INDEX_KEY = 'douglas-designer-projects-v1';
  const PROJECT_PREFIX = 'douglas-designer-project-v1:';
  const TRASH_KEY = 'douglas-designer-trash-v1';
  const LEGACY_KEY = 'douglas-designer-v1';
  const SCHEMA = 1, TRASH_MAX = 5, NAME_MAX = 80;
  const BACKUP_FORMAT = 'douglas-designer-backup';

  const parse = (s) => { try { return JSON.parse(s); } catch (_) { return null; } };
  const cleanName = (n, fallback = 'Naamloos project') => String(n == null ? '' : n).trim().slice(0, NAME_MAX) || fallback;
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

  function createStore(storage, opts = {}) {
    const now = opts.now || (() => Date.now());
    const uid = opts.uid || (() => 'p-' + now().toString(36) + '-' + Math.random().toString(36).slice(2, 8));
    const legacyKey = opts.legacyKey || LEGACY_KEY;

    function read(key) { try { return storage.getItem(key); } catch (_) { return null; } }
    function write(key, value) {
      try { storage.setItem(key, value); return {ok: true}; }
      catch (e) { return {ok: false, error: e && e.name === 'QuotaExceededError' ? 'Opslag is vol' : 'Opslag niet beschikbaar'}; }
    }
    function remove(key) { try { storage.removeItem(key); } catch (_) { /* negeren */ } }

    // ---- index ----
    function validIndex(ix) { return isObj(ix) && Array.isArray(ix.items) && ix.items.every(i => isObj(i) && typeof i.id === 'string'); }
    function loadIndex() {
      const ix = parse(read(INDEX_KEY));
      if (validIndex(ix)) {
        // Verwijs nooit naar een project dat niet (meer) bestaat.
        ix.items = ix.items.filter(i => read(PROJECT_PREFIX + i.id) !== null);
        if (!ix.items.some(i => i.id === ix.activeId)) ix.activeId = ix.items[0] ? ix.items[0].id : null;
        return ix;
      }
      return rebuildIndex();
    }
    // Zelfherstel: bouw de index opnieuw op uit de projectitems die er nog zijn.
    function rebuildIndex() {
      const items = [];
      try {
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && k.startsWith(PROJECT_PREFIX)) {
            const data = parse(read(k));
            if (isObj(data)) items.push({id: k.slice(PROJECT_PREFIX.length), name: cleanName(data.name), createdAt: now(), updatedAt: now()});
          }
        }
      } catch (_) { /* opslag zonder key()/length: geen herstel mogelijk */ }
      return {version: SCHEMA, activeId: items[0] ? items[0].id : null, items};
    }
    function saveIndex(ix) { return write(INDEX_KEY, JSON.stringify({version: SCHEMA, activeId: ix.activeId, items: ix.items})); }

    // ---- start / migratie ----
    // Geeft {id, project, migrated, created}. defaultFactory() levert het eerste project als er niets is.
    function init(defaultFactory) {
      let ix = loadIndex();
      let migrated = false, created = false;
      if (!ix.items.length) {
        const legacy = parse(read(legacyKey));
        const first = isObj(legacy) && Array.isArray(legacy.modules) ? legacy : null;
        let project = first;
        if (first) migrated = true; else { project = defaultFactory(); created = true; }
        const result = create(project);
        if (!result.ok) return {id: null, project, migrated, created, storageError: true}; // werkt in het geheugen; opslag faalt
        ix = loadIndex();
      }
      const id = ix.activeId;
      return {id, project: parse(read(PROJECT_PREFIX + id)), migrated, created};
    }
    function stageProject(ix, project) {
      let id = String(project.id || uid());
      const taken = (x) => ix.items.some(i => i.id === x) || read(PROJECT_PREFIX + x) !== null;
      while (taken(id)) id = uid();
      project.id = id;
      const t = now();
      const w = write(PROJECT_PREFIX + id, JSON.stringify(project));
      if (!w.ok) return w;
      ix.items.push({id, name: cleanName(project.name), createdAt: t, updatedAt: t});
      ix.activeId = ix.activeId || id;
      return {ok: true, id};
    }

    // ---- CRUD ----
    function list() {
      const ix = loadIndex();
      return ix.items.map(i => ({...i, active: i.id === ix.activeId, bytes: (read(PROJECT_PREFIX + i.id) || '').length}))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    }
    const activeId = () => loadIndex().activeId;
    const load = (id) => parse(read(PROJECT_PREFIX + id));
    function save(id, project) {
      const w = write(PROJECT_PREFIX + id, JSON.stringify(project));
      if (!w.ok) return {...w, ok: false};
      const ix = loadIndex(), item = ix.items.find(i => i.id === id);
      if (item) { item.name = cleanName(project.name); item.updatedAt = now(); }
      else ix.items.push({id, name: cleanName(project.name), createdAt: now(), updatedAt: now()});
      ix.activeId = id;
      const wi = saveIndex(ix);
      return wi.ok ? {ok: true, savedAt: now()} : {...wi, ok: false};
    }
    // Nieuw project; wordt actief. Geeft {ok, id} of {ok:false, error}.
    // opts.activate=false: toevoegen zonder het actieve project te wijzigen (dupliceren, importeren).
    function create(project, opts = {}) {
      const ix = loadIndex();
      const keep = ix.activeId;
      const staged = stageProject(ix, project);
      if (!staged.ok) return staged;
      const id = staged.id;
      ix.activeId = opts.activate === false && keep ? keep : id;
      const w = saveIndex(ix);
      if (!w.ok) remove(PROJECT_PREFIX + id);
      return w.ok ? staged : w;
    }
    function duplicate(id, name) {
      const data = load(id);
      if (!isObj(data)) return {ok: false, error: 'Project niet gevonden'};
      const copy = JSON.parse(JSON.stringify(data));
      delete copy.id;
      copy.name = cleanName(name || (data.name || 'Project') + ' (kopie)');
      return create(copy, {activate: false});
    }
    function rename(id, name) {
      const data = load(id), ix = loadIndex(), item = ix.items.find(i => i.id === id);
      if (!isObj(data) || !item) return {ok: false, error: 'Project niet gevonden'};
      data.name = cleanName(name, data.name);
      const w = write(PROJECT_PREFIX + id, JSON.stringify(data));
      if (!w.ok) return w;
      item.name = data.name;
      return saveIndex(ix);
    }
    function setActive(id) {
      const ix = loadIndex();
      if (!ix.items.some(i => i.id === id)) return false;
      ix.activeId = id; return saveIndex(ix).ok;
    }

    // ---- prullenbak: verwijderen is terug te draaien ----
    const trashList = () => { const t = parse(read(TRASH_KEY)); return Array.isArray(t) ? t.filter(x => isObj(x) && typeof x.data === 'string') : []; };
    // Geeft {ok, activeId}; activeId is null als er geen project meer over is (aanroeper maakt dan een nieuw project).
    function trash(id) {
      const raw = read(PROJECT_PREFIX + id), ix = loadIndex(), item = ix.items.find(i => i.id === id);
      if (raw === null || !item) return {ok: false, error: 'Project niet gevonden'};
      const t = trashList();
      t.unshift({trashId: uid(), id, name: item.name, deletedAt: now(), data: raw});
      // Eerst in de prullenbak, daarna pas weghalen: nooit data kwijt bij een mislukte schrijfactie.
      const w = write(TRASH_KEY, JSON.stringify(t.slice(0, TRASH_MAX)));
      if (!w.ok) return {ok: false, error: w.error + ': project niet verwijderd'};
      remove(PROJECT_PREFIX + id);
      ix.items = ix.items.filter(i => i.id !== id);
      if (ix.activeId === id) ix.activeId = ix.items.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id || null;
      saveIndex(ix);
      return {ok: true, activeId: ix.activeId};
    }
    function restore(trashId) {
      const t = trashList(), entry = t.find(x => x.trashId === trashId);
      if (!entry) return {ok: false, error: 'Niet gevonden in prullenbak'};
      const data = parse(entry.data);
      if (!isObj(data)) return {ok: false, error: 'Beschadigd project'};
      const r = create(data);
      if (r.ok) write(TRASH_KEY, JSON.stringify(t.filter(x => x.trashId !== trashId)));
      return r;
    }

    // ---- volledige back-up ----
    function exportAll() {
      const ix = loadIndex();
      return JSON.stringify({format: BACKUP_FORMAT, version: SCHEMA, exportedAt: now(), activeId: ix.activeId,
        projects: ix.items.map(i => load(i.id)).filter(isObj)}, null, 1);
    }
    // Voegt toe als NIEUWE projecten; overschrijft nooit. Geeft {ok, added, skipped}.
    function importAll(text) {
      const data = parse(text);
      if (!isObj(data) || data.format !== BACKUP_FORMAT || !Array.isArray(data.projects)) return {ok: false, error: 'Geen Douglas Designer back-upbestand'};
      const ix = loadIndex(), staged = [];
      let skipped = 0;
      function rollback(error) {
        for (const id of staged) remove(PROJECT_PREFIX + id);
        return {ok: false, error, added: 0, skipped};
      }
      for (const project of data.projects) {
        if (!isObj(project) || !Array.isArray(project.modules)) { skipped++; continue; }
        const result = stageProject(ix, project);
        if (!result.ok) return rollback(result.error);
        staged.push(result.id);
      }
      if (staged.length) {
        const result = saveIndex(ix);
        if (!result.ok) return rollback(result.error);
      }
      return {ok: true, added: staged.length, skipped};
    }
    const usage = () => { let n = 0; try { for (let i = 0; i < storage.length; i++) { const k = storage.key(i); n += (k || '').length + (read(k) || '').length; } } catch (_) { /* onbekend */ } return n; };

    return {init, list, activeId, load, save, create, duplicate, rename, setActive, trash, trashList, restore, exportAll, importAll, usage};
  }

  return {createStore, INDEX_KEY, PROJECT_PREFIX, TRASH_KEY, LEGACY_KEY, BACKUP_FORMAT};
});
