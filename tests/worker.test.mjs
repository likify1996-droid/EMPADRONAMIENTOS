import assert from 'node:assert/strict';

const O = 'https://likify1996-droid.github.io';
const req = (h = {}, body = { model: 'qwen/qwen3.6-27b' }) => new Request('https://x/', { method: 'POST', headers: { Origin: O, 'Content-Type': 'application/json', ...h }, body: JSON.stringify(body) });

// Prueba el código del Worker (worker/fc-ocr.js) con Groq simulado
export const pruebas = {
  async 'Worker de OCR'() {
    const w = (await import('../worker/fc-ocr.js')).default;
    const fetchReal = globalThis.fetch;
    let groq = 200;
    globalThis.fetch = async (u, o) => new Response(JSON.stringify({ auth: o.headers.Authorization }), { status: groq });
    try {
      assert.equal((await w.fetch(req(), { GROQ_API_KEY: 'k' })).status, 200);
      assert.equal((await w.fetch(req(), { GROQ_API_KEY: 'k', ACCESS_TOKEN: 's' })).status, 401);
      assert.equal((await w.fetch(req({ 'X-FC-Token': 's' }), { GROQ_API_KEY: 'k', ACCESS_TOKEN: 's' })).status, 200);
      assert.equal((await w.fetch(req(), {})).status, 500);
      assert.equal((await w.fetch(req({}, { model: 'otro' }), { GROQ_API_KEY: 'k' })).status, 400);
      assert.equal((await w.fetch(new Request('https://x/', { method: 'POST', headers: { Origin: 'https://otro.com' } }), {})).status, 403);
      groq = 401;
      const r = await w.fetch(req(), { GROQ_API_KEY: 'mala' });
      assert.equal(r.status, 502);
      assert.match(await r.text(), /GROQ_API_KEY/);
    } finally { globalThis.fetch = fetchReal; }
  },
};
