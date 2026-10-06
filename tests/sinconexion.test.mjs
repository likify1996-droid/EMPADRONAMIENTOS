import assert from 'node:assert/strict';
import { nuevaPagina } from './lib.mjs';

export const pruebas = {
  async 'la app abre sin conexión (service worker)'({ url, browser }) {
    const { ctx, page, errores } = await nuevaPagina(browser, url, { sw: true });
    await page.waitForFunction(() => navigator.serviceWorker.controller || new Promise(r => navigator.serviceWorker.addEventListener('controllerchange', r)));
    await page.waitForTimeout(1500); // que termine de guardar los archivos
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => typeof tabsReady !== 'undefined' && tabsReady);
    const r = await page.evaluate(() => ({ tipos: document.querySelectorAll('#tipo_vehiculo_dropdown .sv-item').length, marcas: MARCAS.length, version: document.getElementById('app-version').textContent }));
    assert.equal(r.tipos, 18);
    assert.ok(r.marcas > 100);
    assert.match(r.version, /^Versión \d+/);
    assert.deepEqual(errores, []);
    await ctx.close();
  },
};
