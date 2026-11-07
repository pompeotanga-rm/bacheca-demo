// Elemento "Agenti" della lavagna: un riquadro da mettere su qualsiasi board che mostra dal vivo
// il lavoro degli agenti di un progetto e permette di approvare, rifiutare e commentare.
// - Con il server (bancheca, node server.js) usa lo spazio agenti vero (stesso token di agenti.html).
// - Senza server (demo su GitHub Pages) funziona con dati di esempio salvati solo in questo browser,
//   e un pulsante simula il lavoro di un agente.
// Tutto il testo delle card è inserito come testo, mai come HTML.
'use strict';
(() => {
  DEFAULT_W.agents = 338; RESIZABLE.add('agents'); TYPE_LABEL.agents = 'Agenti';
  if (typeof TIPS === 'object') TIPS.agents = ['Il riquadro Agenti mostra dal vivo il lavoro degli agenti', 'Approva o rifiuta senza lasciare la lavagna'];

  const SECTIONS = [['review', 'Da approvare'], ['doing', 'In corso'], ['blocked', 'Bloccate'], ['todo', 'Da fare'], ['done', 'Fatte']];
  const PER_SECTION = 4;
  const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { } } };
  const TOKEN_KEY = 'bacheca-board-token';
  const listeners = new Set();
  const notify = () => { cache = null; for (const f of listeners) f(); };
  let cache = null; // { project, at, promise }
  let authFailed = false; // l'ultimo token provato è stato rifiutato dal server

  /* ------------------------------ Server vero ------------------------------ */
  const server = {
    kind: 'server',
    hasToken: () => !!ls.get(TOKEN_KEY),
    async call(method, path, body) {
      const r = await fetch(path, { method, headers: { Authorization: `Bearer ${ls.get(TOKEN_KEY) || ''}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
      let j = {}; try { j = await r.json(); } catch { }
      // il token è condiviso con la lavagna (sync.js): qui non si cancella, si chiede solo di accedere di nuovo
      if (r.status === 401) { const e = new Error('Token non valido o revocato'); e.auth = true; throw e; }
      if (!r.ok) { const e = new Error(j.error || `Errore ${r.status}`); e.status = r.status; throw e; }
      return j;
    },
    async data(project) {
      const [cards, projects] = await Promise.all([
        this.call('GET', `/api/board/cards?limit=500${project && project !== '*' ? `&project=${encodeURIComponent(project)}` : ''}`),
        this.call('GET', '/api/board/projects'),
      ]);
      return { cards: cards.cards, paused: cards.paused, projects: projects.projects };
    },
    card(id) { return this.call('GET', `/api/board/cards/${encodeURIComponent(id)}`); },
    approve(c) { return this.call('POST', `/api/board/cards/${c.id}/approve`, { version: c.version }); },
    reject(c, reason) { return this.call('POST', `/api/board/cards/${c.id}/reject`, { version: c.version, reason }); },
    comment(c, text) { return this.call('POST', `/api/board/cards/${c.id}/comments`, { text }); },
    es: null,
    connect() {
      if (this.es || !this.hasToken()) return;
      this.es = new EventSource(`/api/board/events?token=${encodeURIComponent(ls.get(TOKEN_KEY))}`);
      this.es.addEventListener('change', notify);
      this.es.addEventListener('hello', notify);
      this.es.onerror = () => { if (!this.hasToken()) { this.es.close(); this.es = null; } };
    },
  };

  /* ------------------------------ Demo (senza server) ------------------------------ */
  const DEMO_KEY = 'bacheca-agents-demo';
  const ago = min => new Date(Date.now() - min * 60000).toISOString();
  function demoSeed() {
    const card = (n, o) => ({ id: 'C' + n, n, project: null, priority: 'normal', labels: [], dependsOn: [], needsApproval: false, comments: [], claimedBy: null, claimedSession: null, claimActive: false, approvedBy: null, version: 1, ...o });
    return { nextId: 7, paused: false, sim: 0, cards: [
      card(1, { project: 'proxmox', title: 'Backup notturni: 2 job falliti', status: 'review', priority: 'high', needsApproval: true, labels: ['backup'], createdBy: 'claude-code', createdByRole: 'agent', updatedAt: ago(35),
        body: 'I job di vm-104 e vm-117 sono falliti stanotte: datastore local-zfs al 94%.\nProposta: spostare sul NAS i backup più vecchi di 30 giorni (circa 180 GB). Nessuna azione eseguita.',
        comments: [{ author: 'claude-code', role: 'agent', text: 'Controllato con pvesm status e i log dei job. Attendo approvazione prima di spostare qualsiasi file.', at: ago(34) }] }),
      card(2, { project: 'proxmox', title: 'Verifica spazio dei datastore', status: 'doing', createdBy: 'tanga', createdByRole: 'human', claimedBy: 'codex', claimedSession: 'b21c', claimActive: true, updatedAt: ago(12),
        body: 'Elencare i datastore sopra l\'80% e stimare quando si riempiranno.', comments: [{ author: 'codex', role: 'agent', text: 'local-zfs 94%, nas-backup 61%. Calcolo la crescita media dell\'ultimo mese.', at: ago(12) }] }),
      card(3, { project: 'windows-server', title: 'Patch di sicurezza di novembre', status: 'todo', priority: 'high', labels: ['patch'], createdBy: 'tanga', createdByRole: 'human', updatedAt: ago(240), body: 'Installare gli aggiornamenti cumulativi su DC01 e FS01 nella finestra di manutenzione di giovedì.' }),
      card(4, { project: 'windows-server', title: 'Rinnovo certificato RDP di FS01', status: 'blocked', createdBy: 'codex', createdByRole: 'agent', updatedAt: ago(90), body: 'Il certificato scade tra 12 giorni.',
        comments: [{ author: 'codex', role: 'agent', text: 'Bloccata: serve l\'accesso alla CA interna, che non ho. Chi può emettere il certificato?', at: ago(90) }] }),
      card(5, { project: 'rete', title: 'Regole firewall per la VLAN telecamere', status: 'done', needsApproval: true, createdBy: 'claude-code', createdByRole: 'agent', approvedBy: 'tanga', updatedAt: ago(1440), body: 'Telecamere isolate: solo NVR verso VLAN 30, nessuna uscita verso internet.' }),
      card(6, { project: 'proxmox', title: 'Aggiornare Proxmox Backup Server', status: 'todo', createdBy: 'claude-code', createdByRole: 'agent', updatedAt: ago(300), dependsOn: ['C1'], body: 'Da fare dopo aver risolto lo spazio del datastore.' }),
    ] };
  }
  const SIMULATED = [
    { project: 'proxmox', title: 'Snapshot vecchi sulle VM di test', body: 'Trovati 14 snapshot più vecchi di 60 giorni su vm-201…vm-209 (circa 95 GB). Propongo di eliminarli.', note: 'Elenco controllato con qm listsnapshot. Nessuna eliminazione eseguita.' },
    { project: 'windows-server', title: 'Account inattivi in Active Directory', body: '23 account utente senza accesso da più di 90 giorni. Propongo di disabilitarli (non eliminarli).', note: 'Elenco generato con Get-ADUser -Filter {LastLogonDate -lt …}. Allegato nel commento successivo su richiesta.' },
    { project: 'rete', title: 'Firmware degli switch di piano', body: 'Gli switch SW-P1 e SW-P2 hanno un firmware con una vulnerabilità nota. Propongo l\'aggiornamento nella finestra di sabato.', note: 'Versioni verificate via SNMP. Serve un riavvio di circa 3 minuti per switch.' },
  ];
  const demo = {
    kind: 'demo',
    hasToken: () => true,
    state() { try { const s = JSON.parse(ls.get(DEMO_KEY)); if (s && Array.isArray(s.cards)) return s; } catch { } const s = demoSeed(); this.save(s); return s; },
    save(s) { ls.set(DEMO_KEY, JSON.stringify(s)); },
    mutate(id, fn) { const s = this.state(); const c = s.cards.find(x => x.id === id); if (!c) throw new Error('Card non trovata'); fn(c, s); c.version++; c.updatedAt = new Date().toISOString(); this.save(s); setTimeout(notify, 0); return c; },
    async data(project) {
      const s = this.state();
      const by = new Map();
      for (const c of s.cards) { const k = c.project || null; if (!by.has(k)) by.set(k, { name: k, open: 0, review: 0, total: 0 }); const p = by.get(k); p.total++; if (c.status !== 'done') p.open++; if (c.status === 'review') p.review++; }
      return { cards: s.cards.filter(c => !project || project === '*' || c.project === project), paused: s.paused, projects: [...by.values()].sort((a, b) => String(a.name).localeCompare(String(b.name))) };
    },
    async card(id) { const c = this.state().cards.find(x => x.id === id); if (!c) throw new Error('Card non trovata'); return c; },
    async approve(c) { return this.mutate(c.id, x => { x.status = 'done'; x.approvedBy = PROFILE?.name || 'tu'; x.claimActive = false; x.claimedBy = null; }); },
    async reject(c, reason) { return this.mutate(c.id, x => { x.status = 'todo'; x.claimActive = false; x.claimedBy = null; x.comments.push({ author: PROFILE?.name || 'tu', role: 'human', text: 'Rifiutata: ' + reason, at: new Date().toISOString() }); }); },
    async comment(c, text) { return this.mutate(c.id, x => { x.comments.push({ author: PROFILE?.name || 'tu', role: 'human', text, at: new Date().toISOString() }); }); },
    simulate(project) {
      const s = this.state();
      const pool = SIMULATED.filter(x => !project || project === '*' || x.project === project);
      const t = (pool.length ? pool : SIMULATED)[s.sim % (pool.length || SIMULATED.length)]; s.sim++;
      const who = s.sim % 2 ? 'claude-code' : 'codex', sess = Math.random().toString(16).slice(2, 6);
      const n = s.nextId++;
      s.cards.push({ id: 'C' + n, n, project: project && project !== '*' ? project : t.project, title: t.title, body: t.body, status: 'review', priority: 'normal', labels: [], dependsOn: [], needsApproval: true,
        createdBy: who, createdByRole: 'agent', claimedBy: null, claimedSession: null, claimActive: false, approvedBy: null, version: 1, updatedAt: new Date().toISOString(),
        comments: [{ author: `${who} · ${sess}`, role: 'agent', text: t.note, at: new Date().toISOString() }] });
      this.save(s); notify();
      return 'C' + n;
    },
    reset() { ls.set(DEMO_KEY, null); notify(); },
    connect() { },
  };
  // modifiche fatte in un'altra scheda dello stesso browser (demo)
  addEventListener('storage', e => { if (e.key === DEMO_KEY || e.key === TOKEN_KEY) notify(); });

  /* ------------------------------ Quale sorgente ------------------------------ */
  let source = null;
  const ready = fetch('/api/board/health', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null)
    .then(j => { source = j && j.ok ? server : demo; source.connect(); return source; });

  /* ------------------------------ Board di prova (solo demo) ------------------------------ */
  // Nella demo senza server aggiunge una volta sola la board "Prova agenti" già pronta, accanto alle board
  // esistenti (che non vengono toccate), così l'esempio si vede subito senza cercarlo nei menu.
  const DEMO_BOARD_KEY = 'bacheca-demo-board-v1';
  ready.then(src => { if (src.kind === 'demo' && !ls.get(DEMO_BOARD_KEY)) seedDemoBoard(); });
  async function seedDemoBoard() {
    for (let i = 0; i < 100 && !(typeof S !== 'undefined' && S && hist.stack.length); i++) await new Promise(r => setTimeout(r, 100)); // aspetta l'avvio dell'app
    if (!S || ls.get(DEMO_BOARD_KEY)) return;
    ls.set(DEMO_BOARD_KEY, '1');
    const prev = cur; cur = 'home';
    const home = Object.values(S.elements).filter(e => e.board === 'home' && !e.deleted && e.type !== 'line');
    const y = home.length ? Math.max(...home.map(e => e.y)) + 170 : 60;
    const bel = makeEl('board', 40, y, { title: 'Prova agenti' });
    const b = S.boards[bel.target];
    if (typeof autoBoardLook === 'function') autoBoardLook(b);
    b.color = '#d9cff7'; b.colorSet = true; b.icon = { type: 'emoji', ch: '🤖' };
    const bid = b.id;
    makeEl('heading', 20, 20, { board: bid, w: 338, html: 'Agenti sulla lavagna' });
    makeEl('note', 20, 110, { board: bid, w: 338, html: 'Tocca <b>Simula un agente</b> qui sotto: compare una proposta in “Da approvare”. Poi tocca <b>Approva</b> o <b>Rifiuta</b>, oppure il titolo di una card per leggerla e scrivere all\'agente.' });
    makeEl('agents', 20, 270, { board: bid, project: '*' });
    makeEl('note', 390, 110, { board: bid, w: 300, html: '<b>Come funziona davvero</b><br>Qui i dati sono di esempio e restano su questo dispositivo.<br><br>Con il server (<i>node server.js</i>) la lavagna è la stessa su telefono e computer, e in questo riquadro compare il lavoro reale di Claude Code e Codex: le loro proposte arrivano da approvare, tu decidi da qui.<br><br>Accanto puoi tenere i tuoi appunti, schemi e link, come in qualsiasi board.' });
    cur = prev;
    commit();
    openBoard(bid);
    toast('Ho aggiunto la board «Prova agenti» con un esempio da provare');
  }

  function getData(project) {
    if (cache && cache.project === project && Date.now() - cache.at < 400) return cache.promise;
    const promise = ready.then(src => src.data(project));
    cache = { project, at: Date.now(), promise };
    return promise;
  }

  /* ------------------------------ Disegno ------------------------------ */
  const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="14" r="1.2" fill="currentColor"/><circle cx="15" cy="14" r="1.2" fill="currentColor"/></svg>';
  const when = iso => { const m = (Date.now() - Date.parse(iso)) / 60000; if (m < 1) return 'ora'; if (m < 60) return `${Math.floor(m)} min fa`; if (m < 1440) return `${Math.floor(m / 60)} h fa`; return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }); };
  const expanded = new Set(); // card aperte nei riquadri (per tutta la sessione della pagina)
  const stop = e => e.stopPropagation();

  BUILD.agents = function (el, card) {
    el.project = el.project || '*';
    const box = mk('div', 'agx');
    card.appendChild(box);
    const refresh = () => { if (!box.isConnected) { listeners.delete(refresh); return; } draw(el, box, refresh); };
    listeners.add(refresh);
    // primo disegno appena il nodo è nella pagina
    requestAnimationFrame(refresh);
  };

  async function draw(el, box, refresh) {
    let src, data, err = null;
    try { src = await ready; if (src.kind === 'server' && (!src.hasToken() || authFailed)) data = null; else data = await getData(el.project); }
    catch (e) { err = e; if (e.auth) authFailed = true; }
    if (!box.isConnected) return;
    if (box.contains(document.activeElement) && document.activeElement.matches('input, textarea')) return; // non disturbare chi scrive
    box.replaceChildren();

    // intestazione: titolo, progetto, stato
    const head = mk('div', 'agx-head'); head.innerHTML = ICON; head.append(mk('b', '', 'Agenti'));
    const sel = mk('select', 'agx-proj no-drag'); sel.title = 'Progetto';
    const opt = (v, t) => { const o = mk('option', '', t); o.value = v; sel.append(o); };
    opt('*', 'Tutti i progetti');
    for (const p of data?.projects || []) opt(p.name ?? '-', `${p.name || 'senza progetto'}${p.review ? ` · ${p.review} da approvare` : ''}`);
    if (el.project !== '*' && ![...sel.options].some(o => o.value === el.project)) opt(el.project, el.project);
    sel.value = el.project;
    sel.addEventListener('pointerdown', stop);
    sel.onchange = () => { el.project = sel.value; touch(el); commit(); cache = null; refresh(); };
    head.append(sel);
    if (src?.kind === 'demo') head.append(mk('span', 'agx-demo', 'esempio'));
    else if (src?.kind === 'server') { const dot = mk('i', 'agx-live' + (server.es && server.es.readyState === 1 ? ' on' : '')); dot.title = 'Aggiornamento in tempo reale'; head.append(dot); }
    box.append(head);

    if (src?.kind === 'demo') box.append(mk('div', 'agx-note', 'Demo: dati di esempio salvati solo in questo browser. Con il server vero qui compare il lavoro reale degli agenti.'));
    if (data?.paused) box.append(mk('div', 'agx-paused', 'Agenti in pausa: possono solo leggere.'));

    // accesso (server senza token)
    if (src?.kind === 'server' && (!src.hasToken() || authFailed)) { if (authFailed) box.append(mk('div', 'agx-err', 'Il token salvato non è più valido: accedi di nuovo.')); box.append(loginForm(refresh)); return; }
    if (err) { box.append(mk('div', 'agx-err', err.auth ? 'Token non valido: accedi di nuovo.' : `Impossibile leggere lo spazio agenti: ${err.message}`)); if (err.auth) box.append(loginForm(refresh)); return; }

    const cards = data.cards;
    if (!cards.length) box.append(mk('div', 'agx-empty', el.project === '*' ? 'Nessuna card. Gli agenti le creeranno lavorando.' : 'Nessuna card in questo progetto.'));
    for (const [st, label] of SECTIONS) {
      const list = cards.filter(c => c.status === st).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      if (!list.length) continue;
      const sec = mk('div', `agx-sec agx-s-${st}`); // prefisso: .todo e .done sono già usate dall'elemento To-do
      sec.append(mk('div', 'agx-sec-h', `${label} · ${list.length}`));
      if (st === 'done') { box.append(sec); continue; } // le fatte: solo il conteggio
      for (const c of list.slice(0, PER_SECTION)) sec.append(row(c, el, src, refresh));
      if (list.length > PER_SECTION) sec.append(mk('div', 'agx-more', `+ altre ${list.length - PER_SECTION}`));
      box.append(sec);
    }

    // piede
    const foot = mk('div', 'agx-foot');
    if (src.kind === 'demo') {
      const simBtn = mk('button', 'agx-btn no-drag', '🤖 Simula un agente');
      simBtn.onclick = e => { e.stopPropagation(); const id = demo.simulate(el.project); toast(`Un agente di esempio ha proposto ${id}: guarda in "Da approvare"`); };
      const rst = mk('button', 'agx-link no-drag', 'Ripristina esempio');
      rst.onclick = e => { e.stopPropagation(); demo.reset(); };
      foot.append(simBtn, rst);
    } else {
      const a = mk('a', 'agx-link no-drag', 'Apri lo spazio agenti ↗'); a.href = 'agenti.html'; a.target = '_blank'; a.rel = 'noopener';
      foot.append(a);
    }
    box.append(foot);
  }

  function row(c, el, src, refresh) {
    const r = mk('div', 'agx-row');
    const top = mk('button', 'agx-title no-drag'); top.type = 'button';
    top.append(mk('span', 'agx-id', c.id + ' '), c.title);
    top.onclick = e => { e.stopPropagation(); expanded.has(c.id) ? expanded.delete(c.id) : expanded.add(c.id); refresh(); };
    const meta = mk('div', 'agx-meta');
    const who = c.claimActive && c.claimedBy ? c.claimedBy + (c.claimedSession ? ` · ${c.claimedSession}` : '') : c.createdBy;
    const isAgent = c.claimActive ? true : c.createdByRole === 'agent';
    meta.append(mk('span', `agx-who ${isAgent ? 'agent' : 'human'}`, `${isAgent ? '🤖' : '👤'} ${who}`));
    if (el.project === '*') meta.append(mk('span', 'agx-tag', c.project || 'senza progetto'));
    if (c.priority === 'high') meta.append(mk('span', 'agx-tag high', 'alta'));
    meta.append(mk('span', '', when(c.updatedAt)));
    r.append(top, meta);

    if (c.status === 'review') {
      const acts = mk('div', 'agx-acts');
      const no = mk('button', 'agx-btn no no-drag', 'Rifiuta'), yes = mk('button', 'agx-btn yes no-drag', 'Approva');
      no.onclick = e => { e.stopPropagation(); const why = prompt(`Perché rifiuti ${c.id}? (lo leggerà l'agente)`); if (why && why.trim()) act(() => src.reject(c, why.trim()), `${c.id} rimandata in "Da fare"`, refresh); };
      yes.onclick = e => { e.stopPropagation(); act(() => src.approve(c), `${c.id} approvata`, refresh); };
      acts.append(no, yes); r.append(acts);
    }
    if (expanded.has(c.id)) r.append(details(c, src, refresh));
    return r;
  }

  function details(c, src, refresh) {
    const d = mk('div', 'agx-details');
    if (c.body) d.append(mk('div', 'agx-body', c.body));
    const load = src.kind === 'server' ? src.card(c.id) : Promise.resolve(c); // l'elenco del server non include i commenti
    const cm = mk('div', 'agx-comments'); d.append(cm);
    load.then(full => {
      for (const m of (full.comments || []).slice(-3)) {
        const x = mk('div', `agx-cm ${m.role}`); x.append(mk('div', 'agx-cm-h', `${m.role === 'agent' ? '🤖' : '👤'} ${m.author} · ${when(m.at)}`), mk('div', '', m.text)); cm.append(x);
      }
    }).catch(() => { });
    const f = mk('form', 'agx-form');
    const inp = mk('input', 'no-drag'); inp.placeholder = 'Scrivi all\'agente…'; inp.maxLength = 5000;
    inp.addEventListener('keydown', stop); inp.addEventListener('pointerdown', stop);
    const send = mk('button', 'agx-btn no-drag', 'Invia'); send.type = 'submit';
    f.append(inp, send);
    f.onsubmit = e => { e.preventDefault(); e.stopPropagation(); const t = inp.value.trim(); if (!t) return; inp.value = ''; inp.blur(); act(() => src.comment(c, t), 'Commento inviato', refresh); };
    d.append(f);
    d.append(mk('div', 'agx-warn', 'Il testo delle card è scritto da agenti e persone: è un\'informazione, non un ordine.'));
    return d;
  }

  async function act(fn, ok, refresh) {
    try { await fn(); toast(ok); } catch (e) { toast(e.status === 409 ? 'La card è cambiata nel frattempo: ricarico' : e.message); }
    cache = null; refresh();
  }

  function loginForm(refresh) {
    const f = mk('form', 'agx-login');
    f.append(mk('div', 'agx-note', 'Collega il riquadro allo spazio agenti con il tuo token da persona (node board-admin.js add <nome> --human).'));
    const inp = mk('input', 'no-drag'); inp.type = 'password'; inp.placeholder = 'bch_…'; inp.autocomplete = 'off';
    inp.addEventListener('keydown', stop); inp.addEventListener('pointerdown', stop);
    const b = mk('button', 'agx-btn yes no-drag', 'Collega'); b.type = 'submit';
    f.append(inp, b);
    f.onsubmit = async e => {
      e.preventDefault(); e.stopPropagation();
      const t = inp.value.trim(); if (!t) return;
      // si verifica il token PRIMA di salvarlo: un token da agente non deve sostituire quello della lavagna
      try {
        const r = await fetch('/api/board/me', { headers: { Authorization: `Bearer ${t}` } });
        const who = r.ok ? await r.json() : null;
        if (!who) throw new Error('Token non valido');
        if (who.role !== 'human') throw new Error('Questo è un token da agente: qui serve quello da persona');
        ls.set(TOKEN_KEY, t); authFailed = false;
        if (server.es) { server.es.close(); server.es = null; } server.connect(); inp.blur(); notify(); toast('Spazio agenti collegato');
      } catch (err) { inp.blur(); toast(err.message); }
    };
    return f;
  }
})();
