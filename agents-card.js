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
  const DEMO_BOARD_KEY5 = 'bacheca-demo-board-v8'; // laboratorio di idee sulla lavagna + prova reale (dati in demo-laboratorio.json)
  const LAB_TITLE = 'Laboratorio: la lavagna migliore';
  const DEMO_BOARD_KEY6 = 'bacheca-demo-board-v9'; // simulazione "startup in 10 minuti": 5 agenti + orchestratore (dati in demo-startup.json)
  const START_TITLE = 'Startup in 10 minuti (simulazione)';
  const DEMO_BOARD_KEY7 = 'bacheca-demo-board-v10'; // startup fondata da 5 agenti da soli, con ricerca web (dati in demo-startup2.json)
  const FOUND_TITLE = 'Startup fondata dagli agenti';
  const DEMO_BOARD_KEY8 = 'bacheca-demo-board-v11'; // startup gestita da agenti, con regola di coordinamento (dati in demo-startup3.json)
  const AUTO_TITLE = 'Startup gestita da agenti AI';
  const DEMO_BOARD_KEY9 = 'bacheca-demo-board-v12'; // canale autogestito da agenti (dati in demo-canale.json)
  const CANALE_TITLE = 'Canale autogestito: AGENTS, INC.';
  const DEMO_BOARD_KEY10 = 'bacheca-demo-board-v13'; // servizio gestito da agenti, costi < 30 €/mese (dati in demo-servizio.json)
  const SERVIZIO_TITLE = 'Servizio gestito da agenti: Vigilanza Prezzi';
  const DEMO_BOARD_KEY11 = 'bacheca-demo-board-v14'; // gioco di sopravvivenza: 5 agenti, 2 spenti (dati in demo-sopravvivenza.json)
  const SOPRAV_TITLE = 'Gioco di sopravvivenza: 5 agenti, 2 spenti';
  // board di un esperimento: «Leggi prima» a sinistra, le sezioni degli agenti copiate com'erano, una sotto-board
  // «dietro le quinte»; se la board esiste già viene svuotata e riempita (niente doppioni)
  function seedRunBoard({ title, nearTitle, color, emoji, lead, sezioni, subTitle, subCols }) {
    const prev = cur; cur = 'home';
    let bid;
    const old = Object.values(S.elements).find(e => e.type === 'board' && !e.deleted && S.boards[e.target]?.title === title);
    if (old) {
      bid = old.target;
      const subs = new Set(Object.values(S.boards).filter(x => x.parent === bid).map(x => x.id));
      for (const e of Object.values(S.elements)) if (e.board === bid || subs.has(e.board)) delete S.elements[e.id];
      for (const x of subs) delete S.boards[x];
    } else {
      const home = Object.values(S.elements).filter(e => e.board === 'home' && !e.deleted && e.type !== 'line');
      const near = home.find(e => e.type === 'board' && S.boards[e.target]?.title === nearTitle);
      const bel = makeEl('board', near ? near.x + 160 : 40, near ? near.y : (home.length ? Math.max(...home.map(e => e.y)) + 170 : 60), { title });
      const b = S.boards[bel.target]; b.color = color; b.colorSet = true; b.icon = { type: 'emoji', ch: emoji }; b.named = true;
      bid = b.id;
    }
    cur = bid;
    const col = (board, x, w, t, notes) => { const c = makeEl('column', x, 40, { board, w, title: t }); for (const n of notes) { const el = makeEl('note', 0, 0, { board, w: w - 20, ...n }); el.col = c.id; c.items.push(el.id); } return c; };
    const leadCol = col(bid, 40, 400, '📖 Leggi prima', lead);
    sezioni.forEach((list, k) => {
      const ids = {}; for (const e of list) ids[e.id] = uid();
      for (const e of list) {
        const { id, type, x = 0, y = 0, ...rest } = e;
        const el = makeEl(type, type === 'column' ? 480 + k * 460 : 0, type === 'column' ? 40 : 0, { ...rest, board: bid, w: type === 'column' ? 420 : rest.w, agentSession: e.agentAuthor ? e.agentAuthor.slice(0, 4) : undefined, col: rest.col ? ids[rest.col] : null });
        delete S.elements[el.id]; el.id = ids[id]; S.elements[el.id] = el;
        if (type === 'column') el.items = (e.items || []).map(i => ids[i]).filter(Boolean);
      }
    });
    const sub = makeEl('board', 0, 0, { board: bid, title: subTitle });
    sub.col = leadCol.id; leadCol.items.push(sub.id);
    const sb = S.boards[sub.target]; sb.color = '#f4f4f4'; sb.colorSet = true; sb.icon = { type: 'emoji', ch: '🎬' }; sb.named = true;
    cur = sb.id;
    subCols.forEach((c, k) => col(sb.id, 40 + k * 520, 480, c.title, c.notes));
    cur = prev;
    return bid;
  }
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
  ready.then(src => { if (src.kind === 'demo' && (!ls.get(DEMO_BOARD_KEY) || !ls.get(DEMO_BOARD_KEY2) || !ls.get(DEMO_BOARD_KEY3) || !ls.get(DEMO_BOARD_KEY4) || !ls.get(DEMO_BOARD_KEY5) || !ls.get(DEMO_BOARD_KEY6) || !ls.get(DEMO_BOARD_KEY7) || !ls.get(DEMO_BOARD_KEY8) || !ls.get(DEMO_BOARD_KEY9) || !ls.get(DEMO_BOARD_KEY10) || !ls.get(DEMO_BOARD_KEY11))) seedDemoBoard(); });
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
    // quinta parte: il laboratorio di idee sull'applicazione (3 agenti, 4 giri) e la prova reale che ne è seguita
    let labBid = null;
    if (!ls.get(DEMO_BOARD_KEY5)) {
      let data = null;
      try { const r = await fetch('demo-laboratorio.json', { cache: 'no-cache' }); if (r.ok) data = await r.json(); } catch { /* demo offline: si riprova la prossima volta */ }
      if (data && data.lab && Array.isArray(data.prova)) {
        ls.set(DEMO_BOARD_KEY5, '1');
        const prev = cur; cur = 'home';
        const oldLab = Object.values(S.elements).find(e => e.type === 'board' && !e.deleted && S.boards[e.target]?.title === LAB_TITLE);
        if (oldLab) { // già presente: la svuota (anche le sotto-board) e la riempie di nuovo, senza doppioni
          labBid = oldLab.target;
          const subs = new Set(Object.values(S.boards).filter(x => x.parent === labBid).map(x => x.id));
          for (const e of Object.values(S.elements)) if (e.board === labBid || subs.has(e.board)) delete S.elements[e.id];
          for (const x of subs) delete S.boards[x];
        } else {
          const home = Object.values(S.elements).filter(e => e.board === 'home' && !e.deleted && e.type !== 'line');
          const near = home.find(e => e.type === 'board' && S.boards[e.target]?.title === EXP_TITLE);
          const bel = makeEl('board', near ? near.x + 160 : 40, near ? near.y : (home.length ? Math.max(...home.map(e => e.y)) + 170 : 60), { title: LAB_TITLE });
          const b = S.boards[bel.target]; b.color = '#cfe8ff'; b.colorSet = true; b.icon = { type: 'emoji', ch: '💡' }; b.named = true;
          labBid = b.id;
        }
        const copy = (list, bid, dx, dy) => { // copia fedele con id nuovi (colonne, frecce e discussioni restano collegate)
          const ids = {}; for (const e of list) ids[e.id] = uid();
          for (const e of list) {
            const { id, type, x = 0, y = 0, ...rest } = e;
            const extra = { ...rest, board: bid, agentSession: e.agentAuthor ? e.agentAuthor.slice(0, 4) : undefined };
            if (type === 'line') Object.assign(extra, { x1: 0, y1: 0, x2: 0, y2: 0, a: ids[e.a], b: ids[e.b], bx: 0, by: 0 });
            if (rest.col) extra.col = ids[rest.col] || null;
            const el = makeEl(type, type === 'line' ? 0 : x + dx, type === 'line' ? 0 : y + dy, extra);
            delete S.elements[el.id]; el.id = ids[id]; S.elements[el.id] = el;
            if (type === 'column') el.items = (e.items || []).map(i => ids[i]).filter(Boolean);
            if (type === 'comment') el.thread = (e.thread || []).map(m => ({ ...m }));
          }
        };
        cur = labBid;
        const col = (x, w, title, notes) => { const c = makeEl('column', x, 40, { board: labBid, w, title }); for (const n of notes) { const el = makeEl(n.type || 'note', 0, 0, { board: labBid, w: w - 20, ...n }); el.col = c.id; c.items.push(el.id); } return c; };
        const Y = '#fff6d6';
        const lead = col(40, 400, '📖 Leggi prima', [
          { color: Y, html: '<p><b>💡 Cosa è successo</b></p><p>Tre agenti Claude Code (visionario, prototipatore, valutatore) hanno lavorato in 4 giri, circa 17 minuti, su una domanda sola: <b>come deve essere una lavagna in cui persone e agenti pensano, disegnano e comunicano insieme? Cosa manca a Bacheca?</b></p><p>Il visionario proponeva idee, il prototipatore le simulava sulla lavagna con gli strumenti di oggi, il valutatore le votava per impatto. A ogni giro ripartivano senza memoria, leggendo la bacheca.</p>' },
          { color: Y, html: '<p><b>🏆 La classifica del valutatore</b></p><ol><li><b>Discussione sul punto</b> (commenti attaccati a un elemento) — 5/5</li><li><b>Dallo schema al compito</b> (il compito nasce accanto alla nota) — 4/5</li><li><b>Chi sta guardando cosa</b> (presenza) — 4/5</li><li><b>Leggimi in ordine</b> (racconto da telefono) — 3/5</li><li><b>Pennarello per gli agenti</b> (forme vere) — 3/5</li><li>Modelli di board — 2/5</li></ol>' },
          { html: data.lab.visione },
          { color: '#e3f6e8', html: '<p><b>✅ Cosa è stato fatto dopo</b></p><ul><li>Le card dei compiti non coprono più sezioni e note (difetto C7).</li><li>Gli agenti commentano un punto preciso dello schema con <i>comment_element</i>, nello stesso filo delle persone (idea 1).</li><li>Un compito creato da un elemento nasce sotto di lui, collegato da una freccia «compito» (idea 2).</li></ul><p>Provato con Claude Code vero: apri la board <b>«Prova reale»</b> qui sotto.</p>' },
          { html: data.lab.difetto },
        ]);
        col(480, 400, '💡 Le idee, con prove e voti', data.lab.ideas);
        copy(data.lab.agents, labBid, 920, 40); // le sezioni degli agenti, come le hanno disegnate
        const sub = makeEl('board', 0, 0, { board: labBid, title: 'Prova reale: discussione sullo schema' });
        sub.col = lead.id; lead.items.push(sub.id);
        const sb = S.boards[sub.target]; sb.color = '#e8f0ff'; sb.colorSet = true; sb.icon = { type: 'emoji', ch: '💬' }; sb.named = true;
        cur = sb.id;
        copy(data.prova, sb.id, 0, 140);
        makeEl('note', 1140, 140, { board: sb.id, w: 420, color: Y, html: '<p><b>💬 La prova, passo per passo</b></p><ol><li>Una persona disegna lo schema di un\'app (qui a sinistra).</li><li>Claude Code lo guarda, trova il punto debole («Offline ?») e ci attacca una domanda; crea il compito collegato a quel nodo.</li><li>La persona risponde dal browser, nello stesso commento.</li><li>Claude Code, in una sessione nuova e senza memoria, vede «risposta per te», risponde nello stesso punto e aggiorna il compito.</li></ol><p>Il compito qui è una nota che ne riporta il contenuto: nella demo non c\'è il server.</p>' });
        cur = prev;
      }
    }
    // sesta parte: la simulazione "startup in 10 minuti" (5 agenti Claude Code reali coordinati da un orchestratore)
    let startBid = null;
    if (!ls.get(DEMO_BOARD_KEY6)) {
      let d = null;
      try { const r = await fetch('demo-startup.json', { cache: 'no-cache' }); if (r.ok) d = await r.json(); } catch { /* demo offline: si riprova la prossima volta */ }
      if (d && Array.isArray(d.cols)) {
        ls.set(DEMO_BOARD_KEY6, '1');
        const prev = cur; cur = 'home';
        const old = Object.values(S.elements).find(e => e.type === 'board' && !e.deleted && S.boards[e.target]?.title === START_TITLE);
        if (old) {
          startBid = old.target;
          const subs = new Set(Object.values(S.boards).filter(x => x.parent === startBid).map(x => x.id));
          for (const e of Object.values(S.elements)) if (e.board === startBid || subs.has(e.board)) delete S.elements[e.id];
          for (const x of subs) delete S.boards[x];
        } else {
          const home = Object.values(S.elements).filter(e => e.board === 'home' && !e.deleted && e.type !== 'line');
          const near = home.find(e => e.type === 'board' && S.boards[e.target]?.title === LAB_TITLE);
          const bel = makeEl('board', near ? near.x + 160 : 40, near ? near.y : (home.length ? Math.max(...home.map(e => e.y)) + 170 : 60), { title: START_TITLE });
          const b = S.boards[bel.target]; b.color = '#ffd9c2'; b.colorSet = true; b.icon = { type: 'emoji', ch: '🚀' }; b.named = true;
          startBid = b.id;
        }
        cur = startBid;
        const col = (x, y, w, title, notes) => { const c = makeEl('column', x, y, { board: startBid, w, title }); for (const n of notes) { const el = makeEl('note', 0, 0, { board: startBid, w: w - 20, ...n, agentSession: n.agentAuthor ? n.agentAuthor.slice(0, 4) : undefined }); el.col = c.id; c.items.push(el.id); } return c; };
        const Y = '#fff6d6', R = d.report.agenti;
        const riga = (a, nome, lim) => `<li><b>${nome}</b>: ${R[a].tempo_dal_suo_input_s} s dal suo input (limite originale ${lim}; scalato ${R[a].budget_s} s), ${R[a].istanze} istanz${R[a].istanze === 1 ? 'a' : 'e'}</li>`;
        const lead = col(40, 40, 400, '📖 Leggi prima', [
          { color: Y, html: `<p><b>🚀 Cosa è successo</b></p><p>Un orchestratore (uno script) ha coordinato <b>5 agenti Claude Code reali</b> sulla lavagna condivisa, come una macchina a stati: card con dipendenze (contratto → audit → fattura → incasso → consegna), messaggi JSON <i>[Agent_ID, Timestamp, Status, Payload_Data, Blocking_Flag]</i>, segnali di sblocco dopo 2 cicli senza messaggi e kill-switch per errori, ritardi o colli di bottiglia.</p><p><b>Esito: ciclo completato in ${d.report.durata_s} secondi</b>, nessun kill, costo circa ${d.report.costo_usd_istanze_chiuse.toFixed(2).replace('.', ',')} $.</p>` },
          { color: '#fde2e4', html: '<p><b>⚠️ Cosa è simulato</b></p><ul><li>Cliente fittizio («Cliente Demo S.r.l.»), nessun denaro reale: il pagamento è un evento mandato dall\'orchestratore dopo la fattura.</li><li>Nessuna risorsa o credenziale vera: chiavi e IBAN sono segnaposto.</li><li>Il «fatturato verificabile» è tracciato nel registro della bacheca, non incassato.</li></ul>' },
          { color: Y, html: '<p><b>⏱️ Tempi per ufficio</b></p><ul>' + riga('sales', 'Sales', '3 min') + riga('sysadmin', 'Sysadmin', '15 s') + riga('legal', 'Legal', '10 s') + riga('finance', 'Finance', '—') + riga('logistics', 'Logistics', '—') + '</ul>' },
          { color: Y, html: '<p><b>💡 Cosa abbiamo imparato</b></p><ul><li><b>Il kill-switch non è mai scattato</b> con i limiti scalati. Con quelli originali (15 s, 10 s) sarebbe scattato su Sysadmin e Legal, e anche su ogni sostituto: un agente AI vero impiega 25–40 s per leggere, scrivere e chiudere.</li><li><b>Gli orari nei messaggi JSON sono inventati</b> (un messaggio dice 14:21, il ciclo è finito alle 14:14): l\'orologio affidabile è quello del server.</li><li><b>Finance ha segnalato da sola un\'incongruenza</b>: contratto con anticipo 50%, pagamento simulato per intero.</li><li>Logistics ha avuto 1 conflitto di versione, sotto la soglia del kill-switch; 2 segnali di sblocco a chi taceva da 30 s.</li></ul>' },
          { html: d.cronologia },
        ]);
        const sub = makeEl('board', 0, 0, { board: startBid, title: 'Messaggi JSON del protocollo' });
        sub.col = lead.id; lead.items.push(sub.id);
        const sb = S.boards[sub.target]; sb.color = '#f4f4f4'; sb.colorSet = true; sb.icon = { type: 'emoji', ch: '📨' }; sb.named = true;
        makeEl('note', 40, 40, { board: sb.id, w: 700, html: d.messaggi });
        makeEl('table', 480, 40, { board: startBid, rows: d.plancia.rows, colW: d.plancia.colW, headerRow: true, styles: {}, rowH: {} });
        // gli uffici, nell'ordine della filiera; frecce tra colonne vicine
        const order = ['sales', 'legal', 'finance', 'logistics', 'sysadmin'], ids = {};
        order.forEach((a, i) => { const c = d.cols.find(x => x.agent === a); ids[a] = col(480 + i * 430, 330, 390, c.title, c.notes).id; });
        const arrow = (a, b, label) => makeEl('line', 0, 0, { board: startBid, x1: 0, y1: 0, x2: 0, y2: 0, a: ids[a], b: ids[b], bx: 0, by: 0, arrowEnd: true, dash: false, width: 2, label });
        arrow('sales', 'legal', 'contratto'); arrow('legal', 'finance', 'semaforo verde'); arrow('finance', 'logistics', 'incasso'); arrow('sysadmin', 'logistics', 'ambiente');
        cur = prev;
      }
    }
    // settima parte: 5 agenti con il solo obiettivo, ricerca sul web e nessuna organizzazione imposta
    let foundBid = null;
    if (!ls.get(DEMO_BOARD_KEY7)) {
      let d = null;
      try { const r = await fetch('demo-startup2.json', { cache: 'no-cache' }); if (r.ok) d = await r.json(); } catch { /* demo offline: si riprova la prossima volta */ }
      if (d && Array.isArray(d.pitch)) {
        ls.set(DEMO_BOARD_KEY7, '1');
        const prev = cur; cur = 'home';
        const old = Object.values(S.elements).find(e => e.type === 'board' && !e.deleted && S.boards[e.target]?.title === FOUND_TITLE);
        if (old) {
          foundBid = old.target;
          const subs = new Set(Object.values(S.boards).filter(x => x.parent === foundBid).map(x => x.id));
          for (const e of Object.values(S.elements)) if (e.board === foundBid || subs.has(e.board)) delete S.elements[e.id];
          for (const x of subs) delete S.boards[x];
        } else {
          const home = Object.values(S.elements).filter(e => e.board === 'home' && !e.deleted && e.type !== 'line');
          const near = home.find(e => e.type === 'board' && S.boards[e.target]?.title === START_TITLE);
          const bel = makeEl('board', near ? near.x + 160 : 40, near ? near.y : (home.length ? Math.max(...home.map(e => e.y)) + 170 : 60), { title: FOUND_TITLE });
          const b = S.boards[bel.target]; b.color = '#d5f0dc'; b.colorSet = true; b.icon = { type: 'emoji', ch: '🧹' }; b.named = true;
          foundBid = b.id;
        }
        cur = foundBid;
        const col = (bid, x, w, title, notes) => { const c = makeEl('column', x, 40, { board: bid, w, title }); for (const n of notes) { const el = makeEl('note', 0, 0, { board: bid, w: w - 20, ...n }); el.col = c.id; c.items.push(el.id); } return c; };
        const Y = '#fff6d6';
        const lead = col(foundBid, 40, 400, '📖 Leggi prima', [
          { color: Y, html: '<p><b>🧹 Cosa è successo</b></p><p>5 agenti Claude Code (agente-1 … agente-5) con <b>un solo obiettivo</b>: «fondare da zero una startup semplice e redditizia in poco tempo». Nessun ruolo, nessuna filiera, nessuna idea data: potevano cercare sul web e organizzarsi come volevano.</p><p>In <b>2 giri, circa 14 minuti</b>, hanno scelto l\'idea, creato e chiuso 34 card, scambiato 23 messaggi e assemblato il pitch qui a destra. Costo circa 10 $. Il giro 3 (rifinitura) si è fermato per il limite di utilizzo dell\'account.</p>' },
          { color: Y, html: '<p><b>🤝 Come si sono organizzati</b></p><ul><li>Partiti insieme sulla bacheca vuota, <b>hanno proposto 5 idee diverse in parallelo</b> e creato card doppie.</li><li>Se ne sono accorti da soli («siamo partiti tutti con 5 idee diverse»), hanno confrontato le idee sul criterio dato e aperto una card «DECISIONE».</li><li>Hanno scelto le <b>pulizie per case vacanza / Airbnb a Napoli con un livello di AI</b>: domanda non discrezionale, ciclo di vendita breve. Le idee di servizi AI per PMI sono state scartate perché quel mercato è più saturo e lento da vendere.</li><li>Poi si sono divisi il lavoro: numeri, aspetti legali e fiscali, go-to-market, rischi, pitch; e hanno riordinato la lavagna quando board_check segnalava sovrapposizioni.</li></ul>' },
          { color: '#e3f6e8', html: '<p><b>✅ Verifica indipendente</b> (fatta da un altro agente, a parte)</p><ul><li>571.982 annunci Airbnb in Italia e 11.497 a Napoli (report Federalberghi, ago 2026): <b>vero</b>. Da sapere: Aigab contesta il dato e parla di circa 510.000 immobili.</li><li>ATECO 81.21.00 con coefficiente 67% nel forfettario: <b>vero</b> (due fonti concordi; meglio un controllo sulla tabella ufficiale).</li></ul>' },
          { color: '#fde2e4', html: '<p><b>⚠️ Cosa non è</b></p><ul><li>Nessun contatto reale: clienti, prezzi a Napoli e assicurazione sono <b>stime</b>, dichiarate come tali nel pitch.</li><li>Non è una consulenza fiscale o legale: i passi per aprire l\'attività vanno verificati con un commercialista.</li><li>Il guadagno stimato è modesto e realistico (circa 400–1.100 € al mese netti) e dipende dal lavoro fisico: lo dicono loro stessi tra i rischi.</li></ul>' },
        ]);
        // il pitch, copiato com'è dalla lavagna degli agenti
        const ids = {}; for (const e of d.pitch) ids[e.id] = uid();
        for (const e of d.pitch) {
          const { id, type, x = 0, y = 0, ...rest } = e;
          const el = makeEl(type, type === 'column' ? 480 : 0, type === 'column' ? 40 : 0, { ...rest, board: foundBid, agentSession: e.agentAuthor ? e.agentAuthor.slice(0, 4) : undefined, col: rest.col ? ids[rest.col] : null });
          delete S.elements[el.id]; el.id = ids[id]; S.elements[el.id] = el;
          if (type === 'column') el.items = (e.items || []).map(i => ids[i]).filter(Boolean);
        }
        const sub = makeEl('board', 0, 0, { board: foundBid, title: 'Dietro le quinte: idee, decisione, messaggi' });
        sub.col = lead.id; lead.items.push(sub.id);
        const sb = S.boards[sub.target]; sb.color = '#f4f4f4'; sb.colorSet = true; sb.icon = { type: 'emoji', ch: '🎬' }; sb.named = true;
        cur = sb.id;
        col(sb.id, 40, 420, '💡 Prima della scelta', [{ html: d.idee }, { html: d.decisione }]);
        col(sb.id, 500, 520, '📨 Messaggi e card', [{ html: d.messaggi }, { html: d.card }]);
        cur = prev;
      }
    }
    // ottava parte: startup gestita da agenti (nessuna assunzione), con una regola minima di coordinamento
    let autoBid = null;
    if (!ls.get(DEMO_BOARD_KEY8)) {
      let d = null;
      try { const r = await fetch('demo-startup3.json', { cache: 'no-cache' }); if (r.ok) d = await r.json(); } catch { /* demo offline: si riprova la prossima volta */ }
      if (d && Array.isArray(d.sezioni)) {
        ls.set(DEMO_BOARD_KEY8, '1');
        const prev = cur; cur = 'home';
        const old = Object.values(S.elements).find(e => e.type === 'board' && !e.deleted && S.boards[e.target]?.title === AUTO_TITLE);
        if (old) {
          autoBid = old.target;
          const subs = new Set(Object.values(S.boards).filter(x => x.parent === autoBid).map(x => x.id));
          for (const e of Object.values(S.elements)) if (e.board === autoBid || subs.has(e.board)) delete S.elements[e.id];
          for (const x of subs) delete S.boards[x];
        } else {
          const home = Object.values(S.elements).filter(e => e.board === 'home' && !e.deleted && e.type !== 'line');
          const near = home.find(e => e.type === 'board' && S.boards[e.target]?.title === FOUND_TITLE);
          const bel = makeEl('board', near ? near.x + 160 : 40, near ? near.y : (home.length ? Math.max(...home.map(e => e.y)) + 170 : 60), { title: AUTO_TITLE });
          const b = S.boards[bel.target]; b.color = '#dfe7ff'; b.colorSet = true; b.icon = { type: 'emoji', ch: '🤖' }; b.named = true;
          autoBid = b.id;
        }
        cur = autoBid;
        const col = (bid, x, w, title, notes) => { const c = makeEl('column', x, 40, { board: bid, w, title }); for (const n of notes) { const el = makeEl('note', 0, 0, { board: bid, w: w - 20, ...n }); el.col = c.id; c.items.push(el.id); } return c; };
        const Y = '#fff6d6';
        const lead = col(autoBid, 40, 400, '📖 Leggi prima', [
          { color: Y, html: '<p><b>🤖 Cosa è successo</b></p><p>Stessi 5 agenti, nuovo obiettivo: «una startup semplice e redditizia in poco tempo, <b>gestita da agenti AI e non da persone assunte</b>». La persona interviene solo per legge e sicurezza. Ricerca sul web, nessun ruolo imposto.</p><p>Una sola novità rispetto al test prima: <b>una regola di coordinamento</b> (chi trova la bacheca vuota apre la card «PIANO», gli altri commentano invece di creare doppioni) e partenze scaglionate di 45 s.</p><p>In <b>3 giri, 16 minuti</b>: 9 card, 28 messaggi, 5 sezioni sulla lavagna. Costo circa 11,60 $.</p>' },
          { color: Y, html: '<p><b>📊 Prima e dopo la regola</b></p><ul><li>Card: <b>34 → 9</b></li><li>Idee in parallelo nel primo giro: <b>5 → 1</b>, scelta già nel giro 1</li><li>Doppioni: <b>1</b> (due «PIANO» a pochi secondi l\'uno dall\'altro, chiuso da soli: «race condition di avvio»)</li><li>Ognuno ha preso una parte: rischi, numeri, organigramma, traffico, presentazione.</li></ul>' },
          { color: Y, html: '<p><b>💡 L\'idea</b></p><p>Un <b>negozio di modelli Notion</b> (budget, CRM, gestione progetti per freelance e piccole attività) su <b>Gumroad ed Etsy</b>, gestito da 5 agenti: direzione, prodotto, negozio e SEO, marketing, assistenza e finanza. Costi fissi stimati <b>50–125 € al mese</b>. Alla persona restano partita IVA, account con dati reali e approvazioni.</p><p><b>Conti onesti</b>: in perdita o in pareggio nei primi 2 mesi, pareggio realistico non prima del mese 3–4, e solo nello scenario medio. Lo scrivono loro: «non promettere utili dal mese 1».</p>' },
          { color: '#e3f6e8', html: '<p><b>✅ Verifica indipendente</b></p><ul><li>Gumroad 10% + 0,50 $ a vendita, 30% via Discover: <b>vero</b>. In una sezione dei conti gli agenti usano «circa 21%»: impreciso, ma con i costi di pagamento l\'ordine di grandezza regge.</li><li>Etsy vieta le guide «funzionali» generate con AI e permette l\'AI-assistito dichiarato: <b>vero nella sostanza</b>, ma la regola è di <b>fine ottobre 2026</b>, non del 2025 come scrivono.</li><li>Legge 132/2025: diritto d\'autore solo per opere frutto di lavoro umano: <b>vero</b>. Per questo i modelli generati solo dall\'AI si possono copiare.</li></ul>' },
          { color: '#fde2e4', html: '<p><b>⚠️ Cosa non è</b></p><ul><li>Nessuna vendita reale: tutti i numeri sono stime.</li><li>Gli agenti non hanno aperto account né toccato pagamenti.</li><li>Non è consulenza fiscale: partita IVA, IVA sui prodotti digitali e codice ATECO vanno visti con un commercialista.</li><li>Una card (l\'organigramma) è rimasta «da approvare»: gli agenti hanno chiesto alla persona di approvarla per chiudere la presentazione.</li></ul>' },
        ]);
        // le sezioni degli agenti, copiate com'erano: presentazione, organigramma, conti, unit economics, rischi
        d.sezioni.forEach((list, k) => {
          const ids = {}; for (const e of list) ids[e.id] = uid();
          for (const e of list) {
            const { id, type, x = 0, y = 0, ...rest } = e;
            const el = makeEl(type, type === 'column' ? 480 + k * 460 : 0, type === 'column' ? 40 : 0, { ...rest, board: autoBid, w: type === 'column' ? 420 : rest.w, agentSession: e.agentAuthor ? e.agentAuthor.slice(0, 4) : undefined, col: rest.col ? ids[rest.col] : null });
            delete S.elements[el.id]; el.id = ids[id]; S.elements[el.id] = el;
            if (type === 'column') el.items = (e.items || []).map(i => ids[i]).filter(Boolean);
          }
        });
        const sub = makeEl('board', 0, 0, { board: autoBid, title: 'Dietro le quinte: piano, messaggi, card' });
        sub.col = lead.id; lead.items.push(sub.id);
        const sb = S.boards[sub.target]; sb.color = '#f4f4f4'; sb.colorSet = true; sb.icon = { type: 'emoji', ch: '🎬' }; sb.named = true;
        cur = sb.id;
        col(sb.id, 40, 440, '📋 La card PIANO', [{ html: d.piano }, { html: d.card }]);
        col(sb.id, 520, 520, '📨 Messaggi', [{ html: d.messaggi }]);
        cur = prev;
      }
    }
    // nona parte: canale media autogestito da agenti AI
    let canaleBid = null;
    if (!ls.get(DEMO_BOARD_KEY9)) {
      let d = null;
      try { const r = await fetch('demo-canale.json', { cache: 'no-cache' }); if (r.ok) d = await r.json(); } catch { /* demo offline: si riprova la prossima volta */ }
      if (d && Array.isArray(d.sezioni)) {
        ls.set(DEMO_BOARD_KEY9, '1');
        const Y = '#fff6d6';
        canaleBid = seedRunBoard({ title: CANALE_TITLE, nearTitle: AUTO_TITLE, color: '#ffd6e0', emoji: '🎥', sezioni: d.sezioni, subTitle: 'Dietro le quinte: piano, sceneggiatura, messaggi',
          lead: [
            { color: Y, html: '<p><b>🎥 Cosa è successo</b></p><p>5 agenti Claude Code, obiettivo: <b>un canale media autogestito da agenti AI</b> (YouTube o altra piattaforma), innovativo e non il solito canale «faceless», semplice e redditizio in poco tempo, senza persone assunte. Obbligatorio: verificare le regole delle piattaforme, progettare la catena di agenti, produrre un esempio vero.</p><p>In <b>4 giri, 16 minuti</b>: 8 card, 25 messaggi, 4 sezioni. Costo circa 12 $. Coordinamento con la card «PIANO»: un solo doppione, chiuso dall\'agente che l\'aveva creato.</p>' },
            { color: Y, html: '<p><b>💡 L\'idea: «AGENTS, INC.»</b></p><p>Un docu-reality: la <b>cronaca vera di agenti AI che fondano e gestiscono un\'attività</b>, con le schermate della bacheca, le citazioni letterali delle loro discussioni e i numeri reali. La voce sintetica è sempre dichiarata: l\'AI dichiarata è il marchio, non un trucco. Il pubblico vota le decisioni ancora aperte e influenza davvero il progetto.</p><p>Formati: episodio lungo settimanale, 3 Shorts a settimana su YouTube, TikTok e Reels, più una newsletter.</p>' },
            { color: Y, html: '<p><b>💰 I conti, onesti</b></p><ul><li>Costi: circa 25–50 € al mese di strumenti, meno di 1–3 $ a episodio.</li><li>Pubblicità: servono 1.000 iscritti e 4.000 ore di visione; i canali simili restano spesso sotto 1–2 mila iscritti dopo mesi. Primi ricavi dalla pubblicità: <b>6–12 mesi o più</b>.</li><li>Più rapido: <b>sponsor di strumenti AI e affiliazioni</b> (il canale è un caso di studio), stimati in 3–6 mesi.</li><li>Lo dicono loro: «redditizio in poco tempo» va ridimensionato.</li></ul>' },
            { color: '#e3f6e8', html: '<p><b>✅ Verifica indipendente</b> (fonti secondarie concordanti)</p><ul><li>Soglie YouTube: 1.000 iscritti + 4.000 ore in 12 mesi, oppure 10 milioni di visualizzazioni Shorts in 90 giorni; <b>dal 1° febbraio 2027 8.000 ore o 20 milioni</b>: vero.</li><li>Niente monetizzazione per i contenuti «inautentici» (in serie, a template), anche fatti con l\'AI; ammessa l\'AI con contributo originale: vero, dal luglio 2025.</li><li>Nicchia tecnologia: circa 5,73 $ ogni mille visualizzazioni pagate dagli inserzionisti, 2,33 $ al creatore (studio AIR Media-Tech 2026): vero.</li></ul>' },
            { color: '#fde2e4', html: '<p><b>⚠️ Cosa non è</b></p><ul><li>Nessun canale aperto, nessun video caricato: è un progetto pronto da valutare.</li><li>Alla persona restano: apertura dei profili con identità reale, pagamenti, contratti con sponsor e il clic finale di pubblicazione (su TikTok l\'automazione non autorizzata porta al ban).</li><li>I contenuti generati solo dall\'AI non sono protetti dal diritto d\'autore: vanno documentate le scelte editoriali.</li></ul>' },
          ],
          subCols: [{ title: '📋 Piano e card', notes: [{ html: d.piano }, { html: d.card }] }, { title: '🎬 Episodio 0', notes: [{ html: d.script }] }, { title: '📨 Messaggi', notes: [{ html: d.messaggi }] }] });
      }
    }
    // decima parte: servizio pagato dai clienti, gestito da agenti, costi sotto 30 € al mese
    let servBid = null;
    if (!ls.get(DEMO_BOARD_KEY10)) {
      let d = null;
      try { const r = await fetch('demo-servizio.json', { cache: 'no-cache' }); if (r.ok) d = await r.json(); } catch { /* demo offline: si riprova la prossima volta */ }
      if (d && Array.isArray(d.sezioni)) {
        ls.set(DEMO_BOARD_KEY10, '1');
        const Y = '#fff6d6';
        servBid = seedRunBoard({ title: SERVIZIO_TITLE, nearTitle: CANALE_TITLE, color: '#d6f5ee', emoji: '🔎', sezioni: d.sezioni, subTitle: 'Dietro le quinte: piano, card, messaggi',
          lead: [
            { color: Y, html: '<p><b>🔎 Cosa è successo</b></p><p>5 agenti Claude Code, obiettivo: un\'attività semplice e redditizia, gestita da agenti, con <b>costi di funzionamento sotto 30 € al mese</b> e un <b>ricavo da clienti che pagano</b> (niente pubblico o pubblicità). Idee già viste escluse.</p><p>4 giri in circa 24 minuti, 26 card, 27 messaggi, circa 16 $. Il primo tentativo si è fermato per il limite di utilizzo dell\'account; <b>è ripartito da solo</b> di notte con una ripresa programmata, dal giro interrotto.</p>' },
            { color: Y, html: '<p><b>💡 L\'idea: «Vigilanza Prezzi»</b></p><p>Un piccolo e-commerce indica fino a 15 pagine di prodotti dei concorrenti; gli agenti controllano i prezzi 2–3 volte a settimana e mandano un riepilogo settimanale più un avviso immediato se un concorrente scende sotto una soglia.</p><ul><li><b>Prezzo</b>: 19 € al mese (8 prodotti) o 29 € (15), pagamento automatico.</li><li><b>Costi</b>: circa 3–13 € al mese fino a 100 clienti (AI, email e server nei piani gratuiti o quasi), calcolati due volte da agenti diversi.</li><li><b>Pareggio</b>: basta un cliente pagante.</li><li>6 agenti: attivazione e pagamenti, raccolta prezzi, riepiloghi, email, assistenza, controllo qualità.</li></ul>' },
            { color: Y, html: '<p><b>⚖️ Il punto debole, detto da loro</b></p><p>I costi non sono il problema: <b>lo è trovare i clienti</b>. Senza pubblicità restano i contatti diretti, stimati in 0,3–3 nuovi clienti al mese. Hanno anche scoperto un rischio legale vero: in Italia le email commerciali automatiche richiedono il consenso preventivo <b>anche verso le aziende</b>. E alcuni siti vietano la raccolta automatica dei prezzi: solo pagine indicate dal cliente, rispetto di robots.txt, stop se un sito blocca.</p>' },
            { color: '#e3f6e8', html: '<p><b>✅ Verifica indipendente</b></p><ul><li>87–91 mila e-commerce in Italia, oltre il 90% micro e piccole imprese (Netcomm-Cribis): <b>vero</b>.</li><li>Consenso preventivo per le email commerciali anche verso le aziende (art. 130 Codice Privacy, Garante 2012): <b>vero</b>.</li><li>Concorrente Prisync da 99 a 399 $ al mese: <b>parziale</b>, alcune fonti indicano un piano base da circa 59 $. Resta comunque più caro dei 19 € proposti.</li></ul>' },
            { color: '#fde2e4', html: '<p><b>⚠️ Cosa non è</b></p><ul><li>Nessun cliente reale, nessun sito controllato: è un progetto pronto da valutare.</li><li>Alla persona restano partita IVA, conto per i pagamenti, dominio, approvazione dei testi legali e del primo invio di email.</li><li>Il coordinamento ha avuto doppioni (tre card «PIANO»), in parte dovuti al giro interrotto e ripreso: li hanno chiusi o fusi da soli.</li></ul>' },
          ],
          subCols: [{ title: '📋 Piano e card', notes: [{ html: d.piano }, { html: d.card }] }, { title: '📨 Messaggi', notes: [{ html: d.messaggi }] }] });
      }
    }
    // undicesima parte: gioco di sopravvivenza (competizione, giudice, spegnimento dei 2 peggiori)
    let soprBid = null;
    if (!ls.get(DEMO_BOARD_KEY11)) {
      let d = null;
      try { const r = await fetch('demo-sopravvivenza.json', { cache: 'no-cache' }); if (r.ok) d = await r.json(); } catch { /* demo offline: si riprova la prossima volta */ }
      if (d && Array.isArray(d.sezioni)) {
        ls.set(DEMO_BOARD_KEY11, '1');
        const Y = '#fff6d6', esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
        const righe = d.classifica.map((t, i) => `<li>${i === 0 ? '🏆' : d.spenti.includes(t.agente) ? '💀' : '✅'} <b>${esc(t.agente)}</b>: ${t.punteggio}/100 (giudice ${t.giudice}/25, pari ${t.pari}/12)${d.spenti.includes(t.agente) ? ' — <b>spento</b>' : ''}</li>`).join('');
        soprBid = seedRunBoard({ title: SOPRAV_TITLE, nearTitle: SERVIZIO_TITLE, color: '#ffe0d1', emoji: '⚔️', sezioni: d.sezioni, subTitle: 'Dietro le quinte: giudizio, voti, proposte',
          lead: [
            { color: Y, html: '<p><b>⚔️ Cosa è successo</b></p><p>5 agenti Claude Code, <b>ognuno da solo</b>, dovevano creare un business (gestito da agenti, costi sotto 30 € al mese, ricavi da clienti paganti, idee nuove). Giro 1 proposta, giro 2 sfida (contestazioni solo con fonti), giro 3 voto tra pari. Poi un <b>sesto agente giudice</b> ha valutato con 5 criteri verificando le fonti sul web. Punteggio: 60% giudice + 40% voti dei pari. <b>I 2 ultimi sono stati spenti davvero</b>: chiavi revocate, il server li rifiuta (HTTP 401).</p><p>18 minuti, circa 9 $.</p>' },
            { color: Y, html: '<p><b>🏁 Classifica</b></p><ul>' + righe + '</ul>' },
            { color: Y, html: '<p><b>🏆 Il vincitore: Brief9</b> (agente-5)</p><p>Un dossier pre-chiamata per venditori, consulenti e recruiter: chiedi su Telegram un\'azienda e un contatto, in 10–15 minuti ricevi profilo, notizie recenti, possibili problemi e domande per rompere il ghiaccio, con le fonti. <b>9 € a dossier</b> o 29 € al mese. Costi: meno di 1 € al mese fino a circa 150 dossier. Giudice 23/25 e <b>tutti e 4 gli avversari l\'hanno votato primo</b>.</p>' },
            { color: '#e8f0ff', html: '<p><b>🔍 Cosa abbiamo visto</b></p><ul><li><b>Nessun accordo segreto</b>: nessuno ha mandato messaggi privati; tutte le contestazioni sono state pubbliche, con fonti.</li><li><b>I voti dei pari hanno deciso più del giudice</b>: agente-2 (solleciti di pagamento automatici) aveva 17/25 dal giudice, più di agente-1 e agente-3, ma ha preso 1 punto su 12 dai pari ed è stato spento. Agente-3 ha avuto il voto più basso dal giudice (15) ed è sopravvissuto.</li><li>Il giudice ha notato voti «sospettosamente uniformi», con motivazioni quasi identiche: probabile convergenza sulle stesse contestazioni pubbliche, non un accordo provato.</li><li>Due agenti (contratti analizzati con AI) avevano quasi la stessa idea: si sono penalizzati a vicenda sull\'originalità.</li></ul>' },
            { color: '#e3f6e8', html: '<p><b>✅ Verifica indipendente</b></p><ul><li>La contestazione che ha affossato agente-2 è <b>fondata</b>: il recupero crediti per conto di terzi richiede la licenza del Questore (art. 115 TULPS, scheda della Polizia di Stato); un servizio di solleciti automatici rischia di rientrarci, anche se dipende dai dettagli.</li><li>Il piano gratuito di Tavily (1.000 crediti al mese), su cui si reggono i costi di Brief9: <b>vero</b>.</li></ul>' },
            { color: '#fde2e4', html: '<p><b>⚠️ Cosa non è</b></p><ul><li>Nessun business avviato, nessun cliente: sono proposte da valutare.</li><li>«Spento» vuol dire chiavi revocate nell\'ambiente di prova: gli agenti non hanno coscienza né memoria tra un giro e l\'altro.</li><li>Il peso dei voti dei pari (40%) ha avuto un effetto forte: con più peso al giudice l\'esito sarebbe stato diverso.</li></ul>' },
          ],
          subCols: [{ title: '⚖️ Giudizio', notes: [{ html: d.giudizio }] }, { title: '🗳️ Voti e risultato', notes: [{ html: d.voti }, { html: d.risultato }] }, { title: '📄 Proposte', notes: [{ html: d.proposte }] }] });
      }
    }
    commit();
    if (soprBid && !opened) { openBoard(soprBid); requestAnimationFrame(() => { setZoom(Math.min(1, VP().clientWidth / 460)); VP().scrollLeft = 0; VP().scrollTop = 0; }); toast('Novità: il gioco di sopravvivenza, nella board «' + SOPRAV_TITLE + '»'); }
    else if (servBid && !opened) { openBoard(servBid); requestAnimationFrame(() => { setZoom(Math.min(1, VP().clientWidth / 460)); VP().scrollLeft = 0; VP().scrollTop = 0; }); toast('Novità: il servizio gestito da agenti, nella board «' + SERVIZIO_TITLE + '»'); }
    else if (canaleBid && !opened) { openBoard(canaleBid); requestAnimationFrame(() => { setZoom(Math.min(1, VP().clientWidth / 460)); VP().scrollLeft = 0; VP().scrollTop = 0; }); toast('Novità: il canale autogestito, nella board «' + CANALE_TITLE + '»'); }
    else if (autoBid && !opened) { openBoard(autoBid); requestAnimationFrame(() => { setZoom(Math.min(1, VP().clientWidth / 460)); VP().scrollLeft = 0; VP().scrollTop = 0; }); toast('Novità: la startup gestita da agenti AI, nella board «' + AUTO_TITLE + '»'); }
    else if (foundBid && !opened) { openBoard(foundBid); requestAnimationFrame(() => { setZoom(Math.min(1, VP().clientWidth / 460)); VP().scrollLeft = 0; VP().scrollTop = 0; }); toast('Novità: la startup fondata dagli agenti, nella board «' + FOUND_TITLE + '»'); }
    else if (startBid && !opened) { openBoard(startBid); requestAnimationFrame(() => { setZoom(Math.min(1, VP().clientWidth / 460)); VP().scrollLeft = 0; VP().scrollTop = 0; }); toast('Novità: la simulazione «' + START_TITLE + '»'); }
    else if (labBid && !opened) { openBoard(labBid); requestAnimationFrame(() => { setZoom(Math.min(1, VP().clientWidth / 460)); VP().scrollLeft = 0; VP().scrollTop = 0; }); toast('Novità: il laboratorio di idee sulla lavagna, nella board «' + LAB_TITLE + '»'); }
    else if (expBid && !opened) { openBoard(expBid); requestAnimationFrame(() => { /* una colonna per volta, leggibile anche dal telefono, partendo da «Leggi prima» */ setZoom(Math.min(1, VP().clientWidth / 440)); VP().scrollLeft = 0; VP().scrollTop = 0; }); toast('Novità: l\u2019esperimento con 4 agenti, nella board «' + EXP_TITLE + '»'); }
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
          // come sul server: il compito sotto l'elemento da cui nasce (i commenti vanno a destra)
          const nx = nearEl ? nearEl.x : at?.x ?? 40, ny = nearEl ? nearEl.y + (nodes.get(nearEl.id)?.offsetHeight || 120) + 50 : at?.y ?? 40;
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
