// Revisa el texto con LanguageTool.
// Orden: 1) el servidor que el usuario escribió en el panel, 2) el servicio local de Windows
// (http://localhost:8010) si está encendido, 3) el servicio público gratuito.
const LOCAL = 'http://localhost:8010';
const PUBLIC = 'https://api.languagetool.org';
let localOk = null, localCheckedAt = 0;

async function localAvailable() {
  if (localOk !== null && Date.now() - localCheckedAt < 60000) return localOk;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(LOCAL + '/v2/languages', { signal: ctrl.signal });
    clearTimeout(t);
    localOk = r.ok;
  } catch (e) { localOk = false; }
  localCheckedAt = Date.now();
  return localOk;
}

async function check(msg) {
  let base = (msg.server || '').trim();
  if (!base) base = (await localAvailable()) ? LOCAL : PUBLIC;
  base = base.replace(/\/+$/, '').replace(/\/v2(\/check)?$/, '');
  const body = new URLSearchParams({ text: msg.text, language: msg.language || 'es' });
  if (msg.language === 'auto') body.set('preferredVariants', 'en-US,pt-BR,de-DE');
  const r = await fetch(base + '/v2/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (r.status === 429) throw new Error('limite');
  if (!r.ok) throw new Error('http ' + r.status);
  const j = await r.json();
  return { matches: j.matches || [], via: base === LOCAL ? 'local' : (base === PUBLIC ? 'publico' : 'propio') };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'check') return;
  check(msg).then(sendResponse).catch(e => { localOk = null; sendResponse({ error: e.message }); });
  return true;
});
