const $ = id => document.getElementById(id);
let site = '';

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  try { site = new URL(tabs[0].url).hostname; } catch (e) { site = ''; }
  $('sitename').textContent = site || 'Esta página no admite el corrector';
  if (!site) $('site').disabled = true;
  chrome.storage.local.get(['disabledSites', 'auto', 'lang'], r => {
    const list = r.disabledSites || [];
    $('site').checked = site && !list.includes(site);
    $('auto').checked = r.auto !== false;
    $('lang').value = r.lang || 'es';
  });
});

$('site').onchange = () => chrome.storage.local.get('disabledSites', r => {
  let list = (r.disabledSites || []).filter(s => s !== site);
  if (!$('site').checked) list.push(site);
  chrome.storage.local.set({ disabledSites: list });
});
$('auto').onchange = () => chrome.storage.local.set({ auto: $('auto').checked });
$('lang').onchange = () => chrome.storage.local.set({ lang: $('lang').value });

const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 1500);
fetch('http://localhost:8010/v2/languages', { signal: ctrl.signal })
  .then(r => { if (!r.ok) throw 0; $('status').innerHTML = '<span class="ok">● Servicio local activo</span> — sin límites, el texto no sale de tu PC.'; })
  .catch(() => { $('status').innerHTML = '<span class="warn">● Usando el servicio público</span> — tu texto se envía a LanguageTool y hay un límite de unas 20 revisiones por minuto. Instala el servicio local para evitarlo.'; });
