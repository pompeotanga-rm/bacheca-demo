'use strict';
/* =====================================================================
   Bacheca — lavagna visuale locale (note, board annidate, colonne, ...)
   Tutto gira nel browser; i dati sono salvati in IndexedDB.
   ===================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const stripHtml = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent || ''; };
const fmtDate = ts => new Date(ts).toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtSize = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

const COLORS = [null, '#f9d9d5', '#fbe4c6', '#fdf3b8', '#d9f0cf', '#cdeee9', '#d3e6fb', '#dcd8f7', '#f3d6ec', '#e4e6e8', '#e8584f', '#f39a38', '#f2cd3a', '#5bb860', '#3db5a8', '#4b7bf5', '#7d5ce6', '#d9589e', '#6b7075', '#2f3337'];
const BOARD_COLORS = ['#4b7bf5', '#e8584f', '#f39a38', '#f2b92c', '#5bb860', '#3db5a8', '#7d5ce6', '#d9589e', '#6b7075', '#2f3337', '#8fb4c9', '#c98f6b'];
const DRAW_COLORS = ['#2f3337', '#e8584f', '#f39a38', '#f2cd3a', '#5bb860', '#4b7bf5', '#7d5ce6', '#ffffff'];
const REACTIONS = ['👍', '❤️', '😂', '🎉', '😮', '👀', '✅', '🔥'];
const DEFAULT_W = { note: 260, link: 260, todo: 260, board: 120, column: 290, comment: 270, heading: 380, video: 420, map: 360, audio: 300, document: 220, color: 130, sketch: 300, table: 0, image: 280, file: 260, drawing: 200 };
const RESIZABLE = new Set(['note', 'link', 'todo', 'column', 'comment', 'heading', 'video', 'map', 'audio', 'document', 'color', 'sketch', 'image', 'file', 'drawing']);
const TYPE_LABEL = { note: 'Nota', link: 'Link', todo: 'To-do', board: 'Board', column: 'Colonna', comment: 'Commento', heading: 'Titolo', video: 'Video', map: 'Mappa', audio: 'Audio', document: 'Documento', color: 'Colore', sketch: 'Schizzo', table: 'Tabella', image: 'Immagine', file: 'File', drawing: 'Disegno', line: 'Linea' };
const ME = 'Tu';

/* ---------------------------- Storage ---------------------------- */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('bacheca', 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('files'); };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode); const s = t.objectStore(store);
      const q = fn(s); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error);
    });
  },
  get(store, k) { return this.tx(store, 'readonly', s => s.get(k)); },
  put(store, k, v) { return this.tx(store, 'readwrite', s => s.put(v, k)); },
  del(store, k) { return this.tx(store, 'readwrite', s => s.delete(k)); },
  keys(store) { return this.tx(store, 'readonly', s => s.getAllKeys()); },
};
const urlCache = new Map();
async function fileURL(id) {
  if (!id) return '';
  if (urlCache.has(id)) return urlCache.get(id);
  let b = await DB.get('files', id);
  if (!b && typeof Sync !== 'undefined') b = await Sync.fetchFile(id); // lavagna condivisa: file caricato da un altro dispositivo
  if (!b) return '';
  const u = URL.createObjectURL(b); urlCache.set(id, u); return u;
}
// elimina i file che nessun elemento o board usa più (la cronologia di annullamento
// non sopravvive al ricaricamento, quindi all'avvio non possono più servire)
async function cleanupFiles() {
  try {
    const used = new Set();
    for (const e of Object.values(S.elements)) if (e.fileId) used.add(e.fileId);
    for (const b of Object.values(S.boards)) if (b.iconImg) used.add(b.iconImg);
    for (const k of await DB.keys('files')) if (!used.has(k)) await DB.del('files', k);
  } catch (e) { console.error('Pulizia dei file non riuscita', e); }
}
async function storeFile(blob) {
  const id = uid();
  try { await DB.put('files', id, blob); } catch (e) { toast('Impossibile salvare il file: lo spazio del browser potrebbe essere esaurito'); throw e; }
  if (typeof Sync !== 'undefined') Sync.uploadFile(id);
  return id;
}

/* ----------------------------- State ----------------------------- */
let S = null;          // { boards, elements, labels, seq }
let cur = 'home';
let zoom = 1;
const sel = new Set();
let saveTimer = null;
const hist = { stack: [], idx: -1 };

function freshState() {
  const now = Date.now();
  return { boards: { home: { id: 'home', title: 'Home', parent: null, color: '#2f3337', created: now } }, elements: {}, labels: {}, seq: 1 };
}
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => DB.put('kv', 'state', S).catch(e => console.error('Salvataggio non riuscito', e)), 250); } // sostituita da features.js
function commit() {
  scheduleSave();
  const snap = JSON.stringify(S);
  if (hist.stack[hist.idx] === snap) return;
  hist.stack = hist.stack.slice(0, hist.idx + 1); hist.stack.push(snap);
  if (hist.stack.length > 200) hist.stack.shift();
  hist.idx = hist.stack.length - 1; updateUndoBtns();
}
function undo() { if (hist.idx <= 0) return; blurEditing(); hist.idx--; restoreSnap(); }
function redo() { if (hist.idx >= hist.stack.length - 1) return; blurEditing(); hist.idx++; restoreSnap(); }
function restoreSnap() {
  S = JSON.parse(hist.stack[hist.idx]); scheduleSave();
  if (!S.boards[cur] || isBoardHidden(cur)) cur = 'home';
  for (const id of [...sel]) if (!S.elements[id] || S.elements[id].deleted) sel.delete(id);
  fullRender(); updateUndoBtns();
}
function updateUndoBtns() { $('#btn-undo').disabled = hist.idx <= 0; $('#btn-redo').disabled = hist.idx >= hist.stack.length - 1; }

const E = id => S.elements[id];
const nextZ = () => ++S.seq;
function boardEls(b = cur) { return Object.values(S.elements).filter(e => e.board === b && !e.deleted); }
function boardCardOf(boardId) { return Object.values(S.elements).find(e => e.type === 'board' && e.target === boardId); }
function isBoardHidden(bid) { // board whose card (or an ancestor's card) is in trash
  let b = S.boards[bid];
  while (b && b.parent) { const c = boardCardOf(b.id); if (!c || c.deleted) return true; b = S.boards[b.parent]; }
  return !b;
}
function touch(el) { el.modified = Date.now(); }

function makeEl(type, x, y, extra = {}) {
  const now = Date.now();
  const el = { id: uid(), type, board: cur, x: Math.round(x), y: Math.round(y), w: DEFAULT_W[type] || 260, z: nextZ(), col: null, color: null, rev: 1, created: now, modified: now, reactions: {}, labels: [], ...extra };
  switch (type) {
    case 'note': el.html = el.html || ''; break;
    case 'heading': el.html = el.html || ''; break;
    case 'link': el.url = el.url || ''; el.title = el.title || ''; break;
    case 'todo': el.title = el.title || ''; el.items = el.items || []; break;
    case 'board': {
      const bid = uid();
      S.boards[bid] = { id: bid, title: extra.title || 'Nuova board', parent: cur, color: '#c4c6c8', named: !!extra.title, created: now };
      el.target = bid; delete el.title; break;
    }
    case 'column': el.title = el.title ?? 'Nuova colonna'; el.items = []; el.collapsed = false; break;
    case 'comment': el.thread = []; break;
    case 'video': el.url = el.url || ''; break;
    case 'map': el.query = el.query || ''; break;
    case 'audio': break;
    case 'document': el.title = el.title || 'Nuovo documento'; el.html = el.html || ''; break;
    case 'color': el.hex = el.hex || (typeof randomColor === 'function' ? randomColor() : '#96b74a'); el.name = el.name ?? (typeof colorName === 'function' ? colorName(el.hex) : ''); break;
    case 'sketch': el.strokes = []; break;
    case 'table': el.rows = el.rows || [['', '', ''], ['', '', ''], ['', '', ''], ['', '', '']]; el.colW = el.colW || [113, 113, 112]; el.headerRow = el.headerRow ?? true; el.styles = el.styles || {}; el.rowH = el.rowH || {}; break;
    case 'image': break;
    case 'file': break;
  }
  S.elements[el.id] = el; return el;
}

/* ------------------------- Coordinates --------------------------- */
const VP = () => $('#viewport');
function toWorld(cx, cy) { const r = VP().getBoundingClientRect(); return { x: (cx - r.left + VP().scrollLeft) / zoom, y: (cy - r.top + VP().scrollTop) / zoom }; }
function toScreen(wx, wy) { const r = VP().getBoundingClientRect(); return { x: wx * zoom - VP().scrollLeft + r.left, y: wy * zoom - VP().scrollTop + r.top }; }
function viewCenter() { const r = VP().getBoundingClientRect(); return toWorld(r.left + r.width / 2, r.top + r.height / 2); }
const nodes = new Map(); // id -> DOM node
function elRect(id) {
  const n = nodes.get(id); if (!n) return null;
  const el = E(id);
  if (el && el.type !== 'line' && !n.closest('.col-body') && n.offsetWidth) return { x: el.x, y: el.y, w: n.offsetWidth, h: n.offsetHeight };
  const r = n.getBoundingClientRect(); const p = toWorld(r.left, r.top);
  return { x: p.x, y: p.y, w: r.width / zoom, h: r.height / zoom };
}

/* ---------------------------- Rendering --------------------------- */
const world = () => $('#world');

function fullRender() {
  for (const n of nodes.values()) n.remove(); nodes.clear();
  $$('.lh').forEach(n => n.remove());
  render(); renderChrome();
}

function render() {
  const els = boardEls();
  const vis = new Set(els.map(e => e.id));
  for (const [id, n] of nodes) if (!vis.has(id)) { n.remove(); nodes.delete(id); sel.delete(id); }
  // columns first so their bodies exist
  const ordered = els.sort((a, b) => (a.type === 'column' ? -1 : 0) - (b.type === 'column' ? -1 : 0));
  for (const el of ordered) ensureNode(el);
  // place
  for (const el of els) {
    if (el.type === 'line') continue;
    const n = nodes.get(el.id);
    const col = el.col && E(el.col);
    if (col && !col.deleted && col.board === el.board && col.items.includes(el.id)) continue; // placed by column
    if (el.col) el.col = null;
    if (n.parentElement !== world()) world().appendChild(n);
    n.style.left = el.x + 'px'; n.style.top = el.y + 'px';
    n.style.width = el.type === 'table' ? '' : el.w + 'px';
    n.style.zIndex = el.z;
  }
  for (const el of els) if (el.type === 'column') placeColumnChildren(el);
  for (const el of els) applyDecor(el);
  updateStageSize();
  updateLines();
  updateCtxToolbar();
}

function placeColumnChildren(col) {
  const n = nodes.get(col.id); if (!n) return;
  const body = $('.col-body', n);
  col.items = col.items.filter(id => E(id) && !E(id).deleted && E(id).board === col.board && E(id).type !== 'column' && E(id).type !== 'line');
  col.items.forEach(id => { const el = E(id); el.col = col.id; const c = nodes.get(id); if (c && c.parentElement !== body) body.appendChild(c); });
  // keep DOM order
  col.items.forEach(id => { const c = nodes.get(id); if (c) body.appendChild(c); });
  const empty = $('.col-empty', body);
  if (col.items.length === 0 && !empty) body.prepend(h('div', 'col-empty', 'Trascina qui le card'));
  if (col.items.length && empty) empty.remove();
  $('.col-count', n).textContent = col.items.length ? col.items.length + (col.items.length === 1 ? ' card' : ' card') : '';
  n.classList.toggle('collapsed', !!col.collapsed);
  $('.col-collapse', n).textContent = col.collapsed ? '▸' : '▾';
}

function applyDecor(el) {
  const n = nodes.get(el.id); if (!n || el.type === 'line') return;
  n.classList.toggle('selected', sel.has(el.id));
  if (el.color) { n.dataset.color = el.color; n.style.setProperty('--c', el.color); } else { delete n.dataset.color; n.style.removeProperty('--c'); }
  if (el.type === 'board') { const b = S.boards[el.target]; if (b) n.style.setProperty('--c', b.color); delete n.dataset.color; }
  // dark color → light text
  const dark = el.color && ['#e8584f', '#4b7bf5', '#7d5ce6', '#d9589e', '#6b7075', '#2f3337', '#3db5a8', '#5bb860'].includes(el.color);
  n.style.color = dark && !['heading', 'board'].includes(el.type) ? '#fff' : '';
  // extras: title / caption / labels / reactions / attached comment
  renderExtras(el, n);
}

function renderExtras(el, n) {
  const card = $(':scope > .card', n); if (!card) return;
  // labels
  let lb = $(':scope > .x-labels', card);
  const labels = (el.labels || []).map(id => S.labels[id]).filter(Boolean);
  if (labels.length) {
    if (!lb) { lb = h('div', 'x-labels'); card.prepend(lb); }
    lb.innerHTML = labels.map(l => `<span style="background:${l.color}">${esc(l.name)}</span>`).join('');
  } else if (lb) lb.remove();
  // title above card
  let tt = $(':scope > .x-title', n);
  if (el.cardTitle != null) {
    if (!tt) {
      tt = h('div', 'x-title editable no-drag'); tt.contentEditable = 'true'; tt.dataset.ph = 'Titolo';
      tt.addEventListener('input', () => { el.cardTitle = tt.textContent; touch(el); scheduleSave(); });
      tt.addEventListener('blur', () => { if (!tt.textContent.trim()) { el.cardTitle = null; tt.remove(); } commit(); });
      n.prepend(tt);
    }
    if (document.activeElement !== tt) tt.textContent = el.cardTitle;
  } else if (tt) tt.remove();
  // caption below
  let cp = $(':scope > .x-caption', card);
  if (el.cardCaption != null && el.type !== 'image') {
    if (!cp) {
      cp = h('div', 'x-caption editable no-drag'); cp.contentEditable = 'true'; cp.dataset.ph = 'Didascalia';
      cp.addEventListener('input', () => { el.cardCaption = cp.textContent; touch(el); scheduleSave(); });
      cp.addEventListener('blur', () => { if (!cp.textContent.trim()) { el.cardCaption = null; cp.remove(); } commit(); });
      card.appendChild(cp);
    }
    if (document.activeElement !== cp) cp.textContent = el.cardCaption;
  } else if (cp) cp.remove();
  // reactions
  let rx = $(':scope > .x-react', n);
  const rs = Object.entries(el.reactions || {}).filter(([, c]) => c > 0);
  if (rs.length) {
    if (!rx) { rx = h('div', 'x-react'); n.appendChild(rx); }
    rx.innerHTML = rs.map(([e, c]) => `<button class="no-drag" data-r="${e}">${e} ${c}</button>`).join('');
    rx.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; const r = b.dataset.r; el.reactions[r] = (el.reactions[r] || 1) - 1; if (el.reactions[r] <= 0) delete el.reactions[r]; commit(); applyDecor(el); };
  } else if (rx) rx.remove();
  // locked badge
  n.classList.toggle('locked', !!el.locked);
}

function ensureNode(el, force) {
  let n = nodes.get(el.id);
  if (el.type === 'line') {
    if (!n) { n = buildLine(el); nodes.set(el.id, n); world().appendChild(n); }
    n.style.zIndex = el.z; return n;
  }
  if (n && n.dataset.rev == el.rev && !force) return n;
  if (n && !force && n.contains(document.activeElement)) return n; // don't disrupt editing
  const fresh = h('div', `el el-${el.type}`); fresh.dataset.id = el.id; fresh.dataset.rev = el.rev;
  const card = h('div', 'card'); fresh.appendChild(card);
  BUILD[el.type]?.(el, card, fresh);
  if (RESIZABLE.has(el.type)) fresh.appendChild(h('div', 'rz'));
  if (n && n.parentNode) { n.replaceWith(fresh); } else world().appendChild(fresh);
  nodes.set(el.id, fresh);
  return fresh;
}
function rebuild(el) { el.rev++; const n = ensureNode(el, true); render(); return n; }

function updateStageSize() {
  let mx = 0, my = 0;
  for (const el of boardEls()) {
    if (el.type === 'line') { mx = Math.max(mx, el.x1, el.x2); my = Math.max(my, el.y1, el.y2); continue; }
    if (el.col) continue;
    const n = nodes.get(el.id);
    mx = Math.max(mx, el.x + (n ? n.offsetWidth : el.w)); my = Math.max(my, el.y + (n ? n.offsetHeight : 200));
  }
  const vp = VP();
  const W = Math.max(mx + 1200, vp.clientWidth / zoom + VP().scrollLeft / zoom, 3000);
  const H = Math.max(my + 900, vp.clientHeight / zoom + VP().scrollTop / zoom, 2000);
  const w = world(); w.style.width = W + 'px'; w.style.height = H + 'px'; w.style.transform = `scale(${zoom})`;
  $('#stage').style.width = W * zoom + 'px'; $('#stage').style.height = H * zoom + 'px';
}

/* ----------------------- Element builders ------------------------ */
function editableDiv(cls, html, ph, onInput) {
  const d = h('div', 'editable ' + cls); d.innerHTML = html || ''; d.dataset.ph = ph; d.contentEditable = 'false';
  d.addEventListener('input', () => onInput(d));
  return d;
}
function liveEditable(cls, text, ph, onInput, opts = {}) { // always editable (no drag from it)
  const d = h('div', 'editable no-drag ' + cls); d.contentEditable = opts.plain ? 'plaintext-only' : 'true'; d.dataset.ph = ph;
  if (opts.html) d.innerHTML = text || ''; else d.textContent = text || '';
  d.addEventListener('input', () => onInput(d));
  d.addEventListener('blur', () => commit());
  return d;
}

const BUILD = {
  note(el, card) {
    const t = editableDiv('text', el.html, 'Scrivi qualcosa…', d => { el.html = d.innerHTML; touch(el); scheduleSave(); });
    card.appendChild(t);
  },
  heading(el, card) {
    const t = editableDiv('text', el.html, 'Titolo', d => { el.html = d.innerHTML; touch(el); scheduleSave(); });
    card.appendChild(t);
  },
  link(el, card) {
    if (!el.url) return urlForm(card, 'Incolla un link', 'https://…', 'Premi Invio per aggiungere', v => {
      let u = v.trim(); if (!/^[a-z]+:\/\//i.test(u)) u = 'https://' + u;
      el.url = u; el.title = el.title || prettyHost(u); rebuild(el); commit();
    });
    let host = ''; try { host = new URL(el.url).hostname; } catch { }
    const c = h('div', 'link-card');
    c.innerHTML = `<div class="link-prev"><img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64" alt=""></div>
      <div class="link-body"><div class="link-title"></div><div class="link-url"><img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32" alt="">${esc(host)}</div></div>
      <a class="open-btn no-drag" target="_blank" rel="noopener" href="${esc(el.url)}">Apri ↗</a>`;
    const t = editableDiv('', esc(el.title), 'Titolo del link', d => { el.title = d.textContent; touch(el); scheduleSave(); });
    $('.link-title', c).appendChild(t);
    $$('img', c).forEach(i => i.onerror = () => i.style.visibility = 'hidden');
    card.appendChild(c);
  },
  todo(el, card) {
    const box = h('div', 'todo');
    const head = h('div', 'todo-head');
    head.appendChild(liveEditable('todo-title', el.title, 'Lista di cose da fare', d => { el.title = d.textContent; touch(el); scheduleSave(); }, { plain: true }));
    const prog = h('span', 'todo-prog'); head.appendChild(prog);
    box.appendChild(head);
    const bar = h('div', 'todo-bar', '<i></i>'); box.appendChild(bar);
    const upd = () => { const d = el.items.filter(i => i.done).length; prog.textContent = el.items.length ? `${d}/${el.items.length}` : ''; $('i', bar).style.width = el.items.length ? (d / el.items.length * 100) + '%' : '0'; };
    el.items.forEach((it, idx) => {
      const row = h('div', 'todo-item' + (it.done ? ' done' : ''));
      const cb = h('div', 'cb no-drag');
      cb.onclick = () => { it.done = !it.done; row.classList.toggle('done', it.done); touch(el); upd(); commit(); };
      const tx = liveEditable('', it.text, 'Elemento', d => { it.text = d.textContent; touch(el); scheduleSave(); }, { plain: true });
      tx.dataset.item = it.id;
      tx.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); const ni = { id: uid(), text: '', done: false }; el.items.splice(idx + 1, 0, ni); touch(el); const n = rebuild(el); commit(); focusEnd($(`[data-item="${ni.id}"]`, n)); }
        else if (e.key === 'Backspace' && !tx.textContent && el.items.length > 1) { e.preventDefault(); el.items.splice(idx, 1); touch(el); const n = rebuild(el); commit(); const p = el.items[Math.max(0, idx - 1)]; focusEnd($(`[data-item="${p.id}"]`, n)); }
        else if (e.key === 'ArrowUp' && idx > 0) { e.preventDefault(); focusEnd($(`[data-item="${el.items[idx - 1].id}"]`, card)); }
        else if (e.key === 'ArrowDown' && idx < el.items.length - 1) { e.preventDefault(); focusEnd($(`[data-item="${el.items[idx + 1].id}"]`, card)); }
      });
      row.append(cb, tx); box.appendChild(row);
    });
    const add = h('div', 'todo-add no-drag', '+ Aggiungi elemento');
    add.onclick = () => { const ni = { id: uid(), text: '', done: false }; el.items.push(ni); touch(el); const n = rebuild(el); commit(); focusEnd($(`[data-item="${ni.id}"]`, n)); };
    box.appendChild(add); upd(); card.appendChild(box);
  },
  board(el, card) {
    const b = S.boards[el.target] || { title: '?' };
    const icon = h('div', 'board-icon', '<i></i><i></i><i></i><i></i>');
    const name = editableDiv('board-name', esc(b.title), 'Senza titolo', d => { b.title = d.textContent; scheduleSave(); });
    name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); name.blur(); } });
    const cnt = boardEls(el.target).filter(e => e.type !== 'line').length;
    card.append(icon, name, h('div', 'board-count', cnt ? `${cnt} element${cnt === 1 ? 'o' : 'i'}` : 'Vuota'));
  },
  column(el, card) {
    const head = h('div', 'col-head');
    const col = h('button', 'col-collapse no-drag', '▾');
    col.onclick = () => { el.collapsed = !el.collapsed; commit(); placeColumnChildren(el); updateLines(); };
    head.append(col, liveEditable('col-title', el.title, 'Colonna senza titolo', d => { el.title = d.textContent; touch(el); scheduleSave(); }, { plain: true }), h('span', 'col-count'));
    card.append(head, h('div', 'col-body'));
  },
  comment(el, card) {
    const box = h('div', 'comment');
    el.thread.forEach((m, i) => {
      const c = h('div', 'cm');
      c.innerHTML = `<div class="av">${esc(m.author[0])}</div><div style="flex:1;min-width:0"><div class="meta"><b>${esc(m.author)}</b>${fmtDate(m.ts)}<button class="del no-drag">elimina</button></div><div class="body">${esc(m.text).replace(/\n/g, '<br>')}</div></div>`;
      $('.del', c).onclick = () => { el.thread.splice(i, 1); touch(el); rebuild(el); commit(); };
      box.appendChild(c);
    });
    const inp = h('div', 'cm-input');
    const ed = liveEditable('', '', el.thread.length ? 'Rispondi…' : 'Scrivi un commento…', () => { }, { plain: true });
    const send = () => { const t = ed.innerText.trim(); if (!t) return; el.thread.push({ author: ME, text: t, ts: Date.now() }); touch(el); const n = rebuild(el); commit(); $('.cm-input .editable', n)?.focus(); };
    ed.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    const b = h('button', 'no-drag', 'Invia'); b.onclick = send;
    inp.append(ed, b); box.appendChild(inp); card.appendChild(box);
  },
  video(el, card) {
    if (!el.url && !el.fileId) {
      urlForm(card, 'Link al video (YouTube, Vimeo, mp4)', 'https://youtube.com/watch?v=…', 'Invio per incorporare', v => { el.url = v.trim(); rebuild(el); commit(); });
      const p = h('div', 'pick', '<button class="no-drag">oppure carica un file video</button>');
      $('button', p).onclick = () => pickFiles('video/*', false, async f => { el.fileId = await storeFile(f[0]); el.name = f[0].name; rebuild(el); commit(); });
      card.appendChild(p); return;
    }
    card.appendChild(h('div', 'media-head', `<span>▶ ${esc(el.name || shortUrl(el.url))}</span>${el.url ? `<a class="no-drag" target="_blank" rel="noopener" href="${esc(el.url)}">Apri ↗</a>` : ''}`));
    const fr = h('div', 'media-frame');
    if (el.fileId) { const v = h('video', 'no-drag'); v.controls = true; fileURL(el.fileId).then(u => v.src = u); fr.appendChild(v); }
    else {
      const emb = embedUrl(el.url);
      if (emb.video) { const v = h('video', 'no-drag'); v.controls = true; v.src = el.url; fr.appendChild(v); }
      else { const f = h('iframe', 'no-drag'); f.src = emb.src; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true; fr.appendChild(f); }
    }
    card.appendChild(fr);
  },
  map(el, card) {
    if (!el.query) return urlForm(card, 'Cerca un luogo', 'es. Colosseo, Roma', 'Invio per mostrare la mappa', v => { el.query = v.trim(); rebuild(el); commit(); });
    card.appendChild(h('div', 'media-head', `<span>📍 ${esc(el.query)}</span><a class="no-drag" target="_blank" rel="noopener" href="https://www.google.com/maps/search/${encodeURIComponent(el.query)}">Apri ↗</a>`));
    const fr = h('div', 'media-frame map-frame');
    const f = h('iframe', 'no-drag'); f.src = `https://maps.google.com/maps?q=${encodeURIComponent(el.query)}&z=14&output=embed`; f.loading = 'lazy';
    fr.appendChild(f); card.appendChild(fr);
  },
  audio(el, card) {
    if (!el.fileId) {
      const p = h('div', 'pick', '<div style="color:#8a8f94;margin-bottom:10px">Aggiungi un file audio</div><button class="no-drag">Scegli file…</button>');
      $('button', p).onclick = () => pickFiles('audio/*', false, async f => { el.fileId = await storeFile(f[0]); el.name = f[0].name; rebuild(el); commit(); });
      card.appendChild(p); return;
    }
    const c = h('div', 'audio-card', `<div class="an"><i><svg viewBox="0 0 24 24" width="16" height="16" style="stroke:#fff"><path d="M7 10v4M10 8v8M13 10v4M16 9v6"/></svg></i><span></span></div>`);
    $('.an span', c).textContent = el.name || 'Audio';
    const a = h('audio', 'no-drag'); a.controls = true; fileURL(el.fileId).then(u => a.src = u);
    c.appendChild(a); card.appendChild(c);
  },
  document(el, card) {
    const c = h('div', 'doc-card', `<div class="dt"></div><div class="dp"></div><div class="dico">DOC</div>`);
    $('.dt', c).textContent = el.title || 'Documento senza titolo';
    $('.dp', c).textContent = stripHtml(el.html).slice(0, 400);
    card.appendChild(c);
  },
  color(el, card) {
    const sw = h('div', 'swatch no-drag'); sw.style.setProperty('--sw', el.hex);
    const inp = h('input'); inp.type = 'color'; inp.value = el.hex; inp.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0';
    sw.onclick = () => inp.click();
    inp.oninput = () => { el.hex = inp.value; sw.style.setProperty('--sw', el.hex); hx.textContent = el.hex; touch(el); scheduleSave(); };
    inp.onchange = () => commit();
    const hx = liveEditable('swatch-hex', el.hex, '#000000', d => { const v = d.textContent.trim(); if (/^#?[0-9a-f]{6}$/i.test(v)) { el.hex = v.startsWith('#') ? v : '#' + v; sw.style.setProperty('--sw', el.hex); inp.value = el.hex; touch(el); scheduleSave(); } }, { plain: true });
    hx.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); hx.blur(); } });
    card.append(sw, inp, hx);
  },
  sketch(el, card) {
    const c = h('div', 'sketch-card');
    c.innerHTML = strokesSVG(el.strokes, 800, 500) + (el.strokes.length ? '' : '<div style="position:absolute;inset:0;display:grid;place-items:center;color:#b3b7bb;font-size:12px">Fai clic per disegnare</div>');
    c.style.position = 'relative';
    card.appendChild(c);
  },
  drawing(el, card) {
    const c = h('div', 'drawing'); c.innerHTML = strokesSVG(el.strokes, el.vw, el.vh); card.appendChild(c);
  },
  image(el, card) {
    if (!el.fileId) {
      const p = h('div', 'pick', '<div style="color:#8a8f94;margin-bottom:10px">Aggiungi un\'immagine</div><button class="no-drag">Scegli file…</button>');
      $('button', p).onclick = () => pickFiles('image/*', false, async f => { el.fileId = await storeFile(f[0]); el.name = f[0].name; rebuild(el); commit(); });
      card.appendChild(p); return;
    }
    const img = h('img'); img.alt = el.name || ''; img.draggable = false; fileURL(el.fileId).then(u => { img.src = u; img.onload = () => { updateLines(); updateStageSize(); }; });
    card.appendChild(img);
    if (el.caption != null || true) {
      const cap = editableDiv('caption', esc(el.caption || ''), 'Aggiungi una didascalia', d => { el.caption = d.textContent; touch(el); scheduleSave(); });
      card.appendChild(cap);
    }
  },
  file(el, card) {
    if (!el.fileId) {
      const p = h('div', 'pick', '<div style="color:#8a8f94;margin-bottom:10px">Carica un file</div><button class="no-drag">Scegli file…</button>');
      $('button', p).onclick = () => pickFiles('', false, async f => { Object.assign(el, { fileId: await storeFile(f[0]), name: f[0].name, size: f[0].size, mime: f[0].type }); rebuild(el); commit(); });
      card.appendChild(p); return;
    }
    const ext = (el.name.split('.').pop() || 'file').slice(0, 4);
    const c = h('div', 'file-card', `<div class="file-ico">${esc(ext)}</div><div class="file-info"><div class="file-name"></div><div class="file-size">${fmtSize(el.size || 0)}</div></div><button class="file-dl no-drag">Scarica</button>`);
    $('.file-name', c).textContent = el.name;
    const hue = [...ext].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360; $('.file-ico', c).style.background = `hsl(${hue} 60% 52%)`;
    $('.file-dl', c).onclick = () => downloadFile(el);
    card.appendChild(c);
  },
};

function urlForm(card, label, ph, hint, onSubmit) {
  const f = h('div', 'url-form', `<label>${esc(label)}</label><input class="no-drag" placeholder="${esc(ph)}"><div class="hint">${esc(hint)}</div>`);
  const i = $('input', f);
  i.addEventListener('keydown', e => { if (e.key === 'Enter' && i.value.trim()) { e.preventDefault(); onSubmit(i.value); } if (e.key === 'Escape') i.blur(); e.stopPropagation(); });
  card.appendChild(f);
  requestAnimationFrame(() => { if (document.activeElement === document.body) i.focus(); });
}
function prettyHost(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } }
function shortUrl(u) { return prettyHost(u); }
function embedUrl(u) {
  let m;
  if ((m = u.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{6,})/))) return { src: `https://www.youtube.com/embed/${m[1]}` };
  if ((m = u.match(/vimeo\.com\/(\d+)/))) return { src: `https://player.vimeo.com/video/${m[1]}` };
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(u)) return { video: true };
  return { src: u };
}
function focusEnd(n) { if (!n) return; n.focus(); const r = document.createRange(); r.selectNodeContents(n); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
function pickFiles(accept, multiple, cb) {
  const i = $('#file-input'); i.accept = accept; i.multiple = multiple; i.value = '';
  i.onchange = () => { if (i.files.length) cb([...i.files]); }; i.click();
}
async function downloadFile(el) {
  const u = await fileURL(el.fileId); if (!u) return toast('File non trovato');
  const a = h('a'); a.href = u; a.download = el.name || 'file'; document.body.appendChild(a); a.click(); a.remove();
}
function strokePath(pts) {
  if (!pts.length) return '';
  if (pts.length < 3) return `M${pts[0][0]} ${pts[0][1]} L${pts[pts.length - 1][0] + .1} ${pts[pts.length - 1][1] + .1}`;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; d += ` Q${pts[i][0]} ${pts[i][1]} ${mx.toFixed(1)} ${my.toFixed(1)}`; }
  const l = pts[pts.length - 1]; return d + ` L${l[0]} ${l[1]}`;
}
function strokesSVG(strokes, vw, vh) {
  return `<svg viewBox="0 0 ${vw} ${vh}" style="stroke-linecap:round;stroke-linejoin:round">${strokes.map(s => `<path d="${strokePath(s.pts)}" stroke="${s.c}" stroke-width="${s.w}" fill="none"/>`).join('')}</svg>`;
}

/* ------------------------------ Lines ----------------------------- */
function buildLine(el) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('class', 'line-svg'); svg.dataset.id = el.id;
  svg.innerHTML = `<defs><marker id="ae-${el.id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><path class="vis"/><path class="hit"/>`;
  return svg;
}
function anchorPoint(id, toward) {
  const r = elRect(id); if (!r) return null;
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const dx = toward.x - cx, dy = toward.y - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const pad = 6;
  const sx = (r.w / 2 + pad) / Math.abs(dx || 1e-9), sy = (r.h / 2 + pad) / Math.abs(dy || 1e-9);
  const s = Math.min(sx, sy, 1);
  return { x: cx + dx * s, y: cy + dy * s };
}
function lineEnds(el) {
  const av = el.a && E(el.a) && !E(el.a).deleted && nodes.has(el.a), bv = el.b && E(el.b) && !E(el.b).deleted && nodes.has(el.b);
  let p1 = { x: el.x1, y: el.y1 }, p2 = { x: el.x2, y: el.y2 };
  const ca = av ? centerOf(el.a) : p1, cb = bv ? centerOf(el.b) : p2;
  const mid = { x: (ca.x + cb.x) / 2 + (el.bx || 0), y: (ca.y + cb.y) / 2 + (el.by || 0) };
  if (av) p1 = anchorPoint(el.a, el.bx || el.by ? mid : cb) || p1;
  if (bv) p2 = anchorPoint(el.b, el.bx || el.by ? mid : ca) || p2;
  el.x1 = Math.round(p1.x); el.y1 = Math.round(p1.y); el.x2 = Math.round(p2.x); el.y2 = Math.round(p2.y);
  const m = { x: (p1.x + p2.x) / 2 + (el.bx || 0), y: (p1.y + p2.y) / 2 + (el.by || 0) };
  const ctrl = { x: 2 * m.x - (p1.x + p2.x) / 2, y: 2 * m.y - (p1.y + p2.y) / 2 };
  return { p1, p2, m, ctrl };
}
function centerOf(id) { const r = elRect(id); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
function updateLines() {
  $$('.lh').forEach(n => n.remove());
  for (const el of boardEls()) {
    if (el.type !== 'line') continue;
    const svg = nodes.get(el.id); if (!svg) continue;
    const { p1, p2, m, ctrl } = lineEnds(el);
    const d = `M${p1.x} ${p1.y} Q${ctrl.x} ${ctrl.y} ${p2.x} ${p2.y}`;
    const vis = $('.vis', svg), hit = $('.hit', svg);
    vis.setAttribute('d', d); hit.setAttribute('d', d);
    const col = el.color || '#5d6267';
    vis.setAttribute('stroke', col); vis.setAttribute('stroke-width', el.width || 2);
    vis.setAttribute('stroke-dasharray', el.dash ? `${(el.width || 2) * 3} ${(el.width || 2) * 2.5}` : '');
    $('.ah', svg).setAttribute('fill', col);
    vis.setAttribute('marker-end', el.arrowEnd !== false ? `url(#ae-${el.id})` : '');
    vis.setAttribute('marker-start', el.arrowStart ? `url(#ae-${el.id})` : '');
    svg.classList.toggle('selected', sel.has(el.id));
    if (sel.has(el.id) && sel.size === 1) {
      for (const [k, p] of [['p1', p1], ['p2', p2], ['mid', m]]) {
        const hd = h('div', 'lh' + (k === 'mid' ? ' mid' : '')); hd.dataset.line = el.id; hd.dataset.k = k;
        hd.style.left = p.x + 'px'; hd.style.top = p.y + 'px'; world().appendChild(hd);
      }
    }
  }
}

/* ------------------------- Chrome (header) ------------------------ */
function renderChrome() {
  const b = S.boards[cur];
  const chain = []; let x = b; while (x) { chain.unshift(x); x = S.boards[x.parent]; }
  const cr = $('#crumbs'); cr.innerHTML = '';
  chain.forEach((bb, i) => {
    if (i) cr.appendChild(h('span', 'crumb-sep', '/'));
    const c = h('div', 'crumb' + (i === chain.length - 1 && chain.length > 1 ? ' current' : ''));
    c.innerHTML = bb.id === 'home' ? `<span class="logo">B</span><span>Home</span>` : `<span class="sq" style="background:${bb.color}"></span><span></span>`;
    if (bb.id !== 'home') c.lastChild.textContent = bb.title || 'Senza titolo';
    c.onclick = () => openBoard(bb.id);
    cr.appendChild(c);
  });
  const t = $('#board-title');
  if (document.activeElement !== t) t.textContent = b.title || 'Senza titolo';
  t.contentEditable = b.id === 'home' ? 'false' : 'true';
  document.title = (b.title || 'Senza titolo') + ' – Bacheca';
  updateUndoBtns();
}

function openBoard(id, focusId) {
  if (!S.boards[id] || isBoardHidden(id)) id = 'home';
  blurEditing(); hidePopups();
  if (S.boards[cur]) S.boards[cur].scroll = { x: VP().scrollLeft, y: VP().scrollTop, z: zoom }; // dopo un import o "Cancella tutto" la board corrente può non esistere più
  cur = id; sel.clear();
  if (location.hash !== '#/' + id) history.pushState(null, '', '#/' + id);
  const sc = S.boards[id].scroll; zoom = sc?.z || 1; $('#zoom-val').textContent = Math.round(zoom * 100) + '%';
  fullRender();
  VP().scrollLeft = sc?.x || 0; VP().scrollTop = sc?.y || 0;
  if (focusId) focusElement(focusId);
  scheduleSave();
}
function focusElement(id) {
  const el = E(id); if (!el) return;
  sel.clear(); sel.add(el.type === 'line' ? id : (el.col && E(el.col) ? el.col : id)); sel.add(id); render();
  const r = elRect(id); if (!r) return;
  VP().scrollTo({ left: (r.x + r.w / 2) * zoom - VP().clientWidth / 2, top: (r.y + r.h / 2) * zoom - VP().clientHeight / 2, behavior: 'smooth' });
  const n = nodes.get(id); n?.classList.add('flash'); setTimeout(() => n?.classList.remove('flash'), 2500);
}

/* ---------------------------- Editing ----------------------------- */
let editing = null; // {id, node}
function enterEdit(el, ev) {
  const n = nodes.get(el.id); if (!n) return;
  let ed = null;
  if (el.type === 'note' || el.type === 'heading') ed = $('.text', n);
  else if (el.type === 'link') ed = $('.link-title .editable', n);
  else if (el.type === 'board') ed = $('.board-name', n);
  else if (el.type === 'image') ed = $('.caption', n);
  if (!ed) return false;
  blurEditing();
  ed.contentEditable = 'true'; ed.focus();
  editing = { id: el.id, ed };
  if (ev && ed.textContent) {
    const r = document.caretRangeFromPoint?.(ev.clientX, ev.clientY);
    const s = getSelection(); s.removeAllRanges();
    if (r && ed.contains(r.startContainer)) s.addRange(r); else { const rr = document.createRange(); rr.selectNodeContents(ed); rr.collapse(false); s.addRange(rr); }
  } else focusEnd(ed);
  if (el.type === 'board') { const rr = document.createRange(); rr.selectNodeContents(ed); getSelection().removeAllRanges(); getSelection().addRange(rr); }
  ed.addEventListener('blur', onEditBlur, { once: true });
  if (el.type === 'note' || el.type === 'heading') showFormatBar(ed);
  return true;
}
function onEditBlur() {
  if (!editing) return;
  const { id, ed } = editing; editing = null;
  ed.contentEditable = 'false';
  hideFormatBar();
  const el = E(id);
  if (!el) return;
  if ((el.type === 'note' || el.type === 'heading') && !stripHtml(el.html).trim() && !/<img/.test(el.html || '')) {
    // empty note → removed (like the original)
    removeElements([id], true); return;
  }
  if (el.type === 'board') { const b = S.boards[el.target]; b.title = ed.textContent.trim() || 'Senza titolo'; ed.textContent = b.title; renderChrome(); }
  if (el.type === 'image') { el.caption = ed.textContent; }
  commit();
}
function blurEditing() {
  const a = document.activeElement;
  if (a && a !== document.body && (a.isContentEditable || a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) a.blur();
}
function isTyping() { const a = document.activeElement; return a && (a.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName)); }

/* ---------------------------- Format bar -------------------------- */
const FMT = [
  ['B', 'bold', '<b>B</b>', 'Grassetto ⌘B'], ['I', 'italic', '<i>I</i>', 'Corsivo ⌘I'], ['U', 'underline', '<u>U</u>', 'Sottolineato ⌘U'], ['S', 'strikeThrough', '<s>S</s>', 'Barrato ⇧⌘X'],
  ['|'], ['H1', 'h1', 'H1', 'Titolo grande'], ['H2', 'h2', 'H2', 'Titolo piccolo'], ['P', 'p', '¶', 'Testo normale'],
  ['|'], ['UL', 'insertUnorderedList', '•≡', 'Elenco puntato'], ['OL', 'insertOrderedList', '1≡', 'Elenco numerato'], ['Q', 'blockquote', '❝', 'Citazione'], ['C', 'code', '&lt;/&gt;', 'Codice'],
  ['|'], ['HL', 'mark', '<span style="background:#fff1a8;color:#2f3337;padding:0 3px;border-radius:2px">A</span>', 'Evidenzia'], ['L', 'link', '🔗', 'Link ⌘K'], ['X', 'removeFormat', 'Tx', 'Rimuovi formattazione'],
];
function execFmt(cmd) {
  switch (cmd) {
    case 'h1': case 'h2': case 'p': case 'blockquote': document.execCommand('formatBlock', false, cmd); break;
    case 'code': document.execCommand('formatBlock', false, 'pre'); break;
    case 'mark': document.execCommand('hiliteColor', false, '#fff1a8'); break;
    case 'link': { const u = promptInline('URL del link', 'https://'); if (u) document.execCommand('createLink', false, /^[a-z]+:/i.test(u) ? u : 'https://' + u); break; }
    default: document.execCommand(cmd);
  }
  const a = document.activeElement; a?.dispatchEvent(new Event('input'));
}
function promptInline(label, def) { return window.prompt(label, def); } // only used for links in rich text
function buildFormatBar(container, target) {
  container.innerHTML = '';
  FMT.forEach(f => {
    if (f[0] === '|') return container.appendChild(h('span', 'fsep'));
    const b = h('button', '', f[2]); b.title = f[3];
    b.addEventListener('mousedown', e => { e.preventDefault(); target?.focus(); execFmt(f[1]); });
    container.appendChild(b);
  });
}
function showFormatBar(ed) {
  const fb = $('#formatbar'); buildFormatBar(fb, ed); fb.classList.remove('hidden'); positionFormatBar();
}
function positionFormatBar() {
  if (!editing) return; const fb = $('#formatbar');
  const r = nodes.get(editing.id)?.getBoundingClientRect(); if (!r) return;
  fb.style.left = clamp(r.left, 75, innerWidth - fb.offsetWidth - 10) + 'px';
  fb.style.top = Math.max(84, r.top - fb.offsetHeight - 8) + 'px';
}
function hideFormatBar() { $('#formatbar').classList.add('hidden'); }

/* ------------------------ Add / remove ---------------------------- */
function addElement(type, at, opts = {}) {
  blurEditing(); hidePopups();
  if (type === 'draw') return toggleDraw();
  if (type === 'image' && !opts.noPick) return pickFiles('image/*', true, fs => addFiles(fs, at || nextSpot()));
  if (type === 'file' && !opts.noPick) return pickFiles('', true, fs => addFiles(fs, at || nextSpot()));
  const p = at || nextSpot();
  let el;
  if (type === 'line') {
    el = makeEl('line', p.x, p.y, { x1: p.x, y1: p.y, x2: p.x + 180, y2: p.y, a: null, b: null, bx: 0, by: 0, arrowEnd: true, width: 2 });
  } else el = makeEl(type, p.x, p.y, opts.extra);
  sel.clear(); sel.add(el.id); render();
  if (opts.intoCol) { insertIntoColumn([el.id], opts.intoCol.col, opts.intoCol.idx); render(); }
  commit();
  const n = nodes.get(el.id);
  if (type === 'note' || type === 'heading') enterEdit(el);
  else if (type === 'todo') $('.todo-item .editable', n)?.focus();
  else if (type === 'column') { const t = $('.col-title', n); if (t) { t.focus(); const r = document.createRange(); r.selectNodeContents(t); getSelection().removeAllRanges(); getSelection().addRange(r); } }
  else if (type === 'comment') $('.cm-form .editable', n)?.focus();
  else if (['link', 'video', 'map'].includes(type)) $('input', n)?.focus();
  else if (type === 'document' || type === 'board') enterEdit(el);
  else if (type === 'table') tEnter(el.id, 0, 0);
  return el;
}
let spotOffset = 0;
function nextSpot() {
  const c = viewCenter(); spotOffset = (spotOffset + 1) % 8;
  return { x: Math.max(20, c.x - 130 + spotOffset * 24), y: Math.max(20, c.y - 80 + spotOffset * 24) };
}
async function addFiles(files, at) {
  let { x, y } = at; const ids = [];
  for (const f of files) {
    if (/\.(csv|tsv|xlsx)$/i.test(f.name)) {
      try { const rows = await fileToTable(f); if (rows && rows.length) { const el = makeEl('table', x, y, { rows, colW: Array(rows[0].length).fill(120), headerRow: true, cardTitle: f.name.replace(/\.[^.]+$/, '') }); ids.push(el.id); x += 30; y += 30; continue; } }
      catch (err) { toast('Impossibile leggere ' + f.name + ' come tabella: lo aggiungo come file'); }
    }
    const fileId = await storeFile(f);
    let type = 'file';
    if (f.type.startsWith('image/')) type = 'image'; else if (f.type.startsWith('audio/')) type = 'audio'; else if (f.type.startsWith('video/')) type = 'video';
    const el = makeEl(type, x, y, { fileId, name: f.name, size: f.size, mime: f.type });
    ids.push(el.id); x += 30; y += 30;
  }
  sel.clear(); ids.forEach(i => sel.add(i)); render(); commit();
}
function removeElements(ids, hard) {
  const all = new Set();
  for (const id of ids) { const el = E(id); if (!el) continue; all.add(id); }
  for (const id of all) {
    const el = E(id); if (!el) continue;
    if (el.locked && !hard) continue;
    if (el.col && E(el.col)) { const c = E(el.col); c.items = c.items.filter(x => x !== id); }
    if (el.type === 'column') {
      // children leave the column with it (go to trash together)
      el.items.forEach(cid => { const c = E(cid); if (c && !c.deleted) { c.deleted = true; c.deletedAt = Date.now(); c.trashParent = id; } });
    }
    if (hard) { delete S.elements[id]; }
    else { el.deleted = true; el.deletedAt = Date.now(); }
    sel.delete(id);
  }
  // lines attached to removed elements become free
  for (const l of Object.values(S.elements)) if (l.type === 'line') { if (all.has(l.a)) l.a = null; if (all.has(l.b)) l.b = null; }
  render(); commit(); updateTrashBadge();
  if (!hard && all.size) toast(`${all.size} element${all.size > 1 ? 'i spostati' : 'o spostato'} nel cestino`, 'Annulla', undo);
}
function restoreElement(id) {
  const el = E(id); if (!el) return;
  el.deleted = false; delete el.deletedAt;
  if (el.col) { const c = E(el.col); if (!c || c.deleted) el.col = null; else if (!c.items.includes(id)) c.items.push(id); }
  if (el.type === 'column') for (const c of Object.values(S.elements)) if (c.trashParent === id) { c.deleted = false; delete c.trashParent; }
  if (!S.boards[el.board]) el.board = 'home';
  commit(); render(); updateTrashBadge();
}
function purgeElement(id) {
  const el = E(id); if (!el) return;
  const kill = [id];
  if (el.type === 'column') for (const c of Object.values(S.elements)) if (c.trashParent === id) kill.push(c.id);
  if (el.type === 'board') { // remove whole sub tree
    const stack = [el.target];
    while (stack.length) { const b = stack.pop(); for (const e of Object.values(S.elements)) if (e.board === b) { kill.push(e.id); if (e.type === 'board') stack.push(e.target); } delete S.boards[b]; }
  }
  // i file NON si cancellano qui: con ⌘Z l'elemento può tornare e deve ritrovare il suo file.
  // I file non più usati da nessun elemento vengono eliminati al prossimo avvio (cleanupFiles).
  for (const k of kill) delete S.elements[k];
  commit(); updateTrashBadge();
}
function duplicate(ids, offset = 24) {
  const map = {}; const out = [];
  const copyOne = (src, board) => {
    const c = JSON.parse(JSON.stringify(src)); c.id = uid(); c.z = nextZ(); c.created = c.modified = Date.now(); c.board = board; map[src.id] = c.id;
    if (c.type === 'board') { // deep copy of board tree
      const ob = S.boards[src.target]; const nb = { ...JSON.parse(JSON.stringify(ob)), id: uid(), parent: board, title: ob.title + (board === src.board ? ' (copia)' : '') };
      S.boards[nb.id] = nb; c.target = nb.id;
      const kids = Object.values(S.elements).filter(e => e.board === ob.id && !e.deleted);
      const sub = {}; kids.forEach(k => { const kc = copyOne(k, nb.id); sub[k.id] = kc.id; });
      kids.forEach(k => { const kc = E(sub[k.id]); if (kc.type === 'column') kc.items = k.items.map(i => sub[i]).filter(Boolean); if (kc.col) kc.col = sub[k.col] || null; if (kc.type === 'line') { kc.a = sub[k.a] || null; kc.b = sub[k.b] || null; } });
    }
    S.elements[c.id] = c; return c;
  };
  const list = ids.map(E).filter(Boolean);
  const colsSel = new Set(list.filter(e => e.type === 'column').map(e => e.id));
  for (const src of list) {
    if (src.col && colsSel.has(src.col)) continue; // copied with column
    const c = copyOne(src, cur);
    if (c.type === 'column') { c.items = src.items.map(i => { const k = copyOne(E(i), cur); k.col = c.id; return k.id; }); }
    if (c.col) { // stays in same column, right after source
      const col = E(c.col); if (col) col.items.splice(col.items.indexOf(src.id) + 1, 0, c.id);
    } else { c.x += offset; c.y += offset; }
    if (c.type === 'line') { c.x1 += offset; c.y1 += offset; c.x2 += offset; c.y2 += offset; c.a = map[src.a] || null; c.b = map[src.b] || null; }
    out.push(c.id);
  }
  // fix lines that were copied before their endpoints
  for (const id of out) { const c = E(id); if (c.type === 'line') { const s = list.find(l => map[l.id] === id); if (s) { c.a = map[s.a] || null; c.b = map[s.b] || null; } } }
  sel.clear(); out.forEach(i => sel.add(i)); render(); commit();
  return out;
}

/* ------------------------- Clipboard ------------------------------ */
let clip = null;
function copySel(cut) {
  if (!sel.size) return false;
  const ids = [...sel]; const els = [];
  const addDeep = id => { const e = E(id); if (!e) return; els.push(JSON.parse(JSON.stringify(e))); if (e.type === 'column') e.items.forEach(addDeep); };
  ids.forEach(id => { if (!els.find(x => x.id === id)) addDeep(id); });
  clip = { ids, els };
  const text = els.map(elText).filter(Boolean).join('\n\n');
  navigator.clipboard?.writeText('⁣BACHECA⁣' + text).catch(() => { });
  if (cut) removeElements(ids);
  return true;
}
function pasteClip() {
  if (!clip) return;
  // re-insert source copies even if originals were deleted
  const temp = []; const idmap = {};
  clip.els.forEach(e => { if (!S.elements[e.id] || S.elements[e.id].deleted) { const c = JSON.parse(JSON.stringify(e)); c.deleted = false; S.elements[c.id] = c; temp.push(c.id); } });
  const out = duplicate(clip.ids.filter(id => E(id)), 30);
  // temp originals were only scaffolding → drop them if they were cut
  temp.forEach(id => { const e = E(id); if (e) { e.deleted = true; e.deletedAt = e.deletedAt || Date.now(); } });
  out.forEach(id => { const e = E(id); e.board = cur; if (e.col && (!E(e.col) || E(e.col).deleted || E(e.col).board !== cur)) e.col = null; });
  render(); commit(); void idmap;
}
function elText(e) {
  switch (e.type) {
    case 'note': case 'heading': return stripHtml(e.html);
    case 'link': return e.url;
    case 'todo': return [e.title, ...e.items.map(i => (i.done ? '[x] ' : '[ ] ') + i.text)].filter(Boolean).join('\n');
    case 'board': return S.boards[e.target]?.title;
    case 'column': return e.title;
    case 'comment': return e.thread.map(m => m.author + ': ' + m.text).join('\n');
    case 'document': return e.title + '\n' + stripHtml(e.html);
    case 'table': return e.rows.map(r => r.join('\t')).join('\n');
    case 'color': return e.hex;
    case 'map': return e.query;
    case 'video': return e.url || e.name;
    default: return e.name || '';
  }
}

/* ---------------------------- Pointer ----------------------------- */
let drag = null;
const DRAG_THRESHOLD = 4;

function onPointerDown(ev) {
  if (ev.button === 2) return;
  hidePopups(true);
  if (drawState) return drawDown(ev);
  const t = ev.target;
  // line handles
  if (t.classList.contains('lh')) { ev.preventDefault(); return startLineHandle(ev, t.dataset.line, t.dataset.k); }
  // resize
  if (t.classList.contains('rz')) { ev.preventDefault(); return startResize(ev, t.closest('.el').dataset.id); }
  const tnode = t.closest('.el-table');
  if (tnode && !t.closest('.tbl-grip, .rz, .tbl-add') && (TBL.active(tnode.dataset.id) || (sel.size === 1 && sel.has(tnode.dataset.id) && t.closest('.tbl-wrap, .tbl-colhdr, .tbl-rowhdr')))) {
    if (tPointerDown(ev, tnode.dataset.id)) return;
  }
  if (TBL.st && (!tnode || tnode.dataset.id !== TBL.st.id)) tExit();
  const lineSvg = t.closest('.line-svg');
  const node = lineSvg || t.closest('.el');
  if (node) {
    const id = node.dataset.id; const el = E(id);
    if (!el) return;
    const interactive = t.closest('.no-drag, input, textarea, button, a, audio, video, iframe, select, [contenteditable="true"], [contenteditable="plaintext-only"]');
    if (interactive) { if (!sel.has(id) || sel.size > 1) { sel.clear(); sel.add(id); refreshSel(); } return; }
    ev.preventDefault();
    if (editing && editing.id !== id) blurEditing();
    if (editing && editing.id === id) return;
    blurEditing();
    let wasSelected = sel.has(id);
    if (ev.shiftKey || ev.metaKey) { if (sel.has(id)) sel.delete(id); else sel.add(id); refreshSel(); if (!sel.has(id)) return; }
    else if (!sel.has(id)) { sel.clear(); sel.add(id); refreshSel(); }
    const p = toWorld(ev.clientX, ev.clientY);
    drag = { kind: 'pending', id, start: p, cx: ev.clientX, cy: ev.clientY, wasSelected, ev };
    return;
  }
  // empty canvas
  if (!t.closest('#world') && t !== VP() && !t.closest('#stage')) return;
  blurEditing();
  if (!ev.shiftKey) { sel.clear(); refreshSel(); }
  if (ev.pointerType === 'touch') return; // let the browser pan the canvas with a finger
  const p = toWorld(ev.clientX, ev.clientY);
  if (ev.button === 1 || spaceDown) { drag = { kind: 'pan', cx: ev.clientX, cy: ev.clientY, sl: VP().scrollLeft, st: VP().scrollTop }; ev.preventDefault(); return; }
  drag = { kind: 'marquee', start: p, base: new Set(sel) };
  ev.preventDefault();
}

function onPointerMove(ev) {
  if (drawState) return drawMove(ev);
  if (toolDrag) return toolDragMove(ev);
  if (!drag) return;
  const p = toWorld(ev.clientX, ev.clientY);
  if (drag.kind === 'pending') {
    if (Math.hypot(ev.clientX - drag.cx, ev.clientY - drag.cy) < DRAG_THRESHOLD) return;
    beginMove(); return;
  }
  if (drag.kind === 'move') return moveSel(ev, p);
  if (drag.kind === 'marquee') return marqueeMove(p);
  if (drag.kind === 'pan') { VP().scrollLeft = drag.sl - (ev.clientX - drag.cx); VP().scrollTop = drag.st - (ev.clientY - drag.cy); return; }
  if (drag.kind === 'resize') return resizeMove(p);
  if (drag.kind[0] === 't' && drag.kind !== 'tool') return tPointerMove(ev);
  if (drag.kind === 'lineh') return lineHandleMove(ev, p);
}

function onPointerUp(ev) {
  if (drawState) return drawUp(ev);
  if (toolDrag) return toolDragEnd(ev);
  if (!drag) return;
  const d = drag; drag = null;
  document.body.classList.remove('dragging');
  if (d.kind === 'pending') return clickElement(d.id, d.ev, d.wasSelected);
  if (d.kind === 'move') return endMove(ev);
  if (d.kind === 'marquee') { $('#marquee')?.remove(); updateCtxToolbar(); return; }
  if (d.kind === 'resize') { commit(); updateStageSize(); return; }
  if (d.kind === 'lineh') return lineHandleEnd();
}

function clickElement(id, ev, wasSelected) {
  const el = E(id); if (!el) return;
  if (ev.shiftKey || ev.metaKey) return;
  switch (el.type) {
    case 'board': if (ev.target.closest('.board-name') && wasSelected) enterEdit(el, ev); else openBoard(el.target); break;
    case 'note': case 'heading': enterEdit(el, ev); break;
    case 'link': if (wasSelected && ev.target.closest('.link-title')) enterEdit(el, ev); break;
    case 'document': openDocument(el); break;
    case 'sketch': openSketch(el); break;
    case 'table': if (wasSelected) { const td = ev.target.closest('td'); if (td) { tEnter(el.id, +td.dataset.r, +td.dataset.c); if (ev.detail >= 2) tStartEdit(); } } break;
    case 'image': if (ev.target.closest('.caption') || (wasSelected && ev.detail >= 1 && ev.target.closest('.card') && !ev.target.closest('img'))) enterEdit(el, ev); break;
  }
}

function beginMove() {
  const ids = [...sel].filter(id => E(id) && !E(id).locked);
  if (!ids.length) { drag = null; return; }
  document.body.classList.add('dragging');
  // take children out of columns (keep visual position), skip children whose column is also dragged
  const draggedCols = new Set(ids.filter(id => E(id).type === 'column'));
  const moving = ids.filter(id => !(E(id).col && draggedCols.has(E(id).col)));
  for (const id of moving) {
    const el = E(id);
    if (el.col) {
      const r = elRect(id); const col = E(el.col);
      if (col) col.items = col.items.filter(x => x !== id);
      el.col = null; el.x = Math.round(r.x); el.y = Math.round(r.y); el.w = Math.max(el.w || 0, Math.round(r.w)); if (el.type === 'board') el.w = DEFAULT_W.board;
    }
    if (el.type !== 'line') el.z = nextZ();
  }
  render();
  const orig = {};
  for (const id of moving) { const e = E(id); orig[id] = e.type === 'line' ? { x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2 } : { x: e.x, y: e.y }; nodes.get(id)?.classList.add('dragging-el'); }
  drag = { kind: 'move', ids: moving, orig, start: drag.start, dropCol: null, overTrash: false };
}
function moveSel(ev, p) {
  const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
  for (const id of drag.ids) {
    const e = E(id), o = drag.orig[id];
    if (e.type === 'line') { if (!e.a) { e.x1 = o.x1 + dx; e.y1 = o.y1 + dy; } if (!e.b) { e.x2 = o.x2 + dx; e.y2 = o.y2 + dy; } continue; }
    e.x = Math.round(Math.max(0, o.x + dx)); e.y = Math.round(Math.max(0, o.y + dy));
    const n = nodes.get(id); n.style.left = e.x + 'px'; n.style.top = e.y + 'px';
  }
  updateLines();
  // auto scroll near edges
  autoScroll(ev);
  // trash hover
  const tr = $('#tool-trash').getBoundingClientRect();
  drag.overTrash = ev.clientX >= tr.left && ev.clientX <= tr.right && ev.clientY >= tr.top && ev.clientY <= tr.bottom;
  $('#tool-trash').classList.toggle('hot', drag.overTrash);
  // column drop target
  const canColumn = drag.ids.every(id => !['column', 'line'].includes(E(id).type));
  $$('.col-ph').forEach(x => x.remove()); $$('.el-column.drop-target').forEach(x => x.classList.remove('drop-target'));
  drag.dropCol = null;
  if (canColumn) {
    const target = columnAt(ev.clientX, ev.clientY, drag.ids);
    if (target) {
      drag.dropCol = target;
      const n = nodes.get(target.col); n.classList.add('drop-target');
      const body = $('.col-body', n); const kids = $$(':scope > .el', body);
      const ph = h('div', 'col-ph');
      if (target.idx >= kids.length) body.appendChild(ph); else body.insertBefore(ph, kids[target.idx]);
    }
  }
}
function columnAt(cx, cy, exclude = []) {
  const cols = boardEls().filter(e => e.type === 'column' && !exclude.includes(e.id) && !e.collapsed).sort((a, b) => b.z - a.z);
  for (const c of cols) {
    const n = nodes.get(c.id); const r = n.getBoundingClientRect();
    if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom + 20) {
      const kids = $$(':scope > .el', $('.col-body', n));
      let idx = kids.length;
      for (let i = 0; i < kids.length; i++) { const kr = kids[i].getBoundingClientRect(); if (cy < kr.top + kr.height / 2) { idx = i; break; } }
      return { col: c.id, idx };
    }
  }
  return null;
}
function insertIntoColumn(ids, colId, idx) {
  const col = E(colId); if (!col) return;
  for (const id of ids) { const e = E(id); if (e.col) { const oc = E(e.col); if (oc) oc.items = oc.items.filter(x => x !== id); } }
  col.items = col.items.filter(x => !ids.includes(x));
  col.items.splice(clamp(idx, 0, col.items.length), 0, ...ids);
  ids.forEach(id => { E(id).col = colId; });
}
function endMove() {
  const d = dragEnd = drag || lastMove; void d;
}
let dragEnd = null, lastMove = null;
function autoScroll(ev) {
  const r = VP().getBoundingClientRect(), m = 40, sp = 14;
  if (ev.clientX > r.right - m) VP().scrollLeft += sp; else if (ev.clientX < r.left + m) VP().scrollLeft -= sp;
  if (ev.clientY > r.bottom - m) VP().scrollTop += sp; else if (ev.clientY < r.top + m) VP().scrollTop -= sp;
  updateStageSize();
}

function marqueeMove(p) {
  let m = $('#marquee'); if (!m) { m = h('div'); m.id = 'marquee'; world().appendChild(m); }
  const x = Math.min(p.x, drag.start.x), y = Math.min(p.y, drag.start.y), w = Math.abs(p.x - drag.start.x), hh = Math.abs(p.y - drag.start.y);
  Object.assign(m.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' });
  sel.clear(); drag.base.forEach(i => sel.add(i));
  for (const el of boardEls()) {
    if (el.col) continue;
    let r;
    if (el.type === 'line') r = { x: Math.min(el.x1, el.x2), y: Math.min(el.y1, el.y2), w: Math.abs(el.x2 - el.x1), h: Math.abs(el.y2 - el.y1) };
    else r = elRect(el.id);
    if (r && r.x < x + w && r.x + r.w > x && r.y < y + hh && r.y + r.h > y) sel.add(el.id);
  }
  refreshSel();
}
function refreshSel() {
  if (TBL.st && !sel.has(TBL.st.id)) tExit();
  for (const el of boardEls()) { const n = nodes.get(el.id); if (n && el.type !== 'line') n.classList.toggle('selected', sel.has(el.id)); }
  updateLines(); updateCtxToolbar();
}

function startResize(ev, id) {
  const el = E(id); if (el.locked) return;
  sel.clear(); sel.add(id); refreshSel();
  drag = { kind: 'resize', id, start: toWorld(ev.clientX, ev.clientY), w0: nodes.get(id).offsetWidth };
}
function resizeMove(p) {
  const el = E(drag.id);
  const min = { color: 80, board: 80, drawing: 30, heading: 80 }[el.type] || 160;
  el.w = Math.round(clamp(drag.w0 + (p.x - drag.start.x), min, 2000));
  nodes.get(el.id).style.width = el.w + 'px'; updateLines();
}

function startLineHandle(ev, id, k) { drag = { kind: 'lineh', id, k, start: toWorld(ev.clientX, ev.clientY) }; document.body.classList.add('dragging'); }
function lineHandleMove(ev, p) {
  const el = E(drag.id);
  $$('.attach-hover').forEach(x => x.classList.remove('attach-hover'));
  if (drag.k === 'mid') {
    const { p1, p2 } = lineEnds(el);
    el.bx = Math.round(p.x - (p1.x + p2.x) / 2); el.by = Math.round(p.y - (p1.y + p2.y) / 2);
    if (Math.hypot(el.bx, el.by) < 8) el.bx = el.by = 0;
  } else {
    const key = drag.k === 'p1' ? 'a' : 'b';
    el[key] = null;
    if (drag.k === 'p1') { el.x1 = p.x; el.y1 = p.y; } else { el.x2 = p.x; el.y2 = p.y; }
    const target = elementAtPoint(ev.clientX, ev.clientY, el.id);
    drag.attach = target;
    if (target) nodes.get(target)?.classList.add('attach-hover');
  }
  updateLines();
}
function lineHandleEnd() {
  const d = drag || {}; void d;
}
function elementAtPoint(cx, cy, excludeId) {
  const hit = document.elementsFromPoint(cx, cy).map(n => n.closest?.('.el')).find(n => n && n.dataset.id !== excludeId);
  return hit ? hit.dataset.id : null;
}

// we need the drag object in end handlers → patch onPointerUp variants
const _origUp = onPointerUp;
function finishPointer(ev) {
  if (drawState) return drawUp(ev);
  if (ev.type === 'pointercancel' && toolDrag) { toolDrag.ghost?.remove(); toolDrag = null; document.body.classList.remove('dragging'); return; }
  if (ev.type === 'pointercancel' && drag?.kind === 'pending') { drag = null; return; }
  if (toolDrag) return toolDragEnd(ev);
  if (!drag) return;
  const d = drag;
  if (d.kind[0] === 't') { document.body.classList.remove('dragging'); return tPointerUp(ev); }
  if (d.kind === 'move') {
    drag = null; document.body.classList.remove('dragging');
    $$('.dragging-el').forEach(n => n.classList.remove('dragging-el'));
    $$('.col-ph').forEach(x => x.remove()); $$('.el-column.drop-target').forEach(x => x.classList.remove('drop-target'));
    $('#tool-trash').classList.remove('hot');
    if (d.overTrash) { removeElements(d.ids); return; }
    if (d.dropCol) { insertIntoColumn(d.ids.filter(id => E(id).type !== 'line'), d.dropCol.col, d.dropCol.idx); }
    render(); commit(); return;
  }
  if (d.kind === 'lineh') {
    drag = null; document.body.classList.remove('dragging');
    $$('.attach-hover').forEach(x => x.classList.remove('attach-hover'));
    const el = E(d.id);
    if (d.k !== 'mid' && d.attach) el[d.k === 'p1' ? 'a' : 'b'] = d.attach;
    updateLines(); commit(); return;
  }
  return _origUp(ev);
}

/* ------------------------- Toolbar drag --------------------------- */
let toolDrag = null;
function onToolDown(ev, type) {
  if (ev.pointerType !== 'touch') ev.preventDefault();
  toolDrag = { type, pointerType: ev.pointerType, cx: ev.clientX, cy: ev.clientY, moved: false, ghost: null };
}
function toolDragMove(ev) {
  if (!toolDrag.moved && Math.hypot(ev.clientX - toolDrag.cx, ev.clientY - toolDrag.cy) > 5) {
    toolDrag.moved = true; hidePopups();
    const g = h('div'); g.id = 'dragghost'; g.textContent = TYPE_LABEL[toolDrag.type] || toolDrag.type; document.body.appendChild(g); toolDrag.ghost = g;
    document.body.classList.add('dragging');
  }
  if (toolDrag.ghost) {
    toolDrag.ghost.style.left = ev.clientX + 6 + 'px'; toolDrag.ghost.style.top = ev.clientY + 6 + 'px';
    $$('.col-ph').forEach(x => x.remove());
    if (!['column', 'line', 'draw'].includes(toolDrag.type)) {
      const t = columnAt(ev.clientX, ev.clientY); toolDrag.col = t;
      if (t) { const body = $('.col-body', nodes.get(t.col)); const kids = $$(':scope > .el', body); const ph = h('div', 'col-ph'); if (t.idx >= kids.length) body.appendChild(ph); else body.insertBefore(ph, kids[t.idx]); }
    }
  }
}
function toolDragEnd(ev) {
  const td = toolDrag; toolDrag = null;
  td.ghost?.remove(); document.body.classList.remove('dragging'); $$('.col-ph').forEach(x => x.remove());
  if (!td.moved) return addElement(td.type);
  const r = VP().getBoundingClientRect();
  if (ev.clientX < r.left || ev.clientY < r.top) return;
  const p = toWorld(ev.clientX, ev.clientY);
  const at = { x: Math.max(0, p.x - 20), y: Math.max(0, p.y - 20) };
  if (td.type === 'image' || td.type === 'file') return pickFiles(td.type === 'image' ? 'image/*' : '', true, fs => { addFiles(fs, at).then(() => { if (td.col) { insertIntoColumn([...sel], td.col.col, td.col.idx); render(); commit(); } }); });
  addElement(td.type, at, { intoCol: td.col });
}

/* ----------------------------- Draw ------------------------------- */
let drawState = null, drawOpts = { c: '#2f3337', w: 3 };
function toggleDraw() {
  if (drawState) return finishDraw();
  blurEditing(); sel.clear(); refreshSel();
  drawState = { strokes: [], cur: null, svg: null };
  document.body.classList.add('drawmode'); $('#tool-draw').classList.add('active'); $('#drawbar').classList.remove('hidden');
  const ns = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'line-svg'); svg.style.zIndex = 999990; world().appendChild(svg); drawState.svg = svg;
  buildDrawBar();
}
function buildDrawBar() {
  const dc = $('.dcolors'); dc.innerHTML = '';
  DRAW_COLORS.forEach(c => { const b = h('div', 'dc' + (drawOpts.c === c ? ' on' : '')); b.style.background = c; b.onclick = () => { drawOpts.c = c; buildDrawBar(); }; dc.appendChild(b); });
  const ds = $('.dsizes'); ds.innerHTML = '';
  [2, 4, 8].forEach(w => { const b = h('div', 'ds' + (drawOpts.w === w ? ' on' : ''), `<i style="width:${w + 2}px;height:${w + 2}px"></i>`); b.onclick = () => { drawOpts.w = w; buildDrawBar(); }; ds.appendChild(b); });
}
function drawDown(ev) {
  if (!ev.target.closest('#viewport')) return;
  ev.preventDefault(); const p = toWorld(ev.clientX, ev.clientY);
  const s = { c: drawOpts.c, w: drawOpts.w, pts: [[p.x, p.y]] }; drawState.cur = s; drawState.strokes.push(s);
  const ns = 'http://www.w3.org/2000/svg'; const path = document.createElementNS(ns, 'path');
  path.setAttribute('stroke', s.c); path.setAttribute('stroke-width', s.w); path.setAttribute('fill', 'none'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
  drawState.svg.appendChild(path); s.node = path;
}
function drawMove(ev) {
  const s = drawState.cur; if (!s) return;
  const p = toWorld(ev.clientX, ev.clientY); const l = s.pts[s.pts.length - 1];
  if (Math.hypot(p.x - l[0], p.y - l[1]) < 1.5) return;
  s.pts.push([Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]); s.node.setAttribute('d', strokePath(s.pts));
}
function drawUp() { if (drawState?.cur) { drawState.cur.node.setAttribute('d', strokePath(drawState.cur.pts)); drawState.cur = null; } }
function finishDraw() {
  const st = drawState; drawState = null;
  document.body.classList.remove('drawmode'); $('#tool-draw').classList.remove('active'); $('#drawbar').classList.add('hidden');
  st.svg.remove();
  const strokes = st.strokes.filter(s => s.pts.length);
  if (!strokes.length) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  strokes.forEach(s => s.pts.forEach(([x, y]) => { x0 = Math.min(x0, x - s.w); y0 = Math.min(y0, y - s.w); x1 = Math.max(x1, x + s.w); y1 = Math.max(y1, y + s.w); }));
  const pad = 4; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  const vw = Math.round(x1 - x0), vh = Math.round(y1 - y0);
  const clean = strokes.map(s => ({ c: s.c, w: s.w, pts: s.pts.map(([x, y]) => [Math.round((x - x0) * 10) / 10, Math.round((y - y0) * 10) / 10]) }));
  const el = makeEl('drawing', x0, y0, { strokes: clean, vw, vh, w: vw });
  sel.clear(); sel.add(el.id); render(); commit();
}

/* ---------------------------- Sketch ------------------------------ */
function openSketch(el) {
  const ov = $('#overlay'); ov.innerHTML = ''; ov.classList.remove('hidden');
  const box = h('div', 'sk-editor');
  const W = 800, H = 500; let strokes = JSON.parse(JSON.stringify(el.strokes)); let o = { c: '#2f3337', w: 4, erase: false };
  const tb = h('div', 'sk-tb'); const colors = h('div', 'dcolors'); const sizes = h('div', 'dsizes');
  const er = h('button', 'dbtn ghost', 'Gomma'); const un = h('button', 'dbtn ghost', 'Annulla tratto'); const cl = h('button', 'dbtn ghost', 'Pulisci');
  const cancel = h('button', 'dbtn ghost', 'Annulla'); const done = h('button', 'dbtn', 'Fatto');
  tb.append(colors, sizes, er, un, cl, h('span', 'grow'), cancel, done);
  const cv = h('canvas'); const dpr = devicePixelRatio || 1; const scale = Math.min(1, (innerWidth * .9) / W, (innerHeight * .8) / H);
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W * scale + 'px'; cv.style.height = H * scale + 'px';
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const redraw = () => { ctx.clearRect(0, 0, W, H); strokes.forEach(s => { ctx.strokeStyle = s.c; ctx.lineWidth = s.w; ctx.stroke(new Path2D(strokePath(s.pts))); }); };
  const ui = () => {
    colors.innerHTML = ''; DRAW_COLORS.forEach(c => { const b = h('div', 'dc' + (o.c === c && !o.erase ? ' on' : '')); b.style.background = c; b.onclick = () => { o.c = c; o.erase = false; ui(); }; colors.appendChild(b); });
    sizes.innerHTML = ''; [2, 4, 8, 14].forEach(w => { const b = h('div', 'ds' + (o.w === w ? ' on' : ''), `<i style="width:${Math.min(w + 2, 16)}px;height:${Math.min(w + 2, 16)}px"></i>`); b.onclick = () => { o.w = w; ui(); }; sizes.appendChild(b); });
    er.style.outline = o.erase ? '2px solid #4b7bf5' : '';
  };
  er.onclick = () => { o.erase = !o.erase; ui(); };
  un.onclick = () => { strokes.pop(); redraw(); };
  cl.onclick = () => { strokes = []; redraw(); };
  const pt = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / scale * 10) / 10, Math.round((e.clientY - r.top) / scale * 10) / 10]; };
  let curS = null;
  const eraseAt = p => { const before = strokes.length; strokes = strokes.filter(s => !s.pts.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.max(10, s.w))); if (strokes.length !== before) redraw(); };
  cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); const p = pt(e); if (o.erase) { eraseAt(p); curS = 'erase'; return; } curS = { c: o.c, w: o.w, pts: [p] }; strokes.push(curS); redraw(); };
  cv.onpointermove = e => { if (!curS) return; const p = pt(e); if (curS === 'erase') return eraseAt(p); curS.pts.push(p); redraw(); };
  cv.onpointerup = () => { curS = null; };
  const close = save => { if (save) { el.strokes = strokes; touch(el); rebuild(el); commit(); } ov.classList.add('hidden'); ov.innerHTML = ''; };
  cancel.onclick = () => close(false); done.onclick = () => close(true);
  ov.onpointerdown = e => { if (e.target === ov) close(true); };
  box.append(tb, cv); ov.appendChild(box); ui(); redraw();
  overlayEsc = () => close(true);
}
let overlayEsc = null;

/* --------------------------- Document ----------------------------- */
function openDocument(el) {
  const ov = $('#overlay'); ov.innerHTML = ''; ov.classList.remove('hidden');
  const box = h('div', 'doc-editor');
  const tb = h('div', 'doc-tb'); const sc = h('div', 'doc-scroll');
  const title = h('div', 'doc-title editable'); title.contentEditable = 'plaintext-only'; title.dataset.ph = 'Titolo del documento'; title.textContent = el.title;
  const body = h('div', 'doc-body editable'); body.contentEditable = 'true'; body.dataset.ph = 'Inizia a scrivere…'; body.innerHTML = el.html;
  title.oninput = () => { el.title = title.textContent; touch(el); scheduleSave(); };
  title.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); body.focus(); } };
  body.oninput = () => { el.html = body.innerHTML; touch(el); scheduleSave(); };
  buildFormatBar(tb, body);
  $$('button', tb).forEach(b => b.style.color = '#2f3337');
  tb.appendChild(h('span', 'grow'));
  const exp = h('button', '', '⬇︎ .doc'); exp.title = 'Esporta come documento Word'; exp.onclick = () => saveBlob(new Blob([wordHtml(el.title, el.html)], { type: 'application/msword' }), (el.title || 'documento') + '.doc');
  const close = h('button', '', '✕'); close.title = 'Chiudi (Esc)';
  tb.append(exp, close);
  sc.append(title, body); box.append(tb, sc); ov.appendChild(box);
  const done = () => { ov.classList.add('hidden'); ov.innerHTML = ''; rebuild(el); commit(); overlayEsc = null; };
  close.onclick = done; ov.onpointerdown = e => { if (e.target === ov) done(); };
  overlayEsc = done;
  (el.title ? body : title).focus();
}
function openLightbox(el) {
  const ov = $('#overlay'); ov.innerHTML = ''; ov.classList.remove('hidden');
  const b = h('div', 'lightbox'); const img = h('img'); fileURL(el.fileId).then(u => img.src = u); b.appendChild(img); ov.appendChild(b);
  const done = () => { ov.classList.add('hidden'); ov.innerHTML = ''; overlayEsc = null; };
  ov.onpointerdown = done; overlayEsc = done;
}

/* ---------------------- Context toolbar (left) -------------------- */
function updateCtxToolbar() {
  const tb = $('#toolbar'); const ct = $('#ctxbar');
  const show = sel.size > 0 && !drawState;
  tb.classList.toggle('ctx', show);
  if (!show) { ct.innerHTML = ''; return; }
  const ids = [...sel]; const els = ids.map(E).filter(Boolean);
  const single = els.length === 1 ? els[0] : null;
  const btn = (icon, label, fn, cls = '') => { const b = h('div', 'tool ' + cls, `<div class="ti">${icon}</div><span>${label}</span>`); b.onclick = e => { e.stopPropagation(); fn(b, e); }; return b; };
  ct.innerHTML = '';
  if (TBL.st && sel.has(TBL.st.id)) return tToolbar(ct);
  const back = h('div', 'tool ctx-back', '<div class="ti"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></div>');
  back.title = 'Deseleziona (Esc)'; back.onclick = () => { sel.clear(); refreshSel(); }; ct.appendChild(back);
  const nonLine = els.filter(e => e.type !== 'line');
  if (nonLine.length) {
    ct.appendChild(btn('<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.3" fill="currentColor"/><circle cx="12" cy="7.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="10" r="1.3" fill="currentColor"/></svg>', 'Colore', b => openColorMenu(b, nonLine)));
    ct.appendChild(btn('<svg viewBox="0 0 24 24"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor"/></svg>', 'Etichette', b => openLabelMenu(b, nonLine)));
    ct.appendChild(btn('<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.3 2 3.5 2 3.5-2 3.5-2"/><circle cx="9" cy="10" r=".8" fill="currentColor"/><circle cx="15" cy="10" r=".8" fill="currentColor"/></svg>', 'Reazioni', b => openReactMenu(b, nonLine)));
    if (single && single.type !== 'comment') ct.appendChild(btn('<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', 'Commenta', () => attachComment(single)));
    if (single && !['board', 'heading', 'line', 'drawing'].includes(single.type)) {
      ct.appendChild(btn('<svg viewBox="0 0 24 24"><path d="M4 6h16"/><path d="M4 11h10"/></svg>', 'Titolo', () => { if (single.cardTitle == null) single.cardTitle = ''; applyDecor(single); $('.x-title', nodes.get(single.id))?.focus(); }));
      if (single.type !== 'image') ct.appendChild(btn('<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="10" rx="1"/><path d="M4 18h12"/></svg>', 'Didascalia', () => { if (single.cardCaption == null) single.cardCaption = ''; applyDecor(single); $('.x-caption', nodes.get(single.id))?.focus(); }));
      else ct.appendChild(btn('<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="10" rx="1"/><path d="M4 18h12"/></svg>', 'Didascalia', () => enterEdit(single)));
    }
  }
  if (single && single.type === 'line') {
    ct.appendChild(btn('<svg viewBox="0 0 24 24"><path d="M4 12h16M14 6l6 6-6 6"/></svg>', 'Frecce', b => openLineMenu(b, single)));
    ct.appendChild(btn('<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>', 'Colore', b => openColorMenu(b, [single])));
  }
  if (single && single.type === 'table') ct.appendChild(btn('<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M9 4v16"/></svg>', 'Modifica celle', () => tEnter(single.id, 0, 0)));
  if (single && single.type === 'image') ct.appendChild(btn('<svg viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>', 'Apri', () => openLightbox(single)));
  if (single && ['image', 'file', 'audio'].includes(single.type) && single.fileId) ct.appendChild(btn('<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>', 'Scarica', () => downloadFile(single)));
  ct.appendChild(btn('<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>', 'Altro', (b, e) => { const r = b.getBoundingClientRect(); showElementMenu(r.right + 6, r.top, ids); }));
  ct.appendChild(h('div', 'tspacer'));
  ct.appendChild(btn('<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M5 6l1.5 15h11L19 6"/><path d="M9 6V3h6v3"/></svg>', 'Cestino', () => removeElements(ids)));
}
function attachComment(el) {
  const r = elRect(el.id);
  const c = makeEl('comment', (el.col ? r.x : el.x) + r.w + 24, el.col ? r.y : el.y);
  const l = makeEl('line', 0, 0, { x1: 0, y1: 0, x2: 0, y2: 0, a: el.id, b: c.id, bx: 0, by: 0, arrowEnd: false, dash: true, width: 1.5, color: '#6d83d8' });
  void l; sel.clear(); sel.add(c.id); render(); commit(); $('.cm-input .editable', nodes.get(c.id))?.focus();
}

/* ---------------------------- Menus ------------------------------- */
function menuAt(x, y, build) {
  const m = $('#ctxmenu'); m.innerHTML = ''; build(m); m.classList.remove('hidden');
  m.style.left = '0px'; m.style.top = '0px';
  const w = m.offsetWidth, hh = m.offsetHeight;
  m.style.left = clamp(x, 4, innerWidth - w - 4) + 'px'; m.style.top = clamp(y, 4, innerHeight - hh - 4) + 'px';
  return m;
}
function mi(m, label, fn, key = '', cls = '') { const d = h('div', 'mi ' + cls, `<span>${label}</span><span class="k">${key}</span>`); d.onclick = e => { e.stopPropagation(); hidePopups(); fn(); }; m.appendChild(d); return d; }
const msep = m => m.appendChild(h('div', 'msep'));
function showElementMenu(x, y, ids) {
  const els = ids.map(E).filter(Boolean); if (!els.length) return;
  const single = els.length === 1 ? els[0] : null;
  menuAt(x, y, m => {
    if (single?.type === 'board') { mi(m, 'Apri board', () => openBoard(single.target)); mi(m, 'Rinomina', () => enterEdit(single)); msep(m); }
    if (single?.type === 'link' && single.url) { mi(m, 'Apri link ↗', () => window.open(single.url, '_blank', 'noopener')); mi(m, 'Modifica URL', () => { single.url = ''; rebuild(single); commit(); }); msep(m); }
    if (single?.type === 'video' && (single.url || single.fileId)) { mi(m, 'Cambia video', () => { single.url = ''; single.fileId = null; rebuild(single); commit(); }); msep(m); }
    if (single?.type === 'map' && single.query) { mi(m, 'Cambia luogo', () => { single.query = ''; rebuild(single); commit(); }); msep(m); }
    if (single?.type === 'image' && single.fileId) { mi(m, 'Apri immagine', () => openLightbox(single)); mi(m, 'Sostituisci immagine', () => pickFiles('image/*', false, async f => { single.fileId = await storeFile(f[0]); single.name = f[0].name; rebuild(single); commit(); })); msep(m); }
    if (single?.type === 'document') { mi(m, 'Apri documento', () => openDocument(single)); msep(m); }
    if (single?.type === 'sketch') { mi(m, 'Modifica schizzo', () => openSketch(single)); msep(m); }
    if (single?.type === 'column') { mi(m, single.collapsed ? 'Espandi colonna' : 'Comprimi colonna', () => { single.collapsed = !single.collapsed; commit(); render(); }); msep(m); }
    if (single?.type === 'note') { mi(m, 'Converti in titolo', () => { single.type = 'heading'; single.w = Math.max(single.w, 300); rebuild(single); commit(); }); msep(m); }
    if (single?.type === 'heading') { mi(m, 'Converti in nota', () => { single.type = 'note'; single.w = 260; rebuild(single); commit(); }); msep(m); }
    mi(m, 'Taglia', () => copySel(true), '⌘X');
    mi(m, 'Copia', () => copySel(false), '⌘C');
    mi(m, 'Duplica', () => duplicate(ids), '⌘D');
    mi(m, 'Sposta nel cestino', () => removeElements(ids), '⌫');
    if (S && Object.keys(S.boards).length > 1) mi(m, 'Sposta in un\'altra board…', () => moveToBoardMenu(x, y, ids));
    msep(m);
    const allLocked = els.every(e => e.locked);
    mi(m, allLocked ? 'Sblocca posizione' : 'Blocca posizione', () => { els.forEach(e => e.locked = !allLocked); commit(); render(); }, '⇧⌘L');
    msep(m);
    mi(m, 'Porta in primo piano', () => { els.forEach(e => e.z = nextZ()); commit(); render(); }, '⌘]');
    mi(m, 'Porta in fondo', () => { const minZ = Math.min(...Object.values(S.elements).map(e => e.z || 0)); els.forEach((e, i) => e.z = minZ - els.length + i); commit(); render(); }, '⌘[');
    if (single) {
      msep(m);
      m.appendChild(h('div', 'mlabel', 'Info'));
      m.appendChild(h('div', 'mi', `<span style="color:#8a8f94;font-size:12px;line-height:1.5">${TYPE_LABEL[single.type]} · creato da ${ME}<br>${fmtDate(single.created)}<br>modificato ${fmtDate(single.modified)}</span>`));
    }
  });
}
function moveToBoardMenu(x, y, ids) {
  menuAt(x, y, m => {
    m.appendChild(h('div', 'mlabel', 'Sposta in'));
    const excluded = new Set(ids.map(E).filter(e => e.type === 'board').map(e => e.target));
    const isUnder = (b, anc) => { while (b) { if (excluded.has(b)) return true; b = S.boards[b]?.parent; } return false; };
    Object.values(S.boards).filter(b => b.id !== cur && !isBoardHidden(b.id) && !isUnder(b.id)).forEach(b => {
      mi(m, `<span class="sq" style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${b.color};margin-right:8px"></span>${esc(b.title)}`, () => {
        ids.forEach(id => {
          const e = E(id); if (!e) return;
          if (e.col) { const c = E(e.col); if (c && !ids.includes(c.id)) { c.items = c.items.filter(x => x !== id); e.col = null; } }
          e.board = b.id; if (e.type === 'board') S.boards[e.target].parent = b.id;
          if (e.type === 'column') e.items.forEach(ci => { E(ci).board = b.id; });
          if (e.type === 'line') { if (e.a && !ids.includes(e.a)) e.a = null; if (e.b && !ids.includes(e.b)) e.b = null; }
        });
        for (const l of boardEls()) if (l.type === 'line') { if (ids.includes(l.a)) l.a = null; if (ids.includes(l.b)) l.b = null; }
        sel.clear(); commit(); render(); toast('Spostato in "' + b.title + '"', 'Apri', () => openBoard(b.id));
      });
    });
  });
}
function openColorMenu(anchor, els) {
  const r = anchor.getBoundingClientRect();
  menuAt(r.right + 6, r.top, m => {
    const boards = els.filter(e => e.type === 'board');
    if (boards.length === els.length) {
      m.appendChild(h('div', 'mlabel', 'Colore board'));
      const p = h('div', 'palette'); BOARD_COLORS.forEach(c => { const d = h('div', 'pc' + (S.boards[boards[0].target].color === c ? ' on' : '')); d.style.background = c; d.onclick = () => { boards.forEach(b => S.boards[b.target].color = c); commit(); render(); renderChrome(); hidePopups(); }; p.appendChild(d); });
      m.appendChild(p); return;
    }
    m.appendChild(h('div', 'mlabel', 'Colore'));
    const p = h('div', 'palette');
    COLORS.forEach(c => {
      const d = h('div', 'pc' + (c ? '' : ' none') + ((els[0].color || null) === c ? ' on' : '')); d.style.background = c || '#fff'; d.title = c || 'Nessuno';
      d.onclick = () => { els.forEach(e => { e.color = c; touch(e); }); commit(); render(); hidePopups(); };
      p.appendChild(d);
    });
    m.appendChild(p);
    if (els.some(e => e.type === 'line')) {
      m.appendChild(h('div', 'mlabel', 'Spessore'));
      [1.5, 2, 3, 5].forEach(w => mi(m, `<span style="display:inline-block;width:60px;height:${w}px;background:#2f3337;vertical-align:middle"></span>`, () => { els.forEach(e => e.width = w); commit(); updateLines(); }));
    }
  });
}
function openLineMenu(anchor, el) {
  const r = anchor.getBoundingClientRect();
  menuAt(r.right + 6, r.top, m => {
    mi(m, (el.arrowEnd !== false ? '✓ ' : '') + 'Freccia alla fine', () => { el.arrowEnd = el.arrowEnd === false; commit(); updateLines(); });
    mi(m, (el.arrowStart ? '✓ ' : '') + 'Freccia all\'inizio', () => { el.arrowStart = !el.arrowStart; commit(); updateLines(); });
    mi(m, (el.dash ? '✓ ' : '') + 'Tratteggiata', () => { el.dash = !el.dash; commit(); updateLines(); });
    mi(m, 'Raddrizza', () => { el.bx = el.by = 0; commit(); updateLines(); });
    msep(m);
    m.appendChild(h('div', 'mlabel', 'Spessore'));
    [1.5, 2, 3, 5].forEach(w => mi(m, `${el.width === w ? '✓ ' : ''}<span style="display:inline-block;width:60px;height:${w}px;background:#2f3337;vertical-align:middle"></span>`, () => { el.width = w; commit(); updateLines(); }));
    if (el.a || el.b) { msep(m); mi(m, 'Stacca dalle card', () => { el.a = el.b = null; commit(); updateLines(); }); }
  });
}
function openLabelMenu(anchor, els) {
  const r = anchor.getBoundingClientRect();
  menuAt(r.right + 6, r.top, m => {
    m.appendChild(h('div', 'mlabel', 'Etichette'));
    Object.values(S.labels).forEach(l => {
      const on = els.every(e => (e.labels || []).includes(l.id));
      const d = mi(m, `${on ? '✓ ' : ''}<span class="lbl" style="background:${l.color}">${esc(l.name)}</span>`, () => {
        els.forEach(e => { e.labels = e.labels || []; if (on) e.labels = e.labels.filter(x => x !== l.id); else if (!e.labels.includes(l.id)) e.labels.push(l.id); });
        commit(); render();
      }, '');
      const del = h('span', 'k', '✕'); del.title = 'Elimina etichetta'; del.onclick = ev => { ev.stopPropagation(); delete S.labels[l.id]; Object.values(S.elements).forEach(e => e.labels = (e.labels || []).filter(x => x !== l.id)); commit(); render(); hidePopups(); };
      d.lastChild.replaceWith(del);
    });
    const row = h('div', 'mi', '<input placeholder="Nuova etichetta…" style="flex:1;border:1px solid #d3d6d9;border-radius:4px;padding:5px 7px;font:inherit;outline:none">');
    const inp = $('input', row);
    inp.onkeydown = e => {
      e.stopPropagation();
      if (e.key === 'Enter' && inp.value.trim()) {
        const id = uid(); const pal = ['#e8584f', '#f39a38', '#e0b416', '#5bb860', '#3db5a8', '#4b7bf5', '#7d5ce6', '#d9589e'];
        S.labels[id] = { id, name: inp.value.trim(), color: pal[Object.keys(S.labels).length % pal.length] };
        els.forEach(el => { el.labels = el.labels || []; el.labels.push(id); }); commit(); render(); hidePopups();
      }
    };
    row.onclick = e => e.stopPropagation();
    m.appendChild(row); setTimeout(() => inp.focus(), 0);
  });
}
function openReactMenu(anchor, els) {
  const r = anchor.getBoundingClientRect();
  menuAt(r.right + 6, r.top, m => {
    const p = h('div', 'palette'); p.style.gridTemplateColumns = 'repeat(4, 34px)';
    REACTIONS.forEach(x => { const d = h('div', 'mi', x); d.style.cssText = 'font-size:20px;padding:4px;justify-content:center'; d.onclick = () => { els.forEach(e => { e.reactions = e.reactions || {}; e.reactions[x] = (e.reactions[x] || 0) + 1; }); commit(); render(); hidePopups(); }; p.appendChild(d); });
    m.appendChild(p);
  });
}
function showCanvasMenu(x, y, wp) {
  menuAt(x, y, m => {
    m.appendChild(h('div', 'mlabel', 'Aggiungi qui'));
    ['note', 'heading', 'todo', 'link', 'board', 'column', 'table', 'comment', 'document', 'color', 'sketch', 'line'].forEach(t => mi(m, TYPE_LABEL[t], () => addElement(t, wp)));
    if (clip) { msep(m); mi(m, 'Incolla', () => pasteClip(), '⌘V'); }
    msep(m);
    mi(m, 'Seleziona tutto', () => { boardEls().forEach(e => { if (!e.col) sel.add(e.id); }); refreshSel(); }, '⌘A');
  });
}
function hidePopups(keepPanel) {
  $('#ctxmenu').classList.add('hidden'); $('#more-menu').classList.add('hidden'); $('#tool-more').classList.remove('active');
  $$('.hdr-menu').forEach(x => x.remove());
  if (!keepPanel) closePanel();
}

/* ---------------------------- Panels ------------------------------ */
function openPanel(kind) {
  const p = $('#panel');
  if (p.dataset.kind === kind && !p.classList.contains('hidden')) return closePanel();
  hidePopups(); p.dataset.kind = kind; p.classList.remove('hidden'); p.innerHTML = '';
  const head = (t) => { const d = h('div', 'ph', `<span>${t}</span><button class="x">✕</button>`); $('.x', d).onclick = closePanel; p.appendChild(d); };
  if (kind === 'trash') {
    head('Cestino');
    const body = h('div', 'pb'); p.appendChild(body);
    const items = Object.values(S.elements).filter(e => e.deleted && !e.trashParent).sort((a, b) => b.deletedAt - a.deletedAt);
    if (!items.length) body.appendChild(h('div', 'pempty', 'Il cestino è vuoto.<br><small>Trascina gli elementi sull\'icona del cestino per eliminarli.</small>'));
    items.forEach(e => {
      const r = h('div', 'prow', `<span class="tag">${TYPE_LABEL[e.type]}</span><div class="pt"><b></b><small>${esc(S.boards[e.board]?.title || '?')} · ${fmtDate(e.deletedAt)}</small></div><button>Ripristina</button><button class="danger">Elimina</button>`);
      $('b', r).textContent = (elText(e) || TYPE_LABEL[e.type]).slice(0, 80);
      const [rb, db] = $$('button', r);
      rb.onclick = () => { restoreElement(e.id); openPanel('trash'); openPanel('trash'); };
      db.onclick = () => { purgeElement(e.id); r.remove(); };
      body.appendChild(r);
    });
    if (items.length) {
      const f = h('div', 'pfoot'); const b = h('button', 'btn danger', 'Svuota cestino');
      let armed = false;
      b.onclick = () => { if (!armed) { armed = true; b.textContent = 'Conferma: elimina definitivamente'; return; } items.forEach(e => purgeElement(e.id)); closePanel(); toast('Cestino svuotato'); };
      f.appendChild(b); p.appendChild(f);
    }
  }
  if (kind === 'search') {
    head('Cerca');
    const inp = h('input'); inp.id = 'search-input'; inp.placeholder = 'Cerca in tutte le board…'; p.appendChild(inp);
    const body = h('div', 'pb'); p.appendChild(body);
    const run = () => {
      const q = inp.value.trim().toLowerCase(); body.innerHTML = '';
      if (!q) { body.appendChild(h('div', 'pempty', 'Scrivi per cercare in note, to-do, tabelle, board, link…')); return; }
      const res = [];
      Object.values(S.boards).forEach(b => { if (b.id !== 'home' && !isBoardHidden(b.id) && (b.title || '').toLowerCase().includes(q)) res.push({ kind: 'board', b }); });
      Object.values(S.elements).forEach(e => { if (e.deleted || isBoardHidden(e.board) || e.type === 'board') return; const t = [elText(e), e.cardTitle, e.cardCaption, e.caption].filter(Boolean).join(' '); if (t.toLowerCase().includes(q)) res.push({ kind: 'el', e, t }); });
      if (!res.length) body.appendChild(h('div', 'pempty', 'Nessun risultato'));
      res.slice(0, 100).forEach(x => {
        const r = h('div', 'prow');
        if (x.kind === 'board') { r.innerHTML = `<span class="tag" style="background:${x.b.color};color:#fff">Board</span><div class="pt"><b></b><small>${esc(S.boards[x.b.parent]?.title || '')}</small></div>`; $('b', r).innerHTML = hl(x.b.title, q); r.onclick = () => { openBoard(x.b.id); closePanel(); }; }
        else { r.innerHTML = `<span class="tag">${TYPE_LABEL[x.e.type]}</span><div class="pt"><b></b><small>${esc(S.boards[x.e.board]?.title || '')}</small></div>`; $('b', r).innerHTML = hl(snippet(x.t, q), q); r.onclick = () => { closePanel(); openBoard(x.e.board, x.e.id); }; }
        r.style.cursor = 'pointer'; body.appendChild(r);
      });
    };
    inp.oninput = run; inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Escape') closePanel(); if (e.key === 'Enter') $('.prow', body)?.click(); };
    run(); setTimeout(() => inp.focus(), 0);
  }
  if (kind === 'help') {
    head('Scorciatoie da tastiera');
    const k = [['Nuova nota', 'N'], ['Nuovo titolo', 'H'], ['Nuova to-do', 'T'], ['Nuova board', 'B'], ['Nuova colonna', 'C'], ['Nuovo link', 'K'], ['Nuova linea', 'L'], ['Disegna', 'D'], ['Doppio clic sul canvas', 'nuova nota'],
    ['Annulla / Ripeti', '⌘Z / ⇧⌘Z'], ['Copia / Taglia / Incolla', '⌘C / ⌘X / ⌘V'], ['Duplica', '⌘D'], ['Seleziona tutto', '⌘A'], ['Elimina selezione', '⌫'], ['Sposta selezione', '← ↑ → ↓ (⇧ = 10px)'], ['Primo piano / In fondo', '⌘] / ⌘['], ['Blocca posizione', '⇧⌘L'],
    ['Cerca', '⌘F'], ['Zoom', '⌘+ / ⌘− / ⌘0'], ['Adatta alla finestra', '⇧1'], ['Zoom col trackpad', 'pizzica / ⌘+rotella'], ['Muovi canvas', 'Spazio + trascina'], ['Board superiore', '⌘↑'], ['Esci / deseleziona', 'Esc'],
    ['Grassetto / Corsivo / Sottolineato', '⌘B / ⌘I / ⌘U'], ['Link nel testo', '⌘K'], ['Presentazione', 'menu Vista']];
    const b = h('div', 'pb'); const g = h('div', 'kb'); k.forEach(([a, c]) => g.append(h('span', '', a), h('kbd', '', c))); b.appendChild(g);
    b.appendChild(h('div', 'pempty', 'Trascina gli strumenti dalla barra a sinistra sul canvas o dentro una colonna. Trascina file e immagini direttamente sulla board, o incollali con ⌘V.'));
    p.appendChild(b);
  }
  if (kind === 'notif') {
    head('Notifiche');
    const b = h('div', 'pb'); const recent = Object.values(S.elements).filter(e => !e.deleted && !isBoardHidden(e.board)).sort((a, c) => c.modified - a.modified).slice(0, 15);
    if (!recent.length) b.appendChild(h('div', 'pempty', 'Nessuna notifica'));
    else { b.appendChild(h('div', 'mlabel', 'Attività recente')); recent.forEach(e => { const r = h('div', 'prow', `<span class="tag">${TYPE_LABEL[e.type]}</span><div class="pt"><b></b><small>${esc(S.boards[e.board]?.title || '')} · ${fmtDate(e.modified)}</small></div>`); $('b', r).textContent = (elText(e) || TYPE_LABEL[e.type]).slice(0, 70); r.style.cursor = 'pointer'; r.onclick = () => { closePanel(); openBoard(e.board, e.id); }; b.appendChild(r); }); }
    p.appendChild(b);
  }
  if (kind === 'settings') {
    head('Impostazioni');
    const b = h('div', 'pb');
    const nb = Object.keys(S.boards).length - 1, ne = Object.values(S.elements).filter(e => !e.deleted).length;
    b.innerHTML = `<div class="prow"><div class="pt"><b>Spazio di lavoro locale</b><small>${nb} board · ${ne} elementi · spazio illimitato</small></div></div>`;
    const row = (t, s, bt, fn, cls = '') => { const r = h('div', 'prow', `<div class="pt"><b>${t}</b><small>${s}</small></div><button class="${cls}">${bt}</button>`); $('button', r).onclick = fn; b.appendChild(r); return r; };
    row('Backup completo', 'Esporta tutte le board, file e immagini in un file .json', 'Esporta', exportAll);
    row('Ripristina backup', 'Importa un file di backup (sostituisce i dati attuali)', 'Importa', () => pickFiles('.json,application/json', false, f => importAll(f[0])));
    let armed = false;
    const rr = row('Cancella tutto', 'Elimina definitivamente tutte le board e i file' + (typeof Sync !== 'undefined' && Sync.active() ? ', anche sul server e su tutti i dispositivi collegati' : ''), 'Cancella', async () => {
      if (!armed) { armed = true; $('button', rr).textContent = 'Conferma'; return; }
      S = freshState(); cur = 'home'; const ks = await DB.keys('files'); for (const k of ks) await DB.del('files', k); urlCache.clear(); hist.stack = []; hist.idx = -1; commit(); openBoard('home'); closePanel();
    }, 'danger');
    p.appendChild(b);
  }
}
function closePanel() { const p = $('#panel'); p.classList.add('hidden'); p.dataset.kind = ''; }
function hl(text, q) { const t = esc(text); const i = t.toLowerCase().indexOf(esc(q)); return i < 0 ? t : t.slice(0, i) + '<span class="hl">' + t.slice(i, i + esc(q).length) + '</span>' + t.slice(i + esc(q).length); }
function snippet(t, q) { const i = t.toLowerCase().indexOf(q); const s = Math.max(0, i - 30); return (s ? '…' : '') + t.slice(s, s + 90).replace(/\s+/g, ' '); }
function updateTrashBadge() { const n = Object.values(S.elements).filter(e => e.deleted && !e.trashParent).length; $('#tool-trash span').textContent = n ? `Cestino (${n})` : 'Cestino'; }

/* ---------------------- Header menus: View / Export ---------------- */
function headerMenu(anchor, build) {
  hidePopups();
  const m = h('div', 'popup hdr-menu'); build(m); document.body.appendChild(m);
  const r = anchor.getBoundingClientRect(); m.style.top = r.bottom + 6 + 'px'; m.style.left = Math.min(r.left, innerWidth - m.offsetWidth - 10) + 'px';
  m.addEventListener('pointerdown', e => e.stopPropagation());
}
function viewMenu(anchor) {
  headerMenu(anchor, m => {
    m.innerHTML = `<div class="hm-sec"><div class="hm-t">Zoom</div><div class="hm-zoom"><button data-z="-">−</button><span>${Math.round(zoom * 100)}%</span><button data-z="+">+</button></div><button class="btn wide" data-a="fit">Adatta alla finestra</button><button class="btn wide" data-a="100">Zoom 100%</button></div>
      <div class="hm-sec"><div class="hm-t">Modalità presentazione</div><div class="hm-s">Schermo intero, nasconde barre e griglia</div><button class="btn dark wide" data-a="present">Presenta</button></div>
      <div class="hm-sec"><label class="hm-chk"><input type="checkbox" ${S.boards[cur].noGrid ? '' : 'checked'}> Mostra griglia a puntini</label></div>`;
    m.querySelector('[data-z="-"]').onclick = () => { zoomBy(1 / 1.2); $('.hm-zoom span', m).textContent = Math.round(zoom * 100) + '%'; };
    m.querySelector('[data-z="+"]').onclick = () => { zoomBy(1.2); $('.hm-zoom span', m).textContent = Math.round(zoom * 100) + '%'; };
    m.querySelector('[data-a="fit"]').onclick = () => { zoomToFit(); hidePopups(); };
    m.querySelector('[data-a="100"]').onclick = () => { setZoom(1); hidePopups(); };
    m.querySelector('[data-a="present"]').onclick = () => { hidePopups(); presentMode(true); };
    m.querySelector('input').onchange = e => { S.boards[cur].noGrid = !e.target.checked; applyGrid(); scheduleSave(); };
  });
}
function applyGrid() { world().classList.toggle('nogrid', !!S.boards[cur].noGrid); }
function exportMenu(anchor) {
  headerMenu(anchor, m => {
    const files = boardEls().filter(e => e.fileId);
    m.innerHTML = `<div class="hm-sec"><div class="hm-t">Esporta il layout della board</div><div class="mi" data-a="pdf">📄 PDF (stampa)</div><div class="mi" data-a="png">🖼 Immagine PNG</div></div>
      <div class="hm-sec"><div class="hm-t">Converti in documento lineare</div><label class="hm-chk"><input type="checkbox" id="exp-sub"> Includi sotto-board</label><div class="mi" data-a="doc">📝 Documento Word</div><div class="mi" data-a="md">Ⓜ Markdown</div><div class="mi" data-a="txt">≡ Testo semplice</div></div>
      <div class="hm-sec"><div class="hm-t">Scarica tutte le immagini e i file</div>${files.length ? `<div class="mi" data-a="files">⬇ ${files.length} file</div>` : '<div class="hm-s">Nessun file in questa board</div>'}</div>`;
    const sub = () => $('#exp-sub', m).checked;
    const t = S.boards[cur].title || 'board';
    m.querySelector('[data-a="pdf"]').onclick = () => { hidePopups(); exportPDF(); };
    m.querySelector('[data-a="png"]').onclick = () => { hidePopups(); exportPNG(); };
    m.querySelector('[data-a="doc"]').onclick = () => { saveBlob(new Blob([wordHtml(t, boardToHtml(cur, sub()))], { type: 'application/msword' }), t + '.doc'); hidePopups(); };
    m.querySelector('[data-a="md"]').onclick = () => { saveBlob(new Blob([boardToMd(cur, sub(), 1)], { type: 'text/markdown' }), t + '.md'); hidePopups(); };
    m.querySelector('[data-a="txt"]').onclick = () => { saveBlob(new Blob([boardToMd(cur, sub(), 1, true)], { type: 'text/plain' }), t + '.txt'); hidePopups(); };
    const fb = m.querySelector('[data-a="files"]'); if (fb) fb.onclick = async () => { hidePopups(); for (const e of files) { await downloadFile(e); await new Promise(r => setTimeout(r, 300)); } };
  });
}
function readingOrder(bid) {
  return boardEls(bid).filter(e => !e.col && e.type !== 'line').sort((a, b) => (Math.abs(a.y - b.y) < 40 ? a.x - b.x : a.y - b.y));
}
function htmlToMd(html) {
  const d = document.createElement('div'); d.innerHTML = html || '';
  const walk = n => {
    if (n.nodeType === 3) return n.textContent;
    const inner = [...n.childNodes].map(walk).join('');
    switch (n.tagName) {
      case 'B': case 'STRONG': return `**${inner}**`; case 'I': case 'EM': return `*${inner}*`; case 'S': case 'STRIKE': return `~~${inner}~~`;
      case 'H1': return `\n# ${inner}\n`; case 'H2': return `\n## ${inner}\n`; case 'A': return `[${inner}](${n.getAttribute('href')})`;
      case 'LI': return (n.parentElement?.tagName === 'OL' ? '1. ' : '- ') + inner + '\n'; case 'BR': return '\n'; case 'DIV': case 'P': return inner + '\n';
      case 'BLOCKQUOTE': return '> ' + inner + '\n'; case 'PRE': return '```\n' + inner + '\n```\n'; default: return inner;
    }
  };
  return walk(d).replace(/\n{3,}/g, '\n\n').trim();
}
function elToMd(e, plain) {
  const txt = h => plain ? stripHtml(h) : htmlToMd(h);
  const pre = e.cardTitle ? (plain ? e.cardTitle + '\n' : `**${e.cardTitle}**\n`) : '';
  switch (e.type) {
    case 'note': return pre + txt(e.html);
    case 'heading': return (plain ? '' : '## ') + stripHtml(e.html);
    case 'link': return pre + (plain ? `${e.title} (${e.url})` : `[${e.title || e.url}](${e.url})`);
    case 'todo': return pre + [e.title && (plain ? e.title : `**${e.title}**`), ...e.items.map(i => `${i.done ? '[x]' : '[ ]'} ${i.text}`).map(s => plain ? s : '- ' + s)].filter(Boolean).join('\n');
    case 'column': return (plain ? e.title : `### ${e.title || 'Colonna'}`) + '\n\n' + e.items.map(E).filter(x => x && !x.deleted).map(x => elToMd(x, plain)).join('\n\n');
    case 'comment': return e.thread.map(m => `${plain ? '' : '> '}${m.author}: ${m.text}`).join('\n');
    case 'document': return (plain ? e.title : `### ${e.title}`) + '\n\n' + txt(e.html);
    case 'table': { const rows = e.rows.map(r => r.map(c => stripHtml(c).replace(/\|/g, '\\|'))); if (plain) return rows.map(r => r.join('\t')).join('\n'); return [rows[0], rows[0].map(() => '---'), ...rows.slice(1)].map(r => '| ' + r.join(' | ') + ' |').join('\n'); }
    case 'color': return e.hex; case 'map': return `📍 ${e.query}`; case 'video': return e.url || e.name || '';
    case 'image': case 'file': case 'audio': return (e.name || '') + (e.caption ? ' — ' + e.caption : '');
    default: return '';
  }
}
function boardToMd(bid, sub, lvl, plain) {
  const b = S.boards[bid]; let out = (plain ? b.title : '#'.repeat(Math.min(lvl, 6)) + ' ' + b.title) + '\n\n';
  for (const e of readingOrder(bid)) {
    if (e.type === 'board') { out += sub ? boardToMd(e.target, true, lvl + 1, plain) : (plain ? `[Board] ${S.boards[e.target].title}` : `📋 **${S.boards[e.target].title}**`) + '\n\n'; continue; }
    const s = elToMd(e, plain); if (s.trim()) out += s + '\n\n';
  }
  return out;
}
function boardToHtml(bid, sub) {
  const md = boardToMd(bid, sub, 1);
  return md.split('\n').map(l => l.startsWith('# ') ? `<h1>${esc(l.slice(2))}</h1>` : l.startsWith('## ') ? `<h2>${esc(l.slice(3))}</h2>` : l.startsWith('### ') ? `<h3>${esc(l.slice(4))}</h3>` : `<p>${esc(l).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</p>`).join('');
}
function wordHtml(title, body) { return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="font-family:Calibri,Arial">${title && !body.startsWith('<h1') ? `<h1>${esc(title)}</h1>` : ''}${body}</body></html>`; }
function saveBlob(blob, name) { const u = URL.createObjectURL(blob); const a = h('a'); a.href = u; a.download = name.replace(/[\\/:*?"<>|]/g, '_'); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); }
function contentBounds() {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of boardEls()) {
    if (e.col) continue;
    const r = e.type === 'line' ? { x: Math.min(e.x1, e.x2), y: Math.min(e.y1, e.y2), w: Math.abs(e.x2 - e.x1), h: Math.abs(e.y2 - e.y1) } : elRect(e.id);
    if (!r) continue; x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h);
  }
  return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function exportPDF() {
  const b = contentBounds(); if (!b) return toast('La board è vuota');
  sel.clear(); refreshSel();
  document.body.classList.add('printing');
  const pw = 1050; const s = Math.min(1, pw / (b.w + 40));
  const w = world(); const old = w.style.transform;
  w.style.transform = `translate(${(-b.x + 20) * s}px, ${(-b.y + 20) * s}px) scale(${s})`;
  setTimeout(() => { window.print(); w.style.transform = old; document.body.classList.remove('printing'); updateStageSize(); }, 50);
}
async function exportPNG() {
  const b = contentBounds(); if (!b) return toast('La board è vuota');
  sel.clear(); refreshSel(); toast('Creazione immagine…');
  // serialize visible DOM into an SVG foreignObject
  const pad = 30, W = Math.ceil(b.w + pad * 2), H = Math.ceil(b.h + pad * 2);
  const css = [...document.styleSheets].map(ss => { try { return [...ss.cssRules].map(r => r.cssText).join('\n'); } catch { return ''; } }).join('\n');
  const clone = world().cloneNode(true);
  clone.querySelectorAll('iframe').forEach(f => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;background:#dfe3e6;color:#5d6267;font-size:14px'; d.textContent = '▶ contenuto incorporato'; f.replaceWith(d); });
  const imgs = [...clone.querySelectorAll('img')]; const real = [...world().querySelectorAll('img')];
  await Promise.all(imgs.map(async (im, i) => { try { const src = real[i].src; if (!src.startsWith('blob:')) { im.remove(); return; } const bl = await (await fetch(src)).blob(); im.src = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(bl); }); } catch { im.remove(); } }));
  clone.style.transform = `translate(${-b.x + pad}px, ${-b.y + pad}px)`;
  const xml = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;height:${H}px;position:relative;overflow:hidden;background:#ebedee;font-family:Inter,-apple-system,Helvetica,Arial,sans-serif;font-size:14px;color:#1f2124"><style>${css}</style>${xml}</div></foreignObject></svg>`;
  const img = new Image(); const scale = 2;
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = W * scale; c.height = H * scale; const ctx = c.getContext('2d'); ctx.scale(scale, scale); ctx.drawImage(img, 0, 0);
    c.toBlob(bl => { if (bl) saveBlob(bl, (S.boards[cur].title || 'board') + '.png'); else toast('Esportazione PNG non riuscita'); });
  };
  img.onerror = () => toast('Esportazione PNG non riuscita');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
function presentMode(on) {
  document.body.classList.toggle('present', on);
  if (on) { sel.clear(); refreshSel(); document.documentElement.requestFullscreen?.().catch(() => { }); setTimeout(zoomToFit, 150); toast('Modalità presentazione — Esc per uscire'); }
  else { if (document.fullscreenElement) document.exitFullscreen?.(); setTimeout(updateStageSize, 100); }
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('present')) presentMode(false); });

async function exportAll() {
  if (typeof Sync !== 'undefined') await Sync.fetchMissing(); // con la lavagna condivisa alcuni file possono essere solo sul server
  const files = {};
  for (const k of await DB.keys('files')) { const b = await DB.get('files', k); files[k] = { type: b.type, data: await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }) }; }
  saveBlob(new Blob([JSON.stringify({ app: 'bacheca', v: 1, state: S, files })], { type: 'application/json' }), `bacheca-backup-${new Date().toISOString().slice(0, 10)}.json`);
}
function validBackup(data) {
  const st = data && data.app === 'bacheca' && data.state;
  if (!st || typeof st.boards !== 'object' || !st.boards || !st.boards.home) return false;
  if (typeof st.elements !== 'object' || !st.elements) return false;
  return Object.values(st.elements).every(e => e && typeof e.id === 'string' && typeof e.type === 'string' && typeof e.board === 'string')
    && Object.values(data.files || {}).every(v => v && typeof v.data === 'string' && v.data.startsWith('data:'));
}
async function importAll(f) {
  // 1. si controlla tutto prima di toccare i dati attuali
  let data;
  try { data = JSON.parse(await f.text()); } catch { data = null; }
  if (!validBackup(data)) return toast('File di backup non valido: i dati attuali non sono stati modificati');
  // 2. si caricano i file; 3. solo alla fine si sostituisce lo stato
  try {
    for (const [k, v] of Object.entries(data.files || {})) { const bl = await (await fetch(v.data)).blob(); await DB.put('files', k, bl); if (typeof Sync !== 'undefined') Sync.uploadFile(k); }
  } catch (e) { console.error(e); return toast('Impossibile importare i file del backup: i dati attuali non sono stati modificati'); }
  S = data.state; if (!S.labels) S.labels = {};
  cur = 'home'; urlCache.clear(); hist.stack = []; hist.idx = -1; commit(); closePanel(); openBoard('home'); toast('Backup importato');
}

/* ----------------------------- Zoom ------------------------------- */
function setZoom(z, cx, cy) {
  const r = VP().getBoundingClientRect();
  cx = cx ?? r.left + r.width / 2; cy = cy ?? r.top + r.height / 2;
  const before = toWorld(cx, cy);
  zoom = clamp(z, 0.1, 4);
  updateStageSize();
  VP().scrollLeft = before.x * zoom - (cx - r.left); VP().scrollTop = before.y * zoom - (cy - r.top);
  $('#zoom-val').textContent = Math.round(zoom * 100) + '%';
  updateStageSize(); positionFormatBar();
}
function zoomBy(f, cx, cy) { setZoom(zoom * f, cx, cy); }
function zoomToFit() {
  const b = contentBounds(); if (!b) return setZoom(1);
  const vp = VP(); const z = clamp(Math.min((vp.clientWidth - 80) / b.w, (vp.clientHeight - 80) / b.h), 0.1, 2);
  zoom = z; updateStageSize(); $('#zoom-val').textContent = Math.round(zoom * 100) + '%';
  vp.scrollLeft = (b.x + b.w / 2) * zoom - vp.clientWidth / 2; vp.scrollTop = (b.y + b.h / 2) * zoom - vp.clientHeight / 2;
}

/* ----------------------------- Toast ------------------------------ */
let toastT = null;
function toast(msg, action, fn) {
  const t = $('#toast'); t.innerHTML = ''; t.appendChild(h('span', '', esc(msg)));
  if (action) { const b = h('button', '', action); b.onclick = () => { fn(); t.classList.add('hidden'); }; t.appendChild(b); }
  t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 4500);
}

/* ---------------------------- Keyboard ---------------------------- */
let spaceDown = false;
function onKey(e) {
  const mod = e.metaKey || e.ctrlKey; const k = e.key.toLowerCase();
  if (TBL.st && $('#overlay').classList.contains('hidden') && $('#ctxmenu').classList.contains('hidden') && tKey(e)) return;
  if (e.key === 'Escape') {
    if (overlayEsc) return overlayEsc();
    if (document.body.classList.contains('present')) return presentMode(false);
    if (drawState) return finishDraw();
    if (!$('#ctxmenu').classList.contains('hidden') || !$('#more-menu').classList.contains('hidden') || $('.hdr-menu')) return hidePopups(true);
    if (!$('#panel').classList.contains('hidden')) return closePanel();
    if (isTyping()) { const a = document.activeElement; a.blur(); const n = a.closest('.el'); if (n && E(n.dataset.id)) { sel.clear(); sel.add(n.dataset.id); refreshSel(); } return; }
    sel.clear(); refreshSel(); return;
  }
  if (!$('#overlay').classList.contains('hidden')) return; // overlay handles its own keys
  if (mod && k === 'z' && !isTyping()) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y' && !isTyping()) { e.preventDefault(); redo(); return; }
  if (mod && k === 'f') { e.preventDefault(); openPanel('search'); return; }
  if (mod && (k === '=' || k === '+')) { e.preventDefault(); zoomBy(1.2); return; }
  if (mod && k === '-') { e.preventDefault(); zoomBy(1 / 1.2); return; }
  if (mod && k === '0') { e.preventDefault(); setZoom(1); return; }
  if (mod && e.key === 'ArrowUp' && !isTyping()) { e.preventDefault(); const p = S.boards[cur].parent; if (p) openBoard(p); return; }
  if (mod && k === 'k' && editing) { e.preventDefault(); execFmt('link'); return; }
  if (mod && e.shiftKey && k === 'x' && isTyping()) { e.preventDefault(); document.execCommand('strikeThrough'); return; }
  if (isTyping() || (e.target && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)))) return;
  if (e.key === ' ' && !spaceDown) { spaceDown = true; VP().style.cursor = 'grab'; e.preventDefault(); return; }
  if (mod && k === 'a') { e.preventDefault(); boardEls().forEach(x => { if (!x.col) sel.add(x.id); }); refreshSel(); return; }
  if (mod && k === 'c') { if (copySel(false)) e.preventDefault(); return; }
  if (mod && k === 'x') { if (copySel(true)) e.preventDefault(); return; }
  if (mod && k === 'd') { e.preventDefault(); if (sel.size) duplicate([...sel]); return; }
  if (mod && e.key === ']') { e.preventDefault(); [...sel].forEach(id => E(id).z = nextZ()); commit(); render(); return; }
  if (mod && e.key === '[') { e.preventDefault(); const mz = Math.min(...Object.values(S.elements).map(x => x.z || 0)); [...sel].forEach((id, i) => E(id).z = mz - sel.size + i); commit(); render(); return; }
  if (mod && e.shiftKey && k === 'l') { e.preventDefault(); const els = [...sel].map(E); const all = els.every(x => x.locked); els.forEach(x => x.locked = !all); commit(); render(); return; }
  if ((e.key === 'Backspace' || e.key === 'Delete') && sel.size) { e.preventDefault(); removeElements([...sel]); return; }
  if (e.key === 'Enter' && sel.size === 1) { const el = E([...sel][0]); e.preventDefault(); if (el.type === 'board') openBoard(el.target); else if (el.type === 'document') openDocument(el); else if (el.type === 'sketch') openSketch(el); else enterEdit(el); return; }
  if (e.key.startsWith('Arrow') && sel.size) {
    e.preventDefault(); const d = e.shiftKey ? 10 : 1; const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
    [...sel].forEach(id => { const x = E(id); if (x.locked || x.col) return; if (x.type === 'line') { if (!x.a) { x.x1 += dx; x.y1 += dy; } if (!x.b) { x.x2 += dx; x.y2 += dy; } } else { x.x = Math.max(0, x.x + dx); x.y = Math.max(0, x.y + dy); } });
    render(); clearTimeout(onKey.t); onKey.t = setTimeout(commit, 400); return;
  }
  if (e.shiftKey && e.key === '!') { zoomToFit(); return; }
  if (mod || e.altKey) return;
  const map = { n: 'note', h: 'heading', t: 'todo', b: 'board', c: 'column', k: 'link', l: 'line', d: 'draw' };
  if (map[k]) { e.preventDefault(); const p = lastMouse ? toWorld(lastMouse.x, lastMouse.y) : null; const vr = VP().getBoundingClientRect(); const inside = lastMouse && lastMouse.x > vr.left && lastMouse.y > vr.top; addElement(map[k], inside ? { x: Math.max(0, p.x - 20), y: Math.max(0, p.y - 20) } : null); }
}
let lastMouse = null;

/* ----------------------------- Paste / drop ----------------------- */
async function onPaste(e) {
  if (isTyping()) {
    // paste plain text into simple editables
    const a = document.activeElement;
    if (a.isContentEditable && !a.classList.contains('text') && !a.classList.contains('doc-body')) { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }
    else if (a.isContentEditable) { // strip foreign styles but keep basic formatting
      const html = e.clipboardData.getData('text/html');
      if (html) { e.preventDefault(); document.execCommand('insertHTML', false, sanitizeHtml(html)); }
    }
    return;
  }
  if (TBL.st && !TBL.st.editing) { e.preventDefault(); const tx = e.clipboardData?.getData('text/plain') || ''; if (tx) tPaste(tx); return; }
  const files = [...(e.clipboardData?.files || [])];
  const at = lastMouse && lastMouse.x > 65 ? (p => ({ x: Math.max(0, p.x - 20), y: Math.max(0, p.y - 20) }))(toWorld(lastMouse.x, lastMouse.y)) : nextSpot();
  if (files.length) { e.preventDefault(); return addFiles(files, at); }
  const text = e.clipboardData?.getData('text/plain') || '';
  if (clip && text.startsWith('⁣BACHECA⁣')) { e.preventDefault(); return pasteClip(); }
  if (!text.trim()) { if (clip) pasteClip(); return; }
  e.preventDefault();
  const t = text.trim();
  if (/^https?:\/\/\S+$/i.test(t)) {
    if (/youtube\.com|youtu\.be|vimeo\.com/.test(t)) { const el = makeEl('video', at.x, at.y, { url: t }); sel.clear(); sel.add(el.id); }
    else { const el = makeEl('link', at.x, at.y, { url: t, title: prettyHost(t) }); sel.clear(); sel.add(el.id); }
  } else if (/\t/.test(t) && t.includes('\n')) { // spreadsheet → table
    const rows = parseDelimited(t, '\t');
    const el = makeEl('table', at.x, at.y, { rows, colW: Array(rows[0].length).fill(Math.max(80, Math.floor(338 / rows[0].length))), headerRow: true }); sel.clear(); sel.add(el.id);
  } else {
    const el = makeEl('note', at.x, at.y, { html: esc(t).split(/\r?\n/).map(l => `<div>${l || '<br>'}</div>`).join('') }); sel.clear(); sel.add(el.id);
  }
  render(); commit();
}
function sanitizeHtml(html) {
  const d = document.createElement('div'); d.innerHTML = html;
  d.querySelectorAll('script,style,meta,link,iframe,object').forEach(n => n.remove());
  d.querySelectorAll('*').forEach(n => { [...n.attributes].forEach(a => { if (!(n.tagName === 'A' && a.name === 'href')) n.removeAttribute(a.name); }); if (n.tagName === 'A' && /^javascript:/i.test(n.getAttribute('href') || '')) n.removeAttribute('href'); });
  return d.innerHTML;
}

/* ------------------------------ Init ------------------------------ */
async function init() {
  // extra DOM: contextual toolbar, header action buttons
  const ct = h('div'); ct.id = 'ctxbar'; $('#toolbar').appendChild(ct);

  await DB.open();
  S = (await DB.get('kv', 'state')) || seedState();
  if (!S.labels) S.labels = {};
  if (typeof Sync !== 'undefined') { await Sync.start(); Sync.afterInit(); } // lavagna condivisa sul server, se c'è
  await cleanupFiles(); // prima di attivare l'interfaccia: nessun file nuovo può arrivare nel frattempo
  const fromHash = location.hash.replace('#/', '');
  cur = S.boards[fromHash] ? fromHash : 'home';
  commit();

  // toolbar
  $$('#toolbar .tool[data-tool], #more-menu .tool[data-tool]').forEach(t => t.addEventListener('pointerdown', ev => onToolDown(ev, t.dataset.tool)));
  $('#tool-more').addEventListener('click', e => { e.stopPropagation(); const m = $('#more-menu'); const show = m.classList.contains('hidden'); hidePopups(); if (show) { const r = $('#tool-more').getBoundingClientRect(); m.style.top = Math.min(r.top - 20, innerHeight - 220) + 'px'; m.classList.remove('hidden'); $('#tool-more').classList.add('active'); } });
  $('#tool-trash').addEventListener('click', () => openPanel('trash'));
  $('#draw-done').onclick = () => finishDraw();
  // header
  $('#btn-undo').onclick = undo; $('#btn-redo').onclick = redo;
  $('#btn-search').onclick = () => openPanel('search'); $('#btn-help').onclick = () => openPanel('help');
  $('#btn-notif').onclick = () => openPanel('notif'); $('#btn-settings').onclick = () => openPanel('settings');
  $('#btn-export').onclick = e => { e.stopPropagation(); exportMenu(e.currentTarget); };
  $('#btn-view').onclick = e => { e.stopPropagation(); viewMenu(e.currentTarget); };
  $('#zoom-in').onclick = () => zoomBy(1.2); $('#zoom-out').onclick = () => zoomBy(1 / 1.2); $('#zoom-val').onclick = () => setZoom(1);
  const bt = $('#board-title');
  bt.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); bt.blur(); } e.stopPropagation(); });
  bt.addEventListener('input', () => { S.boards[cur].title = bt.textContent; const c = boardCardOf(cur); if (c) { const n = nodes.get(c.id); } });
  bt.addEventListener('blur', () => { const b = S.boards[cur]; b.title = bt.textContent.trim() || 'Senza titolo'; bt.textContent = b.title; renderChrome(); commit(); });

  // canvas
  document.addEventListener('pointerdown', ev => { if (!ev.target.closest('#ctxmenu, #more-menu, #panel, .hdr-menu, #tool-more, #formatbar, #toast, #overlay, #ctxbar')) hidePopups(true); if (!ev.target.closest('#panel, #topbar')) closePanel(); });
  VP().addEventListener('pointerdown', onPointerDown);
  addEventListener('pointermove', ev => { lastMouse = { x: ev.clientX, y: ev.clientY }; onPointerMove(ev); });
  addEventListener('pointerup', finishPointer);
  addEventListener('pointercancel', finishPointer);
  VP().addEventListener('dblclick', ev => {
    if (drawState) return;
    const n = ev.target.closest('.el');
    if (n) { const el = E(n.dataset.id); if (el?.type === 'image' && ev.target.tagName === 'IMG' || el?.type === 'image' && !ev.target.closest('.caption')) openLightbox(el); if (el?.type === 'link' && el.url && !ev.target.closest('.link-title')) window.open(el.url, '_blank', 'noopener'); return; }
    if (ev.target.closest('.line-svg, .lh')) return;
    const p = toWorld(ev.clientX, ev.clientY); addElement('note', { x: Math.max(0, p.x - 20), y: Math.max(0, p.y - 20) });
  });
  VP().addEventListener('contextmenu', ev => {
    // in a text field keep the system menu (on phones a long press is how you get "Paste")
    if (ev.target.closest('input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]')) return;
    ev.preventDefault();
    const cell = ev.target.closest('.tbl td');
    const n = ev.target.closest('.line-svg') || ev.target.closest('.el');
    if (cell && n) {
      const id = n.dataset.id, r = +cell.dataset.r, c = +cell.dataset.c;
      if (!TBL.active(id)) tEnter(id, r, c);
      else { const { r0, r1, c0, c1 } = TBL.rect(); if (r < r0 || r > r1 || c < c0 || c > c1) { TBL.st.ar = TBL.st.fr = r; TBL.st.ac = TBL.st.fc = c; tPaint(); } }
      return menuAt(ev.clientX, ev.clientY, m => tCellMenu(m));
    }
    if (n) { const id = n.dataset.id; if (!sel.has(id)) { sel.clear(); sel.add(id); refreshSel(); } return showElementMenu(ev.clientX, ev.clientY, [...sel]); }
    showCanvasMenu(ev.clientX, ev.clientY, (p => ({ x: Math.max(0, p.x - 20), y: Math.max(0, p.y - 20) }))(toWorld(ev.clientX, ev.clientY)));
  });
  VP().addEventListener('wheel', ev => { if (ev.ctrlKey || ev.metaKey) { ev.preventDefault(); zoomBy(Math.exp(-ev.deltaY * 0.01), ev.clientX, ev.clientY); } }, { passive: false });
  VP().addEventListener('scroll', () => { updateStageSize(); positionFormatBar(); });
  VP().addEventListener('dragover', e => { e.preventDefault(); });
  VP().addEventListener('drop', e => {
    e.preventDefault(); const p = toWorld(e.clientX, e.clientY); const at = { x: Math.max(0, p.x - 20), y: Math.max(0, p.y - 20) };
    const files = [...e.dataTransfer.files];
    if (files.length) { const t = columnAt(e.clientX, e.clientY); addFiles(files, at).then(() => { if (t) { insertIntoColumn([...sel], t.col, t.idx); render(); commit(); } }); return; }
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url) { const isUrl = /^https?:\/\//.test(url.trim()); const el = makeEl(isUrl ? 'link' : 'note', at.x, at.y, isUrl ? { url: url.trim(), title: prettyHost(url.trim()) } : { html: esc(url) }); sel.clear(); sel.add(el.id); render(); commit(); }
  });
  addEventListener('keydown', onKey);
  addEventListener('keyup', e => { if (e.key === ' ') { spaceDown = false; VP().style.cursor = ''; } });
  addEventListener('paste', onPaste);
  addEventListener('copy', e => { if (TBL.st && !TBL.st.editing) { e.preventDefault(); tCopy(false); return; } if (!isTyping() && sel.size) { copySel(false); e.preventDefault(); } });
  addEventListener('resize', () => { updateStageSize(); positionFormatBar(); });
  addEventListener('popstate', () => { const id = location.hash.replace('#/', '') || 'home'; if (id !== cur) openBoard(S.boards[id] ? id : 'home'); });
  addEventListener('beforeunload', () => { clearTimeout(saveTimer); if (S) DB.put('kv', 'state', S).catch(() => { }); });
  // sul telefono la pagina può essere chiusa senza beforeunload: si salva appena va in secondo piano
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && saveTimer && S) (typeof saveNow === 'function' ? saveNow() : DB.put('kv', 'state', S)); });
  document.addEventListener('selectionchange', () => { if (editing) positionFormatBar(); });

  history.replaceState(null, '', '#/' + cur);
  const sc = S.boards[cur].scroll; zoom = sc?.z || 1; $('#zoom-val').textContent = Math.round(zoom * 100) + '%';
  fullRender(); applyGrid(); updateTrashBadge();
  if (sc) { VP().scrollLeft = sc.x; VP().scrollTop = sc.y; }
  // periodically refresh positions of lines attached to elements whose height changes (typing, images)
  new ResizeObserver(() => updateLines()).observe(world());
  addEventListener('input', () => requestAnimationFrame(updateLines), true);
  if (typeof initFeatures === 'function') initFeatures();
}

function seedState() {
  S = freshState(); cur = 'home';
  return S;
}

window._orig = { openBoard, addElement, updateLines, renderChrome, openPanel };
window._origOpenPanel = openPanel;
document.addEventListener('DOMContentLoaded', init);
