import assert from 'node:assert/strict';
import { nuevaPagina } from './lib.mjs';

export const pruebas = {
  async 'Nominatim: máximo 1 consulta por segundo'({ url, browser }) {
    const tiempos = [];
    let n = 0;
    const { ctx, page } = await nuevaPagina(browser, url, {
      nominatim: () => { tiempos.push(Date.now()); n++; return { address: { road: n <= 2 ? 'Av. Constitución' : 'Calle Zaragoza', postcode: '64000', city: 'Monterrey', suburb: 'Centro' }, display_name: 'x' }; },
    });
    await page.evaluate(() => fetchAddress(25.67, -100.31, 10, 'geo-status'));
    assert.equal(tiempos.length, 3);
    tiempos.slice(1).forEach((t, i) => assert.ok(t - tiempos[i] >= 1050, `solo ${t - tiempos[i]} ms entre consultas`));
    assert.equal(await page.locator('#addr_calle').inputValue(), 'Av. Constitución');
    assert.equal(await page.locator('#addr_cruce').inputValue(), 'Calle Zaragoza');
    tiempos.length = 0;
    await page.locator('#lugar_busq').pressSequentially('calle zaragoza centro', { delay: 120 });
    await page.waitForTimeout(2500);
    assert.equal(tiempos.length, 1, 'al escribir rápido solo sale la última búsqueda');
    await ctx.close();
  },
};
