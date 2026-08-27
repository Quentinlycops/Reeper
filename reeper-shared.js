(function () {
  "use strict";

  var LS_KEY = "reeper_store_v1";

  // --- Supabase sync (shared data across devices) ---------------------------
  var SUPABASE_URL = "https://pkrwypwpmfdtpzphqjop.supabase.co";
  var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcnd5cHdwbWZkdHB6cGhxam9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzQ3NzEsImV4cCI6MjEwMzE1MDc3MX0.9IuieaGdsEtMX5BSi2y5B7RkY2q9Npciu2xMnxdiI7A";
  var SYNC_ON = !!(SUPABASE_URL && SUPABASE_KEY);

  function sbHeaders(extra) {
    var h = { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }
  function sbUpsert(table, rows, pk) {
    if (!SYNC_ON || !rows || !rows.length) return Promise.resolve();
    return fetch(SUPABASE_URL + "/rest/v1/" + table + "?on_conflict=" + pk, {
      method: "POST",
      headers: sbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(rows)
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { try { console.warn("[reeper-sync] push rejected:", table, r.status, t); } catch (x) {} });
    }).catch(function (e) { try { console.warn("[reeper-sync] push failed:", table, e); } catch (x) {} });
  }
  function sbSelectAll(table) {
    if (!SYNC_ON) return Promise.resolve(null);
    return fetch(SUPABASE_URL + "/rest/v1/" + table + "?select=*", { headers: sbHeaders() })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .catch(function (e) { try { console.warn("[reeper-sync] pull failed:", table, e); } catch (x) {} return null; });
  }

  function accToRow(a) {
    return {
      key: a.key, type: a.type, username: a.username, password: a.password,
      display_name: a.displayName, first_name: a.firstName || "", last_name: a.lastName || "",
      email: a.email || "", phone: a.phone || "", address: a.address || "",
      initials: a.initials, av_bg: a.avBg, role: a.role, status: a.status,
      commune: a.commune || null, points: a.points || 0, pending_commune: a.pendingCommune || null,
      is_primary: !!a.primary, redeemed: a.redeemed || [],
      service: a.service || null, notify_by_email: a.notifyByEmail == null ? null : !!a.notifyByEmail,
      updated_at: Date.now()
    };
  }
  function rowToAcc(r) {
    var a = {
      key: r.key, type: r.type, username: r.username, password: r.password,
      displayName: r.display_name, firstName: r.first_name, lastName: r.last_name,
      email: r.email, phone: r.phone, address: r.address, initials: r.initials, avBg: r.av_bg,
      role: r.role, status: r.status, redeemed: r.redeemed || []
    };
    if (r.commune) a.commune = r.commune;
    if (r.type === "citizen") { a.points = r.points || 0; a.pendingCommune = r.pending_commune; }
    if (r.type === "gerant") a.primary = !!r.is_primary;
    if (r.type === "agent") { a.service = r.service || undefined; a.notifyByEmail = r.notify_by_email == null ? undefined : !!r.notify_by_email; }
    return a;
  }
  function reepToRow(r) {
    return {
      id: r.id, title: r.title, path: r.path || [], leaf: r.leaf, cat: r.cat, service: r.service,
      status: r.status, commune: r.commune, place: r.place, address: r.address,
      lat: r.lat, lon: r.lon, description: r.desc, photo_url: r.photoUrl, photos: r.photos || [],
      close_photo_url: r.closePhotoUrl, close_note: r.closeNote, agents_in: r.agentsIn || [],
      reporter_account: r.reporterAccount, created_at: r.createdAt, closed_at: r.closedAt,
      deleted: !!r.deleted, deleted_at: r.deletedAt, timeline: r.timeline || [],
      points_awarded: r.pointsAwarded || 0, updated_at: Date.now()
    };
  }
  function rowToReep(row) {
    return {
      id: row.id, title: row.title, path: row.path || [], leaf: row.leaf, cat: row.cat, service: row.service,
      status: row.status, commune: row.commune, place: row.place, address: row.address,
      lat: row.lat, lon: row.lon, desc: row.description, photoUrl: row.photo_url, photos: row.photos || [],
      closePhotoUrl: row.close_photo_url, closeNote: row.close_note, agentsIn: row.agents_in || [],
      reporterAccount: row.reporter_account, createdAt: row.created_at, closedAt: row.closed_at,
      deleted: !!row.deleted, deletedAt: row.deleted_at, timeline: row.timeline || [],
      pointsAwarded: row.points_awarded || 0
    };
  }
  function msgToRow(m) {
    return {
      id: m.id, from_key: m.from, to_key: m.to || null, to_group: m.toGroup || null,
      text: m.text || "", when_ts: m.when, read: !!m.read, reep: m.reep || null,
      transfer: !!m.transfer, file: m.file || null, files: m.files || [], contact: m.contact || null,
      read_by: m.readBy || [], updated_at: Date.now()
    };
  }
  function rowToMsg(row) {
    var m = {
      id: row.id, from: row.from_key, text: row.text, when: row.when_ts, read: !!row.read,
      reep: row.reep, transfer: !!row.transfer, file: row.file, files: row.files || [], contact: row.contact
    };
    if (row.to_key) m.to = row.to_key;
    if (row.to_group) { m.toGroup = row.to_group; m.readBy = row.read_by || []; }
    return m;
  }
  function grpToRow(g) {
    return { id: g.id, name: g.name, members: g.members || [], created_by: g.createdBy, created_when: g.createdWhen, updated_at: Date.now() };
  }
  function rowToGrp(row) {
    return { id: row.id, name: row.name, members: row.members || [], createdBy: row.created_by, createdWhen: row.created_when };
  }
  function communeMetaToRow(m) {
    return { name: m.name, code: m.code, center: m.center, zip: m.zip || [], updated_at: Date.now() };
  }
  function rowToCommuneMeta(row) {
    return { name: row.name, code: row.code, center: row.center, zip: row.zip || [] };
  }
  function contractToRow(c) {
    return {
      commune: c.commune, tier: c.tier, annual_amount: c.annualAmount || 0,
      contract_start: c.contractStart, status: c.status, renewal_date: c.renewalDate,
      contacts: c.contacts || [], budget_total: (c.budget5 && c.budget5.total) || 0,
      budget_projects: (c.budget5 && c.budget5.projects) || [],
      postal_address: c.postalAddress || "", contract_file_url: c.contractFileUrl || null,
      contract_file_name: c.contractFileName || null, satisfaction: c.satisfaction,
      invoices: c.invoices || [], journal: c.journal || [], documents: c.documents || [], updated_at: Date.now()
    };
  }
  function rowToContract(row) {
    return {
      commune: row.commune, tier: row.tier, annualAmount: row.annual_amount || 0,
      contractStart: row.contract_start, status: row.status, renewalDate: row.renewal_date,
      contacts: row.contacts || [], budget5: { total: row.budget_total || 0, projects: row.budget_projects || [] },
      postalAddress: row.postal_address || "", contractFileUrl: row.contract_file_url || null,
      contractFileName: row.contract_file_name || null, satisfaction: row.satisfaction,
      invoices: row.invoices || [], journal: row.journal || [], documents: row.documents || []
    };
  }

  function commConfigToRow(c) {
    return {
      commune: c.commune, general: c.general || {}, cats_off: c.catsOff || [],
      cat_overrides: c.catOverrides || {}, cat_extra: c.catExtra || [],
      services: c.services || [], status_visible: c.statusVisible || [],
      status_extra: c.statusExtra || [], messages: c.messages || {}, updated_at: Date.now()
    };
  }
  function rowToCommConfig(row) {
    return {
      commune: row.commune, general: row.general || {}, catsOff: row.cats_off || [],
      catOverrides: row.cat_overrides || {}, catExtra: row.cat_extra || [],
      services: row.services || [], statusVisible: row.status_visible || [],
      statusExtra: row.status_extra || [], messages: row.messages || {}
    };
  }

  var _pushTimer = null;
  var _pendingPushData = null;
  var _pushInFlight = false;
  function _runPush(data) {
    _pushInFlight = true;
    return Promise.all([
      sbUpsert("accounts", (data.accounts || []).map(accToRow), "key"),
      sbUpsert("reeps", (data.reeps || []).map(reepToRow), "id"),
      sbUpsert("messages", (data.messages || []).map(msgToRow), "id"),
      sbUpsert("groups", (data.groups || []).map(grpToRow), "id"),
      sbUpsert("contracts", (data.contracts || []).map(contractToRow), "commune"),
      sbUpsert("communes_meta", (data.communesMeta || []).map(communeMetaToRow), "name"),
      sbUpsert("commune_config", (data.communeConfigs || []).map(commConfigToRow), "commune")
    ]).then(function (r) { _pushInFlight = false; return r; }, function (e) { _pushInFlight = false; throw e; });
  }
  function _schedulePush(data) {
    if (!SYNC_ON) return;
    _pendingPushData = data;
    clearTimeout(_pushTimer);
    _pushTimer = setTimeout(function () {
      _pushTimer = null;
      var d = _pendingPushData;
      _pendingPushData = null;
      _runPush(d);
    }, 500);
  }
  function flushPush() {
    if (!SYNC_ON || !_pendingPushData) return Promise.resolve();
    clearTimeout(_pushTimer);
    _pushTimer = null;
    var d = _pendingPushData;
    _pendingPushData = null;
    return _runPush(d);
  }

  function syncPull() {
    if (!SYNC_ON || _pushTimer || _pushInFlight) return Promise.resolve(false);
    return Promise.all([sbSelectAll("accounts"), sbSelectAll("reeps"), sbSelectAll("messages"), sbSelectAll("groups"), sbSelectAll("contracts"), sbSelectAll("communes_meta"), sbSelectAll("commune_config")])
      .then(function (results) {
        var accRows = results[0], reepRows = results[1], msgRows = results[2], grpRows = results[3], contractRows = results[4], metaRows = results[5], configRows = results[6];
        if (!accRows || !reepRows || !msgRows || !grpRows) return false;
        var data = load();
        // Cloud not seeded yet but we already have local data: push ours up instead of wiping local with empty cloud tables.
        if (accRows.length === 0 && reepRows.length === 0 && (data.accounts.length > 0 || data.reeps.length > 0)) {
          _schedulePush(data);
          return false;
        }
        var oldReepCount = data.reeps.length, oldMsgCount = data.messages.length;
        data.accounts = accRows.map(rowToAcc);
        data.reeps = reepRows.map(rowToReep);
        data.messages = msgRows.map(rowToMsg);
        data.groups = grpRows.map(rowToGrp);
        // Contracts / communes_meta tables are optional (added later) — only apply if the pull
        // actually succeeded, and never let an empty/missing cloud table wipe locally-entered data.
        if (contractRows && (contractRows.length > 0 || !data.contracts || data.contracts.every(function (c) { return !c.annualAmount && !c.journal.length; }))) {
          data.contracts = contractRows.map(rowToContract);
        }
        if (metaRows && (metaRows.length > 0 || !data.communesMeta || data.communesMeta.length === 0)) {
          data.communesMeta = metaRows.map(rowToCommuneMeta);
        }
        if (configRows && (configRows.length > 0 || !data.communeConfigs || data.communeConfigs.length === 0)) {
          data.communeConfigs = configRows.map(rowToCommConfig);
        }
        var maxSeq = data.seq || 4900;
        data.reeps.forEach(function (r) {
          var m = /RE02-26-(\d+)/.exec(r.id || "");
          if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
        });
        data.seq = maxSeq;
        save(data);
        var hasNew = data.reeps.length > oldReepCount || data.messages.length > oldMsgCount;
        try { window.dispatchEvent(new CustomEvent("reeper:sync", { detail: { hasNew: hasNew } })); } catch (e) {}
        return hasNew;
      });
  }

  var _syncStarted = false;
  function startAutoSync() {
    if (!SYNC_ON || _syncStarted) return;
    _syncStarted = true;
    syncPull();
    setInterval(syncPull, 20000);
    window.addEventListener("focus", function () { syncPull(); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) syncPull(); });
  }
  // --- end Supabase sync ------------------------------------------------------

  var TREE = {
    "Voirie": {
      "Avaloir": { "Avaloir bétonné": null, "Avaloir bouché": null, "Grille manquante": null },
      "Chaussée": { "Béton/ciment": null, "Endommagée": null, "Glissante": { "Autre": null, "Neige/verglas": null }, "Huile sur la chaussée": null, "Marquage": null },
      "Passage piéton": { "Avaloir gênant": null, "Bordure à modifier": null, "Dalles podotactiles": { "Endommagées": null, "Mal placées": null, "Non contrastées": null, "Obstacle gênant": null }, "Marquage": null },
      "Piste cyclable": { "Bordure à modifier": null, "Endommagée": null, "Glissante": { "Autre": null, "Neige/verglas": null }, "Marquage": null, "Verre sur piste cyclable": null },
      "Taque égout": { "Bruyante": null, "Cassée": null },
      "Trottoir": { "Endommagé": null, "Escaliers à sécuriser": null, "Glissant": { "Autre": null, "Neige/verglas": null }, "Obstacle gênant": null }
    },
    "Propreté publique": {
      "Bulle à verre": { "Débordante": { "Blanc": null, "Vert": null, "Brun": null }, "Déchets aux abords": null, "Sale": null },
      "Bulle à vêtements": { "Débordante": null, "Déchets aux abords": null, "Sale": null },
      "Poubelle publique": { "Débordante": null, "Sale": null },
      "Dépôt clandestin": { "Déchets verts/branches": null, "Encombrants": { "+ 1 m³": null, "− 1 m³": null }, "Spécial": { "Huile": null, "Peinture": null } },
      "Matériaux abandonnés": { "Déchets de chantier": null, "Signalisation": null },
      "Sac poubelle": { "Éventré": null, "Non collecté": null },
      "Tags": { "Façade": { "Privée": null, "Publique": null }, "Mobilier urbain": null, "Monument": null }
    },
    "Plantation": {
      "Arbre": null, "Branche": null, "Déchets verts": null, "Désherbage/tonte": null, "Élagage": null,
      "Gazon": null, "Protection métallique": null, "Tuteur en bois": null, "Végétation gênante": null, "Bacs à fleur": null
    },
    "Signalisation": {
      "Chantier mal balisé": null,
      "Feu tricolore": { "Bouton poussoir défectueux": null, "Endommagé": null, "Ne fonctionne pas": null, "Clignote orange": null, "Temps de traversée insuffisant": null },
      "Marquage": null,
      "Panneaux": { "Endommagé": null, "Erroné": null, "Manquant": null },
      "Panneaux LED dynamiques": { "Parking": { "Endommagé": null, "Ne fonctionne pas": null }, "Tunnel": { "Endommagé": null, "Ne fonctionne pas": null }, "Voie publique": { "Endommagé": null, "Ne fonctionne pas": null } },
      "Poteau": { "Endommagé": null, "Manquant": null }
    },
    "Éclairage": {
      "Poteau éclairage": { "Endommagé": null, "Ne fonctionne pas": null, "Reste allumé en continu": null, "Clignote": null }
    },
    "Mobilier urbain": {
      "Abribus": { "Endommagé": null },
      "Arceau à vélo": null, "Armoire électrique": null, "Ascenseurs": null,
      "Bacs à fleur": { "Endommagé": null, "Gênant": null, "Déplacé": null },
      "Banc": null,
      "Barrière": { "Endommagée": null, "Manquante": null },
      "Bloc de béton": { "Déplacé": null, "Endommagé": null, "Gênant": null },
      "Borne de recharge électrique": { "Endommagée": null, "Ne fonctionne pas": null },
      "Poubelle publique": { "Endommagée": null },
      "Dispositif publicitaire": { "Endommagé": null, "Gênant": null, "Ne fonctionne pas": null },
      "Horodateur": { "Endommagé": null, "Ne fonctionne pas": null },
      "Place de jeux": null,
      "Potelet": { "Endommagé": null, "Manquant": null }
    },
    "Monument": {
      "Fontaine": { "Borne à eau potable": null, "Déborde": null, "Hors service": null, "Mousse": null, "Endommagée": null },
      "Vandalisme": null
    },
    "Véhicule abandonné": {
      "Moto/scooter": null,
      "Trotinette": { "Partagée": null, "Privée": null },
      "Vélo": { "Partagé": null, "Privé": null },
      "Voiture": { "Partagée": null, "Privée": null }
    }
  };

  var SERVICE = {
    "Voirie": "Voirie", "Propreté publique": "Propreté publique", "Plantation": "Espaces verts",
    "Signalisation": "Voirie", "Éclairage": "Éclairage", "Mobilier urbain": "Bâtiments",
    "Monument": "Bâtiments", "Véhicule abandonné": "Voirie"
  };

  var SERVICE_NAMES = ["Voirie", "Propreté publique", "Éclairage", "Espaces verts", "Bâtiments"];

  var COMMUNES = {
    "Nyon": { center: { lat: 46.3833, lon: 6.2394 }, zip: ["1260", "1261", "1263", "1266"] },
    "Rolle": { center: { lat: 46.4574, lon: 6.3403 }, zip: ["1180", "1181", "1182"] },
    "Gland": { center: { lat: 46.4183, lon: 6.2664 }, zip: ["1196"] }
  };

  // --- Password hashing (SHA-256, client-side) --------------------------------
  // Stored passwords are hashed hex strings. Legacy plaintext values (from data
  // created before this change) are still accepted on login and silently
  // upgraded to a hash at that point, so no bulk/synchronous migration is needed.
  function isHashedPassword(pw) { return typeof pw === "string" && /^[0-9a-f]{64}$/i.test(pw); }
  function hashPassword(plain) {
    var enc = new TextEncoder().encode(String(plain || "").trim());
    return crypto.subtle.digest("SHA-256", enc).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }
  function verifyPassword(input, stored) {
    if (isHashedPassword(stored)) return hashPassword(input).then(function (h) { return h === stored; });
    return Promise.resolve(String(input || "").trim() === String(stored || "").trim());
  }
  var REEPER_DEFAULT_PW_HASH = "9d6fe5301ca7581f618054c1372c3358a60eb841bb7438d6b4ac0ea94a7d00cd"; // sha256("Reeper")

  var DEFAULT_ACCOUNTS = [
    { key: "citizen_berger", type: "citizen", username: "mberger", password: REEPER_DEFAULT_PW_HASH, displayName: "M. Berger", firstName: "M.", lastName: "Berger", email: "m.berger@example.ch", phone: "", address: "", initials: "MB", avBg: "#1B2A41", role: "Espace citoyen", status: "active", pendingCommune: null, points: 40 },
    { key: "agent_rochat", type: "agent", username: "srochat", password: REEPER_DEFAULT_PW_HASH, displayName: "Sandrine Rochat", firstName: "Sandrine", lastName: "Rochat", email: "s.rochat@nyon.ch", phone: "", address: "", initials: "SR", avBg: "#D62839", commune: "Nyon", role: "Service voirie · Administratrice", status: "active", service: "Voirie", notifyByEmail: true },
    { key: "agent_blanc", type: "agent", username: "ablanc", password: REEPER_DEFAULT_PW_HASH, displayName: "Antoine Blanc", firstName: "Antoine", lastName: "Blanc", email: "a.blanc@rolle.ch", phone: "", address: "", initials: "AB", avBg: "#3F8F63", commune: "Rolle", role: "Agent commune · Administrateur", status: "active", service: "Voirie", notifyByEmail: true },
    { key: "agent_martin", type: "agent", username: "smartin", password: REEPER_DEFAULT_PW_HASH, displayName: "Steve Martin", firstName: "Steve", lastName: "Martin", email: "s.martin@nyon.ch", phone: "", address: "", initials: "SM", avBg: "#5A6B7E", commune: "Nyon", role: "Agent d'entretien", status: "active", service: "Voirie", notifyByEmail: false },
    { key: "gerant_lycops", type: "gerant", username: "qlycops", password: REEPER_DEFAULT_PW_HASH, displayName: "Quentin Lycops", firstName: "Quentin", lastName: "Lycops", email: "q.lycops@reeper.ch", phone: "", address: "", initials: "QL", avBg: "#1B2A41", role: "Gérant", status: "active", primary: true }
  ];

  var COMMUNE_CODES = { "NYON-2026": "Nyon", "ROLLE-2026": "Rolle", "GLAND-2026": "Gland" };

  var AV_COLORS = ["#1B2A41", "#D62839", "#3F8F63", "#5A6B7E", "#31506F", "#A96A16", "#7A6BC4", "#4E8FA8"];

  var REEPER_SUPPORT_KEY = "reeper_support";
  var POINTS_PER_REEP = 10;

  var REWARDS = [
    { id: "rw1", partner: "Café du Marché", title: "Un café offert", cost: 30, commune: "Nyon" },
    { id: "rw2", partner: "Boulangerie Perrier", title: "10% sur un achat", cost: 50, commune: "Rolle" },
    { id: "rw3", partner: "Cinélac", title: "Une entrée à prix réduit", cost: 80, commune: "Gland" },
    { id: "rw4", partner: "Vélo-Service Nyon", title: "Contrôle vélo gratuit", cost: 100, commune: "Nyon" },
    { id: "rw5", partner: "Piscine de Nyon", title: "Une entrée offerte", cost: 120, commune: "Nyon" },
    { id: "rw6", partner: "Épicerie Bio Rolle", title: "5.- de réduction", cost: 60, commune: "Rolle" }
  ];

  function now() { return Date.now(); }
  function daysAgo(n) { return now() - Math.round(n * 86400000); }
  function pad(n, len) { var s = String(n); while (s.length < len) s = "0" + s; return s; }

  function migrate(data) {
    if (!data.accounts) data.accounts = DEFAULT_ACCOUNTS.map(function (a) { return Object.assign({}, a); });
    if (!data.messages) data.messages = [];
    if (!data.emailLog) data.emailLog = [];
    if (!data.groups) data.groups = [];
    if (data.seq == null) data.seq = 4900;
    if (!data.accounts.some(function (a) { return a.type === "gerant"; })) {
      var gerantSeed = DEFAULT_ACCOUNTS.filter(function (a) { return a.type === "gerant"; });
      gerantSeed.forEach(function (a) { data.accounts.push(Object.assign({}, a)); });
    }
    data.accounts.forEach(function (a) {
      if (a.key === "gerant_lycops" && a.primary == null) a.primary = true;
      if (a.type === "gerant" && a.primary == null) a.primary = false;
    });
    (data.reeps || []).forEach(function (r) {
      if (!r.photos) r.photos = r.photoUrl ? [r.photoUrl] : [];
    });
    data.accounts.forEach(function (a) {
      if (a.type === "citizen" && a.points == null) a.points = 0;
    });
    var PURGE_AFTER_MS = 365 * 86400000;
    data.reeps = (data.reeps || []).filter(function (r) {
      return !(r.deleted && r.deletedAt && (now() - r.deletedAt) > PURGE_AFTER_MS);
    });
    if (!data.communesMeta) {
      data.communesMeta = Object.keys(COMMUNES).map(function (name) {
        var code = Object.keys(COMMUNE_CODES).filter(function (c) { return COMMUNE_CODES[c] === name; })[0];
        return { name: name, code: code, center: COMMUNES[name].center, zip: COMMUNES[name].zip };
      });
    }
    data.communesMeta.forEach(function (m) {
      COMMUNES[m.name] = { center: m.center, zip: m.zip || [] };
      COMMUNE_CODES[m.code] = m.name;
    });
    if (!data.contracts) data.contracts = [];
    Object.keys(COMMUNES).forEach(function (name) {
      if (!data.contracts.some(function (c) { return c.commune === name; })) {
        data.contracts.push({
          commune: name, tier: "Moyenne", annualAmount: 0,
          contractStart: now(), status: "Contrat annuel actif", renewalDate: null,
          contacts: [], budget5: { total: 0, projects: [] },
          postalAddress: "", contractFileUrl: null, contractFileName: null,
          satisfaction: null, invoices: [], journal: [], documents: []
        });
      }
    });
    data.contracts.forEach(function (c) {
      if (!c.contacts) c.contacts = [];
      if (!c.contacts.some(function (k) { return k.role === "principal"; })) c.contacts.unshift({ role: "principal", name: "", title: "", email: "", phone: "" });
      if (!c.contacts.some(function (k) { return k.role === "secours"; })) c.contacts.splice(1, 0, { role: "secours", name: "", title: "", email: "", phone: "" });
      if (!c.budget5) c.budget5 = { total: 0, projects: [] };
      if (!c.budget5.projects) c.budget5.projects = [];
      if (!c.invoices) c.invoices = [];
      if (!c.journal) c.journal = [];
      if (!c.documents) c.documents = [];
      if (c.contractFileUrl && !c.documents.some(function (d) { return d.fileUrl === c.contractFileUrl; })) {
        c.documents.unshift({
          id: "doc" + (data.seq = (data.seq || 4900) + 1), type: "Contrat",
          title: c.contractFileName || "Contrat signé", note: "",
          fileUrl: c.contractFileUrl, fileName: c.contractFileName || "contrat.pdf", uploadedAt: now()
        });
      }
    });
    data.accounts.forEach(function (a) {
      if (a.type === "agent") {
        if (a.service == null) a.service = "Voirie";
        if (a.notifyByEmail == null) a.notifyByEmail = true;
      }
    });
    if (!data.communeConfigs) data.communeConfigs = [];
    Object.keys(COMMUNES).forEach(function (name) {
      if (!data.communeConfigs.some(function (c) { return c.commune === name; })) {
        data.communeConfigs.push(defaultCommuneConfig(name));
      }
    });
    data.communeConfigs.forEach(function (cc) {
      var d = defaultCommuneConfig(cc.commune);
      if (!cc.general) cc.general = d.general;
      if (!cc.catsOff) cc.catsOff = [];
      if (!cc.catOverrides) cc.catOverrides = {};
      if (!cc.catExtra) cc.catExtra = [];
      if (!cc.services) cc.services = d.services;
      if (!cc.statusVisible) cc.statusVisible = [];
      if (!cc.statusExtra) cc.statusExtra = [];
      if (!cc.messages) cc.messages = {};
    });
    return data;
  }

  function defaultCommuneConfig(commune) {
    return {
      commune: commune,
      general: { name: "Commune de " + commune, address: "", email: "greffe@" + commune.toLowerCase() + ".ch", defaultView: "Carte", adminLang: "Français", accent: "#4E8FA8" },
      catsOff: [], catOverrides: {}, catExtra: [],
      services: SERVICE_NAMES.map(function (n) { return { name: n, emails: [] }; }),
      statusVisible: [], statusExtra: [],
      messages: {}
    };
  }

  var EMAIL_SENDER = "contact@reeper.ch";

  function emailFor(kind, o) {
    var firstName = o.firstName || "";
    var commune = o.commune || "";
    if (kind === "citizen_welcome") {
      return {
        subject: "Bienvenue sur Reeper",
        body: "Bonjour " + firstName + ",\n\n" +
          "Votre compte Reeper a bien été créé.\n\n" +
          "Vous pouvez dès à présent signaler une anomalie dans l'espace public de votre commune : une photo, une localisation, une catégorie, et c'est envoyé.\n\n" +
          "Avec un compte, vous pouvez suivre l'évolution de vos Reeps et choisir de recevoir des notifications à chaque étape — modifiable à tout moment dans vos paramètres.\n\n" +
          "Si vous travaillez pour une commune partenaire de Reeper, vous pouvez à tout moment renseigner le code de votre commune depuis vos paramètres de profil pour passer en accès commune.\n\n" +
          "Bienvenue,\nL'équipe Reeper"
      };
    }
    if (kind === "commune_pending") {
      return {
        subject: "Votre demande d'accès Reeper a bien été reçue",
        body: "Bonjour " + firstName + ",\n\n" +
          "Votre demande de création de compte pour la commune de " + commune + " a bien été enregistrée.\n\n" +
          "Votre accès est en cours de validation par l'administrateur de votre commune sur Reeper. Vous recevrez un email dès que votre compte sera activé.\n\n" +
          "Si vous avez des questions, vous pouvez contacter votre administrateur communal ou notre équipe à contact@reeper.ch.\n\n" +
          "À très vite,\nL'équipe Reeper"
      };
    }
    if (kind === "commune_active") {
      return {
        subject: "Votre accès commune Reeper est activé",
        body: "Bonjour " + firstName + ",\n\n" +
          "Votre compte pour la commune de " + commune + " a été validé par l'administrateur. Vous pouvez maintenant vous connecter à l'espace commune sur Reeper.\n\n" +
          "À très vite,\nL'équipe Reeper"
      };
    }
    return null;
  }

  function sendEmail(data, to, kind, o) {
    var tpl = emailFor(kind, o || {});
    if (!tpl || !to) return null;
    var mail = { id: "e" + (data.seq = (data.seq || 4900) + 1), from: EMAIL_SENDER, to: to, subject: tpl.subject, body: tpl.body, when: now(), kind: kind };
    data.emailLog.push(mail);
    try { console.info("[reeper] email simulé →", to, "—", tpl.subject); } catch (e) {}
    return mail;
  }

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(LS_KEY); } catch (e) {}
    if (!raw) return migrate(seed());
    try {
      var data = JSON.parse(raw);
      if (!data || !data.reeps) return migrate(seed());
      return migrate(data);
    } catch (e) { return migrate(seed()); }
  }

  function save(data) {
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) {}
  }

  function timelineEntry(label, who, when, note, internal) {
    return { label: label, who: who || "Citoyen anonyme", when: when || now(), note: note || "", internal: !!internal };
  }

  function seedReep(o) {
    var createdAt = daysAgo(o.ageDays);
    var timeline = [timelineEntry("Reep reçu", "M. Berger", createdAt, "Photo et géolocalisation transmises", false)];
    if (o.status !== "Nouveau") {
      timeline.push(timelineEntry("Changement de statut", "Agent commune", daysAgo(o.ageDays - o.ageDays * 0.4), "Nouveau → " + o.status, true));
    }
    var closedAt = null;
    if (o.status === "Traité") {
      closedAt = daysAgo(o.closedDaysAgo != null ? o.closedDaysAgo : 0.5);
      timeline.push(timelineEntry("Reep clôturé", "Agent commune", closedAt, "Intervention réalisée.", false));
    }
    return {
      id: o.id, title: o.title, path: o.path, leaf: o.leaf, cat: o.path.join(" › ") + " › " + o.leaf,
      service: o.service, status: o.status, commune: o.commune, place: o.place, address: o.place + ", " + o.commune,
      lat: o.lat, lon: o.lon, desc: o.desc,
      photoUrl: o.photoUrl || null, photos: o.photoUrl ? [o.photoUrl] : [], closePhotoUrl: null, closeNote: "",
      agentsIn: o.status === "Traité" ? ["Sandrine Rochat"] : [],
      reporterAccount: "citizen_berger", createdAt: createdAt, closedAt: closedAt,
      deleted: false, deletedAt: null, timeline: timeline
    };
  }

  function seed() {
    var nyonSeed = [
      { id: "RE02-26-04822", title: "Chaussée glissante", path: ["Voirie", "Chaussée"], leaf: "Glissante", service: "Voirie", status: "Nouveau", place: "Route de Saint-Cergue 12", commune: "Nyon", lat: 46.3894, lon: 6.2316, desc: "Revêtement très glissant après la pluie à la sortie du virage, deux cyclistes ont chuté cette semaine.", ageDays: 0.3 },
      { id: "RE02-26-04818", title: "Dépôt sauvage", path: ["Propreté publique", "Dépôt clandestin"], leaf: "Encombrants", service: "Propreté publique", status: "En cours", place: "Chemin de Bourgogne 3", commune: "Nyon", lat: 46.3862, lon: 6.2438, desc: "Sacs et encombrants déposés à côté du point de collecte.", ageDays: 1 },
      { id: "RE02-26-04811", title: "Lampadaire éteint", path: ["Éclairage", "Poteau éclairage"], leaf: "Ne fonctionne pas", service: "Éclairage", status: "Planifié (travaux)", place: "Avenue Viollier 8", commune: "Nyon", lat: 46.3806, lon: 6.2372, desc: "Lampadaire éteint depuis plusieurs soirs, passage piéton très sombre.", ageDays: 2 },
      { id: "RE02-26-04803", title: "Tags sur abribus", path: ["Mobilier urbain", "Abribus"], leaf: "Endommagé", service: "Bâtiments", status: "En cours", place: "Place Perdtemps", commune: "Nyon", lat: 46.3831, lon: 6.2397, desc: "Graffitis sur les trois parois vitrées de l'abribus.", ageDays: 2.5 },
      { id: "RE02-26-04795", title: "Débordante", path: ["Propreté publique", "Poubelle publique"], leaf: "Débordante", service: "Propreté publique", status: "Traité", place: "Rue de la Colombière 24", commune: "Nyon", lat: 46.3847, lon: 6.2352, desc: "Poubelle publique débordante depuis plusieurs jours, déchets au sol autour.", ageDays: 8, closedDaysAgo: 2 },
      { id: "RE02-26-04702", title: "Nid-de-poule", path: ["Voirie", "Chaussée"], leaf: "Endommagée", service: "Voirie", status: "Traité", place: "Av. du Mont-Blanc", commune: "Nyon", lat: 46.3779, lon: 6.2321, desc: "Trou profond sur la voie de droite, dangereux pour les deux-roues par temps de pluie.", ageDays: 20, closedDaysAgo: 12 }
    ];
    var photoFor = {
      "Chaussée glissante": "./photos/chaussee-glissante.png",
      "Dépôt sauvage": "./photos/depot-sauvage.png",
      "Lampadaire éteint": "./photos/lampadaire-eteint.png",
      "Tags sur abribus": "./photos/tag-abribus.png",
      "Débordante": "./photos/depot-sauvage.png",
      "Nid-de-poule": "./photos/nid-de-poule.png"
    };
    var reeps = nyonSeed.map(function (o) {
      o.photoUrl = photoFor[o.title] || null;
      return seedReep(o);
    });
    return { version: 1, seq: 4900, reeps: reeps, session: null };
  }

  function persist(data) { save(data); _schedulePush(data); return data; }

  function nextId(data) {
    data.seq = (data.seq || 4900) + 1;
    return "RE02-26-" + pad(data.seq, 5);
  }

  function findIndex(data, id) {
    for (var i = 0; i < data.reeps.length; i++) if (data.reeps[i].id === id) return i;
    return -1;
  }

  function startOfWeek(d) {
    var x = new Date(d);
    var day = (x.getDay() + 6) % 7;
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - day);
    return x.getTime();
  }
  function startOfMonth(d) {
    var x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(1);
    return x.getTime();
  }

  function citizenStatus(status) {
    if (status === "Planifié (travaux)") return "En cours";
    if (status === "En attente de pièce") return "En cours";
    return status || "Nouveau";
  }

  function communeFromText(text) {
    if (!text) return null;
    var t = text.toLowerCase();
    for (var name in COMMUNES) {
      if (t.indexOf(name.toLowerCase()) >= 0) return name;
    }
    for (var name2 in COMMUNES) {
      var zips = COMMUNES[name2].zip;
      for (var i = 0; i < zips.length; i++) if (t.indexOf(zips[i]) >= 0) return name2;
    }
    return null;
  }

  function downscaleImage(file, maxDim, quality) {
    maxDim = maxDim || 900;
    quality = quality || 0.78;
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error("no file")); return; }
      var img = new Image();
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("read failed")); };
      reader.onload = function () {
        img.onerror = function () { reject(new Error("decode failed")); };
        img.onload = function () {
          var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          var w = Math.max(1, Math.round(img.width * scale));
          var h = Math.max(1, Math.round(img.height * scale));
          var canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          var mime = "image/webp";
          var url;
          try { url = canvas.toDataURL(mime, quality); } catch (e) { url = canvas.toDataURL("image/jpeg", quality); }
          if (!url || url.indexOf("data:image/webp") !== 0) url = canvas.toDataURL("image/jpeg", quality);
          resolve(url);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function reverseGeocode(lat, lon) {
    var url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + lat + "&lon=" + lon + "&zoom=18&addressdetails=1";
    return fetch(url, { headers: { "Accept": "application/json" } }).then(function (r) {
      if (!r.ok) throw new Error("geocode HTTP " + r.status);
      return r.json();
    }).then(function (j) {
      var a = j.address || {};
      var road = a.road || a.pedestrian || a.footway || "";
      var num = a.house_number || "";
      var town = a.city || a.town || a.village || a.municipality || "";
      var zip = a.postcode || "";
      var line = [road, num].filter(Boolean).join(" ");
      var full = [line, [zip, town].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      var commune = communeFromText(town) || communeFromText(zip) || communeFromText(j.display_name) || null;
      return { address: full || j.display_name || (lat.toFixed(4) + ", " + lon.toFixed(4)), commune: commune, town: town, street: road, houseNumber: num };
    });
  }

  function slugify(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 16);
  }
  function initialsOf(name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "??";
    return (parts[0][0] + (parts[1] ? parts[1][0] : parts[0][1] || "")).toUpperCase();
  }
  function findAccount(data, key) {
    for (var i = 0; i < data.accounts.length; i++) if (data.accounts[i].key === key) return data.accounts[i];
    return null;
  }

  var Store = {
    TREE: TREE, SERVICE: SERVICE, SERVICE_NAMES: SERVICE_NAMES, COMMUNES: COMMUNES, COMMUNE_CODES: COMMUNE_CODES,
    REEPER_SUPPORT_KEY: REEPER_SUPPORT_KEY,
    SYNC_ON: SYNC_ON, startAutoSync: startAutoSync, syncPull: syncPull, flushPush: flushPush,
    POINTS_PER_REEP: POINTS_PER_REEP, REWARDS: REWARDS,

    redeemReward: function (accountKey, rewardId) {
      var data = load();
      var acc = findAccount(data, accountKey);
      if (!acc) return { ok: false, error: "Compte introuvable." };
      var reward = REWARDS.filter(function (r) { return r.id === rewardId; })[0];
      if (!reward) return { ok: false, error: "Récompense introuvable." };
      if ((acc.points || 0) < reward.cost) return { ok: false, error: "Points insuffisants." };
      acc.points -= reward.cost;
      acc.redeemed = acc.redeemed || [];
      acc.redeemed.push({ rewardId: rewardId, when: now() });
      persist(data);
      return { ok: true, points: acc.points };
    },

    treeAt: function (path) {
      return (path || []).reduce(function (n, k) { return (n && n[k]) || null; }, TREE) || TREE;
    },

    citizenStatus: citizenStatus,
    communeFromText: communeFromText,
    downscaleImage: downscaleImage,
    reverseGeocode: reverseGeocode,

    getAccount: function (key) {
      var data = load();
      return findAccount(data, key);
    },
    listAccounts: function (opts) {
      opts = opts || {};
      var data = load();
      return data.accounts.filter(function (a) {
        if (opts.type && a.type !== opts.type) return false;
        if (opts.commune && a.commune !== opts.commune) return false;
        if (opts.status && a.status !== opts.status) return false;
        if (opts.excludeKey && a.key === opts.excludeKey) return false;
        if (opts.activeOnly && a.status !== "active") return false;
        return true;
      });
    },
    agentsForCommune: function (commune) {
      return this.listAccounts({ type: "agent", commune: commune, status: "active" });
    },
    adminsForCommune: function (commune) {
      return this.agentsForCommune(commune).filter(function (a) { return a.role.toLowerCase().indexOf("administra") >= 0; });
    },

    login: function (username, password) {
      var data = load();
      var uname = String(username || "").trim().toLowerCase();
      var found = null;
      for (var i = 0; i < data.accounts.length; i++) {
        if (data.accounts[i].username.toLowerCase() === uname) { found = data.accounts[i]; break; }
      }
      if (!found) return Promise.resolve({ ok: false, error: "Identifiants incorrects." });
      return verifyPassword(password, found.password).then(function (match) {
        if (!match) return { ok: false, error: "Identifiants incorrects." };
        if (found.status === "pending") return { ok: false, error: "Ce compte est en attente de validation par l'administrateur de la commune." };
        var upgrade = isHashedPassword(found.password) ? Promise.resolve() : hashPassword(password).then(function (h) { found.password = h; });
        return upgrade.then(function () {
          data.session = { accountKey: found.key, at: now() };
          persist(data);
          return { ok: true, account: found };
        });
      });
    },
    logout: function () {
      var data = load();
      data.session = null;
      persist(data);
    },
    getSession: function () {
      var data = load();
      if (!data.session) return null;
      return findAccount(data, data.session.accountKey);
    },

    signup: function (o) {
      var self = this;
      var data = load();
      var firstName = String(o.firstName || "").trim();
      var lastName = String(o.lastName || "").trim();
      var email = String(o.email || "").trim().toLowerCase();
      if (!firstName || !lastName || !email) return Promise.resolve({ ok: false, error: "Prénom, nom et adresse e-mail sont requis." });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Promise.resolve({ ok: false, error: "Adresse e-mail invalide." });
      if (data.accounts.some(function (a) { return (a.email || "").toLowerCase() === email; })) return Promise.resolve({ ok: false, error: "Cette adresse e-mail est déjà utilisée." });
      var displayName = (firstName + " " + lastName).trim();
      var uname = String(o.username || "").trim().toLowerCase() || email.split("@")[0];
      var base = uname, n = 1;
      while (data.accounts.some(function (a) { return a.username.toLowerCase() === uname; })) { n++; uname = base + n; }
      var code = String(o.communeCode || "").trim().toUpperCase();
      var commune = code ? COMMUNE_CODES[code] : null;
      if (code && !commune) return Promise.resolve({ ok: false, error: "Code commune invalide." });
      return hashPassword(String(o.password || "").trim() || "Reeper").then(function (password) {
        var key = (commune ? "agent_" : "citizen_") + slugify(displayName) + "_" + (data.seq = (data.seq || 4900) + 1);
        var avBg = AV_COLORS[data.accounts.length % AV_COLORS.length];
        var common = { key: key, username: uname, password: password, displayName: displayName, firstName: firstName, lastName: lastName, email: email, phone: String(o.phone || "").trim(), address: String(o.address || "").trim(), initials: initialsOf(displayName), avBg: avBg };
        var account;
        if (commune) {
          var isBootstrap = self.agentsForCommune(commune).length === 0;
          account = Object.assign({}, common, { type: "agent", commune: commune, role: isBootstrap ? "Agent commune · Administrateur" : "Agent", status: isBootstrap ? "active" : "pending" });
          data.accounts.push(account);
          if (isBootstrap) data.session = { accountKey: key, at: now() };
          var mail1 = sendEmail(data, email, isBootstrap ? "commune_active" : "commune_pending", { firstName: firstName, commune: commune });
          persist(data);
          return { ok: true, account: account, pending: !isBootstrap, email: mail1 };
        }
        account = Object.assign({}, common, { type: "citizen", role: "Espace citoyen", status: "active", pendingCommune: null, points: 0 });
        data.accounts.push(account);
        data.session = { accountKey: key, at: now() };
        var mail0 = sendEmail(data, email, "citizen_welcome", { firstName: firstName });
        persist(data);
        return { ok: true, account: account, pending: false, email: mail0 };
      });
    },

    requestCommuneUpgrade: function (citizenKey, communeCode) {
      var data = load();
      var acc = findAccount(data, citizenKey);
      if (!acc || acc.type !== "citizen") return { ok: false, error: "Compte citoyen introuvable." };
      var code = String(communeCode || "").trim().toUpperCase();
      var commune = COMMUNE_CODES[code];
      if (!commune) return { ok: false, error: "Code commune invalide." };
      if (this.agentsForCommune(commune).length === 0) {
        acc.type = "agent"; acc.commune = commune; acc.role = "Agent commune · Administrateur"; acc.status = "active"; acc.pendingCommune = null;
        sendEmail(data, acc.email, "commune_active", { firstName: acc.firstName || acc.displayName, commune: commune });
        persist(data);
        return { ok: true, commune: commune, bootstrap: true };
      }
      acc.pendingCommune = commune;
      sendEmail(data, acc.email, "commune_pending", { firstName: acc.firstName || acc.displayName, commune: commune });
      persist(data);
      return { ok: true, commune: commune, bootstrap: false };
    },

    inviteAgent: function (commune, o) {
      var data = load();
      var firstName = String(o.first || "").trim();
      var lastName = String(o.last || "").trim();
      var email = String(o.email || "").trim().toLowerCase();
      if (!firstName || !lastName || !email) return { ok: false, error: "Prénom, nom et adresse e-mail sont requis." };
      if (data.accounts.some(function (a) { return (a.email || "").toLowerCase() === email; })) return { ok: false, error: "Cette adresse e-mail est déjà utilisée." };
      var displayName = (firstName + " " + lastName).trim();
      var uname = email.split("@")[0], base = uname, n = 1;
      while (data.accounts.some(function (a) { return a.username.toLowerCase() === uname; })) { n++; uname = base + n; }
      var key = "agent_" + slugify(displayName) + "_" + (data.seq = (data.seq || 4900) + 1);
      var avBg = AV_COLORS[data.accounts.length % AV_COLORS.length];
      var role = o.role === "Administrateur" ? "Agent commune · Administrateur" : o.role === "Chef de service" ? "Chef de service" : "Agent";
      var account = { key: key, type: "agent", username: uname, password: "Reeper", displayName: displayName, firstName: firstName, lastName: lastName, email: email, phone: "", address: "", initials: initialsOf(displayName), avBg: avBg, commune: commune, role: role, status: "active", service: o.service || "Voirie", notifyByEmail: o.notifyByEmail !== false };
      data.accounts.push(account);
      persist(data);
      return { ok: true, account: account };
    },

    pendingAccountsForCommune: function (commune) {
      var data = load();
      return data.accounts.filter(function (a) {
        return (a.type === "agent" && a.commune === commune && a.status === "pending") ||
          (a.type === "citizen" && a.pendingCommune === commune);
      });
    },
    approveAccount: function (key, who) {
      var data = load();
      var acc = findAccount(data, key);
      if (!acc) return null;
      if (acc.type === "agent" && acc.status === "pending") {
        acc.status = "active";
      } else if (acc.type === "citizen" && acc.pendingCommune) {
        acc.type = "agent"; acc.commune = acc.pendingCommune; acc.role = "Agent"; acc.status = "active"; acc.pendingCommune = null;
      }
      sendEmail(data, acc.email, "commune_active", { firstName: acc.firstName || acc.displayName, commune: acc.commune });
      persist(data);
      return acc;
    },
    updateAccount: function (key, patch) {
      var data = load();
      var acc = findAccount(data, key);
      if (!acc) return null;
      Object.assign(acc, patch);
      persist(data);
      return acc;
    },

    changePassword: function (key, oldPassword, newPassword) {
      var data = load();
      var acc = findAccount(data, key);
      if (!acc) return Promise.resolve({ ok: false, error: "Compte introuvable." });
      return verifyPassword(oldPassword, acc.password).then(function (match) {
        if (!match) return { ok: false, error: "Ancien mot de passe incorrect." };
        var np = String(newPassword || "").trim();
        if (!np) return { ok: false, error: "Le nouveau mot de passe ne peut pas être vide." };
        return hashPassword(np).then(function (h) {
          acc.password = h;
          persist(data);
          return { ok: true };
        });
      });
    },

    getEmailsFor: function (email) {
      var data = load();
      var addr = String(email || "").toLowerCase();
      return data.emailLog.filter(function (m) { return m.to.toLowerCase() === addr; }).sort(function (a, b) { return b.when - a.when; });
    },

    threadKey: function (a, b) { return [a, b].sort().join("::"); },
    getThread: function (a, b) {
      var data = load();
      var tk = this.threadKey(a, b);
      return data.messages.filter(function (m) { return this.threadKey(m.from, m.to) === tk; }, this)
        .sort(function (x, y) { return x.when - y.when; });
    },
    sendMessage: function (o) {
      var data = load();
      var files = o.files && o.files.length ? o.files.slice() : (o.file ? [o.file] : []);
      var msg = { id: "m" + (data.seq = (data.seq || 4900) + 1), from: o.from, to: o.to, text: o.text || "", when: now(), read: false, reep: o.reep || null, transfer: !!o.transfer, file: files[0] || null, files: files, contact: o.contact || null };
      data.messages.push(msg);
      persist(data);
      return msg;
    },
    inboxFor: function (accountKey) {
      var data = load();
      var mine = data.messages.filter(function (m) { return !m.toGroup && (m.from === accountKey || m.to === accountKey); });
      var byPartner = {};
      mine.forEach(function (m) {
        var partner = m.from === accountKey ? m.to : m.from;
        if (!byPartner[partner] || byPartner[partner].when < m.when) byPartner[partner] = m;
      });
      var self = this;
      return Object.keys(byPartner).map(function (partnerKey) {
        var isSupport = partnerKey === REEPER_SUPPORT_KEY;
        var acc = isSupport ? null : findAccount(data, partnerKey);
        var last = byPartner[partnerKey];
        var unread = data.messages.some(function (m) { return m.from === partnerKey && m.to === accountKey && !m.read; });
        return {
          withKey: partnerKey,
          withName: isSupport ? "Reeper" : (acc ? acc.displayName : partnerKey),
          withInitials: isSupport ? "RP" : (acc ? acc.initials : "??"),
          withAvBg: isSupport ? "#D62839" : (acc ? acc.avBg : "#8A98A8"),
          withRole: isSupport ? "Support Reeper" : (acc ? (acc.type === "citizen" ? "Citoyen" : acc.role + (acc.commune ? " · " + acc.commune : "")) : ""),
          lastText: last.text || (last.reep ? "Reep transmis" : ""), lastWhen: last.when, unread: unread
        };
      }).sort(function (a, b) { return b.lastWhen - a.lastWhen; });
    },
    markThreadRead: function (viewerKey, partnerKey) {
      var data = load();
      data.messages.forEach(function (m) { if (m.from === partnerKey && m.to === viewerKey) m.read = true; });
      persist(data);
    },

    createGroup: function (name, memberKeys, creatorKey) {
      var data = load();
      var id = "grp" + (data.seq = (data.seq || 4900) + 1);
      var members = [];
      [creatorKey].concat(memberKeys || []).forEach(function (k) { if (k && members.indexOf(k) === -1) members.push(k); });
      var group = { id: id, name: String(name || "Groupe").trim() || "Groupe", members: members, createdBy: creatorKey, createdWhen: now() };
      data.groups.push(group);
      persist(data);
      return group;
    },
    groupsFor: function (accountKey) {
      var data = load();
      return data.groups.filter(function (g) { return g.members.indexOf(accountKey) !== -1; });
    },
    getGroup: function (groupId) {
      var data = load();
      return data.groups.find(function (g) { return g.id === groupId; }) || null;
    },
    sendGroupMessage: function (o) {
      var data = load();
      var files = o.files && o.files.length ? o.files.slice() : (o.file ? [o.file] : []);
      var msg = { id: "m" + (data.seq = (data.seq || 4900) + 1), from: o.from, toGroup: o.groupId, text: o.text || "", when: now(), readBy: [o.from], reep: o.reep || null, transfer: !!o.transfer, file: files[0] || null, files: files, contact: o.contact || null };
      data.messages.push(msg);
      persist(data);
      return msg;
    },
    getGroupThread: function (groupId) {
      var data = load();
      return data.messages.filter(function (m) { return m.toGroup === groupId; }).sort(function (a, b) { return a.when - b.when; });
    },
    markGroupRead: function (groupId, viewerKey) {
      var data = load();
      data.messages.forEach(function (m) {
        if (m.toGroup === groupId && m.from !== viewerKey) {
          m.readBy = m.readBy || [];
          if (m.readBy.indexOf(viewerKey) === -1) m.readBy.push(viewerKey);
        }
      });
      persist(data);
    },

    transferToCommune: function (id, commune, note, who) {
      var data = load();
      var i = findIndex(data, id);
      if (i < 0) return null;
      var r = data.reeps[i];
      var from = r.commune;
      if (from === commune) return r;
      r.commune = commune;
      r.timeline.push(timelineEntry("Transféré à une autre commune", who && who.displayName || "Agent commune", now(), from + " → " + commune + (note ? " — " + note : ""), true));
      persist(data);
      var admins = this.adminsForCommune(commune);
      var self = this;
      admins.forEach(function (admin) {
        self.sendMessage({ from: who ? who.key : "", to: admin.key, text: "Transfert du Reep " + r.id + " — " + r.title + " depuis " + from + (note ? " · " + note : ""), reep: r.id, transfer: true });
      });
      return r;
    },

    getReep: function (id) {
      var data = load();
      var i = findIndex(data, id);
      return i >= 0 ? data.reeps[i] : null;
    },
    getReeps: function (opts) {
      opts = opts || {};
      var data = load();
      return data.reeps.filter(function (r) {
        if (!opts.includeDeleted && r.deleted) return false;
        if (opts.commune && r.commune !== opts.commune) return false;
        return true;
      }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    },
    getDeleted: function (commune) {
      var data = load();
      return data.reeps.filter(function (r) { return r.deleted && (!commune || r.commune === commune); })
        .sort(function (a, b) { return (b.deletedAt || 0) - (a.deletedAt || 0); });
    },
    listPublic: function (limit) {
      var data = load();
      return data.reeps.filter(function (r) { return !r.deleted; })
        .sort(function (a, b) { return b.createdAt - a.createdAt; })
        .slice(0, limit || 20);
    },

    addReep: function (o) {
      var data = load();
      var id = nextId(data);
      var createdAt = now();
      var commune = o.commune || communeFromText(o.address) || "Commune à déterminer";
      var fallbackCenter = COMMUNES[commune] ? COMMUNES[commune].center : { lat: 46.5197, lon: 6.6323 };
      var photos = (o.photoUrls && o.photoUrls.length) ? o.photoUrls.slice() : (o.photoUrl ? [o.photoUrl] : []);
      var reep = {
        id: id, title: o.leaf || o.path[o.path.length - 1] || "Anomalie", path: o.path || [], leaf: o.leaf || "",
        cat: (o.path || []).join(" › ") + (o.leaf ? " › " + o.leaf : ""),
        service: SERVICE[(o.path || [])[0]] || "Voirie", status: "Nouveau", commune: commune,
        place: o.address || "", address: o.address || "",
        lat: o.lat != null ? o.lat : fallbackCenter.lat + (Math.random() - 0.5) * 0.006,
        lon: o.lon != null ? o.lon : fallbackCenter.lon + (Math.random() - 0.5) * 0.006,
        desc: o.desc || "", photoUrl: photos[0] || null, photos: photos, closePhotoUrl: null, closeNote: "",
        agentsIn: [], reporterAccount: o.reporterAccount || null,
        createdAt: createdAt, closedAt: null, deleted: false, deletedAt: null,
        timeline: [timelineEntry("Reep reçu", o.reporterAccount ? (findAccount(data, o.reporterAccount) || {}).displayName || "Citoyen anonyme" : "Citoyen anonyme", createdAt, "Photo et géolocalisation transmises", false)]
      };
      data.reeps.unshift(reep);
      var pointsAwarded = 0;
      if (o.reporterAccount) {
        var reporterAcc = findAccount(data, o.reporterAccount);
        if (reporterAcc && reporterAcc.type === "citizen") {
          reporterAcc.points = (reporterAcc.points || 0) + POINTS_PER_REEP;
          pointsAwarded = POINTS_PER_REEP;
        }
      }
      persist(data);
      reep.pointsAwarded = pointsAwarded;
      return reep;
    },

    updateStatus: function (id, status, who) {
      var data = load();
      var i = findIndex(data, id);
      if (i < 0) return null;
      var r = data.reeps[i];
      var from = r.status;
      r.status = status;
      r.timeline.push(timelineEntry("Changement de statut", who || "Agent commune", now(), from + " → " + status, true));
      if (status === "Traité" && !r.closedAt) r.closedAt = now();
      persist(data);
      return r;
    },

    setNote: function (id, note, who) {
      var data = load();
      var i = findIndex(data, id);
      if (i < 0) return null;
      var r = data.reeps[i];
      if (note && note.trim()) r.timeline.push(timelineEntry("Note interne ajoutée", who || "Agent commune", now(), note.trim(), true));
      persist(data);
      return r;
    },

    setService: function (id, service, who) {
      var data = load();
      var i = findIndex(data, id);
      if (i < 0) return null;
      var r = data.reeps[i];
      var from = r.service;
      if (from === service) return r;
      r.service = service;
      r.timeline.push(timelineEntry("Service réassigné", who || "Agent commune", now(), from + " → " + service, true));
      persist(data);
      return r;
    },

    transferReep: function (id, opts) {
      var data = load();
      var i = findIndex(data, id);
      if (i < 0) return null;
      var r = data.reeps[i];
      var fromService = r.service;
      r.service = opts.service;
      r.timeline.push(timelineEntry("Transféré vers un autre service", opts.who || "Agent commune", now(), fromService + " → " + opts.service + (opts.note ? " — " + opts.note : ""), true));
      persist(data);
      return r;
    },

    closeReep: function (id, opts) {
      var data = load();
      var i = findIndex(data, id);
      if (i < 0) return null;
      var r = data.reeps[i];
      r.status = "Traité";
      r.closedAt = now();
      r.closePhotoUrl = opts.photoUrl || r.closePhotoUrl;
      r.closeNote = opts.note || "";
      r.agentsIn = opts.agents || r.agentsIn;
      r.timeline.push(timelineEntry("Reep clôturé", opts.who || "Agent commune", now(), opts.note || "Intervention réalisée.", false));
      persist(data);
      return r;
    },

    deleteReep: function (id, who) {
      var data = load();
      var i = findIndex(data, id);
      if (i < 0) return null;
      var r = data.reeps[i];
      r.deleted = true;
      r.deletedAt = now();
      r.timeline.push(timelineEntry("Reep supprimé (archivé)", who || "Agent commune", now(), "Déplacé vers la corbeille.", true));
      persist(data);
      return r;
    },
    restoreReep: function (id, who) {
      var data = load();
      var i = findIndex(data, id);
      if (i < 0) return null;
      var r = data.reeps[i];
      r.deleted = false;
      r.deletedAt = null;
      r.timeline.push(timelineEntry("Reep restauré", who || "Agent commune", now(), "Restauré depuis la corbeille.", true));
      persist(data);
      return r;
    },

    // --- Gérant: commune contract CRM -----------------------------------------
    getContracts: function () {
      return load().contracts.slice().sort(function (a, b) { return a.commune.localeCompare(b.commune); });
    },
    getContract: function (commune) {
      var data = load();
      return data.contracts.find(function (c) { return c.commune === commune; }) || null;
    },
    updateContractInfo: function (commune, patch) {
      var data = load();
      var c = data.contracts.find(function (x) { return x.commune === commune; });
      if (!c) return null;
      Object.assign(c, patch);
      persist(data);
      return c;
    },
    setContractContacts: function (commune, contacts) {
      return this.updateContractInfo(commune, { contacts: contacts });
    },
    addContractDocument: function (commune, o) {
      var data = load();
      var c = data.contracts.find(function (x) { return x.commune === commune; });
      if (!c) return null;
      if (!c.documents) c.documents = [];
      c.documents.unshift({
        id: "doc" + (data.seq = (data.seq || 4900) + 1), type: o.type || "Autre",
        title: o.title || "", note: o.note || "", fileUrl: o.fileUrl, fileName: o.fileName, uploadedAt: now()
      });
      persist(data);
      return c;
    },
    removeContractDocument: function (commune, docId) {
      var data = load();
      var c = data.contracts.find(function (x) { return x.commune === commune; });
      if (!c) return null;
      c.documents = (c.documents || []).filter(function (d) { return d.id !== docId; });
      persist(data);
      return c;
    },
    addBudgetProject: function (commune, o) {
      var data = load();
      var c = data.contracts.find(function (x) { return x.commune === commune; });
      if (!c) return null;
      c.budget5.projects.push({ id: "bp" + (data.seq = (data.seq || 4900) + 1), name: o.name || "", amount: Number(o.amount) || 0, date: o.date || now() });
      persist(data);
      return c;
    },
    removeBudgetProject: function (commune, id) {
      var data = load();
      var c = data.contracts.find(function (x) { return x.commune === commune; });
      if (!c) return null;
      c.budget5.projects = c.budget5.projects.filter(function (p) { return p.id !== id; });
      persist(data);
      return c;
    },
    setBudgetTotal: function (commune, total) {
      var data = load();
      var c = data.contracts.find(function (x) { return x.commune === commune; });
      if (!c) return null;
      c.budget5.total = Number(total) || 0;
      persist(data);
      return c;
    },
    addInvoice: function (commune, o) {
      var data = load();
      var c = data.contracts.find(function (x) { return x.commune === commune; });
      if (!c) return null;
      c.invoices.push({ id: "inv" + (data.seq = (data.seq || 4900) + 1), label: o.label || "", amount: Number(o.amount) || 0, date: o.date || now(), status: o.status || "En attente" });
      persist(data);
      return c;
    },
    updateInvoice: function (commune, id, patch) {
      var data = load();
      var c = data.contracts.find(function (x) { return x.commune === commune; });
      if (!c) return null;
      var inv = c.invoices.find(function (i) { return i.id === id; });
      if (inv) Object.assign(inv, patch);
      persist(data);
      return c;
    },
    removeInvoice: function (commune, id) {
      var data = load();
      var c = data.contracts.find(function (x) { return x.commune === commune; });
      if (!c) return null;
      c.invoices = c.invoices.filter(function (i) { return i.id !== id; });
      persist(data);
      return c;
    },
    addContractNote: function (commune, text, who, dueDate) {
      var data = load();
      var c = data.contracts.find(function (x) { return x.commune === commune; });
      if (!c || !text || !text.trim()) return null;
      c.journal.unshift({ id: "jn" + (data.seq = (data.seq || 4900) + 1), when: now(), text: text.trim(), who: who || "", dueDate: dueDate || null });
      persist(data);
      return c;
    },
    upcomingDeadlines: function () {
      var data = load();
      var out = [];
      data.contracts.forEach(function (c) {
        (c.journal || []).forEach(function (j) {
          if (j.dueDate && j.dueDate >= now()) out.push({ commune: c.commune, entryId: j.id, text: j.text, dueDate: j.dueDate, who: j.who || "" });
        });
      });
      out.sort(function (a, b) { return a.dueDate - b.dueDate; });
      return out;
    },
    updateContractNote: function (commune, id, text) {
      var data = load();
      var c = data.contracts.find(function (x) { return x.commune === commune; });
      if (!c) return null;
      var n = c.journal.find(function (j) { return j.id === id; });
      if (n) n.text = text;
      persist(data);
      return c;
    },
    removeContractNote: function (commune, id) {
      var data = load();
      var c = data.contracts.find(function (x) { return x.commune === commune; });
      if (!c) return null;
      c.journal = c.journal.filter(function (j) { return j.id !== id; });
      persist(data);
      return c;
    },
    reepStatsForCommune: function (commune, sinceTs) {
      var data = load();
      var reeps = data.reeps.filter(function (r) { return r.commune === commune && !r.deleted && r.createdAt >= (sinceTs || 0); });
      var total = reeps.length;
      var since = sinceTs || (reeps.length ? Math.min.apply(null, reeps.map(function (r) { return r.createdAt; })) : now());
      var months = Math.max(1, (now() - since) / (30 * 86400000));
      var monthlyAvg = total / months;
      var buckets = [0, 0, 0];
      var d0 = now();
      reeps.forEach(function (r) {
        var monthsAgo = Math.floor((d0 - r.createdAt) / (30 * 86400000));
        if (monthsAgo === 0) buckets[2]++; else if (monthsAgo === 1) buckets[1]++; else if (monthsAgo === 2) buckets[0]++;
      });
      return { total: total, monthlyAvg: Math.round(monthlyAvg * 10) / 10, last3Months: buckets };
    },
    addCommune: function (name, opts) {
      opts = opts || {};
      var data = load();
      name = String(name || "").trim();
      if (!name) return { ok: false, error: "Nom requis." };
      if (data.communesMeta.some(function (m) { return m.name.toLowerCase() === name.toLowerCase(); })) {
        return { ok: false, error: "Cette entité existe déjà." };
      }
      var year = new Date().getFullYear();
      var baseCode = slugify(name).toUpperCase() || "ENTITE";
      var code = baseCode + "-" + year;
      var n = 2;
      while (data.communesMeta.some(function (m) { return m.code === code; })) {
        code = baseCode + n + "-" + year;
        n++;
      }
      var center = opts.center || (data.communesMeta[0] ? data.communesMeta[0].center : { lat: 46.5197, lon: 6.6323 });
      var meta = { name: name, code: code, center: center, zip: opts.zip || [] };
      data.communesMeta.push(meta);
      COMMUNES[name] = { center: center, zip: meta.zip };
      COMMUNE_CODES[code] = name;
      data.contracts.push({
        commune: name, tier: "Moyenne", annualAmount: 0, contractStart: now(), status: "Pilote en cours", renewalDate: null,
        contacts: [{ role: "principal", name: "", title: "", email: "", phone: "" }, { role: "secours", name: "", title: "", email: "", phone: "" }],
        budget5: { total: 0, projects: [] }, postalAddress: "", contractFileUrl: null, contractFileName: null,
        satisfaction: null, invoices: [], journal: [], documents: []
      });
      persist(data);
      return { ok: true, commune: name, code: code };
    },
    communeCodeFor: function (name) {
      var data = load();
      var m = data.communesMeta.find(function (x) { return x.name === name; });
      return m ? m.code : null;
    },

    // --- Commune: per-commune Configuration (Général/Catégories/Services/Statuts/Messages) ---
    getCommuneConfig: function (commune) {
      var data = load();
      return data.communeConfigs.find(function (c) { return c.commune === commune; }) || defaultCommuneConfig(commune);
    },
    updateGeneralSettings: function (commune, patch) {
      var data = load();
      var cc = data.communeConfigs.find(function (c) { return c.commune === commune; });
      if (!cc) return null;
      Object.assign(cc.general, patch);
      persist(data);
      return cc;
    },
    setCategoryActive: function (commune, key, active) {
      var data = load();
      var cc = data.communeConfigs.find(function (c) { return c.commune === commune; });
      if (!cc) return null;
      cc.catsOff = cc.catsOff.filter(function (k) { return k !== key; });
      if (!active) cc.catsOff.push(key);
      persist(data);
      return cc;
    },
    renameCategoryLabel: function (commune, key, label) {
      var data = load();
      var cc = data.communeConfigs.find(function (c) { return c.commune === commune; });
      if (!cc) return null;
      cc.catOverrides[key] = { label: label };
      persist(data);
      return cc;
    },
    addCategory: function (commune, o) {
      var data = load();
      var cc = data.communeConfigs.find(function (c) { return c.commune === commune; });
      if (!cc) return { ok: false, error: "Commune introuvable." };
      var name = String(o.name || "").trim();
      if (!name) return { ok: false, error: "Nom requis." };
      var parentName = o.parentName || null;
      cc.catExtra.push({ name: name, parentName: parentName, service: o.service || SERVICE_NAMES[0] });
      if (!parentName && o.active === false) cc.catsOff.push(name);
      persist(data);
      return { ok: true, config: cc };
    },
    addService: function (commune, o) {
      var data = load();
      var cc = data.communeConfigs.find(function (c) { return c.commune === commune; });
      if (!cc) return { ok: false, error: "Commune introuvable." };
      var name = String(o.name || "").trim();
      if (!name) return { ok: false, error: "Nom requis." };
      if (cc.services.some(function (s) { return s.name.toLowerCase() === name.toLowerCase(); })) return { ok: false, error: "Ce service existe déjà." };
      cc.services.push({ name: name, emails: (o.emails || []).filter(Boolean) });
      persist(data);
      return { ok: true, config: cc };
    },
    renameService: function (commune, oldName, newName) {
      var data = load();
      var cc = data.communeConfigs.find(function (c) { return c.commune === commune; });
      if (!cc) return null;
      var svc = cc.services.find(function (s) { return s.name === oldName; });
      if (svc && newName && newName.trim()) svc.name = newName.trim();
      persist(data);
      return cc;
    },
    addServiceEmail: function (commune, serviceName, email) {
      var data = load();
      var cc = data.communeConfigs.find(function (c) { return c.commune === commune; });
      if (!cc) return null;
      var svc = cc.services.find(function (s) { return s.name === serviceName; });
      var e = String(email || "").trim();
      if (svc && e && svc.emails.indexOf(e) === -1) svc.emails.push(e);
      persist(data);
      return cc;
    },
    removeServiceEmail: function (commune, serviceName, email) {
      var data = load();
      var cc = data.communeConfigs.find(function (c) { return c.commune === commune; });
      if (!cc) return null;
      var svc = cc.services.find(function (s) { return s.name === serviceName; });
      if (svc) svc.emails = svc.emails.filter(function (e) { return e !== email; });
      persist(data);
      return cc;
    },
    addInternalStatus: function (commune, o) {
      var data = load();
      var cc = data.communeConfigs.find(function (c) { return c.commune === commune; });
      if (!cc) return { ok: false, error: "Commune introuvable." };
      var name = String(o.name || "").trim();
      if (!name) return { ok: false, error: "Nom requis." };
      cc.statusExtra.push({ name: name, color: o.color || "#7A6BC4", mapsTo: o.mapsTo || "En cours" });
      persist(data);
      return { ok: true, config: cc };
    },
    setStatusVisible: function (commune, name, visible) {
      var data = load();
      var cc = data.communeConfigs.find(function (c) { return c.commune === commune; });
      if (!cc) return null;
      cc.statusVisible = cc.statusVisible.filter(function (n) { return n !== name; });
      if (visible) cc.statusVisible.push(name);
      persist(data);
      return cc;
    },
    setMessageOverride: function (commune, trigger, text) {
      var data = load();
      var cc = data.communeConfigs.find(function (c) { return c.commune === commune; });
      if (!cc) return null;
      var cur = cc.messages[trigger] || {};
      cc.messages[trigger] = { off: !!cur.off, text: text };
      persist(data);
      return cc;
    },
    toggleMessageOff: function (commune, trigger, off) {
      var data = load();
      var cc = data.communeConfigs.find(function (c) { return c.commune === commune; });
      if (!cc) return null;
      var cur = cc.messages[trigger] || {};
      cc.messages[trigger] = { off: off, text: cur.text };
      persist(data);
      return cc;
    },

    chartData: function (commune, mode) {
      var reeps = load().reeps.filter(function (r) { return r.commune === commune && !r.deleted; });
      var d = new Date();
      if (mode === "Mois") {
        var monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        var bars = [];
        var wkStart = startOfWeek(monthStart);
        var i = 1;
        while (wkStart < startOfWeek(now()) + 7 * 86400000) {
          var wkEnd = wkStart + 7 * 86400000;
          var count = reeps.filter(function (r) { return r.createdAt >= wkStart && r.createdAt < wkEnd; }).length;
          bars.push(["S" + i, count]);
          wkStart = wkEnd; i++;
        }
        var total = reeps.filter(function (r) { return r.createdAt >= monthStart; }).length;
        return { sub: "Reeps reçus par semaine · " + d.toLocaleDateString("fr-CH", { month: "long" }), total: String(total), totalLabel: "ce mois-ci", bars: bars };
      }
      if (mode === "Total") {
        var months = [];
        for (var m = 5; m >= 0; m--) {
          var md = new Date(d.getFullYear(), d.getMonth() - m, 1);
          var mStart = md.getTime();
          var mEnd = new Date(md.getFullYear(), md.getMonth() + 1, 1).getTime();
          var mCount = reeps.filter(function (r) { return r.createdAt >= mStart && r.createdAt < mEnd; }).length;
          months.push([md.toLocaleDateString("fr-CH", { month: "short" }), mCount]);
        }
        return { sub: "Reeps reçus par mois · 6 derniers mois", total: String(reeps.length), totalLabel: "au total", bars: months };
      }
      var days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
      var wStart = startOfWeek(now());
      var wbars = days.map(function (label, i) {
        var dayStart = wStart + i * 86400000, dayEnd = dayStart + 86400000;
        var c = reeps.filter(function (r) { return r.createdAt >= dayStart && r.createdAt < dayEnd; }).length;
        return [label, c];
      });
      var wtotal = wbars.reduce(function (a, b) { return a + b[1]; }, 0);
      return { sub: "Reeps reçus par jour · semaine en cours", total: String(wtotal), totalLabel: "cette semaine", bars: wbars };
    },

    statsForCommune: function (commune) {
      var data = load();
      var all = data.reeps.filter(function (r) { return r.commune === commune && !r.deleted; });
      var wk = startOfWeek(now()), mo = startOfMonth(now());
      var week = all.filter(function (r) { return r.createdAt >= wk; }).length;
      var month = all.filter(function (r) { return r.createdAt >= mo; }).length;
      var byStatus = { "Nouveau": 0, "En cours": 0, "Planifié (travaux)": 0, "Traité": 0 };
      all.forEach(function (r) { if (byStatus[r.status] == null) byStatus[r.status] = 0; byStatus[r.status]++; });
      return { week: week, month: month, total: all.length, byStatus: byStatus };
    },

    statsGlobal: function () {
      var data = load();
      var all = data.reeps.filter(function (r) { return !r.deleted; });
      var wk = startOfWeek(now()), mo = startOfMonth(now());
      var week = all.filter(function (r) { return r.createdAt >= wk; }).length;
      var month = all.filter(function (r) { return r.createdAt >= mo; }).length;
      var byStatus = { "Nouveau": 0, "En cours": 0, "Planifié (travaux)": 0, "Traité": 0 };
      var byCommune = {};
      Object.keys(COMMUNES).forEach(function (c) { byCommune[c] = 0; });
      all.forEach(function (r) {
        if (byStatus[r.status] == null) byStatus[r.status] = 0;
        byStatus[r.status]++;
        byCommune[r.commune] = (byCommune[r.commune] || 0) + 1;
      });
      return { week: week, month: month, total: all.length, byStatus: byStatus, byCommune: byCommune };
    },

    chartDataGlobal: function (mode) {
      var reeps = load().reeps.filter(function (r) { return !r.deleted; });
      var d = new Date();
      if (mode === "Mois") {
        var monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        var bars = [];
        var wkStart = startOfWeek(monthStart);
        var i = 1;
        while (wkStart < startOfWeek(now()) + 7 * 86400000) {
          var wkEnd = wkStart + 7 * 86400000;
          var count = reeps.filter(function (r) { return r.createdAt >= wkStart && r.createdAt < wkEnd; }).length;
          bars.push(["S" + i, count]);
          wkStart = wkEnd; i++;
        }
        var total = reeps.filter(function (r) { return r.createdAt >= monthStart; }).length;
        return { sub: "Reeps reçus par semaine · toutes communes · " + d.toLocaleDateString("fr-CH", { month: "long" }), total: String(total), totalLabel: "ce mois-ci", bars: bars };
      }
      if (mode === "Total") {
        var months = [];
        for (var m = 5; m >= 0; m--) {
          var md = new Date(d.getFullYear(), d.getMonth() - m, 1);
          var mStart = md.getTime();
          var mEnd = new Date(md.getFullYear(), md.getMonth() + 1, 1).getTime();
          var mCount = reeps.filter(function (r) { return r.createdAt >= mStart && r.createdAt < mEnd; }).length;
          months.push([md.toLocaleDateString("fr-CH", { month: "short" }), mCount]);
        }
        return { sub: "Reeps reçus par mois · toutes communes · 6 derniers mois", total: String(reeps.length), totalLabel: "au total", bars: months };
      }
      var days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
      var wStart = startOfWeek(now());
      var wbars = days.map(function (label, i) {
        var dayStart = wStart + i * 86400000, dayEnd = dayStart + 86400000;
        var c = reeps.filter(function (r) { return r.createdAt >= dayStart && r.createdAt < dayEnd; }).length;
        return [label, c];
      });
      var wtotal = wbars.reduce(function (a, b) { return a + b[1]; }, 0);
      return { sub: "Reeps reçus par jour · toutes communes · semaine en cours", total: String(wtotal), totalLabel: "cette semaine", bars: wbars };
    },

    isAdminRole: function (a) {
      return !!a && a.type === "agent" && (a.role || "").toLowerCase().indexOf("administra") >= 0;
    },

    removeAccount: function (key, opts) {
      opts = opts || {};
      var data = load();
      var acc = findAccount(data, key);
      if (!acc) return { ok: false, error: "Compte introuvable." };
      var isAdmin = this.isAdminRole(acc) && acc.status === "active";
      if (isAdmin) {
        var otherAdmins = data.accounts.filter(function (a) {
          return a.key !== key && a.type === "agent" && a.commune === acc.commune && a.status === "active" && (a.role || "").toLowerCase().indexOf("administra") >= 0;
        });
        if (otherAdmins.length === 0) {
          if (opts.replacementKey) {
            var repl = findAccount(data, opts.replacementKey);
            if (!repl || repl.key === key || repl.type !== "agent" || repl.commune !== acc.commune) return { ok: false, error: "Agent de remplacement invalide." };
            repl.role = "Agent commune · Administrateur";
          } else if (opts.newAdmin) {
            var firstName = String(opts.newAdmin.first || "").trim();
            var lastName = String(opts.newAdmin.last || "").trim();
            var email = String(opts.newAdmin.email || "").trim().toLowerCase();
            if (!firstName || !lastName || !email) return { ok: false, error: "Prénom, nom et e-mail requis pour le nouvel administrateur." };
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Adresse e-mail invalide." };
            if (data.accounts.some(function (a) { return (a.email || "").toLowerCase() === email; })) return { ok: false, error: "Cette adresse e-mail est déjà utilisée." };
            var displayName = (firstName + " " + lastName).trim();
            var uname = email.split("@")[0], base = uname, n = 1;
            while (data.accounts.some(function (a) { return a.username.toLowerCase() === uname; })) { n++; uname = base + n; }
            var newKey = "agent_" + slugify(displayName) + "_" + (data.seq = (data.seq || 4900) + 1);
            var avBg = AV_COLORS[data.accounts.length % AV_COLORS.length];
            data.accounts.push({ key: newKey, type: "agent", username: uname, password: "Reeper", displayName: displayName, firstName: firstName, lastName: lastName, email: email, phone: "", address: "", initials: initialsOf(displayName), avBg: avBg, commune: acc.commune, role: "Agent commune · Administrateur", status: "active" });
          } else {
            return { ok: false, error: "Dernier administrateur de " + acc.commune + " : choisissez un remplaçant avant de supprimer ce compte.", needsReplacement: true, commune: acc.commune };
          }
        }
      }
      data.accounts = data.accounts.filter(function (a) { return a.key !== key; });
      if (data.session && data.session.accountKey === key) data.session = null;
      persist(data);
      return { ok: true };
    },

    createAccount: function (o) {
      var data = load();
      var firstName = String(o.firstName || "").trim();
      var lastName = String(o.lastName || "").trim();
      var email = String(o.email || "").trim().toLowerCase();
      if (!firstName || !lastName || !email) return Promise.resolve({ ok: false, error: "Prénom, nom et adresse e-mail sont requis." });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Promise.resolve({ ok: false, error: "Adresse e-mail invalide." });
      if (data.accounts.some(function (a) { return (a.email || "").toLowerCase() === email; })) return Promise.resolve({ ok: false, error: "Cette adresse e-mail est déjà utilisée." });
      if (o.role !== "citizen" && (!o.commune || !COMMUNES[o.commune])) return Promise.resolve({ ok: false, error: "Commune invalide." });
      var displayName = (firstName + " " + lastName).trim();
      var uname = String(o.username || "").trim().toLowerCase() || email.split("@")[0];
      var base = uname, n = 1;
      while (data.accounts.some(function (a) { return a.username.toLowerCase() === uname; })) { n++; uname = base + n; }
      return hashPassword(String(o.password || "").trim() || "Reeper").then(function (password) {
        var avBg = AV_COLORS[data.accounts.length % AV_COLORS.length];
        var common = { username: uname, password: password, displayName: displayName, firstName: firstName, lastName: lastName, email: email, phone: String(o.phone || "").trim(), address: String(o.address || "").trim(), initials: initialsOf(displayName), avBg: avBg };
        var account;
        if (o.role === "citizen") {
          var ckey = "citizen_" + slugify(displayName) + "_" + (data.seq = (data.seq || 4900) + 1);
          account = Object.assign({ key: ckey }, common, { type: "citizen", role: "Espace citoyen", status: "active", pendingCommune: null, points: 0 });
        } else {
          var akey = "agent_" + slugify(displayName) + "_" + (data.seq = (data.seq || 4900) + 1);
          var agentRole = o.role === "admin" ? "Agent commune · Administrateur" : o.role === "chef" ? "Chef de service" : "Agent";
          account = Object.assign({ key: akey }, common, { type: "agent", commune: o.commune, role: agentRole, status: "active" });
        }
        data.accounts.push(account);
        persist(data);
        return { ok: true, account: account };
      });
    },

    createGerant: function (callerKey, o) {
      var data = load();
      var caller = findAccount(data, callerKey);
      if (!caller || caller.type !== "gerant" || !caller.primary) return { ok: false, error: "Seul le gérant principal peut ajouter ce statut." };
      var firstName = String(o.firstName || "").trim();
      var lastName = String(o.lastName || "").trim();
      var email = String(o.email || "").trim().toLowerCase();
      if (!firstName || !lastName || !email) return { ok: false, error: "Prénom, nom et adresse e-mail sont requis." };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Adresse e-mail invalide." };
      if (data.accounts.some(function (a) { return (a.email || "").toLowerCase() === email; })) return { ok: false, error: "Cette adresse e-mail est déjà utilisée." };
      var displayName = (firstName + " " + lastName).trim();
      var uname = email.split("@")[0], base = uname, n = 1;
      while (data.accounts.some(function (a) { return a.username.toLowerCase() === uname; })) { n++; uname = base + n; }
      var key = "gerant_" + slugify(displayName) + "_" + (data.seq = (data.seq || 4900) + 1);
      var avBg = AV_COLORS[data.accounts.length % AV_COLORS.length];
      var account = { key: key, type: "gerant", username: uname, password: "Reeper", displayName: displayName, firstName: firstName, lastName: lastName, email: email, phone: "", address: "", initials: initialsOf(displayName), avBg: avBg, role: "Gérant", status: "active", primary: false };
      data.accounts.push(account);
      persist(data);
      return { ok: true, account: account };
    }
  };

  window.ReeperStore = Store;
})();
