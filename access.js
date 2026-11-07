// Sezione "Accessi" (solo con il server, solo per le persone): chi può usare la bacheca e cosa può fare
// ogni agente. Si apre dal menu del profilo. Le chiavi si vedono una sola volta, alla creazione o
// rigenerazione; il server ne conserva solo l'impronta. Ogni operazione finisce nel registro.
'use strict';
const Access = (() => {
  const TOKEN_KEY = 'bacheca-board-token';
  const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { } } };
  let available = false;
  fetch('/api/board/health', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => { available = !!j?.ok; }).catch(() => { });

  const PERMS = [
    ['create', 'Creare card', 'Può aprire nuove card (proposte, problemi trovati).'],
    ['work', 'Lavorare sulle card', 'Può prendere in carico le card, aggiornarle e cambiarne lo stato.'],
    ['comment', 'Commentare', 'Può scrivere commenti sulle card.'],
    ['notes', 'Scrivere note sulla lavagna', 'Può pubblicare rapporti come note nella board del progetto.'],
    ['closeWithoutApproval', 'Chiudere senza approvazione', 'Se disattivato, ogni card che chiude va "Da approvare" e decidi tu.'],
  ];
  const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  async function api(method, path, body) {
    const r = await fetch(path, { method, headers: { Authorization: `Bearer ${ls.get(TOKEN_KEY) || ''}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    let j = {}; try { j = await r.json(); } catch { }
    if (!r.ok) throw new Error(j.error || `Errore ${r.status}`);
    return j;
  }
  const when = iso => (iso ? new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
  const day = iso => (iso ? new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const projLabel = p => (p === '*' ? 'tutti i progetti' : p === '-' ? 'card senza progetto' : p);

  let modal = null, data = null;
  function close() { modal?.remove(); modal = null; document.removeEventListener('keydown', onKey, true); }
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } else e.stopPropagation(); }
  function shell(title) {
    close();
    modal = mk('div', 'acc-modal'); const box = mk('div', 'acc-box');
    const head = mk('div', 'acc-head'); head.append(mk('h2', '', title));
    const x = mk('button', 'acc-x', '✕'); x.title = 'Chiudi'; x.onclick = close; head.append(x);
    const body = mk('div', 'acc-body');
    box.append(head, body); modal.append(box); document.body.append(modal);
    modal.addEventListener('pointerdown', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', onKey, true);
    return body;
  }

  /* ------------------------------ elenco ------------------------------ */
  async function open() {
    const body = shell('Accessi');
    body.append(mk('p', 'acc-muted', 'Caricamento…'));
    try { data = await api('GET', '/api/board/actors'); } catch (e) { body.replaceChildren(mk('p', 'acc-err', e.message)); return; }
    body.replaceChildren();
    body.append(mk('p', 'acc-muted', 'Chi può usare la bacheca. Le persone possono tutto; per ogni agente scegli progetti e azioni consentite. Ogni modifica finisce nel registro.'));
    const actions = mk('div', 'acc-actions');
    const na = mk('button', 'acc-btn primary', '+ Nuovo agente'); na.onclick = () => form('agent');
    const np = mk('button', 'acc-btn', '+ Nuova persona'); np.onclick = () => form('human');
    actions.append(na, np); body.append(actions);
    for (const a of data.actors) body.append(rowOf(a));
  }
  function summary(a) {
    if (a.role === 'human') return 'Persona: può tutto (approvare, fermare gli agenti, gestire gli accessi).';
    const p = a.perms; const yes = PERMS.filter(([k]) => p[k]).map(([, l]) => l.toLowerCase()); const no = PERMS.filter(([k]) => !p[k]).map(([, l]) => l.toLowerCase());
    return `Progetti: ${p.projects.map(projLabel).join(', ')}. Può: ${yes.join(', ') || 'solo leggere'}.${no.length ? ` Non può: ${no.join(', ')}.` : ''} Massimo ${p.writesPerHour} modifiche/ora.`;
  }
  function rowOf(a) {
    const r = mk('div', 'acc-row' + (a.revoked || a.expired ? ' off' : ''));
    const top = mk('div', 'acc-top');
    top.append(mk('b', '', `${a.role === 'agent' ? '🤖' : '👤'} ${a.name}`));
    if (a.name === data.me) top.append(mk('span', 'acc-tag', 'tu'));
    top.append(mk('span', 'acc-tag ' + (a.revoked ? 'red' : a.expired ? 'red' : 'green'), a.revoked ? 'revocato' : a.expired ? 'scaduto' : 'attivo'));
    r.append(top);
    r.append(mk('div', 'acc-sum', summary(a)));
    r.append(mk('div', 'acc-meta', `Creato ${day(a.created)}${a.by ? ` da ${a.by}` : ''}${a.expires ? ` · scade ${day(a.expires)}` : ' · nessuna scadenza'}${a.rotated ? ` · chiave rigenerata ${day(a.rotated)}` : ''} · ultimo uso: ${a.lastSeen ? when(a.lastSeen) : 'non dall\'avvio del server'}`));
    if (!a.revoked) {
      const b = mk('div', 'acc-actions small');
      if (a.role === 'agent') { const e = mk('button', 'acc-btn', 'Permessi'); e.onclick = () => form('agent', a); b.append(e); }
      else { const e = mk('button', 'acc-btn', 'Scadenza'); e.onclick = () => form('human', a); b.append(e); }
      const rot = mk('button', 'acc-btn', 'Nuova chiave'); rot.onclick = () => rotate(a); b.append(rot);
      if (a.name !== data.me) { const rv = mk('button', 'acc-btn danger', 'Revoca'); rv.onclick = () => revoke(a); b.append(rv); }
      r.append(b);
    }
    return r;
  }

  /* ------------------------------ creazione e modifica ------------------------------ */
  function form(role, existing) {
    const body = shell(existing ? `${role === 'agent' ? 'Permessi' : 'Scadenza'} di ${existing.name}` : role === 'agent' ? 'Nuovo agente' : 'Nuova persona');
    const f = mk('form', 'acc-form');
    const perms = existing?.perms || data.safePerms;
    let nameInp = null;
    if (!existing) {
      const l = mk('label', '', 'Nome'); nameInp = mk('input'); nameInp.required = true; nameInp.placeholder = role === 'agent' ? 'es. claude-code, codex, backup-notte' : 'es. mario'; nameInp.pattern = '[a-z0-9][a-z0-9-]{1,31}'; nameInp.autocapitalize = 'off'; nameInp.title = '2-32 caratteri: lettere minuscole, numeri e trattini';
      l.append(nameInp); f.append(l);
    }
    let projBox = null, checks = {}, rate = null;
    if (role === 'agent') {
      f.append(mk('div', 'acc-label', 'Progetti a cui può accedere'));
      projBox = mk('div', 'acc-projects');
      const all = new Set([...(data.projects || []), ...perms.projects.filter(p => p !== '*' && p !== '-')]);
      const addProj = (val, label, checked) => { const l = mk('label', 'acc-check'); const c = mk('input'); c.type = 'checkbox'; c.value = val; c.checked = checked; l.append(c, ' ' + label); projBox.append(l); return c; };
      const star = addProj('*', 'Tutti i progetti (anche futuri)', perms.projects.includes('*'));
      for (const p of all) addProj(p, p, perms.projects.includes(p));
      addProj('-', 'Card senza progetto', perms.projects.includes('-'));
      const other = mk('input'); other.placeholder = 'altri progetti, separati da virgola'; other.className = 'acc-other'; other.autocapitalize = 'off';
      projBox.append(other); f.append(projBox);
      const sync = () => { for (const c of projBox.querySelectorAll('input[type=checkbox]')) if (c !== star) c.disabled = star.checked; other.disabled = star.checked; };
      star.onchange = sync; sync();
      f.append(mk('div', 'acc-label', 'Cosa può fare (leggere le card dei suoi progetti può sempre)'));
      for (const [k, label, help] of PERMS) {
        const l = mk('label', 'acc-check big'); const c = mk('input'); c.type = 'checkbox'; c.checked = !!perms[k]; checks[k] = c;
        const t = mk('span'); t.append(mk('b', '', label), mk('small', '', help)); l.append(c, t); f.append(l);
      }
      const lr = mk('label', '', 'Massimo di modifiche all\'ora'); rate = mk('input'); rate.type = 'number'; rate.min = 1; rate.max = 5000; rate.value = perms.writesPerHour; lr.append(rate); f.append(lr);
    }
    const le = mk('label', '', 'Scadenza della chiave');
    const exp = mk('select');
    for (const [v, t] of [['', existing?.expires ? `invariata (${day(existing.expires)})` : 'nessuna'], ['30', 'tra 30 giorni'], ['90', 'tra 90 giorni (consigliato)'], ['365', 'tra un anno'], ['none', 'togli la scadenza']]) { if (v === 'none' && !existing?.expires) continue; const o = mk('option', '', t); o.value = v; exp.append(o); }
    if (!existing) exp.value = '90';
    le.append(exp); f.append(le);
    const err = mk('p', 'acc-err');
    const row = mk('div', 'acc-actions');
    const back = mk('button', 'acc-btn', 'Indietro'); back.type = 'button'; back.onclick = open;
    const go = mk('button', 'acc-btn primary', existing ? 'Salva' : 'Crea la chiave'); go.type = 'submit';
    row.append(back, go); f.append(err, row);
    f.addEventListener('keydown', e => e.stopPropagation());
    f.onsubmit = async e => {
      e.preventDefault(); err.textContent = ''; go.disabled = true;
      const body2 = {};
      if (role === 'agent') {
        const sel = [...projBox.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value);
        const extra = projBox.querySelector('.acc-other').value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        const projects = sel.includes('*') ? ['*'] : [...new Set([...sel, ...extra])];
        if (!projects.length) { err.textContent = 'Scegli almeno un progetto'; go.disabled = false; return; }
        body2.perms = { projects, writesPerHour: Number(rate.value) || 120 };
        for (const [k] of PERMS) body2.perms[k] = checks[k].checked;
      }
      if (exp.value === 'none') body2.expires = null; else if (exp.value) body2.expires = new Date(Date.now() + Number(exp.value) * 86400000).toISOString();
      try {
        if (existing) { await api('PATCH', `/api/board/actors/${existing.name}`, body2); toast('Salvato'); open(); }
        else { const r = await api('POST', '/api/board/actors', { name: nameInp.value.trim().toLowerCase(), role, ...body2 }); showToken(r.name, r.token, role); }
      } catch (x) { err.textContent = x.message; go.disabled = false; }
    };
    body.append(f);
    (nameInp || f.querySelector('input'))?.focus();
  }

  /* ------------------------------ chiave e comandi pronti ------------------------------ */
  function showToken(name, token, role, rotatedSelf) {
    const body = shell(`Chiave di ${name}`);
    body.append(mk('p', 'acc-warn', 'Copia la chiave adesso: non verrà più mostrata. Chi la possiede agisce come ' + name + '.'));
    body.append(copyBox('Chiave', token));
    const origin = location.origin, mcp = data?.mcpPath || '/percorso/di/bancheca/mcp/bacheca-mcp.js';
    if (role === 'agent') {
      body.append(mk('div', 'acc-label', 'Claude Code: incolla nel terminale (vale per tutte le cartelle)'));
      body.append(copyBox('', `claude mcp add --scope user bacheca -e BACHECA_URL=${origin} -e BACHECA_TOKEN=${token} -- node "${mcp}"`));
      body.append(mk('div', 'acc-label', 'Codex: aggiungi a ~/.codex/config.toml'));
      body.append(copyBox('', `[mcp_servers.bacheca]\ncommand = "node"\nargs = ["${mcp}"]\nenv = { BACHECA_URL = "${origin}", BACHECA_TOKEN = "${token}" }`));
      body.append(mk('p', 'acc-muted', 'Se l\'agente lavora su un altro computer, copia lì il file mcp/bacheca-mcp.js e cambia il percorso nel comando. Le istruzioni da dare all\'agente sono in docs/agenti/ (CLAUDE.md e AGENTS.md).'));
    } else if (rotatedSelf) {
      body.append(mk('p', 'acc-muted', 'Questo dispositivo usa già la nuova chiave. Sugli altri tuoi dispositivi (telefono, altri computer) dovrai inserirla di nuovo.'));
    } else body.append(mk('p', 'acc-muted', `Dai questa chiave a ${name}: la inserirà quando apre la bacheca.`));
    const ok = mk('button', 'acc-btn primary', 'Fatto, l\'ho copiata'); ok.onclick = open; body.append(ok);
  }
  function copyBox(label, text) {
    const w = mk('div', 'acc-copy');
    if (label) w.append(mk('div', 'acc-label', label));
    const pre = mk('pre', '', text);
    const b = mk('button', 'acc-btn', 'Copia');
    b.onclick = async () => { try { await navigator.clipboard.writeText(text); b.textContent = 'Copiato ✓'; } catch { const r = document.createRange(); r.selectNodeContents(pre); getSelection().removeAllRanges(); getSelection().addRange(r); b.textContent = 'Seleziona e copia'; } };
    w.append(pre, b);
    return w;
  }
  async function rotate(a) {
    if (!confirm(`Creare una nuova chiave per ${a.name}? Quella attuale smette subito di funzionare.`)) return;
    try {
      const r = await api('POST', `/api/board/actors/${a.name}/rotate`);
      const self = a.name === data.me; if (self) ls.set(TOKEN_KEY, r.token);
      showToken(a.name, r.token, a.role, self);
    } catch (e) { toast(e.message); }
  }
  async function revoke(a) {
    if (!confirm(`Revocare l'accesso di ${a.name}? Smette subito di funzionare e le card che ha in carico tornano libere.`)) return;
    try { await api('POST', `/api/board/actors/${a.name}/revoke`); toast(`Accesso di ${a.name} revocato`); open(); } catch (e) { toast(e.message); }
  }

  return { available: () => available && !!ls.get(TOKEN_KEY), open, agents: async () => (await api('GET', '/api/board/actors')).actors.filter(a => a.role === 'agent' && !a.revoked && !a.expired) };
})();
