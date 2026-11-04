// Faux Firebase (API « compat ») pour les tests : données gardées dans localStorage.
(function () {
  const KEY = '__fakefs', load = () => JSON.parse(localStorage.getItem(KEY) || '{}'), save = s => localStorage.setItem(KEY, JSON.stringify(s));
  const L = new Set(), notify = () => setTimeout(() => L.forEach(l => l()), 0), clone = o => JSON.parse(JSON.stringify(o));
  let n = 0; const nid = () => 'id' + (++n) + Math.random().toString(36).slice(2, 6);
  function snap(c, id) { const d = (load()[c] || {})[id]; return { id, exists: !!d, data: () => d && clone(d), ref: doc(c, id) }; }
  function write(c, id, f) { const s = load(); s[c] = s[c] || {}; const r = f(s[c][id]); if (r === undefined) delete s[c][id]; else s[c][id] = clone(r); save(s); notify(); }
  function doc(c, id) { return { id,
    get: async () => snap(c, id),
    set: async (d, o) => write(c, id, old => o && o.merge ? Object.assign({}, old, d) : d),
    update: async d => { if (!snap(c, id).exists) { const e = new Error('not found'); e.code = 'not-found'; throw e; } write(c, id, old => Object.assign({}, old, d)); },
    delete: async () => write(c, id, () => undefined),
    onSnapshot(cb) { const l = () => cb(snap(c, id)); L.add(l); setTimeout(l, 0); return () => L.delete(l); } }; }
  function col(c) { return {
    doc: id => doc(c, id || nid()),
    add: async d => { const r = doc(c, nid()); await r.set(d); return r; },
    get: async () => run(c),
    onSnapshot(cb) { const l = () => cb(run(c)); L.add(l); setTimeout(l, 0); return () => L.delete(l); } }; }
  function run(c) { const docs = Object.keys(load()[c] || {}).map(id => snap(c, id)); return { docs, size: docs.length }; }
  const db = { settings() {}, enablePersistence: async () => {}, collection: col,
    doc: p => { const [c, id] = p.split('/'); return doc(c, id); },
    batch() { const ops = []; return { set(r, d) { ops.push(() => r.set(d)); }, delete(r) { ops.push(() => r.delete()); }, commit: async () => { for (const o of ops) await o(); } }; } };
  window.firebase = { initializeApp() {}, firestore: Object.assign(() => db, { FieldValue: {} }) };
})();
