/* Pont entre le jumeau (écrit pour claude.ai) et Firebase.
   Le code de l'application appelle claude.use("db" | "user" | "downloads") :
   - db        → Firestore (même façon d'écrire : doc(), collection(), onSnapshot, set, update, delete) ;
   - user      → profil choisi sur la page de connexion (collection « personnes »), gardé sur l'appareil ;
   - downloads → téléchargement direct du fichier dans le navigateur. */
(() => {
  "use strict";
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
    del(k) { try { localStorage.removeItem(k); } catch (_) {} }
  };

  let db = null;
  if (typeof FIREBASE_CONFIG !== "undefined" && FIREBASE_CONFIG && window.firebase) {
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
      db.settings({ ignoreUndefinedProperties: true, merge: true });
      db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    } catch (e) { console.error(e); db = null; }
  }

  // ----- Profil -----
  // Ancienne version : un identifiant par appareil + prénom. On le reprend tel quel comme profil.
  if (!ls.get("jumeau-profil") && ls.get("jumeau-appareil") && ls.get("jumeau-nom")) {
    ls.set("jumeau-profil", ls.get("jumeau-appareil")); ls.set("jumeau-profil-nom", ls.get("jumeau-nom"));
  }
  let ID = ls.get("jumeau-profil"), NOM = ls.get("jumeau-profil-nom") || "";
  let choisi; const pret = new Promise(r => { choisi = r; });
  if (ID || !db) choisi();

  const names = new Map();
  if (ID) names.set(ID, NOM);
  const user = {
    id: async () => { await pret; return ID; },
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
  window.__profil = () => ({ id: ID, nom: NOM });

  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  function choisir(id, nom) {
    ID = id; NOM = nom; names.set(id, nom);
    ls.set("jumeau-profil", id); ls.set("jumeau-profil-nom", nom);
    db.collection("personnes").doc(id).set({ vu: new Date().toISOString() }, { merge: true }).catch(() => {});
    document.getElementById("login")?.remove();
    badge(); choisi();
  }

  // Page de connexion : choisir son profil ou en créer un
  function connexion() {
    const box = document.createElement("div");
    box.id = "login"; box.className = "login";
    box.innerHTML = `<div class="login-card">
      <div class="login-head"><img src="logo-96.png?v=3" alt="" width="64" height="64"><div><small>LTC · Jumeau numérique</small><h1>Qui êtes-vous ?</h1></div></div>
      <p class="login-hint">Choisissez votre profil. Il restera enregistré sur cet appareil et apparaîtra à côté de vos modifications.</p>
      <input type="search" class="login-q" placeholder="Rechercher un nom…" aria-label="Rechercher un profil" hidden>
      <div class="login-list" role="list"><p class="login-hint">Chargement des profils…</p></div>
      <form class="login-new">
        <label>Nouveau profil<input name="n" maxlength="40" autocomplete="name" placeholder="Prénom et nom"></label>
        <button class="btn primary big" type="submit">Créer mon profil</button>
        <p class="login-err" hidden></p>
      </form></div>`;
    document.body.append(box);
    const list = box.querySelector(".login-list"), q = box.querySelector(".login-q"), form = box.querySelector(".login-new"), err = box.querySelector(".login-err");
    let profils = [];
    const dessiner = () => {
      const f = norm(q.value), vis = profils.filter(p => !f || norm(p.nom).includes(f));
      q.hidden = profils.length < 8;
      list.innerHTML = profils.length ? "" : '<p class="login-hint">Aucun profil pour l\'instant : créez le vôtre ci-dessous.</p>';
      for (const p of vis) {
        const b = document.createElement("button"); b.type = "button"; b.className = "login-p"; b.setAttribute("role", "listitem");
        b.innerHTML = `<span class="av">${esc((p.nom.trim()[0] || "?").toUpperCase())}</span><span>${esc(p.nom)}</span>`;
        b.onclick = () => choisir(p.id, p.nom);
        list.append(b);
      }
      if (profils.length && !vis.length) list.innerHTML = '<p class="login-hint">Aucun profil ne correspond.</p>';
    };
    db.collection("personnes").onSnapshot(s => {
      profils = s.docs.map(d => ({ id: d.id, nom: String(d.data().nom || "").trim() })).filter(p => p.nom).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
      dessiner();
    }, () => { list.innerHTML = '<p class="login-err">La base ne répond pas. Vérifiez la connexion puis rechargez la page.</p>'; });
    q.addEventListener("input", dessiner);
    form.addEventListener("submit", async e => {
      e.preventDefault(); err.hidden = true;
      const nom = form.n.value.replace(/\s+/g, " ").trim();
      if (nom.length < 2) { err.textContent = "Indiquez votre prénom et votre nom."; err.hidden = false; return; }
      const deja = profils.find(p => norm(p.nom) === norm(nom));
      if (deja) { err.textContent = `Le profil « ${deja.nom} » existe déjà : touchez-le dans la liste ci-dessus.`; err.hidden = false; return; }
      const id = "p_" + norm(nom).replace(/[^a-z0-9]+/g, "-").slice(0, 24) + "_" + Math.random().toString(36).slice(2, 7);
      try { await db.collection("personnes").doc(id).set({ nom, cree: new Date().toISOString() }); choisir(id, nom); }
      catch (_) { err.textContent = "Création impossible. Vérifiez la connexion puis réessayez."; err.hidden = false; }
    });
  }

  // Profil actif dans l'en-tête, avec possibilité d'en changer
  function badge() {
    const bar = document.querySelector(".bar"); if (!bar || !ID) return;
    let b = document.getElementById("profilBtn");
    if (!b) {
      b = document.createElement("button"); b.id = "profilBtn"; b.className = "btn profil-btn"; b.type = "button";
      b.title = "Changer de profil";
      b.onclick = () => {
        if (b.dataset.armed) { ls.del("jumeau-profil"); ls.del("jumeau-profil-nom"); location.reload(); return; }
        b.dataset.armed = "1"; b.textContent = "Changer de profil ?";
        setTimeout(() => { delete b.dataset.armed; b.textContent = "👤 " + NOM; }, 4000);
      };
      bar.append(b);
    }
    b.textContent = "👤 " + NOM;
  }

  function demarrer() { if (!db) return; if (!ID) connexion(); else badge(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer); else demarrer();
})();
