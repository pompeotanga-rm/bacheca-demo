// Sincronizzazione della lavagna con il server (lavagna.js).
// - Senza server (demo su GitHub Pages) non fa nulla: tutto resta nel browser come prima.
// - Con il server, dopo l'accesso con un token da persona, le board sono le stesse su tutti i dispositivi.
// Funzionamento:
//   · l'app continua a salvare nel browser (copia locale, utile anche offline);
//   · dopo ogni salvataggio si confronta lo stato con l'ultima versione sincronizzata ("base") e si
//     mandano al server solo gli elementi/board/etichette cambiati;
//   · quando un altro dispositivo modifica qualcosa, il server lo annuncia in tempo reale e qui si
//     scaricano solo le modifiche nuove;
//   · se lo stesso elemento cambia su due dispositivi, vale l'ultima modifica (per singolo elemento);
//   · le modifiche fatte offline restano in coda e partono appena il server torna raggiungibile;
//   · i file (immagini, video, allegati) si caricano sul server e si scaricano solo quando servono.
'use strict';
const Sync = (() => {
  const TOKEN_KEY = 'bacheca-board-token', MODE_KEY = 'bacheca-sync-mode';
  const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { } } };
  let available = false;   // c'è un server con lo spazio condiviso
  let active = false;      // collegati: la lavagna è sincronizzata
  let me = null;           // { name, role }
  let rev = 0;             // ultima revisione del server già presente qui
  let base = new Map();    // chiave → impronta dell'ultima versione sincronizzata
  let pushing = false, pushAgain = false, pullAfter = false, pushTimer = null, retryMs = 0, es = null;
  let status = 'local';    // local | ok | sync | offline | error
  let connectGen = 0;      // ogni tentativo di collegamento ha un numero: uno superato (es. per timeout) non tocca più i dati
  const deferred = new Map(); // modifiche arrivate per elementi che si stanno scrivendo: applicate quando si smette

  /* ------------------------------ utilità ------------------------------ */
  const json = v => JSON.stringify(v, (k, x) => (k && k[0] === '_' ? undefined : x)); // i campi "_…" sono temporanei
  function hash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + ':' + s.length; }
  function snapshot(st = S) {
    const m = new Map();
    for (const [id, v] of Object.entries(st.boards || {})) m.set('b:' + id, v);
    for (const [id, v] of Object.entries(st.elements || {})) m.set('e:' + id, v);
    for (const [id, v] of Object.entries(st.labels || {})) m.set('l:' + id, v);
    m.set('m:seq', st.seq || 1);
    return m;
  }
  const hashes = st => { const m = new Map(); for (const [k, v] of snapshot(st)) m.set(k, hash(json(v))); return m; };
  // modifiche locali non ancora sul server
  function localChanges() {
    const cur = snapshot(), out = [];
    for (const [k, v] of cur) { const s = json(v), hs = hash(s); if (base.get(k) !== hs) out.push({ k, s, hs }); }
    for (const k of base.keys()) if (!cur.has(k)) out.push({ k, s: 'null', hs: null });
    return out;
  }
  async function api(method, path, body, raw) {
    const headers = { Authorization: `Bearer ${ls.get(TOKEN_KEY) || ''}` };
    if (body !== undefined) headers['Content-Type'] = raw ? (body.type || 'application/octet-stream') : 'application/json';
    const r = await fetch(path, { method, headers, body: body === undefined ? undefined : raw ? body : typeof body === 'string' ? body : JSON.stringify(body) });
    if (r.status === 401) { disconnect('Il token non è più valido: accedi di nuovo'); const e = new Error('non autorizzato'); e.auth = true; throw e; }
    let j = null; try { j = await r.json(); } catch { }
    if (!r.ok) { const e = new Error(j?.error || `Errore ${r.status}`); e.status = r.status; throw e; }
    return j;
  }
  const saveMeta = () => DB.put('kv', 'sync', { rev, base: Object.fromEntries(base), user: me?.name || null }).catch(() => { });
  const saveLocal = () => DB.put('kv', 'state', S).catch(() => { });

  /* ------------------------------ indicatore ------------------------------ */
  const LABEL = { local: 'Solo su questo dispositivo', ok: 'Sincronizzata con il server', sync: 'Sincronizzazione…', offline: 'Server non raggiungibile: le modifiche partiranno appena torna', error: 'Errore di sincronizzazione' };
  function setStatus(s) {
    status = s;
    const b = document.getElementById('btn-sync'); if (!b) return;
    b.dataset.state = s; b.title = LABEL[s] + (me && s !== 'local' ? ` · ${me.name}` : '');
  }
  function chip() {
    if (document.getElementById('btn-sync') || !available) return;
    const b = document.createElement('button'); b.id = 'btn-sync'; b.className = 'ico';
    b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 9.5Z"/><path class="ok" d="m9.5 13.5 2 2 3.5-4"/></svg>';
    b.onclick = e => { e.stopPropagation(); menu(b); };
    const anchor = document.getElementById('btn-agents') || document.getElementById('btn-mobile');
    anchor?.parentNode.insertBefore(b, anchor);
    setStatus(status);
  }
  function menu(b) {
    const r = b.getBoundingClientRect();
    menuAt(r.left, r.bottom + 6, m => {
      m.appendChild(h('div', 'mlabel', 'Lavagna condivisa'));
      const info = h('div', 'mi sync-info'); info.textContent = LABEL[status] + (me ? ` (${me.name})` : ''); m.appendChild(info);
      if (active) {
        mi(m, 'Sincronizza adesso', () => { pull(); schedulePush(0); });
        mi(m, 'Scollega questo dispositivo', () => { if (confirm('Scollegare questo dispositivo? Le board restano anche qui, ma non si aggiornano più con il server.')) disconnect('Dispositivo scollegato', true); });
      } else mi(m, 'Collega al server…', () => askLogin(true));
    });
  }

  /* ------------------------------ accesso ------------------------------ */
  function askLogin(force) {
    if (document.querySelector('.sync-modal')) return;
    if (!force && ls.get(MODE_KEY) === 'local') return;
    const hasLocal = Object.keys(S.elements).length > 0;
    const ov = h('div', 'sync-modal');
    const box = h('form', 'sync-box');
    box.append(h('h2', '', 'Lavagna condivisa'));
    const p = h('p'); p.textContent = 'Questa bacheca è collegata a un server: accedi con il tuo token da persona per vedere le stesse board su telefono, computer e con gli agenti.'; box.append(p);
    if (hasLocal) { const n = h('p', 'sync-note'); n.textContent = 'Le board già presenti su questo dispositivo verranno unite a quelle del server: non si perde nulla.'; box.append(n); }
    const inp = h('input'); inp.type = 'password'; inp.placeholder = 'bch_…'; inp.autocomplete = 'off'; inp.required = true;
    inp.addEventListener('keydown', e => e.stopPropagation());
    const err = h('p', 'sync-err');
    const go = h('button', 'sync-go', 'Collega'); go.type = 'submit';
    const local = h('button', 'sync-local', 'Usa solo questo dispositivo'); local.type = 'button';
    const row = h('div', 'sync-row'); row.append(local, go);
    box.append(inp, err, row); ov.append(box); document.body.append(ov);
    setTimeout(() => inp.focus(), 50);
    local.onclick = () => { ls.set(MODE_KEY, 'local'); ov.remove(); setStatus('local'); toast('Le board restano solo su questo dispositivo. Puoi collegarti dall\'icona della nuvola.'); };
    box.onsubmit = async e => {
      e.preventDefault(); err.textContent = ''; go.disabled = true;
      ls.set(TOKEN_KEY, inp.value.trim());
      try {
        const who = await api('GET', '/api/board/me');
        if (who.role !== 'human') throw new Error('Serve un token da persona, non da agente');
        ls.set(MODE_KEY, null); await connect(); ov.remove(); fullRender(); toast(`Collegato come ${who.name}: la lavagna è condivisa`);
      } catch (x) { if (!x.auth) ls.set(TOKEN_KEY, null); err.textContent = x.auth ? 'Token non valido' : x.message; go.disabled = false; }
    };
  }

  function disconnect(msg, keepToken) {
    const wasActive = active;
    active = false; if (es) { es.close(); es = null; }
    ls.set(TOKEN_KEY, null); if (keepToken) ls.set(MODE_KEY, 'local'); // scollegato a mano: non richiedere l'accesso a ogni avvio
    DB.del('kv', 'sync').catch(() => { }); base = new Map(); rev = 0; me = null;
    setStatus('local');
    if (msg && wasActive) toast(msg);
  }

  /* ------------------------------ collegamento ------------------------------ */
  async function connect() {
    const gen = ++connectGen;
    const who = await api('GET', '/api/board/me');
    if (who.role !== 'human') { disconnect(); throw new Error('Serve un token da persona'); }
    const meta = await DB.get('kv', 'sync').catch(() => null);
    const server = await api('GET', '/api/lavagna');
    if (gen !== connectGen) return false; // un tentativo più recente (o il timeout) ha preso il suo posto
    me = who;
    // se l'interfaccia è già attiva, si chiude prima la modifica in corso così il testo scritto entra nei dati
    if (typeof blurEditing === 'function' && document.querySelector('#world .el')) blurEditing();
    const first = !meta || meta.user !== me.name;
    // modifiche fatte qui e non ancora sul server (al primo collegamento: tutto il contenuto locale)
    const prevBase = first ? new Map() : new Map(Object.entries(meta.base || {}));
    base = prevBase; const pending = localChanges();
    const next = JSON.parse(JSON.stringify(server.state));
    const local = snapshot();
    let merged = 0;
    for (const c of pending) {
      const t = c.k[0], id = c.k.slice(2);
      if (c.k === 'm:seq') { next.seq = Math.max(next.seq || 1, S.seq || 1); continue; }
      const coll = t === 'e' ? next.elements : t === 'b' ? next.boards : next.labels;
      if (first && coll[id] !== undefined) continue; // primo collegamento: per ciò che esiste già sul server vale il server
      if (c.hs === null) delete coll[id]; else { coll[id] = local.get(c.k); if (t === 'e') merged++; }
    }
    S = next; if (!S.labels) S.labels = {};
    if (!S.boards.home) S.boards.home = freshState().boards.home;
    base = hashes(server.state); rev = server.rev; active = true;
    saveLocal(); saveMeta();
    if (first) { for (const id of referencedFiles()) queueUpload(id); }
    if (first && merged && server.rev > 0) setTimeout(() => toast(`Unite ${merged} card di questo dispositivo con la lavagna del server`), 600);
    hist.stack = []; hist.idx = -1;
    listen(); chip(); setStatus('ok');
    schedulePush(50); processUploads();
    return true;
  }

  function listen() {
    if (es) es.close();
    es = new EventSource(`/api/board/events?token=${encodeURIComponent(ls.get(TOKEN_KEY) || '')}`);
    es.addEventListener('lavagna', e => { let d = {}; try { d = JSON.parse(e.data); } catch { } if (d.rev > rev) pull(); });
    es.addEventListener('hello', () => { if (active) { pull(); schedulePush(0); } });
    es.onerror = () => { if (active && status !== 'sync') setStatus('offline'); };
  }

  /* ------------------------------ invio ------------------------------ */
  function schedulePush(ms = 400) { if (!active) return; clearTimeout(pushTimer); pushTimer = setTimeout(push, ms); }
  async function push() {
    if (!active) return;
    if (pushing) { pushAgain = true; return; }
    const changes = localChanges();
    if (!changes.length) { if (status !== 'offline') setStatus('ok'); return; }
    pushing = true; setStatus('sync');
    const body = `{"baseRev":${rev},"changes":[${changes.map(c => `{"k":${JSON.stringify(c.k)},"v":${c.s}}`).join(',')}]}`;
    try {
      const r = await api('PATCH', '/api/lavagna', body);
      for (const c of changes) c.hs === null ? base.delete(c.k) : base.set(c.k, c.hs);
      if (r.others?.length) applyRemote(r.others);
      rev = Math.max(rev, r.rev); saveMeta(); retryMs = 0; setStatus('ok');
    } catch (e) {
      if (e.auth) return;
      setStatus(e.status ? 'error' : 'offline');
      if (e.status === 413 || e.status === 400) toast(`Sincronizzazione rifiutata dal server: ${e.message}`);
      retryMs = Math.min(60000, retryMs ? retryMs * 2 : 5000); schedulePush(retryMs);
    } finally {
      pushing = false;
      if (pushAgain) { pushAgain = false; schedulePush(0); }
      if (pullAfter) { pullAfter = false; pull(); }
    }
  }

  /* ------------------------------ ricezione ------------------------------ */
  let pulling = false;
  async function pull() {
    if (!active) return;
    if (pushing || pulling) { pullAfter = true; return; } // mai in parallelo con un invio: la revisione resta coerente
    pulling = true;
    try { const r = await api('GET', `/api/lavagna/changes?since=${rev}`); if (r.changes.length) applyRemote(r.changes); rev = Math.max(rev, r.rev); saveMeta(); if (status === 'offline') setStatus('ok'); }
    catch (e) { if (!e.auth) setStatus('offline'); }
    finally { pulling = false; if (pullAfter && !pushing) { pullAfter = false; pull(); } }
  }

  // elementi che l'utente sta modificando adesso: nota o titolo con il cursore, cella di tabella, documento o schizzo aperti
  function editingIds() {
    const ids = new Set();
    const n = document.activeElement?.closest?.('.el'); if (n?.dataset.id) ids.add(n.dataset.id);
    if (typeof TBL !== 'undefined' && TBL.st?.editing) ids.add(TBL.st.id);
    const ov = document.querySelector('#overlay:not(.hidden)[data-el-id]'); if (ov) ids.add(ov.dataset.elId);
    const sk = document.querySelector('.sk-modal[data-el-id]'); if (sk) ids.add(sk.dataset.elId);
    return ids;
  }
  function applyRemote(changes) {
    const dirty = new Set(localChanges().map(c => c.k)); // ciò che è cambiato qui e non è ancora partito ha la precedenza
    const editing = editingIds();
    const changedEls = new Set(); let structural = false;
    for (const { k, v } of changes) {
      if (k === 'm:seq') { if (v != null) { S.seq = Math.max(S.seq || 1, v); base.set(k, hash(json(v))); } continue; }
      if (dirty.has(k)) continue;
      // non si sostituisce l'oggetto che l'editor aperto sta modificando: si applica quando l'utente ha finito
      if (k[0] === 'e' && editing.has(k.slice(2))) { deferred.set(k, v); continue; }
      const t = k[0], id = k.slice(2);
      const coll = t === 'e' ? S.elements : t === 'b' ? S.boards : S.labels;
      if (v === null) { delete coll[id]; base.delete(k); } else { coll[id] = v; base.set(k, hash(json(v))); }
      if (t === 'e') changedEls.add(id); else structural = true;
    }
    if (!changedEls.size && !structural) return;
    saveLocal();
    refresh(changedEls, structural);
  }

  // finita la modifica: se l'utente non ha cambiato l'elemento vale la versione arrivata, altrimenti vale la sua (che parte)
  function flushDeferred() {
    if (!deferred.size || !active) return;
    const editing = editingIds();
    const ready = [...deferred].filter(([k]) => !editing.has(k.slice(2)));
    if (!ready.length) return;
    for (const [k] of ready) deferred.delete(k);
    const dirty = new Set(localChanges().map(c => c.k));
    const apply = ready.filter(([k]) => !dirty.has(k)).map(([k, v]) => ({ k, v }));
    if (apply.length) applyRemote(apply); else schedulePush(0);
  }
  document.addEventListener('focusout', () => setTimeout(flushDeferred, 0), true);
  setInterval(flushDeferred, 2000); // documenti e schizzi si chiudono senza focusout

  function refresh(changedEls, structural) {
    if (!S.boards[cur]) { cur = 'home'; history.replaceState(null, '', '#/home'); structural = true; }
    for (const id of [...sel]) if (!S.elements[id] || S.elements[id].deleted) sel.delete(id);
    const active_ = document.activeElement;
    for (const id of changedEls) {
      const n = nodes.get(id), el = S.elements[id];
      if (n && el && !(active_ && n.contains(active_))) ensureNode(el, true); // chi sta scrivendo non viene interrotto
    }
    render();
    if (structural) renderChrome();
    // la cronologia di annullamento non deve riportare indietro le modifiche degli altri dispositivi
    hist.stack = [JSON.stringify(S)]; hist.idx = 0; updateUndoBtns();
  }

  /* ------------------------------ misure per gli agenti ------------------------------ */
  // Gli agenti non vedono lo schermo: il browser di chi guarda la board manda al server le dimensioni reali degli
  // elementi, così i controlli che il server fa per loro (board_check) usano misure vere e non stime.
  // Si manda solo ciò che è cambiato (dimensione o contenuto), al massimo ogni 3 secondi, solo con la pagina visibile.
  const sentSizes = new Map();
  let measuring = false;
  async function measure() {
    if (!active || measuring || document.visibilityState !== 'visible' || typeof nodes === 'undefined') return;
    const out = {};
    for (const [id, n] of nodes) {
      const el = S.elements[id];
      if (!el || el.deleted || el.board !== cur || el.type === 'line' || !n.isConnected) continue;
      const w = Math.round(n.offsetWidth), h = Math.round(n.offsetHeight);
      if (!w || !h) continue;
      const key = `${w}x${h}|${base.get('e:' + id) || ''}`; // cambia anche quando cambia il contenuto
      if (sentSizes.get(id) === key || base.get('e:' + id) !== hash(json(el))) continue; // solo elementi uguali alla versione del server
      out[id] = [w, h]; sentSizes.set(id, key);
      if (Object.keys(out).length >= 500) break;
    }
    if (!Object.keys(out).length) return;
    measuring = true;
    try { await api('POST', '/api/lavagna/sizes', { rev, sizes: out }); } catch { for (const id of Object.keys(out)) sentSizes.delete(id); } finally { measuring = false; }
  }
  setInterval(measure, 3000);

  /* ------------------------------ file ------------------------------ */
  function referencedFiles() {
    const ids = new Set();
    for (const e of Object.values(S.elements)) if (e.fileId) ids.add(e.fileId);
    for (const b of Object.values(S.boards)) if (b.iconImg) ids.add(b.iconImg);
    return ids;
  }
  let uploads = null; // id da caricare (salvati anche nel browser, per riprovare dopo un riavvio)
  async function loadQueue() { if (!uploads) uploads = new Set((await DB.get('kv', 'sync-uploads').catch(() => null)) || []); return uploads; }
  async function queueUpload(id) { (await loadQueue()).add(id); DB.put('kv', 'sync-uploads', [...uploads]).catch(() => { }); if (active) processUploads(); }
  let uploading = false, uploadRetryMs = 0;
  async function processUploads() {
    if (!active || uploading) return; uploading = true;
    let transient = false;
    try {
      for (const id of [...(await loadQueue())]) {
        try {
          const blob = await DB.get('files', id).catch(() => null);
          if (blob) await api('PUT', `/api/lavagna/files/${encodeURIComponent(id)}`, blob, true);
          uploads.delete(id);
        } catch (e) {
          if (e.auth) return;
          // rifiuto definitivo (troppo grande, non valido): si toglie dalla coda e si avvisa; gli altri file proseguono
          if (e.status >= 400 && e.status < 500) { uploads.delete(id); toast(`Un file non è stato caricato sul server: ${e.message}`); }
          else transient = true; // rete o server: si riprova più tardi, senza bloccare gli altri file
        }
        DB.put('kv', 'sync-uploads', [...uploads]).catch(() => { });
      }
    } finally {
      uploading = false;
      if (transient) { uploadRetryMs = Math.min(300000, uploadRetryMs ? uploadRetryMs * 2 : 15000); setTimeout(processUploads, uploadRetryMs); } else uploadRetryMs = 0;
    }
  }
  async function fetchFile(id) {
    if (!active) return null;
    try {
      const r = await fetch(`/api/lavagna/files/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${ls.get(TOKEN_KEY) || ''}` } });
      if (!r.ok) return null;
      const blob = await r.blob(); await DB.put('files', id, blob).catch(() => { }); return blob;
    } catch { return null; }
  }
  async function fetchMissing() {
    if (!active) return;
    const have = new Set(await DB.keys('files'));
    for (const id of referencedFiles()) if (!have.has(id)) await fetchFile(id);
  }

  /* ------------------------------ avvio ------------------------------ */
  async function start() {
    const health = await Promise.race([
      fetch('/api/board/health', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
      new Promise(r => setTimeout(() => r(null), 3000)),
    ]);
    if (!health?.ok) return; // nessun server: tutto resta locale, come prima
    available = true;
    if (ls.get(TOKEN_KEY) && ls.get(MODE_KEY) !== 'local') {
      try { await Promise.race([connect(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))]); }
      catch (e) {
        if (e.auth) return;
        connectGen++; // il tentativo lento, se finirà, non sostituirà più i dati: si riprova da capo
        setStatus('offline');
        const retry = (ms) => setTimeout(() => connect().then(ok => { if (ok) fullRender(); }).catch(x => { if (!x.auth) retry(Math.min(ms * 2, 60000)); }), ms);
        retry(10000);
      }
    }
  }
  // dopo l'avvio dell'interfaccia: icona e, se serve, richiesta di accesso
  function afterInit() {
    if (!available) return;
    chip();
    if (!active && !ls.get(TOKEN_KEY)) askLogin(false);
  }

  // chiave cambiata da questa pagina (es. rigenerata in Accessi): ci si ricollega con quella nuova
  addEventListener('bacheca-token-changed', () => { if (active) { listen(); pull(); } });
  addEventListener('online', () => { if (active) { pull(); schedulePush(0); processUploads(); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { if (active) push(); } else if (active) pull(); });

  return {
    start, afterInit,
    changed: () => schedulePush(),
    active: () => active,
    uploadFile: (id) => { if (active || available) queueUpload(id); },
    fetchFile, fetchMissing,
  };
})();
