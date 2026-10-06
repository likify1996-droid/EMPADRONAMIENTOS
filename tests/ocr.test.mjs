import assert from 'node:assert/strict';
import { nuevaPagina, respuestaOcr, IMAGEN } from './lib.mjs';

const INE = { tipo: 'ine', nombre: 'PEREZ LOPEZ ANA' };

// Escanea una imagen desde "Galería" y devuelve cómo quedó la pantalla
async function escanear(page) {
  await page.locator('#nombre').fill('');
  await page.evaluate(() => { document.getElementById('scan-status').textContent = ''; });
  await page.setInputFiles('#gallery-input', IMAGEN);
  await page.waitForFunction(() => /Listo|No se pudo|guardad|Sin señal/.test(document.getElementById('scan-status').textContent));
  return { nombre: await page.locator('#nombre').inputValue(), status: await page.locator('#scan-status').innerText() };
}

// Worker simulado: exige o no la clave de acceso, o tiene mala la key de Groq
function worker({ exige = false, groqMala = false } = {}) {
  const w = { llamadas: 0 };
  w.ocr = req => {
    w.llamadas++;
    if (groqMala) return { status: 502, body: { error: { message: 'Invalid API Key: revisa el secreto GROQ_API_KEY del Worker' } } };
    if (exige && req.headers()['x-fc-token'] !== 'secreto') return { status: 401, body: { error: { message: 'Clave de acceso inválida' } } };
    return respuestaOcr(INE);
  };
  return w;
}
function respondePrompt(respuestas) {
  return (d, avisos) => { if (d.type() === 'prompt') return d.accept(respuestas[avisos.prompts++] ?? ''); d.dismiss(); };
}

export const pruebas = {
  async 'sin clave en el Worker no la pide nunca'({ url, browser }) {
    const w = worker();
    const { ctx, page, avisos } = await nuevaPagina(browser, url, { ocr: w.ocr, dialogos: respondePrompt([]) });
    assert.equal((await escanear(page)).nombre, 'Perez Lopez Ana');
    assert.equal((await escanear(page)).nombre, 'Perez Lopez Ana');
    assert.equal(avisos.prompts, 0);
    await ctx.close();
  },
  async 'con clave en el Worker la pide una sola vez'({ url, browser }) {
    const w = worker({ exige: true });
    const { ctx, page, avisos } = await nuevaPagina(browser, url, { ocr: w.ocr, dialogos: respondePrompt(['secreto']) });
    assert.equal((await escanear(page)).nombre, 'Perez Lopez Ana');
    assert.equal((await escanear(page)).nombre, 'Perez Lopez Ana');
    assert.equal(avisos.prompts, 1);
    await ctx.close();
  },
  async 'clave incorrecta: la pide una vez y no prueba otros modelos'({ url, browser }) {
    const w = worker({ exige: true });
    const { ctx, page, avisos } = await nuevaPagina(browser, url, { ocr: w.ocr, dialogos: respondePrompt(['mala']) });
    assert.match((await escanear(page)).status, /clave de acceso para OCR o no es correcta/);
    assert.equal(avisos.prompts, 1);
    assert.equal(w.llamadas, 2);
    await ctx.close();
  },
  async 'API key de Groq mala: no pide clave y lo explica'({ url, browser }) {
    const w = worker({ groqMala: true });
    const { ctx, page, avisos } = await nuevaPagina(browser, url, { ocr: w.ocr, dialogos: respondePrompt([]) });
    assert.match((await escanear(page)).status, /GROQ_API_KEY/);
    assert.equal(avisos.prompts, 0);
    assert.equal(w.llamadas, 1);
    await ctx.close();
  },
  async 'sin señal la foto se guarda y se lee después'({ url, browser }) {
    const w = worker();
    const { ctx, page, errores } = await nuevaPagina(browser, url, { ocr: w.ocr });
    await ctx.setOffline(true);
    assert.match((await escanear(page)).status, /guardad/);
    assert.equal(await page.locator('#ocr-pendientes').isVisible(), true);
    const kb = await page.evaluate(() => JSON.parse(localStorage.getItem('fc_ocr_pendientes_v1'))[0].b64.length * 3 / 4 / 1024);
    assert.ok(kb < 200, `la foto pesa ${kb} KB`);
    await ctx.setOffline(false);
    await page.reload();
    await page.waitForFunction(() => typeof tabsReady !== 'undefined' && tabsReady);
    assert.equal(await page.locator('#ocr-pendientes').isVisible(), true, 'sigue tras recargar');
    await page.getByRole('button', { name: '▶ Leer ahora' }).click();
    await page.waitForFunction(() => document.getElementById('nombre').value);
    assert.equal(await page.locator('#nombre').inputValue(), 'Perez Lopez Ana');
    assert.equal(await page.locator('#ocr-pendientes').isVisible(), false);
    assert.deepEqual(errores, []);
    await ctx.close();
  },
  async 'terminar turno borra todo menos los datos del policía'({ url, browser }) {
    const w = worker();
    const { ctx, page } = await nuevaPagina(browser, url, { ocr: w.ocr });
    await page.evaluate(() => { loteEmpadronamientos = [{ id: 1, numEmp: '01', nombre: 'Ana', texto: 'x' }]; saveLote(); actualizarBarraLote(); });
    await ctx.setOffline(true);
    await escanear(page);
    await ctx.setOffline(false);
    await page.locator('#zona').fill('D1 C7');
    await page.locator('#nombre').fill('Alguien');
    await page.getByRole('button', { name: '🔒 Terminar turno' }).click();
    const r = await page.evaluate(() => ({ nombre: v('nombre'), zona: v('zona'), lote: localStorage.getItem('fc_lote_v1'), cola: localStorage.getItem('fc_ocr_pendientes_v1'), tabs: tabs.length }));
    assert.deepEqual(r, { nombre: '', zona: 'D1 C7', lote: null, cola: null, tabs: 1 });
    await ctx.close();
  },
  async 'cámara: el marco recorta la credencial'({ url, browser }) {
    let enviada = null;
    const { ctx, page, errores } = await nuevaPagina(browser, url, { ocr: req => { enviada = JSON.parse(req.postData()).messages[0].content[1].image_url.url; return respuestaOcr(INE); } });
    await page.evaluate(() => { savePhotoToDevice = () => {}; }); // sin descargas en la prueba
    await page.getByRole('button', { name: '📸 Cámara' }).click();
    await page.waitForFunction(() => document.getElementById('ocr-video').videoWidth > 0);
    await page.waitForTimeout(300);
    const marco = await page.locator('#ocr-marco').boundingBox();
    assert.ok(marco && Math.abs(marco.width / marco.height - 85.6 / 54) < 0.02, 'el marco tiene forma de credencial');
    await page.getByRole('button', { name: '📸 Capturar' }).click();
    await page.waitForFunction(() => /Listo/.test(document.getElementById('scan-status').textContent));
    const dims = await page.evaluate(src => new Promise(r => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = src; }), enviada);
    const prop = dims[0] / dims[1];
    assert.ok(prop > 1.4 && prop < 1.75, `la foto enviada es solo el marco (${dims.join('x')})`);
    assert.equal(await page.locator('#nombre').inputValue(), 'Perez Lopez Ana');
    // Con el marco apagado se envía la foto completa
    await page.getByRole('button', { name: '🔄 Releer' }).click();
    await page.waitForFunction(() => document.getElementById('ocr-video').videoWidth > 0);
    await page.locator('#marco-btn').click();
    assert.equal(await page.locator('#ocr-marco').isVisible(), false);
    await page.evaluate(() => { document.getElementById('scan-status').textContent = ''; });
    await page.getByRole('button', { name: '📸 Capturar' }).click();
    await page.waitForFunction(() => /Listo/.test(document.getElementById('scan-status').textContent));
    const completa = await page.evaluate(src => new Promise(r => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = src; }), enviada);
    const v = await page.evaluate(() => [document.getElementById('ocr-video').videoWidth, document.getElementById('ocr-video').videoHeight]);
    assert.ok(Math.abs(completa[0] / completa[1] - v[0] / v[1]) < 0.01, `foto completa ${completa.join('x')} vs video ${v.join('x')}`);
    assert.deepEqual(errores, []);
    await ctx.close();
  },
};
