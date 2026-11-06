'use strict';
/* =====================================================================
   Tabelle stile foglio di calcolo: modalità cella, selezione intervalli,
   maniglia di riempimento, formule, tipi di cella, stili, import CSV/XLSX
   ===================================================================== */

const colName = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const colIndex = s => { let n = 0; for (const ch of s.toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
const TEXT_COLORS = [null, '#4b7bf5', '#3f9b5b', '#e07b20', '#d33b2f', '#7d5ce6', '#8a8f94'];
const HL_COLORS = ['#2f3337', '#cfe0fd', '#d5f0c8', '#fde9a6', '#fbd5e8', '#e3e5e7'];
const CELL_BG = [null, '#d7d9db', '#f9d9d5', '#fbe4c6', '#fdf3b8', '#d9f0cf', '#cdeee9', '#d3e6fb', '#dcd8f7', '#f3d6ec', '#2f3337'];

function tNormalize(el) {
  el.styles = el.styles || {};
  el.rowH = el.rowH || {};
  const cols = Math.max(1, ...el.rows.map(r => r.length));
  el.rows.forEach(r => { while (r.length < cols) r.push(''); });
  while (el.colW.length < cols) el.colW.push(120);
  el.colW.length = cols;
  // legacy header flag → style row 0
  if (el.headerRow == null) el.headerRow = !!el.header; delete el.header;
}
const stKey = (r, c) => `${r},${c}`;
const getSt = (el, r, c) => el.styles[stKey(r, c)] || {};
function setSt(el, r, c, patch) { const k = stKey(r, c); const s = { ...(el.styles[k] || {}), ...patch }; for (const x in s) if (s[x] == null || s[x] === false) delete s[x]; if (Object.keys(s).length) el.styles[k] = s; else delete el.styles[k]; }

/* ----------------------------- Formulas ---------------------------- */
const FN = {
  SUM: a => flat(a).filter(isNum).reduce((s, x) => s + x, 0),
  AVERAGE: a => { const n = flat(a).filter(isNum); return n.length ? n.reduce((s, x) => s + x, 0) / n.length : err('#DIV/0!'); },
  MEDIA: a => FN.AVERAGE(a),
  MIN: a => { const n = flat(a).filter(isNum); return n.length ? Math.min(...n) : 0; },
  MAX: a => { const n = flat(a).filter(isNum); return n.length ? Math.max(...n) : 0; },
  COUNT: a => flat(a).filter(isNum).length,
  COUNTA: a => flat(a).filter(x => x !== '' && x != null).length,
  PRODUCT: a => flat(a).filter(isNum).reduce((s, x) => s * x, 1),
  MEDIAN: a => { const n = flat(a).filter(isNum).sort((x, y) => x - y); if (!n.length) return 0; const m = n.length >> 1; return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2; },
  ROUND: a => { const p = Math.pow(10, num(a[1] ?? 0)); return Math.round(num(a[0]) * p) / p; },
  ABS: a => Math.abs(num(a[0])), SQRT: a => Math.sqrt(num(a[0])), POWER: a => Math.pow(num(a[0]), num(a[1])), MOD: a => num(a[0]) % num(a[1]),
  INT: a => Math.floor(num(a[0])),
  IF: a => (truthy(a[0]) ? a[1] : (a[2] ?? false)),
  AND: a => flat(a).every(truthy), OR: a => flat(a).some(truthy), NOT: a => !truthy(a[0]),
  CONCAT: a => flat(a).map(str).join(''), CONCATENATE: a => flat(a).map(str).join(''),
  LEN: a => str(a[0]).length, UPPER: a => str(a[0]).toUpperCase(), LOWER: a => str(a[0]).toLowerCase(), TRIM: a => str(a[0]).trim(),
  LEFT: a => str(a[0]).slice(0, num(a[1] ?? 1)), RIGHT: a => { const s = str(a[0]); return s.slice(Math.max(0, s.length - num(a[1] ?? 1))); },
  TODAY: () => new Date().toISOString().slice(0, 10), NOW: () => new Date().toLocaleString('it-IT'),
  COUNTIF: a => { const t = a[1]; return flat([a[0]]).filter(x => matchCrit(x, t)).length; },
  SUMIF: a => { const r = flat([a[0]]), s = a[2] != null ? flat([a[2]]) : r; return r.reduce((acc, x, i) => acc + (matchCrit(x, a[1]) && isNum(s[i]) ? s[i] : 0), 0); },
};
FN.SOMMA = FN.SUM; FN.CONTA = FN.COUNT; FN.SE = FN.IF;
const FN_LIST = ['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'COUNTA', 'MEDIAN', 'PRODUCT', 'ROUND', 'IF', 'COUNTIF', 'SUMIF', 'CONCAT', 'LEN', 'UPPER', 'LOWER', 'ABS', 'TODAY'];
function err(e) { const x = new Error(e); x.cellErr = e; throw x; }
function flat(a) { const out = []; (function f(v) { if (Array.isArray(v)) v.forEach(f); else out.push(v); })(a); return out; }
const isNum = x => typeof x === 'number' && isFinite(x);
function num(x) { if (Array.isArray(x)) x = flat(x)[0]; if (typeof x === 'number') return x; if (typeof x === 'boolean') return +x; if (x === '' || x == null) return 0; const n = parseNumber(x); return n == null ? err('#VALUE!') : n; }
const str = x => (x == null ? '' : typeof x === 'boolean' ? (x ? 'TRUE' : 'FALSE') : String(x));
const truthy = x => (typeof x === 'string' ? x !== '' && x.toUpperCase() !== 'FALSE' : !!x);
function matchCrit(x, c) {
  const m = String(c).match(/^(<=|>=|<>|<|>|=)?(.*)$/); const op = m[1] || '=', v = m[2]; const n = parseNumber(v);
  const a = isNum(x) ? x : parseNumber(x) ?? x;
  const b = n != null ? n : v;
  switch (op) { case '=': return String(a).toLowerCase() === String(b).toLowerCase(); case '<>': return String(a) !== String(b); case '<': return a < b; case '>': return a > b; case '<=': return a <= b; case '>=': return a >= b; }
}
function parseNumber(s) {
  if (typeof s === 'number') return s;
  s = String(s).trim().replace(/[€$£\s]/g, '');
  if (/^-?\d+(\.\d+)?%$/.test(s)) return parseFloat(s) / 100;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return parseFloat(s.replace(/,/g, ''));
  if (/^-?\d+,\d+$/.test(s)) return parseFloat(s.replace(',', '.'));
  if (/^-?\d*\.?\d+(e[-+]?\d+)?$/i.test(s)) return parseFloat(s);
  return null;
}
function tokenize(src) {
  const t = []; let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    let m;
    const rest = src.slice(i);
    if ((m = rest.match(/^\$?([A-Za-z]{1,3})\$?(\d+)(?::\$?([A-Za-z]{1,3})\$?(\d+))?/)) && !/^[A-Za-z]+\(/.test(rest.slice(0, m[0].length + 1).replace(/\d+\($/, ''))) {
      // make sure it's not a function name like LOG10(
      if (!/^[A-Za-z]{1,3}\d+\(/.test(rest)) { t.push({ k: m[3] ? 'range' : 'ref', v: m }); i += m[0].length; continue; }
    }
    if ((m = rest.match(/^\d*\.?\d+(e[-+]?\d+)?%?/i))) { let v = parseFloat(m[0]); if (m[0].endsWith('%')) v /= 100; t.push({ k: 'num', v }); i += m[0].length; continue; }
    if (ch === '"') { let j = i + 1, s = ''; while (j < src.length && src[j] !== '"') s += src[j++]; t.push({ k: 'str', v: s }); i = j + 1; continue; }
    if ((m = rest.match(/^[A-Za-z_][A-Za-z0-9_.]*/))) { const w = m[0].toUpperCase(); if (w === 'TRUE' || w === 'FALSE') t.push({ k: 'bool', v: w === 'TRUE' }); else t.push({ k: 'name', v: w }); i += m[0].length; continue; }
    if ((m = rest.match(/^(<=|>=|<>|[-+*/^&=<>(),;])/))) { t.push({ k: 'op', v: m[0] === ';' ? ',' : m[0] }); i += m[0].length; continue; }
    err('#ERR');
  }
  return t;
}
function evalFormula(el, src, visiting) {
  const toks = tokenize(src); let p = 0;
  const peek = () => toks[p], next = () => toks[p++];
  const expect = v => { const t = next(); if (!t || t.v !== v) err('#ERR'); };
  const cellVal = (r, c) => {
    if (r < 0 || c < 0 || r >= el.rows.length || c >= el.colW.length) err('#REF!');
    const k = stKey(r, c); if (visiting.has(k)) err('#CIRC!');
    return cellValue(el, r, c, visiting);
  };
  const comparison = () => { let a = concat(); while (peek() && ['=', '<', '>', '<=', '>=', '<>'].includes(peek().v)) { const op = next().v; const b = concat(); const x = isNum(a) && isNum(b) ? [a, b] : [str(a).toLowerCase(), str(b).toLowerCase()]; a = op === '=' ? x[0] === x[1] : op === '<>' ? x[0] !== x[1] : op === '<' ? x[0] < x[1] : op === '>' ? x[0] > x[1] : op === '<=' ? x[0] <= x[1] : x[0] >= x[1]; } return a; };
  const concat = () => { let a = additive(); while (peek()?.v === '&') { next(); a = str(a) + str(additive()); } return a; };
  const additive = () => { let a = term(); while (peek() && (peek().v === '+' || peek().v === '-')) { const op = next().v; const b = term(); a = op === '+' ? num(a) + num(b) : num(a) - num(b); } return a; };
  const term = () => { let a = power(); while (peek() && (peek().v === '*' || peek().v === '/')) { const op = next().v; const b = power(); if (op === '/' && num(b) === 0) err('#DIV/0!'); a = op === '*' ? num(a) * num(b) : num(a) / num(b); } return a; };
  const power = () => { let a = unary(); while (peek()?.v === '^') { next(); a = Math.pow(num(a), num(unary())); } return a; };
  const unary = () => { if (peek()?.v === '-') { next(); return -num(unary()); } if (peek()?.v === '+') { next(); return num(unary()); } return primary(); };
  const primary = () => {
    const t = next(); if (!t) err('#ERR');
    if (t.k === 'num' || t.k === 'str' || t.k === 'bool') return t.v;
    if (t.k === 'ref') return cellVal(+t.v[2] - 1, colIndex(t.v[1]));
    if (t.k === 'range') {
      const r0 = +t.v[2] - 1, c0 = colIndex(t.v[1]), r1 = +t.v[4] - 1, c1 = colIndex(t.v[3]); const out = [];
      for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) { if (r >= el.rows.length || c >= el.colW.length) continue; out.push(cellVal(r, c)); }
      return out;
    }
    if (t.k === 'name') {
      const f = FN[t.v]; if (!f) err('#NAME?');
      expect('('); const args = [];
      if (peek()?.v !== ')') { args.push(comparison()); while (peek()?.v === ',') { next(); args.push(comparison()); } }
      expect(')'); return f(args);
    }
    if (t.v === '(') { const v = comparison(); expect(')'); return v; }
    err('#ERR');
  };
  const v = comparison(); if (p < toks.length) err('#ERR');
  return Array.isArray(v) ? flat(v)[0] ?? '' : v;
}
function cellValue(el, r, c, visiting = new Set()) {
  const raw = el.rows[r]?.[c] ?? '';
  if (typeof raw === 'string' && raw.startsWith('=') && raw.length > 1) {
    const k = stKey(r, c); visiting.add(k);
    try { return evalFormula(el, raw.slice(1), visiting); } catch (e) { return { error: e.cellErr || '#ERR' }; } finally { visiting.delete(k); }
  }
  const st = getSt(el, r, c);
  if (st.type === 'text') return raw;
  if (st.type === 'checkbox') return raw === 'TRUE';
  const n = autoNumber(raw);
  return n != null ? n : raw;
}
function autoNumber(raw) {
  if (raw === '' || raw == null) return null;
  const s = String(raw).trim();
  if (/^0\d/.test(s.replace(/^[-+]/, ''))) return null; // keep phone numbers / codes as text
  return parseNumber(s);
}
function formatValue(el, r, c, v) {
  if (v && v.error) return { text: v.error, cls: 'err' };
  const st = getSt(el, r, c); const t = st.type || 'auto'; const dec = st.dec;
  if (t === 'checkbox') return { checkbox: true, checked: v === true || v === 'TRUE' };
  if (typeof v === 'boolean') return { text: v ? 'TRUE' : 'FALSE' };
  if (!isNum(v)) {
    if (t === 'date' && v) { const d = new Date(v); if (!isNaN(d)) return { text: fmtDateCell(d, st.fmt) }; }
    return { text: str(v) };
  }
  const nf = (x, d) => x.toLocaleString('it-IT', d == null ? { maximumFractionDigits: 10 } : { minimumFractionDigits: d, maximumFractionDigits: d });
  switch (t) {
    case 'number': return { text: nf(v, dec ?? 2), num: true };
    case 'currency': { const sym = st.cur || '€'; const s = nf(Math.abs(v), dec ?? 2); return { text: (v < 0 ? '-' : '') + (sym === '€' ? s + ' €' : sym + s), num: true }; }
    case 'percent': return { text: nf(v * 100, dec ?? 0) + '%', num: true };
    case 'date': { const d = new Date(Math.round((v - 25569) * 86400000)); return { text: fmtDateCell(d, st.fmt) }; }
    case 'text': return { text: str(el.rows[r][c]) };
    default: { const raw = el.rows[r][c]; return { text: String(raw).startsWith('=') ? nf(Math.round(v * 1e10) / 1e10) : str(raw), num: true }; }
  }
}
function fmtDateCell(d, fmt) {
  if (fmt === 'long') return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  if (fmt === 'datetime') return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (fmt === 'time') return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('it-IT');
}
// shift relative references in a formula by dr/dc (for fill & paste)
function shiftFormula(f, dr, dc) {
  return f.replace(/("[^"]*")|(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![\d(])/g, (m, q, d1, col, d2, row) => {
    if (q) return q;
    const c = d1 ? col : colName(Math.max(0, colIndex(col) + dc));
    const r = d2 ? row : Math.max(1, +row + dr);
    return `${d1}${c.toUpperCase ? c.toUpperCase() : c}${d2}${r}`;
  });
}

/* ----------------------------- State ------------------------------- */
const TBL = {
  st: null, // { id, ar, ac, fr, fc, editing, ed }
  active(id) { return this.st && this.st.id === id; },
  rect() { const s = this.st; return { r0: Math.min(s.ar, s.fr), r1: Math.max(s.ar, s.fr), c0: Math.min(s.ac, s.fc), c1: Math.max(s.ac, s.fc) }; },
};

function tEnter(id, r, c) {
  const el = E(id); if (!el) return;
  if (TBL.st && TBL.st.id !== id) tExit();
  TBL.st = { id, ar: r, ac: c, fr: r, fc: c, editing: false };
  sel.clear(); sel.add(id);
  blurEditing();
  nodes.get(id)?.classList.add('cellmode');
  refreshSel(); tPaint();
}
function tExit() {
  if (!TBL.st) return;
  if (TBL.st.editing) tCommitEdit();
  const n = nodes.get(TBL.st.id); n?.classList.remove('cellmode'); $$('.tsel, .tfill', n || document).forEach(x => x.remove());
  $$('.thdr-on', n || document).forEach(x => x.classList.remove('thdr-on'));
  TBL.st = null; updateCtxToolbar();
}
function cellNode(id, r, c) { return $(`td[data-r="${r}"][data-c="${c}"]`, nodes.get(id)); }

function tPaint() {
  const s = TBL.st; if (!s) return;
  const n = nodes.get(s.id); if (!n) { TBL.st = null; return; }
  n.classList.add('cellmode');
  const wrap = $('.tbl-wrap', n);
  $$('.tsel, .tfill', wrap).forEach(x => x.remove());
  $$('.thdr-on', n).forEach(x => x.classList.remove('thdr-on'));
  const { r0, r1, c0, c1 } = TBL.rect();
  const a = cellNode(s.id, r0, c0), b = cellNode(s.id, r1, c1); if (!a || !b) return;
  const box = h('div', 'tsel'); box.classList.toggle('multi', r0 !== r1 || c0 !== c1); box.style.left = a.offsetLeft + 'px'; box.style.top = a.offsetTop + 'px';
  box.style.width = (b.offsetLeft + b.offsetWidth - a.offsetLeft) + 'px'; box.style.height = (b.offsetTop + b.offsetHeight - a.offsetTop) + 'px';
  wrap.appendChild(box);
  if (!s.editing) { const f = h('div', 'tfill'); f.style.left = (b.offsetLeft + b.offsetWidth) + 'px'; f.style.top = (b.offsetTop + b.offsetHeight) + 'px'; f.title = 'Trascina per riempire'; wrap.appendChild(f); }
  $$('.tbl-colhdr span', n).forEach((x, i) => x.classList.toggle('thdr-on', i >= c0 && i <= c1));
  $$('.tbl-rowhdr span', n).forEach((x, i) => x.classList.toggle('thdr-on', i >= r0 && i <= r1));
  $$('td.anchor', n).forEach(x => x.classList.remove('anchor'));
  cellNode(s.id, s.ar, s.ac)?.classList.add('anchor');
  updateCtxToolbar();
}

/* --------------------------- Build table --------------------------- */
BUILD.table = function (el, card) {
  tNormalize(el);
  card.appendChild(h('div', 'tbl-grip'));
  const wrap = h('div', 'tbl-wrap');
  const t = h('table', 'tbl');
  const cg = h('colgroup'); el.colW.forEach(w => { const c = h('col'); c.style.width = w + 'px'; cg.appendChild(c); }); t.appendChild(cg);
  el.rows.forEach((row, r) => {
    const tr = h('tr'); if (el.rowH[r]) tr.style.height = el.rowH[r] + 'px';
    row.forEach((raw, c) => {
      const td = h('td'); td.dataset.r = r; td.dataset.c = c; if (r === 0 && el.headerRow) td.classList.add('hdr');
      const st = getSt(el, r, c);
      const v = formatValue(el, r, c, cellValue(el, r, c));
      const inner = h('div', 'cv');
      if (v.checkbox) { const cb = h('span', 'tcb' + (v.checked ? ' on' : '')); cb.dataset.cb = '1'; inner.appendChild(cb); }
      else if (/^https?:\/\/\S+$/.test(v.text)) { const a = h('a'); a.href = v.text; a.target = '_blank'; a.rel = 'noopener'; a.textContent = v.text; inner.appendChild(a); }
      else inner.textContent = v.text;
      if (v.cls) td.classList.add(v.cls);
      if (st.bg) { td.style.background = st.bg; if (st.bg === '#2f3337') inner.style.color = '#fff'; }
      if (st.color) inner.style.color = st.color;
      if (st.hl) { inner.innerHTML = `<mark style="background:${st.hl};${st.hl === '#2f3337' ? 'color:#fff' : ''}">${inner.innerHTML}</mark>`; }
      if (st.bold) inner.style.fontWeight = '700';
      if (st.italic) inner.style.fontStyle = 'italic';
      if (st.strike) inner.style.textDecoration = 'line-through';
      inner.style.textAlign = st.align || (v.num ? 'right' : 'left');
      td.style.verticalAlign = st.valign || 'top';
      td.appendChild(inner); tr.appendChild(td);
    });
    t.appendChild(tr);
  });
  wrap.appendChild(t); card.appendChild(wrap);
  // column headers A B C (with resizers) and row numbers
  const ch = h('div', 'tbl-colhdr');
  el.colW.forEach((w, i) => { const s = h('span', '', colName(i)); s.dataset.c = i; s.style.width = w + 'px'; const rz = h('i', 'colrz'); rz.dataset.c = i; s.appendChild(rz); ch.appendChild(s); });
  const rh = h('div', 'tbl-rowhdr');
  card.append(ch, rh);
  const sync = () => { rh.innerHTML = ''; $$('tr', t).forEach((tr, i) => { const s = h('span', '', i + 1); s.dataset.r = i; s.style.height = tr.offsetHeight + 'px'; const rz = h('i', 'rowrz'); rz.dataset.r = i; s.appendChild(rz); rh.appendChild(s); }); if (TBL.active(el.id)) tPaint(); };
  requestAnimationFrame(sync);
  const ar = h('button', 'tbl-add r no-drag', '+'); ar.title = 'Aggiungi riga'; ar.onclick = () => tableOp(el, 'rowBelow', el.rows.length - 1, 0);
  const ac = h('button', 'tbl-add c no-drag', '+'); ac.title = 'Aggiungi colonna'; ac.onclick = () => tableOp(el, 'colRight', 0, el.colW.length - 1);
  card.append(ar, ac);
};

function tRebuild(el) { const s = TBL.st; if (s) { s.editing = false; s.ed = null; } rebuild(el); if (s && s.id === el.id) { TBL.st = s; nodes.get(el.id)?.classList.add('cellmode'); requestAnimationFrame(tPaint); } }

/* ---------------------------- Operations --------------------------- */
function tableOp(el, op, r, c, count = 1) {
  tNormalize(el);
  const cols = el.colW.length;
  const shiftStyles = (fn) => { const ns = {}; for (const [k, v] of Object.entries(el.styles)) { const [rr, cc] = k.split(',').map(Number); const nk = fn(rr, cc); if (nk) ns[nk] = v; } el.styles = ns; };
  const shiftRowH = (fn) => { const nh = {}; for (const [k, v] of Object.entries(el.rowH)) { const nk = fn(+k); if (nk != null) nh[nk] = v; } el.rowH = nh; };
  switch (op) {
    case 'rowAbove': case 'rowBelow': {
      const at = op === 'rowAbove' ? r : r + 1;
      for (let i = 0; i < count; i++) el.rows.splice(at, 0, Array(cols).fill(''));
      shiftStyles((rr, cc) => `${rr >= at ? rr + count : rr},${cc}`); shiftRowH(rr => rr >= at ? rr + count : rr); break;
    }
    case 'colLeft': case 'colRight': {
      const at = op === 'colLeft' ? c : c + 1;
      el.rows.forEach(row => { for (let i = 0; i < count; i++) row.splice(at, 0, ''); });
      for (let i = 0; i < count; i++) el.colW.splice(at, 0, 120);
      shiftStyles((rr, cc) => `${rr},${cc >= at ? cc + count : cc}`); break;
    }
    case 'delRow': {
      const n = Math.min(count, el.rows.length - 1); if (n <= 0) return toast('La tabella deve avere almeno una riga');
      el.rows.splice(r, n); shiftStyles((rr, cc) => rr >= r && rr < r + n ? null : `${rr >= r + n ? rr - n : rr},${cc}`); shiftRowH(rr => rr >= r && rr < r + n ? null : rr >= r + n ? rr - n : rr); break;
    }
    case 'delCol': {
      const n = Math.min(count, cols - 1); if (n <= 0) return toast('La tabella deve avere almeno una colonna');
      el.rows.forEach(row => row.splice(c, n)); el.colW.splice(c, n); shiftStyles((rr, cc) => cc >= c && cc < c + n ? null : `${rr},${cc >= c + n ? cc - n : cc}`); break;
    }
    case 'header': el.headerRow = !el.headerRow; break;
    case 'clear': el.rows = el.rows.map(row => row.map(() => '')); break;
  }
  touch(el);
  if (TBL.active(el.id)) { const s = TBL.st; s.ar = clamp(s.ar, 0, el.rows.length - 1); s.fr = clamp(s.fr, 0, el.rows.length - 1); s.ac = clamp(s.ac, 0, el.colW.length - 1); s.fc = clamp(s.fc, 0, el.colW.length - 1); }
  tRebuild(el); commit();
}
function tSelOp(op) {
  const el = E(TBL.st.id); const { r0, r1, c0, c1 } = TBL.rect();
  switch (op) {
    case 'rowAbove': return tableOp(el, 'rowAbove', r0, c0, r1 - r0 + 1);
    case 'rowBelow': return tableOp(el, 'rowBelow', r1, c0, r1 - r0 + 1);
    case 'colLeft': return tableOp(el, 'colLeft', r0, c0, c1 - c0 + 1);
    case 'colRight': return tableOp(el, 'colRight', r0, c1, c1 - c0 + 1);
    case 'delRow': return tableOp(el, 'delRow', r0, c0, r1 - r0 + 1);
    case 'delCol': return tableOp(el, 'delCol', r0, c0, c1 - c0 + 1);
    case 'clear': for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) el.rows[r][c] = ''; touch(el); tRebuild(el); commit(); return;
  }
}
function tStyleSel(patch, toggleKey) {
  const el = E(TBL.st.id); const { r0, r1, c0, c1 } = TBL.rect();
  let val;
  if (toggleKey) val = !getSt(el, TBL.st.ar, TBL.st.ac)[toggleKey];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) setSt(el, r, c, toggleKey ? { [toggleKey]: val } : patch);
  touch(el); tRebuild(el); commit();
}

/* ---------------------------- Editing ------------------------------ */
function tStartEdit(initial) {
  const s = TBL.st; const el = E(s.id); const td = cellNode(s.id, s.ar, s.ac); if (!td) return;
  s.fr = s.ar; s.fc = s.ac; s.editing = true;
  const ed = h('div', 'editable tedit no-drag'); ed.contentEditable = 'plaintext-only';
  ed.textContent = initial != null ? initial : el.rows[s.ar][s.ac];
  const cv = $('.cv', td); cv.style.display = 'none'; td.appendChild(ed); s.ed = ed;
  ed.focus(); focusEnd(ed);
  ed.addEventListener('keydown', ev => {
    if (ev.key === 'Enter' && !ev.shiftKey && !ev.altKey) { ev.preventDefault(); tCommitEdit(); tMove(ev.metaKey ? 0 : 1, 0, false, true); }
    else if (ev.key === 'Tab') { ev.preventDefault(); tCommitEdit(); tMove(0, ev.shiftKey ? -1 : 1, false, true); }
    else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); tCancelEdit(); }
    ev.stopPropagation();
  });
  ed.addEventListener('blur', () => { if (TBL.st?.editing && TBL.st.ed === ed) tCommitEdit(); });
  tPaint();
}
function tCommitEdit() {
  const s = TBL.st; if (!s?.editing) return;
  const el = E(s.id); const v = s.ed.textContent.replace(/ /g, ' ');
  s.editing = false; s.ed = null;
  if (el.rows[s.ar][s.ac] !== v) { el.rows[s.ar][s.ac] = v; touch(el); tRebuild(el); commit(); } else tRebuild(el);
}
function tCancelEdit() { const s = TBL.st; if (!s?.editing) return; s.editing = false; s.ed = null; tRebuild(E(s.id)); }
function tMove(dr, dc, extend, wrap) {
  const s = TBL.st; const el = E(s.id);
  if (extend) { s.fr = clamp(s.fr + dr, 0, el.rows.length - 1); s.fc = clamp(s.fc + dc, 0, el.colW.length - 1); }
  else {
    let r = s.ar + dr, c = s.ac + dc;
    if (wrap && c >= el.colW.length) { c = 0; r++; } if (wrap && c < 0) { c = el.colW.length - 1; r--; }
    if (wrap && r >= el.rows.length && dr > 0) { tableOp(el, 'rowBelow', el.rows.length - 1, 0); }
    s.ar = s.fr = clamp(r, 0, E(s.id).rows.length - 1); s.ac = s.fc = clamp(c, 0, el.colW.length - 1);
  }
  tPaint();
}

/* -------------------------- Pointer in table ----------------------- */
function tPointerDown(ev, id) {
  const el = E(id); const t = ev.target;
  if (t.classList.contains('colrz')) { ev.preventDefault(); const c = +t.dataset.c; drag = { kind: 'tcolrz', id, c, x0: ev.clientX, w0: el.colW[c] }; return true; }
  if (t.classList.contains('rowrz')) { ev.preventDefault(); const r = +t.dataset.r; const tr = $$('tr', nodes.get(id))[r]; drag = { kind: 'trowrz', id, r, y0: ev.clientY, h0: tr.offsetHeight }; return true; }
  if (t.classList.contains('tfill')) { ev.preventDefault(); drag = { kind: 'tfill', id, src: TBL.rect() }; return true; }
  const colH = t.closest('.tbl-colhdr span'); const rowH = t.closest('.tbl-rowhdr span');
  if (colH || rowH) {
    ev.preventDefault();
    if (!TBL.active(id)) tEnter(id, 0, 0);
    const s = TBL.st; const { r0, r1, c0, c1 } = TBL.rect();
    if (colH) {
      const c = +colH.dataset.c; const full = r0 === 0 && r1 === el.rows.length - 1;
      if (full && c >= c0 && c <= c1 && !ev.shiftKey) { drag = { kind: 'tmovecol', id, from: [c0, c1], to: c }; return true; }
      if (ev.shiftKey) { s.fc = c; } else { s.ac = s.fc = c; } s.ar = 0; s.fr = el.rows.length - 1;
      drag = { kind: 'tselcol', id };
    } else {
      const r = +rowH.dataset.r; const full = c0 === 0 && c1 === el.colW.length - 1;
      if (full && r >= r0 && r <= r1 && !ev.shiftKey) { drag = { kind: 'tmoverow', id, from: [r0, r1], to: r }; return true; }
      if (ev.shiftKey) { s.fr = r; } else { s.ar = s.fr = r; } s.ac = 0; s.fc = el.colW.length - 1;
      drag = { kind: 'tselrow', id };
    }
    tPaint(); return true;
  }
  const td = t.closest('td'); if (!td) return false;
  if (t.closest('a') && !ev.shiftKey) return true; // links in cells open normally
  const r = +td.dataset.r, c = +td.dataset.c;
  if (TBL.st?.editing && TBL.st.ed && td.contains(TBL.st.ed)) return true; // clicking in the editor
  if (TBL.st?.editing) {
    // formula editing: clicking another cell inserts a reference
    const raw = TBL.st.ed.textContent;
    if (raw.startsWith('=') && /[=(,;+\-*/^&<>:]$/.test(raw.trimEnd())) { ev.preventDefault(); TBL.st.ed.textContent = raw + colName(c) + (r + 1); focusEnd(TBL.st.ed); return true; }
    tCommitEdit();
  }
  ev.preventDefault();
  if (!TBL.active(id)) { tEnter(id, r, c); }
  const s = TBL.st;
  if (t.dataset.cb) { // checkbox toggle
    el.rows[r][c] = el.rows[r][c] === 'TRUE' ? 'FALSE' : 'TRUE'; touch(el); s.ar = s.fr = r; s.ac = s.fc = c; tRebuild(el); commit(); return true;
  }
  if (ev.shiftKey) { s.fr = r; s.fc = c; } else { s.ar = s.fr = r; s.ac = s.fc = c; }
  if (ev.detail >= 2) { tStartEdit(); return true; }
  drag = { kind: 'tsel', id };
  tPaint(); return true;
}
function tPointerMove(ev) {
  const d = drag; const el = E(d.id); if (!el) return;
  if (d.kind === 'tcolrz') { el.colW[d.c] = Math.round(clamp(d.w0 + (ev.clientX - d.x0) / zoom, 36, 900)); const n = nodes.get(d.id); $$('col', n)[d.c].style.width = el.colW[d.c] + 'px'; $$('.tbl-colhdr span', n)[d.c].style.width = el.colW[d.c] + 'px'; tPaint(); updateLines(); return; }
  if (d.kind === 'trowrz') { el.rowH[d.r] = Math.round(clamp(d.h0 + (ev.clientY - d.y0) / zoom, 24, 600)); const n = nodes.get(d.id); $$('tr', n)[d.r].style.height = el.rowH[d.r] + 'px'; $$('.tbl-rowhdr span', n)[d.r].style.height = el.rowH[d.r] + 'px'; tPaint(); updateLines(); return; }
  const hit = document.elementsFromPoint(ev.clientX, ev.clientY);
  const td = hit.map(x => x.closest?.('td')).find(x => x && x.closest('.el')?.dataset.id === d.id);
  const n = nodes.get(d.id);
  if (d.kind === 'tsel' && td) { TBL.st.fr = +td.dataset.r; TBL.st.fc = +td.dataset.c; tPaint(); }
  if (d.kind === 'tselcol') { const s = hit.map(x => x.closest?.('.tbl-colhdr span')).find(Boolean); const c = s ? +s.dataset.c : td ? +td.dataset.c : null; if (c != null) { TBL.st.fc = c; tPaint(); } }
  if (d.kind === 'tselrow') { const s = hit.map(x => x.closest?.('.tbl-rowhdr span')).find(Boolean); const r = s ? +s.dataset.r : td ? +td.dataset.r : null; if (r != null) { TBL.st.fr = r; tPaint(); } }
  if (d.kind === 'tmovecol' || d.kind === 'tmoverow') {
    const isCol = d.kind === 'tmovecol';
    const cells = isCol ? $$('.tbl-colhdr span', n) : $$('.tbl-rowhdr span', n);
    let to = cells.length;
    for (let i = 0; i < cells.length; i++) { const r = cells[i].getBoundingClientRect(); if ((isCol ? ev.clientX < r.left + r.width / 2 : ev.clientY < r.top + r.height / 2)) { to = i; break; } }
    d.to = to; d.moved = true;
    $$('.tmove-ind', n).forEach(x => x.remove());
    const ind = h('div', 'tmove-ind ' + (isCol ? 'v' : 'h')); const wrap = $('.tbl-wrap', n); const t = $('table', n);
    if (isCol) { const col = to < cells.length ? cellNode(d.id, 0, to) : cellNode(d.id, 0, cells.length - 1); ind.style.left = (to < cells.length ? col.offsetLeft : col.offsetLeft + col.offsetWidth) - 1 + 'px'; ind.style.height = t.offsetHeight + 'px'; }
    else { const row = to < cells.length ? cellNode(d.id, to, 0) : cellNode(d.id, cells.length - 1, 0); ind.style.top = (to < cells.length ? row.offsetTop : row.offsetTop + row.offsetHeight) - 1 + 'px'; ind.style.width = t.offsetWidth + 'px'; }
    wrap.appendChild(ind);
  }
  if (d.kind === 'tfill') {
    const src = d.src; let tr = src.r1, tc = src.c1;
    if (td) { tr = +td.dataset.r; tc = +td.dataset.c; }
    else { // beyond table → extend
      const t = $('table', n).getBoundingClientRect();
      if (ev.clientY > t.bottom) tr = el.rows.length - 1 + Math.ceil((ev.clientY - t.bottom) / (28 * zoom));
      if (ev.clientX > t.right) tc = el.colW.length - 1 + Math.ceil((ev.clientX - t.right) / (120 * zoom));
    }
    const down = tr - src.r1, right = tc - src.c1;
    d.target = Math.abs(down) >= Math.abs(right) ? { dir: down >= 0 ? 'down' : 'up', r0: Math.min(src.r0, tr), r1: Math.max(src.r1, tr), c0: src.c0, c1: src.c1 } : { dir: right >= 0 ? 'right' : 'left', r0: src.r0, r1: src.r1, c0: Math.min(src.c0, tc), c1: Math.max(src.c1, tc) };
    // preview outline
    $$('.tfillprev', n).forEach(x => x.remove());
    const wrap = $('.tbl-wrap', n); const tt = $('table', n);
    const g = d.target; const a = cellNode(d.id, Math.min(g.r0, el.rows.length - 1), Math.min(g.c0, el.colW.length - 1));
    const lastR = Math.min(g.r1, el.rows.length - 1), lastC = Math.min(g.c1, el.colW.length - 1); const b = cellNode(d.id, lastR, lastC);
    const p = h('div', 'tfillprev'); p.style.left = a.offsetLeft + 'px'; p.style.top = a.offsetTop + 'px';
    p.style.width = (b.offsetLeft + b.offsetWidth - a.offsetLeft + Math.max(0, g.c1 - lastC) * 120) + 'px';
    p.style.height = (b.offsetTop + b.offsetHeight - a.offsetTop + Math.max(0, g.r1 - lastR) * 28) + 'px';
    void tt; wrap.appendChild(p);
  }
}
function tPointerUp() {
  const d = drag; drag = null; const el = E(d.id); if (!el) return;
  const n = nodes.get(d.id);
  if (d.kind === 'tcolrz' || d.kind === 'trowrz') { touch(el); commit(); tRebuild(el); return; }
  if (d.kind === 'tmovecol' || d.kind === 'tmoverow') {
    $$('.tmove-ind', n).forEach(x => x.remove());
    if (!d.moved) return;
    const [a, b] = d.from; const cnt = b - a + 1; let to = d.to;
    if (to >= a && to <= b + 1) return;
    if (d.kind === 'tmoverow') {
      const moved = el.rows.splice(a, cnt); const st = {}; const movedSt = {};
      if (to > b) to -= cnt;
      el.rows.splice(to, 0, ...moved);
      // remap styles
      const order = [...Array(el.rows.length + 0).keys()]; void order;
      const oldIdx = []; { const idx = [...Array(el.rows.length).keys()]; const m = idx.splice(a, cnt); idx.splice(to, 0, ...m); idx.forEach((o, nIdx) => oldIdx[nIdx] = o); }
      for (const [k, v] of Object.entries(el.styles)) { const [rr, cc] = k.split(',').map(Number); const nr = oldIdx.indexOf(rr); st[`${nr},${cc}`] = v; }
      el.styles = st; void movedSt;
      TBL.st.ar = to; TBL.st.fr = to + cnt - 1;
    } else {
      if (to > b) to -= cnt;
      const idx = [...Array(el.colW.length).keys()]; const m = idx.splice(a, cnt); idx.splice(to, 0, ...m);
      el.rows = el.rows.map(row => idx.map(o => row[o]));
      el.colW = idx.map(o => el.colW[o]);
      const st = {}; for (const [k, v] of Object.entries(el.styles)) { const [rr, cc] = k.split(',').map(Number); st[`${rr},${idx.indexOf(cc)}`] = v; } el.styles = st;
      TBL.st.ac = to; TBL.st.fc = to + cnt - 1;
    }
    touch(el); tRebuild(el); commit(); return;
  }
  if (d.kind === 'tfill') { $$('.tfillprev', n).forEach(x => x.remove()); if (d.target) tFill(el, d.src, d.target); return; }
}
function tFill(el, src, g) {
  if (g.r1 >= el.rows.length) tableOp(el, 'rowBelow', el.rows.length - 1, 0, g.r1 - el.rows.length + 1);
  if (g.c1 >= el.colW.length) tableOp(el, 'colRight', 0, el.colW.length - 1, g.c1 - el.colW.length + 1);
  const vertical = g.dir === 'down' || g.dir === 'up';
  const lines = vertical ? range(src.c0, src.c1) : range(src.r0, src.r1);
  for (const L of lines) {
    const srcCells = vertical ? range(src.r0, src.r1).map(r => [r, L]) : range(src.c0, src.c1).map(c => [L, c]);
    const vals = srcCells.map(([r, c]) => el.rows[r][c]);
    const nums = vals.map(v => (String(v).startsWith('=') ? null : autoNumber(v)));
    const allNum = nums.every(x => x != null);
    const step = allNum && nums.length >= 2 ? (nums[nums.length - 1] - nums[0]) / (nums.length - 1) : 0;
    const targets = vertical ? range(g.r0, g.r1).filter(r => r < src.r0 || r > src.r1).map(r => [r, L]) : range(g.c0, g.c1).filter(c => c < src.c0 || c > src.c1).map(c => [L, c]);
    for (const [r, c] of targets) {
      const off = vertical ? r - src.r0 : c - src.c0; const len = vals.length;
      const i = ((off % len) + len) % len; const srcV = vals[i]; const [sr, sc] = srcCells[i];
      let out;
      if (String(srcV).startsWith('=')) out = '=' + shiftFormula(srcV.slice(1), r - sr, c - sc);
      else if (allNum && nums.length >= 2) { const k = vertical ? r - src.r1 : c - src.c1; const v = nums[nums.length - 1] + step * k; out = String(Math.round(v * 1e10) / 1e10); }
      else { const m = String(srcV).match(/^(.*?)(\d+)$/); if (m && nums.length === 1 && autoNumber(srcV) == null) { const k = vertical ? r - src.r1 : c - src.c1; out = m[1] + (+m[2] + k); } else out = srcV; }
      el.rows[r][c] = out;
      const st = el.styles[stKey(sr, sc)]; if (st) el.styles[stKey(r, c)] = { ...st }; else delete el.styles[stKey(r, c)];
    }
  }
  TBL.st.ar = g.r0; TBL.st.ac = g.c0; TBL.st.fr = g.r1; TBL.st.fc = g.c1;
  touch(el); tRebuild(el); commit();
}
const range = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };

/* -------------------------- Keyboard / clipboard -------------------- */
function tKey(e) {
  const s = TBL.st; if (!s) return false;
  const el = E(s.id); if (!el || el.deleted) { TBL.st = null; return false; }
  if (s.editing) return false; // editor handles its own keys
  if (document.activeElement && document.activeElement !== document.body && isTyping()) return false;
  const mod = e.metaKey || e.ctrlKey; const k = e.key;
  const map = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (map[k]) { e.preventDefault(); let [dr, dc] = map[k]; if (mod) { dr *= 9999; dc *= 9999; } tMove(dr, dc, e.shiftKey); return true; }
  if (k === 'Tab') { e.preventDefault(); tMove(0, e.shiftKey ? -1 : 1, false, true); return true; }
  if (k === 'Enter') { e.preventDefault(); if (e.shiftKey) tMove(-1, 0); else tStartEdit(); return true; }
  if (k === 'F2') { e.preventDefault(); tStartEdit(); return true; }
  if (k === 'Escape') { e.preventDefault(); tExit(); sel.clear(); sel.add(el.id); refreshSel(); return true; }
  if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); tSelOp('clear'); return true; }
  if (mod && k.toLowerCase() === 'a') { e.preventDefault(); s.ar = s.ac = 0; s.fr = el.rows.length - 1; s.fc = el.colW.length - 1; tPaint(); return true; }
  if (mod && k.toLowerCase() === 'b') { e.preventDefault(); tStyleSel(null, 'bold'); return true; }
  if (mod && k.toLowerCase() === 'i') { e.preventDefault(); tStyleSel(null, 'italic'); return true; }
  if (mod && e.shiftKey && k.toLowerCase() === 'x') { e.preventDefault(); tStyleSel(null, 'strike'); return true; }
  if (mod && k.toLowerCase() === 'c') { e.preventDefault(); tCopy(false); return true; }
  if (mod && k.toLowerCase() === 'x') { e.preventDefault(); tCopy(true); return true; }
  if (mod && k.toLowerCase() === 'z') return false;
  if (mod && k.toLowerCase() === 'v') return false; // handled by paste event
  if (e.altKey && k === 'ArrowUp') { e.preventDefault(); tSelOp('rowAbove'); return true; }
  if (!mod && !e.altKey && k.length === 1) { e.preventDefault(); tStartEdit(k); return true; }
  if (mod) return true; // swallow other shortcuts while in cell mode (e.g. ⌘D)
  return false;
}
let tClip = null;
function tCopy(cut) {
  const el = E(TBL.st.id); const { r0, r1, c0, c1 } = TBL.rect();
  const raw = [], disp = [], st = [];
  for (let r = r0; r <= r1; r++) { raw.push([]); disp.push([]); st.push([]); for (let c = c0; c <= c1; c++) { raw[raw.length - 1].push(el.rows[r][c]); disp[disp.length - 1].push(formatValue(el, r, c, cellValue(el, r, c)).text ?? ''); st[st.length - 1].push(el.styles[stKey(r, c)] || null); } }
  const tsv = disp.map(r => r.join('\t')).join('\n');
  tClip = { raw, st, tsv, r0, c0 };
  navigator.clipboard?.writeText(tsv).catch(() => { });
  if (cut) tSelOp('clear');
  toast(cut ? 'Celle tagliate' : 'Celle copiate');
}
function tPaste(text) {
  const el = E(TBL.st.id); const s = TBL.st;
  let grid, styles = null, fromR = 0, fromC = 0;
  if (tClip && text.replace(/\r/g, '') === tClip.tsv) { grid = tClip.raw; styles = tClip.st; fromR = tClip.r0; fromC = tClip.c0; }
  else grid = parseDelimited(text, text.includes('\t') ? '\t' : null);
  if (!grid.length) return;
  const { r0, c0, r1, c1 } = TBL.rect();
  // single value pasted into a range → fill the range
  if (grid.length === 1 && grid[0].length === 1 && (r1 > r0 || c1 > c0)) { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) el.rows[r][c] = grid[0][0]; touch(el); tRebuild(el); commit(); return; }
  const needR = r0 + grid.length - el.rows.length, needC = c0 + Math.max(...grid.map(r => r.length)) - el.colW.length;
  if (needR > 0) { for (let i = 0; i < needR; i++) el.rows.push(Array(el.colW.length).fill('')); }
  if (needC > 0) { el.rows.forEach(row => { for (let i = 0; i < needC; i++) row.push(''); }); for (let i = 0; i < needC; i++) el.colW.push(120); }
  grid.forEach((row, i) => row.forEach((v, j) => {
    let val = v; if (styles && String(v).startsWith('=')) val = '=' + shiftFormula(v.slice(1), r0 - fromR, c0 - fromC);
    el.rows[r0 + i][c0 + j] = val;
    if (styles) { const st = styles[i][j]; if (st) el.styles[stKey(r0 + i, c0 + j)] = { ...st }; else delete el.styles[stKey(r0 + i, c0 + j)]; }
  }));
  s.ar = r0; s.ac = c0; s.fr = r0 + grid.length - 1; s.fc = c0 + Math.max(...grid.map(r => r.length)) - 1;
  touch(el); tRebuild(el); commit();
}
function parseDelimited(text, delim) {
  text = text.replace(/\r\n?/g, '\n').replace(/\n$/, '');
  if (!delim) { const first = text.split('\n')[0]; delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : first.includes(',') ? ',' : '\t'; }
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"' && cell === '') { q = true; continue; }
    if (ch === delim) { row.push(cell); cell = ''; continue; }
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += ch;
  }
  row.push(cell); rows.push(row);
  const cols = Math.max(...rows.map(r => r.length)); rows.forEach(r => { while (r.length < cols) r.push(''); });
  return rows;
}

/* ----------------------- Import CSV / XLSX files --------------------- */
async function fileToTable(f) {
  const name = f.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.tsv') || f.type === 'text/csv') return parseDelimited(await f.text(), name.endsWith('.tsv') ? '\t' : null);
  if (name.endsWith('.xlsx')) return await parseXlsx(await f.arrayBuffer());
  return null;
}
async function unzip(buf) {
  const dv = new DataView(buf); const files = {};
  let eocd = -1; for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('zip');
  const n = dv.getUint16(eocd + 10, true); let off = dv.getUint32(eocd + 16, true);
  for (let i = 0; i < n; i++) {
    const method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true), nlen = dv.getUint16(off + 28, true), xlen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true), loff = dv.getUint32(off + 42, true);
    const fname = new TextDecoder().decode(new Uint8Array(buf, off + 46, nlen));
    const lnlen = dv.getUint16(loff + 26, true), lxlen = dv.getUint16(loff + 28, true);
    const data = new Uint8Array(buf, loff + 30 + lnlen + lxlen, csize);
    files[fname] = { method, data };
    off += 46 + nlen + xlen + clen;
  }
  return async name => {
    const f = files[name]; if (!f) return null;
    if (f.method === 0) return new TextDecoder().decode(f.data);
    const ds = new Blob([f.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return await new Response(ds).text();
  };
}
async function parseXlsx(buf) {
  const read = await unzip(buf); const P = new DOMParser();
  const ssXml = await read('xl/sharedStrings.xml'); const shared = [];
  if (ssXml) P.parseFromString(ssXml, 'application/xml').querySelectorAll('si').forEach(si => shared.push([...si.querySelectorAll('t')].map(t => t.textContent).join('')));
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const wb = await read('xl/workbook.xml'), rels = await read('xl/_rels/workbook.xml.rels');
  if (wb && rels) { const first = P.parseFromString(wb, 'application/xml').querySelector('sheet'); const rid = first?.getAttribute('r:id'); const rel = [...P.parseFromString(rels, 'application/xml').querySelectorAll('Relationship')].find(r => r.getAttribute('Id') === rid); if (rel) sheetPath = 'xl/' + rel.getAttribute('Target').replace(/^\/?xl\//, ''); }
  const sx = await read(sheetPath); if (!sx) throw new Error('sheet');
  const doc = P.parseFromString(sx, 'application/xml'); const grid = [];
  doc.querySelectorAll('sheetData row').forEach(row => {
    row.querySelectorAll('c').forEach(c => {
      const ref = c.getAttribute('r'); const m = ref.match(/^([A-Z]+)(\d+)$/); const ci = colIndex(m[1]), ri = +m[2] - 1;
      const t = c.getAttribute('t'); const v = c.querySelector('v')?.textContent ?? ''; const f = c.querySelector('f')?.textContent;
      let val = t === 's' ? shared[+v] ?? '' : t === 'inlineStr' ? c.querySelector('is')?.textContent ?? '' : t === 'b' ? (v === '1' ? 'TRUE' : 'FALSE') : v;
      if (f) val = '=' + f;
      (grid[ri] = grid[ri] || [])[ci] = val;
    });
  });
  const rows = Math.min(grid.length, 500), cols = Math.min(Math.max(0, ...grid.map(r => (r ? r.length : 0))), 60);
  const out = []; for (let r = 0; r < rows; r++) { out.push([]); for (let c = 0; c < cols; c++) out[r].push(grid[r]?.[c] ?? ''); }
  return out.length ? out : [['']];
}

/* ----------------------- Contextual toolbar (cells) ------------------ */
function tToolbar(ct) {
  const s = TBL.st; const el = E(s.id); const st = getSt(el, s.ar, s.ac);
  const btn = (icon, label, fn, disabled) => { const b = h('div', 'tool' + (disabled ? ' disabled' : ''), `<div class="ti">${icon}</div><span>${label}</span>`); if (!disabled) b.onclick = e => { e.stopPropagation(); fn(b); }; ct.appendChild(b); return b; };
  const back = h('div', 'tool ctx-back', '<div class="ti"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></div>'); back.title = 'Esci dalla modalità cella (Esc)'; back.onclick = () => { tExit(); sel.clear(); sel.add(el.id); refreshSel(); }; ct.appendChild(back);
  const pop = (b, build) => { const r = b.getBoundingClientRect(); menuAt(r.right + 6, r.top, build); };
  btn('<b style="font-family:Georgia,serif;font-size:17px">T<sub style="font-size:9px;color:#e8584f">a</sub></b>', 'Stile testo', b => pop(b, m => {
    const row = h('div', 'tfmt'); [['bold', '<b>B</b>'], ['italic', '<i>I</i>'], ['strike', '<s>S</s>']].forEach(([k, l]) => { const x = h('button', st[k] ? 'on' : '', l); x.onclick = () => { tStyleSel(null, k); hidePopups(); }; row.appendChild(x); }); m.appendChild(row);
    m.appendChild(h('div', 'mlabel', 'Colore'));
    const p1 = h('div', 'palette'); TEXT_COLORS.forEach(c => { const d = h('div', 'pc txt' + ((st.color || null) === c ? ' on' : ''), 'A'); d.style.color = c || '#2f3337'; d.style.background = '#fff'; d.onclick = () => { tStyleSel({ color: c }); hidePopups(); }; p1.appendChild(d); }); m.appendChild(p1);
    m.appendChild(h('div', 'mlabel', 'Evidenzia'));
    const p2 = h('div', 'palette'); [null, ...HL_COLORS].forEach(c => { const d = h('div', 'pc txt' + (c ? '' : ' none') + ((st.hl || null) === c ? ' on' : ''), c ? 'A' : ''); d.style.background = c || '#fff'; d.style.color = c === '#2f3337' ? '#fff' : '#2f3337'; d.onclick = () => { tStyleSel({ hl: c }); hidePopups(); }; p2.appendChild(d); }); m.appendChild(p2);
  }));
  btn('<b style="font-size:10px;letter-spacing:.3px">ABC</b>', 'Tipo cella', b => pop(b, m => {
    const t = st.type || 'auto';
    const set = patch => { tStyleSel(patch); hidePopups(); };
    mi(m, (t === 'auto' ? '✓ ' : '') + 'Automatico', () => set({ type: null, dec: null, cur: null, fmt: null }));
    mi(m, (t === 'number' ? '✓ ' : '') + '123  Numero', () => set({ type: 'number', dec: 2 }));
    if (t === 'number') { const r = h('div', 'tsub'); [0, 1, 2, 3].forEach(d => { const x = h('button', (st.dec ?? 2) === d ? 'on' : '', d === 0 ? '1' : '1,' + '0'.repeat(d)); x.onclick = () => set({ dec: d }); r.appendChild(x); }); m.appendChild(r); }
    mi(m, (t === 'currency' ? '✓ ' : '') + '€  Valuta', () => set({ type: 'currency', cur: st.cur || '€' }));
    if (t === 'currency') { const r = h('div', 'tsub'); ['€', '$', '£', 'CHF '].forEach(c => { const x = h('button', (st.cur || '€') === c ? 'on' : '', c.trim()); x.onclick = () => set({ cur: c }); r.appendChild(x); }); m.appendChild(r); }
    mi(m, (t === 'percent' ? '✓ ' : '') + '%  Percentuale', () => set({ type: 'percent' }));
    mi(m, (t === 'text' ? '✓ ' : '') + 'ABC  Testo', () => set({ type: 'text' }));
    mi(m, (t === 'date' ? '✓ ' : '') + '📅  Data e ora', () => set({ type: 'date', fmt: st.fmt || 'short' }));
    if (t === 'date') { const r = h('div', 'tsub'); [['short', '06/11/2026'], ['long', '6 novembre 2026'], ['datetime', 'data e ora'], ['time', 'ora']].forEach(([f, l]) => { const x = h('button', (st.fmt || 'short') === f ? 'on' : '', l); x.onclick = () => set({ fmt: f }); r.appendChild(x); }); m.appendChild(r); }
    mi(m, (t === 'checkbox' ? '✓ ' : '') + '☑  Casella di controllo', () => { const { r0, r1, c0, c1 } = TBL.rect(); for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (!['TRUE', 'FALSE'].includes(el.rows[r][c])) el.rows[r][c] = truthy(el.rows[r][c]) && el.rows[r][c] !== '0' ? 'TRUE' : 'FALSE'; set({ type: 'checkbox' }); });
  }));
  btn(`<span class="tcolor-ico" style="background:${st.bg || '#fff'}"></span>`, 'Colore', b => pop(b, m => {
    m.appendChild(h('div', 'mlabel', 'Colore cella'));
    const p = h('div', 'palette'); CELL_BG.forEach(c => { const d = h('div', 'pc' + (c ? '' : ' none') + ((st.bg || null) === c ? ' on' : '')); d.style.background = c || '#fff'; d.onclick = () => { tStyleSel({ bg: c }); hidePopups(); }; p.appendChild(d); }); m.appendChild(p);
  }));
  const single = TBL.rect().r0 === TBL.rect().r1 && TBL.rect().c0 === TBL.rect().c1;
  const { r0, r1, c0, c1 } = TBL.rect();
  btn('<i style="font-family:Georgia,serif;font-size:16px">fx</i>', 'Formula', b => pop(b, m => {
    m.appendChild(h('div', 'mlabel', single ? 'Inserisci formula' : 'Formula sotto la selezione'));
    FN_LIST.forEach(f => mi(m, `<code>${f}</code>`, () => {
      if (single) { tStartEdit(`=${f}(`); }
      else { // put result below each column (or right of row)
        const vertical = r1 > r0; const targetR = vertical ? r1 + 1 : r0; const targetC = vertical ? c0 : c1 + 1;
        if (vertical && targetR >= el.rows.length) tableOp(el, 'rowBelow', el.rows.length - 1, 0);
        if (!vertical && targetC >= el.colW.length) tableOp(el, 'colRight', 0, el.colW.length - 1);
        if (vertical) for (let c = c0; c <= c1; c++) el.rows[targetR][c] = `=${f}(${colName(c)}${r0 + 1}:${colName(c)}${r1 + 1})`;
        else for (let r = r0; r <= r1; r++) el.rows[r][targetC] = `=${f}(${colName(c0)}${r + 1}:${colName(c1)}${r + 1})`;
        touch(el); tRebuild(el); commit();
      }
    }));
    m.appendChild(h('div', 'mi', '<span style="font-size:11px;color:#8a8f94;line-height:1.5">Scrivi “=” in una cella per una formula.<br>Es. =A1*B1, =SUM(A1:A10), =IF(A1>10,"sì","no")</span>'));
  }));
  btn('<svg viewBox="0 0 24 24"><path d="M4 6h16M4 10h10M4 14h16M4 18h10"/></svg>', 'Allineamento', b => pop(b, m => {
    const r1_ = h('div', 'tfmt'); [['left', '⯇≡', 'Sinistra'], ['center', '≡', 'Centro'], ['right', '≡⯈', 'Destra']].forEach(([a, l, tt]) => { const x = h('button', (st.align || 'left') === a ? 'on' : '', l); x.title = tt; x.onclick = () => { tStyleSel({ align: a === 'left' ? null : a }); hidePopups(); }; r1_.appendChild(x); });
    const r2 = h('div', 'tfmt'); [['top', '⤒', 'In alto'], ['middle', '↕', 'Al centro'], ['bottom', '⤓', 'In basso']].forEach(([a, l, tt]) => { const x = h('button', (st.valign || 'top') === a ? 'on' : '', l); x.title = tt; x.onclick = () => { tStyleSel({ valign: a === 'top' ? null : a }); hidePopups(); }; r2.appendChild(x); });
    m.append(h('div', 'mlabel', 'Orizzontale'), r1_, h('div', 'mlabel', 'Verticale'), r2);
  }));
  btn('<svg viewBox="0 0 24 24"><rect x="3" y="4" width="12" height="16" rx="1"/><path d="M9 4v16M3 9h12M3 14.5h12M19 9v6M16 12h6"/></svg>', 'Agg. colonna', () => tSelOp('colRight'));
  btn('<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="12" rx="1"/><path d="M3 9h18M9 3v12M15 3v12M12 17v6M9 20h6"/></svg>', 'Agg. riga', () => tSelOp('rowBelow'));
  btn('<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>', 'Altro', b => pop(b, m => tCellMenu(m)));
  ct.appendChild(h('div', 'tspacer'));
}
function tCellMenu(m) {
  const el = E(TBL.st.id); const { r0, r1, c0, c1 } = TBL.rect();
  const nr = r1 - r0 + 1, nc = c1 - c0 + 1;
  mi(m, nr > 1 ? `Aggiungi ${nr} righe sopra` : 'Aggiungi riga sopra', () => tSelOp('rowAbove'), '⌥↑');
  mi(m, nr > 1 ? `Aggiungi ${nr} righe sotto` : 'Aggiungi riga sotto', () => tSelOp('rowBelow'));
  mi(m, nc > 1 ? `Aggiungi ${nc} colonne a sinistra` : 'Aggiungi colonna a sinistra', () => tSelOp('colLeft'));
  mi(m, nc > 1 ? `Aggiungi ${nc} colonne a destra` : 'Aggiungi colonna a destra', () => tSelOp('colRight'));
  msep(m);
  mi(m, 'Taglia', () => tCopy(true), '⌘X'); mi(m, 'Copia', () => tCopy(false), '⌘C');
  mi(m, 'Svuota celle', () => tSelOp('clear'), '⌫');
  mi(m, 'Ordina A → Z', () => tSort(1)); mi(m, 'Ordina Z → A', () => tSort(-1));
  msep(m);
  const d1 = mi(m, nr > 1 ? `Elimina ${nr} righe` : 'Elimina riga', () => tSelOp('delRow'), '', 'danger'); if (nr >= el.rows.length) d1.classList.add('disabled');
  const d2 = mi(m, nc > 1 ? `Elimina ${nc} colonne` : 'Elimina colonna', () => tSelOp('delCol'), '', 'danger'); if (nc >= el.colW.length) d2.classList.add('disabled');
}
function tSort(dir) {
  const el = E(TBL.st.id); const { r0, r1, c0 } = TBL.rect();
  const start = r0 === r1 ? (getSt(el, 0, c0).bold ? 1 : 0) : r0; const end = r0 === r1 ? el.rows.length - 1 : r1;
  const idx = range(start, end);
  const key = r => { const v = cellValue(el, r, c0); return v && v.error ? '' : v; };
  idx.sort((a, b) => { const x = key(a), y = key(b); if (x === '' && y !== '') return 1; if (y === '' && x !== '') return -1; return (isNum(x) && isNum(y) ? x - y : String(x).localeCompare(String(y), 'it', { numeric: true })) * dir; });
  const rows = idx.map(i => el.rows[i]); const sty = idx.map(i => el.colW.map((_, c) => el.styles[stKey(i, c)]));
  rows.forEach((row, k) => { el.rows[start + k] = row; sty[k].forEach((s, c) => { if (s) el.styles[stKey(start + k, c)] = s; else delete el.styles[stKey(start + k, c)]; }); });
  touch(el); tRebuild(el); commit();
}
