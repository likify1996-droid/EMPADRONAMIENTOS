import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { nuevaPagina, respuestaOcr, escribir, IMAGEN, RAIZ } from './lib.mjs';

// Catálogo cargado fuera del navegador para probar la detección directamente
function catalogo() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js/catalogos.js'), 'utf8') + ';this.C={MARCAS,SUBMARCAS,VEHICULOS,TIPO_CLAVE,TIPOS_VEHICULO,detectarVehiculo,tipoDesdeTexto};', ctx);
  return ctx.C;
}
const estado = page => page.evaluate(() => ({ marca: v('marca'), sub: v('submarca'), tipo: v('tipo_vehiculo'), hint: document.getElementById('tipo-detectado').style.display === 'block' ? document.getElementById('tipo-detectado').textContent : '' }));

export const pruebas = {
  async 'catálogo sin errores'() {
    const C = catalogo();
    const nombres = C.TIPOS_VEHICULO.map(t => t.nombre);
    for (const t of Object.values(C.TIPO_CLAVE)) assert.ok(nombres.includes(t), 'tipo sin ícono: ' + t);
    for (const [m, o] of Object.entries(C.VEHICULOS)) for (const k of Object.keys(o)) assert.ok(C.TIPO_CLAVE[k], `clave de tipo "${k}" inválida en ${m}`);
    for (const m of C.MARCAS) { const l = C.SUBMARCAS[m]; assert.deepEqual(Array.from(l).filter((x, i) => l.indexOf(x) !== i), [], 'modelo repetido en ' + m); }
  },
  async 'detección de modelos'() {
    const { detectarVehiculo: d } = catalogo();
    const casos = [
      [['Nissan', 'VERSA ADVANCE'], ['Nissan', 'Versa', 'Sedán']],
      [['', 'np300 estacas'], ['Nissan', 'NP300', 'Pick up']],
      [['nissan', 'np 300'], ['Nissan', 'NP300', 'Pick up']],
      [['VW', 'vocho'], ['Volkswagen', 'Sedán', 'Sedán']],
      [['', 'Pulsar NS200'], ['Bajaj', 'Pulsar NS 200', 'Motocicleta']],
      [['', 'cascadia'], ['Freightliner', 'Cascadia', 'Tráiler']],
      [['MERCEDES BENZ', 'SPRINTER 415'], ['Mercedes-Benz', 'Sprinter', 'Van / Minivan']],
      [['', 'Ateca'], ['', 'Ateca', 'Camioneta SUV']],
    ];
    for (const [[marca, texto], [m, mod, tipo]] of casos) {
      const r = d(marca, texto);
      assert.deepEqual([r.marca, r.modelo, r.tipo], [m, mod, tipo], `${marca} ${texto}`);
    }
    assert.equal(d('', 'xyz'), null);
  },
  async 'tipo desde el texto de la tarjeta'() {
    const { tipoDesdeTexto: t } = catalogo();
    assert.equal(t('SEDAN 4 PTAS'), 'Sedán');
    assert.equal(t('VAGONETA'), 'Camioneta SUV');
    assert.equal(t('TRACTOCAMION'), 'Tráiler');
    assert.equal(t('CAMION ESTACAS'), 'Camión de carga');
    assert.equal(t('CAMIONETA'), '');
  },
  async 'formulario llena el tipo y respeta el elegido a mano'({ url, browser }) {
    const { ctx, page, errores } = await nuevaPagina(browser, url);
    await escribir(page, 'submarca', 'versa');
    await page.locator('#modelo').click(); await page.waitForTimeout(250);
    assert.deepEqual(await estado(page), { marca: 'Nissan', sub: 'Versa', tipo: 'Sedán', hint: '🔎 Tipo detectado: Sedán (Nissan Versa)' });
    await page.locator('#tipo_vehiculo_search').click();
    await page.locator('#tipo_vehiculo_dropdown').getByText('Taxi', { exact: true }).click();
    await escribir(page, 'submarca', 'Sent');
    await page.locator('#ac_submarca .ac-item').first().dispatchEvent('mousedown');
    assert.deepEqual(await estado(page), { marca: 'Nissan', sub: 'Sentra', tipo: 'Taxi', hint: 'ℹ️ Según el catálogo, Nissan Sentra es Sedán' });
    await escribir(page, 'marca', 'citroen');
    assert.equal(await page.locator('#ac_marca').innerText(), 'Citroën');
    assert.deepEqual(errores, []);
    await ctx.close();
  },
  async 'OCR de tarjeta de circulación'({ url, browser }) {
    let datos;
    const { ctx, page } = await nuevaPagina(browser, url, { ocr: () => respuestaOcr(datos) });
    const leer = async d => { datos = d; await page.evaluate(() => { document.getElementById('scan-status').textContent = ''; }); await page.setInputFiles('#gallery-input', IMAGEN); await page.waitForFunction(() => /Listo/.test(document.getElementById('scan-status').textContent)); };
    await leer({ tipo: 'circulacion', marca: 'NISSAN', submarca: 'VERSA ADVANCE', tipo_vehiculo: 'SEDAN 4 PTAS' });
    assert.deepEqual(await estado(page), { marca: 'Nissan', sub: 'Versa', tipo: 'Sedán', hint: '🔎 Tipo detectado: Sedán (Nissan Versa)' });
    await page.locator('.section', { hasText: 'Vehículo' }).getByRole('button', { name: '🗑 Limpiar' }).click();
    await leer({ tipo: 'circulacion', marca: 'MARCA RARA', submarca: 'MODELO X', tipo_vehiculo: 'VAGONETA' });
    assert.deepEqual(await estado(page), { marca: 'Marca Rara', sub: 'Modelo X', tipo: 'Camioneta SUV', hint: '' });
    await ctx.close();
  },
};
