import assert from 'node:assert/strict';
import { nuevaPagina, escribir } from './lib.mjs';

// Llena un empadronamiento completo como lo haría un policía
async function llenarCompleto(page) {
  await escribir(page, 'num_emp', '007');
  await escribir(page, 'zona', 'D1 C7');
  await escribir(page, 'ne', '840951');
  await escribir(page, 'nombre_pol', 'Pol. 3 Perez Juan');
  await page.selectOption('#categoria', 'Transporte');
  await page.selectOption('#subcategoria', 'Taxi pirata');
  await escribir(page, 'addr_calle', 'Puerto de Alvarado');
  await escribir(page, 'addr_cruce', 'Puerto Marques');
  await escribir(page, 'addr_colonia', 'Las Brisas');
  await escribir(page, 'addr_cp', '64790');
  await escribir(page, 'addr_municipio', 'Monterrey');
  await page.selectOption('#motivo_sel', 'Prevención del delito');
  await escribir(page, 'nombre', 'Lopez Garcia Pedro');
  const curp = await page.evaluate(() => { const b = 'LOGP900115HNLPRD0'; const dic = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'; let s = 0; for (let i = 0; i < 17; i++) s += dic.indexOf(b[i]) * (18 - i); return b + ((10 - (s % 10)) % 10); });
  await escribir(page, 'curp', curp);
  await escribir(page, 'domicilio', 'Calle 1 Centro');
  await escribir(page, 'oficio', 'Taxista');
  await page.getByRole('button', { name: '📞 Teléfono' }).click();
  await page.getByRole('button', { name: '🚫 Identificarse' }).click();
  await page.getByRole('button', { name: '❌ No' }).click();
  await escribir(page, 'tatuajes_cant', '2');
  await escribir(page, 'tatuajes_area', 'Brazo');
  await page.locator('#tipo_vehiculo_search').click();
  await page.locator('#tipo_vehiculo_dropdown').getByText('Pick up', { exact: true }).click();
  await escribir(page, 'marca', 'Niss');
  await page.locator('#ac_marca .ac-item', { hasText: 'Nissan' }).first().dispatchEvent('mousedown');
  await escribir(page, 'submarca', 'NP3');
  await page.locator('#ac_submarca .ac-item').first().dispatchEvent('mousedown');
  await escribir(page, 'placas', 'abc123');
  await page.getByRole('button', { name: '🪟 Vidrios polarizados' }).click();
}

export const pruebas = {
  async 'genera el reporte completo'({ url, browser }) {
    const { ctx, page, errores } = await nuevaPagina(browser, url);
    await llenarCompleto(page);
    assert.equal(await page.locator('#edad').inputValue(), String(new Date().getFullYear() - 1990 - (new Date() < new Date(new Date().getFullYear(), 0, 15) ? 1 : 0)));
    assert.equal(await page.locator('#estado_origen').inputValue(), 'Nuevo León');
    assert.match(await page.locator('#btn-generar').getAttribute('class'), /ready/);
    await page.locator('#btn-generar').click();
    const r = await page.locator('#output-text').inputValue();
    for (const linea of ['*#007 FUERZA CIVIL*', '*SUBCATEGORIA:* Taxi pirata', 'Puerto de Alvarado cruce con Puerto Marques, Las Brisas, 64790 Monterrey, N.L.',
      '*Motivo del empadronamiento:* Prevención del delito', '*Nombre completo:* Lopez Garcia Pedro', '*Fecha de Nacimiento:* 15/01/1990',
      'Se niega a proporcionar su número telefónico y a identificarse.', 'Se niega a tomarse fotografías de perfil.',
      '*Tipo de vehículo:* Pick up', '*Marca:* Nissan', '*Sub marca:* NP300', '*Placas:* ABC123', 'El vehículo presenta vidrios polarizados.'])
      assert.ok(r.includes(linea), 'Falta en el reporte: ' + linea);
    assert.deepEqual(errores, []);
    await ctx.close();
  },

  async 'pestañas heredan lugar y conservan cada formulario'({ url, browser }) {
    const { ctx, page } = await nuevaPagina(browser, url);
    await llenarCompleto(page);
    await page.locator('#tab-add-btn').click();
    assert.equal(await page.locator('.tab-btn').count(), 2);
    assert.equal(await page.locator('#zona').inputValue(), 'D1 C7');
    assert.equal(await page.locator('#num_emp').inputValue(), '008');
    assert.equal(await page.locator('#motivo').inputValue(), 'Prevención del delito');
    assert.equal(await page.locator('#nombre').inputValue(), '');
    await page.locator('.tab-btn').first().click();
    assert.equal(await page.locator('#nombre').inputValue(), 'Lopez Garcia Pedro');
    assert.deepEqual(await page.locator('.neg-active').allTextContents(), ['📞 Teléfono', '🚫 Identificarse', '🪟 Vidrios polarizados']);
    await ctx.close();
  },

  async 'lote: agregar, ver y cerrar tocando el fondo'({ url, browser }) {
    const { ctx, page } = await nuevaPagina(browser, url);
    await llenarCompleto(page);
    await page.locator('#btn-agregar-lote').click();
    assert.equal(await page.locator('#lote-count').textContent(), '1');
    assert.equal(await page.locator('#nombre').inputValue(), '');
    assert.equal(await page.locator('#zona').inputValue(), 'D1 C7');
    await page.getByRole('button', { name: 'Ver lote' }).click();
    assert.match(await page.locator('#lote-lista').innerText(), /#007 — Lopez Garcia Pedro/);
    await page.mouse.click(5, 5);
    assert.equal(await page.locator('#lote-modal').isVisible(), false);
    await ctx.close();
  },

  async 'limpiar una sección no toca las demás'({ url, browser }) {
    const { ctx, page } = await nuevaPagina(browser, url);
    await llenarCompleto(page);
    await page.locator('.section', { hasText: 'Vehículo' }).getByRole('button', { name: '🗑 Limpiar' }).click();
    assert.equal(await page.locator('#marca').inputValue(), '');
    assert.equal(await page.locator('#tipo_vehiculo').inputValue(), '');
    assert.equal(await page.locator('.carac-btn.neg-active').count(), 0);
    assert.equal(await page.locator('.neg-btn.neg-active').count(), 2, 'las negativas de la persona siguen');
    assert.equal(await page.locator('#vehiculo-body').isVisible(), true, 'Limpiar no colapsa la sección');
    await ctx.close();
  },

  async 'secciones colapsan al primer toque'({ url, browser }) {
    const { ctx, page } = await nuevaPagina(browser, url);
    await page.locator('.section-title', { hasText: 'Persona' }).click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#persona-body').evaluate(e => e.getBoundingClientRect().height), 0);
    await page.locator('.section-title', { hasText: 'Persona' }).click();
    await page.waitForTimeout(500);
    assert.ok(await page.locator('#persona-body').evaluate(e => e.getBoundingClientRect().height) > 500);
    await ctx.close();
  },

  async 'nombres con acentos en formato título'({ url, browser }) {
    const { ctx, page } = await nuevaPagina(browser, url);
    assert.deepEqual(await page.evaluate(() => ['SÁNCHEZ FUENTES LUIS ANTONIO', 'NÚÑEZ DE LA O MARÍA JOSÉ', 'GÜEMES ÁVILA ÁNGEL'].map(toTitleCase)),
      ['Sánchez Fuentes Luis Antonio', 'Núñez de la O María José', 'Güemes Ávila Ángel']);
    await ctx.close();
  },

  async 'subcategoría obligatoria y "Otro" con texto'({ url, browser }) {
    const { ctx, page, avisos } = await nuevaPagina(browser, url);
    await page.evaluate(() => { for (const [id, val] of [['nombre_pol', 'P'], ['zona', 'Z'], ['ne', '1'], ['nombre', 'N'], ['nacimiento', '01/01/1990'], ['edad', '36'], ['domicilio', 'D'], ['oficio', 'O'], ['motivo', 'Prevención del delito'], ['addr_texto', 'X']]) document.getElementById(id).value = val; });
    await page.selectOption('#categoria', 'Comercio');
    await page.locator('#btn-generar').click();
    await page.selectOption('#subcategoria', 'Otro');
    await page.locator('#btn-generar').click();
    await page.locator('#otro_subcat').fill('Venta de flores');
    await page.locator('#btn-generar').click();
    assert.deepEqual(avisos.alertas, ['⚠️ Faltan datos obligatorios:\n\n• Subcategoría', '⚠️ Faltan datos obligatorios:\n\n• Especificar subcategoría']);
    assert.match(await page.locator('#output-text').inputValue(), /\*SUBCATEGORIA:\* Otro \(Venta de flores\)/);
    await ctx.close();
  },

  async 'motivos sin opciones subjetivas'({ url, browser }) {
    const { ctx, page } = await nuevaPagina(browser, url);
    const ops = await page.locator('#motivo_sel option').allTextContents();
    assert.ok(!ops.includes('Merodeo') && !ops.includes('Verificación de identidad'));
    assert.ok(ops.includes('Sospecha razonable por hechos objetivos observados'));
    await page.selectOption('#motivo_sel', 'Sospecha razonable por hechos objetivos observados');
    assert.match(await page.locator('#toast').innerText(), /hechos concretos/);
    await ctx.close();
  },
};
