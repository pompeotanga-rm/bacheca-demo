'use strict';
/* =====================================================================
   features.js — interfaccia e comportamenti allineati alla specifica
   (SPEC.md). Sovrascrive le funzioni base di app.js dove serve.
   ===================================================================== */

/* ------------------------------ Costanti ------------------------------ */
Object.assign(DEFAULT_W, { note: 338, link: 338, todo: 338, column: 338, comment: 338, sketch: 338, video: 338, map: 338, audio: 338, file: 338, image: 338, heading: 338, color: 168, board: 98, document: 98, drawing: 200 });
const PAL_SOLID = ['#ffffff', '#c4c6c8', '#5fd3c7', '#6dcc63', '#cc8157', '#fbd14b', '#f7923e', '#f05f58', '#f772c8', '#b67cf2', '#5ab9f0', '#5b7cf2'];
const PAL_LIGHT = ['#e4e6e8', '#fbdcd8', '#fbe7c8', '#fdf3b8', '#d9f0cf', '#d3e6fb', '#f9e0ec'];
const PAL_DARK = ['#d9534f', '#9aa0a6', '#9cc5e3', '#4a90d9', '#5e6a74', '#1f3f6e'];
const BOARD_SOLID = ['#c4c6c8', '#5e6a74', '#5fd3c7', '#6dcc63', '#cc8157', '#fbd14b', '#f7923e', '#f05f58', '#f772c8', '#b67cf2', '#5ab9f0', '#5b7cf2'];
const BOARD_DUO = [['#2f5f6b', '#7fc4c9'], ['#2f5f6b', '#c98f6b'], ['#2f5f6b', '#6dcc63'], ['#5e4632', '#c98f6b'], ['#2f5f6b', '#e3d5b8'], ['#e8731e', '#2f5f6b'], ['#e8731e', '#5e4632'], ['#7fc4c9', '#2f5f6b'], ['#2f5f6b', '#9cc5e3']];
const BOARD_MUTED = ['#8fb4c3', '#7fc4c9', '#a8d8dc', '#c8d2c8', '#e3d5b8', '#f39a38', '#e8731e'];
const TEXT_COL = [null, '#2f9fd8', '#3f9b5b', '#e0a417', '#e5483d', '#8d929a'];
const HL_COL = ['#323b4a', '#cfe8fb', '#d5f0c8', '#fde9a6', '#fbd5e8', '#e3e5e7'];
const DRAW_SOLID = ['#323b4a', '#c4c6c8', '#5fd3c7', '#6dcc63', '#cc8157', '#fbd14b', '#f7923e', '#f05f58', '#f772c8', '#b67cf2', '#5ab9f0', '#5b7cf2'];
const DRAW_MUTED = ['#96b74a', '#c4d67a', '#c8d2b0', '#dcd6b8', '#ecc35a', '#e2b36a', '#d98a4e'];
const PEN_SIZES = [2, 4, 8, 14];
const EMOJI = { lavoro: '💼', work: '💼', progetto: '📐', project: '📐', test: '☕', casa: '🏠', home: '🏠', viaggio: '✈️', travel: '✈️', idee: '💡', idea: '💡', ideas: '💡', musica: '🎵', music: '🎵', foto: '📷', photo: '📷', design: '🎨', arte: '🎨', art: '🎨', libri: '📚', book: '📚', books: '📚', cibo: '🍝', food: '🍝', ricette: '🍳', recipe: '🍳', sport: '⚽', soldi: '💰', budget: '💰', finanza: '💰', scuola: '🎓', school: '🎓', studio: '🎓', marketing: '📣', video: '🎬', film: '🎬', mood: '🌈', moodboard: '🌈', piano: '🗓️', plan: '🗓️', calendario: '🗓️', team: '👥', clienti: '🤝', client: '🤝', note: '📝', notes: '📝', salute: '❤️', health: '❤️', giardino: '🌱', garden: '🌱', auto: '🚗', car: '🚗', tech: '💻', codice: '💻', code: '💻', telefoni: '📞', phone: '📞', regali: '🎁', gift: '🎁', matrimonio: '💍', wedding: '💍', festa: '🎉', party: '🎉', ufficio: '🏢', office: '🏢', shopping: '🛍️', moda: '👗', fashion: '👗', natura: '🌿', mare: '🌊', montagna: '⛰️', bambini: '🧸', animali: '🐾', cane: '🐶', gatto: '🐱', game: '🎮', giochi: '🎮', scrittura: '✍️', writing: '✍️', ricerca: '🔍', research: '🔍', fase: '🚩', obiettivi: '🎯', goals: '🎯', sicurezza: '🔒', security: '🔒', nis: '🛡️', legale: '⚖️', legal: '⚖️' };
const ICON_SET = ['💼', '📐', '☕', '🏠', '✈️', '💡', '🎵', '📷', '🎨', '📚', '🍝', '⚽', '💰', '🎓', '📣', '🎬', '🌈', '🗓️', '👥', '🤝', '📝', '❤️', '🌱', '🚗', '💻', '📞', '🎁', '💍', '🎉', '🏢', '🛍️', '🌿', '🌊', '⛰️', '🧸', '🐾', '🎮', '✍️', '🔍', '🚩', '🎯', '🔒', '🛡️', '⚖️', '⭐', '🔥', '📌', '📦', '🧭', '🧪', '🧩', '🪴', '☀️', '🌙', '⚡', '🏆', '📊', '📈', '🗂️', '📁'];
const COLOR_NAMES = [['#000000', 'Nero'], ['#ffffff', 'Bianco'], ['#ff0000', 'Rosso'], ['#00ff00', 'Lime'], ['#0000ff', 'Blu'], ['#ffff00', 'Giallo'], ['#00ffff', 'Ciano'], ['#ff00ff', 'Magenta'], ['#c0c0c0', 'Argento'], ['#808080', 'Grigio'], ['#800000', 'Bordeaux'], ['#808000', 'Oliva'], ['#008000', 'Verde'], ['#800080', 'Viola'], ['#008080', 'Verde acqua'], ['#000080', 'Blu navy'], ['#ffa500', 'Arancione'], ['#ffc0cb', 'Rosa'], ['#a52a2a', 'Marrone'], ['#f5f5dc', 'Beige'], ['#ffd700', 'Oro'], ['#40e0d0', 'Turchese'], ['#e6e6fa', 'Lavanda'], ['#fa8072', 'Salmone'], ['#ff7f50', 'Corallo'], ['#f0e68c', 'Kaki'], ['#4b0082', 'Indaco'], ['#dc143c', 'Cremisi'], ['#2e8b57', 'Verde mare'], ['#87ceeb', 'Azzurro cielo'], ['#6a5acd', 'Blu ardesia'], ['#d2691e', 'Cioccolato'], ['#ff6347', 'Pomodoro'], ['#9acd32', 'Verde giallo'], ['#96b74a', 'Sushi'], ['#228b22', 'Verde foresta'], ['#b0e0e6', 'Blu polvere'], ['#ffdab9', 'Pesca'], ['#e9967a', 'Salmone scuro'], ['#708090', 'Grigio ardesia'], ['#bc8f8f', 'Rosa antico'], ['#daa520', 'Ocra'], ['#cd5c5c', 'Rosso indiano'], ['#4682b4', 'Blu acciaio'], ['#556b2f', 'Verde oliva scuro'], ['#8fbc8f', 'Verde salvia'], ['#ff8c00', 'Arancio scuro'], ['#9932cc', 'Orchidea scura'], ['#191970', 'Blu notte'], ['#f4a460', 'Sabbia'], ['#2f4f4f', 'Grigio ardesia scuro'], ['#5f9ea0', 'Blu cadetto'], ['#7fffd4', 'Acquamarina'], ['#fff8dc', 'Seta'], ['#b22222', 'Mattone'], ['#ee82ee', 'Violetto'], ['#3cb371', 'Verde menta'], ['#6495ed', 'Fiordaliso'], ['#ffe4e1', 'Rosa nebbia'], ['#323b4a', 'Ardesia notte']];
let PROFILE = JSON.parse(localStorage.getItem('bacheca-profile') || 'null') || { name: 'Tu', color: '#6d83d8', avatar: null };
const initials = n => (n || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const ICONS = {
  back: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
  color: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 20 20 4" stroke="#e5483d"/></svg>',
  labels: '<svg viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/></svg>',
  react: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.3 2 3.5 2 3.5-2 3.5-2"/><circle cx="9" cy="10" r=".7" fill="currentColor"/><circle cx="15" cy="10" r=".7" fill="currentColor"/></svg>',
  comment: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M15 2v6M12 5h6" /></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/></svg>',
  rename: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M8 15l3-7 3 7M9 13h4"/></svg>',
  caption: '<svg viewBox="0 0 24 24"><path d="M4 16h16M7 20h10"/></svg>',
  title: '<svg viewBox="0 0 24 24"><path d="M4 9h16"/></svg>',
  due: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  assign: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  indent: '<svg viewBox="0 0 24 24"><path d="M4 6h16M10 12h10M4 18h16M4 10l3 2-3 2"/></svg>',
  outdent: '<svg viewBox="0 0 24 24"><path d="M4 6h16M10 12h10M4 18h16M7 10l-3 2 3 2"/></svg>',
  icon: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9h6v6H9z"/></svg>',
  cardview: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 9h4v6H7zM14 10h4M14 14h3"/></svg>',
  start: '<svg viewBox="0 0 24 24"><path d="M20 12H5M10 7l-5 5 5 5"/></svg>',
  end: '<svg viewBox="0 0 24 24"><path d="M4 12h15M14 7l5 5-5 5"/></svg>',
  label: '<svg viewBox="0 0 24 24"><path d="M2 12h4M18 12h4"/><rect x="6" y="8" width="12" height="8" rx="1"/></svg>',
  dashed: '<svg viewBox="0 0 24 24"><path d="M4 20l3-3M10 14l3-3M16 8l4-4"/></svg>',
  weight: '<svg viewBox="0 0 24 24"><path d="M4 6h16" stroke-width="1"/><path d="M4 12h16" stroke-width="2.2"/><path d="M4 18h16" stroke-width="3.4"/></svg>',
  align: '<svg viewBox="0 0 24 24"><path d="M5 3v18"/><rect x="8" y="6" width="11" height="4"/><rect x="8" y="14" width="7" height="4"/></svg>',
  distribute: '<svg viewBox="0 0 24 24"><path d="M4 3v18M20 3v18"/><rect x="9" y="7" width="6" height="10"/></svg>',
  textstyle: '<svg viewBox="0 0 24 24"><path d="M5 6h12M11 6v13"/><circle cx="18" cy="17" r="3" fill="#e5483d" stroke="none"/></svg>',
  bold: '<svg viewBox="0 0 24 24"><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" stroke-width="2.2"/></svg>',
  italic: '<svg viewBox="0 0 24 24"><path d="M14 5l-4 14M10 5h7M7 19h7"/></svg>',
  strike: '<svg viewBox="0 0 24 24"><path d="M4 12h16M16 7c-1-1.5-2.5-2-4-2-2.5 0-4 1.3-4 3M8 17c1 1.5 2.5 2 4 2 2.5 0 4-1.3 4-3"/></svg>',
  underline: '<svg viewBox="0 0 24 24"><path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14"/></svg>',
  bullets: '<svg viewBox="0 0 24 24"><circle cx="5" cy="7" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="17" r="1" fill="currentColor"/><path d="M9 7h11M9 12h11M9 17h11"/></svg>',
  numbers: '<svg viewBox="0 0 24 24"><path d="M10 7h10M10 12h10M10 17h10M4 5h1.5v4M4 9h3M4 14.5c.5-1 2.8-1 2.8.3 0 1-2.8 1.7-2.8 3.2h3"/></svg>',
  center: '<svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M4 18h16"/></svg>',
  code: '<svg viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/></svg>',
  insert: '<svg viewBox="0 0 24 24"><path d="M4 6h10M4 12h7M4 18h10M17 9v6M14 12h6"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M4 20l1-4L16 5l3 3L8 19z"/></svg>',
  pointer: '<svg viewBox="0 0 24 24"><path d="M6 3l12 9-5 1 3 6-2 1-3-6-4 4z"/></svg>',
  eraser: '<svg viewBox="0 0 24 24"><path d="M4 16l9-9 6 6-7 7H8z"/><path d="M9 11l6 6M12 20h8"/></svg>',
  brush: '<svg viewBox="0 0 24 24"><path d="M4 18c3 0 3-4 6-4M9 13l8-9 3 3-9 8"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  redo: '<svg viewBox="0 0 24 24"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  open: '<svg viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20l1-4L16 5l3 3L8 19z"/></svg>',
  linkcard: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="3" fill="#e5483d" stroke="none"/><path d="M10 9l5 3-5 3z" fill="#fff" stroke="none"/></svg>',
  doc: '<svg viewBox="0 0 26 20"><path d="M2 3h9M6.5 3v12M15 7h9M15 11h9M15 15h9M2 19h22"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  pencil: '<svg viewBox="0 0 24 24"><path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/></svg>',
  lines: '<svg viewBox="0 0 24 24"><path d="M5 19 19 5"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/></svg>',
};

/* ------------------------------ Helpers ------------------------------ */
const lum = hex => { if (!hex || hex[0] !== '#') return 1; const n = hex.length === 4 ? hex.slice(1).split('').map(c => parseInt(c + c, 16)) : [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); const [r, g, b] = n.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
const isDark = c => c && c !== 'transparent' && lum(c) < .35;
function colorName(hex) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = p(hex.toLowerCase()); let best = null, bd = Infinity;
  for (const [hx, n] of COLOR_NAMES) { const [r2, g2, b2] = p(hx); const d = (r - r2) ** 2 * .3 + (g - g2) ** 2 * .59 + (b - b2) ** 2 * .11; if (d < bd) { bd = d; best = n; } }
  return best;
}
function randomColor() { const h = Math.floor(Math.random() * 360), s = 45 + Math.random() * 35, l = 40 + Math.random() * 25; const f = n => { const k = (n + h / 30) % 12, a = s / 100 * Math.min(l / 100, 1 - l / 100); return Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); }
function boardCounts(bid) {
  const els = boardEls(bid).filter(e => e.type !== 'line');
  const c = { boards: 0, cards: 0, files: 0, docs: 0 };
  els.forEach(e => { if (e.type === 'board') c.boards++; else if (e.type === 'file') c.files++; else if (e.type === 'document') c.docs++; else c.cards++; });
  const parts = [];
  if (c.boards) parts.push(c.boards + (c.boards === 1 ? ' board' : ' board'));
  if (c.cards || !parts.length) parts.push(c.cards + (c.cards === 1 ? ' card' : ' card'));
  if (c.files) parts.push(c.files + (c.files === 1 ? ' file' : ' file'));
  if (c.docs) parts.push(c.docs + (c.docs === 1 ? ' doc' : ' doc'));
  return parts.join(', ');
}
function colCounts(col) {
  const items = col.items.map(E).filter(e => e && !e.deleted);
  const c = { boards: 0, cards: 0, files: 0, docs: 0 };
  items.forEach(e => { if (e.type === 'board') c.boards++; else if (e.type === 'file') c.files++; else if (e.type === 'document') c.docs++; else c.cards++; });
  const parts = [];
  if (c.cards || (!c.boards && !c.files && !c.docs)) parts.push(c.cards + ' card');
  if (c.files) parts.push(c.files + ' file');
  if (c.docs) parts.push(c.docs + ' doc');
  if (c.boards) parts.unshift(c.boards + ' board');
  return parts.join(', ');
}
const wordCount = html => (stripHtml(String(html || '').replace(/<(\/?(p|div|li|h1|h2|blockquote|pre|br|tr|td)[^>]*)>/gi, ' <$1> ')).trim().match(/\S+/g) || []).length;
function autoInitials(t) {
  const w = (t || '').trim().split(/\s+/).filter(Boolean); if (!w.length) return '';
  if (w.length === 1) return w[0].slice(0, 4).toUpperCase();
  return w.slice(0, 3).map(x => /^\d+$/.test(x) ? x : x[0]).join('').toUpperCase().slice(0, 4);
}
function boardIconHTML(b) {
  const ic = b.icon;
  if (!ic) return '';
  if (ic.type === 'emoji') return `<span class="emoji">${esc(ic.ch)}</span>`;
  if (ic.type === 'letters') return `<span class="letters ${String(ic.text).length === 4 ? 'l4' : ''}">${esc(ic.text)}</span>`;
  return '';
}
function boardBg(b) { return b.color2 ? `linear-gradient(135deg, ${safeColor(b.color)} 50%, ${safeColor(b.color2)} 50%)` : safeColor(b.color); }
function relTime(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 45) return 'adesso'; if (s < 90) return '1 minuto fa'; if (s < 3600) return Math.round(s / 60) + ' minuti fa';
  if (s < 5400) return '1 ora fa'; if (s < 86400) return Math.round(s / 3600) + ' ore fa';
  if (s < 172800) return 'ieri'; return new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}
const MONTHS_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
function dueLabel(it) {
  const d = new Date(it.due + 'T00:00'); let s = 'Scade ' + d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()];
  if (d.getFullYear() !== new Date().getFullYear()) s += ' ' + d.getFullYear();
  if (it.dueTime) { const [hh, mm] = it.dueTime.split(':').map(Number); s += ` (${hh % 12 || 12}${mm ? ':' + String(mm).padStart(2, '0') : ''}${hh < 12 ? 'am' : 'pm'})`; }
  return s;
}
function dueState(it) {
  const now = new Date(); const d = new Date(it.due + 'T' + (it.dueTime || '23:59'));
  if (d < now) return 'late';
  const t = new Date(); t.setHours(0, 0, 0, 0); if (new Date(it.due + 'T00:00').getTime() === t.getTime()) return 'today';
  return '';
}
function kbdHTML(k) { return k ? `<span class="k">${k.split(' ').map(x => `<kbd>${x}</kbd>`).join('')}</span>` : ''; }
function popAt(anchor, build, opts = {}) {
  hidePopups(true);
  const m = h('div', 'pop'); m.addEventListener('pointerdown', e => e.stopPropagation());
  build(m); document.body.appendChild(m);
  const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor;
  let x = opts.below ? r.left : r.right + 8, y = opts.below ? r.bottom + 6 : r.top - 4;
  m.style.left = '0px'; m.style.top = '0px';
  x = clamp(x, 6, innerWidth - m.offsetWidth - 6); y = clamp(y, 50, innerHeight - m.offsetHeight - 6);
  m.style.left = x + 'px'; m.style.top = y + 'px'; m.classList.add('pop-open');
  return m;
}
function closePops() { $$('.pop').forEach(p => p.remove()); $$('.dt-pop').forEach(p => p.remove()); }

/* ----------------------------- Salvataggio ----------------------------- */
function setSave(state) { const s = $('#save-status'); if (!s) return; s.textContent = state === 'saving' ? 'Salvataggio…' : state === 'error' ? '⚠ Non salvato' : 'Salvato'; s.classList.toggle('save-err', state === 'error'); clearTimeout(setSave.t); if (state === 'saved') setSave.t = setTimeout(() => { s.textContent = ''; }, 4000); }
function scheduleSave() {
  clearTimeout(saveTimer); setSave('saving');
  saveTimer = setTimeout(saveNow, 300);
}
// salvataggio con gestione degli errori: se il browser rifiuta (spazio esaurito, archivio bloccato)
// lo si dice chiaramente invece di far credere che sia tutto salvato
function saveNow() {
  clearTimeout(saveTimer); saveTimer = null;
  if (typeof Sync !== 'undefined') Sync.changed(); // lavagna condivisa: manda al server ciò che è cambiato
  return DB.put('kv', 'state', S).then(() => { saveNow.failed = false; setSave('saved'); }, e => {
    console.error('Salvataggio non riuscito', e); setSave('error');
    if (!saveNow.failed) { saveNow.failed = true; toast('Salvataggio non riuscito: lo spazio del browser potrebbe essere esaurito. Esporta un backup dalle impostazioni.'); }
  });
}

/* ------------------------------ Decorazioni ------------------------------ */
function applyDecor(el) {
  const n = nodes.get(el.id); if (!n || el.type === 'line') return;
  n.classList.toggle('selected', sel.has(el.id));
  n.classList.remove('bgc', 'strip', 'on-dark');
  n.style.removeProperty('--c'); delete n.dataset.color;
  if (el.type === 'board') { const b = S.boards[el.target]; const bi = $('.bi', n); if (b && bi) { bi.style.background = b.iconImg ? '' : boardBg(b); bi.classList.toggle('dark-ink', isDark(b.color) && !b.color2); } }
  else if (el.color) {
    n.style.setProperty('--c', el.color); n.dataset.color = el.color;
    const mode = el.colorMode || (el.type === 'column' ? 'strip' : 'bg');
    if (['heading'].includes(el.type)) { /* text colour only */ }
    else if (el.type === 'document' && !el.cardView) { const di = $('.doc-ico', n); if (di) { di.classList.add('colored'); } }
    else n.classList.add(mode === 'strip' ? 'strip' : 'bgc');
    if (mode !== 'strip' && isDark(el.color) && el.type !== 'heading') n.classList.add('on-dark');
  }
  renderExtras(el, n);
}

/* ------------------------------ Builder card ------------------------------ */
BUILD.note = function (el, card) {
  if (el.agentAuthor) { // nota scritta da un agente (post_note): si vede chi l'ha scritta
    const by = h('div', 'agent-by'); by.textContent = `🤖 ${el.agentAuthor}${el.agentSession ? ' · ' + el.agentSession : ''} · ${relTime(el.created)}`; by.title = 'Nota scritta da un agente'; card.appendChild(by);
  }
  const t = editableDiv('text rt', el.html, 'Inizia a scrivere…', d => { el.html = d.innerHTML; touch(el); scheduleSave(); });
  wireRichText(t, el);
  card.appendChild(t);
};
BUILD.heading = function (el, card) {
  const t = editableDiv('text', el.html, 'Titolo', d => { el.html = d.innerHTML; touch(el); scheduleSave(); });
  t.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); t.blur(); } });
  card.appendChild(t);
};
async function unfurlInto(el) {
  const id = el.id, url = el.url; let meta = null;
  try {
    const r = await fetch('/api/unfurl?url=' + encodeURIComponent(url)); const j = await r.json();
    if (j.error) throw new Error(j.error);
    meta = { title: j.title, description: j.description, image: j.image, favicon: j.favicon, site: j.site };
  } catch { meta = null; }
  // nel frattempo lo stato può essere cambiato (annulla, sincronizzazione): si aggiorna l'elemento attuale
  const cur_ = E(id); if (!cur_ || cur_.url !== url || cur_.meta) return;
  cur_.meta = meta || { title: prettyHost(url) };
  if (!cur_.title || cur_.title === prettyHost(url)) cur_.title = (meta && meta.title) || prettyHost(url);
  touch(cur_); rebuild(cur_); commitSilent(); // l'anteprima non è un passo da annullare
}
function linkBody(el, card, kind) {
  const m = el.meta || {};
  const img = h('div', 'lk-img' + (kind === 'video' ? ' video' : ''));
  const imgUrl = safeUrl(m.image, 'img');
  if (imgUrl) { img.style.backgroundImage = `url("${imgUrl.replace(/["\\\n]/g, encodeURIComponent)}")`; card.appendChild(img); }
  else if (kind === 'video') card.appendChild(img);
  if (kind === 'video') { img.appendChild(h('div', 'lk-play')); img.classList.add('no-drag'); img.addEventListener('click', () => { const emb = embedUrl(el.url); if (!emb.src) return openUrl(el.url); /* mai incorporare indirizzi non http(s) */ const fr = h('div', 'media-frame'); const f = h('iframe', 'no-drag'); f.src = emb.src + (emb.src.includes('?') ? '&' : '?') + 'autoplay=1'; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true; fr.appendChild(f); img.replaceWith(fr); }); }
  const meta = h('div', 'lk-meta');
  const head = h('div', 'lk-head');
  if (kind === 'video' && /youtu/.test(el.url)) head.innerHTML = ICONS.play; else if (m.favicon && kind === 'video') { const i = h('img'); i.src = safeUrl(m.favicon, 'img'); i.onerror = () => i.replaceWith(h('span', '', ICONS.linkcard)); head.appendChild(i); } else head.innerHTML = ICONS.linkcard;
  head.appendChild(h('span', 'lk-url', esc(el.url)));
  const title = h('div', 'lk-title');
  const te = editableDiv('', esc(el.title || m.title || prettyHost(el.url)), 'Titolo', d => { el.title = d.textContent; touch(el); scheduleSave(); });
  te.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); te.blur(); } });
  title.appendChild(te);
  meta.append(head, title);
  if (kind !== 'video') { const d = h('div', 'lk-desc'); d.textContent = m.description || ''; meta.appendChild(d); }
  card.appendChild(meta);
}
BUILD.link = function (el, card) {
  if (!el.url) return urlInput(card, ICONS.linkcard, 'Inserisci l\'URL di un link', v => { let u = v.trim(); if (!/^[a-z]+:\/\//i.test(u)) u = 'https://' + u; el.url = u; el.title = ''; rebuild(el); commit(); unfurlInto(el); }); // l'URL è un passo annullabile, l'anteprima no
  if (!el.meta) { card.appendChild(h('div', 'lk-loading', 'Caricamento anteprima…')); unfurlInto(el); return; }
  linkBody(el, card, 'link');
};
BUILD.video = function (el, card) {
  if (!el.url && !el.fileId) {
    urlInput(card, '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M10 9l5 3-5 3z"/></svg>', 'Incolla un link da YouTube o Vimeo', v => { let u = v.trim(); if (!/^[a-z]+:\/\//i.test(u)) u = 'https://' + u; el.url = u; rebuild(el); commit(); unfurlInto(el); });
    return;
  }
  if (el.fileId) { const fr = h('div', 'media-frame'); const v = h('video', 'no-drag'); v.controls = true; fileURL(el.fileId).then(u => v.src = u); fr.appendChild(v); card.appendChild(fr); const mt = h('div', 'lk-meta'); mt.innerHTML = `<div class="lk-head">${ICONS.play}<span class="lk-url"></span></div>`; $('.lk-url', mt).textContent = el.name || 'Video'; card.appendChild(mt); return; }
  if (!el.meta) { card.appendChild(h('div', 'lk-loading', 'Caricamento video…')); unfurlInto(el); return; }
  linkBody(el, card, 'video');
};
function mapQuery(v) {
  try { const u = new URL(v); if (/google\.[a-z.]+$|goo\.gl|maps\.app/.test(u.hostname)) { const q = u.searchParams.get('q') || u.searchParams.get('query'); if (q) return q; const m = u.pathname.match(/\/place\/([^/]+)/); if (m) return decodeURIComponent(m[1].replace(/\+/g, ' ')); const at = u.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/); if (at) return at[1] + ',' + at[2]; } } catch { }
  return v.trim();
}
BUILD.map = function (el, card) {
  if (!el.query) return urlInput(card, ICONS.pin, 'Incolla un link da Google Maps o un indirizzo', v => { el.query = mapQuery(v); el.src = v.trim(); rebuild(el); commit(); });
  const fr = h('div', 'media-frame map-frame');
  const f = h('iframe', 'no-drag'); f.src = `https://maps.google.com/maps?q=${encodeURIComponent(el.query)}&z=14&output=embed`; f.loading = 'lazy';
  fr.appendChild(f); card.appendChild(fr);
  const mt = h('div', 'lk-meta'); mt.innerHTML = `<div class="lk-head">${ICONS.pin}<span class="lk-url"></span></div>`; $('.lk-url', mt).textContent = el.query;
  const t = h('div', 'lk-title'); const a = h('span', '', esc(el.title || el.query)); a.onclick = () => window.open('https://www.google.com/maps/search/' + encodeURIComponent(el.query), '_blank', 'noopener'); t.appendChild(a); mt.appendChild(t);
  card.appendChild(mt);
};
function urlInput(card, icon, ph, onSubmit) {
  const f = h('div', 'url-form', icon + `<input class="no-drag" placeholder="${esc(ph)}">`);
  const i = $('input', f);
  i.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && i.value.trim()) { e.preventDefault(); onSubmit(i.value); } if (e.key === 'Escape') i.blur(); });
  i.addEventListener('paste', e => { e.stopPropagation(); setTimeout(() => { if (/^(https?:\/\/|www\.|(m\.|music\.)?(youtube\.com|youtu\.be|vimeo\.com)\/)/i.test(i.value.trim())) onSubmit(i.value); }, 0); });
  if (navigator.clipboard?.readText) { // one-tap paste, handy on phones
    const pb = h('button', 'url-paste no-drag', 'Incolla'); pb.type = 'button';
    pb.onclick = async e => { e.stopPropagation(); try { const t = (await navigator.clipboard.readText()).trim(); if (t) { i.value = t; onSubmit(t); } else toast('Gli appunti sono vuoti'); } catch { toast('Permesso negato: tieni premuto nel campo e scegli Incolla'); i.focus(); } };
    f.appendChild(pb);
  }
  card.appendChild(f);
}

/* to-do */
let todoFocus = null; // {id, item}
BUILD.todo = function (el, card) {
  el.items = el.items || [];
  const box = h('div', 'todo');
  if (el.title != null && el.showTitle) {
    const t = liveEditable('todo-title', el.title, 'Titolo', d => { el.title = d.textContent; touch(el); scheduleSave(); }, { plain: true });
    t.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const f = $('[data-item]', card); if (f) focusEnd(f); else addTodoItem(el, -1); } });
    box.appendChild(t);
  }
  const list = h('div', 'todo-list');
  el.items.forEach((it, idx) => {
    const row = h('div', 'todo-item' + (it.done ? ' done' : '') + (it.indent ? ' ind' + Math.min(3, it.indent) : '')); row.dataset.row = it.id;
    const cb = h('div', 'cb no-drag');
    cb.onclick = () => { it.done = !it.done; row.classList.toggle('done', it.done); touch(el); commit(); };
    const tx = h('div', 'tx');
    const ed = liveEditable('', it.text, 'Aggiungi un\'attività…', d => { it.text = d.textContent; touch(el); scheduleSave(); }, { plain: true });
    ed.dataset.item = it.id;
    ed.addEventListener('focus', () => { todoFocus = { id: el.id, item: it.id }; updateCtxToolbar(); });
    ed.addEventListener('keydown', e => todoKey(e, el, it, idx, card));
    const chips = h('div', 'chips');
    if (it.due) { const c = h('span', 'chip due no-drag ' + dueState(it), ICONS.bell + esc(dueLabel(it))); c.onclick = ev => { ev.stopPropagation(); todoFocus = { id: el.id, item: it.id }; openDuePicker(c, el, it); }; chips.appendChild(c); }
    if (it.assignee) { const c = h('span', 'chip who no-drag', `<i>${esc(initials(it.assignee))}</i>${esc(it.assignee)}`); c.onclick = ev => { ev.stopPropagation(); it.assignee = null; touch(el); rebuild(el); commit(); }; chips.appendChild(c); }
    tx.append(ed, chips);
    const grip = h('div', 'grip no-drag'); grip.title = 'Trascina per riordinare';
    grip.addEventListener('pointerdown', ev => startTodoDrag(ev, el, it.id));
    row.append(cb, tx, grip); list.appendChild(row);
  });
  // empty "add task" row (as original: always a trailing input when empty)
  if (!el.items.length) {
    const row = h('div', 'todo-item'); const cb = h('div', 'cb'); cb.style.opacity = '.9';
    const tx = h('div', 'tx'); const ed = liveEditable('', '', 'Aggiungi un\'attività…', d => { if (d.textContent) { const ni = { id: uid(), text: d.textContent, done: false }; el.items.push(ni); touch(el); const n = rebuild(el); focusEnd($(`[data-item="${ni.id}"]`, n)); } }, { plain: true });
    ed.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
    tx.appendChild(ed); row.append(cb, tx); list.appendChild(row);
  }
  box.appendChild(list); card.appendChild(box);
};
function addTodoItem(el, afterIdx, indent = 0) {
  const ni = { id: uid(), text: '', done: false, indent };
  el.items.splice(afterIdx + 1, 0, ni); touch(el);
  const n = rebuild(el); commit(); focusEnd($(`[data-item="${ni.id}"]`, n)); return ni;
}
function todoKey(e, el, it, idx, card) {
  e.stopPropagation();
  const mod = e.metaKey || e.ctrlKey;
  if (e.key === 'Enter' && e.altKey) { e.preventDefault(); el.showTitle = true; if (el.title == null) el.title = ''; const n = rebuild(el); $('.todo-title', n)?.focus(); return; }
  if (e.key === 'Enter') { e.preventDefault(); if (!it.text && it.indent) { it.indent--; touch(el); const n = rebuild(el); commit(); focusEnd($(`[data-item="${it.id}"]`, n)); return; } addTodoItem(el, idx, it.indent || 0); return; }
  if (e.key === 'Backspace' && !e.target.textContent) { e.preventDefault(); if (it.indent) { it.indent--; touch(el); const n = rebuild(el); commit(); focusEnd($(`[data-item="${it.id}"]`, n)); return; } if (el.items.length > 1) { el.items.splice(idx, 1); touch(el); const n = rebuild(el); commit(); const p = el.items[Math.max(0, idx - 1)]; focusEnd($(`[data-item="${p.id}"]`, n)); } return; }
  if (e.key === 'Tab') { e.preventDefault(); it.indent = clamp((it.indent || 0) + (e.shiftKey ? -1 : 1), 0, 3); touch(el); const n = rebuild(el); commit(); focusEnd($(`[data-item="${it.id}"]`, n)); return; }
  if (e.key === 'ArrowUp' && idx > 0 && !e.shiftKey) { e.preventDefault(); focusEnd($(`[data-item="${el.items[idx - 1].id}"]`, card)); return; }
  if (e.key === 'ArrowDown' && idx < el.items.length - 1 && !e.shiftKey) { e.preventDefault(); focusEnd($(`[data-item="${el.items[idx + 1].id}"]`, card)); return; }
  if (mod && e.shiftKey && e.key === '1') { e.preventDefault(); const b = $$('#ctxbar .tool').find(x => x.dataset.act === 'due'); openDuePicker(b || e.target, el, it); return; }
  if (mod && e.shiftKey && e.key === '2') { e.preventDefault(); it.assignee = it.assignee ? null : PROFILE.name; touch(el); const n = rebuild(el); commit(); focusEnd($(`[data-item="${it.id}"]`, n)); return; }
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.target.blur(); e.shiftKey ? redo() : undo(); }
  if (e.key === 'Escape') { e.target.blur(); }
}
function startTodoDrag(ev, el, itemId) {
  ev.preventDefault(); ev.stopPropagation();
  const n = nodes.get(el.id); const rows = () => $$('.todo-item[data-row]', n);
  let target = null;
  const move = e => {
    rows().forEach(r => r.classList.remove('drag-over')); target = null;
    for (const r of rows()) { const b = r.getBoundingClientRect(); if (e.clientY < b.top + b.height / 2) { target = r.dataset.row; r.classList.add('drag-over'); break; } }
  };
  const up = () => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', up);
    rows().forEach(r => r.classList.remove('drag-over'));
    const from = el.items.findIndex(i => i.id === itemId); if (from < 0) return;
    const [it] = el.items.splice(from, 1);
    let to = target ? el.items.findIndex(i => i.id === target) : el.items.length; if (to < 0) to = el.items.length;
    el.items.splice(to, 0, it); touch(el); rebuild(el); commit();
  };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}
function openDuePicker(anchor, el, it) {
  const sel0 = it.due ? new Date(it.due + 'T00:00') : null;
  let view = sel0 ? new Date(sel0) : new Date(); view.setDate(1);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const pop = popAt(anchor, m => { m.classList.add('cal'); });
  const draw = () => {
    pop.innerHTML = '';
    const head = h('div', 'cal-h'); const pv = h('button', '', '‹'), nx = h('button', '', '›');
    pv.onclick = () => { view.setMonth(view.getMonth() - 1); draw(); }; nx.onclick = () => { view.setMonth(view.getMonth() + 1); draw(); };
    const thisMonth = view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth(); if (thisMonth) pv.style.visibility = 'hidden';
    head.append(pv, h('span', '', view.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })), nx);
    const g = h('div', 'cal-g'); ['L', 'M', 'M', 'G', 'V', 'S', 'D'].forEach(d => g.appendChild(h('div', 'dow', d)));
    const first = (view.getDay() + 6) % 7; for (let i = 0; i < first; i++) g.appendChild(h('div'));
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const dt = new Date(view.getFullYear(), view.getMonth(), d); const b = h('button', '', d);
      if (dt < today) { b.classList.add('past'); b.disabled = true; } if (dt.getTime() === today.getTime()) b.classList.add('today'); if (it.due === iso(dt)) b.classList.add('sel');
      b.onclick = () => { it.due = iso(dt); if (it.remind == null) it.remind = '9am'; touch(el); rebuild(el); commit(); draw(); };
      g.appendChild(b);
    }
    const f = h('div', 'cal-f');
    const tl = h('label', '', ICONS.clock + `<input type="time" value="${it.dueTime || ''}" placeholder="Aggiungi orario…">`);
    $('input', tl).onchange = e => { it.dueTime = e.target.value || null; if (!it.due) it.due = iso(today); touch(el); rebuild(el); commit(); };
    const rl = h('label', '', ICONS.bell + `<select><option value="none">Nessun promemoria</option><option value="attime">All'orario di scadenza</option><option value="9am">Alle 9 del giorno di scadenza</option><option value="1d">Il giorno prima alle 9</option><option value="1w">Una settimana prima alle 9</option></select>`);
    $('select', rl).value = it.remind || '9am';
    $('select', rl).onchange = e => { it.remind = e.target.value; touch(el); commit(); if (it.remind !== 'none' && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission(); };
    f.append(tl, rl);
    if (it.due) { const rm = h('button', 'rm', 'Rimuovi scadenza'); rm.onclick = () => { it.due = null; it.dueTime = null; touch(el); rebuild(el); commit(); closePops(); }; f.appendChild(rm); }
    pop.append(head, g, f);
  };
  draw();
}
// promemoria: controllo periodico
const firedReminders = new Set(JSON.parse(localStorage.getItem('bacheca-fired') || '[]'));
function checkReminders() {
  if (!S) return; const now = Date.now();
  for (const el of Object.values(S.elements)) {
    if (el.type !== 'todo' || el.deleted) continue;
    for (const it of el.items || []) {
      if (!it.due || it.done || !it.remind || it.remind === 'none') continue;
      const d = new Date(it.due + 'T00:00');
      let at;
      if (it.remind === 'attime') at = new Date(it.due + 'T' + (it.dueTime || '09:00')).getTime();
      else if (it.remind === '9am') at = d.getTime() + 9 * 3600e3;
      else if (it.remind === '1d') at = d.getTime() - 15 * 3600e3;
      else if (it.remind === '1w') at = d.getTime() - 6 * 86400e3 - 15 * 3600e3;
      const key = it.id + '@' + it.due + it.remind + (it.dueTime || '');
      if (at <= now && now - at < 7 * 86400e3 && !firedReminders.has(key)) {
        firedReminders.add(key); localStorage.setItem('bacheca-fired', JSON.stringify([...firedReminders]));
        const msg = `Promemoria: ${it.text || 'attività'} — ${dueLabel(it)}`;
        toast(msg, 'Apri', () => openBoard(el.board, el.id));
        if ('Notification' in window && Notification.permission === 'granted') new Notification('Bacheca', { body: msg });
      }
    }
  }
}

/* board */
BUILD.board = function (el, card) {
  const b = S.boards[el.target] || { title: '?' };
  const box = h('div', 'iconview-box');
  const bi = h('div', 'bi', boardIconHTML(b));
  if (b.iconImg) fileURL(b.iconImg).then(u => { bi.style.backgroundImage = `url(${u})`; });
  const name = editableDiv('bname', esc(b.title), 'Senza titolo', d => { b.title = d.textContent; scheduleSave(); });
  name.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); name.blur(); } });
  box.append(bi, name, h('div', 'bsub', esc(boardCounts(el.target))));
  card.appendChild(box);
};
/* document */
BUILD.document = function (el, card, node) {
  if (el.cardView) {
    node.classList.remove('iconview');
    const c = h('div', 'doc-card', `<div class="dt"></div><div class="dp rt"></div>`);
    $('.dt', c).textContent = el.title || 'Nuovo documento'; $('.dp', c).innerHTML = safeHtml(el.html);
    card.appendChild(c); return;
  }
  node.classList.add('iconview');
  const box = h('div', 'iconview-box');
  const ico = h('div', 'doc-ico', ICONS.doc);
  const name = editableDiv('bname', esc(el.title || 'Nuovo documento'), 'Senza titolo', d => { el.title = d.textContent; touch(el); scheduleSave(); });
  name.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); name.blur(); } });
  const wc = wordCount(el.html);
  box.append(ico, name, h('div', 'bsub', wc + (wc === 1 ? ' parola' : ' parole')));
  card.appendChild(box);
};
/* column */
BUILD.column = function (el, card) {
  const head = h('div', 'col-head');
  const t = liveEditable('col-title', el.title, 'Colonna senza titolo', d => { el.title = d.textContent; touch(el); scheduleSave(); }, { plain: true });
  t.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); t.blur(); } });
  const col = h('button', 'col-collapse no-drag', '−'); col.title = 'Comprimi';
  col.onclick = () => { el.collapsed = !el.collapsed; commit(); placeColumnChildren(el); updateLines(); };
  head.append(t, h('div', 'col-count'), col);
  card.append(head, h('div', 'col-body'));
};
function placeColumnChildren(col) {
  const n = nodes.get(col.id); if (!n) return;
  const body = $('.col-body', n);
  col.items = col.items.filter(id => E(id) && !E(id).deleted && E(id).board === col.board && E(id).type !== 'column' && E(id).type !== 'line');
  col.items.forEach(id => { const el = E(id); el.col = col.id; const c = nodes.get(id); if (c) body.appendChild(c); });
  const empty = $('.col-empty', body);
  if (col.items.length === 0 && !empty) body.prepend(h('div', 'col-empty'));
  if (col.items.length && empty) empty.remove();
  $('.col-count', n).textContent = colCounts(col);
  n.classList.toggle('collapsed', !!col.collapsed);
  const b = $('.col-collapse', n); if (b) { b.textContent = col.collapsed ? '+' : '−'; b.title = col.collapsed ? 'Espandi' : 'Comprimi'; }
}
/* comment */
BUILD.comment = function (el, card) {
  el.thread = el.thread || [];
  el.thread.forEach((m, i) => {
    const c = h('div', 'cm');
    c.innerHTML = `<div class="av">${esc(initials(m.author))}</div><div class="details"><div class="meta"><b></b><span class="when">${relTime(m.ts)}</span>${m.author === PROFILE.name ? '<button class="edit no-drag">Modifica</button>' : ''}</div><div class="body"></div></div>`;
    $('.meta b', c).textContent = (m.agent ? '🤖 ' : '') + m.author; $('.body', c).textContent = m.text; // 🤖: scritto da un agente (comment_element)
    if (m.agent) c.classList.add('cm-agent');
    if (PROFILE.avatar && m.author === PROFILE.name) $('.av', c).style.backgroundImage = `url(${PROFILE.avatar})`;
    $('.edit', c)?.addEventListener('click', () => {
      const body = $('.body', c); body.contentEditable = 'plaintext-only'; body.classList.add('editable', 'no-drag'); focusEnd(body);
      body.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); body.blur(); } if (e.key === 'Escape') { body.textContent = m.text; body.blur(); } };
      body.onblur = () => { const t = body.innerText.trim(); if (!t) el.thread.splice(i, 1); else m.text = t; m.edited = true; touch(el); rebuild(el); commit(); };
    });
    card.appendChild(c);
  });
  const showForm = !el.thread.length || el._replying;
  if (!showForm) {
    const r = h('button', 'cm-reply no-drag', 'Rispondi'); r.onclick = () => { el._replying = true; const n = rebuild(el); $('.cm-form .editable', n)?.focus(); };
    card.appendChild(r);
  } else {
    const f = h('div', 'cm-form'); f.innerHTML = `<div class="av">${esc(initials(PROFILE.name))}</div>`;
    const ed = liveEditable('', '', el.thread.length ? 'Rispondi…' : 'Scrivi un commento…', () => { send.classList.toggle('ready', !!ed.textContent.trim()); }, { plain: true });
    const send = h('button', 'no-drag', 'Invia');
    const go = () => { const t = ed.innerText.trim(); if (!t) return; el.thread.push({ author: PROFILE.name, text: t, ts: Date.now() }); el._replying = false; touch(el); rebuild(el); commit(); };
    ed.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } if (e.key === 'Escape') { el._replying = false; ed.blur(); rebuild(el); } });
    ed.addEventListener('blur', () => { if (!ed.textContent.trim() && el.thread.length && el._replying) { el._replying = false; setTimeout(() => rebuild(el), 0); } });
    send.onclick = go; f.append(ed, send); card.appendChild(f);
  }
};
/* color swatch */
BUILD.color = function (el, card) {
  const sw = h('div', 'swatch no-drag' + (isDark(el.hex) ? ' darkc' : '')); sw.style.setProperty('--sw', el.hex);
  const hx = h('span', 'swatch-hex editable no-drag', esc(el.hex.toUpperCase())); hx.contentEditable = 'plaintext-only';
  hx.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); hx.blur(); } });
  hx.addEventListener('blur', () => { let v = hx.textContent.trim(); if (!v.startsWith('#')) v = '#' + v; if (/^#[0-9a-f]{6}$/i.test(v)) { const autoName = el.name == null || el.name === colorName(el.hex); el.hex = v.toLowerCase(); if (autoName) el.name = colorName(el.hex); touch(el); rebuild(el); commit(); } else hx.textContent = el.hex.toUpperCase(); });
  hx.addEventListener('pointerdown', e => e.stopPropagation());
  sw.appendChild(hx);
  const inp = h('input'); inp.type = 'color'; inp.value = el.hex; inp.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0';
  sw.addEventListener('dblclick', () => inp.click());
  inp.oninput = () => { el.hex = inp.value; sw.style.setProperty('--sw', el.hex); hx.textContent = el.hex.toUpperCase(); sw.classList.toggle('darkc', isDark(el.hex)); };
  inp.onchange = () => { if (el.name == null || el.autoName !== false) el.name = colorName(el.hex); touch(el); rebuild(el); commit(); };
  const nm = liveEditable('swatch-name', el.name ?? colorName(el.hex), 'Nome colore', d => { el.name = d.textContent; el.autoName = false; touch(el); scheduleSave(); }, { plain: true });
  nm.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nm.blur(); } });
  card.append(sw, inp, nm);
};
/* sketch */
BUILD.sketch = function (el, card) {
  const c = h('div', 'sketch-card');
  if (el.strokes.length) c.innerHTML = strokesSVG(el.strokes, 800, 500);
  else c.innerHTML = `<div class="sketch-empty">${ICONS.pencil}Fai doppio clic per iniziare a disegnare</div>`;
  card.appendChild(c);
};
/* file */
BUILD.file = function (el, card) {
  if (!el.fileId) { const p = h('div', 'pick', 'Carica un file<br><button class="no-drag">Scegli file…</button>'); $('button', p).onclick = () => pickFiles('', false, async f => { Object.assign(el, { fileId: await storeFile(f[0]), name: f[0].name, size: f[0].size, mime: f[0].type }); rebuild(el); commit(); }); card.appendChild(p); return; }
  const ext = (el.name.split('.').pop() || 'file').slice(0, 4).toLowerCase();
  const c = h('div', 'file-card', `<div class="file-ico">${esc(ext)}</div><div class="file-info"><div class="file-name"></div><div class="file-size">${fmtSize(el.size || 0)}</div></div>`);
  $('.file-name', c).textContent = el.name;
  const colors = { pdf: '#e5483d', xls: '#3f9b5b', xlsx: '#3f9b5b', csv: '#3f9b5b', doc: '#2f63f7', docx: '#2f63f7', ppt: '#e07b20', pptx: '#e07b20', zip: '#8d929a', txt: '#5f6672' };
  $('.file-ico', c).style.color = colors[ext] || '#7d5ce6';
  if (/^xls|csv/.test(ext)) $('.file-ico', c).textContent = 'x';
  card.appendChild(c);
};
/* image */
BUILD.image = function (el, card) {
  if (!el.fileId) { const p = h('div', 'pick', 'Aggiungi un\'immagine<br><button class="no-drag">Scegli file…</button>'); $('button', p).onclick = () => pickFiles('image/*', false, async f => { el.fileId = await storeFile(f[0]); el.name = f[0].name; rebuild(el); commit(); }); card.appendChild(p); return; }
  const img = h('img'); img.alt = el.name || ''; img.draggable = false;
  fileURL(el.fileId).then(u => { img.src = u; img.onload = () => { updateLines(); updateStageSize(); }; });
  card.appendChild(img);
  if (el.caption != null) { const cap = editableDiv('caption', esc(el.caption || ''), 'Aggiungi una didascalia', d => { el.caption = d.textContent; touch(el); scheduleSave(); }); card.appendChild(cap); }
};

/* ------------------------------ Rich text ------------------------------ */
function wireRichText(ed, el) {
  ed.addEventListener('keydown', e => rtKey(e, ed));
  ed.addEventListener('click', e => {
    const li = e.target.closest('ul.check > li'); if (!li) return;
    const r = li.getBoundingClientRect(); if (e.clientX - r.left < 22) { e.preventDefault(); li.classList.toggle('done'); ed.dispatchEvent(new Event('input')); commit(); }
  });
  ed.addEventListener('input', () => autoLink(ed));
}
function currentBlock(ed) {
  const s = getSelection(); if (!s.rangeCount) return null; let n = s.anchorNode;
  if (!ed.contains(n)) return null;
  while (n && n.parentNode !== ed) { if (n.nodeName === 'LI') return n; n = n.parentNode; }
  return n;
}
function setBlock(kind) {
  const ed = editing?.ed || document.activeElement; if (!ed || !ed.isContentEditable) return;
  const tagOf = { large: 'h1', normal: 'h2', text: 'p', small: 'p', code: 'pre', callout: 'div', quote: 'blockquote' };
  document.execCommand('formatBlock', false, tagOf[kind]);
  const b = currentBlock(ed);
  if (b && b.nodeType === 1) { b.classList.remove('small', 'callout'); if (kind === 'small') b.classList.add('small'); if (kind === 'callout') b.classList.add('callout'); if (!b.className) b.removeAttribute('class'); }
  ed.dispatchEvent(new Event('input'));
}
function blockKind(ed) {
  const b = currentBlock(ed); if (!b || b.nodeType !== 1) return 'text';
  if (b.nodeName === 'H1') return 'large'; if (b.nodeName === 'H2') return 'normal'; if (b.nodeName === 'PRE') return 'code'; if (b.nodeName === 'BLOCKQUOTE') return 'quote';
  if (b.classList.contains('callout')) return 'callout'; if (b.classList.contains('small')) return 'small'; return 'text';
}
function rtKey(e, ed) {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.shiftKey && ['1', '2', '0', '9'].includes(e.key)) { e.preventDefault(); setBlock({ 1: 'large', 2: 'normal', 0: 'text', 9: 'small' }[e.key]); return; }
  if (mod && e.shiftKey && e.code === 'Digit1') { e.preventDefault(); setBlock('large'); return; }
  if (mod && e.shiftKey && e.key.toLowerCase() === 'u') { e.preventDefault(); document.execCommand('insertUnorderedList'); ed.dispatchEvent(new Event('input')); return; }
  if (mod && e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); document.execCommand('insertOrderedList'); ed.dispatchEvent(new Event('input')); return; }
  if (mod && e.shiftKey && e.key.toLowerCase() === 'x') { e.preventDefault(); document.execCommand('strikeThrough'); ed.dispatchEvent(new Event('input')); return; }
  if (mod && e.key.toLowerCase() === 'j') { e.preventDefault(); toggleHighlight('#fde9a6'); return; }
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); insertLinkPrompt(); return; }
  if (mod && e.key === '\\') { e.preventDefault(); toggleCenter(ed); return; }
  if (mod && (e.key === '>' || (e.shiftKey && e.key === '.'))) { e.preventDefault(); setBlock(blockKind(ed) === 'code' ? 'text' : 'code'); return; }
  if (mod && (e.key === '"' || e.key === "'")) { e.preventDefault(); setBlock(blockKind(ed) === 'quote' ? 'text' : 'quote'); return; }
  if (e.key === 'Tab') { e.preventDefault(); document.execCommand(e.shiftKey ? 'outdent' : 'indent'); ed.dispatchEvent(new Event('input')); return; }
  if (e.key === ' ' || e.key === 'Enter') {
    const s = getSelection(); if (!s.isCollapsed || !s.anchorNode || !ed.contains(s.anchorNode)) return;
    const blk = mdBlock(ed); if (!blk) return;
    // text from block start to caret
    const r = document.createRange(); r.selectNodeContents(blk); r.setEnd(s.anchorNode, s.anchorOffset);
    const before = r.toString();
    if (e.key === 'Enter') { if (before.trim() === '---' && blk.textContent.trim() === '---') { e.preventDefault(); const hr = document.createElement('hr'); const p = document.createElement('p'); p.appendChild(document.createElement('br')); blk.replaceWith(hr); hr.after(p); caretIn(p); ed.dispatchEvent(new Event('input')); } return; }
    const kinds = { '#': 'large', '##': 'normal', '>': 'quote', '```': 'code', '!': 'callout', '*': 'ul', '-': 'ul', '1.': 'ol', '[]': 'check' };
    const kind = kinds[before]; if (!kind) return;
    if (blk.nodeName === 'LI' && !['ul', 'ol', 'check'].includes(kind)) return;
    e.preventDefault();
    const rest = blk.textContent.slice(before.length);
    let el, target;
    if (kind === 'ul' || kind === 'ol' || kind === 'check') { el = document.createElement(kind === 'ol' ? 'ol' : 'ul'); if (kind === 'check') el.className = 'check'; target = document.createElement('li'); el.appendChild(target); }
    else { el = document.createElement({ large: 'h1', normal: 'h2', quote: 'blockquote', code: 'pre', callout: 'div' }[kind]); if (kind === 'callout') el.className = 'callout'; target = el; }
    if (rest) target.textContent = rest; else target.appendChild(document.createElement('br'));
    if (blk.nodeName === 'LI') { const list = blk.parentNode; if (list.nextSibling || list.children.length > 1) { blk.remove(); list.after(el); } else list.replaceWith(el); }
    else blk.replaceWith(el);
    caretIn(target); ed.dispatchEvent(new Event('input'));
  }
}
function mdBlock(ed) {
  const s = getSelection(); let n = s.anchorNode;
  if (n === ed) { // caret directly in editor: wrap loose content
    const p = document.createElement('p'); p.appendChild(document.createElement('br')); ed.appendChild(p); caretIn(p); return p;
  }
  while (n && n.parentNode !== ed) { if (n.nodeName === 'LI') return n; n = n.parentNode; }
  if (!n) return null;
  if (n.nodeType === 3) { const p = document.createElement('p'); n.replaceWith(p); p.appendChild(n); const r = document.createRange(); r.setStart(n, s.anchorOffset); r.collapse(true); s.removeAllRanges(); s.addRange(r); return p; }
  return n;
}
function caretIn(node) {
  const r = document.createRange(); const t = node.firstChild;
  if (t && t.nodeType === 3) r.setStart(t, 0); else r.setStart(node, 0);
  r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}
function autoLink(ed) {
  const s = getSelection(); if (!s.anchorNode || s.anchorNode.nodeType !== 3) return;
  const t = s.anchorNode; if (t.parentElement.closest('a, pre, code')) return;
  const before = t.textContent.slice(0, s.anchorOffset);
  const m = before.match(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])\s$/); if (!m) return;
  const start = s.anchorOffset - m[0].length, end = start + m[1].length;
  const r = document.createRange(); r.setStart(t, start); r.setEnd(t, end);
  const a = document.createElement('a'); a.href = m[1]; a.target = '_blank'; a.rel = 'noopener'; r.surroundContents(a);
  const r2 = document.createRange(); r2.setStartAfter(a); r2.setStart(a.nextSibling || a.parentNode, a.nextSibling ? 1 : 0); r2.collapse(true); s.removeAllRanges(); s.addRange(r2);
  ed.dispatchEvent(new Event('input'));
}
function toggleHighlight(col) {
  const cur = document.queryCommandValue('hiliteColor'); const none = !cur || cur === 'transparent' || cur === 'rgba(0, 0, 0, 0)';
  document.execCommand('hiliteColor', false, none || !col ? (col || 'transparent') : 'transparent');
  document.activeElement?.dispatchEvent(new Event('input'));
}
function toggleCenter(ed) { const on = document.queryCommandState('justifyCenter'); document.execCommand(on ? 'justifyLeft' : 'justifyCenter'); ed?.dispatchEvent(new Event('input')); }
function insertLinkPrompt() {
  const s = getSelection(); const range = s.rangeCount ? s.getRangeAt(0).cloneRange() : null; const ed = document.activeElement;
  const anchor = range ? (range.getBoundingClientRect().width ? range.getBoundingClientRect() : ed.getBoundingClientRect()) : ed.getBoundingClientRect();
  const pop = popAt({ getBoundingClientRect: () => anchor, left: anchor.left, right: anchor.left, top: anchor.bottom, bottom: anchor.bottom }, m => {
    m.innerHTML = `<div class="url-form" style="height:44px;padding:0 10px;width:300px">${ICONS.link}<input placeholder="Incolla o scrivi un link…"></div>`;
  }, { below: true });
  const inp = $('input', pop); setTimeout(() => inp.focus(), 0);
  inp.onkeydown = e => {
    e.stopPropagation();
    if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); let u = inp.value.trim(); if (!/^[a-z]+:/i.test(u)) u = 'https://' + u; ed.focus(); s.removeAllRanges(); if (range) s.addRange(range); if (s.isCollapsed) document.execCommand('insertHTML', false, `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`); else document.execCommand('createLink', false, u); ed.dispatchEvent(new Event('input')); closePops(); }
    if (e.key === 'Escape') { closePops(); ed.focus(); }
  };
}
function textStylePop(anchor) {
  const ed = editing?.ed || document.activeElement; const kind = blockKind(ed);
  popAt(anchor, m => {
    m.style.width = '230px';
    [['large', 'Titolo grande', 'ts-l', '⌘ ⇧ 1'], ['normal', 'Titolo normale', 'ts-n', '⌘ ⇧ 2'], ['text', 'Testo normale', '', '⌘ ⇧ 0'], ['small', 'Testo piccolo', 'ts-s', '⌘ ⇧ 9'], ['code', '<span class="ts-c">Blocco di codice</span>', '', '⌘ >'], ['callout', '⚠️ Riquadro', '', ''], ['quote', '<span class="ts-q">“Citazione”</span>', '', '⌘ "']].forEach(([k, l, cls, key]) => {
      const d = h('div', 'ts-item' + (kind === k ? ' on' : ''), `<span class="${cls}">${l}</span>${kbdHTML(key)}`);
      d.addEventListener('mousedown', e => { e.preventDefault(); ed.focus(); setBlock(k); closePops(); updateCtxToolbar(); });
      m.appendChild(d);
    });
    m.appendChild(h('div', 'msep'));
    m.appendChild(h('div', 'mlabel', 'Colore'));
    const c1 = h('div', 'tcolors'); TEXT_COL.forEach(c => { const i = h('i', '', 'A'); i.style.color = c || 'var(--ink)'; i.addEventListener('mousedown', e => { e.preventDefault(); ed.focus(); document.execCommand('foreColor', false, c || '#323b4a'); ed.dispatchEvent(new Event('input')); closePops(); }); c1.appendChild(i); }); m.appendChild(c1);
    m.appendChild(h('div', 'mlabel', 'Evidenziatore'));
    const c2 = h('div', 'tcolors'); HL_COL.forEach(c => { const i = h('i', '', 'A'); i.style.background = c; i.style.color = c === '#323b4a' ? '#fff' : 'var(--ink)'; i.addEventListener('mousedown', e => { e.preventDefault(); ed.focus(); document.execCommand('hiliteColor', false, c); if (c === '#323b4a') document.execCommand('foreColor', false, '#ffffff'); ed.dispatchEvent(new Event('input')); closePops(); }); c2.appendChild(i); }); m.appendChild(c2);
  });
}
// the editing toolbar replaces the old floating format bar
function showFormatBar() { updateCtxToolbar(); }
function hideFormatBar() { setTimeout(updateCtxToolbar, 0); }
function positionFormatBar() { }

/* ------------------------------ Modifica ------------------------------ */
function enterEdit(el, ev) {
  const n = nodes.get(el.id); if (!n) return false;
  let ed = null;
  if (el.type === 'note' || el.type === 'heading') ed = $('.text', n);
  else if (el.type === 'link' || el.type === 'video') ed = $('.lk-title .editable', n);
  else if (el.type === 'board' || (el.type === 'document' && !el.cardView)) ed = $('.bname', n);
  else if (el.type === 'image') { if (el.caption == null) { el.caption = ''; rebuild(el); } ed = $('.caption', nodes.get(el.id)); }
  if (!ed) return false;
  blurEditing();
  if (el.type === 'note' && !ed.innerHTML.trim()) ed.innerHTML = '<p><br></p>';
  ed.contentEditable = 'true'; ed.focus();
  editing = { id: el.id, ed };
  if (el.type === 'note' && ed.textContent === '') { const r = document.createRange(); r.setStart(ed.firstChild, 0); r.collapse(true); getSelection().removeAllRanges(); getSelection().addRange(r); }
  if (ev && ed.textContent && !['board', 'document'].includes(el.type)) {
    const r = document.caretRangeFromPoint?.(ev.clientX, ev.clientY);
    const s = getSelection(); s.removeAllRanges();
    if (r && ed.contains(r.startContainer)) s.addRange(r); else { const rr = document.createRange(); rr.selectNodeContents(ed); rr.collapse(false); s.addRange(rr); }
  } else focusEnd(ed);
  if (['board', 'document'].includes(el.type)) { const rr = document.createRange(); rr.selectNodeContents(ed); getSelection().removeAllRanges(); getSelection().addRange(rr); }
  ed.addEventListener('blur', onEditBlur, { once: true });
  updateCtxToolbar();
  return true;
}
function onEditBlur() {
  if (!editing) return;
  const { id, ed } = editing; editing = null;
  ed.contentEditable = 'false';
  const el = E(id);
  setTimeout(updateCtxToolbar, 0);
  if (!el) return;
  if ((el.type === 'note' || el.type === 'heading') && !stripHtml(el.html).trim() && !/<(img|hr)/.test(el.html || '')) { removeElements([id], true); return; }
  if (el.type === 'board') {
    const b = S.boards[el.target]; const first = !b.named; b.title = ed.textContent.trim() || 'Nuova board'; ed.textContent = b.title; b.named = true;
    if (first && !b.icon && !b.iconImg) autoBoardLook(b);
    rebuild(el); renderChrome();
  }
  if (el.type === 'document') { el.title = ed.textContent.trim() || 'Nuovo documento'; rebuild(el); }
  if (el.type === 'image') { el.caption = ed.textContent; if (!el.caption) el.caption = null; rebuild(el); }
  commit();
}
function autoBoardLook(b) {
  const words = b.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(Boolean);
  const em = words.map(w => EMOJI[w] || EMOJI[w.replace(/s$/, '')]).find(Boolean);
  b.icon = em ? { type: 'emoji', ch: em } : { type: 'letters', text: autoInitials(b.title) };
  if (!b.colorSet) { const pal = [...BOARD_MUTED, '#c9d6a9', '#a8c5d8', '#e6c7a9', '#d9b8d9', '#b8d9c4']; b.color = pal[Math.abs([...b.title].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % pal.length]; }
}

/* ------------------------------ Click / doppio clic ------------------------------ */
function clickElement(id, ev, wasSelected) {
  const el = E(id); if (!el) return;
  if (ev.shiftKey || ev.metaKey) return;
  if (ev.pointerType === 'touch' && wasSelected) {
    if (el.type === 'board') return openBoard(el.target);
    if (el.type === 'document') return openDocument(el);
    if (el.type === 'sketch') return openSketch(el);
    if (el.type === 'image' && !ev.target.closest('.caption')) return openLightbox(el);
  }
  switch (el.type) {
    case 'board': if (wasSelected && ev.target.closest('.bname')) enterEdit(el, ev); break;
    case 'document': if (wasSelected && ev.target.closest('.bname')) enterEdit(el, ev); break;
    case 'note': case 'heading': if (wasSelected || ev.target.closest('a') == null) enterEdit(el, ev); break;
    case 'link': case 'video': if (wasSelected && ev.target.closest('.lk-title')) enterEdit(el, ev); break;
    case 'table': if (wasSelected) { const td = ev.target.closest('td'); if (td) tEnter(el.id, +td.dataset.r, +td.dataset.c); } break;
    case 'image': if (ev.target.closest('.caption')) enterEdit(el, ev); break;
  }
}
function onDblClick(ev) {
  if (drawState || ev.target.closest('.drawtb')) return;
  const n = ev.target.closest('.el'); if (!n) return;
  const el = E(n.dataset.id); if (!el) return;
  ev.stopImmediatePropagation();
  if (el.type === 'board') { if (ev.metaKey) window.open('#/' + el.target, '_blank'); else if (!ev.target.closest('.bname[contenteditable="true"]')) openBoard(el.target); return; }
  if (el.type === 'document') return openDocument(el);
  if (el.type === 'sketch') return openSketch(el);
  if (el.type === 'image' && !ev.target.closest('.caption')) return openLightbox(el);
  if (el.type === 'link' && el.url && !ev.target.closest('.lk-title')) return openUrl(el.url);
  if (el.type === 'drawing') return editDrawing(el);
  if (el.type === 'table') { const td = ev.target.closest('td'); if (td) { tEnter(el.id, +td.dataset.r, +td.dataset.c); tStartEdit(); } return; }
  if (el.type === 'note' || el.type === 'heading') { if (!editing) enterEdit(el, ev); return; }
  if (el.type === 'color') return;
}
function showCanvasMenu() { /* l'originale non ha menu sul canvas vuoto */ }

/* ------------------------------ "Drag me" ------------------------------ */
function toolDragEnd(ev) {
  const td = toolDrag; toolDrag = null;
  td.ghost?.remove(); document.body.classList.remove('dragging'); $$('.col-ph').forEach(x => x.remove());
  $('#unsorted-panel')?.classList.remove('hot');
  if (!td.moved) { if (td.pointerType === 'touch' || td.type === 'agenttask') return addElement(td.type); if (td.type === 'draw') return toggleDraw(); /* "Compito agente" apre un modulo: basta un clic */ if (td.type === 'image' || td.type === 'file') return addElement(td.type); return dragMeTip(ev); }
  const up = $('#unsorted-panel'); const ur = up && !up.classList.contains('hidden') ? up.getBoundingClientRect() : null;
  const r = VP().getBoundingClientRect();
  if (ur && ev.clientX >= ur.left) { const el = addElement(td.type, { x: 0, y: 0 }); if (el) moveToUnsorted([el.id]); return; }
  if (ev.clientX < r.left || ev.clientY < r.top) return;
  const p = toWorld(ev.clientX, ev.clientY);
  const at = { x: Math.max(0, Math.round(p.x - 30)), y: Math.max(0, Math.round(p.y - 20)) };
  if (td.type === 'image' || td.type === 'file') return pickFiles(td.type === 'image' ? 'image/*' : '', true, fs => { addFiles(fs, at).then(() => { if (td.col) { insertIntoColumn([...sel], td.col.col, td.col.idx); render(); commit(); } }); });
  if (td.type === 'draw') return toggleDraw();
  const el = addElement(td.type, at, { intoCol: td.col });
  if (el && !td.col) requestAnimationFrame(() => pushOverlaps(el.id));
}
function toolDragMove(ev) {
  if (toolDrag.pointerType === 'touch' && Math.abs(ev.clientX - toolDrag.cx) > Math.abs(ev.clientY - toolDrag.cy)) return;
  if (!toolDrag.moved && Math.hypot(ev.clientX - toolDrag.cx, ev.clientY - toolDrag.cy) > 5) {
    toolDrag.moved = true; hidePopups(); $$('.tip-dragme').forEach(t => t.remove());
    const g = h('div'); g.id = 'dragghost'; g.appendChild(ghostFor(toolDrag.type)); document.body.appendChild(g); toolDrag.ghost = g;
    document.body.classList.add('dragging');
  }
  if (toolDrag.ghost) {
    toolDrag.ghost.style.left = ev.clientX - 30 * zoom + 'px'; toolDrag.ghost.style.top = ev.clientY - 20 * zoom + 'px'; toolDrag.ghost.style.transform = `scale(${zoom})`;
    $$('.col-ph').forEach(x => x.remove());
    if (!['column', 'line', 'draw'].includes(toolDrag.type)) {
      const t = columnAt(ev.clientX, ev.clientY); toolDrag.col = t;
      if (t) { const body = $('.col-body', nodes.get(t.col)); const kids = $$(':scope > .el', body); const ph = h('div', 'col-ph'); if (t.idx >= kids.length) body.appendChild(ph); else body.insertBefore(ph, kids[t.idx]); }
    }
    const up = $('#unsorted-panel'); if (up && !up.classList.contains('hidden')) up.classList.toggle('hot', ev.clientX >= up.getBoundingClientRect().left);
  }
}
function ghostFor(type) {
  const w = { board: 98, document: 98, color: 168, line: 120, heading: 338 }[type] || 338;
  const d = h('div', `el el-${type}`); d.style.position = 'relative'; d.style.width = w + 'px';
  const card = h('div', 'card'); d.appendChild(card);
  const ph = { note: '<div class="text rt" style="color:#b9bcc1">Inizia a scrivere…</div>', link: `<div class="url-form">${ICONS.linkcard}<span style="color:#b9bcc1">Inserisci l'URL di un link</span></div>`, todo: '<div class="todo"><div class="todo-item"><div class="cb"></div><div class="tx todo-ph">Aggiungi un\'attività…</div></div></div>', column: '<div class="col-head" style="padding-top:17px"><div class="col-title">Nuova colonna</div><div class="col-count">0 card</div></div><div class="col-body"><div class="col-empty"></div></div>', comment: '<div class="cm-form"><div class="av">' + esc(initials(PROFILE.name)) + '</div><div class="editable" style="color:#b9bcc1">Scrivi un commento…</div></div>', board: '<div class="iconview-box"><div class="bi"></div><div class="bname">Nuova board</div><div class="bsub">0 card</div></div>', document: `<div class="iconview-box"><div class="doc-ico">${ICONS.doc}</div><div class="bname">Nuovo documento</div><div class="bsub">0 parole</div></div>`, table: '<table class="tbl"><colgroup><col style="width:113px"><col style="width:113px"><col style="width:112px"></colgroup>' + '<tr><td class="hdr"><div class="cv"></div></td><td class="hdr"><div class="cv"></div></td><td class="hdr"><div class="cv"></div></td></tr>'.concat('<tr><td><div class="cv"></div></td><td><div class="cv"></div></td><td><div class="cv"></div></td></tr>'.repeat(3)) + '</table>', heading: '<div class="text" style="color:#b9bcc1">Titolo</div>', color: '<div class="swatch" style="--sw:#96b74a"></div><div class="swatch-name">&nbsp;</div>', sketch: `<div class="sketch-card"><div class="sketch-empty">${ICONS.pencil}Fai doppio clic per iniziare a disegnare</div></div>`, video: `<div class="url-form"><span style="color:#b9bcc1">Incolla un link da YouTube o Vimeo</span></div>`, map: `<div class="url-form">${ICONS.pin}<span style="color:#b9bcc1">Incolla un link da Google Maps</span></div>`, audio: '<div class="pick">Aggiungi un file audio</div>', line: '<svg viewBox="0 0 120 120" width="120" height="120" style="display:block"><path d="M8 112 112 8M96 8h16v16" stroke="#323b4a" stroke-width="2"/></svg>' }[type] || '';
  card.innerHTML = ph;
  if (['board', 'document', 'heading', 'line'].includes(type)) { card.style.background = 'transparent'; card.style.boxShadow = 'none'; }
  if (type === 'board' || type === 'document') d.classList.add('iconview');
  return d;
}
function dragMeTip(ev) {
  $$('.tip-dragme').forEach(t => t.remove());
  const tool = document.elementsFromPoint(ev.clientX, ev.clientY).map(n => n.closest?.('.tool')).find(Boolean); if (!tool) return;
  const r = tool.querySelector('.ti').getBoundingClientRect();
  const t = h('div', 'tip-dragme', 'Trascinami'); document.body.appendChild(t);
  t.style.left = r.right + 10 + 'px'; t.style.top = r.top + r.height / 2 - t.offsetHeight / 2 + 'px';
  setTimeout(() => t.remove(), 1400);
}
function pushOverlaps(id) {
  const a = elRect(id); if (!a) return; let moved = false;
  for (const o of boardEls()) {
    if (o.id === id || o.col || o.type === 'line' || o.locked) continue;
    const b = elRect(o.id); if (!b) continue;
    if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
      // push below the new element
      o.y = Math.round(a.y + a.h + 20); moved = true;
    }
  }
  if (moved) { render(); commit(); }
}

/* ------------------------------ Toolbar contestuale ------------------------------ */
function tbtn(ct, icon, label, fn, opts = {}) {
  const b = h('div', 'tool' + (opts.cls ? ' ' + opts.cls : '') + (opts.on ? ' on' : '') + (opts.disabled ? ' disabled' : ''), `<div class="ti">${icon}</div>${label ? `<span>${label}</span>` : ''}`);
  if (opts.act) b.dataset.act = opts.act; if (opts.title) b.title = opts.title;
  if (!opts.disabled) { if (opts.keepFocus) b.addEventListener('mousedown', e => e.preventDefault()); b.addEventListener('click', e => { e.stopPropagation(); fn(b, e); }); }
  ct.appendChild(b); return b;
}
function updateCtxToolbar() {
  const tb = $('#toolbar'); const ct = $('#ctxbar'); if (!ct) return;
  const editingRT = editing && ['note', 'heading'].includes(E(editing.id)?.type);
  const show = (sel.size > 0 || editingRT) && !drawState;
  tb.classList.toggle('ctx', !!show);
  ct.innerHTML = '';
  if (!show) return;
  if (TBL.st && sel.has(TBL.st.id)) return tToolbar(ct);
  const back = h('div', 'tool ctx-back', `<div class="ti">${ICONS.back}</div>`); back.title = 'Esci (Esc)';
  back.onclick = () => { blurEditing(); sel.clear(); refreshSel(); }; ct.appendChild(back);
  if (editingRT) return richTextTools(ct, E(editing.id));
  const els = [...sel].map(E).filter(Boolean);
  if (els.length > 1) return multiTools(ct, els);
  const el = els[0]; if (!el) return;
  const more = () => tbtn(ct, ICONS.more, '', b => moreMenu(b, el), { cls: 'icon-only', title: 'Altro' });
  const color = () => tbtn(ct, colorIcon(el), 'Colore', b => openColorMenu(b, [el]));
  const labels = () => tbtn(ct, ICONS.labels, 'Etichette', b => openLabelMenu(b, [el]));
  const react = () => tbtn(ct, ICONS.react, 'Reazioni', b => openReactMenu(b, [el]));
  const comment = () => tbtn(ct, ICONS.comment, 'Commenta', () => attachComment(el));
  const titleT = () => tbtn(ct, ICONS.title, 'Titolo', () => { if (el.cardTitle == null) el.cardTitle = ''; else { el.cardTitle = null; } applyDecor(el); $('.x-title', nodes.get(el.id))?.focus(); commit(); }, { on: el.cardTitle != null });
  const captionT = () => tbtn(ct, ICONS.caption, 'Didascalia', () => { if (el.type === 'image') { if (el.caption == null) { enterEdit(el); } else { el.caption = null; rebuild(el); commit(); } return; } if (el.cardCaption == null) el.cardCaption = ''; else el.cardCaption = null; applyDecor(el); $('.x-caption', nodes.get(el.id))?.focus(); commit(); }, { on: el.type === 'image' ? el.caption != null : el.cardCaption != null });
  const rename = () => tbtn(ct, ICONS.rename, 'Rinomina', () => enterEdit(el));
  switch (el.type) {
    case 'note': color(); labels(); react(); comment(); more(); break;
    case 'heading': color(); more(); break;
    case 'link': case 'video': color(); labels(); react(); comment(); if (el.url) rename(); captionT(); more(); break;
    case 'map': color(); labels(); react(); comment(); captionT(); more(); break;
    case 'todo': {
      color(); titleT(); react();
      const it = todoFocus && todoFocus.id === el.id ? el.items.find(i => i.id === todoFocus.item) : null;
      tbtn(ct, ICONS.due, 'Scadenza', b => { const t = it || el.items[0]; if (!t) return; if (t.due) { t.due = null; t.dueTime = null; touch(el); const n = rebuild(el); commit(); focusEnd($(`[data-item="${t.id}"]`, n)); } else openDuePicker(b, el, t); }, { act: 'due', on: !!(it && it.due), disabled: !el.items.length });
      tbtn(ct, ICONS.assign, 'Assegna', () => { const t = it || el.items[0]; if (!t) return; t.assignee = t.assignee ? null : PROFILE.name; touch(el); const n = rebuild(el); commit(); focusEnd($(`[data-item="${t.id}"]`, n)); }, { on: !!(it && it.assignee), disabled: !el.items.length });
      labels(); comment();
      if (it) { tbtn(ct, ICONS.indent, '', () => { it.indent = Math.min(3, (it.indent || 0) + 1); touch(el); const n = rebuild(el); commit(); focusEnd($(`[data-item="${it.id}"]`, n)); }, { cls: 'icon-only', title: 'Rientra (Tab)', keepFocus: true }); tbtn(ct, ICONS.outdent, '', () => { it.indent = Math.max(0, (it.indent || 0) - 1); touch(el); const n = rebuild(el); commit(); focusEnd($(`[data-item="${it.id}"]`, n)); }, { cls: 'icon-only', title: 'Riduci rientro (⇧Tab)', keepFocus: true, disabled: !it.indent }); }
      more(); break;
    }
    case 'board': if (matchMedia('(max-width: 600px)').matches) tbtn(ct, ICONS.open, 'Apri', () => openBoard(el.target)); tbtn(ct, `<span class="tcolor-ico" style="background:${boardBg(S.boards[el.target] || {})}"></span>`, 'Colore', b => openBoardColorMenu(b, el)); tbtn(ct, ICONS.icon, 'Icona', b => openIconPicker(b, el)); rename(); more(); break;
    case 'column': color(); rename(); more(); break;
    case 'document': if (matchMedia('(max-width: 600px)').matches) tbtn(ct, ICONS.open, 'Apri', () => openDocument(el)); color(); tbtn(ct, ICONS.cardview, 'Vista card', () => { el.cardView = !el.cardView; touch(el); rebuild(el); commit(); }, { on: !!el.cardView }); if (!el.cardView) rename(); more(); break;
    case 'comment': more(); break;
    case 'color': labels(); react(); comment(); more(); break;
    case 'table': tbtn(ct, ICONS.edit, 'Celle', () => tEnter(el.id, 0, 0)); labels(); react(); comment(); titleT(); captionT(); more(); break;
    case 'image': labels(); react(); comment(); titleT(); captionT(); tbtn(ct, ICONS.open, 'Apri', () => openLightbox(el)); more(); break;
    case 'file': labels(); react(); comment(); titleT(); tbtn(ct, ICONS.download, 'Scarica', () => downloadFile(el)); more(); break;
    case 'audio': labels(); react(); comment(); titleT(); more(); break;
    case 'sketch': color(); labels(); react(); comment(); tbtn(ct, ICONS.edit, 'Modifica', () => openSketch(el)); more(); break;
    case 'drawing': tbtn(ct, ICONS.edit, 'Modifica', () => editDrawing(el)); more(); break;
    case 'line': lineTools(ct, el); more(); break;
    default: more();
  }
  ct.appendChild(h('div', 'tspacer'));
  tbtn(ct, `<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M5 6l1.5 15h11L19 6"/><path d="M9 6V3h6v3"/></svg>`, 'Cestino', () => removeElements([...sel]));
}
function colorIcon(el) { const c = el.color; return c ? `<span class="tcolor-ico" style="background:${c};${el.colorMode === 'strip' || (el.type === 'column' && el.colorMode !== 'bg') ? `background:#fff;border-top:4px solid ${c}` : ''}"></span>` : ICONS.color; }
function richTextTools(ct, el) {
  const ed = editing.ed;
  const st = c => { try { return document.queryCommandState(c); } catch { return false; } };
  const act = (icon, title, fn, on) => tbtn(ct, icon, '', () => { ed.focus(); fn(); ed.dispatchEvent(new Event('input')); updateCtxToolbar(); }, { cls: 'icon-only', title, keepFocus: true, on });
  tbtn(ct, ICONS.textstyle, 'Stile testo', b => textStylePop(b), { keepFocus: true });
  act(ICONS.bold, 'Grassetto ⌘B', () => document.execCommand('bold'), st('bold'));
  act(ICONS.italic, 'Corsivo ⌘I', () => document.execCommand('italic'), st('italic'));
  act(ICONS.strike, 'Barrato ⌘⇧X', () => document.execCommand('strikeThrough'), st('strikeThrough'));
  act(ICONS.underline, 'Sottolineato ⌘U', () => document.execCommand('underline'), st('underline'));
  act(ICONS.bullets, 'Elenco puntato ⌘⇧U', () => document.execCommand('insertUnorderedList'), st('insertUnorderedList'));
  act(ICONS.numbers, 'Elenco numerato ⌘⇧O', () => document.execCommand('insertOrderedList'), st('insertOrderedList'));
  act(ICONS.center, 'Centra ⌘\\', () => toggleCenter(ed), st('justifyCenter'));
  act(ICONS.code, 'Codice in linea', () => { const s = getSelection(); if (s.isCollapsed) return; const t = s.toString(); document.execCommand('insertHTML', false, `<code>${esc(t)}</code>`); });
  tbtn(ct, ICONS.link, '', () => insertLinkPrompt(), { cls: 'icon-only', title: 'Link ⌘K', keepFocus: true });
  tbtn(ct, ICONS.comment, '', () => { blurEditing(); attachComment(el); }, { cls: 'icon-only', title: 'Commenta' });
  ct.appendChild(h('div', 'tspacer'));
}
function multiTools(ct, els) {
  const ids = els.map(e => e.id);
  tbtn(ct, ICONS.align, 'Allinea', b => popAt(b, m => {
    const row = (items) => { const r = h('div', 'seg'); items.forEach(([k, ic, t]) => { const x = h('button', '', ic); x.title = t; x.onclick = () => { alignEls(els, k); closePops(); }; r.appendChild(x); }); m.appendChild(r); };
    row([['left', '<svg viewBox="0 0 24 24"><path d="M4 3v18"/><rect x="7" y="6" width="12" height="4"/><rect x="7" y="14" width="7" height="4"/></svg>', 'A sinistra'], ['hcenter', '<svg viewBox="0 0 24 24"><path d="M12 3v18"/><rect x="5" y="6" width="14" height="4"/><rect x="8" y="14" width="8" height="4"/></svg>', 'Al centro'], ['right', '<svg viewBox="0 0 24 24"><path d="M20 3v18"/><rect x="5" y="6" width="12" height="4"/><rect x="10" y="14" width="7" height="4"/></svg>', 'A destra']]);
    row([['top', '<svg viewBox="0 0 24 24"><path d="M3 4h18"/><rect x="6" y="7" width="4" height="12"/><rect x="14" y="7" width="4" height="7"/></svg>', 'In alto'], ['vcenter', '<svg viewBox="0 0 24 24"><path d="M3 12h18"/><rect x="6" y="5" width="4" height="14"/><rect x="14" y="8" width="4" height="8"/></svg>', 'Al centro'], ['bottom', '<svg viewBox="0 0 24 24"><path d="M3 20h18"/><rect x="6" y="5" width="4" height="12"/><rect x="14" y="10" width="4" height="7"/></svg>', 'In basso']]);
  }));
  tbtn(ct, ICONS.distribute, 'Distribuisci', b => popAt(b, m => {
    const r = h('div', 'seg'); [['h', '<svg viewBox="0 0 24 24"><path d="M3 3v18M21 3v18"/><rect x="9" y="7" width="6" height="10"/></svg>', 'Orizzontalmente'], ['v', '<svg viewBox="0 0 24 24"><path d="M3 3h18M3 21h18"/><rect x="7" y="9" width="10" height="6"/></svg>', 'Verticalmente']].forEach(([k, ic, t]) => { const x = h('button', '', ic); x.title = t; x.onclick = () => { distributeEls(els, k); closePops(); }; r.appendChild(x); }); m.appendChild(r);
  }));
  tbtn(ct, ICONS.more, '', b => popAt(b, m => {
    const item = (l, fn, k = '') => { const d = h('div', 'mi', `<span>${l}</span>${kbdHTML(k)}`); d.onclick = () => { closePops(); fn(); }; m.appendChild(d); };
    item('Collega con linee', () => connectWithLines(els));
    m.appendChild(h('div', 'msep'));
    const allLocked = els.every(e => e.locked);
    item(allLocked ? 'Sblocca posizione' : 'Blocca posizione', () => { els.forEach(e => e.locked = !allLocked); commit(); render(); });
    m.appendChild(h('div', 'msep'));
    item('Porta in primo piano', () => { els.forEach(e => e.z = nextZ()); commit(); render(); }, '⌘ ⇧ ↑');
    item('Porta in fondo', () => { sendBack(els); }, '⌘ ⇧ ↓');
  }), { cls: 'icon-only', title: 'Altro' });
  ct.appendChild(h('div', 'tspacer'));
  tbtn(ct, `<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M5 6l1.5 15h11L19 6"/><path d="M9 6V3h6v3"/></svg>`, 'Cestino', () => removeElements(ids));
}
function sendBack(els) { const minZ = Math.min(...Object.values(S.elements).map(e => e.z || 0)); els.forEach((e, i) => e.z = minZ - els.length + i); commit(); render(); }
function freeRects(els) { return els.filter(e => !e.col && e.type !== 'line' && !e.locked).map(e => ({ e, r: elRect(e.id) })).filter(x => x.r); }
function alignEls(els, k) {
  const L = freeRects(els); if (L.length < 2) return;
  const x0 = Math.min(...L.map(o => o.r.x)), x1 = Math.max(...L.map(o => o.r.x + o.r.w)), y0 = Math.min(...L.map(o => o.r.y)), y1 = Math.max(...L.map(o => o.r.y + o.r.h));
  L.forEach(({ e, r }) => {
    if (k === 'left') e.x = Math.round(x0); if (k === 'right') e.x = Math.round(x1 - r.w); if (k === 'hcenter') e.x = Math.round((x0 + x1) / 2 - r.w / 2);
    if (k === 'top') e.y = Math.round(y0); if (k === 'bottom') e.y = Math.round(y1 - r.h); if (k === 'vcenter') e.y = Math.round((y0 + y1) / 2 - r.h / 2);
  });
  render(); commit();
}
function distributeEls(els, k) {
  const L = freeRects(els); if (L.length < 3) return toast('Seleziona almeno 3 elementi da distribuire');
  if (k === 'h') { L.sort((a, b) => a.r.x - b.r.x); const tot = L.reduce((s, o) => s + o.r.w, 0); const span = L[L.length - 1].r.x + L[L.length - 1].r.w - L[0].r.x; const gap = (span - tot) / (L.length - 1); let x = L[0].r.x; L.forEach(o => { o.e.x = Math.round(x); x += o.r.w + gap; }); }
  else { L.sort((a, b) => a.r.y - b.r.y); const tot = L.reduce((s, o) => s + o.r.h, 0); const span = L[L.length - 1].r.y + L[L.length - 1].r.h - L[0].r.y; const gap = (span - tot) / (L.length - 1); let y = L[0].r.y; L.forEach(o => { o.e.y = Math.round(y); y += o.r.h + gap; }); }
  render(); commit();
}
function connectWithLines(els) {
  const L = els.filter(e => e.type !== 'line').map(e => ({ e, r: elRect(e.id) })).filter(x => x.r).sort((a, b) => (a.r.x - b.r.x) || (a.r.y - b.r.y));
  for (let i = 0; i < L.length - 1; i++) makeEl('line', 0, 0, { x1: 0, y1: 0, x2: 0, y2: 0, a: L[i].e.id, b: L[i + 1].e.id, bx: 0, by: 0, arrowEnd: true, width: 2 });
  render(); commit();
}

/* ------------------------------ Linee ------------------------------ */
function lineTools(ct, el) {
  tbtn(ct, `<span class="tcolor-ico" style="background:${el.color || '#323b4a'}"></span>`, 'Colore', b => popAt(b, m => {
    const p = h('div', 'palette'); ['#323b4a', ...PAL_SOLID.slice(1), ...PAL_DARK].forEach(c => { const d = h('div', 'pc' + ((el.color || '#323b4a') === c ? ' on' : '')); d.style.background = c; d.onclick = () => { el.color = c; touch(el); commit(); updateLines(); closePops(); updateCtxToolbar(); }; p.appendChild(d); }); m.appendChild(p);
  }));
  tbtn(ct, ICONS.start, 'Inizio', () => { el.arrowStart = !el.arrowStart; commit(); updateLines(); updateCtxToolbar(); }, { on: !!el.arrowStart });
  tbtn(ct, ICONS.end, 'Fine', () => { el.arrowEnd = el.arrowEnd === false; commit(); updateLines(); updateCtxToolbar(); }, { on: el.arrowEnd !== false });
  tbtn(ct, ICONS.label, 'Etichetta', () => { if (el.label == null) el.label = ''; updateLines(); const lb = $(`.line-label[data-line="${el.id}"]`); if (lb) focusEnd(lb); }, { on: el.label != null });
  tbtn(ct, ICONS.dashed, 'Tratteggio', () => { el.dash = !el.dash; commit(); updateLines(); updateCtxToolbar(); }, { on: !!el.dash });
  tbtn(ct, ICONS.weight, 'Spessore', b => popAt(b, m => { [[1, 'Sottile'], [2, 'Normale'], [3.5, 'Spesso'], [6, 'Molto spesso']].forEach(([w, l]) => { const d = h('div', 'mi', `<span>${l}</span><i style="display:inline-block;width:60px;height:${w}px;background:var(--ink);border-radius:2px"></i>`); if ((el.width || 2) === w) d.style.background = 'rgba(0,0,0,.05)'; d.onclick = () => { el.width = w; commit(); updateLines(); closePops(); }; m.appendChild(d); }); }));
}
function updateLines() {
  _orig.updateLines();
  $$('.line-label').forEach(n => { if (!n.matches(':focus')) n.remove(); });
  for (const el of boardEls()) {
    if (el.type !== 'line' || el.label == null) continue;
    const { m } = lineEnds(el);
    let lb = $(`.line-label[data-line="${el.id}"]`);
    if (!lb) {
      lb = h('div', 'line-label editable no-drag'); lb.dataset.line = el.id; lb.contentEditable = 'plaintext-only'; lb.textContent = el.label;
      lb.addEventListener('input', () => { el.label = lb.textContent; scheduleSave(); });
      lb.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); lb.blur(); } });
      lb.addEventListener('blur', () => { if (!lb.textContent.trim()) el.label = null; commit(); setTimeout(updateLines, 0); });
      lb.addEventListener('pointerdown', e => { e.stopPropagation(); sel.clear(); sel.add(el.id); refreshSel(); });
      world().appendChild(lb);
    }
    lb.style.left = m.x + 'px'; lb.style.top = m.y + 'px'; lb.style.zIndex = el.z + 1; lb.style.color = el.color || '';
  }
}

/* ------------------------------ Menu colore ------------------------------ */
function openColorMenu(anchor, els) {
  const el = els[0];
  const canStrip = ['note', 'todo', 'link', 'video', 'map', 'column', 'sketch', 'comment', 'table', 'image'].includes(el.type);
  let mode = el.colorMode || (el.type === 'column' ? 'strip' : 'bg');
  const pop = popAt(anchor, m => { m.style.width = '170px'; });
  const draw = () => {
    pop.innerHTML = '';
    if (canStrip) {
      const tabs = h('div', 'pal-tabs');
      [['bg', 'Sfondo', 'bg-t'], ['strip', 'Striscia', 'strip-t']].forEach(([k, l, c]) => { const b = h('button', c + (mode === k ? ' on' : ''), `<i></i>${l}`); b.onclick = () => { mode = k; els.forEach(e => { e.colorMode = k; }); if (el.color) { commit(); render(); } draw(); }; tabs.appendChild(b); });
      pop.appendChild(tabs);
    }
    const set = c => { els.forEach(e => { e.color = c; e.colorMode = mode; touch(e); }); commit(); render(); updateCtxToolbar(); draw(); };
    const grid = (list, cls = '', withNone = false) => { const p = h('div', 'palette ' + cls); if (withNone) { const d = h('div', 'pc none' + (!el.color ? ' on' : '')); d.title = 'Nessun colore'; d.onclick = () => set(null); p.appendChild(d); } list.forEach(c => { const d = h('div', 'pc' + (el.color === c ? ' on' : '')); d.style.background = c; d.onclick = () => set(c); p.appendChild(d); }); pop.appendChild(p); };
    if (el.type === 'heading') { grid(['#323b4a', '#5f6672', '#f05f58', '#f7923e', '#e0a417', '#3f9b5b', '#2f9fd8', '#5b7cf2', '#b67cf2', '#f772c8'], '', false); }
    else {
      grid(PAL_SOLID.slice(1), '', true);
      pop.appendChild(h('div', 'pal-sep'));
      const p2 = h('div', 'palette'); PAL_LIGHT.forEach(c => { const d = h('div', 'pc txt' + (el.color === c ? ' on' : ''), 'A'); d.style.background = c; d.style.color = '#323b4a'; d.onclick = () => set(c); p2.appendChild(d); }); pop.appendChild(p2);
      pop.appendChild(h('div', 'pal-sep'));
      grid(PAL_DARK);
    }
    const cc = h('button', 'custom-color', '<span class="wheel"></span>Colore personalizzato…');
    const inp = h('input'); inp.type = 'color'; inp.value = el.color && el.color.startsWith('#') ? el.color : '#ffffff'; inp.style.cssText = 'position:absolute;opacity:0;width:0;height:0';
    cc.onclick = () => inp.click(); inp.onchange = () => set(inp.value);
    pop.append(cc, inp);
  };
  draw();
}
function openBoardColorMenu(anchor, el) {
  const b = S.boards[el.target];
  const pop = popAt(anchor, m => { m.style.width = '170px'; });
  const draw = () => {
    pop.innerHTML = '';
    const set = (c, c2 = null) => { b.color = c; b.color2 = c2; b.colorSet = true; commit(); render(); renderChrome(); updateCtxToolbar(); draw(); };
    const p = h('div', 'palette'); BOARD_SOLID.forEach(c => { const d = h('div', 'pc' + (b.color === c && !b.color2 ? ' on' : '')); d.style.background = c; d.onclick = () => set(c); p.appendChild(d); }); pop.appendChild(p);
    pop.appendChild(h('div', 'pal-sep'));
    const p2 = h('div', 'palette'); BOARD_DUO.forEach(([a, c]) => { const d = h('div', 'pc' + (b.color === a && b.color2 === c ? ' on' : '')); d.style.background = `linear-gradient(135deg, ${a} 50%, ${c} 50%)`; d.onclick = () => set(a, c); p2.appendChild(d); }); pop.appendChild(p2);
    pop.appendChild(h('div', 'pal-sep'));
    const p3 = h('div', 'palette'); BOARD_MUTED.forEach(c => { const d = h('div', 'pc' + (b.color === c && !b.color2 ? ' on' : '')); d.style.background = c; d.onclick = () => set(c); p3.appendChild(d); }); pop.appendChild(p3);
    const cc = h('button', 'custom-color', '<span class="wheel"></span>Colore personalizzato…'); const inp = h('input'); inp.type = 'color'; inp.value = b.color; inp.style.cssText = 'position:absolute;opacity:0;width:0;height:0';
    cc.onclick = () => inp.click(); inp.onchange = () => set(inp.value); pop.append(cc, inp);
  };
  draw();
}
function openIconPicker(anchor, el) {
  const b = S.boards[el.target]; let tab = 'rec', q = '';
  const pop = popAt(anchor, m => { m.style.width = '380px'; m.style.padding = '10px'; });
  const draw = () => {
    pop.innerHTML = '';
    const wrap = h('div'); wrap.style.cssText = 'display:flex;gap:10px;height:190px';
    const left = h('div'); left.style.cssText = 'width:120px;display:flex;flex-direction:column;gap:2px';
    [['rec', 'Consigliate'], ['let', 'Lettere e numeri'], ['img', 'Carica un\'immagine']].forEach(([k, l]) => { const d = h('div', 'mi', `<span>${l}</span>`); d.style.fontSize = '12px'; if (tab === k) d.style.background = 'rgba(0,0,0,.06)'; d.onclick = () => { if (k === 'img') return pickFiles('image/*', false, async f => { b.iconImg = await storeFile(f[0]); b.icon = null; commit(); render(); renderChrome(); closePops(); }); tab = k; draw(); }; left.appendChild(d); });
    const s = h('input'); s.placeholder = 'Cerca icone…'; s.value = q; s.style.cssText = 'margin-top:auto;border:1px solid #dcdee1;border-radius:6px;padding:6px 8px;font-size:12px;outline:none;width:100%';
    s.oninput = () => { q = s.value.toLowerCase(); tab = 'rec'; drawGrid(); }; s.onkeydown = e => e.stopPropagation(); left.appendChild(s);
    const grid = h('div'); grid.style.cssText = 'flex:1;overflow:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;align-content:start';
    const cell = (html, fn, on) => { const d = h('div', '', html); d.style.cssText = `height:44px;border-radius:8px;display:grid;place-items:center;cursor:pointer;font-size:22px;font-weight:600;${on ? 'box-shadow:inset 0 0 0 1.5px var(--ink)' : ''}`; d.onmouseenter = () => { if (!on) d.style.background = 'rgba(0,0,0,.05)'; }; d.onmouseleave = () => d.style.background = ''; d.onclick = fn; grid.appendChild(d); };
    const setIcon = ic => { b.icon = ic; b.iconImg = null; commit(); render(); renderChrome(); draw(); };
    const drawGrid = () => {
      grid.innerHTML = '';
      if (tab === 'let') {
        const ini = autoInitials(b.title); const opts = [...new Set([ini, ini.slice(0, 2), ini[0], ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')])].filter(Boolean);
        cell('<span style="font-size:13px;color:var(--muted)">Nessuna</span>', () => setIcon(null), !b.icon);
        opts.forEach(t => cell(`<span style="font-size:${t.length > 2 ? 13 : 20}px">${esc(t)}</span>`, () => setIcon({ type: 'letters', text: t }), b.icon?.type === 'letters' && b.icon.text === t));
      } else {
        let list = ICON_SET;
        if (q) { const hits = Object.entries(EMOJI).filter(([k]) => k.includes(q)).map(([, v]) => v); list = [...new Set(hits)]; if (!list.length) { grid.appendChild(h('div', 'pempty', 'Nessuna icona trovata')); return; } }
        else { const words = b.title.toLowerCase().split(/\s+/); const rec = words.map(w => EMOJI[w]).filter(Boolean); const ini = autoInitials(b.title); cell(`<span style="font-size:14px">${esc(ini)}</span>`, () => setIcon({ type: 'letters', text: ini }), b.icon?.type === 'letters' && b.icon.text === ini); list = [...new Set([...rec, ...ICON_SET])]; }
        list.forEach(ch => cell(ch, () => setIcon({ type: 'emoji', ch }), b.icon?.type === 'emoji' && b.icon.ch === ch));
      }
    };
    drawGrid(); wrap.append(left, grid); pop.appendChild(wrap);
  };
  draw();
}

/* ------------------------------ Menu "Altro" e tasto destro ------------------------------ */
function menuItems(m, ids, opts = {}) {
  const els = ids.map(E).filter(Boolean); if (!els.length) return;
  const single = els.length === 1 ? els[0] : null;
  const item = (l, fn, k = '', cls = '') => { const d = h('div', 'mi ' + cls, `<span>${l}</span>${kbdHTML(k)}`); d.onclick = e => { e.stopPropagation(); hidePopups(true); closePops(); fn(); }; m.appendChild(d); return d; };
  const sep = () => m.appendChild(h('div', 'msep'));
  if (opts.full) {
    item('Taglia', () => copySel(true), '⌘ X'); item('Copia', () => copySel(false), '⌘ C'); item('Duplica', () => duplicate(ids), '⌘ D'); item('Sposta nel cestino', () => removeElements(ids), 'Canc');
    sep();
  }
  if (single?.type === 'board') {
    item('Rinomina', () => enterEdit(single), '↩');
    item('Apri in una nuova scheda', () => window.open(location.pathname + '#/' + single.target, '_blank'));
    item('Crea una scorciatoia a questa board', () => { const r = elRect(single.id); const sc = makeEl('board', r.x + r.w + 30, r.y); delete S.boards[sc.target]; sc.target = single.target; sc.shortcut = true; render(); commit(); });
    item('Copia il link a questa board', () => { navigator.clipboard?.writeText(location.origin + location.pathname + '#/' + single.target); toast('Link copiato'); });
    item('Converti in template', () => { const T = JSON.parse(localStorage.getItem('bacheca-templates') || '[]'); T.push({ name: S.boards[single.target].title, board: exportBoardTree(single.target) }); localStorage.setItem('bacheca-templates', JSON.stringify(T)); toast('Template salvato'); });
    sep();
  }
  if (single?.type === 'note') { item('Converti in documento', () => { single.type = 'document'; single.title = stripHtml(single.html).split('\n')[0].slice(0, 60) || 'Nuovo documento'; single.w = DEFAULT_W.document; single.cardView = false; rebuild(single); commit(); }); sep(); }
  if (single?.type === 'link' && single.url) { item('Apri link', () => openUrl(single.url)); item('Aggiorna anteprima', () => { single.meta = null; rebuild(single); }); sep(); }
  if (single?.type === 'image' && single.fileId) { item('Apri immagine', () => openLightbox(single)); item('Scarica', () => downloadFile(single)); item('Sostituisci immagine', () => pickFiles('image/*', false, async f => { single.fileId = await storeFile(f[0]); single.name = f[0].name; rebuild(single); commit(); })); sep(); }
  if (single?.type === 'file') { item('Scarica', () => downloadFile(single)); sep(); }
  if (single?.type === 'column') { item(single.collapsed ? 'Espandi colonna' : 'Comprimi colonna', () => { single.collapsed = !single.collapsed; commit(); render(); }); sep(); }
  if (single?.type === 'table') { item('Modifica celle', () => tEnter(single.id, 0, 0)); item((single.headerRow ? '✓ ' : '') + 'Riga di intestazione', () => tableOp(single, 'header', 0, 0)); sep(); }
  if (single?.type === 'line' && (single.a || single.b)) { item('Stacca dalle card', () => { single.a = single.b = null; commit(); updateLines(); }); item('Raddrizza', () => { single.bx = single.by = 0; commit(); updateLines(); }); sep(); }
  if (S && Object.keys(S.boards).length > 1) item('Sposta in un\'altra board…', () => moveToBoardMenu(innerWidth / 2 - 120, 140, ids));
  item('Sposta in Non ordinati', () => moveToUnsorted(ids), '⌥ `');
  sep();
  const allLocked = els.every(e => e.locked);
  item(allLocked ? 'Sblocca posizione' : 'Blocca posizione', () => { els.forEach(e => e.locked = !allLocked); commit(); render(); });
  sep();
  item('Porta in primo piano', () => { els.forEach(e => e.z = nextZ()); commit(); render(); }, '⌘ ⇧ ↑');
  item('Porta in fondo', () => sendBack(els), '⌘ ⇧ ↓');
  if (single) {
    sep();
    const info = h('div', 'minfo', `<div class="av">${esc(initials(single.author || PROFILE.name))}</div><div>Creato da ${single.author && single.author !== PROFILE.name ? esc(single.author) : 'te'} il ${new Date(single.created).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })},<br>modificato il ${new Date(single.modified).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</div>`);
    m.appendChild(info);
  }
}
function moreMenu(anchor, el) { popAt(anchor, m => { m.style.minWidth = '240px'; menuItems(m, [...sel].length ? [...sel] : [el.id]); }); }
function showElementMenu(x, y, ids) {
  hidePopups(true);
  menuAt(x, y, m => menuItems(m, ids, { full: true }));
}
function exportBoardTree(bid) {
  const out = { boards: {}, elements: {} }; const stack = [bid];
  while (stack.length) { const b = stack.pop(); out.boards[b] = JSON.parse(JSON.stringify(S.boards[b])); for (const e of Object.values(S.elements)) if (e.board === b && !e.deleted) { out.elements[e.id] = JSON.parse(JSON.stringify(e)); if (e.type === 'board' && !e.shortcut) stack.push(e.target); } }
  return out;
}

/* ------------------------------ Non ordinati ------------------------------ */
const UNSORTED = '__unsorted';
function ensureUnsorted() { if (!S.boards[UNSORTED]) S.boards[UNSORTED] = { id: UNSORTED, title: 'Non ordinati', parent: null, color: '#c4c6c8', hidden: true, created: Date.now() }; }
function moveToUnsorted(ids) {
  ensureUnsorted();
  ids.forEach(id => { const e = E(id); if (!e || e.type === 'line') return; if (e.col) { const c = E(e.col); if (c) c.items = c.items.filter(x => x !== id); e.col = null; } e.board = UNSORTED; e.z = nextZ(); if (e.type === 'column') e.items.forEach(ci => { const c = E(ci); if (c) c.board = UNSORTED; }); if (e.type === 'board' && !e.shortcut && S.boards[e.target]) S.boards[e.target].parent = UNSORTED; });
  for (const l of boardEls()) if (l.type === 'line') { if (ids.includes(l.a)) l.a = null; if (ids.includes(l.b)) l.b = null; }
  sel.clear(); render(); commit(); renderUnsorted();
  toast(ids.length + (ids.length === 1 ? ' elemento spostato' : ' elementi spostati') + ' in Non ordinati', 'Annulla', undo);
}
function unsortedEls() { return Object.values(S.elements).filter(e => e.board === UNSORTED && !e.deleted && !e.col && e.type !== 'line').sort((a, b) => b.z - a.z); }
function renderUnsorted() {
  const list = unsortedEls();
  $('#unsorted-btn b').textContent = list.length; $('#mobile-count').textContent = list.length;
  const panel = $('#unsorted-panel'); if (panel.classList.contains('hidden')) return;
  const body = $('.up-body', panel); body.innerHTML = '';
  $('.up-empty', panel).classList.toggle('hidden', list.length > 0);
  list.forEach(el => {
    const n = h('div', `el el-${el.type}`); n.dataset.uid = el.id; n.style.width = (el.type === 'board' || el.type === 'document' ? 316 : Math.min(316, el.w || 316)) + 'px';
    const card = h('div', 'card'); n.appendChild(card);
    try { BUILD[el.type]?.(el, card, n); } catch { card.textContent = TYPE_LABEL[el.type]; }
    $$('[contenteditable]', n).forEach(x => x.contentEditable = 'false'); $$('input, iframe', n).forEach(x => x.remove());
    if (el.color) { n.style.setProperty('--c', el.color); n.classList.add((el.colorMode || (el.type === 'column' ? 'strip' : 'bg')) === 'strip' ? 'strip' : 'bgc'); }
    if (el.type === 'board') { const b = S.boards[el.target]; const bi = $('.bi', n); if (b && bi) bi.style.background = boardBg(b); }
    n.addEventListener('pointerdown', ev => startUnsortedDrag(ev, el, n));
    body.appendChild(n);
  });
}
function startUnsortedDrag(ev, el, node) {
  ev.preventDefault(); const sx = ev.clientX, sy = ev.clientY; let ghost = null;
  const r0 = node.getBoundingClientRect(); const ox = sx - r0.left, oy = sy - r0.top;
  const move = e => {
    if (!ghost && Math.hypot(e.clientX - sx, e.clientY - sy) > 4) { ghost = node.cloneNode(true); ghost.id = 'dragghost'; ghost.style.position = 'fixed'; ghost.style.width = r0.width + 'px'; document.body.appendChild(ghost); document.body.classList.add('dragging'); node.style.opacity = '.3'; }
    if (ghost) { ghost.style.left = e.clientX - ox + 'px'; ghost.style.top = e.clientY - oy + 'px'; }
  };
  const up = e => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', up);
    document.body.classList.remove('dragging'); node.style.opacity = '';
    if (!ghost) return; ghost.remove();
    const pr = $('#unsorted-panel').getBoundingClientRect(); if (e.clientX >= pr.left) return;
    const vr = VP().getBoundingClientRect(); if (e.clientX < vr.left || e.clientY < vr.top) return;
    const p = toWorld(e.clientX - ox, e.clientY - oy);
    el.board = cur; el.x = Math.max(0, Math.round(p.x)); el.y = Math.max(0, Math.round(p.y)); el.z = nextZ();
    if (el.type === 'column') el.items.forEach(ci => { const c = E(ci); if (c) c.board = cur; });
    if (el.type === 'board' && !el.shortcut && S.boards[el.target]) S.boards[el.target].parent = cur;
    const t = columnAt(e.clientX, e.clientY); if (t && el.type !== 'column') insertIntoColumn([el.id], t.col, t.idx);
    sel.clear(); sel.add(el.id); render(); commit(); renderUnsorted();
  };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}
function toggleUnsorted(force) {
  const p = $('#unsorted-panel'); const show = force ?? p.classList.contains('hidden');
  p.classList.toggle('hidden', !show); VP().classList.toggle('with-unsorted', show); $('#unsorted-btn').classList.toggle('hidden', show);
  renderUnsorted(); updateStageSize();
}

/* ------------------------------ Disegno sul canvas ------------------------------ */
let drawOpts2 = { c: '#323b4a', w: 4, prev: '#323b4a', tool: 'pen' };
function drawToolbar(container, opts, actions) {
  const { onUndo, onRedo, canUndo, canRedo, onCancel, onSave, cancelLabel, canSave } = actions;
  container.innerHTML = '';
  const tb = container;
  const b = (icon, title, fn, on, dis) => { const x = h('button', 'dt-b' + (on ? ' on' : ''), icon); x.title = title; x.disabled = !!dis; x.onclick = e => { e.stopPropagation(); fn(x); }; tb.appendChild(x); return x; };
  b(ICONS.pen, 'Penna', () => { opts.tool = 'pen'; refresh(); }, opts.tool === 'pen');
  b(ICONS.pointer, 'Selezione (V)', () => { opts.tool = 'select'; refresh(); }, opts.tool === 'select');
  b(ICONS.eraser, 'Gomma (E)', () => { opts.tool = 'eraser'; refresh(); }, opts.tool === 'eraser');
  tb.appendChild(h('span', 'dt-sep'));
  const cb = b(`<span class="dt-sw" style="background:${opts.c}"></span>`, 'Colore (C)', x => colorPop(x));
  b(`<svg viewBox="0 0 24 24"><path d="M4 18c3 0 3-4 6-4M9 13l8-9 3 3-9 8" stroke-width="${1 + PEN_SIZES.indexOf(opts.w) * .6}"/></svg>`, 'Pennello (1-4)', x => sizePop(x));
  tb.appendChild(h('span', 'dt-sep'));
  b(ICONS.undo, 'Annulla', onUndo, false, !canUndo()); b(ICONS.redo, 'Ripeti', onRedo, false, !canRedo());
  tb.appendChild(h('span', 'dt-sep'));
  const c = h('button', 'dt-txt', cancelLabel); c.onclick = onCancel; tb.appendChild(c);
  const s = h('button', 'dt-save', 'Salva'); s.disabled = !canSave(); s.onclick = onSave; tb.appendChild(s);
  function refresh() { drawToolbar(container, opts, actions); }
  function colorPop(x) {
    $$('.dt-pop').forEach(p => p.remove());
    const p = h('div', 'dt-pop'); p.addEventListener('pointerdown', e => e.stopPropagation());
    const g1 = h('div', 'grid'), g2 = h('div', 'grid');
    DRAW_SOLID.forEach(col => { const i = h('i', opts.c === col ? 'on' : ''); i.style.background = col; i.onclick = () => { opts.prev = opts.c; opts.c = col; if (opts.tool === 'eraser') opts.tool = 'pen'; p.remove(); container._rerender(); }; g1.appendChild(i); });
    DRAW_MUTED.forEach(col => { const i = h('i', opts.c === col ? 'on' : ''); i.style.background = col; i.onclick = () => { opts.prev = opts.c; opts.c = col; p.remove(); container._rerender(); }; g2.appendChild(i); });
    const cc = h('button', 'dt-custom', '<span class="wheel" style="width:14px;height:14px;border-radius:50%;background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red)"></span>Colore personalizzato…');
    const inp = h('input'); inp.type = 'color'; inp.style.cssText = 'position:absolute;opacity:0;width:0;height:0'; cc.onclick = () => inp.click(); inp.onchange = () => { opts.prev = opts.c; opts.c = inp.value; p.remove(); container._rerender(); };
    p.append(g1, g2, cc, inp); tb.appendChild(p); p.style.left = (x.offsetLeft - 60) + 'px';
  }
  function sizePop(x) {
    $$('.dt-pop').forEach(p => p.remove());
    const p = h('div', 'dt-pop'); p.addEventListener('pointerdown', e => e.stopPropagation());
    const r = h('div', 'sizes'); PEN_SIZES.forEach(w => { const bb = h('button', opts.w === w ? 'on' : '', `<i style="width:${Math.min(16, w + 2)}px;height:${Math.min(16, w + 2)}px"></i>`); bb.onclick = () => { opts.w = w; p.remove(); container._rerender(); }; r.appendChild(bb); });
    p.appendChild(r); tb.appendChild(p); p.style.left = (x.offsetLeft - 50) + 'px';
  }
  return { colorPop: () => colorPop(cb) };
}
function makeStrokeSurface(svgParent, coordFn, opts, state, onChange) {
  // state: { strokes: [], redo: [], selected: null }
  const ns = 'http://www.w3.org/2000/svg';
  const svg = svgParent;
  const paint = () => {
    svg.innerHTML = '';
    state.strokes.forEach((s, i) => { const p = document.createElementNS(ns, 'path'); p.setAttribute('d', strokePath(s.pts)); p.setAttribute('stroke', s.c); p.setAttribute('stroke-width', s.w); p.setAttribute('fill', 'none'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); if (state.selected === i) p.setAttribute('filter', 'drop-shadow(0 0 2px #2f63f7)'); svg.appendChild(p); });
  };
  let cur = null, dragSel = null;
  const hitStroke = p => { for (let i = state.strokes.length - 1; i >= 0; i--) { const s = state.strokes[i]; if (s.pts.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.max(8, s.w))) return i; } return -1; };
  return {
    paint,
    down(e) {
      const p = coordFn(e);
      if (opts.tool === 'eraser') { const i = hitStroke(p); if (i >= 0) { state.redo = []; state.strokes.splice(i, 1); paint(); onChange(); } cur = 'erase'; return; }
      if (opts.tool === 'select') { const i = hitStroke(p); state.selected = i >= 0 ? i : null; paint(); if (i >= 0) dragSel = { i, last: p }; return; }
      state.redo = []; cur = { c: opts.c, w: opts.w, pts: [p] }; state.strokes.push(cur); paint(); onChange();
    },
    move(e) {
      const p = coordFn(e);
      if (cur === 'erase') { const i = hitStroke(p); if (i >= 0) { state.strokes.splice(i, 1); paint(); onChange(); } return; }
      if (dragSel) { const dx = p[0] - dragSel.last[0], dy = p[1] - dragSel.last[1]; state.strokes[dragSel.i].pts = state.strokes[dragSel.i].pts.map(([x, y]) => [x + dx, y + dy]); dragSel.last = p; paint(); return; }
      if (!cur || typeof cur === 'string') return; const l = cur.pts[cur.pts.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) < 1.5) return; cur.pts.push(p); paint();
    },
    up() { if (dragSel) onChange(); cur = null; dragSel = null; },
    deleteSelected() { if (state.selected != null) { state.strokes.splice(state.selected, 1); state.selected = null; paint(); onChange(); } },
  };
}
function toggleDraw() {
  if (drawState) return finishDraw(true);
  blurEditing(); sel.clear(); refreshSel(); hidePopups(true);
  const ns = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'line-svg'); svg.style.zIndex = 999990; world().appendChild(svg);
  const veil = h('div'); veil.id = 'draw-veil'; document.body.appendChild(veil);
  const state = { strokes: [], redo: [], selected: null };
  const opts = drawOpts2; opts.tool = 'pen';
  const tb = h('div', 'drawtb'); tb.addEventListener('pointerdown', e => e.stopPropagation()); document.body.appendChild(tb);
  const surface = makeStrokeSurface(svg, e => { const p = toWorld(e.clientX, e.clientY); return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]; }, opts, state, () => rer());
  const rer = () => drawToolbar(tb, opts, { onUndo: () => { if (state.strokes.length) { state.redo.push(state.strokes.pop()); surface.paint(); rer(); } }, onRedo: () => { if (state.redo.length) { state.strokes.push(state.redo.pop()); surface.paint(); rer(); } }, canUndo: () => state.strokes.length > 0, canRedo: () => state.redo.length > 0, onCancel: () => finishDraw(false), onSave: () => finishDraw(true), cancelLabel: 'Annulla', canSave: () => state.strokes.length > 0 });
  tb._rerender = rer;
  drawState = { strokes: state.strokes, state, svg, veil, tb, surface, opts, rer, editing: null };
  document.body.classList.add('drawmode'); $('#tool-draw').classList.add('active');
  updateCtxToolbar(); rer();
}
function drawDown(ev) { if (!ev.target.closest('#viewport')) return; ev.preventDefault(); $$('.dt-pop').forEach(p => p.remove()); drawState.surface.down(ev); }
function drawMove(ev) { drawState.surface.move(ev); }
function drawUp() { drawState.surface.up(); drawState.rer(); }
function finishDraw(save = true) {
  const st = drawState; if (!st) return; drawState = null;
  document.body.classList.remove('drawmode'); $('#tool-draw').classList.remove('active');
  st.svg.remove(); st.veil.remove(); st.tb.remove();
  const strokes = st.state.strokes.filter(s => s.pts.length);
  if (st.editing) { const el = E(st.editing); el.deleted = false; if (save && strokes.length) { Object.assign(el, packStrokes(strokes)); touch(el); } else if (save && !strokes.length) { removeElements([el.id], true); return; } rebuild(el); commit(); updateCtxToolbar(); return; }
  if (!save || !strokes.length) { updateCtxToolbar(); return; }
  const pk = packStrokes(strokes);
  const el = makeEl('drawing', pk.x, pk.y, pk);
  sel.clear(); sel.add(el.id); render(); commit();
}
function packStrokes(strokes) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  strokes.forEach(s => s.pts.forEach(([x, y]) => { x0 = Math.min(x0, x - s.w); y0 = Math.min(y0, y - s.w); x1 = Math.max(x1, x + s.w); y1 = Math.max(y1, y + s.w); }));
  const pad = 4; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  const vw = Math.round(x1 - x0), vh = Math.round(y1 - y0);
  return { x: Math.round(x0), y: Math.round(y0), w: vw, vw, vh, strokes: strokes.map(s => ({ c: s.c, w: s.w, pts: s.pts.map(([x, y]) => [Math.round((x - x0) * 10) / 10, Math.round((y - y0) * 10) / 10]) })) };
}
function editDrawing(el) {
  // re-open strokes in world coordinates for editing
  const scale = (el.w || el.vw) / el.vw;
  toggleDraw();
  drawState.editing = el.id; el.deleted = true; render();
  drawState.state.strokes.push(...el.strokes.map(s => ({ c: s.c, w: s.w, pts: s.pts.map(([x, y]) => [el.x + x * scale, el.y + y * scale]) })));
  drawState.surface.paint(); drawState.rer();
}

/* ------------------------------ Schizzo ------------------------------ */
function openSketch(el) {
  hidePopups(true);
  const W = 800, H = 500;
  const state = { strokes: JSON.parse(JSON.stringify(el.strokes)), redo: [], selected: null };
  const opts = { ...drawOpts2, tool: 'pen' };
  const modal = h('div', 'sk-modal'); modal.dataset.elId = el.id; const wrap = h('div', 'sk-canvas-wrap');
  const scale = Math.min(1.3, (innerWidth * .8) / W, (innerHeight - 180) / H);
  const ns = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.cssText = `display:block;width:${W * scale}px;height:${H * scale}px;cursor:crosshair;touch-action:none`;
  wrap.appendChild(svg); modal.appendChild(wrap);
  const tb = h('div', 'drawtb'); modal.appendChild(tb); document.body.appendChild(modal);
  const coord = e => { const r = svg.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / scale * 10) / 10, Math.round((e.clientY - r.top) / scale * 10) / 10]; };
  const surface = makeStrokeSurface(svg, coord, opts, state, () => rer());
  const close = save => { if (save) { el.strokes = state.strokes; touch(el); rebuild(el); commit(); } modal.remove(); overlayEsc = null; window.__sketchOpen = false; document.removeEventListener('keydown', keys, true); };
  const rer = () => drawToolbar(tb, opts, { onUndo: () => { if (state.strokes.length) { state.redo.push(state.strokes.pop()); surface.paint(); rer(); } }, onRedo: () => { if (state.redo.length) { state.strokes.push(state.redo.pop()); surface.paint(); rer(); } }, canUndo: () => state.strokes.length > 0, canRedo: () => state.redo.length > 0, onCancel: () => close(false), onSave: () => close(true), cancelLabel: 'Scarta', canSave: () => true });
  tb._rerender = rer;
  svg.addEventListener('pointerdown', e => { svg.setPointerCapture(e.pointerId); $$('.dt-pop').forEach(p => p.remove()); surface.down(e); });
  svg.addEventListener('pointermove', e => surface.move(e)); svg.addEventListener('pointerup', () => { surface.up(); rer(); });
  modal.addEventListener('pointerdown', e => { if (e.target === modal) close(true); });
  const keys = e => drawKeys(e, opts, rer, surface, () => close(true));
  document.addEventListener('keydown', keys, true); window.__sketchOpen = true;
  overlayEsc = () => close(true);
  surface.paint(); rer();
}
function drawKeys(e, opts, rer, surface, save) {
  if (isTyping()) return false;
  const k = e.key.toLowerCase(); const mod = e.metaKey || e.ctrlKey;
  if (k === 'escape' || (mod && k === 's')) { e.preventDefault(); e.stopPropagation(); save(); return true; }
  if (mod) return false;
  if (k === 'v') { opts.tool = 'select'; rer(); } else if (k === 'e') { opts.tool = 'eraser'; rer(); } else if (k === 'c') { rer(); $$('.drawtb .dt-b')[3]?.click(); } else if (k === 'x') { const t = opts.c; opts.c = opts.prev || opts.c; opts.prev = t; rer(); } else if (['1', '2', '3', '4'].includes(k)) { opts.w = PEN_SIZES[+k - 1]; rer(); } else if (k === 'backspace' || k === 'delete') { surface.deleteSelected(); } else if (k === 'p' || k === 'b') { opts.tool = 'pen'; rer(); } else return false;
  e.preventDefault(); e.stopPropagation(); return true;
}

/* ------------------------------ Documento ------------------------------ */
function openDocument(el) {
  hidePopups(true);
  const ov = $('#overlay'); ov.innerHTML = ''; ov.classList.remove('hidden'); ov.dataset.elId = el.id; // la sincronizzazione non sostituisce un elemento aperto qui
  const box = h('div', 'modal doc-modal');
  const head = h('div', 'dm-head'); const title = h('div', 'dm-title editable'); title.contentEditable = 'plaintext-only'; title.textContent = el.title || 'Nuovo documento';
  title.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); body.focus(); } };
  title.oninput = () => { el.title = title.textContent; touch(el); scheduleSave(); };
  const exp = h('button', 'hbtn dm-exp', 'Esporta <i class="chev"></i>');
  exp.onclick = ev => { ev.stopPropagation(); popAt(exp, m => { const it = (l, fn) => { const d = h('div', 'mi', `<span>${l}</span>`); d.onclick = () => { closePops(); fn(); }; m.appendChild(d); }; it('Documento Word', () => saveBlob(new Blob([wordHtml(el.title, safeHtml(el.html))], { type: 'application/msword' }), (el.title || 'documento') + '.doc')); it('Markdown', () => saveBlob(new Blob(['# ' + (el.title || '') + '\n\n' + htmlToMd(el.html)], { type: 'text/markdown' }), (el.title || 'documento') + '.md')); it('Testo semplice', () => saveBlob(new Blob([(el.title || '') + '\n\n' + stripHtml(el.html)], { type: 'text/plain' }), (el.title || 'documento') + '.txt')); it('PDF (stampa)', () => { const w = window.open('', '_blank'); w.document.write(`<title>${esc(el.title)}</title><style>body{font-family:Inter,Helvetica,Arial;max-width:720px;margin:40px auto;line-height:1.6;color:#323b4a}h1{font-family:Georgia,serif}</style><h1>${esc(el.title)}</h1>${safeHtml(el.html)}`); w.document.close(); w.print(); }); }, { below: true }); };
  const mx = h('button', 'mx', '✕'); mx.title = 'Chiudi (Esc)';
  head.append(title, exp); box.appendChild(mx);
  const main = h('div', 'dm-main'); const tools = h('div', 'dm-tools'); const sc = h('div', 'dm-scroll');
  const body = h('div', 'doc-body editable rt'); body.contentEditable = 'true'; body.dataset.ph = 'Inizia a scrivere…'; body.innerHTML = safeHtml(el.html);
  body.oninput = () => { el.html = body.innerHTML; touch(el); scheduleSave(); };
  wireRichText(body, el);
  const st = c => { try { return document.queryCommandState(c); } catch { return false; } };
  const drawTools = () => {
    tools.innerHTML = '';
    const act = (icon, label, fn, on, cls = 'icon-only') => tbtn(tools, icon, label, () => { body.focus(); fn(); body.dispatchEvent(new Event('input')); drawTools(); }, { cls, keepFocus: true, on });
    tbtn(tools, ICONS.textstyle, 'Stile testo', b => { editing = { id: el.id, ed: body }; textStylePop(b); editing = null; }, { keepFocus: true });
    tbtn(tools, ICONS.insert, 'Inserisci', b => popAt(b, m => { const it = (l, fn) => { const d = h('div', 'mi', `<span>${l}</span>`); d.addEventListener('mousedown', e => { e.preventDefault(); body.focus(); fn(); body.dispatchEvent(new Event('input')); closePops(); }); m.appendChild(d); }; it('Linea divisoria', () => document.execCommand('insertHorizontalRule')); it('Casella di controllo', () => { document.execCommand('insertUnorderedList'); currentBlock(body)?.closest?.('ul')?.classList.add('check'); }); it('Immagine…', () => pickFiles('image/*', false, async f => { const r = new FileReader(); r.onload = () => { body.focus(); document.execCommand('insertImage', false, r.result); body.dispatchEvent(new Event('input')); }; r.readAsDataURL(f[0]); })); it('Tabella', () => document.execCommand('insertHTML', false, '<table style="border-collapse:collapse;width:100%"><tr><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr><tr><td style="border:1px solid #ddd;padding:6px">&nbsp;</td><td style="border:1px solid #ddd;padding:6px">&nbsp;</td></tr></table><p><br></p>')); it('Data di oggi', () => document.execCommand('insertText', false, new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }))); }), { keepFocus: true });
    act(ICONS.bold, '', () => document.execCommand('bold'), st('bold'));
    act(ICONS.italic, '', () => document.execCommand('italic'), st('italic'));
    act(ICONS.bullets, '', () => document.execCommand('insertUnorderedList'), st('insertUnorderedList'));
    act(ICONS.numbers, '', () => document.execCommand('insertOrderedList'), st('insertOrderedList'));
    act(ICONS.indent, '', () => document.execCommand('indent'));
    act(ICONS.outdent, '', () => document.execCommand('outdent'));
    act(ICONS.center, '', () => toggleCenter(body), st('justifyCenter'));
    tbtn(tools, ICONS.link, '', () => insertLinkPrompt(), { cls: 'icon-only', keepFocus: true });
    tbtn(tools, ICONS.more, '', b => popAt(b, m => { const it = (l, fn) => { const d = h('div', 'mi', `<span>${l}</span>`); d.addEventListener('mousedown', e => { e.preventDefault(); body.focus(); fn(); body.dispatchEvent(new Event('input')); closePops(); }); m.appendChild(d); }; it('Barrato', () => document.execCommand('strikeThrough')); it('Sottolineato', () => document.execCommand('underline')); it('Codice', () => setBlock('code')); it('Rimuovi formattazione', () => document.execCommand('removeFormat')); }), { cls: 'icon-only', keepFocus: true });
  };
  body.addEventListener('keyup', drawTools); body.addEventListener('mouseup', drawTools);
  sc.appendChild(body); main.append(tools, sc); box.append(head, main); ov.appendChild(box);
  drawTools();
  const done = () => { ov.classList.add('hidden'); ov.innerHTML = ''; touch(el); rebuild(el); commit(); overlayEsc = null; closePops(); };
  mx.onclick = done; ov.onpointerdown = e => { if (e.target === ov) done(); };
  overlayEsc = done;
  if (!body.textContent.trim() && !body.querySelector('img,hr')) body.innerHTML = '<p><br></p>';
  setTimeout(() => { body.focus(); if (body.textContent === '') caretIn(body.firstChild); else focusEnd(body); }, 0);
}

/* ------------------------------ Template ------------------------------ */
const TEMPLATES = {
  'Piano di progetto': () => { const c1 = makeEl('column', 40, 40, { title: 'Da fare' }), c2 = makeEl('column', 410, 40, { title: 'In corso' }), c3 = makeEl('column', 780, 40, { title: 'Fatto' }); [['Definire gli obiettivi', c1], ['Raccogliere riferimenti', c1], ['Bozza iniziale', c2], ['Kickoff', c3]].forEach(([t, c]) => { const n = makeEl('note', 0, 0, { html: `<p>${t}</p>` }); n.col = c.id; c.items.push(n.id); }); makeEl('todo', 1150, 40, { items: [{ id: uid(), text: 'Scadenze principali', done: false }, { id: uid(), text: 'Assegnare i compiti', done: false }] }); },
  'Moodboard': () => { makeEl('heading', 40, 30, { html: 'Moodboard', w: 500 }); ['#f05f58', '#fbd14b', '#5fd3c7', '#323b4a'].forEach((c, i) => makeEl('color', 40 + i * 190, 110, { hex: c, name: colorName(c) })); makeEl('note', 40, 340, { html: '<h1>Ispirazione</h1><p>Trascina qui immagini, link e video.</p>' }); },
  'Brief creativo': () => { makeEl('heading', 40, 30, { html: 'Brief creativo', w: 500 }); [['Obiettivo', 'Cosa vogliamo ottenere?'], ['Pubblico', 'A chi ci rivolgiamo?'], ['Messaggio', 'Cosa deve arrivare?'], ['Consegne', 'Formati e tempi']].forEach(([t, d], i) => makeEl('note', 40 + (i % 2) * 370, 110 + Math.floor(i / 2) * 200, { html: `<h1>${t}</h1><p>${d}</p>` })); },
  'Profilo personaggio': () => { makeEl('heading', 40, 30, { html: 'Profilo del personaggio', w: 500 }); [['Nome', ''], ['Aspetto', ''], ['Personalità', ''], ['Storia', ''], ['Obiettivi', ''], ['Paure', '']].forEach(([t], i) => makeEl('note', 40 + (i % 3) * 370, 110 + Math.floor(i / 3) * 190, { html: `<h1>${t}</h1><p><br></p>` })); },
  'Piano settimanale': () => { ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Weekend'].forEach((d, i) => { const c = makeEl('column', 40 + i * 360, 40, { title: d }); const t = makeEl('todo', 0, 0, { items: [{ id: uid(), text: '', done: false }] }); t.col = c.id; c.items.push(t.id); }); },
};
function maybeTemplateChooser(bid) {
  const b = S.boards[bid]; if (!b || bid === 'home' || b.templateAsked || boardEls(bid).length) return;
  $$('.tpl-panel').forEach(p => p.remove());
  let choice = null;
  const saved = JSON.parse(localStorage.getItem('bacheca-templates') || '[]');
  const p = h('div', 'tpl-panel'); p.innerHTML = '<h4>Scegli un template <button>✕</button></h4>';
  const list = [['Board vuota', null], ...Object.keys(TEMPLATES).map(k => [k, k]), ...saved.map((t, i) => [t.name + ' (tuo)', 'saved:' + i])];
  list.forEach(([l, k], i) => { const d = h('div', 'ti2' + (i === 0 ? ' on' : ''), `<span>${esc(l)}</span>${k === 'Piano di progetto' ? '<em>CONSIGLIATO</em>' : ''}`); d.onclick = () => { $$('.ti2', p).forEach(x => x.classList.remove('on')); d.classList.add('on'); choice = k; }; p.appendChild(d); });
  const go = h('button', 'go', 'Continua'); p.appendChild(go);
  const close = () => { b.templateAsked = true; scheduleSave(); p.remove(); };
  $('h4 button', p).onclick = close;
  go.onclick = () => {
    close(); if (!choice) return;
    if (choice.startsWith('saved:')) { const t = saved[+choice.slice(6)]; importBoardTree(t.board, bid); }
    else TEMPLATES[choice]();
    render(); commit();
  };
  document.body.appendChild(p);
}
function importBoardTree(tree, intoBoard) {
  const idmap = {}; const root = Object.keys(tree.boards)[0];
  Object.keys(tree.boards).forEach(b => idmap[b] = b === root ? intoBoard : uid());
  Object.keys(tree.elements).forEach(e => idmap[e] = uid());
  Object.entries(tree.boards).forEach(([b, v]) => { if (b === root) return; S.boards[idmap[b]] = { ...v, id: idmap[b], parent: idmap[v.parent] || intoBoard }; });
  Object.values(tree.elements).forEach(e => { const c = JSON.parse(JSON.stringify(e)); c.id = idmap[e.id]; c.board = idmap[e.board]; c.z = nextZ(); if (c.col) c.col = idmap[c.col]; if (c.items && c.type === 'column') c.items = c.items.map(i => idmap[i]); if (c.type === 'board') c.target = idmap[c.target] || c.target; if (c.type === 'line') { c.a = idmap[c.a] || null; c.b = idmap[c.b] || null; } S.elements[c.id] = c; });
}

/* ------------------------------ Coach tips (prima volta) ------------------------------ */
const TIPS = { note: ['Le note si possono mettere ovunque e si allungano mentre scrivi', 'Suggerimento: deseleziona una nota per trascinarla'], link: ['Le card link salvano un\'anteprima visiva di qualsiasi sito', ''], todo: ['Le liste di cose da fare raggruppano e ordinano le attività', 'Suggerimento: imposta scadenze e promemoria dalla barra a sinistra'], column: ['Le colonne raggruppano più elementi insieme', ''], comment: ['Usa i commenti per lasciare messaggi', ''], document: ['I documenti servono per scrivere testi lunghi', ''], color: ['Crea palette di colori con le card campione', ''], sketch: ['Gli schizzi si ridimensionano e si mettono ovunque', ''], line: ['Usa le linee per creare diagrammi e mostrare relazioni', ''], video: ['Le card video salvano e riproducono video', ''], map: ['Le card mappa salvano una mappa interattiva', ''], table: ['Usa le tabelle per budget, tempistiche, liste prodotti e altro', 'Suggerimento: scrivi "=" in una cella per una formula (es. SUM)'], board: ['Dai un nome alla nuova board', 'Per esempio "Moodboard" o "Piano di progetto"'] };
function coachTip(type, id) {
  const seen = JSON.parse(localStorage.getItem('bacheca-tips') || '{}'); if (seen[type] || !TIPS[type]) return;
  seen[type] = 1; localStorage.setItem('bacheca-tips', JSON.stringify(seen));
  setTimeout(() => {
    const n = nodes.get(id); if (!n) return; const r = n.getBoundingClientRect();
    $$('.coach').forEach(c => c.remove());
    const t = h('div', 'coach', `<button class="cx">✕</button><b>${TIPS[type][0]}</b>${TIPS[type][1] ? `<small>${TIPS[type][1]}</small>` : ''}`);
    document.body.appendChild(t);
    // never cover the card: to its right if there is room, otherwise below it, otherwise above it
    const tw = t.offsetWidth, th = t.offsetHeight;
    if (r.right + 14 + tw <= innerWidth - 8) { t.style.left = (r.right + 14) + 'px'; t.style.top = clamp(r.top + r.height / 2 - th / 2, 100, innerHeight - th - 10) + 'px'; }
    else { t.classList.add('vert'); t.style.left = clamp(r.left + r.width / 2 - tw / 2, 8, innerWidth - tw - 8) + 'px'; const below = r.bottom + 14, above = r.top - th - 14; t.style.top = (below + th <= innerHeight - 80 ? below : Math.max(70, above)) + 'px'; }
    const close = () => t.remove(); $('.cx', t).onclick = close; setTimeout(close, 7000);
  }, 250);
}
function addElement(type, at, opts = {}) {
  if (type === 'draw') return toggleDraw();
  if (type === 'line' && !(opts && opts.extra)) {
    blurEditing(); hidePopups(true);
    const p = at || nextSpot();
    const el = makeEl('line', p.x, p.y, { x1: p.x, y1: p.y + 130, x2: p.x + 130, y2: p.y, a: null, b: null, bx: 0, by: 0, arrowEnd: true, width: 2 });
    sel.clear(); sel.add(el.id); render(); commit(); coachTip('line', el.id); return el;
  }
  const el = _orig.addElement(type, at, opts);
  if (el && el.id) coachTip(type, el.id);
  return el;
}

/* ------------------------------ Popup header ------------------------------ */
function headerPop(anchor, build, width = 300) {
  const open = $(`.pop[data-for="${anchor.id}"]`); closePops(); hidePopups(true); if (open) return null;
  const m = h('div', 'pop'); m.dataset.for = anchor.id; m.style.width = width + 'px'; m.addEventListener('pointerdown', e => e.stopPropagation());
  build(m); document.body.appendChild(m);
  const r = anchor.getBoundingClientRect(); m.style.top = r.bottom + 6 + 'px'; m.style.left = clamp(r.right - width, 6, innerWidth - width - 6) + 'px';
  anchor.classList.add('on'); const obs = new MutationObserver(() => { if (!m.isConnected) { anchor.classList.remove('on'); obs.disconnect(); } }); obs.observe(document.body, { childList: true });
  return m;
}
function helpPop() {
  headerPop($('#btn-help'), m => {
    m.style.padding = '6px';
    [['⌨️', 'Scorciatoie', 'Il modo rapido per le operazioni più comuni', () => openShortcuts()], ['✨', 'Novità', 'Cosa c\'è di nuovo in questa versione', () => { closePops(); toast('Versione locale: tutte le funzioni girano sul tuo Mac, i dati restano nel browser.'); }], ['💾', 'Backup', 'Esporta o ripristina tutti i tuoi dati', () => { closePops(); openPanel('settings'); }]].forEach(([i, t, s, fn]) => {
      const d = h('div', 'help-item', `<div class="hi">${i}</div><div><b>${t}</b><small>${s}</small></div>`); d.onclick = () => { closePops(); fn(); }; m.appendChild(d);
    });
  }, 330);
}
const SHORTCUTS = [
  ['Scorciatoie essenziali', [['Nuova nota', 'Doppio clic'], ['Aggiungi un\'altra nota, board o colonna', '⌘ ↩'], ['Muoviti nella board', 'Tieni premuto Spazio e trascina'], ['Modalità presentazione', '⌘ ⌥ P'], ['Cerca', '⌘ F'], ['Elimina oggetto', 'Canc'], ['Sposta oggetto in Non ordinati', '⌥ `'], ['Sposta un oggetto', '← ↑ ↓ →'], ['Apri board in una nuova scheda', '⌘ + doppio clic'], ['Contagocce colore', 'I']]],
  ['Di base', [['Taglia', '⌘ X'], ['Copia', '⌘ C'], ['Incolla', '⌘ V'], ['Incolla stili', '⌘ ⌥ V'], ['Annulla', '⌘ Z'], ['Ripeti', '⌘ ⇧ Z'], ['Seleziona tutto', '⌘ A'], ['Deseleziona / termina modifica', 'Esc'], ['Duplica', '⌘ D o ⌥ + trascina'], ['Porta indietro', '⌘ ⇧ ↓'], ['Porta avanti', '⌘ ⇧ ↑']]],
  ['Formattazione testo', [['Titolo grande', '⌘ ⇧ 1'], ['Titolo normale', '⌘ ⇧ 2'], ['Testo normale', '⌘ ⇧ 0'], ['Testo piccolo', '⌘ ⇧ 9'], ['Grassetto', '⌘ B'], ['Corsivo', '⌘ I'], ['Elenco puntato', '⌘ ⇧ U'], ['Elenco numerato', '⌘ ⇧ O'], ['Link', '⌘ K'], ['Evidenzia', '⌘ J'], ['Barrato', '⌘ ⇧ X'], ['Blocco di codice', '⌘ >'], ['Citazione', '⌘ "'], ['Sottolineato', '⌘ U'], ['Rientro', 'Tab'], ['Riduci rientro', '⇧ Tab'], ['Centra', '⌘ \\']]],
  ['Markdown', [['Titolo grande', '# poi Spazio'], ['Titolo normale', '## poi Spazio'], ['Elenco puntato', '* poi Spazio'], ['Elenco numerato', '1. poi Spazio'], ['Casella di controllo', '[] poi Spazio'], ['Citazione', '> poi Spazio'], ['Blocco di codice', '``` poi Spazio'], ['Riquadro', '! poi Spazio'], ['Linea divisoria', '---']]],
  ['Liste di cose da fare', [['Aggiungi un titolo', '⌥ ↩'], ['Aggiungi una scadenza', '⌘ ⇧ 1'], ['Assegna un\'attività', '⌘ ⇧ 2']]],
  ['Disegno', [['Inizia a disegnare', '⇧ D'], ['Strumento selezione', 'V'], ['Gomma', 'E'], ['Palette colori', 'C'], ['Colore precedente', 'X'], ['Spessore penna', '1 2 3 4'], ['Salva disegno', 'Esc o ⌘ S']]],
  ['Navigazione', [['Board recenti', '⌘ F'], ['Indietro', '⌘ ['], ['Avanti', '⌘ ]'], ['Board superiore', '⌘ U']]],
  ['Aspetto', [['Modalità scura', '⌘ ⇧ D'], ['Interfaccia più piccola', '⌘ ⇧ <'], ['Interfaccia più grande', '⌘ ⇧ >']]],
  ['Zoom', [['Adatta alla finestra', 'Z'], ['Ingrandisci', '⌘ +'], ['Riduci', '⌘ -'], ['Torna al 100%', '⌘ 0']]],
];
function openShortcuts() {
  hidePopups(true); closePops();
  const ov = $('#overlay'); ov.innerHTML = ''; ov.classList.remove('hidden');
  const box = h('div', 'modal sc-modal'); const nav = h('div', 'sc-nav'); const body = h('div', 'sc-body');
  SHORTCUTS.forEach(([sec, rows], i) => {
    const n = h('div', i === 0 ? 'on' : '', sec); n.onclick = () => { $$('.sc-nav div').forEach(x => x.classList.remove('on')); n.classList.add('on'); $('#sc-' + i).scrollIntoView({ behavior: 'smooth' }); }; nav.appendChild(n);
    const hh = h('h3', '', sec); hh.id = 'sc-' + i; body.appendChild(hh);
    rows.forEach(([l, k]) => body.appendChild(h('div', 'sc-row', `<span>${l}</span><span class="k">${k.split(' ').map(x => /^(poi|o|e|Tieni|premuto|trascina|\+|clic|doppio|Spazio)$/.test(x) && x !== 'Spazio' ? `<span>${x}</span>` : `<kbd>${x}</kbd>`).join('')}</span>`)));
  });
  nav.appendChild(h('div', 'sc-hint', 'Premi <kbd>/</kbd> per mostrare le scorciatoie'));
  const mx = h('button', 'mx', '✕'); box.append(mx, nav, body); ov.appendChild(box);
  const done = () => { ov.classList.add('hidden'); ov.innerHTML = ''; overlayEsc = null; };
  mx.onclick = done; ov.onpointerdown = e => { if (e.target === ov) done(); }; overlayEsc = done;
}
function settingsPop() {
  headerPop($('#btn-settings'), m => {
    m.style.padding = '0';
    const n = Object.values(S.elements).filter(e => !e.deleted).length;
    m.innerHTML = `<div class="profile"><div style="flex:1;min-width:0"><div class="pn editable" contenteditable="plaintext-only"></div><small>Account locale su questo Mac</small><small style="display:block;margin-top:2px;opacity:.7">Versione: ${esc(APP_VERSION)}</small><div style="margin-top:8px;display:flex;gap:12px;font-size:12px"><a href="#" data-a="settings" style="color:var(--accent)">Impostazioni</a><a href="#" data-a="access" style="color:var(--accent)">Accessi</a><a href="#" data-a="dark" style="color:var(--accent)">${document.body.classList.contains('dark') ? 'Modalità chiara' : 'Modalità scura'}</a></div></div><div style="text-align:center"><div class="big-av"></div><small style="cursor:pointer" data-a="av">Cambia</small></div></div><div style="border-top:1px solid #eceef0;padding:14px 18px 16px"><div style="font-size:13px;font-weight:600;margin-bottom:8px">Spazio illimitato</div><div style="height:6px;background:#eceef0;border-radius:3px"><div style="width:100%;height:100%;background:#4eb85a;border-radius:3px"></div></div><small style="color:var(--muted);display:block;margin-top:6px">${n} elementi · nessun limite in locale</small></div>`;
    const pn = $('.pn', m); pn.textContent = PROFILE.name;
    pn.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); pn.blur(); } };
    pn.onblur = () => { PROFILE.name = pn.textContent.trim() || 'Tu'; saveProfile(); };
    const av = $('.big-av', m); av.textContent = initials(PROFILE.name); av.style.background = PROFILE.color; if (PROFILE.avatar) { av.style.backgroundImage = `url(${PROFILE.avatar})`; av.textContent = ''; }
    const pickAv = () => pickFiles('image/*', false, f => { const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'); const s = Math.min(img.width, img.height); x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 96, 96); PROFILE.avatar = c.toDataURL('image/jpeg', .85); saveProfile(); closePops(); settingsPop(); }; img.src = r.result; }; r.readAsDataURL(f[0]); });
    av.onclick = pickAv; $('[data-a="av"]', m).onclick = pickAv;
    $('[data-a="settings"]', m).onclick = e => { e.preventDefault(); closePops(); openPanel('settings'); };
    const ax = $('[data-a="access"]', m); // Accessi: solo con il server e con una chiave da persona
    if (typeof Access !== 'undefined' && Access.available()) ax.onclick = e => { e.preventDefault(); closePops(); Access.open(); }; else ax.remove();
    $('[data-a="dark"]', m).onclick = e => { e.preventDefault(); toggleDark(); closePops(); };
  }, 330);
}
function saveProfile() { localStorage.setItem('bacheca-profile', JSON.stringify(PROFILE)); render(); }
function notifPop() {
  headerPop($('#btn-notif'), m => {
    m.style.padding = '0';
    m.appendChild(h('div', 'ph', '<span>Notifiche</span>'));
    const b = h('div', 'pb');
    const due = [];
    Object.values(S.elements).forEach(e => { if (e.type === 'todo' && !e.deleted) (e.items || []).forEach(it => { if (it.due && !it.done) due.push({ e, it }); }); });
    due.sort((a, b) => a.it.due.localeCompare(b.it.due));
    if (due.length) { b.appendChild(h('div', 'mlabel', 'Scadenze')); due.slice(0, 12).forEach(({ e, it }) => { const r = h('div', 'prow', `<span class="chip due ${dueState(it)}">${ICONS.bell}${esc(dueLabel(it))}</span><div class="pt"><b></b><small>${esc(S.boards[e.board]?.title || '')}</small></div>`); $('b', r).textContent = it.text || 'Attività'; r.style.cursor = 'pointer'; r.onclick = () => { closePops(); openBoard(e.board, e.id); }; b.appendChild(r); }); }
    const cm = Object.values(S.elements).filter(e => e.type === 'comment' && !e.deleted && e.thread?.length).sort((a, c) => c.modified - a.modified).slice(0, 8);
    if (cm.length) { b.appendChild(h('div', 'mlabel', 'Commenti recenti')); cm.forEach(e => { const last = e.thread[e.thread.length - 1]; const r = h('div', 'prow', `<div class="cm" style="margin:0"><div class="av" style="margin:0">${esc(initials(last.author))}</div></div><div class="pt"><b></b><small>${relTime(last.ts)} · ${esc(S.boards[e.board]?.title || '')}</small></div>`); $('b', r).textContent = last.text; r.style.cursor = 'pointer'; r.onclick = () => { closePops(); openBoard(e.board, e.id); }; b.appendChild(r); }); }
    if (!due.length && !cm.length) b.appendChild(h('div', 'pempty', 'Nessuna notifica'));
    m.appendChild(b);
  }, 360);
}
function searchPop() {
  const m = headerPop($('#btn-search'), m => {
    m.style.padding = '0';
    const inp = h('input'); inp.id = 'search-input'; inp.placeholder = 'Cerca in tutte le board…'; inp.style.margin = '14px 14px 8px'; inp.style.width = 'calc(100% - 28px)';
    const body = h('div', 'pb'); body.style.maxHeight = '60vh';
    m.append(inp, body);
    const recent = JSON.parse(localStorage.getItem('bacheca-recent') || '[]').filter(id => S.boards[id] && !isBoardHidden(id) && id !== UNSORTED);
    const run = () => {
      const q = inp.value.trim().toLowerCase(); body.innerHTML = '';
      if (!q) {
        body.appendChild(h('div', 'mlabel', 'Board recenti'));
        (recent.length ? recent : ['home']).slice(0, 10).forEach(id => { const b = S.boards[id]; const r = h('div', 'prow', `<span class="sq" style="width:16px;height:16px;border-radius:4px;background:${id === 'home' ? 'var(--ink)' : boardBg(b)}"></span><div class="pt"><b></b><small>${esc(S.boards[b.parent]?.title || '')}</small></div>`); $('b', r).textContent = b.title; r.style.cursor = 'pointer'; r.onclick = () => { closePops(); openBoard(id); }; body.appendChild(r); });
        return;
      }
      const res = [];
      Object.values(S.boards).forEach(b => { if (b.id !== 'home' && b.id !== UNSORTED && !isBoardHidden(b.id) && (b.title || '').toLowerCase().includes(q)) res.push({ kind: 'board', b }); });
      Object.values(S.elements).forEach(e => { if (e.deleted || isBoardHidden(e.board) || e.type === 'board') return; const t = [elText(e), e.cardTitle, e.cardCaption, e.caption, e.title, e.meta?.title, e.meta?.description, e.name, e.label].filter(Boolean).join(' '); if (t.toLowerCase().includes(q)) res.push({ kind: 'el', e, t }); });
      if (!res.length) body.appendChild(h('div', 'pempty', 'Nessun risultato'));
      res.slice(0, 100).forEach(x => {
        const r = h('div', 'prow'); r.style.cursor = 'pointer';
        if (x.kind === 'board') { r.innerHTML = `<span class="sq" style="width:16px;height:16px;border-radius:4px;background:${boardBg(x.b)}"></span><div class="pt"><b></b><small>${esc(S.boards[x.b.parent]?.title || '')}</small></div>`; $('b', r).innerHTML = hl(x.b.title, q); r.onclick = () => { closePops(); openBoard(x.b.id); }; }
        else { r.innerHTML = `<span class="tag">${esc(TYPE_LABEL[x.e.type] || x.e.type)}</span><div class="pt"><b></b><small>${esc(x.e.board === UNSORTED ? 'Non ordinati' : S.boards[x.e.board]?.title || '')}</small></div>`; $('b', r).innerHTML = hl(snippet(x.t, q), q); r.onclick = () => { closePops(); if (x.e.board === UNSORTED) toggleUnsorted(true); else openBoard(x.e.board, x.e.id); }; }
        body.appendChild(r);
      });
    };
    inp.oninput = run; inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Escape') closePops(); if (e.key === 'Enter') $('.prow', body)?.click(); };
    run(); setTimeout(() => inp.focus(), 0);
  }, 380);
  return m;
}
function openPanel(kind) {
  if (kind === 'search') return searchPop();
  if (kind === 'help') return helpPop();
  if (kind === 'notif') return notifPop();
  return _orig.openPanel(kind);
}
function shareModal() {
  hidePopups(true); closePops();
  const ov = $('#overlay'); ov.innerHTML = ''; ov.classList.remove('hidden');
  const b = S.boards[cur];
  const box = h('div', 'modal share-modal');
  box.innerHTML = `<button class="mx">✕</button>
  <div><h2>Aggiungi collaboratori</h2><p>Questa è una versione locale: i dati restano su questo Mac. Per far modificare la board a qualcuno, esportala e mandagli il file di backup da importare.</p>
  <div class="row">Esporta questa board da condividere</div><div class="inl"><input readonly value="${esc(b.title)}.bacheca.json"><button class="primary" data-a="exp">Esporta</button></div>
  <div class="row">Importa una board ricevuta</div><div class="inl"><input readonly value="Scegli un file .bacheca.json"><button data-a="imp">Importa</button></div>
  <div class="foot"><button class="toggle on" disabled></button> Avvisami quando qualcuno modifica questa board</div></div>
  <div><h2>Condividi un link di sola lettura</h2><p>Crea una pagina HTML autonoma, in sola lettura, da inviare a clienti o colleghi: si apre in qualsiasi browser senza installare nulla.</p>
  <div class="row">Includi sotto-board <button class="toggle" data-t="sub"></button></div>
  <div class="row sub">Mostra i link per scaricare i file <button class="toggle on" data-t="files"></button></div>
  <div class="row sub">Messaggio di benvenuto <button class="toggle" data-t="welcome"></button></div>
  <div class="inl" style="margin-top:10px"><input readonly value="${esc(b.title)} (sola lettura).html"><button class="primary" data-a="html">Crea pagina</button></div>
  <div class="foot">📊 Le pagine create sono file locali: nessun dato viene inviato online.</div></div>`;
  ov.appendChild(box);
  $$('.toggle[data-t]', box).forEach(t => t.onclick = () => t.classList.toggle('on'));
  const done = () => { ov.classList.add('hidden'); ov.innerHTML = ''; overlayEsc = null; };
  $('.mx', box).onclick = done; ov.onpointerdown = e => { if (e.target === ov) done(); }; overlayEsc = done;
  $('[data-a="exp"]', box).onclick = () => saveBlob(new Blob([JSON.stringify({ app: 'bacheca-board', tree: exportBoardTree(cur) })], { type: 'application/json' }), b.title + '.bacheca.json');
  $('[data-a="imp"]', box).onclick = () => pickFiles('.json', false, async f => { try { const d = JSON.parse(await f[0].text()); if (d.app !== 'bacheca-board') throw 0; const nb = makeEl('board', viewCenter().x, viewCenter().y); importBoardTree(d.tree, nb.target); S.boards[nb.target].title = d.tree.boards[Object.keys(d.tree.boards)[0]].title; S.boards[nb.target].named = true; render(); commit(); done(); toast('Board importata'); } catch { toast('File non valido'); } });
  $('[data-a="html"]', box).onclick = async () => { const sub = $('[data-t="sub"]', box).classList.contains('on'); const welcome = $('[data-t="welcome"]', box).classList.contains('on'); const html = await readOnlyHTML(cur, sub, welcome); saveBlob(new Blob([html], { type: 'text/html' }), b.title + ' (sola lettura).html'); };
}
async function readOnlyHTML(bid, sub, welcome) {
  const css = [...document.styleSheets].map(ss => { try { return [...ss.cssRules].map(r => r.cssText).join('\n'); } catch { return ''; } }).join('\n');
  const pages = []; const stack = [bid];
  const prevCur = cur, prevZoom = zoom;
  while (stack.length) {
    const b = stack.shift(); cur = b; fullRender();
    const clone = world().cloneNode(true);
    clone.querySelectorAll('[contenteditable]').forEach(x => x.removeAttribute('contenteditable'));
    clone.querySelectorAll('.rz, .lh, .grip, .col-collapse, .tbl-colhdr, .tbl-rowhdr, .tsel, .tfill').forEach(x => x.remove());
    const imgs = [...clone.querySelectorAll('img')];
    for (const im of imgs) { try { if (im.src.startsWith('blob:')) { const bl = await (await fetch(im.src)).blob(); im.src = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(bl); }); } } catch { } }
    clone.querySelectorAll('.el-board').forEach(n => { const e = E(n.dataset.id); if (e && sub) n.setAttribute('onclick', `show('${e.target}')`); });
    pages.push({ id: b, title: S.boards[b].title, html: clone.outerHTML });
    if (sub) boardEls(b).filter(e => e.type === 'board' && !e.shortcut).forEach(e => stack.push(e.target));
  }
  cur = prevCur; zoom = prevZoom; fullRender();
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>${esc(S.boards[bid].title)}</title><style>${css}\nbody{overflow:auto;user-select:text}.page{display:none;position:relative}.page.on{display:block}#world{position:relative!important;transform:none!important}.ro-h{position:sticky;top:0;z-index:99;background:#fff;box-shadow:0 1px 2px rgba(27,37,54,.1);padding:14px 20px;font-family:var(--serif);font-size:22px;font-weight:600;text-align:center}.ro-w{background:#323b4a;color:#fff;text-align:center;padding:10px;font-size:13px}</style></head><body>${welcome ? '<div class="ro-w">Benvenuto! Questa è una copia in sola lettura.</div>' : ''}${pages.map((p, i) => `<div class="page${i === 0 ? ' on' : ''}" id="p-${p.id}"><div class="ro-h">${i ? `<a href="#" onclick="show('${bid}');return false" style="float:left;font:13px Inter;color:#8d929a">← indietro</a>` : ''}${esc(p.title)}</div>${p.html}</div>`).join('')}<script>function show(id){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('on',p.id==='p-'+id));scrollTo(0,0)}<\/script></body></html>`;
}

/* ------------------------------ Aspetto ------------------------------ */
function toggleDark() { document.body.classList.toggle('dark'); localStorage.setItem('bacheca-dark', document.body.classList.contains('dark') ? '1' : ''); }
function uiScale(d) { const v = clamp((parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1) + d, .8, 1.3); document.documentElement.style.setProperty('--ui', v); localStorage.setItem('bacheca-ui', v); updateStageSize(); }

/* ------------------------------ Tastiera (scorciatoie dell'originale) ------------------------------ */
const navStack = { back: [], fwd: [] };
function keyCapture(e) {
  if (!S || window.__sketchOpen) return;
  const mod = e.metaKey || e.ctrlKey; const k = e.key.toLowerCase();
  if (drawState) { if (drawKeys(e, drawState.opts, drawState.rer, drawState.surface, () => finishDraw(true))) return; if ((mod && k === 'z')) { e.preventDefault(); e.stopImmediatePropagation(); if (e.shiftKey) { if (drawState.state.redo.length) drawState.state.strokes.push(drawState.state.redo.pop()); } else if (drawState.state.strokes.length) drawState.state.redo.push(drawState.state.strokes.pop()); drawState.surface.paint(); drawState.rer(); } return; }
  if (e.key === 'Escape' && $$('.pop').length) { e.preventDefault(); e.stopImmediatePropagation(); closePops(); return; }
  if (mod && e.shiftKey && k === 'd') { e.preventDefault(); e.stopImmediatePropagation(); toggleDark(); return; }
  if (mod && e.shiftKey && (e.key === '<' || e.key === ',' )) { e.preventDefault(); e.stopImmediatePropagation(); uiScale(-.1); return; }
  if (mod && e.shiftKey && (e.key === '>' || e.key === '.') && !isTyping()) { e.preventDefault(); e.stopImmediatePropagation(); uiScale(.1); return; }
  if (mod && e.altKey && k === 'p' || mod && e.altKey && e.code === 'KeyP') { e.preventDefault(); e.stopImmediatePropagation(); presentMode(!document.body.classList.contains('present')); return; }
  if (isTyping() || !$('#overlay').classList.contains('hidden') || TBL.st) return;
  if (mod && k === 'u') { e.preventDefault(); e.stopImmediatePropagation(); const p = S.boards[cur].parent; if (p && p !== UNSORTED) openBoard(p); return; }
  if (mod && e.key === '[' && !e.shiftKey && !sel.size) { e.preventDefault(); e.stopImmediatePropagation(); history.back(); return; }
  if (mod && e.key === ']' && !e.shiftKey && !sel.size) { e.preventDefault(); e.stopImmediatePropagation(); history.forward(); return; }
  if (mod && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && sel.size) { e.preventDefault(); e.stopImmediatePropagation(); const els = [...sel].map(E); if (e.key === 'ArrowUp') { els.forEach(x => x.z = nextZ()); commit(); render(); } else sendBack(els); return; }
  if (mod && e.key === 'Enter' && sel.size === 1) { e.preventDefault(); e.stopImmediatePropagation(); const src = E([...sel][0]); if (src.col) { const el = makeEl(src.type === 'board' ? 'board' : src.type === 'column' ? 'note' : 'note', 0, 0); const c = E(src.col); c.items.splice(c.items.indexOf(src.id) + 1, 0, el.id); el.col = c.id; sel.clear(); sel.add(el.id); render(); commit(); if (el.type === 'note') enterEdit(el); } else { const r = elRect(src.id); const t = ['board', 'column'].includes(src.type) ? src.type : 'note'; const el = addElement(t, { x: src.x, y: Math.round(r.y + r.h + 20) }); void el; } return; }
  if (mod && e.altKey && k === 'v') { e.preventDefault(); e.stopImmediatePropagation(); if (clip && clip.els[0] && sel.size) { const s = clip.els[0]; [...sel].map(E).forEach(x => { x.color = s.color; x.colorMode = s.colorMode; touch(x); }); render(); commit(); } return; }
  if (e.altKey && (e.key === '`' || e.code === 'Backquote') && sel.size) { e.preventDefault(); e.stopImmediatePropagation(); moveToUnsorted([...sel]); return; }
  if (!mod && !e.altKey) {
    if (e.key === '/' || e.key === '?') { e.preventDefault(); e.stopImmediatePropagation(); openShortcuts(); return; }
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); e.stopImmediatePropagation(); zoomToFit(); return; }
    if (k === 'd' && e.shiftKey) { e.preventDefault(); e.stopImmediatePropagation(); toggleDraw(); return; }
    if (k === 'i') { e.preventDefault(); e.stopImmediatePropagation(); eyedropper(); return; }
    // the original has no single-letter shortcuts to create elements
    if (['n', 'h', 't', 'b', 'c', 'k', 'l', 'd'].includes(k)) { e.stopImmediatePropagation(); return; }
  }
}
async function eyedropper() {
  if (!('EyeDropper' in window)) return toast('Contagocce non supportato da questo browser');
  try { const r = await new EyeDropper().open(); const els = [...sel].map(E).filter(Boolean); if (els.length) { els.forEach(x => { if (x.type === 'color') { x.hex = r.sRGBHex; x.name = colorName(x.hex); } else x.color = r.sRGBHex; touch(x); rebuild(x); }); commit(); } else { navigator.clipboard?.writeText(r.sRGBHex); toast('Colore copiato: ' + r.sRGBHex.toUpperCase()); } } catch { }
}

/* ------------------------------ Header & chrome ------------------------------ */
function renderChrome() {
  const b = S.boards[cur];
  const chain = []; let x = b; while (x) { chain.unshift(x); x = S.boards[x.parent]; }
  const cr = $('#crumbs'); cr.innerHTML = '';
  chain.forEach((bb, i) => {
    if (i) cr.appendChild(h('span', 'crumb-sep', '/'));
    const last = i === chain.length - 1 && chain.length > 1;
    const c = h('div', 'crumb' + (last ? ' current' : ''));
    c.innerHTML = bb.id === 'home' ? `<span class="logo">B</span><span>Home</span>` : `<span class="sq"></span><span></span>`;
    if (bb.id !== 'home') { c.lastChild.textContent = bb.title || 'Senza titolo'; const sq = $('.sq', c); sq.style.background = boardBg(bb); if (bb.iconImg) fileURL(bb.iconImg).then(u => sq.style.backgroundImage = `url(${u})`); }
    if (!last) c.onclick = () => openBoard(bb.id);
    cr.appendChild(c);
  });
  const t = $('#board-title');
  if (document.activeElement !== t) t.textContent = b.id === 'home' ? '' : (b.title || 'Senza titolo');
  t.contentEditable = b.id === 'home' ? 'false' : 'true';
  $('#board-row').classList.toggle('home', b.id === 'home');
  document.body.classList.toggle('home-board', b.id === 'home');
  $('#hdr-right').style.display = b.id === 'home' ? 'none' : '';
  $('#topbar').style.height = b.id === 'home' ? '44px' : '';
  document.documentElement.style.setProperty('--hdr', b.id === 'home' ? '44px' : '90px');
  document.title = (b.id === 'home' ? 'Home' : (b.title || 'Senza titolo')) + ' – Bacheca';
  updateUndoBtns();
  renderUnsorted();
}
function openBoard(id, focusId) {
  if (id !== cur) { const rec = JSON.parse(localStorage.getItem('bacheca-recent') || '[]').filter(x => x !== id); rec.unshift(id); localStorage.setItem('bacheca-recent', JSON.stringify(rec.slice(0, 20))); }
  $$('.tpl-panel, .coach').forEach(p => p.remove()); closePops();
  if (TBL.st) tExit();
  if (drawState) finishDraw(false);
  _orig.openBoard(id, focusId);
  applyGrid(); updateStageSize();
  setTimeout(() => maybeTemplateChooser(cur), 300);
}

/* ------------------------------ Init ------------------------------ */
function initFeatures() {
  if (localStorage.getItem('bacheca-dark')) document.body.classList.add('dark');
  const ui = localStorage.getItem('bacheca-ui'); if (ui) document.documentElement.style.setProperty('--ui', ui);
  ensureUnsorted();
  addEventListener('keydown', keyCapture, true);
  VP().addEventListener('dblclick', onDblClick, true);
  $('#btn-share').onclick = shareModal;
  $('#btn-settings').onclick = e => { e.stopPropagation(); settingsPop(); };
  $('#btn-help').onclick = e => { e.stopPropagation(); helpPop(); };
  $('#btn-notif').onclick = e => { e.stopPropagation(); notifPop(); };
  $('#btn-search').onclick = e => { e.stopPropagation(); searchPop(); };
  $('#btn-mobile').onclick = () => toggleUnsorted();
  $('#unsorted-btn').onclick = () => toggleUnsorted(true);
  $('#unsorted-close').onclick = () => toggleUnsorted(false);
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.pop, .dt-pop, .drawtb, #ctxbar, .ico, .hbtn')) closePops(); }, true);
  // dropping canvas cards onto the unsorted panel
  addEventListener('pointerup', e => {
    const p = $('#unsorted-panel'); if (!p || p.classList.contains('hidden') || !lastDragIds) return;
    const r = p.getBoundingClientRect(); if (e.clientX >= r.left) { const ids = lastDragIds; lastDragIds = null; setTimeout(() => moveToUnsorted(ids), 0); }
    lastDragIds = null; p.classList.remove('hot');
  }, true);
  addEventListener('pointermove', e => { if (drag && drag.kind === 'move') { lastDragIds = drag.ids; const p = $('#unsorted-panel'); if (p && !p.classList.contains('hidden')) p.classList.toggle('hot', e.clientX >= p.getBoundingClientRect().left); } }, true);
  setInterval(checkReminders, 30000); setTimeout(checkReminders, 3000);
  setInterval(() => { $$('.el-comment').forEach(n => { const el = E(n.dataset.id); if (el && !n.contains(document.activeElement)) { $$('.cm .when', n).forEach((w, i) => { if (el.thread[i]) w.textContent = relTime(el.thread[i].ts); }); } }); }, 60000);
  const rec = JSON.parse(localStorage.getItem('bacheca-recent') || '[]'); if (!rec.includes(cur)) { rec.unshift(cur); localStorage.setItem('bacheca-recent', JSON.stringify(rec)); }
  renderChrome(); render(); renderUnsorted();
  setTimeout(() => maybeTemplateChooser(cur), 400);
}
let lastDragIds = null;

/* ------------------------------ Spazio agenti ------------------------------ */
// il collegamento compare solo se il server con lo spazio agenti è attivo (non nella demo statica)
fetch('/api/board/health', { cache: 'no-store' }).then(r => r.ok && r.json()).then(j => { if (j && j.ok) document.getElementById('btn-agents')?.removeAttribute('hidden'); }).catch(() => { });
