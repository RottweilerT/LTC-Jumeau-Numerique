/* Pont entre le jumeau (écrit pour claude.ai) et Firebase.
   Le code de l'application appelle claude.use("db" | "user" | "downloads") :
   - db        → Firestore (même façon d'écrire : doc(), collection(), onSnapshot, set, update, delete) ;
   - user      → identifiant de cet appareil + prénom saisi une fois (collection « personnes ») ;
   - downloads → téléchargement direct du fichier dans le navigateur. */
(() => {
  "use strict";
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} } };
  let ID = ls.get("jumeau-appareil");
  if (!ID) { ID = "u_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); ls.set("jumeau-appareil", ID); }

  let db = null;
  if (typeof FIREBASE_CONFIG !== "undefined" && FIREBASE_CONFIG && window.firebase) {
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
      db.settings({ ignoreUndefinedProperties: true, merge: true });
      db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    } catch (e) { console.error(e); db = null; }
  }

  const names = new Map();
  const user = {
    id: async () => ID,
    can: async () => true,
    profiles: async ids => {
      const out = {};
      await Promise.all(ids.map(async i => {
        if (!names.has(i)) { try { const s = await db.collection("personnes").doc(i).get(); names.set(i, s.exists ? s.data().nom || "" : ""); } catch (_) { return; } }
        out[i] = { name: names.get(i) };
      }));
      return out;
    }
  };
  const downloads = {
    save: async ({ filename, data }) => {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return { status: "saved" };
    }
  };
  window.claude = { use: async name => name === "db" ? db : name === "user" ? (db ? user : null) : name === "downloads" ? downloads : null };

  // Prénom de la personne (affiché dans « Dernières mises à jour » et l'historique)
  function askName() {
    if (!db || ls.get("jumeau-nom")) return;
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:100;padding:16px";
    box.innerHTML = '<form style="background:var(--surface,#fff);color:var(--ink,#000);border-radius:12px;padding:18px;width:min(380px,100%);display:flex;flex-direction:column;gap:10px;font-family:var(--f-body,sans-serif)">'
      + '<b style="font-size:18px">Bienvenue</b><label style="display:flex;flex-direction:column;gap:4px;font-size:13px">Votre prénom (il apparaîtra à côté de vos modifications)'
      + '<input name="n" required maxlength="40" autocomplete="given-name" style="padding:10px;font-size:16px;border:1px solid #bbb;border-radius:8px"></label>'
      + '<button style="padding:10px;font-size:15px;border:0;border-radius:8px;background:#D4561A;color:#fff;cursor:pointer">Continuer</button></form>';
    box.querySelector("form").addEventListener("submit", e => {
      e.preventDefault();
      const n = box.querySelector("input").value.trim(); if (!n) return;
      ls.set("jumeau-nom", n); names.set(ID, n);
      db.collection("personnes").doc(ID).set({ nom: n, depuis: new Date().toISOString() }).catch(() => {});
      box.remove();
    });
    document.body.append(box);
    setTimeout(() => box.querySelector("input").focus(), 50);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", askName); else askName();
  window.__nomAppareil = () => ls.get("jumeau-nom");
})();
