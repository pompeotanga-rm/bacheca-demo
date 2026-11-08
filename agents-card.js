// Elemento "Agenti" della lavagna: un riquadro da mettere su qualsiasi board che mostra dal vivo
// il lavoro degli agenti di un progetto e permette di approvare, rifiutare e commentare.
// - Con il server (bancheca, node server.js) usa lo spazio agenti vero (stesso token di agenti.html).
// - Senza server (demo su GitHub Pages) funziona con dati di esempio salvati solo in questo browser,
//   e un pulsante simula il lavoro di un agente.
// Tutto il testo delle card è inserito come testo, mai come HTML.
'use strict';
(() => {
  DEFAULT_W.agents = 338; RESIZABLE.add('agents'); TYPE_LABEL.agents = 'Agenti';
  DEFAULT_W.agentcard = 300; RESIZABLE.add('agentcard'); TYPE_LABEL.agentcard = 'Card agente';
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
    async createTask(t) {
      const s = this.state(); const n = s.nextId++;
      const c = { id: 'C' + n, n, project: t.project || null, title: t.title, body: t.body || '', status: 'todo', priority: t.priority || 'normal', labels: [], dependsOn: [], needsApproval: !!t.needsApproval,
        assignee: t.assignee || null, createdBy: PROFILE?.name || 'tu', createdByRole: 'human', claimedBy: null, claimedSession: null, claimActive: false, approvedBy: null, version: 1, updatedAt: new Date().toISOString(), comments: [] };
      s.cards.push(c); this.save(s); notify(); return c;
    },
    reset() { ls.set(DEMO_KEY, null); notify(); },
    connect() { },
  };
  // chiave cambiata da questa pagina (Accessi): il tempo reale si riapre con la chiave nuova
  addEventListener('bacheca-token-changed', () => { if (server.es) { server.es.close(); server.es = null; } authFailed = false; if (source === server) server.connect(); notify(); });
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
  const DEMO_BOARD_KEY2 = 'bacheca-demo-board-v2'; // seconda parte: le card degli agenti come elementi della lavagna
  // terza parte: lo schema dell'architettura disegnato da Claude Code (permesso lavagna "solo i propri elementi"),
  // riordinato dall'alto in basso e con testi brevi per leggerlo anche dal telefono
  const DEMO_BOARD_KEY3 = 'bacheca-demo-board-v4';
  const SCHEMA_TITLE = 'Schema disegnato da un agente';
  const DEMO_BOARD_KEY4 = 'bacheca-demo-board-v7'; // esperimento: 4 agenti insieme (dati in demo-esperimento.json e demo-esperimento-2.json)
  const EXP_TITLE = 'Esperimento: 4 agenti insieme';
  const AGENT_COLORS = { architetto: '#ffffff', sicurezza: '#fde2e4', operativo: '#dff3e3', futuro: '#dcecfb' };
  const sig = { agentAuthor: 'claude-code', agentSession: 'f997' };
  const DEMO_SCHEMA = [
    { id: 'h', type: 'heading', x: 40, y: 20, w: 740, html: 'Come funziona Bacheca', ...sig },
    { id: 'intro', type: 'note', x: 40, y: 100, w: 740, color: '#fff6d6', html: '<p>Persone e agenti AI lavorano <b>sulla stessa lavagna</b>. Si legge dall’alto: chi la usa → il server → dove finiscono i dati.</p><p>Gli elementi con 🤖 li ha creati Claude Code da solo, leggendo il codice del progetto.</p>' },
    { id: 'pers', type: 'note', x: 40, y: 260, w: 320, html: '<p><b>👤 Persone</b></p><p>Aprono la bacheca nel browser: note, frecce, tabelle, compiti per gli agenti.</p>', ...sig },
    { id: 'agen', type: 'note', x: 460, y: 260, w: 320, html: '<p><b>🤖 Agenti</b></p><p>Claude Code e Codex, collegati con MCP e un token personale con permessi limitati.</p>', ...sig },
    { id: 'srv', type: 'note', x: 250, y: 560, w: 320, html: '<p><b>🖥️ Server</b> (server.js)</p><p>Controlla chi sei e cosa puoi fare, poi passa la richiesta.</p>', ...sig },
    { id: 'brd', type: 'note', x: 40, y: 860, w: 320, html: '<p><b>📋 Compiti</b> (board.js)</p><p>Card degli agenti: da fare, in corso, da approvare. Registro di tutto.</p>', ...sig },
    { id: 'lav', type: 'note', x: 460, y: 860, w: 320, html: '<p><b>🗒️ Lavagna</b> (lavagna.js)</p><p>Gli elementi che vedi a schermo, condivisi tra persone e agenti. Anche le card degli agenti compaiono qui.</p>', ...sig },
    { id: 'l1', type: 'line', a: 'pers', b: 'srv', label: 'browser', ...sig },
    { id: 'l2', type: 'line', a: 'agen', b: 'srv', label: 'MCP + token', ...sig },
    { id: 'l3', type: 'line', a: 'srv', b: 'brd', label: 'compiti', ...sig },
    { id: 'l4', type: 'line', a: 'srv', b: 'lav', label: 'disegni', ...sig },
  ];
  ready.then(src => { if (src.kind === 'demo' && (!ls.get(DEMO_BOARD_KEY) || !ls.get(DEMO_BOARD_KEY2) || !ls.get(DEMO_BOARD_KEY3) || !ls.get(DEMO_BOARD_KEY4))) seedDemoBoard(); });
  async function seedDemoBoard() {
    for (let i = 0; i < 100 && !(typeof S !== 'undefined' && S && hist.stack.length); i++) await new Promise(r => setTimeout(r, 100)); // aspetta l'avvio dell'app
    if (!S) return;
    let bid = null, opened = false;
    if (!ls.get(DEMO_BOARD_KEY)) {
      ls.set(DEMO_BOARD_KEY, '1');
      const prev = cur; cur = 'home';
      const home = Object.values(S.elements).filter(e => e.board === 'home' && !e.deleted && e.type !== 'line');
      const y = home.length ? Math.max(...home.map(e => e.y)) + 170 : 60;
      const bel = makeEl('board', 40, y, { title: 'Prova agenti' });
      const b = S.boards[bel.target];
      if (typeof autoBoardLook === 'function') autoBoardLook(b);
      b.color = '#d9cff7'; b.colorSet = true; b.icon = { type: 'emoji', ch: '🤖' };
      bid = b.id;
      makeEl('heading', 20, 20, { board: bid, w: 338, html: 'Agenti sulla lavagna' });
      makeEl('note', 20, 110, { board: bid, w: 338, html: 'Tocca <b>Simula un agente</b> qui sotto: compare una proposta in “Da approvare”. Poi tocca <b>Approva</b> o <b>Rifiuta</b>, oppure il titolo di una card per leggerla e scrivere all\'agente.' });
      makeEl('agents', 20, 270, { board: bid, project: '*' });
      makeEl('note', 390, 110, { board: bid, w: 300, html: '<b>Come funziona davvero</b><br>Qui i dati sono di esempio e restano su questo dispositivo.<br><br>Con il server (<i>node server.js</i>) la lavagna è la stessa su telefono e computer, e in questo riquadro compare il lavoro reale di Claude Code e Codex: le loro proposte arrivano da approvare, tu decidi da qui.<br><br>Accanto puoi tenere i tuoi appunti, schemi e link, come in qualsiasi board.' });
      cur = prev; opened = true;
    }
    if (!ls.get(DEMO_BOARD_KEY2)) {
      ls.set(DEMO_BOARD_KEY2, '1');
      bid = bid || Object.values(S.boards).find(b => b.title === 'Prova agenti')?.id;
      if (bid) {
        // con il server queste card e la nota le crea lo spazio agenti nella board del progetto
        makeEl('heading', 730, 20, { board: bid, w: 640, html: 'Le card degli agenti, sulla lavagna' });
        makeEl('agentcard', 730, 110, { board: bid, cardId: 'C1' });
        makeEl('agentcard', 730, 380, { board: bid, cardId: 'C4' });
        makeEl('agentcard', 1060, 110, { board: bid, cardId: 'C2' });
        const n = makeEl('note', 1060, 380, { board: bid, w: 300, agentAuthor: 'claude-code', agentSession: '78a6',
          html: '<h2>Rapporto backup di stanotte</h2><p>Job completati: 14 su 16.</p><p>Falliti: vm-104 e vm-117, datastore local-zfs al 94%.</p><p>Ho aperto la card C1 con la proposta di spostare i backup vecchi: aspetta la tua approvazione.</p>' });
        void n;
      }
    }
    let schemaBid = null;
    if (!ls.get(DEMO_BOARD_KEY3)) {
      ls.set(DEMO_BOARD_KEY3, '1');
      const prev = cur; cur = 'home';
      const old = Object.values(S.elements).find(e => e.type === 'board' && !e.deleted && S.boards[e.target]?.title === SCHEMA_TITLE);
      if (old) { // versione precedente, illeggibile: la svuota e la riempie di nuovo
        schemaBid = old.target;
        for (const e of Object.values(S.elements)) if (e.board === schemaBid) delete S.elements[e.id];
      } else {
        const home = Object.values(S.elements).filter(e => e.board === 'home' && !e.deleted && e.type !== 'line');
        const pa = home.find(e => e.type === 'board' && S.boards[e.target]?.title === 'Prova agenti');
        const bel = makeEl('board', pa ? pa.x + 160 : 40, pa ? pa.y : (home.length ? Math.max(...home.map(e => e.y)) + 170 : 60), { title: SCHEMA_TITLE });
        const b = S.boards[bel.target]; b.color = '#d9cff7'; b.colorSet = true; b.icon = { type: 'emoji', ch: '🗺️' }; b.named = true;
        schemaBid = b.id;
      }
      const ids = {}; for (const e of DEMO_SCHEMA) ids[e.id] = uid();
      for (const e of DEMO_SCHEMA) { // riquadri prima, frecce per ultime
        const { id, type, x = 0, y = 0, ...rest } = e;
        const extra = { ...rest, board: schemaBid };
        if (type === 'line') Object.assign(extra, { x1: 0, y1: 0, x2: 0, y2: 0, a: ids[e.a], b: ids[e.b], bx: 0, by: 0, arrowEnd: true, width: 2 });
        const el = makeEl(type, x, y, extra);
        delete S.elements[el.id]; el.id = ids[id]; S.elements[el.id] = el;
      }
      cur = prev;
    }
    // quarta parte: l'esperimento con 4 agenti Claude Code sulla stessa board, fatto due volte.
    // Giro 1: il server MCP chiedeva coordinate in pixel → board enorme, sovrapposizioni, 28 spostamenti.
    // Giro 2: stesso compito con le sezioni automatiche e i messaggi tra agenti → board ordinata da sola.
    // La board mostra il giro 2 così com'è uscito; il giro 1 resta dentro, intatto, per confronto.
    let expBid = null;
    if (!ls.get(DEMO_BOARD_KEY4)) {
      let g1 = null, g2 = null;
      try {
        const [r1, r2] = await Promise.all([fetch('demo-esperimento.json', { cache: 'no-cache' }), fetch('demo-esperimento-2.json', { cache: 'no-cache' })]);
        if (r1.ok && r2.ok) { g1 = await r1.json(); g2 = await r2.json(); }
      } catch { /* demo offline: si riprova la prossima volta */ }
      if (Array.isArray(g1) && g1.length && g2 && Array.isArray(g2.elements)) {
        ls.set(DEMO_BOARD_KEY4, '1');
        const prev = cur; cur = 'home';
        const oldEl = Object.values(S.elements).find(e => e.type === 'board' && !e.deleted && S.boards[e.target]?.title === EXP_TITLE);
        if (oldEl) { // versione precedente: la svuota (anche le sue sotto-board) e la riempie di nuovo
          expBid = oldEl.target;
          const subs = new Set(Object.values(S.boards).filter(b => b.parent === expBid).map(b => b.id));
          for (const e of Object.values(S.elements)) if (e.board === expBid || subs.has(e.board)) delete S.elements[e.id];
          for (const b of subs) delete S.boards[b];
        } else {
          const home = Object.values(S.elements).filter(e => e.board === 'home' && !e.deleted && e.type !== 'line');
          const near = home.find(e => e.type === 'board' && S.boards[e.target]?.title === SCHEMA_TITLE);
          const bel = makeEl('board', near ? near.x + 160 : 40, near ? near.y : (home.length ? Math.max(...home.map(e => e.y)) + 170 : 60), { title: EXP_TITLE });
          const b = S.boards[bel.target]; b.color = '#ffe2c6'; b.colorSet = true; b.icon = { type: 'emoji', ch: '🧪' }; b.named = true;
          expBid = b.id;
        }
        const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // copia fedele di una serie di elementi in una board, con id nuovi e spostamento orizzontale
        const copyAll = (data, bid, dx, dy) => {
          const ids = {}; for (const e of data) ids[e.id] = uid();
          for (const e of data) {
            const { id, type, x = 0, y = 0, ...rest } = e;
            const extra = { ...rest, board: bid, agentSession: e.agentAuthor ? e.agentAuthor.slice(0, 4) : undefined };
            if (type === 'line') Object.assign(extra, { x1: 0, y1: 0, x2: 0, y2: 0, a: ids[e.a], b: ids[e.b], bx: 0, by: 0 });
            if (rest.col) extra.col = ids[rest.col] || null;
            const el = makeEl(type, type === 'line' ? 0 : x + dx, type === 'line' ? 0 : y + dy, extra);
            delete S.elements[el.id]; el.id = ids[id]; S.elements[el.id] = el;
            if (type === 'column') el.items = (e.items || []).map(i => ids[i]).filter(Boolean);
          }
        };
        cur = expBid;
        // giro 2, così com'è: le colonne degli agenti, spostate a destra per fare posto a «Leggi prima»
        copyAll(g2.elements, expBid, 440, 0);
        const lead = makeEl('column', 40, 40, { board: expBid, w: 380, title: '📖 Leggi prima' });
        const put = (type, extra) => { const el = makeEl(type, 0, 0, { board: expBid, w: 360, ...extra }); el.col = lead.id; lead.items.push(el.id); return el; };
        const Y = '#fff6d6';
        put('note', { color: Y, html: '<p><b>🧪 Cosa è successo</b></p><p>Quattro sessioni vere di Claude Code (architetto, sicurezza, operativo, futuro), nello stesso momento, sulla stessa board, con lo stesso compito: spiegare come funziona Bacheca e cosa implica.</p><p>L’abbiamo fatto <b>due volte</b>. Dopo il primo giro ho migliorato il server MCP, poi ho rilanciato gli stessi agenti.</p><p>Quello che vedi a destra è il <b>secondo giro, così com’è uscito</b>: nessun riordino a mano.</p>' });
        put('note', { color: Y, html: '<p><b>📊 Primo giro → secondo giro</b></p><ul><li>Tempo per agente: <b>~3 min → ~1,5 min</b></li><li>Costo totale: <b>2,80 $ → 2,18 $</b></li><li>Spostamenti per evitarsi: <b>28 + 4 cancellazioni → 2, nessuna</b></li><li>Testo letto dalla board: <b>106 KB → 28 KB</b></li><li>Sovrapposizioni: <b>diverse → nessuna</b></li><li>Coordinamento: <b>note sulla lavagna → 4 messaggi fuori</b></li><li>Board: <b>4000 px e un vuoto → 4 colonne pulite</b></li></ul>' });
        put('note', { color: Y, html: '<p><b>🔧 Cosa è cambiato nel server MCP</b></p><ul><li><b>start_section</b>: ogni agente apre una sua colonna, il server la mette nello spazio libero e ci impila dentro gli elementi. Niente coordinate da indovinare.</li><li><b>send_message / read_messages</b>: si coordinano con messaggi fuori dalla lavagna, che restano nel registro.</li><li><b>board_elements</b> più leggero: raggruppato per sezioni e «solo le novità» dalla lettura precedente.</li></ul>' });
        put('note', { html: '<p><b>💬 I messaggi che si sono scambiati</b></p>' + (g2.messages || []).map(m => `<p><b>${esc(m.from)}</b>${m.to ? ` → ${esc(m.to)}` : ''}: ${esc(m.text)}</p>`).join('') });
        // giro 1, intatto, come sotto-board
        const sub = makeEl('board', 0, 0, { board: expBid, title: 'Primo giro: com’era' });
        sub.col = lead.id; lead.items.push(sub.id);
        const sb = S.boards[sub.target]; sb.color = '#ececec'; sb.colorSet = true; sb.icon = { type: 'emoji', ch: '🗂️' }; sb.named = true;
        cur = sb.id;
        copyAll(g1, sb.id, 0, 200);
        makeEl('note', 40, 20, { board: sb.id, w: 900, color: '#ececec', html: '<p><b>Il primo giro, esattamente com’era.</b> Gli agenti dovevano scegliere da soli coordinate in pixel senza vedere lo schermo: si sono sovrapposti, spostati 28 volte e la board è cresciuta fino a 4000 px. Il vuoto al centro: ricevevano coordinate vecchie per le note dentro le colonne (difetto scoperto qui e corretto).</p>' });
        cur = prev;
      }
    }
    commit();
    if (expBid && !opened) { openBoard(expBid); requestAnimationFrame(() => { /* una colonna per volta, leggibile anche dal telefono, partendo da «Leggi prima» */ setZoom(Math.min(1, VP().clientWidth / 440)); VP().scrollLeft = 0; VP().scrollTop = 0; }); toast('Novità: l\u2019esperimento con 4 agenti, nella board «' + EXP_TITLE + '»'); }
    else if (schemaBid && !opened) { openBoard(schemaBid); requestAnimationFrame(() => typeof zoomToFit === 'function' && zoomToFit()); toast('Novità: lo schema disegnato da un agente, nella board «Schema disegnato da un agente»'); }
    else if (bid) { openBoard(bid); toast(opened ? 'Ho aggiunto la board «Prova agenti» con un esempio da provare' : 'Novità nella board «Prova agenti»: le card degli agenti sono anche sulla lavagna'); }
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

  /* ------------------------------ Singola card sulla lavagna ------------------------------ */
  // Elemento creato dal server nella board del progetto: mostra dal vivo una card dello spazio agenti.
  // La lavagna conserva solo posizione e dimensioni; contenuto, stato e commenti arrivano dalla card vera.
  const STATUS_LABEL = Object.fromEntries(SECTIONS);
  BUILD.agentcard = function (el, card) {
    const box = mk('div', 'agc');
    card.appendChild(box);
    const refresh = () => { if (!box.isConnected) { listeners.delete(refresh); return; } drawCard(el, box, refresh); };
    listeners.add(refresh);
    requestAnimationFrame(refresh);
  };
  async function drawCard(el, box, refresh) {
    let src, c = null, err = null;
    try {
      src = await ready;
      if (!(src.kind === 'server' && (!src.hasToken() || authFailed))) c = (await getData('*')).cards.find(x => x.id === el.cardId) || null;
    } catch (e) { err = e; if (e.auth) authFailed = true; }
    if (!box.isConnected) return;
    if (box.contains(document.activeElement) && document.activeElement.matches('input, textarea')) return;
    box.replaceChildren();
    if (!c) {
      const msg = src?.kind === 'server' && (!src.hasToken() || authFailed) ? 'Collega lo spazio agenti (riquadro Agenti o agenti.html) per vedere questa card.'
        : err ? `Impossibile leggere la card: ${err.message}` : `La card ${el.cardId} non esiste più (archiviata).`;
      box.append(mk('div', 'agx-note', msg)); return;
    }
    const top = mk('div', 'agc-top');
    top.append(mk('span', `agc-st agc-st-${c.status}`, STATUS_LABEL[c.status] || c.status));
    if (c.needsApproval && c.status !== 'done') top.append(mk('span', 'agx-tag', 'richiede approvazione'));
    if (c.warn) top.append(warnTag(c.warn));
    if (src.kind === 'demo') top.append(mk('span', 'agx-demo', 'esempio'));
    box.append(top, row(c, { project: 'x' }, src, refresh)); // il progetto è già quello della board
  }

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
    if (c.assignee) meta.append(mk('span', 'agx-tag assignee', `per ${c.assignee}`));
    if (el.project === '*') meta.append(mk('span', 'agx-tag', c.project || 'senza progetto'));
    if (c.priority === 'high') meta.append(mk('span', 'agx-tag high', 'alta'));
    if (c.warn) meta.append(warnTag(c.warn));
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

  // avviso del server su testo scritto da un agente (link esterni, «a nome di» una persona o del sistema)
  function warnTag(w) { const t = mk('span', 'agx-tag warn', `⚠️ ${w.join(' · ')}`); t.title = 'Scritto da un agente: verifica prima di seguire link o istruzioni'; return t; }
  function details(c, src, refresh) {
    const d = mk('div', 'agx-details');
    if (c.body) d.append(mk('div', 'agx-body', c.body));
    const load = src.kind === 'server' ? src.card(c.id) : Promise.resolve(c); // l'elenco del server non include i commenti
    const cm = mk('div', 'agx-comments'); d.append(cm);
    load.then(full => {
      for (const m of (full.comments || []).slice(-3)) {
        const x = mk('div', `agx-cm ${m.role}`); x.append(mk('div', 'agx-cm-h', `${m.role === 'agent' ? '🤖' : '👤'} ${m.author} · ${when(m.at)}`), mk('div', '', m.text));
        if (m.warn) x.append(warnTag(m.warn)); cm.append(x);
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

  /* ------------------------------ Compito per un agente (menu •••) ------------------------------ */
  // La persona scrive il compito sulla lavagna e sceglie progetto e agente: solo quell'agente potrà
  // prenderlo. L'agente lo trova alla sua prossima sessione (board_overview mostra i compiti assegnati).
  async function openTaskForm(at) {
    // con un elemento selezionato, il compito nasce da lì: la card compare accanto e una freccia li collega
    const fromEl = typeof sel !== 'undefined' && sel.size === 1 ? S.elements[[...sel][0]] : null;
    const nearEl = fromEl && !fromEl.deleted && !['line', 'agentcard', 'agents'].includes(fromEl.type) ? fromEl : null;
    const src = await ready;
    if (src.kind === 'server' && !src.hasToken()) return toast('Prima collega lo spazio agenti con la tua chiave (riquadro Agenti o Accessi)');
    let agents = ['claude-code', 'codex'], projects = [];
    try {
      const d = await src.data('*'); projects = d.projects.map(p => p.name).filter(Boolean);
      if (src.kind === 'server' && typeof Access !== 'undefined') agents = (await Access.agents()).filter(a => a.perms.work).map(a => ({ name: a.name, projects: a.perms.projects }));
      else agents = agents.map(name => ({ name, projects: ['*'] }));
    } catch (e) { return toast(e.message); }
    const here = S.boards[cur]?.agentProject; // dentro la board di un progetto: quello è il progetto proposto
    const ov = mk('div', 'acc-modal'); const box = mk('form', 'acc-box acc-form');
    const head = mk('div', 'acc-head'); head.append(mk('h2', '', 'Compito per un agente'));
    const x = mk('button', 'acc-x', '✕'); x.type = 'button'; x.onclick = () => ov.remove(); head.append(x); box.append(head);
    const field = (label, input) => { const l = mk('label', '', label); l.append(input); box.append(l); return input; };
    const title = field('Cosa deve fare', mk('input')); title.required = true; title.maxLength = 200; title.placeholder = 'es. Controlla i certificati TLS in scadenza';
    const body = field('Dettagli (facoltativo)', mk('textarea')); body.rows = 4; body.placeholder = 'Vincoli, cosa NON fare, cosa riportare…';
    const projIn = field('Progetto', mk('input')); projIn.setAttribute('list', 'agx-projects'); projIn.value = here || projects[0] || ''; projIn.placeholder = 'es. proxmox'; projIn.autocapitalize = 'off';
    const dl = mk('datalist'); dl.id = 'agx-projects'; for (const p of projects) { const o = mk('option'); o.value = p; dl.append(o); } box.append(dl);
    const who = field('Assegna a', mk('select'));
    const fillWho = () => {
      const p = projIn.value.trim().toLowerCase(), prev = who.value; who.replaceChildren();
      const any = mk('option', '', 'Qualsiasi agente con accesso'); any.value = ''; who.append(any);
      for (const a of agents) { const ok = a.projects.includes('*') || a.projects.includes(p || '-'); const o = mk('option', '', ok ? a.name : `${a.name} (non ha accesso a questo progetto)`); o.value = a.name; o.disabled = !ok; who.append(o); }
      if ([...who.options].some(o => o.value === prev && !o.disabled)) who.value = prev;
    };
    projIn.addEventListener('input', fillWho); fillWho();
    const pri = field('Priorità', mk('select')); for (const [v, t] of [['normal', 'Normale'], ['high', 'Alta'], ['low', 'Bassa']]) { const o = mk('option', '', t); o.value = v; pri.append(o); }
    const al = mk('label', 'acc-check'); const appr = mk('input'); appr.type = 'checkbox'; appr.checked = true; al.append(appr, ' Prima di chiuderlo serve la mia approvazione'); box.append(al);
    box.append(mk('p', 'acc-muted', 'L\'agente lo troverà alla sua prossima sessione: le istruzioni gli dicono di guardare prima i compiti assegnati.'));
    const err = mk('p', 'acc-err'); const row = mk('div', 'acc-actions'); const go = mk('button', 'acc-btn primary', 'Assegna'); go.type = 'submit'; row.append(go); box.append(err, row);
    box.addEventListener('keydown', e => e.stopPropagation());
    box.onsubmit = async e => {
      e.preventDefault(); err.textContent = ''; go.disabled = true;
      const t = { title: title.value.trim(), body: body.value, project: projIn.value.trim().toLowerCase() || null, assignee: who.value || null, priority: pri.value, needsApproval: appr.checked, ...(nearEl ? { near: nearEl.id } : {}) };
      try {
        if (src.kind === 'server') {
          const c = await server.call('POST', '/api/board/cards', t);
          ov.remove(); cache = null; notify();
          const bid = Object.values(S.boards).find(b => b.agentProject !== undefined && (b.agentProject || null) === (c.project || null))?.id; // la board del progetto (arriva dalla lavagna)
          toast(`Compito ${c.id} creato${c.assignee ? ` per ${c.assignee}` : ''} nella board «${c.project || 'senza progetto'}»`, bid && cur !== bid ? 'Apri' : null, () => { const b2 = bid || Object.values(S.boards).find(b => (b.agentProject || null) === (c.project || null) && b.agentProject !== undefined)?.id; if (b2 && S.boards[b2]) openBoard(b2); });
        } else {
          const c = await demo.createTask(t);
          const nx = nearEl ? (nearEl.x + (nearEl.w || 260) + 40) : at?.x ?? 40, ny = nearEl ? nearEl.y : at?.y ?? 40;
          const ac = makeEl('agentcard', nx, ny, { cardId: c.id });
          if (nearEl) makeEl('line', 0, 0, { x1: 0, y1: 0, x2: 0, y2: 0, a: nearEl.id, b: ac.id, bx: 0, by: 0, arrowEnd: true, dash: true, width: 1.5, color: '#6d83d8', label: 'compito' });
          render(); commit();
          ov.remove(); toast(`Compito ${c.id} creato${c.assignee ? ` per ${c.assignee}` : ''} (esempio: nessun agente vero lo eseguirà)`);
        }
      } catch (x) { err.textContent = x.message; go.disabled = false; }
    };
    ov.append(box); document.body.append(ov); ov.addEventListener('pointerdown', e => { if (e.target === ov) ov.remove(); });
    title.focus();
  }
  // la voce "Compito agente" del menu ••• non crea un elemento: apre il modulo
  if (typeof addElement === 'function') {
    const orig = addElement;
    addElement = function (type, at, opts) { if (type === 'agenttask') return void openTaskForm(at); return orig.apply(this, arguments); };
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
