(() => {
  // ---------- Interfaz (dentro de un Shadow DOM para no chocar con los estilos de WhatsApp) ----------
  const host = document.createElement('div');
  host.id = 'corrector-wa-host';
  host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;width:0;height:0;';
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });

  root.innerHTML = `
  <style>
    *{box-sizing:border-box;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif}
    .fab{position:fixed;right:22px;bottom:84px;width:44px;height:44px;border-radius:50%;border:0;
      background:#2f6df6;color:#fff;font-size:20px;font-weight:700;cursor:pointer;
      box-shadow:0 4px 14px rgba(0,0,0,.25);display:grid;place-items:center}
    .fab:hover{filter:brightness(1.1)}
    .fab .badge{position:absolute;top:-4px;right:-4px;background:#e5484d;color:#fff;font-size:11px;
      min-width:18px;height:18px;border-radius:9px;display:none;place-items:center;padding:0 4px}
    .panel{position:fixed;right:22px;bottom:138px;width:370px;max-height:65vh;display:none;flex-direction:column;
      background:#fff;color:#1d2433;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.3);overflow:hidden}
    .panel.open{display:flex}
    .head{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #e3e7ef}
    .head b{flex:1;font-size:15px}
    select{font-size:13px;padding:4px 6px;border-radius:6px;border:1px solid #d5dae4}
    .x{background:none;border:0;font-size:20px;cursor:pointer;color:#6b7385}
    .cfg{display:flex;align-items:center;gap:6px;padding:8px 14px;border-bottom:1px solid #e3e7ef;font-size:12px;color:#6b7385}
    .cfg input{flex:1;font-size:12px;padding:4px 6px;border-radius:6px;border:1px solid #d5dae4;background:transparent;color:inherit}
    .body{overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
    .preview{font-size:14px;line-height:1.6;background:#f4f6fb;border-radius:8px;padding:10px;white-space:pre-wrap;word-wrap:break-word}
    mark{background:rgba(229,72,77,.18);border-bottom:2px solid #e5484d;color:inherit;border-radius:2px}
    mark.gra{background:rgba(240,160,32,.22);border-color:#f0a020}
    mark.pun{background:rgba(142,78,198,.18);border-color:#8e4ec6}
    mark.est{background:rgba(47,109,246,.15);border-color:#2f6df6}
    .item{border:1px solid #e3e7ef;border-left:4px solid #e5484d;border-radius:8px;padding:10px}
    .item.gra{border-left-color:#f0a020}.item.pun{border-left-color:#8e4ec6}.item.est{border-left-color:#2f6df6}
    .tag{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7385;font-weight:600}
    .orig{margin:4px 0;font-size:14px}.orig s{color:#e5484d}
    .msg{font-size:12.5px;color:#6b7385;margin-bottom:8px;line-height:1.4}
    .sugs{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
    .sug{background:#2f6df6;color:#fff;border:0;border-radius:6px;padding:5px 9px;font-size:13px;font-weight:600;cursor:pointer}
    .ign{background:none;border:0;color:#6b7385;text-decoration:underline;font-size:12px;cursor:pointer;margin-left:auto}
    .foot{display:flex;gap:8px;padding:10px 14px;border-top:1px solid #e3e7ef}
    .btn{flex:1;padding:8px;border-radius:8px;border:1px solid #d5dae4;background:#fff;cursor:pointer;font-size:13px;font-weight:600}
    .btn.primary{background:#2f6df6;color:#fff;border-color:#2f6df6}
    .btn:disabled{opacity:.5;cursor:default}
    .note{font-size:13px;color:#6b7385;text-align:center;padding:14px 4px}
    @media (prefers-color-scheme:dark){
      .panel{background:#1f2c34;color:#e9edef}.head,.foot{border-color:#34434d}
      .preview{background:#111b21}.item{border-color:#34434d}.btn{background:#2a3942;color:#e9edef;border-color:#34434d}
      select{background:#2a3942;color:#e9edef;border-color:#34434d}
    }
  </style>
  <button class="fab" title="Revisar ortografía (Alt+Shift+C)">✓<span class="badge"></span></button>
  <div class="panel">
    <div class="head">
      <b>Corrector</b>
      <select class="lang" title="Idioma">
        <option value="es">Español</option>
        <option value="auto">Detectar idioma</option>
        <option value="en-US">Inglés</option>
        <option value="pt-BR">Portugués</option>
        <option value="fr">Francés</option>
        <option value="it">Italiano</option>
        <option value="de-DE">Alemán</option>
      </select>
      <button class="x" title="Cerrar">×</button>
    </div>
    <div class="cfg"><span>Servidor:</span><input class="server" placeholder="Automático (local si está instalado)" spellcheck="false"></div>
    <div class="body"></div>
    <div class="foot">
      <button class="btn recheck">Revisar de nuevo</button>
      <button class="btn primary all">Aplicar todas</button>
    </div>
  </div>`;

  const $ = s => root.querySelector(s);
  const fab = $('.fab'), badge = $('.badge'), panel = $('.panel'), body = $('.body'), lang = $('.lang');
  let lastEditable = null, state = { text: '', matches: [] }, busy = false;

  const server = $('.server');
  server.onchange = () => { try { chrome.storage.local.set({ server: server.value.trim() }); } catch (e) {} };
  try {
    chrome.storage.local.get(['lang', 'server'], r => { if (r && r.lang) lang.value = r.lang; if (r && r.server) server.value = r.server; });
  } catch (e) {}
  lang.onchange = () => { try { chrome.storage.local.set({ lang: lang.value }); } catch (e) {} check(); };

  // ---------- Localizar el cuadro de texto ----------
  document.addEventListener('focusin', e => {
    const el = e.target && e.target.closest && e.target.closest('[contenteditable="true"], textarea');
    if (el && !host.contains(el)) lastEditable = el;
  }, true);

  function getEditable() {
    if (lastEditable && document.contains(lastEditable)) return lastEditable;
    return document.querySelector('footer [contenteditable="true"]') ||
           document.querySelector('#main [contenteditable="true"]');
  }
  function readText(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA') return el.value;
    return (el.innerText || '').replace(/\n$/, '');
  }
  function writeText(el, text) {
    el.focus();
    if (el.tagName === 'TEXTAREA') { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); return; }
    // WhatsApp usa un editor de React: seleccionar todo + insertText actualiza su estado correctamente
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  }

  // ---------- Utilidades ----------
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function typeOf(m) {
    const t = (m.rule && m.rule.issueType) || '';
    const cat = (m.rule && m.rule.category && m.rule.category.id) || '';
    if (t === 'misspelling' || cat === 'TYPOS') return 'ort';
    if (cat === 'PUNCTUATION' || t === 'typographical' || cat === 'TYPOGRAPHY') return 'pun';
    if (t === 'style' || t === 'locale-violation' || cat === 'STYLE' || cat === 'REDUNDANCY') return 'est';
    return 'gra';
  }
  const LABEL = { ort: 'Ortografía', gra: 'Gramática', pun: 'Puntuación', est: 'Estilo' };

  function setBadge(n) {
    badge.textContent = n;
    badge.style.display = n ? 'grid' : 'none';
  }

  // ---------- Revisión ----------
  function check() {
    if (busy) return;
    const el = getEditable();
    const text = readText(el);
    panel.classList.add('open');
    if (!el || !text.trim()) {
      body.innerHTML = '<div class="note">Escribe un mensaje en el chat y pulsa el botón ✓ para revisarlo.</div>';
      state = { text: '', matches: [] }; setBadge(0); updateFoot(); return;
    }
    busy = true;
    body.innerHTML = '<div class="note">Revisando…</div>';
    chrome.runtime.sendMessage({ type: 'check', text, language: lang.value, server: server.value.trim() }, res => {
      busy = false;
      if (chrome.runtime.lastError || !res || res.error) {
        const lim = res && res.error === 'limite';
        body.innerHTML = `<div class="note">${lim ? 'Demasiadas revisiones seguidas. Espera un minuto.' : (server.value.trim() ? 'No se pudo conectar con tu servidor (' + esc(server.value.trim()) + '). ¿Está encendido?' : 'No se pudo conectar con el servicio de corrección. Revisa tu conexión.')}</div>`;
        return;
      }
      state = {
        text,
        via: res.via,
        matches: res.matches.map((m, i) => ({
          id: i, offset: m.offset, length: m.length, message: m.message,
          reps: (m.replacements || []).slice(0, 4).map(r => r.value), type: typeOf(m)
        }))
      };
      render();
    });
  }

  function render() {
    const { text, matches } = state;
    setBadge(matches.length);
    updateFoot();
    const via = { local: 'Revisado en tu PC (servicio local)', publico: 'Revisado con el servicio público', propio: 'Revisado con tu servidor' }[state.via] || '';
    $('.cfg span').title = via;
    if (!matches.length) { body.innerHTML = '<div class="note">🎉 No se encontraron errores.<br><small>' + via + '</small></div>'; return; }
    let html = '', pos = 0;
    for (const m of [...matches].sort((a, b) => a.offset - b.offset)) {
      if (m.offset < pos) continue;
      html += esc(text.slice(pos, m.offset)) + `<mark class="${m.type}">${esc(text.slice(m.offset, m.offset + m.length))}</mark>`;
      pos = m.offset + m.length;
    }
    html += esc(text.slice(pos));
    body.innerHTML = `<div class="preview">${html}</div>`;
    for (const m of matches) {
      const d = document.createElement('div');
      d.className = 'item ' + m.type;
      d.innerHTML = `<div class="tag">${LABEL[m.type]}</div>
        <div class="orig"><s>${esc(text.slice(m.offset, m.offset + m.length))}</s></div>
        <div class="msg">${esc(m.message || '')}</div><div class="sugs"></div>`;
      const sg = d.querySelector('.sugs');
      m.reps.forEach(r => {
        const b = document.createElement('button');
        b.className = 'sug'; b.textContent = r || '(eliminar)';
        b.onclick = () => apply(m.id, r);
        sg.appendChild(b);
      });
      const ig = document.createElement('button');
      ig.className = 'ign'; ig.textContent = 'Ignorar';
      ig.onclick = () => { state.matches = state.matches.filter(x => x.id !== m.id); render(); };
      sg.appendChild(ig);
      body.appendChild(d);
    }
  }

  function updateFoot() {
    $('.all').disabled = !state.matches.some(m => m.reps.length);
  }

  function replaceIn(text, matches, m, rep) {
    const delta = rep.length - m.length, end = m.offset + m.length;
    const newText = text.slice(0, m.offset) + rep + text.slice(end);
    const rest = matches.filter(x => x.id !== m.id)
      .filter(x => x.offset + x.length <= m.offset || x.offset >= end)
      .map(x => x.offset >= end ? { ...x, offset: x.offset + delta } : x);
    return { text: newText, matches: rest };
  }

  function currentMatchesBox() {
    const el = getEditable();
    if (!el) return null;
    if (readText(el) !== state.text) {
      body.insertAdjacentHTML('afterbegin', '<div class="note">El mensaje cambió. Pulsa «Revisar de nuevo».</div>');
      return null;
    }
    return el;
  }

  function apply(id, rep) {
    const el = currentMatchesBox(); if (!el) return;
    const m = state.matches.find(x => x.id === id); if (!m) return;
    state = replaceIn(state.text, state.matches, m, rep);
    writeText(el, state.text);
    render();
  }

  $('.all').onclick = () => {
    const el = currentMatchesBox(); if (!el) return;
    const todo = state.matches.filter(m => m.reps.length).sort((a, b) => b.offset - a.offset);
    for (const m of todo) {
      if (!state.matches.find(x => x.id === m.id)) continue;
      state = replaceIn(state.text, state.matches, m, m.reps[0]);
    }
    writeText(el, state.text);
    render();
  };

  fab.addEventListener('mousedown', e => e.preventDefault()); // no quitar el foco del chat
  fab.onclick = () => { if (panel.classList.contains('open') && !busy && state.text === readText(getEditable())) { panel.classList.remove('open'); } else check(); };
  $('.x').onclick = () => panel.classList.remove('open');
  $('.recheck').onclick = check;

  document.addEventListener('keydown', e => {
    if (e.altKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); check(); }
  }, true);
})();
