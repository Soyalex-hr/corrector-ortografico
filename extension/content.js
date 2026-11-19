(() => {
  'use strict';

  // ================= Configuración =================
  const DEBOUNCE_MS = 800;          // espera tras dejar de escribir antes de revisar
  const COLORS = { ort: '#e5484d', gra: '#f0a020', pun: '#8e4ec6', est: '#2f6df6' };
  const LABEL = { ort: 'Ortografía', gra: 'Gramática', pun: 'Puntuación', est: 'Estilo' };
  const settings = { lang: 'es', server: '', auto: true, dict: [], disabledSites: [] };
  const IS_WA = location.hostname === 'web.whatsapp.com';
  const SITE = location.hostname;
  const siteDisabled = () => settings.disabledSites.includes(SITE);
  const CODE_EDITORS = '.monaco-editor, .CodeMirror, .cm-editor, .ace_editor';

  // ================= Interfaz (Shadow DOM) =================
  const host = document.createElement('div');
  host.id = 'corrector-wa-host';
  host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;width:0;height:0;';
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });

  const wave = c => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3'%3E%3Cpath d='M0 2.5 Q1.5 0 3 2.5 T6 2.5' fill='none' stroke='%23${c.slice(1)}' stroke-width='1.3'/%3E%3C/svg%3E")`;

  root.innerHTML = `
  <style>
    *{box-sizing:border-box;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif}
    :host{--bg:#fff;--ink:#1d2433;--muted:#667085;--line:#e3e7ef;--soft:#f4f6fb}
    :host([data-theme=dark]){--bg:#233138;--ink:#e9edef;--muted:#9aa7ae;--line:#34434d;--soft:#182229}
    .ln{position:fixed;height:3px;pointer-events:none;background-repeat:repeat-x;background-size:6px 3px}
    .ln.ort{background-image:${wave(COLORS.ort)}}
    .ln.gra{background-image:${wave(COLORS.gra)}}
    .ln.pun{background-image:${wave(COLORS.pun)}}
    .ln.est{background-image:${wave(COLORS.est)}}

    .fab{position:fixed;width:22px;height:22px;border-radius:50%;border:0;padding:0;display:none;
      place-items:center;cursor:pointer;font-size:11px;font-weight:700;color:#fff;background:#25a366;
      box-shadow:0 1px 4px rgba(0,0,0,.3);opacity:.85;transition:opacity .15s,transform .15s}
    .fab:hover{opacity:1;transform:scale(1.1)}
    .fab.show{display:grid}
    .fab.err{background:${COLORS.ort}}
    .fab.busy{background:#8696a0}
    .fab.warn{background:${COLORS.gra}}
    .fab.off{background:#8696a0;opacity:.5}

    .tip{position:fixed;display:none;width:280px;background:var(--bg);color:var(--ink);border-radius:10px;
      box-shadow:0 6px 24px rgba(0,0,0,.28);border:1px solid var(--line);overflow:hidden}
    .tip.show{display:block}
    .tip .bar{height:3px}
    .tip .in{padding:10px 12px}
    .tip .tag{font-size:10px;letter-spacing:.05em;text-transform:uppercase;font-weight:700;color:var(--muted)}
    .tip .msg{font-size:13px;line-height:1.4;margin:4px 0 8px}
    .sugs{display:flex;flex-wrap:wrap;gap:6px}
    .sug{background:#2f6df6;color:#fff;border:0;border-radius:6px;padding:5px 10px;font-size:14px;font-weight:600;cursor:pointer}
    .sug:hover{filter:brightness(1.12)}
    .acts{display:flex;gap:12px;margin-top:9px;border-top:1px solid var(--line);padding-top:7px}
    .lnk{background:none;border:0;padding:0;color:var(--muted);font-size:12px;cursor:pointer}
    .lnk:hover{color:var(--ink);text-decoration:underline}

    .panel{position:fixed;width:340px;max-height:60vh;display:none;flex-direction:column;background:var(--bg);color:var(--ink);
      border-radius:12px;box-shadow:0 10px 36px rgba(0,0,0,.3);border:1px solid var(--line);overflow:hidden}
    .panel.show{display:flex}
    .head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line)}
    .head b{flex:1;font-size:14px}
    select,input[type=text]{font-size:12px;padding:4px 6px;border-radius:6px;border:1px solid var(--line);background:var(--soft);color:var(--ink)}
    .x{background:none;border:0;font-size:18px;cursor:pointer;color:var(--muted);line-height:1}
    .cfg{display:flex;flex-direction:column;gap:6px;padding:8px 12px;border-bottom:1px solid var(--line);font-size:12px;color:var(--muted)}
    .cfg label{display:flex;align-items:center;gap:6px}
    .cfg input[type=text]{flex:1}
    .list{overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
    .item{border:1px solid var(--line);border-left:4px solid ${COLORS.ort};border-radius:8px;padding:8px 10px}
    .item.gra{border-left-color:${COLORS.gra}}.item.pun{border-left-color:${COLORS.pun}}.item.est{border-left-color:${COLORS.est}}
    .item .w{font-size:14px;margin:2px 0}.item .w s{color:${COLORS.ort}}
    .item .m{font-size:12px;color:var(--muted);margin-bottom:6px}
    .note{font-size:13px;color:var(--muted);text-align:center;padding:12px 4px}
    .foot{display:flex;gap:8px;padding:8px 12px;border-top:1px solid var(--line)}
    .btn{flex:1;padding:7px;border-radius:8px;border:1px solid var(--line);background:var(--soft);color:var(--ink);cursor:pointer;font-size:12px;font-weight:600}
    .btn.primary{background:#2f6df6;color:#fff;border-color:#2f6df6}
    .btn:disabled{opacity:.5;cursor:default}
    .mirror *{font:inherit !important;letter-spacing:inherit !important;box-sizing:content-box !important}
  </style>
  <div class="lines"></div>
  <button class="fab" title="Corrector">✓</button>
  <div class="tip"><div class="bar"></div><div class="in"></div></div>
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
    <div class="cfg">
      <label><input type="checkbox" class="auto"> Revisar automáticamente mientras escribo</label>
      <label><input type="checkbox" class="site"> Activo en este sitio (<span class="sitename"></span>)</label>
      <label>Servidor: <input type="text" class="server" placeholder="Automático (local si está instalado)" spellcheck="false"></label>
      <div class="via"></div>
    </div>
    <div class="list"></div>
    <div class="foot">
      <button class="btn recheck">Revisar ahora</button>
      <button class="btn primary all">Aplicar todas</button>
    </div>
  </div>`;

  const $ = s => root.querySelector(s);
  const linesEl = $('.lines'), fab = $('.fab'), tip = $('.tip'), tipIn = $('.tip .in'), tipBar = $('.tip .bar');
  const panel = $('.panel'), list = $('.list');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ================= Estado =================
  let editor = null;        // cuadro de texto de WhatsApp
  let model = null;         // { text, segs:[{node,start,len}] }
  let matches = [];         // errores actuales
  let hits = [];            // rectángulos en pantalla para detectar el mouse
  let checkedText = '';
  let timer = null, seq = 0, busy = false, lastError = null, lastVia = '';
  let tipFor = null, overTip = false, showT = null, hideT = null;
  const ignored = new Set();

  // ================= Ajustes guardados =================
  function save(k) { try { chrome.storage.local.set({ [k]: settings[k] }); } catch (e) {} }
  try {
    chrome.storage.local.get(['lang', 'server', 'auto', 'dict', 'disabledSites'], r => { loadSettings(r); findEditor(); });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== 'local') return;
      const r = {}; for (const k in ch) r[k] = ch[k].newValue;
      const wasDisabled = siteDisabled(), autoBefore = settings.auto, langBefore = settings.lang;
      loadSettings(r);
      if (siteDisabled()) { setEditor(null); panel.classList.remove('show'); }
      else if (wasDisabled) findEditor();
      else if (settings.auto !== autoBefore || settings.lang !== langBefore) { if (settings.auto) check(true); else { matches = []; redraw(); updateFab(); } }
    });
  } catch (e) {}
  function loadSettings(r) {
    if (!r) return;
    if (r.lang) settings.lang = r.lang;
    if (typeof r.server === 'string') settings.server = r.server;
    if (typeof r.auto === 'boolean') settings.auto = r.auto;
    if (Array.isArray(r.dict)) settings.dict = r.dict;
    if (Array.isArray(r.disabledSites)) settings.disabledSites = r.disabledSites;
    $('.lang').value = settings.lang; $('.server').value = settings.server; $('.auto').checked = settings.auto;
    $('.site').checked = !siteDisabled();
    updateFab();
  }
  $('.sitename').textContent = SITE || 'esta página';
  $('.site').checked = true;
  $('.site').onchange = e => {
    const list = settings.disabledSites.filter(s => s !== SITE);
    if (!e.target.checked) list.push(SITE);
    settings.disabledSites = list; save('disabledSites');
    if (!e.target.checked) { setEditor(null); } else findEditor();
  };
  $('.lang').value = settings.lang; $('.auto').checked = settings.auto;
  $('.lang').onchange = e => { settings.lang = e.target.value; save('lang'); check(true); };
  $('.server').onchange = e => { settings.server = e.target.value.trim(); save('server'); check(true); };
  $('.auto').onchange = e => { settings.auto = e.target.checked; save('auto'); if (settings.auto) check(true); else { matches = []; redraw(); } updateFab(); };

  // ================= Localizar el cuadro de mensaje =================
  function composeRoot(el) {
    if (!el || el.nodeType !== 1 || host.contains(el) || siteDisabled()) return null;
    if (el.tagName === 'TEXTAREA') {
      if (el.readOnly || el.disabled) return null;
      if (!IS_WA && el.getAttribute('spellcheck') === 'false') return null;
      if (el.closest(CODE_EDITORS)) return null;
      return el;
    }
    if (!el.isContentEditable) return null;
    let ce = el;
    while (ce.parentElement && ce.parentElement.isContentEditable) ce = ce.parentElement;
    if (ce.closest(CODE_EDITORS)) return null;
    const label = [ce.getAttribute('aria-label'), ce.getAttribute('aria-placeholder'), ce.getAttribute('title'), ce.getAttribute('role')].join(' ');
    if (/buscar|search|pesquisar|rechercher|cerca|combobox/i.test(label)) return null;
    if (!IS_WA && ce.getAttribute('spellcheck') === 'false') return null;
    return ce;
  }
  function findEditor() {
    if (editor && document.contains(editor) && !siteDisabled()) return editor;
    const a = composeRoot(document.activeElement);
    if (a) return setEditor(a);
    if (IS_WA) {
      const f = document.querySelector('footer [contenteditable="true"]');
      const r = f && composeRoot(f);
      if (r) return setEditor(r);
    }
    return setEditor(null);
  }
  function setEditor(el) {
    if (el === editor) return el;
    editor = el; model = null; matches = []; checkedText = ''; hideTip(); redraw();
    if (el) schedule();
    return el;
  }

  // ================= Texto del cuadro y posiciones =================
  function blockOf(n, rootEl) {
    let e = n.parentElement;
    while (e && e !== rootEl) { if (e.tagName === 'P' || e.tagName === 'DIV') return e; e = e.parentElement; }
    return rootEl;
  }
  function buildModel(rootEl) {
    if (rootEl.tagName === 'TEXTAREA') return { text: rootEl.value, segs: [], ta: true };
    const segs = []; let text = '', prev = null;
    const w = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const b = blockOf(n, rootEl);
      if (prev && b !== prev) text += '\n';
      prev = b;
      if (!n.data.length) continue;
      segs.push({ node: n, start: text.length, len: n.data.length });
      text += n.data;
    }
    return { text, segs };
  }
  function locate(m, o, isStart) {
    for (const g of m.segs) {
      if (isStart ? (o >= g.start && o < g.start + g.len) : (o > g.start && o <= g.start + g.len)) return { node: g.node, off: o - g.start };
    }
    return null;
  }
  function toRange(m, o, len) {
    const s = locate(m, o, true), e = locate(m, o + len, false);
    if (!s || !e) return null;
    try { const r = document.createRange(); r.setStart(s.node, s.off); r.setEnd(e.node, e.off); return r; } catch (er) { return null; }
  }

  // ================= Dibujar subrayados =================
  function redraw() {
    linesEl.textContent = ''; hits = [];
    if (editor && document.contains(editor) && model && matches.length) {
      const box = editor.getBoundingClientRect();
      for (const { m, c } of matchRects()) {
        {
          if (c.width < 1 || c.bottom < box.top - 2 || c.top > box.bottom + 2 || c.right < box.left || c.left > box.right) continue;
          const d = document.createElement('div');
          d.className = 'ln ' + m.type;
          d.style.left = c.left + 'px'; d.style.top = (c.bottom - 2) + 'px'; d.style.width = c.width + 'px';
          linesEl.appendChild(d);
          hits.push({ m, left: c.left, right: c.right, top: c.top, bottom: c.bottom });
        }
      }
    }
    positionFab();
  }
  function matchRects() {
    if (model.ta) return textareaRects(editor, model.text, matches);
    const out = [];
    for (const m of matches) {
      const r = toRange(model, m.offset, m.length);
      if (r) for (const c of r.getClientRects()) out.push({ m, c });
    }
    return out;
  }

  // En un <textarea> no se pueden medir palabras: se crea una copia invisible con el mismo estilo
  const MIRROR_PROPS = ['boxSizing', 'width', 'height', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle', 'fontFamily', 'fontSize',
    'fontWeight', 'fontStyle', 'fontVariant', 'fontStretch', 'letterSpacing', 'wordSpacing', 'lineHeight', 'textTransform',
    'textIndent', 'tabSize', 'direction', 'textAlign'];
  let mirror = null;
  function textareaRects(el, text, list) {
    if (!mirror) { mirror = document.createElement('div'); mirror.className = 'mirror'; root.appendChild(mirror); }
    const cs = getComputedStyle(el), b = el.getBoundingClientRect(), st = mirror.style;
    st.cssText = '';
    MIRROR_PROPS.forEach(p => { st[p] = cs[p]; });
    Object.assign(st, { position: 'fixed', left: b.left + 'px', top: b.top + 'px', visibility: 'hidden', overflow: 'hidden',
      whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordWrap: 'break-word', pointerEvents: 'none', borderColor: 'transparent' });
    const sb = el.offsetWidth - el.clientWidth - parseFloat(cs.borderLeftWidth || 0) - parseFloat(cs.borderRightWidth || 0);
    if (sb > 0) st.paddingRight = (parseFloat(cs.paddingRight || 0) + sb) + 'px';
    mirror.textContent = '';
    const inner = document.createElement('div');
    inner.style.position = 'relative';
    inner.style.top = (-el.scrollTop) + 'px';
    inner.style.left = (-el.scrollLeft) + 'px';
    let pos = 0; const spans = [];
    for (const m of [...list].sort((a, b) => a.offset - b.offset)) {
      if (m.offset < pos) continue;
      inner.appendChild(document.createTextNode(text.slice(pos, m.offset)));
      const s = document.createElement('span');
      s.textContent = text.slice(m.offset, m.offset + m.length);
      inner.appendChild(s); spans.push([m, s]);
      pos = m.offset + m.length;
    }
    inner.appendChild(document.createTextNode(text.slice(pos) + '\u200b'));
    mirror.appendChild(inner);
    const out = [];
    for (const [m, s] of spans) for (const c of s.getClientRects()) out.push({ m, c });
    return out;
  }
  function setNativeValue(el, v) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  let rafPending = false;
  const requestRedraw = () => { if (rafPending) return; rafPending = true; requestAnimationFrame(() => { rafPending = false; if (model && editor) model = buildModel(editor); redraw(); }); };
  window.addEventListener('resize', requestRedraw);
  document.addEventListener('scroll', requestRedraw, true);
  setInterval(() => {
    const prev = editor; findEditor();
    host.dataset.theme = IS_WA
      ? ((document.body && document.body.classList.contains('dark')) ? 'dark' : 'light')
      : (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (editor && editor === prev && model) requestRedraw(); else positionFab();
  }, 500);

  // ================= Ícono pequeño =================
  function positionFab() {
    if (!editor || !document.contains(editor)) { fab.classList.remove('show'); return; }
    const b = editor.getBoundingClientRect();
    const focused = editor === document.activeElement || editor.contains(document.activeElement);
    if (!b.width || b.bottom < 0 || b.top > window.innerHeight ||
        (!IS_WA && !focused && !matches.length && !panel.classList.contains('show'))) { fab.classList.remove('show'); return; }
    let left, top;
    if (IS_WA) { left = b.right - 24; top = b.top - 26; }                       // encima del cuadro de WhatsApp
    else if (b.height >= 44) { left = b.right - 28; top = b.bottom - 28; }      // esquina inferior derecha
    else { left = b.right - 26; top = b.top + (b.height - 22) / 2; }            // cuadro de una línea
    fab.style.left = Math.round(left) + 'px';
    fab.style.top = Math.round(top) + 'px';
    fab.classList.add('show');
    if (panel.classList.contains('show')) positionPanel();
  }
  function errorText() {
    if (lastError === 'limite') return 'Demasiadas revisiones seguidas. Espera un minuto.';
    if (lastError === 'recargar') return 'La extensión se actualizó. Recarga esta página (F5).';
    return 'No se pudo conectar con el corrector. Revisa tu conexión o el servicio local.';
  }
  function updateFab() {
    fab.className = 'fab' + (editor ? ' show' : '');
    if (!settings.auto) { fab.classList.add('off'); fab.textContent = '✓'; fab.title = 'Corrector (automático desactivado). Clic para abrir.'; }
    else if (busy) { fab.classList.add('busy'); fab.textContent = '…'; fab.title = 'Revisando…'; }
    else if (lastError) { fab.classList.add('warn'); fab.textContent = '!'; fab.title = errorText(); }
    else if (matches.length) { fab.classList.add('err'); fab.textContent = matches.length > 99 ? '99' : matches.length; fab.title = matches.length + ' posibles errores. Clic para ver la lista.'; }
    else { fab.textContent = '✓'; fab.title = 'Sin errores'; }
    positionFab();
  }

  // ================= Revisión =================
  function schedule() {
    clearTimeout(timer);
    if (!settings.auto) return;
    timer = setTimeout(() => check(false), lastVia === 'publico' ? 1500 : DEBOUNCE_MS);  // el servicio público tiene límite por minuto
  }
  function classify(m) {
    const t = (m.rule && m.rule.issueType) || '', cat = (m.rule && m.rule.category && m.rule.category.id) || '';
    if (t === 'misspelling' || cat === 'TYPOS') return 'ort';
    if (cat === 'PUNCTUATION' || t === 'typographical' || cat === 'TYPOGRAPHY') return 'pun';
    if (t === 'style' || t === 'locale-violation' || cat === 'STYLE' || cat === 'REDUNDANCY') return 'est';
    return 'gra';
  }
  const keyOf = m => m.word.toLowerCase() + '|' + m.rule;

  // ---- Reglas propias para español (LanguageTool no detecta bien el ¿ ¡ que falta) ----
  const INTERROG = { que: 'qué', como: 'cómo', donde: 'dónde', adonde: 'adónde', cuando: 'cuándo', cuanto: 'cuánto',
    cuanta: 'cuánta', cuantos: 'cuántos', cuantas: 'cuántas', quien: 'quién', quienes: 'quiénes', cual: 'cuál', cuales: 'cuáles' };
  const QWORD = /,\s*((?:por\s+)?(?:qu[eé]|c[oó]mo|d[oó]nde|cu[aá]ndo|cu[aá]nt[oa]s?|qui[eé]n(?:es)?|cu[aá]l(?:es)?))(?![\p{L}])/giu;
  const sameCase = (orig, w) => orig[0] === orig[0].toUpperCase() && orig[0] !== orig[0].toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w;
  function localRules(text) {
    if (!(settings.lang === 'es' || settings.lang === 'auto')) return [];
    const out = [], OPEN = { '?': '¿', '!': '¡' };
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (!OPEN[ch] || (i > 0 && (text[i - 1] === '?' || text[i - 1] === '!'))) continue;
      let s = i - 1;
      while (s >= 0 && !'.?!\n'.includes(text[s])) s--;
      const segStart = s + 1, seg = text.slice(segStart, i), open = OPEN[ch];
      if (!seg.trim()) continue;
      const hasOpen = seg.includes(open);
      let qStart;
      if (hasOpen) qStart = segStart + seg.lastIndexOf(open) + 1;
      else {
        qStart = segStart + (seg.length - seg.trimStart().length);
        if (ch === '?') { let mm, last = null; QWORD.lastIndex = 0; while ((mm = QWORD.exec(seg))) last = mm; if (last) qStart = segStart + last.index + last[0].indexOf(last[1]); }
      }
      const rest = text.slice(qStart, i);
      let wm = /^por\s+que(?![\p{L}])/iu.exec(rest) || /^[\p{L}\p{N}]+/u.exec(rest);
      if (!wm) continue;
      const word = wm[0];
      let fixed = word, accent = false;
      const lw = word.toLowerCase().replace(/\s+/g, ' ');
      if (ch === '?') {
        if (lw === 'por que') { fixed = sameCase(word, 'por qué'); accent = true; }
        else if (INTERROG[lw]) { fixed = sameCase(word, INTERROG[lw]); accent = true; }
      } else if (/^(que|como|cuanto|cuanta|cuantos|cuantas)$/.test(lw)) {
        // ¡Qué bonito! lleva tilde; ¡Que te vaya bien! (deseo) no
        const next = (/^[\p{L}]+\s+([\p{L}]+)/u.exec(rest) || [])[1] || '';
        if (!/^(te|le|se|lo|la|los|las|les|nos|me|os|no|tengas|tenga|tengan|vaya|vayas|vayan|descanses|descanse|disfrutes|disfrute|est[eé]s|est[eé]|sea|seas|sean|dios|viva|vivan)$/i.test(next)) {
          fixed = sameCase(word, INTERROG[lw]); accent = true;
        }
      }
      const atSentenceStart = !text.slice(segStart, qStart).replace(open, '').trim();
      if (!hasOpen) {
        if (atSentenceStart) fixed = fixed[0].toUpperCase() + fixed.slice(1);
        out.push({ id: 'loc' + i, offset: qStart, length: word.length, word, type: 'pun', rule: 'LOCAL_OPEN_' + (ch === '?' ? 'Q' : 'E'),
          message: `En español las ${ch === '?' ? 'preguntas' : 'exclamaciones'} se abren con «${open}».` + (accent ? ` Además, «${fixed}» lleva tilde.` : ''),
          reps: [open + fixed] });
      } else if (accent && fixed !== word) {
        if (atSentenceStart) fixed = fixed[0].toUpperCase() + fixed.slice(1);
        out.push({ id: 'loc' + i, offset: qStart, length: word.length, word, type: 'ort', rule: 'LOCAL_ACCENT',
          message: `En ${ch === '?' ? 'preguntas' : 'exclamaciones'}, «${fixed}» lleva tilde.`, reps: [fixed] });
      }
    }
    return out;
  }

  function check(force) {
    if (!findEditor()) return;
    const m = buildModel(editor);
    model = m;
    if (!m.text.trim()) { matches = []; checkedText = ''; lastError = null; redraw(); updateFab(); renderPanel(); return; }
    if (!force && m.text === checkedText) return;
    if (m.text.length > 18000) return;
    if (!(chrome.runtime && chrome.runtime.id)) { lastError = 'recargar'; updateFab(); renderPanel(); return; }
    const my = ++seq; busy = true; updateFab();
    try {
      chrome.runtime.sendMessage({ type: 'check', text: m.text, language: settings.lang, server: settings.server }, res => {
        if (my !== seq) return;
        busy = false;
        if (chrome.runtime.lastError || !res || res.error) {
          lastError = res && res.error === 'limite' ? 'limite' : 'conexion';
          updateFab(); renderPanel(); return;
        }
        lastError = null; lastVia = res.via || '';
        const cur = editor ? buildModel(editor) : null;
        if (!cur || cur.text !== m.text) { updateFab(); schedule(); return; }  // cambió mientras revisaba
        model = cur; checkedText = cur.text;
        const dict = new Set(settings.dict.map(w => w.toLowerCase()));
        const extra = localRules(cur.text);
        const overlaps = x => extra.some(e => x.offset < e.offset + e.length && e.offset < x.offset + x.length);
        matches = res.matches.filter(x => x.length > 0 && !overlaps(x)).map((x, i) => ({
          id: my + '_' + i, offset: x.offset, length: x.length,
          word: cur.text.substr(x.offset, x.length), message: x.message || '',
          reps: (x.replacements || []).slice(0, 5).map(r => r.value),
          type: classify(x), rule: (x.rule && x.rule.id) || ''
        })).concat(extra).sort((a, b) => a.offset - b.offset)
          .filter(x => !(x.type === 'ort' && dict.has(x.word.toLowerCase())) && !ignored.has(keyOf(x)));
        redraw(); updateFab(); renderPanel();
      });
    } catch (e) {
      busy = false; lastError = 'recargar'; updateFab(); renderPanel();  // la extensión se actualizó: hay que recargar la página
    }
  }

  // Al escribir: mover los subrayados que siguen siendo válidos y programar otra revisión
  document.addEventListener('input', e => {
    const ce = composeRoot(e.target);
    if (!ce) return;
    if (ce !== editor) setEditor(ce);
    hideTip();
    const old = model ? model.text : '';
    const nm = buildModel(editor);
    const nw = nm.text;
    let p = 0; while (p < old.length && p < nw.length && old[p] === nw[p]) p++;
    let so = old.length, sn = nw.length; while (so > p && sn > p && old[so - 1] === nw[sn - 1]) { so--; sn--; }
    const delta = nw.length - old.length;
    matches = matches
      .filter(m => m.offset + m.length < p || m.offset > so)
      .map(m => m.offset > so ? { ...m, offset: m.offset + delta } : m)
      .filter(m => nw.substr(m.offset, m.length) === m.word);
    model = nm;
    redraw(); updateFab();
    schedule();
  }, true);

  document.addEventListener('focusin', e => { const ce = composeRoot(e.target); if (ce && ce !== editor) setEditor(ce); }, true);

  // ================= Reemplazar una palabra =================
  async function replaceMatch(m, rep) {
    hideTip();
    if (!editor) return;
    const cur = buildModel(editor);
    if (cur.text.substr(m.offset, m.length) !== m.word) { check(true); return; }
    const expected = cur.text.slice(0, m.offset) + rep + cur.text.slice(m.offset + m.length);
    matches = matches.filter(x => x.id !== m.id);
    if (cur.ta) {
      editor.focus();
      editor.setSelectionRange(m.offset, m.offset + m.length);
      document.execCommand('insertText', false, rep);
      if (editor.value !== expected) setNativeValue(editor, expected);
      renderPanel(); return;
    }
    const r = toRange(cur, m.offset, m.length);
    editor.focus();
    if (r) {
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(r);
      document.dispatchEvent(new Event('selectionchange'));
      await sleep(40);
      document.execCommand('insertText', false, rep);
      await sleep(40);
    }
    if (buildModel(editor).text !== expected) {      // plan B: reescribir todo el mensaje
      editor.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, expected);
      await sleep(40);
    }
    renderPanel();
  }

  async function applyAll() {
    if (!editor) return;
    const cur = buildModel(editor);
    let t = cur.text;
    const todo = matches.filter(m => m.reps.length && t.substr(m.offset, m.length) === m.word).sort((a, b) => b.offset - a.offset);
    if (!todo.length) return;
    let lastStart = Infinity;
    for (const m of todo) { if (m.offset + m.length > lastStart) continue; t = t.slice(0, m.offset) + m.reps[0] + t.slice(m.offset + m.length); lastStart = m.offset; }
    matches = [];
    editor.focus();
    if (cur.ta) {
      editor.setSelectionRange(0, editor.value.length);
      document.execCommand('insertText', false, t);
      if (editor.value !== t) setNativeValue(editor, t);
    } else {
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, t);
      await sleep(40);
    }
    renderPanel();
  }

  // ================= Recuadro de sugerencias =================
  function hitTest(x, y) { return hits.find(h => x >= h.left - 1 && x <= h.right + 1 && y >= h.top - 1 && y <= h.bottom + 3); }

  function showTip(m, rect) {
    clearTimeout(hideT);
    tipFor = m;
    tipBar.style.background = COLORS[m.type];
    tipIn.innerHTML = `<div class="tag">${LABEL[m.type]}</div><div class="msg">${esc(m.message)}</div><div class="sugs"></div><div class="acts"></div>`;
    const sg = tipIn.querySelector('.sugs'), acts = tipIn.querySelector('.acts');
    if (!m.reps.length) sg.innerHTML = '<span class="lnk" style="cursor:default">Sin sugerencias</span>';
    m.reps.forEach(r => {
      const b = document.createElement('button');
      b.className = 'sug'; b.textContent = r === '' ? '(eliminar)' : r;
      b.addEventListener('mousedown', e => e.preventDefault());
      b.onclick = () => replaceMatch(m, r);
      sg.appendChild(b);
    });
    const ig = document.createElement('button');
    ig.className = 'lnk'; ig.textContent = 'Ignorar';
    ig.addEventListener('mousedown', e => e.preventDefault());
    ig.onclick = () => { ignored.add(keyOf(m)); matches = matches.filter(x => x.id !== m.id); hideTip(); redraw(); updateFab(); renderPanel(); };
    acts.appendChild(ig);
    if (m.type === 'ort') {
      const ad = document.createElement('button');
      ad.className = 'lnk'; ad.textContent = 'Añadir al diccionario';
      ad.addEventListener('mousedown', e => e.preventDefault());
      ad.onclick = () => {
        const w = m.word.toLowerCase();
        if (!settings.dict.includes(w)) { settings.dict.push(w); save('dict'); }
        matches = matches.filter(x => !(x.type === 'ort' && x.word.toLowerCase() === w));
        hideTip(); redraw(); updateFab(); renderPanel();
      };
      acts.appendChild(ad);
    }
    tip.classList.add('show');
    const h = tip.offsetHeight, w = tip.offsetWidth;
    let left = Math.min(Math.max(8, rect.left), window.innerWidth - w - 8);
    let top = rect.top - h - 8;                       // el cuadro de WhatsApp está abajo: preferir arriba
    if (top < 8) top = rect.bottom + 8;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hideTip() { clearTimeout(showT); clearTimeout(hideT); tip.classList.remove('show'); tipFor = null; overTip = false; }
  function scheduleHide() { clearTimeout(hideT); hideT = setTimeout(() => { if (!overTip) hideTip(); }, 350); }
  tip.addEventListener('mouseenter', () => { overTip = true; clearTimeout(hideT); });
  tip.addEventListener('mouseleave', () => { overTip = false; scheduleHide(); });

  document.addEventListener('mousemove', e => {
    if (!hits.length) return;
    const h = hitTest(e.clientX, e.clientY);
    if (h) {
      clearTimeout(hideT);
      if (!tipFor || tipFor.id !== h.m.id) { clearTimeout(showT); showT = setTimeout(() => showTip(h.m, h), 300); }
    } else {
      clearTimeout(showT);
      if (tipFor && !overTip) scheduleHide();
    }
  }, true);
  document.addEventListener('click', e => {
    const h = hitTest(e.clientX, e.clientY);
    if (h) { clearTimeout(showT); showTip(h.m, h); }
    else if (tipFor && !host.contains(e.target)) hideTip();
  }, true);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { hideTip(); panel.classList.remove('show'); }
    if (e.altKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); togglePanel(); }
  }, true);

  // ================= Panel con la lista =================
  function positionPanel() {
    const fl = parseFloat(fab.style.left) || window.innerWidth - 40, ft = parseFloat(fab.style.top) || window.innerHeight - 100;
    panel.style.left = Math.max(8, Math.min(fl + 22 - 340, window.innerWidth - 348)) + 'px';
    panel.style.bottom = Math.max(8, window.innerHeight - ft + 8) + 'px';
  }
  function togglePanel() {
    if (panel.classList.contains('show')) { panel.classList.remove('show'); return; }
    findEditor(); positionPanel(); panel.classList.add('show'); hideTip();
    if (!settings.auto || !checkedText) check(true);
    renderPanel();
  }
  function renderPanel() {
    if (!panel.classList.contains('show')) return;
    const via = { local: 'Revisando en tu PC (servicio local) ✔', publico: 'Revisando con el servicio público de LanguageTool', propio: 'Revisando con tu servidor' }[lastVia] || '';
    $('.via').textContent = via;
    $('.all').disabled = !matches.some(m => m.reps.length);
    if (siteDisabled()) { list.innerHTML = '<div class="note">El corrector está desactivado en este sitio.</div>'; return; }
    if (!editor) { list.innerHTML = '<div class="note">Haz clic en un cuadro de texto y escribe.</div>'; return; }
    if (busy) { list.innerHTML = '<div class="note">Revisando…</div>'; return; }
    if (lastError) { list.innerHTML = `<div class="note">${errorText()}</div>`; return; }
    if (!matches.length) { list.innerHTML = '<div class="note">🎉 No hay errores en el texto.</div>'; return; }
    list.innerHTML = '';
    [...matches].sort((a, b) => a.offset - b.offset).forEach(m => {
      const d = document.createElement('div');
      d.className = 'item ' + m.type;
      d.innerHTML = `<div class="tag" style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">${LABEL[m.type]}</div>
        <div class="w"><s>${esc(m.word)}</s></div><div class="m">${esc(m.message)}</div><div class="sugs"></div>`;
      const sg = d.querySelector('.sugs');
      m.reps.slice(0, 4).forEach(r => {
        const b = document.createElement('button');
        b.className = 'sug'; b.textContent = r === '' ? '(eliminar)' : r;
        b.addEventListener('mousedown', e => e.preventDefault());
        b.onclick = () => replaceMatch(m, r);
        sg.appendChild(b);
      });
      const ig = document.createElement('button');
      ig.className = 'lnk'; ig.textContent = 'Ignorar'; ig.style.marginLeft = 'auto';
      ig.onclick = () => { ignored.add(keyOf(m)); matches = matches.filter(x => x.id !== m.id); redraw(); updateFab(); renderPanel(); };
      sg.appendChild(ig);
      list.appendChild(d);
    });
  }
  fab.addEventListener('mousedown', e => e.preventDefault());
  fab.onclick = togglePanel;
  $('.x').onclick = () => panel.classList.remove('show');
  $('.recheck').onclick = () => check(true);
  $('.all').addEventListener('mousedown', e => e.preventDefault());
  $('.all').onclick = applyAll;

  findEditor();
})();
