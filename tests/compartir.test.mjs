import assert from 'node:assert/strict';
import { nuevaPagina } from './lib.mjs';

// Lote de prueba con dos reportes
const cargarLote = page => page.evaluate(() => {
  loteEmpadronamientos = [{ id: 1, numEmp: '01', nombre: 'Ana', texto: '*#01 FUERZA CIVIL*\n*Nombre:* Ana' }, { id: 2, numEmp: '02', nombre: 'Luis', texto: '*#02 FUERZA CIVIL*\n*Nombre:* Luis' }];
  saveLote(); actualizarBarraLote();
});

export const pruebas = {
  async 'enviar por WhatsApp usa el menú de compartir'({ url, browser }) {
    const { ctx, page } = await nuevaPagina(browser, url);
    await page.evaluate(() => { window.__compartido = []; navigator.share = async d => { window.__compartido.push(d.text); }; });
    await page.evaluate(() => { document.getElementById('output-text').value = '*Hola*'; document.getElementById('output-box').style.display = 'block'; });
    await page.getByRole('button', { name: '📤 WhatsApp' }).click();
    await cargarLote(page);
    await page.getByRole('button', { name: 'Ver lote' }).click();
    await page.getByRole('button', { name: '📤 Enviar por WhatsApp' }).click();
    const enviados = await page.evaluate(() => window.__compartido);
    assert.equal(enviados[0], '*Hola*');
    assert.match(enviados[1], /#01 FUERZA CIVIL[\s\S]*━━━[\s\S]*#02 FUERZA CIVIL/);
    await ctx.close();
  },
  async 'sin menú de compartir abre WhatsApp con el texto'({ url, browser }) {
    const { ctx, page } = await nuevaPagina(browser, url);
    await page.evaluate(() => { delete Navigator.prototype.share; window.__abierto = null; window.open = u => { window.__abierto = u; }; });
    await page.evaluate(() => { document.getElementById('output-text').value = '*Hola* mundo'; document.getElementById('output-box').style.display = 'block'; });
    await page.getByRole('button', { name: '📤 WhatsApp' }).click();
    assert.equal(await page.evaluate(() => window.__abierto), 'https://wa.me/?text=' + encodeURIComponent('*Hola* mundo'));
    await ctx.close();
  },
  async 'lote en PDF'({ url, browser }) {
    const { ctx, page } = await nuevaPagina(browser, url);
    await page.evaluate(() => { window.__impreso = null; window.print = () => { window.__impreso = document.getElementById('impresion').innerHTML; }; });
    await cargarLote(page);
    await page.getByRole('button', { name: 'Ver lote' }).click();
    await page.getByRole('button', { name: '🖨 PDF' }).click();
    await page.waitForFunction(() => window.__impreso);
    const html = await page.evaluate(() => window.__impreso);
    assert.match(html, /Lote de empadronamientos/);
    assert.equal((html.match(/class="imp-item"/g) || []).length, 2);
    assert.match(html, /<b>#01 FUERZA CIVIL<\/b>/);
    // Al imprimir solo se ve la hoja
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('.container').isVisible(), false);
    assert.equal(await page.locator('#impresion').isVisible(), true);
    await ctx.close();
  },
  async 'dictado por voz agrega el texto sin borrar las frases'({ url, browser }) {
    // Reconocimiento de voz simulado: "escucha" lo que diga window.__voz
    const { ctx, page } = await nuevaPagina(browser, url, {
      antes: () => {
        window.__voz = 'lleva gorra roja';
        window.SpeechRecognition = window.webkitSpeechRecognition = class { start() { setTimeout(() => { this.onresult({ results: [[{ transcript: window.__voz }]] }); this.onend(); }, 50); } stop() { this.onend(); } };
      },
    });
    await page.getByRole('button', { name: '🚫 Identificarse' }).click();
    await page.locator('#dictar-adicionales').click();
    await page.waitForFunction(() => /gorra/.test(document.getElementById('adicionales').value));
    assert.equal(await page.locator('#adicionales').inputValue(), 'Lleva gorra roja. Se niega a identificarse.');
    await page.evaluate(() => { window.__voz = 'tatuaje de rosa en el brazo'; });
    await page.locator('#dictar-tatuajes_desc').click();
    await page.waitForFunction(() => document.getElementById('tatuajes_desc').value);
    assert.equal(await page.locator('#tatuajes_desc').inputValue(), 'Tatuaje de rosa en el brazo.');
    await ctx.close();
  },
};
